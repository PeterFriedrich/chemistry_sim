// Chemistry 20 names and formulas, both ways: ionic compounds (with Roman
// numerals for metals the booklet gives more than one charge, polyatomic ions
// from the booklet's table, hydrates), binary molecular compounds (prefixes),
// acids (IUPAC "aqueous hydrogen …" first, then the classical "…ic acid"),
// elements, and a short list of common names.
//
// Every charge comes from the booklet: metal charges from the periodic table,
// polyatomic ions from its table on p. 2. Monatomic anions take −(8 − valence
// electrons) (`ionCharges` in periodic.js), because the booklet prints none.
// Formulas are plain ASCII here ("Fe2(SO4)3", "CuSO4·5H2O", charges as
// "SO4^2-"); the sim adds subscripts at the display edge.
import { elements } from './elements-data.js';
import { polyatomic } from './polyatomic-data.js';
import { ionCharges } from './periodic.js';

const PREFIX = ['', 'mono', 'di', 'tri', 'tetra', 'penta', 'hexa', 'hepta', 'octa', 'nona', 'deca'];
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

// The "-ide" name of each monatomic anion.
const STEM = { H: 'hydr', N: 'nitr', O: 'ox', F: 'fluor', P: 'phosph', S: 'sulf', Cl: 'chlor', As: 'arsen', Se: 'selen', Br: 'brom', Te: 'tellur', I: 'iod', At: 'astat' };

// Elements as students write them: seven diatomic, P4 and S8; the rest single atoms.
const ELEMENT_COUNT = { H: 2, N: 2, O: 2, F: 2, Cl: 2, Br: 2, I: 2, P: 4, S: 8 };

// Common names Chemistry 20 students are expected to know. The booklet prints none.
export const COMMON = [
  { formula: 'H2O', name: 'water' },
  { formula: 'H2O2', name: 'hydrogen peroxide' },
  { formula: 'NH3', name: 'ammonia' },
  { formula: 'O3', name: 'ozone' },
  { formula: 'CH4', name: 'methane' },
  { formula: 'C3H8', name: 'propane' },
  { formula: 'C8H18', name: 'octane' },
  { formula: 'CH3OH', name: 'methanol' },
  { formula: 'C2H5OH', name: 'ethanol' },
  { formula: 'C6H12O6', name: 'glucose' },
  { formula: 'C12H22O11', name: 'sucrose' },
];

// Acids: hydrogen with an anion whose name ends -ide, -ate or -ite. Hydrogen
// comes first in the formula, except the organic acids, written as the booklet
// writes the anion plus H (CH3COOH).
const ACID_ANIONS = ['F', 'Cl', 'Br', 'I', 'S', 'cyanide', 'acetate', 'benzoate', 'borate', 'carbonate', 'perchlorate',
  'chlorate', 'chlorite', 'hypochlorite', 'chromate', 'dichromate', 'iodate', 'nitrate', 'nitrite', 'oxalate',
  'permanganate', 'phosphate', 'silicate', 'sulfate', 'sulfite', 'thiocyanate', 'thiosulfate'];
const CLASSICAL_STEM = { sulfide: 'sulfur', sulfate: 'sulfur', sulfite: 'sulfur', thiosulfate: 'thiosulfur', phosphate: 'phosphor' };

const symbols = Object.keys(elements);
const byName = new Map(Object.entries(elements).map(([sym, e]) => [e.name, sym]));
const polyByName = new Map(polyatomic.flatMap((p) => [[p.name, p], ...(p.alsoName ? [[p.alsoName, p]] : [])]));
const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));

export const isMetal = (sym) => sym !== 'H' && (elements[sym].ions ?? []).some((c) => c > 0);

// 2+ and 1− as the booklet prints charges, for prose.
export const plainCharge = (q) => `${Math.abs(q)}${q > 0 ? '+' : '−'}`;

export function chargeText(q) {
  return `${Math.abs(q) === 1 ? '' : Math.abs(q)}${q > 0 ? '+' : '-'}`;
}

