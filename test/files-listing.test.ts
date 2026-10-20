import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { mkdtempSync, mkdirSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// FILE_ROOT is resolved when management.ts is imported, so this file must run
// in its own process (Node's test runner does that per file).
const root = mkdtempSync(join(tmpdir(), "dsh-files-"));
writeFileSync(join(root, "notes.txt"), "hello");
mkdirSync(join(root, "docs"));
writeFileSync(join(root, "docs", "readme.md"), "# hi");
symlinkSync(join(root, "does-not-exist"), join(root, "broken-link"));
process.env.DSH_REMOTE_FILES_ROOT = root;

const { createManagementHandler } = await import("../src/management.js");

test("lists a directory even when it contains a broken symlink", async () => {
  const server = createServer(createManagementHandler({} as any));
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  try {
    const response = await fetch(
      `http://127.0.0.1:${address.port}/dsh-mobile/api/files?path=`,
    );
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.kind, "directory");
    const names = body.items.map((item: { name: string }) => item.name);
    assert.ok(names.includes("notes.txt"));
    assert.ok(names.includes("docs"));
    assert.ok(names.includes("broken-link"));
    const docs = body.items.find((item: { name: string }) => item.name === "docs");
    assert.equal(docs.kind, "directory");
    const broken = body.items.find(
      (item: { name: string }) => item.name === "broken-link",
    );
    assert.equal(broken.kind, "file");
    assert.equal(broken.size, 0);
  } finally {
    server.close();
    await once(server, "close");
  }
});
