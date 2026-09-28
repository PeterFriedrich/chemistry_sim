import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as N from '../site/js/chem/naming.js';
import { polyatomic } from '../site/js/chem/polyatomic-data.js';

const pair = (formula, name) => {
  const a = N.convert(formula);
  assert.ok(!a.error, `${formula}: ${a.error}`);
  assert.equal(a.name, name, formula);
  const b = N.convert(name);
  assert.ok(!b.error, `${name}: ${b.error}`);
  assert.equal(b.formula, formula, name);
  return a;
};

test('test_naming_ionic_worked_examples', () => {
  pair('NaCl', 'sodium chloride');
  pair('Al2O3', 'aluminium oxide');
  pair('Fe2(SO4)3', 'iron(III) sulfate');
  pair('FeSO4', 'iron(II) sulfate');
  pair('Cu(NO3)2', 'copper(II) nitrate');
  pair('Ca3(PO4)2', 'calcium phosphate');
  pair('(NH4)2SO4', 'ammonium sulfate');
  pair('NH4NO3', 'ammonium nitrate');
  pair('NaHCO3', 'sodium hydrogen carbonate');
  pair('PbI2', 'lead(II) iodide');
  pair('CuSO4·5H2O', 'copper(II) sulfate pentahydrate');
  pair('NaOH(aq)', 'aqueous sodium hydroxide');
  pair('NaH', 'sodium hydride');
  // A monatomic reading wins when both balance; peroxide only when it alone does.
  assert.equal(N.convert('MnO2').name, 'manganese(IV) oxide');
  assert.equal(N.convert('PbO2').name, 'lead(IV) oxide');
  assert.equal(N.convert('Na2O2').name, 'sodium peroxide');
  assert.equal(N.convert('CaC2').name, 'calcium carbide');
  assert.equal(N.convert('HgCl').name, 'mercury(I) chloride'); // the booklet's Hg 1+
});

test('test_naming_ionic_charges_must_balance_with_booklet_charges', () => {
  assert.match(N.convert('NaCl2').error, /sodium is 1\+/);
  assert.match(N.convert('Fe3O4').error, /8\/3/);
  assert.match(N.convert('iron sulfate').error, /iron\(III\) or iron\(II\)/);
  assert.match(N.convert('iron(IV) oxide').error, /not one of its ions/);
  assert.match(N.convert('iron trichloride').error, /ionic/);
  assert.match(N.convert('CuNO32').error, /brackets/);
  assert.match(N.convert('Ca2O2').steps.join(' '), /lowest whole-number ratio, so this is written CaO/);
  assert.equal(N.convert('sodium(I) chloride').formula, 'NaCl');
});

test('test_naming_molecular_prefixes', () => {
  pair('CO', 'carbon monoxide');
  pair('CO2', 'carbon dioxide');
  pair('N2O4', 'dinitrogen tetroxide');
  pair('P2O5', 'diphosphorus pentoxide');
  pair('CCl4', 'carbon tetrachloride');
  pair('SF6', 'sulfur hexafluoride');
  pair('OF2', 'oxygen difluoride');
  assert.equal(N.convert('dinitrogen tetraoxide').formula, 'N2O4');
  assert.match(N.convert('carbon oxide').error, /mono/);
});

test('test_naming_acids_iupac_and_classical', () => {
  const cases = [
    ['HCl(aq)', 'aqueous hydrogen chloride', 'hydrochloric acid'],
    ['H2S(aq)', 'aqueous hydrogen sulfide', 'hydrosulfuric acid'],
    ['HCN(aq)', 'aqueous hydrogen cyanide', 'hydrocyanic acid'],
    ['H2SO4(aq)', 'aqueous hydrogen sulfate', 'sulfuric acid'],
    ['H2SO3(aq)', 'aqueous hydrogen sulfite', 'sulfurous acid'],
    ['HNO3(aq)', 'aqueous hydrogen nitrate', 'nitric acid'],
    ['HNO2(aq)', 'aqueous hydrogen nitrite', 'nitrous acid'],
    ['H3PO4(aq)', 'aqueous hydrogen phosphate', 'phosphoric acid'],
    ['H2CO3(aq)', 'aqueous hydrogen carbonate', 'carbonic acid'],
    ['HOCl(aq)', 'aqueous hydrogen hypochlorite', 'hypochlorous acid'],
    ['CH3COOH(aq)', 'aqueous hydrogen acetate', 'acetic acid'],
    ['HOOCCOOH(aq)', 'aqueous hydrogen oxalate', 'oxalic acid'],
  ];
  for (const [formula, iupac, classical] of cases) {
    assert.equal(pair(formula, iupac).alt, classical, formula);
    assert.equal(N.convert(classical).formula, formula, classical);
  }
  assert.equal(N.convert('HClO(aq)').alt, 'hypochlorous acid'); // the booklet's second form
  // Without (aq) it is the pure compound, not an acid.
  assert.equal(N.convert('HCl').kind, 'molecular');
  assert.equal(N.convert('HCl').name, 'hydrogen chloride');
});

