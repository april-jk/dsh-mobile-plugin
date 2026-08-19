import test from "node:test";
import assert from "node:assert/strict";
import { PluginUpdater } from "../src/updater.js";

function response(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

test("checks the official latest release and compares versions", async () => {
  let requested = "";
  const updater = new PluginUpdater({
    fetcher: async (input) => {
      requested = String(input);
      return response({ tag_name: "v0.1.9", html_url: "https://github.com/april-jk/dsh-mobile-plugin/releases/tag/v0.1.9", body: "notes" });
    },
  });
  const state = await updater.check(true);
  assert.match(requested, /api\.github\.com\/repos\/april-jk\/dsh-mobile-plugin\/releases\/latest/);
  assert.equal(state.currentVersion, "0.1.8");
  assert.equal(state.latestVersion, "0.1.9");
  assert.equal(state.updateAvailable, true);
});

test("installs only a validated release tag and requires restart", async () => {
  const tags: string[] = [];
  const updater = new PluginUpdater({
    fetcher: async () => response({ tag_name: "v0.1.9" }),
    run: async (tag) => { tags.push(tag); },
  });
  const state = await updater.update();
  assert.deepEqual(tags, ["v0.1.9"]);
  assert.equal(state.restartRequired, true);
  assert.equal(state.error, null);
});

test("rejects malformed release tags", async () => {
  const updater = new PluginUpdater({ fetcher: async () => response({ tag_name: "main" }) });
  const state = await updater.check(true);
  assert.equal(state.latestVersion, null);
  assert.equal(state.error, "update_check_failed");
});
