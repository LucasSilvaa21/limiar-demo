export const lightStory = [
  {
    id: 'ondas', label: 'Soma de ondas', kind: 'Uma analogia com água', duration: 22,
    title: 'Duas ondas se somam.',
    paragraphs: [
      'Imagine duas pedrinhas caindo na água. As ondas se cruzam. Em alguns lugares, o movimento aumenta. Em outros, diminui.',
      'A soma das ondas produz interferência. Vamos observar esse efeito no experimento com luz.'
    ],
    term: ['Interferência', 'É o efeito de somar ondas: elas podem se reforçar ou se cancelar.'],
    caption: 'As duas fontes criam um desenho que nenhuma delas faria sozinha.',
    limit: 'A água é uma analogia para a soma de ondas. Um fóton não é uma gota de água.',
    action: 'Repetir as ondas', actionId: 'replay', scene: 'water'
  },
  {
    id: 'um-clique', label: 'Um de cada vez', kind: 'Agora, um experimento com luz', duration: 22,
    title: 'Cada chegada deixa um registro.',
    paragraphs: [
      'A luz pode ser preparada em pequenas porções, chamadas fótons. Aqui, o aparelho recebe um de cada vez.',
      'Quando um fóton é detectado, aparece um único registro. Os pontos que você vê são essas chegadas.'
    ],
    term: ['Fóton', 'Uma porção de luz que pode ser emitida e detectada individualmente.'],
    caption: 'Um registro por tentativa. O brilho marca o instante da detecção.',
    limit: 'O ponto na saída representa um registro. A animação não mostra uma trajetória medida dentro do aparelho.',
    action: 'Enviar mais um fóton', actionId: 'emit', scene: 'single'
  },
  {
    id: 'possibilidades', label: 'Duas possibilidades', kind: 'O mesmo aparelho', duration: 26,
    title: 'O cálculo leva dois caminhos em conta.',
    paragraphs: [
      'O aparelho oferece dois caminhos possíveis. Para prever o resultado, precisamos considerar os dois juntos.',
      'Isso se chama superposição. As faixas de luz representam essas possibilidades.'
    ],
    term: ['Superposição', 'Uma combinação de possibilidades que podem participar juntas da previsão.'],
    caption: 'As duas faixas representam alternativas do mesmo estado preparado.',
    limit: 'As cores distinguem contribuições do cálculo. Elas não representam dois fótons nem pedaços de um fóton.',
    action: 'Rever a preparação', actionId: 'replay', scene: 'paths'
  },
  {
    id: 'recombinar', label: 'Reunir', kind: 'Recombinação dos caminhos', duration: 28,
    title: 'Recombinar os caminhos muda os registros.',
    paragraphs: [
      'As duas possibilidades voltam a se juntar. Como na ideia das ondas, elas reforçam uma saída e cancelam a outra.',
      'Nesta preparação ideal, todos os registros aparecem em A. É a interferência aparecendo no resultado de muitas tentativas.'
    ],
    term: ['Coerência', 'É a capacidade de manter interferência entre as possibilidades, nesta comparação.'],
    caption: 'Duas possibilidades no cálculo. Um único registro em cada tentativa.',
    limit: 'As porcentagens são previsões do modelo ideal para esta preparação e esta recombinação.',
    action: 'Enviar mais um fóton', actionId: 'emit', scene: 'paths'
  },
  {
    id: 'fase', label: 'Mudar a fase', kind: 'Mudamos uma coisa por vez', duration: 28,
    title: 'Um ajuste troca a saída favorecida.',
    paragraphs: [
      'Mudamos a posição de uma onda em relação à outra. Esse ajuste de fase muda a saída que recebe os registros, de A para B.',
      'A coerência permanece durante esse ajuste: as duas possibilidades ainda interferem.'
    ],
    term: ['Fase relativa', 'É a posição de um ciclo em relação ao outro.'],
    caption: 'Com a relação de fase invertida, a saída B recebe os registros.',
    limit: 'A ilustração de ondas representa amplitudes. Os resultados são calculados pelo mesmo modelo de dois estados.',
    action: 'Alterar a fase', actionId: 'phase', scene: 'paths'
  },
  {
    id: 'ambiente', label: 'Deixar uma pista', kind: 'Contato em câmera lenta', duration: 30,
    title: 'Uma pista no ambiente reduz a interferência.',
    paragraphs: [
      'A luz interage com o ambiente, que passa a guardar pistas sobre os caminhos. A interferência vai enfraquecendo.',
      'As duas saídas passam a receber registros. Essa perda de coerência causada pelo ambiente se chama decoerência.'
    ],
    term: ['Decoerência', 'É a redução da interferência observável quando o sistema se correlaciona com o ambiente.'],
    caption: 'O contato leva informação para o ambiente. O contraste entre as saídas diminui.',
    limit: 'Neste canal, as chances diretas dos caminhos continuam em 50/50. Não simulamos troca de energia.',
    action: 'Isolar agora', actionId: 'isolate', scene: 'environment'
  },
  {
    id: 'isolar', label: 'Proteger', kind: 'Ainda é o mesmo sistema', duration: 26,
    title: 'Isolar mantém a coerência restante.',
    paragraphs: [
      'Protegemos o sistema de novos contatos. Neste modelo, a coerência que ainda resta deixa de diminuir.',
      'O isolamento não devolve a coerência já perdida. O aparelho conserva o estado em que estava quando foi isolado.'
    ],
    term: ['Isolamento', 'Proteger o sistema para interromper novas perdas de coerência.'],
    caption: 'A interferência restante se mantém. A perda anterior continua visível.',
    limit: 'Esta é uma idealização de isolamento perfeito. Sistemas reais podem ter outros canais de interação.',
    action: 'Preparar outra vez', actionId: 'prepare', scene: 'protected'
  },
  {
    id: 'preparar', label: 'Começar de novo', kind: 'Uma nova preparação', duration: 28,
    title: 'Uma nova preparação recomeça a experiência.',
    paragraphs: [
      'Preparamos outro sistema com a mesma relação entre as possibilidades. A interferência volta a aparecer.',
      'Superposição, fase, coerência e decoerência descrevem partes do mesmo fenômeno: preparar o sistema, recombinar as contribuições e observar o efeito do ambiente.'
    ],
    term: ['Preparar de novo', 'É iniciar um novo ensaio. O botão não reverte as interações sofridas pelo sistema anterior.'],
    caption: 'Uma nova preparação coerente. Novos fótons e novos registros.',
    limit: 'A recuperação mostrada vem de uma nova preparação, sem reversão do canal de decoerência.',
    action: 'Rever desde o começo', actionId: 'restart', scene: 'paths'
  }
];

