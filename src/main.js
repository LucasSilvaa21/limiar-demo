import { chapters } from './chapters.js';
import { qubit, measureQubit, measurePair, chsh } from './quantum.js';
import { probabilities, densityMatrix } from './representations.js';
import { FieldRenderer } from './renderer.js';
import { DiagramRenderer } from './views.js';
import { Soundscape } from './audio.js';
import { environmentReadout, advanceEnvironment, recordEnvironment, pairReadout, pairDensityMatrix, emptyBellCounts, sampleBellBatch, bellReport } from './experiments.js';

const $ = id => document.getElementById(id);
const pct = n => `${(n * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
const dec = n => n.toLocaleString('pt-BR', { maximumFractionDigits: 3 });
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const mobile = matchMedia('(max-width: 900px)');
let userReducedMotion = false;
const reducedMotion = () => motion.matches || userReducedMotion;
const fresh = chapter => ({ chapter: [0, 2, 3][chapter], balance: .5, phase: 0, coherence: 1, contact: .2, isolated: false, elapsed: 0, history: [[0, 1]], events: [{ time: 0, coherence: 1, label: 'Estado preparado' }], angleA: 0, angleB: 0, classical: false, mixture: false, counts: [0, 0, 0, 0], bellCounts: emptyBellCounts(), total: 0, last: null, basis: 'z', step: 0, view: 'light', compare: false });
const rooms = chapters.map((_, i) => fresh(i));
const visited = new Set();
let chapterIndex = 0;
let state = rooms[0];
let paused = motion.matches;
let contemplating = false;
let streaming = false;
let speed = 1;
let previous = 0;
let emission = 0;
let readoutTime = 0;
let pointer;
let field;
let detail = 'essential';
let pattern = '1d';
const layers = { vector: true, projections: true, grid: true, axes: true, trajectories: true };
const sound = new Soundscape();
const diagram = new DiagramRenderer($('diagram'));
try { field = new FieldRenderer($('field'), $('traces'), motion.matches); }
catch { $('fallback').hidden = false; }
$('field').addEventListener('renderstatus', event => {
  $('fallback').hidden = event.detail || state.view !== 'light';
  if (event.detail && state.view === 'light') requestAnimationFrame(() => drawStatic());
});

function clearMeasurements() {
  state.counts = [0, 0, 0, 0]; state.total = 0; state.last = null;
  if (field) field.events = [];
}

function stopSequence() {
  streaming = false; emission = 0;
  $('sequence').textContent = state.chapter === 2 ? (state.isolated ? 'Retomar contato' : 'Isolar agora') : reducedMotion() ? 'Medir 32 vezes' : 'Medir vários';
  $('sequence').setAttribute('aria-pressed', String(state.chapter === 2 && state.isolated));
}

function labels() { return state.chapter === 3 ? ['++', '+−', '−+', '−−'] : state.basis === 'z' ? ['0', '1'] : ['+', '−']; }
function preparedState() { return { ...state, coherence: state.mixture ? 0 : state.coherence, classical: state.mixture }; }

function renderMetrics(announce = false) {
  const values = probabilities(preparedState(), state.basis);
  const names = labels();
  if ($('probability-bars').children.length !== values.length) {
    $('probability-bars').replaceChildren(...values.map(() => {
      const item = document.createElement('div'); item.className = 'probability-item';
      item.innerHTML = '<div class="bar-heading"><span></span><strong></strong></div><div class="probability-track"><i></i></div>';
      return item;
    }));
  }
  [...$('probability-bars').children].forEach((item, i) => {
    item.querySelector('span').textContent = `Resultado ${names[i]}`;
    item.querySelector('strong').textContent = pct(values[i]);
    item.querySelector('i').style.width = pct(values[i]);
  });
  const basisText = state.chapter === 3 ? 'Medição do par' : state.basis === 'z' ? 'Medição direta' : `Recombinada · base ${state.basis.toUpperCase()}`;
  $('readout-basis').textContent = basisText; $('path-basis').textContent = basisText;
  $('last-outcome').textContent = state.last === null ? 'Aguardando resultado' : `Registro: ${state.chapter === 3 ? names[state.last.bin] : state.last > 0 ? names[0] : names[1]}`;
  $('shared-probabilities').textContent = values.map((p, i) => `${names[i]}: ${pct(p)}`).join(' · ');
  $('comparison-readout').hidden = !state.compare;
  if (state.compare) {
    const comparison = probabilities({ ...state, coherence: 0, classical: true }, state.basis);
    const original = probabilities({ ...state, coherence: 1, classical: false }, state.basis);
    $('comparison-readout').textContent = `Estado ${state.chapter === 3 ? 'entrelaçado' : 'coerente'} (verde): ${original.map((p, i) => `${names[i]} ${pct(p)}`).join(' · ')}. Mistura (dourado): ${comparison.map((p, i) => `${names[i]} ${pct(p)}`).join(' · ')}. As contagens registram ${state.mixture ? 'a mistura' : 'o estado preparado'}.`;
  }
  const rho = qubit(preparedState());
  const matrix = state.chapter === 3 ? pairDensityMatrix(state.mixture).flat().map(value => [value, 0]) : densityMatrix(preparedState());
  $('density-matrix').style.gridTemplateColumns = `repeat(${state.chapter === 3 ? 4 : 2}, minmax(0, 1fr))`;
  $('density-matrix').replaceChildren(...matrix.map(([re, im]) => {
    const item = document.createElement('span');
    item.textContent = Math.abs(im) < .0005 ? dec(re) : `${dec(re)} ${im < 0 ? '−' : '+'} ${dec(Math.abs(im))}i`;
    return item;
  }));
  $('technical-readout').textContent = state.chapter === 3 ? `A = ${dec(state.angleA)}°  B = ${dec(state.angleB)}°\nS ideal = ${dec(chsh())}` : `x = ${dec(rho.x)}  y = ${dec(rho.y)}\nz = ${dec(rho.z)}\nC = ${dec(rho.l1)}  Tr(ρ²) = ${dec(rho.purity)}`;
  if (state.chapter === 3) {
    const pair = pairReadout(preparedState());
    $('pair-local-a').textContent = pct(pair.aPlus); $('pair-local-b').textContent = pct(pair.bPlus);
    $('pair-equal').textContent = pct(pair.same);
    $('pair-correlation').textContent = `Correlação prevista: ${dec(pair.expected)} · observada: ${pair.observed === null ? 'sem dados' : dec(pair.observed)}`;
    $('pair-frequencies').hidden = !pair.total;
    if (pair.total) $('pair-frequencies').textContent = `Frequência de + na amostra: A ${pct(pair.observedA)} · B ${pct(pair.observedB)}`;
    $('technical-readout').textContent = `A = ${dec(state.angleA)}°  B = ${dec(state.angleB)}°\nE = ${dec(pair.expected)}\nS previsto = ${dec(chsh(state.mixture))}`;
    $('equation').textContent = state.mixture ? 'ρ = ½|HH⟩⟨HH| + ½|VV⟩⟨VV|\nE(a,b) = cos(2a) cos(2b)\nP(++) = P(−−) = (1+E)/4\nP(+−) = P(−+) = (1−E)/4' : chapters[2].equation;
  }
  if (state.chapter === 2) {
    const environment = environmentReadout(state);
    $('environment-coherence').textContent = pct(environment.coherence);
    $('environment-plus').textContent = pct(environment.plus);
    $('environment-contact').textContent = environment.rate === 0 ? 'Sistema isolado. A coerência restante é preservada.' : `Contato em ${pct(state.contact)}. A coerência diminui com o tempo.`;
    $('technical-readout').textContent += `\nγ = ${dec(environment.rate)} s⁻¹\nt = ${dec(state.elapsed)} s`;
    $('motion-status').textContent = `${dec(state.elapsed)} s · coerência ${pct(rho.l1)}`;
    if (announce) $('measurement-status').textContent = `Coerência restante: ${pct(rho.l1)}. Populações: 50% e 50%.`;
  } else {
    $('motion-status').textContent = reducedMotion() ? 'Movimento reduzido ativo' : paused ? 'Simulação pausada' : 'Tempo da simulação';
    const noun = state.chapter === 3 ? (state.total === 1 ? 'par' : 'pares') : (state.total === 1 ? 'medição' : 'medições');
    if (announce) $('measurement-status').textContent = state.total ? `${state.total.toLocaleString('pt-BR')} ${noun} · ${names.map((name, i) => `${name}: ${state.counts[i]}`).join(' · ')}` : 'Nenhuma medição ainda. Cada tentativa prepara um novo sistema.';
  }
  const context = state.chapter === 2 ? `Coerência restante ${pct(rho.l1)} em ${dec(state.elapsed)} segundos. Chance de + ao recombinar ${pct(environmentReadout(state).plus)}.` : state.chapter === 3 ? `Analisador A ${dec(state.angleA)} graus e B ${dec(state.angleB)} graus. Correlação prevista ${dec(pairReadout(preparedState()).expected)}.` : `Coerência ${pct(rho.l1)}. Fase ${dec(state.phase * 180 / Math.PI)} graus.`;
  $('diagram').setAttribute('aria-label', `${$('view-title').textContent}. ${context} ${values.map((p, i) => `${names[i]}: ${pct(p)}`).join(', ')}. ${state.total} registros.`);
}

function renderEnvironmentEvents() {
  if (state.chapter !== 2) return;
  $('environment-events').replaceChildren(...state.events.slice(-6).map(event => {
    const item = document.createElement('li');
    const time = document.createElement('span'); time.textContent = `${dec(event.time)} s`;
    const label = document.createElement('span'); label.textContent = `${event.label} · ${pct(event.coherence)}`;
    item.append(time, label); return item;
  }));
}

function renderBell() {
  if (state.chapter !== 3) return;
  const report = bellReport(state.bellCounts, state.mixture);
  $('bell-rows').replaceChildren(...report.rows.map(row => {
    const tr = document.createElement('tr');
    for (const text of [`${dec(row.angleA)}° / ${dec(row.angleB)}°`, dec(row.expected), row.observed === null ? 'Sem dados' : dec(row.observed), row.total.toLocaleString('pt-BR')]) {
      const cell = document.createElement(tr.children.length ? 'td' : 'th');
      if (!tr.children.length) cell.scope = 'row';
      cell.textContent = text; tr.append(cell);
    }
    return tr;
  }));
  $('bell-expected').textContent = dec(report.expected);
  $('bell-observed').textContent = report.observed === null ? 'Sem dados' : dec(report.observed);
  $('bell-status').textContent = `${report.total.toLocaleString('pt-BR')} pares na amostra · ${state.mixture ? 'mistura HH/VV' : 'par entrelaçado'}.`;
  $('bell-sample').disabled = report.rows.some(row => row.total >= 10000);
}

function syncInputs() {
  for (const [id, value] of [['balance', state.balance * 100], ['phase', state.phase * 180 / Math.PI], ['contact', state.contact * 100], ['angle-a', state.angleA], ['angle-b', state.angleB]]) {
    $(id).value = value;
    $(id).style.setProperty('--progress', `${value / Number($(id).max) * 100}%`);
    $(`${id}-value`).textContent = id === 'balance' || id === 'contact' ? pct(value / 100) : `${dec(value)}°`;
  }
  $('basis').value = state.basis; $('compare').checked = state.compare; $('sample-mixture').checked = state.mixture;
}

function setView(view) {
  state.view = view;
  const pair = state.chapter === 3;
  const environment = state.chapter === 2;
  const texts = {
    light: ['Representação artística', pair ? 'O estado do par' : 'O estado preparado', 'A luz acompanha a preparação. As probabilidades estão nas barras abaixo.'],
    bloch: ['Representação do estado', 'A esfera de Bloch', 'Uma seta dentro de uma esfera representa a preparação, a fase e a coerência de um qubit.'],
    interference: ['Fase e interferência', pattern === '2d' ? 'O padrão de dois pacotes' : 'Como a fase altera a medição', pattern === '2d' ? 'Um modelo espacial ilustrativo, separado das medições do qubit.' : 'A curva mostra a chance de + para cada fase. O ponto marca a fase atual.'],
    results: ['Previsão e contagem', 'Os resultados acumulados', 'Compare as probabilidades com as frequências das medições.'],
    correlation: ['Previsão do modelo', 'A correlação entre os lados', 'A curva varia o ângulo de B e mantém o ângulo de A escolhido.'],
    history: ['Histórico do ensaio', 'A coerência ao longo do tempo', 'A curva registra as mudanças de contato e os períodos de isolamento.'],
    matrix: ['Representação do estado', pair ? 'A matriz do par' : 'A matriz de densidade', pair ? 'O estado conjunto na base HH, HV, VH e VV. Os termos fora da diagonal distinguem o par de sua mistura.' : 'A diagonal reúne as populações. Os outros dois valores acompanham a interferência.'],
    apparatus: ['Diagrama de preparação e medição', 'Os dois analisadores', 'Cada lado mede uma polarização. As linhas ilustram o percurso dos feixes.']
  };
  const [kicker, title, description] = texts[view];
  $('view-kicker').textContent = kicker; $('view-title').textContent = title; $('view-description').textContent = description;
  for (const id of ['field', 'traces']) $(id).hidden = view !== 'light';
  if (view === 'light') field?.resize();
  $('diagram').hidden = view === 'light';
  $('fallback').hidden = Boolean(field) || view !== 'light';
  $('interference-tools').hidden = view !== 'interference';
  $('view-tools').hidden = view !== 'light' && view !== 'bloch';
  $('scene-hint').hidden = view !== 'light' && view !== 'bloch';
  $('technical-readout').hidden = detail !== 'technical';
  document.querySelectorAll('[data-view]').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.view === view));
    const name = button.dataset.view;
    button.hidden = pair && (name === 'bloch' || name === 'interference');
    if (name === 'correlation') button.hidden = !pair;
    if (name === 'history') button.hidden = !environment;
    if (name === 'apparatus') button.hidden = !pair;
    if (name === 'results') button.hidden = environment;
  });
  $('layers').hidden = view === 'results' || view === 'matrix';
  const applicable = view === 'light' ? (pair ? ['axes', 'trajectories'] : ['grid', 'trajectories']) : view === 'apparatus' ? ['axes', 'trajectories'] : view === 'bloch' ? ['vector', 'projections', 'grid', 'axes'] : view === 'interference' ? ['vector', 'grid', 'axes'] : ['grid', 'axes'];
  document.querySelectorAll('[data-layer]').forEach(input => { input.parentElement.hidden = !applicable.includes(input.dataset.layer); });
  $('scene').dataset.view = view;
  $('scene').setAttribute('aria-label', `${title}. ${description}`);
  if (environment) $('readout-title').textContent = 'Populações preservadas';
  else $('readout-title').textContent = 'Probabilidades previstas';
  drawStatic();
}

function renderStep() {
  const chapter = chapters[chapterIndex];
  $('step-list').replaceChildren(...chapter.steps.map((label, i) => {
    const button = document.createElement('button'); button.textContent = label;
    if (i === state.step) button.setAttribute('aria-current', 'step');
    button.addEventListener('click', () => selectStep(i)); return button;
  }));
  $('chapter-description').replaceChildren(...chapter.descriptions[state.step].map(text => {
    const p = document.createElement('p'); p.textContent = text; return p;
  }));
  $('balance-wrap').hidden = chapterIndex !== 0;
  $('phase-wrap').hidden = chapterIndex !== 0 || state.step < 2;
  $('contact-wrap').hidden = chapterIndex !== 1;
  $('environment-status').hidden = chapterIndex !== 1;
  $('environment-log').hidden = chapterIndex !== 1;
  $('angles-wrap').hidden = chapterIndex !== 2;
  $('pair-presets').hidden = chapterIndex !== 2;
  $('pair-readout').hidden = chapterIndex !== 2;
  $('bell-experiment').hidden = chapterIndex !== 2 || state.step !== 3;
  $('basis-wrap').hidden = chapterIndex !== 0 || state.step === 0;
  $('compare-wrap').hidden = chapterIndex === 1 || chapterIndex === 0 && state.step < 1;
  $('compare-help').hidden = $('compare-wrap').hidden;
  $('sample-mixture-wrap').hidden = !state.compare || $('compare-wrap').hidden;
  $('compare-label').textContent = chapterIndex === 2 ? 'Comparar com a mistura HH e VV' : 'Comparar com a mistura';
  $('compare-help').textContent = chapterIndex === 2 ? 'Mudar o modelo de medição inicia novas contagens, incluindo a amostra de Bell.' : 'A mistura mantém a preparação e remove a interferência.';
  $('interpretations').hidden = chapterIndex !== 0 || state.step !== 3;
  $('myth').hidden = chapterIndex !== 1 || state.step !== 2;
  $('measure').textContent = chapterIndex === 1 ? 'Preparar de novo' : chapterIndex === 2 ? 'Medir um par' : 'Medir uma vez';
  $('clear').hidden = chapterIndex === 1;
  $('next-label').textContent = chapter.steps[state.step + 1] || chapters[(chapterIndex + 1) % 3].name;
  syncInputs(); setView(state.view); renderMetrics(true); renderEnvironmentEvents(); renderBell();
}

function selectStep(index) {
  stopSequence(); state.step = index;
  if (chapterIndex === 0 && index === 0 && state.mixture) { state.mixture = false; clearMeasurements(); }
  if (chapterIndex === 0 && index === 0 && state.basis !== 'z') { state.basis = 'z'; clearMeasurements(); }
  if (chapterIndex === 0 && index === 2 && state.basis !== 'x') { state.basis = 'x'; clearMeasurements(); }
  if (chapterIndex === 1 && index === 1) state.view = 'history';
  if (chapterIndex === 2 && index === 1) state.view = 'apparatus';
  if (chapterIndex === 2 && index >= 2) { state.view = 'correlation'; state.compare = true; }
  renderStep();
  $('step-list').children[index]?.focus({ preventScroll: true });
}

function navigate(index, focus = true) {
  stopSequence(); chapterIndex = index; state = rooms[index]; stopSequence(); visited.add(index);
  const chapter = chapters[index];
  $('chapter-number').textContent = `Capítulo 0${index + 1} / 03`;
  $('chapter-title').textContent = chapter.name; $('invitation').textContent = chapter.invitation;
  $('mobile-chapter').textContent = `${index + 1} de 3`;
  for (const [id, text] of [['see-text', chapter.see], ['why-text', chapter.why], ['equation', chapter.equation], ['model-limit', chapter.limit]]) $(id).textContent = text;
  $('reference').href = chapter.reference; $('reference').textContent = `${chapter.author} ↗`;
  $('density-wrap').hidden = false; $('bell-details').hidden = index !== 2;
  $('density-wrap').querySelector('h3').textContent = index === 2 ? 'Matriz do par · HH, HV, VH, VV' : 'Matriz de densidade';
  $('density-wrap').querySelector('p').textContent = index === 2 ? 'A matriz descreve o par inteiro na base de polarizações HH, HV, VH e VV. Cada lado, visto isoladamente, tem a matriz diagonal (½, ½), tanto no par quanto na mistura.' : 'Esta tabela reúne as populações na diagonal e os termos de interferência fora dela. A letra i indica a parte imaginária de um número complexo.';
  $('bell-details').textContent = `CHSH compara quatro pares de ângulos fixos: (0°, 22,5°), (0°, −22,5°), (45°, 22,5°), (45°, −22,5°). Previsão do par: S = ${dec(chsh())}; da mistura: ${dec(chsh(true))}. Limite de modelos locais: 2. São previsões teóricas, sem estimativa experimental nesta contagem.`;
  document.querySelectorAll('[data-chapter]').forEach(link => {
    const i = Number(link.dataset.chapter);
    if (i === index) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
    link.querySelector('.visit-status').textContent = i === index ? 'Você está aqui' : visited.has(i) ? 'Visitado' : '';
  });
  $('reading-panel').scrollTop = 0;
  if (field) field.events = [];
  renderStep();
  if (focus) $('chapter-title').focus({ preventScroll: true });
  if (focus && mobile.matches) window.scrollTo({ top: 0, behavior: 'instant' });
}

function measure(refresh = true) {
  if (state.chapter === 2 || state.total >= 10000) { stopSequence(); return; }
  if (state.chapter === 3) {
    const pair = measurePair(state.angleA, state.angleB, state.mixture);
    state.counts[pair.bin]++; state.last = pair; field?.measure(pair, 3);
    if (!streaming || state.total % 4 === 0) sound.mark(pair.a);
  } else {
    const outcome = measureQubit(preparedState(), state.basis);
    state.counts[outcome > 0 ? 0 : 1]++; state.last = outcome;
    field?.measure(outcome, state.basis === 'z' ? 0 : 1);
    if (!streaming || state.total % 4 === 0) sound.mark(outcome);
  }
  state.total++;
  if (refresh && (!streaming || state.total % 8 === 0)) renderMetrics(true);
  if (state.total >= 10000) stopSequence();
  if (refresh) drawStatic();
}

function setPaused(value) {
  if (value && !paused && field) field.targetRotation = [...field.rotation];
  paused = value;
  $('pause').textContent = paused ? 'Retomar' : 'Pausar';
  $('pause').setAttribute('aria-pressed', String(paused));
  $('contemplate-pause').textContent = paused ? 'Retomar' : 'Pausar';
  sound.quiet(paused || document.hidden).catch(() => {});
  renderMetrics(); drawStatic();
}

function advance(delta) {
  if (streaming) { emission += delta * 8; while (emission >= 1 && streaming) { measure(); emission--; } }
  if (state.chapter === 2) {
    advanceEnvironment(state, delta);
  }
}

function drawStatic(delta = 0, manual = false) {
  const instant = reducedMotion() || paused || document.documentElement.classList.contains('keyboard-input');
  const renderState = { ...preparedState(), chapter: state.chapter === 0 && state.step >= 2 ? 1 : state.chapter, paused: paused && !manual, instant, dragging: Boolean(pointer), contemplating, layers };
  if (state.view === 'light') field?.draw(reducedMotion() ? 0 : delta, renderState);
  else diagram.draw(preparedState(), { view: state.view, basis: state.basis, detail, compare: state.compare, layers, pattern });
}

$('mobile-chapters').innerHTML = document.querySelector('.chapter-sidebar .chapter-list').innerHTML;
const correlationButton = document.createElement('button'); correlationButton.dataset.view = 'correlation'; correlationButton.textContent = 'Correlação'; correlationButton.setAttribute('aria-pressed', 'false'); $('view-list').append(correlationButton);
const historyButton = document.createElement('button'); historyButton.dataset.view = 'history'; historyButton.textContent = 'Evolução'; historyButton.setAttribute('aria-pressed', 'false'); $('view-list').append(historyButton);
const matrixButton = document.createElement('button'); matrixButton.dataset.view = 'matrix'; matrixButton.textContent = 'Matriz'; matrixButton.setAttribute('aria-pressed', 'false'); $('view-list').append(matrixButton);
const apparatusButton = document.createElement('button'); apparatusButton.dataset.view = 'apparatus'; apparatusButton.textContent = 'Aparelhos'; apparatusButton.setAttribute('aria-pressed', 'false'); $('view-list').append(apparatusButton);
document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => { setView(button.dataset.view); renderMetrics(); }));
document.querySelectorAll('[data-chapter]').forEach(link => link.addEventListener('click', () => {
  if ($('chapters-dialog').open) $('chapters-dialog').close();
  if (location.hash === link.hash) navigate(Number(link.dataset.chapter));
}));
document.querySelector('.skip-link').addEventListener('click', event => { event.preventDefault(); $('chapter-title').focus(); });
function route(focus = true) {
  const index = chapters.findIndex(chapter => `#${chapter.slug}` === location.hash);
  navigate(index < 0 ? 0 : index, focus);
}
window.addEventListener('hashchange', () => route());
window.addEventListener('pageshow', () => { previous = 0; });
$('next').addEventListener('click', () => {
  if (state.step < chapters[chapterIndex].steps.length - 1) selectStep(state.step + 1);
  else location.hash = chapters[(chapterIndex + 1) % 3].slug;
});
for (const id of ['balance', 'phase', 'contact', 'angle-a', 'angle-b']) $(id).addEventListener('input', () => {
  const value = Number($(id).value);
  if (id === 'balance') state.balance = value / 100;
  if (id === 'phase') state.phase = value / 180 * Math.PI;
  if (id === 'contact') { state.contact = value / 100; state.isolated = false; stopSequence(); recordEnvironment(state); }
  if (id === 'angle-a') state.angleA = value;
  if (id === 'angle-b') state.angleB = value;
  if (id !== 'contact') { stopSequence(); clearMeasurements(); }
  syncInputs(); renderMetrics(true); drawStatic(); sound.update(state);
});
$('contact').addEventListener('change', () => { recordEnvironment(state, state.contact ? `Contato ajustado para ${Math.round(state.contact * 100)}%` : 'Contato desligado'); renderEnvironmentEvents(); });
$('basis').addEventListener('change', () => { stopSequence(); state.basis = $('basis').value; clearMeasurements(); renderMetrics(true); drawStatic(); });
$('compare').addEventListener('change', () => {
  state.compare = $('compare').checked;
  if (!state.compare && state.mixture) { stopSequence(); state.mixture = false; state.bellCounts = emptyBellCounts(); clearMeasurements(); }
  $('sample-mixture-wrap').hidden = !state.compare; syncInputs(); renderMetrics(true); renderBell(); drawStatic();
});
$('sample-mixture').addEventListener('change', () => { stopSequence(); state.mixture = $('sample-mixture').checked; state.bellCounts = emptyBellCounts(); clearMeasurements(); renderMetrics(true); renderBell(); drawStatic(); });
document.querySelectorAll('[data-angles]').forEach(button => button.addEventListener('click', () => {
  stopSequence(); [state.angleA, state.angleB] = button.dataset.angles.split(',').map(Number);
  clearMeasurements(); syncInputs(); renderMetrics(true); drawStatic();
}));
$('bell-sample').addEventListener('click', () => {
  state.bellCounts = sampleBellBatch(state.bellCounts, state.mixture);
  renderBell();
});
$('bell-clear').addEventListener('click', () => { state.bellCounts = emptyBellCounts(); renderBell(); });
$('measure').addEventListener('click', () => {
  if (state.chapter === 2) { state.coherence = 1; state.elapsed = 0; state.history = [[0, 1]]; state.events = []; recordEnvironment(state, 'Novo estado preparado'); renderEnvironmentEvents(); renderMetrics(true); drawStatic(); }
  else measure();
});
$('sequence').addEventListener('click', () => {
  if (state.chapter === 2) { state.isolated = !state.isolated; recordEnvironment(state, state.isolated ? 'Sistema isolado' : 'Contato retomado'); renderEnvironmentEvents(); stopSequence(); renderMetrics(true); drawStatic(); return; }
  if (reducedMotion()) {
    if (state.total >= 10000) clearMeasurements();
    streaming = true;
    for (let i = 0; i < 32 && state.total < 10000; i++) measure(false);
    stopSequence(); renderMetrics(true); drawStatic(); return;
  }
  if (streaming) stopSequence();
  else {
    if (state.total >= 10000) clearMeasurements();
    streaming = true; $('sequence').textContent = 'Parar sequência'; $('sequence').setAttribute('aria-pressed', 'true');
    if (paused) setPaused(false);
    measure();
  }
});
$('clear').addEventListener('click', () => { stopSequence(); clearMeasurements(); renderMetrics(true); drawStatic(); });
$('reset').addEventListener('click', () => { rooms[chapterIndex] = fresh(chapterIndex); navigate(chapterIndex, false); });
$('pause').addEventListener('click', () => setPaused(!paused));
$('contemplate-pause').addEventListener('click', () => setPaused(!paused));
$('step').addEventListener('click', () => {
  setPaused(true);
  if (state.chapter === 2) advanceEnvironment(state, .1, true); else measure();
  renderMetrics(true); drawStatic(.1, true);
});
$('speed').addEventListener('change', () => { speed = Number($('speed').value); });
$('detail-level').addEventListener('change', () => { detail = $('detail-level').value; setView(state.view); });
document.querySelectorAll('[data-layer]').forEach(input => input.addEventListener('change', () => { layers[input.dataset.layer] = input.checked; drawStatic(); }));
document.querySelectorAll('[name=pattern]').forEach(input => input.addEventListener('change', () => { pattern = input.value; setView(state.view); }));
for (const [id, amount] of [['zoom-in', .12], ['zoom-out', -.12]]) $(id).addEventListener('click', () => {
  diagram.zoom = Math.max(.6, Math.min(1.5, diagram.zoom + amount));
  if (field) field.targetZoom = Math.max(.6, Math.min(1.8, field.targetZoom + amount));
  drawStatic();
});
$('camera-reset').addEventListener('click', () => { diagram.rotation = [-.6, .35]; diagram.zoom = 1; if (field) { field.targetRotation = [-.42, .28]; field.targetZoom = 1; } drawStatic(); });
function contemplate(value) {
  if (value) $('main').append($('visual-panel'));
  contemplating = value; $('app').classList.toggle('contemplating', value);
  document.querySelector('.skip-link').hidden = value;
  $('contemplate').setAttribute('aria-pressed', String(value)); $('contemplate-label').textContent = value ? 'Voltar ao museu' : 'Contemplar'; $('contemplation-bar').hidden = !value;
  $('reading-panel').inert = value; $('chapter-sidebar').inert = value;
  if (value) { state.savedView = state.view; setView('light'); }
  else { mobileLayout(); setView(state.savedView || 'light'); }
}
$('contemplate').addEventListener('click', () => contemplate(!contemplating));
document.addEventListener('keydown', event => { document.documentElement.classList.add('keyboard-input'); if (event.key === 'Escape' && contemplating) { contemplate(false); $('contemplate').focus(); } }, true);
document.addEventListener('pointerdown', () => document.documentElement.classList.remove('keyboard-input'));
function applyMotionPreference() {
  const reduced = reducedMotion();
  $('reduce-motion').checked = reduced; $('reduce-motion').disabled = motion.matches;
  document.documentElement.classList.toggle('reduced-motion', reduced);
  if (field) field.reducedMotion = reduced;
  if (reduced) { stopSequence(); setPaused(true); }
  renderMetrics(); drawStatic();
}
motion.addEventListener('change', applyMotionPreference);
$('reduce-motion').addEventListener('change', () => { userReducedMotion = $('reduce-motion').checked; applyMotionPreference(); });
document.addEventListener('visibilitychange', () => { previous = 0; sound.quiet(document.hidden || paused).catch(() => {}); });
$('sound').addEventListener('click', async () => {
  try { const enabled = await sound.toggle(); $('sound').setAttribute('aria-pressed', String(enabled)); $('sound-label').textContent = enabled ? 'Som ligado' : 'Som desligado'; sound.update(state); await sound.quiet(paused || document.hidden); }
  catch { $('sound-label').textContent = 'Som indisponível'; $('sound').disabled = true; }
});
for (const name of ['chapters', 'about']) {
  $(`${name}-open`).addEventListener('click', () => $(`${name}-dialog`).showModal());
  $(`${name}-close`).addEventListener('click', () => $(`${name}-dialog`).close());
}
$('chapters-dialog').addEventListener('close', () => $('chapters-open').focus());
$('about-dialog').addEventListener('close', () => $('about-open').focus());
$('scene').addEventListener('pointerdown', event => {
  if (pointer || event.button !== 0 || event.target.closest('button') || !['light', 'bloch'].includes(state.view)) return;
  pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
  $('scene').setPointerCapture(event.pointerId);
});
$('scene').addEventListener('pointermove', event => {
  if (!pointer || pointer.id !== event.pointerId) return;
  const dx = (event.clientX - pointer.x) * .006; const dy = (event.clientY - pointer.y) * .006;
  diagram.rotation[0] += dx; diagram.rotation[1] = Math.max(-1.3, Math.min(1.3, diagram.rotation[1] + dy));
  if (field) { field.targetRotation[0] += dx; field.targetRotation[1] = Math.max(-1.3, Math.min(1.3, field.targetRotation[1] + dy)); }
  pointer.x = event.clientX; pointer.y = event.clientY; drawStatic();
});
for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) $('scene').addEventListener(name, () => { pointer = null; });
$('scene').tabIndex = 0;
$('scene').addEventListener('keydown', event => {
  if (event.target !== $('scene') || !['light', 'bloch'].includes(state.view)) return;
  const movement = { ArrowLeft: [-.12, 0], ArrowRight: [.12, 0], ArrowUp: [0, -.12], ArrowDown: [0, .12] }[event.key];
  if (!movement) return;
  event.preventDefault();
  diagram.rotation = diagram.rotation.map((angle, i) => angle + movement[i]);
  if (field) field.targetRotation = field.targetRotation.map((angle, i) => angle + movement[i]);
  drawStatic();
});
$('scene').addEventListener('wheel', event => {
  if (mobile.matches || event.ctrlKey || !['light', 'bloch'].includes(state.view)) return;
  event.preventDefault(); const amount = -event.deltaY * .0007;
  diagram.zoom = Math.max(.6, Math.min(1.5, diagram.zoom + amount));
  if (field) field.targetZoom = Math.max(.6, Math.min(1.8, field.targetZoom + amount)); drawStatic();
}, { passive: false });

function mobileLayout() {
  if (mobile.matches && !contemplating) $('experiment-controls').before($('visual-panel'));
  else $('main').append($('visual-panel'));
  requestAnimationFrame(() => { field?.resize(); drawStatic(); });
}
function frame(now) {
  const delta = previous ? Math.min((now - previous) / 1000, .05) : 1 / 60; previous = now;
  if (!document.hidden) {
    const evolving = !paused && state.chapter === 2;
    const sampling = !paused && streaming;
    if (evolving || sampling) advance(delta * speed);
    readoutTime += delta;
    if (readoutTime > .3) {
      if (evolving || sampling) { renderMetrics(false); if (state.view !== 'light') drawStatic(); }
      readoutTime = 0;
    }
    if (state.view === 'light' && !paused && !reducedMotion()) drawStatic(delta * speed);
  }
  requestAnimationFrame(frame);
}
new ResizeObserver(() => { field?.resize(); drawStatic(); }).observe($('scene'));
mobile.addEventListener('change', mobileLayout);
route(false); applyMotionPreference(); setPaused(paused); mobileLayout(); requestAnimationFrame(frame);
