// Fuel calorimetry ("can" calorimetry): burn m g of a fuel under a can of water,
// read the temperature rise, then nΔcH = −Q with Q = mcΔt. Masses in g,
// temperatures in °C, Q in kJ, ΔcH in kJ/mol. Sign convention: ΔcH < 0
// (exothermic); Q > 0 is the heat gained by the water.
// Teaching model (docs/ARCHITECTURE.md §7): complete combustion, the can itself
// absorbs nothing, and every loss (to air, the can, the room) is lumped into
// one fixed efficiency per apparatus.
import { reactionEnthalpy, withWater } from './hess.js';
import { molarMass } from './electrolysis.js';
import { heat } from './calorimetry.js';
import { specificHeat } from './constants.js';

// Complete combustion of 1 mol of each fuel; all are in the booklet's ΔfH° table.
export const fuels = [
  { id: 'methanol', name: 'methanol', formula: 'CH3OH(l)', O2: 1.5, CO2: 1, H2O: 2 },
  { id: 'ethanol', name: 'ethanol', formula: 'C2H5OH(l)', O2: 3, CO2: 2, H2O: 3 },
  { id: 'butane', name: 'butane (lighter)', formula: 'C4H10(g)', O2: 6.5, CO2: 4, H2O: 5 },
  { id: 'pentane', name: 'pentane', formula: 'C5H12(l)', O2: 8, CO2: 5, H2O: 6 },
  { id: 'octane', name: 'octane', formula: 'C8H18(l)', O2: 12.5, CO2: 8, H2O: 9 },
].map((f) => ({
  ...f,
  reaction: { reactants: [[1, f.formula], [f.O2, 'O2(g)']], products: [[f.CO2, 'CO2(g)'], [f.H2O, 'H2O(l)']] },
}));

// Illustrative fractions of the fuel's heat that reach the water; the booklet
// prints none (DECISIONS). Fixed, so the student computes the efficiency.
export const apparatus = {
  open: { label: 'Open can', efficiency: 0.4 },
  insulated: { label: 'Insulated can with a draught shield', efficiency: 0.7 },
};

// Theoretical ΔcH° per mole of fuel from ΔfH°, with the water as 'g' or 'l'.
export function theoretical(fuel, water) {
  return reactionEnthalpy(withWater(fuel.reaction, water)).dH;
}

// The simulated experiment: the thermometer reading after burning m g, to the
// 0.1 °C a student reads. Readouts work from this rounded reading, as a student would.
export function finalReading(fuel, water, m, mWater, tInitial, efficiency) {
  const n = m / molarMass(fuel.formula);
  const q = efficiency * n * -theoretical(fuel, water) * 1000; // J to the water
  return Math.round((tInitial + q / (mWater * specificHeat.water)) * 10) / 10;
}

// The student's analysis of the readings.
export function analyse(fuel, water, m, mWater, tInitial, tFinal) {
  const dt = tFinal - tInitial;
  const Q = heat(mWater, specificHeat.water, dt) / 1000;
  const M = molarMass(fuel.formula);
  const n = m / M;
  const dcH = theoretical(fuel, water);
  return { dt, Q, M, n, experimental: -Q / n, theoretical: dcH, efficiency: Q / (n * -dcH) };
}
