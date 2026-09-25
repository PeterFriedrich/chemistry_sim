import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../site/js/chem/titration.js';
import { acids } from '../site/js/chem/acid-data.js';
import { indicators } from '../site/js/chem/indicator-data.js';
import { atoms, charge, count, netCharge } from './atoms.js';

const near = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} vs ${b}`);
const an = (id) => T.analytes.find((a) => a.id === id);
const ind = (name) => indicators.find((i) => i.name === name);
// pH to the decimal places the student method gives it.
const shown = (r) => r.pH.toFixed(r.sig);

test('test_acid_table_matches_alberta_data_booklet', () => {
  // Spot checks against the booklet, pp. 8–9 (docs/DATA_SHEET.md §1.9).
  assert.equal(acids.length, 35);
  const Ka = (acid) => acids.find((a) => a.acid === acid).Ka;
  assert.equal(Ka('HCl(aq)'), Infinity);
  assert.equal(Ka('H3O^+(aq)'), 1);
  assert.equal(Ka('HF(aq)'), 6.3e-4);
  assert.equal(Ka('CH3COOH(aq)'), 1.8e-5);
  assert.equal(Ka('NH4^+(aq)'), 5.6e-10);
  assert.equal(Ka('HCO3^-(aq)'), 4.7e-11);
  assert.equal(Ka('H2O(l)'), 1.0e-14);
  // Strongest acid first, as printed.
  for (let i = 1; i < acids.length; i++) assert.ok(acids[i].Ka <= acids[i - 1].Ka, `row ${i + 1} out of order`);
});

test('test_acid_table_pairs_differ_by_one_proton', () => {
  // Catches a mis-transcribed formula or charge: the conjugate base is the acid less one H⁺.
  for (const a of acids) {
    const lessH = count([[1, a.acid]]);
    lessH.H -= 1;
    if (lessH.H === 0) delete lessH.H;
    assert.deepEqual(atoms(a.base), lessH, a.name);
    assert.equal(charge(a.base), charge(a.acid) - 1, a.name);
  }
});

test('test_indicator_table_matches_alberta_data_booklet', () => {
  // Spot checks against the booklet, p. 10 (docs/DATA_SHEET.md §1.10).
  assert.equal(indicators.length, 15);
  assert.deepEqual(ind('phenolphthalein').ranges[0], { acid: 'HPh(aq)', base: 'Ph^-(aq)', lo: 8.2, hi: 10.0, from: 'colourless', to: 'pink', Ka: 3.2e-10 });
  assert.deepEqual(ind('methyl red').ranges.map((r) => [r.lo, r.hi]), [[4.8, 6.0]]);
  assert.deepEqual(ind('bromothymol blue').ranges.map((r) => [r.lo, r.hi]), [[6.0, 7.6]]);
  assert.deepEqual(ind('thymol blue').ranges.map((r) => [r.lo, r.hi, r.from, r.to]), [[1.2, 2.8, 'red', 'yellow'], [8.0, 9.6, 'yellow', 'blue']]);
  for (const i of indicators) {
    for (const r of i.ranges) assert.ok(r.lo < r.hi, i.name);
    // Two-range indicators: the middle colour is shared.
    for (let k = 1; k < i.ranges.length; k++) assert.equal(i.ranges[k].from, i.ranges[k - 1].to, i.name);
  }
});

test('test_titration_every_analyte_is_in_the_table', () => {
  for (const a of T.analytes) if (a.kind !== 'SB') assert.ok(a.pair, `${a.id}: no Ka row`);
  for (const a of T.analytes) {
    const { reactants, products } = T.netIonic(a);
    assert.deepEqual(count(reactants), count(products), a.id);
    assert.equal(netCharge(reactants), netCharge(products), a.id);
  }
});

test('test_titration_weak_acid_worked_example', () => {
  // 25.0 mL of 0.100 mol/L CH₃COOH(aq) titrated with 0.100 mol/L NaOH(aq).
  const a = an('CH3COOH');
  near(T.equivalenceVolume(0.1, 0.025, 0.1), 0.025);
  // c/Ka = 5 600 > 1000: [H₃O⁺] = √(1.8 × 10⁻⁵ × 0.100) = 1.34 × 10⁻³ → pH 2.87
  const i = T.initialPH(a, 0.1);
  assert.equal(i.method, 'approximation');
  assert.equal(shown(i), '2.87');
  // Half-equivalence: [H₃O⁺] = Ka → pH 4.74
  assert.equal(shown(T.halfEquivalencePH(a)), '4.74');
  // Equivalence: [CH₃COO⁻] = 0.00250 mol / 0.0500 L = 0.0500 mol/L,
  // Kb = 1.0 × 10⁻¹⁴ / 1.8 × 10⁻⁵ = 5.6 × 10⁻¹⁰, [OH⁻] = 5.27 × 10⁻⁶ → pOH 5.28, pH 8.72
  const e = T.equivalencePH(a, 0.1, 0.025, 0.1);
  near(e.c, 0.05);
  assert.equal(e.species, 'CH3COO^-(aq)');
  assert.equal(shown(e), '8.72');
});

test('test_titration_strong_acid_strong_base_worked_example', () => {
  const a = an('HCl');
  const i = T.initialPH(a, 0.1);
  assert.equal(shown(i), '1.000'); // [H₃O⁺] = 0.100 mol/L, 3 sig figs
  assert.equal(shown(T.equivalencePH(a, 0.1, 0.025, 0.1)), '7.00');
  assert.equal(T.halfEquivalencePH(a), null);
  near(T.equivalenceVolume(0.1, 0.025, 0.2), 0.0125);
  // Strong base: [H₃O⁺] = Kw / [OH⁻] = 1.0 × 10⁻¹³ (2 sig figs from Kw) → 13.00
  assert.equal(shown(T.initialPH(an('NaOH'), 0.1)), '13.00');
});

test('test_titration_weak_base_worked_example', () => {
  // 25.0 mL of 0.100 mol/L NH₃(aq) titrated with 0.100 mol/L HCl(aq).
  const a = an('NH3');
  assert.equal(T.titrantFor(a), 'HCl(aq)');
  // Kb = 1.0 × 10⁻¹⁴ / 5.6 × 10⁻¹⁰ = 1.8 × 10⁻⁵, [OH⁻] = 1.34 × 10⁻³, pOH 2.87 → pH 11.13
  assert.equal(shown(T.initialPH(a, 0.1)), '11.13');
  // Half-equivalence: pH = pKa(NH₄⁺) = 9.25
  assert.equal(shown(T.halfEquivalencePH(a)), '9.25');
  // Equivalence: [NH₄⁺] = 0.0500 mol/L, [H₃O⁺] = √(5.6 × 10⁻¹⁰ × 0.0500) = 5.29 × 10⁻⁶ → 5.28
  const e = T.equivalencePH(a, 0.1, 0.025, 0.1);
  assert.equal(e.species, 'NH4^+(aq)');
  assert.equal(shown(e), '5.28');
});

test('test_titration_follows_the_booklet_approximation_rule', () => {
  // HF at 0.100 mol/L: c/Ka = 159 < 1000, so the quadratic.
  // x² / (0.100 − x) = 6.3 × 10⁻⁴ → x = 7.63 × 10⁻³ → pH 2.12 (the approximation would give 2.10)
  const i = T.initialPH(an('HF'), 0.1);
  assert.equal(i.method, 'quadratic');
  near(i.h, 7.63e-3, 5e-6);
  assert.equal(shown(i), '2.12');
  assert.equal(T.weakIonization(1.8e-2, 1.8e-5).method, 'quadratic'); // exactly 1000 × Ka: not "greater than"
  assert.equal(T.weakIonization(1.9e-2, 1.8e-5).method, 'approximation');
});

test('test_titration_indicator_choice', () => {
  const eq = (id) => T.equivalencePH(an(id), 0.1, 0.025, 0.1).pH;
  assert.ok(T.indicatorFits(ind('phenolphthalein'), eq('CH3COOH')).fits);
  assert.ok(!T.indicatorFits(ind('methyl orange'), eq('CH3COOH')).fits);
  assert.ok(T.indicatorFits(ind('methyl red'), eq('NH3')).fits);
  assert.ok(T.indicatorFits(ind('bromothymol blue'), eq('HCl')).fits);
  // Thymol blue fits a weak-acid titration through its second range.
  assert.equal(T.indicatorFits(ind('thymol blue'), eq('CH3COOH')).range.lo, 8.0);
});

test('test_titration_indicator_colour', () => {
  const tb = ind('thymol blue');
  assert.deepEqual(T.indicatorColour(tb, 0.5), { from: 'red', to: 'yellow', f: 0 });
  assert.deepEqual(T.indicatorColour(tb, 5), { from: 'red', to: 'yellow', f: 1 });
  near(T.indicatorColour(tb, 8.8).f, 0.5);
  assert.deepEqual(T.indicatorColour(tb, 12), { from: 'yellow', to: 'blue', f: 1 });
});

test('test_titration_exact_curve_agrees_with_the_student_method', () => {
  // The drawn curve passes through the readouts' points (to the last digit shown or near it).
  for (const id of ['HCl', 'CH3COOH', 'HCOOH', 'NaOH', 'NH3']) {
    const a = an(id);
    const Veq = T.equivalenceVolume(0.1, 0.025, 0.1);
    near(T.curvePH(a, 0.1, 0.025, 0.1, 0), T.initialPH(a, 0.1).pH, 0.01);
    near(T.curvePH(a, 0.1, 0.025, 0.1, Veq), T.equivalencePH(a, 0.1, 0.025, 0.1).pH, 0.01);
    const half = T.halfEquivalencePH(a);
    if (half) near(T.curvePH(a, 0.1, 0.025, 0.1, Veq / 2), half.pH, 0.02);
    // pH rises through an acid titration and falls through a base titration.
    let prev = T.curvePH(a, 0.1, 0.025, 0.1, 0);
    for (let V = 0.001; V <= 0.05; V += 0.001) {
      const p = T.curvePH(a, 0.1, 0.025, 0.1, V);
      assert.ok(T.isAcid(a) ? p > prev : p < prev, `${id} at ${V} L`);
      prev = p;
    }
  }
});
