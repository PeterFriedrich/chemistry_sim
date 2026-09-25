// IUPAC names (1993 recommendations: but-2-ene, propan-2-ol) for the acyclic
// molecules Chemistry 30 names: alkanes, alkenes and alkynes with one multiple
// bond, straight-chain alkyl branches, halogens and one –OH.
//
// A molecule is built from a drawn main chain plus substituents; the parent
// chain is then chosen by the textbook rules, which need not be the chain drawn:
//   1. it contains the carbon bearing –OH,  2. it contains the multiple bond,
//   3. it is the longest,  4. it has the most substituents.
// Numbering gives the lowest locant to –OH, then the multiple bond, then the
// substituent set at the first point of difference, then to the substituent
// cited first alphabetically. Prefixes are alphabetical, ignoring di/tri/tetra.

export const ALKYL = { methyl: 1, ethyl: 2, propyl: 3 };
export const HALO = { F: 'fluoro', Cl: 'chloro', Br: 'bromo', I: 'iodo' };
export const MAX_PARENT = 10;
const STEM = ['', 'meth', 'eth', 'prop', 'but', 'pent', 'hex', 'hept', 'oct', 'non', 'dec'];
const MULT = ['', '', 'di', 'tri', 'tetra', 'penta', 'hexa'];

// spec: { n, bond: { order, pos } (pos = lower carbon), subs: [{ type, pos }] },
// type one of ALKYL's keys, HALO's keys or 'OH'. Atoms are carbons; `main` is
// the drawn position (1…n), `slot`/`depth` place a branch carbon.
export function build({ n, bond = { order: 1, pos: 1 }, subs = [] }) {
  const atoms = [];
  const bonds = [];
  const hetero = [];
  for (let i = 1; i <= n; i++) atoms.push({ main: i });
  for (let i = 1; i < n; i++) bonds.push({ a: i - 1, b: i, order: 1 });
  if (bond.order > 1) {
    if (n < 2) return { error: 'A multiple bond needs at least 2 carbons in the chain.' };
    if (bond.pos < 1 || bond.pos > n - 1) return { error: `The multiple bond at C${bond.pos} is off the end of a ${n}-carbon chain.` };
    bonds[bond.pos - 1].order = bond.order;
  }
  for (const [slot, s] of subs.entries()) {
    if (s.pos < 1 || s.pos > n) return { error: `Substituent ${slot + 1} is on C${s.pos}, but the chain has ${n} carbon${n === 1 ? '' : 's'}.` };
    if (s.type in ALKYL) {
      let prev = s.pos - 1;
      for (let d = 1; d <= ALKYL[s.type]; d++) {
        atoms.push({ main: null, slot, depth: d, attach: s.pos - 1 });
        bonds.push({ a: prev, b: atoms.length - 1, order: 1 });
        prev = atoms.length - 1;
      }
    } else hetero.push({ atom: s.pos - 1, X: s.type, slot });
  }
  if (hetero.filter((h) => h.X === 'OH').length > 1) return { error: 'Only one –OH is named here (diols are beyond this sim).' };
  const mol = { atoms, bonds, hetero };
  for (let i = 0; i < n; i++) {
    const v = valence(mol, i);
    if (v > 4) return { error: `C${i + 1} would have ${v} bonds; carbon forms 4.` };
  }
  return mol;
}

const neighbours = (mol, i) => mol.bonds.filter((b) => b.a === i || b.b === i).map((b) => ({ j: b.a === i ? b.b : b.a, order: b.order }));
const groupsOn = (mol, i) => mol.hetero.filter((h) => h.atom === i);
export const valence = (mol, i) => neighbours(mol, i).reduce((s, x) => s + x.order, 0) + groupsOn(mol, i).length;
export const hydrogens = (mol, i) => 4 - valence(mol, i);

function path(mol, from, to) {
  const prev = new Map([[from, -1]]);
  const queue = [from];
  while (queue.length) {
    const u = queue.shift();
    for (const { j } of neighbours(mol, u)) if (!prev.has(j)) prev.set(j, u), queue.push(j);
  }
  const out = [];
  for (let u = to; u !== -1; u = prev.get(u)) out.unshift(u);
  return out;
}

