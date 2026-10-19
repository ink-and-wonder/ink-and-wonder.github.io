import { CATALOGUE, SIGILS, SIGNS } from "./vocabulary.js?v=3.2.0";
import { resample, distance, ringCandidates, fitRing, heart, sign, circle, recognize, validateDrawing } from "./engine.js?v=3.2.0";
const designed=CATALOGUE.filter(g=>g.paths.length), templateCache=new Map();
const bounds=paths=>{
 const p=paths.flat();if(!p.length)return null;
 let x0=Infinity,x1=-Infinity,y0=Infinity,y1=-Infinity;
 for(const q of p){x0=Math.min(x0,q.x);x1=Math.max(x1,q.x);y0=Math.min(y0,q.y);y1=Math.max(y1,q.y);}
 return {x0,x1,y0,y1,x:(x0+x1)/2,y:(y0+y1)/2,size:Math.max(x1-x0,y1-y0),width:x1-x0,height:y1-y0};
};
const normalize=paths=>{const b=bounds(paths);return !b||b.size<.0001?[]:resample(paths.map(s=>s.map(p=>({x:(p.x-b.x)/b.size,y:(p.y-b.y)/b.size}))),.035,128);};
const closest=(p,cloud)=>{let d=Infinity;for(const q of cloud){const n=(p.x-q.x)**2+(p.y-q.y)**2;if(n<d)d=n;}return Math.sqrt(d);};
const centered=cloud=>{const b=bounds([cloud]);return cloud.map(p=>({x:(p.x-b.x)/b.size,y:(p.y-b.y)/b.size}));};
const rotate=(cloud,a)=>{const co=Math.cos(a),si=Math.sin(a);return cloud.map(p=>({x:p.x*co-p.y*si,y:p.x*si+p.y*co}));};
function template(g){
 if(templateCache.has(g.id))return templateCache.get(g.id);
 const points=normalize(g.paths),grid=new Float32Array(32*32);
 for(let y=0;y<32;y++)for(let x=0;x<32;x++)grid[y*32+x]=closest({x:x/31*1.5-.75,y:y/31*1.5-.75},points);
 const t={points,grid};templateCache.set(g.id,t);return t;
}
export function matchGlyph(paths,kind,limit=3){
 const actual=normalize(paths);if(actual.length<3)return [];
 const mean=actual.reduce((v,p)=>({x:v.x+p.x/actual.length,y:v.y+p.y/actual.length}),{x:0,y:0});
 let xx=0,yy=0,xy=0;for(const p of actual){const x=p.x-mean.x,y=p.y-mean.y;xx+=x*x;yy+=y*y;xy+=x*y;}
 if((xx+yy-Math.sqrt((xx-yy)**2+4*xy*xy))/(actual.length*2)<.0005)return [];
 const variants=Array.from({length:24},(_,i)=>centered(rotate(actual,i*Math.PI/12)));
 const candidates=designed.filter(g=>!kind||g.kind===kind).map(g=>{
  const t=template(g);let score=-Infinity,angle=0;
  for(let i=0;i<variants.length;i++){
   let sum=0;for(const p of variants[i]){
    const x=Math.max(0,Math.min(31,Math.round((p.x+.75)/1.5*31))),y=Math.max(0,Math.min(31,Math.round((p.y+.75)/1.5*31)));
    sum+=Math.max(0,1-t.grid[y*32+x]/.13);
   }
   if(sum/actual.length>score){score=sum/actual.length;angle=i*Math.PI/12;}
  }
  return {glyph:g,score,angle};
 }).sort((a,b)=>b.score-a.score).slice(0,6);
 for(const candidate of candidates){
  const t=template(candidate.glyph);let best=-Infinity,bestAngle=candidate.angle;
  for(const offset of [-Math.PI/24,-Math.PI/48,0,Math.PI/48,Math.PI/24]){
   const angle=candidate.angle+offset,cloud=centered(rotate(actual,angle));
   const a=cloud.reduce((n,p)=>n+Math.max(0,1-closest(p,t.points)/.12),0)/cloud.length;
   const b=t.points.reduce((n,p)=>n+Math.max(0,1-closest(p,cloud)/.12),0)/t.points.length;
   const score=.45*a+.55*b;if(score>best){best=score;bestAngle=angle;}
  }
  candidate.score=best;candidate.angle=-bestAngle;
 }
 return candidates.sort((a,b)=>b.score-a.score).slice(0,limit);
}
function separatedGroups(paths,ring){
 let groups=paths.filter(s=>s.length).map(s=>[s]);
 const boxGap=(a,b)=>Math.hypot(Math.max(0,a.x0-b.x1,b.x0-a.x1),Math.max(0,a.y0-b.y1,b.y0-a.y1));
 let changed=true;
 while(changed){changed=false;outer:for(let i=0;i<groups.length;i++)for(let j=i+1;j<groups.length;j++){
  const a=bounds(groups[i]),b=bounds(groups[j]);
  const gap=boxGap(a,b),threshold=Math.max(ring.r*.035,Math.min(a.size,b.size)*.5);
  if(gap<threshold && Math.max(a.size,b.size)<ring.r*1.5){groups[i].push(...groups[j]);groups.splice(j,1);changed=true;break outer;}
 }}
 return groups;
}
const radius=(p,r)=>Math.hypot((p.x-r.cx)/r.rx,(p.y-r.cy)/r.ry);
function boundaryStroke(s,r){
 if(r.strokes?.includes(s))return true;
 const fit=fitRing(s);if(fit&&distance({x:fit.cx,y:fit.cy},{x:r.cx,y:r.cy})<r.r*.12&&Math.abs(fit.r-r.r)<r.r*.12)return true;
 if(s.length<3||!s.every(p=>radius(p,r)>.84&&radius(p,r)<1.17))return false;
 const angles=s.map(p=>Math.atan2(p.y-r.cy,p.x-r.cx));let arc=0;
 for(let i=1;i<angles.length;i++)arc+=Math.abs(Math.atan2(Math.sin(angles[i]-angles[i-1]),Math.cos(angles[i]-angles[i-1])));
 return arc>.4;
}
const orientationCache=new Map();
function referenceOrientation(key){
 if(!orientationCache.has(key))orientationCache.set(key,matchGlyph(sign(key,0),'sign',3).find(m=>m.glyph.key===key)?.angle||0);
 return orientationCache.get(key);
}
function symbol(paths,kind,ring){
 const matches=matchGlyph(paths,kind),m=matches[0];
 if(!m||m.score<.72||matches[1]&&m.score-matches[1].score<.022)return null;
 const b=bounds(paths),g=m.glyph;
 const positionAngle=Math.atan2(b.y-ring.cy,b.x-ring.cx)-Math.PI/2;
 const expected=g.kind==='sign'?referenceOrientation(g.key):0;
 const offset=Math.atan2(Math.sin(m.angle-positionAngle-expected),Math.cos(m.angle-positionAngle-expected));
 return {id:g.id,key:g.key,kind:g.kind,name:g.name,certainty:g.certainty,effect:g.effect,score:m.score,
  x:b.x,y:b.y,size:b.size,rotation:m.angle,inverted:g.kind==='sign'&&Math.cos(offset)<-.65,paths};
}
function uniqueRings(strokes){
 const result=[];for(const r of ringCandidates(strokes))if(!result.some(q=>Math.abs(q.r-r.r)<r.r*.08&&Math.hypot(q.cx-r.cx,q.cy-r.cy)<r.r*.08))result.push(r);
 return result.slice(0,24);
}
export function compileSpell(strokes,{interpretations=false}={}){
 if(!validateDrawing(strokes))return {ok:false,reason:'This page has too many strokes. Start another grimoire page.'};
 const rings=uniqueRings(strokes);if(!rings.length)return {ok:false,reason:'Finish an enclosing ring. Its ends must touch.'};
 let budget=16;
 function layer(r,depth=0){
  if(depth>7||--budget<0)return null;
  const inside=strokes.filter(s=>s.length&&s.every(p=>radius(p,r)<1.14)&&!boundaryStroke(s,r));
  const inner=inside.filter(s=>{const b=bounds([s]);return s.every(p=>radius(p,r)<.72)&&radius({x:b.x,y:b.y},r)<.52;});
  // A known circular sigil is a glyph first, not an accidental nested seal.
  const whole=inner.length?symbol(inner,'sigil',r):null;
  let sigils=[],signs=[],children=[],used=new Set(),unread=[];
  if(whole&&whole.score>.77){sigils=[whole];inner.forEach(s=>used.add(s));}
  if(!sigils.length){
   const candidates=rings.filter(q=>q!==r&&q.r<r.r*.82&&q.r>r.r*.18&&Math.hypot(q.cx-r.cx,q.cy-r.cy)+q.r<r.r*1.08);
   for(const child of candidates){
    if(children.some(c=>Math.hypot(child.cx-c.ring.cx,child.cy-c.ring.cy)+child.r<c.ring.r*1.05))continue;
    const parsed=layer(child,depth+1);
    if(parsed&&(parsed.sigils.length||parsed.signs.length||parsed.children.length)){
     children.push(parsed);inside.filter(s=>s.every(p=>radius(p,child)<1.15)).forEach(s=>used.add(s));
    }
   }
   const remainingInner=inner.filter(s=>!used.has(s));
   if(remainingInner.length){
    const groups=separatedGroups(remainingInner,r);
    for(const paths of groups){
     const match=symbol(paths,null,r);
     if(match){(match.kind==='sigil'?sigils:signs).push(match);paths.forEach(s=>used.add(s));}
    }
   }
  }
  // Group ring-facing marks into angular sectors while keeping each pen stroke intact.
  const outer=inside.filter(s=>!used.has(s)&&!inner.includes(s));
  const groups=separatedGroups(outer,r);
  for(const paths of groups){
   const match=symbol(paths,'sign',r);
   if(match){signs.push(match);paths.forEach(s=>used.add(s));}
  }
  // Several disconnected pieces can still form one surrounding sign.
  const leftovers=inside.filter(s=>!used.has(s));
  if(leftovers.length){const match=symbol(leftovers,'sign',r);if(match){signs.push(match);leftovers.forEach(s=>used.add(s));}}
  unread=inside.filter(s=>!used.has(s));
  if(!sigils.length&&!signs.length&&!children.length)return null;
  return {ring:r,sigils,signs,children,unread,depth};
 }
 const roots=rings.filter(r=>!rings.some(q=>q!==r&&q.r>r.r*1.15&&Math.hypot(r.cx-q.cx,r.cy-q.cy)+r.r<q.r*1.08));
 const outside=strokes.filter(s=>s.length&&!roots.some(r=>s.every(p=>radius(p,r)<1.17)));
 if(outside.some(s=>{const b=bounds([s]);return b&&b.size>12;}))return {ok:false,reason:'Ink outside the rings. Enclose or erase it.'};
 const layers=roots.map(r=>layer(r)).filter(Boolean);
 if(!layers.length){
  const basic=recognize(strokes);
  return basic.ok?{...basic,advanced:true,layers:[],symbols:[],warnings:[],effects:[],summary:basic.element+' seal'}:{ok:false,reason:'Unclear symbols. Enlarge the glyphs or check the atlas.'};
 }
 const flatten=nodes=>nodes.flatMap(n=>[n,...flatten(n.children)]),nodes=flatten(layers),symbols=nodes.flatMap(n=>[...n.sigils,...n.signs]);
 const unread=nodes.reduce((n,l)=>n+l.unread.length,0);
 if(unread>Math.max(2,strokes.length*.15))return {ok:false,reason:'Unclear marks. Separate the symbols or check the atlas.',layers,unread};
 const warnings=[];
 const effects=symbols.filter(s=>s.effect&&(s.certainty==='observed'||interpretations&&s.certainty==='inferred')).map(s=>({effect:s.effect,inverted:s.inverted,node:nodes.findIndex(n=>n.sigils.includes(s)||n.signs.includes(s)),symbol:s.id}));
 for(const s of symbols)if(s.certainty==='unknown'||s.certainty==='unrecorded')warnings.push(s.name+': unresolved effect; study only.');
 else if(s.certainty==='inferred'&&!interpretations)warnings.push(s.name+': uncertain effect; study only.');
 if(unread)warnings.push(unread+' small unclassified marks were ignored.');
 const primary=symbols.find(s=>s.kind==='sigil'&&['fire','water','wind','earth','light'].includes(s.key))||symbols.find(s=>s.kind==='sigil');
 const components=symbols.filter(s=>s.kind==='sign').map(s=>({modifier:s.key,angle:Math.atan2(s.y-layers[0].ring.cy,s.x-layers[0].ring.cx)-Math.PI/2,length:s.size/layers[0].ring.r,inverted:s.inverted,score:s.score}));
 const direction=components.reduce((v,s)=>({x:v.x+Math.sin(s.angle)*(s.inverted?-1:1),y:v.y-Math.cos(s.angle)*(s.inverted?-1:1)}),{x:0,y:0});
 if(components.length){direction.x/=components.length;direction.y/=components.length;}
 const quality=Math.round(symbols.reduce((n,s)=>n+s.score,0)/symbols.length*100);
 const modifier=components[0]?.modifier||'focus';
 return {ok:true,advanced:true,layers,nodes,symbols,effects,warnings,executable:effects.length>0&&!symbols.some(s=>s.certainty==='unknown'||s.certainty==='unrecorded'||s.certainty==='inferred'&&!interpretations),element:primary?.key||'shaping',modifier,components,signs:components.length,
  composition:[...new Set(components.map(s=>s.modifier))],quality,power:Math.min(1,.25+symbols.length*.04+(primary?.size||0)/layers[0].ring.r*.5),direction,
  ring:{x:layers[0].ring.cx,y:layers[0].ring.cy,r:layers[0].ring.r},
  summary:symbols.filter(s=>s.kind==='sigil').map(s=>s.name).join(' + ')||'Shaping seal'};
}
export function compositionPaths(plan){
 const elements=[plan.element,...(plan.extraSigils||[])].filter(k=>SIGILS[k]?.paths.length);
 const modifiers=[plan.modifier,...(plan.extraSigns||[])].filter(k=>SIGNS[k]?.paths.length);
 const structure=plan.structure||'single',count=Math.min(64,Math.max(0,Number(plan.signs)||0)),scale=Number(plan.scale)||1;
 const out=[],toPage=paths=>paths.map(s=>s.map(p=>({x:300+p.x*211,y:300+p.y*211})));
 const add=(paths,cx,cy,size)=>out.push(...paths.map(s=>s.map(p=>({x:cx+p.x*size,y:cy+p.y*size}))));
 if(structure==='nested'&&elements.length>1){
  elements.forEach((key,i)=>{const theta=i*Math.PI*2/elements.length,r=elements.length>1?.34:0,cx=Math.cos(theta)*r,cy=Math.sin(theta)*r;
   add(heart(key),cx,cy,.27*scale);add([circle()],cx,cy,.24);});
 }else if(structure==='parallel'&&elements.length>1){
  elements.forEach((key,i)=>{const a=i*Math.PI*2/elements.length,cx=Math.cos(a)*.48,cy=Math.sin(a)*.48;
   add(heart(key),cx,cy,.30*scale);
   for(let j=i;j<count;j+=elements.length){const key=modifiers[j%modifiers.length];if(key){const a=-Math.PI+j*Math.PI*2/Math.max(1,count);let paths=sign(key,0);if(plan.inverted)paths=paths.map(s=>s.map(p=>({x:-p.x,y:1.54-p.y})));add(paths.map(s=>s.map(p=>({x:p.x*Math.cos(a)-p.y*Math.sin(a),y:p.x*Math.sin(a)+p.y*Math.cos(a)}))),cx,cy,.34);}}
   add([circle()],cx,cy,.34);});
 }else elements.forEach((key,i)=>{
  const angle=i*Math.PI*2/elements.length,r=elements.length>1?.3:0;
  add(heart(key),Math.cos(angle)*r,Math.sin(angle)*r,(elements.length>1?.35:.9)*scale);
 });
 for(let i=0;i<count && (structure!=="parallel"||elements.length<2);i++){
  const key=modifiers[i%modifiers.length];if(!key)continue;
  const angle=-Math.PI+i*Math.PI*2/count;
  let paths=sign(key,0);
  if(plan.inverted)paths=paths.map(s=>s.map(p=>({x:-p.x,y:1.54-p.y})));
  add(paths.map(s=>s.map(p=>({x:p.x*Math.cos(angle)-p.y*Math.sin(angle),y:p.x*Math.sin(angle)+p.y*Math.cos(angle)}))),0,0,1);
 }
 if(structure!=='parallel'||elements.length<2)out.push(circle());
 return toPage(out);
}
