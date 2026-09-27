import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as P from '../site/js/chem/periodic.js';

const Z = (sym) => P.byZ.find((e) => e.symbol === sym).Z;

test('test_periodic_worked_examples', () => {
  // Chlorine: period 3, group 17, 17 − 10 = 7 valence electrons, 17 electrons as 2, 8, 7;
  // Lewis symbol with 3 lone pairs and 1 bonding electron.
  const cl = Z('Cl');
  assert.deepEqual(P.position(cl), { period: 3, group: 17, block: 'p', frow: null });
  assert.equal(P.valence(cl).n, 7);
  assert.equal(P.totalElectrons(cl), 17);
  assert.deepEqual(P.shells(cl), [2, 8, 7]);
  assert.deepEqual(P.lewis(cl), { pairs: 3, single: 1 });
  assert.equal(P.family(cl), 'halogens');

  assert.deepEqual(P.shells(Z('Ca')), [2, 8, 8, 2]);
  assert.deepEqual(P.shells(Z('K')), [2, 8, 8, 1]);
  assert.equal(P.shells(Z('Sc')), null);
  assert.deepEqual(P.lewis(Z('C')), { pairs: 0, single: 4 });
  assert.deepEqual(P.lewis(Z('N')), { pairs: 1, single: 3 });
  assert.deepEqual(P.lewis(Z('Ne')), { pairs: 4, single: 0 });
  assert.equal(P.valence(Z('Pb')).n, 4);
  assert.equal(P.valence(Z('Rn')).n, 8);
});

test('test_periodic_hydrogen_helium_and_unassigned_blocks', () => {
  assert.deepEqual(P.position(1), { period: 1, group: 1, block: 's', frow: null });
  assert.equal(P.family(1), null); // group 1, but not an alkali metal
  assert.deepEqual(P.position(2), { period: 1, group: 18, block: 's', frow: null });
  assert.equal(P.valence(2).n, 2); // group 18, yet 2 valence electrons
  assert.deepEqual(P.lewis(2), { pairs: 1, single: 0 });

  const fe = P.position(Z('Fe'));
  assert.deepEqual(fe, { period: 4, group: 8, block: 'd', frow: null });
  assert.equal(P.valence(Z('Fe')).n, null);
  assert.equal(P.lewis(Z('Fe')), null);

  // La–Lu and Ac–Lr are the two separate rows; the table resumes at Hf / Rf in group 4.
  assert.deepEqual(P.position(57), { period: 6, group: null, block: 'f', frow: 0 });
  assert.deepEqual(P.position(71), { period: 6, group: null, block: 'f', frow: 14 });
  assert.deepEqual(P.position(103), { period: 7, group: null, block: 'f', frow: 14 });
  assert.equal(P.position(72).group, 4);
  assert.equal(P.position(111).group, 11);
});

test('test_periodic_every_element_places_consistently', () => {
  assert.equal(P.byZ.length, 111);
  const cells = new Set();
  P.byZ.forEach((e, i) => {
    assert.equal(e.Z, i + 1, 'atomic numbers run 1–111 without gaps');
    const { period, group, frow } = P.position(e.Z);
    const key = group === null ? `f${period}-${frow}` : `${period}-${group}`;
    assert.ok(!cells.has(key), `${e.symbol} shares a cell`);
    cells.add(key);
    if (e.Z <= P.SHELL_LIMIT_Z) {
      const s = P.shells(e.Z);
      // period = number of occupied energy levels; the outer level holds the valence electrons
      assert.equal(s.length, period, e.symbol);
      assert.equal(s.reduce((a, b) => a + b, 0), e.Z, e.symbol);
      assert.equal(s.at(-1), P.valence(e.Z).n, e.symbol);
    }
    const l = P.lewis(e.Z);
    if (l) assert.equal(2 * l.pairs + l.single, P.valence(e.Z).n, e.symbol);
  });
});
