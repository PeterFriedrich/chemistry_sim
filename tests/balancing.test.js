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

test('test_balancing_assign_single_species_owner_examples', () => {
  // The owner's starter list: H2O, [NO3]-, H2SO4, S8, [CO3]2-.
  const a = (s) => B.assignSteps(s);
  assert.deepEqual(a('H2O').numbers, { H: 1, O: -2 });
  assert.deepEqual(a('NO3^-').numbers, { N: 5, O: -2 });
  assert.deepEqual(a('H2SO4').numbers, { H: 1, S: 6, O: -2 });
  assert.deepEqual(a('S8').numbers, { S: 0 });
  assert.deepEqual(a('CO3^2-').numbers, { C: 4, O: -2 });
  // H2SO4 step by step: H by rule, O by rule, S from 1·x + 2(+1) + 4(−2) = 0.
  const st = a('H2SO4').steps;
  assert.deepEqual(st.map((x) => [x.el, x.rule]), [['H', 'H is +1'], ['O', 'O is −2'], ['S', 'the sum equals the charge']]);
  assert.deepEqual(st[2].sum, { charge: 0, known: [[2, 'H', 1], [4, 'O', -2]], count: 1, num: 6, den: 1 });
  // The priority order gives most exceptions; complex hydrides need the explicit H rule.
  assert.equal(a('NaH').numbers.H, -1);
  assert.equal(a('H2O2').numbers.O, -1);
  assert.equal(a('OF2').numbers.O, 2);
  assert.equal(a('NH4^+').numbers.N, -3);
  assert.deepEqual(a('K2Cr2O7').numbers, { K: 1, Cr: 6, O: -2 });
});

test('test_balancing_assign_fractions_and_compounds_that_need_splitting', () => {
  const fe = B.assignSteps('Fe3O4').steps.at(-1).sum;
  assert.deepEqual([fe.num, fe.den], [8, 3]);
  const cu = B.assignSteps('CuSO4');
  assert.equal(cu.numbers, null);
  assert.deepEqual(cu.problem, ['Cu', 'S']);
});

test('test_balancing_parse_species_notations', async () => {
  const { elements } = await import('../site/js/chem/elements-data.js');
  const p = (x) => B.parseSpecies(x, elements).species;
  for (const x of ['[CO3]2-', 'CO3^2-', 'CO3 2-', 'CO₃²⁻']) assert.equal(p(x), 'CO3^2-', x);
  for (const x of ['NO3-', 'NO3^-', '[NO3]-']) assert.equal(p(x), 'NO3^-', x);
  assert.equal(p('H2SO4'), 'H2SO4');
  assert.equal(p('Fe3+'), 'Fe^3+');
  assert.equal(p('S2-'), 'S^2-');
  assert.equal(p('Ca(OH)2(s)'), 'Ca(OH)2');
  assert.match(B.parseSpecies('Xy2', elements).error, /not an element/);
  assert.match(B.parseSpecies('H2(SO4', elements).error, /brackets/);
  assert.match(B.parseSpecies('h2o', elements).error, /not a formula/);
});

test('test_balancing_oxidation_number_algebra_lines', () => {
  const lines = (sp) => B.algebra(B.assignSteps(sp).steps.at(-1), Object.keys(B.atomsOf(sp))).map((l) => l.eq);
  assert.deepEqual(lines('H2SO4'), ['let x = the oxidation number of S', '2(+1) + x + 4(−2) = 0', '2 + x − 8 = 0', 'x − 6 = 0', 'x = +6']);
  assert.deepEqual(lines('NO3^-'), ['let x = the oxidation number of N', 'x + 3(−2) = −1', 'x − 6 = −1', 'x = −1 + 6', 'x = +5']);
  assert.deepEqual(lines('K2Cr2O7'), ['let x = the oxidation number of Cr', '2(+1) + 2x + 7(−2) = 0', '2 + 2x − 14 = 0', '2x − 12 = 0', '2x = +12', 'x = +6']);
  assert.deepEqual(lines('Fe3O4'), ['let x = the oxidation number of Fe', '3x + 4(−2) = 0', '3x − 8 = 0', '3x = +8', 'x = +8/3']);
  assert.deepEqual(lines('S8'), ['let x = the oxidation number of S', '8x = 0', 'x = 0']);
  // The last line always states the value assignSteps found.
  for (const sp of ['H2O', 'CO3^2-', 'NH4^+', 'NaH', 'H2O2', 'OF2', 'C2H5OH', 'MnO4^-', 'Fe^3+']) {
    const st = B.assignSteps(sp).steps.at(-1);
    assert.equal(lines(sp).at(-1), `x = ${st.value === 0 ? '0' : `${st.value > 0 ? '+' : '−'}${Math.abs(st.value)}`}`, sp);
  }
});

