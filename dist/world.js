const shell = (content) =>
  `<svg viewBox="0 0 340 310" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><ellipse class="object-shadow" cx="170" cy="280" rx="111" ry="14" fill="#081c1b" opacity=".28"/><g stroke="#e8ddbd" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">${content}</g></svg>`;
const lantern = (x) =>
  `<g transform="translate(${x} 0)"><path fill="#203b37" d="m120 109 25-30h50l25 30v139H120Z"/><path d="M110 109h120M115 248h110M145 79v-9a25 25 0 0 1 50 0v9M133 119v116m73-116v116"/><path class="lit-fill" d="M143 124h54v109h-54Z" fill="#c4b58b" fill-opacity=".15"/><path d="M170 123v111m-27-55h54"/><circle class="core-glow" cx="170" cy="179" r="19" fill="var(--spell-color)" stroke="none"/></g>`;
const plant = `<path fill="#a38b66" d="m118 208 14 64h76l14-64Z"/><path d="M110 207h120v13H110m60-16v-93"/><g class="leaves" fill="#657f60"><path d="M170 177c-48 1-70-25-62-54 36-2 61 21 62 54Zm0-27c50 2 71-28 63-55-37 0-60 24-63 55Zm0-22c-29-16-28-53-5-69 29 17 30 47 5 69Z"/></g><g class="water-drops" fill="#a7e0e4"><path d="M105 105q-15 23 0 23t0-23m132 56q-15 23 0 23t0-23"/></g>`;
const kettle = `<g class="kettle"><path fill="#8d7257" d="M100 174c0-64 140-64 140 0v44c0 51-140 51-140 0Z"/><path d="M116 135c-22-78 129-78 108 0M98 181l-39-24 14 61 34 14M240 176c66-28 60 65-4 48M126 140h88m-47-14h9v-13h-9Z"/><path class="steam" d="M142 91q-20-20 0-37t0-28m28 65q-20-20 0-37t0-28m28 65q-20-20 0-37t0-28"/></g><path class="fire-glow" d="M140 282c-30-30 20-42 22-63 12 17 9 30 17 29l14-17c10 22 33 44 6 51Z" fill="var(--spell-color)"/>`;
const mill = `<path fill="#506458" d="m123 274 13-147 34-27 35 27 13 147Z"/><path d="m126 133 44-50 45 50M156 275v-48h29v48"/><g class="mill-sails"><path fill="#d6cba8" d="m164 152-4-96h23l-6 96Zm13 13 95-4v23l-95-6Zm-13 11 4 96h-23l6-96Zm-13-13-95 4v-23l95 6Z"/><circle cx="164" cy="164" r="12" fill="#8a7352"/></g>`;
const arch = `<path fill="#52685a" d="M80 275V124a90 90 0 0 1 180 0v151h-36V124a54 54 0 0 0-108 0v151Z"/><path d="M75 276h47m96 0h48M82 181h34m108 0h34M82 226h34m108 0h34M88 91l33 13m99 0 33-13M168 37v36"/><path class="moss" d="M92 136q40 14 1 40t5 36m145-80q-35 20 0 42t-4 45M116 70q24 32 26-8m50 0q30 37 30 12" stroke="#82945b" stroke-width="15"/><path class="star-mark" d="m170 88 6 15 17 1-13 11 4 16-14-9-14 9 4-16-13-11 17-1Z" fill="var(--spell-color)"/>`;
const observatory = `<ellipse cx="170" cy="257" rx="102" ry="24" fill="#284c4c"/><path d="M68 257v17c60 34 144 34 204 0v-17m-149-9 16-111h62l16 111" fill="#526965"/><g class="orrery"><ellipse cx="170" cy="133" rx="92" ry="30" transform="rotate(-30 170 133)"/><ellipse cx="170" cy="133" rx="86" ry="35" transform="rotate(45 170 133)"/><circle cx="170" cy="133" r="67"/><path d="M81 133h178M170 44v178"/><circle class="core-glow" cx="170" cy="133" r="24" fill="var(--spell-color)"/></g><path d="M145 256h50M152 239h36"/>`;
export function objectArt(type) {
  if (type === "market")
    return shell(
      `<path fill="#675d4a" d="M55 270V183a80 80 0 0 1 160 0v87Z"/><path d="M49 270h173M70 190h130M84 154h101M110 125h49M55 222h29m103 0h28M105 171v19m59-19v19"/><path fill="#1c3029" d="M90 265v-59a45 45 0 0 1 90 0v59Z"/><path class="fire-glow" d="M112 259c-15-23 11-29 13-52 15 18 7 23 17 25l9-15c3 22 22 27 8 42Z" fill="#efac70"/><g transform="translate(150 80) scale(.6)">${lantern(0)}</g>`,
    );
  if (["lantern", "lamps"].includes(type))
    return shell(
      type === "lamps"
        ? `<g transform="translate(-62 5) scale(.85)">${lantern(0)}</g><g transform="translate(125 25) scale(.75)">${lantern(0)}</g>`
        : lantern(0),
    );
  if (["plant", "garden"].includes(type)) return shell(plant);
  if (type === "paper")
    return shell(
      `<g class="paper-bird" fill="#e2dbc4"><path d="m55 180 111-28 123-73-72 110-35 17-55 44 12-57-84-13Z"/><path d="m166 152 16 54 35-17m-78 4 27-41m16 54 107-127"/></g><path class="air-trails" d="M64 236h47m-62 14h32m155-38h45"/>`,
    );
  if (type === "kettle") return shell(kettle);
  if (type === "mill") return shell(mill);
  if (type === "gate") return shell(arch);
  if (type === "pool")
    return shell(
      `<path d="M61 210c0-64 218-64 218 0v35c-18 55-201 55-218 0Z" fill="#455f61"/><ellipse class="pool-water" cx="170" cy="211" rx="105" ry="33" fill="#a8c8d0"/><path class="ice" d="m79 206 59-14 24 18 55-18 39 18-52 19-37-13-47 15-41-25Z" fill="#c6d8d5"/><path d="M72 243q100 50 196 0"/>`,
    );
  const channels =
    type === "observatory"
      ? ["#8bd8e7", "#efa97a", "#b6d4b0", "#f5d98b"]
          .map(
            (color, i) =>
              `<circle class="channel" style="--channel-color:${color}" cx="${110 + i * 40}" cy="265" r="10"/>`,
          )
          .join("")
      : "";
  return shell(observatory + channels);
}
export class WorldEffects {
  constructor(canvas, reduced = false) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.particles = [];
    this.reduced = reduced;
    this.time = 0;
    this.frame = 0;
    this.resize = new ResizeObserver(() => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
    });
    this.resize.observe(canvas);
    this.loop = this.loop.bind(this);
  }
  cast(result) {
    const colors = {
        light: "#ffe2a0",
        water: "#a0e6f0",
        wind: "#cbe2bf",
        fire: "#ffc08b",
      },
      range = result.modifier === "spread" ? 0.65 : 0.2;
    for (
      let i = 0;
      i < (this.reduced ? 12 : 25 + Math.round(result.power * 80));
      i++
    )
      this.particles.push({
        x: 0.48 + (Math.random() - 0.5) * range,
        y: 0.6 + (Math.random() - 0.5) * 0.25,
        vx: (Math.random() - 0.5) * 0.0015,
        vy: -0.0005 - Math.random() * 0.0015,
        life: 1,
        age: 0,
        size: 1 + Math.random() * 3,
        color: colors[result.element],
        kind: result.element,
        modifier: result.modifier,
      });
    this.color = colors[result.element];
    this.pulse = 1;
    if (!this.frame) {
      this.time = 0;
      this.frame = requestAnimationFrame(this.loop);
    }
  }
  loop(now) {
    const dt = Math.min(now - this.time || 16, 40);
    this.time = now;
    const c = this.ctx,
      w = this.canvas.width,
      h = this.canvas.height;
    c.clearRect(0, 0, w, h);
    if (this.pulse > 0) {
      const g = c.createRadialGradient(
        w * 0.48,
        h * 0.61,
        0,
        w * 0.48,
        h * 0.61,
        w * 0.45,
      );
      g.addColorStop(0, this.color + "44");
      g.addColorStop(1, this.color + "00");
      c.globalAlpha = this.pulse;
      c.fillStyle = g;
      c.fillRect(0, 0, w, h);
      this.pulse -= dt * 0.00035;
      c.globalAlpha = 1;
    }
    for (const p of this.particles) {
      p.age += dt;
      p.life = 1 - p.age / 4200;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.modifier === "spread") p.x += p.vx * dt;
      if (p.kind === "water") p.vy += dt * 0.000001;
      c.globalAlpha = Math.max(0, p.life);
      c.fillStyle = p.color;
      c.shadowBlur = this.reduced ? 0 : 14;
      c.shadowColor = p.color;
      c.beginPath();
      c.ellipse(
        p.x * w,
        p.y * h,
        p.size * (w / 750),
        p.size * (p.kind === "water" ? 2.5 : 1) * (w / 750),
        0,
        0,
        Math.PI * 2,
      );
      c.fill();
    }
    c.globalAlpha = 1;
    c.shadowBlur = 0;
    this.particles = this.particles.filter((p) => p.life > 0);
    this.frame =
      this.particles.length || this.pulse > 0
        ? requestAnimationFrame(this.loop)
        : 0;
  }
  destroy() {
    cancelAnimationFrame(this.frame);
    this.resize.disconnect();
  }
}
