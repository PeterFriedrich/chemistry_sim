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
  ['Zn', 'Zn(s)', 'Zn^2+(aq)'],
  ['NO3-NH4', 'NO3^-(aq)', 'NH4^+(aq)'],
  ['I', 'I^-(aq)', 'I2(s)'],
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

// Add n of a species to a side, merging with any already there (a typed
// H2O2 → H2O keeps its water, and the method may add more).
const add = (list, n, sp) => {
  if (n <= 0) return list;
  return list.some(([, s]) => s === sp) ? list.map(([m, s]) => [s === sp ? m + n : m, s]) : [...list, [n, sp]];
};
const count = (list, el) => list.reduce((t, [n, sp]) => t + n * (atomsOf(sp)[el] ?? 0), 0);
const q = (list) => list.reduce((t, [n, sp]) => t + n * chargeOf(sp), 0);
const snap = (id, left, right, e = null) => ({ id, left, right, e });

// Step 1 of both methods: the element other than O and H (O itself when there
// is none, as in H2O2 → O2; or the skeleton's own `key`), balanced by the
// lowest whole numbers a·from → b·to.
function keyAtoms(sk) {
  const from = atomsOf(sk.from);
  const key = sk.key ?? Object.keys(from).find((el) => el !== 'O' && el !== 'H') ?? 'O';
  const g = gcd(from[key], atomsOf(sk.to)[key]);
  return { key, a: atomsOf(sk.to)[key] / g, b: from[key] / g };
}

// O with H2O, then H with H+: the lists after each, and dH (H+ on the right when > 0).
function waterAndHydrogen(left, right) {
  const dO = count(left, 'O') - count(right, 'O');
  const wL = add(left, -dO, WATER);
  const wR = add(right, dO, WATER);
  const dH = count(wL, 'H') - count(wR, 'H');
  return { water: [wL, wR], hydrogen: [add(wL, -dH, HPLUS), add(wR, dH, HPLUS)], dH };
}

// Basic solution: k OH− on both sides; the side with k H+ now has k H2O; cancel water.
function basic(left, right, dH, e) {
  const k = Math.abs(dH);
  const hSide = dH > 0 ? 'right' : 'left';
  const withOH = (list) => [...list, [k, OH]];
  const waterOf = (list) => list.find(([, s]) => s === WATER)?.[0] ?? 0;
  const strip = (list) => list.filter(([, s]) => s !== WATER && s !== HPLUS);
  let wL = waterOf(left) + (hSide === 'left' ? k : 0);
  let wR = waterOf(right) + (hSide === 'right' ? k : 0);
  const c = Math.min(wL, wR);
  wL -= c;
  wR -= c;
  // Water before OH− on its side, as students write it.
  const L = add(add(strip(left), wL, WATER), hSide === 'right' ? k : 0, OH);
  const R = add(add(strip(right), wR, WATER), hSide === 'left' ? k : 0, OH);
  return [snap('hydroxide', withOH(left), withOH(right), e), snap('water', L, R, e)];
}

