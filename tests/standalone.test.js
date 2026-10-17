import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { parseHTML } from "linkedom";
test("direct-file edition initializes and opens its drawing studio without module loading or a server", () => {
  const html = fs.readFileSync(
      new URL("../dist/play.html", import.meta.url),
      "utf8",
    ),
    code = html.match(/<script>\s*([\s\S]+)<\/script>/)[1];
  assert.ok(!/\bimport\s+\{/.test(code));
  const { window, document } = parseHTML(html);
  window.scrollTo = () => {};
  window.HTMLCanvasElement.prototype.getContext = () =>
    new Proxy({}, { get: () => () => {} });
  const dialog = document.querySelector("#dialog");
  dialog.close = () => {
    dialog.open = false;
  };
  dialog.showModal = () => {
    dialog.open = true;
  };
  const context = {
    window,
    document,
    localStorage: { getItem: () => null, setItem() {} },
    sessionStorage: { getItem: () => null, setItem() {} },
    matchMedia: () => ({ matches: false }),
    navigator: {},
    location: { protocol: "file:" },
    ResizeObserver: class {
      observe() {}
      disconnect() {}
    },
    requestAnimationFrame: () => 1,
    cancelAnimationFrame() {},
    AbortController,
    structuredClone,
    setTimeout: () => 1,
    clearTimeout() {},
    performance,
    crypto,
  };
  vm.runInNewContext(code, context);
  document.querySelector("#continueGame").click();
  assert.equal(document.querySelectorAll(".chapter-card").length, 3);
  document.querySelector('[data-page="studio"]').click();
  assert.ok(document.querySelector("#drawing"));
  assert.ok(document.querySelector('[data-act="save-seal"]'));
});
