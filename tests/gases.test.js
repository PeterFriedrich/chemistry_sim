import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../site/js/chem/gases.js';
import { ATM, STP, SATP } from '../site/js/chem/constants.js';

const r = G.reading;
const T = (s, u = 'C') => G.kelvin(r(s), u);
// The answer a student writes: the value to its sig figs.
const shown = (x, sig) => Number(x.toPrecision(sig));
const gas = (id) => G.gases.find((g) => g.id === id);

test('test_gases_typed_values_and_kelvin_sig_figs', () => {
  assert.deepEqual(r('0.52'), { value: 0.52, sig: 2, dp: 2 });
  assert.deepEqual(r('450'), { value: 450, sig: 3, dp: 0 }); // trailing zeros count
  assert.deepEqual(r('3500'), { value: 3500, sig: 4, dp: 0 });
  assert.equal(r('3.1e12').sig, 2);
  assert.ok(r('abc').error);
  // Addition rule: K keeps the °C value's decimal places (at most two).
  assert.deepEqual(T('27'), { K: 300.15, sig: 3, shown: 300, dp: 0 });
  assert.deepEqual(T('-30.0'), { K: 243.14999999999998, sig: 4, shown: 243.2, dp: 1 });
  assert.equal(T('0').sig, 3);
  assert.equal(T('25.000').shown, 298.15);
  assert.equal(T('358', 'K').sig, 3);
  assert.ok(T('-273.15').error);
  assert.ok(T('-300').error);
});

test('test_gases_combined_law_review_package', () => {
  // Gases Review Package pp. 8–9, by the booklet method (docs/SPEC_chem20.md §1).
  const ans = (known, unknown, hold, sigs) => shown(G.combined(known, unknown, hold)[unknown], G.answerSig(...sigs));
  // Q1 Boyle: 5.7 L at 0.52 atm → 2.0 L.
  assert.equal(ans({ P1: 0.52, V1: 5.7, V2: 2.0 }, 'P2', 'T', [2, 2, 2]), 1.5);
  // Q2 Boyle (the sim's default): 93.0 kPa, 3.73 L → 7.66 L.
  assert.equal(ans({ P1: 93.0, V1: 3.73, V2: 7.66 }, 'P2', 'T', [3, 3, 3]), 45.3);
  // Q3 Charles: 20.0 L, −30.0 °C → 85.0 °C.
  assert.equal(ans({ V1: 20.0, T1: T('-30.0').K, T2: T('85.0').K }, 'V2', 'P', [3, 4, 4]), 29.5);
  // Q4 Charles, 27 °C → 350 °C: 41.5 L by the addition rule (the key's 42 L counts 27 °C as 2 sig figs).
  assert.equal(ans({ V1: 20.0, T1: T('27').K, T2: T('350').K }, 'V2', 'P', [4, T('27').sig, T('350').sig]), 41.5);
  // Q5 Gay-Lussac: 0.55 atm, −100 °C → 200 °C.
  assert.equal(ans({ P1: 0.55, T1: T('-100').K, T2: T('200').K }, 'P2', 'V', [2, 3, 3]), 1.5);
  // Q6: 4.15 atm (key 4.2 atm, same sig-fig reading as Q4).
  assert.equal(ans({ P1: 2.00, T1: T('27').K, T2: T('350').K }, 'P2', 'V', [3, 3, 3]), 4.15);
  // Q7 combined, to STP: 60.3 mL (the key's 60.5 mL does not follow from its data).
  assert.equal(ans({ V1: 75.0, P1: 90.4, T1: T('30.0').K, P2: STP.P, T2: STP.T }, 'V2', null, [3, 3, 4]), 60.3);
  // Q8 combined: 15.2 L, 1.35 atm, 33 °C → 35 °C and 3.5 atm.
  assert.equal(ans({ V1: 15.2, P1: 1.35, T1: T('33').K, P2: 3.5, T2: T('35').K }, 'V2', null, [3, 3, 3, 2, 3]), 5.9);
  // Any of the six can be the unknown: package p. 1 Q5 solves T2.
  const t2 = G.combined({ V1: 450, P1: 1.50, T1: T('15').K, V2: 300, P2: 2.00 }, 'T2');
  assert.equal(shown(t2.T2 - 273.15, 3), -17.0);
  assert.ok(G.combined({ V1: 1, T1: 300, T2: 300 }, 'P2', 'P').error);
  assert.ok(G.combined({ P1: 0, V1: 1, V2: 2 }, 'P2', 'T').error);
});

