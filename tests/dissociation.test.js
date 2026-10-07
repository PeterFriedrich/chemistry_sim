import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../site/js/chem/dissociation.js';
import { molarMass } from '../site/js/chem/electrolysis.js';

const eq = (a) => `${a.reactants.map(([n, s]) => (n === 1 ? s : `${n} ${s}`)).join(' + ')} ${a.arrow} ${a.products.map(([n, s]) => (n === 1 ? s : `${n} ${s}`)).join(' + ')}`;

test('test_dissociation_equations_by_kind', () => {
  assert.equal(eq(D.analyse('Na2SO4')), 'Na2SO4(s) → 2 Na^+(aq) + SO4^2-(aq)');
  assert.equal(eq(D.analyse('aluminium sulfate')), 'Al2(SO4)3(s) → 2 Al^3+(aq) + 3 SO4^2-(aq)');
  assert.equal(eq(D.analyse('CuSO4·5H2O')), 'CuSO4·5H2O(s) → Cu^2+(aq) + SO4^2-(aq) + 5 H2O(l)');
  assert.equal(eq(D.analyse('C12H22O11')), 'C12H22O11(s) → C12H22O11(aq)');
  assert.equal(D.analyse('sucrose').electrolyte, 'none');
  // Acids ionize with water; strong → and weak ⇌ by the booklet's acid table.
  assert.equal(eq(D.analyse('HCl')), 'HCl(aq) + H2O(l) → H3O^+(aq) + Cl^-(aq)');
  assert.equal(eq(D.analyse('H2SO4(aq)')), 'H2SO4(aq) + H2O(l) → H3O^+(aq) + HSO4^-(aq)');
  assert.equal(eq(D.analyse('CH3COOH')), 'CH3COOH(aq) + H2O(l) ⇌ H3O^+(aq) + CH3COO^-(aq)');
  assert.equal(D.analyse('CH3COOH').electrolyte, 'weak');
  assert.equal(D.analyse('CH3COOH').entities, null);
  assert.equal(eq(D.analyse('NH3')), 'NH3(aq) + H2O(l) ⇌ NH4^+(aq) + OH^-(aq)');
  assert.equal(D.analyse('CH4').polar, false);
  assert.ok(D.analyse('O2').error);
  assert.ok(D.analyse('H2O').error);
  assert.ok(D.analyse('xyz').error);
});

test('test_dissociation_solubility_table_matches_booklet', () => {
  // Booklet p. 6 (docs/DATA_SHEET.md §1.13), one check per column and exception.
  const s = D.solubility;
  assert.equal(s('Na^+', 'CO3^2-'), 'high'); // Group 1 ions
  assert.equal(s('NH4^+', 'PO4^3-'), 'high');
  assert.equal(s('Pb^2+', 'NO3^-'), 'high');
  assert.equal(s('Rb^+', 'ClO4^-'), 'low');
  assert.equal(s('Ag^+', 'CH3COO^-'), 'low');
  assert.equal(s('Hg^+', 'CH3COO^-'), 'low'); // mercury(I) is Hg2^2+ in the table
  assert.equal(s('Ca^2+', 'F^-'), 'low');
  assert.equal(s('Cu^2+', 'F^-'), 'high');
  assert.equal(s('Ag^+', 'Cl^-'), 'low');
  assert.equal(s('Cu^+', 'I^-'), 'low');
  assert.equal(s('Cu^2+', 'Cl^-'), 'high');
  assert.equal(s('Ba^2+', 'SO4^2-'), 'low');
  assert.equal(s('Mg^2+', 'SO4^2-'), 'high');
  assert.equal(s('Ca^2+', 'CO3^2-'), 'low');
  assert.equal(s('Co^2+', 'IO3^-'), 'high');
  assert.equal(s('Fe^3+', 'OOCCOO^2-'), 'high');
  assert.equal(s('Fe^2+', 'OOCCOO^2-'), 'low');
  assert.equal(s('Ca^2+', 'OH^-'), 'low');
  assert.equal(s('Ba^2+', 'S^2-'), null); // no column for sulfide
  // Slightly soluble means less than 0.1 mol/L dissolves.
  assert.equal(D.exceedsSolubility(D.analyse('AgCl'), 0.25), true);
  assert.equal(D.exceedsSolubility(D.analyse('AgCl'), 0.001), false);
  assert.equal(D.exceedsSolubility(D.analyse('NaCl'), 2), false);
});

test('test_dissociation_ion_concentrations_worked_examples', () => {
  const conc = (a, c) => Object.fromEntries(D.entityConcentrations(a, c).map((e) => [e.species, e.conc]));
  // 0.25 mol/L Na2SO4 → [Na+] = 0.50 mol/L, [SO4 2−] = 0.25 mol/L.
  assert.deepEqual(conc(D.analyse('Na2SO4'), 0.25), { 'Na^+(aq)': 0.5, 'SO4^2-(aq)': 0.25 });
  // [Cl−] = 0.300 mol/L from CaCl2 → c(CaCl2) = 0.150 mol/L.
  assert.equal(D.soluteConcentration(D.analyse('CaCl2'), { ion: 'Cl^-(aq)', conc: 0.3 }).c, 0.15);
  // 5.85 g NaCl in 250 mL → 0.100 mol → 0.400 mol/L of each ion.
  const r = D.soluteConcentration(D.analyse('NaCl'), { m: 5.85, V: 0.25 });
  assert.equal(Number(r.n.toPrecision(3)), 0.1);
  assert.equal(Number(r.c.toPrecision(3)), 0.4);
  // A strong acid: [H3O+] = c (first ionization).
  assert.deepEqual(conc(D.analyse('HCl'), 0.1), { 'H3O^+(aq)': 0.1, 'Cl^-(aq)': 0.1 });
  // A hydrate's molar mass counts its waters.
  assert.equal(Number(molarMass('CuSO4·5H2O').toFixed(2)), 249.72);
});

test('test_dissociation_solubility_data_matches_data_sheet', async () => {
  const { readFileSync } = await import('node:fs');
  const { solubilityTable, GROUP_1 } = await import('../site/js/chem/solubility-data.js');
  const md = readFileSync(new URL('../docs/DATA_SHEET.md', import.meta.url), 'utf8');
  const sec = md.slice(md.indexOf('### 1.13'), md.indexOf('## 2. Chemistry 20'));
  const cells = (c) => [...c.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
  const rows = [...sec.matchAll(/^\| (`.+?) \| (high|low) \| (.+) \|$/gm)].map((m) => [cells(m[1]), m[2], cells(m[3])]);
  // Whole compounds in the sheet are [cation, anion] pairs in the code.
  const COMPOUND = {
    RbClO4: ['Rb^+', 'ClO4^-'], CsClO4: ['Cs^+', 'ClO4^-'], AgCH3COO: ['Ag^+', 'CH3COO^-'],
    'Hg2(CH3COO)2': ['Hg2^2+', 'CH3COO^-'], 'Co(IO3)2': ['Co^2+', 'IO3^-'], 'Fe2(OOCCOO)3': ['Fe^3+', 'OOCCOO^2-'],
  };
  const expand = (list) => list.flatMap((x) => (x === 'Group 1' ? GROUP_1 : [COMPOUND[x] ?? x]));
  assert.equal(rows.length, solubilityTable.length);
  rows.forEach(([ions, most, except], i) => {
    assert.deepEqual(solubilityTable[i].ions, expand(ions));
    assert.equal(solubilityTable[i].most, most);
    assert.deepEqual(solubilityTable[i].except, expand(except));
  });
});
