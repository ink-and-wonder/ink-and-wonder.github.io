import { test } from "node:test";
import assert from "node:assert/strict";
import {
  freshSave,
  validateSave,
  available,
  nextMission,
  completeMission,
  insight,
} from "../dist/state.js";
import { MISSIONS } from "../dist/data.js";
import { pagePaths, recognize, checkObjective } from "../dist/engine.js";
test("campaign can be completed from its first seal through its epilogue", () => {
  const s = freshSave();
  assert.equal(available(1, s), false);
  for (let i = 0; i < MISSIONS.length; i++) {
    assert.equal(available(i, s), true);
    assert.equal(nextMission(s), i);
    const scores = MISSIONS[i].steps.map((step) => {
      const result = recognize(
        pagePaths(step.element, step.modifier, step.signs),
      );
      assert.equal(checkObjective(result, step).ok, true);
      return result.quality;
    });
    completeMission(s, i, scores, false);
    assert.equal(s.completed[MISSIONS[i].id].stars, 3);
  }
  assert.equal(Object.keys(s.completed).length, 12);
  assert.equal(insight(s), 1680);
  assert.deepEqual(validateSave(JSON.parse(JSON.stringify(s))), s);
});
test("replay improves mastery without farming insight", () => {
  const s = freshSave();
  completeMission(s, 0, [70], true);
  assert.equal(s.completed["first-light"].stars, 2);
  const before = insight(s);
  completeMission(s, 0, [30], true);
  assert.equal(insight(s), before);
  completeMission(s, 0, [95], false);
  assert.equal(s.completed["first-light"].stars, 3);
  assert.equal(insight(s), before + 20);
});
test("locked and incomplete missions cannot complete", () => {
  assert.throws(() => completeMission(freshSave(), 2, [100], false));
  assert.throws(() => completeMission(freshSave(), 0, [], false));
  assert.throws(() => completeMission(freshSave(), 0, [NaN], false));
});
test("save validation preserves sketches and rejects malformed data", () => {
  const s = freshSave();
  s.seals.push({
    id: "test",
    name: "An unfinished possibility",
    element: "sketch",
    modifier: "focus",
    quality: 0,
    strokes: [
      [
        { x: 10, y: 20, p: 0.4 },
        { x: 30, y: 40, p: 0.6 },
      ],
    ],
  });
  assert.deepEqual(validateSave(s), s);
  assert.throws(() =>
    validateSave({
      ...s,
      completed: { "first-light": { quality: 100, stars: 99 } },
    }),
  );
  assert.throws(() =>
    validateSave({
      ...s,
      seals: [{ ...s.seals[0], strokes: [[{ x: "<script>", y: 5 }]] }],
    }),
  );
});
