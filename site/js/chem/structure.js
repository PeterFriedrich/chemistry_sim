// Chemistry 20 molecules with more than one central atom: condensed
// structural formulas, bond orders by bonding capacity, structural isomers,
// and the 3-D directions of every bond.
//
// A molecule is a tree of "heavy" atoms (bonding capacity 2 or more: C, N, O,
// S, …), each carrying its "terminal" atoms (capacity 1: H and the halogens).
// Only trees: rings are beyond Chemistry 20, so a ring structure is never
// read or generated.
//
// Reading a condensed formula (CH3CH2OH, CH3CH(CH3)CH3, CH3COOH): each heavy
// atom bonds to the heavy atom written before it; H and halogens bond to the
// heavy atom they follow (or, at the very start, the first one: HOCH2CH3);
// a bracketed group is a branch on the atom before it. An O (or S) with no H
// that cannot sit in the chain is a C=O branch on the atom before it
// (CH3COCH3, CH3COOH), the way these formulas are written.
//
// Bond orders follow from bonding capacity alone: in a tree, a leaf spends
// all of its remaining capacity on its one neighbour, and so on inward.
import { elements } from './elements-data.js';
import { lewis } from './periodic.js';

export const MAX_HEAVY = 6;

export const capacity = (sym) => lewis(elements[sym].Z)?.single ?? 0;
export const lonePairs = (sym) => lewis(elements[sym].Z)?.pairs ?? 0;

// mol = { atoms: [{ sym, terms: ['H', 'Cl', …] }], edges: [{ i, j, order }] }

function adjacency(mol) {
  const adj = mol.atoms.map(() => []);
  mol.edges.forEach((e, k) => {
    adj[e.i].push({ w: e.j, order: e.order, k });
    adj[e.j].push({ w: e.i, order: e.order, k });
  });
  return adj;
}

// Bond orders from the leaves in. Returns null, or the reason it fails.
export function assignOrders(mol) {
  const adj = adjacency(mol);
  const seen = new Set();
  const visit = (v, parent) => {
    seen.add(v);
    let used = mol.atoms[v].terms.length;
    for (const { w, k } of adj[v]) {
      if (w === parent) continue;
      const err = visit(w, v);
      if (err) return err;
      used += mol.edges[k].order;
    }
    const left = capacity(mol.atoms[v].sym) - used;
    const sym = mol.atoms[v].sym;
    if (parent === -1) {
      if (left > 0) return `${sym} would keep ${left} unpaired electron${left === 1 ? '' : 's'}`;
      if (left < 0) return `${sym} would need ${used} bonds, more than its bonding capacity of ${capacity(sym)}`;
      return null;
    }
    if (left < 1) return `${sym} would have no bonding capacity left for the bond to the atom before it`;
    if (left > 3) return `${sym} would need a bond of order ${left}; a triple bond is the most there is`;
    mol.edges[adj[v].find((a) => a.w === parent).k].order = left;
    return null;
  };
  return visit(0, -1);
}

