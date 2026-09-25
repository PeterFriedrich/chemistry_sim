import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as O from '../site/js/chem/organic.js';

const sub = (type, pos) => ({ type, pos });
const nameOf = (n, subs = [], bond) => {
  const mol = O.build({ n, subs, bond });
  return mol.error ?? O.name(mol).name ?? O.name(mol).error;
};
const dbl = (pos) => ({ order: 2, pos });
const tpl = (pos) => ({ order: 3, pos });

test('test_organic_alkane_names', () => {
  assert.equal(nameOf(1), 'methane');
  assert.equal(nameOf(4), 'butane');
  assert.equal(nameOf(10), 'decane');
  assert.equal(nameOf(5, [sub('methyl', 2)]), '2-methylpentane');
  assert.equal(nameOf(5, [sub('methyl', 4)]), '2-methylpentane'); // renumbered from the other end
  assert.equal(nameOf(3, [sub('methyl', 2), sub('methyl', 2)]), '2,2-dimethylpropane');
  assert.equal(nameOf(6, [sub('ethyl', 3), sub('methyl', 2)]), '3-ethyl-2-methylhexane');
});

test('test_organic_parent_chain_is_not_always_the_chain_drawn', () => {
  // An ethyl on C2 of pentane makes a 6-carbon chain: 3-methylhexane.
  assert.equal(nameOf(5, [sub('ethyl', 2)]), '3-methylhexane');
  // A methyl on C1 just lengthens the chain.
  assert.equal(nameOf(4, [sub('methyl', 1)]), 'pentane');
  assert.equal(nameOf(1, [sub('methyl', 1)]), 'ethane');
  // Equal 5-carbon chains: the one with more substituents is the parent.
  assert.equal(nameOf(5, [sub('ethyl', 3), sub('methyl', 2)]), '3-ethyl-2-methylpentane');
  const mol = O.build({ n: 5, subs: [sub('ethyl', 2)] });
  assert.equal(O.name(mol).chain.p.length, 6);
});

test('test_organic_alkene_and_alkyne_names', () => {
  assert.equal(nameOf(2, [], dbl(1)), 'ethene');
  assert.equal(nameOf(2, [], tpl(1)), 'ethyne');
  assert.equal(nameOf(3, [], dbl(2)), 'propene');
  assert.equal(nameOf(4, [], dbl(2)), 'but-2-ene');
  assert.equal(nameOf(4, [], dbl(3)), 'but-1-ene');
  assert.equal(nameOf(5, [sub('methyl', 4)], tpl(2)), '4-methylpent-2-yne');
  assert.equal(nameOf(3, [sub('methyl', 2)], dbl(1)), '2-methylpropene');
  // The parent must hold the double bond, then be longest: pent-1-ene, not a butene.
  assert.equal(nameOf(4, [sub('propyl', 2)], dbl(1)), '2-ethylpent-1-ene');
});

test('test_organic_alcohol_names', () => {
  assert.equal(nameOf(1, [sub('OH', 1)]), 'methanol');
  assert.equal(nameOf(2, [sub('OH', 2)]), 'ethanol');
  assert.equal(nameOf(3, [sub('OH', 3)]), 'propan-1-ol');
  assert.equal(nameOf(3, [sub('OH', 2)]), 'propan-2-ol');
  assert.equal(nameOf(3, [sub('OH', 2), sub('methyl', 2)]), '2-methylpropan-2-ol');
  // –OH outranks the double bond for the lowest locant.
  assert.equal(nameOf(4, [sub('OH', 2)], dbl(3)), 'but-3-en-2-ol');
  assert.equal(nameOf(3, [sub('OH', 1)], dbl(2)), 'prop-2-en-1-ol');
});

test('test_organic_halide_names', () => {
  assert.equal(nameOf(1, [sub('Cl', 1), sub('Cl', 1), sub('Cl', 1)]), 'trichloromethane');
  assert.equal(nameOf(2, [sub('Cl', 1)]), 'chloroethane');
  assert.equal(nameOf(2, [sub('Br', 1), sub('Br', 2)]), '1,2-dibromoethane');
  // Tie on locants {2,3}: bromo is cited first alphabetically, so it gets 2.
  assert.equal(nameOf(4, [sub('Br', 2), sub('methyl', 3)]), '2-bromo-3-methylbutane');
  assert.equal(nameOf(4, [sub('Br', 3), sub('methyl', 2)]), '2-bromo-3-methylbutane');
  assert.equal(nameOf(6, [sub('Cl', 5), sub('methyl', 4), sub('methyl', 3)]), '2-chloro-3,4-dimethylhexane');
  assert.equal(nameOf(2, [sub('Cl', 1)], dbl(1)), 'chloroethene');
});

test('test_organic_rejects_what_it_cannot_name', () => {
  assert.match(nameOf(4, [sub('methyl', 2)], tpl(2)), /C2 would have 5 bonds/);
  assert.match(nameOf(3, [sub('methyl', 5)]), /chain has 3 carbons/);
  assert.match(nameOf(4, [sub('OH', 1), sub('OH', 2)]), /one –OH/);
  assert.match(nameOf(10, [sub('propyl', 10)]), /13 carbons/);
  // A chlorine left on a branch would be a chloromethyl group.
  assert.match(nameOf(6, [sub('Cl', 1), sub('propyl', 2)]), /branched or carries a group/); // parent runs C6…C2 into the propyl
  assert.equal(nameOf(3, [sub('Cl', 1), sub('propyl', 2)]), '1-chloro-2-methylpentane');
});

test('test_organic_formulas', () => {
  const f = (n, subs = [], bond) => {
    const mol = O.build({ n, subs, bond });
    return [O.formula(mol), O.condensed(mol, O.name(mol).chain), O.families(mol).join(', ')];
  };
  assert.deepEqual(f(4, [sub('methyl', 2)]), ['C5H12', 'CH3CH(CH3)CH2CH3', 'alkane']);
  assert.deepEqual(f(3, [sub('OH', 2)]), ['C3H8O', 'CH3CH(OH)CH3', 'alcohol']);
  assert.deepEqual(f(3, [sub('OH', 1)]), ['C3H8O', 'CH3CH2CH2OH', 'alcohol']);
  assert.deepEqual(f(3, [sub('OH', 2), sub('methyl', 2)]), ['C4H10O', 'CH3C(OH)(CH3)CH3', 'alcohol']);
  assert.deepEqual(f(4, [], dbl(2)), ['C4H8', 'CH3CH=CHCH3', 'alkene']);
  assert.deepEqual(f(2, [], tpl(1)), ['C2H2', 'CH≡CH', 'alkyne']);
  assert.deepEqual(f(1, [sub('Cl', 1), sub('Cl', 1), sub('Cl', 1)]), ['CHCl3', 'CHCl3', 'organic halide']);
  assert.deepEqual(f(2, [sub('Br', 1), sub('Br', 2)]), ['C2H4Br2', 'CH2BrCH2Br', 'organic halide']);
  assert.deepEqual(f(3, [sub('methyl', 2), sub('methyl', 2)]), ['C5H12', 'CH3C(CH3)2CH3', 'alkane']);
});
