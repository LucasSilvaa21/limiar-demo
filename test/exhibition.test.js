import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seededRandom } from '../src/physics.js';
import { lightState, lightPrediction, advanceLight, recordLight, changePhase, pairState, pairPrediction, recordPairs, resetPairSample } from '../src/exhibition/model.js';
import { lightStory, pairStory } from '../src/exhibition/story.js';

test('o roteiro reúne as ideias relacionadas em uma sequência com explicação antes da notação', () => {
  assert.equal(lightStory.length, 8);
  assert.equal(new Set(lightStory.map(s => s.id)).size, 8);
  for (const scene of lightStory) assert.ok(scene.title && scene.paragraphs.length === 2 && scene.term.length === 2 && scene.limit);
  assert.equal(pairStory.length, 4);
});

test('o mesmo aparelho mantém 50/50 nos caminhos e troca a saída recombinada pela fase', () => {
  const s = lightState(3);
  assert.deepEqual(lightPrediction(s), { a: 1, b: 0, directA: .5, coherence: 1 });
  recordLight(s, 40, seededRandom(12)); assert.deepEqual(s.counts, [40, 0]);
  changePhase(s); assert.equal(lightPrediction(s).a, 0); assert.equal(s.total, 0);
  recordLight(s, 40, seededRandom(12)); assert.deepEqual(s.counts, [0, 40]);
  assert.equal(s.records.length, s.total);
});

test('ambiente, isolamento e nova preparação são partes distintas da mesma evolução', () => {
  const s = lightState(5); advanceLight(s, 2);
  assert.ok(Math.abs(s.coherence - Math.exp(-1.3)) < 1e-12);
  assert.equal(lightPrediction(s).directA, .5);
  const isolated = lightState(6, s); advanceLight(isolated, 100);
  assert.equal(isolated.coherence, s.coherence);
  const fresh = lightState(7, isolated);
  assert.equal(fresh.coherence, 1); assert.equal(fresh.total, 0);
  assert.equal(isolated.coherence, s.coherence);
});

test('o limite descoerente perde a dependência de fase e preserva a normalização', () => {
  const s = lightState(5); advanceLight(s, 100);
  for (const phase of [0, .4, Math.PI, 5]) {
    s.phase = phase; const p = lightPrediction(s);
    assert.ok(Math.abs(p.a - .5) < 1e-12); assert.equal(p.a + p.b, 1);
  }
});

test('mudar o contato, isolar e preparar de novo conservam a fase escolhida', () => {
  const phase = lightState(4); const contact = lightState(5,phase);
  advanceLight(contact,2); const isolated = lightState(6,contact); const fresh = lightState(7,isolated);
  for (const s of [phase,contact,isolated,fresh]) assert.equal(s.phase,Math.PI);
  assert.equal(lightPrediction(fresh).b,1);
});

test('os pares distinguem a mistura específica sem alterar a marginal do outro lado', () => {
  const s = pairState(2); const mixture = pairState(2, true);
  assert.equal(pairPrediction(s).same, 1);
  assert.ok(Math.abs(pairPrediction(mixture).same - .5) < 1e-12);
  for (let b = 0; b <= 180; b += 9) {
    s.angleB = b; const p = pairPrediction(s);
    assert.ok(p.probabilities.every(value => value >= 0));
    assert.equal(p.a, .5); assert.equal(p.b, .5);
    assert.ok(Math.abs(p.probabilities.reduce((a, value) => a + value) - 1) < 1e-12);
  }
  assert.ok(Math.abs(pairPrediction(s).chsh - 2 * Math.SQRT2) < 1e-12);
});

test('os registros individuais e conjuntos preservam contagens e distinguem ausência de amostra', () => {
  const s = pairState(2); assert.equal(s.last, null);
  recordPairs(s, 200, seededRandom(672));
  assert.equal(s.total, s.records.length); assert.equal(s.counts[1] + s.counts[2], 0);
  assert.equal(s.counts.reduce((a, b) => a + b), 200);
  resetPairSample(s); assert.equal(s.total, 0); assert.equal(s.last, null);
});
