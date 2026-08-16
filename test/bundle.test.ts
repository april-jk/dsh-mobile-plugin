import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { normalizeCloseCode } from "../src/relay-client.js";

test("publishes an installable DSH bundle manifest", async () => {
  const manifest = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf8"),
  );
  const patch = await readFile(
    new URL("../cordis.patch.yml", import.meta.url),
    "utf8",
  );
  assert.equal(manifest.name, "dsh-mobile-remote-companion");
  assert.equal(manifest.dsh.bundle.patch, "./cordis.patch.yml");
  assert.match(patch, /name: dsh-mobile-remote-companion/);
  assert.match(patch, /inject: \[webStartup\]/);
});

test("rejects WebSocket close codes reserved by the protocol", () => {
  assert.equal(normalizeCloseCode(1000), 1000);
  assert.equal(normalizeCloseCode(1005), undefined);
  assert.equal(normalizeCloseCode(1006), undefined);
  assert.equal(normalizeCloseCode(4001), 4001);
});
