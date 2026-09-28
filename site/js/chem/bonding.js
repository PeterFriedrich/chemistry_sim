// Chemistry 20 molecules: Lewis structure by bonding capacity, VSEPR shape,
// bond polarity from the booklet's electronegativities, molecular polarity.
//
// Bonding capacity is the number of unpaired electrons in the atom's Lewis
// symbol (`lewis` in periodic.js): C 4, N 3, O 2, H and the halogens 1. Each
// terminal atom spends all of its capacity on the central atom, so the bond
// order to a terminal atom equals that atom's capacity, and the terminal
// capacities must add up to the central atom's. Molecules that need a
// coordinate bond or an expanded octet (CO, SO2, PCl5) are refused.
//
// Molecules with more than one central atom (CH3CH2OH, CH3CN) are read as a
// condensed structural formula by structure.js; each central atom gets its
// own shape, and polarity is the sum of every bond dipole on the stretched-out
// (zigzag) shape. A molecular formula (C2H6O) is drawn only when it has one
// structure; otherwise its isomers are listed.
//
// Bonds: ΔEN = 0 nonpolar covalent, 0 < ΔEN < 1.7 polar covalent,
// ΔEN ≥ 1.7 ionic (owner's choice). The bond dipole points to the more
// electronegative atom (δ−).
import { elements } from './elements-data.js';
import { parseFormula, isMetal } from './naming.js';
import { capacity, lonePairs, MAX_HEAVY, parseCondensed, isomers, canonical, condensed, mainChain, geometry, molecularFormula, branchKey, atomText } from './structure.js';

export const IONIC_CUTOFF = 1.7;

export const enOf = (sym) => elements[sym].en;


// ΔEN rounded to the booklet's 1 d.p., so 3.4 − 2.2 is 1.2 and not 1.1999….
export function deltaEN(a, b) {
  return Math.round(Math.abs(elements[a].en - elements[b].en) * 10) / 10;
}

// Every bond here joins two nonmetals, so one past the cut-off (H–F 1.8,
// B–F 2.0) is named as the rule gives it and flagged as still shared.
export function bondType(dEN) {
  if (dEN === 0) return 'nonpolar covalent';
  return dEN < IONIC_CUTOFF ? 'polar covalent' : 'ionic by the ΔEN rule (≥ 1.7), but two nonmetals share these electrons: a very polar covalent bond';
}

// Unit vectors for each electron group, x right, y up, z toward the viewer.
// Tetrahedral: one straight up, one in the page down-right, one wedge, one dash.
const [t1, t2, t3] = [Math.sqrt(8 / 9), Math.sqrt(2 / 9), Math.sqrt(2 / 3)];
const T = [[0, 1, 0], [t1, -1 / 3, 0], [-t2, -1 / 3, t3], [-t2, -1 / 3, -t3]];
const h = Math.sqrt(3) / 2;
const b = (104.5 / 2) * (Math.PI / 180);
const SHAPES = {
  '1-0': { name: 'linear', angle: null, bonds: [[1, 0, 0]], lone: [] },
  '2-0': { name: 'linear', angle: '180°', bonds: [[-1, 0, 0], [1, 0, 0]], lone: [] },
  '3-0': { name: 'trigonal planar', angle: '120°', bonds: [[0, 1, 0], [h, -0.5, 0], [-h, -0.5, 0]], lone: [] },
  '4-0': { name: 'tetrahedral', angle: '109.5°', bonds: T, lone: [] },
  '2-1': { name: 'V-shaped (bent)', angle: 'about 120°', bonds: [[-h, -0.5, 0], [h, -0.5, 0]], lone: [[0, 1, 0]] },
  '3-1': { name: 'trigonal pyramidal', angle: 'about 107°', bonds: T.slice(1), lone: [T[0]] },
  // Bent in the page, lone pairs above it, out of the page and into it.
  '2-2': { name: 'V-shaped (bent)', angle: 'about 105°', bonds: [[-Math.sin(b), -Math.cos(b), 0], [Math.sin(b), -Math.cos(b), 0]], lone: [[0, 0.6, 0.8], [0, 0.6, -0.8]] },
};

