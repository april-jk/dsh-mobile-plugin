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
