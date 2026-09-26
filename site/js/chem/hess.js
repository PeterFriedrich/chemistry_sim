// Enthalpy of reaction from standard molar enthalpies of formation:
//   ΔrH° = Σ nΔfH°(products) − Σ nΔfH°(reactants),   ΔH = nΔrH.
// Energies in kJ, ΔfH° and ΔrH in kJ/mol, n in mol. Sign convention: ΔH < 0 is
// exothermic (the system's enthalpy falls, heat goes to the surroundings).
// Values are the Data Booklet's (formation-data.js); the booklet lists compounds
// only, and an element in its standard state has ΔfH° = 0 by definition.
import { formationEnthalpy } from './formation-data.js';

export const ELEMENTS = new Set(['O2(g)', 'H2(g)', 'N2(g)', 'C(s)', 'Al(s)', 'Fe(s)']);

export function formationOf(species) {
  if (ELEMENTS.has(species)) return 0;
  const row = formationEnthalpy[species];
  if (!row) throw new Error(`No ΔfH° for ${species} in the Data Booklet`);
  return row.dfH;
}

// Each species with its coefficient n, its ΔfH° and its term nΔfH°.
export function terms(side) {
  return side.map(([n, species]) => {
    const dfH = formationOf(species);
    return { n, species, dfH, total: n * dfH };
  });
}

export function sumFormation(side) {
  return terms(side).reduce((s, t) => s + t.total, 0);
}

// ΔrH for the equation as written (kJ per mole of reaction), with both sums.
export function reactionEnthalpy({ reactants, products }) {
  const r = sumFormation(reactants);
  const p = sumFormation(products);
  return { reactants: r, products: p, dH: p - r };
}

// Molar enthalpy of reaction per mole of one named substance in the equation.
export function molarEnthalpy(reaction, species) {
  const entry = [...reaction.reactants, ...reaction.products].find(([, s]) => s === species);
  if (!entry) throw new Error(`${species} is not in the equation`);
  return reactionEnthalpy(reaction).dH / entry[0];
}

// ΔH = nΔrH: n mol of the substance ΔrH is quoted per.
export function enthalpyChange(n, molarDH) {
  return n * molarDH;
}

// ΔH = nΔH for a phase change, with the molar enthalpy (ΔfusH or ΔvapH) given
// in the question as a positive number — the booklet prints none. Melting and
// vaporizing absorb heat (+); freezing and condensing release the same (−).
export const PHASE_CHANGES = {
  melting: { from: 's', to: 'l', sign: 1 },
  freezing: { from: 'l', to: 's', sign: -1 },
  vaporizing: { from: 'l', to: 'g', sign: 1 },
  condensing: { from: 'g', to: 'l', sign: -1 },
};

export function phaseChange(m, M, given, process) {
  const n = m / M;
  const molar = PHASE_CHANGES[process].sign * given;
  return { n, molar, dH: enthalpyChange(n, molar) };
}

// Backwards: the molar enthalpy from the heat (a positive number of kJ) that m
// grams absorbed or released. `given` is the positive ΔfusH or ΔvapH.
export function molarFromHeat(m, M, heat, process) {
  const n = m / M;
  const dH = PHASE_CHANGES[process].sign * heat;
  return { n, dH, molar: dH / n, given: heat / n };
}

// The mass that absorbs or releases `heat` kJ, given the molar enthalpy (+).
export function massFromHeat(M, heat, given, process) {
  const n = heat / given;
  const dH = PHASE_CHANGES[process].sign * heat;
  return { n, m: n * M, dH, molar: PHASE_CHANGES[process].sign * given, given };
}

// Swap every H2O(l) in the equation for H2O(g) or back.
export function withWater(reaction, state) {
  const swap = (side) => side.map(([n, s]) => [n, s.startsWith('H2O(') ? `H2O(${state})` : s]);
  return { ...reaction, reactants: swap(reaction.reactants), products: swap(reaction.products) };
}

// Balanced presets; `per` names the substance the molar enthalpy is quoted per.
export const reactions = [
  { id: 'methane', label: 'Combustion of methane', per: 'CH4(g)',
    reactants: [[1, 'CH4(g)'], [2, 'O2(g)']], products: [[1, 'CO2(g)'], [2, 'H2O(l)']] },
  { id: 'propane', label: 'Combustion of propane', per: 'C3H8(g)',
    reactants: [[1, 'C3H8(g)'], [5, 'O2(g)']], products: [[3, 'CO2(g)'], [4, 'H2O(l)']] },
  { id: 'butane', label: 'Combustion of butane', per: 'C4H10(g)',
    reactants: [[2, 'C4H10(g)'], [13, 'O2(g)']], products: [[8, 'CO2(g)'], [10, 'H2O(l)']] },
  { id: 'octane', label: 'Combustion of octane', per: 'C8H18(l)',
    reactants: [[2, 'C8H18(l)'], [25, 'O2(g)']], products: [[16, 'CO2(g)'], [18, 'H2O(l)']] },
  { id: 'ethanol', label: 'Combustion of ethanol', per: 'C2H5OH(l)',
    reactants: [[1, 'C2H5OH(l)'], [3, 'O2(g)']], products: [[2, 'CO2(g)'], [3, 'H2O(l)']] },
  { id: 'ethyne', label: 'Combustion of ethyne (welding torch)', per: 'C2H2(g)',
    reactants: [[2, 'C2H2(g)'], [5, 'O2(g)']], products: [[4, 'CO2(g)'], [2, 'H2O(l)']] },
  { id: 'respiration', label: 'Cellular respiration', per: 'C6H12O6(s)',
    reactants: [[1, 'C6H12O6(s)'], [6, 'O2(g)']], products: [[6, 'CO2(g)'], [6, 'H2O(l)']] },
  { id: 'photosynthesis', label: 'Photosynthesis', per: 'C6H12O6(s)',
    reactants: [[6, 'CO2(g)'], [6, 'H2O(l)']], products: [[1, 'C6H12O6(s)'], [6, 'O2(g)']] },
  { id: 'thermite', label: 'Thermite reaction', per: 'Fe2O3(s)',
    reactants: [[2, 'Al(s)'], [1, 'Fe2O3(s)']], products: [[1, 'Al2O3(s)'], [2, 'Fe(s)']] },
  { id: 'limestone', label: 'Decomposition of limestone', per: 'CaCO3(s)',
    reactants: [[1, 'CaCO3(s)']], products: [[1, 'CaO(s)'], [1, 'CO2(g)']] },
  { id: 'haber', label: 'Synthesis of ammonia', per: 'NH3(g)',
    reactants: [[1, 'N2(g)'], [3, 'H2(g)']], products: [[2, 'NH3(g)']] },
  { id: 'dimer', label: 'Nitrogen dioxide to dinitrogen tetroxide', per: 'N2O4(g)',
    reactants: [[2, 'NO2(g)']], products: [[1, 'N2O4(g)']] },
];
