import { qubit, bellCorrelation } from './quantum.js';
import { density, DEFAULT_STATE } from './physics.js';
import { rotatePoint, probabilities, phaseCurve, correlationCurve, densityMatrix } from './representations.js';
import { pairDensityMatrix } from './experiments.js';

const mint = '#9ed8cc';
const amber = '#e0bd86';
const muted = '#aebdbc';

export class DiagramRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.rotation = [-.6, .35];
    this.zoom = 1;
    this.image = document.createElement('canvas');
    this.image.width = 160; this.image.height = 160;
    this.lastPattern = '';
  }

  line(points, color = muted, width = 1, dash = []) {
    const ctx = this.ctx;
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.setLineDash(dash);
    ctx.beginPath(); points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); ctx.setLineDash([]);
  }

  text(text, x, y, color = muted, size = 14, align = 'center') {
    const ctx = this.ctx;
    ctx.fillStyle = color; ctx.font = `${size}px "Source Sans 3"`; ctx.textAlign = align; ctx.fillText(text, x, y);
  }

  dot(x, y, radius, color) {
    const ctx = this.ctx;
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
  }

  arrow(from, to, color = mint, width = 2) {
    this.line([from, to], color, width);
    const a = Math.atan2(to[1] - from[1], to[0] - from[0]);
    this.line([[to[0] - Math.cos(a - .4) * 10, to[1] - Math.sin(a - .4) * 10], to, [to[0] - Math.cos(a + .4) * 10, to[1] - Math.sin(a + .4) * 10]], color, width);
  }

  draw(state, settings) {
    const { width, height } = this.canvas.getBoundingClientRect();
    if (!width || !height) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    if (this.canvas.width !== Math.round(width * dpr) || this.canvas.height !== Math.round(height * dpr)) {
      this.canvas.width = Math.round(width * dpr); this.canvas.height = Math.round(height * dpr);
    }
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.clearRect(0, 0, width, height);
    this.w = width; this.h = height;
    if (settings.view === 'light') return;
    if (settings.view === 'bloch') this.bloch(state, settings);
    else if (settings.view === 'interference') this.interference(state, settings);
    else if (settings.view === 'correlation') this.correlation(state, settings);
    else if (settings.view === 'history') this.history(state, settings);
    else if (settings.view === 'matrix') this.matrix(state, settings);
    else if (settings.view === 'apparatus') this.apparatus(state, settings);
    else this.histogram(state, settings);
  }

  bloch(state, { layers, detail, compare }) {
    const r = Math.min(this.w * .31, (this.h - 140) * .46) * this.zoom;
    const cx = this.w / 2; const cy = this.h * .62;
    const project = point => {
      const [x, y] = rotatePoint(point, ...this.rotation);
      return [cx + x * r, cy - y * r];
    };
    const origin = project([0, 0, 0]);
    const circle = (axis, offset = 0) => Array.from({ length: 101 }, (_, i) => {
      const t = i / 100 * Math.PI * 2;
      const radius = Math.sqrt(1 - offset * offset);
      return project(axis === 0 ? [offset, Math.cos(t) * radius, Math.sin(t) * radius] : axis === 1 ? [Math.cos(t) * radius, offset, Math.sin(t) * radius] : [Math.cos(t) * radius, Math.sin(t) * radius, offset]);
    });
    const gradient = this.ctx.createRadialGradient(cx - r * .35, cy - r * .4, 0, cx, cy, r);
    gradient.addColorStop(0, '#9ed8cc10'); gradient.addColorStop(1, '#9ed8cc02');
    this.ctx.fillStyle = gradient; this.ctx.beginPath(); this.ctx.arc(cx, cy, r, 0, 2 * Math.PI); this.ctx.fill();
    this.ctx.strokeStyle = '#9ed8cc65'; this.ctx.lineWidth = 1;
    this.ctx.beginPath(); this.ctx.arc(cx, cy, r, 0, 2 * Math.PI); this.ctx.stroke();
    if (layers.grid) {
      for (const axis of [0, 1, 2]) this.line(circle(axis), '#9ed8cc30');
      for (const offset of [-.5, .5]) this.line(circle(2, offset), '#9ed8cc18');
    }
    if (layers.axes) {
      for (const [axis, label] of [[[1.2, 0, 0], 'X'], [[0, 1.2, 0], 'Y'], [[0, 0, 1.2], 'Z']]) {
        this.line([project(axis.map(v => -v)), project(axis)], '#adbdba65', 1, [3, 5]);
        if (detail !== 'essential') { const p = project(axis); this.text(label, p[0], p[1] - 8); }
      }
    }
    const rho = qubit(compare ? { ...state, coherence: 1 } : state);
    const tip = project([rho.x, rho.y, rho.z]);
    if (layers.projections) {
      const z = project([0, 0, rho.z]);
      this.line([origin, z, tip], '#e0bd8680', 1, [4, 5]);
    }
    if (layers.vector) { this.arrow(origin, tip, mint, 2.5); this.dot(...tip, 4, mint); }
    if (compare && layers.vector) {
      const mixture = project([0, 0, rho.z]);
      this.arrow(origin, mixture, amber, 2); this.dot(...mixture, 4, amber);
    }
    this.dot(...origin, 3, '#e7e5dc');
    if (detail !== 'essential') {
      for (const [point, label] of [[[0, 0, 1], '0'], [[0, 0, -1], '1']]) {
        const p = project(point); this.text(label, p[0] + 15, p[1] + 5, amber, 16);
      }
    }
  }

  axes(left, top, width, height, settings, max = 1, min = 0) {
    if (settings.layers.grid && settings.detail !== 'essential') {
      for (let i = 0; i <= 4; i++) {
        const y = top + height * i / 4;
        this.line([[left, y], [left + width, y]], '#9ed8cc18');
        this.text((min + (max - min) * (1 - i / 4)).toLocaleString('pt-BR'), left - 10, y + 4, muted, 13, 'right');
      }
    }
    if (settings.layers.axes) this.line([[left, top], [left, top + height], [left + width, top + height]], '#718b8380');
  }

  interference(state, settings) {
    if (settings.pattern === '2d') { this.pattern(state, settings); return; }
    const left = 52; const width = this.w - 85;
    const top = Math.max(170, this.h * .46); const height = Math.max(75, this.h - top - 93);
    this.phasors(state, settings, this.w / 2, Math.min(top - 30, 165));
    this.axes(left, top, width, height, settings);
    const values = phaseCurve(settings.compare ? { ...state, coherence: 1 } : state);
    this.line(values.map((v, i) => [left + i / 180 * width, top + (1 - v) * height]), mint, 2);
    if (settings.compare) {
      const mixture = phaseCurve({ ...state, coherence: 0 });
      this.line(mixture.map((v, i) => [left + i / 180 * width, top + (1 - v) * height]), amber, 1.5, [5, 5]);
    }
    const x = left + state.phase / (Math.PI * 2) * width;
    const value = probabilities(settings.compare ? { ...state, coherence: 1 } : state, 'x')[0];
    this.line([[x, top], [x, top + height]], '#e0bd8680', 1, [3, 4]);
    this.dot(x, top + (1 - value) * height, 4, amber);
    this.text('0°', left, top + height + 23); this.text('180°', left + width / 2, top + height + 23); this.text('360°', left + width, top + height + 23);
    this.text('Chance de + na medição recombinada · fase', left + width / 2, top + height + 48, muted, 14);
  }

  phasors(state, { layers, detail }, x, y) {
    if (!layers.vector) return;
    const r = 30;
    const first = Math.sqrt(1 - state.balance); const second = Math.sqrt(state.balance);
    if (layers.grid) {
      this.ctx.strokeStyle = '#9ed8cc25'; this.ctx.beginPath(); this.ctx.arc(x, y, r, 0, 2 * Math.PI); this.ctx.stroke();
    }
    this.arrow([x, y], [x + r * first, y], mint);
    this.arrow([x, y], [x + Math.cos(state.phase) * r * second, y - Math.sin(state.phase) * r * second], amber);
    if (detail !== 'essential') this.text('Amplitudes e fase relativa', x, y - 43, muted, 14);
  }

  pattern(state, settings) {
    const key = `${state.balance}/${state.phase}/${state.coherence}`;
    if (key !== this.lastPattern) {
      const ctx = this.image.getContext('2d'); const pixels = ctx.createImageData(160, 160);
      const model = { ...DEFAULT_STATE, ...state };
      for (let y = 0; y < 160; y++) for (let x = 0; x < 160; x++) {
        const value = Math.min(1, density((x / 159 - .5) * 6, (y / 159 - .5) * 6, model) * 4);
        const i = (y * 160 + x) * 4;
        pixels.data[i] = 140 * value; pixels.data[i + 1] = 220 * value; pixels.data[i + 2] = 205 * value; pixels.data[i + 3] = 255;
      }
      ctx.putImageData(pixels, 0, 0); this.lastPattern = key;
    }
    const size = Math.min(this.w - 70, this.h - 210);
    const x = (this.w - size) / 2; const y = 145 + (this.h - 210 - size) / 2;
    this.ctx.drawImage(this.image, x, y, size, size);
    this.text('Dois pacotes de onda · representação espacial ilustrativa', this.w / 2, this.h - 65, muted, this.w < 450 ? 13 : 14);
    if (settings.detail !== 'essential' && settings.layers.axes) {
      this.line([[x, y], [x, y + size], [x + size, y + size]], '#718b8370');
      this.text('x', x + size + 15, y + size); this.text('y', x - 15, y + 8);
    }
  }

  histogram(state, settings) {
    const values = probabilities(state, settings.basis);
    const labels = state.chapter === 3 ? ['++', '+−', '−+', '−−'] : settings.basis === 'z' ? ['0', '1'] : ['+', '−'];
    const left = 52; const width = this.w - 85; const top = Math.max(160, this.h * .35); const height = this.h - top - 95;
    this.axes(left, top, width, height, settings);
    const group = width / values.length;
    values.forEach((p, i) => {
      const cx = left + group * (i + .5); const bw = Math.min(50, group * .27);
      const observed = state.total ? state.counts[i] / state.total : 0;
      this.ctx.fillStyle = '#9ed8cc65'; this.ctx.fillRect(cx - bw - 2, top + (1 - p) * height, bw, p * height);
      this.ctx.fillStyle = amber; this.ctx.fillRect(cx + 2, top + (1 - observed) * height, bw, observed * height);
      this.text(labels[i], cx, top + height + 25, '#eeeae1', 18);
      if (settings.detail !== 'essential') this.text(`${state.counts[i] || 0} registros`, cx, top + height + 47, muted, 14);
    });
    this.text('Verde: previsão · dourado: frequência observada', this.w / 2, top - 22, muted, 14);
  }

  correlation(state, settings) {
    const left = 52; const width = this.w - 85; const top = Math.max(165, this.h * .35); const height = this.h - top - 100;
    this.axes(left, top, width, height, settings, 1, -1);
    const plot = (values, color, dash = []) => this.line(values.map((v, i) => [left + i / 180 * width, top + (1 - v) / 2 * height]), color, 2, dash);
    plot(correlationCurve(settings.compare ? { ...state, classical: false } : state), mint);
    if (settings.compare) plot(correlationCurve({ ...state, classical: true }), amber, [5, 5]);
    this.line([[left, top + height / 2], [left + width, top + height / 2]], '#718b8380');
    const x = left + state.angleB / 180 * width;
    this.line([[x, top], [x, top + height]], '#e0bd8680', 1, [3, 4]);
    this.dot(x, top + (1 - bellCorrelation(state.angleA, state.angleB, settings.compare ? false : state.classical)) / 2 * height, 4, mint);
    if (settings.compare) this.dot(x, top + (1 - bellCorrelation(state.angleA, state.angleB, true)) / 2 * height, 4, amber);
    this.text('0°', left, top + height + 24); this.text('90°', left + width / 2, top + height + 24); this.text('180°', left + width, top + height + 24);
    this.text('Correlação do par · ângulo do analisador B', this.w / 2, top + height + 51, muted, 14);
  }

  history(state, settings) {
    const left = 52; const width = this.w - 85; const top = Math.max(165, this.h * .35); const height = this.h - top - 100;
    this.axes(left, top, width, height, settings);
    const values = state.elapsed > 0 ? [...state.history, [state.elapsed, state.coherence]] : [[0, state.coherence], [.1, state.coherence]];
    const start = values[0][0]; const duration = Math.max(.1, values.at(-1)[0] - start);
    this.line(values.map(([t, c]) => [left + (t - start) / duration * width, top + (1 - c) * height]), mint, 2);
    for (const event of (state.events || []).slice(-6)) {
      if (event.time < start) continue;
      const x = left + (event.time - start) / duration * width;
      const y = top + (1 - event.coherence) * height;
      this.line([[x, y], [x, top + height]], '#e0bd8640', 1, [3, 5]);
      this.dot(x, y, 3, amber);
    }
    this.text(`${start.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} s`, left, top + height + 25);
    this.text(`${(start + duration).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} s`, left + width, top + height + 25);
    this.text('Coerência restante · tempo da simulação', this.w / 2, top + height + 52, muted, 14);
    this.text(`${Math.round(state.coherence * 100)}%`, this.w / 2, top - 21, mint, 24);
  }

  matrix(state) {
    const pair = state.chapter === 3;
    const labels = pair ? ['HH', 'HV', 'VH', 'VV'] : ['0', '1'];
    const n = labels.length;
    const entries = pair ? pairDensityMatrix(state.classical).flat().map(value => [value, 0]) : densityMatrix(state);
    const cell = Math.min((this.w - 100) / n, (this.h - 195) / n, 110);
    const left = (this.w - cell * n) / 2;
    const top = Math.max(145, (this.h - cell * n) / 2 + 20);
    entries.forEach(([real, imaginary], index) => {
      const row = Math.floor(index / n); const column = index % n;
      const x = left + column * cell; const y = top + row * cell;
      const diagonal = row === column;
      const magnitude = Math.hypot(real, imaginary);
      this.ctx.fillStyle = diagonal ? `rgba(224,189,134,${.04 + magnitude * .25})` : `rgba(158,216,204,${.04 + magnitude * .35})`;
      this.ctx.fillRect(x + 3, y + 3, cell - 6, cell - 6);
      this.ctx.strokeStyle = diagonal ? '#e0bd8640' : '#9ed8cc40';
      this.ctx.strokeRect(x + 3, y + 3, cell - 6, cell - 6);
      const realLabel = real.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
      this.text(realLabel, x + cell / 2, y + cell / 2 + (Math.abs(imaginary) > .005 ? -3 : 5), diagonal ? amber : mint, pair ? 14 : 18);
      if (Math.abs(imaginary) > .005) this.text(`${imaginary < 0 ? '−' : '+'}${Math.abs(imaginary).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}i`, x + cell / 2, y + cell / 2 + 19, mint, 13);
    });
    for (let i = 0; i < n; i++) {
      this.text(labels[i], left + (i + .5) * cell, top - 12, muted, 14);
      this.text(labels[i], left - (pair ? 23 : 15), top + (i + .5) * cell + 5, muted, 14);
    }
    this.text('Dourado: populações · verde: interferência', this.w / 2, top + cell * n + 26, muted, this.w < 450 ? 13 : 14);
  }

  apparatus(state, { layers }) {
    const center = this.w / 2; const y = Math.max(215, this.h * .62);
    const side = this.w * .27; const radius = Math.min(33, this.w * .075);
    this.ctx.strokeStyle = '#e0bd86aa'; this.ctx.lineWidth = 1.5;
    this.ctx.beginPath(); this.ctx.arc(center, y, 17, 0, Math.PI * 2); this.ctx.stroke();
    this.text(state.classical ? 'M' : 'Φ+', center, y + 5, amber, 15);
    this.text(state.classical ? 'Mistura HH/VV' : 'Par entrelaçado', center, y + 45, muted, 14);
    for (const [index, x, angle] of [[0, center - side, state.angleA], [1, center + side, state.angleB]]) {
      const sign = index ? 1 : -1;
      const detector = x + sign * this.w * .15;
      const last = state.last && (index ? state.last.b : state.last.a);
      if (layers.trajectories) this.arrow([center + sign * 21, y], [x - sign * (radius + 6), y], '#9ed8cc80', 1);
      this.ctx.strokeStyle = mint; this.ctx.lineWidth = 1;
      this.ctx.beginPath(); this.ctx.arc(x, y, radius, 0, 2 * Math.PI); this.ctx.stroke();
      if (layers.axes) {
        const a = angle * Math.PI / 180;
        this.line([[x - Math.sin(a) * radius, y - Math.cos(a) * radius], [x + Math.sin(a) * radius, y + Math.cos(a) * radius]], mint, 2);
      }
      this.text(index ? 'B' : 'A', x, y - radius - 13, mint, 18);
      this.text(`${angle.toLocaleString('pt-BR')}°`, x, y + radius + 24, muted, 14);
      for (const outcome of [1, -1]) {
        const dy = y - outcome * 45;
        if (layers.trajectories) this.line([[x + sign * (radius + 4), y], [detector, dy]], last === outcome ? amber : '#9ed8cc30', last === outcome ? 2 : 1);
        this.dot(detector, dy, last === outcome ? 5 : 3, last === outcome ? amber : '#718b83');
        this.text(outcome > 0 ? '+' : '−', detector, dy - 12, muted, 16);
      }
    }
  }
}
