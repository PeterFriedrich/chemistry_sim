import { test } from 'node:test';
import assert from 'node:assert/strict';
import { heat, finalTemperature, temperaturesAt } from '../site/js/chem/calorimetry.js';
import { specificHeat } from '../site/js/chem/constants.js';

const near = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} vs ${b}`);

test('test_calorimetry_heat_worked_example', () => {
  // 100.0 g of water warmed 20.0 °C → 25.0 °C: Q = (100.0)(4.19)(5.0) = 2095 J = 2.10 kJ.
  near(heat(100.0, specificHeat.water, 5.0), 2095);
});

test('test_calorimetry_final_temperature_worked_example', () => {
  // 50.0 g copper at 100.0 °C into 200.0 g water at 20.0 °C.
  // tf = (50·0.385·100 + 200·4.19·20) / (50·0.385 + 200·4.19) = 18685 / 857.25 = 21.80 °C.
  const tf = finalTemperature(50.0, specificHeat.copper, 100.0, 200.0, specificHeat.water, 20.0);
  near(tf, 18685 / 857.25);
  assert.equal(tf.toFixed(2), '21.80');
});

test('test_calorimetry_heat_lost_equals_heat_gained', () => {
  const [m1, c1, t1, m2, c2, t2] = [80, specificHeat.aluminium, 95, 150, specificHeat.water, 18];
  const tf = finalTemperature(m1, c1, t1, m2, c2, t2);
  near(heat(m1, c1, tf - t1) + heat(m2, c2, tf - t2), 0, 1e-9);
  for (const s of [0, 0.3, 1, 4]) {
    const [a, b] = temperaturesAt(m1, c1, t1, m2, c2, t2, s);
    near(heat(m1, c1, a - t1) + heat(m2, c2, b - t2), 0, 1e-9);
  }
});

test('test_calorimetry_equal_start_temperatures_give_zero_change', () => {
  // 10 g Cu and 63 g water both at 30.0 °C: the weighted mean alone is 30 − 3.55 × 10⁻¹⁵.
  for (const metal of ['copper', 'aluminium', 'iron', 'tin']) {
    for (const [mm, mw] of [[10, 63], [10, 102], [200, 400]]) {
      const tf = finalTemperature(mm, specificHeat[metal], 30, mw, specificHeat.water, 30);
      assert.equal(tf - 30, 0);
      assert.equal(heat(mm, specificHeat[metal], tf - 30), 0);
      assert.equal(heat(mw, specificHeat.water, tf - 30), 0);
    }
  }
});
