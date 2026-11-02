import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rotatePoint, probabilities, densityMatrix, phaseCurve, correlationCurve } from '../src/representations.js';
import { qubit } from '../src/quantum.js';

test('rotações da cena preservam comprimentos e têm inversa', () => {
  const vector = [.3, -.7, .2];
  for (const yaw of [0, .8, Math.PI]) for (const pitch of [0, -.4, Math.PI / 2]) {
    const rotated = rotatePoint(vector, yaw, pitch);
    assert.ok(Math.abs(Math.hypot(...rotated) - Math.hypot(...vector)) < 1e-12);
    const inverse = rotatePoint(rotatePoint(rotated, 0, -pitch), -yaw, 0);
    inverse.forEach((value, i) => assert.ok(Math.abs(value - vector[i]) < 1e-12));
  }
});

test('a matriz exibida é hermitiana, normalizada e reproduz o vetor de Bloch', () => {
  for (const balance of [0, .2, .5, 1]) for (const coherence of [0, .4, 1]) {
    const state = { balance, coherence, phase: .8 };
    const [a, b, c, d] = densityMatrix(state);
    const rho = qubit(state);
    assert.equal(a[0] + d[0], 1);
    assert.equal(b[0], c[0]); assert.equal(b[1], -c[1]);
    assert.ok(a[0] * d[0] - b[0] ** 2 - b[1] ** 2 >= -1e-12);
    assert.equal(2 * b[0], rho.x); assert.equal(-2 * b[1], rho.y);
  }
});

test('distribuições exibidas são normalizadas nas três bases e nos pares', () => {
  for (const basis of ['x', 'y', 'z']) for (const balance of [0, .3, 1]) {
    const p = probabilities({ balance, phase: 1.7 }, basis);
    assert.equal(p.reduce((a, b) => a + b), 1);
    assert.ok(p.every(value => value >= 0 && value <= 1));
  }
  for (const classical of [false, true]) {
    const p = probabilities({ chapter: 3, angleA: 12, angleB: 71, classical });
    assert.ok(Math.abs(p.reduce((a, b) => a + b) - 1) < 1e-12);
  }
});

test('curvas têm limites conhecidos de fase, mistura e correlação', () => {
  const coherent = phaseCurve({ balance: .5, coherence: 1 });
  assert.equal(coherent[0], 1); assert.equal(coherent[90], 0); assert.equal(coherent[180], 1);
  assert.ok(phaseCurve({ balance: .5, coherence: 0 }).every(p => p === .5));
  const bell = correlationCurve({ angleA: 0, classical: false });
  assert.equal(bell[0], 1); assert.equal(bell[90], -1); assert.equal(bell[180], 1);
});
