export const fieldVertex = `
precision highp float;
attribute vec3 aPosition;
attribute float aSeed;
uniform vec2 uResolution;
uniform vec2 uRotation;
uniform float uZoom;
uniform float uDpr;
uniform float uTime;
uniform float uPhase;
uniform float uBalance;
uniform float uCoherence;
uniform float uFade;
uniform float uFlash;
uniform float uRoom;
uniform vec3 uWarm;
uniform vec3 uCool;
varying vec3 vColor;
varying float vAlpha;

vec3 rotate(vec3 p) {
  float cy = cos(uRotation.x), sy = sin(uRotation.x);
  float cx = cos(uRotation.y), sx = sin(uRotation.y);
  p.xz = mat2(cy, -sy, sy, cy) * p.xz;
  p.yz = mat2(cx, -sx, sx, cx) * p.yz;
  return p;
}
void main() {
  vec3 p = aPosition;
  float variance = .49;
  float left = exp(-(pow(p.x + .675, 2.0) + p.y * p.y) / (4.0 * variance));
  float right = exp(-(pow(p.x - .675, 2.0) + p.y * p.y) / (4.0 * variance));
  float crossTerm = 2.0 * sqrt(uBalance * (1.0 - uBalance)) * uCoherence;
  float overlap = exp(-1.35 * 1.35 / (8.0 * variance) - 5.8 * 5.8 * variance / 2.0);
  float normalization = 6.2831853 * variance * (1.0 + crossTerm * overlap * cos(uPhase));
  float probability = ((1.0 - uBalance) * left * left + uBalance * right * right
    + crossTerm * left * right * cos(5.8 * p.y - uPhase)) / normalization;
  probability = max(0.0, probability) * exp(-p.z * p.z / .52);

  // Camadas de luz realçam os contornos. A densidade vem do modelo acima.
  float contour = .72 + .28 * pow(.5 + .5 * cos(p.y * 94.0 + p.z * 13.0), 3.0);
  float signal = pow(probability, .72);
  float phaseColor = .5 + .5 * sin(p.y * 2.9 - uPhase * .5 + p.z * .8);
  vColor = mix(uCool, uWarm, smoothstep(.1, .9, phaseColor));
  vColor = mix(vColor, vec3(1.0, .94, .8), signal * .55 + uFlash * .16);
  vAlpha = signal * contour * (1.7 + .4 * aSeed) * uFade;

  float ribbon = smoothstep(.3, .8, uRoom) * (1.0 - smoothstep(1.2, 1.8, uRoom));
  p.z += ribbon * sin(p.y * 2.4 + uPhase) * .3;
  p.x += sin(p.y * 3.0 + uTime * .16) * .025;
  vec3 view = rotate(p);
  float depth = 6.8 - view.z;
  float aspect = uResolution.x / uResolution.y;
  gl_Position = vec4(view.x * 2.3 * uZoom / aspect, view.y * 2.3 * uZoom, 0.0, depth);
  gl_PointSize = clamp((1.8 + signal * 5.5 + aSeed * .6) * uDpr * 6.0 / depth, 1.0, 9.0);
}
`;

export const pointFragment = `
precision mediump float;
varying vec3 vColor;
varying float vAlpha;
void main() {
  float radius = length(gl_PointCoord - .5) * 2.0;
  if (radius > 1.0) discard;
  float soft = exp(-radius * radius * 4.0) * (1.0 - smoothstep(.7, 1.0, radius));
  gl_FragColor = vec4(vColor, soft * vAlpha);
}
`;

export const pairVertex = `
precision highp float;
attribute vec3 aPosition;
attribute float aSeed;
uniform vec2 uResolution;
uniform vec2 uRotation;
uniform float uZoom;
uniform float uDpr;
uniform float uTime;
uniform vec2 uAngles;
uniform vec3 uWarm;
uniform vec3 uCool;
uniform float uClassical;
uniform float uFlash;
uniform float uFade;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec3 local = aPosition;
  float side = step(.5, aSeed);
  float angle = mix(uAngles.x, uAngles.y, side);
  float density = exp(-dot(local, local) * .72);
  float contour = .55 + .45 * pow(.5 + .5 * cos((local.y * cos(angle) + local.z * sin(angle)) * 35.0), 2.0);
  vec3 p = local * .44;
  p.x += mix(-1.32, 1.32, side);
  p.y += sin(uTime * .23 + side * 3.14) * .045;
  float cy = cos(uRotation.x), sy = sin(uRotation.x);
  float cx = cos(uRotation.y), sx = sin(uRotation.y);
  p.xz = mat2(cy, -sy, sy, cy) * p.xz;
  p.yz = mat2(cx, -sx, sx, cx) * p.yz;
  vColor = mix(uCool, uWarm, side);
  vColor = mix(vColor, vec3(.76, .8, .83), uClassical * .45);
  vColor += uFlash * .14;
  vAlpha = pow(density, .8) * contour * 1.35 * uFade;
  float depth = 6.8 - p.z;
  gl_Position = vec4(p.x * 2.3 * uZoom / (uResolution.x / uResolution.y), p.y * 2.3 * uZoom, 0.0, depth);
  gl_PointSize = (1.6 + density * 4.8) * uDpr * 6.0 / depth;
}
`;

