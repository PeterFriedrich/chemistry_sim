import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as B from '../site/js/chem/bonding.js';
import * as S from '../site/js/chem/structure.js';
import { parseFormula } from '../site/js/chem/naming.js';

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
  assert.match(B.analyse('SO2').error, /coordinate bond/); // S and O both have capacity 2: no structure
  assert.match(B.analyse('C7H16').error, /up to 6 atoms/);
  assert.match(B.analyse('CH3CH3CH3').error, /no bonding capacity left/);
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

// Bond orders along the written chain, and each central atom's shape.
test('test_bonding_chain_condensed_formulas', () => {
  const cases = [
    ['CH3CH2OH', 'C2H6O', '1 1', ['tetrahedral', 'tetrahedral', 'V-shaped (bent)']],
    ['CH3OCH3', 'C2H6O', '1 1', ['tetrahedral', 'V-shaped (bent)', 'tetrahedral']],
    ['CH3CN', 'C2H3N', '1 3', ['tetrahedral', 'linear']],
    ['CH2CH2', 'C2H4', '2', ['trigonal planar', 'trigonal planar']],
    ['HCCH', 'C2H2', '3', ['linear', 'linear']],
    ['CH3NH2', 'CH5N', '1', ['tetrahedral', 'trigonal pyramidal']],
    ['CH3CH(CH3)CH3', 'C4H10', '1 1 1', ['tetrahedral', 'tetrahedral', 'tetrahedral', 'tetrahedral']],
    ['(CH3)2CHOH', 'C3H8O', '1 1 1', ['tetrahedral', 'tetrahedral', 'tetrahedral', 'V-shaped (bent)']],
    ['CH3COCH3', 'C3H6O', '1 1 2', ['tetrahedral', 'trigonal planar', 'tetrahedral']], // the O is a C=O branch
    ['CH3COOH', 'C2H4O2', '1 1 2', ['tetrahedral', 'trigonal planar', 'V-shaped (bent)']],
    ['CH2NH', 'CH3N', '2', ['trigonal planar', 'V-shaped (bent)']],
  ];
  for (const [f, mf, orders, shapes] of cases) {
    const r = B.analyse(f);
    assert.ok(!r.error, `${f}: ${r.error}`);
    assert.equal(r.chain, true, f);
    assert.equal(r.molecular, mf, f);
    assert.equal(r.structure.edges.map((e) => e.order).sort().join(' '), orders, f);
    assert.deepEqual(r.centres.map((c) => c.shape.name).sort(), shapes.slice().sort(), f);
  }
  assert.equal(B.analyse('CH2NH').centres.find((c) => c.label === 'NH').shape.angle, 'about 120°'); // 2 bonded + 1 lone pair
  // A molecular formula is drawn only when it has one structure.
  assert.equal(B.analyse('C2H6').formula, 'CH3CH3');
  assert.equal(B.analyse('H2O2').formula, 'HOOH');
  assert.equal(B.analyse('N2H4').formula, 'H2NNH2');
  const e = B.analyse('C2H6O');
  assert.match(e.error, /2 possible structures/);
  assert.deepEqual(e.isomers.map((i) => i.formula).sort(), ['CH3CH2OH', 'CH3OCH3']);
  assert.match(B.analyse('SO2').error, /coordinate bond or an expanded octet/);
});

test('test_bonding_chain_polarity_by_vector_sum', () => {
  // Every hydrocarbon comes out exactly nonpolar: at each carbon the bond
  // directions sum to zero, so the C–H dipoles cancel across the molecule.
  for (const n of [2, 3, 4, 5, 6]) {
    for (const h of [2 * n + 2, 2 * n, 2 * n - 2]) {
      for (const m of S.isomers(Array(n).fill('C'), Array(h).fill('H'))) {
        const r = B.analyse(S.condensed(m));
        assert.equal(r.polar, false, S.condensed(m));
      }
    }
  }
  for (const f of ['CH3OH', 'CH3CH2OH', 'CH3OCH3', 'CH3CN', 'CH3NH2', 'CH3COCH3', 'CH3COOH', 'CH3CH2Cl']) assert.equal(B.analyse(f).polar, true, f);
  assert.equal(B.analyse('CCl2CCl2').polar, false); // symmetrical: the C–Cl dipoles cancel
  assert.match(B.analyse('CHClCHCl').reason, /cis and trans/);
});

test('test_bonding_structural_isomer_counts', () => {
  // Acyclic structures only; no cis/trans.
  const count = (f) => {
    const atoms = [];
    const expand = (tokens) => tokens.forEach((t) => atoms.push(...Array(t.count).fill(t.sym)));
    expand(parseFormula(f).tokens);
    return S.isomers(atoms.filter((s) => S.capacity(s) >= 2), atoms.filter((s) => S.capacity(s) === 1)).length;
  };
  const cases = { C2H6O: 2, C4H10: 2, C5H12: 3, C6H14: 5, C3H8O: 3, C4H10O: 7, C4H8: 3, C3H4: 2, C2H4Cl2: 2, C3H7Cl: 2, C2H6: 1, C3H6: 1 };
  for (const [f, n] of Object.entries(cases)) assert.equal(count(f), n, f);
});

test('test_bonding_condensed_formula_round_trips', () => {
  // Every generated isomer, written as a condensed formula, reads back as itself.
  const sets = [['CCCCOO', 10], ['CCCN', 9], ['CCCCCC', 12], ['CCON', 5], ['CCCO', 6], ['CCCCCO', 12], ['CCSO', 6], ['COO', 2]];
  let n = 0;
  for (const [heavy, h] of sets) {
    for (const m of S.isomers([...heavy], Array(h).fill('H'))) {
      const text = S.condensed(m);
      const r = S.parseCondensed(parseFormula(text).tokens);
      assert.ok(r.mol, `${text}: ${r.error}`);
      assert.equal(S.canonical(r.mol), S.canonical(m), text);
      n++;
    }
  }
  assert.equal(n, 88);
  assert.equal(S.condensed(S.isomers(['C', 'O', 'O'], ['H', 'H'])[0]), 'HCOOH');
});
