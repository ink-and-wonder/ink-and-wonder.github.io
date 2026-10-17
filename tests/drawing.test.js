import { test } from "node:test";
import assert from "node:assert/strict";
import { DrawingDesk } from "../dist/drawing.js";
const context = new Proxy(
  {},
  { get: (t, k) => t[k] ?? (() => {}), set: (t, k, v) => ((t[k] = v), true) },
);
globalThis.window = { devicePixelRatio: 2 };
globalThis.ResizeObserver = class {
  observe() {}
  disconnect() {}
};
globalThis.requestAnimationFrame = () => 1;
globalThis.cancelAnimationFrame = () => {};
function create(settings = { penOnly: false }) {
  const canvas = {
    clientWidth: 600,
    classList: { toggle() {} },
    getContext: () => context,
    addEventListener() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 600, height: 600 }),
    setPointerCapture() {},
  };
  let finished = 0;
  const desk = new DrawingDesk(canvas, {
    settings,
    onChange() {},
    onFinish() {
      finished++;
    },
  });
  return { desk, finished: () => finished };
}
const e = (pointerType = "pen", x = 100, y = 100, id = 1) => ({
  pointerType,
  clientX: x,
  clientY: y,
  pointerId: id,
  pressure: 0.7,
  button: 0,
  preventDefault() {},
});
test("pen pressure and movement are stored; pointer cancellation rolls back", () => {
  const { desk, finished } = create();
  desk.down(e());
  desk.move(e("pen", 150, 150));
  desk.end(e("pen", 150, 150));
  assert.equal(desk.strokes.length, 1);
  assert.equal(desk.strokes[0][1].p, 0.7);
  assert.equal(finished(), 1);
  desk.down(e("pen", 200, 200));
  desk.move(e("pen", 250, 250));
  desk.end(e("pen", 250, 250), true);
  assert.equal(desk.strokes.length, 1);
  assert.equal(finished(), 1);
  desk.destroy();
});
test("pen-only mode rejects touch; simultaneous pointers cannot add strokes", () => {
  const { desk } = create({ penOnly: true });
  desk.down(e("touch"));
  assert.equal(desk.pointer, null);
  desk.down(e());
  desk.down(e("touch", 150, 150, 2));
  desk.end(e("touch", 150, 150, 2));
  assert.equal(desk.pointer, 1);
  desk.end(e());
  assert.equal(desk.strokes.length, 1);
  desk.destroy();
});
test("eraser removes the entire crossed stroke and supports undo and redo", () => {
  const { desk } = create();
  desk.load([
    [
      { x: 50, y: 50, p: 0.5 },
      { x: 200, y: 200, p: 0.5 },
    ],
  ]);
  desk.setTool("erase");
  desk.down(e("pen", 120, 120));
  desk.end(e("pen", 120, 120));
  assert.equal(desk.strokes.length, 0);
  desk.undo();
  assert.equal(desk.strokes.length, 1);
  desk.redo();
  assert.equal(desk.strokes.length, 0);
  desk.destroy();
});
test("empty coalesced-event arrays fall back to the current pointer event", () => {
  const { desk } = create();
  desk.down(e());
  desk.move({ ...e("pen", 150, 150), getCoalescedEvents: () => [] });
  desk.end(e());
  assert.equal(desk.strokes[0].length, 2);
  desk.destroy();
});
test("a pen can take over an accidental palm stroke without keeping palm ink", () => {
  const { desk } = create();
  desk.down(e("touch", 50, 50, 2));
  desk.move(e("touch", 60, 60, 2));
  desk.down(e("pen", 200, 200, 1));
  desk.move(e("pen", 220, 220, 1));
  desk.end(e("pen", 220, 220, 1));
  assert.equal(desk.strokes.length, 1);
  assert.equal(desk.strokes[0][0].x, 200);
  desk.down(e("touch", 100, 100, 2));
  assert.equal(desk.pointer, null);
  desk.destroy();
});
