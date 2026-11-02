import { BLUE, GOLD, INK } from '../core/hologram.js';
export { BLUE, GOLD, INK };
export const pct = n => `${(n * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
export const number = n => (Math.abs(n) < .005 ? 0 : n).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
export const noopApi = { pulse() {}, notify() {} };
export function emit(api, point = [0, 0, 0]) { api?.pulse(point); }
export const button = (id, label, style) => ({ id, label, type: 'button', style });
export const range = (id, label, value, min, max, step = 1, unit = '') => ({ id, label, value, min, max, step, unit, type: 'range' });
export const choice = (id, label, value, options) => ({ id, label, value, options, type: 'select' });
export function status(label, value) { return { label, value }; }
export function samples(state, amount, measure, api, point) {
  for (let i = 0; i < amount; i++) {
    const result = measure(); state.counts[result > 0 ? 0 : 1]++; state.last = result;
  }
  emit(api, point); state.total = state.counts.reduce((a, b) => a + b, 0);
}
export function crystal(h, center = [0, 0, 0], size = .7, color = BLUE) {
  const p = [[-.7, -.35, -.3], [.35, -.5, -.45], [.65, .15, .1], [.2, .75, -.1], [-.45, .55, .35], [-.8, .1, .2]].map(v => v.map((n, i) => n * size + center[i]));
  h.path([...p, p[0]], color, 1.5, true);
  for (let i = 0; i < p.length; i++) h.path([p[i], p[(i + 2) % p.length]], `${color}55`);
  h.dot(center, color, 3);
}
export function outcomeBars(h, values, labels, observed = null) {
  const width = Math.min(340, h.w - 70); h.barChart(values, labels, (h.w - width) / 2, h.h * .44, width, Math.max(65, Math.min(135, h.h * .25)));
  if (observed) {
    const slot = width / values.length; const bar = Math.min(slot * .5, 58); const height = Math.max(65, Math.min(135, h.h * .25));
    h.ctx.strokeStyle = GOLD; h.ctx.lineWidth = 2;
    observed.forEach((p, i) => h.ctx.strokeRect((h.w - width) / 2 + i * slot + (slot - bar) / 2, h.h * .44 + height * (1 - p), bar, height * p));
  }
  h.text(observed ? 'Azul: previsão · dourado: amostra' : 'Azul: previsão do modelo', h.w / 2, h.h * .35, INK, h.w < 400 ? 13 : 15);
}
export const coherenceReference = { title: 'Baumgratz, Cramer e Plenio · Coerência', url: 'https://arxiv.org/abs/1311.0275' };
export const environmentReference = { title: 'Zurek · Decoerência', url: 'https://arxiv.org/abs/quant-ph/0105127' };
