import * as G from '../chem/gases.js';
import { R, ATM, KELVIN_OFFSET } from '../chem/constants.js';
import { fitCanvas, theme, clear, line, text, roundRect } from '../lib/canvas.js';
import { section, choice, readouts, el } from '../lib/controls.js';
import { createClock } from '../lib/clock.js';
import { fmt, fixed, species } from '../lib/format.js';

export const equations = [
  { html: 'P₁V₁ = P₂V₂', what: 'Boyle’s law: temperature and amount constant' },
  { html: 'V₁/T₁ = V₂/T₂', what: 'Charles’s law: pressure and amount constant; T in kelvin' },
  { html: 'P₁/T₁ = P₂/T₂', what: 'Gay-Lussac’s law: volume and amount constant; T in kelvin' },
  { html: 'P₁V₁/T₁ = P₂V₂/T₂', what: 'combined gas law' },
  { html: 'PV = nRT, R = 8.314 (L·kPa)/(K·mol)', what: 'ideal gas law: P in kPa, V in L, T in K' },
  { html: 'T (K) = t (°C) + 273.15', what: 'keep the °C value’s decimal places (the addition rule)' },
  { html: 'n = m/M, V = nV<sub>m</sub>', what: 'V<sub>m</sub> = 22.4 L/mol at STP (273.15 K, 101.325 kPa), 24.8 L/mol at SATP (298.15 K, 100 kPa)' },
  { html: '% difference = |experimental − predicted| ÷ predicted × 100 %', what: 'lab analysis' },
];

export const prompts = [
  'Boyle: squeeze the gas to half its volume. What happens to the space between the particles, the number of wall collisions, and the pressure?',
  'Charles: a helium balloon goes from 22 °C indoors to −25 °C outside. Predict the new volume, then use the particles to explain why it shrinks.',
  'Gay-Lussac: heat a rigid steel canister. Which changes, the space between the particles or the number of collisions with the walls? Compare a balloon.',
  'On the Charles graph, follow the line down to the left. At what temperature would the volume of an ideal gas reach zero? Why does a real gas never get there?',
  'Ideal gas: at the same T and P, compare 1.00 L of He, Cl₂ and CH₄. Which has the most molecules? Which has the most grams per litre?',
  'Ideal gas: work out the volume of 2.15 mol of F₂ at SATP twice, with PV = nRT and with 24.8 L/mol. Do the two methods agree?',
  'Lab: switch the gas to ammonia. Why can it not be collected by water displacement, and what would the student see?',
  'Real gases: why does a real gas condense at high pressure or low temperature, when an ideal gas never does? (Think of the intermolecular forces in the forces sim.)',
];

export const tallOnMobile = true;

export const legend = [
  { color: 'series-a', label: 'state 1' },
  { color: 'series-b', label: 'state 2' },
];

const P_UNITS = [{ value: 'kPa', label: 'kPa', k: 1 }, { value: 'atm', label: 'atm', k: ATM }];
const V_UNITS = [{ value: 'L', label: 'L', k: 1 }, { value: 'mL', label: 'mL', k: 1e-3 }, { value: 'kL', label: 'kL (m³)', k: 1e3 }];
const T_UNITS = [{ value: 'C', label: '°C' }, { value: 'K', label: 'K' }];
const M_UNITS = [{ value: 'g', label: 'g', k: 1 }, { value: 'mg', label: 'mg', k: 1e-3 }, { value: 'kg', label: 'kg', k: 1e3 }];
const N_UNITS = [{ value: 'mol', label: 'mol', k: 1 }, { value: 'mmol', label: 'mmol', k: 1e-3 }, { value: 'kmol', label: 'kmol', k: 1e3 }];

const GAS_OPTS = G.gases.map((g) => ({ value: g.id, label: g.formula ? `${species(g.formula)}, ${g.name}` : `${g.name} (M = ${g.M} g/mol)`, gas: g }));
const SUB = { 1: '₁', 2: '₂' };
const sym = (k) => k[0] + (SUB[k[1]] ?? '');
const unitOf = (list, v) => list.find((u) => u.value === v);

// A typed value with a unit menu; the student types the number as the question
// writes it, because its sig figs come from what is typed.
function field(parent, { label, value, units, unit }) {
  const row = el('div', { class: 'ctl ctl-choice' }, parent);
  el('label', { html: label }, row);
  const wrap = el('div', { style: 'display: flex; gap: 6px' }, row);
  const input = el('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off', spellcheck: 'false', style: 'flex: 1; min-width: 0' }, wrap);
  input.value = value;
  let sel = null;
  if (units) {
    sel = el('select', { 'aria-label': `${label.replace(/<[^>]+>/g, '')} unit`, style: 'width: auto' }, wrap);
    units.forEach((u) => el('option', { value: u.value, text: u.label }, sel));
    sel.value = unit ?? units[0].value;
  }
  return {
    row,
    get text() { return input.value; },
    set text(v) { input.value = v; },
    get unit() { return sel?.value; },
    set unit(v) { if (sel) sel.value = v; },
    show(on) { const d = on ? '' : 'none'; if (row.style.display !== d) row.style.display = d; },
  };
}

