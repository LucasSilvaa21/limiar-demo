const vertex = `
attribute vec2 aPosition;
varying vec2 vUv;
void main() { vUv = aPosition * .5 + .5; gl_Position = vec4(aPosition, 0.0, 1.0); }
`;

const blur = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uImage;
uniform vec2 uStep;
uniform float uThreshold;
vec3 light(vec2 uv) { return max(texture2D(uImage, uv).rgb - uThreshold, 0.0); }
void main() {
  vec3 color = light(vUv) * .227027;
  color += light(vUv + uStep * 1.384615) * .316216;
  color += light(vUv - uStep * 1.384615) * .316216;
  color += light(vUv + uStep * 3.230769) * .070270;
  color += light(vUv - uStep * 3.230769) * .070270;
  gl_FragColor = vec4(color, 1.0);
}
`;

const composite = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uImage;
uniform sampler2D uBloom;
void main() {
  vec3 field = texture2D(uImage, vUv).rgb;
  vec3 glow = texture2D(uBloom, vUv).rgb;
  vec3 light = 1.0 - exp(-(field + glow * 1.6) * 1.45);
  vec3 background = vec3(.03137, .05098, .062745);
  background += vec3(.008, .012, .017) * exp(-length((vUv - .5) * vec2(1.0, 1.2)) * 4.0);
  gl_FragColor = vec4(background + light, 1.0);
}
`;

function makeProgram(gl, source) {
  const program = gl.createProgram();
  for (const [type, text] of [[gl.VERTEX_SHADER, vertex], [gl.FRAGMENT_SHADER, source]]) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, text); gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    gl.attachShader(program, shader);
    gl.deleteShader(shader);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  return { program, position: gl.getAttribLocation(program, 'aPosition'), image: gl.getUniformLocation(program, 'uImage'), bloom: gl.getUniformLocation(program, 'uBloom'), step: gl.getUniformLocation(program, 'uStep'), threshold: gl.getUniformLocation(program, 'uThreshold') };
}

export class PostProcess {
  constructor(gl) {
    this.gl = gl;
    this.blur = makeProgram(gl, blur);
    this.composite = makeProgram(gl, composite);
    this.quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    this.targets = [];
  }

  resize(width, height) {
    if (this.width === width && this.height === height) return;
    const gl = this.gl;
    this.width = width; this.height = height;
    for (const target of this.targets) { gl.deleteTexture(target.texture); gl.deleteFramebuffer(target.framebuffer); }
    this.targets = [1, .5, .5].map(scale => {
      const w = Math.max(1, Math.round(width * scale));
      const h = Math.max(1, Math.round(height * scale));
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      const framebuffer = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('Framebuffer incompleto');
      return { texture, framebuffer, width: w, height: h };
    });
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  begin() {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.targets[0].framebuffer);
    gl.viewport(0, 0, this.width, this.height);
    gl.enable(gl.BLEND);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  pass(program, source, destination) {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, destination?.framebuffer || null);
    gl.viewport(0, 0, destination?.width || this.width, destination?.height || this.height);
    gl.useProgram(program.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.enableVertexAttribArray(program.position);
    gl.vertexAttribPointer(program.position, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, source.texture);
    gl.uniform1i(program.image, 0);
  }

  finish() {
    const gl = this.gl;
    const [scene, horizontal, vertical] = this.targets;
    gl.disable(gl.BLEND);
    this.pass(this.blur, scene, horizontal);
    gl.uniform2f(this.blur.step, 2 / this.width, 0);
    gl.uniform1f(this.blur.threshold, .035);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    this.pass(this.blur, horizontal, vertical);
    gl.uniform2f(this.blur.step, 0, 2 / horizontal.height);
    gl.uniform1f(this.blur.threshold, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    this.pass(this.composite, scene, null);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, vertical.texture);
    gl.uniform1i(this.composite.bloom, 1);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.activeTexture(gl.TEXTURE0);
  }
}
