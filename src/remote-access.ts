import { Config, saveConfig } from "./config.js";
import { qrSvg } from "./qr.js";
import { pairingLink } from "./pair-link.js";
import { RelayClient } from "./relay-client.js";
import { generateMasterKey } from "./e2ee.js";

type PairSession = {
  code: string;
  deviceId: string;
  deviceSecret: string;
  expiresAt: number;
  e2eeMasterKey: string;
};

export type PairingView = {
  code: string;
  expiresAt: number;
  qrPayload: string;
  qrSvg: string;
};

export type RemoteAccessState = {
  phase: "unpaired" | "pairing" | "paired";
  deviceId: string | null;
  deviceName: string;
  relay: string;
  dsh: "online" | "offline";
  relayConnection: "connected" | "connecting" | "offline";
  pairing: PairingView | null;
};

export type AccessSession = {
  id: string;
  deviceLabel: string;
  platform: "ios" | "android" | "other";
  osVersion: string | null;
  startedAt: number;
  lastSeenAt: number;
  expiresAt: number;
  status: "active" | "expired" | "ended";
};

type RelayConnection = {
  start(): Promise<void>;
  stop(): void;
  status(): { connected: boolean; dsh: boolean };
};

type Dependencies = {
  request: (url: string, data: unknown) => Promise<{ status: number; data: any }>;
  save: typeof saveConfig;
  createClient: (config: Config) => RelayConnection;
  probeDsh: (port: number) => Promise<boolean>;
  pollIntervalMs: number;
  requestAccessSessions: (config: Config) => Promise<AccessSession[]>;
  requestUnbind: (
    config: Config,
  ) => Promise<{ status: number; data: any }>;
};

async function post(url: string, data: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(data),
  });
  return { status: response.status, data: (await response.json()) as any };
}

