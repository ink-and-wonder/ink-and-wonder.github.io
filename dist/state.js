import { MISSIONS, ELEMENTS, MODIFIERS } from "./data.js?v=3.0.4";
import { validateDrawing } from "./engine.js?v=3.0.4";
export const SAVE_KEY = "ink-wonder-adventure-v2";
export const freshSave = () => ({
  version: 2,
  completed: {},
  seals: [],
  discoveries: [],
  settings: {
    sound: true,
    music: true,
    penOnly: false,
    autoCast: true,
    reducedMotion: false,
    largeText: false,
    interpretations: false,
  },
  lastMission: 0,
});
export function validateSave(input) {
  if (
    !input ||
    input.version !== 2 ||
    !input.completed ||
    typeof input.completed !== "object" ||
    !Array.isArray(input.seals) ||
    input.seals.length > 40 ||
    !Array.isArray(input.discoveries)
  )
    throw Error("This is not an Ink & Wonder adventure save.");
  const clean = freshSave();
  for (const [id, value] of Object.entries(input.completed)) {
    if (
      !MISSIONS.some((m) => m.id === id) ||
      !value ||
      !Number.isInteger(value.stars) ||
      value.stars < 1 ||
      value.stars > 3 ||
      !Number.isFinite(value.quality) ||
      value.quality < 0 ||
      value.quality > 100
    )
      throw Error("The save contains invalid mission progress.");
    clean.completed[id] = {
      stars: value.stars,
      quality: Math.round(value.quality),
    };
  }
  clean.seals = input.seals.map((s) => {
    if (
      !s ||
      typeof s.name !== "string" ||
      s.name.length > 60 ||
      !validateDrawing(s.strokes) ||
      !(s.element === "sketch" || Object.hasOwn(ELEMENTS,s.element)) ||
      !Object.hasOwn(MODIFIERS,s.modifier)
    )
      throw Error("The save contains an invalid seal.");
    return {
      id: String(s.id).slice(0, 80),
      name: s.name,
      strokes: s.strokes,
      element: s.element,
      modifier: s.modifier,
      quality: Math.max(0, Math.min(100, Number(s.quality) || 0)),
    };
  });
  clean.discoveries = [
    ...new Set(
      input.discoveries.filter(
        (s) =>
          typeof s === "string" &&
          Object.keys(ELEMENTS).some(e=>s.startsWith(e+"-") && Object.hasOwn(MODIFIERS,s.slice(e.length+1))),
      ),
    ),
  ];
  for (const k of Object.keys(clean.settings))
    if (typeof input.settings?.[k] === "boolean")
      clean.settings[k] = input.settings[k];
  if (Number.isInteger(input.lastMission))
    clean.lastMission = Math.max(0, Math.min(11, input.lastMission));
  return clean;
}
export function available(index, save) {
  return index === 0 || !!save.completed[MISSIONS[index - 1].id];
}
export function nextMission(save) {
  const index = MISSIONS.findIndex((m) => !save.completed[m.id]);
  return index === -1 ? 11 : index;
}
export function insight(save) {
  return (
    Object.values(save.completed).reduce(
      (sum, m) => sum + 80 + m.stars * 20,
      0,
    ) +
    save.discoveries.length * 10
  );
}
export function completeMission(save, index, scores, usedGuide) {
  if (
    !available(index, save) ||
    scores.length !== MISSIONS[index].steps.length ||
    scores.some((s) => !Number.isFinite(s) || s < 0 || s > 100)
  )
    throw Error("Mission is not complete.");
  const quality = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    stars = quality >= 85 && !usedGuide ? 3 : quality >= 65 ? 2 : 1,
    old = save.completed[MISSIONS[index].id];
  save.completed[MISSIONS[index].id] = {
    quality: Math.max(quality, old?.quality || 0),
    stars: Math.max(stars, old?.stars || 0),
  };
  save.lastMission = Math.min(11, index + 1);
  return { quality, stars, isNew: !old };
}