function monatomicAnion(sym) {
  if (!STEM[sym]) return null;
  const charge = sym === 'H' ? -1 : ionCharges(elements[sym].Z)[0]?.charge;
  return { name: `${STEM[sym]}ide`, formula: sym, charge, mono: true };
}

function anionByName(name) {
  if (polyByName.has(name)) {
    const p = polyByName.get(name);
    return p.charge < 0 ? { ...p, mono: false } : null;
  }
  const sym = Object.keys(STEM).find((s) => `${STEM[s]}ide` === name);
  return sym ? monatomicAnion(sym) : null;
}

const acids = ACID_ANIONS.map((key) => {
  const anion = STEM[key] ? monatomicAnion(key) : { ...polyByName.get(key), mono: false };
  const n = -anion.charge;
  const organic = /COO$/.test(anion.formula);
  const formula = organic
    ? (anion.formula === 'OOCCOO' ? 'HOOCCOOH' : `${anion.formula}H`)
    : `H${n > 1 ? n : ''}${anion.formula}`;
  const alt = anion.alt ? `H${anion.alt}` : null;
  const nm = anion.name;
  const stem = CLASSICAL_STEM[nm] ?? nm.replace(/(ide|ate|ite)$/, '');
  const classical = nm.endsWith('ide') ? `hydro${stem}ic acid` : nm.endsWith('ate') ? `${stem}ic acid` : `${stem}ous acid`;
  return { anion, n, formula, alt, iupac: `hydrogen ${nm}`, classical };
});

// ---------- parsing a typed formula ----------

const SUBSCRIPT = '₀₁₂₃₄₅₆₇₈₉';

// { body, tokens, hydrate, state } or { error }. Tokens are { sym, count } or
// { group: tokens, text, count } for a bracketed group.
export function parseFormula(input) {
  let s = String(input).trim().replace(/\s+/g, '').replace(/[₀-₉]/g, (d) => SUBSCRIPT.indexOf(d));
  if (!s) return { error: 'Type a formula, such as Fe2(SO4)3 or CO2.' };
  let state = null;
  const st = /\((aq|s|l|g)\)$/i.exec(s);
  if (st) {
    state = st[1].toLowerCase();
    s = s.slice(0, st.index);
  }
  let hydrate = 0;
  const hy = /^(.+?)[·•*.](\d*)H2O$/.exec(s);
  if (hy) {
    s = hy[1];
    hydrate = Number(hy[2] || 1);
  }
  const read = (str) => {
    const tokens = [];
    let i = 0;
    while (i < str.length) {
      if (str[i] === '(') {
        let depth = 1;
        let j = i + 1;
        while (j < str.length && depth) depth += str[j] === '(' ? 1 : str[j] === ')' ? -1 : 0, j++;
        if (depth) return { error: 'A bracket is not closed.' };
        const inner = str.slice(i + 1, j - 1);
        const sub = read(inner);
        if (sub.error) return sub;
        const m = /^\d*/.exec(str.slice(j))[0];
        tokens.push({ group: sub, text: inner, count: m ? Number(m) : 1 });
        i = j + m.length;
        continue;
      }
      const m = /^([A-Z][a-z]?)(\d*)/.exec(str.slice(i));
      if (!m) return { error: `“${str.slice(i)}” is not read as an element symbol. Symbols start with a capital letter: Co is cobalt, CO is carbon and oxygen.` };
      if (!symbols.includes(m[1])) return { error: `${m[1]} is not an element on the booklet's periodic table.` };
      tokens.push({ sym: m[1], count: m[2] ? Number(m[2]) : 1 });
      i += m[0].length;
    }
    return tokens;
  };
  const tokens = read(s);
  if (tokens.error) return tokens;
  return { body: s, tokens, hydrate, state };
}

const flat = (tokens) => tokens.flatMap((t) => (t.group ? flat(t.group).map((x) => ({ ...x, count: x.count * t.count })) : [t]));
const text = (tokens) => tokens.map((t) => (t.group ? `(${t.text})${t.count > 1 ? t.count : ''}` : `${t.sym}${t.count > 1 ? t.count : ''}`)).join('');

