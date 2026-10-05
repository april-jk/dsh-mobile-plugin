import test from "node:test";
import assert from "node:assert/strict";
import { WebSocket } from "ws";
import {
  frameLength,
  RelayClient,
  RELAY_INBOUND_QUIET_TICK_MS,
  RELAY_INBOUND_QUIET_TIMEOUT_MS,
  RELAY_WS_PAYLOAD_LIMIT_BYTES,
} from "../src/relay-client.js";
import { Config } from "../src/config.js";

/**
 * The client only uses `readyState`, `send`, `close` and `terminate` on its Relay
 * socket, so the socket is injected directly. This keeps the test on the client's
 * own logic instead of faking a network, and `src/relay-client.ts` keeps using the
 * real `ws` class (an ESM import that `globalThis` patching cannot intercept).
 */
class FakeSocket {
  readyState: number = WebSocket.OPEN;
  readonly sent: string[] = [];
  readonly closed: Array<[number?, string?]> = [];
  terminated = 0;

  send(frame: string) {
    this.sent.push(frame);
  }

  close(code?: number, reason?: string) {
    this.closed.push([code, reason]);
    this.readyState = WebSocket.CLOSED;
  }

  terminate() {
    this.terminated += 1;
    this.readyState = WebSocket.CLOSED;
  }

  /** Frames this socket received, parsed back into envelopes. */
  envelopes() {
    return this.sent.map((frame) => JSON.parse(frame));
  }
}

const config = {
  relay: "http://127.0.0.1:8080",
  deviceId: "device_test",
  deviceToken: "token_test",
  dshPort: 3080,
} as unknown as Config;

/** A client whose socket is a scripted fake, exactly as after a relay connection. */
function clientWithSocket() {
  const client = new RelayClient(config);
  const socket = new FakeSocket();
  (client as any).ws = socket;
  return { client, socket };
}

/** Runs `body` with Date.now() pinned to a movable clock. */
function withClock(body: (advance: (ms: number) => void) => void) {
  const realNow = Date.now;
  let clock = realNow();
  (Date.now as any) = () => clock;
  try {
    body((ms) => {
      clock += ms;
    });
  } finally {
    (Date.now as any) = realNow;
  }
}

test("frameLength tracks the serialized wire frame", () => {
  const compact = frameLength("status", { dsh: "online" });
  const channeled = frameLength("ws_frame", { dataB64: "AAAA" }, "c1");
  assert.ok(channeled > compact);
  const serialized = JSON.stringify({
    v: 1,
    type: "ws_frame",
    channel: "c1",
    id: "x",
    ts: 0,
    payload: { dataB64: "AAAA" },
  }).length;
  assert.ok(Math.abs(channeled - serialized) < 80);
});

test("an oversized sealed frame is dropped instead of killing /device", () => {
  const { client, socket } = clientWithSocket();
  const sessionId = "access_oversized";
  // A real seal() base64urls the whole inner envelope, so a large phone payload
  // comes back as a large sealed frame. Mirrors the reported 5.3 MiB snapshot that
  // inflated to 9.04 MiB and tripped the Relay's 4 MiB single-frame cap.
  (client as any).secureSessions.set(sessionId, {
    seal: () => ({ seq: "1", ciphertextB64: "A".repeat(4_300_000) }),
  });

  const dropped = (client as any).sendInner(sessionId, "ws_frame", {
    dataB64: "AAAA",
    opcode: 1,
  });

  assert.equal(dropped, false);
  assert.equal(socket.sent.length, 0);
  // The device socket survives, so every phone tunnel survives with it.
  assert.equal(socket.closed.length, 0);
  assert.equal(socket.terminated, 0);
  assert.equal(socket.readyState, WebSocket.OPEN);
});

test("a frame that fits is still delivered", () => {
  const { client, socket } = clientWithSocket();
  const sessionId = "access_small";
  (client as any).secureSessions.set(sessionId, {
    seal: () => ({ seq: "1", ciphertextB64: "AAAA" }),
  });

  const sent = (client as any).sendInner(sessionId, "ws_frame", {
    dataB64: "AAAA",
    opcode: 1,
  });
  assert.equal(sent, true);
  assert.equal(socket.sent.length, 1);
  assert.equal(socket.envelopes()[0].type, "sealed");
  assert.equal(socket.envelopes()[0].payload.accessSessionId, sessionId);
});

test("the guard also protects plain control frames", () => {
  const { client, socket } = clientWithSocket();
  const huge = "A".repeat(RELAY_WS_PAYLOAD_LIMIT_BYTES);
  assert.equal((client as any).sendOuter("status", { pad: huge }), false);
  assert.equal(socket.sent.length, 0);

  assert.equal((client as any).sendOuter("status", { dsh: "online" }), true);
  assert.equal(socket.sent.length, 1);
  assert.deepEqual(socket.envelopes()[0].payload, { dsh: "online" });
});

