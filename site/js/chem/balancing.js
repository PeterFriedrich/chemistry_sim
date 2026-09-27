// Balancing redox equations the Data Booklet does not print, the Chemistry 30
// half-reaction method:
//   1. balance atoms other than O and H;  2. O with H2O;  3. H with H+;
//   4. charge with e− (e− on the left: a reduction; on the right: an oxidation);
//   5. basic solution only: add OH− to both sides to match the H+, combine
//      H+ + OH− → H2O, and cancel water.
// Two halves combine into a net ionic equation with the electrons cancelled
// (netEquation in redox.js). Oxidation numbers follow the Chemistry 30 rules:
// elements 0, monatomic ions their charge, F −1, Group 1 +1, Group 2 +2, H +1,
// O −2, Cl/Br/I −1, applied in that order until one element is left, which the
// sum (= the species' charge) sets. That order is what makes H −1 in metal
// hydrides, O −1 in peroxides and C an average in organic compounds.
// Pure integer arithmetic; no booklet data.
import { netEquation } from './redox.js';

// Skeleton half-reactions from textbook questions (not the booklet).
export const skeletons = [
  ['NO3', 'NO3^-(aq)', 'NO(g)'],
  ['Cr2O7', 'Cr2O7^2-(aq)', 'Cr^3+(aq)'],
  ['MnO4-Mn', 'MnO4^-(aq)', 'Mn^2+(aq)'],
  ['MnO4-MnO2', 'MnO4^-(aq)', 'MnO2(s)'],
  ['ClO3', 'ClO3^-(aq)', 'Cl^-(aq)'],
  ['C2O4', 'C2O4^2-(aq)', 'CO2(g)'],
  ['SO3', 'SO3^2-(aq)', 'SO4^2-(aq)'],
  ['H2O2', 'H2O2(aq)', 'O2(g)'],
  ['C2H5OH', 'C2H5OH(aq)', 'CH3COOH(aq)'],
  ['Fe', 'Fe^2+(aq)', 'Fe^3+(aq)'],
  ['Cu', 'Cu(s)', 'Cu^2+(aq)'],
].map(([id, from, to]) => ({ id, from, to }));

export function atomsOf(species) {
  const body = species.replace(/\((s|l|g|aq)\)$/, '').replace(/\^.*$/, '');
  const stack = [{}];
  const re = /([A-Z][a-z]?|\(|\))(\d*)/g;
  let m;
  while ((m = re.exec(body))) {
    const [, tok, num] = m;
    const k = num ? Number(num) : 1;
    if (tok === '(') stack.push({});
    else if (tok === ')') {
      const inner = stack.pop();
      for (const [el, c] of Object.entries(inner)) stack.at(-1)[el] = (stack.at(-1)[el] ?? 0) + c * k;
    } else stack.at(-1)[tok] = (stack.at(-1)[tok] ?? 0) + k;
  }
  return stack[0];
}

export function chargeOf(species) {
  const m = /\^(\d*)([+-])/.exec(species);
  return m ? (m[2] === '-' ? -1 : 1) * (m[1] ? Number(m[1]) : 1) : 0;
}

const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const WATER = 'H2O(l)';
const HPLUS = 'H^+(aq)';
const OH = 'OH^-(aq)';

// Atom and charge totals for both sides; each electron counts −1.
// A state is { left: [[n, species]], right: [[n, species]], e: { side, n } | null }.
export function tally({ left, right, e }) {
  const side = (list, s) => {
    const atoms = {};
    let q = e && e.side === s ? -e.n : 0;
    for (const [n, sp] of list) {
      for (const [el, c] of Object.entries(atomsOf(sp))) atoms[el] = (atoms[el] ?? 0) + n * c;
      q += n * chargeOf(sp);
    }
    return { atoms, q };
  };
  const L = side(left, 'left');
  const R = side(right, 'right');
  const els = [...new Set([...Object.keys(L.atoms), ...Object.keys(R.atoms)])];
  const rows = els.map((el) => ({ el, left: L.atoms[el] ?? 0, right: R.atoms[el] ?? 0 }));
  const balanced = rows.every((r) => r.left === r.right) && L.q === R.q;
  return { rows, charge: { left: L.q, right: R.q }, balanced };
}

