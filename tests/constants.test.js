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
