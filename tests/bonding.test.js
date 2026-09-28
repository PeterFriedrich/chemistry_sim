import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as B from '../site/js/chem/bonding.js';

test('test_bonding_shapes_and_polarity_worked_examples', () => {
  const cases = [
    // formula, shape, polar, central lone pairs
    ['H2', 'linear', false, 0], ['N2', 'linear', false, 1], ['HCl', 'linear', true, 0],
    ['CH4', 'tetrahedral', false, 0], ['CCl4', 'tetrahedral', false, 0], ['CH3Cl', 'tetrahedral', true, 0],
    ['NH3', 'trigonal pyramidal', true, 1], ['PCl3', 'trigonal pyramidal', true, 1],
    ['H2O', 'V-shaped (bent)', true, 2], ['H2S', 'V-shaped (bent)', true, 2],
    ['CO2', 'linear', false, 0], ['HCN', 'linear', true, 0],
    ['BF3', 'trigonal planar', false, 0], ['CH2O', 'trigonal planar', true, 0],
  ];
  for (const [f, shape, polar, lone] of cases) {
    const r = B.analyse(f);
    assert.ok(!r.error, `${f}: ${r.error}`);
    assert.equal(r.shape.name, shape, f);
    assert.equal(r.polar, polar, f);
    assert.equal(r.centralLone, lone, f);
  }
});

test('test_bonding_delta_en_from_booklet_and_cutoffs', () => {
  // Booklet: H 2.2, C 2.6, N 3.0, O 3.4, F 4.0, Cl 3.2.
  const bond = (f, sym) => B.analyse(f).bonds.find((b) => b.b === sym);
  assert.equal(bond('H2O', 'H').dEN, 1.2);
  assert.equal(bond('HCl', 'Cl').dEN, 1.0);
  assert.equal(bond('CH4', 'H').dEN, 0.4);
  assert.equal(bond('NH3', 'H').dEN, 0.8);
  assert.equal(bond('H2O', 'H').toward, 'O'); // δ− on the more electronegative atom
  assert.equal(bond('CH4', 'H').toward, 'C');
  assert.equal(B.bondType(0), 'nonpolar covalent');
  assert.equal(B.bondType(1.6), 'polar covalent');
  assert.match(B.bondType(1.7), /^ionic by the ΔEN rule/);
  assert.match(bond('HF', 'F').type, /very polar covalent/); // 4.0 − 2.2 = 1.8, still two nonmetals
  // Equal electronegativities: nonpolar bonds, nonpolar even with a lone pair.
  assert.equal(B.analyse('PH3').polar, false);
  assert.equal(B.analyse('CS2').bonds[0].type, 'nonpolar covalent');
});

test('test_bonding_lewis_by_bonding_capacity', () => {
  const r = B.analyse('HCN');
  assert.equal(r.central, 'C');
  assert.deepEqual(r.terminals.map((t) => [t.sym, t.order, t.lone]), [['H', 1, 0], ['N', 3, 1]]);
  assert.deepEqual(B.analyse('CO2').terminals.map((t) => [t.order, t.lone]), [[2, 2], [2, 2]]);
  assert.deepEqual(B.analyse('O2').terminals.map((t) => [t.order, t.lone]), [[2, 2]]);
  assert.deepEqual(B.analyse('CCl4').terminals[0], { sym: 'Cl', order: 1, lone: 3 });
  assert.equal(B.analyse('HOCl').central, 'O'); // hydrogen is never central
});

test('test_bonding_refuses_what_bonding_capacity_cannot_draw', () => {
  assert.match(B.analyse('CO').error, /coordinate bond/);
  assert.match(B.analyse('PCl5').error, /expanded octet/);
  assert.match(B.analyse('SO2').error, /same bonding capacity/);
  assert.match(B.analyse('C2H6').error, /one central atom/);
  assert.match(B.analyse('NaCl').error, /ionic compound/);
  assert.match(B.analyse('XeF2').error, /bonding capacity of 0/);
  assert.match(B.analyse('HCl(aq)').error, /without/);
});

test('test_bonding_net_dipole_agrees_with_the_symmetry_rule', () => {
  // Nonpolar exactly when the bonds are all nonpolar, or the shape has no
  // central lone pairs and identical outer atoms.
  for (const f of ['H2', 'HCl', 'HF', 'CH4', 'CH3Cl', 'CH2Cl2', 'CHCl3', 'CCl4', 'NH3', 'NF3', 'PH3', 'H2O', 'OF2', 'HOCl', 'CO2', 'CS2', 'HCN', 'BF3', 'CH2O', 'COCl2', 'SiH4']) {
    const r = B.analyse(f);
    const symmetric = r.centralLone === 0 && new Set(r.terminals.map((t) => `${t.sym}${t.order}`)).size === 1 && !r.diatomic;
    const expected = !(r.bonds.every((b) => b.dEN === 0) || symmetric);
    assert.equal(r.polar, expected, f);
  }
  assert.deepEqual(B.analyse('NH3').net.map((v) => Math.round(v * 100) / 100), [0, 1, 0]); // toward N, up the lone-pair axis
});
