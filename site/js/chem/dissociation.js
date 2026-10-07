// Chemistry 20 solutions: what a substance does in water, the equation for it,
// and the concentration of each entity it gives. Concentrations in mol/L,
// masses in g, volumes in L.
//
// - Ionic compounds dissociate into their ions (charges and polyatomic ions
//   from naming.js, so from the booklet); a hydrate's water joins the solvent.
//   The booklet's solubility table (solubility-data.js) flags the slightly
//   soluble ones.
// - Acids ionize: HA(aq) + H2O(l) → H3O+(aq) + A−(aq), using the booklet's
//   acid table (§1.9) for the conjugate base and for strong vs weak. A strong
//   acid ionizes completely (first proton only, as the table prints H2SO4 →
//   HSO4−); a weak acid only partly, so the sim draws it qualitatively and
//   gives no [H3O+] (Chemistry 30).
// - A weak base (the table's base column, e.g. NH3) reacts with water partly.
// - Other molecular substances dissolve as whole molecules.
import { convert } from './naming.js';
import { acids } from './acid-data.js';
import { solubilityTable } from './solubility-data.js';
import { molarMass } from './electrolysis.js';
import { analyse as bonding } from './bonding.js';

// Mercury(I) is Hg2^2+ in the booklet's solubility table; naming.js writes Hg^+.
const tableIon = (ion) => (ion === 'Hg^+' ? 'Hg2^2+' : ion);

// 'high' (≥ 0.1 mol/L), 'low' (< 0.1 mol/L), or null when the table has no
// column for the anion.
export function solubility(cation, anion) {
  const cat = tableIon(cation);
  const pairMatch = (col) => col.except.some((e) => (Array.isArray(e) ? e[0] === cat && e[1] === anion : e === cat));
  const [first] = solubilityTable;
  if (first.ions.includes(cat) || first.ions.includes(anion)) return pairMatch(first) ? 'low' : 'high';
  const col = solubilityTable.find((c) => c.ions.includes(anion));
  if (!col) return null;
  return pairMatch(col) ? (col.most === 'high' ? 'low' : 'high') : col.most;
}

// Starting states for the common molecular substances (the booklet prints none).
const STATE = { C12H22O11: 's', C6H12O6: 's', C2H5OH: 'l', CH3OH: 'l', H2O2: 'l', C8H18: 'l', CH4: 'g', C3H8: 'g', O3: 'g', CO2: 'g' };

const ion = (label, count) => ({ species: `${label}(aq)`, count });

// { kind, formula, name, reactants, products, arrow, electrolyte, entities, … }
// or { error }. `entities` are what is dissolved, with how many come from one
// formula unit (null for a weak acid or base, which ionizes only partly).
export function analyse(input) {
  const raw = String(input).trim();
  if (!raw) return { error: 'Type a formula or a name' };
  let r = convert(raw.replace(/\((s|l|g)\)$/, ''));
  if (r.error) return r;
  if (r.kind === 'element') return { error: `${r.name[0].toUpperCase()}${r.name.slice(1)} is an element, not a compound: this sim dissolves compounds` };
  if (r.formula === 'H2O') return { error: 'Water is the solvent here: pick something to dissolve in it' };
  // Typed without (aq), an acid reads as a molecular compound: HCl, CH3COOH.
  if (r.kind === 'molecular' || r.kind === 'common') {
    const asAcid = convert(`${r.formula}(aq)`);
    if (asAcid.kind === 'acid') r = asAcid;
  }

  if (r.kind === 'acid') {
    const formula = r.formula.replace(/\(aq\)$/, '');
    const entry = acids.find((a) => a.acid === `${formula}(aq)`);
    if (!entry) return { error: `${formula} is not in the booklet’s acid table, so this sim cannot tell how strong it is` };
    const strong = entry.Ka === Infinity;
    return {
      kind: 'acid', formula, name: entry.name, strong,
      reactants: [[1, `${formula}(aq)`], [1, 'H2O(l)']],
      products: [[1, 'H3O^+(aq)'], [1, entry.base]],
      arrow: strong ? '→' : '⇌',
      electrolyte: strong ? 'strong' : 'weak',
      entities: strong ? [ion('H3O^+', 1), { species: entry.base, count: 1 }] : null,
      molecule: `${formula}(aq)`,
    };
  }

  if (r.kind === 'ionic') {
    const ions = r.parts.filter((p) => !p.water);
    const water = r.parts.find((p) => p.water);
    const [cat, an] = ions;
    const sol = solubility(cat.label, an.label);
    const products = ions.map((p) => [p.count, `${p.label}(aq)`]);
    if (water) products.push([water.count, 'H2O(l)']);
    return {
      kind: 'ionic', formula: r.formula, name: r.name,
      reactants: [[1, `${r.formula}(s)`]],
      products,
      arrow: '→',
      solubility: sol,
      electrolyte: 'strong',
      entities: ions.map((p) => ion(p.label, p.count)),
      mercuryI: cat.label === 'Hg^+',
    };
  }

  // A weak base from the table's base column (NH3).
  const base = acids.find((a) => a.base === `${r.formula}(aq)` && Number.isFinite(a.Ka) && !a.base.includes('^'));
  if (base) {
    return {
      kind: 'base', formula: r.formula, name: r.name, strong: false,
      reactants: [[1, `${r.formula}(aq)`], [1, 'H2O(l)']],
      products: [[1, base.acid], [1, 'OH^-(aq)']],
      arrow: '⇌',
      electrolyte: 'weak',
      entities: null,
      molecule: `${r.formula}(aq)`,
    };
  }

  const state = STATE[r.formula];
  // Like dissolves like: `bonding`'s polarity, null when it cannot draw the molecule.
  const b = bonding(r.formula);
  return {
    kind: 'molecular', formula: r.formula, name: r.name, polar: b.error ? null : b.polar,
    reactants: [[1, state ? `${r.formula}(${state})` : r.formula]],
    products: [[1, `${r.formula}(aq)`]],
    arrow: '→',
    electrolyte: 'none',
    entities: [{ species: `${r.formula}(aq)`, count: 1 }],
  };
}

// The solute's concentration from what the question gives:
// { c } directly, { ion, conc } an entity's concentration, or { m, V } a mass
// in g dissolved to V litres of solution.
export function soluteConcentration(a, given) {
  if (given.c !== undefined) return { c: given.c };
  if (given.ion !== undefined) {
    const e = a.entities?.find((x) => x.species === given.ion);
    if (!e) return { error: 'Pick an entity this solute gives' };
    return { c: given.conc / e.count, count: e.count };
  }
  const M = molarMass(a.formula);
  const n = given.m / M;
  return { c: n / given.V, n, M };
}

// [entity] = (number per formula unit) × c.
export const entityConcentrations = (a, c) => (a.entities ?? []).map((e) => ({ ...e, conc: e.count * c }));

// The booklet's threshold: a slightly soluble compound dissolves to less than
// 0.1 mol/L, so a question asking for more cannot be made up.
export const LOW_SOLUBILITY = 0.1;
export const exceedsSolubility = (a, c) => a.solubility === 'low' && c >= LOW_SOLUBILITY;
