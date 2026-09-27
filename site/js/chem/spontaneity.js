// Predicting redox reactions from the Data Booklet's table of reduction
// half-reactions (redox-data.js), the Chemistry 30 SOA/SRA method:
//   1. list the entities present (ionic compounds as ions, "acidified" adds
//      H+(aq), always H2O);  2. label each as an OA, an RA, or both — an OA
//      such as MnO4− counts only when its partners (H+) are present too;
//   3. the SOA is the OA highest on the table, the SRA the RA lowest on it
//      (ties go by the booklet's row order);
//   4. reduction of the SOA + oxidation of the SRA, electrons balanced;
//   5. E°net = E°(SOA) − E°(SRA), both as printed (reduction potentials).
// Sign convention: E°net > 0 is spontaneous; E°net ≤ 0 is not. Standard
// conditions only; the table says whether a reaction can go, not how fast.
// E in V.
import { candidates, netEquation } from './redox.js';

// Reagents a student meets, as the entities they put in the beaker.
export const reagents = [
  ...['Ag', 'Cu', 'Pb', 'Sn', 'Ni', 'Fe', 'Zn', 'Al', 'Mg', 'Na'].map((m) => ({ id: m, formula: `${m}(s)`, entities: [`${m}(s)`] })),
  { id: 'AgNO3', formula: 'AgNO3(aq)', entities: ['Ag^+(aq)', 'NO3^-(aq)'] },
  { id: 'CuSO4', formula: 'CuSO4(aq)', entities: ['Cu^2+(aq)', 'SO4^2-(aq)'] },
  { id: 'Pb(NO3)2', formula: 'Pb(NO3)2(aq)', entities: ['Pb^2+(aq)', 'NO3^-(aq)'] },
  { id: 'SnCl2', formula: 'SnCl2(aq)', entities: ['Sn^2+(aq)', 'Cl^-(aq)'] },
  { id: 'NiSO4', formula: 'NiSO4(aq)', entities: ['Ni^2+(aq)', 'SO4^2-(aq)'] },
  { id: 'FeSO4', formula: 'FeSO4(aq)', entities: ['Fe^2+(aq)', 'SO4^2-(aq)'] },
  { id: 'ZnSO4', formula: 'ZnSO4(aq)', entities: ['Zn^2+(aq)', 'SO4^2-(aq)'] },
  { id: 'KI', formula: 'KI(aq)', entities: ['K^+(aq)', 'I^-(aq)'] },
  { id: 'KBr', formula: 'KBr(aq)', entities: ['K^+(aq)', 'Br^-(aq)'] },
  { id: 'NaCl', formula: 'NaCl(aq)', entities: ['Na^+(aq)', 'Cl^-(aq)'] },
  { id: 'HCl', formula: 'HCl(aq)', entities: ['H^+(aq)', 'Cl^-(aq)'] },
  { id: 'HNO3', formula: 'HNO3(aq)', entities: ['H^+(aq)', 'NO3^-(aq)'] },
  { id: 'KMnO4', formula: 'KMnO4(aq), acidified', entities: ['K^+(aq)', 'MnO4^-(aq)', 'H^+(aq)'] },
  { id: 'K2Cr2O7', formula: 'K2Cr2O7(aq), acidified', entities: ['K^+(aq)', 'Cr2O7^2-(aq)', 'H^+(aq)'] },
  { id: 'Cl2', formula: 'Cl2(g)', entities: ['Cl2(g)'] },
  { id: 'Br2', formula: 'Br2(l)', entities: ['Br2(l)'] },
  { id: 'I2', formula: 'I2(s)', entities: ['I2(s)'] },
];

// Ion pairs from the offered solutions that form a low-solubility precipitate
// (AgCl, AgBr, AgI, PbCl2, PbBr2, PbI2, PbSO4). Precipitation is not modelled,
// so the sim declines these mixtures rather than predict a reaction that the
// precipitate would change.
const PRECIPITATES = [
  ['Ag^+(aq)', ['Cl^-(aq)', 'Br^-(aq)', 'I^-(aq)']],
  ['Pb^2+(aq)', ['Cl^-(aq)', 'Br^-(aq)', 'I^-(aq)', 'SO4^2-(aq)']],
];

// Every entity in the mixed reagents, water included, each once.
export function entitiesOf(ids) {
  const list = ids.flatMap((id) => reagents.find((r) => r.id === id)?.entities ?? []);
  return [...new Set([...list, 'H2O(l)'])];
}

export function precipitate(present) {
  for (const [cation, anions] of PRECIPITATES) {
    const anion = anions.find((a) => present.includes(a));
    if (present.includes(cation) && anion) return [cation, anion];
  }
  return null;
}

export function predict(present) {
  const { oxidizing, reducing } = candidates(present);
  const soa = oxidizing[0];
  const sra = reducing[0];
  const E = soa.E - sra.E;
  // One couple both ways (Cu with Cu²⁺): the reaction gives back what it started with.
  const net = soa === sra ? null : netEquation(soa, sra);
  // Water itself is the SOA or the SRA: the reactions the table predicts but
  // that are often too slow to see (MnO₄⁻ or Cl₂ with water, Mg in water).
  const onlyWater = (side) => side.length === 1 && side[0][1] === 'H2O(l)';
  const water = onlyWater(soa.ox) || onlyWater(sra.red);
  return { oxidizing, reducing, soa, sra, E, net, spontaneous: E > 0, water };
}