// Condensed formula → mol, or { molecular: true } when an element count shows
// it is a molecular formula (C2H6O), or { error }. `tokens` from parseFormula.
export function parseCondensed(tokens) {
  const build = (pendants) => {
    const atoms = [];
    const edges = [];
    const parentOf = [];
    const walk = (list, attachTo) => {
      let cur = null;
      let waitTerms = [];
      let waitGroups = [];
      const place = (sym) => {
        const i = atoms.length;
        atoms.push({ sym, terms: [] });
        // a C=O branch passes the chain on to the atom it hangs from
        let link = cur ?? attachTo;
        if (link !== null && link === cur && pendants.has(cur)) link = parentOf[cur];
        parentOf[i] = link;
        if (link !== null) edges.push({ i: link, j: i, order: 0 });
        cur = i;
        atoms[i].terms.push(...waitTerms);
        waitTerms = [];
        const groups = waitGroups;
        waitGroups = [];
        groups.forEach((g) => walk(g, i));
      };
      for (const t of list) {
        if (t.group) {
          for (let k = 0; k < t.count; k++) (cur === null ? waitGroups.push(t.group) : walk(t.group, cur));
          continue;
        }
        const cap = capacity(t.sym);
        if (cap === 1) {
          const into = cur === null ? waitTerms : atoms[cur].terms;
          into.push(...Array(t.count).fill(t.sym));
          continue;
        }
        if (t.count !== 1) throw 'molecular';
        place(t.sym);
      }
      if (cur === null) throw 'empty';
    };
    walk(tokens, null);
    return { atoms, edges };
  };

  let first;
  try {
    first = build(new Set());
  } catch (e) {
    if (e === 'molecular') return { molecular: true };
    return { error: 'A bracket needs an atom that can bond to more than one other atom, such as (CH3) or (OH).' };
  }
  if (first.atoms.length > MAX_HEAVY) return { error: `This sim draws up to ${MAX_HEAVY} atoms other than H and the halogens.` };
  // O or S with no H and an atom after it in its chain may be a C=O branch.
  const candidates = first.atoms
    .map((a, i) => i)
    .filter((i) => capacity(first.atoms[i].sym) === 2 && first.atoms[i].terms.length === 0 && first.edges.some((e) => e.i === i) && first.edges.some((e) => e.j === i));
  let firstError = null;
  for (let size = 0; size <= candidates.length; size++) {
    for (const set of subsets(candidates, size)) {
      const mol = build(new Set(set));
      const err = assignOrders(mol);
      if (!err) return { mol, pendants: set.length };
      firstError ??= err;
    }
  }
  return { error: firstError };
}

function* subsets(list, size, start = 0, acc = []) {
  if (acc.length === size) {
    yield acc;
    return;
  }
  for (let i = start; i < list.length; i++) yield* subsets(list, size, i + 1, [...acc, list[i]]);
}

// A string that is the same for every drawing of the same structure.
export function canonical(mol, withOrders = true) {
  const adj = adjacency(mol);
  const terms = (v) => mol.atoms[v].terms.slice().sort().join('');
  const enc = (v, parent) => `${mol.atoms[v].sym}${terms(v)}(${adj[v]
    .filter((a) => a.w !== parent)
    .map((a) => `${withOrders ? a.order : ''}${enc(a.w, v)}`)
    .sort()
    .join(',')})`;
  return mol.atoms.map((_, v) => enc(v, -1)).sort()[0];
}

// The branch that starts at heavy atom w, seen from its neighbour `from`.
export function branchKey(mol, w, from) {
  const sub = { atoms: [], edges: [] };
  const copy = (v, parent, pi) => {
    const i = sub.atoms.push(mol.atoms[v]) - 1;
    if (pi !== null) sub.edges.push({ i: pi, j: i, order: mol.edges.find((e) => (e.i === v && e.j === parent) || (e.j === v && e.i === parent)).order });
    mol.edges.forEach((e) => {
      const u = e.i === v ? e.j : e.j === v ? e.i : null;
      if (u !== null && u !== parent) copy(u, v, i);
    });
  };
  copy(w, from, null);
  return canonical(sub);
}

// Molecular formula in Hill order: C, H, then the rest alphabetically.
export function molecularFormula(mol) {
  const n = {};
  for (const a of mol.atoms) [a.sym, ...a.terms].forEach((s) => (n[s] = (n[s] ?? 0) + 1));
  const keys = Object.keys(n).sort();
  const order = n.C ? ['C', ...(n.H ? ['H'] : []), ...keys.filter((k) => k !== 'C' && k !== 'H')] : keys;
  return order.map((k) => `${k}${n[k] > 1 ? n[k] : ''}`).join('');
}