// Questions from the review package, to load as a starting point.
const LAW_PRESETS = [
  { value: 'q2', label: 'Boyle: CO at 93.0 kPa, 3.73 L → 7.66 L', law: 'T', unknown: 'P2', u: { P: 'kPa', V: 'L', T: 'C' }, v: { P1: '93.0', V1: '3.73', V2: '7.66' } },
  { value: 'q1', label: 'Boyle: air at 0.52 atm, 5.7 L → 2.0 L', law: 'T', unknown: 'P2', u: { P: 'atm', V: 'L', T: 'C' }, v: { P1: '0.52', V1: '5.7', V2: '2.0' } },
  { value: 'q3', label: 'Charles: 20.0 L of O₂, −30.0 °C → 85.0 °C', law: 'P', unknown: 'V2', u: { P: 'kPa', V: 'L', T: 'C' }, v: { V1: '20.0', T1: '-30.0', T2: '85.0' } },
  { value: 'q6', label: 'Gay-Lussac: 2.00 atm at 27 °C → 350 °C', law: 'V', unknown: 'P2', u: { P: 'atm', V: 'L', T: 'C' }, v: { P1: '2.00', T1: '27', T2: '350' } },
  { value: 'q7', label: 'Combined: 75.0 mL at 30.0 °C, 90.4 kPa → STP', law: 'none', unknown: 'V2', u: { P: 'kPa', V: 'mL', T: 'C' }, v: { V1: '75.0', P1: '90.4', T1: '30.0' }, cond: 'STP' },
  { value: 'p1q5', label: 'Combined: freon 450 mL, 1.50 atm, 15 °C → 300 mL, 2.00 atm', law: 'none', unknown: 'T2', u: { P: 'atm', V: 'mL', T: 'C' }, v: { V1: '450', P1: '1.50', T1: '15', V2: '300', P2: '2.00' } },
];
const IDEAL_PRESETS = [
  { value: 'q9', label: 'V of 50.0 g O₂ at 1.20 atm, 27.0 °C', unknown: 'V', gas: 'O2', u: { P: 'atm', V: 'L', T: 'C', A: 'g' }, v: { P: '1.20', T: '27.0', A: '50.0' } },
  { value: 'q10', label: 'T of 0.505 mol CO₂ at 429 kPa in 3500 mL', unknown: 'T', gas: '', u: { P: 'kPa', V: 'mL', T: 'C', A: 'mol' }, v: { P: '429', V: '3500', A: '0.505' } },
  { value: 'q14', label: 'V of 2.15 mol F₂ at SATP', unknown: 'V', gas: '', cond: 'SATP', u: { P: 'kPa', V: 'L', T: 'C', A: 'mol' }, v: { A: '2.15' } },
  { value: 'q16', label: 'V of 5.20 g CH₄ at STP', unknown: 'V', gas: 'CH4', cond: 'STP', u: { P: 'kPa', V: 'L', T: 'C', A: 'g' }, v: { A: '5.20' } },
  { value: 'h1', label: 'Moles of air in a house: 600 m³, 20 °C, 98 kPa', unknown: 'A', gas: '', u: { P: 'kPa', V: 'kL', T: 'C', A: 'mol' }, v: { P: '98', V: '600', T: '20' } },
  { value: 'q18', label: 'T of CO₂ at 1.965 g/L and 100 kPa (take 1.000 L)', unknown: 'T', gas: 'CO2', u: { P: 'kPa', V: 'L', T: 'C', A: 'g' }, v: { P: '100', V: '1.000', A: '1.965' } },
];
const LAB_PRESETS = [
  { value: 'q23', label: 'Ethene over water (experimental M)', solve: 'M', gas: 'C2H4', v: { P: '96.25', V: '187.5', T: '23.6', m1: '45.038', m2: '44.832' } },
  { value: 'q24', label: 'Carbon dioxide over water (experimental R)', solve: 'R', gas: 'CO2', v: { P: '98.38', V: '235', T: '24.2', m1: '974.64', m2: '974.23' } },
];
const presetOpts = (list) => [{ value: '', label: 'Type your own' }, ...list];