test('test_balancing_by_oxidation_numbers_worked_examples', () => {
  const on = (a, b, m) => B.balanceByOxidationNumbers(sk(a), sk(b), m);
  // MnO4− + Fe2+: Mn +7 → +2 gains 5, Fe +2 → +3 loses 1; ×1 and ×5.
  const mf = on('MnO4-Mn', 'Fe', 'acidic');
  assert.deepEqual([mf.red.from, mf.red.to, mf.red.e, mf.ox.e, mf.kRed, mf.kOx], [7, 2, 5, 1, 1, 5]);
  assert.deepEqual([mf.final.left, mf.final.right], [
    [[1, 'MnO4^-(aq)'], [5, 'Fe^2+(aq)'], [8, 'H^+(aq)']],
    [[1, 'Mn^2+(aq)'], [5, 'Fe^3+(aq)'], [4, 'H2O(l)']],
  ]);
  // Cr2O7²⁻: 2 Cr × 3 = 6 e⁻; C2H5OH: 2 C × 2 = 4 e⁻.
  const br = on('C2H5OH', 'Cr2O7', 'acidic');
  assert.deepEqual([br.red.e, br.ox.e, br.kRed, br.kOx], [6, 4, 2, 3]);
  // Zn + NO3− → Zn2+ + NH4+: N +5 → −3 gains 8; 4 Zn + NO3− + 10 H+ → 4 Zn2+ + NH4+ + 3 H2O.
  const zn = on('Zn', 'NO3-NH4', 'acidic');
  assert.deepEqual([zn.final.left, zn.final.right], [
    [[1, 'NO3^-(aq)'], [4, 'Zn(s)'], [10, 'H^+(aq)']],
    [[1, 'NH4^+(aq)'], [4, 'Zn^2+(aq)'], [3, 'H2O(l)']],
  ]);
  // I− → I2: two I atoms each lose 1.
  assert.equal(on('ClO3', 'I', 'acidic').ox.e, 2);
  assert.equal(on('NO3', 'Cr2O7', 'acidic').problem, 'both reduced');
});

test('test_balancing_oxidation_number_method_matches_half_reaction_method', () => {
  const bag = (list) => Object.fromEntries(list.map(([n, s]) => [s, n]));
  for (const a of B.skeletons) {
    for (const b of B.skeletons) {
      for (const m of ['acidic', 'basic']) {
        const o = B.balanceByOxidationNumbers(a, b, m);
        const c = B.combine(a, b, m);
        assert.equal(!!o.problem, !!c.problem, `${a.id} + ${b.id}`);
        if (o.problem) continue;
        assert.ok(B.tally(o.final).balanced, `${a.id} + ${b.id} ${m}`);
        assert.equal(o.electrons, c.net.electrons, `${a.id} + ${b.id} ${m}`);
        assert.deepEqual(bag(o.final.left), bag(c.net.reactants), `${a.id} + ${b.id} ${m}`);
        assert.deepEqual(bag(o.final.right), bag(c.net.products), `${a.id} + ${b.id} ${m}`);
      }
    }
  }
});

test('test_balancing_each_step_names_its_chem30_rule', () => {
  const ids = (sp) => B.assignSteps(sp).steps.map((st) => [st.el, st.id, st.also ?? null]);
  const known = new Set(B.RULES.map((r) => r.id));
  for (const sp of ['H2SO4', 'S8', 'Fe^3+', 'NaH', 'H2O2', 'OF2', 'CaCO3', 'NaCl', 'ClO3^-', 'O2^2-']) {
    for (const [, id] of ids(sp)) assert.ok(known.has(id), `${sp}: ${id}`);
  }
  assert.deepEqual(ids('H2SO4'), [['H', 'H', null], ['O', 'O', null], ['S', 'sum', null]]);
  assert.deepEqual(ids('S8'), [['S', 'element', null]]);
  assert.deepEqual(ids('Fe^3+'), [['Fe', 'monatomic', null]]);
  assert.deepEqual(ids('NaH'), [['Na', 'group1', null], ['H', 'sum', 'H']]); // the hydride exception
  assert.deepEqual(ids('H2O2'), [['H', 'H', null], ['O', 'sum', 'O']]); // the peroxide exception
  assert.deepEqual(ids('CaCO3'), [['Ca', 'group2', null], ['O', 'O', null], ['C', 'sum', null]]);
});

