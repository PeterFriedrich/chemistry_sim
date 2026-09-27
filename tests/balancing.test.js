import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as B from '../site/js/chem/balancing.js';
import { count, netCharge } from './atoms.js';

const sk = (id) => B.skeletons.find((s) => s.id === id);
const final = (id, medium) => {
  const { final: f } = B.balanceHalf(sk(id), medium);
  return [f.left, f.right, f.e];
};

test('test_balancing_half_reaction_worked_examples', () => {
  // SPEC_phase2 §5 table; e is the electrons and their side.
  assert.deepEqual(final('NO3', 'acidic'), [[[1, 'NO3^-(aq)'], [4, 'H^+(aq)']], [[1, 'NO(g)'], [2, 'H2O(l)']], { side: 'left', n: 3 }]);
  assert.deepEqual(final('Cr2O7', 'acidic'), [[[1, 'Cr2O7^2-(aq)'], [14, 'H^+(aq)']], [[2, 'Cr^3+(aq)'], [7, 'H2O(l)']], { side: 'left', n: 6 }]);
  assert.deepEqual(final('C2H5OH', 'acidic'), [[[1, 'C2H5OH(aq)'], [1, 'H2O(l)']], [[1, 'CH3COOH(aq)'], [4, 'H^+(aq)']], { side: 'right', n: 4 }]);
  assert.deepEqual(final('MnO4-MnO2', 'basic'), [[[1, 'MnO4^-(aq)'], [2, 'H2O(l)']], [[1, 'MnO2(s)'], [4, 'OH^-(aq)']], { side: 'left', n: 3 }]);
  assert.deepEqual(final('SO3', 'basic'), [[[1, 'SO3^2-(aq)'], [2, 'OH^-(aq)']], [[1, 'SO4^2-(aq)'], [1, 'H2O(l)']], { side: 'right', n: 2 }]);
  assert.deepEqual(final('H2O2', 'acidic'), [[[1, 'H2O2(aq)']], [[1, 'O2(g)'], [2, 'H^+(aq)']], { side: 'right', n: 2 }]);
  assert.deepEqual(final('C2O4', 'acidic'), [[[1, 'C2O4^2-(aq)']], [[2, 'CO2(g)']], { side: 'right', n: 2 }]);
});

test('test_balancing_every_skeleton_balances_in_both_media', () => {
  for (const s of B.skeletons) {
    for (const medium of ['acidic', 'basic']) {
      const r = B.balanceHalf(s, medium);
      const t = B.tally(r.final);
      assert.ok(t.balanced, `${s.id} ${medium}`);
      // Independent check with the test-only parser: atoms balance; charge differs by the electrons.
      assert.deepEqual(count(r.final.left), count(r.final.right), `${s.id} ${medium}`);
      const gap = netCharge(r.final.left) - netCharge(r.final.right);
      assert.equal(gap, r.reduction ? r.final.e.n : -r.final.e.n, `${s.id} ${medium}`);
      const species = [...r.final.left, ...r.final.right].map(([, x]) => x);
      if (medium === 'basic') assert.ok(!species.includes('H^+(aq)'), `${s.id}: H+ left in basic solution`);
      else assert.ok(!species.includes('OH^-(aq)'), `${s.id}: OH- in acidic solution`);
      assert.ok(!(r.final.left.some(([, x]) => x === 'H2O(l)') && r.final.right.some(([, x]) => x === 'H2O(l)')), `${s.id}: water on both sides`);
      // Step 1 leaves the skeleton unbalanced only in O, H and charge.
      const t1 = B.tally(r.steps[1]);
      for (const row of t1.rows) if (row.el !== 'O' && row.el !== 'H') assert.equal(row.left, row.right, `${s.id} ${row.el}`);
    }
  }
});

