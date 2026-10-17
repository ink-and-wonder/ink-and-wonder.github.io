import {test} from 'node:test';
import assert from 'node:assert/strict';
import {WorldEffects,spellArt} from '../dist/world.js';

test('ink feedback stays bounded, follows the pen, and respects reduced motion',()=>{
 const before={ResizeObserver:globalThis.ResizeObserver,requestAnimationFrame:globalThis.requestAnimationFrame,cancelAnimationFrame:globalThis.cancelAnimationFrame};
 globalThis.ResizeObserver=class{observe(){}disconnect(){}};
 globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=()=>{};
 try{
  const effects=new WorldEffects({getContext:()=>({})});
  effects.ink({x:300,y:150});assert.equal(effects.particles[0].x,.5);assert.equal(effects.particles[0].y,.25);
  assert.equal(effects.particles[0].duration,650);
  for(let i=0;i<1000;i++)effects.ink({x:300,y:300});
  assert.ok(effects.particles.length<=161);
  effects.reduced=true;const count=effects.particles.length;effects.ink({x:1,y:1});assert.equal(effects.particles.length,count);
  effects.destroy();
 }finally{Object.assign(globalThis,before);}
});
test('spell manifestations distinguish the elements and retain compound sigils',()=>{
 for(const element of ['fire','water','wind','light','earth'])assert.match(spellArt({element}),new RegExp('form-'+element));
 const art=spellArt({element:'water',symbols:[{kind:'sigil',key:'water'},{kind:'sigil',key:'fire'}]});
 assert.match(art,/form-water/);assert.match(art,/form-fire/);
 assert.match(spellArt({element:'dragon'}),/form-dragon/);
});
