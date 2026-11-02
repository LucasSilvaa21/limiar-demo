const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const radians = degrees => degrees * Math.PI / 180;

// Base fixa {|0>, |1>}. coherence é o fator que multiplica as entradas fora da diagonal.
export function qubit({ balance = .5, phase = 0, coherence = 1 } = {}) {
  const p = clamp(balance);
  const amplitude = clamp(coherence) * Math.sqrt(p * (1 - p));
  const real = amplitude * Math.cos(phase);
  const imaginary = -amplitude * Math.sin(phase);
  return {
    zero: 1 - p, one: p, real, imaginary,
    x: 2 * real, y: -2 * imaginary, z: 1 - 2 * p,
    l1: 2 * amplitude,
    purity: (1 - p) ** 2 + p ** 2 + 2 * amplitude ** 2
  };
}

export function probabilityPlus(state, basis = 'z') {
  const rho = qubit(state);
  return clamp((1 + (basis === 'x' ? rho.x : basis === 'y' ? rho.y : rho.z)) / 2);
}

export function measureQubit(state, basis = 'z', random = Math.random) {
  return random() < probabilityPlus(state, basis) ? 1 : -1;
}

export function dephase(coherence, rate, seconds) {
  return clamp(coherence) * Math.exp(-Math.max(0, rate) * Math.max(0, seconds));
}

// Polarizadores lineares. Φ+ e a mistura 50% HH, 50% VV têm marginais iguais.
export function bellCorrelation(angleA, angleB, classical = false) {
  const a = 2 * radians(angleA);
  const b = 2 * radians(angleB);
  return classical ? Math.cos(a) * Math.cos(b) : Math.cos(a - b);
}

export function bellProbabilities(angleA, angleB, classical = false) {
  const correlation = clamp(bellCorrelation(angleA, angleB, classical), -1, 1);
  return [(1 + correlation) / 4, (1 - correlation) / 4, (1 - correlation) / 4, (1 + correlation) / 4];
}

export function measurePair(angleA, angleB, classical = false, random = Math.random) {
  const probabilities = bellProbabilities(angleA, angleB, classical);
  const draw = random();
  let cumulative = 0;
  const outcomes = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  for (let i = 0; i < 4; i++) {
    cumulative += probabilities[i];
    if (draw < cumulative || i === 3) return { a: outcomes[i][0], b: outcomes[i][1], bin: i };
  }
}

export const BELL_SETTINGS = Object.freeze([[0, 22.5], [0, -22.5], [45, 22.5], [45, -22.5]]);

export function chsh(classical = false) {
  const terms = BELL_SETTINGS.map(([a, b]) => bellCorrelation(a, b, classical));
  return Math.abs(terms[0] + terms[1] + terms[2] - terms[3]);
}
