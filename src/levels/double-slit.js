import { DEFAULT_STATE, EXTENT, density, createSampler } from '../physics.js';
import { BLUE, GOLD, INK, button, choice, status, number, emit } from './shared.js';

export const modes = ['free', 'recorded', 'unwatched'];
export const slitState = mode => ({ ...DEFAULT_STATE, coherence: mode === 'free' ? 1 : 0 });
const samplers = new WeakMap();
export function createSlitState() { return { mode: 'free', view: 'apparatus', points: { free: [], recorded: [], unwatched: [] }, totals: { free: 0, recorded: 0, unwatched: 0 }, automatic: false, accumulator: 0, comparison: false, time: 0 }; }
export function fireSlit(state, count = 1, api, random = Math.random) {
  let cache = samplers.get(state);
  if (!cache || cache.random !== random) { cache = { random, values: new Map() }; samplers.set(state, cache); }
  if (!cache.values.has(state.mode)) cache.values.set(state.mode, createSampler(slitState(state.mode), 160, random));
  const sample = cache.values.get(state.mode);
  let last;
  for (let i = 0; i < count; i++) {
    last = sample(); state.points[state.mode].push(last); state.totals[state.mode]++;
  }
  if (last) emit(api, [2.5, last.y / EXTENT * 1.35, last.x / EXTENT * 1.2]);
}

export function slitProfile(mode, bins = 80) {
  const state = slitState(mode); const values = [];
  const step = EXTENT * 2 / 100;
  for (let i = 0; i < bins; i++) {
    const y = -EXTENT + (i + .5) / bins * EXTENT * 2;
    let total = 0;
    for (let x = 0; x < 100; x++) total += density(-EXTENT + (x + .5) * step, y, state) * step;
    values.push(total);
  }
  const sum = values.reduce((a, b) => a + b, 0);
  return values.map(v => v / sum);
}
const profiles = Object.fromEntries(modes.map(mode => [mode, slitProfile(mode)]));
const captions = {
  free: 'Cada disparo deixa um ponto. O acúmulo dos pontos revela faixas.',
  recorded: 'O detector registra a fenda. A nova amostra perde as faixas de interferência.',
  unwatched: 'O detector continua gravando sozinho. As probabilidades permanecem iguais.'
};
function screen(h, state, mode, x, y, width, height) {
  const c = h.ctx; c.fillStyle = '#0c202d'; c.fillRect(x, y, width, height);
  c.strokeStyle = `${BLUE}60`; c.strokeRect(x, y, width, height);
  if ((h.focus === 'paths' && mode === 'free') || (h.focus === 'detector' && mode !== 'free')) {
    c.shadowColor = mode === 'free' ? BLUE : GOLD; c.shadowBlur = 15;
    c.strokeStyle = c.shadowColor; c.lineWidth = 2; c.strokeRect(x, y, width, height); c.shadowBlur = 0; c.lineWidth = 1;
  }
  for (const point of state.points[mode]) {
    c.fillStyle = mode === 'free' ? BLUE : GOLD;
    c.globalAlpha = .65; c.fillRect(x + (point.x / EXTENT + 1) / 2 * width, y + (1 - point.y / EXTENT) / 2 * height, 1.8, 1.8);
  }
  c.globalAlpha = 1;
  h.text(`${state.totals[mode]} impactos`, x + width / 2, y + height + 25, INK, 14);
}

