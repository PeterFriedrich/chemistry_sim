import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as A from '../site/js/chem/activation.js';
import { reactions, reactionEnthalpy } from '../site/js/chem/hess.js';

test('test_activation_haber_worked_example', () => {
  // N2 + 3 H2 → 2 NH3: ΔH = 2(−45.9) = −91.8 kJ; Ea(forward) 230 kJ → Ea(reverse) = 230 − (−91.8) = 321.8 kJ.
  const dH = reactionEnthalpy(reactions.find((r) => r.id === 'haber')).dH;
  assert.equal(dH.toFixed(1), '-91.8');
  assert.equal(A.barrier(dH, 230).EaR.toFixed(1), '321.8');
});

test('test_activation_catalyst_lowers_both_barriers_equally', () => {
  for (const [dH, EaF, EaCat] of [[-91.8, 230, 150], [179.2, 400, 250.5]]) {
    const u = A.barrier(dH, EaF);
    const c = A.barrier(dH, EaCat);
    assert.ok(Math.abs((u.EaF - c.EaF) - (u.EaR - c.EaR)) < 1e-9);
    assert.ok(Math.abs((u.EaF - u.EaR) - (c.EaF - c.EaR)) < 1e-9); // ΔH unchanged
  }
});

test('test_activation_rejects_a_peak_below_reactants_or_products', () => {
  assert.equal(A.problem(-91.8, 230), null);
  assert.match(A.problem(179.2, 150), /greater than ΔH/);
  assert.match(A.problem(-50, 0), /greater than 0/);
  assert.equal(A.catalystProblem(-91.8, 230, 150), null);
  assert.match(A.catalystProblem(-91.8, 230, 260), /smaller/);
  assert.match(A.catalystProblem(179.2, 400, 100), /greater than ΔH/);
});