export function mount(ui) {
  const qbox = section(ui.controls, 'Question');
  const mode = choice(qbox, {
    label: 'Kind of question',
    options: [
      { value: 'laws', label: 'Gas laws: one sample, state 1 → state 2' },
      { value: 'ideal', label: 'Ideal gas law and molar volume' },
      { value: 'lab', label: 'Lab: gas collected over water' },
    ],
    value: 'laws',
  });

  // --- gas laws ---
  const lbox = section(ui.controls, 'State 1 → state 2');
  const lPreset = choice(lbox, { label: 'Load a question', options: presetOpts(LAW_PRESETS), value: 'q2' });
  const law = choice(lbox, {
    label: 'Held constant',
    options: [
      { value: 'T', label: 'Temperature: Boyle’s law' },
      { value: 'P', label: 'Pressure: Charles’s law' },
      { value: 'V', label: 'Volume (rigid container): Gay-Lussac’s law' },
      { value: 'none', label: 'Nothing: combined gas law' },
    ],
    value: 'T',
  });
  const SIX = ['P1', 'V1', 'T1', 'P2', 'V2', 'T2'];
  const lUnknown = choice(lbox, { label: 'Find', options: SIX.map((k) => ({ value: k, label: sym(k) })), value: 'P2' });
  const lCond = choice(lbox, {
    label: 'State 2',
    options: [{ value: '', label: 'Given in the question' }, { value: 'STP', label: 'STP (273.15 K, 101.325 kPa)' }, { value: 'SATP', label: 'SATP (298.15 K, 100.000 kPa)' }],
    value: '',
  });
  const LU = { P: P_UNITS, V: V_UNITS, T: T_UNITS };
  const lf = {};
  for (const k of SIX) lf[k] = field(lbox, { label: sym(k), value: '', units: LU[k[0]] });

  // --- ideal gas ---
  const ibox = section(ui.controls, 'PV = nRT');
  const iPreset = choice(ibox, { label: 'Load a question', options: presetOpts(IDEAL_PRESETS), value: 'q9' });
  const iGas = choice(ibox, { label: 'Gas', options: [{ value: '', label: 'Not named: amount in moles' }, ...GAS_OPTS], value: 'O2' });
  const iUnknown = choice(ibox, {
    label: 'Find',
    options: [{ value: 'P', label: 'Pressure P' }, { value: 'V', label: 'Volume V' }, { value: 'T', label: 'Temperature T' }, { value: 'A', label: 'Amount (n, or mass m)' }],
    value: 'V',
  });
  const iCond = choice(ibox, {
    label: 'Conditions',
    options: [{ value: '', label: 'P and T given in the question' }, { value: 'STP', label: 'STP (273.15 K, 101.325 kPa)' }, { value: 'SATP', label: 'SATP (298.15 K, 100.000 kPa)' }],
    value: '',
  });
  const iP = field(ibox, { label: 'Pressure P', value: '', units: P_UNITS });
  const iV = field(ibox, { label: 'Volume V', value: '', units: V_UNITS });
  const iT = field(ibox, { label: 'Temperature', value: '', units: T_UNITS });
  const iA = field(ibox, { label: 'Amount', value: '', units: M_UNITS });

  // --- lab ---
  const bbox = section(ui.controls, 'Gas collected over water');
  const bPreset = choice(bbox, { label: 'Load a question', options: presetOpts(LAB_PRESETS), value: 'q23' });
  const bGas = choice(bbox, { label: 'Gas', options: GAS_OPTS.filter((o) => o.gas.formula), value: 'C2H4' });
  const bSolve = choice(bbox, {
    label: 'Find',
    options: [{ value: 'M', label: 'Experimental molar mass M' }, { value: 'R', label: 'Experimental gas constant R' }],
    value: 'M',
  });
  const bP = field(bbox, { label: 'Pressure of the gas', value: '', units: [P_UNITS[0]] });
  const bV = field(bbox, { label: 'Volume of the gas', value: '', units: [V_UNITS[1]] });
  const bT = field(bbox, { label: 'Temperature of the water and gas', value: '', units: [T_UNITS[0]] });
  const bm1 = field(bbox, { label: 'Initial mass of the canister', value: '', units: [M_UNITS[0]] });
  const bm2 = field(bbox, { label: 'Final mass of the canister', value: '', units: [M_UNITS[0]] });

  const loadLaw = (p) => {
    if (!p) return;
    law.value = p.law;
    lUnknown.value = p.unknown;
    lCond.value = p.cond ?? '';
    for (const k of SIX) {
      lf[k].text = p.v[k] ?? '';
      lf[k].unit = p.u[k[0]];
    }
  };
  const loadIdeal = (p) => {
    if (!p) return;
    iGas.value = p.gas;
    iUnknown.value = p.unknown;
    iCond.value = p.cond ?? '';
    for (const [k, f] of Object.entries({ P: iP, V: iV, T: iT, A: iA })) {
      f.text = p.v[k] ?? '';
      f.unit = p.u[k];
    }
  };
  const loadLab = (p) => {
    if (!p) return;
    bGas.value = p.gas;
    bSolve.value = p.solve;
    [[bP, 'P'], [bV, 'V'], [bT, 'T'], [bm1, 'm1'], [bm2, 'm2']].forEach(([f, k]) => (f.text = p.v[k]));
  };
  lPreset.onChange((v) => loadLaw(LAW_PRESETS.find((p) => p.value === v)));
  iPreset.onChange((v) => loadIdeal(IDEAL_PRESETS.find((p) => p.value === v)));
  bPreset.onChange((v) => loadLab(LAB_PRESETS.find((p) => p.value === v)));
  loadLaw(LAW_PRESETS[0]);
  loadIdeal(IDEAL_PRESETS[0]);
  loadLab(LAB_PRESETS[0]);
  // The amount field reads moles for an unnamed gas, a mass for a named one.
  iGas.onChange((v) => (iA.unit = v ? 'g' : 'mol'));

  const out = readouts(ui.readouts, [
    { id: 's1', label: 'Given' },
    { id: 's2', label: 'Equation' },
    { id: 's3', label: 'Substitute' },
    { id: 's4', label: 'Then' },
    { id: 'ans', label: 'Answer' },
    { id: 'kmt', label: 'Particles' },
  ]);
  const dl = ui.readouts.lastElementChild;
  const rows = [...dl.children];

  const canvas = fitCanvas(ui.canvas);
  const restart = () => (clock.pause(), clock.reset());
  const clock = createClock(ui.transport, { frame: draw, onReset: () => (hits.length = 0) });
  [mode, lPreset, law, lUnknown, lCond, iPreset, iGas, iUnknown, iCond, bPreset, bGas, bSolve].forEach((c) => c.onChange(restart));
  ui.controls.addEventListener('input', restart);

  const shown = (node, on) => {
    const d = on ? '' : 'none';
    if (node.style.display !== d) node.style.display = d;
  };
  // Steps are dt/dd pairs; an empty step hides its row.
  const step = (id, s) => {
    out.set(id, s || '');
    const i = ['s1', 's2', 's3', 's4', 'ans', 'kmt'].indexOf(id);
    shown(rows[2 * i], !!s);
    shown(rows[2 * i + 1], !!s);
  };

  // Decorative particles in a unit box; speed ∝ √T (ARCHITECTURE.md §4).
  const N = 36;
  const rnd = (k) => {
    const x = Math.sin(k * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  };
  const parts = Array.from({ length: N }, (_, i) => {
    const a = rnd(i + 0.5) * 2 * Math.PI;
    return { x: 0.05 + 0.9 * rnd(i + 100), y: 0.05 + 0.9 * rnd(i + 200), vx: Math.cos(a), vy: Math.sin(a) };
  });
  const hits = [];

  function draw(clk, dSim) {
    const m = mode.value;
    shown(lbox, m === 'laws');
    shown(ibox, m === 'ideal');
    shown(bbox, m === 'lab');
    const { ctx, w, h } = canvas;
    clear(ctx, w, h);
    const r = m === 'laws' ? solveLaws() : m === 'ideal' ? solveIdeal() : solveLab();
    if (r.error) {
      ['s1', 's2', 's3', 's4', 'kmt'].forEach((id) => step(id, ''));
      step('ans', `— ${r.error}`);
      text(ctx, r.error, w / 2, h / 2, { color: theme().danger, size: 14, weight: 650, align: 'center' });
      clock.setTimeLabel('');
      return;
    }
    const narrow = w < 620;
    const box = narrow ? { x: 16, y: 16, w: w - 32, h: h * 0.5 - 24 } : { x: 16, y: 16, w: w * 0.42, h: h - 32 };
    const rest = narrow ? { x: 16, y: h * 0.5 + 8, w: w - 32, h: h * 0.5 - 24 } : { x: w * 0.46, y: 16, w: w * 0.54 - 24, h: h - 32 };
    const p = r.animate ? Math.min(1, clk.t / 3) : 1;
    if (m === 'lab') return drawLab(ctx, { x: 16, y: 16, w: w - 32, h: h - 32 }, r);
    drawContainer(ctx, box, r, p, dSim);
    if (m === 'laws') drawGraph(ctx, rest, r, p);
    else drawIdealPanel(ctx, rest, r);
    clock.setTimeLabel(r.animate ? (clk.t === 0 ? 'Play: state 1 → state 2' : p < 1 ? 'changing…' : 'state 2') : '');
  }

  // --- solving: every number below comes from chem/gases.js ---
  const read = (f) => G.reading(f.text);
  const tK = (f) => G.kelvin(read(f), f.unit);
  const kStr = (r) => r.shown.toFixed(r.dp);

  function tempStep(label, f, t) {
    if (f.unit !== 'C') return '';
    return `${label} = ${f.text.trim().replace(/^-/, "−")} °C + 273.15 = ${kStr(t)} K`;
  }

  function solveLaws() {
    const hold = law.value === 'none' ? null : law.value;
    const unknown = lUnknown.value;
    if (hold && unknown[0] === hold) return { error: `${law.option.label.split(':')[0]} is held constant, so it cannot be the unknown: pick another to find` };
    const cond = lCond.value ? G.conditions[lCond.value] : null;
    if (cond && (unknown === 'P2' || unknown === 'T2')) return { error: `${lCond.value} fixes P₂ and T₂: pick another to find` };
    const units = { P: unitOf(P_UNITS, lf.P1.unit), V: unitOf(V_UNITS, lf.V1.unit) };
    // One unit per quantity for both states, so the ratio is unit-free.
    lf.P2.unit = lf.P1.unit;
    lf.V2.unit = lf.V1.unit;
    lf.T2.unit = lf.T1.unit;
    const known = {};
    const sigs = [];
    const t = {};
    const used = SIX.filter((k) => k !== unknown && k[0] !== hold);
    for (const k of SIX) lf[k].show(used.includes(k) && !(cond && k[1] === '2' && k[0] !== 'V'));
    for (const k of used) {
      if (cond && k[1] === '2' && k[0] !== 'V') {
        known[k] = k[0] === 'T' ? cond.T : cond.P / units.P.k;
        continue;
      }
      if (k[0] === 'T') {
        t[k] = tK(lf[k]);
        if (t[k].error) return { error: `${sym(k)}: ${t[k].error}` };
        known[k] = t[k].K;
        sigs.push(t[k].sig);
      } else {
        const v = read(lf[k]);
        if (v.error) return { error: `${sym(k)}: ${v.error}` };
        known[k] = v.value;
        sigs.push(v.sig);
      }
    }
    const v = G.combined(known, unknown, hold);
    if (v.error) return v;
    const sig = G.answerSig(...sigs);

    // P1V1T2 = P2V2T1 without the held variable, solved for the unknown.
    const left = ['P1', 'V1', 'T2'].filter((k) => k[0] !== hold);
    const right = ['P2', 'V2', 'T1'].filter((k) => k[0] !== hold);
    const [mine, other] = left.includes(unknown) ? [left, right] : [right, left];
    const den = mine.filter((k) => k !== unknown);
    const valStr = (k) => {
      if (k[0] === 'T') return `${t[k] ? kStr(t[k]) : fmt(v[k], 5)} K`;
      const u = k[0] === 'P' ? units.P.value : units.V.value;
      return `${cond && k[1] === '2' && k[0] === 'P' ? Number(v[k].toPrecision(6)) : lf[k].text} ${u}`;
    };
    const eq = `${sym(unknown)} = ${other.map(sym).join('')} ÷ ${den.length > 1 ? `(${den.map(sym).join('')})` : sym(den[0])}`;
    const sub = `${sym(unknown)} = ${other.map(valStr).join(' × ')} ÷ ${den.length > 1 ? `(${den.map(valStr).join(' × ')})` : valStr(den[0])}`;
    let ans;
    if (unknown[0] === 'T') {
      const c = G.celsius(v[unknown], sig);
      ans = `${sym(unknown)} = ${fmt(v[unknown], sig)} K = ${fixed(c.value, c.dp)} °C (${sig} sig fig${sig === 1 ? '' : 's'})`;
    } else {
      ans = `${sym(unknown)} = ${fmt(v[unknown], sig)} ${unknown[0] === 'P' ? units.P.value : units.V.value} (${sig} sig fig${sig === 1 ? '' : 's'})`;
    }
    const temps = ['T1', 'T2'].filter((k) => t[k] && lf[k].unit === 'C').map((k) => tempStep(sym(k), lf[k], t[k]));
    step('s1', temps.join('; '));
    step('s2', `${hold ? { T: 'Boyle', P: 'Charles', V: 'Gay-Lussac' }[hold] + ': ' : ''}${eq}`);
    step('s3', sub);
    step('s4', cond ? `${lCond.value}: ${cond.T} K and ${Number((cond.P / units.P.k).toPrecision(6))} ${units.P.value} are definitions, so they do not limit the sig figs` : '');
    step('ans', ans);
    const dV = v.V2 / v.V1;
    const dT = v.T2 / v.T1;
    const dP = v.P2 / v.P1;
    const word = (x, up, down, same = 'stays the same') => (x > 1.0005 ? up : x < 0.9995 ? down : same);
    step('kmt', `The particles’ kinetic energy (∝ T) ${word(dT, 'increases', 'decreases')}; the space between them ${word(dV, 'increases', 'decreases')}; collisions with the walls ${word(dP, 'increase', 'decrease', 'stay the same')}, so the pressure ${word(dP, 'increases', 'decreases')}.`);
    return { animate: true, law: hold ?? 'none', v, units, rigid: hold === 'V' };
  }

  function solveIdeal() {
    const unknown = iUnknown.value;
    const g = iGas.option.gas ?? null;
    const cond = iCond.value ? G.conditions[iCond.value] : null;
    iA.row.querySelector('label').textContent = g ? `Mass of ${g.name}` : 'Amount n';
    const sel = iA.row.querySelector('select');
    const want = g ? M_UNITS : N_UNITS;
    if (sel.options[0].value !== want[0].value) {
      sel.replaceChildren(...want.map((u) => el('option', { value: u.value, text: u.label })));
      sel.value = want[0].value;
    }
    iP.show(unknown !== 'P' && !cond);
    iT.show(unknown !== 'T' && !cond);
    iV.show(unknown !== 'V');
    iA.show(unknown !== 'A');
    if (cond && (unknown === 'P' || unknown === 'T')) return { error: `At ${iCond.value}, P and T are fixed: pick V or the amount to find` };
    const pu = unitOf(P_UNITS, iP.unit);
    const vu = unitOf(V_UNITS, iV.unit);
    const au = unitOf(want, iA.unit) ?? want[0];
    const known = {};
    const sigs = [4]; // R = 8.314
    const steps = [];
    let tRead = null;
    if (cond) {
      known.P = cond.P;
      known.T = cond.T;
    } else {
      if (unknown !== 'P') {
        const v = read(iP);
        if (v.error) return { error: `P: ${v.error}` };
        known.P = v.value * pu.k;
        sigs.push(v.sig);
        if (pu.value === 'atm') steps.push(`P = ${iP.text} atm × 101.325 kPa/atm = ${fmt(known.P, v.sig)} kPa`);
      }
      if (unknown !== 'T') {
        tRead = tK(iT);
        if (tRead.error) return { error: `T: ${tRead.error}` };
        known.T = tRead.K;
        sigs.push(tRead.sig);
        if (iT.unit === 'C') steps.push(tempStep('T', iT, tRead));
      }
    }
    if (unknown !== 'V') {
      const v = read(iV);
      if (v.error) return { error: `V: ${v.error}` };
      known.V = v.value * vu.k;
      sigs.push(v.sig);
      if (vu.value !== 'L') steps.push(`V = ${iV.text} ${vu.value} = ${fmt(known.V, v.sig)} L`);
    }
    let mass = null;
    if (unknown !== 'A') {
      const v = read(iA);
      if (v.error) return { error: `${g ? 'm' : 'n'}: ${v.error}` };
      sigs.push(v.sig);
      if (g) {
        mass = v.value * au.k;
        known.n = mass / g.M;
        sigs.push(G.molarMassSig(g.M));
        steps.push(`n = m/M = ${fmt(mass, v.sig)} g ÷ ${fixed(g.M, 2)} g/mol = ${fmt(known.n, Math.min(v.sig, G.molarMassSig(g.M)))} mol`);
      } else {
        known.n = v.value * au.k;
      }
    }
    const key = unknown === 'A' ? 'n' : unknown;
    const res = G.ideal(known, key);
    if (res.error) return res;
    const sig = G.answerSig(...sigs);
    const exprs = { P: 'P = nRT/V', V: 'V = nRT/P', n: 'n = PV/(RT)', T: 'T = PV/(nR)' };
    // Given values as typed (or as converted, with one guard digit), so the
    // substitution reads like the student's own line.
    const q = {
      P: cond ? `${cond.P} kPa` : pu.value === 'kPa' ? `${iP.text} kPa` : `${fmt(res.P, read(iP).sig + 1)} kPa`,
      V: vu.value === 'L' ? `${iV.text} L` : `${fmt(res.V, read(iV).sig)} L`,
      n: g ? `${fmt(res.n, G.answerSig(read(iA).sig, G.molarMassSig(g.M)) + 1)} mol` : au.value === 'mol' ? `${iA.text} mol` : `${fmt(res.n, read(iA).sig)} mol`,
      T: cond ? `${cond.T} K` : `${tRead && iT.unit === 'C' ? kStr(tRead) : iT.text} K`,
    };
    const parts = { P: ['n', 'R', 'T', 'V'], V: ['n', 'R', 'T', 'P'], n: ['P', 'V', 'R', 'T'], T: ['P', 'V', 'n', 'R'] }[key];
    const val = (k) => (k === 'R' ? '8.314 (L·kPa)/(K·mol)' : q[k]);
    const sub = key === 'n' || key === 'T'
      ? `${key} = ${val(parts[0])} × ${val(parts[1])} ÷ (${val(parts[2])} × ${val(parts[3])})`
      : `${key} = ${val(parts[0])} × ${val(parts[1])} × ${val(parts[2])} ÷ ${val(parts[3])}`;
    let ans;
    if (key === 'T') {
      const c = G.celsius(res.T, sig);
      ans = `T = ${fmt(res.T, sig)} K = ${fixed(c.value, c.dp)} °C`;
    } else if (key === 'n') {
      ans = g ? `n = ${fmt(res.n, sig)} mol, m = nM = ${fmt(res.n * g.M, sig)} g` : `n = ${fmt(res.n, sig)} mol`;
    } else if (key === 'V') {
      ans = `V = ${fmt(res.V, sig)} L${vu.value !== 'L' ? ` = ${fmt(res.V / vu.k, sig)} ${vu.value}` : ''}`;
    } else {
      ans = `P = ${fmt(res.P, sig)} kPa${pu.value === 'atm' ? ` = ${fmt(res.P / ATM, sig)} atm` : ''}`;
    }
    let mv = '';
    if (cond) {
      const Vm = G.molarVolumeRounded(cond);
      const sigMv = G.answerSig(...sigs.slice(1), 3);
      mv = key === 'V'
        ? `Molar volume: V = nV_m = ${fmt(known.n, sigMv)} mol × ${Vm} L/mol = ${fmt(known.n * Vm, sigMv)} L`
        : `Molar volume: n = V ÷ V_m = ${fmt(known.V, sigMv)} L ÷ ${Vm} L/mol = ${fmt(known.V / Vm, sigMv)} mol${g ? ` (m = ${fmt((known.V / Vm) * g.M, sigMv)} g)` : ''}`;
      mv = mv.replace(/V_m/g, 'Vₘ');
    }
    step('s1', steps.join('; ') || (cond ? `${iCond.value}: T = ${cond.T} K, P = ${cond.P} kPa (definitions: they do not limit the sig figs)` : ''));
    step('s2', exprs[key]);
    step('s3', sub);
    step('s4', mv);
    step('ans', `${ans} (${sig} sig fig${sig === 1 ? '' : 's'})`);
    const n = res.n;
    const m = g ? n * g.M : null;
    step('kmt', g ? `Density m/V = ${fmt(m / res.V, sig)} g/L. Equal volumes at the same T and P hold the same number of molecules (Avogadro), but heavier molecules give more grams per litre.` : 'Equal volumes of any gas at the same T and P hold the same amount in moles (Avogadro).');
    return { animate: false, ideal: res, gas: g };
  }

  function solveLab() {
    const g = bGas.option.gas;
    const P = read(bP);
    const V = read(bV);
    const T = tK(bT);
    const m1 = read(bm1);
    const m2 = read(bm2);
    for (const [name, x] of [['P', P], ['V', V], ['T', T], ['initial mass', m1], ['final mass', m2]]) if (x.error) return { error: `${name}: ${x.error}` };
    const lost = G.massLost(m1, m2);
    if (lost.error) return lost;
    const Vl = V.value / 1000;
    const sigs = [P.sig, V.sig, T.sig, lost.sig, 4];
    const sig = G.answerSig(...sigs);
    const Msig = G.molarMassSig(g.M);
    const dps = Math.max(0, Math.min(m1.dp, m2.dp));
    step('s1', `m = ${bm1.text} g − ${bm2.text} g = ${lost.m.toFixed(dps)} g (addition rule: ${lost.sig} sig fig${lost.sig === 1 ? '' : 's'}); ${tempStep('T', bT, T)}; V = ${bV.text} mL = ${fmt(Vl, V.sig)} L`);
    let exp;
    let pred;
    if (bSolve.value === 'M') {
      exp = G.labMolarMass({ m: lost.m, P: P.value, V: Vl, T: T.K });
      pred = g.M;
      step('s2', `Predicted M from ${species(g.formula)}: ${fixed(g.M, 2)} g/mol`);
      step('s3', `M = mRT/(PV) = ${lost.m.toFixed(dps)} g × 8.314 (L·kPa)/(K·mol) × ${kStr(T)} K ÷ (${bP.text} kPa × ${fmt(Vl, V.sig)} L) = ${fmt(exp, sig)} g/mol`);
    } else {
      const n = lost.m / g.M;
      exp = G.labR({ m: lost.m, M: g.M, P: P.value, V: Vl, T: T.K });
      pred = R;
      step('s2', `n = m/M = ${lost.m.toFixed(dps)} g ÷ ${fixed(g.M, 2)} g/mol = ${fmt(n, Math.min(lost.sig, Msig))} mol`);
      step('s3', `R = PV/(nT) = ${bP.text} kPa × ${fmt(Vl, V.sig)} L ÷ (${fmt(n, Math.min(lost.sig, Msig))} mol × ${kStr(T)} K) = ${fmt(exp, sig)} (L·kPa)/(K·mol)`);
    }
    const pd = G.percentDifference(exp, pred);
    step('s4', `% difference = |${fmt(exp, sig)} − ${bSolve.value === 'M' ? fixed(pred, 2) : '8.314'}| ÷ ${bSolve.value === 'M' ? fixed(pred, 2) : '8.314'} × 100 % = ${fmt(pd, 2)} %`);
    step('ans', `${bSolve.value === 'M' ? 'M' : 'R'} = ${fmt(exp, sig)} ${bSolve.value === 'M' ? 'g/mol' : '(L·kPa)/(K·mol)'} (${sig} sig fig${sig === 1 ? '' : 's'}), ${fmt(pd, 2)} % from the predicted value`);
    const w = G.overWater(g);
    step('kmt', w.polar ? `${species(g.formula)} cannot be collected over water: ${w.why}, so it dissolves in the water and the bubbles shrink before they reach the top.`
      : w.polar === false ? `${species(g.formula)} can be collected over water: ${w.why}, so it does not dissolve.`
        : `${species(g.formula)}: ${w.why}.`);
    return { animate: false, lab: true, polar: w.polar, gas: g };
  }

  // --- drawing ---
  function drawContainer(ctx, b, r, p, dSim) {
    const th = theme();
    // Volume and temperature now, as fractions for the picture.
    let vf = 0.75;
    let tf = 1;
    let pf = 0.5;
    if (r.v) {
      const { V1, V2, T1, T2, P1, P2 } = r.v;
      const Vmax = Math.max(V1, V2);
      vf = 0.3 + 0.65 * ((V1 + (V2 - V1) * p) / Vmax);
      tf = Math.sqrt((T1 + (T2 - T1) * p) / Math.max(T1, T2));
      pf = (P1 + (P2 - P1) * p) / Math.max(P1, P2);
    }
    const cw = Math.min(b.w * 0.7, 240);
    const cx = b.x + (b.w - cw) / 2;
    const bottom = b.y + b.h - 28;
    const fullH = b.h - 70;
    const top = bottom - fullH * vf;
    // Walls: thick for a rigid canister, with a piston otherwise.
    ctx.strokeStyle = th.ink;
    ctx.lineWidth = r.rigid ? 5 : 2;
    ctx.beginPath();
    ctx.moveTo(cx, bottom - fullH - 6);
    ctx.lineTo(cx, bottom);
    ctx.lineTo(cx + cw, bottom);
    ctx.lineTo(cx + cw, bottom - fullH - 6);
    ctx.stroke();
    if (r.rigid) {
      ctx.fillStyle = th.muted;
      ctx.fillRect(cx - 2, top - 6, cw + 4, 6);
    } else {
      ctx.fillStyle = th.element;
      ctx.fillRect(cx + 3, top - 10, cw - 6, 10);
      line(ctx, cx + cw / 2, top - 10, cx + cw / 2, b.y + 4, { color: th.element, width: 5 });
    }
    // Particles.
    const ih = bottom - top - 3;
    const speed = 0.35 * tf;
    const now = performance.now();
    for (const q of parts) {
      q.x += q.vx * speed * dSim;
      q.y += q.vy * speed * dSim * (0.75 / vf);
      if (q.x < 0.02 || q.x > 0.98) {
        q.vx *= -1;
        q.x = Math.min(0.98, Math.max(0.02, q.x));
        hits.push({ x: q.x < 0.5 ? cx : cx + cw, y: top + 3 + q.y * ih, t: now });
      }
      if (q.y < 0.02 || q.y > 0.98) {
        q.vy *= -1;
        q.y = Math.min(0.98, Math.max(0.02, q.y));
        hits.push({ x: cx + q.x * cw, y: q.y < 0.5 ? top + 3 : bottom, t: now });
      }
      ctx.fillStyle = th.seriesA;
      ctx.beginPath();
      ctx.arc(cx + q.x * cw, top + 3 + q.y * ih, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    while (hits.length && now - hits[0].t > 250) hits.shift();
    for (const hp of hits) {
      ctx.fillStyle = th.exo;
      ctx.globalAlpha = 1 - (now - hp.t) / 250;
      ctx.beginPath();
      ctx.arc(hp.x, hp.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Pressure gauge, needle ∝ P.
    if (r.v) {
      const gx = cx + cw + 30;
      const gy = b.y + 40;
      const gr = 22;
      if (gx + gr < b.x + b.w + 20) {
        ctx.strokeStyle = th.ink;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(gx, gy, gr, 0, Math.PI * 2);
        ctx.stroke();
        const a = Math.PI * (0.75 + 1.5 * pf * 0.9);
        line(ctx, gx, gy, gx + Math.cos(a) * gr * 0.8, gy + Math.sin(a) * gr * 0.8, { color: th.danger, width: 2.5 });
        text(ctx, 'P', gx, gy + gr + 12, { color: th.muted, size: 11, align: 'center' });
      }
    }
    const cap = r.rigid ? 'rigid canister: V fixed' : r.v ? 'piston: V can change' : 'gas sample';
    text(ctx, cap, cx + cw / 2, bottom + 16, { color: th.muted, size: 12, align: 'center' });
  }

  function drawGraph(ctx, b, r, p) {
    const th = theme();
    const { v, units, law: lw } = r;
    const pts = [1, 2].map((s) => ({ P: v[`P${s}`], V: v[`V${s}`], t: v[`T${s}`] - KELVIN_OFFSET }));
    let xLabel;
    let yLabel;
    let X;
    let Y;
    let curve;
    if (lw === 'T') {
      xLabel = `V (${units.V.value})`;
      yLabel = `P (${units.P.value})`;
      X = (q) => q.V;
      Y = (q) => q.P;
      const k = pts[0].P * pts[0].V;
      curve = (x) => k / x;
    } else {
      xLabel = 't (°C)';
      yLabel = lw === 'P' ? `V (${units.V.value})` : lw === 'V' ? `P (${units.P.value})` : `PV (${units.P.value}·${units.V.value})`;
      X = (q) => q.t;
      Y = (q) => (lw === 'P' ? q.V : lw === 'V' ? q.P : q.P * q.V);
      const s = Y(pts[0]) / (pts[0].t + KELVIN_OFFSET);
      curve = (x) => s * (x + KELVIN_OFFSET);
    }
    const xs = pts.map(X);
    const xMin = lw === 'T' ? 0 : -300;
    const xMax = Math.max(...xs) * (lw === 'T' ? 1.25 : 1) + (lw === 'T' ? 0 : 60);
    const yMax = Math.max(...pts.map(Y), curve(xMax)) * 1.1;
    const L = b.x + 44;
    const Rr = b.x + b.w - 8;
    const T = b.y + 20;
    const B = b.y + b.h - 34;
    const px = (x) => L + ((x - xMin) / (xMax - xMin)) * (Rr - L);
    const py = (y) => B - (y / yMax) * (B - T);
    line(ctx, L, B, Rr, B, { color: th.ink });
    line(ctx, L, B, L, T, { color: th.ink });
    if (lw !== 'T') {
      line(ctx, px(0), B, px(0), T, { color: th.grid });
      text(ctx, '0', px(0), B + 12, { color: th.muted, size: 11, align: 'center' });
      text(ctx, '−273.15', px(-KELVIN_OFFSET), B + 12, { color: th.muted, size: 11, align: 'center' });
    }
    text(ctx, xLabel, Rr, B + 26, { color: th.muted, size: 12, align: 'right' });
    text(ctx, yLabel, L - 36, T - 10, { color: th.muted, size: 12 });
    ctx.save();
    ctx.strokeStyle = th.ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    const x0 = lw === 'T' ? (xMax - xMin) / 40 : -KELVIN_OFFSET;
    let started = false;
    for (let i = 0; i <= 120; i++) {
      const x = x0 + ((xMax - x0) * i) / 120;
      const y = curve(x);
      if (y > yMax) continue; // Boyle's curve runs off the top at small V
      started ? ctx.lineTo(px(x), py(y)) : ctx.moveTo(px(x), py(y));
      started = true;
    }
    ctx.stroke();
    ctx.restore();
    if (lw !== 'T') {
      // The straight line extrapolates to zero at −273.15 °C (absolute zero).
      line(ctx, px(-KELVIN_OFFSET), py(0), px(-KELVIN_OFFSET), py(0) - 6, { color: th.danger, width: 3 });
      text(ctx, 'absolute zero', px(-KELVIN_OFFSET) + 4, py(0) - 14, { color: th.danger, size: 11 });
    }
    const dot = (q, color, label) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(px(X(q)), py(Y(q)), 6, 0, Math.PI * 2);
      ctx.fill();
      text(ctx, label, px(X(q)) + 9, py(Y(q)) - 10, { color, size: 12, weight: 650 });
    };
    dot(pts[0], th.seriesA, '1');
    dot(pts[1], th.seriesB, '2');
    if (p > 0 && p < 1) {
      const lerp = (k) => pts[0][k] + (pts[1][k] - pts[0][k]) * p;
      const q = { P: lerp('P'), V: lerp('V'), t: lerp('t') };
      ctx.strokeStyle = th.ink;
      ctx.beginPath();
      ctx.arc(px(X(q)), py(Y(q)), 6, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawIdealPanel(ctx, b, r) {
    const th = theme();
    const { P, V, n, T } = r.ideal;
    const lines = [
      `P = ${fmt(P, 4)} kPa`,
      `V = ${fmt(V, 4)} L`,
      `n = ${fmt(n, 4)} mol`,
      `T = ${fmt(T, 4)} K`,
      `PV ÷ nT = ${fmt((P * V) / (n * T), 4)} = R`,
    ];
    text(ctx, 'PV = nRT', b.x + 8, b.y + 24, { size: 18, weight: 700 });
    lines.forEach((s, i) => text(ctx, s, b.x + 8, b.y + 60 + i * 26, { size: 14, color: i === 4 ? th.muted : th.ink }));
    if (r.gas) text(ctx, `${r.gas.formula ? species(r.gas.formula) : r.gas.name}: M = ${fixed(r.gas.M, 2)} g/mol`, b.x + 8, b.y + 60 + 5 * 26 + 8, { size: 13, color: th.muted });
  }

  function drawLab(ctx, b, r) {
    const th = theme();
    // A trough of water with an inverted graduated cylinder; bubbles rise from the canister.
    const tw = Math.min(b.w - 16, 260);
    const tx = b.x + (b.w - tw) / 2;
    const ty = b.y + b.h * 0.45;
    const tb = b.y + b.h - 20;
    ctx.fillStyle = th.seriesA + '33';
    ctx.fillRect(tx, ty, tw, tb - ty);
    ctx.strokeStyle = th.ink;
    ctx.lineWidth = 2;
    ctx.strokeRect(tx, ty, tw, tb - ty);
    const cw = 44;
    const cx = tx + tw * 0.6;
    const ctop = b.y + 16;
    ctx.fillStyle = th.seriesA + '33';
    ctx.fillRect(cx, ctop + (r.polar ? 0 : 60), cw, tb - 30 - ctop - (r.polar ? 0 : 60));
    ctx.strokeRect(cx, ctop, cw, tb - 30 - ctop);
    text(ctx, r.polar ? 'no gas collects' : 'gas collected', cx + cw + 6, ctop + 30, { color: r.polar ? th.danger : th.muted, size: 12 });
    const t = performance.now() / 1000;
    for (let i = 0; i < 6; i++) {
      const f = (t * 0.4 + i / 6) % 1;
      const y = tb - 30 - f * (tb - 30 - (ctop + 60));
      if (r.polar && f > 0.45) continue;
      ctx.strokeStyle = th.seriesA;
      ctx.beginPath();
      ctx.arc(cx + cw / 2 + Math.sin(i * 2 + t) * 6, y, r.polar ? 4 * (1 - f / 0.45) + 1 : 4, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = th.element;
    roundRect(ctx, tx + 16, tb - 50, 34, 44, 4);
    ctx.fill();
    text(ctx, 'canister', tx + 33, tb - 58, { color: th.muted, size: 11, align: 'center' });
    line(ctx, tx + 50, tb - 30, cx + cw / 2, tb - 30, { color: th.element, width: 3 });
  }
}