// What the sim draws: each ion (or atom) with its count and charge.
const ionPart = (formula, charge, count) => ({ label: `${formula}^${chargeText(charge)}`, charge, count });
const hydratePart = (n) => (n ? [{ label: 'H2O', charge: 0, count: n, water: true }] : []);
function atomParts(formula) {
  const f = parseFormula(formula);
  const out = [];
  for (const t of flat(f.tokens)) {
    const hit = out.find((o) => o.label === t.sym);
    if (hit) hit.count += t.count;
    else out.push({ label: t.sym, charge: 0, count: t.count });
  }
  return out;
}

const hydrateName = (n) => (n ? ` ${PREFIX[n] ?? `${n}-`}hydrate` : '');
const hydrateFormula = (n) => (n ? `·${n > 1 ? n : ''}H2O` : '');

// ---------- formula → name ----------

export function nameFromFormula(input) {
  const f = parseFormula(input);
  if (f.error) return f;
  const aq = f.state === 'aq';
  const hyd = f.hydrate;
  const shown = `${f.body}${hydrateFormula(hyd)}${f.state ? `(${f.state})` : ''}`;
  const steps = [];

  const common = COMMON.find((c) => c.formula === f.body);
  if (common && !hyd) {
    steps.push(`${f.body} is a common name to know: ${common.name}.`);
    return { kind: 'common', formula: shown, name: `${aq ? 'aqueous ' : ''}${common.name}`, steps, parts: atomParts(f.body) };
  }

  // an element
  if (f.tokens.length === 1 && !f.tokens[0].group && !hyd) {
    const { sym, count } = f.tokens[0];
    const want = ELEMENT_COUNT[sym] ?? 1;
    const name = elements[sym].name;
    if (count !== want) {
      return { error: want === 1
        ? `${name[0].toUpperCase()}${name.slice(1)} as an element is written ${sym}, a single atom.`
        : `${name[0].toUpperCase()}${name.slice(1)} as an element is written ${sym}${want}${want === 2 ? ': it is one of the seven diatomic elements (H2, N2, O2, F2, Cl2, Br2, I2)' : ''}.` };
    }
    steps.push(want === 1
      ? `One element, written as single atoms: ${sym} is ${name}.`
      : `One element: ${sym}${want} is how ${name} is written as an element${want === 2 ? ' (diatomic)' : ''}.`);
    return { kind: 'element', formula: shown, name, steps, parts: atomParts(f.body) };
  }

  // an acid, or the pure hydrogen compound
  const acid = !hyd && acids.find((a) => a.formula === f.body || a.alt === f.body);
  if (acid) {
    const an = acid.anion;
    steps.push(`Hydrogen with an anion: ${an.name}, ${an.formula}^${chargeText(an.charge)}${an.mono ? ` (group rule: 8 − valence electrons)` : ' (booklet table)'}.`);
    if (acid.n > 1) steps.push(`The anion is ${plainCharge(an.charge)}, so it takes ${acid.n} hydrogens: ${acid.formula}.`);
    if (!aq) {
      steps.push(`With no (aq) this is the pure compound, named hydrogen + anion. In water, ${acid.formula}(aq), it is an acid.`);
      return { kind: 'molecular', formula: shown, name: acid.iupac, steps, parts: atomParts(acid.formula) };
    }
    steps.push(`(aq): dissolved in water, it is an acid. IUPAC name: aqueous hydrogen ${an.name}.`);
    steps.push(classicalRule(an.name, acid.classical));
    return { kind: 'acid', formula: shown, name: `aqueous ${acid.iupac}`, alt: acid.classical, steps, parts: acidParts(acid) };
  }

  // ionic: a metal or ammonium, then an anion
  const ionic = ionicFromTokens(f.tokens);
  if (ionic) {
    if (ionic.error) return ionic;
    const { cation, nCat, anion, nAn, qCat } = ionic;
    const catName = cation.poly ? 'ammonium' : elements[cation.sym].name;
    const multi = !cation.poly && elements[cation.sym].ions.filter((q) => q > 0).length > 1;
    steps.push(`${cation.poly ? 'Ammonium' : `${catName[0].toUpperCase()}${catName.slice(1)} is a metal`} with ${anion.mono ? 'a nonmetal' : 'a polyatomic ion'} → ionic compound: name the cation, then the anion.`);
    steps.push(`Anion: ${anion.name}, ${anion.formula}^${chargeText(anion.charge)}${anion.mono ? ' (group rule: 8 − valence electrons)' : ' (booklet table)'}. ${nAn} × (${anion.charge}) = ${nAn * anion.charge}.`);
    if (multi) {
      const listed = elements[cation.sym].ions.map(plainCharge).join(', ');
      steps.push(`${catName[0].toUpperCase()}${catName.slice(1)} has more than one charge in the booklet (${listed}). ${nCat} ${cation.sym} must balance ${nAn * anion.charge}: each is ${qCat}+, so write ${catName}(${ROMAN[qCat]}).`);
    } else {
      steps.push(`Cation: ${catName}, ${cation.formula}^${chargeText(qCat)}${cation.poly ? ' (booklet table)' : ', its only charge in the booklet: no Roman numeral'}.`);
    }
    const g = gcd(nCat, nAn);
    if (g > 1) steps.push(`Note: ionic formulas use the lowest whole-number ratio, so this is written ${reformat(cation, nCat / g, anion, nAn / g)}.`);
    if (hyd) steps.push(`·${hyd > 1 ? hyd : ''}H2O: a hydrate with ${hyd} water${hyd > 1 ? 's' : ''} → “${hydrateName(hyd).trim()}”.`);
    const name = `${aq ? 'aqueous ' : ''}${catName}${multi ? `(${ROMAN[qCat]})` : ''} ${anion.name}${hydrateName(hyd)}`;
    if (aq) steps.push(anion.formula === 'OH' ? '(aq): dissolved in water. A hydroxide in water is a base.' : '(aq): dissolved in water → “aqueous”.');
    return { kind: 'ionic', formula: shown, name, steps, parts: [ionPart(cation.formula, qCat, nCat), ionPart(anion.formula, anion.charge, nAn), ...hydratePart(hyd)] };
  }

  // binary molecular
  const els = flat(f.tokens);
  if (!hyd && els.length === 2 && els[0].sym !== els[1].sym && els.every((t) => !isMetal(t.sym)) && STEM[els[1].sym]) {
    const [a, b] = els;
    const first = `${a.count > 1 ? PREFIX[a.count] : ''}${elements[a.sym].name}`;
    const second = prefixed(b.count, STEM[b.sym]);
    steps.push(`Two nonmetals → molecular compound: name both elements, with prefixes for the numbers of atoms.`);
    steps.push(`${a.sym}${a.count > 1 ? a.count : ''} → ${first}${a.count === 1 ? ' (mono is left off the first element)' : ''}.`);
    steps.push(`${b.sym}${b.count > 1 ? b.count : ''} → ${PREFIX[b.count]} + ${STEM[b.sym]}ide → ${second}${second !== PREFIX[b.count] + STEM[b.sym] + 'ide' ? ` (the ${PREFIX[b.count].at(-1)} of the prefix is dropped before “oxide”)` : ''}.`);
    if (aq) steps.push('(aq): dissolved in water → “aqueous”.');
    return { kind: 'molecular', formula: shown, name: `${aq ? 'aqueous ' : ''}${first} ${second}`, steps, parts: atomParts(f.body) };
  }

  if (els.some((t) => isMetal(t.sym))) return { error: `${shown} has a metal but no anion from the booklet's table that balances. Check the formula.` };
  return { error: `${shown} is not a binary molecular compound, an acid from the booklet's ions, or one of the common names this sim knows.` };
}

