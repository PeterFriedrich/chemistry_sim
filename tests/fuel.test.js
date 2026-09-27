import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as F from '../site/js/chem/fuel.js';
import { count } from './atoms.js';
import { withWater } from '../site/js/chem/hess.js';
import { molarMass } from '../site/js/chem/electrolysis.js';

const fuel = (id) => F.fuels.find((f) => f.id === id);

test('test_fuel_combustion_equations_balance', () => {
  for (const f of F.fuels) {
    for (const w of ['l', 'g']) {
      const rx = withWater(f.reaction, w);
      assert.deepEqual(count(rx.reactants), count(rx.products), `${f.id} ${w}`);
    }
  }
});

test('test_fuel_ethanol_worked_example', () => {
  // SPEC_phase2 §2: ethanol, 1.00 g, 200 g water at 20.0 °C, open can (40 %), H2O(g).
  // ΔcH° = 2(−393.5) + 3(−241.8) − (−277.6) = −1234.8 kJ/mol; n = 1.00/46.08 = 0.02170 mol;
  // heat to water 0.40 × 0.02170 × 1234.8 = 10.72 kJ → Δt = 12.79, read as 32.8 °C.
  const e = fuel('ethanol');
  assert.equal(F.theoretical(e, 'g').toFixed(1), '-1234.8');
  assert.equal(F.theoretical(e, 'l').toFixed(1), '-1366.8');
  const tf = F.finalReading(e, 'g', 1.0, 200, 20.0, F.apparatus.open.efficiency);
  assert.equal(tf, 32.8);
  const r = F.analyse(e, 'g', 1.0, 200, 20.0, tf);
  // Q = 200 × 4.19 × 12.8 = 10 726 J.
  assert.equal(r.Q.toPrecision(3), '10.7');
  assert.equal(r.experimental.toPrecision(3), '-494');
  assert.equal((r.efficiency * 100).toPrecision(3), '40.0');
});

test('test_fuel_efficiency_recovers_the_apparatus_value', () => {
  // Only the 0.1 °C thermometer reading separates the readout from the set efficiency.
  for (const f of F.fuels) {
    for (const [key, a] of Object.entries(F.apparatus)) {
      const tf = F.finalReading(f, 'g', 1.5, 300, 18.0, a.efficiency);
      const r = F.analyse(f, 'g', 1.5, 300, 18.0, tf);
      const slack = (0.05 / r.dt) * a.efficiency;
      assert.ok(Math.abs(r.efficiency - a.efficiency) <= slack + 1e-12, `${f.id} ${key}`);
    }
  }
});

test('test_fuel_given_values_bbq_knife_example', () => {
  // Propane ΔcH −2043.9 kJ/mol (booklet, H2O(g)); 1.00 g burns to warm a 400 g knife (c = 0.503) by 30.0 °C.
  // M = 3(12.01) + 8(1.01) = 44.11 g/mol; released = (1.00/44.11)(2043.9) = 46.3 kJ;
  // gained = 400(0.503)(30.0) = 6036 J = 6.04 kJ; efficiency = 13.0 %.
  const propane = fuel('propane');
  assert.equal(F.theoretical(propane, 'g').toFixed(1), '-2043.9');
  const M = molarMass(propane.formula);
  assert.equal(M.toFixed(2), '44.11');
  const q = { mFuel: 1.0, M, dcH: -2043.9, mObj: 400, c: 0.503, dt: 30.0 };
  const r = F.efficiencyGiven(q);
  assert.equal(r.released.toPrecision(3), '46.3');
  assert.equal(r.gained.toPrecision(3), '6.04');
  assert.equal((r.efficiency * 100).toPrecision(3), '13.0');
  // The two backwards forms invert it.
  const back = F.fuelNeeded({ ...q, efficiency: r.efficiency });
  assert.ok(Math.abs(back.mFuel - 1.0) < 1e-12);
  const rise = F.tempRise({ ...q, efficiency: r.efficiency });
  assert.ok(Math.abs(rise.dt - 30.0) < 1e-9);
});
