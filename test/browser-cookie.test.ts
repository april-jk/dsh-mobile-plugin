import test from "node:test";
import assert from "node:assert/strict";
import { chmodSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  dshBrowserCookie,
  resetBrowserCookieCache,
  withDshCookie,
} from "../src/dsh-browser-cookie.js";

function credentialsFile(secret: string): string {
  const dir = mkdtempSync(join(tmpdir(), "dsh-cookie-"));
  const file = join(dir, ".credentials.yaml");
  writeFileSync(
    file,
    `version: 1\nrecords:\n  client-connection/browser-session:\n    kind: grant\n    payload:\n      version: 1\n      secret: ${secret}\nrefs: {}\n`,
  );
  chmodSync(file, 0o600);
  return file;
}

const SECRET = "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8";

test("mints the authority-bound DSH browser-session cookie", () => {
  const previous = process.env.DSH_CREDENTIALS;
  process.env.DSH_CREDENTIALS = credentialsFile(SECRET);
  try {
    const header = dshBrowserCookie(3080);
    assert.ok(header, "cookie header");
    const [name, value] = header!.split("=");
    assert.match(name, /^dsh-auth-[A-Za-z0-9_-]{43}$/);
    const parts = value.split(".");
    assert.equal(parts.length, 3);
    assert.equal(parts[0], "v1");
    const payload = JSON.parse(
      Buffer.from(parts[1].replaceAll("-", "+").replaceAll("_", "/") + "===", "base64").toString(),
    );
    assert.equal(payload.version, 1);
    assert.equal(payload.authority, "127.0.0.1:3080");
    assert.ok(payload.expiresAt > payload.issuedAt);
  } finally {
    if (previous === undefined) delete process.env.DSH_CREDENTIALS;
    else process.env.DSH_CREDENTIALS = previous;
  }
});

test("adds the cookie without duplicating an older session cookie", () => {
  const previous = process.env.DSH_CREDENTIALS;
  process.env.DSH_CREDENTIALS = credentialsFile(SECRET);
  try {
    const cookie = dshBrowserCookie(3080)!;
    const name = cookie.split("=")[0];
    const headers = withDshCookie(
      { cookie: `theme=dark; ${name}=stale; dsh_mobile=1`, host: "127.0.0.1:3080" },
      3080,
    );
    const sent = String(headers.cookie);
    assert.equal(sent.split(`${name}=`).length - 1, 1);
    assert.ok(sent.includes(name));
    assert.ok(sent.includes("theme=dark"));
    assert.ok(sent.includes("dsh_mobile=1"));
  } finally {
    if (previous === undefined) delete process.env.DSH_CREDENTIALS;
    else process.env.DSH_CREDENTIALS = previous;
  }
});

test("stays backward compatible when the Harness has no browser-session secret", () => {
  const previous = process.env.DSH_CREDENTIALS;
  process.env.DSH_CREDENTIALS = join(tmpdir(), "missing-credentials-file.yaml");
  resetBrowserCookieCache();
  try {
    assert.equal(dshBrowserCookie(3080), undefined);
    const headers = withDshCookie({ cookie: "a=1" }, 3080);
    assert.equal(headers.cookie, "a=1");
  } finally {
    if (previous === undefined) delete process.env.DSH_CREDENTIALS;
    else process.env.DSH_CREDENTIALS = previous;
  }
});
