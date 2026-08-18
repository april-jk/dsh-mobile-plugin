import test from "node:test";
import assert from "node:assert/strict";
import { Config } from "../src/config.js";
import { RemoteAccessManager } from "../src/remote-access.js";

const config: Config = {
  deviceName: "Test Mac",
  relay: "https://relay.test",
  dshPort: 3080,
};

test("starts unpaired without opening a Relay pairing session", async () => {
  let requests = 0;
  let clients = 0;
  const manager = new RemoteAccessManager(config, {
    request: async () => { requests += 1; throw new Error("unexpected"); },
    createClient: () => { clients += 1; throw new Error("unexpected"); },
    probeDsh: async () => true,
  });
  await manager.initialize();
  const state = await manager.state();
  assert.equal(state.phase, "unpaired");
  assert.equal(state.dsh, "online");
  assert.equal(requests, 0);
  assert.equal(clients, 0);
  manager.dispose();
});

test("creates pairing state immediately and never exposes credentials", async () => {
  let confirms = 0;
  const manager = new RemoteAccessManager(config, {
    request: async (url) => {
      if (url.endsWith("/pair/session")) return {
        status: 201,
        data: {
          code: "123456",
          deviceId: "dev_private",
          deviceSecret: "secret_private",
          expiresAt: Date.now() + 60_000,
        },
      };
      confirms += 1;
      return { status: 202, data: { status: "pending" } };
    },
    probeDsh: async () => true,
    pollIntervalMs: 50,
  });
  const state = await manager.startPairing();
  assert.equal(state.phase, "pairing");
  assert.equal(state.pairing?.code, "123456");
  assert.match(state.pairing?.qrSvg ?? "", /^<svg/);
  const qr = new URL(state.pairing?.qrPayload ?? "https://invalid.test");
  assert.equal(qr.origin, "https://relay.test");
  assert.equal(qr.pathname, "/app/");
  assert.equal(new URLSearchParams(qr.hash.split("?")[1]).get("code"), "123456");
  assert.equal(
    Buffer.from(
      new URLSearchParams(qr.hash.split("?")[1]).get("key") ?? "",
      "base64url",
    ).length,
    32,
  );
  assert.doesNotMatch(JSON.stringify(state), /secret_private|dev_private/);
  assert.equal(confirms, 0);
  manager.dispose();
});

test("cancels pairing before confirmation polling", async () => {
  let confirms = 0;
  const manager = new RemoteAccessManager(config, {
    request: async (url) => {
      if (url.endsWith("/pair/session")) return {
        status: 201,
        data: {
          code: "654321",
          deviceId: "dev_cancel",
          deviceSecret: "secret_cancel",
          expiresAt: Date.now() + 60_000,
        },
      };
      confirms += 1;
      return { status: 202, data: {} };
    },
    probeDsh: async () => true,
    pollIntervalMs: 20,
  });
  await manager.startPairing();
  manager.cancelPairing();
  await new Promise((resolve) => setTimeout(resolve, 40));
  assert.equal(confirms, 0);
  assert.equal((await manager.state()).phase, "unpaired");
  manager.dispose();
});

test("reads access sessions with Host-held device credentials", async () => {
  let seenToken: string | undefined;
  const manager = new RemoteAccessManager({
    ...config,
    deviceId: "dev_test",
    deviceToken: "token_private",
  }, {
    createClient: () => ({
      start: async () => undefined,
      stop: () => undefined,
      status: () => ({ connected: true, dsh: true }),
    }),
    requestAccessSessions: async (received) => {
      seenToken = received.deviceToken;
      return [{
        id: "access_1",
        deviceLabel: "iPhone",
        platform: "ios",
        osVersion: "18.6",
        startedAt: 1,
        lastSeenAt: 2,
        expiresAt: 3,
        status: "expired",
      }];
    },
  });
  await manager.initialize();
  const sessions = await manager.accessSessions();
  assert.equal(seenToken, "token_private");
  assert.equal(sessions[0].deviceLabel, "iPhone");
  assert.doesNotMatch(JSON.stringify(sessions), /token_private/);
  manager.dispose();
});

test("generates repeatable browser access from the paired local key", () => {
  const manager = new RemoteAccessManager({
    ...config,
    deviceId: "dev_browser",
    deviceToken: "token_private",
    e2eeMasterKey: "browser_key_private",
  });
  const access = manager.browserAccess();
  assert.equal(access?.deviceId, "dev_browser");
  assert.match(access?.qrSvg ?? "", /^<svg/);
  const url = new URL(access?.qrPayload ?? "https://invalid.test");
  assert.equal(url.pathname, "/app/");
  assert.match(url.hash, /^#\/web-pair\?/);
  assert.equal(
    new URLSearchParams(url.hash.slice(url.hash.indexOf("?") + 1)).get("device"),
    "dev_browser",
  );
  assert.equal(
    new URLSearchParams(url.hash.slice(url.hash.indexOf("?") + 1)).get("key"),
    "browser_key_private",
  );
  manager.dispose();
});

test("revokes the Relay credential before clearing local pairing", async () => {
  let stopped = 0;
  let requestedToken: string | undefined;
  let saved: Config | undefined;
  const manager = new RemoteAccessManager({
    ...config,
    deviceId: "dev_test",
    deviceSecret: "secret_private",
    deviceToken: "token_private",
    e2eeMasterKey: "e2ee_private",
  }, {
    createClient: () => ({
      start: async () => undefined,
      stop: () => { stopped += 1; },
      status: () => ({ connected: true, dsh: true }),
    }),
    requestUnbind: async (received) => {
      requestedToken = received.deviceToken;
      return { status: 200, data: { ok: true } };
    },
    save: async (received) => { saved = received; },
  });
  await manager.initialize();

  const state = await manager.removePairing();

  assert.equal(requestedToken, "token_private");
  assert.equal(stopped, 1);
  assert.equal(state.phase, "unpaired");
  assert.equal(state.deviceId, null);
  assert.equal(saved?.deviceId, undefined);
  assert.equal(saved?.deviceSecret, undefined);
  assert.equal(saved?.deviceToken, undefined);
  assert.equal(saved?.e2eeMasterKey, undefined);
  manager.dispose();
});

test("keeps local pairing when Relay unbind fails", async () => {
  let stopped = 0;
  let saves = 0;
  const manager = new RemoteAccessManager({
    ...config,
    deviceId: "dev_test",
    deviceToken: "token_private",
  }, {
    createClient: () => ({
      start: async () => undefined,
      stop: () => { stopped += 1; },
      status: () => ({ connected: true, dsh: true }),
    }),
    requestUnbind: async () => ({ status: 503, data: {} }),
    save: async () => { saves += 1; },
  });
  await manager.initialize();

  await assert.rejects(
    manager.removePairing(),
    /Relay rejected unbind request \(503\)/,
  );

  assert.equal(stopped, 0);
  assert.equal(saves, 0);
  assert.equal((await manager.state()).phase, "paired");
  manager.dispose();
});
