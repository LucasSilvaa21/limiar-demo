import { dephase, qubit, probabilityPlus, bellProbabilities, bellCorrelation, BELL_SETTINGS, chsh, measurePair } from './quantum.js';

export function environmentReadout(state) {
  const rho = qubit(state);
  return { coherence: rho.l1, plus: probabilityPlus(state, 'x'), zero: rho.zero, one: rho.one, rate: state.isolated ? 0 : state.contact * .65 };
}

export function recordEnvironment(state, label) {
  const last = state.history.at(-1);
  if (last?.[0] === state.elapsed) last[1] = state.coherence;
  else state.history.push([state.elapsed, state.coherence]);
  if (state.history.length > 1800) state.history.shift();
  if (label) {
    state.events ??= [];
    state.events.push({ time: state.elapsed, coherence: state.coherence, label });
    if (state.events.length > 60) state.events.shift();
  }
}

export function advanceEnvironment(state, seconds, record = false) {
  const delta = Math.max(0, seconds);
  state.elapsed += delta;
  state.coherence = dephase(state.coherence, state.isolated ? 0 : state.contact * .65, delta);
  if (record || state.elapsed - state.history.at(-1)[0] >= .2) recordEnvironment(state);
}

export function pairReadout(state) {
  const p = bellProbabilities(state.angleA, state.angleB, state.classical);
  const [pp, pm, mp, mm] = state.counts;
  const total = pp + pm + mp + mm;
  return {
    same: p[0] + p[3], aPlus: p[0] + p[1], bPlus: p[0] + p[2],
    expected: bellCorrelation(state.angleA, state.angleB, state.classical), total,
    observed: total ? (pp + mm - pm - mp) / total : null,
    observedA: total ? (pp + pm) / total : null,
    observedB: total ? (pp + mp) / total : null
  };
}

export function pairDensityMatrix(classical = false) {
  return [[.5, 0, 0, classical ? 0 : .5], [0, 0, 0, 0], [0, 0, 0, 0], [classical ? 0 : .5, 0, 0, .5]];
}

export function emptyBellCounts() { return Array.from({ length: 4 }, () => [0, 0, 0, 0]); }

export function sampleBellBatch(bins, classical = false, perSetting = 100, random = Math.random) {
  return BELL_SETTINGS.map(([angleA, angleB], i) => {
    const counts = [...bins[i]];
    for (let n = 0; n < perSetting; n++) counts[measurePair(angleA, angleB, classical, random).bin]++;
    return counts;
  });
}

export function bellReport(bins, classical = false) {
  const rows = BELL_SETTINGS.map(([angleA, angleB], i) => ({ angleA, angleB, ...pairReadout({ angleA, angleB, classical, counts: bins[i] }) }));
  return {
    rows, expected: chsh(classical), total: rows.reduce((sum, row) => sum + row.total, 0),
    observed: rows.every(row => row.total) ? Math.abs(rows[0].observed + rows[1].observed + rows[2].observed - rows[3].observed) : null
  };
}
