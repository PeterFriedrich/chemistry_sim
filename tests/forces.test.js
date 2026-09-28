import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as F from '../site/js/chem/forces.js';

const winner = (x, y) => {
  const c = F.compare(F.forcesOf(x), F.forcesOf(y));
  return { w: c.winner === null ? null : [x, y][c.winner], close: c.close };
};

test('test_forces_present_in_each_substance', () => {
  const ids = (x) => F.forcesOf(x).forces.map((f) => f.id);
  assert.deepEqual(ids('H2O'), ['london', 'dipole', 'hbond']);
  assert.deepEqual(ids('HF'), ['london', 'dipole', 'hbond']);
  assert.deepEqual(ids('NH3'), ['london', 'dipole', 'hbond']);
  assert.deepEqual(ids('HCl'), ['london', 'dipole', 'nohbond']);
  assert.deepEqual(ids('CH2O'), ['london', 'dipole', 'nohbond']); // H on C, not on O
  assert.deepEqual(ids('CH4'), ['london', 'nodipole', 'nohbond']);
  assert.deepEqual(ids('CO2'), ['london', 'nodipole', 'nohbond']);
  assert.deepEqual(ids('Ar'), ['london', 'nodipole', 'nohbond']);
  assert.equal(F.forcesOf('H2O').electrons, 10); // 8 + 1 + 1
  assert.equal(F.forcesOf('Cl2').electrons, 34);
  assert.match(F.forcesOf('NaCl').error, /ionic/);
});

test('test_forces_boiling_point_comparisons', () => {
  const cases = [
    // hydrogen bonding beats more electrons
    ['H2O', 'H2S', 'H2O'], ['HF', 'HCl', 'HF'], ['NH3', 'PH3', 'NH3'],
    // similar electrons: the kind of force decides
    ['CH4', 'NH3', 'NH3'], ['HCl', 'F2', 'HCl'], ['H2S', 'Ar', 'H2S'], ['HCN', 'N2', 'HCN'], ['CH3Cl', 'Cl2', 'CH3Cl'],
    // same kinds: more electrons
    ['CH4', 'SiH4', 'SiH4'], ['HCl', 'HBr', 'HBr'], ['Ne', 'Ar', 'Ar'],
    // dipole–dipole alone loses to many more electrons
    ['HCl', 'Cl2', 'Cl2'],
  ];
  for (const [x, y, w] of cases) {
    assert.equal(winner(x, y).w, w, `${x} vs ${y}`);
    assert.equal(winner(y, x).w, w, `${y} vs ${x} (order must not matter)`);
  }
  assert.deepEqual(winner('H2O', 'I2'), { w: 'H2O', close: true }); // flagged: I2 has 10.6× the electrons
  assert.deepEqual(winner('H2O', 'HF'), { w: null, close: true });
  assert.deepEqual(winner('SiH4', 'PH3'), { w: null, close: true });
});