// The half-reaction method, one snapshot per step. `half` is the result in the
// table's reduction form ({ ox, e, red }) for netEquation.
export function balanceHalf(sk, medium) {
  const steps = [snap('skeleton', [[1, sk.from]], [[1, sk.to]])];
  // 1. The element other than O and H.
  const { a, b } = keyAtoms(sk);
  steps.push(snap('atoms', [[a, sk.from]], [[b, sk.to]]));
  // 2. O with H2O.  3. H with H+.
  const wh = waterAndHydrogen([[a, sk.from]], [[b, sk.to]]);
  steps.push(snap('oxygen', ...wh.water));
  const [left, right] = wh.hydrogen;
  steps.push(snap('hydrogen', left, right));
  // 4. Charge with electrons, on the side with the higher charge.
  const dq = q(left) - q(right);
  const e = { side: dq > 0 ? 'left' : 'right', n: Math.abs(dq) };
  steps.push(snap('charge', left, right, e));
  if (medium === 'basic' && wh.dH !== 0) steps.push(...basic(left, right, wh.dH, e));
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

// Balancing by oxidation numbers: the changing element's atoms first, then the
// electrons from the change in oxidation number (change per atom × atoms),
// each species multiplied so electrons lost = electrons gained, then O with
// H2O and H with H+ (and OH− in basic solution). The charge then balances by
// itself, which is the check. Same result as the half-reaction method.
export function balanceByOxidationNumbers(sk1, sk2, medium) {
  const halves = [sk1, sk2].map((sk) => {
    const { key, a, b } = keyAtoms(sk);
    const from = oxidationNumbers(sk.from)[key];
    const to = oxidationNumbers(sk.to)[key];
    const atoms = a * atomsOf(sk.from)[key];
    return { sk, key, a, b, from, to, atoms, e: Math.abs(to - from) * atoms, kind: to < from ? 'reduced' : 'oxidized' };
  });
  if (halves.some((h) => h.e === 0)) return { halves, problem: 'no change' };
  if (halves[0].kind === halves[1].kind) return { halves, problem: halves[0].kind === 'reduced' ? 'both reduced' : 'both oxidized' };
  const red = halves.find((h) => h.kind === 'reduced');
  const ox = halves.find((h) => h.kind === 'oxidized');
  const electrons = (red.e * ox.e) / gcd(red.e, ox.e);
  const kRed = electrons / red.e;
  const kOx = electrons / ox.e;
  const steps = [
    snap('skeleton', [[1, red.sk.from], [1, ox.sk.from]], [[1, red.sk.to], [1, ox.sk.to]]),
    snap('atoms', [[red.a, red.sk.from], [ox.a, ox.sk.from]], [[red.b, red.sk.to], [ox.b, ox.sk.to]]),
  ];
  steps.push({ ...steps[1], id: 'electrons' });
  const left = [[red.a * kRed, red.sk.from], [ox.a * kOx, ox.sk.from]];
  const right = [[red.b * kRed, red.sk.to], [ox.b * kOx, ox.sk.to]];
  steps.push(snap('multiply', left, right));
  const wh = waterAndHydrogen(left, right);
  steps.push(snap('oxygen', ...wh.water), snap('hydrogen', ...wh.hydrogen), snap('check', ...wh.hydrogen));
  if (medium === 'basic' && wh.dH !== 0) steps.push(...basic(...wh.hydrogen, wh.dH, null));
  return { halves, red, ox, electrons, kRed, kOx, steps, final: steps.at(-1), problem: null };
}

// A typed skeleton equation, "BrO3- + I- -> Br- + I2": sides split at →, ->
// or =, species at " + " (spaces needed, since charges use + too). Leading
// coefficients are ignored. Returns { left, right } or { error }.
// Water, H+ and OH− in the states the method writes them, so a typed H2O and an added one merge.
const CANON = { H2O: WATER, 'H^+': HPLUS, 'OH^-': OH };
export function parseEquation(input, elements) {
  const sides = input.split(/→|->|=/);
  if (sides.length !== 2) return { error: 'Write one arrow between the two sides, e.g. BrO3- + I- -> Br- + I2.' };
  const out = [];
  for (const side of sides) {
    const list = [];
    for (const raw of side.split(/\s\+\s/)) {
      const t = raw.trim().replace(/^\d+\s*(?=[A-Z[(])/, '');
      if (!t) return { error: 'Each side needs at least one species, separated by " + ".' };
      const p = parseSpecies(t, elements);
      if (p.error) return p;
      const sp = CANON[p.species] ?? p.species;
      if (!list.includes(sp)) list.push(sp);
    }
    out.push(list);
  }
  return { left: out[0], right: out[1] };
}

// Pair each reactant with the product holding the same changing element:
// elements other than O and H first, then O and H (H2O2 → O2). A candidate
// the method adds anyway (H2O, H+, H3O+, OH−) is tried last, so H2O2 pairs
// with O2 before H2O. Left-over H2O, H+ and OH− are dropped: the method adds
// them. Anything else left over has no partner, so it is refused.
const ADDED = [WATER, HPLUS, 'H3O^+', OH];
export function pairHalves(left, right) {
  const L = new Set(left);
  const R = new Set(right);
  const pairs = [];
  const els = [...new Set([...left, ...right].flatMap((s) => Object.keys(atomsOf(s))))];
  const order = [...els.filter((e) => e !== 'O' && e !== 'H'), ...els.filter((e) => e === 'O' || e === 'H')];
  const changes = (el, rs, ps) => rs.flatMap((r) => ps.filter((p) => oxidationNumbers(r)[el] !== oxidationNumbers(p)[el]).map((p) => [r, p]));
  for (const el of order) {
    const has = (set) => [...set].filter((sp) => el in atomsOf(sp));
    const plain = (list) => list.filter((sp) => !ADDED.includes(sp));
    const rs = has(L);
    const ps = has(R);
    let found = null;
    for (const [r, p] of [[plain(rs), plain(ps)], [rs, ps]]) {
      const c = changes(el, r, p);
      if (c.length === 1 && r.length === 1 && p.length === 1) {
        found = c[0];
        break;
      }
    }
    if (found) {
      pairs.push({ from: found[0], to: found[1], key: el });
      L.delete(found[0]);
      R.delete(found[1]);
    } else if (el !== 'O' && el !== 'H' && changes(el, rs, ps).length) {
      return { error: `${el} is in more than one species on a side, so the sim cannot tell which change to follow. Use one species per changing element (a disproportionation needs the half-reaction method).` };
    }
  }
  const leftover = [...L, ...R].filter((sp) => !ADDED.includes(sp));
  if (!pairs.length) return { error: 'No oxidation number changes: this is not a redox reaction.' };
  if (leftover.length) return { error: `${leftover.join(', ')}: no oxidation number change to pair ${leftover.length === 1 ? 'it' : 'them'} with. Leave out spectator ions.` };
  if (pairs.length !== 2) return { error: 'Need exactly one element oxidized and one reduced.' };
  return { pairs, dropped: [...L, ...R] };
}

// The Chemistry 30 rules in full, as a student's reference list. Each step
// below names the rule it used by `id`.
export const RULES = [
  { id: 'element', text: 'An atom in an element is 0', eg: 'Na, O₂, S₈' },
  { id: 'monatomic', text: 'A monatomic ion equals its charge', eg: 'Fe³⁺ is +3, Cl⁻ is −1' },
  { id: 'F', text: 'F is −1 in compounds', eg: 'NaF, OF₂' },
  { id: 'group1', text: 'Group 1 metals are +1 in compounds', eg: 'Na in NaCl' },
  { id: 'group2', text: 'Group 2 metals are +2 in compounds', eg: 'Ca in CaCO₃' },
  { id: 'H', text: 'H is +1 in compounds, except −1 in metal hydrides', eg: 'H₂O; NaH' },
  { id: 'O', text: 'O is −2 in compounds, except −1 in peroxides (and +2 in OF₂)', eg: 'H₂O; H₂O₂' },
  { id: 'halogen', text: 'Cl, Br and I are −1, unless combined with O or F', eg: 'NaCl; not ClO₃⁻' },
  { id: 'sum', text: 'The oxidation numbers add up to 0 in a compound, or to the charge of a polyatomic ion', eg: 'H₂SO₄: 0; SO₄²⁻: −2' },
];

// Applied in this order until one element is left; the sum sets that one.
const PRIORITY = [
  [['F'], -1, 'F is always −1', 'F'],
  [['Li', 'Na', 'K', 'Rb', 'Cs'], 1, 'Group 1 metals are +1', 'group1'],
  [['Be', 'Mg', 'Ca', 'Sr', 'Ba'], 2, 'Group 2 metals are +2', 'group2'],
  [['H'], 1, 'H is +1', 'H'],
  [['O'], -2, 'O is −2', 'O'],
  [['Cl', 'Br', 'I'], -1, 'Cl, Br and I are −1', 'halogen'],
];

// The rules applied one at a time. Each step is { el, value, rule, id } (`also`
// names the exception a sum result lands on: H −1, O not −2); the last
// element's step also has `sum` = { charge, known: [[count, el, value]], count,
// num, den } for "count·x + Σ known = charge", with x = num/den in lowest terms.
// When two or more elements are left that no rule fixes (CuSO4, NH4NO3),
// `problem` lists them: the student splits the compound into its ions first.
export function assignSteps(species) {
  const atoms = atomsOf(species);
  const els = Object.keys(atoms);
  const charge = chargeOf(species);
  if (els.length === 1) {
    const [el] = els;
    const g = gcd(Math.abs(charge), atoms[el]) || 1;
    const rule = charge === 0 ? 'an element on its own is 0' : atoms[el] === 1 ? 'a monatomic ion has its charge' : 'the atoms share the charge';
    const id = charge === 0 ? 'element' : atoms[el] === 1 ? 'monatomic' : 'sum';
    const value = charge / atoms[el];
    return { steps: [{ el, value, rule, id, sum: { charge, known: [], count: atoms[el], num: charge / g, den: atoms[el] / g } }], numbers: { [el]: value }, problem: null };
  }
  const steps = [];
  const left = new Set(els);
  for (const [group, value, rule, id] of PRIORITY) {
    for (const el of group) {
      if (left.size > 1 && left.has(el)) {
        steps.push({ el, value, rule, id });
        left.delete(el);
      }
    }
  }
  if (left.size !== 1) return { steps, numbers: null, problem: [...left] };
  const [last] = left;
  const known = steps.map((st) => [atoms[st.el], st.el, st.value]);
  const num = charge - known.reduce((t, [n, , v]) => t + n * v, 0);
  const g = gcd(Math.abs(num), atoms[last]) || 1;
  const value = num / atoms[last];
  const also = (last === 'H' && value !== 1) || (last === 'O' && value !== -2) ? last : null;
  steps.push({ el: last, value, rule: 'the sum equals the charge', id: 'sum', also, sum: { charge, known, count: atoms[last], num: num / g, den: atoms[last] / g } });
  const numbers = Object.fromEntries(els.map((el) => [el, steps.find((st) => st.el === el).value])); // formula order
  return { steps, numbers, problem: null };
}

const signed = (v) => (v === 0 ? '0' : `${v > 0 ? '+' : '−'}${Math.abs(v)}`);
const xTerm = (c) => (c === 1 ? 'x' : `${c}x`);
// "2 + x − 8": the first term bare, the rest joined by + or −.
const chain = (terms) => terms.map((t, i) => {
  if (typeof t === 'string') return i ? `+ ${t}` : t;
  if (i === 0) return t < 0 ? `−${-t}` : `${t}`;
  return t < 0 ? `− ${-t}` : `+ ${t}`;
}).join(' ');

const shift = (K) => (K < 0 ? `add ${-K} to both sides` : `subtract ${K} from both sides`);

// The algebra a student writes for the element the sum sets, one line each:
// { eq, why }. `order` is the formula's element order; `st` the sum step.
export function algebra(st, order) {
  const { charge, known, count, num, den } = st.sum;
  const q = signed(charge);
  const lines = [{ eq: `let x = the oxidation number of ${st.el}`, why: 'the unknown' }];
  const K = known.reduce((t, [n, , v]) => t + n * v, 0);
  if (known.length) {
    const sub = order.map((el) => {
      if (el === st.el) return xTerm(count);
      const [n, , v] = known.find(([, e]) => e === el);
      return `${n === 1 ? '' : n}(${signed(v)})`;
    });
    lines.push({ eq: `${sub.join(' + ')} = ${q}`, why: 'Σ (atoms × oxidation number) = charge' });
    const products = order.map((el) => {
      if (el === st.el) return xTerm(count);
      const [n, , v] = known.find(([, e]) => e === el);
      return n * v;
    });
    lines.push({ eq: `${chain(products)} = ${q}`, why: 'multiply out' });
    if (known.length > 1) lines.push({ eq: `${chain([xTerm(count), K])} = ${q}`, why: 'collect the numbers' });
    if (charge !== 0) lines.push({ eq: `${xTerm(count)} = ${signed(charge)} ${-K < 0 ? '−' : '+'} ${Math.abs(K)}`, why: shift(K) });
  }
  const total = charge - K;
  const why = !known.length ? st.rule : charge === 0 ? shift(K) : 'simplify';
  lines.push({ eq: `${xTerm(count)} = ${signed(total)}`, why });
  if (count > 1) lines.push({ eq: `x = ${den === 1 ? signed(num) : `${num > 0 ? '+' : '−'}${Math.abs(num)}/${den}`}`, why: `divide by ${count}` });
  // Drop a line that repeats the one before it (one known term: nothing to collect).
  return lines.filter((l, i) => !i || l.eq !== lines[i - 1].eq);
}

export function oxidationNumbers(species) {
  const r = assignSteps(species);
  if (r.problem) throw new Error(`Oxidation numbers of ${species} are not set by the rules`);
  return r.numbers;
}

// What a student types: H2SO4, NO3-, NO3^-, [NO3]-, CO3 2-, CO3^2-, [CO3]2-,
// CO₃²⁻ or Fe^3+. A charge with more than one digit before its sign needs a
// caret, a space or brackets: NO3- is nitrate, not N with a 3− charge; but one
// element then digits (Fe3+, S2-) is read as a monatomic ion. Returns
// { species } in this module's notation (CO3^2-) or { error }. Elements must
// be on the booklet's periodic table.
const SUB = { '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9' };
const SUP = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁺': '+', '⁻': '-' };
export function parseSpecies(input, elements) {
  let t = input.trim().replace(/\((s|l|g|aq)\)$/, '').replace(/[₀-₉]/g, (c) => SUB[c]).replace(/−/g, '-');
  const sup = /[⁰-⁹⁺⁻¹²³]+$/.exec(t);
  if (sup) t = `${t.slice(0, sup.index)}^${[...sup[0]].map((c) => SUP[c]).join('')}`;
  let body = t;
  let mag = 0;
  let sign = '';
  const m = /^\[(.+)\]\s*(\d*)([+-])$/.exec(t) ?? /^(.+?)\^(\d*)([+-])$/.exec(t) ?? /^(.+?)\s+(\d*)([+-])$/.exec(t) ?? /^(.+?)()([+-])$/.exec(t);
  if (m) {
    [, body, mag, sign] = m;
    // One element then digits then a sign (Fe3+, S2-, O2-) is a monatomic ion.
    const lone = !mag && /^([A-Z][a-z]?)(\d+)$/.exec(body);
    if (lone) [, body, mag] = lone;
    mag = mag ? Number(mag) : 1;
  }
  body = body.replace(/\s+/g, '');
  if (!body) return { error: 'Type a formula, e.g. H2SO4 or CO3^2-.' };
  if (!/^([A-Z][a-z]?\d*|\(|\)\d*)+$/.test(body)) return { error: `“${input.trim()}” is not a formula: use element symbols and numbers, e.g. H2SO4, NO3^- or [CO3]2-.` };
  let depth = 0;
  for (const c of body) {
    depth += c === '(' ? 1 : c === ')' ? -1 : 0;
    if (depth < 0) return { error: 'The brackets do not match.' };
  }
  if (depth) return { error: 'The brackets do not match.' };
  const unknown = Object.keys(atomsOf(body)).find((el) => !elements[el]);
  if (unknown) return { error: `${unknown} is not an element on the periodic table.` };
  if (mag === 0) return { species: body };
  return { species: `${body}^${mag === 1 ? '' : mag}${sign}` };
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
