// Electrochemical cells from the booklet's reduction half-reactions.
//   E°cell = E°cathode − E°anode   (both E° as printed: reduction potentials)
// E in V. Sign convention: E°cell > 0 is spontaneous (a voltaic cell); E°cell < 0
// needs an external supply (electrolytic). The strongest oxidizing agent (higher
// E°) is reduced at the cathode; the other half-reaction runs in reverse at the anode.
import { halfReactions } from './redox-data.js';

const find = (ion, reduced) =>
  halfReactions.find((h) => h.ox.some(([, s]) => s === ion) && h.red.some(([, s]) => s === reduced));

// Metal | ion half-cells a student can build on a bench, plus the standard
// hydrogen half-cell (inert Pt electrode). Group 1 and 2 metals past Mg react
// with the water in the beaker, so they are left out.
export const couples = [
  ['Au', 'Au^3+(aq)', 'Au(s)', 'Au(s)'],
  ['Ag', 'Ag^+(aq)', 'Ag(s)', 'Ag(s)'],
  ['Cu', 'Cu^2+(aq)', 'Cu(s)', 'Cu(s)'],
  ['H', 'H^+(aq)', 'H2(g)', 'Pt(s)'],
  ['Pb', 'Pb^2+(aq)', 'Pb(s)', 'Pb(s)'],
  ['Sn', 'Sn^2+(aq)', 'Sn(s)', 'Sn(s)'],
  ['Ni', 'Ni^2+(aq)', 'Ni(s)', 'Ni(s)'],
  ['Co', 'Co^2+(aq)', 'Co(s)', 'Co(s)'],
  ['Cd', 'Cd^2+(aq)', 'Cd(s)', 'Cd(s)'],
  ['Fe', 'Fe^2+(aq)', 'Fe(s)', 'Fe(s)'],
  ['Zn', 'Zn^2+(aq)', 'Zn(s)', 'Zn(s)'],
  ['Al', 'Al^3+(aq)', 'Al(s)', 'Al(s)'],
  ['Mg', 'Mg^2+(aq)', 'Mg(s)', 'Mg(s)'],
].map(([id, ion, reduced, electrode]) => ({ id, ion, reduced, electrode, half: find(ion, reduced) }));

export function cellPotential(eCathode, eAnode) {
  return eCathode - eAnode;
}

// The spontaneous arrangement of two half-cells: higher E° is the cathode.
export function assignElectrodes(a, b) {
  return a.half.E >= b.half.E ? { cathode: a, anode: b } : { cathode: b, anode: a };
}

const gcd = (a, b) => (b ? gcd(b, a % b) : a);

function merge(list) {
  const m = new Map();
  for (const [n, s] of list) m.set(s, (m.get(s) ?? 0) + n);
  return m;
}

// Net equation: the cathode half-reaction as written plus the anode one
// reversed, each scaled so electrons lost = electrons gained, with species
// common to both sides cancelled. `electrons` is the number transferred.
export function netEquation(cathodeHalf, anodeHalf) {
  const k = (cathodeHalf.e * anodeHalf.e) / gcd(cathodeHalf.e, anodeHalf.e);
  const kc = k / cathodeHalf.e;
  const ka = k / anodeHalf.e;
  const left = merge([...cathodeHalf.ox.map(([n, s]) => [n * kc, s]), ...anodeHalf.red.map(([n, s]) => [n * ka, s])]);
  const right = merge([...cathodeHalf.red.map(([n, s]) => [n * kc, s]), ...anodeHalf.ox.map(([n, s]) => [n * ka, s])]);
  for (const [s, n] of left) {
    if (!right.has(s)) continue;
    const c = Math.min(n, right.get(s));
    left.set(s, n - c);
    right.set(s, right.get(s) - c);
  }
  const side = (m) => [...m].filter(([, n]) => n > 0).map(([s, n]) => [n, s]);
  return { reactants: side(left), products: side(right), electrons: k };
}
