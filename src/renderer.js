import { fieldVertex, pointFragment, pairVertex, guideVertex, guideFragment, threadVertex, lineFragment, environmentVertex } from './shaders.js';
import { seededRandom } from './physics.js';
import { PostProcess } from './postprocess.js';

function shader(gl, type, source) {
  const result = gl.createShader(type);
  gl.shaderSource(result, source);
  gl.compileShader(result);
  if (!gl.getShaderParameter(result, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(result);
    gl.deleteShader(result);
    throw new Error(`Shader: ${log}`);
  }
  return result;
}

function program(gl, vertexSource, fragmentSource) {
  const result = gl.createProgram();
  const vertex = shader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragment = shader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  gl.attachShader(result, vertex);
  gl.attachShader(result, fragment);
  gl.linkProgram(result);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(result, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(result));
  const uniforms = {};
  const names = ['uResolution', 'uRotation', 'uZoom', 'uDpr', 'uTime', 'uPhase', 'uBalance', 'uCoherence', 'uFade', 'uFlash', 'uRoom', 'uAngles', 'uWarm', 'uCool', 'uClassical', 'uContact'];
  for (const name of names) uniforms[name] = gl.getUniformLocation(result, name);
  return { program: result, uniforms, position: gl.getAttribLocation(result, 'aPosition'), seed: gl.getAttribLocation(result, 'aSeed') };
}

function buffer(gl, data) {
  const result = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, result);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  return result;
}

export class FieldRenderer {
  constructor(canvas, traces, reducedMotion) {
    this.canvas = canvas;
    this.traces = traces;
    this.ink = traces.getContext('2d');
    this.gl = canvas.getContext('webgl', { alpha: true, antialias: false, depth: false, powerPreference: 'high-performance' });
    if (!this.gl) throw new Error('WebGL indisponível');
    this.reducedMotion = reducedMotion;
    this.rotation = [-.42, .28];
    this.targetRotation = [...this.rotation];
    this.zoom = 1;
    this.targetZoom = 1;
    this.mode = 0;
    this.environment = 0;
    this.room = 0;
    this.classical = 0;
    this.warm = [.96, .76, .49];
    this.cool = [.39, .57, .72];
    this.events = [];
    this.phase = 0;
    this.balance = .5;
    this.coherence = 1;
    this.flash = 0;
    this.time = 0;
    this.dprCap = 1.5;
    this.slowFrames = 0;
    this.lost = false;
    this.setup();
    canvas.addEventListener('webglcontextlost', event => {
      event.preventDefault();
      this.lost = true;
      canvas.dispatchEvent(new CustomEvent('renderstatus', { detail: false }));
    });
    canvas.addEventListener('webglcontextrestored', () => {
      this.setup();
      this.lost = false;
      this.resize();
      canvas.dispatchEvent(new CustomEvent('renderstatus', { detail: true }));
    });
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
  }

  setup() {
    const gl = this.gl;
    this.field = program(gl, fieldVertex, pointFragment);
    this.pair = program(gl, pairVertex, pointFragment);
    this.threads = program(gl, threadVertex, lineFragment);
    this.ambient = program(gl, environmentVertex, pointFragment);
    this.guides = program(gl, guideVertex, guideFragment);
    this.post = new PostProcess(gl);
    const random = seededRandom(137);
    this.pointCount = window.innerWidth < 760 ? 64000 : 128000;
    const points = new Float32Array(this.pointCount * 4);
    for (let index = 0; index < this.pointCount; index++) {
      points[index * 4] = (random() - .5) * 6.6;
      points[index * 4 + 1] = (random() - .5) * 5.6;
      points[index * 4 + 2] = (random() - .5) * 3.6;
      points[index * 4 + 3] = random();
    }
    this.points = buffer(gl, points);
    const threads = [];
    for (let strand = 0; strand < 12; strand++) {
      for (let i = 0; i < 200; i++) {
        threads.push(i / 200, strand / 12, 0, (i + 1) / 200, strand / 12, 0);
      }
    }
    this.threadCount = threads.length / 3;
    this.threadBuffer = buffer(gl, new Float32Array(threads));
    const rings = [];
    for (let axis = 0; axis < 2; axis++) {
      for (let i = 0; i < 360; i++) {
        if (i % 4 === 0) continue;
        for (const angle of [i, i + 1]) {
          const t = angle / 360 * Math.PI * 2;
          rings.push(Math.cos(t) * 2.55, Math.sin(t) * (axis ? .38 : 2.15), Math.sin(t) * (axis ? 2.1 : .12));
        }
      }
    }
    this.guideCount = rings.length / 3;
    this.rings = buffer(gl, new Float32Array(rings));
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.clearColor(0, 0, 0, 0);
  }

