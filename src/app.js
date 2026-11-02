import { levels } from './levels/catalog.js';
import { createRegistry, loadProgress, saveProgress } from './core/registry.js';
import { Hologram } from './core/hologram.js';
import { Soundscape } from './audio.js';

const $ = id => document.getElementById(id);
const registry = createRegistry(levels);
let storage; try { storage = localStorage; } catch { storage = null; }
const completed = loadProgress(storage, registry);
const sessions = new Map();
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const sound = new Soundscape();
const hologram = new Hologram($('scene'));
const layers = { grid: true, waves: true, prediction: true };
let selected = levels[0]; let active = null; let session;
let flat = motion.matches; let paused = flat; let speed = 1; let contemplating = false;
let focus = null; let dirty = true; let previous = 0; let presentationTime = 0; let sceneTime = 0; let pointer = null;
let effects = []; let lastSound = 0; let controlShape = '';
const api = {
  pulse(point) {
    session.revealed = true; dirty = true;
    if (!flat) effects.push({ point, age: 0 });
    effects = effects.slice(-12);
    if (performance.now() - lastSound > 130) { sound.mark(point[2] || 0); lastSound = performance.now(); }
  },
  notify(message) { $('notice').textContent = message; }
};

function mapPositions(level) {
  if (matchMedia('(max-width:480px)').matches) {
    const i = registry.levels.indexOf(level);
    const rows = Math.ceil(levels.length / 2);
    return [i % 2 ? 74 : 26, 18 + Math.floor(i / 2) * 60 / Math.max(1, rows - 1)];
  }
  return level.position;
}
function renderMap() {
  $('progress-label').textContent = `${completed.size} de ${levels.length} concluídos`;
  $('progress-bar').style.width = `${completed.size / levels.length * 100}%`;
  const svg = $('map-lines'); svg.replaceChildren();
  for (const level of levels) for (const required of level.prerequisites) {
    const [x1, y1] = mapPositions(registry.get(required)); const [x2, y2] = mapPositions(level);
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    for (const [key, value] of Object.entries({ x1, y1, x2, y2 })) line.setAttribute(key, value);
    if (completed.has(required)) line.classList.add('known'); svg.append(line);
  }
  document.querySelectorAll('.level-node').forEach(node => node.remove());
  for (const level of levels) {
    const state = registry.status(level.id, completed); const [x, y] = mapPositions(level);
    const button = document.createElement('button'); button.className = 'level-node'; button.dataset.state = state;
    button.style.left = `${x}%`; button.style.top = `${y}%`; button.dataset.level = level.id;
    button.setAttribute('aria-pressed', String(selected.id === level.id));
    const symbol = document.createElement('span'); symbol.className = 'node-symbol'; symbol.textContent = completed.has(level.id) ? '✓' : String(level.number).padStart(2, '0'); symbol.setAttribute('aria-hidden', 'true');
    const title = document.createElement('strong'); title.textContent = level.name;
    const label = document.createElement('small'); label.textContent = { locked: 'Bloqueado', available: 'Disponível', complete: 'Concluído' }[state];
    button.append(symbol, title, label); button.addEventListener('click', () => selectLevel(level));
    $('constellation').append(button);
  }
  renderSelection();
}
function selectLevel(level) {
  selected = level;
  document.querySelectorAll('.level-node').forEach(node => node.setAttribute('aria-pressed', String(node.dataset.level === level.id)));
  renderSelection();
}
function renderSelection() {
  const status = registry.status(selected.id, completed);
  $('selection-name').textContent = selected.name; $('selection-description').textContent = selected.description;
  $('selection-status').textContent = { locked: 'Bloqueado', available: `Nível ${String(selected.number).padStart(2, '0')} · disponível`, complete: 'Concluído · pode explorar novamente' }[status];
  $('enter-level').disabled = status === 'locked';
  $('selection-requires').textContent = status === 'locked' ? `Conclua: ${registry.missing(selected.id, completed).map(id => registry.get(id).name).join(' e ')}.` : selected.objective;
}
function save() {
  if (!saveProgress(storage, completed)) $('storage-note').textContent = 'O navegador não disponibilizou armazenamento. O progresso desta visita fica disponível enquanto a página estiver aberta.';
}
function capture() {
  session.frames.push(structuredClone(session.state));
  if (session.frames.length > 20) session.frames.shift();
  session.frame = session.frames.length - 1;
}
function shownState() { return flat && session.frames[session.frame] ? session.frames[session.frame] : session.state; }
function spatialScene() { return Boolean(active && !flat && (active.scene.spatial?.(shownState()) ?? true)); }
function syncSceneTools() {
  const spatial = spatialScene(); $('camera-tools').hidden = !spatial;
  $('stage-help').textContent = flat ? 'Tela plana · use os quadros para comparar' : spatial ? 'Arraste ou use as setas para girar' : 'Vista fixa · use os controles do nível';
  $('stage').setAttribute('aria-label', flat ? 'Cena plana, use os botões de quadros para comparar' : spatial ? 'Cena tridimensional, use as setas para girar' : 'Vista fixa da experiência');
}
function checkCompletion() {
  if (active.complete(session.state) && !completed.has(active.id)) {
    completed.add(active.id); save(); $('notice').textContent = 'Descoberta concluída. Novos caminhos estão disponíveis no mapa.';
  }
  $('completion').hidden = !completed.has(active.id);
}
function runAction(id, value, fromInput = false) {
  if (!active) return;
  active.scene.act(session.state, id, value, api);
  session.revealed = true; capture(); dirty = true;
  checkCompletion(); renderPresentation(); renderControls(!fromInput);
}
function renderControls(force = false) {
  const descriptors = active.scene.controls(session.state);
  const shape = descriptors.map(c => `${c.id}/${c.type}/${c.label}`).join('|');
  if (!force && shape === controlShape) {
    for (const descriptor of descriptors) {
      const input = $('controls').querySelector(`[data-action="${descriptor.id}"]`);
      if (input && descriptor.type !== 'button') input.value = descriptor.value;
      if (descriptor.type === 'range') $('controls').querySelector(`[data-output="${descriptor.id}"]`).textContent = `${Number(descriptor.value).toLocaleString('pt-BR')}${descriptor.unit}`;
    }
    return;
  }
  const previousFocus = document.activeElement?.dataset?.action;
  controlShape = shape;
  $('controls').replaceChildren(...descriptors.map(descriptor => {
    if (descriptor.type === 'button') {
      const b = document.createElement('button'); b.textContent = descriptor.label; b.dataset.action = descriptor.id;
      if (descriptor.style) b.className = descriptor.style;
      b.addEventListener('click', () => runAction(descriptor.id)); return b;
    }
    const label = document.createElement('label'); label.className = 'control-field';
    const title = document.createElement('span'); title.className = 'control-label'; title.textContent = descriptor.label;
    let input;
    if (descriptor.type === 'select') {
      input = document.createElement('select');
      descriptor.options.forEach(([value, text]) => { const option = document.createElement('option'); option.value = value; option.textContent = text; input.append(option); });
      input.addEventListener('change', () => runAction(descriptor.id, input.value, true));
    } else {
      input = document.createElement('input'); input.type = 'range'; input.min = descriptor.min; input.max = descriptor.max; input.step = descriptor.step;
      const output = document.createElement('output'); output.dataset.output = descriptor.id; output.textContent = `${Number(descriptor.value).toLocaleString('pt-BR')}${descriptor.unit}`; title.append(output);
      input.addEventListener('input', () => runAction(descriptor.id, Number(input.value), true));
    }
    input.dataset.action = descriptor.id; input.setAttribute('aria-label', descriptor.label); input.value = descriptor.value; label.append(title, input); return label;
  }));
  if (previousFocus) $('controls').querySelector(`[data-action="${previousFocus}"]`)?.focus({ preventScroll: true });
}
function renderPresentation() {
  if (!active) return;
  const state = shownState(); const data = active.scene.describe(state);
  syncSceneTools();
  $('stage-tag').textContent = data.tag;
  $('scene').setAttribute('aria-label', `${active.name}. ${data.accessible || data.stats.map(s => `${s.label}: ${s.value}`).join('. ')}`);
  $('scene-caption').hidden = !session.revealed;
  $('scene-caption').replaceChildren();
  const index = document.createElement('span'); index.className = 'caption-index'; index.textContent = String(active.number).padStart(2, '0');
  const caption = document.createElement('span'); caption.textContent = active.caption(state); $('scene-caption').append(index, caption);
  $('readouts').replaceChildren(...data.stats.map(stat => {
    const row = document.createElement('div'); const dt = document.createElement('dt'); const dd = document.createElement('dd'); dt.textContent = stat.label; dd.textContent = stat.value; row.append(dt, dd); return row;
  }));
  $('sample-readout').textContent = data.sample || ''; $('sample-readout').hidden = !data.sample;
  $('tasks').replaceChildren(...active.tasks(session.state).map(task => { const li = document.createElement('li'); li.textContent = task.label; li.classList.toggle('done', task.done); return li; }));
  $('frame-label').textContent = `Quadro ${session.frame + 1} de ${session.frames.length}`;
  $('frame-note').textContent = session.frame < session.frames.length - 1 ? 'Revisão · controles seguem o ensaio atual' : 'Quadro atual · sem animação';
  $('frame-back').disabled = session.frame === 0;
  if (data.table) renderTable(data.table); else $('model-table')?.remove();
}
function renderTable(table) {
  let wrapper = $('model-table');
  if (!wrapper) { wrapper = document.createElement('div'); wrapper.id = 'model-table'; wrapper.className = 'model-table'; wrapper.tabIndex = 0; wrapper.setAttribute('role', 'region'); wrapper.setAttribute('aria-label', table.title); $('panel-deeper').append(wrapper); }
  wrapper.setAttribute('aria-label', table.title);
  const el = document.createElement('table'); const caption = document.createElement('caption'); caption.textContent = table.title; el.append(caption);
  const head = document.createElement('tr'); table.columns.forEach(text => { const th = document.createElement('th'); th.scope = 'col'; th.textContent = text; head.append(th); }); el.append(head);
  for (const values of table.rows) { const row = document.createElement('tr'); values.forEach(value => { const td = document.createElement('td'); td.textContent = value; row.append(td); }); el.append(row); }
  wrapper.replaceChildren(el);
}
function equationButtons() {
  return active.deeper.equations.map(term => {
    const button = document.createElement('button'); button.textContent = term.expression;
    const help = document.createElement('small'); help.textContent = term.meaning; button.append(help);
    button.dataset.term = term.target;
    button.setAttribute('aria-pressed', String(focus === term.target));
    button.addEventListener('click', () => { focus = focus === term.target ? null : term.target; renderEquations(); dirty = true; });
    return button;
  });
}
function renderEquations() {
  const previousTerm = document.activeElement?.dataset?.term;
  const previousPanel = document.activeElement?.parentElement?.id;
  $('deeper-equations')?.replaceChildren(...equationButtons()); $('overlay-equations').replaceChildren(...equationButtons());
  if (previousTerm && previousPanel) $(previousPanel)?.querySelector(`[data-term="${previousTerm}"]`)?.focus({ preventScroll: true });
}
function renderLearning() {
  $('panel-understand').replaceChildren(...active.understand.map(text => { const p = document.createElement('p'); p.textContent = text; return p; }));
  const equations = document.createElement('div'); equations.id = 'deeper-equations'; equations.className = 'equation-list';
  const note = document.createElement('p'); note.className = 'technical-note'; note.textContent = active.deeper.note;
  const refs = document.createElement('div'); refs.className = 'reference-list';
  for (const ref of active.deeper.references) { const a = document.createElement('a'); a.href = ref.url; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = `${ref.title} ↗`; refs.append(a); }
  $('panel-deeper').replaceChildren(equations, note, refs); renderEquations();
  const columns = document.createElement('div'); columns.className = 'myth-columns';
  for (const [kind, label] of [['fiction', 'A ideia na ficção ou no cotidiano'], ['real', 'O modelo físico']]) {
    const content = active.myth[kind]; const article = document.createElement('article');
    const kicker = document.createElement('p'); kicker.className = 'eyebrow'; kicker.textContent = label;
    const title = document.createElement('h3'); title.textContent = content.title;
    const p = document.createElement('p'); p.textContent = content.text;
    const b = document.createElement('button'); b.textContent = `${content.action} ↗`; b.addEventListener('click', () => { runAction(content.id); $('stage').focus(); $('stage').scrollIntoView({ block: 'center', behavior: 'instant' }); });
    article.append(kicker, title, p, b); columns.append(article);
  }
  $('panel-myth').replaceChildren(columns); selectTab('understand', false);
}
function selectTab(name, focusTab = true) {
  for (const button of document.querySelectorAll('[data-tab]')) {
    const selected = button.dataset.tab === name; button.setAttribute('aria-selected', String(selected)); button.tabIndex = selected ? 0 : -1;
    $(`panel-${button.dataset.tab}`).hidden = !selected;
  }
  if (focusTab) $(`tab-${name}`).focus({ preventScroll: true });
}
function enter(level) {
  if (registry.status(level.id, completed) === 'locked') { selected = level; location.hash = 'mapa'; return; }
  active = level; selected = level;
  if (!sessions.has(level.id)) {
    const state = level.scene.create(); sessions.set(level.id, { state, frames: [structuredClone(state)], frame: 0, revealed: false, intro: .5 });
  }
  session = sessions.get(level.id); effects = []; focus = null; previous = 0; sceneTime = 0; controlShape = '';
  $('atlas').hidden = true; $('experience').hidden = false; $('contemplate').hidden = false;
  $('level-number').textContent = `Nível ${String(level.number).padStart(2, '0')} / ${String(levels.length).padStart(2, '0')}`;
  $('level-title').textContent = level.name; $('level-objective').textContent = level.objective;
  $('equation-overlay').hidden = true; $('notice').textContent = '';
  renderLearning(); checkCompletion(); renderControls(true); renderPresentation(); syncPlayback(); dirty = true;
  window.scrollTo({ top: 0, behavior: 'instant' }); $('level-title').focus({ preventScroll: true });
  if (flat && !session.revealed) runAction('step');
}
function showMap() {
  if (contemplating) setContemplating(false);
  active = null; $('experience').hidden = true; $('atlas').hidden = false; $('contemplate').hidden = true;
  renderMap(); window.scrollTo({ top: 0, behavior: 'instant' }); $('main-title').focus({ preventScroll: true });
}
function route() {
  let id; try { id = decodeURIComponent(location.hash.slice(1)); } catch { id = ''; }
  const level = registry.get(id); if (level) enter(level); else showMap();
}
function syncPlayback() {
  $('pause').textContent = flat ? 'Sem animação' : paused ? 'Retomar' : 'Pausar'; $('pause').setAttribute('aria-pressed', String(paused));
  $('pause').disabled = flat; $('speed').disabled = flat;
  $('contemplate-pause').textContent = flat ? 'Sem animação' : paused ? 'Retomar' : 'Pausar'; $('contemplate-pause').disabled = flat;
  $('flat-mode').checked = flat; $('flat-mode').disabled = motion.matches;
  $('frames').hidden = !flat; syncSceneTools();
  document.documentElement.classList.toggle('flat-mode', flat);
}
function setFlat(value) {
  flat = value || motion.matches;
  if (flat) { paused = true; if (active) capture(); }
  sound.quiet(paused).catch(() => {});
  effects = []; syncPlayback(); if (active) renderPresentation(); dirty = true;
}
function setContemplating(value) {
  contemplating = value; document.body.classList.toggle('contemplating', value);
  $('contemplate').setAttribute('aria-pressed', String(value)); $('contemplate').textContent = value ? 'Voltar ao museu' : 'Contemplar';
  $('contemplate-pause').hidden = !value; $('controls-panel').inert = value; $('learning').inert = value;
  document.querySelector('.skip').hidden = value; dirty = true;
}
function paint() {
  const start = performance.now(); hologram.begin(sceneTime, flat, focus);
  active.scene.draw(hologram, shownState(), { layers, technical: !$('equation-overlay').hidden });
  if (!flat && !paused) {
    if (spatialScene()) for (const effect of effects) hologram.pulse(effect.point, effect.age);
    else if (effects.length) hologram.pulseFrame(effects.at(-1).age);
  }
  const elapsed = performance.now() - start;
  hologram.slow = elapsed > 26 ? hologram.slow + 1 : Math.max(0, hologram.slow - 1);
  if (hologram.slow > 20 && hologram.quality > 1) { hologram.quality = 1; hologram.slow = 0; }
  dirty = false;
}
function frame(now) {
  const dt = previous ? Math.min((now - previous) / 1000, .05) * speed : 0; previous = now;
  if (active && !document.hidden) {
    if (!paused && !flat) {
      sceneTime += dt;
      if (!session.revealed) { session.intro -= dt; if (session.intro <= 0) runAction('step'); }
      active.scene.tick?.(session.state, dt, api);
      for (const effect of effects) effect.age += dt; effects = effects.filter(effect => effect.age < 1.2);
      dirty = true; presentationTime += dt;
      if (presentationTime > .25) { renderPresentation(); renderControls(); checkCompletion(); presentationTime = 0; }
    }
    if (dirty) paint();
  }
  requestAnimationFrame(frame);
}

