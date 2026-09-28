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

  // La and Ac are in group 3; Ce–Lu and Th–Lr are the two separate rows, as on
  // the booklet's fold-out; the table resumes at Hf / Rf in group 4.
  assert.deepEqual(P.position(57), { period: 6, group: 3, block: 'd', frow: null });
  assert.deepEqual(P.position(89), { period: 7, group: 3, block: 'd', frow: null });
  assert.deepEqual(P.position(58), { period: 6, group: null, block: 'f', frow: 0 });
  assert.deepEqual(P.position(71), { period: 6, group: null, block: 'f', frow: 13 });
  assert.deepEqual(P.position(103), { period: 7, group: null, block: 'f', frow: 13 });
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

test('test_periodic_ion_charges_booklet_and_group_rule', () => {
  const ch = (sym) => P.ionCharges(Z(sym)).map((c) => `${c.charge}:${c.from}`);
  // The booklet's column, in its printed order.
  assert.deepEqual(ch('Na'), ['1:booklet']);
  assert.deepEqual(ch('Fe'), ['3:booklet', '2:booklet']);
  assert.deepEqual(ch('Pb'), ['2:booklet', '4:booklet']);
  assert.deepEqual(ch('H'), ['1:booklet', '-1:booklet']);
  // The booklet prints "—" for these; the charge is −(8 − valence electrons).
  assert.deepEqual(ch('N'), ['-3:group']);
  assert.deepEqual(ch('O'), ['-2:group']);
  assert.deepEqual(ch('Cl'), ['-1:group']);
  assert.deepEqual(ch('At'), ['-1:group']);
  for (const sym of ['He', 'Ne', 'Ar', 'B', 'C', 'Si']) assert.deepEqual(ch(sym), [], sym);
  assert.match(P.noIonReason(Z('Ne')), /noble gas/);
});

test('test_periodic_ion_electrons_and_noble_gas_count', () => {
  // Mg → Mg²⁺: 12 − 2 = 10 electrons, 2, 8, like neon; Lewis symbol with no dots.
  const mg = P.ion(Z('Mg'), 2);
  assert.deepEqual(mg, { electrons: 10, lost: 2, gained: 0, noble: 'neon', shells: [2, 8] });
  assert.deepEqual(P.ionLewis(Z('Mg'), 2), { pairs: 0, single: 0 });
  // Cl → Cl⁻: 17 + 1 = 18 electrons, 2, 8, 8, like argon; 4 pairs.
  const cl = P.ion(Z('Cl'), -1);
  assert.deepEqual(cl, { electrons: 18, lost: 0, gained: 1, noble: 'argon', shells: [2, 8, 8] });
  assert.deepEqual(P.ionLewis(Z('Cl'), -1), { pairs: 4, single: 0 });
  assert.deepEqual(P.ion(Z('N'), -3).shells, [2, 8]);
  // H⁻ is like helium; H⁺ has no electrons at all.
  assert.equal(P.ion(1, -1).noble, 'helium');
  assert.deepEqual(P.ionLewis(1, -1), { pairs: 1, single: 0 });
  assert.equal(P.ion(1, 1).electrons, 0);
  // Pb²⁺ (80 electrons) has no noble-gas count and no Lewis symbol; Fe³⁺ is not main group.
  assert.equal(P.ion(Z('Pb'), 2).noble, null);
  assert.equal(P.ionLewis(Z('Pb'), 2), null);
  assert.equal(P.ion(Z('Fe'), 3).electrons, 23);
  assert.equal(P.ionLewis(Z('Fe'), 3), null);
  // Every main-group ion the table offers for Z ≤ 20 has a noble-gas count.
  for (const e of P.byZ.slice(0, 20)) {
    for (const { charge } of P.ionCharges(e.Z)) {
      if (e.Z === 1 && charge === 1) continue;
      assert.ok(P.ion(e.Z, charge).noble, `${e.symbol} ${charge}`);
    }
  }
});

test('test_periodic_ion_charges_match_data_sheet', async () => {
  // The code's `ions` and the DATA_SHEET §1.8 column are one transcription, kept in step.
  const { readFileSync } = await import('node:fs');
  const md = readFileSync(new URL('../docs/DATA_SHEET.md', import.meta.url), 'utf8');
  const rows = [...md.matchAll(/^\| (\d+) \| (\w+) \| [a-z]+ \| [\d.()*]+ \| (.+) \|$/gm)];
  assert.equal(rows.length, 111);
  for (const [, z, sym, col] of rows) {
    const printed = col === '—' ? [] : col.split(', ').map((c) => (c.endsWith('+') ? 1 : -1) * parseInt(c, 10));
    assert.deepEqual(P.element(Number(z)).ions ?? [], printed, sym);
  }
});