const add = (list, n, sp) => (n > 0 ? [...list, [n, sp]] : list);
const count = (list, el) => list.reduce((t, [n, sp]) => t + n * (atomsOf(sp)[el] ?? 0), 0);
const q = (list) => list.reduce((t, [n, sp]) => t + n * chargeOf(sp), 0);
const snap = (id, left, right, e = null) => ({ id, left, right, e });

// The half-reaction method, one snapshot per step. `half` is the result in the
// table's reduction form ({ ox, e, red }) for netEquation.
export function balanceHalf(sk, medium) {
  const steps = [snap('skeleton', [[1, sk.from]], [[1, sk.to]])];
  // 1. The one element other than O and H, balanced by the lowest whole numbers.
  const key = Object.keys(atomsOf(sk.from)).find((el) => el !== 'O' && el !== 'H');
  let a = 1;
  let b = 1;
  if (key) {
    const ca = atomsOf(sk.from)[key];
    const cb = atomsOf(sk.to)[key];
    const g = gcd(ca, cb);
    a = cb / g;
    b = ca / g;
  }
  let left = [[a, sk.from]];
  let right = [[b, sk.to]];
  steps.push(snap('atoms', left, right));
  // 2. O with H2O.
  const dO = count(left, 'O') - count(right, 'O');
  right = add(right, dO, WATER);
  left = add(left, -dO, WATER);
  steps.push(snap('oxygen', left, right));
  // 3. H with H+.
  const dH = count(left, 'H') - count(right, 'H');
  right = add(right, dH, HPLUS);
  left = add(left, -dH, HPLUS);
  steps.push(snap('hydrogen', left, right));
  // 4. Charge with electrons, on the side with the higher charge.
  const dq = q(left) - q(right);
  const e = { side: dq > 0 ? 'left' : 'right', n: Math.abs(dq) };
  steps.push(snap('charge', left, right, e));
  if (medium === 'basic' && dH !== 0) {
    // 5. k OH− on both sides; the side with k H+ now has k H2O; cancel water.
    const k = Math.abs(dH);
    const hSide = dH > 0 ? 'right' : 'left';
    const withOH = (list) => [...list, [k, OH]];
    steps.push(snap('hydroxide', withOH(left), withOH(right), e));
    const waterOf = (list) => list.find(([, s]) => s === WATER)?.[0] ?? 0;
    const strip = (list) => list.filter(([, s]) => s !== WATER && s !== HPLUS);
    let wL = waterOf(left) + (hSide === 'left' ? k : 0);
    let wR = waterOf(right) + (hSide === 'right' ? k : 0);
    const c = Math.min(wL, wR);
    wL -= c;
    wR -= c;
    // Water before OH− on its side, as students write it.
    left = add(add(strip(left), wL, WATER), hSide === 'right' ? k : 0, OH);
    right = add(add(strip(right), wR, WATER), hSide === 'left' ? k : 0, OH);
    steps.push(snap('water', left, right, e));
  }
  const final = steps.at(-1);
  const reduction = e.side === 'left';
  const half = reduction ? { ox: final.left, e: e.n, red: final.right } : { ox: final.right, e: e.n, red: final.left };
  return { steps, final, reduction, half };
}

// Two balanced halves → net ionic equation. One must be a reduction and the
// other an oxidation; otherwise `problem` says which.
export function combine(sk1, sk2, medium) {
  const h1 = balanceHalf(sk1, medium);
  const h2 = balanceHalf(sk2, medium);
  if (h1.reduction === h2.reduction) return { h1, h2, problem: h1.reduction ? 'both reductions' : 'both oxidations' };
  const red = h1.reduction ? h1 : h2;
  const ox = h1.reduction ? h2 : h1;
  const net = netEquation(red.half, ox.half);
  return { h1, h2, red, ox, kRed: net.electrons / red.half.e, kOx: net.electrons / ox.half.e, net, problem: null };
}

