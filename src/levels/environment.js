import { dephase, probabilityPlus } from '../quantum.js';
import { BLUE, GOLD, INK, crystal, range, choice, button, status, pct, number, emit, environmentReference } from './shared.js';

export const environmentOutput = coherence => ({ plus: probabilityPlus({ balance: .5, phase: 0, coherence }, 'x'), direct: [.5, .5] });
export default {
  id: 'lua-ambiente', number: 4, name: 'Decoerência e a Lua Quântica', description: 'Acompanhe o contato com o ambiente e a perda da interferência.', objective: 'Observar uma perda no tempo e o efeito de isolar.', prerequisites: ['pedra-quantica', 'fase-coerencia'], position: [59, 64],
  caption: s => s.view === 'photo' ? s.watching ? 'Regra da ficção: olhar para a imagem mantém a posição da Lua.' : 'Modelo físico: deixar de olhar a foto não apaga o registro já produzido.' : s.isolated ? 'O sistema está isolado. A coerência que resta permanece constante.' : 'O contato reduz a coerência. As chances diretas continuam em 50/50.',
  understand: ['Decoerência é a redução da interferência observável quando o sistema interage com o ambiente. Luz, ar e outros sistemas podem carregar registros dessas interações. Neste modelo, as chances diretas continuam em 50/50.', 'Isolar interrompe novas perdas. A coerência anterior não volta com esse botão. Preparar de novo inicia um novo ensaio. No exemplo da Lua, observar uma foto segue a regra ficcional de Outer Wilds; no exemplo físico, o registro permanece quando a pessoa deixa de olhar.'],
  deeper: { equations: [{ id: 'rate', expression: 'c(t + Δt) = c(t) exp(−γΔt)', meaning: 'O contato define a taxa γ de perda de coerência.', target: 'environment' }, { id: 'state', expression: 'P(0) = P(1) = ½     P(+) = (1 + c)/2', meaning: 'As populações se mantêm; a interferência diminui.', target: 'state' }], note: 'O mesmo canal efetivo de desfasamento puro já implementado: γ = 0,65 × contato por segundo de simulação. O registro fotográfico idealizado equivale ao limite sem coerência para o sistema reduzido, sem condicionar um resultado individual. Não simulamos o ambiente microscópico, relaxação de energia ou recuperação espontânea de coerência. A Lua e sua imagem são uma comparação ficcional separada.', references: [environmentReference, { title: 'Schlosshauer · Medição e interpretações', url: 'https://arxiv.org/abs/quant-ph/0312059' }] },
  myth: { fiction: { title: 'Uma imagem observada mantém a Lua', text: 'Em Outer Wilds, a imagem funciona enquanto continua sendo observada. A regra permite chegar à Lua através das nuvens.', action: 'Olhar a imagem na regra do jogo', id: 'myth-photo' }, real: { title: 'Um registro físico continua existindo', text: 'Neste exemplo idealizado, a foto registra a alternativa e remove a interferência do sistema reduzido. Deixar de olhar a foto preserva esse registro. A pessoa não é uma variável do cálculo.', action: 'Guardar a foto sem olhar', id: 'myth-record' } },
  tasks: s => [{ label: 'Observar a coerência cair abaixo de 90%', done: s.lost }, { label: 'Isolar depois de alguma perda', done: s.triedIsolation }, { label: 'Comparar a imagem e o registro', done: s.triedPhoto && s.triedRecord }], complete: s => s.lost && s.triedIsolation && s.triedPhoto && s.triedRecord,
  scene: {
    spatial: s => s.view !== 'history',
    create: () => ({ coherence: 1, contact: .3, isolated: false, elapsed: 0, history: [[0, 1]], lost: false, triedIsolation: false, triedPhoto: false, triedRecord: false, view: 'field', watching: true, time: 0 }),
    controls: s => [range('contact', 'Contato com o ambiente', s.contact * 100, 0, 100, 1, '%'), button('isolate', s.isolated ? 'Retomar contato' : 'Isolar', 'primary'), button('step', 'Avançar 0,2 segundo'), button('prepare', 'Preparar de novo'), choice('view', 'Visualização', s.view, [['field', 'Sistema e ambiente'], ['history', 'Coerência ao longo do tempo'], ['photo', 'Imagem e registro']])],
    act(s, id, value, api) {
      if (id === 'contact') { s.contact = value / 100; s.isolated = false; }
      if (id === 'isolate') { s.isolated = !s.isolated; if (s.isolated && s.coherence < 1) s.triedIsolation = true; }
      if (id === 'prepare') { s.coherence = 1; s.elapsed = 0; s.history = [[0, 1]]; }
      if (id === 'view') s.view = value;
      if (id === 'step') advance(s, .2);
      if (id === 'myth-photo') { s.view = 'photo'; s.watching = true; s.triedPhoto = true; emit(api, [0, 0, 0]); }
      if (id === 'myth-record') { s.view = 'photo'; s.watching = false; s.coherence = 0; s.lost = true; s.triedRecord = true; s.history.push([s.elapsed, 0]); emit(api, [1.9, 0, 0]); }
    },
    tick(s, dt) { s.time += dt; if (s.view !== 'photo') advance(s, dt); },
    describe: s => ({ tag: s.view === 'photo' ? s.watching ? 'Comparação · regra ficcional' : 'Comparação · registro físico idealizado' : s.isolated ? 'Sistema isolado' : 'Interação com o ambiente', stats: [status('Coerência restante', pct(s.coherence)), status('Chance de +', pct(environmentOutput(s.coherence).plus)), status('Tempo do ensaio', `${number(s.elapsed)} s`)] }),
    draw(h, s, { layers }) {
      if (s.view === 'history' || (h.flat && s.view !== 'photo')) {
        const left = 50; const top = h.h * .27; const width = h.w - 100; const height = h.h * .42; const end = Math.max(1, s.elapsed);
        h.screenPath([[left, top], [left, top + height], [left + width, top + height]], '#8bcde770');
        const history = [...s.history, [s.elapsed, s.coherence]];
        h.screenPath(history.map(([t, c]) => [left + t / end * width, top + (1 - c) * height]), BLUE, 2, Boolean(h.focus));
        h.text('100%', left, top - 17); h.text('0%', left, top + height + 24); h.text(`${number(s.elapsed)} s`, left + width, top + height + 24); h.text(s.isolated ? 'Isolado · sem novas perdas' : 'Coerência ao longo do tempo', h.w / 2, top - 44, GOLD, 16); return;
      }
      if (layers.grid) h.floor();
      if (s.view === 'photo') {
        h.sphere([-1.7, 0, 0], .8, BLUE); h.label('Lua', [-1.7, -1.2, 0]);
        if (h.flat) h.path([[.8, -.85, 0], [.8, .85, 0], [2.2, .85, 0], [2.2, -.85, 0], [.8, -.85, 0]], GOLD);
        else h.plane(1.5, 1.7, 1.2, GOLD);
        h.sphere([1.5, 0, 0], .35, GOLD); h.label(s.watching ? 'Imagem observada' : 'Foto guardada', [1.5, -1.2, 0], GOLD);
        if (s.watching && layers.waves) h.beam([-1.7, 0, 0], [1.5, 0, 0], GOLD); return;
      }
      crystal(h, [0, 0, 0], 1, BLUE);
      for (let i = 0; i < 13; i++) {
        const t = i * 2.4 + s.time * .2; const point = [Math.sin(t) * 2.6, Math.cos(t * 1.2) * 1.1, Math.cos(t) * 1.4];
        h.dot(point, GOLD, 2);
        if (!s.isolated && s.contact > 0 && layers.waves) { h.ctx.globalAlpha = s.contact * .5; h.beam(point, [0, 0, 0], GOLD); h.ctx.globalAlpha = 1; }
      }
      if (layers.prediction) for (let i = 0; i < 8; i++) h.ring([0, 0, 0], .7 + i * .1, `${BLUE}${Math.round(20 + s.coherence * 60).toString(16).padStart(2, '0')}`, i % 2 ? 'yz' : 'xz', h.focus === 'environment');
    }
  }
};
function advance(s, dt) {
  s.elapsed += dt; s.coherence = dephase(s.coherence, s.isolated ? 0 : s.contact * .65, dt);
  if (s.coherence < .9) s.lost = true;
  if (s.elapsed - s.history.at(-1)[0] >= .1) s.history.push([s.elapsed, s.coherence]);
  if (s.history.length > 1500) s.history.shift();
}
