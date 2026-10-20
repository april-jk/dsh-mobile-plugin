// Catalog and rendering belong to this standalone browser runtime, not the API.
export const fileMessages = {
    en: {
        title: "Remote files", loading: "Loading…", parent: "Parent directory", folder: "Folder",
        readFailed: "Could not read the file or directory. Try again.",
        invalidPath: "This path is outside the allowed file root.", tooLarge: "This file cannot be previewed (maximum 2 MiB).",
        notFound: "File or directory not found.", denied: "Permission denied.", empty: "This directory is empty.",
        image: "Image preview: {path}", bytes: "{size} B", errorDetail: "{message} ({code})",
    },
    pl: {
        title: "Pliki zdalne", loading: "Ładowanie…", parent: "Katalog nadrzędny", folder: "Folder",
        readFailed: "Nie udało się odczytać pliku lub katalogu. Spróbuj ponownie.",
        invalidPath: "Ta ścieżka znajduje się poza dozwolonym katalogiem głównym.", tooLarge: "Nie można wyświetlić podglądu tego pliku (maksymalnie 2 MiB).",
        notFound: "Nie znaleziono pliku lub katalogu.", denied: "Brak uprawnień.", empty: "Ten katalog jest pusty.",
        image: "Podgląd obrazu: {path}", bytes: "{size} B", errorDetail: "{message} ({code})",
    },
    zh: {
        title: "远程文件", loading: "加载中…", parent: "返回上级", folder: "文件夹",
        readFailed: "无法读取文件或目录，请重试。",
        invalidPath: "此路径超出允许的文件根目录。", tooLarge: "无法预览此文件（最大 2 MiB）。",
        notFound: "未找到文件或目录。", denied: "没有访问权限。", empty: "此文件夹为空。",
        image: "图片预览：{path}", bytes: "{size} B", errorDetail: "{message} ({code})",
    },
};
// Serialized into the HTML. Keep all dependencies inside this function.
function fileBrowser(messages) {
    const api = "/dsh-mobile/api/files";
    const tags = { en: "en", pl: "pl", zh: "zh-CN" };
    // The mobile app owns the language choice and passes it in the URL; the page
    // itself exposes no language switch.
    const params = new URLSearchParams(location.search);
    const requested = (params.get("lang") || "").toLowerCase().split(/[-_]/)[0];
    const fixed = Object.hasOwn(messages, requested) ? requested : null;
    // An explicit theme comes from the mobile app. Without one the page keeps
    // following the system preference, including later switches.
    const theme = params.get("theme");
    if (theme !== "dark" && theme !== "light") {
        const scheme = matchMedia("(prefers-color-scheme: dark)");
        scheme.addEventListener?.("change", event => {
            document.documentElement.dataset.theme = event.matches ? "dark" : "light";
        });
    }
    const app = document.getElementById("app");
    let currentPath = "";
    let data = null;
    let failure = null;
    let request = 0;
    const folderIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 6.75A2.25 2.25 0 0 1 5.75 4.5h3.1c.6 0 1.17.24 1.59.66l.9.9h7.9a2.25 2.25 0 0 1 2.25 2.25v9.94a2.25 2.25 0 0 1-2.25 2.25H5.75a2.25 2.25 0 0 1-2.25-2.25V6.75Z" fill="currentColor" opacity=".16"/><path d="M3.5 6.75A2.25 2.25 0 0 1 5.75 4.5h3.1c.6 0 1.17.24 1.59.66l.9.9h7.9a2.25 2.25 0 0 1 2.25 2.25v9.94a2.25 2.25 0 0 1-2.25 2.25H5.75a2.25 2.25 0 0 1-2.25-2.25V6.75Z" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
    const fileIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 3.75h6.6L18.5 9v11.25H6.5V3.75Z" fill="currentColor" opacity=".12"/><path d="M6.5 3.75h6.6L18.5 9v11.25H6.5V3.75Z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M13 4v5.25h5.25" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
    const backIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 6 8.5 12l6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    const alertIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 7.75v5.1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="16.2" r="1" fill="currentColor"/></svg>';
    const emptyIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 8.25h17l-1.6 9.5a2 2 0 0 1-2 1.7H7.1a2 2 0 0 1-2-1.7l-1.6-9.5Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M8.75 8.25V6.9a2 2 0 0 1 2-2h2.5a2 2 0 0 1 2 2v1.35" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
    function locale() {
        if (fixed)
            return fixed;
        const current = navigator.languages?.[0] || navigator.language;
        const primary = String(current || "").toLowerCase().split(/[-_]/)[0];
        return Object.hasOwn(messages, primary) ? primary : "en";
    }
    function t(name, values = {}) {
        return messages[locale()][name].replace(/\{(\w+)\}/g, (_, name) => values[name] ?? "");
    }
    const esc = (value) => String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
    function render() {
        const active = locale();
        document.documentElement.lang = tags[active];
        document.title = t("title");
        document.getElementById("title").textContent = t("title");
        app.removeAttribute("role");
        if (failure) {
            const codes = { invalid_file_path: "invalidPath", preview_too_large: "tooLarge", not_found: "notFound", ENOENT: "notFound", EACCES: "denied", EPERM: "denied", relay_unavailable: "readFailed" };
            const code = failure.message === "invalid_file_path" ? failure.message : failure.reason;
            const message = t(code && codes[code] || "readFailed");
            app.innerHTML = '<div class="state"><div class="state-icon" aria-hidden="true">' + alertIcon + '</div><p>' + esc(code && !codes[code] ? t("errorDetail", { message, code }) : message) + '</p></div>';
            app.setAttribute("role", "alert");
            return;
        }
        if (!data) {
            app.innerHTML = '<div class="state"><div class="spinner" aria-hidden="true"></div><p>' + esc(t("loading")) + '</p></div>';
            return;
        }
        document.getElementById("path").textContent = data.path || "/";
        if (data.kind === "directory") {
            const parent = data.parent !== null ? '<a class="row parent" href="#" data-path="' + esc(data.parent) + '"><span class="row-icon">' + backIcon + '</span><span class="row-name">' + esc(t("parent")) + '</span></a>' : "";
            const rows = data.items.map((item) => '<a class="row" href="#" data-path="' + esc(item.path) + '"><span class="row-icon">' + (item.kind === "directory" ? folderIcon : fileIcon) + '</span><span class="row-name">' + esc(item.name) + '</span><span class="row-meta">' + esc(item.kind === "directory" ? t("folder") : t("bytes", { size: Number(item.size).toLocaleString(tags[locale()]) })) + '</span></a>').join("");
            app.innerHTML = '<div class="list">' + parent + rows + '</div>' + (data.items.length ? "" : '<div class="state"><div class="state-icon" aria-hidden="true">' + emptyIcon + '</div><p>' + esc(t("empty")) + '</p></div>');
            app.querySelectorAll("a").forEach(anchor => { anchor.onclick = event => { event.preventDefault(); void load(anchor.dataset.path); }; });
        }
        else if (data.kind === "image") {
            app.innerHTML = '<div class="preview"><img alt="' + esc(t("image", { path: data.path })) + '" src="' + api + '?path=' + encodeURIComponent(currentPath) + '&download=1"></div>';
        }
        else {
            app.innerHTML = '<div class="preview"><pre>' + esc(data.content) + '</pre></div>';
        }
    }
    async function load(path = "") {
        const id = ++request;
        currentPath = path;
        data = null;
        failure = null;
        render();
        app.setAttribute("aria-busy", "true");
        try {
            const response = await fetch(api + "?path=" + encodeURIComponent(path));
            const body = await response.json();
            if (id !== request)
                return;
            if (!response.ok)
                failure = { reason: body.reason, message: body.message };
            else
                data = body;
        }
        catch {
            if (id === request)
                failure = {};
        }
        finally {
            if (id === request) {
                app.setAttribute("aria-busy", "false");
                render();
            }
        }
    }
    void load();
}
export function fileManagerHtml() {
    const catalog = JSON.stringify(fileMessages).replace(/</g, "\\u003c");
    return `<!doctype html><html lang="en" data-theme="light"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${fileMessages.en.title}</title>
<script>try{var t=new URLSearchParams(location.search).get("theme");document.documentElement.dataset.theme=t==="dark"?"dark":t==="light"?"light":(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light")}catch(e){}</script>
<style>
:root{color-scheme:light;--bg:#f7f8fa;--surface:#fff;--soft:#f1f3f5;--text:#202124;--muted:#747c88;--faint:#9aa1ab;--border:#e2e5e9;--accent:#4e82e8;--accent-soft:#e9f0ff;--radius:16px;--shadow:0 1px 2px rgba(16,24,40,.04),0 8px 24px rgba(16,24,40,.06)}
:root[data-theme="dark"]{color-scheme:dark;--bg:#0f1115;--surface:#171a20;--soft:#1e222a;--text:#e8eaee;--muted:#9aa3af;--faint:#7c8592;--border:#2a2f38;--accent:#7aa2f7;--accent-soft:#1d2a44;--shadow:0 1px 2px rgba(0,0,0,.4),0 10px 30px rgba(0,0,0,.35)}
*{box-sizing:border-box}html,body{margin:0;background:var(--bg)}body{color:var(--text);font:15px/1.5 -apple-system,BlinkMacSystemFont,"DM Sans","Segoe UI",Roboto,"Helvetica Neue",sans-serif;-webkit-font-smoothing:antialiased}
.shell{min-height:100dvh;display:flex;flex-direction:column}
header{position:sticky;top:0;z-index:20;display:flex;align-items:center;gap:12px;padding:14px 16px;background:color-mix(in srgb,var(--bg) 88%,transparent);backdrop-filter:saturate(180%) blur(14px);border-bottom:1px solid var(--border)}
.brand{display:flex;align-items:center;gap:12px;min-width:0;flex:1}
.mark{width:42px;height:42px;border-radius:13px;background:var(--accent-soft);color:var(--accent);display:grid;place-items:center;flex:none}
.mark svg{width:24px;height:24px}
.titles{min-width:0}.titles strong{display:block;font-size:17px;font-weight:650;letter-spacing:-.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.path{margin-top:2px;font-size:12.5px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-variant-numeric:tabular-nums}
main{flex:1;padding:16px 16px calc(24px + env(safe-area-inset-bottom,0px))}
.list{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;box-shadow:var(--shadow)}
.row{display:flex;align-items:center;gap:14px;padding:14px 16px;text-decoration:none;color:var(--text);border-bottom:1px solid var(--border);background:var(--surface);min-height:58px}
.row:last-child{border-bottom:0}.row:active{background:var(--soft)}@media(hover:hover){.row:hover{background:var(--soft)}}
.row-icon{width:26px;height:26px;flex:none;display:grid;place-items:center;color:var(--accent)}
.row-icon svg{width:24px;height:24px}
.row.parent .row-icon{color:var(--muted)}
.row-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:15px}
.row-meta{flex:none;color:var(--faint);font-size:12.5px;font-variant-numeric:tabular-nums}
.state{display:flex;flex-direction:column;align-items:center;gap:12px;padding:56px 20px;color:var(--muted);text-align:center}
.state p{margin:0}
.state-icon{width:44px;height:44px;border-radius:50%;background:var(--soft);display:grid;place-items:center;font-weight:700;color:var(--faint)}
.spinner{width:26px;height:26px;border-radius:50%;border:2px solid var(--border);border-top-color:var(--accent);animation:spin .8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.preview{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow);overflow:hidden}
pre{margin:0;padding:18px;white-space:pre-wrap;word-break:break-word;font:13.5px/1.65 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
img{display:block;max-width:100%;height:auto;margin:0 auto;background:var(--surface)}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
@media(max-width:380px){.path{display:none}.titles strong{font-size:16px}}
</style>
<div class="shell">
<header>
<div class="brand">
<span class="mark" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3.5 6.75A2.25 2.25 0 0 1 5.75 4.5h3.1c.6 0 1.17.24 1.59.66l.9.9h7.9a2.25 2.25 0 0 1 2.25 2.25v9.94a2.25 2.25 0 0 1-2.25 2.25H5.75a2.25 2.25 0 0 1-2.25-2.25V6.75Z" fill="none" stroke="currentColor" stroke-width="1.6"/></svg></span>
<div class="titles"><strong id="title">${fileMessages.en.title}</strong><div class="path" id="path">/</div></div>
</div>
</header>
<main id="app" aria-live="polite">${fileMessages.en.loading}</main>
</div>
<script>(${fileBrowser.toString()})(${catalog});</script></html>`;
}