export const guideVertex = `
precision highp float;
attribute vec3 aPosition;
uniform vec2 uResolution;
uniform vec2 uRotation;
uniform float uZoom;
varying float vShade;
uniform float uFade;
void main() {
  vec3 p = aPosition;
  float cy = cos(uRotation.x), sy = sin(uRotation.x);
  float cx = cos(uRotation.y), sx = sin(uRotation.y);
  p.xz = mat2(cy, -sy, sy, cy) * p.xz;
  p.yz = mat2(cx, -sx, sx, cx) * p.yz;
  vShade = (.07 + .055 * (p.z + 2.8) / 5.6) * uFade;
  gl_Position = vec4(p.x * 2.3 * uZoom / (uResolution.x / uResolution.y), p.y * 2.3 * uZoom, 0.0, 6.8 - p.z);
}
`;

export const guideFragment = `
precision mediump float;
varying float vShade;
void main() { gl_FragColor = vec4(.61, .67, .70, vShade); }
`;

export const threadVertex = `
precision highp float;
attribute vec3 aPosition;
uniform vec2 uResolution;
uniform vec2 uRotation;
uniform float uZoom;
uniform float uTime;
uniform float uFade;
uniform float uClassical;
uniform float uFlash;
uniform vec3 uWarm;
uniform vec3 uCool;
varying vec3 vColor;
varying float vAlpha;
void main() {
  float t = aPosition.x;
  float strand = aPosition.y;
  float turn = t * 6.28318 + strand * 6.28318 + uTime * .18;
  vec3 p = vec3((t - .5) * 2.64, sin(turn) * sin(t * 3.14159) * .3, cos(turn) * sin(t * 3.14159) * .4);
  float cy = cos(uRotation.x), sy = sin(uRotation.x);
  float cx = cos(uRotation.y), sx = sin(uRotation.y);
  p.xz = mat2(cy, -sy, sy, cy) * p.xz;
  p.yz = mat2(cx, -sx, sx, cx) * p.yz;
  vColor = mix(uCool, uWarm, t);
  vAlpha = (.09 + uFlash * .18) * uFade * (1.0 - uClassical * .88);
  gl_Position = vec4(p.x * 2.3 * uZoom / (uResolution.x / uResolution.y), p.y * 2.3 * uZoom, 0.0, 6.8 - p.z);
}
`;

export const lineFragment = `
precision mediump float;
varying vec3 vColor;
varying float vAlpha;
void main() { gl_FragColor = vec4(vColor, vAlpha); }
`;

export const environmentVertex = `
precision highp float;
attribute vec3 aPosition;
attribute float aSeed;
uniform vec2 uResolution;
uniform vec2 uRotation;
uniform float uZoom;
uniform float uDpr;
uniform float uTime;
uniform float uFade;
uniform float uContact;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec3 p = normalize(aPosition) * (2.2 + aSeed * 1.2);
  float turn = uTime * (.05 + uContact * .25) + aSeed * 2.0;
  p.xz = mat2(cos(turn), -sin(turn), sin(turn), cos(turn)) * p.xz;
  float cy = cos(uRotation.x), sy = sin(uRotation.x);
  float cx = cos(uRotation.y), sx = sin(uRotation.y);
  p.xz = mat2(cy, -sy, sy, cy) * p.xz;
  p.yz = mat2(cx, -sx, sx, cx) * p.yz;
  vColor = mix(vec3(.5, .69, .73), vec3(.89, .54, .34), aSeed);
  vAlpha = (.04 + .23 * uContact) * uFade;
  float depth = 6.8 - p.z;
  gl_Position = vec4(p.x * 2.3 * uZoom / (uResolution.x / uResolution.y), p.y * 2.3 * uZoom, 0.0, depth);
  gl_PointSize = (1.2 + aSeed * 1.9) * uDpr;
}
`;
