import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../site/js/chem/constants.js';

test('test_constants_match_alberta_data_booklet', () => {
  // Deliberately the rounded Data Booklet values (docs/DATA_SHEET.md §1), not CODATA.
  assert.deepEqual(C.specificHeat, {
    water: 4.19,
    air: 1.01,
    polystyreneCup: 1.01,
    copper: 0.385,
    aluminium: 0.897,
    iron: 0.449,
    tin: 0.227,
  });
  assert.equal(C.Kw, 1.0e-14);
  assert.equal(C.F, 9.65e4);
  assert.equal(C.KELVIN_OFFSET, 273.15);
});

test('test_water_density_is_the_textbook_assumption', () => {
  // Not in the Data Booklet; 1 mL of water is taken as 1.00 g (docs/DECISIONS.md).
  assert.equal(C.WATER_DENSITY, 1.0);
});

test('test_gas_constants_match_2003_booklet', () => {
  // Not in the current booklet; from the 2003 booklet, p. 3 (docs/DATA_SHEET.md §2).
  assert.equal(C.R, 8.314);
  assert.deepEqual(C.STP, { T: 273.15, P: 101.325 });
  assert.deepEqual(C.SATP, { T: 298.15, P: 100.0 });
  // Molar volumes are derived, V = RT/P, and must give the textbook values.
  assert.equal(((C.R * C.STP.T) / C.STP.P).toFixed(1), '22.4');
  assert.equal(((C.R * C.SATP.T) / C.SATP.P).toFixed(1), '24.8');
});
