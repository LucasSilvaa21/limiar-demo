import { typesetEquations } from './typeset.js';
import { lightStory, pairStory, references } from './story.js';
import { lightState, lightPrediction, advanceLight, recordLight, changePhase, pairState, pairPrediction, recordPairs, resetPairSample } from './model.js';
import { LightField } from './field.js';
import { ScenePainter } from './scenes.js';
import { Soundscape } from '../audio.js';
import { emptyBellCounts, sampleBellBatch, bellReport } from '../experiments.js';

const $ = id => document.getElementById(id);
const percent = n => `${(n*100).toLocaleString('pt-BR',{maximumFractionDigits:1})}%`;
const number = n => (Math.abs(n)<.005?0:n).toLocaleString('pt-BR',{maximumFractionDigits:2});
const two = n => String(n).padStart(2,'0');
const preference = matchMedia('(prefers-reduced-motion: reduce)');
let paused = preference.matches;
let guided = false; let guidedElapsed = 0; let contemplating = false;
let light = lightState(0); let pair = pairState(0);
let lightClock = 0; let pairClock = 0; let displayClock = 0; let previous = 0; let visualTime = 14;
let heroVisible = true; let lightVisible = false; let pairVisible = false; let dirty = true;
let keyboard = false; let slow = 0; let bellCounts = emptyBellCounts();
let pointer = [0,0]; const targetPointer = [0,0];
const heroField = new LightField($('hero-field'),0);
const storyField = new LightField($('light-field'),1);
const lightPainter = new ScenePainter($('light-canvas'));
const pairPainter = new ScenePainter($('pair-canvas'));
const sound = new Soundscape();

