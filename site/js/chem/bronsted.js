// Predicting Brønsted–Lowry acid–base reactions from the Data Booklet's table of
// relative strengths (acid-data.js), the Chemistry 30 five-step method:
//   1. list the entities present (strong acids as H3O+, ionic compounds as ions,
//      always H2O);  2. label each as an acid, a base, or both;
//   3. the strongest acid (SA) is the acid highest on the table, the strongest
//      base (SB) the base lowest on it;
//   4. SA + SB ⇌ conjugate base of SA + conjugate acid of SB;
//   5. products are favoured (> 50 %) when the SA is above the SB's conjugate
//      acid, i.e. Ka(SA) > Ka(conjugate acid of SB); otherwise reactants.
// Keq = Ka(SA) / Ka(conjugate acid of SB). No concentrations, so no pH here.
import { acids } from './acid-data.js';

// Solutions a student meets, as the entities they put in the beaker. Strong
// acids are levelled to H3O+; Na+ is on no row of the table (a spectator).
export const solutions = [
  { id: 'HCl', formula: 'HCl(aq)', entities: ['H3O^+(aq)', 'Cl^-(aq)'] },
  { id: 'HNO3', formula: 'HNO3(aq)', entities: ['H3O^+(aq)', 'NO3^-(aq)'] },
  { id: 'NaHSO4', formula: 'NaHSO4(aq)', entities: ['Na^+(aq)', 'HSO4^-(aq)'] },
  { id: 'HF', formula: 'HF(aq)', entities: ['HF(aq)'] },
  { id: 'CH3COOH', formula: 'CH3COOH(aq)', entities: ['CH3COOH(aq)'] },
  { id: 'NaH2PO4', formula: 'NaH2PO4(aq)', entities: ['Na^+(aq)', 'H2PO4^-(aq)'] },
  { id: 'NH4Cl', formula: 'NH4Cl(aq)', entities: ['NH4^+(aq)', 'Cl^-(aq)'] },
  { id: 'NaHCO3', formula: 'NaHCO3(aq)', entities: ['Na^+(aq)', 'HCO3^-(aq)'] },
  { id: 'NaF', formula: 'NaF(aq)', entities: ['Na^+(aq)', 'F^-(aq)'] },
  { id: 'NaCH3COO', formula: 'NaCH3COO(aq)', entities: ['Na^+(aq)', 'CH3COO^-(aq)'] },
  { id: 'NaOCl', formula: 'NaOCl(aq)', entities: ['Na^+(aq)', 'OCl^-(aq)'] },
  { id: 'NH3', formula: 'NH3(aq)', entities: ['NH3(aq)'] },
  { id: 'Na2CO3', formula: 'Na2CO3(aq)', entities: ['Na^+(aq)', 'CO3^2-(aq)'] },
  { id: 'Na3PO4', formula: 'Na3PO4(aq)', entities: ['Na^+(aq)', 'PO4^3-(aq)'] },
  { id: 'NaOH', formula: 'NaOH(aq)', entities: ['Na^+(aq)', 'OH^-(aq)'] },
];

// Every entity in the mixed solutions, water included, each once.
export function entitiesOf(ids) {
  const list = ids.flatMap((id) => solutions.find((s) => s.id === id)?.entities ?? []);
  return [...new Set([...list, 'H2O(l)'])];
}

// The table rows an entity appears on: as an acid (left column) and as a base
// (right column). Either may be null; Na+ has neither.
export function roles(species) {
  return {
    acid: acids.find((r) => r.acid === species) ?? null,
    base: acids.find((r) => r.base === species) ?? null,
  };
}

export function predict(present) {
  const asAcid = present.map((s) => ({ species: s, row: roles(s).acid })).filter((x) => x.row);
  const asBase = present.map((s) => ({ species: s, row: roles(s).base })).filter((x) => x.row);
  const sa = asAcid.reduce((best, x) => (x.row.Ka > best.row.Ka ? x : best));
  const sb = asBase.reduce((best, x) => (x.row.Ka < best.row.Ka ? x : best));
  // The SA and SB from one row (H3O+ with H2O, H2O with OH−) give back what they started with.
  if (sa.row === sb.row) return { sa, sb, reactants: null, products: null, Keq: 1, favoured: 'none' };
  const pair = (a, b) => (a === b ? [[2, a]] : [[1, a], [1, b]]);
  const Keq = sa.row.Ka / sb.row.Ka;
  return {
    sa,
    sb,
    reactants: pair(sa.species, sb.species),
    products: pair(sa.row.base, sb.row.acid),
    Keq,
    favoured: Keq > 1 ? 'products' : 'reactants',
  };
}
