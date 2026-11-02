import { test } from 'node:test';
import assert from 'node:assert/strict';
import { density, seededRandom } from '../src/physics.js';
import slit, { slitState, slitProfile, createSlitState, fireSlit } from '../src/levels/double-slit.js';
import stone, { stoneProbabilities } from '../src/levels/stone.js';
import phase, { phaseProbability } from '../src/levels/phase.js';
import environment, { environmentOutput } from '../src/levels/environment.js';
import pairs, { pairOutput } from '../src/levels/pairs.js';
import readings, { sharedReadingProbabilities } from '../src/levels/readings.js';
import { levels } from '../src/levels/catalog.js';
import { createRegistry } from '../src/core/registry.js';
import { noopApi } from '../src/levels/shared.js';

test('as saídas da fenda dupla permanecem normalizadas e independem de alguém ler o detector', () => {
  const free = slitProfile('free'); const recorded = slitProfile('recorded'); const unattended = slitProfile('unwatched');
  for (const curve of [free, recorded, unattended]) {
    assert.ok(curve.every(p => p >= 0 && p <= 1));
    assert.ok(Math.abs(curve.reduce((a, b) => a + b, 0) - 1) < 1e-12);
  }
  assert.deepEqual(recorded, unattended);
  assert.ok(free.some((p, i) => Math.abs(p - recorded[i]) > .005));
  for (const [x, y] of [[0, 0], [.7, .3], [-1, .2]]) assert.equal(density(x, y, slitState('recorded')), density(x, y, slitState('unwatched')));
});

test('os impactos de cada condição ficam separados e conservam registros anteriores', () => {
  const state = createSlitState(); const random = seededRandom(843);
  fireSlit(state, 64, undefined, random); const before = structuredClone(state.points.free);
  state.mode = 'recorded'; fireSlit(state, 64, undefined, random);
  assert.deepEqual(state.points.free, before); assert.equal(slit.complete(state), false);
  state.mode = 'unwatched'; fireSlit(state, 64, undefined, random);
  assert.equal(slit.complete(state), true);
  assert.ok(Object.values(state.points).flat().every(p => Number.isFinite(p.x) && Number.isFinite(p.y)));
  fireSlit(state, 4000, undefined, random);
  assert.equal(state.points.unwatched.length, state.totals.unwatched);
  assert.deepEqual(state.points.free, before);
});

test('a pedra tem probabilidades normalizadas, limites certos e câmera sem efeito na preparação', () => {
  assert.deepEqual(stoneProbabilities(0), [1, 0]); assert.deepEqual(stoneProbabilities(1), [0, 1]);
  for (const p of [0, .2, .5, .8, 1]) assert.equal(stoneProbabilities(p).reduce((a, b) => a + b), 1);
  const s = stone.scene.create(); s.mode = 'real';
  const before = stoneProbabilities(s.balance);
  stone.scene.act(s, 'turn', undefined, noopApi);
  assert.deepEqual(stoneProbabilities(s.balance), before);
  assert.equal(s.away, true);
});

test('fase e mistura reproduzem os limites de interferência já estabelecidos', () => {
  assert.equal(phaseProbability(0), 1); assert.equal(phaseProbability(Math.PI), 0);
  for (const angle of [0, .3, Math.PI, 5.6]) assert.equal(phaseProbability(angle, true), .5);
  const s = phase.scene.create(); phase.scene.act(s, 'phase', 180, noopApi);
  phase.scene.act(s, 'batch', undefined, noopApi);
  assert.deepEqual(s.counts, [0, 64]);
});

test('o nível da Lua preserva populações, o canal exponencial e o estado isolado', () => {
  const s = environment.scene.create(); s.contact = 1;
  environment.scene.act(s, 'step', undefined, noopApi);
  assert.ok(Math.abs(s.coherence - Math.exp(-.13)) < 1e-12);
  assert.deepEqual(environmentOutput(s.coherence).direct, [.5, .5]);
  const before = s.coherence; environment.scene.act(s, 'isolate', undefined, noopApi);
  environment.scene.tick(s, 100, noopApi); assert.equal(s.coherence, before);
  assert.equal(environmentOutput(1).plus, 1); assert.equal(environmentOutput(0).plus, .5);
});

test('os pares mantêm as marginais e distinguem a mistura no valor de referência', () => {
  for (const classical of [false, true]) for (const angle of [0, 22.5, 45, 120]) {
    const p = pairOutput(angle, 45, classical).probabilities;
    assert.ok(Math.abs(p.reduce((a, b) => a + b) - 1) < 1e-12);
    assert.ok(Math.abs(p[0] + p[1] - .5) < 1e-12);
    assert.ok(Math.abs(p[0] + p[2] - .5) < 1e-12);
  }
  assert.equal(pairOutput(45, 45).correlation, 1);
  assert.ok(Math.abs(pairOutput(45, 45, true).correlation) < 1e-12);
  const sample = pairs.scene.create(); sample.counts = [4, 3, 2, 1]; sample.total = 10;
  const readout = pairs.scene.describe(sample).sample;
  assert.ok(readout.includes('A+ 70%') && readout.includes('B+ 60%'));
  assert.ok(readout.includes('resultados iguais 50%'));
});

test('duas leituras compartilham probabilidades e o registro de uma única medição', () => {
  for (const p of [0, .1, .5, .9, 1]) {
    const prediction = sharedReadingProbabilities(p);
    assert.deepEqual(prediction.collapse, prediction.branches);
    assert.equal(prediction.collapse.reduce((a, b) => a + b), 1);
  }
  const s = readings.scene.create(); s.balance = 0;
  readings.scene.act(s, 'step', undefined, noopApi);
  assert.equal(s.last, 1); assert.equal(s.total, 1);
});

test('os seis módulos seguem o contrato e cada caminho é desbloqueado por seu próprio ensaio', () => {
  const registry = createRegistry(levels); const completed = new Set();
  assert.equal(levels.length, 6);
  for (const module of levels) {
    assert.ok(module.understand.length && module.deeper.references.length && module.myth.fiction.action && module.myth.real.action);
    const state = module.scene.create();
    assert.ok(module.scene.controls(state).every(control => control.id && control.label));
    assert.ok(module.scene.describe(state).stats.length >= 2);
    assert.equal(module.complete(state), false);
  }
  assert.equal(registry.status(stone.id, completed), 'available');
  completed.add(slit.id); assert.equal(registry.status(phase.id, completed), 'available');
  completed.add(phase.id); assert.equal(registry.status(pairs.id, completed), 'available');
  assert.equal(registry.status(environment.id, completed), 'locked');
  completed.add(stone.id); assert.equal(registry.status(environment.id, completed), 'available');
  completed.add(environment.id); assert.equal(registry.status(readings.id, completed), 'available');
});