function announce(text) { $('announcer').textContent = text; }
function transition(element) {
  if (paused || keyboard || !element.animate) return;
  element.getAnimations().forEach(animation => animation.cancel());
  element.animate([{opacity:.3,filter:'blur(5px)',transform:'scale(.99)'},{opacity:1,filter:'blur(0px)',transform:'scale(1)'}],{duration:750,easing:'cubic-bezier(.23,1,.32,1)'});
}
function updateCurrent(rail,index) {
  [...$(rail).children].forEach((button,i) => {
    if (i===index) button.setAttribute('aria-current','step'); else button.removeAttribute('aria-current');
  });
}
function createRail(id,scenes,go) {
  $(id).replaceChildren(...scenes.map((scene,i) => {
    const button=document.createElement('button'); const index=document.createElement('small'); index.textContent=two(i+1);
    const label=document.createElement('span'); label.textContent=scene.label; button.append(index,label);
    button.addEventListener('click',() => go(i));
    button.addEventListener('keydown',event => {
      const delta={ArrowLeft:-1,ArrowRight:1}[event.key];
      if (delta) { event.preventDefault(); const next=Math.max(0,Math.min(scenes.length-1,i+delta)); go(next); $(id).children[next].focus(); }
    });
    return button;
  }));
}
function renderLightCopy() {
  const scene=lightStory[light.step];
  $('light-kind').textContent=scene.kind; $('light-position').textContent=`Cena ${light.step+1} de ${lightStory.length}`;
  $('light-counter').textContent=`Cena ${two(light.step+1)}`; $('light-title').textContent=scene.title;
  const paragraphs=[...scene.paragraphs];
  if (light.step===4 && light.phase===0) paragraphs[0]='A fase voltou ao valor inicial. Os registros ocorrem em A. Uma mudança de meia volta transfere os registros para B.';
  $('light-paragraphs').replaceChildren(...paragraphs.map(text => { const p=document.createElement('p'); p.textContent=text; return p; }));
  const term=document.createElement('strong'); term.textContent=scene.term[0];
  const meaning=document.createElement('span'); meaning.textContent=scene.term[1]; $('light-term').replaceChildren(term,meaning);
  $('light-action').textContent=light.step===4?(light.phase===0?'Defasar em meia volta ↗':'Restaurar a fase inicial ↗'):`${scene.action} ↗`;
  $('light-caption').textContent=light.step===4 && light.phase===0?'Com a fase inicial, a saída A recebe os registros.':scene.caption;
  $('light-limit').textContent=scene.limit;
  $('light-prev').disabled=light.step===0; $('light-next').disabled=light.step===lightStory.length-1;
  $('light-meter').hidden=light.step<3;
  storyField.kind=light.step===0?1:2;
  updateCurrent('light-rail',light.step); renderLightReadout();
}
function renderLightReadout() {
  const p=lightPrediction(light);
  $('chance-a').textContent=percent(p.a); $('chance-b').textContent=percent(p.b);
  $('bar-a').style.width=`${p.a*100}%`; $('bar-b').style.width=`${p.b*100}%`;
  $('light-sample').hidden=light.step<3;
  $('light-sample').textContent=`Registros nesta cena: ${light.total} · A: ${light.counts[0]} · B: ${light.counts[1]}. As porcentagens na cena são as chances previstas agora.`;
  $('light-canvas').setAttribute('aria-label',light.step===0?'Analogia de duas fontes de ondas de água. As ondas se reforçam e se cancelam.':`${lightStory[light.step].title} Chance de A ${percent(p.a)}, de B ${percent(p.b)}. ${light.total} registros nesta cena. Coerência restante ${percent(light.coherence)}.`);
}
function setLight(index,manual = true) {
  if (manual) guided=false;
  light=lightState(Math.max(0,Math.min(lightStory.length-1,index)),light);
  if (paused && light.step===5) advanceLight(light,2);
  guidedElapsed=0; lightClock=0; dirty=true;
  if (light.step===1 || light.step>=3) recordLight(light);
  renderLightCopy(); syncMotion(); transition($('light-canvas')); transition($('light-copy'));
  announce(`Cena ${light.step+1}. ${lightStory[light.step].title}`);
}
function emitLight() {
  if (light.step===0 || light.step===2) return;
  recordLight(light); sound.mark(light.last?1:-1); renderLightReadout(); dirty=true;
}
function replayLight() {
  const coherence=light.coherence; const step=light.step;
  guided=false; light=lightState(step,light); if (step===6) light.coherence=coherence;
  if (paused && step===5) advanceLight(light,2);
  if (step===1 || step>=3) recordLight(light);
  lightClock=0; guidedElapsed=0; renderLightCopy(); syncMotion(); transition($('light-canvas')); dirty=true;
}
function lightAction() {
  const action=lightStory[light.step].actionId;
  guided=false;
  if (action==='replay') replayLight();
  if (action==='emit') emitLight();
  if (action==='phase') { changePhase(light); recordLight(light); renderLightCopy(); transition($('light-canvas')); sound.mark(light.last?1:-1); }
  if (action==='isolate') setLight(6);
  if (action==='prepare') setLight(7);
  if (action==='restart') setLight(0);
  syncMotion(); dirty=true;
}
function syncMotion() {
  document.documentElement.classList.toggle('motion-paused',paused);
  $('motion-toggle').setAttribute('aria-pressed',String(paused));
  $('motion-toggle').setAttribute('aria-label',paused?'Retomar movimento':'Pausar movimento');
  $('motion-toggle').querySelector('.control-name').textContent=paused?'Retomar':'Pausar';
  $('motion-toggle').querySelector('path').setAttribute('d',paused?'M8 5l11 7-11 7V5Z':'M9 6v12M15 6v12');
  $('static-step').hidden=!paused;
  $('guided-play').disabled=paused; $('guided-play').setAttribute('aria-pressed',String(guided));
  $('guided-play').textContent=guided?'Ⅱ Pausar a sequência':'▷ Assistir à sequência';
  $('film-progress').style.width=guided?`${Math.min(100,guidedElapsed/lightStory[light.step].duration*100)}%`:'0%';
}
function toggleMotion() {
  paused=!paused; if (paused) guided=false;
  if (paused) document.getAnimations().forEach(animation => animation.cancel());
  sound.quiet(paused || document.hidden).catch(() => {});
  syncMotion(); dirty=true;
  announce(paused?'Movimento pausado. Você pode avançar um instante ou escolher outra cena.':'Movimento retomado.');
}
function setConcentrating(value) {
  contemplating=value; document.body.classList.toggle('contemplating',value);
  for (const section of document.querySelectorAll('main>section')) if (section.id!=='luz') section.inert=value;
  for (const child of $('luz').children) if (child.id!=='light-shell') child.inert=value;
  document.querySelector('.site-footer').inert=value;
  $('contemplate-exit').hidden=!value; $('contemplate').setAttribute('aria-pressed',String(value));
  $('contemplate').setAttribute('aria-label',value?'Voltar à visita':'Expandir a cena');
  if (value) $('contemplate-exit').focus({preventScroll:true}); else $('contemplate').focus({preventScroll:true});
  dirty=true;
}
function renderPair() {
  const scene=pairStory[pair.step];
  $('pair-counter').textContent=`Passagem ${two(pair.step+1)} / ${two(pairStory.length)}`;
  $('pair-title').textContent=scene.title; $('pair-text').textContent=scene.text; $('pair-note').textContent=scene.note;
  $('pair-action').textContent=pair.step===2?(pair.classical?'Voltar ao par entrelaçado ↗':'Ver a mistura ↗'):`${scene.action} ↗`;
  $('pair-mode-label').textContent=pair.classical?'Mistura de comparação':'Par entrelaçado';
  $('angle-field').hidden=pair.step!==3; $('angle-b').value=pair.angleB; $('angle-output').textContent=`${pair.angleB}°`;
  updateCurrent('pair-rail',pair.step); renderPairReadout(); renderBell();
}
function renderPairReadout() {
  const p=pairPrediction(pair);
  $('pair-local-a').textContent=percent(p.a); $('pair-local-b').textContent=percent(p.b); $('pair-same').textContent=percent(p.same);
  $('pair-joint').hidden=pair.step===0; document.querySelector('.pair-readout').classList.toggle('local-only',pair.step===0);
  const same=pair.total?(pair.counts[0]+pair.counts[3])/pair.total:null;
  $('pair-sample').textContent=pair.step===0?`${pair.total} pares registrados nesta passagem. As chances locais são 50/50; uma amostra pequena pode ter frequências diferentes.`:pair.total?`Amostra do ajuste atual: ${pair.total} pares, com ${percent(same)} de respostas iguais. Acima, chances previstas. A cena mostra os últimos sete registros.`:'A amostra ainda não tem registros. Acima, chances previstas.';
  $('pair-canvas').setAttribute('aria-label',`${pair.classical?'Mistura de comparação':'Par entrelaçado'}. Analisador A ${pair.angleA} graus e B ${pair.angleB} graus. Chance local de + em A ${percent(p.a)}, em B ${percent(p.b)}. Chance de respostas iguais ${percent(p.same)}. ${pair.total} pares registrados.`);
}
function setPair(index) {
  pair=pairState(index); recordPairs(pair,8); pairClock=0; bellCounts=emptyBellCounts(); dirty=true;
  renderPair(); transition($('pair-canvas')); transition(document.querySelector('.pair-narrative'));
  announce(`Passagem ${pair.step+1}. ${pairStory[pair.step].title}`);
}
function pairAction() {
  if (pair.step<2) { setPair(pair.step+1); return; }
  if (pair.step===2) {
    pair.classical=!pair.classical; resetPairSample(pair); recordPairs(pair,24); bellCounts=emptyBellCounts();
  } else { pair.angleB=(pair.angleB+45)%180; resetPairSample(pair); recordPairs(pair,12); }
  renderPair(); transition($('pair-canvas')); dirty=true;
}
function renderBell() {
  const report=bellReport(bellCounts,pair.classical);
  $('bell-summary').textContent=`S previsto: ${number(pairPrediction(pair).chsh)}. ${report.observed===null?'Amostra ainda não realizada.':`S na amostra: ${number(report.observed)} · ${report.total} pares.`}`;
  $('bell-rows').replaceChildren(...report.rows.map(row => {
    const tr=document.createElement('tr');
    for (const value of [`${number(row.angleA)}° / ${number(row.angleB)}°`,number(row.expected),row.observed===null?'Sem dados':number(row.observed),row.total]) {
      const td=document.createElement('td'); td.textContent=value; tr.append(td);
    }
    return tr;
  }));
}