test('test_gases_ideal_gas_law_review_package', () => {
  const O2 = gas('O2').M;
  // Q9: 50.0 g O2 at 1.20 atm, 27.0 °C → 32.1 L (the key's 32.2 L does not follow).
  assert.equal(shown(G.ideal({ n: 50.0 / O2, P: 1.20 * ATM, T: T('27.0').K }, 'V').V, 3), 32.1);
  // Q10: 0.505 mol CO2, 429 kPa, 3500 mL → 358 K, 84.5 °C (key 84.6 °C).
  const q10 = G.ideal({ n: 0.505, P: 429, V: 3.500 }, 'T').T;
  assert.equal(shown(q10, 3), 358);
  assert.equal(Number((q10 - 273.15).toFixed(1)), 84.5);
  // The sim's °C: 358 K − 273.15 by the addition rule.
  assert.deepEqual(G.celsius(q10, 3), { value: 85, dp: 0 });
  assert.deepEqual(G.celsius(243.15, 4), { value: -30.0, dp: 1 });
  // Q11: 275 mL NO2 at 240 kPa, 28.5 °C → 1.21 g.
  assert.equal(shown(G.ideal({ P: 240, V: 0.275, T: T('28.5').K }, 'n').n * gas('NO2').M, 3), 1.21);
  // Q12: 2.27 kg CO2 in 3.2 L at 25 °C → 40 MPa.
  assert.equal(shown(G.ideal({ n: 2270 / gas('CO2').M, V: 3.2, T: T('25').K }, 'P').P / 1000, 2), 40);
  // Q18: CO2 at 1.965 g/L and 100 kPa → 269 K, so 270 K to 2 sig figs; −3.8 °C (key −3.48 °C).
  const q18 = G.ideal({ n: 1.965 / gas('CO2').M, P: 100, V: 1 }, 'T').T;
  assert.equal(shown(q18, 3), 269);
  assert.equal(Number((q18 - 273.15).toFixed(1)), -3.8);
  assert.ok(G.ideal({ P: 100, V: 0, T: 300 }, 'n').error);
});

test('test_gases_molar_volume_review_package', () => {
  assert.equal(G.molarVolumeRounded(STP), 22.4);
  assert.equal(G.molarVolumeRounded(SATP), 24.8);
  const Vstp = G.molarVolumeRounded(STP);
  const Vsatp = G.molarVolumeRounded(SATP);
  assert.equal(shown(2.15 * Vsatp, 3), 53.3); // Q14
  assert.equal(shown((51.8 / Vstp), 3), 2.31); // Q15, mL → mmol
  assert.equal(shown((5.20 / gas('CH4').M) * Vstp, 3), 7.26); // Q16
  assert.equal(shown(((1000 / Vsatp) * gas('SO3').M) / 1000, 3), 3.23); // Q17, kg
});

test('test_gases_lab_molar_mass_and_R', () => {
  // Package p. 10 Q23: ethene collected over water.
  const m = G.massLost(r('45.038'), r('44.832'));
  assert.deepEqual(m, { m: 0.206, sig: 3 });
  const M = G.labMolarMass({ m: m.m, P: 96.25, V: 0.1875, T: T('23.6').K });
  assert.equal(shown(M, 3), 28.2);
  assert.equal(Number(G.percentDifference(M, gas('C2H4').M).toFixed(1)), 0.4);
  // Q24: CO2, experimental R.
  const m2 = G.massLost(r('974.64'), r('974.23'));
  assert.deepEqual(m2, { m: 0.41, sig: 2 });
  const Rexp = G.labR({ m: m2.m, M: gas('CO2').M, P: 98.38, V: 0.235, T: T('24.2').K });
  assert.equal(shown(Rexp, 2), 8.3);
  assert.equal(shown(G.percentDifference(Rexp, 8.314), 2), 0.38);
  assert.ok(G.massLost(r('10.0'), r('10.5')).error);
});

test('test_gases_collect_over_water_by_polarity', () => {
  assert.equal(G.overWater(gas('NH3')).polar, true);
  assert.equal(G.overWater(gas('HCl')).polar, true);
  assert.equal(G.overWater(gas('O2')).polar, false);
  assert.equal(G.overWater(gas('C4H10')).polar, false);
  assert.equal(G.overWater(gas('He')).polar, false);
  assert.equal(G.overWater(gas('SO2')).polar, null);
  assert.equal(gas('air').M, 29.18);
});
