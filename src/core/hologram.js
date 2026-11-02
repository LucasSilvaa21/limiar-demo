export const BLUE = '#8bcde7';
export const GOLD = '#e6bd80';
export const INK = '#abbcc7';

export class Hologram {
  constructor(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d');
    this.yaw = -.62; this.pitch = .2; this.zoom = 1; this.quality = 1.5;
    this.focus = null; this.flat = false; this.slow = 0;
  }
  resize() {
    const box = this.canvas.getBoundingClientRect();
    this.w = box.width; this.h = box.height;
    const dpr = Math.min(devicePixelRatio || 1, this.quality);
    if (this.canvas.width !== Math.round(this.w * dpr) || this.canvas.height !== Math.round(this.h * dpr)) {
      this.canvas.width = Math.max(1, Math.round(this.w * dpr)); this.canvas.height = Math.max(1, Math.round(this.h * dpr));
    }
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  begin(time = 0, flat = false, focus = null) {
    this.resize(); this.flat = flat; this.focus = focus;
    const c = this.ctx; c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    c.fillStyle = '#09131d'; c.fillRect(0, 0, this.w, this.h);
    const glow = c.createRadialGradient(this.w * .53, this.h * .53, 0, this.w * .53, this.h * .53, this.w * .65);
    glow.addColorStop(0, '#14394b70'); glow.addColorStop(.65, '#0c253440'); glow.addColorStop(1, '#09131d00'); c.fillStyle = glow; c.fillRect(0, 0, this.w, this.h);
    for (let i = 0; i < (this.quality > 1 ? 90 : 45); i++) {
      const x = ((i * 137.3 + Math.sin(i) * 53) % this.w + this.w) % this.w;
      const y = ((i * 93.7 + Math.cos(i) * 37 - time * (i % 3 + 1) * .7) % this.h + this.h) % this.h;
      c.fillStyle = i % 5 ? '#8bcde730' : '#e6bd8050'; c.fillRect(x, y, 1, 1);
    }
    this.time = time;
  }
  project([x, y, z = 0]) {
    const yaw = this.flat ? 0 : this.yaw; const pitch = this.flat ? 0 : this.pitch;
    const side = Math.cos(yaw) * x + Math.sin(yaw) * z;
    const depth = -Math.sin(yaw) * x + Math.cos(yaw) * z;
    const up = Math.cos(pitch) * y - Math.sin(pitch) * depth;
    const far = Math.sin(pitch) * y + Math.cos(pitch) * depth;
    const scale = Math.min(this.w / 8.5, this.h / 5.2) * this.zoom * (this.flat ? 1 : 8 / (8 - far));
    return [this.w * .5 + side * scale, this.h * .48 - up * scale];
  }
  path(points, color = BLUE, width = 1, glow = false, dashed = false) {
    this.screenPath(points.map(point => this.project(point)), color, width, glow, dashed);
  }
  screenPath(points, color = BLUE, width = 1, glow = false, dashed = false) {
    const c = this.ctx; c.strokeStyle = color; c.lineWidth = width; c.setLineDash(dashed ? [4, 7] : []);
    if (glow) { c.shadowColor = color; c.shadowBlur = 14; }
    c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke(); c.shadowBlur = 0; c.setLineDash([]);
  }
  text(text, x, y, color = INK, size = 14, align = 'center') {
    const c = this.ctx; c.font = `${size}px "Source Sans 3"`; c.fillStyle = color; c.textAlign = align; c.fillText(text, x, y);
  }
  label(text, point, color = INK, offset = 20) { const [x, y] = this.project(point); this.text(text, x, y + offset, color); }
  dot(point, color = GOLD, radius = 2) {
    const [x, y] = this.project(point); const c = this.ctx;
    c.fillStyle = color; c.shadowColor = color; c.shadowBlur = radius > 2 ? 15 : 3;
    c.beginPath(); c.arc(x, y, radius, 0, Math.PI * 2); c.fill(); c.shadowBlur = 0;
  }
  ring(point, radius, color = BLUE, plane = 'xy', glow = false) {
    const p = Array.from({ length: 65 }, (_, i) => {
      const t = i / 64 * Math.PI * 2; const a = Math.cos(t) * radius; const b = Math.sin(t) * radius;
      return plane === 'yz' ? [point[0], point[1] + a, point[2] + b] : plane === 'xz' ? [point[0] + a, point[1], point[2] + b] : [point[0] + a, point[1] + b, point[2]];
    }); this.path(p, color, 1, glow);
  }
  sphere(point, radius = .5, color = BLUE) {
    for (const plane of ['xy', 'xz', 'yz']) this.ring(point, radius, color, plane, this.focus === 'state');
    for (const offset of [-.5, .5]) this.ring([point[0], point[1] + offset * radius, point[2]], radius * .866, `${color}50`, 'xz');
  }
  plane(x, height = 2.5, depth = 2.1, color = BLUE) {
    const points = [[x, -height / 2, -depth / 2], [x, height / 2, -depth / 2], [x, height / 2, depth / 2], [x, -height / 2, depth / 2], [x, -height / 2, -depth / 2]];
    this.path(points, color, this.focus === 'screen' ? 2 : 1, true);
  }
  beam(a, b, color = BLUE) {
    this.path([a, b], `${color}18`, 15, true); this.path([a, b], `${color}60`, 1, true);
  }
  floor() {
    for (let i = -3; i <= 3; i++) this.path([[i, -1.5, -1.8], [i, -1.5, 1.8]], '#8bcde718');
    for (let i = -3; i <= 3; i++) this.path([[-3.6, -1.5, i * .5], [3.6, -1.5, i * .5]], '#8bcde718');
  }
  barChart(values, labels, x, y, width, height, color = BLUE) {
    values.forEach((p, i) => {
      const slot = width / values.length; const bar = Math.min(slot * .5, 58);
      this.ctx.fillStyle = `${color}45`; this.ctx.fillRect(x + i * slot + (slot - bar) / 2, y + height * (1 - p), bar, height * p);
      this.text(`${Math.round(p * 100)}%`, x + (i + .5) * slot, y + height * (1 - p) - 12, color, 17);
      this.text(labels[i], x + (i + .5) * slot, y + height + 25, INK, 15);
    });
    this.screenPath([[x, y + height], [x + width, y + height]], '#8bcde750');
  }
  pulse(point, age) {
    const alpha = Math.max(0, 1 - age / 1.2);
    this.ctx.globalAlpha = alpha; this.ring(point, .12 + age * .7, GOLD, 'yz', true); this.dot(point, GOLD, 3); this.ctx.globalAlpha = 1;
  }
  pulseFrame(age) {
    this.ctx.globalAlpha = Math.max(0, 1 - age / 1.2) * .6;
    this.screenPath([[8, 8], [this.w - 8, 8], [this.w - 8, this.h - 8], [8, this.h - 8], [8, 8]], GOLD, 1, true);
    this.ctx.globalAlpha = 1;
  }
}
