// Simple (coffee-cup) calorimetry, Q = mcΔt. Masses in g, c in J/(g·°C),
// temperatures in °C, heat in J. Sign convention: Q > 0 is heat gained by that
// object, so in an isolated system Q_hot + Q_cold = 0.
// Teaching model (docs/ARCHITECTURE.md §7): the cup absorbs no heat and none is
// lost to the room, as in the textbook "assume a perfect calorimeter" problems.
import { WATER_DENSITY } from './constants.js';

export function heat(m, c, dt) {
  return m * c * dt;
}

// Mass in g of V mL of water, at the textbook 1.00 g/mL.
export function waterMass(V) {
  return V * WATER_DENSITY;
}

// Final temperature when two objects exchange heat only with each other.
export function finalTemperature(m1, c1, t1, m2, c2, t2) {
  // Equal starts: the weighted mean can come back as t1 ± 1 ulp, which the
  // readouts would print as a Δt of −3.55 × 10⁻¹⁵ °C instead of 0.
  if (t1 === t2) return t1;
  return (m1 * c1 * t1 + m2 * c2 * t2) / (m1 * c1 + m2 * c2);
}

// Temperatures part-way to equilibrium, for the animation only (no readout
// uses it): both approach t_f with the same e-folding time, which keeps
// Q_hot + Q_cold = 0 at every instant.
export function temperaturesAt(m1, c1, t1, m2, c2, t2, s) {
  const tf = finalTemperature(m1, c1, t1, m2, c2, t2);
  const f = Math.exp(-s);
  return [tf + (t1 - tf) * f, tf + (t2 - tf) * f];
}