export const pairStory = [
  {
    id: 'separados', label: 'Cada lado', title: 'Cada lado, sozinho, dá um resultado ao acaso.',
    text: 'Os aparelhos escolhem como medir a orientação da luz. Por isso se chamam analisadores. Cada um registra uma de duas respostas. Olhando só um lado, as duas têm a mesma chance.',
    note: 'Os sinais + e − são resultados da medição. Azul e rosa apenas os identificam.', action: 'Comparar os registros', actionId: 'compare', angleA: 0, angleB: 0
  },
  {
    id: 'juntos', label: 'Comparar', title: 'A relação aparece nos registros reunidos.',
    text: 'A correlação descreve a relação entre os registros. Com estes ajustes iguais, os resultados do par entrelaçado sempre coincidem. Cada registro é produzido na medição.',
    note: 'Respostas iguais em um único ajuste também podem ocorrer em preparações clássicas.', action: 'Mudar a comparação', actionId: 'contrast', angleA: 0, angleB: 0
  },
  {
    id: 'outras-medidas', label: 'Outro ajuste', title: 'O ângulo de cada aparelho muda os resultados conjuntos.',
    text: 'Giramos os dois aparelhos para 45 graus. O par entrelaçado continua dando respostas iguais. Em uma mistura de comparação, elas coincidem em metade das tentativas, em média.',
    note: 'A mistura de comparação é uma preparação diferente do par entrelaçado: metade dos pares em polarização horizontal e metade em vertical.', action: 'Ver a mistura', actionId: 'mixture', angleA: 45, angleB: 45
  },
  {
    id: 'sem-recado', label: 'Sem recado', title: 'Girar B não envia uma mensagem para A.',
    text: 'Voltamos ao par entrelaçado. Mude o aparelho B. A relação entre os registros muda. Em A, cada resposta continua tendo 50% de chance. Para ver a relação, precisamos reunir os registros, por exemplo enviando os dados por um cabo.',
    note: 'As linhas de comparação unem registros já produzidos. Não representam sinais entre os fótons.', action: 'Girar B outra vez', actionId: 'rotate', angleA: 45, angleB: 135
  }
];

export const references = [
  { title: 'The Feynman Lectures on Physics, Volume III: Quantum Mechanics, Chapter 1: Quantum Behavior', author: 'Richard P. Feynman, Robert B. Leighton e Matthew Sands · Caltech / Addison-Wesley, 1965', url: 'https://www.feynmanlectures.caltech.edu/III_01.html' },
  { title: 'Practical implementation of a test of event-based corpuscular model as an alternative to quantum mechanics', author: 'Sergey V. Polyakov e colaboradores · Foundations of Physics / NIST, 2013', url: 'https://www.nist.gov/publications/practical-implementation-test-event-based-corpuscular-model-alternative-quantum' },
  { title: 'Quantum Decoherence', author: 'Maximilian Schlosshauer · Physics Reports 831, 1-57, 2019', url: 'https://arxiv.org/abs/1911.06282' },
  { title: 'Decoherence, the measurement problem, and interpretations of quantum mechanics', author: 'Maximilian Schlosshauer · Reviews of Modern Physics 76, 1267-1305; publicado em 2005', url: 'https://arxiv.org/abs/quant-ph/0312059' },
  { title: 'How entanglement has become a powerful tool', author: 'Academia Real Sueca de Ciências, 2022 · Nobel concedido a Alain Aspect, John Clauser e Anton Zeilinger', url: 'https://www.nobelprize.org/prizes/physics/2022/popular-information/' },
  { title: 'Implicit scaffolding in interactive simulations: Design strategies to support multiple educational goals', author: 'Noah S. Podolefsky, Emily B. Moore e Katherine K. Perkins · University of Colorado Boulder, 2014, arXiv:1306.6544v3', url: 'https://arxiv.org/abs/1306.6544v3' }
];
