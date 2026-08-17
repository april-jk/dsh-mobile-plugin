export function pairingLink(relay: string, code: string, e2eeKey: string): string {
  const url = new URL(relay);
  url.pathname = "/app/";
  url.search = "";
  url.hash = `/pair?code=${encodeURIComponent(code)}&key=${encodeURIComponent(e2eeKey)}`;
  return url.toString();
}
