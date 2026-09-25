import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as R from '../site/js/chem/redox.js';
import { halfReactions } from '../site/js/chem/redox-data.js';
import { count, netCharge } from './atoms.js';

const near = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} vs ${b}`);
const couple = (id) => R.couples.find((c) => c.id === id);
const cell = (a, b) => {
  const { cathode, anode } = R.assignElectrodes(couple(a), couple(b));
  return { cathode, anode, E: R.cellPotential(cathode.half.E, anode.half.E), net: R.netEquation(cathode.half, anode.half) };
};

test('test_redox_table_matches_alberta_data_booklet', () => {
  // Spot checks against the booklet, p. 7 (docs/DATA_SHEET.md §1.7).
  assert.equal(halfReactions.length, 49);
  const E = (ion, red) => halfReactions.find((h) => h.ox[0][1] === ion && h.red[0][1] === red).E;
  assert.equal(E('F2(g)', 'F^-(aq)'), 2.87);
  assert.equal(E('Ag^+(aq)', 'Ag(s)'), 0.8);
  assert.equal(E('Cu^2+(aq)', 'Cu(s)'), 0.34);
  assert.equal(E('H^+(aq)', 'H2(g)'), 0);
  assert.equal(E('Zn^2+(aq)', 'Zn(s)'), -0.76);
  assert.equal(E('H2O(l)', 'H2(g)'), -0.83);
  assert.equal(E('Li^+(aq)', 'Li(s)'), -3.04);
  assert.equal(E('Cr2O7^2-(aq)', 'Cr^3+(aq)'), 1.23);
  // The table runs strongest oxidizing agent first.
  for (let i = 1; i < halfReactions.length; i++) assert.ok(halfReactions[i].E <= halfReactions[i - 1].E, `row ${i + 1} out of order`);
});

test('test_redox_every_half_reaction_balances', () => {
  // Catches a mis-transcribed coefficient, charge or electron count.
  for (const h of halfReactions) {
    const label = `${h.ox.map((t) => t[1]).join(' + ')} (E° ${h.E})`;
    assert.deepEqual(count(h.ox), count(h.red), `atoms: ${label}`);
    assert.equal(netCharge(h.ox) - h.e, netCharge(h.red), `charge: ${label}`);
  }
});

test('test_voltaic_every_couple_is_in_the_table', () => {
  for (const c of R.couples) assert.ok(c.half, `${c.id}: no half-reaction found`);
});

test('test_voltaic_zinc_copper_worked_example', () => {
  // E°cell = E°cathode − E°anode = +0.34 − (−0.76) = +1.10 V; Cu²⁺ is the SOA.
  const c = cell('Zn', 'Cu');
  assert.equal(c.cathode.id, 'Cu');
  assert.equal(c.anode.id, 'Zn');
  near(c.E, 1.1);
  assert.deepEqual(c.net, { reactants: [[1, 'Cu^2+(aq)'], [1, 'Zn(s)']], products: [[1, 'Cu(s)'], [1, 'Zn^2+(aq)']], electrons: 2 });
});

test('test_voltaic_electron_balance', () => {
  // 2Ag⁺ + Cu → 2Ag + Cu²⁺, E°cell = 0.80 − 0.34 = +0.46 V
  const agcu = cell('Cu', 'Ag');
  near(agcu.E, 0.46);
  assert.deepEqual(agcu.net.reactants, [[2, 'Ag^+(aq)'], [1, 'Cu(s)']]);
  assert.equal(agcu.net.electrons, 2);
  // 3Cu²⁺ + 2Al → 3Cu + 2Al³⁺: 6 e⁻, E°cell = 0.34 − (−1.66) = +2.00 V
  const alcu = cell('Al', 'Cu');
  near(alcu.E, 2.0);
  assert.deepEqual(alcu.net.reactants, [[3, 'Cu^2+(aq)'], [2, 'Al(s)']]);
  assert.equal(alcu.net.electrons, 6);
  // Standard hydrogen half-cell as the anode: Cu²⁺ + H₂ → Cu + 2H⁺, +0.34 V
  const h = cell('H', 'Cu');
  near(h.E, 0.34);
  assert.deepEqual(h.net.products, [[1, 'Cu(s)'], [2, 'H^+(aq)']]);
  for (const x of [agcu, alcu, h]) {
    assert.deepEqual(count(x.net.reactants), count(x.net.products));
    assert.equal(netCharge(x.net.reactants), netCharge(x.net.products));
  }
});

test('test_voltaic_reversed_cell_is_non_spontaneous', () => {
  // Forcing Zn²⁺ to be reduced by Cu: E°cell = −0.76 − 0.34 = −1.10 V
  near(R.cellPotential(couple('Zn').half.E, couple('Cu').half.E), -1.1);
  // Same half-cell twice: nothing left after cancelling, and 0 V.
  const same = R.netEquation(couple('Cu').half, couple('Cu').half);
  assert.deepEqual([same.reactants, same.products], [[], []]);
});
