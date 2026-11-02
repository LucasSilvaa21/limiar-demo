import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_STATE, density, createSampler, seededRandom } from '../src/physics.js';

function integral(state, extent = 6, resolution = 300) {
  const step = 2 * extent / resolution;
  let sum = 0;
  for (let x = 0; x < resolution; x++) {
    for (let y = 0; y < resolution; y++) sum += density(-extent + (x + .5) * step, -extent + (y + .5) * step, state) * step * step;
  }
  return sum;
}

test('a distribuição permanece normalizada ao mudar peso, fase e coerência', () => {
  for (const balance of [0, .2, .5, 1]) {
    for (const phase of [0, Math.PI]) {
      for (const coherence of [0, 1]) {
        const result = integral({ ...DEFAULT_STATE, balance, phase, coherence });
        assert.ok(Math.abs(result - 1) < .0001, `Integral: ${result}, peso: ${balance}, fase: ${phase}`);
      }
    }
  }
});

test('a fase produz cancelamento em um ponto de amplitudes iguais', () => {
  const y = Math.PI / DEFAULT_STATE.frequency;
  assert.ok(density(0, y, DEFAULT_STATE) < 1e-12);
  assert.ok(density(0, y, { ...DEFAULT_STATE, phase: Math.PI }) > .1);
});

test('sem coerência, a fase deixa de alterar a distribuição', () => {
  for (const [x, y] of [[0, 0], [.7, -.4], [-1.1, .3]]) {
    const a = density(x, y, { ...DEFAULT_STATE, coherence: 0, phase: 0 });
    const b = density(x, y, { ...DEFAULT_STATE, coherence: 0, phase: 1.7 });
    assert.equal(a, b);
    const mixture = .5 * density(x, y, { ...DEFAULT_STATE, balance: 0 }) + .5 * density(x, y, { ...DEFAULT_STATE, balance: 1 });
    assert.ok(Math.abs(a - mixture) < 1e-12);
  }
});

test('a amostragem reproduz o centro e a variância de um pacote isolado', () => {
  const sample = createSampler({ ...DEFAULT_STATE, balance: 1 }, 160, seededRandom(917));
  let x = 0; let y = 0; let squared = 0;
  const count = 30000;
  for (let i = 0; i < count; i++) {
    const point = sample(); x += point.x; y += point.y; squared += point.y ** 2;
    assert.ok(Number.isFinite(point.x) && Number.isFinite(point.y));
  }
  assert.ok(Math.abs(x / count - DEFAULT_STATE.separation / 2) < .02);
  assert.ok(Math.abs(y / count) < .02);
  assert.ok(Math.abs(squared / count - DEFAULT_STATE.sigma ** 2) < .02);
});