const PRIORITY = [
  [['F'], -1],
  [['Li', 'Na', 'K', 'Rb', 'Cs'], 1],
  [['Be', 'Mg', 'Ca', 'Sr', 'Ba'], 2],
  [['H'], 1],
  [['O'], -2],
  [['Cl', 'Br', 'I'], -1],
];

export function oxidationNumbers(species) {
  const atoms = atomsOf(species);
  const els = Object.keys(atoms);
  const on = {};
  const left = new Set(els);
  for (const [group, value] of PRIORITY) {
    for (const el of group) {
      if (left.size > 1 && left.has(el)) {
        on[el] = value;
        left.delete(el);
      }
    }
  }
  if (left.size !== 1) throw new Error(`Oxidation numbers of ${species} are not set by the rules`);
  const [last] = left;
  const known = Object.entries(on).reduce((t, [el, v]) => t + v * atoms[el], 0);
  on[last] = (chargeOf(species) - known) / atoms[last];
  return Object.fromEntries(els.map((el) => [el, on[el]])); // formula order
}

// Reactions for the oxidation-number mode, already balanced.
export const reactions = [
  ['cuag', [[1, 'Cu(s)'], [2, 'Ag^+(aq)']], [[1, 'Cu^2+(aq)'], [2, 'Ag(s)']]],
  ['mnfe', [[1, 'MnO4^-(aq)'], [8, 'H^+(aq)'], [5, 'Fe^2+(aq)']], [[1, 'Mn^2+(aq)'], [4, 'H2O(l)'], [5, 'Fe^3+(aq)']]],
  ['breath', [[2, 'Cr2O7^2-(aq)'], [16, 'H^+(aq)'], [3, 'C2H5OH(aq)']], [[4, 'Cr^3+(aq)'], [11, 'H2O(l)'], [3, 'CH3COOH(aq)']]],
  ['ch4', [[1, 'CH4(g)'], [2, 'O2(g)']], [[1, 'CO2(g)'], [2, 'H2O(g)']]],
  ['nacl', [[2, 'Na(s)'], [1, 'Cl2(g)']], [[2, 'NaCl(s)']]],
  ['nah', [[2, 'Na(s)'], [1, 'H2(g)']], [[2, 'NaH(s)']]],
  ['h2o2', [[2, 'H2O2(l)']], [[2, 'H2O(l)'], [1, 'O2(g)']]],
  ['neut', [[1, 'H3O^+(aq)'], [1, 'OH^-(aq)']], [[2, 'H2O(l)']]],
  ['agcl', [[1, 'Ag^+(aq)'], [1, 'Cl^-(aq)']], [[1, 'AgCl(s)']]],
].map(([id, left, right]) => ({ id, left, right }));

// Which elements change oxidation number, and the OA and RA. An element's
// value on the left must be one number (true for every preset).
export function redoxAnalysis({ left, right }) {
  const numbers = (side) => side.map(([, s]) => ({ species: s, on: oxidationNumbers(s) }));
  const L = numbers(left);
  const R = numbers(right);
  const changes = [];
  for (const el of new Set(L.flatMap((x) => Object.keys(x.on)))) {
    const from = [...new Set(L.filter((x) => el in x.on).map((x) => x.on[el]))];
    if (from.length !== 1) throw new Error(`${el} has more than one oxidation number on the left`);
    for (const to of new Set(R.filter((x) => el in x.on).map((x) => x.on[el]))) {
      if (to === from[0]) continue;
      changes.push({
        el,
        from: from[0],
        to,
        fromSpecies: L.filter((x) => el in x.on).map((x) => x.species),
        toSpecies: R.filter((x) => el in x.on && x.on[el] === to).map((x) => x.species),
        kind: to > from[0] ? 'oxidized' : 'reduced',
      });
    }
  }
  // The agent is the left-side species carrying the changed element.
  const agent = (kind) => [...new Set(changes.filter((c) => c.kind === kind).flatMap((c) => c.fromSpecies))];
  return { L, R, changes, redox: changes.length > 0, oa: agent('reduced'), ra: agent('oxidized') };
}