test('test_naming_elements_and_common_names', () => {
  pair('O2', 'oxygen');
  pair('Cl2', 'chlorine');
  pair('P4', 'phosphorus');
  pair('S8', 'sulfur');
  pair('Na', 'sodium');
  pair('H2O', 'water');
  pair('NH3', 'ammonia');
  pair('O3', 'ozone');
  pair('C6H12O6', 'glucose');
  pair('C12H22O11', 'sucrose');
  assert.match(N.convert('O').error, /diatomic/);
  assert.equal(N.convert('Water').formula, 'H2O');
  assert.equal(N.convert('aluminum oxide').formula, 'Al2O3');
});

test('test_naming_every_booklet_polyatomic_ion_round_trips', () => {
  for (const p of polyatomic.filter((x) => x.charge < 0)) {
    const q = -p.charge;
    const formula = q === 1 ? `Na${p.formula}` : `Na${q}${p.formula}`;
    const r = N.convert(formula);
    // Na2O2 and Na2S2 read as peroxide/persulfide only because Na has one charge.
    assert.equal(r.name, `sodium ${p.name}`, formula);
    assert.equal(N.convert(`sodium ${p.name}`).formula, formula, p.name);
  }
});

test('test_naming_parts_balance_to_zero', () => {
  // The canvas draws these ions; their charges must sum to zero.
  for (const t of ['Fe2(SO4)3', 'iron(III) sulfate', 'Ca3(PO4)2', '(NH4)2SO4', 'H3PO4(aq)', 'sulfuric acid', 'CuSO4·5H2O', 'N2O4', 'O2', 'water']) {
    const r = N.convert(t);
    assert.equal(N.totalCharge(r.parts), 0, t);
  }
  assert.deepEqual(N.convert('Fe2(SO4)3').parts.map((p) => [p.label, p.count]), [['Fe^3+', 2], ['SO4^2-', 3]]);
  assert.deepEqual(N.convert('C6H12O6').parts.map((p) => [p.label, p.count]), [['C', 6], ['H', 12], ['O', 6]]);
});

test('test_naming_polyatomic_table_matches_data_sheet', async () => {
  const { readFileSync } = await import('node:fs');
  const md = readFileSync(new URL('../docs/DATA_SHEET.md', import.meta.url), 'utf8');
  const sec = md.slice(md.indexOf('### 1.12'), md.indexOf('## 2. Chemistry 20'));
  const rows = [...sec.matchAll(/^\| ([a-z ()]+) \| (\S+)(?: or \S+)? \|$/gm)].map((m) => [m[1], m[2]]);
  const SUB = '₀₁₂₃₄₅₆₇₈₉';
  const plain = (f) => f.replace(/[₀-₉]/g, (d) => SUB.indexOf(d));
  const chargeOf = (f) => {
    const m = /([²³]?)([⁺⁻])$/.exec(f);
    return (m[2] === '⁺' ? 1 : -1) * (m[1] ? '  ²³'.indexOf(m[1]) : 1);
  };
  assert.equal(rows.length, polyatomic.length);
  rows.forEach(([name, f], i) => {
    const p = polyatomic[i];
    assert.equal(name, p.alsoName ? `${p.name} (${p.alsoName})` : p.name);
    assert.equal(plain(f).replace(/[⁺⁻²³]/g, ''), p.formula, name);
    assert.equal(chargeOf(f), p.charge, name);
  });
});
