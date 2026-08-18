import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { createManagementHandler } from "../src/management.js";
import { RemoteAccessManager } from "../src/remote-access.js";

test("management mutations are local-only while state remains readable", async () => {
  let pairingRequests = 0;
  const manager = new RemoteAccessManager({
    deviceName: "Test Mac",
    relay: "https://relay.test",
    dshPort: 3080,
  }, {
    request: async () => { pairingRequests += 1; return { status: 500, data: {} }; },
    probeDsh: async () => true,
  });
  const server = createServer(createManagementHandler(manager));
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}`;
  try {
    const state = await fetch(`${base}/dsh-mobile/api/state`, {
      headers: { "x-dsh-mobile-remote": "1" },
    });
    assert.equal(state.status, 200);
    assert.equal((await state.json()).localActionsAllowed, false);

    const pairing = await fetch(`${base}/dsh-mobile/api/pairing`, {
      method: "POST",
      headers: { "x-dsh-mobile-remote": "1" },
    });
    assert.equal(pairing.status, 403);
    assert.equal((await pairing.json()).reason, "local_management_required");
    assert.equal(pairingRequests, 0);
  } finally {
    manager.dispose();
    server.close();
    await once(server, "close");
  }
});

test("local management can remove an active pairing", async () => {
  let revokedToken: string | undefined;
  let savedToken: string | undefined = "not-saved";
  const manager = new RemoteAccessManager({
    deviceId: "dev_test",
    deviceToken: "token_private",
    deviceName: "Test Mac",
    relay: "https://relay.test",
    dshPort: 3080,
  }, {
    requestUnbind: async (config) => {
      revokedToken = config.deviceToken;
      return { status: 200, data: { ok: true } };
    },
    save: async (config) => { savedToken = config.deviceToken; },
    probeDsh: async () => true,
  });
  const server = createServer(createManagementHandler(manager));
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  try {
    const response = await fetch(
      `http://127.0.0.1:${address.port}/dsh-mobile/api/pairing`,
      { method: "DELETE" },
    );
    assert.equal(response.status, 200);
    assert.equal((await response.json()).phase, "unpaired");
    assert.equal(revokedToken, "token_private");
    assert.equal(savedToken, undefined);
  } finally {
    manager.dispose();
    server.close();
    await once(server, "close");
  }
});

test("remote file browser rejects path traversal and serves its UI", async () => {
  const manager = new RemoteAccessManager({
    deviceName: "Test Mac",
    relay: "https://relay.test",
    dshPort: 3080,
  }, { probeDsh: async () => true });
  const server = createServer(createManagementHandler(manager));
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}`;
  try {
    const ui = await fetch(`${base}/dsh-mobile/files`);
    assert.equal(ui.status, 200);
    assert.match(await ui.text(), /远程文件/);
    const traversal = await fetch(`${base}/dsh-mobile/api/files?path=${encodeURIComponent("../../etc/passwd")}`);
    assert.equal(traversal.status, 502);
    assert.equal((await traversal.json()).reason, "relay_unavailable");
  } finally {
    manager.dispose();
    server.close();
    await once(server, "close");
  }
});
