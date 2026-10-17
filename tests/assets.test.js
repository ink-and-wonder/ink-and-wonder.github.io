import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
const root = new URL("../dist/", import.meta.url);
test("HTML, CSS, modules, install icons and offline assets resolve under a repository subpath", () => {
  const html = fs.readFileSync(new URL("index.html", root), "utf8"),
    css = fs.readFileSync(new URL("style.css", root), "utf8"),
    sw = fs.readFileSync(new URL("sw.js", root), "utf8");
  const local = [...html.matchAll(/(?:href|src)="([^"#][^"]*)"/g)]
    .map((m) => m[1])
    .filter((p) => p !== "./");
  for (const file of local) assert.ok(fs.existsSync(new URL(file, root)), file);
  for (const [, file] of css.matchAll(/url\(['"]?(assets\/[^'")]+)['"]?\)/g))
    assert.ok(fs.existsSync(new URL(file, root)), file);
  for (const [, file] of sw.matchAll(
    /'(assets\/[^']+|[a-z-]+\.(?:js|html|css|webmanifest))'/g,
  ))
    assert.ok(fs.existsSync(new URL(file, root)), file);
  const manifest = JSON.parse(
    fs.readFileSync(new URL("manifest.webmanifest", root)),
  );
  assert.equal(manifest.start_url, "./");
  assert.equal(manifest.scope, "./");
  for (const icon of manifest.icons)
    assert.ok(fs.existsSync(new URL(icon.src, root)));
  for (const f of [
    "game.js",
    "state.js",
    "drawing.js",
    "world.js",
    "engine.js",
    "data.js",
  ]) {
    const text = fs.readFileSync(new URL(f, root), "utf8");
    for (const [, module] of text.matchAll(/from ['"](.+?)['"]/g))
      assert.ok(fs.existsSync(new URL(module, new URL(f, root))), module);
  }
  assert.ok(!html.includes('href="/assets'));
  assert.ok(!html.includes('src="/assets'));
});
