export function pairingLink(relay, code, e2eeKey) {
    const url = new URL(relay);
    url.pathname = "/app/";
    url.search = "";
    url.hash = `/pair?code=${encodeURIComponent(code)}&key=${encodeURIComponent(e2eeKey)}`;
    return url.toString();
}
