import { test } from "node:test";
import assert from "node:assert/strict";
import {
  pagePaths,
  recognize,
  checkObjective,
  circle,
  heart,
  sign,
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

test("manga vocabulary reads all five sigils and three sign types under uneven pen motion", () => {
  for (const element of ["earth","fire","water","wind","light"]) for(const modifier of ["focus","flow","spread"]) {
    const angle=.37;
    const strokes=pagePaths(element,modifier,3).map(s=>s.map((p,i)=>{
      const x=p.x-300,y=p.y-300;
      return {x:280+(x*Math.cos(angle)-y*Math.sin(angle))*1.1+Math.sin(i*1.7)*2,
        y:310+(x*Math.sin(angle)+y*Math.cos(angle))*.86+Math.cos(i*1.3)*2};
    }));
    const r=recognize(strokes);
    assert.equal(r.ok,true,`${element}/${modifier}: ${r.reason}`);
    assert.equal(r.element,element);
    assert.equal(checkObjective(r,{element,modifier,signs:3}).ok,true,JSON.stringify(r));
  }
});
test("connected ring arcs are accepted, but a substantial unclosed gap is rejected",()=>{
  const p=pagePaths("water","flow",3),ring=p.pop();
  const arcs=[ring.slice(0,33),ring.slice(32,65),ring.slice(64)];
  assert.equal(recognize([...p,...arcs]).ok,true);
  assert.equal(recognize([...p,arcs[0],arcs[1]]).ok,false);
});
test("mixed signs are interpreted from the drawing, independent of a chosen recipe",()=>{
  const p=[...heart("water"),...sign("flow",0),...sign("spread",Math.PI),circle()]
    .map(s=>s.map(p=>({x:300+p.x*200,y:300+p.y*200})));
  const r=recognize(p);
  assert.equal(r.element,"water");assert.equal(r.signs,2);
  assert.deepEqual([...r.composition].sort(),["flow","spread"]);
});
test("resampling density does not change a slowly retraced seal",()=>{
  const p=pagePaths("earth","focus",2).map(s=>s.flatMap((p,i)=>i?[s[i-1],s[i-1],p,p]:[p]));
  const r=recognize(p);assert.equal(r.element,"earth");assert.equal(r.signs,2);
});
test("a stray line or cross inside a ring is not guessed as a sigil",()=>{
  const ring=circle(200,300,300);
  for(const core of [[{x:250,y:300},{x:350,y:300}],[{x:250,y:250},{x:350,y:350},{x:250,y:350},{x:350,y:250}]])
    assert.equal(recognize([core,ring]).ok,false);
});

test("sigil size changes intensity while balanced and asymmetric signs change direction",()=>{
 const make=(size,angles)=>[...heart("water").map(s=>s.map(p=>({x:p.x*size,y:p.y*size}))),...angles.flatMap(a=>sign("flow",a)),circle()].map(s=>s.map(p=>({x:300+p.x*210,y:300+p.y*210})));
 const small=recognize(make(.7,[0,Math.PI])),big=recognize(make(1,[0,Math.PI]));
 assert.equal(small.ok,true);assert.equal(big.ok,true);assert.ok(big.power>small.power);
 assert.ok(big.balance>.9);
 const asymmetric=recognize(make(1,[Math.PI/2]));assert.ok(asymmetric.direction.x>.9);assert.ok(asymmetric.balance<.1);
});