// The groups hanging off a candidate parent chain: prefixes (alkyl, halo) with
// their index along the chain; `complex` if a branch is itself branched or
// carries a group (named as e.g. isopropyl or chloromethyl, beyond this sim).
function describe(mol, p) {
  const on = new Set(p);
  const prefixes = [];
  let complex = false;
  let oh = null;
  p.forEach((a, k) => {
    for (const h of groupsOn(mol, a)) {
      if (h.X === 'OH') oh = k;
      else prefixes.push({ name: HALO[h.X], k });
    }
    for (const { j } of neighbours(mol, a)) {
      if (on.has(j)) continue;
      let len = 1;
      let prev = a;
      let cur = j;
      for (;;) {
        if (groupsOn(mol, cur).length) complex = true;
        const next = neighbours(mol, cur).filter((x) => x.j !== prev);
        if (next.some((x) => x.order > 1)) complex = true;
        if (next.length > 1) complex = true;
        if (next.length !== 1) break;
        prev = cur;
        cur = next[0].j;
        len++;
      }
      prefixes.push({ name: `${STEM[len] ?? '?'}yl`, k });
    }
  });
  const mb = mol.bonds.find((b) => b.order > 1);
  const mbK = mb && on.has(mb.a) && on.has(mb.b) ? Math.min(p.indexOf(mb.a), p.indexOf(mb.b)) : null;
  return { p, prefixes, complex, oh, mbK, order: mb?.order ?? 1 };
}

const lexLess = (x, y) => {
  for (let i = 0; i < Math.min(x.length, y.length); i++) if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1;
  return 0;
};

// Locants for one direction along the chain (reverse numbers from the far end).
function numbered(d, reverse) {
  const L = d.p.length;
  const loc = (k) => (reverse ? L - k : k + 1);
  const prefixes = d.prefixes.map((x) => ({ name: x.name, loc: loc(x.k) }));
  return {
    p: reverse ? [...d.p].reverse() : d.p,
    oh: d.oh === null ? null : loc(d.oh),
    mb: d.mbK === null ? null : Math.min(loc(d.mbK), loc(d.mbK + 1)),
    order: d.order,
    prefixes,
    complex: d.complex,
  };
}

function compare(x, y) {
  if (x.oh !== y.oh) return x.oh - y.oh;
  if (x.mb !== y.mb) return x.mb - y.mb;
  const set = (v) => v.prefixes.map((q) => q.loc).sort((a, b) => a - b);
  const bySet = lexLess(set(x), set(y));
  if (bySet) return bySet;
  const alpha = (v) => [...v.prefixes].sort((a, b) => a.name.localeCompare(b.name) || a.loc - b.loc).map((q) => q.loc);
  return lexLess(alpha(x), alpha(y));
}

// The parent chain, numbered: { p (atom ids, C1 first), oh, mb, order, prefixes }.
export function parentChain(mol) {
  const leaves = mol.atoms.map((_, i) => i).filter((i) => neighbours(mol, i).length <= 1);
  const ohAtom = mol.hetero.find((h) => h.X === 'OH')?.atom;
  const mb = mol.bonds.find((b) => b.order > 1);
  let cands = [];
  for (let i = 0; i < leaves.length; i++) for (let j = i; j < leaves.length; j++) cands.push(describe(mol, path(mol, leaves[i], leaves[j])));
  if (ohAtom !== undefined) cands = cands.filter((d) => d.p.includes(ohAtom));
  if (mb) cands = cands.filter((d) => d.mbK !== null);
  const longest = Math.max(...cands.map((d) => d.p.length));
  cands = cands.filter((d) => d.p.length === longest);
  const most = Math.max(...cands.map((d) => d.prefixes.length));
  cands = cands.filter((d) => d.prefixes.length === most);
  return cands.flatMap((d) => [numbered(d, false), numbered(d, true)]).sort(compare)[0];
}

