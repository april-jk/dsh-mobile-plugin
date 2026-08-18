import { spawn } from "node:child_process";
import { PLUGIN_PACKAGE, PLUGIN_REPOSITORY, PLUGIN_VERSION, compareVersions } from "./version.js";
const VERSION_TAG = /^v(\d+)\.(\d+)\.(\d+)$/;
const CHECK_INTERVAL_MS = 15 * 60 * 1000;
function validTag(value) {
    return typeof value === "string" && VERSION_TAG.test(value);
}
function defaultRunner(tag) {
    return new Promise((resolve, reject) => {
        const command = process.platform === "win32" ? "npx.cmd" : "npx";
        const child = spawn(command, [
            "--yes",
            "@deepseek-ai/dsh@0.1.0-rc.6",
            "plugin",
            "--profile",
            "web",
            "add",
            `github:${PLUGIN_REPOSITORY}#${tag}`,
        ], { stdio: ["ignore", "ignore", "ignore"], windowsHide: true });
        const timer = setTimeout(() => {
            child.kill("SIGTERM");
            reject(new Error("update_timeout"));
        }, 5 * 60 * 1000);
        child.once("error", (error) => { clearTimeout(timer); reject(error); });
        child.once("exit", (code) => {
            clearTimeout(timer);
            code === 0 ? resolve() : reject(new Error("update_command_failed"));
        });
    });
}
export class PluginUpdater {
    run;
    get;
    status = {
        currentVersion: PLUGIN_VERSION,
        latestVersion: null,
        updateAvailable: false,
        checking: false,
        updating: false,
        restartRequired: false,
        releaseUrl: null,
        releaseNotes: null,
        error: null,
    };
    checkedAt = 0;
    inFlight;
    constructor(options = {}) {
        this.run = options.run ?? defaultRunner;
        this.get = options.fetcher ?? fetch;
    }
    state() { return { ...this.status }; }
    async check(force = false) {
        if (!force && Date.now() - this.checkedAt < CHECK_INTERVAL_MS && this.status.latestVersion)
            return this.state();
        if (this.inFlight)
            return this.inFlight;
        this.status = { ...this.status, checking: true, error: null };
        this.inFlight = this.fetchLatest().finally(() => { this.inFlight = undefined; });
        return this.inFlight;
    }
    async fetchLatest() {
        try {
            const response = await this.get(`https://api.github.com/repos/${PLUGIN_REPOSITORY}/releases/latest`, {
                headers: { accept: "application/vnd.github+json", "user-agent": PLUGIN_PACKAGE },
                signal: AbortSignal.timeout(8000),
            });
            if (!response.ok)
                throw new Error("update_check_failed");
            const release = await response.json();
            if (!validTag(release.tag_name))
                throw new Error("invalid_release_version");
            const latestVersion = release.tag_name.slice(1);
            this.status = {
                ...this.status,
                checking: false,
                latestVersion,
                updateAvailable: compareVersions(latestVersion, PLUGIN_VERSION) > 0,
                releaseUrl: typeof release.html_url === "string" ? release.html_url : null,
                releaseNotes: typeof release.body === "string" ? release.body.slice(0, 2000) : null,
                error: null,
            };
            this.checkedAt = Date.now();
        }
        catch {
            this.status = { ...this.status, checking: false, error: "update_check_failed" };
        }
        return this.state();
    }
    async update() {
        const latest = await this.check();
        if (!latest.updateAvailable || !latest.latestVersion || this.status.updating)
            return this.state();
        this.status = { ...this.status, updating: true, error: null };
        try {
            await this.run(`v${latest.latestVersion}`);
            this.status = { ...this.status, updating: false, restartRequired: true, error: null };
        }
        catch {
            this.status = { ...this.status, updating: false, error: "update_failed" };
        }
        return this.state();
    }
}
