import {test} from 'node:test';
import assert from 'node:assert/strict';
import {circle,fitRing,recognize,pagePaths} from '../dist/engine.js';
import {compileSpell} from '../dist/compiler.js';

test('even a small visible gap prevents both studio and campaign spells from activating',()=>{
 const core=pagePaths('fire','focus',0).slice(0,-1);
 for(const degrees of [1,3,6,12])for(const rotation of [0,.7,2.5]){
  const ring=circle(200,300,300,720).slice(0,721-degrees*2).map(p=>({x:300+(p.x-300)*Math.cos(rotation)-(p.y-300)*Math.sin(rotation),y:300+(p.x-300)*Math.sin(rotation)+(p.y-300)*Math.cos(rotation)}));
  assert.equal(fitRing(ring),null,`${degrees}° opening`);
  assert.equal(recognize([...core,ring]).ok,false);
  assert.equal(compileSpell([...core,ring]).ok,false);
 }
});
test('separate ring strokes must touch at every join, not just the final endpoint',()=>{
 const core=pagePaths('fire','focus',0).slice(0,-1),ring=circle(200,300,300,360);
 const open=[ring.slice(0,121),ring.slice(123,241),ring.slice(240)];
 for(const read of [recognize,compileSpell]){
  assert.equal(read([...core,...open]).ok,false);
  assert.equal(read([...core,ring.slice(0,121),ring.slice(120,241),ring.slice(240)]).ok,true);
 }
});
test('retracing an open C does not close it; crossing the starting point does',()=>{
 const ring=circle(200,300,300,360),arc=ring.slice(0,351);
 assert.equal(fitRing([...arc,...[...arc].reverse()]),null);
 assert.ok(fitRing([...ring,...ring.slice(1,15)]));
 assert.ok(fitRing(ring));
 const near=[...ring.slice(0,-1),{x:500,y:301}];
 assert.ok(fitRing(near),'ink-width contact remains usable with a pen');
});