export function name(mol) {
  const c = parentChain(mol);
  const L = c.p.length;
  if (c.complex) return { error: 'A branch on the parent chain is itself branched or carries a group (e.g. isopropyl, chloromethyl) — beyond this sim.' };
  if (L > MAX_PARENT) return { error: `The parent chain has ${L} carbons; Chemistry 30 names chains up to ${MAX_PARENT}.` };
  const groups = new Map();
  for (const q of c.prefixes) groups.set(q.name, [...(groups.get(q.name) ?? []), q.loc]);
  const bare = L === 1 || (L === 2 && c.prefixes.length === 1 && c.oh === null);
  const prefix = [...groups.keys()]
    .sort((a, b) => a.localeCompare(b))
    .map((g) => {
      const locs = groups.get(g).sort((a, b) => a - b);
      return (bare ? '' : `${locs.join(',')}-`) + MULT[locs.length] + g;
    })
    .join('-');
  const unsat = c.mb === null ? 'an' : c.order === 2 ? 'en' : 'yn';
  const mbLoc = c.mb !== null && !(L === 2 || (L === 3 && c.oh === null)) ? `-${c.mb}-` : '';
  const ohLoc = c.oh !== null && L > 2 ? `-${c.oh}-` : '';
  const parent = STEM[L] + mbLoc + unsat + (c.oh === null ? 'e' : `${ohLoc}ol`);
  return { name: prefix + parent, chain: c };
}

export function formula(mol) {
  const n = mol.atoms.length;
  let h = 0;
  for (let i = 0; i < n; i++) h += hydrogens(mol, i);
  const count = {};
  for (const x of mol.hetero) {
    const el = x.X === 'OH' ? 'O' : x.X;
    count[el] = (count[el] ?? 0) + 1;
    if (x.X === 'OH') h += 1;
  }
  const part = (el, k) => (k ? el + (k > 1 ? k : '') : '');
  return part('C', n) + part('H', h) + ['Br', 'Cl', 'F', 'I', 'O'].map((el) => part(el, count[el])).join('');
}

// Condensed structural formula along the numbered parent chain, e.g.
// CH3CH(CH3)CH2CH3, CH3CH=CHCH3, CH3CH2CH2OH.
export function condensed(mol, chain) {
  let p = chain.p;
  const hasOH = (a) => groupsOn(mol, a).some((g) => g.X === 'OH');
  if (p.length > 1 && hasOH(p[0])) p = [...p].reverse(); // write CH3CH2OH, not HOCH2CH3
  const on = new Set(p);
  const carbon = (a, k) => {
    const hN = hydrogens(mol, a);
    let s = 'C' + (hN ? 'H' + (hN > 1 ? hN : '') : '');
    const halo = {};
    for (const g of groupsOn(mol, a)) if (g.X !== 'OH') halo[g.X] = (halo[g.X] ?? 0) + 1;
    for (const [el, m] of Object.entries(halo)) s += el + (m > 1 ? m : '');
    if (hasOH(a)) s += k === p.length - 1 && p.length > 1 ? 'OH' : '(OH)';
    const branches = {};
    for (const { j } of neighbours(mol, a)) {
      if (on.has(j)) continue;
      let len = 1;
      for (let prev = a, cur = j, next; (next = neighbours(mol, cur).filter((x) => x.j !== prev)).length; prev = cur, cur = next[0].j) len++;
      const alkyl = 'CH2'.repeat(len - 1) + 'CH3';
      branches[alkyl] = (branches[alkyl] ?? 0) + 1;
    }
    for (const [b, m] of Object.entries(branches)) s += `(${b})` + (m > 1 ? m : '');
    return s;
  };
  const sym = { 1: '', 2: '=', 3: '≡' };
  return p.map((a, k) => (k ? sym[mol.bonds.find((b) => (b.a === a && b.b === p[k - 1]) || (b.b === a && b.a === p[k - 1])).order] : '') + carbon(a, k)).join('');
}

export function families(mol) {
  const out = [];
  if (mol.hetero.some((h) => h.X === 'OH')) out.push('alcohol');
  const mb = mol.bonds.find((b) => b.order > 1);
  if (mb) out.push(mb.order === 2 ? 'alkene' : 'alkyne');
  if (mol.hetero.some((h) => h.X in HALO)) out.push('organic halide');
  if (!out.length) out.push('alkane');
  return out;
}
