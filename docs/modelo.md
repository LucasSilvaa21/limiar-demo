# Modelos da exposição

A entrada visual usa os modelos preservados em `src/quantum.js`. `src/exhibition/model.js` organiza preparações e registros sem modificar essas funções. Os 12 testes originais permanecem intactos.

## Um aparelho, duas possibilidades

O exemplo usa a base dos caminhos {|0>, |1>}, com população p = 1/2. A matriz usada pelo modelo é:

```text
ρ = [ 1-p                 c√(p(1-p)) exp(-iφ) ]
    [ c√(p(1-p)) exp(iφ)  p                  ]
```

O fator c pertence ao intervalo de zero a um. A fase relativa é φ. Na base fixa dos caminhos, as probabilidades continuam em 1/2. Na recombinação escolhida, equivalente à medição X do modelo:

```text
P(A) = [1 + c cos(φ)]/2
P(B) = 1 - P(A)
```

Com c = 1 e φ = 0, A é certo. Com φ = π, B é certo. Ambas as preparações são coerentes. Com c = 0, as chances recombinadas são 1/2 para qualquer fase. A pureza e a positividade seguem as propriedades da matriz original.

A medição usa `measureQubit` e a regra de Born. Cada tentativa corresponde a uma nova preparação equivalente. As faixas coloridas desenham contribuições do cálculo; não afirmam que um fóton se divide em pedaços ou percorre uma trajetória individual observada.

## Contato, isolamento e nova preparação

A exposição aplica o mesmo canal de desfasamento puro:

```text
c(t+dt) = c(t) exp(-γ dt)
γ = 0,65 por segundo de simulação durante o contato
```

A fase escolhida é preservada ao adicionar contato, isolar e preparar novamente. As populações continuam em 1/2. Isolar zera a taxa de novas perdas e mantém o c restante. Uma nova preparação cria outro estado, com c = 1 e amostra vazia; não reverte o canal aplicado ao anterior.

Ao abrir diretamente a cena de isolamento, a visita usa c = 0,25 como estado de exemplo. Vindo da cena do ambiente, conserva o valor efetivamente alcançado. Com o movimento já pausado, a cena do ambiente começa em um quadro calculado após dois segundos de contato. Avançar um instante aplica mais um segundo. Esses quadros seguem as mesmas funções matemáticas.

Na passagem do ambiente, o desenho usa câmera lenta: cada segundo de tela avança 0,05 segundo de simulação. Os efeitos luminosos têm seu próprio relógio; o canal conserva a mesma taxa matemática. Durante o contato contínuo, as chances instantâneas mudam. A contagem é o total de registros já produzidos ao longo da cena, e não uma estimativa de uma preparação estacionária única.

O canal é efetivo e markoviano. Não modela os graus de liberdade microscópicos do ambiente, relaxação de energia ou recuperação espontânea. A perda local de interferência não resolve, por si só, o problema de um resultado único de medição.

## Dois sistemas

O estado conjunto é Φ+ = (|HH> + |VV>)/√2. Os analisadores medem polarização linear nos ângulos a e b:

```text
E(a,b) = cos[2(a-b)]
P(++) = P(--) = (1+E)/4
P(+-) = P(-+) = (1-E)/4
```

As duas marginais são 1/2, independentemente da escolha do outro analisador. O navegador sorteia a distribuição conjunta com `measurePair`; isso não descreve um sinal físico entre as partículas.

A mistura de comparação prepara 50% HH e 50% VV, com E(a,b) = cos(2a) cos(2b). É uma mistura separável concreta, não uma descrição de todas as correlações clássicas. Os dois modelos concordam em 0°/0° e diferem em 45°/45°. As cenas guardam contagens e registros reais dos sorteios; os registros mais recentes são desenhados sem alterar os totais.

## Quatro configurações de Bell

O aprofundamento mantém contagens próprias em a = 0°, a' = 45°, b = 22,5° e b' = -22,5°. Usa `sampleBellBatch` e `bellReport` preservados. O modelo prevê S = 2√2 para o par e S = √2 para esta mistura.

As amostras finitas podem ultrapassar a previsão por flutuação. Uma simulação no navegador não equivale a um experimento que fecha as brechas de um teste de Bell.

## Modelos e desenhos

A superfície de água é uma analogia visual da soma de ondas circulares. O campo da abertura é uma obra procedural. Essas camadas não geram as probabilidades das detecções. O modelo espacial de dois pacotes gaussianos em `src/physics.js` também foi conservado, junto com seus testes, mas não é o aparelho mostrado nesta visita.
