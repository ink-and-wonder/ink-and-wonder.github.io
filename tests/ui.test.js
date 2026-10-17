/* DOM integration tests, not a browser or screenshot substitute. Canvas and
   device APIs are adapters; all navigation and game handlers are production. */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { parseHTML } from "linkedom";
import { pagePaths } from "../dist/engine.js";
import { MISSIONS } from "../dist/data.js";
import { SAVE_KEY } from "../dist/state.js";
const { window, document } = parseHTML(
  fs.readFileSync(new URL("../dist/index.html", import.meta.url), "utf8"),
);
const storage = new Map(),
  memory = {
    getItem: (key) => storage.get(key) || null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key),
  };
const context = new Proxy(
  { createRadialGradient: () => ({ addColorStop() {} }) },
  {
    get: (target, key) => (key in target ? target[key] : () => {}),
    set: (target, key, value) => ((target[key] = value), true),
  },
);
Object.defineProperty(window.HTMLElement.prototype, "clientWidth", {
  get() {
    return 600;
  },
});
Object.defineProperty(window.HTMLElement.prototype, "clientHeight", {
  get() {
    return 600;
  },
});
window.HTMLCanvasElement.prototype.getContext = () => context;
window.HTMLCanvasElement.prototype.setPointerCapture = () => {};
window.HTMLCanvasElement.prototype.getBoundingClientRect = () => ({
  left: 0,
  top: 0,
  width: 600,
  height: 600,
});
window.HTMLInputElement.prototype.select = () => {};
const dialog = document.querySelector("#dialog");
dialog.showModal = function () {
  this.open = true;
};
dialog.close = function () {
  this.open = false;
};
window.scrollTo = () => {};
const timerQueue = new Map();
let nextTimer = 0;
Object.assign(globalThis, {
  window,
  document,
  localStorage: memory,
  sessionStorage: { getItem: () => null, setItem() {} },
  matchMedia: () => ({ matches: false }),
  requestAnimationFrame: () => 1,
  cancelAnimationFrame() {},
  ResizeObserver: class {
    observe() {}
    disconnect() {}
  },
  setTimeout: (fn, time) => {
    timerQueue.set(++nextTimer, { fn, time });
    return nextTimer;
  },
  clearTimeout: (id) => timerQueue.delete(id),
});
await import("../dist/game.js");
const $ = (s) => document.querySelector(s),
  click = (s) => {
    const b = $(s);
    assert.ok(b, `Missing control: ${s}`);
    b.click();
    return b;
  };
