import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

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
