export const TAU = Math.PI * 2;
export const EXTENT = 3.6;
export const DEFAULT_STATE = Object.freeze({ sigma: .7, separation: 1.35, frequency: 5.8, phase: 0, balance: .5, coherence: 1 });

export function density(x, y, state = DEFAULT_STATE) {
  const { sigma, separation, frequency, phase, balance, coherence } = state;
  const variance = sigma * sigma;
  const left = Math.exp(-((x + separation / 2) ** 2 + y * y) / (4 * variance));
  const right = Math.exp(-((x - separation / 2) ** 2 + y * y) / (4 * variance));
  const cross = 2 * Math.sqrt(balance * (1 - balance)) * coherence;
  const overlap = Math.exp(-(separation ** 2) / (8 * variance) - frequency ** 2 * variance / 2);
  const norm = 2 * Math.PI * variance * (1 + cross * overlap * Math.cos(phase));
  return Math.max(0, ((1 - balance) * left * left + balance * right * right + cross * left * right * Math.cos(frequency * y - phase)) / norm);
}

// Integração em células. A posição final recebe jitter dentro da célula sorteada.
export function createSampler(state, resolution = 160, random = Math.random) {
  const cumulative = new Float64Array(resolution * resolution);
  const step = 2 * EXTENT / resolution;
  let total = 0;
  for (let row = 0; row < resolution; row++) {
    for (let column = 0; column < resolution; column++) {
      total += density(-EXTENT + (column + .5) * step, -EXTENT + (row + .5) * step, state);
      cumulative[row * resolution + column] = total;
    }
  }
  return () => {
    const target = random() * total;
    let low = 0;
    let high = cumulative.length - 1;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (cumulative[middle] < target) low = middle + 1;
      else high = middle;
    }
    return { x: -EXTENT + ((low % resolution) + random()) * step, y: -EXTENT + (Math.floor(low / resolution) + random()) * step };
  };
}

export function seededRandom(seed = 8417) {
  let current = seed >>> 0;
  return () => {
    current = (Math.imul(current, 1664525) + 1013904223) >>> 0;
    return current / 4294967296;
  };
}