  resize() {
    const box = this.canvas.getBoundingClientRect();
    this.width = box.width;
    this.height = box.height;
    this.dpr = Math.min(window.devicePixelRatio || 1, this.dprCap);
    for (const canvas of [this.canvas, this.traces]) {
      const width = Math.max(1, Math.round(box.width * this.dpr));
      const height = Math.max(1, Math.round(box.height * this.dpr));
      if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    }
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.post.resize(this.canvas.width, this.canvas.height);
  }

  measure(outcome, room) {
    this.flash = 1;
    if (room === 3) {
      this.events.push({ x: -1.32, y: outcome.a * .12, age: 0, color: '#a7cae9' }, { x: 1.32, y: outcome.b * .12, age: 0, color: '#e9c5a1' });
    } else this.events.push({ x: outcome === 1 ? -.65 : .65, y: 0, age: 0, color: '#e8d2b0' });
    this.events = this.events.slice(-40);
  }

  use(pass, data, stride = 16) {
    const gl = this.gl;
    gl.useProgram(pass.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, data);
    gl.enableVertexAttribArray(pass.position);
    gl.vertexAttribPointer(pass.position, 3, gl.FLOAT, false, stride, 0);
    if (pass.seed >= 0) {
      gl.enableVertexAttribArray(pass.seed);
      gl.vertexAttribPointer(pass.seed, 1, gl.FLOAT, false, stride, 12);
    }
    const u = pass.uniforms;
    gl.uniform2f(u.uResolution, this.width, this.height);
    gl.uniform2f(u.uRotation, ...this.rotation);
    gl.uniform1f(u.uZoom, this.zoom);
    gl.uniform1f(u.uDpr, this.dpr);
    gl.uniform1f(u.uTime, this.time);
    gl.uniform3fv(u.uWarm, this.warm);
    gl.uniform3fv(u.uCool, this.cool);
    return u;
  }

  project(x, y, z = 0) {
    const [yaw, pitch] = this.rotation;
    const px = Math.cos(yaw) * x + Math.sin(yaw) * z;
    const pz = -Math.sin(yaw) * x + Math.cos(yaw) * z;
    const py = Math.cos(pitch) * y + Math.sin(pitch) * pz;
    const depth = 6.8 - (-Math.sin(pitch) * y + Math.cos(pitch) * pz);
    const scale = this.height * 1.15 * this.zoom / depth;
    return { x: this.width / 2 + px * scale, y: this.height / 2 - py * scale };
  }

