import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CATALOGUE,DESIGNED_SIGILS,DESIGNED_SIGNS} from '../dist/vocabulary.js';
import {compileSpell,compositionPaths,matchGlyph} from '../dist/compiler.js';
import {freshSave,validateSave} from '../dist/state.js';

test('atlas contains 83 distinct entries, with missing designs explicitly empty',()=>{
 assert.equal(CATALOGUE.length,83);assert.equal(new Set(CATALOGUE.map(g=>g.id)).size,83);
 assert.equal(CATALOGUE.filter(g=>g.paths.length).length,81);
 assert.deepEqual(CATALOGUE.filter(g=>!g.paths.length).map(g=>g.name),['Gryphon','Pegasus']);
 for(const g of CATALOGUE)assert.match(g.source,/^https:\/\/witchhatatelier\.telepedia\.net\//);
});
test('all 81 reference glyphs match their full geometry',()=>{
 for(const glyph of CATALOGUE.filter(g=>g.paths.length))assert.equal(matchGlyph(glyph.paths,glyph.kind)[0]?.glyph.id,glyph.id,glyph.name);
});
test('every designed sigil and sign is recognized inside a drawn seal',()=>{
 for(const glyph of [...DESIGNED_SIGILS,...DESIGNED_SIGNS]){
  const plan={element:glyph.kind==='sigil'?glyph.key:'water',modifier:glyph.kind==='sign'?glyph.key:'focus',signs:1};
  const result=compileSpell(compositionPaths(plan));
  assert.ok(result.ok && result.symbols.some(s=>s.id===glyph.id),glyph.id+': '+JSON.stringify(result.reason));
 }
});
test('single, nested and parallel compositions read both sigils and their signs',()=>{
 for(const structure of ['single','nested','parallel']){
  const result=compileSpell(compositionPaths({element:'water',extraSigils:['fire'],modifier:'flow',signs:3,structure}));
  assert.equal(result.ok,true,structure);assert.equal(result.executable,true,structure);
  for(const key of ['water','fire'])assert.ok(result.symbols.some(s=>s.key===key),structure+key);
  assert.equal(result.signs,3,structure);
  if(structure==='nested')assert.ok(result.nodes.some(n=>n.depth>0));
  if(structure==='parallel')assert.equal(result.layers.length,2);
 }
});
test('unknown functions are study-only and inferred effects require an explicit preference',()=>{
 const unknown=compileSpell(compositionPaths({element:'sword',modifier:'focus',signs:1}));
 assert.equal(unknown.ok,true);assert.equal(unknown.executable,false);assert.match(unknown.warnings.join(' '),/unresolved/);
 const paths=compositionPaths({element:'water',modifier:'spread',signs:3});
 assert.equal(compileSpell(paths).executable,false);
 assert.equal(compileSpell(paths,{interpretations:true}).executable,true);
});
test('composition pages survive save validation without storing invented spell results',()=>{
 const save=freshSave();save.settings.interpretations=true;
 save.seals.push({id:'composition',name:'Two elements',element:'dragon',modifier:'convergence',quality:90,strokes:compositionPaths({element:'dragon',modifier:'convergence',signs:3})});
 const restored=validateSave(JSON.parse(JSON.stringify(save)));
 assert.equal(restored.seals[0].element,'dragon');assert.equal(restored.seals[0].modifier,'convergence');assert.equal(restored.settings.interpretations,true);
 assert.ok(compileSpell(restored.seals[0].strokes).ok);
});
test('small pen wobble does not change the identity of any designed symbol',()=>{
 for(const g of CATALOGUE.filter(g=>g.paths.length)){
  const paths=compositionPaths({element:g.kind==='sigil'?g.key:'water',modifier:g.kind==='sign'?g.key:'focus',signs:1}).map((s,i)=>s.map((p,j)=>({x:p.x+Math.sin(j*1.7+i)*1.5,y:p.y+Math.cos(j*2.3+i)*1.5})));
  const result=compileSpell(paths);assert.ok(result.ok&&result.symbols.some(s=>s.id===g.id),g.id);
 }
});
test('orientation is relative to each seal and outside ink cannot silently become a spell',()=>{
 for(const inverted of [false,true]){
  const result=compileSpell(compositionPaths({element:'water',modifier:'focus',signs:3,inverted}));
  assert.ok(result.ok);assert.ok(result.symbols.filter(s=>s.kind==='sign').every(s=>s.inverted===inverted));
 }
 const paths=compositionPaths({element:'water',modifier:'flow',signs:3});
 assert.equal(compileSpell([...paths,[{x:5,y:5},{x:40,y:40}]]).ok,false);
 assert.equal(compileSpell([[{x:NaN,y:4}]]).ok,false);
 assert.equal(compileSpell([]).ok,false);
});
