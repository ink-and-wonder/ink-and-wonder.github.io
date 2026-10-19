import { SIGILS } from "./vocabulary.js?v=3.3.0";
export function spellArt(result) {
 const shapes={
  water:'<path d="M100 20C85 57 47 92 47 126a53 53 0 0 0 106 0c0-34-38-69-53-106Z"/><path class="spell-highlight" d="M70 126q-2 28 25 32"/>',
  fire:'<path d="M101 15c17 46-23 48-5 85 10-6 19-22 20-36 35 40 51 65 31 94-25 37-89 24-96-16-6-34 25-57 24-82 10 15 13 22 13 34 18-26 7-47 13-79Z"/>',
  wind:'<g fill="none"><path d="M25 75h111c43 0 39-55 7-50-22 3-23 28-7 30M15 105h149M35 132h89c40 0 37 48 7 48-20 0-23-23-9-28"/></g>',
  earth:'<path d="m38 120 23-62 65-15 39 68-18 52-78 5Z"/><path class="spell-highlight" d="m61 58 38 47 66 6m-66-6-30 63m30-63 27-62"/>',
  light:'<path d="m100 22 17 59 61 19-61 18-17 60-18-60-60-18 60-19Z"/><g class="spell-highlight"><path d="m36 36 15 15m98 98 15 15M164 36l-15 15M51 149l-15 15"/></g>'
 };
 const keys=[...new Set((result.symbols||[]).filter(s=>s.kind==='sigil').map(s=>s.key))];
 if(!keys.length)keys.push(result.element);
 return keys.slice(0,3).map(key=>{
  const glyph=SIGILS[key],paths=glyph?.paths||[];
  const shape=shapes[key]||paths.map(path=>`<path fill="none" d="${path.map((p,i)=>(i?'L':'M')+(100+p.x*135)+' '+(100+p.y*135)).join(' ')}"/>`).join('')||'<circle cx="100" cy="100" r="55"/>';
  return `<svg class="spell-form form-${key}" viewBox="0 0 200 200" style="--form-color:${glyph?.color||'#d2bf76'}" aria-hidden="true">${shape}</svg>`;
 }).join('');
}
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
    this.forms=(result.symbols||[]).filter(s=>s.kind==='sigil'&&SIGILS[s.key]?.effect==='sculpture').slice(0,3).map(s=>SIGILS[s.key]);
    const intentions=new Set((result.effects||[]).map(e=>e.effect));
    this.intentions=intentions;
    const palette=(result.symbols||[]).filter(s=>s.kind==='sigil').map(s=>SIGILS[s.key]?.color).filter(Boolean);
    const colors = {
        light: "#c99a28",
        water: "#2689ab",
        wind: "#548769",
        fire: "#d86b32",
        earth: "#92703b",
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
        vx: (Math.random() - 0.5) * 0.0015 + (result.direction?.x || 0) * 0.002 * result.power,
        vy: -0.0005 - Math.random() * 0.0015 + (result.direction?.y || 0) * 0.001 * result.power,
        life: 1,
        age: 0,
        size: 1 + Math.random() * 3,
        color: colors[result.element] || (palette.length?palette[i%palette.length]:"#7b6698"),
        kind: result.element,
        modifier: result.components?.length ? result.components[i % result.components.length].modifier : result.modifier,
        orbit: intentions.has('rotation')||intentions.has('orb')||intentions.has('envelopment'),
        converge: intentions.has('convergence')||intentions.has('collection')||intentions.has('attraction'),
        fall: intentions.has('rain')||intentions.has('water'),
        burst: intentions.has('burst')||intentions.has('projectile')||intentions.has('dispersion'),
        still: intentions.has('anchor')||intentions.has('stability'),
      });
    this.color = (colors[result.element] || SIGILS[result.element]?.color || "#c8d8c0");
    this.pulse = 1;
    if (!this.frame) {
      this.time = 0;
      this.frame = requestAnimationFrame(this.loop);
    }
  }
  ink(point) {
    if(this.reduced)return;
    if(this.particles.length>160)return;
    this.particles.push({x:point.x/600,y:point.y/600,vx:(Math.random()-.5)*.00012,vy:-.00008,life:1,age:0,size:1.5,color:'#aa8136',kind:'ink',duration:650});
    if(!this.frame){this.time=0;this.frame=requestAnimationFrame(this.loop);}
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
      // Decorative sigils manifest their studied silhouette; this is a game visualization.
      for(const [i,form] of (this.forms||[]).entries()){
        c.save();c.globalAlpha=Math.max(0,this.pulse)*.8;c.strokeStyle=form.color;c.lineWidth=2;
        c.translate(w*(.5+(i-(this.forms.length-1)/2)*.25),h*.5);
        c.scale(w*.28,w*.28);c.lineWidth=2/(w*.28);
        for(const path of form.paths){if(!path.length)continue;c.beginPath();c.moveTo(path[0].x,path[0].y);for(const p of path.slice(1))c.lineTo(p.x,p.y);c.stroke();}c.restore();
      }
    }
    for (const p of this.particles) {
      p.age += dt;
      p.life = 1 - p.age / (p.duration||4200);
      if(p.still){p.vx*=.94;p.vy*=.94;}
      if(p.converge){p.vx+=(.5-p.x)*dt*.000008;p.vy+=(.5-p.y)*dt*.000008;}
      if(p.orbit){const a=p.age*.001+p.size,r=.12+p.size*.018;p.x=.5+Math.cos(a)*r;p.y=.5+Math.sin(a)*r;}
      else {p.x += p.vx * dt*(p.burst?2:1);p.y += p.vy * dt*(p.burst?2:1);}
      if (p.modifier === "spread") p.x += p.vx * dt;
      if (p.kind === "water" || p.fall) p.vy += dt * 0.000001;
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