// Net charge of the drawn parts: 0 for every compound (a test holds it).
export const totalCharge = (parts) => parts.reduce((sum, p) => sum + p.charge * p.count, 0);

// An acid in water: n hydrogen ions and the anion.
const acidParts = (acid) => [ionPart('H', 1, acid.n), ionPart(acid.anion.formula, acid.anion.charge, 1)];

function classicalRule(anionName, classical) {
  if (anionName.endsWith('ide')) return `Classical name: -ide → hydro…ic acid: ${anionName} → ${classical}.`;
  if (anionName.endsWith('ate')) return `Classical name: -ate → -ic acid: ${anionName} → ${classical}.`;
  return `Classical name: -ite → -ous acid: ${anionName} → ${classical}.`;
}

// Prefix + stem + "ide", dropping the prefix's final a or o before "oxide"
// (monoxide, tetroxide, pentoxide) as students write it.
function prefixed(n, stem) {
  const p = PREFIX[n];
  return stem === 'ox' && /[ao]$/.test(p) ? `${p.slice(0, -1)}oxide` : `${p}${stem}ide`;
}

function reformat(cation, nCat, anion, nAn) {
  const cat = cation.poly ? (nCat > 1 ? `(NH4)${nCat}` : 'NH4') : `${cation.sym}${nCat > 1 ? nCat : ''}`;
  const an = anion.mono ? `${anion.formula}${nAn > 1 ? nAn : ''}` : nAn > 1 ? `(${anion.formula})${nAn}` : anion.formula;
  return cat + an;
}