// { central, terminals: [{ sym, order, lone }], centralLone, shape, bonds, polar, net, steps, atoms }
// for one central atom; { chain: true, … } (see analyseChain) for more; or { error, isomers? }.
export function analyse(input) {
  const f = parseFormula(input);
  if (f.error) return f;
  if (f.hydrate || f.state) return { error: 'Type the molecule alone, without (g), (aq) or water of hydration.' };
  const atoms = [];
  const expand = (tokens, k = 1) => tokens.forEach((t) => (t.group ? expand(t.group, k * t.count) : atoms.push(...Array(t.count * k).fill(t.sym))));
  expand(f.tokens);
  const metal = atoms.find(isMetal);
  if (metal) return { error: `${elements[metal].name[0].toUpperCase()}${elements[metal].name.slice(1)} is a metal: a metal with a nonmetal forms an ionic compound (ions, not a molecule). This sim draws molecules of nonmetals.` };
  const noEN = atoms.find((s) => elements[s].en === undefined);
  if (noEN) return { error: `${elements[noEN].name[0].toUpperCase()}${elements[noEN].name.slice(1)} has no electronegativity in the booklet${capacity(noEN) === 0 ? ' and a bonding capacity of 0: noble gases do not usually form bonds' : ''}.` };
  if (atoms.length < 2) return { error: 'A molecule needs at least two atoms.' };
  const inert = atoms.find((s) => capacity(s) === 0);
  if (inert) return { error: `${elements[inert].name[0].toUpperCase()}${elements[inert].name.slice(1)} has a bonding capacity of 0 (no unpaired electrons in its Lewis symbol), so it forms no bonds in Chemistry 20.` };

  const heavy = atoms.filter((s) => capacity(s) >= 2);
  if (atoms.length > 2 && heavy.length >= 2) {
    const one = analyseOne(f, atoms);
    return one.error ? analyseChain(f, atoms) : one;
  }
  return analyseOne(f, atoms);
}

function analyseOne(f, atoms) {
  const steps = [];
  const cap = (s) => `${s} ${capacity(s)}`;
  const distinct = [...new Set(atoms)];
  steps.push(`Bonding capacity (unpaired electrons in each Lewis symbol): ${distinct.map(cap).join(', ')}.`);

  let central;
  let terminals;
  if (atoms.length === 2) {
    const [a, c] = atoms;
    if (capacity(a) !== capacity(c)) return { error: `${a} can form ${capacity(a)} bond${capacity(a) === 1 ? '' : 's'} and ${c} can form ${capacity(c)}, so ${a}${c} cannot use every unpaired electron. It needs a coordinate bond, which is beyond Chemistry 20.` };
    central = a;
    terminals = [c];
    steps.push(`Two atoms, each with ${capacity(a)} unpaired electron${capacity(a) === 1 ? '' : 's'}: they share ${capacity(a)} pair${capacity(a) === 1 ? '' : 's'} → a ${['', 'single', 'double', 'triple'][capacity(a)]} bond.`);
  } else {
    // The central atom: the non-hydrogen atom with the highest capacity, present once.
    const candidates = distinct.filter((s) => s !== 'H').sort((x, y) => capacity(y) - capacity(x));
    const top = candidates[0];
    if (!top) return { error: 'Only hydrogen: H2 is the only molecule of hydrogen alone.' };
    const count = atoms.filter((s) => s === top).length;
    if (count > 1) return { error: `There are ${count} ${elements[top].name} atoms that could each be central. This sim draws molecules with one central atom.` };
    if (candidates[1] && capacity(candidates[1]) === capacity(top)) return { error: `${top} and ${candidates[1]} have the same bonding capacity, so neither is clearly central. This sim draws molecules with one central atom.` };
    central = top;
    const i = atoms.indexOf(top);
    terminals = atoms.filter((_, k) => k !== i);
    steps.push(`Central atom: ${central}, the atom with the highest bonding capacity (hydrogen is never central).`);
    const need = terminals.reduce((s, t) => s + capacity(t), 0);
    if (need !== capacity(central)) {
      return { error: `The outer atoms need ${need} bond${need === 1 ? '' : 's'} to ${central}, but ${central} has a bonding capacity of ${capacity(central)}. ${need > capacity(central) ? 'This needs an expanded octet or a coordinate bond' : 'This leaves unpaired electrons, or needs a coordinate bond'}, which is beyond Chemistry 20.` };
    }
    steps.push(`Each outer atom uses all its bonding capacity on ${central}: ${terminals.map(cap).join(' + ')} = ${need} = ${central}'s capacity.`);
  }

  const term = terminals.map((sym) => ({ sym, order: capacity(sym), lone: lonePairs(sym) }));
  const multiple = term.filter((t) => t.order > 1);
  if (multiple.length && atoms.length > 2) steps.push(`${multiple.map((t) => `${central}${t.order === 2 ? '=' : '≡'}${t.sym}`).join(', ')}: a capacity of ${multiple.map((t) => t.order).join(' and ')} means a ${multiple.map((t) => ['', '', 'double', 'triple'][t.order]).join(' and a ')} bond.`);
  const centralLone = lonePairs(central);
  const loneText = (n) => `${n} lone pair${n === 1 ? '' : 's'}`;
  steps.push(`Lone pairs stay where the Lewis symbols had them: ${central} ${centralLone}${[...new Set(terminals)].map((s) => `, ${s} ${lonePairs(s)}`).join('')}.`);

  const groups = atoms.length === 2 ? 1 : term.length;
  const shape = SHAPES[`${groups}-${atoms.length === 2 ? 0 : centralLone}`];
  if (atoms.length > 2) {
    steps.push(`Around ${central}: ${term.length} bonded atom${term.length === 1 ? '' : 's'} + ${loneText(centralLone)} = ${term.length + centralLone} electron groups, spread as far apart as possible → ${shape.name}${centralLone ? ' (the lone pairs are there but not part of the shape’s name)' : ''}.`);
  }

  const bonds = term.map((t, k) => {
    const dEN = deltaEN(central, t.sym);
    const toward = dEN === 0 ? null : elements[t.sym].en > elements[central].en ? t.sym : central;
    return { a: central, b: t.sym, order: t.order, dEN, type: bondType(dEN), toward, dir: shape.bonds[k] };
  });

  // Net dipole: each bond dipole, ΔEN long, points to its δ− atom.
  const net = [0, 0, 0];
  for (const bd of bonds) {
    if (!bd.toward) continue;
    const s = bd.toward === bd.b ? 1 : -1;
    bd.dir.forEach((v, j) => (net[j] += s * bd.dEN * v));
  }
  const size = Math.hypot(...net);
  const polar = size > 1e-6;
  const allNonpolar = bonds.every((bd) => bd.dEN === 0);
  let reason;
  if (allNonpolar) reason = 'every bond is nonpolar (ΔEN = 0), so there are no dipoles to add';
  else if (atoms.length === 2) reason = 'one polar bond, so the molecule has a dipole';
  else if (!polar) reason = `the ${shape.name} shape is symmetrical, with identical outer atoms and no lone pairs on ${central}, so the bond dipoles cancel`;
  else if (centralLone) reason = `the lone pair${centralLone > 1 ? 's' : ''} on ${central} make${centralLone > 1 ? '' : 's'} the shape unsymmetrical, so the bond dipoles do not cancel`;
  else reason = `the outer atoms are not all the same, so the bond dipoles do not cancel`;

  return {
    formula: f.body,
    atoms,
    central,
    centralLone,
    terminals: term,
    diatomic: atoms.length === 2,
    shape,
    bonds,
    net: polar ? net.map((v) => v / size) : null,
    polar,
    reason,
    steps,
  };
}