createRail('light-rail',lightStory,index => setLight(index));
createRail('pair-rail',pairStory,setPair);
recordPairs(pair,8); renderLightCopy(); renderPair(); syncMotion();
$('reference-list').replaceChildren(...references.map(ref => {
  const link=document.createElement('a'); link.href=ref.url; link.target='_blank'; link.rel='noopener noreferrer';
  const title=document.createElement('strong'); title.textContent=ref.title; const arrow=document.createElement('span'); arrow.textContent='↗'; arrow.setAttribute('aria-hidden','true'); title.append(arrow);
  const author=document.createElement('small'); author.textContent=ref.author; link.append(title,author); return link;
}));

$('light-prev').addEventListener('click',() => setLight(light.step-1));
$('light-next').addEventListener('click',() => setLight(light.step+1));
$('light-action').addEventListener('click',lightAction);
$('light-replay').addEventListener('click',replayLight);
$('guided-play').addEventListener('click',() => {
  if (guided) guided=false;
  else { setLight(0,false); guided=true; }
  guidedElapsed=0; syncMotion();
});
$('motion-toggle').addEventListener('click',toggleMotion);
$('static-step').addEventListener('click',() => { advanceLight(light,1); light.displayTime+=1; emitLight(); renderLightReadout(); dirty=true; });
$('pair-action').addEventListener('click',pairAction);
$('pair-batch').addEventListener('click',() => { recordPairs(pair,24); sound.mark(0); renderPairReadout(); dirty=true; });
$('angle-b').addEventListener('input',() => {
  pair.angleB=Number($('angle-b').value); resetPairSample(pair); recordPairs(pair,8);
  $('angle-output').textContent=`${pair.angleB}°`; renderPairReadout(); dirty=true;
});
$('bell-sample').addEventListener('click',() => { bellCounts=sampleBellBatch(bellCounts,pair.classical); renderBell(); });
$('contemplate').addEventListener('click',() => setConcentrating(!contemplating));
$('contemplate-exit').addEventListener('click',() => setConcentrating(false));
$('sound-toggle').addEventListener('click',async () => {
  try {
    const enabled=await sound.toggle(); await sound.quiet(paused || document.hidden);
    $('sound-toggle').setAttribute('aria-pressed',String(enabled)); $('sound-toggle').setAttribute('aria-label',enabled?'Desativar som':'Ativar som');
    $('sound-toggle').querySelector('.control-name').textContent=enabled?'Som ligado':'Som desligado';
    $('sound-toggle').querySelector('path').setAttribute('d',enabled?'M11 5 6 9H3v6h3l5 4V5ZM16 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14':'M11 5 6 9H3v6h3l5 4V5ZM16 9l5 6m0-6-5 6');
  } catch { $('sound-toggle').disabled=true; $('sound-toggle').setAttribute('aria-label','Som indisponível'); $('sound-toggle').querySelector('.control-name').textContent='Som indisponível'; }
});
document.querySelectorAll('.mobile-menu a').forEach(link => link.addEventListener('click',() => { document.querySelector('.mobile-menu').open=false; }));
document.addEventListener('keydown',event => {
  keyboard=true; document.documentElement.classList.add('keyboard-input');
  if (event.key==='Escape' && contemplating) setConcentrating(false);
},true);
document.addEventListener('pointerdown',() => { keyboard=false; document.documentElement.classList.remove('keyboard-input'); });
$('inicio').addEventListener('pointermove',event => {
  if (event.pointerType==='touch' || paused) return;
  const box=$('inicio').getBoundingClientRect(); targetPointer[0]=(event.clientX-box.left)/box.width-.5; targetPointer[1]=(event.clientY-box.top)/box.height-.5;
});
$('inicio').addEventListener('pointerleave',() => { targetPointer[0]=0; targetPointer[1]=0; });
window.addEventListener('resize',() => { dirty=true; });
window.addEventListener('scroll',() => { document.querySelector('.masthead').classList.toggle('scrolled',scrollY>40); },{passive:true});
document.addEventListener('visibilitychange',() => { previous=0; sound.quiet(document.hidden || paused).catch(() => {}); dirty=true; });
preference.addEventListener('change',event => { if (event.matches && !paused) toggleMotion(); });
for (const id of ['light-deep','pair-deep']) $(id).addEventListener('toggle',() => { dirty=true; });

