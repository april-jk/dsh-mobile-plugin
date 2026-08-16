import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defaults, loadConfig, saveConfig } from "../src/config.js";

test("uses the public Relay by default", () => {
  assert.equal(defaults().relay, "https://relay.dshmobile.online");
});

test("persists credentials with owner-only permissions", async () => {
  const dir = await mkdtemp(join(tmpdir(), "dsh-config-test-"));
  const path = join(dir, "nested", "config.json");
  process.env.DSH_REMOTE_CONFIG = path;
  await saveConfig({
    deviceId: "dev_test",
    deviceToken: "secret",
    e2eeMasterKey: "master-key",
    deviceName: "Test Mac",
    relay: "http://relay",
    dshPort: 3080,
  });
  const loaded = await loadConfig();
  assert.equal(loaded.deviceToken, "secret");
  assert.equal(loaded.e2eeMasterKey, "master-key");
  assert.equal((await stat(path)).mode & 0o777, 0o600);
  delete process.env.DSH_REMOTE_CONFIG;
});
