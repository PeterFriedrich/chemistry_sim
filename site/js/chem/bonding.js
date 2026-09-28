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
// Bonds: ΔEN = 0 nonpolar covalent, 0 < ΔEN < 1.7 polar covalent,
// ΔEN ≥ 1.7 ionic (owner's choice). The bond dipole points to the more
// electronegative atom (δ−).
import { elements } from './elements-data.js';
import { lewis } from './periodic.js';
import { parseFormula, isMetal } from './naming.js';

export const IONIC_CUTOFF = 1.7;

export const enOf = (sym) => elements[sym].en;

const capacity = (sym) => lewis(elements[sym].Z)?.single ?? 0;
const lonePairs = (sym) => lewis(elements[sym].Z)?.pairs ?? 0;

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
  '3-1': { name: 'trigonal pyramidal', angle: 'about 107°', bonds: T.slice(1), lone: [T[0]] },
  // Bent in the page, lone pairs above it, out of the page and into it.
  '2-2': { name: 'V-shaped (bent)', angle: 'about 105°', bonds: [[-Math.sin(b), -Math.cos(b), 0], [Math.sin(b), -Math.cos(b), 0]], lone: [[0, 0.6, 0.8], [0, 0.6, -0.8]] },
};

// { central, terminals: [{ sym, order, lone }], centralLone, shape, bonds, polar, net, steps } or { error }.
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
