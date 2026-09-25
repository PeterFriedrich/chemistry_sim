import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as X from '../site/js/chem/electrolysis.js';
import { elements } from '../site/js/chem/elements-data.js';

const near = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} vs ${b}`);
const cell = (id, metal = false) => X.predict(X.speciesPresent(X.electrolytes.find((e) => e.id === id), metal));
const names = (side) => side.map(([, s]) => s);

test('test_elements_molar_masses_match_alberta_data_booklet', () => {
  // Spot checks against the booklet's periodic table (docs/DATA_SHEET.md §1.8).
  assert.equal(Object.keys(elements).length, 111);
  const pinned = { H: 1.01, C: 12.01, N: 14.01, O: 16.0, Na: 22.99, Cl: 35.45, Cu: 63.55, Zn: 65.41, Ag: 107.87, I: 126.9, Pb: 207.2, U: 238.03 };
  for (const [sym, M] of Object.entries(pinned)) assert.equal(elements[sym].M, M, sym);
  assert.ok(elements.Tc.isotope && elements.Tc.M === 98);
  for (const [sym, e] of Object.entries(elements)) assert.match(sym, /^[A-Z][a-z]?$/, `${e.Z}`);
});

test('test_molar_mass_from_formula', () => {
  near(X.molarMass('H2O(l)'), 18.02, 1e-9);
  near(X.molarMass('I2(s)'), 253.8, 1e-9);
  near(X.molarMass('C6H12O6(s)'), 180.18, 1e-9);
  near(X.molarMass('Ca(OH)2(s)'), 74.1, 1e-9);
  near(X.molarMass('SO4^2-(aq)'), 96.07, 1e-9);
});

test('test_electrolysis_copper_sulfate_predicts_soa_and_sra', () => {
  // Present: Cu²⁺, SO₄²⁻, H₂O. SOA Cu²⁺ (+0.34 V) beats H₂O (−0.83 V);
  // SRA H₂O (+1.23 V) is the only reducing agent. E°cell = 0.34 − 1.23 = −0.89 V.
  const c = cell('CuSO4');
  assert.deepEqual(names(c.cathode.red), ['Cu(s)']);
  assert.deepEqual(names(c.anode.ox), ['O2(g)', 'H^+(aq)']);
  near(c.E, -0.89);
  near(c.minVoltage, 0.89);
});

test('test_electrolysis_predictions_follow_the_table', () => {
  // KI: water reduced (−0.83 V beats K⁺ −2.93 V), I⁻ oxidized (+0.54 V beats H₂O +1.23 V).
  const ki = cell('KI');
  assert.deepEqual(names(ki.cathode.red), ['H2(g)', 'OH^-(aq)']);
  assert.deepEqual(names(ki.anode.ox), ['I2(s)']);
  near(ki.E, -1.37);
  // Na₂SO₄: water at both electrodes, −0.83 − 1.23 = −2.06 V.
  const na = cell('Na2SO4');
  assert.deepEqual(names(na.cathode.ox), ['H2O(l)']);
  assert.deepEqual(names(na.anode.red), ['H2O(l)']);
  near(na.E, -2.06);
  // ZnSO₄: Zn²⁺ (−0.76 V) is just above water (−0.83 V), so zinc plates.
  assert.deepEqual(names(cell('ZnSO4').cathode.red), ['Zn(s)']);
  // Copper electrodes in CuSO₄ (refining): the Cu anode (+0.34 V) is the SRA, 0.00 V.
  const refine = cell('CuSO4', true);
  assert.deepEqual(names(refine.anode.red), ['Cu(s)']);
  near(refine.E, 0);
  // No metal electrodes on offer for KI: the option changes nothing.
  assert.deepEqual(cell('KI', true), ki);
});

test('test_electrolysis_faraday_worked_example', () => {
  // 1.00 A for 30.0 min through CuSO₄(aq): Q = It = 1.00 × 1800 = 1.80 × 10³ C,
  // n(e⁻) = 1800 / (9.65 × 10⁴) = 0.018653 mol, n(Cu) = n(e⁻)/2 = 0.0093264 mol,
  // m(Cu) = 0.0093264 × 63.55 = 0.593 g; n(O₂) = n(e⁻)/4 = 0.00466 mol.
  const Q = X.charge(1.0, 30.0 * 60);
  near(Q, 1800);
  const ne = X.electronMoles(Q);
  near(ne, 1800 / 96500);
  const c = cell('CuSO4');
  const cu = X.electrodeAmounts(c.cathode, ne, true).find((r) => r.species === 'Cu(s)');
  near(cu.n, ne / 2);
  assert.equal(cu.m.toPrecision(3), '0.593');
  const o2 = X.electrodeAmounts(c.anode, ne, false).find((r) => r.species === 'O2(g)');
  near(o2.n, ne / 4);
  assert.equal(o2.m, null); // a gas: amount only
  // Refining: the Cu anode loses what the cathode gains.
  const r = cell('CuSO4', true);
  const lost = X.electrodeAmounts(r.anode, ne, false).find((x) => x.species === 'Cu(s)');
  assert.equal(lost.sign, -1);
  near(lost.m, cu.m);
});
