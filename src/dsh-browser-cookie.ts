import { createHash, createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/**
 * DSH 0.2 protects the browser UI and `/api` with a signed, authority-bound
 * cookie. The desktop browser obtains it from the launch token; a remote
 * Companion has no such token, so it mints the same cookie from the Harness
 * home's `client-connection/browser-session` signing secret. The cookie stays
 * scoped to `127.0.0.1:<port>` and is only added to loopback upstream requests.
 */

const AUTHORITY = (port: number) => `127.0.0.1:${port}`;
const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function base64Url(value: Buffer): string {
  return value
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}

function readSecret(): Buffer | undefined {
  const file =
    process.env.DSH_CREDENTIALS ?? join(homedir(), ".dsh", ".credentials.yaml");
  let text: string;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    return undefined;
  }
  // The credential file is a small YAML document written by DSH itself; pull
  // the single secret of the browser-session grant without a YAML dependency.
  const match = text.match(
    /client-connection\/browser-session:[\s\S]*?^\s+secret:\s*([A-Za-z0-9_-]+)\s*$/m,
  );
  if (!match) return undefined;
  const secret = Buffer.from(
    match[1].replaceAll("-", "+").replaceAll("_", "/") + "===",
    "base64",
  );
  return secret.byteLength === 32 ? secret : undefined;
}

function cookieName(authority: string): string {
  const digest = createHash("sha256").update(authority).digest();
  return `dsh-auth-${base64Url(digest)}`;
}

/** One cookie value per authority; refreshed when it approaches expiry. */
const cache = new Map<string, { header: string; expiresAt: number }>();

/**
 * Build the `Cookie` header DSH accepts for a loopback authority, or
 * `undefined` on older Harness versions that do not use browser-session auth.
 */
export function dshBrowserCookie(port: number): string | undefined {
  const authority = AUTHORITY(port);
  const now = Date.now();
  const cached = cache.get(authority);
  if (cached && cached.expiresAt - now > 60_000) return cached.header;
  const secret = readSecret();
  if (secret === undefined) return undefined;
  const payload = {
    version: 1,
    authority,
    issuedAt: now,
    expiresAt: now + COOKIE_MAX_AGE_MS,
  };
  const body = base64Url(Buffer.from(JSON.stringify(payload), "utf8"));
  const signature = base64Url(createHmac("sha256", secret).update(body).digest());
  const header = `${cookieName(authority)}=v1.${body}.${signature}`;
  cache.set(authority, { header, expiresAt: payload.expiresAt });
  return header;
}

/** Test hook: forget cached cookies so a changed credentials file is re-read. */
export function resetBrowserCookieCache(): void {
  cache.clear();
}

/** Merge the DSH auth cookie into an existing Cookie header without duplicates. */
export function withDshCookie(
  headers: Record<string, any>,
  port: number,
): Record<string, any> {
  const cookie = dshBrowserCookie(port);
  if (cookie === undefined) return headers;
  const existing = typeof headers.cookie === "string" ? headers.cookie : "";
  const [name] = cookie.split("=");
  const kept = existing
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part !== "" && !part.startsWith(`${name}=`));
  kept.push(cookie);
  headers.cookie = kept.join("; ");
  return headers;
}
