import { bellProbabilities, bellCorrelation, measurePair, chsh } from '../quantum.js';
import { emptyBellCounts, sampleBellBatch, bellReport, pairReadout } from '../experiments.js';
import { BLUE, GOLD, INK, range, choice, button, status, pct, number, emit, outcomeBars } from './shared.js';

export const pairOutput = (a, b, classical = false) => ({ probabilities: bellProbabilities(a, b, classical), correlation: bellCorrelation(a, b, classical) });
export default {
  id: 'pares-ligados', number: 5, name: 'Pares ligados', description: 'Gire os analisadores e compare os registros dos dois lados.', objective: 'Distinguir resultados locais e correlações do par.', prerequisites: ['fase-coerencia'], position: [78, 27],
  caption: s => s.testedRemote ? 'Girar B muda a correlação do par. A chance de + em A continua em 50%.' : 'Cada lado produz um resultado. A correlação aparece ao comparar os dois registros.',
  understand: ['Entrelaçamento é uma relação em que o estado do par exige descrever os dois sistemas em conjunto. Cada lado deste exemplo dá + ou − com a mesma chance. Os analisadores definem o ângulo em que a polarização é medida.', 'Correlação descreve a tendência de os resultados serem iguais ou diferentes. O valor +1 significa sempre iguais; −1, sempre diferentes; 0, nenhuma tendência entre essas opções. Na mistura de comparação, metade dos pares tem polarização horizontal e a outra metade, vertical. Essa mistura específica concorda em alguns ângulos e difere em outros.', 'Os fios e os pulsos são metáforas. A escolha do ângulo de um lado não muda as probabilidades locais do outro. As estatísticas conjuntas exigem comparar os registros por um meio comum de comunicação.'],
  deeper: { equations: [{ id: 'angles', expression: 'E(a,b) = cos[2(a−b)]', meaning: 'Correlação prevista para o par entrelaçado.', target: 'analyzers' }, { id: 'local', expression: 'P(A+) = P(B+) = ½', meaning: 'Cada resultado local permanece imprevisível.', target: 'local' }, { id: 'joint', expression: 'P(++) = P(−−) = (1+E)/4', meaning: 'A relação aparece na distribuição conjunta.', target: 'joint' }], note: 'Mesmo par de Bell Φ+ e mesmas medições de polarização linear. A mistura HH/VV usa Ecl = cos(2a)cos(2b). O botão de Bell amostra quatro configurações fixas usando measurePair e contagens separadas; o número S é uma estimativa simulada, sem teste experimental de significância. Uma amostra finita pode ultrapassar a previsão por flutuação.', references: [{ title: 'Horodecki e colaboradores · Entrelaçamento', url: 'https://arxiv.org/abs/quant-ph/0702225' }, { title: 'Hensen e colaboradores · Teste físico de Bell', url: 'https://arxiv.org/abs/1508.05949' }] },
  myth: { fiction: { title: 'Um sinal parece atravessar o fio', text: 'Brilhos coordenados e linhas entre objetos podem sugerir uma mensagem instantânea. Essa imagem é atraente porque torna a relação visível.', action: 'Girar apenas o analisador B', id: 'myth-signal' }, real: { title: 'A probabilidade local permanece igual', text: 'O ângulo de B muda as probabilidades conjuntas, mas A continua em 50/50. Para reconhecer a correlação, é preciso comparar os dois conjuntos de registros.', action: 'Medir e comparar 64 pares', id: 'myth-compare' } },
  tasks: s => [{ label: 'Medir pelo menos 64 pares', done: s.total >= 64 }, { label: 'Comparar a mistura em 45° / 45°', done: s.triedMixture }, { label: 'Girar B e observar a probabilidade de A', done: s.testedRemote }], complete: s => s.total >= 64 && s.triedMixture && s.testedRemote,
  scene: {
    spatial: s => s.view === 'apparatus',
    create: () => ({ angleA: 0, angleB: 0, classical: false, counts: [0, 0, 0, 0], total: 0, last: null, bell: emptyBellCounts(), triedMixture: false, testedRemote: false, view: 'apparatus' }),
    controls: s => [range('a', 'Analisador A', s.angleA, 0, 180, .5, '°'), range('b', 'Analisador B', s.angleB, 0, 180, .5, '°'), choice('model', 'Preparação do par', s.classical ? 'classical' : 'entangled', [['entangled', 'Par entrelaçado'], ['classical', 'Mistura de comparação']]), button('angles', 'Colocar A e B em 45°'), button('step', 'Medir um par', 'primary'), button('batch', 'Medir 64 pares'), button('bell', 'Bell · 100 por configuração'), choice('view', 'Visualização', s.view, [['apparatus', 'Analisadores'], ['results', 'Resultados conjuntos'], ['curve', 'Curva de correlação']])],
    act(s, id, value, api) {
      const clear = () => { s.counts = [0, 0, 0, 0]; s.total = 0; s.last = null; };
      if (id === 'a' || id === 'b') { s[id === 'a' ? 'angleA' : 'angleB'] = value; if (id === 'b') s.testedRemote = true; clear(); }
      if (id === 'angles') { s.angleA = 45; s.angleB = 45; clear(); }
      if (id === 'model') { s.classical = value === 'classical'; s.bell = emptyBellCounts(); clear(); }
      if (id === 'view') s.view = value;
      if (id === 'myth-signal') { s.angleB = (s.angleB + 45) % 180; s.testedRemote = true; clear(); }
      if (id === 'step' || id === 'batch' || id === 'myth-compare') {
        const count = id === 'step' ? 1 : 64;
        for (let i = 0; i < count; i++) { const pair = measurePair(s.angleA, s.angleB, s.classical); s.counts[pair.bin]++; s.last = pair; s.total++; }
        emit(api, [1.8, s.last.b * .25, 0]);
      }
      if (id === 'bell') s.bell = sampleBellBatch(s.bell, s.classical);
      if (s.classical && s.angleA === 45 && s.angleB === 45) s.triedMixture = true;
    },
    describe(s) {
      const report = bellReport(s.bell, s.classical); const pair = pairReadout(s);
      return { tag: s.classical ? 'Mistura de comparação' : 'Par entrelaçado', stats: [status('Chance de + em A', pct(pair.aPlus)), status('Chance de + em B', pct(pair.bPlus)), status('Resultados iguais', pct(pair.same))], sample: s.total ? `Na amostra de ${s.total} pares: A+ ${pct(pair.observedA)} · B+ ${pct(pair.observedB)} · resultados iguais ${pct((s.counts[0] + s.counts[3]) / s.total)}.` : 'Meça pares para comparar as frequências com as chances acima.', accessible: `Ângulos A ${s.angleA} e B ${s.angleB} graus. Correlação ${number(pair.expected)}. ${s.total} pares medidos.`, table: { title: `Bell · S previsto ${number(chsh(s.classical))} · amostra ${report.observed === null ? 'sem dados' : number(report.observed)}`, columns: ['A / B', 'Previsão', 'Amostra', 'Pares'], rows: report.rows.map(r => [`${number(r.angleA)}° / ${number(r.angleB)}°`, number(r.expected), r.observed === null ? 'Sem dados' : number(r.observed), r.total]) } };
    },
    draw(h, s, { layers }) {
      if (s.view === 'results' || (h.flat && s.view !== 'curve')) { outcomeBars(h, bellProbabilities(s.angleA, s.angleB, s.classical), ['++', '+−', '−+', '−−'], s.total ? s.counts.map(n => n / s.total) : null); h.text(`${s.total} pares registrados`, h.w / 2, h.h * .27, h.focus ? GOLD : INK, 17); return; }
      if (s.view === 'curve') {
        const left = 45; const top = h.h * .3; const width = h.w - 90; const height = h.h * .4;
        h.screenPath([[left, top], [left, top + height], [left + width, top + height]], '#8bcde760');
        for (const classic of [false, true]) h.screenPath(Array.from({ length: 181 }, (_, i) => [left + i / 180 * width, top + (1 - bellCorrelation(s.angleA, i, classic)) / 2 * height]), classic ? GOLD : BLUE, 2, h.focus === 'joint');
        const x = left + s.angleB / 180 * width; h.screenPath([[x, top], [x, top + height]], GOLD, 1, false, true);
        h.text('0°', left, top + height + 24); h.text('180°', left + width, top + height + 24); h.text('Azul: par · dourado: mistura', h.w / 2, top - 25); return;
      }
      if (layers.grid) h.floor();
      h.sphere([0, 0, 0], .25, GOLD); h.label('Preparação do par', [0, -1.1, 0]);
      if (h.focus === 'joint') h.ring([0, 0, 0], 2.7, GOLD, 'xz', true);
      for (const [i, x, angle] of [[0, -2, s.angleA], [1, 2, s.angleB]]) {
        if (layers.waves) h.beam([0, 0, 0], [x, 0, 0], BLUE);
        h.ring([x, 0, 0], .65, BLUE, 'xy', h.focus === 'analyzers');
        const a = angle * Math.PI / 180;
        h.path([[x - Math.sin(a) * .65, -Math.cos(a) * .65, 0], [x + Math.sin(a) * .65, Math.cos(a) * .65, 0]], BLUE, 2, true);
        h.label(`${i ? 'B' : 'A'} · ${number(angle)}°`, [x, -1, 0], BLUE);
        h.label('50% / 50%', [x, 1, 0], INK, -16);
        if (s.last) h.dot([x, (i ? s.last.b : s.last.a) * .25, 0], GOLD, 6);
        if (h.focus === 'local') h.ring([x, 0, 0], .82, GOLD, 'xy', true);
      }
    }
  }
};
