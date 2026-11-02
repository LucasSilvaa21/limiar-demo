import { probabilityPlus, measureQubit, dephase, bellProbabilities, measurePair, chsh } from '../quantum.js';

export function lightState(step = 0, previous = null) {
  const carry = step === 6 && previous?.environment;
  return {
    step, balance: .5, phase: step === 4 ? Math.PI : step >= 5 ? previous?.phase ?? 0 : 0,
    coherence: step === 6 ? carry ? previous.coherence : .25 : 1,
    environment: step === 5, isolated: step === 6,
    elapsed: 0, displayTime: 0, counts: [0, 0], total: 0, last: null, records: []
  };
}

export function lightPrediction(state) {
  const a = probabilityPlus(state, 'x');
  return { a, b: 1 - a, directA: probabilityPlus(state, 'z'), coherence: state.coherence };
}

export function advanceLight(state, seconds) {
  const dt = Math.max(0, seconds);
  state.elapsed += dt;
  if (state.environment && !state.isolated) state.coherence = dephase(state.coherence, .65, dt);
}

export function recordLight(state, count = 1, random = Math.random) {
  for (let i = 0; i < count; i++) {
    const result = measureQubit(state, 'x', random) > 0 ? 0 : 1;
    state.counts[result]++; state.total++; state.last = result;
    state.records.push({ result, time: state.elapsed, shownAt: state.displayTime, id: state.total });
  }
  return state.last;
}

export function changePhase(state) {
  state.phase = state.phase === 0 ? Math.PI : 0;
  state.counts = [0, 0]; state.total = 0; state.last = null; state.records = [];
}

export function pairState(step = 0, classical = false) {
  return { step, angleA: step >= 2 ? 45 : 0, angleB: step === 3 ? 135 : step >= 2 ? 45 : 0, classical, counts: [0, 0, 0, 0], records: [], total: 0, last: null, elapsed: 0 };
}

export function pairPrediction(state) {
  const p = bellProbabilities(state.angleA, state.angleB, state.classical);
  return { probabilities: p, a: p[0] + p[1], b: p[0] + p[2], same: p[0] + p[3], chsh: chsh(state.classical) };
}

export function recordPairs(state, count = 1, random = Math.random) {
  for (let i = 0; i < count; i++) {
    const pair = measurePair(state.angleA, state.angleB, state.classical, random);
    state.counts[pair.bin]++; state.total++; state.last = pair;
    state.records.push({ ...pair, time: state.elapsed, id: state.total });
  }
  return state.last;
}

export function resetPairSample(state) {
  state.counts = [0, 0, 0, 0]; state.total = 0; state.last = null; state.records = [];
}