// Split tokens into cation and anion and check the charges balance. null when
// the first unit is not a metal or ammonium.
function ionicFromTokens(tokens) {
  let cation;
  let nCat;
  let rest;
  const t0 = tokens[0];
  if (t0.group && t0.text === 'NH4') [cation, nCat, rest] = [{ poly: true, formula: 'NH4', charges: [1] }, t0.count, tokens.slice(1)];
  else if (!t0.group && t0.sym === 'N' && tokens[1]?.sym === 'H' && tokens[1].count === 4 && !tokens[1].group) {
    [cation, nCat, rest] = [{ poly: true, formula: 'NH4', charges: [1] }, t0.count, tokens.slice(2)];
    if (t0.count !== 1) return null;
  } else if (!t0.group && isMetal(t0.sym)) {
    [cation, nCat, rest] = [{ sym: t0.sym, formula: t0.sym, charges: elements[t0.sym].ions.filter((q) => q > 0) }, t0.count, tokens.slice(1)];
  } else return null;
  if (!rest.length) return { error: `${text(tokens)} has a cation but no anion.` };

  // Readings of the rest as one anion taken n times; a monatomic reading first,
  // so MnO2 is manganese(IV) oxide rather than manganese(II) peroxide.
  const readings = [];
  const polyOf = (str) => polyatomic.find((p) => p.charge < 0 && (p.formula === str || p.alt === str));
  if (rest.length === 1 && !rest[0].group && monatomicAnion(rest[0].sym)?.charge < 0) readings.push({ anion: monatomicAnion(rest[0].sym), nAn: rest[0].count });
  if (rest.length === 1 && rest[0].group && polyOf(rest[0].text)) readings.push({ anion: { ...polyOf(rest[0].text), mono: false }, nAn: rest[0].count });
  if (polyOf(text(rest))) readings.push({ anion: { ...polyOf(text(rest)), mono: false }, nAn: 1 });
  if (!readings.length) return { error: `After ${cation.formula}, “${text(rest)}” is not an anion: not a nonmetal ion or a polyatomic ion from the booklet's table. A polyatomic ion taken more than once goes in brackets, such as Ca(NO3)2.` };

  for (const r of readings) {
    const total = -r.nAn * r.anion.charge;
    if (total % nCat === 0 && cation.charges.includes(total / nCat)) return { cation, nCat, ...r, qCat: total / nCat };
  }
  const r = readings[0];
  const total = -r.nAn * r.anion.charge;
  const nm = cation.poly ? 'ammonium' : elements[cation.sym].name;
  const listed = cation.charges.map(plainCharge).join(' or ');
  return { error: `The charges do not balance. ${r.nAn} ${r.anion.name} (${r.anion.formula}^${chargeText(r.anion.charge)}) total ${-total}, so ${nCat} ${cation.formula} would need ${total % nCat ? `${total}/${nCat}` : `${total / nCat}+`} each, but ${nm} is ${listed} in the booklet.` };
}

