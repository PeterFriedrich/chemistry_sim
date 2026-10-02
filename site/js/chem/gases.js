// Chemistry 20 gases: the gas laws, PV = nRT, molar volume, and lab analyses.
// Units are R's (DATA_SHEET.md §2): P in kPa, V in L, T in K, n in mol, m in g.
// The combined gas law is a ratio, so it also works in atm or mL as long as
// both states use the same unit; temperatures must always be kelvin.
//
// Significant figures follow the student method (owner, 2026-10-02):
// - a typed value has the sig figs it is written with; trailing zeros count
//   ("450 kPa", "300 mL" are 3 sig figs), as question writers intend;
// - °C → K is a sum, so the addition rule applies: K keeps the °C value's
//   decimal places, at most two (273.15). 27 °C → 300 K (3 sig figs);
// - products and quotients keep the fewest sig figs, R (8.314) included;
// - STP and SATP are definitions, so they never limit an answer.
import { R, STP, SATP, KELVIN_OFFSET, AIR_MOLAR_MASS } from './constants.js';
import { molarMass } from './electrolysis.js';
import { analyse } from './bonding.js';

export const conditions = { STP, SATP };

const digits = (s) => s.replace(/[-+.]/g, '').replace(/^0+/, '').length;

// A typed measurement: '0.52', '450', '3.1e12'. { value, sig, dp } or { error }.
export function reading(str) {
  const s = String(str).trim().replace(/\s+/g, '');
  const m = /^([+-]?(?:\d+\.?\d*|\.\d+))(?:e([+-]?\d+))?$/i.exec(s);
  if (!m) return { error: `“${str}” is not a number` };
  const [, mant, exp = '0'] = m;
  const frac = mant.includes('.') ? mant.split('.')[1].length : 0;
  return { value: Number(s), sig: Math.max(1, digits(mant)), dp: frac - Number(exp) };
}

// Sig figs of a value rounded to dp decimal places (the addition rule's result).
function sigAtDp(x, dp) {
  const d = Math.max(0, dp);
  const r = Math.round(x * 10 ** d) / 10 ** d;
  return { value: r, sig: Math.max(1, digits(r.toFixed(d))) };
}

// A typed temperature in 'C' or 'K' → { K, sig, shown, dp } or { error }. K is
// the unrounded sum; `shown` is the kelvin value the student writes down, to dp places.
export function kelvin(r, unit) {
  if (r.error) return r;
  const K = unit === 'C' ? r.value + KELVIN_OFFSET : r.value;
  if (!(K > 0)) return { error: 'The temperature must be above absolute zero (−273.15 °C, 0 K)' };
  if (unit !== 'C') return { K, sig: r.sig, shown: K, dp: Math.max(0, r.dp) };
  const dp = Math.min(r.dp, 2);
  const s = sigAtDp(K, dp);
  return { K, sig: s.sig, shown: s.value, dp: Math.max(0, dp) };
}

// Mass lost by a gas canister: a difference, so the addition rule.
export function massLost(before, after) {
  const dp = Math.min(before.dp, after.dp);
  const m = before.value - after.value;
  if (!(m > 0)) return { error: 'The canister must lose mass: the mass before must be larger than the mass after' };
  const s = sigAtDp(m, dp);
  return { m: s.value, sig: s.sig };
}

export const answerSig = (...sigs) => Math.max(1, Math.min(...sigs.filter((s) => s !== undefined)));

// Sig figs of a molar mass from the booklet's masses (to 0.01 g/mol).
export const molarMassSig = (M) => digits(M.toFixed(2));

const VARS = ['P', 'V', 'T'];

// P1V1/T1 = P2V2/T2. `known` holds five of P1, V1, T1, P2, V2, T2 (or fewer
// when `hold` names the variable that stays the same: 'P' Charles, 'V'
// Gay-Lussac, 'T' Boyle, null combined). Returns the six values.
export function combined(known, unknown, hold = null) {
  const v = { ...known };
  if (hold) {
    if (unknown[0] === hold) return { error: `${hold} is held constant, so it cannot be the unknown` };
    // A held variable cancels, so a question need not give it.
    v[`${hold}1`] ??= 1;
    v[`${hold}2`] = v[`${hold}1`];
  }
  const side = unknown[1];
  const other = side === '1' ? '2' : '1';
  for (const k of [...VARS.map((x) => x + other), ...VARS.map((x) => x + side).filter((x) => x !== unknown)]) {
    if (!(v[k] > 0)) return { error: `${k} must be greater than 0` };
  }
  const k = (v[`P${other}`] * v[`V${other}`]) / v[`T${other}`];
  const [P, V, T] = VARS.map((x) => v[x + side]);
  v[unknown] = unknown[0] === 'P' ? (k * T) / V : unknown[0] === 'V' ? (k * T) / P : (P * V) / k;
  return v;
}

