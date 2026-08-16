window.__ModuleLoader__.load({
  id: "dsh-mobile",
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
      .dshm-button.primary{border-color:#137fec;background:#137fec;color:white}.dshm-button:disabled{opacity:.5;cursor:default}
      .dshm-button:not(:disabled):active{transform:translateY(1px)}
      .dshm-pair{display:grid;grid-template-columns:180px minmax(0,1fr);gap:24px;align-items:center;margin-top:20px;padding:20px;border:1px solid var(--dsw-alias-border-1);border-radius:8px}
      .dshm-qr{width:180px;height:180px;background:#fff}.dshm-qr svg{display:block;width:100%;height:100%}
      .dshm-code{font-size:28px;font-weight:650;letter-spacing:0;font-variant-numeric:tabular-nums;margin:4px 0 8px}
      .dshm-error{color:#d04444;margin-top:14px}.dshm-note{color:var(--dsw-alias-label-secondary);margin-top:18px}
      @media(max-width:620px){.dshm-head{display:block}.dshm-status{margin-top:10px}.dshm-grid{grid-template-columns:110px minmax(0,1fr)}.dshm-pair{grid-template-columns:1fr}.dshm-qr{width:min(220px,100%);height:auto;aspect-ratio:1}}
    `;
    if (!document.querySelector('style[data-plugin-css="dsh-mobile"]')) {
      const style = document.createElement("style");
      style.dataset.pluginCss = "dsh-mobile";
      style.textContent = css;
      document.head.appendChild(style);
    }

    const statusText = {
      connected: "Relay 已连接",
      connecting: "Relay 连接中",
      offline: "Relay 未连接",
    };

    function Row({ label, value }) {
      return h(React.Fragment, null,
        h("div", { className: "dshm-label" }, label),
        h("div", { className: "dshm-value" }, value),
      );
    }

    function RemoteAccessSection() {
      const [state, setState] = useState(null);
      const [busy, setBusy] = useState(false);
      const [error, setError] = useState("");

      const load = useCallback(async () => {
        try {
          const response = await fetch("/dsh-mobile/api/state", { cache: "no-store" });
          if (!response.ok) throw new Error(`状态请求失败 (${response.status})`);
          setState(await response.json());
          setError("");
        } catch (nextError) {
          setError(nextError instanceof Error ? nextError.message : String(nextError));
        }
      }, []);

      useEffect(() => {
        let active = true;
        const refresh = async () => { if (active) await load(); };
        void refresh();
        const timer = setInterval(() => void refresh(), 2000);
        return () => { active = false; clearInterval(timer); };
      }, [load]);

      const action = async (method) => {
        setBusy(true);
        setError("");
        try {
          const response = await fetch("/dsh-mobile/api/pairing", { method });
          const body = await response.json();
          if (!response.ok) throw new Error(body.message || body.reason || `操作失败 (${response.status})`);
          setState((previous) => ({ ...previous, ...body }));
        } catch (nextError) {
          setError(nextError instanceof Error ? nextError.message : String(nextError));
        } finally {
          setBusy(false);
        }
      };

      if (!state) {
        return h("div", { className: "dshm-root" },
          h("h2", { className: "dshm-title" }, "远程访问"),
          h("p", { className: "dshm-subtle" }, error || "正在读取 Companion 状态…"),
        );
      }

      const connected = state.relayConnection === "connected";
      const waiting = state.phase === "pairing" || state.relayConnection === "connecting";
      return h("section", { className: "dshm-root" },
        h("div", { className: "dshm-head" },
          h("div", null,
            h("h2", { className: "dshm-title" }, "远程访问"),
            h("p", { className: "dshm-subtle" }, state.phase === "paired" ? "已配对" : state.phase === "pairing" ? "等待确认" : "尚未配对"),
          ),
          h("div", { className: "dshm-status" },
            h("span", { className: `dshm-dot ${connected ? "online" : waiting ? "wait" : ""}` }),
            statusText[state.relayConnection],
          ),
        ),
        h("div", { className: "dshm-grid" },
          h(Row, { label: "电脑名称", value: state.deviceName }),
          h(Row, { label: "DSH", value: state.dsh === "online" ? "运行中" : "未响应" }),
          h(Row, { label: "Relay", value: state.relay }),
          h(Row, { label: "设备 ID", value: state.deviceId || "尚未配对" }),
        ),
        state.pairing && h("div", { className: "dshm-pair" },
          h("div", { className: "dshm-qr", dangerouslySetInnerHTML: { __html: state.pairing.qrSvg } }),
          h("div", null,
            h("p", { className: "dshm-subtle" }, "手机配对码"),
            h("div", { className: "dshm-code" }, state.pairing.code),
            h("p", { className: "dshm-subtle" }, `有效期至 ${new Date(state.pairing.expiresAt).toLocaleTimeString()}`),
          ),
        ),
        state.localActionsAllowed && h("div", { className: "dshm-actions" },
          state.phase === "unpaired" && h("button", { className: "dshm-button primary", type: "button", disabled: busy, onClick: () => void action("POST") }, busy ? "正在创建…" : "生成配对码"),
          state.phase === "pairing" && h("button", { className: "dshm-button", type: "button", disabled: busy, onClick: () => void action("DELETE") }, "取消配对"),
        ),
        !state.localActionsAllowed && h("p", { className: "dshm-note" }, "远程访问时仅可查看状态。配对管理请在这台电脑上操作。"),
        error && h("p", { className: "dshm-error", role: "alert" }, error),
      );
    }

    const inject = ["slots"];
    function apply(ctx) {
      ctx.slots.inject("settings.section", () => ctx.slots.register({
        name: "settings.section",
        id: "dsh-mobile-remote-access",
        order: 20,
        label: () => "远程访问",
        inject: () => ({}),
      }, RemoteAccessSection));
    }

    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  },
});