const visibility=new IntersectionObserver(entries => {
  for (const entry of entries) {
    if (entry.target.id==='inicio') heroVisible=entry.isIntersecting;
    if (entry.target.id==='light-shell') lightVisible=entry.isIntersecting;
    if (entry.target.id==='pair-canvas') pairVisible=entry.isIntersecting;
  }
  dirty=true;
},{threshold:0});
for (const id of ['inicio','light-shell','pair-canvas']) visibility.observe($(id));
const reveal=new IntersectionObserver(entries => {
  for (const entry of entries) if (entry.isIntersecting) { entry.target.classList.add('in-view'); reveal.unobserve(entry.target); }
},{threshold:.08});
document.querySelectorAll('.reveal').forEach(section => reveal.observe(section));
typesetEquations(document);
document.documentElement.classList.add('js-ready');

function frame(now) {
  const raw=previous?(now-previous)/1000:0; const dt=Math.min(.1,raw); previous=now;
  if (!document.hidden) {
    if (!paused) {
      visualTime+=dt;
      pointer=pointer.map((value,i) => value+(targetPointer[i]-value)*.04);
      if (lightVisible || contemplating) {
        advanceLight(light,dt*(light.environment ? .05 : 1)); light.displayTime+=dt; lightClock+=dt;
        if ((light.step===1 || light.step>=3) && lightClock>1.35) { recordLight(light); sound.mark(light.last?1:-1); lightClock=0; }
        if (guided) {
          guidedElapsed+=dt;
          if (guidedElapsed>=lightStory[light.step].duration) {
            if (light.step<lightStory.length-1) setLight(light.step+1,false);
            else { guided=false; syncMotion(); announce('A sequência terminou. Você pode rever as cenas ou continuar para os pares.'); }
          }
          $('film-progress').style.width=`${Math.min(100,guidedElapsed/lightStory[light.step].duration*100)}%`;
        }
      }
      if (pairVisible) {
        pair.elapsed+=dt; pairClock+=dt;
        if (pairClock>1.45) { recordPairs(pair); sound.mark(pair.last.a); pairClock=0; }
      }
      displayClock+=dt;
      if (displayClock>.25) { renderLightReadout(); renderPairReadout(); displayClock=0; }
      if (raw>.045) slow++; else slow=Math.max(0,slow-1);
      if (slow>30) { heroField.reduceQuality(); storyField.reduceQuality(); lightPainter.quality=1; pairPainter.quality=1; lightPainter.detail=.65; slow=0; }
    }
    if (!paused || dirty) {
      if (heroVisible) heroField.draw(visualTime,1,pointer);
      if (lightVisible || contemplating) { storyField.draw(light.displayTime,light.coherence); lightPainter.fieldFallback=!storyField.ready; lightPainter.light(light,light.displayTime); }
      if (pairVisible && !contemplating) pairPainter.pairs(pair,pair.elapsed);
      dirty=false;
    }
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