$('enter-level').addEventListener('click', () => { location.hash = selected.id; });
for (const id of ['back-map', 'completion-map']) $(id).addEventListener('click', () => { location.hash = 'mapa'; });
$('pause').addEventListener('click', () => { paused = !paused; syncPlayback(); sound.quiet(paused).catch(() => {}); dirty = true; });
$('contemplate-pause').addEventListener('click', () => { paused = !paused; syncPlayback(); sound.quiet(paused).catch(() => {}); dirty = true; });
$('one-step').addEventListener('click', () => { paused = true; syncPlayback(); sound.quiet(true).catch(() => {}); runAction('step'); });
$('speed').addEventListener('change', () => { speed = Number($('speed').value); });
$('flat-mode').addEventListener('change', () => setFlat($('flat-mode').checked));
$('frame-back').addEventListener('click', () => { session.frame = Math.max(0, session.frame - 1); renderPresentation(); dirty = true; });
$('frame-forward').addEventListener('click', () => { if (session.frame < session.frames.length - 1) { session.frame++; renderPresentation(); dirty = true; } else runAction('step'); });
$('reset-level').addEventListener('click', () => { sessions.delete(active.id); enter(active); });
$('equations-open').addEventListener('click', () => { $('equation-overlay').hidden = !$('equation-overlay').hidden; if (!$('equation-overlay').hidden) $('equations-close').focus(); dirty = true; });
$('equations-close').addEventListener('click', () => { $('equation-overlay').hidden = true; focus = null; $('equations-open').focus(); dirty = true; });
$('contemplate').addEventListener('click', () => setContemplating(!contemplating));
$('about-open').addEventListener('click', () => $('about-dialog').showModal());
$('about-close').addEventListener('click', () => $('about-dialog').close());
$('about-dialog').addEventListener('close', () => { $('reset-progress').textContent = 'Recomeçar percurso'; delete $('reset-progress').dataset.confirm; $('about-open').focus(); });
$('reset-progress').addEventListener('click', () => {
  if (!$('reset-progress').dataset.confirm) {
    $('reset-progress').dataset.confirm = 'true'; $('reset-progress').textContent = 'Confirmar recomeço'; return;
  }
  completed.clear(); sessions.clear(); save(); $('about-dialog').close(); location.hash = 'mapa'; showMap();
});
$('sound').addEventListener('click', async () => {
  try { const enabled = await sound.toggle(); await sound.quiet(document.hidden || paused); $('sound').textContent = enabled ? 'Som ligado' : 'Som desligado'; $('sound').setAttribute('aria-pressed', String(enabled)); }
  catch { $('sound').textContent = 'Som indisponível'; $('sound').disabled = true; }
});
document.querySelectorAll('[data-tab]').forEach((button, i, list) => {
  button.addEventListener('click', () => selectTab(button.dataset.tab));
  button.addEventListener('keydown', event => {
    const delta = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
    if (delta) { event.preventDefault(); selectTab(list[(i + delta + list.length) % list.length].dataset.tab); }
  });
});
document.querySelectorAll('[data-layer]').forEach(input => input.addEventListener('change', () => { layers[input.dataset.layer] = input.checked; dirty = true; }));
for (const [id, amount] of [['zoom-in', .12], ['zoom-out', -.12]]) $(id).addEventListener('click', () => { hologram.zoom = Math.max(.65, Math.min(1.6, hologram.zoom + amount)); dirty = true; });
$('camera-reset').addEventListener('click', () => { hologram.yaw = -.62; hologram.pitch = .2; hologram.zoom = 1; dirty = true; });
$('stage').addEventListener('pointerdown', event => { if (event.button || pointer || !spatialScene() || event.target.closest('button')) return; pointer = { id: event.pointerId, x: event.clientX, y: event.clientY }; $('stage').setPointerCapture(event.pointerId); });
$('stage').addEventListener('pointermove', event => { if (!pointer || pointer.id !== event.pointerId) return; hologram.yaw += (event.clientX - pointer.x) * .005; hologram.pitch = Math.max(-.8, Math.min(.8, hologram.pitch + (event.clientY - pointer.y) * .004)); pointer.x = event.clientX; pointer.y = event.clientY; dirty = true; });
for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) $('stage').addEventListener(event, () => { pointer = null; });
$('stage').addEventListener('keydown', event => {
  if (event.target !== $('stage') || !spatialScene()) return;
  const delta = { ArrowLeft: [-.12, 0], ArrowRight: [.12, 0], ArrowUp: [0, -.1], ArrowDown: [0, .1] }[event.key];
  if (delta) { event.preventDefault(); hologram.yaw += delta[0]; hologram.pitch += delta[1]; dirty = true; }
});
document.addEventListener('keydown', event => { document.documentElement.classList.add('keyboard-input'); if (event.key === 'Escape' && contemplating) { setContemplating(false); $('contemplate').focus(); } }, true);
document.addEventListener('pointerdown', () => document.documentElement.classList.remove('keyboard-input'));
document.querySelector('.skip').addEventListener('click', event => { event.preventDefault(); $(active ? 'level-title' : 'main-title').focus(); });
motion.addEventListener('change', () => { if (motion.matches) setFlat(true); });
window.addEventListener('hashchange', route);
window.addEventListener('resize', () => { dirty = true; if (!active) renderMap(); });
document.addEventListener('visibilitychange', () => { previous = 0; sound.quiet(document.hidden || paused).catch(() => {}); });
new ResizeObserver(() => { dirty = true; }).observe($('stage'));
route(); requestAnimationFrame(frame);