// Every acyclic structure that uses each atom's full bonding capacity.
// `heavy` and `terminals` are lists of symbols.
export function isomers(heavy, terminals) {
  if (heavy.length > MAX_HEAVY || heavy.length < 2) return [];
  // 1. the distinct trees of heavy atoms
  const trees = new Map();
  const grow = (atoms, edges, left) => {
    if (!left.length) {
      const mol = { atoms: atoms.map((sym) => ({ sym, terms: [] })), edges };
      const key = canonical(mol, false);
      if (!trees.has(key)) trees.set(key, mol);
      return;
    }
    for (const sym of new Set(left)) {
      const rest = left.slice();
      rest.splice(rest.indexOf(sym), 1);
      for (let p = 0; p < atoms.length; p++) grow([...atoms, sym], [...edges, { i: p, j: atoms.length, order: 0 }], rest);
    }
  };
  for (const sym of new Set(heavy)) {
    const rest = heavy.slice();
    rest.splice(rest.indexOf(sym), 1);
    grow([sym], [], rest);
  }
  // 2. bond orders, then 3. which heavy atom holds each terminal atom
  const hal = terminals.filter((s) => s !== 'H').sort();
  const out = new Map();
  for (const tree of trees.values()) {
    const E = tree.edges.length;
    for (let code = 0; code < 3 ** E; code++) {
      const orders = tree.edges.map((_, k) => 1 + (Math.floor(code / 3 ** k) % 3));
      const free = tree.atoms.map((a) => capacity(a.sym));
      tree.edges.forEach((e, k) => {
        free[e.i] -= orders[k];
        free[e.j] -= orders[k];
      });
      if (free.some((f) => f < 0) || free.reduce((s, f) => s + f, 0) !== terminals.length) continue;
      const place = (h, slots, terms) => {
        if (h === hal.length) {
          const mol = {
            atoms: tree.atoms.map((a, v) => ({ sym: a.sym, terms: [...terms[v], ...Array(slots[v]).fill('H')] })),
            edges: tree.edges.map((e, k) => ({ ...e, order: orders[k] })),
          };
          const key = canonical(mol);
          if (!out.has(key)) out.set(key, mol);
          return;
        }
        for (let v = 0; v < slots.length; v++) {
          if (!slots[v]) continue;
          slots[v]--;
          terms[v].push(hal[h]);
          place(h + 1, slots, terms);
          terms[v].pop();
          slots[v]++;
        }
      };
      place(0, free.slice(), tree.atoms.map(() => []));
    }
  }
  return [...out.values()];
}

