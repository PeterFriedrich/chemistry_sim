import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as B from '../site/js/chem/bronsted.js';
import { charge } from './atoms.js';

const near = (a, b, rel = 1e-9) => assert.ok(Math.abs(a - b) <= rel * Math.abs(b), `${a} vs ${b}`);
const mix = (...ids) => B.predict(B.entitiesOf(ids));

test('test_bronsted_every_entity_is_on_the_table_or_a_spectator', () => {
  for (const s of B.solutions) {
    for (const e of s.entities) {
      const r = B.roles(e);
      if (e === 'Na^+(aq)') assert.ok(!r.acid && !r.base, 'Na+ is a spectator');
      else assert.ok(r.acid || r.base, `${e} (${s.id}) is on no row of the acid table`);
    }
    // The solution is neutral overall once each ion is counted with its formula-unit multiple.
    const counts = { Na2CO3: { 'Na^+(aq)': 2 }, Na3PO4: { 'Na^+(aq)': 3 } }[s.id] ?? {};
    const total = s.entities.reduce((q, e) => q + (counts[e] ?? 1) * charge(e), 0);
    if (!s.entities.includes('H3O^+(aq)')) assert.equal(total, 0, `${s.id} entities are not neutral`);
  }
});

test('test_bronsted_acetic_acid_and_hydrogen_carbonate_worked_example', () => {
  // CH3COOH + HCO3− ⇌ CH3COO− + H2CO3: SA 1.8 × 10⁻⁵ above H2CO3 4.5 × 10⁻⁷, products favoured, Keq = 40.
  const p = mix('CH3COOH', 'NaHCO3');
  assert.equal(p.sa.species, 'CH3COOH(aq)');
  assert.equal(p.sb.species, 'HCO3^-(aq)');
  assert.deepEqual(p.reactants, [[1, 'CH3COOH(aq)'], [1, 'HCO3^-(aq)']]);
  assert.deepEqual(p.products, [[1, 'CH3COO^-(aq)'], [1, 'H2CO3(aq)']]);
  assert.equal(p.favoured, 'products');
  near(p.Keq, 40);
});

test('test_bronsted_ammonium_and_fluoride_worked_example', () => {
  // NH4+ (5.6 × 10⁻¹⁰) below HF (6.3 × 10⁻⁴): reactants favoured, Keq = 8.9 × 10⁻⁷.
  const p = mix('NH4Cl', 'NaF');
  assert.equal(p.sa.species, 'NH4^+(aq)');
  assert.equal(p.sb.species, 'F^-(aq)');
  assert.deepEqual(p.products, [[1, 'NH3(aq)'], [1, 'HF(aq)']]);
  assert.equal(p.favoured, 'reactants');
  assert.equal(p.Keq.toPrecision(2), '8.9e-7');
});

test('test_bronsted_strong_acid_is_levelled_to_hydronium', () => {
  // HCl(aq) + NH3(aq): the SA is H3O+ (Ka 1), not HCl; Cl− is a base too weak to matter.
  const p = mix('HCl', 'NH3');
  assert.equal(p.sa.species, 'H3O^+(aq)');
  assert.equal(p.sb.species, 'NH3(aq)');
  assert.deepEqual(p.products, [[1, 'H2O(l)'], [1, 'NH4^+(aq)']]);
  assert.equal(p.favoured, 'products');
  // H3O+ + OH− ⇌ 2 H2O, Keq = 1 / 1.0 × 10⁻¹⁴.
  const n = mix('HCl', 'NaOH');
  assert.deepEqual(n.products, [[2, 'H2O(l)']]);
  near(n.Keq, 1e14);
});

test('test_bronsted_amphiprotic_entity_can_be_both_sa_and_sb', () => {
  // NaHCO3 alone: HCO3− is the SA (4.7 × 10⁻¹¹ beats water) and the SB (H2CO3 is below H3O+).
  const p = mix('NaHCO3');
  assert.deepEqual(p.reactants, [[2, 'HCO3^-(aq)']]);
  assert.deepEqual(p.products, [[1, 'CO3^2-(aq)'], [1, 'H2CO3(aq)']]);
  assert.equal(p.favoured, 'reactants');
  // Water is the SB when nothing weaker than H3O+'s conjugate is present: HF + H2O.
  const w = mix('HF');
  assert.equal(w.sb.species, 'H2O(l)');
  assert.deepEqual(w.products, [[1, 'F^-(aq)'], [1, 'H3O^+(aq)']]);
  assert.equal(w.favoured, 'reactants');
});

test('test_bronsted_conjugate_pair_alone_gives_no_net_reaction', () => {
  // HCl alone: SA H3O+, SB H2O — the same row, so nothing changes.
  assert.equal(mix('HCl').favoured, 'none');
  assert.equal(mix('NaOH').favoured, 'none');
});
