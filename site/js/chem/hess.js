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

// Backwards: the ΔfH° of one species from a ΔrH given for the equation as
// written (kJ), every other species at its booklet value. Returns the sums with
// the solved term included, so they read like reactionEnthalpy's.
export function unknownFormation(reaction, species, dHrxn) {
  const others = (list) => sumFormation(list.filter(([, s]) => s !== species));
  const r = others(reaction.reactants);
  const p = others(reaction.products);
  const inP = reaction.products.find(([, s]) => s === species);
  const [n] = inP ?? reaction.reactants.find(([, s]) => s === species);
  // dHrxn = (p ± n·x) − r, with + for a product and − for a reactant.
  const dfH = ((dHrxn - (p - r)) / n) * (inP ? 1 : -1);
  return {
    dfH, n, known: p - r,
    reactants: inP ? r : r + n * dfH,
    products: inP ? p + n * dfH : p,
    dH: dHrxn,
  };
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

// A thermochemical equation given in the question with its ΔH (kJ, for the
// equation as written, which may differ from the booklet's ΔfH° values): m grams
// of a substance with coefficient `coef` is n/coef moles of reaction, so
// ΔH = (n / coef) × ΔH(equation).
export function givenEquation(m, M, coef, dHrxn) {
  const n = m / M;
  const extent = n / coef;
  return { n, extent, dH: enthalpyChange(extent, dHrxn) };
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

// Hess's law by adding given equations. Each step is a given equation (its ΔH
// in kJ as the question prints it, not recomputed from the booklet), reversed or
// not and multiplied by k. A species on both sides cancels; ΔH adds, with the
// sign flipped for a reversed equation.
export function combine(steps) {
  const net = new Map(); // species → net coefficient, + on the product side
  let dH = 0;
  for (const { eq, reversed, k } of steps) {
    const s = (reversed ? -1 : 1) * k;
    for (const [n, sp] of eq.reactants) net.set(sp, (net.get(sp) ?? 0) - s * n);
    for (const [n, sp] of eq.products) net.set(sp, (net.get(sp) ?? 0) + s * n);
    dH += s * eq.dH;
  }
  const reactants = [];
  const products = [];
  for (const [sp, n] of net) {
    if (Math.abs(n) < 1e-9) continue;
    (n < 0 ? reactants : products).push([Math.abs(n), sp]);
  }
  return { reactants, products, dH, net };
}

// Species whose net coefficient differs from the target's (empty = target reached).
export function mismatches(result, target) {
  const want = combine([{ eq: { ...target, dH: 0 }, reversed: false, k: 1 }]).net;
  const all = new Set([...result.net.keys(), ...want.keys()]);
  return [...all].filter((sp) => Math.abs((result.net.get(sp) ?? 0) - (want.get(sp) ?? 0)) > 1e-9);
}

// Additivity presets: textbook questions with given ΔH values (kJ, `dp` decimal
// places as printed). `solution` is [reversed, k] per given equation.
export const additivity = [
  {
    id: 'co', label: 'Formation of carbon monoxide', dp: 1,
    target: { reactants: [[1, 'C(s)'], [0.5, 'O2(g)']], products: [[1, 'CO(g)']] },
    given: [
      { reactants: [[1, 'C(s)'], [1, 'O2(g)']], products: [[1, 'CO2(g)']], dH: -393.5 },
      { reactants: [[1, 'CO(g)'], [0.5, 'O2(g)']], products: [[1, 'CO2(g)']], dH: -283.0 },
    ],
    solution: [[false, 1], [true, 1]],
  },
  {
    id: 'no2', label: 'Formation of nitrogen dioxide', dp: 1,
    target: { reactants: [[1, 'N2(g)'], [2, 'O2(g)']], products: [[2, 'NO2(g)']] },
    given: [
      { reactants: [[1, 'N2(g)'], [1, 'O2(g)']], products: [[2, 'NO(g)']], dH: 180.6 },
      { reactants: [[2, 'NO(g)'], [1, 'O2(g)']], products: [[2, 'NO2(g)']], dH: -114.1 },
    ],
    solution: [[false, 1], [false, 1]],
  },
  {
    id: 'ethyne', label: 'Formation of ethyne', dp: 1,
    target: { reactants: [[2, 'C(s)'], [1, 'H2(g)']], products: [[1, 'C2H2(g)']] },
    given: [
      { reactants: [[1, 'C2H2(g)'], [2.5, 'O2(g)']], products: [[2, 'CO2(g)'], [1, 'H2O(l)']], dH: -1299.5 },
      { reactants: [[1, 'C(s)'], [1, 'O2(g)']], products: [[1, 'CO2(g)']], dH: -393.5 },
      { reactants: [[1, 'H2(g)'], [0.5, 'O2(g)']], products: [[1, 'H2O(l)']], dH: -285.8 },
    ],
    solution: [[true, 1], [false, 2], [false, 1]],
  },
  {
    id: 'diborane', label: 'Formation of diborane', dp: 0,
    target: { reactants: [[2, 'B(s)'], [3, 'H2(g)']], products: [[1, 'B2H6(g)']] },
    given: [
      { reactants: [[2, 'B(s)'], [1.5, 'O2(g)']], products: [[1, 'B2O3(s)']], dH: -1273 },
      { reactants: [[1, 'B2H6(g)'], [3, 'O2(g)']], products: [[1, 'B2O3(s)'], [3, 'H2O(g)']], dH: -2035 },
      { reactants: [[1, 'H2(g)'], [0.5, 'O2(g)']], products: [[1, 'H2O(l)']], dH: -286 },
      { reactants: [[1, 'H2O(l)']], products: [[1, 'H2O(g)']], dH: 44 },
    ],
    solution: [[false, 1], [true, 1], [false, 3], [false, 3]],
  },
];
