import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as S from '../site/js/chem/spontaneity.js';
import { halfReactions } from '../site/js/chem/redox-data.js';
import { count, netCharge } from './atoms.js';

const near = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} vs ${b}`);
const mix = (...ids) => S.predict(S.entitiesOf(ids));
const agent = (side) => side.map(([, s]) => s).join(' + ');

test('test_spontaneity_every_entity_is_on_the_redox_table', () => {
  const onTable = new Set(halfReactions.flatMap((h) => [...h.ox, ...h.red].map(([, s]) => s)));
  for (const r of S.reagents) for (const e of r.entities) assert.ok(onTable.has(e), `${e} (${r.id}) is on no row of the redox table`);
  // Sulfuric acid is not offered: with it the table's SOA is SO4²⁻/H⁺, not H⁺ (owner, SPEC_phase2 §4 (b)).
  for (const r of S.reagents) assert.ok(!(r.entities.includes('H^+(aq)') && r.entities.includes('SO4^2-(aq)')), r.id);
});

test('test_spontaneity_worked_examples', () => {
  // SPEC_phase2 §4: [reagents, SOA, SRA, E°net, net equation]
  const cases = [
    [['Cu', 'AgNO3'], 'Ag^+(aq)', 'Cu(s)', 0.46, [[[2, 'Ag^+(aq)'], [1, 'Cu(s)']], [[2, 'Ag(s)'], [1, 'Cu^2+(aq)']]]],
    [['Cu', 'ZnSO4'], 'Zn^2+(aq)', 'Cu(s)', -1.1, [[[1, 'Zn^2+(aq)'], [1, 'Cu(s)']], [[1, 'Zn(s)'], [1, 'Cu^2+(aq)']]]],
    [['Zn', 'HCl'], 'H^+(aq)', 'Zn(s)', 0.76, [[[2, 'H^+(aq)'], [1, 'Zn(s)']], [[1, 'H2(g)'], [1, 'Zn^2+(aq)']]]],
    [['Cu', 'HCl'], 'H^+(aq)', 'Cu(s)', -0.34, null],
    [['Cu', 'HNO3'], 'NO3^-(aq) + H^+(aq)', 'Cu(s)', 0.46, [[[2, 'NO3^-(aq)'], [4, 'H^+(aq)'], [1, 'Cu(s)']], [[1, 'N2O4(g)'], [2, 'H2O(l)'], [1, 'Cu^2+(aq)']]]],
    [['KMnO4', 'FeSO4'], 'MnO4^-(aq) + H^+(aq)', 'Fe^2+(aq)', 0.74, [[[1, 'MnO4^-(aq)'], [8, 'H^+(aq)'], [5, 'Fe^2+(aq)']], [[1, 'Mn^2+(aq)'], [4, 'H2O(l)'], [5, 'Fe^3+(aq)']]]],
    [['Cl2', 'KI'], 'Cl2(g)', 'I^-(aq)', 0.82, [[[1, 'Cl2(g)'], [2, 'I^-(aq)']], [[2, 'Cl^-(aq)'], [1, 'I2(s)']]]],
  ];
  for (const [ids, soa, sra, E, eq] of cases) {
    const p = mix(...ids);
    assert.equal(agent(p.soa.ox), soa, ids.join(' + '));
    assert.equal(agent(p.sra.red), sra, ids.join(' + '));
    near(p.E, E, 1e-9);
    assert.equal(p.spontaneous, E > 0);
    if (eq) assert.deepEqual([p.net.reactants, p.net.products], eq, ids.join(' + '));
    // Atoms and charge balance in every net equation.
    assert.deepEqual(count(p.net.reactants), count(p.net.products));
    assert.equal(netCharge(p.net.reactants), netCharge(p.net.products));
  }
});

test('test_spontaneity_ties_go_by_booklet_row_order_and_zero_is_not_spontaneous', () => {
  // Ag⁺ and NO₃⁻/H⁺ are both +0.80 V; NO₃⁻/H⁺ is printed above Ag⁺, so it is the SOA.
  assert.equal(agent(mix('AgNO3', 'HNO3').soa.ox), 'NO3^-(aq) + H^+(aq)');
  // Acidified dichromate alone: SOA Cr₂O₇²⁻ +1.23, SRA H₂O +1.23, E°net = 0.
  const p = mix('K2Cr2O7');
  near(p.E, 0);
  assert.equal(p.spontaneous, false);
});

test('test_spontaneity_water_as_soa_or_sra_is_flagged', () => {
  // The table says acidified MnO₄⁻ oxidizes water (+1.51 − 1.23) and Mg reduces it (−0.83 + 2.37).
  const mn = mix('KMnO4');
  near(mn.E, 0.28);
  assert.ok(mn.spontaneous && mn.water);
  const mg = mix('Mg');
  near(mg.E, 1.54);
  assert.ok(mg.spontaneous && mg.water);
  assert.deepEqual(mg.net.products, [[1, 'H2(g)'], [2, 'OH^-(aq)'], [1, 'Mg^2+(aq)']]);
  // Zn in water is not spontaneous (−0.83 − (−0.76)); Cu + AgNO₃ has no water agent.
  assert.equal(mix('Zn').spontaneous, false);
  assert.equal(mix('Cu', 'AgNO3').water, false);
});

test('test_spontaneity_metal_in_its_own_ion_is_no_net_reaction', () => {
  const p = mix('Cu', 'CuSO4');
  assert.equal(p.soa, p.sra);
  assert.equal(p.net, null);
  assert.equal(p.spontaneous, false);
});

test('test_spontaneity_declines_precipitating_mixtures', () => {
  assert.deepEqual(S.precipitate(S.entitiesOf(['AgNO3', 'NaCl'])), ['Ag^+(aq)', 'Cl^-(aq)']);
  assert.deepEqual(S.precipitate(S.entitiesOf(['Pb(NO3)2', 'CuSO4'])), ['Pb^2+(aq)', 'SO4^2-(aq)']);
  assert.equal(S.precipitate(S.entitiesOf(['Cu', 'AgNO3'])), null);
  assert.equal(S.precipitate(S.entitiesOf(['KMnO4', 'FeSO4'])), null);
});