export default {
  id: 'fenda-dupla', number: 1, name: 'Fenda dupla', description: 'Dispare partículas e acompanhe os pontos no anteparo.',
  objective: 'Descobrir o efeito do registro da fenda.', prerequisites: [], position: [14, 30], icon: 'slits',
  caption: state => captions[state.mode],
  understand: ['O anteparo é a superfície que registra a chegada. Cada disparo produz um ponto. Com muitos disparos, os pontos revelam uma distribuição com regiões mais e menos frequentes. As faixas recebem o nome de interferência.', 'Um detector capaz de distinguir as fendas muda a distribuição. O efeito também aparece quando o aparelho grava sem ninguém acompanhando. Cada configuração mantém sua própria amostra, e os pontos anteriores permanecem onde foram registrados.'],
  deeper: {
    equations: [{ id: 'paths', expression: 'P = |ψ₁|² + |ψ₂|² + 2c Re(ψ₁*ψ₂)', meaning: 'As duas contribuições e o termo de interferência.', target: 'paths' }, { id: 'record', expression: 'c = 1: coerente     c = 0: registro ideal da fenda', meaning: 'O detector ideal remove a contribuição de interferência.', target: 'detector' }],
    note: 'Modelo efetivo já existente de dois pacotes gaussianos normalizados. Os impactos são amostrados de density por createSampler. O esquema do emissor e das fendas é ilustrativo; não calculamos trajetórias individuais entre a emissão e a chegada. O perfil sem interferência é a soma das distribuições de cada fenda, que podem se sobrepor. As amostras finitas diferem por sorteio.',
    references: [{ title: 'Feynman · Comportamento quântico', url: 'https://www.feynmanlectures.caltech.edu/III_01.html' }, { title: 'Englert · Informação de caminho e interferência', url: 'https://doi.org/10.1103/PhysRevLett.77.2154' }]
  },
  myth: {
    fiction: { title: 'A ideia da pessoa que observa', text: 'A palavra observador pode sugerir que alguém precisa olhar para mudar o resultado. Outer Wilds transforma a observação consciente em uma regra que o jogador experimenta.', action: 'Experimentar com alguém olhando', id: 'myth-person' },
    real: { title: 'Um detector que registra sozinho', text: 'Neste ensaio, o aparelho registra por qual fenda houve passagem. O efeito permanece quando ninguém acompanha a gravação. Registrar apenas a chegada no anteparo não é o mesmo que distinguir a fenda.', action: 'Deixar o detector gravando sozinho', id: 'myth-record' }
  },
  tasks: state => modes.map((id, i) => ({ label: ['Acumular 64 impactos sem detector', 'Acumular 64 impactos com detector', 'Acumular 64 impactos gravando sozinho'][i], done: state.totals[id] >= 64 })),
  complete: state => modes.every(mode => state.totals[mode] >= 64),
  scene: {
    spatial: s => s.view === 'apparatus',
    create: createSlitState,
    controls: state => [choice('mode', 'Registro nas fendas', state.mode, [['free', 'Sem detector'], ['recorded', 'Detector · alguém acompanha'], ['unwatched', 'Detector · gravando sozinho']]), button('step', 'Disparar uma', 'primary'), button('batch', 'Disparar 64'), button('accumulate', 'Acumular 1.024 impactos'), button('auto', state.automatic ? 'Parar disparos' : 'Disparar em sequência'), choice('view', 'Visualização', state.view, [['apparatus', 'Emissor, fendas e anteparo'], ['screen', 'Anteparo de frente'], ['compare', 'Comparar as três amostras']])],
    act(state, action, value, api) {
      if (action === 'mode') { state.mode = value; state.automatic = false; }
      if (action === 'view') state.view = value;
      if (action === 'step') fireSlit(state, 1, api);
      if (action === 'batch') fireSlit(state, 64, api);
      if (action === 'accumulate') { fireSlit(state, 1024, api); state.view = 'screen'; }
      if (action === 'auto') state.automatic = !state.automatic;
      if (action === 'myth-person') { state.mode = 'recorded'; fireSlit(state, 64, api); state.view = 'compare'; }
      if (action === 'myth-record') { state.mode = 'unwatched'; fireSlit(state, 64, api); state.view = 'compare'; }
    },
    tick(state, dt, api) { state.time += dt; if (state.automatic) { state.accumulator += dt * 12; while (state.accumulator >= 1) { fireSlit(state, 1, api); state.accumulator--; } } },
    describe: state => ({ tag: state.mode === 'free' ? 'Sem registro de caminho' : state.mode === 'recorded' ? 'Detector acompanhado' : 'Detector gravando sozinho', stats: [status('Nesta amostra', number(state.totals[state.mode])), status('Detector', state.mode === 'free' ? 'Desligado' : 'Ligado'), status('Alguém acompanha', state.mode === 'unwatched' ? 'Não' : 'Sim')], accessible: `${state.totals[state.mode]} impactos nesta amostra. ${captions[state.mode]}` }),
    draw(h, state, context) {
      const front = h.flat || state.view !== 'apparatus';
      if (front) {
        const compare = state.view === 'compare';
        const width = compare ? Math.min(180, (h.w - 80) / 3) : Math.min(340, h.w - 90);
        const height = Math.min(260, h.h - 145);
        const gap = 15; const total = compare ? width * 3 + gap * 2 : width;
        const list = compare ? modes : [state.mode];
        list.forEach((mode, i) => { const x = (h.w - total) / 2 + i * (width + gap); screen(h, state, mode, x, h.h * .18, width, height); h.text(['Livre', 'Acompanhado', 'Sozinho'][modes.indexOf(mode)], x + width / 2, h.h * .18 - 18, mode === 'free' ? BLUE : GOLD, h.w < 500 ? 13 : 16); });
        if (!compare && context.layers.prediction) {
          const p = profiles[state.mode]; const peak = Math.max(...p); const left = (h.w + width) / 2 + 13;
          h.screenPath(p.map((v, i) => [left + v / peak * 35, h.h * .18 + (1 - i / (p.length - 1)) * height]), GOLD, 1.5);
        }
        return;
      }
      if (context.layers.grid) h.floor();
      h.ring([-3, 0, 0], .22, BLUE, 'yz', true); h.dot([-3, 0, 0], BLUE, 5); h.label('Emissor', [-3, -.5, 0]);
      h.plane(-.8, 2.35, 1.8, '#8bcde770'); h.plane(2.5, 2.7, 2.4, BLUE);
      h.label('Duas fendas', [-.8, -1.4, 0]); h.label('Anteparo', [2.5, -1.6, 0]);
      for (const z of [-.45, .45]) {
        h.path([[-.8, -.5, z], [-.8, .5, z]], state.mode === 'free' ? BLUE : GOLD, 4, true);
        if (context.layers.waves) {
          h.beam([-3, 0, 0], [-.8, 0, z]); h.beam([-.8, 0, z], [2.5, 0, z]);
          if (state.mode === 'free') for (let i = 0; i < 7; i++) h.ring([-.5 + i * .4, 0, z], .2 + i * .1, '#8bcde735', 'yz', h.focus === 'paths');
        }
        if (state.mode !== 'free') { h.sphere([-.55, 0, z], .13, GOLD); h.label('Registro', [-.55, .7, z], GOLD, -15); }
      }
      h.ctx.fillStyle = state.mode === 'free' ? BLUE : GOLD;
      for (const point of state.points[state.mode]) {
        const [x, y] = h.project([2.5, point.y / EXTENT * 1.35, point.x / EXTENT * 1.2]); h.ctx.fillRect(x, y, 1.8, 1.8);
      }
      if (h.focus === 'detector') h.ring([-.8, 0, 0], 1.1, GOLD, 'yz', true);
    }
  }
};
