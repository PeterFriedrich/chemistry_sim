import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as H from '../site/js/chem/hess.js';
import { formationEnthalpy } from '../site/js/chem/formation-data.js';
import { atoms, count } from './atoms.js';

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