// The longest chain of heavy atoms, as it is written: most carbons in it,
// fewest brackets, starting with C where it can.
export function mainChain(mol) {
  const adj = adjacency(mol);
  const paths = [];
  const extend = (path) => {
    const v = path[path.length - 1];
    let grew = false;
    for (const { w } of adj[v]) {
      if (path.includes(w)) continue;
      grew = true;
      extend([...path, w]);
    }
    if (!grew) paths.push(path);
  };
  mol.atoms.forEach((_, v) => adj[v].length <= 1 && extend([v]));
  // a C=O at the end of a chain can also be written as a side group (HCOOH)
  for (const p of paths.slice()) {
    if (p.length > 2 && isPendant(mol, adj, p[p.length - 1])) paths.push(p.slice(0, -1));
    if (p.length > 2 && isPendant(mol, adj, p[0])) paths.push(p.slice(1));
  }
  const carbons = (p) => p.filter((v) => mol.atoms[v].sym === 'C').length;
  const score = (p) => {
    const s = condensed(mol, p);
    return [(s.match(/\(/g) ?? []).length, -carbons(p), mol.atoms[p[0]].sym === 'C' ? 0 : 1, -p.length, s.length, s];
  };
  const cmp = (a, b) => {
    for (let k = 0; k < a.length; k++) if (a[k] !== b[k]) return a[k] < b[k] ? -1 : 1;
    return 0;
  };
  return paths.map((p) => [score(p), p]).sort((a, b) => cmp(a[0], b[0]))[0][1];
}

// One heavy atom with its H and halogens: CH3, CHCl2, OH.
export function atomText({ sym, terms }) {
  const count = (s) => terms.filter((x) => x === s).length;
  return sym + [...new Set(['H', ...terms.filter((x) => x !== 'H').sort()])].filter(count).map((s) => `${s}${count(s) > 1 ? count(s) : ''}`).join('');
}

// The condensed formula written along `path` (default: the main chain).
export function condensed(mol, path = mainChain(mol)) {
  const adj = adjacency(mol);
  const unit = (v) => atomText(mol.atoms[v]);
  // a branch is written from its first atom outward (depth 1 or more)
  const branch = (v, parent) => unit(v) + adj[v].filter((a) => a.w !== parent).map((a) => sideOf(a.w, v)).join('');
  const sideOf = (w, v) => (isPendant(mol, adj, w) ? mol.atoms[w].sym : `(${branch(w, v)})`);
  return path.map((v, k) => {
    const onPath = new Set([path[k - 1], path[k + 1]]);
    const sides = adj[v].filter((a) => !onPath.has(a.w));
    const pend = sides.filter((a) => isPendant(mol, adj, a.w)).map((a) => mol.atoms[a.w].sym);
    const groups = sides.filter((a) => !isPendant(mol, adj, a.w)).map((a) => `(${branch(a.w, v)})`);
    const counted = [...new Set(groups)].map((g) => {
      const n = groups.filter((x) => x === g).length;
      return n > 1 ? `${g}${n}` : g;
    });
    // the first atom's H goes in front where that is how it is written: HO–, H2N–, HC≡
    const u = unit(v);
    const t = mol.atoms[v].terms;
    const lead = k === 0 && t.length && (mol.atoms[v].sym !== 'C' || (t.length === 1 && t[0] === 'H'));
    return (lead ? u.slice(mol.atoms[v].sym.length) + mol.atoms[v].sym : u) + counted.join('') + pend.join('');
  }).join('');
}

// A leaf O or S with no H: written inline as the C=O of CH3COCH3.
const isPendant = (mol, adj, w) => adj[w].length === 1 && mol.atoms[w].terms.length === 0 && capacity(mol.atoms[w].sym) === 2;

// Unit vectors (x, y, z) for every electron group on every heavy atom, built
// outward from one end of the main chain with ideal VSEPR angles, each new
// bond anti to the one before it (the stretched-out zigzag).
// Returns { dirs: [[{ to, dir }]], }: `to` is a heavy index, 'T<k>' for the
// k-th terminal, or 'L' for a lone pair.
export function geometry(mol, path = mainChain(mol)) {
  const adj = adjacency(mol);
  const out = mol.atoms.map(() => []);
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const norm = (a) => {
    const m = Math.hypot(...a);
    return a.map((x) => x / m);
  };
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const onPath = (w) => path.indexOf(w);
  const build = (v, back, ref, parent) => {
    // children: the chain first, then branches, terminals, lone pairs
    const heavy = adj[v].filter((a) => a.w !== parent).sort((a, b) => (onPath(b.w) >= 0) - (onPath(a.w) >= 0));
    const groups = [...heavy.map((a) => a.w), ...mol.atoms[v].terms.map((_, k) => `T${k}`), ...Array(lonePairs(mol.atoms[v].sym)).fill('L')];
    const g = groups.length + (parent === -1 ? 0 : 1);
    const theta = g === 4 ? Math.acos(-1 / 3) : g === 3 ? (2 * Math.PI) / 3 : Math.PI;
    const phis = g === 4 ? [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3] : g === 3 ? [0, Math.PI] : [0];
    let a = back;
    let p = ref.map((x, k) => x - dot(ref, a) * a[k]);
    if (Math.hypot(...p) < 1e-9) p = [0, 0, 1].map((x, k) => x - a[2] * a[k]);
    p = norm(p);
    const q = cross(a, p);
    const dirAt = (phi) => a.map((x, k) => x * Math.cos(theta) + (p[k] * Math.cos(phi) + q[k] * Math.sin(phi)) * Math.sin(theta));
    let list = groups;
    if (parent === -1) {
      // the first group takes the axis itself; the rest spread around it
      out[v].push({ to: groups[0], dir: a });
      list = groups.slice(1);
    }
    list.forEach((to, k) => out[v].push({ to, dir: dirAt(phis[k]) }));
    for (const { to, dir } of out[v]) {
      if (typeof to !== 'number') continue;
      build(to, dir.map((x) => -x), back.map((x) => -x), v);
    }
    if (parent !== -1) out[v].unshift({ to: parent, dir: back });
  };
  build(path[0], [1, 0, 0], [0, 1, 0], -1);
  return out;
}
