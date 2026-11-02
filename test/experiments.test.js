import { test } from 'node:test';
import assert from 'node:assert/strict';
import { environmentReadout, advanceEnvironment, recordEnvironment, pairReadout, pairDensityMatrix, emptyBellCounts, sampleBellBatch, bellReport } from '../src/experiments.js';
import { seededRandom } from '../src/physics.js';

const environment = () => ({ balance: .5, phase: 0, coherence: 1, contact: 1, isolated: false, elapsed: 0, history: [[0, 1]], events: [] });

test('a leitura do ambiente liga coerência e interferência sem alterar as populações', () => {
  const state = environment();
  assert.equal(environmentReadout(state).plus, 1);
  state.coherence = 0;
  const end = environmentReadout(state);
  assert.equal(end.plus, .5); assert.equal(end.zero, .5); assert.equal(end.one, .5);
  assert.equal(end.coherence, 0); assert.equal(end.rate, .65);
});

test('o relógio por passos reproduz o limite exponencial e registra o ponto atual', () => {
  const state = environment();
  for (let i = 0; i < 10; i++) advanceEnvironment(state, .1, true);
  assert.ok(Math.abs(state.coherence - Math.exp(-.65)) < 1e-12);
  assert.deepEqual(state.history.at(-1), [state.elapsed, state.coherence]);
  assert.equal(environmentReadout(state).zero, .5);
});

test('isolar conserva a coerência e retomar o contato continua do estado restante', () => {
  const state = environment();
  advanceEnvironment(state, 2, true);
  const remaining = state.coherence;
  state.isolated = true; recordEnvironment(state, 'Sistema isolado');
  advanceEnvironment(state, 100, true);
  assert.equal(state.coherence, remaining); assert.equal(environmentReadout(state).rate, 0);
  state.isolated = false; state.contact = .5;
  advanceEnvironment(state, 2, true);
  assert.ok(Math.abs(state.coherence - remaining * Math.exp(-.65)) < 1e-12);
  assert.equal(state.events[0].label, 'Sistema isolado');
});

test('marcas de contato preservam a ordem temporal sem duplicar pontos no mesmo instante', () => {
  const state = environment();
  recordEnvironment(state, 'Início'); recordEnvironment(state, 'Contato ajustado');
  assert.equal(state.history.length, 1);
  advanceEnvironment(state, .1, true); recordEnvironment(state, 'Isolamento');
  assert.equal(state.history.length, 2);
  assert.ok(state.events.every((event, i, events) => !i || event.time >= events[i - 1].time));
});

test('as leituras dos pares têm marginais iguais e correlações de referência', () => {
  for (const angleA of [0, 45, 90, 180]) for (const angleB of [0, 22.5, 45, 180]) for (const classical of [false, true]) {
    const readout = pairReadout({ angleA, angleB, classical, counts: [0, 0, 0, 0] });
    assert.ok(Math.abs(readout.aPlus - .5) < 1e-12);
    assert.ok(Math.abs(readout.bPlus - .5) < 1e-12);
    assert.equal(readout.observed, null);
    assert.ok(Math.abs(readout.same - (1 + readout.expected) / 2) < 1e-12);
  }
  assert.equal(pairReadout({ angleA: 45, angleB: 45, counts: [5, 0, 0, 5] }).observed, 1);
  assert.equal(pairReadout({ angleA: 0, angleB: 90, counts: [0, 3, 7, 0] }).observed, -1);
  const measured = pairReadout({ angleA: 0, angleB: 0, counts: [1, 2, 3, 4] });
  assert.equal(measured.observedA, .3); assert.equal(measured.observedB, .4); assert.equal(measured.observed, 0);
});

test('matrizes do par são positivas, hermitianas e normalizadas com a pureza esperada', () => {
  for (const classical of [false, true]) {
    const rho = pairDensityMatrix(classical);
    assert.equal(rho.reduce((sum, row, i) => sum + row[i], 0), 1);
    assert.equal(rho.flat().reduce((sum, v) => sum + v * v, 0), classical ? .5 : 1);
    rho.forEach((row, i) => row.forEach((v, j) => assert.equal(v, rho[j][i])));
    for (const vector of [[1, 0, 0, -1], [1, 2, 3, 4], [-2, 1, 0, .7]]) {
      const quadratic = rho.reduce((sum, row, i) => sum + vector[i] * row.reduce((part, v, j) => part + v * vector[j], 0), 0);
      assert.ok(quadratic >= -1e-12);
    }
    assert.equal(rho[0][0] + rho[1][1], .5);
    assert.equal(rho[2][2] + rho[3][3], .5);
    assert.equal(rho[0][2] + rho[1][3], 0);
  }
});

test('Bell mantém amostras separadas e não atribui zero à ausência de dados', () => {
  const empty = emptyBellCounts();
  assert.equal(bellReport(empty).observed, null);
  empty[0][0] = 10;
  assert.equal(empty[1][0], 0);
  assert.equal(bellReport(empty).observed, null);
  assert.ok(Math.abs(bellReport(empty).expected - 2 * Math.SQRT2) < 1e-12);
});

test('as amostras de Bell convergem às previsões dos modelos existentes', () => {
  for (const classical of [false, true]) {
    const original = emptyBellCounts();
    const sample = sampleBellBatch(original, classical, 10000, seededRandom(456));
    const report = bellReport(sample, classical);
    assert.equal(report.total, 40000);
    assert.ok(original.every(row => row.every(count => count === 0)));
    assert.ok(Math.abs(report.observed - report.expected) < .06);
    assert.ok(report.rows.every(row => row.total === 10000));
  }
});

test('uma amostra finita de Bell pode alcançar quatro sem mudar a previsão teórica', () => {
  const report = bellReport([[10, 0, 0, 0], [10, 0, 0, 0], [10, 0, 0, 0], [0, 10, 0, 0]]);
  assert.equal(report.observed, 4);
  assert.ok(Math.abs(report.expected - 2 * Math.SQRT2) < 1e-12);
});
