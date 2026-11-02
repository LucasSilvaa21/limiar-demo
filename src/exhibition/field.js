const vertex = `
attribute vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`;

const fragment = `
precision highp float;
uniform vec2 resolution;
uniform float time;
uniform float kind;
uniform float coherence;
uniform vec2 pointer;

float noise(vec2 p) { return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }

void main() {
  vec2 uv = gl_FragCoord.xy / resolution;
  vec2 p = (gl_FragCoord.xy - .5 * resolution) / resolution.y;
  vec3 color = vec3(.055,.045,.072);
  if (kind < .5) {
    p.x -= resolution.x / resolution.y < 1.15 ? .02 : .36;
    p += pointer * .035;
    p *= 1.6;
    p = mat2(.92,-.39,.39,.92) * p;
    p.x *= .88;
    float a = atan(p.y,p.x);
    float r = length(p);
    float fold = r + .13*sin(3.*a + time*.16) + .045*sin(7.*a-time*.1);
    float envelope = exp(-pow(abs((fold-.58)/.255), 4.));
    float filament = pow(.5+.5*cos(141.*fold+4.*sin(2.*a)+time*.24), 13.);
    float silk = pow(.5+.5*sin(48.*fold+3.*a-time*.16), 4.) * .19;
    float rim = exp(-abs(fold-.8)*110.)*.9 + exp(-abs(fold-.35)*85.)*.45;
    float light = (.12+filament*.8+silk+rim)*envelope;
    float side = .5+.5*sin(a*2.+fold*5.-time*.08);
    vec3 cold = vec3(.42,.53,.94);
    vec3 warm = vec3(.95,.51,.53);
    vec3 pearl = mix(cold,warm,side);
    pearl = mix(pearl,vec3(.95,.85,.67),pow(.5+.5*cos(a+1.3),12.));
    float depth = .4+.6*pow(.5+.5*sin(a*3.+fold*4.),2.);
    color += pearl * light * depth * 1.18;
    color += pearl * .07 * exp(-pow(abs((r-.6)/.5),2.));
    float mist = exp(-length(p-vec2(.1,-.2))*1.8)*.08;
    color += vec3(.3,.14,.3)*mist;
    color *= .42 + .58*smoothstep(.16,.62,uv.x);
  } else if (kind < 1.5) {
    p *= 2.5;
    float separation = resolution.x / resolution.y * .325;
    p.y *= 1.47;
    float d1 = length(p-vec2(-separation,0.));
    float d2 = length(p-vec2(separation,0.));
    float w1 = cos(d1*29.-time*1.65)/sqrt(1.+d1*2.);
    float w2 = cos(d2*29.-time*1.65)/sqrt(1.+d2*2.);
    float sum = (w1+w2)*.5;
    float crease = pow(abs(sum),3.);
    float contour = pow(.5+.5*cos((d1-d2)*29.),6.);
    float falloff = exp(-length(p)*.55);
    vec3 tint = mix(vec3(.36,.58,.72),vec3(.81,.63,.53),.5+.5*sum);
    color += tint*(crease*.7+contour*.055)*falloff;
    color += vec3(.11,.2,.25)*falloff*.3;
  } else {
    float r = length(p*vec2(.7,1.2));
    float f = p.y + .11*sin(p.x*5.-time*.17) + .06*sin(p.x*9.+time*.12);
    float thread = pow(.5+.5*cos(f*80.+p.x*7.),24.);
    float veil = exp(-r*3.) * (.008+thread*.038) * (.4+coherence*.6);
    color += mix(vec3(.65,.36,.47),vec3(.32,.45,.71),.5+.5*sin(p.x*2.))*veil;
  }
  color += (noise(gl_FragCoord.xy)-.5)*.018;
  color *= 1.-.18*pow(length(uv-.5),1.3);
  gl_FragColor = vec4(color,1.);
}
`;

export class LightField {
  constructor(canvas, kind = 0) {
    this.canvas = canvas; this.kind = kind; this.quality = Math.min(devicePixelRatio || 1, 1.25);
    this.ready = false; this.gl = canvas.getContext('webgl', { alpha: false, antialias: false, powerPreference: 'low-power' });
    if (this.gl) this.setup();
    canvas.parentElement.dataset.field = this.ready ? 'ready' : 'fallback';
    canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); this.ready = false; canvas.parentElement.dataset.field = 'fallback'; });
    canvas.addEventListener('webglcontextrestored', () => { this.setup(); canvas.parentElement.dataset.field = this.ready ? 'ready' : 'fallback'; });
  }
  setup() {
    const gl = this.gl;
    try {
      const shader = (type, source) => {
        const s = gl.createShader(type); gl.shaderSource(s, source); gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
        return s;
      };
      this.program = gl.createProgram();
      const vs = shader(gl.VERTEX_SHADER, vertex); const fs = shader(gl.FRAGMENT_SHADER, fragment);
      gl.attachShader(this.program, vs); gl.attachShader(this.program, fs); gl.linkProgram(this.program);
      gl.deleteShader(vs); gl.deleteShader(fs);
      if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) throw new Error('Programa visual indisponível.');
      gl.useProgram(this.program);
      const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,3,-1,-1,3]), gl.STATIC_DRAW);
      const location = gl.getAttribLocation(this.program, 'position');
      gl.enableVertexAttribArray(location); gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
      this.uniforms = Object.fromEntries(['resolution','time','kind','coherence','pointer'].map(name => [name, gl.getUniformLocation(this.program, name)]));
      this.ready = true;
    } catch { this.ready = false; }
  }
  draw(time, coherence = 1, pointer = [0, 0]) {
    if (!this.ready) return;
    const { canvas, gl } = this; const box = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(box.width * this.quality)); const height = Math.max(1, Math.round(box.height * this.quality));
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    gl.viewport(0,0,width,height); gl.useProgram(this.program);
    gl.uniform2f(this.uniforms.resolution,width,height); gl.uniform1f(this.uniforms.time,time);
    gl.uniform1f(this.uniforms.kind,this.kind); gl.uniform1f(this.uniforms.coherence,coherence); gl.uniform2f(this.uniforms.pointer,...pointer);
    gl.drawArrays(gl.TRIANGLES,0,3);
  }
  reduceQuality() { this.quality = Math.max(.65, this.quality * .8); }
}
