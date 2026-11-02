import { test } from 'node:test';
import assert from 'node:assert/strict';
import { qubit, probabilityPlus, measureQubit, dephase, bellProbabilities, bellCorrelation, measurePair, chsh } from '../src/quantum.js';
import { seededRandom } from '../src/physics.js';

test('estados de um qubit têm traço unitário, positividade e pureza válida', () => {
  for (const balance of [0, .2, .5, .9, 1]) {
    for (const coherence of [0, .3, 1]) {
      const rho = qubit({ balance, coherence, phase: 1.2 });
      assert.equal(rho.zero + rho.one, 1);
      assert.ok(rho.zero * rho.one - rho.real ** 2 - rho.imaginary ** 2 > -1e-12);
      assert.ok(rho.purity >= .5 - 1e-12 && rho.purity <= 1 + 1e-12);
    }
  }
});

test('a fase muda a medição X e preserva as populações na base Z', () => {
  const plus = { balance: .5, coherence: 1, phase: 0 };
  const minus = { ...plus, phase: Math.PI };
  assert.equal(probabilityPlus(plus, 'z'), .5);
  assert.equal(probabilityPlus(minus, 'z'), .5);
  assert.equal(probabilityPlus(plus, 'x'), 1);
  assert.equal(probabilityPlus(minus, 'x'), 0);
  assert.equal(qubit(plus).l1, 1);
  assert.equal(qubit({ balance: 0 }).l1, 0);
});

test('desfasamento reduz coerência sem perda de população e não se desfaz ao isolar', () => {
  const initial = { balance: .3, phase: .7, coherence: 1 };
  const lost = dephase(1, .3, 5);
  const isolated = dephase(lost, 0, 100);
  assert.equal(lost, isolated);
  assert.equal(qubit({ ...initial, coherence: lost }).one, .3);
  assert.ok(qubit({ ...initial, coherence: lost }).l1 < qubit(initial).l1);
  assert.ok(Math.abs(dephase(dephase(1, .1, 3), .1, 7) - dephase(1, .1, 10)) < 1e-12);
});

test('mistura sem coerência mantém a medição X em 50% para qualquer fase', () => {
  for (const phase of [0, .3, Math.PI, 5.4]) assert.equal(probabilityPlus({ phase, balance: .5, coherence: 0 }, 'x'), .5);
});

test('a amostragem de qubits acompanha a regra de Born', () => {
  const random = seededRandom(826);
  let positives = 0;
  for (let i = 0; i < 20000; i++) positives += measureQubit({ balance: .25 }, 'z', random) === 1;
  assert.ok(Math.abs(positives / 20000 - .75) < .012);
});

test('as probabilidades de Bell são normalizadas e não permitem sinalização local', () => {
  for (const classical of [false, true]) {
    for (const a of [0, 18, 45, 90]) {
      for (const b of [0, 22.5, 45, 117]) {
        const p = bellProbabilities(a, b, classical);
        assert.ok(p.every(value => value >= 0 && value <= 1));
        assert.ok(Math.abs(p.reduce((x, y) => x + y) - 1) < 1e-12);
        assert.ok(Math.abs(p[0] + p[1] - .5) < 1e-12);
        assert.ok(Math.abs(p[0] + p[2] - .5) < 1e-12);
      }
    }
  }
});

test('pares quânticos e clássicos coincidem na base original e diferem a 45 graus', () => {
  assert.equal(bellCorrelation(0, 0), 1);
  assert.equal(bellCorrelation(0, 0, true), 1);
  assert.equal(bellCorrelation(45, 45), 1);
  assert.ok(Math.abs(bellCorrelation(45, 45, true)) < 1e-12);
  assert.ok(Math.abs(chsh() - 2 * Math.SQRT2) < 1e-12);
  assert.ok(chsh(true) <= 2);
});

test('medir vários pares reproduz a correlação esperada', () => {
  const random = seededRandom(310);
  let correlation = 0;
  let local = 0;
  for (let i = 0; i < 30000; i++) {
    const pair = measurePair(0, 22.5, false, random);
    correlation += pair.a * pair.b; local += pair.a;
  }
  assert.ok(Math.abs(correlation / 30000 - Math.SQRT1_2) < .018);
  assert.ok(Math.abs(local / 30000) < .018);
});
