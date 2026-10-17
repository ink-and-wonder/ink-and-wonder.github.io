import { SIGILS, SIGNS } from "./vocabulary.js?v=3.0.5";
export const ELEMENTS = {
  light: {
    name: "Light",
    color: "#f5d98b",
    glyph: "☼",
    description:
      "A square and inner diamond with four short extensions. A light-producing variant within fire magic.",
  },
  water: {
    name: "Water",
    color: "#8bd8e7",
    glyph: "♧",
    description: "A flowing central curve between two opposing droplets. Water is created or manipulated.",
  },
  wind: {
    name: "Wind",
    color: "#b6d4b0",
    glyph: "≋",
    description: "Opposing curls with side marks. Moves existing air.",
  },
  fire: {
    name: "Fire",
    color: "#efa97a",
    glyph: "♨",
    description: "A triangle with three short extensions. Creates flame or heat.",
  },
};
ELEMENTS.earth = {name:"Earth",color:"#d8bc86",glyph:"◇",description:"A barred vertical stroke, angular bowl, and two dots. Works on existing solid material."};
export const MODIFIERS = {
  focus: {
    name: "Columns",
    label: "A T-shaped sign",
    description: "Directs an effect along a column. Its length changes its strength.",
  },
  flow: {
    name: "Levitation",
    label: "An inward arrow with a base",
    description: "Balanced levitation signs suspend the affected object.",
  },
  spread: {
    name: "Dispersion",
    label: "A T with a curved cap",
    description: "Lets an effect spread outward rather than remain in a narrow column.",
  },
};
for (const [id,g] of Object.entries(SIGILS)) if(!ELEMENTS[id]) ELEMENTS[id]={name:g.name,color:g.color,glyph:'',description:g.effect?g.effect.replaceAll('-',' '):'Function unresolved',certainty:g.certainty};
ELEMENTS.shaping={name:'Shaping seal',color:'#d9d4bd',glyph:'',description:'A seal that acts on existing material without an elemental sigil.'};
for (const [id,g] of Object.entries(SIGNS)) if(!MODIFIERS[id]) MODIFIERS[id]={name:g.name,label:g.certainty==='unknown'?'Unresolved function':g.effect||'Study symbol',description:g.effect?g.effect.replaceAll('-',' '):'Function unresolved',certainty:g.certainty};
export const CHAPTERS = [
  {
    name: "The first line",
    subtitle: "CHAPTER I",
    place: "Qifrey’s atelier",
    art: "atelier",
    description:
      "An invitation, a blank page, and the four things every apprentice learns to see.",
  },
  {
    name: "Beyond the doorstep",
    subtitle: "CHAPTER II",
    place: "Bellweather village",
    art: "village",
    description:
      "Magic finds its purpose in the small things people need. Follow the road to Bellweather.",
  },
  {
    name: "The forgotten sky",
    subtitle: "CHAPTER III",
    place: "The starfall observatory",
    art: "forest",
    description:
      "Four empty braziers. An unfinished promise. A sky waiting to be remembered.",
  },
];
const s = (element, modifier = "focus", signs = 1) => ({
  element,
  modifier,
  signs,
});
export const MISSIONS = [
  {
    id: "first-light",
    title: "A light in the quiet",
    chapter: 0,
    location: "The writing desk",
    object: "lantern",
    brief:
      "Dusk is settling over the atelier. Give the reading lantern its first light.",
    steps: [s("light")],
    before: {
      speaker: "Qifrey",
      text: "There is no need to hurry. A spell begins with an intention. Draw the light sigil, add a Columns sign, then close the ring. The last line is the one that wakes it.",
    },
    after:
      "A quiet glow spills across the page. The letters you could barely see become a whole new world.",
    reward: "Lantern keeper",
    memory:
      "The first light you made was small enough to fit in your hands. It was still magic.",
  },
  {
    id: "morning-dew",
    title: "A cup of morning dew",
    chapter: 0,
    location: "The windowsill",
    object: "plant",
    brief:
      "The little silverleaf plant has begun to droop. Gather water at its roots.",
    steps: [s("water")],
    before: {
      speaker: "Qifrey",
      text: "Look closely at a raindrop. A line can remember its shape. This time, make water and bring it gently to the roots.",
    },
    after:
      "Silverleaf uncurls, one leaf at a time. A single drop hangs from its tip like a tiny glass world.",
    reward: "Silverleaf sprig",
    memory:
      "Water never keeps a shape for long. Your ink gave it a moment of purpose.",
  },
  {
    id: "paper-wings",
    title: "Paper wings",
    chapter: 0,
    location: "The open window",
    object: "paper",
    brief: "Give the folded paper bird a current of air and a Levitation sign.",
    steps: [s("wind", "flow")],
    before: {
      speaker: "Qifrey",
      text: "The heart tells your spell what to make. The surrounding signs tell it how to behave. Try the Levitation sign. Let the air lift the folded bird.",
    },
    after:
      "The little bird rises, catches the breeze, and circles back to land by your pen.",
    reward: "Paper swallow",
    memory: "For a breath, a folded page remembered what it meant to fly.",
  },
  {
    id: "tea-for-two",
    title: "Tea for two",
    chapter: 0,
    location: "The hearth",
    object: "kettle",
    brief:
      "The kettle has gone cold. Gather a small, careful warmth beneath it.",
    steps: [s("fire", "focus", 2)],
    before: {
      speaker: "Qifrey",
      text: "Heat calls for care. Give it two Columns signs and keep your lines steady. We are making tea, after all, not a bonfire.",
    },
    after:
      "A curl of steam rises. Outside, the day is beginning. Inside, there is just enough time for tea.",
    reward: "Apprentice’s ribbon",
    memory:
      "Your first morning ended with four spells and two cups of tea. Tomorrow, the road.",
  },
  {
    id: "bridge-lamps",
    title: "The lamplighter’s errand",
    chapter: 1,
    location: "Bellweather bridge",
    object: "lamps",
    brief: "The bridge lamps are dark. Scatter light across the crossing.",
    steps: [s("light", "spread", 2)],
    before: {
      speaker: "The lamplighter",
      text: "The path is easy by daylight. It is different after dusk. Can your little light become a few lights, spread along the bridge?",
    },
    after:
      "One lamp, then another. The bridge becomes a bright ribbon over the water, and footsteps begin to cross.",
    reward: "Bellweather token",
    memory:
      "The lamplighter thanked you without asking where the magic came from.",
  },
  {
    id: "thirsty-garden",
    title: "Rain for the kitchen garden",
    chapter: 1,
    location: "The terraced garden",
    object: "garden",
    brief: "Scatter water gently over the kitchen garden’s thirsty beds.",
    steps: [s("water", "spread", 3)],
    before: {
      speaker: "The gardener",
      text: "Not a flood, if you please! Just a little rain. The kind that makes the leaves shine and never bends the stems.",
    },
    after:
      "Fine drops settle across the garden. The smell of wet earth rises to meet you.",
    reward: "Rain-glass bead",
    memory:
      "A garden cannot say thank you. The gardener insisted that the flowers did.",
  },
  {
    id: "idle-mill",
    title: "The sleeping windmill",
    chapter: 1,
    location: "The hill above the village",
    object: "mill",
    brief:
      "Still air has stopped the mill. Lift a steady current toward its sails.",
    steps: [s("wind", "flow", 3)],
    before: {
      speaker: "The miller",
      text: "There is flour enough for today. Tomorrow is another matter. Could you persuade the wind to visit for a while?",
    },
    after:
      "The great sails turn slowly, then settle into a patient rhythm. Somewhere inside, grain begins to sing.",
    reward: "Brass wind vane",
    memory:
      "You had never thought of bread as something the wind helped to make.",
  },
  {
    id: "evening-market",
    title: "The last stall at sunset",
    chapter: 1,
    location: "The evening market",
    object: "market",
    brief: "Warm the baker’s oven, then carry a little light above the stall.",
    steps: [s("fire", "focus", 2), s("light", "flow", 2)],
    before: {
      speaker: "The baker",
      text: "One more tray, and a light to see it by. Two small kindnesses. That is all I need before I close up.",
    },
    after:
      "The last warm loaf is yours. From the hill, the village lights look like a second sky.",
    reward: "The road’s kindness",
    memory:
      "You left Bellweather with warm bread and a promise to return. Above the trees, a broken observatory waited.",
  },
  {
    id: "stone-and-rain",
    title: "The path under the moss",
    chapter: 2,
    location: "The forest gate",
    object: "gate",
    brief: "Scatter water to soften the moss, then lift it away with wind.",
    steps: [s("water", "spread", 3), s("wind", "flow", 2)],
    before: {
      speaker: "Qifrey",
      text: "A closed path is sometimes a question with more than one answer. Do not force the stone. Work with what grows upon it.",
    },
    after:
      "The moss falls away. A carved star emerges, and the gate opens onto a forgotten courtyard.",
    reward: "Stone star fragment",
    memory:
      "Someone had drawn this star long before you were born. You traced its shape with your eyes.",
  },
  {
    id: "sleeping-spring",
    title: "The sleeping spring",
    chapter: 2,
    location: "The moon pool",
    object: "pool",
    brief: "Warm the frozen inlet, then lift fresh water into the empty basin.",
    steps: [s("fire", "focus", 3), s("water", "flow", 3)],
    before: {
      speaker: "Qifrey",
      text: "Listen beneath the ice. The spring is still there. First warmth, then water. Each spell has its moment.",
    },
    after:
      "The ice loosens its hold. Clear water crosses the courtyard and fills the old basin with a reflection of the sky.",
    reward: "Moonwater vial",
    memory:
      "For the first time in years, the observatory could see the sky reflected at its feet.",
  },
  {
    id: "lost-constellation",
    title: "The stars beneath the dust",
    chapter: 2,
    location: "The celestial gallery",
    object: "orrery",
    brief:
      "Gather wind to clear the old chart, then scatter light across its stars.",
    steps: [s("wind", "focus", 3), s("light", "spread", 4)],
    before: {
      speaker: "Qifrey",
      text: "These were not predictions. They were observations. Someone loved the sky enough to draw it, night after night. Let us see what they saw.",
    },
    after:
      "Dust rises in a silver cloud. One by one, the chart’s stars shine back into being.",
    reward: "The astronomer’s page",
    memory:
      "The same hands that drew spells had drawn the stars. Both were ways of paying attention.",
  },
  {
    id: "sky-we-make",
    title: "The sky we make",
    chapter: 2,
    location: "The starfall observatory",
    object: "observatory",
    brief:
      "Wake four channels: moving water, gathered warmth, scattered wind, and light.",
    steps: [
      s("water", "flow", 3),
      s("fire", "focus", 3),
      s("wind", "spread", 3),
      s("light", "spread", 4),
    ],
    before: {
      speaker: "Qifrey",
      text: "There is no single spell for everything. There is water, warmth, air, and light. There is what you have learned. And there are your hands. That is enough.",
    },
    after:
      "The observatory opens like a flower. Above the courtyard, a thousand little lights turn together. You made no new stars. You simply helped the world remember them.",
    reward: "Witch of little wonders",
    memory:
      "An empty page is no longer empty to you. It is full of things that have not happened yet.",
  },
];
export const OBJECT_NAMES = {
  lantern: "Reading lantern",
  plant: "Silverleaf",
  paper: "Paper swallow",
  kettle: "Copper kettle",
  lamps: "Bridge lamps",
  garden: "Kitchen garden",
  mill: "Windmill",
  market: "Market stall",
  gate: "Moss-covered gate",
  pool: "Moon pool",
  orrery: "Star chart",
  observatory: "Celestial lens",
};
export const RANKS = [
  "New apprentice",
  "Keeper of little lights",
  "Witch of the open road",
  "Witch of little wonders",
];