function pointer(canvas, type, p) {
  const event = new window.Event(type, { bubbles: true, cancelable: true });
  Object.assign(event, {
    pointerId: 1,
    pointerType: "pen",
    button: 0,
    clientX: p.x,
    clientY: p.y,
    pressure: 0.5,
  });
  canvas.dispatchEvent(event);
}
function draw(paths) {
  const canvas = $("#drawing");
  assert.ok(canvas);
  for (const path of paths) {
    pointer(canvas, "pointerdown", path[0]);
    for (const p of path.slice(1)) pointer(canvas, "pointermove", p);
    pointer(canvas, "pointerup", path.at(-1));
  }
}
function runStoryTimer() {
  for (const [id, timer] of [...timerQueue])
    if (timer.time === 1600 || timer.time === 200) {
      timerQueue.delete(id);
      timer.fn();
    }
}
function change(selector, value) {
  const e = $(selector);
  e.checked = value;
  e.dispatchEvent(new window.Event("change", { bubbles: true }));
}
test("title, all twelve encounters, multi-seal transitions and ending are playable through UI handlers", () => {
  click("#continueGame");
  assert.equal(document.querySelectorAll(".chapter-card").length, 3);
  assert.equal(document.querySelectorAll(".mission-row").length, 12);
  for (let i = 0; i < MISSIONS.length; i++) {
    if (i === 0) click('[data-act="mission"][data-index="0"]');
    assert.equal(dialog.open, true);
    click('[data-act="begin-drawing"]');
    for (let n = 0; n < MISSIONS[i].steps.length; n++) {
      const s = MISSIONS[i].steps[n];
      draw(pagePaths(s.element, s.modifier, s.signs));
      assert.match(
        $("#feedbackText").textContent,
        /awakened/,
        `Mission ${i}, step ${n}: ${$("#feedbackText").textContent}`,
      );
      if (n < MISSIONS[i].steps.length - 1) click('[data-act="next-seal"]');
    }
    runStoryTimer();
    assert.equal(dialog.open, true);
    const saved = JSON.parse(storage.get(SAVE_KEY));
    assert.ok(saved.completed[MISSIONS[i].id], `Mission ${i} did not save`);
    if (i < 11) click('#dialog [data-act="mission"]');
    else click('#dialog [data-act="ending"]');
  }
  assert.match($("#dialogBody").textContent, /Wonder is a practice/);
  assert.equal(
    Object.keys(JSON.parse(storage.get(SAVE_KEY)).completed).length,
    12,
  );
  click('#dialog [data-act="studio"]');
  assert.ok($("#drawing"));
  assert.match($("#page").textContent, /Unlimited possibility/);
});
test("free drawings cast, save, reopen and render user names safely", () => {
  draw(pagePaths("water", "flow", 3));
  assert.match($("#feedbackText").textContent, /Water/);
  assert.equal($("#worldObject").dataset.element, "water");
  assert.match($(".target-label").textContent, /Silverleaf/);
  click('[data-act="save-seal"]');
  $("#sealName").value = "<img src=x onerror=alert(1)> My rain";
  click('[data-act="confirm-save-seal"]');
  click('[data-page="grimoire"]');
  assert.equal(document.querySelectorAll(".saved-seal").length, 1);
  assert.match($(".saved-seal h2").textContent, /<img/);
  assert.equal($(".saved-seal h2 img"), null);
  click('[data-act="open-seal"]');
  assert.ok($("#drawing"));
  click('[data-act="cast"]');
  assert.match($("#feedbackText").textContent, /Water/);
  click('[data-act="clear"]');
  click('[data-act="cast"]');
  assert.match($("#feedbackText").textContent, /Finish an enclosing ring/);
});
test("settings, guide, undo, redo, unrecognized sketches and scene changes work", () => {
  draw([
    [
      { x: 110, y: 110 },
      { x: 180, y: 210 },
    ],
  ]);
  assert.equal($("#strokeCount").textContent, "1 lines");
  click('[data-act="undo"]');
  assert.equal($("#strokeCount").textContent, "0 lines");
  click('[data-act="redo"]');
  assert.equal($("#strokeCount").textContent, "1 lines");
  click('[data-act="save-seal"]');
  $("#sealName").value = "A small sketch";
  click('[data-act="confirm-save-seal"]');
  assert.equal(JSON.parse(storage.get(SAVE_KEY)).seals[0].element, "sketch");
  click("#settings");
  change('[data-setting="reducedMotion"]', true);
  assert.equal(document.body.classList.contains("reduced-motion"), true);
  click('#closeDialog');
  click('[data-act="field-guide"]');
  assert.equal(document.querySelectorAll(".atlas-card").length, 6);
  assert.ok($("#atlasSearch"));
  click('#closeDialog');
  click('[data-act="environment"][data-environment="forest"]');
  assert.equal($("#stageScene").classList.contains("art-forest"), true);
  assert.equal($("#strokeCount").textContent, "1 lines");
  click('[data-act="focus-desk"]');
  assert.equal($(".play-layout").classList.contains("focused"), true);
  click('[data-act="focus-desk"]');
  assert.equal($(".play-layout").classList.contains("focused"), false);
  click('[data-page="grimoire"]');
  click('[data-act="book-tab"][data-tab="memories"]');
  assert.equal(document.querySelectorAll(".memory:not(.unwritten)").length, 12);
  click('[data-act="book-tab"][data-tab="discoveries"]');
  assert.equal(document.querySelectorAll(".discovery").length, 15);
});

test("spellbook pages, studio sigil references, and the music control work",()=>{
 click('[data-page="studio"]');
 assert.equal(document.querySelectorAll('.study-strip button').length,5);
 click('[data-act="study-sigil"][data-element="earth"]');
 assert.ok($('#recipePreview'));click('[data-act="apply-recipe"]');
 click('[data-act="field-guide"]');
 click('[data-act="guide-page"][data-index="1"]');
 assert.match($('.atlas .book-turns').textContent,/2 \/ 14/);
 click('[data-act="guide-page"][data-index="2"]');
 assert.match($('.atlas .book-turns').textContent,/3 \/ 14/);
 click('#closeDialog');
 const before=JSON.parse(storage.get(SAVE_KEY)).settings.music;
 click('[data-act="music"]');
 assert.equal(JSON.parse(storage.get(SAVE_KEY)).settings.music,!before);
});