// ---------- name → formula ----------

export function formulaFromName(input) {
  let s = String(input).toLowerCase().trim().replace(/\s+/g, ' ').replace(/\s*\(\s*([ivx]+)\s*\)/g, '($1)');
  if (!s) return { error: 'Type a name, such as iron(III) sulfate or dinitrogen tetroxide.' };
  const steps = [];
  // Common spellings the booklet does not use.
  for (const [us, booklet] of [['aluminum', 'aluminium'], ['caesium', 'cesium'], ['sulphur', 'sulfur'], ['sulphate', 'sulfate'], ['sulphite', 'sulfite'], ['sulphide', 'sulfide']]) {
    if (s.includes(us)) {
      s = s.replaceAll(us, booklet);
      steps.push(`The booklet spells it ${booklet}.`);
    }
  }
  let aq = false;
  if (s.startsWith('aqueous ')) {
    aq = true;
    s = s.slice(8);
  }
  const state = aq ? '(aq)' : '';

  // classical acid name
  if (s.endsWith(' acid')) {
    const acid = acids.find((a) => a.classical === s);
    if (!acid) return { error: `“${s}” is not an acid made from the booklet's ions. Classical names: -ide → hydro…ic, -ate → -ic, -ite → -ous.` };
    const an = acid.anion;
    steps.push(`${classicalRule(an.name, acid.classical)} Read backwards: ${an.name}, ${an.formula}^${chargeText(an.charge)}${an.mono ? ' (group rule)' : ' (booklet table)'}.`);
    steps.push(`An acid is hydrogen with the anion, in water: ${acid.n} H⁺ balance ${plainCharge(an.charge)} → ${acid.formula}(aq). IUPAC name: aqueous ${acid.iupac}.`);
    return { kind: 'acid', formula: `${acid.formula}(aq)`, name: `aqueous ${acid.iupac}`, alt: acid.classical, steps, parts: acidParts(acid) };
  }

  let hyd = 0;
  const hy = /^(.+) (mono|di|tri|tetra|penta|hexa|hepta|octa|nona|deca)hydrate$/.exec(s);
  if (hy) {
    s = hy[1];
    hyd = PREFIX.indexOf(hy[2]);
  }

  const common = COMMON.find((c) => c.name === s);
  if (common && !hyd) {
    steps.push(`${common.name} is a common name to know: ${common.formula}.`);
    return { kind: 'common', formula: `${common.formula}${state}`, name: `${aq ? 'aqueous ' : ''}${common.name}`, steps, parts: atomParts(common.formula) };
  }

  if (byName.has(s) && !hyd) {
    const sym = byName.get(s);
    const n = ELEMENT_COUNT[sym] ?? 1;
    steps.push(n === 1
      ? `An element: ${s} is written as single atoms, ${sym}.`
      : `An element: ${s} is written ${sym}${n}${n === 2 ? ', one of the seven diatomic elements' : ''}.`);
    return { kind: 'element', formula: `${sym}${n > 1 ? n : ''}`, name: s, steps, parts: [{ label: sym, charge: 0, count: n }] };
  }

  // hydrogen + anion: the acid's IUPAC name, or the pure compound
  const acid = !hyd && acids.find((a) => a.iupac === s);
  if (acid) {
    const an = acid.anion;
    steps.push(`Hydrogen with ${an.name}, ${an.formula}^${chargeText(an.charge)}${an.mono ? ' (group rule)' : ' (booklet table)'}: ${acid.n} H⁺ balance it → ${acid.formula}.`);
    if (aq) {
      steps.push(`Aqueous → (aq): in water it is an acid, classically ${acid.classical}.`);
      return { kind: 'acid', formula: `${acid.formula}(aq)`, name: `aqueous ${acid.iupac}`, alt: acid.classical, steps, parts: acidParts(acid) };
    }
    steps.push(`Not aqueous: the pure compound. Add “aqueous” for the acid.`);
    return { kind: 'molecular', formula: acid.formula, name: acid.iupac, steps, parts: atomParts(acid.formula) };
  }

  const words = s.split(' ');
  const first = words[0];
  const rest = words.slice(1).join(' ');
  const m = /^([a-z]+)(?:\(([ivx]+)\))?$/.exec(first);
  const catSym = m && byName.get(m[1]);

  // ionic
  if (m && (m[1] === 'ammonium' || (catSym && isMetal(catSym)))) {
    const anion = anionByName(rest);
    if (!anion && unprefixAnion(rest)) return { error: `${m[1][0].toUpperCase()}${m[1].slice(1)} is ${m[1] === 'ammonium' ? 'a polyatomic ion' : 'a metal'}, so this compound is ionic: name it with the ${m[1] === 'ammonium' ? 'ions' : 'metal’s charge'}, not prefixes (${m[1]} … chloride, not trichloride).` };
    if (!anion) return { error: `“${rest}” is not an anion name: a nonmetal ending in -ide (chloride, oxide) or an ion from the booklet's polyatomic table.` };
    let qCat;
    let cation;
    if (m[1] === 'ammonium') {
      if (m[2]) return { error: 'Ammonium is always 1+; it takes no Roman numeral.' };
      cation = { poly: true, formula: 'NH4' };
      qCat = 1;
      steps.push(`Ammonium, NH4^+ (booklet table), with ${anion.name}, ${anion.formula}^${chargeText(anion.charge)}${anion.mono ? ' (group rule: 8 − valence electrons)' : ' (booklet table)'}.`);
    } else {
      const charges = elements[catSym].ions.filter((q) => q > 0);
      const roman = m[2] ? ROMAN.indexOf(m[2].toUpperCase()) : 0;
      if (charges.length > 1 && !m[2]) {
        return { error: `${m[1][0].toUpperCase()}${m[1].slice(1)} has more than one charge in the booklet (${charges.map(plainCharge).join(', ')}): write ${charges.map((q) => `${m[1]}(${ROMAN[q]})`).join(' or ')}.` };
      }
      if (m[2] && roman < 1) return { error: `(${m[2]}) is not a Roman numeral from I to VII.` };
      if (m[2] && !charges.includes(roman)) return { error: `The booklet lists ${m[1]} as ${charges.map(plainCharge).join(', ')}, so ${m[1]}(${m[2].toUpperCase()}) is not one of its ions.` };
      qCat = roman || charges[0];
      cation = { sym: catSym, formula: catSym };
      steps.push(m[2]
        ? `${m[1]}(${m[2].toUpperCase()}) → ${catSym}^${chargeText(qCat)}: the Roman numeral is the charge${charges.length === 1 ? ' (it has only one charge, so the numeral is not needed)' : ''}.`
        : `${m[1]} → ${catSym}^${chargeText(qCat)}, its only charge in the booklet.`);
      steps.push(`${anion.name} → ${anion.formula}^${chargeText(anion.charge)}${anion.mono ? ' (group rule: 8 − valence electrons)' : ' (booklet table)'}.`);
    }
    const qAn = -anion.charge;
    const g = gcd(qCat, qAn);
    const nCat = qAn / g;
    const nAn = qCat / g;
    const lcm = qCat * nCat;
    steps.push(qCat === qAn
      ? `The charges are equal and opposite: one of each.`
      : `Balance the charges: the lowest common multiple of ${qCat} and ${qAn} is ${lcm} → ${nCat} × (+${qCat}) and ${nAn} × (−${qAn}).`);
    let formula = reformat(cation, nCat, anion, nAn);
    if (!anion.mono && nAn > 1) steps.push(`A polyatomic ion taken more than once goes in brackets: ${formula}.`);
    if (hyd) {
      formula += hydrateFormula(hyd);
      steps.push(`${hydrateName(hyd).trim()} → ${hyd} water${hyd > 1 ? 's' : ''}: ·${hyd > 1 ? hyd : ''}H2O.`);
    }
    if (aq) steps.push('Aqueous → (aq).');
    const catName = m[1] === 'ammonium' || elements[catSym].ions.filter((q) => q > 0).length === 1 ? m[1] : `${m[1]}(${ROMAN[qCat]})`;
    return { kind: 'ionic', formula: formula + state, name: `${aq ? 'aqueous ' : ''}${catName} ${anion.name}${hydrateName(hyd)}`, steps, parts: [ionPart(cation.formula, qCat, nCat), ionPart(anion.formula, anion.charge, nAn), ...hydratePart(hyd)] };
  }

  // binary molecular
  if (words.length === 2 && !hyd) {
    const a = unprefix(first, (w) => byName.get(w));
    const b = unprefixAnion(words[1]);
    if (a && isMetal(a.sym)) return { error: `${elements[a.sym].name} is a metal: its compounds are ionic, named with the metal's charge, not prefixes.` };
    if (a && b) {
      steps.push('Two nonmetals → molecular compound: the prefixes give the numbers of atoms.');
      steps.push(`${first} → ${a.sym}${a.n > 1 ? a.n : ''}${a.n === 1 ? ' (no prefix on the first element means one)' : ''}.`);
      steps.push(`${words[1]} → ${b.sym}${b.n > 1 ? b.n : ''} (${PREFIX[b.n]} = ${b.n}).`);
      if (aq) steps.push('Aqueous → (aq).');
      const name = `${a.n > 1 ? PREFIX[a.n] : ''}${elements[a.sym].name} ${prefixed(b.n, STEM[b.sym])}`;
      return { kind: 'molecular', formula: `${a.sym}${a.n > 1 ? a.n : ''}${b.sym}${b.n > 1 ? b.n : ''}${state}`, name: `${aq ? 'aqueous ' : ''}${name}`, steps, parts: [{ label: a.sym, charge: 0, count: a.n }, { label: b.sym, charge: 0, count: b.n }] };
    }
    if (a && !b && anionByName(words[1])) return { error: `In a molecular compound the second element always takes a prefix, mono for one: ${first} ${words[1]} → ${first} mono…, di…, and so on.` };
  }
  return { error: `“${s}” is not read as an element, an ionic or binary molecular compound, an acid, or one of the common names this sim knows. Check the spelling (the booklet spells aluminium and cesium).` };
}

