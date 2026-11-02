import { probabilityPlus, measureQubit } from '../quantum.js';
import { BLUE, GOLD, INK, crystal, range, choice, button, status, pct, emit } from './shared.js';

export const stoneProbabilities = balance => [probabilityPlus({ balance }, 'z'), 1 - probabilityPlus({ balance }, 'z')];
export default {
  id: 'pedra-quantica', number: 2, name: 'Pedra quântica', description: 'Explore uma pedra que muda de lugar e compare duas regras de observação.',
  objective: 'Distinguir a regra do jogo de uma previsão de medição.', prerequisites: [], position: [23, 74],
  caption: s => s.mode === 'game' ? s.watch === 'away' ? 'Regra da ficção: fora da observação, a pedra pode mudar de posição.' : 'Regra da ficção: observar a pedra ou a foto mantém sua posição.' : s.away ? 'A pedra ficou fora de vista. As chances dos resultados continuam indicadas.' : 'No modelo físico, a medição produz um resultado entre as duas posições possíveis.',
  understand: ['Em Outer Wilds, certos objetos mudam de lugar quando deixam de ser observados. Olhar para uma imagem também pode mantê-los naquela configuração. Essa é uma regra ficcional de observação.', 'Aqui, o exemplo físico tem duas posições possíveis. A distribuição indica a chance de cada resultado. Virar a câmera não muda a preparação. O desenho da pedra é uma metáfora; os sorteios de medição usam o modelo matemático. Uma superposição não equivale a uma pedra clássica trocando secretamente de lugar.'],
  deeper: { equations: [{ id: 'weights', expression: 'P(A) = 1 − p     P(B) = p', meaning: 'A preparação define as chances nas duas posições do exemplo.', target: 'positions' }], note: 'As duas posições representam a base fixa do modelo de dois estados existente. A regra de troca periódica na cena ficcional é uma mecânica artística e não uma simulação de evolução quântica. No exemplo físico, measureQubit usa a regra de Born. O toque, a fotografia e a câmera não modelam os graus de liberdade ambientais neste nível.', references: [{ title: 'Outer Wilds · Regra da imagem e Lua Quântica', url: 'https://outerwilds.fandom.com/wiki/Quantum_Moon' }, { title: 'Feynman · Probabilidades e amplitudes', url: 'https://www.feynmanlectures.caltech.edu/III_01.html' }] },
  myth: {
    fiction: { title: 'Uma pedra que muda fora da observação', text: 'O jogo transforma a observação em uma regra fácil de experimentar. A pedra se mantém enquanto alguém olha para ela ou para sua imagem.', action: 'Apagar a lanterna na regra do jogo', id: 'myth-game' },
    real: { title: 'Chances que continuam fora de vista', text: 'Uma distribuição descreve os possíveis resultados. A ausência da imagem na tela não demonstra que o objeto deixou de existir. Virar a câmera preserva as chances nesta preparação.', action: 'Virar a câmera no exemplo físico', id: 'myth-real' }
  },
  tasks: s => [{ label: 'Experimentar a troca na regra ficcional', done: s.triedGame }, { label: 'Medir no exemplo físico', done: s.total > 0 }, { label: 'Virar a câmera e manter as probabilidades', done: s.triedAway }],
  complete: s => s.triedGame && s.total > 0 && s.triedAway,
  scene: {
    create: () => ({ mode: 'game', watch: 'direct', balance: .5, at: 0, last: null, away: false, elapsed: 0, total: 0, counts: [0, 0], triedGame: false, triedAway: false }),
    controls: s => [choice('mode', 'Regra da experiência', s.mode, [['game', 'Ficção · inspirada em Outer Wilds'], ['real', 'Modelo físico · duas posições']]), ...(s.mode === 'game' ? [choice('watch', 'Observação na regra ficcional', s.watch, [['direct', 'Lanterna e olhar direto'], ['photo', 'Olhar para a foto'], ['away', 'Olhar para outro lado']])] : [range('balance', 'Chance da posição B', s.balance * 100, 0, 100, 1, '%')]), button('step', s.mode === 'game' ? 'Experimentar a regra' : 'Medir uma posição', 'primary'), ...(s.mode === 'real' ? [button('turn', s.away ? 'Voltar a câmera' : 'Virar a câmera')] : [])],
    act(s, id, value, api) {
      if (id === 'mode') s.mode = value;
      if (id === 'balance') { s.balance = value / 100; s.total = 0; s.counts = [0, 0]; s.last = null; }
      if (id === 'watch') { s.watch = value; if (value === 'away') s.triedGame = true; }
      if (id === 'turn') { s.away = !s.away; if (s.mode === 'real') s.triedAway = true; }
      if (id === 'myth-game') { s.mode = 'game'; s.watch = 'away'; s.triedGame = true; s.at = 1 - s.at; emit(api, [s.at ? 1.5 : -1.5, 0, 0]); }
      if (id === 'myth-real') { s.mode = 'real'; s.away = true; s.triedAway = true; }
      if (id === 'step') {
        if (s.mode === 'game') { if (s.watch === 'away') { s.at = 1 - s.at; s.triedGame = true; } }
        else { s.last = measureQubit({ balance: s.balance }, 'z') > 0 ? 0 : 1; s.counts[s.last]++; s.total++; }
        emit(api, [(s.mode === 'game' ? s.at : s.last) ? 1.5 : -1.5, 0, 0]);
      }
    },
    tick(s, dt) { if (s.mode === 'game' && s.watch === 'away') { s.elapsed += dt; if (s.elapsed > 1.8) { s.at = 1 - s.at; s.elapsed = 0; s.triedGame = true; } } },
    describe: s => s.mode === 'game' ? ({ tag: 'Regra ficcional', stats: [status('Posição da pedra', s.at ? 'B' : 'A'), status('Observação', { direct: 'Direta', photo: 'Pela foto', away: 'Fora de vista' }[s.watch]), status('Regra', 'Ficcional')], accessible: `Regra ficcional. Pedra na posição ${s.at ? 'B' : 'A'}.` }) : ({ tag: 'Modelo físico', stats: [status('Posição A', pct(1 - s.balance)), status('Posição B', pct(s.balance)), status('Medições físicas', s.total)], sample: s.total ? `Na amostra de ${s.total}: A apareceu ${s.counts[0]} vezes e B, ${s.counts[1]}. Último registro: ${s.last ? 'B' : 'A'}.` : 'Faça uma medição para criar uma amostra.', accessible: `Posição A ${pct(1 - s.balance)} e B ${pct(s.balance)}. ${s.away ? 'Câmera voltada para outro lado.' : 'Câmera voltada para a cena.'}` }),
    draw(h, s, { layers }) {
      if (layers.grid) h.floor();
      for (const [i, x] of [[0, -1.5], [1, 1.5]]) {
        const p = i ? s.balance : 1 - s.balance;
        h.ring([x, -.7, 0], .75, `${BLUE}65`, 'xz', h.focus === 'positions');
        h.label(s.mode === 'real' ? `${i ? 'B' : 'A'} · ${pct(p)}` : i ? 'B' : 'A', [x, -1, 0], BLUE, 26);
        if (s.mode === 'real' && !s.away) { h.ctx.globalAlpha = .2 + p * .6; crystal(h, [x, 0, 0], .7, BLUE); h.ctx.globalAlpha = 1; }
      }
      if (s.mode === 'game') {
        crystal(h, [s.at ? 1.5 : -1.5, 0, 0], .9, GOLD);
        if (s.watch === 'direct' && layers.waves) h.beam([0, 1.4, 1.8], [s.at ? 1.5 : -1.5, 0, 0], GOLD);
        if (s.watch === 'photo') { h.text('Imagem observada', h.w / 2, h.h - 65, GOLD, 16); }
      } else if (s.last !== null && !s.away) h.dot([s.last ? 1.5 : -1.5, .25, 0], GOLD, 7);
      if (s.mode === 'real' && s.away) h.text('As probabilidades continuam disponíveis', h.w / 2, h.h * .48, INK, h.w < 400 ? 14 : 18);
    }
  }
};