test('test_balancing_net_ionic_worked_examples', () => {
  const net = (a, b, m) => {
    const c = B.combine(sk(a), sk(b), m);
    return [c.net.reactants, c.net.products, c.net.electrons];
  };
  // Breathalyzer: ×2 and ×3, 12 e⁻.
  assert.deepEqual(net('Cr2O7', 'C2H5OH', 'acidic'), [
    [[2, 'Cr2O7^2-(aq)'], [16, 'H^+(aq)'], [3, 'C2H5OH(aq)']],
    [[4, 'Cr^3+(aq)'], [11, 'H2O(l)'], [3, 'CH3COOH(aq)']],
    12,
  ]);
  assert.deepEqual(net('MnO4-Mn', 'C2O4', 'acidic'), [
    [[2, 'MnO4^-(aq)'], [16, 'H^+(aq)'], [5, 'C2O4^2-(aq)']],
    [[2, 'Mn^2+(aq)'], [8, 'H2O(l)'], [10, 'CO2(g)']],
    10,
  ]);
  // Order of the halves does not matter: the reduction is found, not assumed.
  assert.deepEqual(net('SO3', 'MnO4-MnO2', 'basic'), [
    [[2, 'MnO4^-(aq)'], [1, 'H2O(l)'], [3, 'SO3^2-(aq)']],
    [[2, 'MnO2(s)'], [2, 'OH^-(aq)'], [3, 'SO4^2-(aq)']],
    6,
  ]);
  const c = B.combine(sk('Cu'), sk('NO3'), 'acidic');
  assert.equal(c.kRed, 2);
  assert.equal(c.kOx, 3);
});

test('test_balancing_two_reductions_or_two_oxidations_is_refused', () => {
  assert.equal(B.combine(sk('NO3'), sk('Cr2O7'), 'acidic').problem, 'both reductions');
  assert.equal(B.combine(sk('Fe'), sk('Cu'), 'acidic').problem, 'both oxidations');
  // Every mixed pair gives a balanced net equation with no electrons left.
  for (const a of B.skeletons) {
    for (const b of B.skeletons) {
      for (const m of ['acidic', 'basic']) {
        const c = B.combine(a, b, m);
        if (c.problem) continue;
        assert.deepEqual(count(c.net.reactants), count(c.net.products), `${a.id} + ${b.id} ${m}`);
        assert.equal(netCharge(c.net.reactants), netCharge(c.net.products), `${a.id} + ${b.id} ${m}`);
      }
    }
  }
});

test('test_balancing_oxidation_number_rules', () => {
  const on = B.oxidationNumbers;
  assert.equal(on('MnO4^-(aq)').Mn, 7);
  assert.equal(on('Cr2O7^2-(aq)').Cr, 6);
  assert.equal(on('C2O4^2-(aq)').C, 3);
  assert.equal(on('SO3^2-(aq)').S, 4);
  assert.equal(on('H2O2(l)').O, -1); // peroxide
  assert.equal(on('NaH(s)').H, -1); // metal hydride
  assert.equal(on('C2H5OH(aq)').C, -2); // organic C: the average
  assert.equal(on('CH3COOH(aq)').C, 0);
  assert.equal(on('Cu^2+(aq)').Cu, 2);
  assert.equal(on('O2(g)').O, 0);
  assert.equal(on('AgCl(s)').Ag, 1);
});

test('test_balancing_redox_analysis_of_preset_reactions', () => {
  const r = (id) => B.redoxAnalysis(B.reactions.find((x) => x.id === id));
  for (const x of B.reactions) {
    assert.deepEqual(count(x.left), count(x.right), x.id);
    assert.equal(netCharge(x.left), netCharge(x.right), x.id);
  }
  const breath = r('breath');
  assert.deepEqual(breath.oa, ['Cr2O7^2-(aq)']);
  assert.deepEqual(breath.ra, ['C2H5OH(aq)']);
  assert.deepEqual(breath.changes.map((c) => [c.el, c.from, c.to, c.kind]), [['Cr', 6, 3, 'reduced'], ['C', -2, 0, 'oxidized']]);
  // Disproportionation: O in H2O2 (−1) goes both to −2 and to 0.
  const d = r('h2o2');
  assert.deepEqual(d.changes.map((c) => [c.to, c.kind]), [[-2, 'reduced'], [0, 'oxidized']]);
  assert.deepEqual(d.oa, d.ra);
  assert.deepEqual(r('nah').changes.map((c) => [c.el, c.to]), [['Na', 1], ['H', -1]]);
  assert.equal(r('neut').redox, false);
  assert.equal(r('agcl').redox, false);
  assert.equal(r('ch4').redox, true);
});
