// Where an element sits on the periodic table, and the electron counts a
// Chemistry 20 student reads from that position. Everything follows from the
// atomic number Z (from the booklet's periodic table, `elements-data.js`);
// the booklet prints no electron arrangements.
//
// Groups are numbered 1–18, as on the booklet's fold-out. Lanthanum and
// actinium are in group 3; cerium–lutetium and thorium–lawrencium sit in the two
// separate rows below the table, as the booklet prints them, and have no group
// number.
//
// Valence electrons are given for the main groups only (1, 2, 13–18): the
// transition and f-block elements are not assigned a count in Chemistry 20.
import { elements } from './elements-data.js';

export const byZ = Object.entries(elements)
  .map(([symbol, e]) => ({ symbol, ...e }))
  .sort((a, b) => a.Z - b.Z);

const PERIOD_END = [2, 10, 18, 36, 54, 86, 118];

export function element(Z) {
  return byZ[Z - 1] ?? null;
}

// { period, group, block, frow } — `group` is null and `frow` is the 0-based
// column in its separate row for the f-block elements.
export function position(Z) {
  const period = PERIOD_END.findIndex((end) => Z <= end) + 1;
  const i = Z - (period === 1 ? 1 : PERIOD_END[period - 2] + 1);
  let group;
  if (period === 1) group = Z === 1 ? 1 : 18;
  else if (period <= 3) group = i < 2 ? i + 1 : i + 11;
  else if (period <= 5) group = i + 1;
  else if (i < 3) group = i + 1;
  else if (i <= 16) return { period, group: null, block: 'f', frow: i - 3 };
  else group = i - 13;
  const block = group <= 2 || Z === 2 ? 's' : group >= 13 ? 'p' : 'd';
  return { period, group, block, frow: null };
}

export function isMainGroup(Z) {
  const { group } = position(Z);
  return group !== null && (group <= 2 || group >= 13);
}

// Group names Chemistry 20 uses. Hydrogen is in group 1 but is not an alkali metal.
export function family(Z) {
  const { group } = position(Z);
  if (Z === 1) return null;
  return { 1: 'alkali metals', 2: 'alkaline-earth metals', 17: 'halogens', 18: 'noble gases' }[group] ?? null;
}

// { n, rule } — n is null outside the main groups.
export function valence(Z) {
  const { group, block } = position(Z);
  if (Z === 2) return { n: 2, rule: 'helium: its only energy level is full with 2' };
  if (group === null) return { n: null, rule: 'f-block: not assigned in Chemistry 20' };
  if (group <= 2) return { n: group, rule: `groups 1–2: valence electrons = group number = ${group}` };
  if (group >= 13) return { n: group - 10, rule: `groups 13–18: valence electrons = group − 10 = ${group} − 10 = ${group - 10}` };
  return { n: null, rule: `transition metal (${block}-block): not assigned in Chemistry 20` };
}

// A neutral atom has as many electrons as protons.
export function totalElectrons(Z) {
  return Z;
}

// Electrons per energy level, 2, 8, 8, 2, for Z ≤ 20 only: beyond calcium the
// third level takes more than 8 and the simple filling rule no longer holds.
export const SHELL_LIMIT_Z = 20;
export function shells(Z) {
  if (Z > SHELL_LIMIT_Z) return null;
  const out = [];
  let left = Z;
  for (const cap of [2, 8, 8, 2]) {
    if (left <= 0) break;
    out.push(Math.min(cap, left));
    left -= cap;
  }
  return out;
}

// Lewis symbol: valence electrons go one per side before any pair up
// (C has 4 single dots), so the unpaired ones are the bonding electrons.
// Helium's two electrons are one pair.
export function lewis(Z) {
  const { n } = valence(Z);
  if (n === null) return null;
  if (Z === 2) return { pairs: 1, single: 0 };
  return n <= 4 ? { pairs: 0, single: n } : { pairs: n - 4, single: 8 - n };
}

// Ion charges a student would give, each { charge, from }. Metals and hydrogen
// take the booklet's "most stable ion charges" in its printed order. The
// booklet prints none for the nonmetals of groups 15–17; they gain electrons
// up to the next noble gas, charge = −(8 − valence electrons).
export function ionCharges(Z) {
  const e = element(Z);
  if (e.ions) return e.ions.map((charge) => ({ charge, from: 'booklet' }));
  const { group } = position(Z);
  if (group >= 15 && group <= 17) return [{ charge: -(18 - group), from: 'group' }];
  return [];
}

// Why an element has no ion charge to offer.
export function noIonReason(Z) {
  const { group } = position(Z);
  if (group === 18) return 'noble gas: its valence level is already full, so it does not form ions';
  if (isMainGroup(Z)) return 'the booklet prints no ion charge: it does not usually form a simple ion';
  return 'the booklet prints no ion charge';
}

const NOBLE = { 2: 'helium', 10: 'neon', 18: 'argon', 36: 'krypton', 54: 'xenon', 86: 'radon' };

// The ion of element Z with this charge: its electrons, how many were lost or
// gained, and the noble gas with the same number of electrons, if any.
export function ion(Z, charge) {
  const electrons = Z - charge;
  return {
    electrons,
    lost: Math.max(0, charge),
    gained: Math.max(0, -charge),
    noble: NOBLE[electrons] ?? null,
    shells: Z > SHELL_LIMIT_Z ? null : shells(electrons),
  };
}

// Lewis symbol of a main-group ion with a noble-gas count: a cation that lost
// all its valence electrons shows none, an anion shows 4 pairs (H⁻, 1 pair).
// null when the ion has no noble-gas count (Pb²⁺, Sn²⁺) or is not main group.
export function ionLewis(Z, charge) {
  if (!isMainGroup(Z)) return null;
  const { electrons, noble } = ion(Z, charge);
  if (electrons === 0) return { pairs: 0, single: 0 }; // H⁺, a bare proton
  if (!noble) return null;
  if (charge > 0) return { pairs: 0, single: 0 };
  return { pairs: electrons === 2 ? 1 : 4, single: 0 };
}
