import { test } from "node:test";
import assert from "node:assert/strict";
import {
  pagePaths,
  recognize,
  checkObjective,
  circle,
  validateDrawing,
} from "../dist/engine.js";
import { MISSIONS } from "../dist/data.js";
for (const mission of MISSIONS)
  for (const [index, step] of mission.steps.entries())
    test(`${mission.id}, step ${index + 1}: recognizes required seal`, () => {
      const result = recognize(
        pagePaths(step.element, step.modifier, step.signs),
      );
      assert.equal(result.ok, true, JSON.stringify(result));
      assert.equal(result.element, step.element);
      assert.equal(
        checkObjective(result, step).ok,
        true,
        JSON.stringify(result),
      );
    });
test("blank, empty ring, open ring and scribbles do not cast", () => {
  assert.equal(recognize([]).ok, false);
  assert.equal(
    recognize([
      circle().map((p) => ({ x: 300 + p.x * 200, y: 300 + p.y * 200 })),
    ]).ok,
    false,
  );
  const p = pagePaths("water", "focus", 1);
  p[p.length - 1] = p.at(-1).slice(0, 70);
  assert.equal(recognize(p).ok, false);
  assert.equal(
    recognize([
      [
        { x: 1, y: 1 },
        { x: 580, y: 580 },
        { x: 0, y: 580 },
      ],
    ]).ok,
    false,
  );
});
test("translated and scaled seals still cast", () => {
  for (const element of ["light", "water", "wind", "fire"]) {
    const paths = pagePaths(element, "spread", 3).map((s) =>
      s.map((p) => ({ x: p.x * 0.62 + 13, y: p.y * 0.62 + 60 })),
    );
    const result = recognize(paths);
    assert.equal(result.ok, true);
    assert.equal(result.element, element);
    assert.equal(result.signs, 3);
  }
});
test("natural hand movement remains readable", () => {
  for (const element of ["light", "water", "wind", "fire"]) {
    const paths = pagePaths(element, "flow", 3).map((s) =>
      s.map((p, i) => ({
        x: p.x + Math.sin(i * 1.7) * 3,
        y: p.y + Math.cos(i * 1.9) * 3,
      })),
    );
    const r = recognize(paths);
    assert.equal(r.ok, true, element);
    assert.equal(r.element, element);
    assert.equal(
      checkObjective(r, { element, modifier: "flow", signs: 3 }).ok,
      true,
      JSON.stringify(r),
    );
  }
});
test("wrong element or modifier cannot solve a mission", () => {
  const r = recognize(pagePaths("water", "spread", 3));
  assert.equal(
    checkObjective(r, { element: "light", modifier: "spread", signs: 3 }).ok,
    false,
  );
  assert.equal(
    checkObjective(r, { element: "water", modifier: "focus", signs: 3 }).ok,
    false,
  );
});
test("drawing import rejects invalid and oversized content", () => {
  assert.equal(validateDrawing(pagePaths("light", "focus", 1)), true);
  assert.equal(validateDrawing([[{ x: Infinity, y: 0 }]]), false);
  assert.equal(validateDrawing([[{ x: 0, y: 99999 }]]), false);
  assert.equal(validateDrawing(Array(151).fill([])), false);
});
