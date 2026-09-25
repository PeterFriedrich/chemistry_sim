// Chemical equilibrium and Le Châtelier's principle, with concentrations in
// mol/L. Kc = Π[products]^n / Π[reactants]^n, leaving out pure liquids and
// solids (H2O(l)); Q is the same expression away from equilibrium. Q < Kc
// shifts forward, Q > Kc in reverse. ΔH < 0 is exothermic, from the Data
// Booklet's ΔfH° via hess.js.
//
// The booklet prints no Kc values: each preset's equilibrium concentrations are
// illustrative round numbers and Kc is calculated from them. A temperature change
// multiplies or divides Kc by TEMPERATURE_FACTOR — illustrative too, since the
// course has no formula for the new Kc (docs/DECISIONS.md).
import { reactionEnthalpy } from './hess.js';

export const TEMPERATURE_FACTOR = 3;

export const systems = [
  {
    id: 'haber',
    reactants: [[1, 'N2(g)'], [3, 'H2(g)']],
    products: [[2, 'NH3(g)']],
    start: { 'N2(g)': 0.5, 'H2(g)': 0.8, 'NH3(g)': 0.2 },
    thermo: true,
  },
  {
    id: 'contact',
    reactants: [[2, 'SO2(g)'], [1, 'O2(g)']],
    products: [[2, 'SO3(g)']],
    start: { 'SO2(g)': 0.4, 'O2(g)': 0.2, 'SO3(g)': 0.5 },
    thermo: true,
  },
  {
    id: 'no2',
    reactants: [[2, 'NO2(g)']],
    products: [[1, 'N2O4(g)']],
    start: { 'NO2(g)': 0.2, 'N2O4(g)': 0.4 },
    thermo: true,
  },
  {
    // No ΔfH° for these ions in the booklet, so no temperature stress.
    id: 'chromate',
    reactants: [[2, 'CrO4^2-(aq)'], [2, 'H3O^+(aq)']],
    products: [[1, 'Cr2O7^2-(aq)'], [3, 'H2O(l)']],
    start: { 'CrO4^2-(aq)': 0.15, 'H3O^+(aq)': 0.1, 'Cr2O7^2-(aq)': 0.1 },
    thermo: false,
  },
];

const inK = (species) => !/\((l|s)\)$/.test(species);
const isGas = (species) => species.endsWith('(g)');

// The species in the Kc expression: numerator (products) and denominator (reactants).
export function expression(sys) {
  return { num: sys.products.filter(([, s]) => inK(s)), den: sys.reactants.filter(([, s]) => inK(s)) };
}

export function massAction(sys, c) {
  const { num, den } = expression(sys);
  const prod = (side) => side.reduce((q, [n, s]) => q * c[s] ** n, 1);
  return prod(num) / prod(den);
}

export function deltaH(sys) {
  return sys.thermo ? reactionEnthalpy(sys).dH : null;
}

export const gasMoles = (side) => side.reduce((n, [k, s]) => n + (isGas(s) ? k : 0), 0);
export const isGasSystem = (sys) => [...sys.reactants, ...sys.products].some(([, s]) => isGas(s));

// 'forward' when Q < K, 'reverse' when Q > K, 'none' when equal (to rounding).
export function shiftDirection(Q, K) {
  if (Math.abs(Q - K) <= 1e-9 * K) return 'none';
  return Q < K ? 'forward' : 'reverse';
}

// The state just after a stress: concentrations `c`, `K`, relative volume `V`.
//   add         [X] += amount           remove  [X] halved
//   volume      V ×= factor, every gas concentration ÷ factor
//   temperature dir = +1 raises T: K ÷ factor if exothermic, × factor if endothermic
//   catalyst, inert (inert gas at constant volume): nothing in Q or K changes
export function applyStress(sys, state, stress) {
  const c = { ...state.c };
  let { K, V } = state;
  if (stress.kind === 'add') c[stress.species] += stress.amount;
  else if (stress.kind === 'remove') c[stress.species] /= 2;
  else if (stress.kind === 'volume') {
    V *= stress.factor;
    for (const s of Object.keys(c)) if (isGas(s)) c[s] /= stress.factor;
  } else if (stress.kind === 'temperature') {
    const up = Math.sign(stress.dir) * (deltaH(sys) < 0 ? -1 : 1);
    K *= TEMPERATURE_FACTOR ** up;
  }
  return { c, K, V };
}

// New equilibrium from concentrations c at constant K: find the extent x
// (mol/L of reaction as written) where Q = K. ln Q rises with x, so bisection
// between the limits that keep every concentration positive.
export function equilibrate(sys, c, K) {
  const nu = [...sys.reactants.map(([n, s]) => [-n, s]), ...sys.products.map(([n, s]) => [n, s])].filter(([, s]) => inK(s));
  let lo = Math.max(...nu.filter(([n]) => n > 0).map(([n, s]) => -c[s] / n));
  let hi = Math.min(...nu.filter(([n]) => n < 0).map(([n, s]) => c[s] / -n));
  const at = (x) => Object.fromEntries(Object.entries(c).map(([s, v]) => [s, v + x * (nu.find(([, t]) => t === s)?.[0] ?? 0)]));
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (Math.log(massAction(sys, at(mid))) < Math.log(K)) lo = mid;
    else hi = mid;
  }
  return at((lo + hi) / 2);
}