  draw(delta, state) {
    if (this.lost || !this.width) return;
    const gl = this.gl;
    const smooth = this.reducedMotion || state.instant ? 1 : 1 - Math.exp(-delta * 5);
    this.mode += ((state.chapter === 3 ? 1 : 0) - this.mode) * smooth;
    this.environment += ((state.chapter === 2 ? 1 : 0) - this.environment) * smooth;
    this.room += (state.chapter - this.room) * smooth;
    this.classical += ((state.classical ? 1 : 0) - this.classical) * smooth;
    const palettes = [[[.96, .76, .49], [.39, .57, .72]], [[.73, .93, .91], [.36, .55, .78]], [[.91, .6, .38], [.55, .67, .72]], [[.98, .74, .5], [.49, .59, .94]]];
    const [warm, cool] = palettes[state.chapter];
    for (let i = 0; i < 3; i++) { this.warm[i] += (warm[i] - this.warm[i]) * smooth; this.cool[i] += (cool[i] - this.cool[i]) * smooth; }
    for (const key of ['phase', 'balance', 'coherence']) this[key] += (state[key] - this[key]) * smooth;
    if (!state.paused && !this.reducedMotion) {
      this.time += delta;
    }
    const drift = this.reducedMotion || state.paused || state.dragging ? 0 : Math.sin(this.time * .16) * .13;
    this.rotation[0] += (this.targetRotation[0] + drift - this.rotation[0]) * smooth;
    this.rotation[1] += (this.targetRotation[1] - this.rotation[1]) * smooth;
    this.zoom += (this.targetZoom - this.zoom) * smooth;
    if (this.reducedMotion) this.flash = 0;
    else if (!state.paused) this.flash *= Math.exp(-delta * 4);
    this.post.begin();
    const guide = this.use(this.guides, this.rings, 12);
    gl.uniform1f(guide.uFade, state.layers?.grid === false ? 0 : 1 - this.mode);
    gl.drawArrays(gl.LINES, 0, this.guideCount);
    const u = this.use(this.field, this.points);
    gl.uniform1f(u.uTime, this.time);
    gl.uniform1f(u.uPhase, this.phase);
    gl.uniform1f(u.uBalance, this.balance);
    gl.uniform1f(u.uCoherence, this.coherence);
    gl.uniform1f(u.uFade, 1 - this.mode);
    gl.uniform1f(u.uFlash, this.flash);
    gl.uniform1f(u.uRoom, this.room);
    gl.drawArrays(gl.POINTS, 0, this.pointCount);
    if (this.mode > .001) {
      const d = this.use(this.pair, this.points);
      gl.uniform1f(d.uFade, this.mode);
      gl.uniform1f(d.uClassical, this.classical);
      gl.uniform1f(d.uFlash, this.flash);
      gl.uniform2f(d.uAngles, state.angleA * Math.PI / 180, state.angleB * Math.PI / 180);
      gl.drawArrays(gl.POINTS, 0, this.pointCount);
      const thread = this.use(this.threads, this.threadBuffer, 12);
      gl.uniform1f(thread.uFade, state.layers?.trajectories === false ? 0 : this.mode);
      gl.uniform1f(thread.uClassical, this.classical);
      gl.uniform1f(thread.uFlash, this.flash);
      gl.drawArrays(gl.LINES, 0, this.threadCount);
    }
    if (this.environment > .001) {
      const ambient = this.use(this.ambient, this.points);
      gl.uniform1f(ambient.uFade, this.environment);
      gl.uniform1f(ambient.uContact, state.isolated ? 0 : state.contact);
      gl.drawArrays(gl.POINTS, 0, 4500);
    }
    this.post.finish();
    this.drawEvents(state.paused || this.reducedMotion ? 0 : delta, state);
    if (delta > .028) this.slowFrames++;
    else this.slowFrames = Math.max(0, this.slowFrames - 1);
    if (this.slowFrames > 150 && this.dprCap > 1) { this.dprCap = 1; this.resize(); this.slowFrames = 0; }
  }

  drawEvents(delta, state) {
    const ctx = this.ink;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.width, this.height);
    if (state.chapter === 3 && state.layers?.axes !== false) {
      const radius = this.height * 1.15 * this.zoom / 6.8 * .76;
      for (const [index, x] of [[0, -1.32], [1, 1.32]]) {
        const center = this.project(x, 0);
        const angle = (index ? state.angleB : state.angleA) * Math.PI / 180;
        const dx = Math.sin(angle) * radius;
        const dy = Math.cos(angle) * radius;
        ctx.strokeStyle = index ? '#e6c09955' : '#abc8e455';
        ctx.lineWidth = .7;
        ctx.beginPath(); ctx.arc(center.x, center.y, radius, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(center.x - dx, center.y - dy); ctx.lineTo(center.x + dx, center.y + dy); ctx.stroke();
        ctx.textAlign = 'center'; ctx.font = '14px "Source Sans 3"'; ctx.fillStyle = '#a2b5be';
        ctx.fillText(`${index ? 'B' : 'A'} · ${index ? state.angleB : state.angleA}°`, center.x, center.y + radius + 18);
        ctx.font = '18px "Source Sans 3"'; ctx.fillStyle = '#d8d9d3';
        const outcome = state.last && (index ? state.last.b : state.last.a);
        ctx.fillText(outcome ? (outcome > 0 ? '+' : '−') : '·', center.x, center.y + radius + 39);
      }
    }
    for (const event of this.events) {
      event.age += delta;
      if (state.layers?.trajectories === false) continue;
      const screen = this.project(event.x, event.y);
      ctx.globalAlpha = Math.exp(-event.age * 2);
      ctx.strokeStyle = event.color;
      ctx.fillStyle = event.color;
      ctx.lineWidth = .8;
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, 2, 0, Math.PI * 2);
      ctx.fill();
      if (!this.reducedMotion) {
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, 4 + event.age * 25, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    this.events = this.events.filter(event => event.age < 3);
    ctx.globalAlpha = 1;
  }
}
