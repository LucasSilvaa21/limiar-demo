export const chapters = [
  {
    slug: 'um-qubit', name: 'Um qubit', summary: 'Prepare, meça e explore a fase.',
    invitation: 'Prepare um estado e veja os resultados das medições.',
    steps: ['Preparar', 'Medir', 'Fase', 'Duas leituras'],
    descriptions: [
      ['Um qubit é um sistema quântico com dois resultados possíveis nesta medição: 0 e 1. A superposição combina essas possibilidades. O controle ajusta a chance de cada resultado.'],
      ['Cada clique prepara um novo sistema do mesmo jeito e faz uma medição. Um único resultado pode variar; com muitas tentativas, as frequências se aproximam das probabilidades.', 'Escolha como medir. Na medição direta aparecem 0 e 1. A medição recombinada, chamada base X, revela a interferência entre as possibilidades e produz + ou −.'],
      ['Fase é a posição relativa dos ciclos das amplitudes, os números que descrevem o estado. Ao recombinar as possibilidades, a fase altera as chances dos resultados + e −.', 'A mistura de comparação tem as mesmas chances de 0 e 1, mas não apresenta interferência nessa base. Ative a comparação e gire a fase para observar a diferença.'],
      ['Uma medição produz um registro. As interpretações da mecânica quântica discutem como descrever a relação entre esse registro e o estado preparado.', 'Os dois painéis abaixo acompanham a mesma preparação e as mesmas probabilidades. As diferenças estão na interpretação do processo.']
    ],
    see: 'As barras mostram probabilidades calculadas para a preparação atual. O histograma conta resultados de sistemas novos, todos preparados do mesmo jeito. A nuvem de luz representa o estado de forma artística.',
    why: 'Na medição direta, a chance de 1 é o valor escolhido na preparação. A medição recombinada combina amplitudes e permite observar a fase. Coerência descreve a capacidade dessas contribuições de interferir, em relação à base escolhida.',
    equation: 'P(0) = 1 − p     P(1) = p\nP(+) = ½ + c√[p(1−p)] cos φ',
    limit: 'A base de referência é {0, 1}. A mistura conserva p e remove os termos fora da diagonal da matriz. As medições usam sistemas recém-preparados; o estado após uma medição não é reutilizado. As nuvens não representam a posição de uma partícula.',
    reference: 'https://arxiv.org/abs/1311.0275', author: 'Baumgratz, Cramer e Plenio · Coerência · 2014'
  },
  {
    slug: 'o-ambiente', name: 'O ambiente', summary: 'Acompanhe a perda de interferência.',
    invitation: 'Ajuste o contato com o ambiente e observe a coerência restante.',
    steps: ['Contato', 'Isolar', 'Mito e física'],
    descriptions: [
      ['O ambiente inclui a luz e a matéria que interagem com o sistema. Essas interações podem reduzir a interferência que conseguimos observar. Esse processo se chama decoerência.', 'Ajuste o contato. A coerência diminui, enquanto as chances de 0 e 1 continuam iguais. A medição recombinada mostra a interferência restante.'],
      ['Isole o sistema durante o ensaio. A perda para nesse instante, e o gráfico passa a seguir na horizontal.', 'A coerência que já se perdeu permanece perdida neste modelo. “Preparar de novo” inicia outro ensaio com um estado coerente. Use a pausa e avance em passos de 0,1 segundo para acompanhar a mudança.'],
      ['Na física, observar envolve uma interação capaz de deixar um registro. O modelo desta sala descreve a interação com o ambiente sem incluir consciência humana.', 'A decoerência explica a redução da interferência observável. A discussão sobre como um único resultado aparece na medição exige outras considerações.']
    ],
    see: 'O indicador acompanha a coerência restante. As chances de 0 e 1 continuam em 50%. O vetor da esfera de Bloch encurta, e as faixas de interferência perdem contraste.',
    why: 'O sistema fica correlacionado com o ambiente. Quando descrevemos apenas o sistema, os termos responsáveis pela interferência diminuem. Isolar depois preserva o que resta, sem recuperar a coerência anterior.',
    equation: 'c(t + Δt) = c(t) exp(−γΔt)\nγ = 0,65 × contato     P(0) = P(1) = ½',
    limit: 'Canal efetivo de desfasamento puro, com tempo em segundos de simulação. Não há troca de população ou relaxação de energia. O desenho do ambiente é simbólico; seus componentes individuais não são simulados. Decoerência, por si só, não seleciona um resultado único.',
    reference: 'https://arxiv.org/abs/quant-ph/0105127', author: 'Zurek · Decoerência e ambiente · 2003'
  },
  {
    slug: 'dois-qubits', name: 'Dois qubits', summary: 'Meça pares e compare as correlações.',
    invitation: 'Gire os dois analisadores e compare os resultados do par.',
    steps: ['O par', 'Ângulos', 'Comparar', 'Teste de Bell'],
    descriptions: [
      ['Dois qubits podem compartilhar um estado que exige descrever o par inteiro. Essa relação se chama entrelaçamento. Cada lado, sozinho, tem dois resultados com chances iguais neste estado.', 'Um analisador é o aparelho que define como medir a polarização. Ajuste os ângulos de A e B e meça alguns pares. As quatro barras mostram as combinações possíveis.'],
      ['Cada analisador mede em uma direção escolhida. Com A e B no mesmo ângulo, o par entrelaçado produz resultados iguais neste modelo.', 'Experimente as configurações prontas ou ajuste os dois ângulos. Cada mudança inicia outra contagem. O desenho dos aparelhos acompanha os ângulos escolhidos.'],
      ['A correlação indica se os resultados tendem a ser iguais ou diferentes: +1 significa sempre iguais; −1, sempre diferentes; 0, nenhuma tendência entre essas opções.', 'A mistura de comparação prepara metade dos pares em HH e metade em VV, duas polarizações de referência. Com A e B em 45°, o par entrelaçado sempre dá resultados iguais; essa mistura dá igualdade em metade das tentativas.'],
      ['O teste de Bell reúne quatro correlações em um número, chamado S. A combinação usada aqui se chama CHSH. Ele compara modelos em que cada lado responde ao próprio aparelho, usando informações compartilhadas na preparação.', 'Com escolhas dos aparelhos independentes dessas informações, esses modelos locais obedecem ao limite 2. Cada clique mede mais 100 pares por configuração. A amostra simulada flutua e usa o modelo escolhido; ela não substitui um experimento físico.']
    ],
    see: 'As contagens registram ++, +−, −+ e −−. Os fios da cena são uma metáfora do estado conjunto. As barras e a curva usam as probabilidades do modelo.',
    why: 'No estado de Bell Φ+, a correlação depende da diferença entre os ângulos dos analisadores. A mistura escolhida concorda em algumas configurações e difere em outras. Em ambos os casos, cada lado isolado continua em 50/50.',
    equation: 'E(a,b) = cos[2(a−b)]\nP(++) = P(−−) = (1+E)/4\nP(+−) = P(−+) = (1−E)/4',
    limit: 'Pares ideais recém-preparados, com polarização linear. A mistura de comparação é ½HH + ½VV, um exemplo específico de estado separável. Os fios e brilhos simultâneos não representam um sinal. O modelo não permite transmitir mensagens escolhendo resultados.',
    reference: 'https://arxiv.org/abs/quant-ph/0702225', author: 'Horodecki e colaboradores · Entrelaçamento · 2009'
  }
];
