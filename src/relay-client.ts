import http from "node:http";
import { WebSocket } from "ws";
import { randomUUID } from "node:crypto";
import { Config } from "./config.js";

type Envelope = {
  v: 1;
  type: string;
  channel?: string;
  id: string;
  ts: number;
  payload: any;
};
function message(type: string, payload: any, channel?: string): Envelope {
  return { v: 1, type, channel, id: randomUUID(), ts: Date.now(), payload };
}

export class RelayClient {
  private ws?: WebSocket;
  private stopped = false;
  private authenticated = false;
  private health = false;
  private retry = 0;
  private heartbeat?: NodeJS.Timeout;
  private healthTimer?: NodeJS.Timeout;
  private localSockets = new Map<string, WebSocket>();
  constructor(private config: Config) {}
  async start() {
    this.stopped = false;
    await this.checkHealth();
    this.healthTimer = setInterval(() => void this.checkHealth(), 5000);
    this.connect();
  }
  stop() {
    this.stopped = true;
    clearInterval(this.heartbeat);
    clearInterval(this.healthTimer);
    this.ws?.close();
    for (const socket of this.localSockets.values()) socket.close();
  }
  private relayWsUrl() {
    const url = new URL(this.config.relay);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.pathname = "/device";
    return url.toString();
  }
  private connect() {
    if (this.stopped) return;
    const ws = new WebSocket(this.relayWsUrl());
    this.ws = ws;
    ws.on("open", () =>
      ws.send(
        JSON.stringify(
          message("auth", {
            deviceId: this.config.deviceId,
            deviceToken: this.config.deviceToken,
          }),
        ),
      ),
    );
    ws.on("message", (raw) => this.handle(JSON.parse(raw.toString())));
    ws.on("close", () => {
      this.authenticated = false;
      clearInterval(this.heartbeat);
      if (!this.stopped) {
        const schedule = [1000, 2000, 5000, 10000, 30000];
        const delay = schedule[Math.min(this.retry++, schedule.length - 1)];
        console.log(`Relay disconnected; retrying in ${delay / 1000}s`);
        setTimeout(() => this.connect(), delay);
      }
    });
    ws.on("error", () => undefined);
  }
  private send(type: string, payload: any, channel?: string) {
    if (this.ws?.readyState === WebSocket.OPEN)
      this.ws.send(JSON.stringify(message(type, payload, channel)));
  }
  private async checkHealth() {
    const before = this.health;
    try {
      const response = await fetch(`http://127.0.0.1:${this.config.dshPort}/`, {
        signal: AbortSignal.timeout(2000),
      });
      this.health = response.status < 500;
    } catch {
      this.health = false;
    }
    if (before !== this.health || this.authenticated)
      this.send("status", { dsh: this.health ? "online" : "offline" });
  }
  private handle(msg: Envelope) {
    if (msg.type === "auth_ok") {
      this.authenticated = true;
      this.retry = 0;
      console.log(
        `Connected to Relay; DSH is ${this.health ? "online" : "offline"}`,
      );
      this.send("status", { dsh: this.health ? "online" : "offline" });
      this.heartbeat = setInterval(() => this.send("ping", {}), 25000);
      return;
    }
    if (msg.type === "http_req") return this.http(msg);
    if (msg.type === "ws_open") return this.openWs(msg);
    if (msg.type === "ws_frame") {
      const socket = this.localSockets.get(msg.channel ?? "");
      if (socket?.readyState === WebSocket.OPEN)
        socket.send(Buffer.from(msg.payload.dataB64 ?? "", "base64"), {
          binary: msg.payload.opcode === 2,
        });
    }
    if (msg.type === "ws_close") {
      this.localSockets
        .get(msg.channel ?? "")
        ?.close(msg.payload.code ?? 1000, msg.payload.reason ?? "");
      this.localSockets.delete(msg.channel ?? "");
    }
  }
  private http(msg: Envelope) {
    const body = Buffer.from(msg.payload.bodyB64 ?? "", "base64");
    const headers = {
      ...(msg.payload.headers ?? {}),
      host: `127.0.0.1:${this.config.dshPort}`,
    };
    delete headers["content-length"];
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: this.config.dshPort,
        method: msg.payload.method,
        path: msg.payload.path,
        headers,
      },
      (res) => {
        const chunks: Buffer[] = [];
        let size = 0;
        res.on("data", (chunk) => {
          size += chunk.length;
          if (size <= 1024 * 1024) chunks.push(chunk);
        });
        res.on("end", () => {
          if (size > 1024 * 1024)
            return this.send(
              "http_res",
              {
                status: 502,
                headers: { "content-type": "application/json" },
                bodyB64: Buffer.from(
                  JSON.stringify({ error: "response_too_large" }),
                ).toString("base64"),
              },
              msg.channel,
            );
          const responseHeaders: Record<string, any> = { ...res.headers };
          delete responseHeaders["content-length"];
          delete responseHeaders["transfer-encoding"];
          this.send(
            "http_res",
            {
              status: res.statusCode ?? 502,
              headers: responseHeaders,
              bodyB64: Buffer.concat(chunks).toString("base64"),
            },
            msg.channel,
          );
        });
      },
    );
    req.on("error", () =>
      this.send(
        "http_res",
        {
          status: 502,
          headers: { "content-type": "application/json" },
          bodyB64: Buffer.from(
            JSON.stringify({ error: "dsh_unreachable" }),
          ).toString("base64"),
        },
        msg.channel,
      ),
    );
    if (body.length) req.write(body);
    req.end();
  }
  private openWs(msg: Envelope) {
    const channel = msg.channel ?? "";
    const url = `ws://127.0.0.1:${this.config.dshPort}${msg.payload.path}`;
    const headers = {
      ...(msg.payload.headers ?? {}),
      host: `127.0.0.1:${this.config.dshPort}`,
    };
    const socket = new WebSocket(url, { headers });
    this.localSockets.set(channel, socket);
    socket.on("open", () => this.send("ws_open_ok", {}, channel));
    socket.on("message", (data, binary) =>
      this.send(
        "ws_frame",
        {
          dataB64: Buffer.from(data as any).toString("base64"),
          opcode: binary ? 2 : 1,
        },
        channel,
      ),
    );
    socket.on("close", (code, reason) => {
      this.localSockets.delete(channel);
      this.send("ws_close", { code, reason: reason.toString() }, channel);
    });
    socket.on("error", () => undefined);
  }
}
