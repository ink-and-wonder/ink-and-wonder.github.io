import { SIGILS, SIGNS } from "./vocabulary.js?v=3.0.5";
/* Local geometric recognition. The ring defines a coordinate system, so seals
   may be drawn anywhere on the page and at any useful size. */
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const point = (x, y) => ({ x, y }),
  path = (a) => a.map(([x, y]) => point(x, y));
export function circle(radius = 1, cx = 0, cy = 0, count = 96) {
  return Array.from({ length: count + 1 }, (_, i) =>
    point(
      cx + Math.cos((i / count) * Math.PI * 2) * radius,
      cy + Math.sin((i / count) * Math.PI * 2) * radius,
    ),
  );
}
// Geometric study drawings checked against the manga's sigil/sign references.
// Pressure, particles and recognition tolerances are game presentation, not lore.
export function heart(element) {
  if (!['fire','light','earth','water','wind'].includes(element)) return (SIGILS[element]?.paths || []).map(s=>s.map(p=>point(p.x*.9,p.y*.9)));
  if (element === "fire") return [path([[0,-.38],[-.34,.22],[.34,.22],[0,-.38]]),path([[-.21,-.02],[-.34,-.10]]),path([[.21,-.02],[.34,-.10]]),path([[0,.22],[0,.4]])];
  if (element === "light") return [path([[-.27,-.27],[.27,-.27],[.27,.27],[-.27,.27],[-.27,-.27]]),path([[0,-.27],[.27,0],[0,.27],[-.27,0],[0,-.27]]),path([[-.43,0],[-.27,0]]),path([[.27,0],[.43,0]]),path([[0,-.43],[0,-.27]]),path([[0,.27],[0,.43]])];
  if (element === "earth") return [path([[-.32,-.34],[.32,-.34]]),path([[0,-.34],[0,.29]]),path([[-.17,-.13],[-.32,.04],[0,.29],[.32,.04],[.17,-.13]]),path([[-.28,.4],[.28,.4]]),circle(.025,-.45,-.04,12),circle(.025,.45,-.04,12)];
  if (element === "water") return [path([[.08,-.44],[-.03,-.42],[-.1,-.34],[-.13,-.22],[-.08,-.08],[.01,.08],[.08,.23],[.07,.33],[0,.42],[-.12,.44]]),path([[-.29,-.22],[-.36,.05],[-.35,.15],[-.28,.18],[-.22,.13],[-.23,.04],[-.29,-.22]]),path([[.29,.22],[.36,-.05],[.35,-.15],[.28,-.18],[.22,-.13],[.23,-.04],[.29,.22]])];
  return [path([[.08,-.16],[.13,-.22],[.10,-.30],[.01,-.32],[-.08,-.26],[-.10,-.16],[-.07,-.06],[.05,.03],[.16,.13],[.18,.26],[.09,.38],[-.03,.4],[-.13,.33],[-.14,.22],[-.07,.16],[.02,.18],[.04,.24]]),path([[-.1,-.03],[-.17,-.13],[-.18,-.26],[-.09,-.38],[.03,-.4],[.13,-.33],[.14,-.22],[.07,-.16]]),path([[-.30,0],[-.52,0]]),path([[-.35,-.11],[-.43,-.19]]),path([[-.35,.11],[-.43,.19]]),path([[.30,0],[.52,0]]),path([[.35,-.11],[.43,-.19]]),path([[.35,.11],[.43,.19]])];
}
export function sign(modifier, angle) {
  if (!['focus','flow','spread'].includes(modifier)) return (SIGNS[modifier]?.paths || []).map(s=>s.map(p=>{const x=p.x*.34,y=p.y*.34+.77;return point(x*Math.cos(angle)-y*Math.sin(angle),x*Math.sin(angle)+y*Math.cos(angle));}));
  const stem=path([[0,1],[0,.65]]);
  const source = modifier === "flow" ? [path([[0,1],[0,.6]]),path([[-.1,.73],[0,.6],[.1,.73]]),path([[-.09,1],[.09,1]])] :
    modifier === "spread" ? [stem,path([[-.12,.65],[.12,.65]]),path([[-.13,.56],[-.07,.51],[0,.49],[.07,.51],[.13,.56]])] :
    [stem,path([[-.13,.65],[.13,.65]])];
  return source.map(p=>p.map(q=>point(q.x*Math.cos(angle)-q.y*Math.sin(angle),q.x*Math.sin(angle)+q.y*Math.cos(angle))));
}
export function recipePaths(element, modifier = "focus", signs = 1) {
  const p = heart(element);
  for (let i = 0; i < signs; i++)
    p.push(...sign(modifier, -Math.PI + (i * Math.PI * 2) / signs));
  p.push(circle());
  return p;
}
export function pagePaths(element, modifier, signs) {
  return recipePaths(element, modifier, signs).map((p) =>
    p.map((q) => point(300 + q.x * 211, 300 + q.y * 211)),
  );
}
export function resample(paths, spacing = 5, max = 3500) {
  // Sample by travelled distance rather than event count. Slow pen strokes must
  // not outweigh fast ones, and a long scribble must not hide the closing ring.
  const total = strokeLength(paths);
  spacing = Math.max(spacing, total / Math.max(1, max - paths.length));
  const out = [];
  for (const p of paths) {
    if (!p?.length) continue;
    out.push(p[0]);
    let remaining = spacing;
    for (let i = 1; i < p.length; i++) {
      let a = p[i-1], b = p[i], length = distance(a,b);
      while (length >= remaining && out.length < max) {
        const t = remaining / length;
        a = point(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t);
        out.push(a); length = distance(a,b); remaining = spacing;
      }
      remaining -= length;
    }
    if (distance(out.at(-1),p.at(-1)) > spacing * 0.25) out.push(p.at(-1));
  }
  return out;
}
const nearest = (p, points) => {
  let best = Infinity;
  for (const q of points) {
    const d = (p.x - q.x) ** 2 + (p.y - q.y) ** 2;
    if (d < best) best = d;
  }
  return Math.sqrt(best);
};
function similarity(actual, expected, tolerance = 0.11) {
  if (actual.length < 4) return 0;
  const a =
    actual.reduce(
      (n, p) => n + Math.max(0, 1 - nearest(p, expected) / tolerance),
      0,
    ) / actual.length;
  const b =
    expected.reduce(
      (n, p) => n + Math.max(0, 1 - nearest(p, actual) / tolerance),
      0,
    ) / expected.length;
  return 0.43 * a + 0.57 * b;
}
export function fitRing(p) {
  if (p.length < 12) return null;
  const sampled = resample([p], 5, 1200),
    xs = sampled.map((q) => q.x),
    ys = sampled.map((q) => q.y);
  const minX = Math.min(...xs),
    maxX = Math.max(...xs),
    minY = Math.min(...ys),
    maxY = Math.max(...ys),
    cx = (minX + maxX) / 2,
    cy = (minY + maxY) / 2,
    r = (maxX - minX + (maxY - minY)) / 4;
  if (r < 35 || r > 425) return null;
  const rx = (maxX-minX)/2, ry = (maxY-minY)/2;
  const closure = distance(p[0], p.at(-1)) / r;
  const deviation =
    sampled.reduce(
      (n, q) => n + Math.abs(Math.hypot((q.x - cx) / rx, (q.y - cy) / ry) - 1),
      0,
    ) / sampled.length;
  const bins = new Set(
    sampled.map(
      (q) =>
        Math.floor(
          ((Math.atan2(q.y - cy, q.x - cx) + Math.PI) / (Math.PI * 2)) * 24,
        ) % 24,
    ),
  );
  const ratio = (maxX - minX) / (maxY - minY);
  if (
    closure > 0.24 ||
    deviation > 0.12 ||
    bins.size < 22 ||
    ratio < 0.65 ||
    ratio > 1.55
  )
    return null;
  return {
    cx,
    cy,
    r, rx, ry,
    quality: Math.max(0, 1 - deviation * 3 - closure * 0.35),
  };
}
export function ringCandidates(strokes) {
  const candidates = strokes.map(fitRing).filter(Boolean);
  const points = strokes.flat();
  if (!points.length) return candidates;
  const xs=points.map(p=>p.x), ys=points.map(p=>p.y);
  const cx=(Math.min(...xs)+Math.max(...xs))/2, cy=(Math.min(...ys)+Math.max(...ys))/2;
  const r=(Math.max(...xs)-Math.min(...xs)+Math.max(...ys)-Math.min(...ys))/4;
  const arcs=strokes.filter(p=>p.length>2 && p.every(q=>Math.hypot(q.x-cx,q.y-cy)>r*0.72));
  const unused=new Set(arcs);
  for (const arc of arcs) {
    if (!unused.delete(arc)) continue;
    let joined=[...arc];
    while (unused.size) {
      let nearestArc=null, reverse=false, gap=Infinity;
      for (const next of unused) for (const rev of [false,true]) {
        const d=distance(joined.at(-1),rev?next.at(-1):next[0]);
        if(d<gap){gap=d;nearestArc=next;reverse=rev;}
      }
      if(gap>r*0.16) break;
      unused.delete(nearestArc);
      joined.push(...(reverse?[...nearestArc].reverse():nearestArc));
    }
    const fit=fitRing(joined); if(fit) candidates.push(fit);
  }
  return candidates.sort((a,b)=>b.r-a.r);
}
function fitCore(actual, element) {
  const expected=resample(heart(element),0.035);
  const bounds=pts=>{
    const xs=pts.map(p=>p.x),ys=pts.map(p=>p.y);
    return {x:(Math.min(...xs)+Math.max(...xs))/2,y:(Math.min(...ys)+Math.max(...ys))/2,
      size:Math.max(Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys))};
  };
  const a=bounds(actual), b=bounds(expected);
  if(a.size<0.15 || a.size>1.4) return {score:0,rotation:0};
  let best={score:0,rotation:0};
  for(let i=0;i<24;i++) {
    const rotation=i*Math.PI/12, co=Math.cos(rotation),si=Math.sin(rotation);
    const aligned=actual.map(p=>{const x=(p.x-a.x)*b.size/a.size,y=(p.y-a.y)*b.size/a.size;
      return point(x*co-y*si+b.x,x*si+y*co+b.y);});
    const score=similarity(aligned,expected,0.14);
    if(score>best.score) best={score,rotation};
  }
  return best;
}
export function recognize(strokes) {
  const all = resample(strokes, 5);
  if (all.length < 20)
    return {
      ok: false,
      reason:
        "Begin with a central sigil. Add signs around it, then close an enclosing ring.",
    };
  const rings = ringCandidates(strokes);
  if (!rings.length)
    return {
      ok: false,
      reason:
        "The enclosing ring is open or too uneven. Join its endpoints; you may use several connected strokes. Keep the sigil and signs inside.",
    };
  const ring = rings[0],
    normalized = all.map((q) =>
      point((q.x - ring.cx) / ring.rx, (q.y - ring.cy) / ring.ry),
    );
  const outside =
    normalized.filter((q) => Math.hypot(q.x, q.y) > 1.17).length /
    normalized.length;
  if (outside > 0.13)
    return {
      ok: false,
      reason:
        "Some ink lies outside the seal. Erase stray strokes or draw a larger enclosing ring.",
    };
  const normalizedPaths = strokes.map(s=>s.map(q=>point((q.x-ring.cx)/ring.rx,(q.y-ring.cy)/ring.ry)));
  const innerPaths = normalizedPaths.filter(s=>s.length && Math.max(...s.map(q=>Math.hypot(q.x,q.y)))<0.7 &&
      s.reduce((n,q)=>n+Math.hypot(q.x,q.y),0)/s.length<0.52);
  const core = resample(innerPaths,0.025);
  if (core.length < 8)
    return {
      ok: false,
      reason:
        "The ring is ready, but its heart is empty. Draw an elemental sigil inside it.",
    };
  const matches = ["light", "water", "wind", "fire", "earth"]
      .map((element) => ({
        element,
        ...fitCore(core, element),
      }))
      .sort((a, b) => b.score - a.score),
    best = matches[0];
  if (best.score < 0.67 || best.score - matches[1].score < 0.018)
    return {
      ok: false,
      reason:
        "The heart is not clear yet. Keep the sigil near the center, about half the width of your ring. Open the field guide for its shape.",
      candidates: matches,
    };
  const annulus = resample(normalizedPaths.filter(p=>!innerPaths.includes(p)),0.025).filter((q) => {
      const r = Math.hypot(q.x, q.y);
      return r >= 0.42 && r < 0.95;
    }),
    signs = [];
  const candidates = [];
  for (let n = 0; n < 72; n++) {
    const angle = (n * Math.PI * 2) / 72,
      sector = annulus.filter((q) => {
        const a = Math.atan2(q.y, q.x) - Math.PI / 2 - angle;
        return Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < 0.21;
      });
    if (sector.length < 4) continue;
    const rotated = sector.map((q) =>
      point(
        q.x * Math.cos(-angle) - q.y * Math.sin(-angle),
        q.x * Math.sin(-angle) + q.y * Math.cos(-angle),
      ),
    );
    const scores = ["focus", "flow", "spread"]
      .map((modifier) => ({
        modifier,
        score: Math.max(...[0.85,1,1.15].map(scale=> similarity(
          rotated.map(p=>point(p.x/scale,(p.y-0.78)/scale+0.78)),
          resample(sign(modifier, 0), 0.025).filter(p=>Math.hypot(p.x,p.y)<0.95), 0.08))),
      }))
      .sort((a, b) => b.score - a.score);
    if (scores[0].score > 0.49) candidates.push({ ...scores[0], angle, length: Math.max(...sector.map(p=>Math.hypot(p.x,p.y))) - Math.min(...sector.map(p=>Math.hypot(p.x,p.y))) });
  }
  candidates.sort((a, b) => b.score - a.score);
  for (const candidate of candidates) {
    if (
      !signs.some(
        (s) =>
          Math.abs(
            Math.atan2(
              Math.sin(s.angle - candidate.angle),
              Math.cos(s.angle - candidate.angle),
            ),
          ) < 0.4,
      )
    )
      signs.push(candidate);
  }
  const dominant = ["focus", "flow", "spread"]
    .map((modifier) => ({
      modifier,
      count: signs.filter((s) => s.modifier === modifier).length,
    }))
    .sort((a, b) => b.count - a.count)[0];
  const quality = Math.round(
      Math.min(100, (best.score * 0.7 + ring.quality * 0.3) * 100),
    ),
    count = signs.length;
  const signWeight=signs.reduce((n,s)=>n+s.length,0);
  const direction=signs.reduce((v,s)=>({x:v.x+Math.sin(s.angle)*s.length,y:v.y-Math.cos(s.angle)*s.length}),{x:0,y:0});
  if(signWeight){direction.x/=signWeight;direction.y/=signWeight;}
  return {
    ok: true,
    element: best.element,
    modifier: count ? dominant.modifier : "focus",
    signs: count,
    quality,
    power: Math.min(1, 0.15 + Math.max(...core.map(p=>Math.hypot(p.x,p.y))) * 0.9 + count * 0.06 + signWeight * 0.09),
    direction,
    balance: 1-Math.min(1,Math.hypot(direction.x,direction.y)),
    composition: [...new Set(signs.map(s=>s.modifier))],
    sigilScale: Math.max(...core.map(p=>Math.hypot(p.x,p.y))),
    ring: { x: ring.cx, y: ring.cy, r: ring.r },
    heartQuality: best.score,
    components: signs,
    matches,
  };
}
export function checkObjective(result, requirement) {
  if (!result.ok) return { ok: false, reason: result.reason };
  if (result.element !== requirement.element)
    return {
      ok: false,
      reason: `That seal makes ${result.element === "fire" ? "warmth" : result.element}. This moment calls for ${requirement.element === "fire" ? "warmth" : requirement.element}. Change the central sigil.`,
    };
  if (result.signs < requirement.signs)
    return {
      ok: false,
      reason: `Your spell is alive, but needs ${requirement.signs} ${requirement.modifier === "focus" ? "Columns" : requirement.modifier === "flow" ? "Levitation" : "Dispersion"} sign${requirement.signs > 1 ? "s" : ""}. You have ${result.signs}.`,
    };
  const matching = result.components.filter(
    (s) => s.modifier === requirement.modifier,
  ).length;
  if (matching < requirement.signs)
    return {
      ok: false,
      reason: `The element is right. Use ${requirement.modifier === "focus" ? "T-shaped Columns" : requirement.modifier === "flow" ? "inward Levitation" : "curved Dispersion"} signs to give it the needed direction.`,
    };
  return { ok: true };
}
export function strokeLength(strokes) {
  return strokes.reduce(
    (n, p) => n + p.reduce((a, q, i) => a + (i ? distance(q, p[i - 1]) : 0), 0),
    0,
  );
}
export function validateDrawing(value) {
  return (
    Array.isArray(value) &&
    value.length <= 1200 &&
    value.every(
      (s) =>
        Array.isArray(s) &&
        s.length <= 5000 &&
        s.every(
          (p) =>
            p &&
            Number.isFinite(p.x) &&
            Number.isFinite(p.y) &&
            p.x >= -20 &&
            p.x <= 620 &&
            p.y >= -20 &&
            p.y <= 620 &&
            (p.p === undefined ||
              (Number.isFinite(p.p) && p.p >= 0 && p.p <= 1)),
        ),
    )
  );
}
