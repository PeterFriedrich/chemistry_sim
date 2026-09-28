// Chemistry 20 intermolecular forces: which act between molecules of a
// substance, and which of two substances has the higher boiling point.
//
// London dispersion forces act between all molecules; their strength is
// judged by the number of electrons (Σ Z). Dipole–dipole forces need a polar
// molecule (`analyse` in bonding.js). Hydrogen bonding needs H bonded
// directly to N, O or F. The booklet prints no boiling points, so the sim
// predicts and never quotes one.
//
// Comparing two substances (a teaching model; the thresholds are this sim's):
//   1. the same kinds of forces → more electrons wins (equal → cannot tell);
//   2. different kinds, electron counts within SIMILAR → the stronger kind wins;
//   3. otherwise hydrogen bonding still wins, flagged as a close call when the
//      other has CLOSE_CALL times the electrons or more; but dipole–dipole alone
//      loses to London forces with many more electrons (HCl < Cl2).
import { elements } from './elements-data.js';
import { analyse } from './bonding.js';
import { parseFormula } from './naming.js';

export const SIMILAR = 1.35;
export const CLOSE_CALL = 3;
const NOBLE = ['He', 'Ne', 'Ar', 'Kr', 'Xe', 'Rn'];
const DONORS = ['N', 'O', 'F'];
const RANK = { london: 0, dipole: 1, hbond: 2 };
const NAME = { london: 'London forces only', dipole: 'dipole–dipole forces', hbond: 'hydrogen bonding' };

// { formula, electrons, polar, hbond, strongest, forces: [{ id, why }], atoms } or { error }.
export function forcesOf(input) {
  const f = parseFormula(input);
  if (f.error) return f;
  let atoms;
  let polar = false;
  let hbond = false;
  let mol = null;
  if (f.tokens.length === 1 && !f.tokens[0].group && NOBLE.includes(f.tokens[0].sym) && f.tokens[0].count === 1 && !f.hydrate) {
    atoms = [f.tokens[0].sym];
  } else {
    mol = analyse(input);
    if (mol.error) return mol;
    atoms = [mol.central, ...mol.terminals.map((t) => t.sym)];
    polar = mol.polar;
    hbond = mol.bonds.some((b) => (b.b === 'H' && DONORS.includes(b.a)) || (b.a === 'H' && DONORS.includes(b.b)));
  }
  const electrons = atoms.reduce((s, sym) => s + elements[sym].Z, 0);
  const sum = atoms.map((sym) => elements[sym].Z);
  const forces = [{ id: 'london', why: `always present; ${electrons} electrons (${sum.join(' + ')})` }];
  if (polar) forces.push({ id: 'dipole', why: 'the molecule is polar' });
  else forces.push({ id: 'nodipole', why: mol ? 'no dipole–dipole forces: the molecule is nonpolar' : 'no dipole–dipole forces: a single atom has no dipole' });
  if (hbond) {
    const pair = mol.bonds.find((b) => (b.b === 'H' && DONORS.includes(b.a)) || (b.a === 'H' && DONORS.includes(b.b)));
    const donor = pair.a === 'H' ? pair.b : pair.a;
    forces.push({ id: 'hbond', why: `H is bonded directly to ${donor}` });
  } else {
    forces.push({ id: 'nohbond', why: `no hydrogen bonding: no H bonded to N, O or F` });
  }
  const strongest = hbond ? 'hbond' : polar ? 'dipole' : 'london';
  return { formula: f.body, electrons, polar, hbond, strongest, forces, molecule: mol, atoms };
}

// Which of two substances has the stronger intermolecular forces, and so the
// higher boiling point. { winner: 0 | 1 | null, reason, close }.
export function compare(a, b) {
  const [ra, rb] = [RANK[a.strongest], RANK[b.strongest]];
  const [ea, eb] = [a.electrons, b.electrons];
  const more = ea === eb ? null : ea > eb ? 0 : 1;
  const ratio = Math.max(ea, eb) / Math.min(ea, eb);
  const s = [a, b];
  const f = (i) => s[i].formula;
  if (ra === rb) {
    if (more === null) return { winner: null, close: true, reason: `Both have ${NAME[a.strongest]} and ${ea} electrons, so this rule cannot tell them apart.` };
    return { winner: more, close: false, reason: `Both have ${NAME[a.strongest]}; ${f(more)} has more electrons (${s[more].electrons} vs ${s[1 - more].electrons}), so stronger London forces.` };
  }
  const strong = ra > rb ? 0 : 1;
  const weak = 1 - strong;
  if (ratio <= SIMILAR) {
    return { winner: strong, close: false, reason: `Similar numbers of electrons (${ea} and ${eb}), so the kind of force decides: ${f(strong)} has ${NAME[s[strong].strongest]}, ${f(weak)} has ${s[weak].strongest === 'london' ? 'London forces only' : NAME[s[weak].strongest]}.` };
  }
  if (s[strong].strongest === 'hbond') {
    const close = s[weak].electrons >= CLOSE_CALL * s[strong].electrons;
    return {
      winner: strong,
      close,
      reason: `${f(strong)} has hydrogen bonding, the strongest intermolecular force here${more === weak ? `, even though ${f(weak)} has more electrons (${s[weak].electrons} vs ${s[strong].electrons})` : ''}.${close ? ` Close call: ${f(weak)} has ${ratio.toFixed(1)} times the electrons, so its London forces may win.` : ''}`,
    };
  }
  if (more === weak) {
    return { winner: weak, close: false, reason: `${f(weak)} has many more electrons (${s[weak].electrons} vs ${s[strong].electrons}), so its London forces outweigh ${f(strong)}'s dipole–dipole forces.` };
  }
  return { winner: strong, close: false, reason: `${f(strong)} has ${NAME[s[strong].strongest]} and more electrons (${s[strong].electrons} vs ${s[weak].electrons}).` };
}