const bondName = (order) => ['', 'single', 'double', 'triple'][order];

// A molecule with two or more central atoms. { chain: true, formula,
// molecular, structure, path, atoms, centres: [{ v, label, bonded, lone, shape }],
// bonds: [{ a, b, i, j, order, dEN, type, toward, dir }], net, polar, reason,
// steps, isomers: [{ formula, current }] }.
function analyseChain(f, atoms) {
  const heavy = atoms.filter((s) => capacity(s) >= 2);
  const terms = atoms.filter((s) => capacity(s) === 1);
  if (heavy.length > MAX_HEAVY) return { error: `This sim draws up to ${MAX_HEAVY} atoms other than H and the halogens.` };
  const all = isomers(heavy, terms);
  const list = (mol) => all.map((m) => ({ formula: condensed(m), current: !!mol && canonical(m) === canonical(mol) }));
  // analyseOne only fails here on choosing a central atom, so its message no longer applies
  const noStructure = `No structure joins these atoms using every atom's bonding capacity: it would need a coordinate bond or an expanded octet (or a ring), which is beyond Chemistry 20.`;
  const steps = [];
  const distinct = [...new Set(atoms)];
  steps.push(`Bonding capacity (unpaired electrons in each Lewis symbol): ${distinct.map((s) => `${s} ${capacity(s)}`).join(', ')}.`);

  let mol;
  const read = parseCondensed(f.tokens);
  if (read.molecular) {
    if (!all.length) return { error: noStructure };
    if (all.length > 1) {
      const names = all.map((m) => condensed(m));
      return { error: `${f.body} is a molecular formula with ${all.length} possible structures (isomers). Type one as a condensed formula, such as ${names.slice(0, 2).join(' or ')}, or pick one from the list.`, isomers: list(null) };
    }
    mol = all[0];
    steps.push(`${f.body} has only one structure that uses every atom's bonding capacity: ${condensed(mol)}.`);
  } else if (read.error) {
    return { error: `Reading ${f.body} left to right, ${read.error}.${all.length ? ' Try one of the structures in the list.' : ''}`, isomers: list(null) };
  } else {
    mol = read.mol;
    steps.push(`Read the condensed formula left to right: each C, N, O… bonds to the atom before it, H and halogens bond to the atom they follow, and a bracketed group is a branch.${read.pendants ? ' An O with no H that cannot sit in the chain is a C=O on the atom before it.' : ''}`);
  }

  const path = mainChain(mol);
  const dirs = geometry(mol, path);
  const bonds = [];
  mol.atoms.forEach((atom, v) => {
    for (const { to, dir } of dirs[v]) {
      if (to === 'L' || (typeof to === 'number' && to < v)) continue;
      const other = typeof to === 'number' ? mol.atoms[to].sym : atom.terms[+to.slice(1)];
      const order = typeof to === 'number' ? mol.edges.find((e) => (e.i === v && e.j === to) || (e.j === v && e.i === to)).order : 1;
      const dEN = deltaEN(atom.sym, other);
      const toward = dEN === 0 ? null : elements[other].en > elements[atom.sym].en ? other : atom.sym;
      bonds.push({ a: atom.sym, b: other, i: v, j: to, order, dEN, type: bondType(dEN), toward, dir });
    }
  });

  const multiple = mol.edges.filter((e) => e.order > 1).map((e) => `${mol.atoms[e.i].sym}${e.order === 2 ? '=' : '≡'}${mol.atoms[e.j].sym} ${bondName(e.order)}`);
  steps.push(`Each atom's capacity left after its H and halogens is shared with its neighbours, working in from the ends: ${multiple.length ? `${[...new Set(multiple)].join(', ')}; every other bond is single` : 'every bond is single'}.`);
  const withLone = distinct.filter((s) => lonePairs(s) > 0);
  if (withLone.length) steps.push(`Lone pairs stay where the Lewis symbols had them: ${withLone.map((s) => `${s} ${lonePairs(s)}`).join(', ')}.`);

  const centres = [];
  mol.atoms.forEach((atom, v) => {
    const bonded = dirs[v].filter((d) => d.to !== 'L').length;
    if (bonded < 2) return;
    const lone = lonePairs(atom.sym);
    centres.push({ v, label: atomText(atom), bonded, lone, shape: SHAPES[`${bonded}-${lone}`] });
  });
  const seen = new Set();
  steps.push(`Around each central atom, bonded atoms + lone pairs = electron groups (a double or triple bond is one group): ${centres
    .map((c) => `${c.label} ${c.bonded} + ${c.lone} = ${c.bonded + c.lone} → ${c.shape.name}`)
    .filter((t) => !seen.has(t) && seen.add(t))
    .join('; ')}.`);

  const net = [0, 0, 0];
  for (const bd of bonds) {
    if (!bd.toward) continue;
    const s = bd.toward === bd.b ? 1 : -1;
    bd.dir.forEach((x, k) => (net[k] += s * bd.dEN * x));
  }
  const size = Math.hypot(...net);
  const polar = size > 1e-6;
  const hydrocarbon = atoms.every((s) => s === 'C' || s === 'H');
  let reason;
  if (bonds.every((bd) => bd.dEN === 0)) reason = 'every bond is nonpolar (ΔEN = 0), so there are no dipoles to add';
  else if (hydrocarbon) reason = 'a hydrocarbon: the C–H bond dipoles cancel around every carbon, so they cancel in the whole molecule';
  else if (polar) reason = `the polar bonds (${[...new Set(bonds.filter((bd) => bd.toward && !(/^[CH]$/.test(bd.a) && /^[CH]$/.test(bd.b))).map((bd) => [bd.a, bd.b].sort((x, y) => (x === 'C' ? -1 : y === 'C' ? 1 : x < y ? -1 : 1)).join('–')))].join(', ')}) are not arranged symmetrically, so their dipoles do not cancel`;
  else reason = 'the bond dipoles cancel on the stretched-out (zigzag) shape';
  // A C=C with two different groups on each carbon has cis and trans forms.
  const cisTrans = mol.edges.some((e) => {
    if (e.order !== 2 || mol.atoms[e.i].sym !== 'C' || mol.atoms[e.j].sym !== 'C') return false;
    const sides = (v, w) => dirs[v].filter((d) => d.to !== w && d.to !== 'L').map((d) => (typeof d.to === 'number' ? branchKey(mol, d.to, v) : mol.atoms[v].terms[+d.to.slice(1)]));
    return [sides(e.i, e.j), sides(e.j, e.i)].every((g) => g.length === 2 && g[0] !== g[1]);
  });
  if (cisTrans && !hydrocarbon) reason += '. This C=C has cis and trans forms, which this sim does not tell apart, and their polarity can differ';
  steps.push(`Polarity: add the ΔEN bond dipoles on the stretched-out (zigzag) shape → ${polar ? 'polar' : 'nonpolar'}.`);

  return {
    chain: true,
    formula: read.molecular ? condensed(mol) : f.body,
    molecular: molecularFormula(mol),
    structure: mol,
    path,
    atoms,
    centres,
    bonds,
    net: polar ? net.map((x) => x / size) : null,
    polar,
    reason,
    steps,
    isomers: list(mol),
  };
}
