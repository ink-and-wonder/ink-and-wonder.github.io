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
export function heart(element) {
  if (element === "light") {
    const a = [circle(0.21)];
    for (let i = 0; i < 8; i++) {
      const t = (i * Math.PI) / 4;
      a.push(
        path([
          [Math.cos(t) * 0.3, Math.sin(t) * 0.3],
          [Math.cos(t) * 0.43, Math.sin(t) * 0.43],
        ]),
      );
    }
    return a;
  }
  if (element === "water")
    return [
      path([
        [0, -0.45],
        [-0.18, -0.18],
        [-0.24, 0.04],
        [-0.22, 0.2],
        [-0.12, 0.32],
        [0, 0.36],
        [0.15, 0.3],
        [0.24, 0.17],
        [0.23, 0],
        [0.15, -0.2],
        [0, -0.45],
      ]),
      path([
        [-0.12, 0.1],
        [-0.1, 0.2],
        [0, 0.25],
      ]),
    ];
  if (element === "wind")
    return [
      path([
        [-0.4, -0.16],
        [0.02, -0.16],
        [0.19, -0.21],
        [0.23, -0.31],
        [0.17, -0.38],
        [0.07, -0.34],
      ]),
      path([
        [-0.44, 0],
        [0.44, 0],
      ]),
      path([
        [-0.32, 0.16],
        [0.03, 0.16],
        [0.21, 0.24],
        [0.24, 0.34],
        [0.17, 0.39],
        [0.07, 0.34],
      ]),
    ];
  return [
    path([
      [0, -0.46],
      [-0.04, -0.18],
      [-0.17, -0.28],
      [-0.26, -0.05],
      [-0.24, 0.17],
      [-0.08, 0.33],
      [0.1, 0.34],
      [0.25, 0.17],
      [0.25, -0.1],
      [0.13, 0.02],
      [0.07, -0.22],
      [0, -0.46],
    ]),
    path([
      [-0.04, 0.28],
      [-0.1, 0.12],
      [0, -0.05],
      [0.1, 0.13],
      [0.04, 0.31],
    ]),
  ];
}
export function sign(modifier, angle) {
  const source =
    modifier === "flow"
      ? [
          path([
            [-0.09, 0.8],
            [0, 0.94],
            [0.09, 0.8],
          ]),
          path([
            [0, 0.94],
            [0, 0.62],
          ]),
        ]
      : modifier === "spread"
        ? [
            path([
              [0, 0.63],
              [0, 0.91],
            ]),
            path([
              [0, 0.63],
              [-0.13, 0.85],
            ]),
            path([
              [0, 0.63],
              [0.13, 0.85],
            ]),
          ]
        : [
            path([
              [0, 0.63],
              [-0.085, 0.76],
              [0, 0.9],
              [0.085, 0.76],
              [0, 0.63],
              [0, 0.54],
            ]),
          ];
  return source.map((p) =>
    p.map((q) =>
      point(
        q.x * Math.cos(angle) - q.y * Math.sin(angle),
        q.x * Math.sin(angle) + q.y * Math.cos(angle),
      ),
    ),
  );
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
  const out = [];
  for (const p of paths) {
    if (!p?.length) continue;
    out.push(p[0]);
    for (let i = 1; i < p.length; i++) {
      const a = p[i - 1],
        b = p[i],
        n = Math.max(1, Math.ceil(distance(a, b) / spacing));
      for (let j = 1; j <= n; j++) {
        out.push(
          point(a.x + ((b.x - a.x) * j) / n, a.y + ((b.y - a.y) * j) / n),
        );
        if (out.length >= max) return out;
      }
    }
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
function fitRing(p) {
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
  const closure = distance(p[0], p.at(-1)) / r;
  const deviation =
    sampled.reduce(
      (n, q) => n + Math.abs(Math.hypot(q.x - cx, q.y - cy) - r) / r,
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
    ratio < 0.72 ||
    ratio > 1.38
  )
    return null;
  return {
    cx,
    cy,
    r,
    quality: Math.max(0, 1 - deviation * 3 - closure * 0.35),
  };
}
export function recognize(strokes) {
  const all = resample(strokes, 5);
  if (all.length < 20)
    return {
      ok: false,
      reason:
        "Begin with a central sigil. Add signs around it, then close an enclosing ring.",
    };
  const rings = strokes
    .map(fitRing)
    .filter(Boolean)
    .sort((a, b) => b.r - a.r);
  if (!rings.length)
    return {
      ok: false,
      reason:
        "The seal needs a closed ring. Draw one continuous circle around the sigil and signs.",
    };
  const ring = rings[0],
    normalized = all.map((q) =>
      point((q.x - ring.cx) / ring.r, (q.y - ring.cy) / ring.r),
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
  const core = normalized.filter((q) => Math.hypot(q.x, q.y) < 0.5);
  if (core.length < 8)
    return {
      ok: false,
      reason:
        "The ring is ready, but its heart is empty. Draw an elemental sigil inside it.",
    };
  const matches = ["light", "water", "wind", "fire"]
      .map((element) => ({
        element,
        score: similarity(core, resample(heart(element), 0.035), 0.15),
      }))
      .sort((a, b) => b.score - a.score),
    best = matches[0];
  if (best.score < 0.43 || best.score - matches[1].score < 0.018)
    return {
      ok: false,
      reason:
        "The heart is not clear yet. Keep the sigil near the center, about half the width of your ring. Open the field guide for its shape.",
      candidates: matches,
    };
  const annulus = normalized.filter((q) => {
      const r = Math.hypot(q.x, q.y);
      return r >= 0.52 && r < 0.95;
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
        score: similarity(rotated, resample(sign(modifier, 0), 0.025), 0.095),
      }))
      .sort((a, b) => b.score - a.score);
    if (scores[0].score > 0.43) candidates.push({ ...scores[0], angle });
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
  return {
    ok: true,
    element: best.element,
    modifier: count ? dominant.modifier : "focus",
    signs: count,
    quality,
    power: Math.min(1, 0.32 + count * 0.14 + quality * 0.003),
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
      reason: `Your spell is alive, but needs ${requirement.signs} ${requirement.modifier === "focus" ? "gathering" : requirement.modifier === "flow" ? "lifting" : "scattering"} sign${requirement.signs > 1 ? "s" : ""}. You have ${result.signs}.`,
    };
  const matching = result.components.filter(
    (s) => s.modifier === requirement.modifier,
  ).length;
  if (matching < requirement.signs)
    return {
      ok: false,
      reason: `The element is right. Use ${requirement.modifier === "focus" ? "diamond gathering" : requirement.modifier === "flow" ? "outward lifting-arrow" : "branching scattering"} signs to give it the needed direction.`,
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
    value.length <= 150 &&
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
