window.__ModuleLoader__.load({
  id: "@april-jk/dsh-mobile",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    const React = require("react");
    const { useCallback, useEffect, useState } = React;
    const h = React.createElement;

    const css = `
      .dshm-root{color:var(--dsw-alias-label-primary);max-width:620px;padding:4px 0 24px;font-size:14px;line-height:1.55}
      .dshm-head{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;margin-bottom:24px}
      .dshm-title{font-size:18px;font-weight:600;line-height:26px;margin:0 0 4px}
      .dshm-subtle{color:var(--dsw-alias-label-secondary);margin:0}
      .dshm-status{display:inline-flex;align-items:center;gap:7px;white-space:nowrap;padding-top:4px}
      .dshm-dot{width:8px;height:8px;border-radius:50%;background:#8a8f98}
      .dshm-dot.online{background:#20a464}.dshm-dot.wait{background:#d08b19}
      .dshm-grid{display:grid;grid-template-columns:140px minmax(0,1fr);gap:0;border-top:1px solid var(--dsw-alias-border-1)}
      .dshm-label,.dshm-value{padding:13px 0;border-bottom:1px solid var(--dsw-alias-border-1)}
      .dshm-label{color:var(--dsw-alias-label-secondary)}
      .dshm-value{overflow-wrap:anywhere}
      .dshm-actions{display:flex;align-items:center;gap:10px;margin-top:22px;flex-wrap:wrap}
      .dshm-button{height:36px;border:1px solid var(--dsw-alias-border-1);border-radius:8px;padding:0 16px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;cursor:pointer;white-space:nowrap}
      .dshm-button.primary{border-color:#137fec;background:#137fec;color:white}.dshm-button.danger{border-color:#d04444;color:#d04444}.dshm-button:disabled{opacity:.5;cursor:default}
      .dshm-button:not(:disabled):active{transform:translateY(1px)}
      .dshm-pair{display:grid;grid-template-columns:180px minmax(0,1fr);gap:24px;align-items:center;margin-top:20px;padding:20px;border:1px solid var(--dsw-alias-border-1);border-radius:8px}
      .dshm-qr{width:180px;height:180px;background:#fff}.dshm-qr svg{display:block;width:100%;height:100%}
      .dshm-code{font-size:28px;font-weight:650;letter-spacing:0;font-variant-numeric:tabular-nums;margin:4px 0 8px}
      .dshm-error{color:#d04444;margin-top:14px}.dshm-note{color:var(--dsw-alias-label-secondary);margin-top:18px}
      .dshm-log{margin-top:30px}.dshm-log-title{font-size:15px;font-weight:600;margin:0 0 10px}
      .dshm-timeline{list-style:none;margin:0;padding:0;border-top:1px solid var(--dsw-alias-border-1)}
      .dshm-entry{display:grid;grid-template-columns:minmax(130px,1fr) minmax(190px,1.4fr) auto;gap:16px;align-items:center;padding:13px 0;border-bottom:1px solid var(--dsw-alias-border-1)}
      .dshm-device{font-weight:500}.dshm-meta,.dshm-time{color:var(--dsw-alias-label-secondary);font-size:13px}.dshm-time{text-align:right;white-space:nowrap}
      .dshm-empty{color:var(--dsw-alias-label-secondary);padding:18px 0;border-top:1px solid var(--dsw-alias-border-1);border-bottom:1px solid var(--dsw-alias-border-1)}
      .dshm-update{margin-top:24px;padding-top:18px;border-top:1px solid var(--dsw-alias-border-1)}
      .dshm-update-head{display:flex;align-items:center;justify-content:space-between;gap:16px}
      .dshm-update-title{font-size:15px;font-weight:600;margin:0}.dshm-update-copy{color:var(--dsw-alias-label-secondary);margin:4px 0 0}
      .dshm-browser{margin-top:18px;padding-top:18px;border-top:1px solid var(--dsw-alias-border-1)}
      .dshm-browser-qr{width:180px;height:180px;background:#fff;margin-top:12px}.dshm-browser-qr svg{display:block;width:100%;height:100%}
      .dshm-browser-link{display:block;margin-top:10px;color:var(--dsw-alias-label-secondary);font-size:12px;overflow-wrap:anywhere}
      @media(max-width:620px){.dshm-head{display:block}.dshm-status{margin-top:10px}.dshm-grid{grid-template-columns:110px minmax(0,1fr)}.dshm-pair{grid-template-columns:1fr}.dshm-qr{width:min(220px,100%);height:auto;aspect-ratio:1}}
      @media(max-width:620px){.dshm-entry{grid-template-columns:1fr auto}.dshm-time{grid-column:1/-1;text-align:left}}
    `;
    if (!document.querySelector('style[data-plugin-css="dsh-mobile"]')) {
      const style = document.createElement("style");
      style.dataset.pluginCss = "dsh-mobile";
      style.textContent = css;
      document.head.appendChild(style);
    }

    // This browser runtime owns its catalog; API values, paths and QR payloads stay data.
    const messages = {
  "en": {
    "remoteAccess": "Remote access",
    "connected": "Relay connected",
    "connecting": "Connecting to Relay",
    "offline": "Relay disconnected",
    "stateFailed": "State request failed ({status})",
    "logFailed": "Access log request failed ({status})",
    "checkFailed": "Version check failed",
    "unknown": "Unknown",
    "updateFailed": "Update failed",
    "browserFailed": "Could not generate browser access code",
    "actionFailed": "Operation failed ({status})",
    "loading": "Reading Companion status…",
    "paired": "Paired",
    "pairing": "Awaiting confirmation",
    "unpaired": "Not paired",
    "computer": "Computer name",
    "running": "Running",
    "notResponding": "Not responding",
    "deviceId": "Device ID",
    "updates": "Plugin updates",
    "checking": "Checking for updates…",
    "checkUnavailable": "Unable to check for updates right now",
    "newVersion": "New version {version} available",
    "currentVersion": "Current version {version}",
    "updating": "Updating…",
    "installUpdate": "Update now",
    "restart": "Update installed. Restart DSH to load the new version.",
    "localUpdate": "A new version is available. Open these settings on the computer running DSH to update.",
    "pairCode": "Phone pairing code",
    "expires": "Valid until {time}",
    "creating": "Creating…",
    "generatePair": "Generate pairing code",
    "cancelPair": "Cancel pairing",
    "confirmRemove": "Removing the pairing prevents the phone from remotely accessing this computer. Scan a new QR code to pair again.",
    "removing": "Removing…",
    "removePair": "Remove pairing",
    "generating": "Generating…",
    "generateBrowser": "Generate browser access code",
    "browserCode": "Browser binding code",
    "browserNote": "Open this link on another phone or browser and sign in to the same account to add a browser client. The key stays in the URL fragment and is not sent to the Relay.",
    "remoteReadOnly": "Remote access is read-only here. Manage pairing on this computer.",
    "timeline": "Access timeline",
    "emptySessions": "No phone access recorded yet",
    "pairFirst": "Access history appears after pairing",
    "otherDevice": "Other device",
    "sessionTimes": "Started {started} · Last access {last}",
    "active": "Active",
    "expired": "Expired",
    "ended": "Ended",
    "language": "Language",
    "automatic": "System / browser",
    "pairQr": "Phone pairing QR code",
    "browserQr": "Browser access QR code",
    "localRequired": "Manage this operation on the local computer.",
    "notPaired": "This computer is not paired yet.",
    "relayUnavailable": "Relay unavailable. Try again.",
    "notFound": "Not found.",
    "updateTimeout": "Update timed out. Try again.",
    "invalidRelease": "Invalid release version.",
    "errorDetail": "{message} ({code})"
  },
  "pl": {
    "remoteAccess": "Dostęp zdalny",
    "connected": "Połączono z Relay",
    "connecting": "Łączenie z Relay",
    "offline": "Brak połączenia z Relay",
    "stateFailed": "Nie udało się pobrać stanu ({status})",
    "logFailed": "Nie udało się pobrać historii dostępu ({status})",
    "checkFailed": "Nie udało się sprawdzić wersji",
    "unknown": "Nieznana",
    "updateFailed": "Aktualizacja nie powiodła się",
    "browserFailed": "Nie udało się wygenerować kodu dostępu przez przeglądarkę",
    "actionFailed": "Operacja nie powiodła się ({status})",
    "loading": "Odczytywanie stanu Companion…",
    "paired": "Sparowano",
    "pairing": "Oczekiwanie na potwierdzenie",
    "unpaired": "Nie sparowano",
    "computer": "Nazwa komputera",
    "running": "Działa",
    "notResponding": "Nie odpowiada",
    "deviceId": "Identyfikator urządzenia",
    "updates": "Aktualizacje wtyczki",
    "checking": "Sprawdzanie aktualizacji…",
    "checkUnavailable": "Nie można teraz sprawdzić aktualizacji",
    "newVersion": "Dostępna jest nowa wersja {version}",
    "currentVersion": "Obecna wersja: {version}",
    "updating": "Aktualizowanie…",
    "installUpdate": "Aktualizuj teraz",
    "restart": "Aktualizacja zainstalowana. Uruchom ponownie DSH, aby wczytać nową wersję.",
    "localUpdate": "Dostępna jest nowa wersja. Aby zaktualizować, otwórz te ustawienia na komputerze z uruchomionym DSH.",
    "pairCode": "Kod parowania telefonu",
    "expires": "Ważny do {time}",
    "creating": "Tworzenie…",
    "generatePair": "Wygeneruj kod parowania",
    "cancelPair": "Anuluj parowanie",
    "confirmRemove": "Usunięcie parowania uniemożliwi telefonowi zdalny dostęp do tego komputera. Aby sparować ponownie, zeskanuj nowy kod QR.",
    "removing": "Usuwanie…",
    "removePair": "Usuń parowanie",
    "generating": "Generowanie…",
    "generateBrowser": "Wygeneruj kod dostępu przez przeglądarkę",
    "browserCode": "Kod powiązania przeglądarki",
    "browserNote": "Otwórz ten link na innym telefonie lub w innej przeglądarce i zaloguj się na to samo konto, aby dodać klienta przeglądarkowego. Klucz pozostaje we fragmencie adresu URL i nie jest wysyłany do Relay.",
    "remoteReadOnly": "Tutaj dostęp zdalny pozwala tylko odczytywać stan. Zarządzaj parowaniem na tym komputerze.",
    "timeline": "Historia dostępu",
    "emptySessions": "Brak zarejestrowanego dostępu z telefonu",
    "pairFirst": "Historia dostępu pojawi się po sparowaniu",
    "otherDevice": "Inne urządzenie",
    "sessionTimes": "Początek: {started} · Ostatni dostęp: {last}",
    "active": "Aktywna",
    "expired": "Wygasła",
    "ended": "Zakończona",
    "language": "Język",
    "automatic": "System / przeglądarka",
    "pairQr": "Kod QR parowania telefonu",
    "browserQr": "Kod QR dostępu przez przeglądarkę",
    "localRequired": "Wykonaj tę operację na komputerze lokalnym.",
    "notPaired": "Ten komputer nie jest jeszcze sparowany.",
    "relayUnavailable": "Relay jest niedostępny. Spróbuj ponownie.",
    "notFound": "Nie znaleziono.",
    "updateTimeout": "Przekroczono czas aktualizacji. Spróbuj ponownie.",
    "invalidRelease": "Nieprawidłowa wersja wydania.",
    "errorDetail": "{message} ({code})"
  },
  "zh": {
    "remoteAccess": "远程访问",
    "connected": "Relay 已连接",
    "connecting": "Relay 连接中",
    "offline": "Relay 未连接",
    "stateFailed": "状态请求失败 ({status})",
    "logFailed": "访问日志请求失败 ({status})",
    "checkFailed": "版本检查失败",
    "unknown": "未知",
    "updateFailed": "更新失败",
    "browserFailed": "无法生成浏览器访问码",
    "actionFailed": "操作失败 ({status})",
    "loading": "正在读取 Companion 状态…",
    "paired": "已配对",
    "pairing": "等待确认",
    "unpaired": "尚未配对",
    "computer": "电脑名称",
    "running": "运行中",
    "notResponding": "未响应",
    "deviceId": "设备 ID",
    "updates": "插件更新",
    "checking": "正在检查版本…",
    "checkUnavailable": "暂时无法检查更新",
    "newVersion": "发现新版本 {version}",
    "currentVersion": "当前版本 {version}",
    "updating": "正在更新…",
    "installUpdate": "一键更新",
    "restart": "更新已安装。请重启 DSH 以加载新版本。",
    "localUpdate": "检测到新版本，请在运行 DSH 的电脑上打开此设置页更新。",
    "pairCode": "手机配对码",
    "expires": "有效期至 {time}",
    "creating": "正在创建…",
    "generatePair": "生成配对码",
    "cancelPair": "取消配对",
    "confirmRemove": "移除配对后，手机将无法远程访问这台电脑。再次使用时需要重新扫码配对。",
    "removing": "正在移除…",
    "removePair": "移除配对",
    "generating": "正在生成…",
    "generateBrowser": "生成浏览器访问码",
    "browserCode": "浏览器绑定码",
    "browserNote": "在另一台手机或浏览器中打开此链接并登录同一账号，即可新增一个浏览器访问端。密钥位于链接片段中，不会发送给 Relay。",
    "remoteReadOnly": "远程访问时仅可查看状态。配对管理请在这台电脑上操作。",
    "timeline": "访问时间线",
    "emptySessions": "暂无手机访问记录",
    "pairFirst": "完成配对后显示访问记录",
    "otherDevice": "其他设备",
    "sessionTimes": "开始 {started} · 最后访问 {last}",
    "active": "活跃",
    "expired": "已过期",
    "ended": "已结束",
    "language": "语言",
    "automatic": "系统 / 浏览器",
    "pairQr": "手机配对二维码",
    "browserQr": "浏览器访问二维码",
    "localRequired": "请在本机电脑上执行此操作。",
    "notPaired": "这台电脑尚未配对。",
    "relayUnavailable": "Relay 不可用，请重试。",
    "notFound": "未找到。",
    "updateTimeout": "更新超时，请重试。",
    "invalidRelease": "发布版本无效。",
    "errorDetail": "{message} ({code})"
  }
};
    const languageKey = "dsh-mobile.language";
    const localeTags = { en: "en", pl: "pl", zh: "zh-CN" };
    let preference = "auto";
    try { preference = localStorage.getItem(languageKey) || "auto"; } catch {}
    function validPreference(value) { return ["auto", "en", "pl", "zh"].includes(value) ? value : "auto"; }
    preference = validPreference(preference);
    function resolveLocale(value) {
      const primary = String(value || "").toLowerCase().split(/[-_]/)[0];
      return Object.hasOwn(messages, primary) ? primary : "en";
    }
    function currentLocale() {
      return resolveLocale(preference === "auto" ? (navigator.languages?.[0] || navigator.language) : preference);
    }
    function translate(locale, key, values = {}) {
      return (messages[locale][key] || messages.en[key] || key).replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? ""));
    }
    function useLocale() {
      const [, refresh] = useState(0);
      useEffect(() => {
        const changed = () => refresh((value) => value + 1);
        const stored = (event) => { if (event.key === languageKey || event.key === null) { preference = validPreference(event.newValue); changed(); } };
        window.addEventListener("dsh-mobile-language", changed);
        window.addEventListener("languagechange", changed);
        window.addEventListener("storage", stored);
        return () => { window.removeEventListener("dsh-mobile-language", changed); window.removeEventListener("languagechange", changed); window.removeEventListener("storage", stored); };
      }, []);
      const locale = currentLocale();
      return { locale, t: (key, values) => translate(locale, key, values) };
    }
    function failure(key, values = {}, body = {}) { return { key, values, reason: body.reason }; }
    function errorText(error, t) {
      if (!error) return "";
      const codes = { local_management_required: "localRequired", not_paired: "notPaired", relay_unavailable: "relayUnavailable", not_found: "notFound", update_check_failed: "checkFailed", update_failed: "updateFailed", update_timeout: "updateTimeout", update_command_failed: "updateFailed", invalid_release_version: "invalidRelease" };
      const code = typeof error === "string" ? error : error.reason;
      if (codes[code]) return t(codes[code]);
      const message = t(error.key || "updateFailed", error.values);
      return code ? t("errorDetail", { message, code }) : message;
    }

    function Row({ label, value }) {
      return h(React.Fragment, null,
        h("div", { className: "dshm-label" }, label),
        h("div", { className: "dshm-value" }, value),
      );
    }

    function RemoteAccessSection() {
      const { locale, t } = useLocale();
      const date = (value, timeOnly = false) => { const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? t("unknown") : timeOnly ? parsed.toLocaleTimeString(localeTags[locale]) : parsed.toLocaleString(localeTags[locale]); };
      const languageControl = h("label", null, t("language"), " ", h("select", { value: preference, "aria-label": t("language"), onChange: (event) => { preference = event.target.value; try { localStorage.setItem(languageKey, preference); } catch {} window.dispatchEvent(new Event("dsh-mobile-language")); } }, [ ["auto", t("automatic")], ["en", "English"], ["pl", "Polski"], ["zh", "简体中文"] ].map(([value, text]) => h("option", { key: value, value }, text))));
      const [state, setState] = useState(null);
      const [busy, setBusy] = useState(false);
      const [error, setError] = useState("");
      const [sessions, setSessions] = useState([]);
      const [logError, setLogError] = useState("");
      const [update, setUpdate] = useState(null);
      const [updateBusy, setUpdateBusy] = useState(false);
      const [browserAccess, setBrowserAccess] = useState(null);
      const [browserBusy, setBrowserBusy] = useState(false);

      const load = useCallback(async () => {
        try {
          const response = await fetch("/dsh-mobile/api/state", { cache: "no-store" });
          if (!response.ok) throw failure("stateFailed", { status: response.status });
          setState(await response.json());
          setError("");
        } catch (nextError) {
          setError(nextError?.key ? nextError : failure("stateFailed", { status: "—" }));
        }
      }, []);

      useEffect(() => {
        let active = true;
        const refresh = async () => { if (active) await load(); };
        void refresh();
        const timer = setInterval(() => void refresh(), 2000);
        return () => { active = false; clearInterval(timer); };
      }, [load]);

      const loadSessions = useCallback(async () => {
        try {
          const response = await fetch("/dsh-mobile/api/access-sessions", { cache: "no-store" });
          if (!response.ok) throw failure("logFailed", { status: response.status });
          const body = await response.json();
          setSessions(Array.isArray(body.sessions) ? body.sessions : []);
          setLogError("");
        } catch (nextError) {
          setLogError(nextError?.key ? nextError : failure("logFailed", { status: "—" }));
        }
      }, []);

      useEffect(() => {
        let active = true;
        const refresh = async () => { if (active) await loadSessions(); };
        void refresh();
        const timer = setInterval(() => void refresh(), 10000);
        return () => { active = false; clearInterval(timer); };
      }, [loadSessions]);

      const loadUpdate = useCallback(async () => {
        try {
          const response = await fetch("/dsh-mobile/api/update", { cache: "no-store" });
          if (!response.ok) throw failure("checkFailed");
          setUpdate(await response.json());
        } catch (nextError) {
          setUpdate({ currentVersion: null, latestVersion: null, updateAvailable: false, checking: false, updating: false, restartRequired: false, error: nextError?.key ? nextError : failure("checkFailed") });
        }
      }, []);

      useEffect(() => { void loadUpdate(); }, [loadUpdate]);

      const runUpdate = async () => {
        setUpdateBusy(true);
        try {
          const response = await fetch("/dsh-mobile/api/update", { method: "POST" });
          const body = await response.json();
          if (!response.ok) throw failure("updateFailed", {}, body);
          setUpdate(body);
        } catch (nextError) {
          setUpdate((previous) => ({ ...(previous || {}), error: nextError?.key ? nextError : failure("updateFailed") }));
        } finally {
          setUpdateBusy(false);
        }
      };

      const generateBrowserAccess = async () => {
        setBrowserBusy(true);
        setError("");
        try {
          const response = await fetch("/dsh-mobile/api/browser-access", { cache: "no-store" });
          const body = await response.json();
          if (!response.ok) throw failure("browserFailed", {}, body);
          setBrowserAccess(body);
        } catch (nextError) {
          setError(nextError?.key ? nextError : failure("browserFailed"));
        } finally {
          setBrowserBusy(false);
        }
      };

      const action = async (method) => {
        setBusy(true);
        setError("");
        try {
          const response = await fetch("/dsh-mobile/api/pairing", { method });
          const body = await response.json();
          if (!response.ok) throw failure("actionFailed", { status: response.status }, body);
          setState((previous) => ({ ...previous, ...body }));
          if (body.phase === "unpaired") setSessions([]);
        } catch (nextError) {
          setError(nextError?.key ? nextError : failure("actionFailed", { status: "—" }));
        } finally {
          setBusy(false);
        }
      };

      if (!state) {
        return h("div", { className: "dshm-root", lang: localeTags[locale] },
          languageControl,
          h("h2", { className: "dshm-title" }, t("remoteAccess")),
          h("p", { className: "dshm-subtle" }, errorText(error, t) || t("loading")),
        );
      }

      const connected = state.relayConnection === "connected";
      const waiting = state.phase === "pairing" || state.relayConnection === "connecting";
      return h("section", { className: "dshm-root", lang: localeTags[locale] },
        h("div", { className: "dshm-head" },
          h("div", null,
            languageControl,
          h("h2", { className: "dshm-title" }, t("remoteAccess")),
            h("p", { className: "dshm-subtle" }, state.phase === "paired" ? t("paired") : state.phase === "pairing" ? t("pairing") : t("unpaired")),
          ),
          h("div", { className: "dshm-status", role: "status" },
            h("span", { className: `dshm-dot ${connected ? "online" : waiting ? "wait" : ""}` }),
            t(["connected", "connecting", "offline"].includes(state.relayConnection) ? state.relayConnection : "offline"),
          ),
        ),
        h("div", { className: "dshm-grid" },
          h(Row, { label: t("computer"), value: state.deviceName }),
          h(Row, { label: "DSH", value: state.dsh === "online" ? t("running") : t("notResponding") }),
          h(Row, { label: "Relay", value: state.relay }),
          h(Row, { label: t("deviceId"), value: state.deviceId || t("unpaired") }),
        ),
        h("div", { className: "dshm-update" },
          h("div", { className: "dshm-update-head" },
            h("div", null,
              h("h3", { className: "dshm-update-title" }, t("updates")),
              h("p", { className: "dshm-update-copy" }, update?.checking ? t("checking") : update?.error ? t("checkUnavailable") : update?.updateAvailable ? t("newVersion", { version: update.latestVersion }) : t("currentVersion", { version: update?.currentVersion || t("unknown") })),
            ),
            state.localActionsAllowed && update?.updateAvailable && h("button", { className: "dshm-button primary", type: "button", disabled: updateBusy || update?.updating, onClick: () => void runUpdate() }, updateBusy || update?.updating ? t("updating") : t("installUpdate")),
          ),
          update?.error && h("p", { className: "dshm-error", role: "alert" }, errorText(update.error, t)),
          update?.restartRequired && h("p", { className: "dshm-note" }, t("restart")),
          !state.localActionsAllowed && update?.updateAvailable && h("p", { className: "dshm-note" }, t("localUpdate")),
        ),
        state.pairing && h("div", { className: "dshm-pair" },
          h("div", { className: "dshm-qr", role: "img", "aria-label": t("pairQr"), dangerouslySetInnerHTML: { __html: state.pairing.qrSvg } }),
          h("div", null,
            h("p", { className: "dshm-subtle" }, t("pairCode")),
            h("div", { className: "dshm-code" }, state.pairing.code),
            h("p", { className: "dshm-subtle" }, t("expires", { time: date(state.pairing.expiresAt, true) })),
          ),
        ),
        state.localActionsAllowed && h("div", { className: "dshm-actions" },
          state.phase === "unpaired" && h("button", { className: "dshm-button primary", type: "button", disabled: busy, onClick: () => void action("POST") }, busy ? t("creating") : t("generatePair")),
          state.phase === "pairing" && h("button", { className: "dshm-button", type: "button", disabled: busy, onClick: () => void action("DELETE") }, t("cancelPair")),
          state.phase === "paired" && h("button", {
            className: "dshm-button danger",
            type: "button",
            disabled: busy,
            onClick: () => {
              if (window.confirm(t("confirmRemove"))) void action("DELETE");
            },
          }, busy ? t("removing") : t("removePair")),
          state.phase === "paired" && h("button", { className: "dshm-button", type: "button", disabled: browserBusy, onClick: () => void generateBrowserAccess() }, browserBusy ? t("generating") : t("generateBrowser")),
        ),
        browserAccess && h("div", { className: "dshm-browser" },
          h("strong", null, t("browserCode")),
          h("p", { className: "dshm-note" }, t("browserNote")),
          h("div", { className: "dshm-browser-qr", role: "img", "aria-label": t("browserQr"), dangerouslySetInnerHTML: { __html: browserAccess.qrSvg } }),
          h("a", { className: "dshm-browser-link", href: browserAccess.qrPayload, target: "_blank", rel: "noreferrer" }, browserAccess.qrPayload),
        ),
        !state.localActionsAllowed && h("p", { className: "dshm-note" }, t("remoteReadOnly")),
        error && h("p", { className: "dshm-error", role: "alert" }, errorText(error, t)),
        h("div", { className: "dshm-log" },
          h("h3", { className: "dshm-log-title" }, t("timeline")),
          sessions.length === 0
            ? h("div", { className: "dshm-empty" }, state.phase === "paired" ? t("emptySessions") : t("pairFirst"))
            : h("ol", { className: "dshm-timeline" }, sessions.map((session) =>
                h("li", { className: "dshm-entry", key: session.id },
                  h("div", null,
                    h("div", { className: "dshm-device" }, session.deviceLabel),
                    h("div", { className: "dshm-meta" }, [session.platform === "ios" ? "iOS" : session.platform === "android" ? "Android" : t("otherDevice"), session.osVersion].filter(Boolean).join(" · ")),
                  ),
                  h("div", { className: "dshm-meta" }, t("sessionTimes", { started: date(session.startedAt), last: date(session.lastSeenAt) })),
                  h("div", { className: "dshm-time" }, session.status === "active" ? t("active") : session.status === "expired" ? t("expired") : t("ended")),
                ),
              )),
          logError && h("p", { className: "dshm-error", role: "alert" }, errorText(logError, t)),
        ),
      );
    }

    const inject = ["slots"];
    function apply(ctx) {
      ctx.slots.inject("settings.section", () => {
        const register = () => ctx.slots.register({
          name: "settings.section",
          id: "dsh-mobile-remote-access",
          order: 20,
          label: () => translate(currentLocale(), "remoteAccess"),
          inject: () => ({}),
        }, RemoteAccessSection);
        let unregister = register();
        // Notify the settings navigation owner as well as the mounted section.
        const changed = () => { unregister(); unregister = register(); };
        const stored = (event) => {
          if (event.key === languageKey || event.key === null) {
            preference = validPreference(event.newValue);
            changed();
          }
        };
        window.addEventListener("dsh-mobile-language", changed);
        window.addEventListener("languagechange", changed);
        window.addEventListener("storage", stored);
        return () => {
          unregister();
          window.removeEventListener("dsh-mobile-language", changed);
          window.removeEventListener("languagechange", changed);
          window.removeEventListener("storage", stored);
        };
      });
    }

    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  },
});
