import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
test("offline edition caches complete game assets and stays inside its GitHub Pages scope", async () => {
  const handlers = {},
    scope = "https://example.github.io/ink-and-wonder/",
    files = [],
    deleted = [];
  let waited;
  const cache = {
    addAll: async (value) => files.push(...value),
    match: async (request) => ({ cached: String(request.url || request) }),
  };
  const context = {
    URL,
    Response,
    fetch: async () => {
      throw Error("offline");
    },
    caches: {
      open: async () => cache,
      keys: async () => [
        "unrelated-app-cache",
        "ink-wonder-" + encodeURIComponent(scope) + "-old",
      ],
      delete: async (key) => deleted.push(key),
    },
    self: {
      registration: { scope },
      location: { origin: "https://example.github.io" },
      clients: { claim: async () => {} },
      skipWaiting() {},
      addEventListener: (name, callback) => (handlers[name] = callback),
    },
  };
  vm.runInNewContext(
    fs.readFileSync(new URL("../dist/sw.js", import.meta.url), "utf8"),
    context,
  );
  handlers.install({ waitUntil: (p) => (waited = p) });
  await waited;
  assert.ok(files.includes("game.js"));
  assert.ok(files.includes("assets/fonts/fonts.css"));
  assert.equal(files.filter((f) => f.endsWith(".ttf")).length, 9);
  for (const file of files)
    assert.ok(
      fs.existsSync(
        new URL(
          "../dist/" + (file === "./" ? "index.html" : file),
          import.meta.url,
        ),
      ),
      file,
    );
  handlers.activate({ waitUntil: (p) => (waited = p) });
  await waited;
  assert.equal(deleted.length, 1);
  assert.ok(!deleted.includes("unrelated-app-cache"));
  let result;
  handlers.fetch({
    request: { url: scope + "game.js", method: "GET" },
    respondWith: (p) => (result = p),
  });
  assert.equal((await result).cached, scope + "game.js");
  result = null;
  handlers.fetch({
    request: { url: "https://external.example/font.ttf", method: "GET" },
    respondWith: (p) => (result = p),
  });
  assert.equal(result, null);
});
