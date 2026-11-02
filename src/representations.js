import { qubit, probabilityPlus, bellProbabilities, bellCorrelation } from './quantum.js';

export function rotatePoint([x, y, z], yaw, pitch) {
  const side = Math.cos(yaw) * x + Math.sin(yaw) * z;
  const depth = -Math.sin(yaw) * x + Math.cos(yaw) * z;
  return [side, Math.cos(pitch) * y - Math.sin(pitch) * depth, Math.sin(pitch) * y + Math.cos(pitch) * depth];
}

export function probabilities(state, basis = 'z') {
  if (state.chapter === 3) return bellProbabilities(state.angleA, state.angleB, state.classical);
  const positive = probabilityPlus(state, basis);
  return [positive, 1 - positive];
}

export function densityMatrix(state) {
  const rho = qubit(state);
  return [[rho.zero, 0], [rho.real, rho.imaginary], [rho.real, -rho.imaginary], [rho.one, 0]];
}

export function phaseCurve(state, samples = 181) {
  return Array.from({ length: samples }, (_, i) => probabilityPlus({ ...state, phase: i / (samples - 1) * 2 * Math.PI }, 'x'));
}

export function correlationCurve(state, samples = 181) {
  return Array.from({ length: samples }, (_, i) => bellCorrelation(state.angleA, i / (samples - 1) * 180, state.classical));
}
