import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRegistry, loadProgress, saveProgress } from '../src/core/registry.js';

const module = (id, prerequisites = []) => ({ id, name: id, prerequisites, scene: {} });
const memory = () => { const values = new Map(); return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }; };

test('um nível novo é reconhecido sem alterar o núcleo e respeita seus pré-requisitos', () => {
  const registry = createRegistry([module('a'), module('b'), module('c', ['a', 'b'])]);
  const progress = new Set();
  assert.equal(registry.status('a', progress), 'available');
  assert.equal(registry.status('c', progress), 'locked');
  progress.add('a'); assert.deepEqual(registry.missing('c', progress), ['b']);
  progress.add('b'); assert.equal(registry.status('c', progress), 'available');
  progress.add('c'); assert.equal(registry.status('c', progress), 'complete');
});

test('o registro rejeita ids duplicados, dependências ausentes e ciclos', () => {
  assert.throws(() => createRegistry([module('a'), module('a')]), /Identificador/);
  assert.throws(() => createRegistry([module('a', ['x'])]), /desconhecido/);
  assert.throws(() => createRegistry([module('a', ['b']), module('b', ['a'])]), /circular/);
});

test('o progresso persiste, descarta entradas inválidas e recupera dependências em qualquer ordem', () => {
  const registry = createRegistry([module('b', ['a']), module('a')]);
  const storage = memory();
  saveProgress(storage, new Set(['b', 'a', 'fora']));
  assert.deepEqual([...loadProgress(storage, registry)].sort(), ['a', 'b']);
  saveProgress(storage, new Set(['b']));
  assert.equal(loadProgress(storage, registry).size, 0);
  storage.setItem('limiar.atlas.v1', 'inválido');
  assert.equal(loadProgress(storage, registry).size, 0);
  assert.equal(saveProgress({ setItem() { throw new Error(); } }, new Set()), false);
});
