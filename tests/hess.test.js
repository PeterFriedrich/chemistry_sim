import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as H from '../site/js/chem/hess.js';
import { formationEnthalpy } from '../site/js/chem/formation-data.js';
import { atoms, count } from './atoms.js';
import { molarMass } from '../site/js/chem/electrolysis.js';

const near = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} vs ${b}`);
const byId = (id) => H.reactions.find((r) => r.id === id);

test('test_formation_table_matches_alberta_data_booklet', () => {
  // Spot checks against the booklet, pp. 4–5 (docs/DATA_SHEET.md §1.6).
  assert.equal(Object.keys(formationEnthalpy).length, 93);
  const pinned = {
    'CO2(g)': -393.5, 'H2O(l)': -285.8, 'H2O(g)': -241.8, 'CH4(g)': -74.6,
    'Al2O3(s)': -1675.7, 'C2H2(g)': 227.4, 'NO2(g)': 33.2, 'C12H22O11(s)': -2226.1,
    'ZnS(s)': -206.0, 'PCl3(g)': -287.0,
  };
  for (const [f, v] of Object.entries(pinned)) assert.equal(formationEnthalpy[f].dfH, v, f);
});

test('test_hess_elements_are_zero_and_unknown_species_throw', () => {
  for (const e of H.ELEMENTS) assert.equal(H.formationOf(e), 0);
  assert.throws(() => H.formationOf('C3H6(g)'), /No ΔfH°/);
});

test('test_hess_methane_combustion_worked_example', () => {
  // ΔrH = [−393.5 + 2(−285.8)] − [−74.6 + 2(0)] = −965.1 − (−74.6) = −890.5 kJ
  const e = H.reactionEnthalpy(byId('methane'));
  near(e.reactants, -74.6);
  near(e.products, -965.1);
  near(e.dH, -890.5);
  // With water vapour: [−393.5 + 2(−241.8)] + 74.6 = −802.5 kJ
  near(H.reactionEnthalpy(H.withWater(byId('methane'), 'g')).dH, -802.5);
});

test('test_hess_molar_enthalpy_per_named_substance', () => {
  // 2C8H18 + 25O2 → 16CO2 + 18H2O(l): ΔrH = −10 940.2 kJ, so −5 470.1 kJ/mol octane.
  near(H.reactionEnthalpy(byId('octane')).dH, -10940.2, 1e-6);
  near(H.molarEnthalpy(byId('octane'), 'C8H18(l)'), -5470.1, 1e-6);
  // Thermite, 2Al + Fe2O3 → Al2O3 + 2Fe: −1 675.7 − (−824.2) = −851.5 kJ.
  near(H.molarEnthalpy(byId('thermite'), 'Fe2O3(s)'), -851.5, 1e-9);
  // Haber: −91.8 kJ per 2 mol NH3 is −45.9 kJ/mol, the ΔfH° of ammonia itself.
  near(H.molarEnthalpy(byId('haber'), 'NH3(g)'), formationEnthalpy['NH3(g)'].dfH);
  // ΔH = nΔrH: 0.500 mol CH4 burned releases 445 kJ.
  near(H.enthalpyChange(0.5, H.molarEnthalpy(byId('methane'), 'CH4(g)')), -445.25, 1e-9);
});

test('test_hess_reverse_reaction_flips_sign', () => {
  near(H.reactionEnthalpy(byId('photosynthesis')).dH, -H.reactionEnthalpy(byId('respiration')).dH);
  near(H.reactionEnthalpy(byId('limestone')).dH, 179.2, 1e-9); // endothermic
});

test('test_hess_presets_are_balanced_and_in_the_booklet', () => {
  assert.deepEqual(atoms('Ca(OH)2(s)'), { Ca: 1, O: 2, H: 2 });
  for (const r of H.reactions) {
    assert.deepEqual(count(r.reactants), count(r.products), `${r.id} is not balanced`);
    for (const [, s] of [...r.reactants, ...r.products]) H.formationOf(s); // throws if missing
    assert.ok([...r.reactants, ...r.products].some(([, s]) => s === r.per), `${r.id}: per not in equation`);
  }
});

test('test_hess_phase_change_aluminium_fusion_worked_example', () => {
  // Melt 9.0 g of Al(s), ΔfusH = 10.7 kJ/mol (given in the question):
  // n = 9.0 / 26.98 = 0.334 mol, ΔH = 0.334 × 10.7 = +3.57 kJ (absorbed).
  const M = molarMass('Al');
  assert.equal(M, 26.98);
  const r = H.phaseChange(9.0, M, 10.7, 'melting');
  assert.equal(r.n.toPrecision(3), '0.334');
  assert.equal(r.dH.toPrecision(3), '3.57');
  // Freezing the same aluminium releases the same heat.
  assert.equal(H.phaseChange(9.0, M, 10.7, 'freezing').dH, -r.dH);
});

test('test_hess_phase_change_water_worked_example', () => {
  // Boil 36.0 g of water, ΔvapH = 40.7 kJ/mol: n = 36.0 / 18.02 = 2.00 mol, ΔH = +81.3 kJ.
  const r = H.phaseChange(36.0, molarMass('H2O'), 40.7, 'vaporizing');
  assert.equal(r.n.toPrecision(3), '2.00');
  assert.equal(r.dH.toPrecision(3), '81.3');
  assert.ok(H.phaseChange(36.0, molarMass('H2O'), 40.7, 'condensing').dH < 0);
});

test('test_hess_phase_change_backwards_chloroform_worked_example', () => {
  // 40.0 g of CHCl3 condenses and liberates 9.87 kJ: M = 12.01 + 1.01 + 3(35.45) = 119.37 g/mol,
  // n = 0.335 mol, ΔH = −9.87 kJ, ΔcondH = −29.5 kJ/mol, so ΔvapH = +29.5 kJ/mol.
  const M = molarMass('CHCl3');
  assert.equal(M.toFixed(2), '119.37');
  const r = H.molarFromHeat(40.0, M, 9.87, 'condensing');
  assert.equal(r.n.toPrecision(3), '0.335');
  assert.equal(r.dH, -9.87);
  assert.equal(r.molar.toPrecision(3), '-29.5');
  assert.equal(r.given.toPrecision(3), '29.5');
  // Round trip: forwards with the value found gives the heat back.
  assert.ok(Math.abs(H.phaseChange(40.0, M, r.given, 'condensing').dH - r.dH) < 1e-12);
});

test('test_hess_phase_change_mass_from_heat_ammonia_worked_example', () => {
  // NH3 condenses, ΔvapH = 1.37 kJ/mol as given, 10.0 kJ released:
  // n = 10.0 / 1.37 = 7.30 mol, M = 14.01 + 3(1.01) = 17.04 g/mol, m = 124 g.
  const M = molarMass('NH3');
  assert.equal(M.toFixed(2), '17.04');
  const r = H.massFromHeat(M, 10.0, 1.37, 'condensing');
  assert.equal(r.n.toPrecision(3), '7.30');
  assert.equal(r.m.toPrecision(3), '124');
  assert.equal(r.dH, -10.0);
  // Round trip: that mass, forwards, releases the same 10.0 kJ.
  assert.ok(Math.abs(H.phaseChange(r.m, M, 1.37, 'condensing').dH + 10.0) < 1e-12);
});
