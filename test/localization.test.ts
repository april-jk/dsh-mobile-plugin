import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { fileManagerHtml, fileMessages } from "../src/file-browser.js";

const source = await readFile(new URL("../client.js", import.meta.url), "utf8");
function settings(browserLanguage = "en-US", stored: string | null = null) {
  let exported: any;
  let cursor = 0;
  const states: any[] = [];
  const storage = new Map(stored ? [["dsh-mobile.language", stored]] : []);
  const listeners = new Map<string, Set<Function>>();
  const React = {
    createElement: (type: any, props: any, ...children: any[]) => ({ type, props: props || {}, children }),
    useState: (initial: any) => {
      const index = cursor++;
      if (!(index in states)) states[index] = initial;
      return [states[index], (value: any) => { states[index] = typeof value === "function" ? value(states[index]) : value; }];
    },
    useCallback: (callback: any) => callback,
    useEffect: () => {},
  };
  const context: any = {
    navigator: { languages: [browserLanguage], language: browserLanguage },
    localStorage: { getItem: (key: string) => storage.get(key) || null, setItem: (key: string, value: string) => storage.set(key, value) },
    document: { querySelector: () => true },
    Event: class { constructor(public type: string) {} },
    window: {
      __ModuleLoader__: { load: ({ factory }: any) => { exported = factory(() => React); } },
      addEventListener: (type: string, callback: Function) => { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type)!.add(callback); },
      removeEventListener: () => {},
      dispatchEvent: (event: any) => listeners.get(event.type)?.forEach(callback => callback(event)),
      confirm: () => false,
    },
  };
  vm.runInNewContext(source.replace("return module.exports;", "exports.testing = { messages, resolveLocale, translate, errorText, RemoteAccessSection, currentLocale }; return module.exports;"), context);
  return { ...exported.testing, exported, states, storage, render: () => { cursor = 0; return exported.testing.RemoteAccessSection(); } };
}
function text(node: any): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node !== "object") return String(node);
  if (Array.isArray(node)) return node.map(text).join(" ");
  if (typeof node.type === "function") return text(node.type(node.props));
  return (node.children || []).map(text).join(" ");
}
function find(node: any, type: string): any[] {
  if (!node || typeof node !== "object") return [];
  if (Array.isArray(node)) return node.flatMap(item => find(item, type));
  return [...(node.type === type ? [node] : []), ...(node.children || []).flatMap((child: any) => find(child, type))];
}
function parity(catalog: any) {
  const keys = Object.keys(catalog.en).sort();
  for (const locale of ["en", "pl", "zh"]) {
    assert.deepEqual(Object.keys(catalog[locale]).sort(), keys, locale);
    for (const key of keys) {
      assert.ok(catalog[locale][key].trim(), `${locale}.${key}`);
      const placeholders = (value: string) => [...value.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
      assert.deepEqual(placeholders(catalog[locale][key]), placeholders(catalog.en[key]), `${locale}.${key}`);
    }
  }
}

test("both runtime catalogs have complete locale and placeholder parity", () => {
  parity(settings().messages);
  parity(fileMessages);
  // Catches copy left inline in the UI layer. The only allowed Han text is the
  // native language name in the language picker (never translated).
  const inlineHan = source.slice(source.indexOf("    function Row")).match(/[\u3400-\u9fff]+/g) ?? [];
  assert.deepEqual([...new Set(inlineHan)], ["简体中文"]);
});

test("settings uses browser language, English fallback, and localized registration", () => {
  for (const [browser, expected] of [["pl-PL", "pl"], ["zh-Hans-CN", "zh"], ["en-GB", "en"], ["de-DE", "en"]]) {
    const runtime = settings(browser);
    assert.equal(runtime.currentLocale(), expected);
    let registration: any;
    let registrations = 0;
    let disposals = 0;
    runtime.exported.apply({ slots: { inject: (_: any, callback: Function) => callback(), register: (value: any) => { registration = value; registrations++; return () => { disposals++; }; } } });
    assert.equal(typeof registration.label(), "string");
    assert.equal(registration.label(), runtime.messages[expected].remoteAccess);
    const tree = runtime.render();
    assert.match(text(tree), new RegExp(runtime.messages[expected].loading));
    assert.equal(find(tree, "select")[0].props["aria-label"], runtime.messages[expected].language);
    find(tree, "select")[0].props.onChange({ target: { value: "pl" } });
    assert.equal(registrations, 2);
    assert.equal(disposals, 1);
    assert.equal(registration.label(), runtime.messages.pl.remoteAccess);
  }
  const runtime = settings("pl-PL");
  find(runtime.render(), "select")[0].props.onChange({ target: { value: "zh" } });
  assert.equal(runtime.storage.get("dsh-mobile.language"), "zh");
  assert.equal(runtime.currentLocale(), "zh");
  find(runtime.render(), "select")[0].props.onChange({ target: { value: "auto" } });
  assert.equal(runtime.currentLocale(), "pl");
});

test("settings translates paired, pairing, remote, error, update and timeline states without translating data", () => {
  for (const locale of ["en", "pl", "zh"]) {
    const runtime = settings(locale);
    runtime.render();
    const stamp = Date.UTC(2026, 9, 20, 12, 34);
    runtime.states[1] = { phase: "paired", relayConnection: "connected", dsh: "online", deviceName: "电脑 Łódź", deviceId: "dev_test", relay: "https://relay.test", localActionsAllowed: true, pairing: null };
    runtime.states[4] = [{ id: "session", deviceLabel: "手机", platform: "other", osVersion: "1.0", startedAt: stamp, lastSeenAt: stamp, status: "active" }];
    runtime.states[6] = { currentVersion: "0.1.7", latestVersion: "0.1.8", updateAvailable: true, error: "update_failed", restartRequired: true };
    runtime.states[8] = { qrSvg: "<svg></svg>", qrPayload: "https://relay.test/web-pair#key=private" };
    let tree = runtime.render();
    let visible = text(tree);
    for (const key of ["paired", "connected", "timeline", "active", "removePair", "generateBrowser", "restart", "updateFailed"]) assert.ok(visible.includes(runtime.messages[locale][key]), `${locale}.${key}`);
    assert.ok(visible.includes("电脑 Łódź"));
    assert.ok(visible.includes("手机"));
    assert.ok(visible.includes(new Date(stamp).toLocaleString(locale === "zh" ? "zh-CN" : locale)));
    assert.equal(find(tree, "a")[0].props.href, "https://relay.test/web-pair#key=private");
    assert.equal(find(tree, "div").find(node => node.props.role === "img").props["aria-label"], runtime.messages[locale].browserQr);
    runtime.states[1].phase = "pairing";
    runtime.states[1].pairing = { code: "123456", expiresAt: stamp, qrSvg: "<svg></svg>" };
    runtime.states[6] = { currentVersion: "0.1.7", checking: true };
    visible = text(runtime.render());
    assert.ok(visible.includes(runtime.messages[locale].cancelPair));
    assert.ok(visible.includes(runtime.messages[locale].checking));
    assert.ok(visible.includes("123456"));
    runtime.states[1].localActionsAllowed = false;
    runtime.states[3] = { key: "actionFailed", values: { status: 403 }, reason: "local_management_required" };
    tree = runtime.render();
    assert.equal(find(tree, "button").length, 0);
    assert.ok(text(tree).includes(runtime.messages[locale].remoteReadOnly));
    assert.ok(text(tree).includes(runtime.messages[locale].localRequired));
    const t = (key: string, values: any) => runtime.translate(locale, key, values);
    assert.equal(runtime.errorText({ key: "actionFailed", values: { status: 418 }, reason: "future_reason" }, t), runtime.translate(locale, "errorDetail", { message: runtime.translate(locale, "actionFailed", { status: 418 }), code: "future_reason" }));
  }
});

async function files(browser: string, response: any, ok = true, search = "", systemDark = false) {
  const html = fileManagerHtml();
  const app: any = {
    innerHTML: "",
    attrs: {} as Record<string, string>,
    links: [] as any[],
    setAttribute(name: string, value: string) { this.attrs[name] = value; },
    removeAttribute(name: string) { delete this.attrs[name]; },
    querySelectorAll() {
      this.links = [...this.innerHTML.matchAll(/data-path="([^"]*)"/g)].map((match: RegExpMatchArray) => ({ dataset: { path: match[1] }, onclick: null }));
      return this.links;
    },
  };
  Object.defineProperty(app, "textContent", { get() { return this.innerHTML.replace(/<[^>]*>/g, ""); } });
  const elements: any = {
    app,
    title: { textContent: "" },
    path: { textContent: "" },
  };
  const requests: string[] = [];
  const document: any = {
    documentElement: { lang: "", dataset: {} as Record<string, string> },
    title: "",
    getElementById: (id: string) => elements[id],
    addEventListener: () => {},
    contains: () => false,
  };
  const context = {
    document,
    location: { search },
    URLSearchParams,
    navigator: { languages: [browser] },
    matchMedia: (query: string) => ({ matches: systemDark && query.includes("dark") }),
    window: { addEventListener: () => {} },
    fetch: async (url: string) => { requests.push(url); return typeof response === "function" ? response(requests.length) : { ok, json: async () => response }; },
    __name: (value: unknown) => value,
  };
  // The page has a head bootstrap (theme before first paint) and the main
  // script; both run against the same document in a browser as well.
  for (const match of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) {
    const script = match[1];
    new vm.Script(script);
    vm.runInNewContext(script, context);
  }
  await new Promise(resolve => setImmediate(resolve));
  return { document, elements, requests, html };
}

const directory = { kind: "directory", path: "/文档", parent: "", items: [{ kind: "file", path: "文档/a&b", name: "a&b 中文", size: 12345 }] };

test("remote file HTML follows the language and theme passed by the mobile app", async () => {
  for (const [browser, lang, locale, theme] of [
    ["fr-FR", "pl", "pl", "dark"],
    ["en-US", "zh", "zh", "light"],
    ["pl-PL", "en", "en", "dark"],
  ] as const) {
    const page = await files(browser, directory, true, `?lang=${lang}&theme=${theme}`);
    const tag = locale === "zh" ? "zh-CN" : locale;
    assert.equal(page.document.title, fileMessages[locale].title);
    assert.equal(page.document.documentElement.lang, tag);
    assert.equal(page.document.documentElement.dataset.theme, theme);
    assert.ok(page.elements.app.innerHTML.includes(fileMessages[locale].parent));
    assert.ok(page.elements.app.innerHTML.includes("a&amp;b 中文"));
    assert.ok(page.elements.app.innerHTML.includes((12345).toLocaleString(tag)));
    assert.equal(page.elements.path.textContent, "/文档");
    assert.deepEqual(page.requests, ["/dsh-mobile/api/files?path="]);
    assert.ok(!page.html.includes("language-button"));
    assert.ok(!page.html.includes("language-menu"));
  }
  const content = await files("pl-PL", { kind: "text", path: "/a", content: "<script>中文</script>" }, true, "?lang=pl");
  assert.ok(content.elements.app.innerHTML.includes("<pre>&lt;script&gt;中文&lt;/script&gt;</pre>"));
  const image = await files("pl-PL", { kind: "image", path: "/照片.png" }, true, "?lang=pl");
  assert.match(image.elements.app.innerHTML, /alt="Podgląd obrazu: \/照片.png"/);
});

test("remote file language falls back to the browser and theme to the system", async () => {
  const unsupported = await files("pl-PL", directory, true, "?lang=de");
  assert.equal(unsupported.document.title, fileMessages.pl.title);
  assert.equal(unsupported.document.documentElement.dataset.theme, "light");
  const unknownLanguage = await files("de-DE", directory, true, "?lang=de&theme=dark");
  assert.equal(unknownLanguage.document.title, fileMessages.en.title);
  assert.equal(unknownLanguage.document.documentElement.lang, "en");
  assert.equal(unknownLanguage.document.documentElement.dataset.theme, "dark");
  const systemDark = await files("en-US", directory, true, "", true);
  assert.equal(systemDark.document.documentElement.dataset.theme, "dark");
  const forcedLight = await files("en-US", directory, true, "?theme=light", true);
  assert.equal(forcedLight.document.documentElement.dataset.theme, "light");
});

test("remote file errors localize on initial and navigation renders", async () => {
  for (const locale of ["en", "pl", "zh"] as const) {
    const page = await files(locale, { reason: "preview_too_large" }, false, `?lang=${locale}`);
    assert.equal(page.elements.app.textContent, fileMessages[locale].tooLarge);
    assert.equal(page.elements.app.attrs.role, "alert");
    const invalid = await files(locale, { reason: "relay_unavailable", message: "invalid_file_path" }, false, `?lang=${locale}`);
    assert.equal(invalid.elements.app.textContent, fileMessages[locale].invalidPath);
  }
});

test("remote file navigation catches asynchronous errors in the selected locale", async () => {
  const page = await files("pl-PL", (attempt: number) => attempt === 1
    ? { ok: true, json: async () => ({ kind: "directory", parent: "", path: "/a", items: [] }) }
    : Promise.reject(new Error("network unavailable")), true, "?lang=pl");
  assert.equal(page.elements.app.links.length, 1);
  page.elements.app.links[0].onclick({ preventDefault() {} });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(page.elements.app.textContent, fileMessages.pl.readFailed);
  assert.equal(page.elements.app.attrs["aria-busy"], "false");
  assert.equal(page.elements.app.attrs.role, "alert");
});

test("Polish README retains commands, versions and URLs and is linked from EN/ZH", async () => {
  const en = await readFile(new URL("../README.md", import.meta.url), "utf8");
  const pl = await readFile(new URL("../README.pl.md", import.meta.url), "utf8");
  const zh = await readFile(new URL("../README.zh-CN.md", import.meta.url), "utf8");
  const commands = (value: string) => [...value.matchAll(/```bash\n([\s\S]*?)```/g)].map(match => match[1]);
  assert.deepEqual(commands(pl), commands(en));
  for (const url of en.match(/https:\/\/[^\s)"`]+/g) || []) assert.ok(pl.includes(url), url);
  assert.ok(en.includes("[Polski](README.pl.md)"));
  assert.ok(zh.includes("[Polski](README.pl.md)"));
});
