import { measureQubit, probabilityPlus } from '../quantum.js';
import { BLUE, GOLD, INK, range, button, choice, status, pct, emit } from './shared.js';

export const sharedReadingProbabilities = balance => { const a = probabilityPlus({ balance }, 'z'); return { collapse: [a, 1 - a], branches: [a, 1 - a] }; };
export default {
  id: 'duas-leituras', number: 6, name: 'Duas leituras', description: 'Acompanhe duas descrições para a mesma medição.', objective: 'Separar previsões, interpretações e adaptações de ficção.', prerequisites: ['lua-ambiente'], position: [87, 76],
  caption: s => s.fiction ? 'A caixa representa a ideia ficcional de acessar realidades. As probabilidades do ensaio permanecem as mesmas.' : s.last === null ? 'Os dois painéis compartilham a preparação e as probabilidades.' : `O mesmo registro ${s.last > 0 ? 'A' : 'B'} aparece nos dois painéis. A descrição do processo é diferente.`,
  understand: ['Uma medição produz um registro. As interpretações discutem como descrever o estado, o aparelho e esse registro. Neste nível, a preparação e o sorteio são compartilhados pelos dois painéis.', 'Na apresentação com colapso, o estado usado para prever resultados é atualizado para o resultado registrado. O nome Copenhague reúne formulações diferentes; essa é a apresentação usada aqui.', 'Na leitura de muitos mundos, a evolução inclui sistema e aparelho sem acrescentar um colapso. Os resultados correspondem a ramos da descrição conjunta. A série Dark Matter usa uma caixa para acessar realidades como recurso de ficção. Esse aparelho não é uma consequência operacional estabelecida da interpretação.'],
  deeper: { equations: [{ id: 'weights', expression: '|ψ⟩ = √(1−p)|A⟩ + √p|B⟩', meaning: 'Os dois painéis partem da mesma preparação.', target: 'state' }, { id: 'branches', expression: '|Ψ⟩ = √(1−p)|A,Rₐ⟩ + √p|B,Rᵦ⟩', meaning: 'A leitura sem colapso inclui registros correlacionados.', target: 'branches' }], note: 'As duas leituras usam probabilityPlus e um único resultado de measureQubit por tentativa. Os pesos dos ramos são as probabilidades da mesma regra de Born neste ensaio. O nível não oferece um teste que selecione uma interpretação. Decoerência e a questão de um resultado único são problemas relacionados, mas distintos. O desenho dos ramos é conceitual e não uma geografia de universos acessíveis.', references: [{ title: 'Everett · Formulação do estado relativo', url: 'https://doi.org/10.1103/RevModPhys.29.454' }, { title: 'Schlosshauer · Medição e interpretações', url: 'https://arxiv.org/abs/quant-ph/0312059' }] },
  myth: { fiction: { title: 'Uma caixa permite escolher outra realidade', text: 'Dark Matter usa portas e realidades acessíveis para explorar escolhas e identidades. A caixa é um recurso narrativo com regras próprias.', action: 'Mostrar a caixa ficcional', id: 'myth-box' }, real: { title: 'Duas descrições compartilham previsões', text: 'O ensaio apresentado aqui fornece as mesmas estatísticas nas duas leituras. Os ramos são partes da descrição do estado conjunto. O diagrama não representa um dispositivo para viajar entre eles.', action: 'Medir uma vez nos dois painéis', id: 'myth-shared' } },
  tasks: s => [{ label: 'Medir com as duas descrições', done: s.total >= 1 }, { label: 'Mudar a preparação compartilhada', done: s.adjusted }, { label: 'Comparar a caixa ficcional e o ensaio', done: s.triedBox && s.triedShared }], complete: s => s.total >= 1 && s.adjusted && s.triedBox && s.triedShared,
  scene: {
    spatial: s => s.fiction,
    create: () => ({ balance: .5, last: null, total: 0, adjusted: false, triedBox: false, triedShared: false, fiction: false }),
    controls: s => [range('balance', 'Chance do resultado B', s.balance * 100, 0, 100, 1, '%'), button('step', 'Medir nos dois painéis', 'primary'), choice('view', 'Representação', s.fiction ? 'box' : 'readings', [['readings', 'Duas descrições'], ['box', 'Caixa da ficção']])],
    act(s, id, value, api) {
      if (id === 'balance') { s.balance = value / 100; s.adjusted = true; s.last = null; }
      if (id === 'view') s.fiction = value === 'box';
      if (id === 'myth-box') { s.fiction = true; s.triedBox = true; }
      if (id === 'step' || id === 'myth-shared') { s.last = measureQubit({ balance: s.balance }, 'z'); s.total++; s.triedShared = true; s.fiction = false; emit(api, [s.last > 0 ? -1.2 : 1.2, 0, 0]); }
    },
    describe: s => ({ tag: s.fiction ? 'Adaptação ficcional · Dark Matter' : 'Mesmo ensaio · duas interpretações', stats: [status('Chance de A', pct(1 - s.balance)), status('Chance de B', pct(s.balance)), status('Registro compartilhado', s.last === null ? 'Aguardando' : s.last > 0 ? 'A' : 'B')] }),
    draw(h, s) {
      if (s.fiction) {
        for (const x of [-1.4, 1.4]) { h.path([[x - .55, -.8, 0], [x - .55, .85, 0], [x + .55, .85, 0], [x + .55, -.8, 0]], GOLD, 2, true); h.ring([x, 0, -.5], .4, '#8bcde780', 'xy'); }
        h.label('Caixa ficcional', [0, -1.25, 0], GOLD); return;
      }
      const left = h.w * .25; const right = h.w * .75; const top = h.h * .3; const end = h.h * .63; const width = Math.min(75, h.w * .13);
      for (const [i, x] of [[0, left], [1, right]]) {
        h.text(i ? 'Sem colapso' : 'Com colapso', x, top - 35, h.focus === 'state' ? GOLD : i ? BLUE : GOLD, h.w < 450 ? 16 : 20);
        if (h.focus === 'state') h.screenPath([[x - 20, top - 12], [x + 20, top - 12]], GOLD, 2, true);
        h.screenPath([[x, top], [x - width, end]], i || s.last === null || s.last > 0 ? BLUE : '#365264', 2, h.focus === 'branches');
        h.screenPath([[x, top], [x + width, end]], i || s.last === null || s.last < 0 ? GOLD : '#365264', 2, h.focus === 'branches');
        h.text(`A · ${pct(1 - s.balance)}`, x - width, end + 28, BLUE, h.w < 450 ? 13 : 15);
        h.text(`B · ${pct(s.balance)}`, x + width, end + 28, GOLD, h.w < 450 ? 13 : 15);
        if (s.last !== null) h.text(`Registro ${s.last > 0 ? 'A' : 'B'}`, x, end + 64, INK, 16);
      }
    }
  }
};
