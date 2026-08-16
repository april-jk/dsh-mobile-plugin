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
  assert.equal(manifest.name, "@april-jk/dsh-mobile");
  assert.deepEqual(manifest.bin, { "dsh-mobile": "dist/cli.js" });
  assert.equal(manifest.dsh.bundle.patch, "./cordis.patch.yml");
  assert.equal(manifest.exports["./client"], "./client.js");
  assert.equal(manifest.dsh.client.platform, "web");
  assert.equal(manifest.scripts.prepack, "npm run build");
  assert.equal(manifest.license, "MIT");
  assert.equal(
    manifest.repository.url,
    "git+https://github.com/april-jk/dsh-mobile-plugin.git",
  );
  const client = await readFile(
    new URL("../client.js", import.meta.url),
    "utf8",
  );
  assert.match(client, /id: "@april-jk\/dsh-mobile"/);
  assert.match(client, /settings\.section/);
  assert.match(client, /dsh-mobile\/api\/state/);
  assert.match(client, /dsh-mobile\/api\/access-sessions/);
  assert.match(client, /访问时间线/);
  assert.match(client, /移除配对/);
  assert.match(patch, /name: '@april-jk\/dsh-mobile'/);
  assert.match(patch, /inject: \[webStartup, webServer\]/);
  assert.match(patch, /https:\/\/relay\.dshmobile\.online/);
  assert.match(patch, /dsh-host-directory-picker-browse/);
  assert.match(patch, /dsh-client-ui-directory-picker-browse/);
});

test("rejects WebSocket close codes reserved by the protocol", () => {
  assert.equal(normalizeCloseCode(1000), 1000);
  assert.equal(normalizeCloseCode(1005), undefined);
  assert.equal(normalizeCloseCode(1006), undefined);
  assert.equal(normalizeCloseCode(4001), 4001);
});

test("documents a path-free official DSH install command", async () => {
  const readme = await readFile(
    new URL("../README.md", import.meta.url),
    "utf8",
  );
  assert.match(
    readme,
    /npx @deepseek-ai\/dsh plugin --profile web add "github:april-jk\/dsh-mobile-plugin#v0\.1\.2"/,
  );
  assert.doesNotMatch(readme, /\/absolute\/path/);
});