async function probeDsh(port: number) {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/`, {
      signal: AbortSignal.timeout(1500),
    });
    return response.status < 500;
  } catch {
    return false;
  }
}

async function requestAccessSessions(config: Config) {
  if (!config.deviceId || !config.deviceToken) return [];
  const response = await fetch(
    `${config.relay}/device-management/${encodeURIComponent(config.deviceId)}/access-sessions?limit=50`,
    {
      headers: { authorization: `Device ${config.deviceToken}` },
      signal: AbortSignal.timeout(5000),
    },
  );
  if (!response.ok) {
    throw new Error(`Relay rejected access log request (${response.status})`);
  }
  const body = (await response.json()) as { sessions?: AccessSession[] };
  return Array.isArray(body.sessions) ? body.sessions : [];
}

async function requestUnbind(config: Config) {
  const response = await fetch(
    `${config.relay}/device-management/${encodeURIComponent(config.deviceId!)}/unbind`,
    {
      method: "POST",
      headers: { authorization: `Device ${config.deviceToken}` },
      signal: AbortSignal.timeout(5000),
    },
  );
  return { status: response.status, data: (await response.json()) as any };
}

const defaults: Dependencies = {
  request: post,
  save: saveConfig,
  createClient: (config) => new RelayClient(config),
  probeDsh,
  pollIntervalMs: 2000,
  requestAccessSessions,
  requestUnbind,
};

export class RemoteAccessManager {
  private config: Config;
  private pairing?: PairSession;
  private client?: RelayConnection;
  private pollTimer?: NodeJS.Timeout;
  private disposed = false;
  private deps: Dependencies;

  constructor(config: Config, dependencies: Partial<Dependencies> = {}) {
    this.config = config;
    this.deps = { ...defaults, ...dependencies };
  }

  async initialize() {
    if (this.config.deviceToken) await this.connect();
  }

  async state(): Promise<RemoteAccessState> {
    const clientStatus = this.client?.status();
    const dsh = clientStatus?.dsh ?? (await this.deps.probeDsh(this.config.dshPort));
    return {
      phase: this.pairing
        ? "pairing"
        : this.config.deviceToken
          ? "paired"
          : "unpaired",
      deviceId: this.config.deviceId ?? null,
      deviceName: this.config.deviceName,
      relay: this.config.relay,
      dsh: dsh ? "online" : "offline",
      relayConnection: clientStatus?.connected
        ? "connected"
        : this.client
          ? "connecting"
          : "offline",
      pairing: this.pairing ? this.pairingView(this.pairing) : null,
    };
  }

  async startPairing(): Promise<RemoteAccessState> {
    if (this.config.deviceToken) return this.state();
    if (!this.pairing) {
      const created = await this.deps.request(
        `${this.config.relay}/pair/session`,
        {},
      );
      if (created.status !== 201) {
        throw new Error(`Relay rejected pairing session (${created.status})`);
      }
      this.pairing = {
        ...(created.data as Omit<PairSession, "e2eeMasterKey">),
        e2eeMasterKey: generateMasterKey(),
      };
      this.schedulePoll(this.deps.pollIntervalMs);
    }
    return this.state();
  }

  async accessSessions(): Promise<AccessSession[]> {
    if (!this.config.deviceToken || !this.config.deviceId) return [];
    return this.deps.requestAccessSessions(this.config);
  }

  cancelPairing() {
    this.pairing = undefined;
    clearTimeout(this.pollTimer);
    this.pollTimer = undefined;
  }

  async removePairing(): Promise<RemoteAccessState> {
    if (this.pairing) {
      this.cancelPairing();
      return this.state();
    }
    if (!this.config.deviceId || !this.config.deviceToken) return this.state();
    const unbound = await this.deps.requestUnbind(this.config);
    if (unbound.status !== 200) {
      throw new Error(`Relay rejected unbind request (${unbound.status})`);
    }
    this.client?.stop();
    this.client = undefined;
    this.config = {
      deviceName: this.config.deviceName,
      relay: this.config.relay,
      dshPort: this.config.dshPort,
    };
    await this.deps.save(this.config);
    return this.state();
  }

  dispose() {
    this.disposed = true;
    this.cancelPairing();
    this.client?.stop();
    this.client = undefined;
  }

  private pairingView(session: PairSession): PairingView {
    const qrPayload = pairingLink(
      this.config.relay,
      session.code,
      session.e2eeMasterKey,
    );
    return {
      code: session.code,
      expiresAt: session.expiresAt,
      qrPayload,
      qrSvg: qrSvg(qrPayload),
    };
  }

  private schedulePoll(delay: number) {
    clearTimeout(this.pollTimer);
    this.pollTimer = setTimeout(() => void this.pollPairing(), delay);
  }

  private async pollPairing() {
    const session = this.pairing;
    if (!session || this.disposed) return;
    if (Date.now() >= session.expiresAt) {
      this.cancelPairing();
      return;
    }
    try {
      const confirmed = await this.deps.request(
        `${this.config.relay}/pair/confirm`,
        {
          deviceId: session.deviceId,
          deviceSecret: session.deviceSecret,
          deviceName: this.config.deviceName,
        },
      );
      if (this.pairing !== session || this.disposed) return;
      if (confirmed.status === 200) {
        this.config = {
          ...this.config,
          deviceId: session.deviceId,
          deviceSecret: session.deviceSecret,
          deviceToken: confirmed.data.deviceToken,
          e2eeMasterKey: session.e2eeMasterKey,
        };
        this.cancelPairing();
        await this.deps.save(this.config);
        await this.connect();
        return;
      }
      if (confirmed.status !== 202) {
        this.cancelPairing();
        return;
      }
    } catch {
      // A transient Relay failure should not discard a still-valid pairing code.
    }
    if (this.pairing === session) this.schedulePoll(this.deps.pollIntervalMs);
  }

  private async connect() {
    this.client?.stop();
    this.client = this.deps.createClient(this.config);
    await this.client.start();
  }
}
