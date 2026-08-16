import http from "node:http";
import { WebSocket } from "ws";
import { randomUUID } from "node:crypto";
function message(type, payload, channel) {
    return { v: 1, type, channel, id: randomUUID(), ts: Date.now(), payload };
}
export function normalizeCloseCode(code) {
    if (typeof code !== "number")
        return undefined;
    if (code === 1000 || code === 1001 || code === 1002 || code === 1003)
        return code;
    if (code >= 1007 && code <= 1014)
        return code;
    if (code >= 3000 && code <= 4999)
        return code;
    return undefined;
}
function closeSocket(socket, code, reason) {
    const normalized = normalizeCloseCode(code);
    if (normalized === undefined)
        socket.close();
    else
        socket.close(normalized, String(reason ?? "").slice(0, 100));
}
export class RelayClient {
    config;
    ws;
    stopped = false;
    authenticated = false;
    health = false;
    retry = 0;
    heartbeat;
    healthTimer;
    localSockets = new Map();
    localRequests = new Map();
    constructor(config) {
        this.config = config;
    }
    status() {
        return { connected: this.authenticated, dsh: this.health };
    }
    async start() {
        this.stopped = false;
        await this.checkHealth();
        this.healthTimer = setInterval(() => void this.checkHealth(), 5000);
        this.connect();
    }
    stop() {
        this.stopped = true;
        clearInterval(this.heartbeat);
        clearInterval(this.healthTimer);
        this.ws?.close();
        for (const socket of this.localSockets.values())
            socket.close();
        for (const request of this.localRequests.values())
            request.destroy();
    }
    relayWsUrl() {
        const url = new URL(this.config.relay);
        url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
        url.pathname = "/device";
        return url.toString();
    }
    connect() {
        if (this.stopped)
            return;
        const ws = new WebSocket(this.relayWsUrl());
        this.ws = ws;
        ws.on("open", () => ws.send(JSON.stringify(message("auth", {
            deviceId: this.config.deviceId,
            deviceToken: this.config.deviceToken,
        }))));
        ws.on("message", (raw) => this.handle(JSON.parse(raw.toString())));
        ws.on("close", () => {
            this.authenticated = false;
            clearInterval(this.heartbeat);
            if (!this.stopped) {
                const schedule = [1000, 2000, 5000, 10000, 30000];
                const delay = schedule[Math.min(this.retry++, schedule.length - 1)];
                console.log(`Relay disconnected; retrying in ${delay / 1000}s`);
                setTimeout(() => this.connect(), delay);
            }
        });
        ws.on("error", () => undefined);
    }
    send(type, payload, channel) {
        if (this.ws?.readyState === WebSocket.OPEN)
            this.ws.send(JSON.stringify(message(type, payload, channel)));
    }
    upstreamHeaders(input) {
        const authority = `127.0.0.1:${this.config.dshPort}`;
        const headers = { ...input, host: authority };
        if (headers.origin)
            headers.origin = `http://${authority}`;
        if (headers.referer)
            headers.referer = `http://${authority}/`;
        delete headers.forwarded;
        delete headers["x-forwarded-for"];
        delete headers["x-forwarded-host"];
        delete headers["x-forwarded-proto"];
        delete headers["x-dsh-mobile-remote"];
        headers["x-dsh-mobile-remote"] = "1";
        return headers;
    }
    async checkHealth() {
        const before = this.health;
        try {
            const response = await fetch(`http://127.0.0.1:${this.config.dshPort}/`, {
                signal: AbortSignal.timeout(2000),
            });
            this.health = response.status < 500;
        }
        catch {
            this.health = false;
        }
        if (before !== this.health || this.authenticated)
            this.send("status", { dsh: this.health ? "online" : "offline" });
    }
    handle(msg) {
        if (msg.type === "auth_ok") {
            this.authenticated = true;
            this.retry = 0;
            console.log(`Connected to Relay; DSH is ${this.health ? "online" : "offline"}`);
            this.send("status", { dsh: this.health ? "online" : "offline" });
            this.heartbeat = setInterval(() => this.send("ping", {}), 25000);
            return;
        }
        if (msg.type === "http_req")
            return this.http(msg);
        if (msg.type === "http_close") {
            this.localRequests.get(msg.channel ?? "")?.destroy();
            this.localRequests.delete(msg.channel ?? "");
            return;
        }
        if (msg.type === "ws_open")
            return this.openWs(msg);
        if (msg.type === "ws_frame") {
            const socket = this.localSockets.get(msg.channel ?? "");
            if (socket?.readyState === WebSocket.OPEN)
                socket.send(Buffer.from(msg.payload.dataB64 ?? "", "base64"), {
                    binary: msg.payload.opcode === 2,
                });
        }
        if (msg.type === "ws_close") {
            const socket = this.localSockets.get(msg.channel ?? "");
            if (socket)
                closeSocket(socket, msg.payload.code, msg.payload.reason);
            this.localSockets.delete(msg.channel ?? "");
        }
    }
    http(msg) {
        const channel = msg.channel ?? "";
        const body = Buffer.from(msg.payload.bodyB64 ?? "", "base64");
        const headers = this.upstreamHeaders(msg.payload.headers ?? {});
        delete headers["content-length"];
        const req = http.request({
            hostname: "127.0.0.1",
            port: this.config.dshPort,
            method: msg.payload.method,
            path: msg.payload.path,
            headers,
        }, (res) => {
            let seq = 0;
            const responseHeaders = { ...res.headers };
            delete responseHeaders["content-length"];
            delete responseHeaders["transfer-encoding"];
            this.send("http_res", {
                status: res.statusCode ?? 502,
                headers: responseHeaders,
                bodyB64: "",
                seq: seq++,
                final: false,
            }, channel);
            res.on("data", (chunk) => {
                this.send("http_res", {
                    bodyB64: Buffer.from(chunk).toString("base64"),
                    seq: seq++,
                    final: false,
                }, channel);
            });
            res.on("end", () => {
                this.send("http_res", { bodyB64: "", seq: seq++, final: true }, channel);
                this.localRequests.delete(channel);
            });
        });
        this.localRequests.set(channel, req);
        req.on("error", () => {
            this.localRequests.delete(channel);
            this.send("http_res", {
                status: 502,
                headers: { "content-type": "application/json" },
                bodyB64: Buffer.from(JSON.stringify({ error: "dsh_unreachable" })).toString("base64"),
                final: true,
            }, channel);
        });
        if (body.length)
            req.write(body);
        req.end();
    }
    openWs(msg) {
        const channel = msg.channel ?? "";
        const url = `ws://127.0.0.1:${this.config.dshPort}${msg.payload.path}`;
        const headers = this.upstreamHeaders(msg.payload.headers ?? {});
        const socket = new WebSocket(url, { headers });
        this.localSockets.set(channel, socket);
        socket.on("open", () => this.send("ws_open_ok", {}, channel));
        socket.on("message", (data, binary) => this.send("ws_frame", {
            dataB64: Buffer.from(data).toString("base64"),
            opcode: binary ? 2 : 1,
        }, channel));
        socket.on("close", (code, reason) => {
            this.localSockets.delete(channel);
            this.send("ws_close", { code, reason: reason.toString() }, channel);
        });
        socket.on("error", () => undefined);
    }
}
