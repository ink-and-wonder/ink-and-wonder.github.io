import { compositionPaths } from "./compiler.js?v=3.0.1";
import { distance, pagePaths } from "./engine.js?v=3.0.1";
export class DrawingDesk {
  constructor(canvas, { settings, onChange, onFinish }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.ink = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(1,1) :
      typeof document !== "undefined" ? document.createElement("canvas") : null;
    this.inkContext = this.ink?.getContext("2d");
    this.inkDirty = true;
    this.settings = settings;
    this.onChange = onChange;
    this.onFinish = onFinish;
    this.strokes = [];
    this.history = [];
    this.future = [];
    this.active = null;
    this.pointer = null;
    this.tool = "pen";
    this.guide = null;
    this.lastPen = -Infinity;
    this.frame = 0;
    this.abort = new AbortController();
    const opts = { signal: this.abort.signal };
    canvas.addEventListener("pointerdown", (e) => this.down(e), opts);
    canvas.addEventListener("pointermove", (e) => this.move(e), opts);
    canvas.addEventListener("pointerup", (e) => this.end(e), opts);
    canvas.addEventListener("pointercancel", (e) => this.end(e, true), opts);
    canvas.addEventListener("lostpointercapture", (e) => this.end(e), opts);
    canvas.addEventListener("contextmenu", (e) => e.preventDefault(), opts);
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(canvas);
    this.resize();
  }
  resize() {
    const width = this.canvas.clientWidth;
    if (!width) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(width * dpr);
    this.ctx.setTransform(
      this.canvas.width / 600,
      0,
      0,
      this.canvas.height / 600,
      0,
      0,
    );
    if (this.ink) {
      this.ink.width=this.canvas.width;this.ink.height=this.canvas.height;
      this.inkContext.setTransform(this.canvas.width/600,0,0,this.canvas.height/600,0,0);
      this.inkDirty=true;
    }
    this.paint();
  }
  setGuide(recipe) {
    this.guide = recipe
      ? recipe.structure || recipe.extraSigils ? compositionPaths(recipe) : pagePaths(recipe.element, recipe.modifier, recipe.signs)
      : null;
    this.requestPaint();
  }
  setTool(tool) {
    this.tool = tool;
    this.canvas.classList.toggle("erase-cursor", tool === "erase");
  }
  position(e) {
    const r = this.canvas.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(600, ((e.clientX - r.left) / r.width) * 600)),
      y: Math.max(0, Math.min(600, ((e.clientY - r.top) / r.height) * 600)),
      p: e.pointerType === "pen" ? Math.max(0.08, e.pressure) : 0.5,
    };
  }
  remember() {
    this.inkDirty=true;
    this.history.push(structuredClone(this.strokes));
    if (this.history.length > 35) this.history.shift();
    this.future = [];
  }
  down(e) {
    if (e.button > 0 && !(e.pointerType === "pen" && e.button === 5)) return;
    if (e.pointerType === "pen") {
      this.lastPen = performance.now();
      if (this.pointer !== null && this.pointerType === "touch") {
        this.strokes = this.history.pop() || this.strokes;
        this.active = null;
        this.canvas.releasePointerCapture?.(this.pointer);
        this.pointer = null;
      }
    }
    if (this.pointer !== null) return;
    if (
      (this.settings.penOnly && e.pointerType !== "pen") ||
      (e.pointerType === "touch" && performance.now() - this.lastPen < 1000)
    )
      return;
    if (this.strokes.length >= 1200) {
      this.onChange("The page is full. Save your seal or start a new page.");
      return;
    }
    e.preventDefault();
    this.pointer = e.pointerId;
    this.pointerType = e.pointerType;
    this.canvas.setPointerCapture(e.pointerId);
    this.remember();
    const p = this.position(e);
    if (this.tool === "erase" || (e.pointerType === "pen" && (e.button === 5 || (e.buttons & 32)))) {
      this.erasing = true;
      this.erase(p);
    } else {
      this.erasing = false;
      this.active = [p];
    }
    this.requestPaint();
    this.onChange(null, e.pointerType);
  }
  move(e) {
    if (e.pointerType === "pen") this.lastPen = performance.now();
    if (this.pointer !== e.pointerId) return;
    e.preventDefault();
    if (this.erasing) {
      this.erase(this.position(e));
      return;
    }
    const events = e.getCoalescedEvents?.();
    for (const event of events?.length ? events : [e]) {
      const p = this.position(event);
      if (
        this.active &&
        this.active.length < 5000 &&
        distance(p, this.active.at(-1)) > 0.25
      )
        this.active.push(p);
    }
    this.requestPaint();
  }
  erase(p) {
    this.inkDirty=true;
    this.strokes = this.strokes.filter(
      (stroke) =>
        !stroke.some((q, i) => {
          if (distance(q, p) < 15) return true;
          if (!i) return false;
          const a = stroke[i - 1],
            dx = q.x - a.x,
            dy = q.y - a.y,
            t = Math.max(
              0,
              Math.min(
                1,
                ((p.x - a.x) * dx + (p.y - a.y) * dy) /
                  (dx * dx + dy * dy || 1),
              ),
            );
          return Math.hypot(a.x + t * dx - p.x, a.y + t * dy - p.y) < 15;
        }),
    );
    this.requestPaint();
  }
  end(e, cancel = false) {
    this.inkDirty=true;
    if (this.pointer !== e.pointerId) return;
    // Pointer-up often contains a final sample absent from pointermove.
    if (!cancel && e.type === "pointerup" && this.active && this.active.length < 5000) {
      const tip = this.position(e);
      if (distance(tip, this.active.at(-1)) > 0.25) this.active.push(tip);
    }
    const finished = this.active;
    this.pointer = null;
    if (cancel) {
      this.strokes = this.history.pop() || this.strokes;
    } else if (this.active?.length) this.strokes.push(this.active);
    this.active = null;
    this.erasing = false;
    this.requestPaint();
    this.onChange();
    if (!cancel && finished) this.onFinish(finished);
  }
  undo() {
    this.inkDirty=true;
    if (!this.history.length) return;
    this.future.push(structuredClone(this.strokes));
    this.strokes = this.history.pop();
    this.active = null;
    this.requestPaint();
    this.onChange();
  }
  redo() {
    this.inkDirty=true;
    if (!this.future.length) return;
    this.history.push(structuredClone(this.strokes));
    this.strokes = this.future.pop();
    this.requestPaint();
    this.onChange();
  }
  clear() {
    this.inkDirty=true;
    if (this.active) return;
    this.remember();
    this.strokes = [];
    this.requestPaint();
    this.onChange();
  }
  load(strokes) {
    this.inkDirty=true;
    this.remember();
    this.strokes = structuredClone(strokes);
    this.active = null;
    this.requestPaint();
    this.onChange();
  }
  requestPaint() {
    if (!this.frame)
      this.frame = requestAnimationFrame(() => {
        this.frame = 0;
        this.paint();
      });
  }
  paint() {
    const c = this.ctx;
    c.clearRect(0, 0, 600, 600);
    if (this.guide) {
      c.strokeStyle = "#9d9b7e66";
      c.lineWidth = 1.6;
      c.setLineDash([3, 6]);
      for (const p of this.guide) {
        c.beginPath();
        p.forEach((q, i) => (i ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y)));
        c.stroke();
      }
      c.setLineDash([]);
      c.fillStyle = "#8f927b";
      c.font = "italic 12px Georgia";
      c.textAlign = "center";
      c.fillText(
        "Draw the heart · add the signs · close the ring last",
        300,
        559,
      );
    }
    if (this.inkContext) {
      if (this.inkDirty) {
        this.inkContext.clearRect(0,0,600,600);
        this.renderStrokes(this.inkContext,this.strokes);
        this.inkDirty=false;
      }
      c.drawImage(this.ink,0,0,600,600);
    } else this.renderStrokes(c,this.strokes);
    if (this.active) this.renderStrokes(c,[this.active]);
  }
  renderStrokes(c,strokes) {
    c.lineCap = "round";
    c.lineJoin = "round";
    c.strokeStyle = "#263b35";
    c.fillStyle = "#263b35";
    for (const p of strokes) {
      if (p.length === 1) {
        c.beginPath();
        c.arc(p[0].x, p[0].y, 1.4, 0, Math.PI * 2);
        c.fill();
      }
      // Midpoint quadratic joins keep corners responsive and curves continuous.
      // The stored samples stay untouched for recognition and undo.
      for (let i = 1; i < p.length; i++) {
        const before = p[i - 1], tip = p[i], next = p[i + 1];
        const start = i === 1 ? before : {x:(p[i-2].x+before.x)/2,y:(p[i-2].y+before.y)/2};
        const end = next ? {x:(before.x+tip.x)/2,y:(before.y+tip.y)/2} : tip;
        c.lineWidth = 1.25 + ((before.p ?? 0.5) * 0.5 + (tip.p ?? 0.5) * 0.5) * 2.6;
        c.beginPath();
        c.moveTo(start.x, start.y);
        c.quadraticCurveTo(before.x, before.y, end.x, end.y);
        c.stroke();
      }
    }
  }
  download() {
    const output = document.createElement("canvas");
    output.width = 1200;
    output.height = 1200;
    const c = output.getContext("2d");
    c.fillStyle = "#f4f0e2";
    c.fillRect(0, 0, 1200, 1200);
    c.scale(2, 2);
    this.renderStrokes(c,this.strokes);
    c.fillStyle = "#8a856c";
    c.font = "12px Georgia";
    c.textAlign = "center";
    c.fillText("INK & WONDER · MY SPELLBOOK", 300, 581);
    const a = document.createElement("a");
    a.href = output.toDataURL("image/png");
    a.download = "ink-and-wonder-seal.png";
    a.click();
  }
  destroy() {
    this.abort.abort();
    this.observer.disconnect();
    cancelAnimationFrame(this.frame);
  }
}