// PV = nRT, solved for the one of P, V, n, T named by `unknown`.
export function ideal(known, unknown) {
  const { P, V, n, T } = known;
  for (const k of ['P', 'V', 'n', 'T'].filter((x) => x !== unknown)) {
    if (!(known[k] > 0)) return { error: `${k} must be greater than 0` };
  }
  const out = { ...known };
  if (unknown === 'P') out.P = (n * R * T) / V;
  if (unknown === 'V') out.V = (n * R * T) / P;
  if (unknown === 'n') out.n = (P * V) / (R * T);
  if (unknown === 'T') out.T = (P * V) / (n * R);
  return out;
}

// Molar volume V = RT/P (neither booklet prints one), and the 3-sig-fig value
// students use: 22.4 L/mol at STP, 24.8 L/mol at SATP.
export const molarVolume = ({ T, P }) => (R * T) / P;
export const molarVolumeRounded = (c) => Number(molarVolume(c).toPrecision(3));

// The water-displacement lab: an experimental molar mass from m, P, V, T,
// or an experimental R when the gas (so M) is known.
export const labMolarMass = ({ m, P, V, T }) => (m * R * T) / (P * V);
export const labR = ({ m, M, P, V, T }) => (P * V) / ((m / M) * T);

// % difference = |experimental − predicted| ÷ predicted × 100 %.
export const percentDifference = (experimental, predicted) => (Math.abs(experimental - predicted) / predicted) * 100;

// Gases in the review questions. `drawn` is the structure `bonding` reads
// (butane needs a condensed formula); null for the noble gases, which are
// single atoms, and for air, a mixture.
export const gases = [
  ['hydrogen', 'H2'], ['helium', 'He'], ['neon', 'Ne'], ['argon', 'Ar'], ['nitrogen', 'N2'],
  ['oxygen', 'O2'], ['fluorine', 'F2'], ['chlorine', 'Cl2'], ['carbon dioxide', 'CO2'],
  ['carbon monoxide', 'CO'], ['methane', 'CH4'], ['ethane', 'C2H6'], ['ethene', 'C2H4'],
  ['ethyne (acetylene)', 'C2H2'], ['propane', 'C3H8'], ['butane', 'C4H10', 'CH3CH2CH2CH3'],
  ['ammonia', 'NH3'], ['hydrogen chloride', 'HCl'], ['hydrogen sulfide', 'H2S'],
  ['sulfur dioxide', 'SO2'], ['sulfur trioxide', 'SO3'], ['nitrogen monoxide', 'NO'], ['nitrogen dioxide', 'NO2'],
].map(([name, formula, drawn = formula]) => ({
  id: formula, name, formula, M: molarMass(`${formula}(g)`), drawn: ['He', 'Ne', 'Ar'].includes(formula) ? null : drawn,
})).concat({ id: 'air', name: 'dry air', formula: null, M: AIR_MOLAR_MASS, drawn: null });

// Collecting a gas over water (package: "polar gases dissolve in water").
// { polar: true | false | null, why }, null when `bonding` cannot draw it.
export function overWater(gas) {
  if (gas.id === 'air') return { polar: false, why: 'air is mostly N₂ and O₂, both nonpolar' };
  if (!gas.drawn) return { polar: false, why: 'a noble gas is single atoms: nonpolar' };
  const a = analyse(gas.drawn);
  if (a.error) return { polar: null, why: 'its Lewis structure needs a coordinate bond or an expanded octet (beyond Chemistry 20), so this sim cannot tell its polarity' };
  return { polar: a.polar, why: a.polar ? 'its molecules are polar' : 'its molecules are nonpolar' };
}

// A kelvin answer back to °C: the student subtracts 273.15 from the rounded
// kelvin value, and the addition rule keeps its decimal places (none fewer than 0).
export function celsius(K, sig) {
  const dp = Math.max(0, sig - 1 - Math.floor(Math.log10(K)));
  const shown = Number(K.toPrecision(sig));
  const c = shown - KELVIN_OFFSET;
  // Half away from zero (243.2 − 273.15 = −29.95 → −30.0), past float residue.
  return { value: (Math.sign(c) * Math.round(Math.abs(c) * 10 ** dp + 1e-9)) / 10 ** dp || 0, dp };
}
