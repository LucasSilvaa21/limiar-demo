import { probabilityPlus, bellCorrelation, qubit } from './quantum.js';

export function drawPlot(canvas, state) {
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  const baseline = height - 22;
  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = '#81909940'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(12, baseline); ctx.lineTo(width - 12, baseline); ctx.stroke();
  ctx.font = '15px sans-serif'; ctx.fillStyle = '#9aa9af';
  if (state.chapter === 0) {
    const values = [qubit(state).zero, qubit(state).one];
    values.forEach((p, i) => {
      const x = width * (.25 + i * .5);
      ctx.fillStyle = i ? '#d9bb91' : '#99c7dc';
      ctx.fillRect(x - 45, baseline - p * (height - 45), 90, p * (height - 45));
      ctx.fillStyle = '#aebbbf'; ctx.textAlign = 'center';
      ctx.fillText(`${i}: ${Math.round(p * 100)}%`, x, height - 2);
    });
    return;
  }
  let values;
  let marker;
  if (state.chapter === 1) {
    values = Array.from({ length: 240 }, (_, i) => probabilityPlus({ ...state, phase: i / 239 * Math.PI * 2 }, 'x'));
    marker = state.phase / (Math.PI * 2);
  } else if (state.chapter === 2) values = state.history.map(point => point[1]);
  else {
    values = Array.from({ length: 240 }, (_, i) => (1 + bellCorrelation(state.angleA, i / 239 * 180, state.classical)) / 2);
    marker = state.angleB / 180;
  }
  if (values.length < 2) values = [state.coherence, state.coherence];
  const line = new Path2D();
  values.forEach((value, i) => {
    const x = 12 + i / (values.length - 1) * (width - 24);
    const y = baseline - value * (height - 45);
    if (!i) line.moveTo(x, y); else line.lineTo(x, y);
  });
  ctx.strokeStyle = '#d9bb91'; ctx.lineWidth = 1.8; ctx.stroke(line);
  line.lineTo(width - 12, baseline); line.lineTo(12, baseline); line.closePath();
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#d9bb9130'); gradient.addColorStop(1, '#d9bb9100');
  ctx.fillStyle = gradient; ctx.fill(line);
  if (marker !== undefined) {
    const x = 12 + marker * (width - 24);
    ctx.strokeStyle = '#b6d0da80'; ctx.setLineDash([3, 5]);
    ctx.beginPath(); ctx.moveTo(x, 10); ctx.lineTo(x, baseline); ctx.stroke(); ctx.setLineDash([]);
  }
}
