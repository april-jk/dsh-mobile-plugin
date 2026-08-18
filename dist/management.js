import { readFile, readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { relative, resolve, sep } from "node:path";
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
function fileManagerHtml() {
    return `<!doctype html><html lang="zh-CN"><meta name="viewport" content="width=device-width,initial-scale=1"><title>远程文件</title>
<style>body{font:15px system-ui;margin:0;background:#f6f7f9;color:#18212b}header{padding:18px 16px;background:#fff;border-bottom:1px solid #dde2e8;position:sticky;top:0}main{padding:12px 16px}button,a{font:inherit}a{color:#1c5d99;text-decoration:none}.item{display:flex;gap:12px;align-items:center;padding:13px 8px;border-bottom:1px solid #e4e7eb;background:#fff}.icon{width:24px}.meta{color:#68737f;font-size:12px;margin-left:auto}pre{white-space:pre-wrap;word-break:break-word;background:#fff;padding:14px;border:1px solid #dde2e8}img{max-width:100%;background:#fff}</style>
<header><strong>远程文件</strong><div id="path"></div></header><main id="app">加载中…</main>
<script>
const api='/dsh-mobile/api/files'; const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function load(path=''){const r=await fetch(api+'?path='+encodeURIComponent(path));const d=await r.json();if(!r.ok)throw Error(d.reason||'读取失败');document.getElementById('path').textContent=d.path||'/';const app=document.getElementById('app');if(d.kind==='directory'){app.innerHTML=(d.parent!==null?'<div class="item"><span class="icon">↩</span><a href="#" data-path="'+esc(d.parent)+'">返回上级</a></div>':'')+d.items.map(i=>'<div class="item"><span class="icon">'+(i.kind==='directory'?'📁':'📄')+'</span><a href="#" data-path="'+esc(i.path)+'">'+esc(i.name)+'</a><span class="meta">'+(i.kind==='directory'?'文件夹':i.size+' B')+'</span></div>').join('');app.querySelectorAll('a').forEach(a=>a.onclick=e=>{e.preventDefault();load(a.dataset.path)})}else if(d.kind==='image'){app.innerHTML='<img src="'+api+'?path='+encodeURIComponent(path)+'&download=1">'}else{app.innerHTML='<pre>'+esc(d.content)+'</pre>'}}load().catch(e=>document.getElementById('app').textContent=e.message);
</script></html>`;
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
            const childInfo = await stat(child);
            return { name: entry.name, path: relative(FILE_ROOT, child), kind: entry.isDirectory() ? "directory" : "file", size: entry.isFile() ? childInfo.size : 0 };
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
export function createManagementHandler(manager) {
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
            if (isRemoteRequest(req) &&
                (req.method === "POST" || req.method === "DELETE")) {
                return json(res, 403, { reason: "local_management_required" });
            }
            if (req.method === "POST" && path === "/dsh-mobile/api/pairing") {
                return json(res, 200, await manager.startPairing());
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
export function registerManagementRoutes(webServer, manager) {
    return webServer.register({
        kind: "prefix",
        path: "/dsh-mobile",
        handler: createManagementHandler(manager),
    });
}