test("half-open Relay socket is torn down after sustained inbound silence", () => {
  const { client, socket } = clientWithSocket();
  (client as any).authenticated = true;
  (client as any).noteInbound();

  withClock((advance) => {
    // Silence below the timeout leaves the connection alone.
    advance(RELAY_INBOUND_QUIET_TIMEOUT_MS - RELAY_INBOUND_QUIET_TICK_MS);
    (client as any).checkInboundSilence();
    assert.equal(socket.terminated, 0);

    // Beyond it the plugin must stop claiming "connected".
    advance(RELAY_INBOUND_QUIET_TICK_MS + 1);
    (client as any).checkInboundSilence();
    assert.equal(socket.terminated, 1);
    assert.equal(socket.readyState, WebSocket.CLOSED);
  });
});

test("a pong refreshes liveness and never closes the socket", () => {
  const { client, socket } = clientWithSocket();
  (client as any).authenticated = true;
  (client as any).noteInbound();

  withClock((advance) => {
    advance(RELAY_INBOUND_QUIET_TIMEOUT_MS - RELAY_INBOUND_QUIET_TICK_MS);
    (client as any).checkInboundSilence();
    assert.equal(socket.terminated, 0);

    const before = (client as any).lastInboundAt;
    advance(1);
    (client as any).handle({ v: 1, type: "pong", id: "p1", ts: 0, payload: {} });

    // The pong was consumed as a keep-alive, not ignored, and refreshed liveness.
    assert.ok(
      (client as any).lastInboundAt > before,
      "pong must refresh the liveness deadline",
    );
    assert.equal(socket.closed.length, 0, "pong must not close the connection");
    assert.equal(socket.terminated, 0);

    // Without that pong this second window would have tripped the watchdog.
    advance(RELAY_INBOUND_QUIET_TIMEOUT_MS - RELAY_INBOUND_QUIET_TICK_MS + 1);
    (client as any).checkInboundSilence();
    assert.equal(socket.terminated, 0);
  });
});

test("silence is ignored before the first inbound frame and after stop()", () => {
  const { client, socket } = clientWithSocket();
  assert.equal((client as any).lastInboundAt, 0);
  withClock((advance) => {
    advance(RELAY_INBOUND_QUIET_TIMEOUT_MS * 4);
    (client as any).checkInboundSilence();
    assert.equal(socket.terminated, 0, "a socket that never spoke is not torn down");
  });

  (client as any).stopped = true;
  (client as any).noteInbound();
  withClock((advance) => {
    advance(RELAY_INBOUND_QUIET_TIMEOUT_MS * 4);
    (client as any).checkInboundSilence();
    assert.equal(socket.terminated, 0, "a stopped client never reconnects");
  });
});

test("a closed socket is left alone", () => {
  const { client, socket } = clientWithSocket();
  (client as any).authenticated = true;
  (client as any).noteInbound();
  socket.readyState = WebSocket.CLOSED;
  withClock((advance) => {
    advance(RELAY_INBOUND_QUIET_TIMEOUT_MS * 4);
    (client as any).checkInboundSilence();
    assert.equal(socket.terminated, 0);
  });
});

test("stop() releases the watchdog so the process can exit", () => {
  const client = new RelayClient(config);
  (client as any).ws = new FakeSocket();
  (client as any).authenticated = true;
  (client as any).lastInboundAt = Date.now();
  // connect() is what schedules the watchdog; replicate its two lines here so the
  // test does not open a real socket.
  (client as any).watchdog = setInterval(
    () => (client as any).checkInboundSilence(),
    RELAY_INBOUND_QUIET_TICK_MS,
  );
  const watchdog = (client as any).watchdog;

  // A live interval keeps the event loop alive; clearing it is what lets the
  // plugin process exit, so assert stop() actually clears this very handle.
  // (`hasRef()` stays true after clearInterval, so it cannot be the assertion.)
  const realClearInterval = globalThis.clearInterval;
  const cleared: unknown[] = [];
  (globalThis as any).clearInterval = (handle: unknown) => {
    cleared.push(handle);
    return realClearInterval(handle as NodeJS.Timeout);
  };
  try {
    client.stop();
  } finally {
    (globalThis as any).clearInterval = realClearInterval;
  }

  assert.equal((client as any).stopped, true);
  assert.ok(cleared.includes(watchdog), "stop() must clear the watchdog interval");
});
