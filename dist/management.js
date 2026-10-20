import { readFile, readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { relative, resolve, sep } from "node:path";
import { PluginUpdater } from "./updater.js";
import { fileManagerHtml } from "./file-browser.js";
function json(res, status, body) {
    res.writeHead(status, {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
    });
    res.end(JSON.stringify(body));
}
const FILE_ROOT = resolve(process.env.DSH_REMOTE_FILES_ROOT ?? homedir());
const MAX_PREVIEW_BYTES = 2 * 1024 * 1024;
function filePath(value) {
    const candidate = resolve(FILE_ROOT, value ?? ".");
    const rel = relative(FILE_ROOT, candidate);
    if (rel === ".." || rel.startsWith(`..${sep}`) || rel.includes("\0")) {
        throw new Error("invalid_file_path");
    }
    return candidate;
}
function fileUrl(path) {
    return `/dsh-mobile/api/files?path=${encodeURIComponent(path)}`;
}
async function handleFiles(req, res) {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    const path = filePath(url.searchParams.get("path"));
    const info = await stat(path);
    const relativePath = relative(FILE_ROOT, path);
    const displayPath = relativePath ? `/${relativePath}` : "/";
    if (url.searchParams.get("download") === "1") {
        if (!info.isFile() || info.size > MAX_PREVIEW_BYTES)
            return json(res, 413, { reason: "preview_too_large" });
        const data = await readFile(path);
        const ext = path.toLowerCase().match(/\.(png|jpe?g|gif|webp|bmp)$/)?.[1];
        const contentType = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : ext ? `image/${ext}` : "text/plain; charset=utf-8";
        res.writeHead(200, { "content-type": contentType, "cache-control": "no-store" });
        res.end(data);
        return;
    }
    if (info.isDirectory()) {
        const entries = await readdir(path, { withFileTypes: true });
        const items = await Promise.all(entries.sort((a, b) => a.name.localeCompare(b.name)).slice(0, 500).map(async (entry) => {
            const child = resolve(path, entry.name);
            // Broken symlinks (and files removed mid-listing) must not abort the
            // whole directory; show them as opaque entries instead.
            const childInfo = await stat(child).catch(() => undefined);
            const directory = entry.isDirectory() || childInfo?.isDirectory() === true;
            return { name: entry.name, path: relative(FILE_ROOT, child), kind: directory ? "directory" : "file", size: childInfo?.isFile() ? childInfo.size : 0 };
        }));
        const parent = path === FILE_ROOT ? null : relative(FILE_ROOT, resolve(path, ".."));
        return json(res, 200, { kind: "directory", path: displayPath, parent, items });
    }
    if (!info.isFile() || info.size > MAX_PREVIEW_BYTES)
        return json(res, 413, { reason: "preview_too_large" });
    const lower = path.toLowerCase();
    if (/\.(png|jpe?g|gif|webp|bmp)$/.test(lower))
        return json(res, 200, { kind: "image", path: displayPath });
    const content = await readFile(path, "utf8");
    return json(res, 200, { kind: "text", path: displayPath, content });
}
export function isRemoteRequest(req) {
    return req.headers["x-dsh-mobile-remote"] === "1";
}
export function createManagementHandler(manager, updater = new PluginUpdater()) {
    return async (req, res) => {
        const path = new URL(req.url ?? "/", "http://127.0.0.1").pathname;
        try {
            if (req.method === "GET" && path === "/dsh-mobile/api/state") {
                return json(res, 200, {
                    ...(await manager.state()),
                    localActionsAllowed: !isRemoteRequest(req),
                });
            }
            if (req.method === "GET" && path === "/dsh-mobile/files") {
                res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
                res.end(fileManagerHtml());
                return;
            }
            if (req.method === "GET" && path === "/dsh-mobile/api/files") {
                await handleFiles(req, res);
                return;
            }
            if (req.method === "GET" &&
                path === "/dsh-mobile/api/access-sessions") {
                return json(res, 200, { sessions: await manager.accessSessions() });
            }
            if (req.method === "GET" && path === "/dsh-mobile/api/update") {
                return json(res, 200, await updater.check());
            }
            if (req.method === "GET" &&
                path === "/dsh-mobile/api/browser-access") {
                if (isRemoteRequest(req)) {
                    return json(res, 403, { reason: "local_management_required" });
                }
                const access = manager.browserAccess();
                return access
                    ? json(res, 200, access)
                    : json(res, 409, { reason: "not_paired" });
            }
            if (isRemoteRequest(req) &&
                (req.method === "POST" || req.method === "DELETE")) {
                return json(res, 403, { reason: "local_management_required" });
            }
            if (req.method === "POST" && path === "/dsh-mobile/api/pairing") {
                return json(res, 200, await manager.startPairing());
            }
            if (req.method === "POST" && path === "/dsh-mobile/api/update") {
                return json(res, 200, await updater.update());
            }
            if (req.method === "DELETE" && path === "/dsh-mobile/api/pairing") {
                return json(res, 200, await manager.removePairing());
            }
            return json(res, 404, { reason: "not_found" });
        }
        catch (error) {
            return json(res, 502, {
                reason: "relay_unavailable",
                message: error instanceof Error ? error.message : String(error),
            });
        }
    };
}
export function registerManagementRoutes(webServer, manager, updater = new PluginUpdater()) {
    return webServer.register({
        kind: "prefix",
        path: "/dsh-mobile",
        handler: createManagementHandler(manager, updater),
    });
}