test('test_balancing_typed_skeleton_equation_by_oxidation_numbers', async () => {
  const { elements } = await import('../site/js/chem/elements-data.js');
  const bag = (list) => Object.fromEntries(list.map(([n, s]) => [s, n]));
  const solve = (x, m = 'acidic') => {
    const e = B.parseEquation(x, elements);
    if (e.error) return e;
    const p = B.pairHalves(e.left, e.right);
    if (p.error) return p;
    const r = B.balanceByOxidationNumbers(p.pairs[0], p.pairs[1], m);
    assert.ok(B.tally(r.final).balanced, x);
    return [bag(r.final.left), bag(r.final.right)];
  };
  // The owner's example: Br +5 → −1 gains 6; 2 I⁻ → I₂ loses 2; ×1 and ×3.
  assert.deepEqual(solve('BrO3- + I- -> Br- + I2'), [{ 'BrO3^-': 1, 'I^-': 6, 'H^+(aq)': 6 }, { 'Br^-': 1, I2: 3, 'H2O(l)': 3 }]);
  // Typed H+ and H2O are dropped or merged; H2O2 pairs with O2 before H2O.
  assert.deepEqual(solve('MnO4- + H2O2 + H+ -> Mn2+ + O2 + H2O'), [{ 'MnO4^-': 2, H2O2: 5, 'H^+(aq)': 6 }, { 'Mn^2+': 2, O2: 5, 'H2O(l)': 8 }]);
  assert.deepEqual(solve('2 I- + H2O2 + 2 H+ -> I2 + 2 H2O'), [{ H2O2: 1, 'I^-': 2, 'H^+(aq)': 2 }, { 'H2O(l)': 2, I2: 1 }]);
  assert.deepEqual(solve('MnO4- + SO3 2- -> MnO2 + SO4 2-', 'basic'), [{ 'MnO4^-': 2, 'SO3^2-': 3, 'H2O(l)': 1 }, { MnO2: 2, 'SO4^2-': 3, 'OH^-(aq)': 2 }]);
  // The owner's example as typed: 2 MnO4− + 5 C2O4²⁻ + 16 H+ → 2 Mn2+ + 10 CO2 + 8 H2O.
  assert.deepEqual(solve('[MnO4]- + [C2O4]2- -> CO2 + Mn 2+'), [{ 'MnO4^-': 2, 'C2O4^2-': 5, 'H^+(aq)': 16 }, { CO2: 10, 'Mn^2+': 2, 'H2O(l)': 8 }]);
  // With CO instead of CO2, C goes +3 → +2: both are reduced, so it is refused.
  const co = B.parseEquation('[MnO4]- + [C2O4]2- -> CO + Mn 2+', elements);
  const cp = B.pairHalves(co.left, co.right);
  assert.equal(B.balanceByOxidationNumbers(cp.pairs[0], cp.pairs[1], 'acidic').problem, 'both reduced');
  // Basic, with hydroxides in the skeleton.
  assert.deepEqual(solve('CrO4 2- + Fe(OH)2 -> Cr(OH)3 + Fe(OH)3', 'basic'), [{ 'CrO4^2-': 1, 'Fe(OH)2': 3, 'H2O(l)': 4 }, { 'Cr(OH)3': 1, 'Fe(OH)3': 3, 'OH^-(aq)': 2 }]);
  assert.match(solve('Ag+ + Cl- -> AgCl').error, /not a redox reaction/);
  assert.match(solve('K+ + MnO4- + Fe2+ -> Mn2+ + Fe3+').error, /spectator/);
  assert.match(solve('Cl2 -> Cl- + ClO3-').error, /disproportionation/);
  assert.match(solve('BrO3- + I-').error, /arrow/);
});

test('test_balancing_audit_fixes_hydrides_ambiguous_charges_unfixable_species_fractions', async () => {
  const { elements } = await import('../site/js/chem/elements-data.js');
  // Complex metal hydrides: H −1, so Al and B are +3.
  assert.deepEqual(B.assignSteps('LiAlH4').numbers, { Li: 1, Al: 3, H: -1 });
  assert.deepEqual(B.assignSteps('NaBH4').numbers, { Na: 1, B: 3, H: -1 });
  assert.deepEqual(B.assignSteps('CaH2').numbers, { Ca: 2, H: -1 });
  assert.deepEqual(B.assignSteps('KHCO3').numbers, { K: 1, H: 1, C: 4, O: -2 });
  // Two digits straight into a sign are ambiguous; one digit is not.
  for (const x of ['SO42-', 'CO32-', 'Cr2O72-', 'PO43-']) assert.match(B.parseSpecies(x, elements).error, /ambiguous/, x);
  for (const [x, sp] of [['NO3-', 'NO3^-'], ['Fe3+', 'Fe^3+'], ['SO4 2-', 'SO4^2-'], ['[SO4]2-', 'SO4^2-'], ['C6H12O6', 'C6H12O6']]) assert.equal(B.parseSpecies(x, elements).species, sp, x);
  // A molecular equation with a compound no rule fixes is refused, not thrown.
  const mol = B.parseEquation('Cu + HNO3 -> Cu(NO3)2 + NO + H2O', elements);
  assert.match(B.pairHalves(mol.left, mol.right).error, /net ionic/);
  // Fe3O4 (+8/3): integer electrons and small coefficients.
  const fe = B.parseEquation('Fe3O4 + MnO4- -> Fe3+ + Mn2+', elements);
  const p = B.pairHalves(fe.left, fe.right);
  const r = B.balanceByOxidationNumbers(p.pairs[0], p.pairs[1], 'acidic');
  assert.deepEqual([r.ox.e, r.ox.per, r.ox.fromFrac, r.electrons, r.kRed, r.kOx], [1, { num: 1, den: 3 }, { num: 8, den: 3 }, 5, 1, 5]);
  assert.ok(B.tally(r.final).balanced);
  assert.ok([...r.final.left, ...r.final.right].every(([n]) => Number.isInteger(n) && n < 100));
});
