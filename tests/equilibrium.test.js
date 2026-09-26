import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../site/js/chem/equilibrium.js';
import { ionColours } from '../site/js/chem/ion-colour-data.js';
import { count, netCharge } from './atoms.js';

const near = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} vs ${b}`);
const sys = (id) => E.systems.find((s) => s.id === id);
const start = (s) => ({ c: { ...s.start }, K: E.massAction(s, s.start), V: 1 });
const sig3 = (x) => Number(x.toPrecision(3));

test('test_ion_colours_match_alberta_data_booklet', () => {
  // Spot checks against the booklet, p. 11 (docs/DATA_SHEET.md §1.11).
  assert.equal(Object.keys(ionColours).length, 12);
  assert.deepEqual(ionColours['CrO4^2-(aq)'], { name: 'chromate', strong: 'yellow', dilute: 'pale yellow' });
  assert.deepEqual(ionColours['Cr2O7^2-(aq)'], { name: 'dichromate', strong: 'orange', dilute: 'pale orange' });
  assert.equal(ionColours['Cu^2+(aq)'].strong, 'blue');
  assert.equal(ionColours['MnO4^-(aq)'].strong, 'deep purple');
});

test('test_equilibrium_presets_are_balanced', () => {
  for (const s of E.systems) {
    assert.deepEqual(count(s.reactants), count(s.products), s.id);
    assert.equal(netCharge(s.reactants), netCharge(s.products), s.id);
    for (const [, sp] of [...E.expression(s).num, ...E.expression(s).den]) assert.ok(s.start[sp] > 0, `${s.id}: no start for ${sp}`);
  }
});

test('test_equilibrium_kc_worked_examples', () => {
  // Kc = [NH₃]² / ([N₂][H₂]³) = 0.200² / (0.500 × 0.800³) = 0.156
  assert.equal(sig3(E.massAction(sys('haber'), sys('haber').start)), 0.156);
  // Kc = [SO₃]² / ([SO₂]²[O₂]) = 0.500² / (0.400² × 0.200) = 7.81
  assert.equal(sig3(E.massAction(sys('contact'), sys('contact').start)), 7.81);
  // Kc = [N₂O₄] / [NO₂]² = 0.400 / 0.200² = 10.0
  assert.equal(sig3(E.massAction(sys('no2'), sys('no2').start)), 10);
  // H₂O(l) is left out: Kc = [Cr₂O₇²⁻] / ([CrO₄²⁻]²[H₃O⁺]²) = 0.100 / (0.150² × 0.100²) = 444
  assert.deepEqual(E.expression(sys('chromate')).num, [[1, 'Cr2O7^2-(aq)']]);
  assert.equal(sig3(E.massAction(sys('chromate'), sys('chromate').start)), 444);
});

test('test_equilibrium_enthalpy_from_the_booklet', () => {
  // ΔrH = ΣnΔfH°(products) − ΣnΔfH°(reactants), booklet values.
  near(E.deltaH(sys('haber')), -91.8, 1e-9); // 2(−45.9)
  near(E.deltaH(sys('contact')), -197.8, 1e-9); // 2(−395.7) − 2(−296.8)
  near(E.deltaH(sys('no2')), -55.3, 1e-9); // 11.1 − 2(33.2)
  assert.equal(E.deltaH(sys('chromate')), null);
});

test('test_equilibrium_concentration_stress_worked_example', () => {
  // Add 0.200 mol/L N₂: Q = 0.200² / (0.700 × 0.800³) = 0.112 < Kc = 0.156 → forward.
  const s = sys('haber');
  const before = start(s);
  const after = E.applyStress(s, before, { kind: 'add', species: 'N2(g)', amount: 0.2 });
  const Q = E.massAction(s, after.c);
  assert.equal(sig3(Q), 0.112);
  assert.equal(after.K, before.K);
  assert.equal(E.shiftDirection(Q, after.K), 'forward');
  // The new equilibrium keeps Kc, and uses up only part of the added N₂.
  const eq = E.equilibrate(s, after.c, after.K);
  near(E.massAction(s, eq), before.K, 1e-9);
  assert.ok(eq['N2(g)'] > 0.5 && eq['N2(g)'] < 0.7);
  assert.ok(eq['NH3(g)'] > 0.2 && eq['H2(g)'] < 0.8);
  near(eq['NH3(g)'] - 0.2, (2 / 3) * (0.8 - eq['H2(g)']), 1e-12); // stoichiometric: 2 NH₃ per 3 H₂
  // Removing a product also shifts forward.
  const rm = E.applyStress(s, before, { kind: 'remove', species: 'NH3(g)' });
  assert.equal(E.shiftDirection(E.massAction(s, rm.c), rm.K), 'forward');
});

test('test_equilibrium_volume_stress_favours_fewer_gas_moles', () => {
  const s = sys('haber');
  assert.equal(E.gasMoles(s.reactants), 4);
  assert.equal(E.gasMoles(s.products), 2);
  // Halve V: every concentration doubles, Q = 0.400² / (1.00 × 1.60³) = 0.0391 < Kc → forward (toward 2 mol gas).
  const half = E.applyStress(s, start(s), { kind: 'volume', factor: 0.5 });
  near(half.V, 0.5);
  assert.equal(sig3(E.massAction(s, half.c)), 0.0391);
  assert.equal(E.shiftDirection(E.massAction(s, half.c), half.K), 'forward');
  const dbl = E.applyStress(s, start(s), { kind: 'volume', factor: 2 });
  assert.equal(E.shiftDirection(E.massAction(s, dbl.c), dbl.K), 'reverse');
});

test('test_equilibrium_temperature_changes_k_by_the_sign_of_dh', () => {
  // Exothermic forward: raising T lowers Kc (illustrative factor), Q is unchanged → reverse.
  const s = sys('haber');
  const hot = E.applyStress(s, start(s), { kind: 'temperature', dir: 1 });
  near(hot.K, E.massAction(s, s.start) / E.TEMPERATURE_FACTOR, 1e-12);
  assert.deepEqual(hot.c, s.start);
  assert.equal(E.shiftDirection(E.massAction(s, hot.c), hot.K), 'reverse');
  const cold = E.applyStress(s, start(s), { kind: 'temperature', dir: -1 });
  assert.equal(E.shiftDirection(E.massAction(s, cold.c), cold.K), 'forward');
});

test('test_equilibrium_catalyst_and_inert_gas_do_not_shift', () => {
  const s = sys('contact');
  for (const kind of ['catalyst', 'inert']) {
    const st = E.applyStress(s, start(s), { kind });
    assert.equal(E.shiftDirection(E.massAction(s, st.c), st.K), 'none', kind);
  }
});

test('test_equilibrium_chromate_dichromate', () => {
  // Add 0.100 mol/L H₃O⁺: Q = 0.100 / (0.150² × 0.200²) = 111 < 444 → forward (orange).
  const s = sys('chromate');
  const acid = E.applyStress(s, start(s), { kind: 'add', species: 'H3O^+(aq)', amount: 0.1 });
  assert.equal(sig3(E.massAction(s, acid.c)), 111);
  assert.equal(E.shiftDirection(E.massAction(s, acid.c), acid.K), 'forward');
  // Remove half the H₃O⁺ (add OH⁻): Q = 0.100 / (0.150² × 0.0500²) = 1.78 × 10³ → reverse (yellow).
  const base = E.applyStress(s, start(s), { kind: 'remove', species: 'H3O^+(aq)' });
  assert.equal(sig3(E.massAction(s, base.c)), 1780);
  assert.equal(E.shiftDirection(E.massAction(s, base.c), base.K), 'reverse');
  const eq = E.equilibrate(s, base.c, base.K);
  assert.ok(eq['Cr2O7^2-(aq)'] < 0.1 && eq['CrO4^2-(aq)'] > 0.15);
});

test('test_equilibrium_second_stress_starts_from_the_new_equilibrium', () => {
  // Haber: add 0.200 N₂, let it settle, then double the volume. At the new equilibrium
  // Q = Kc, and doubling V divides [N₂][H₂]³ by 16 and [NH₃]² by 4, so Q = 4 Kc = 0.625.
  const s = sys('haber');
  const st = start(s);
  const a = E.applyStress(s, st, { kind: 'add', species: 'N2(g)', amount: 0.2 });
  const eq = E.equilibrate(s, a.c, a.K);
  near(E.massAction(s, eq), st.K, 1e-9);
  const b = E.applyStress(s, { c: eq, K: a.K, V: a.V }, { kind: 'volume', factor: 2 });
  near(E.massAction(s, b.c), 4 * st.K, 1e-9);
  assert.equal(sig3(E.massAction(s, b.c)), 0.625);
  assert.equal(E.shiftDirection(E.massAction(s, b.c), b.K), 'reverse');
});
