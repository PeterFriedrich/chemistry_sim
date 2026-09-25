// Monoprotic acid–base titration: the numbers a Chemistry 30 student works out
// by hand with the Data Booklet, plus an exact pH used only to draw the curve.
// Units are the booklet's: V in L, c in mol/L, n in mol.
//
// Every pH comes with `sig`, the significant figures in [H₃O⁺]; the pH is
// printed to that many decimal places. Booklet Ka values and Kw carry 2 sig figs.
// Weak acids and bases follow the booklet's rule (p. 9): the approximation
// x = √(Kc) when c > 1000 K, otherwise the quadratic.
import { Kw } from './constants.js';
import { acids } from './acid-data.js';

const TABLE_SIG = 2;
const row = (acid) => acids.find((a) => a.acid === acid);

// `pair` is the analyte's acid–base row: its own row for an acid, its conjugate
// acid's for a weak base (Kb = Kw / Ka); a strong base has none.
export const analytes = [
  { id: 'HCl', kind: 'SA', formula: 'HCl(aq)', pair: row('HCl(aq)') },
  { id: 'HNO3', kind: 'SA', formula: 'HNO3(aq)', pair: row('HNO3(aq)') },
  { id: 'HF', kind: 'WA', formula: 'HF(aq)', pair: row('HF(aq)') },
  { id: 'HNO2', kind: 'WA', formula: 'HNO2(aq)', pair: row('HNO2(aq)') },
  { id: 'HCOOH', kind: 'WA', formula: 'HCOOH(aq)', pair: row('HCOOH(aq)') },
  { id: 'C6H5COOH', kind: 'WA', formula: 'C6H5COOH(aq)', pair: row('C6H5COOH(aq)') },
  { id: 'CH3COOH', kind: 'WA', formula: 'CH3COOH(aq)', pair: row('CH3COOH(aq)') },
  { id: 'HOCl', kind: 'WA', formula: 'HOCl(aq)', pair: row('HOCl(aq)') },
  { id: 'HCN', kind: 'WA', formula: 'HCN(aq)', pair: row('HCN(aq)') },
  { id: 'NaOH', kind: 'SB', formula: 'NaOH(aq)', pair: null },
  { id: 'NH3', kind: 'WB', formula: 'NH3(aq)', pair: row('NH4^+(aq)') },
];

export const isAcid = (a) => a.kind === 'SA' || a.kind === 'WA';
export const titrantFor = (a) => (isAcid(a) ? 'NaOH(aq)' : 'HCl(aq)');
export const pH = (h) => -Math.log10(h);

// Net ionic equation, reactants and products as [coefficient, species].
export function netIonic(a) {
  if (a.kind === 'SA' || a.kind === 'SB') return { reactants: [[1, 'H3O^+(aq)'], [1, 'OH^-(aq)']], products: [[2, 'H2O(l)']] };
  if (a.kind === 'WA') return { reactants: [[1, a.pair.acid], [1, 'OH^-(aq)']], products: [[1, a.pair.base], [1, 'H2O(l)']] };
  return { reactants: [[1, a.pair.base], [1, 'H3O^+(aq)']], products: [[1, a.pair.acid], [1, 'H2O(l)']] };
}

export const moles = (c, V) => c * V;
export const equivalenceVolume = (ca, Va, ct) => (ca * Va) / ct;

// x = [H₃O⁺] from a weak acid (or [OH⁻] from a weak base) of concentration c.
export function weakIonization(c, K) {
  if (c > 1000 * K) return { x: Math.sqrt(K * c), method: 'approximation' };
  return { x: (-K + Math.sqrt(K * K + 4 * K * c)) / 2, method: 'quadratic' };
}

// [H₃O⁺] from a weak acid (`K` = Ka) or weak base (`K` = Kb) solution.
function weak(c, K, base, sigC) {
  const { x, method } = weakIonization(c, K);
  const h = base ? Kw / x : x;
  return { h, pH: pH(h), sig: Math.min(sigC, TABLE_SIG), method };
}

export function initialPH(a, ca, sigC = 3) {
  if (a.kind === 'SA') return { h: ca, pH: pH(ca), sig: sigC, method: 'strong' };
  if (a.kind === 'SB') {
    const h = Kw / ca;
    return { h, pH: pH(h), sig: Math.min(sigC, TABLE_SIG), method: 'strong' };
  }
  return a.kind === 'WA' ? weak(ca, a.pair.Ka, false, sigC) : weak(ca, Kw / a.pair.Ka, true, sigC);
}

// At equivalence only the conjugate is left, diluted into Va + Veq.
export function equivalencePH(a, ca, Va, ct, sigC = 3) {
  const Veq = equivalenceVolume(ca, Va, ct);
  const c = moles(ca, Va) / (Va + Veq);
  if (a.kind === 'SA' || a.kind === 'SB') {
    const h = Math.sqrt(Kw);
    return { h, pH: pH(h), sig: TABLE_SIG, method: 'water', c, species: null };
  }
  if (a.kind === 'WA') return { ...weak(c, Kw / a.pair.Ka, true, sigC), c, species: a.pair.base };
  return { ...weak(c, a.pair.Ka, false, sigC), c, species: a.pair.acid };
}

// Halfway to equivalence [HA] = [A⁻], so Ka = [H₃O⁺]. Strong analytes have none.
export function halfEquivalencePH(a) {
  if (a.kind === 'SA' || a.kind === 'SB') return null;
  return { h: a.pair.Ka, pH: pH(a.pair.Ka), sig: TABLE_SIG };
}

// Which of an indicator's ranges contains the equivalence pH, if any.
export function indicatorFits(ind, pHeq) {
  const range = ind.ranges.find((r) => pHeq >= r.lo && pHeq <= r.hi) ?? null;
  return { fits: !!range, range };
}

// The indicator's colour at a pH: `from` → `to` with `f` the fraction through
// the range (0 below it, 1 above it). Linear across the printed range; the
// colour is for the picture, and no readout depends on `f`.
export function indicatorColour(ind, pHnow) {
  const rs = ind.ranges;
  for (let i = 0; i < rs.length; i++) {
    const r = rs[i];
    if (pHnow < r.lo) return i === 0 ? { from: r.from, to: r.to, f: 0 } : { from: rs[i - 1].from, to: rs[i - 1].to, f: 1 };
    if (pHnow <= r.hi) return { from: r.from, to: r.to, f: (pHnow - r.lo) / (r.hi - r.lo) };
  }
  const last = rs[rs.length - 1];
  return { from: last.from, to: last.to, f: 1 };
}

// Exact pH after adding volume V of titrant: charge balance solved by bisection
// on log[H₃O⁺], with dilution and water's own ionization. Draws the curve only —
// between the marked points a Chemistry 30 student has no hand method.
export function curvePH(a, ca, Va, ct, V) {
  const Vt = Va + V;
  const analyte = (ca * Va) / Vt;
  const titrant = (ct * V) / Vt;
  const K = a.pair?.Ka;
  // f(h) rises with h; its root is the charge balance.
  const f = (h) => {
    const oh = Kw / h;
    if (a.kind === 'SA') return h + titrant - oh - analyte;
    if (a.kind === 'WA') return h + titrant - oh - (analyte * K) / (K + h);
    if (a.kind === 'SB') return h + analyte - oh - titrant;
    return h + (analyte * h) / (K + h) - oh - titrant;
  };
  let lo = -16;
  let hi = 2;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (f(10 ** mid) > 0) hi = mid;
    else lo = mid;
  }
  return -(lo + hi) / 2;
}
