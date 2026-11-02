import { probabilityPlus, qubit, measureQubit } from '../quantum.js';
import { BLUE, GOLD, INK, range, button, choice, status, pct, samples, coherenceReference } from './shared.js';

export const phaseProbability = (phase, mixture = false) => probabilityPlus({ balance: .5, phase, coherence: mixture ? 0 : 1 }, 'x');
export default {
  id: 'fase-coerencia', number: 3, name: 'Fase e coerência', description: 'Combine duas contribuições e gire a fase de uma delas.', objective: 'Distinguir superposição e mistura com as mesmas populações.', prerequisites: ['fenda-dupla'], position: [42, 22],
  caption: s => s.mixture ? 'A mistura mantém as chances diretas em 50/50. Girar a fase deixa a leitura recombinada em 50/50.' : 'Girar a fase redistribui as chances na medição recombinada. As chances diretas continuam em 50/50.',
  understand: ['Fase é a posição relativa dos ciclos das amplitudes, os números que descrevem o estado. Quando as duas contribuições são recombinadas, essa relação altera o resultado. Na cena, as setas representam as amplitudes. Os sinais + e − identificam as duas saídas da leitura recombinada.', 'Uma mistura pode ter as mesmas chances diretas de uma superposição e produzir outra distribuição depois da recombinação. Coerência descreve a capacidade de interferir, em relação à base escolhida. Mudar a fase desloca as faixas; isso não escurece necessariamente a tela inteira.'],
  deeper: { equations: [{ id: 'phase', expression: 'P(+) = ½[1 + c cos(φ)]', meaning: 'A fase φ redistribui as chances na leitura recombinada.', target: 'phase' }, { id: 'coherence', expression: 'C = 2|ρ₀₁|     p = ½', meaning: 'A mistura de comparação zera os termos de interferência.', target: 'state' }], note: 'Preparação equilibrada do modelo existente, com medições na base X. A comparação fixa c = 0 e conserva as populações. As faixas são uma representação da fase e da coerência, não uma distribuição espacial adicional calculada para o estado abstrato.', references: [coherenceReference] },
  myth: { fiction: { title: 'As mesmas chances parecem o mesmo estado', text: 'Duas preparações que dão metade de cada resultado podem parecer equivalentes quando fazemos apenas uma medição direta.', action: 'Mostrar a preparação coerente', id: 'myth-coherent' }, real: { title: 'A recombinação distingue as preparações', text: 'Ao recombinar as contribuições, a relação de fase se torna observável. A mistura mantém 50/50 nessa leitura; a preparação coerente pode produzir um resultado certo.', action: 'Comparar com a mistura sem coerência', id: 'myth-mixture' } },
  tasks: s => [{ label: 'Experimentar a fase em meia volta', done: s.turned }, { label: 'Medir a preparação coerente', done: s.measuredCoherent }, { label: 'Comparar a mistura', done: s.triedMixture }], complete: s => s.turned && s.measuredCoherent && s.triedMixture,
  scene: {
    spatial: s => s.view === 'waves',
    create: () => ({ phase: 0, mixture: false, counts: [0, 0], total: 0, last: null, turned: false, measuredCoherent: false, triedMixture: false, view: 'waves' }),
    controls: s => [range('phase', 'Fase relativa', Math.round(s.phase * 180 / Math.PI), 0, 360, 1, '°'), choice('preparation', 'Preparação', s.mixture ? 'mixture' : 'coherent', [['coherent', 'Com coerência'], ['mixture', 'Mistura de comparação']]), button('step', 'Medir uma vez', 'primary'), button('batch', 'Medir 64'), choice('view', 'Visualização', s.view, [['waves', 'Setas e ondas'], ['probability', 'Curva de probabilidades']])],
    act(s, id, value, api) {
      const clear = () => { s.counts = [0, 0]; s.total = 0; s.last = null; };
      if (id === 'phase') { s.phase = value * Math.PI / 180; if (value >= 170 && value <= 190) s.turned = true; clear(); }
      if (id === 'preparation' || id.startsWith('myth-')) { s.mixture = id === 'preparation' ? value === 'mixture' : id === 'myth-mixture'; if (s.mixture) s.triedMixture = true; clear(); }
      if (id === 'view') s.view = value;
      if (id === 'step' || id === 'batch') { samples(s, id === 'batch' ? 64 : 1, () => measureQubit({ balance: .5, phase: s.phase, coherence: s.mixture ? 0 : 1 }, 'x'), api, [1.8, 0, 0]); if (!s.mixture) s.measuredCoherent = true; }
    },
    describe: s => ({ tag: s.mixture ? 'Mistura de comparação' : 'Preparação coerente', stats: [status('Chance de +', pct(phaseProbability(s.phase, s.mixture))), status('Chance de −', pct(1 - phaseProbability(s.phase, s.mixture))), status('Medição direta', '50 / 50')], sample: s.total ? `Na amostra de ${s.total}: + apareceu ${s.counts[0]} vezes e −, ${s.counts[1]}. Último resultado: ${s.last > 0 ? '+' : '−'}.` : 'Faça uma medição para criar uma amostra.', accessible: `Fase ${Math.round(s.phase * 180 / Math.PI)} graus. Coerência ${qubit({ balance: .5, coherence: s.mixture ? 0 : 1 }).l1}. ${s.total} medições.` }),
    draw(h, s, { layers }) {
      if (s.view === 'probability' || h.flat) {
        const left = 45; const width = h.w - 90; const top = h.h * .3; const height = h.h * .38;
        h.screenPath([[left, top], [left, top + height], [left + width, top + height]], '#8bcde760');
        h.screenPath(Array.from({ length: 181 }, (_, i) => [left + i / 180 * width, top + (1 - phaseProbability(i / 180 * Math.PI * 2, s.mixture)) * height]), BLUE, 2, h.focus === 'phase');
        const x = left + s.phase / (2 * Math.PI) * width;
        h.screenPath([[x, top], [x, top + height]], GOLD, 1, false, true); h.text('0°', left, top + height + 25); h.text('180°', left + width / 2, top + height + 25); h.text('360°', left + width, top + height + 25);
        h.text('Chance de + para cada fase', h.w / 2, top - 25, INK, 16); return;
      }
      if (layers.grid) h.floor();
      for (const [i, x] of [[0, -1.8], [1, 1.8]]) {
        h.ring([x, .45, 0], .6, '#8bcde770', 'xy'); const phase = i ? s.phase : 0;
        h.path([[x, .45, 0], [x + Math.cos(phase) * .6, .45 + Math.sin(phase) * .6, 0]], i ? GOLD : BLUE, 2, h.focus === 'phase');
        h.label(h.w < 450 ? `Onda ${i ? 'B' : 'A'}` : i ? 'Segunda contribuição' : 'Primeira contribuição', [x, 1.35, 0], INK, -10);
        if (layers.waves) h.path(Array.from({ length: 65 }, (_, j) => {
          const t = j / 64;
          return [(i ? .2 : -2.7) + t * 2.5, -.35 + Math.sin(t * Math.PI * 6 + phase) * .13, 0];
        }), i ? GOLD : BLUE, 1.5, h.focus === 'phase');
      }
      if (layers.waves) for (let lane = 0; lane < 14; lane++) {
        const y = -.9 + lane * .09; const intensity = s.mixture ? .25 : .15 + .65 * (1 + Math.cos(lane * .8 - s.phase)) / 2;
        h.ctx.globalAlpha = intensity; h.path([[-2.5, y, 0], [2.5, y, 0]], BLUE, 2, h.focus === 'state'); h.ctx.globalAlpha = 1;
      }
    }
  }
};