// "dinitrogen" → { sym: N, n: 2 }; no prefix means 1.
function unprefix(word, lookup) {
  if (lookup(word)) return { sym: lookup(word), n: 1 };
  for (let n = 10; n >= 1; n--) {
    if (word.startsWith(PREFIX[n]) && lookup(word.slice(PREFIX[n].length))) return { sym: lookup(word.slice(PREFIX[n].length)), n };
  }
  return null;
}

// "tetroxide" or "tetraoxide" → { sym: O, n: 4 }; a prefix is required.
function unprefixAnion(word) {
  for (let n = 10; n >= 1; n--) {
    const p = PREFIX[n];
    for (const rest of [word.startsWith(p) ? word.slice(p.length) : null, /[ao]$/.test(p) && word.startsWith(p.slice(0, -1) + 'o') ? word.slice(p.length - 1) : null]) {
      if (!rest) continue;
      const sym = Object.keys(STEM).find((k) => `${STEM[k]}ide` === rest);
      if (sym) return { sym, n };
    }
  }
  return null;
}

// A single word that fails as a formula ("Water", "Oxygen") is tried as a name.
export function convert(input) {
  const s = String(input).trim();
  if (/\s/.test(s) || /^[a-z]/.test(s)) return formulaFromName(s);
  const r = nameFromFormula(s);
  if (r.error && /^[A-Za-z]+$/.test(s)) {
    const n = formulaFromName(s);
    if (!n.error) return n;
  }
  return r;
}
