import * as H from '../chem/hess.js';
import { molarMass } from '../chem/electrolysis.js';
import { fitCanvas, theme, clear, line, text, arrow, niceStep } from '../lib/canvas.js';
import { section, slider, choice, readouts, el } from '../lib/controls.js';
import { createClock } from '../lib/clock.js';
import { fmt, fixed, species as formula } from '../lib/format.js';

// Four given equations need the height on a phone.
export const tallOnMobile = true;

export const equations = [
  { html: 'Δ<sub>r</sub>H° = Σ nΔ<sub>f</sub>H°<sub>products</sub> − Σ nΔ<sub>f</sub>H°<sub>reactants</sub>', what: 'n = coefficient in the balanced equation' },
  { html: 'Δ<sub>f</sub>H° = 0', what: 'for an element in its standard state: O₂(g), H₂(g), N₂(g), C(s), Al(s), Fe(s)' },
  { html: 'ΔH = nΔ<sub>r</sub>H', what: 'n = amount of the substance Δ<sub>r</sub>H is quoted per' },
  { html: 'ΔH &lt; 0 exothermic, ΔH &gt; 0 endothermic', what: 'the sign is the change in the system’s enthalpy' },
  { html: 'ΔH = (n ÷ coefficient) × ΔH<sub>equation</sub>', what: 'a ΔH given for an equation is per the coefficients as written (½ O₂ means per ½ mol)' },
  { html: 'reverse an equation → change the sign of ΔH; multiply it by k → multiply ΔH by k', what: 'Hess’s law by adding equations: species on both sides cancel, and the ΔH values add' },
  { html: 'ΔH = nΔ<sub>fus</sub>H or nΔ<sub>vap</sub>H, n = m/M', what: 'phase change: the molar enthalpy is given in the question; melting and boiling absorb heat' },
];

export const prompts = [
  'Unknown ΔfH°: ethanol’s molar enthalpy of combustion is −1366.8 kJ/mol. Find ΔfH° of ethanol by hand, then pick “Combustion of ethanol”, solve for the unknown ΔfH° and check.',
  'Adding equations: find ΔH for C(s) + ½ O₂(g) → CO(g) from the two combustion equations. Which one do you reverse, and why?',
  'Adding equations, diborane: four given equations. Start with the one that has B₂H₆ in it — which side does it need to be on?',
  'Given equation: SO₂(g) + ½ O₂(g) → SO₃(g), ΔH = −96.4 kJ. How much heat is released when 1.60 g of O₂ is consumed? Why divide by ½?',
  'Phase change: how much heat is needed to melt 9.0 g of solid aluminium? Its molar heat of fusion is 10.7 kJ/mol.',
  'Phase change, backwards: 40.0 g of chloroform, CHCl₃, condenses and liberates 9.87 kJ. Find its molar heat of vaporization with “Solve for”.',
  'Phase change, for the mass: ammonia condenses and releases 10.0 kJ; its ΔvapH is 23.3 kJ/mol. What mass condensed?',
  'Phase change: switch to freezing with the same aluminium. What happens to the sign of ΔH, and why not its size?',
  'Predict: does burning methane release more energy when the water forms as a liquid or as a vapour? Switch the water state and check. Where did the difference go?',
  'Calculate Δ<sub>r</sub>H for the thermite reaction by hand from the Data Booklet, then compare with the readout. Why do Al(s) and Fe(s) add nothing?',
  'Compare cellular respiration with photosynthesis. What happens to Δ<sub>r</sub>H when an equation is reversed?',
  'The butane equation burns 2 mol of butane. Why is Δ<sub>r</sub>H per mole of butane half of Δ<sub>r</sub>H for the equation?',
  'Play the Hess route: break the reactants into elements, then build the products. Why does it land on the same Δ<sub>r</sub>H as the direct arrow?',
];

export const legend = [
  { color: 'reactant', label: 'reactants' },
  { color: 'product', label: 'products' },
  { color: 'element', label: 'elements (ΔfH° = 0)' },
  { color: 'exo', label: 'exothermic ΔrH' },
  { color: 'endo', label: 'endothermic ΔrH' },
];

const side = (list) => list.map(([n, s]) => (n === 1 ? '' : `${n} `) + formula(s)).join(' + ');
// Endothermic values carry an explicit + as students write them.
const signed = (v) => (v > 0 ? '+' : '') + fixed(v, 1);
// Substances for the phase-change questions; M from the booklet's periodic table.
const SUBSTANCES = [
  ['Al', 'aluminium'], ['Fe', 'iron'], ['Cu', 'copper'], ['Pb', 'lead'], ['Ag', 'silver'], ['Au', 'gold'],
  ['H2O', 'water'], ['NaCl', 'sodium chloride'], ['NH3', 'ammonia'], ['C2H5OH', 'ethanol'], ['CH4', 'methane'], ['CHCl3', 'chloroform'],
].map(([f, name]) => ({ value: f, label: `${formula(f)}, ${name}` }));
// Substances for "given ΔH for an equation" questions; M from the booklet.
const EQ_SUBSTANCES = [
  'O2', 'H2', 'N2', 'C', 'S', 'Al', 'Fe', 'Mg', 'CH4', 'C3H8', 'C4H10', 'C8H18', 'CH3OH', 'C2H5OH', 'C6H12O6',
  'CO', 'CO2', 'H2O', 'NO', 'NO2', 'N2O4', 'NH3', 'SO2', 'SO3', 'Fe2O3', 'Al2O3', 'CaCO3', 'CaO', 'HCl', 'NaOH', 'NaCl',
].map((f) => ({ value: f, label: formula(f) }));
// Coefficients as the equation prints them: ½, 3/2, 2.
const coefText = (k) => (k === 0.5 ? '½' : Number.isInteger(k) ? String(k) : `${k * 2}/2`);
const PROCESS = [
  { value: 'melting', label: 'Melting (s → l), +ΔfusH' },
  { value: 'freezing', label: 'Freezing (l → s), −ΔfusH' },
  { value: 'vaporizing', label: 'Vaporizing (l → g), +ΔvapH' },
  { value: 'condensing', label: 'Condensing (g → l), −ΔvapH' },
];
// Coefficients after multiplying: ½, 3/2, 5/2, 2 as students write them.
const coefOf = (n) => (n === 1 ? '' : n === 0.5 ? '½ ' : Number.isInteger(n) ? `${n} ` : Number.isInteger(n * 2) ? `${n * 2}/2 ` : `${n} `);
const USES = [
  ...[1, 2, 3, 4, 0.5].map((k) => ({ value: `f${k}`, reversed: false, k, label: `As written, × ${coefOf(k).trim() || 1}` })),
  ...[1, 2, 3, 4, 0.5].map((k) => ({ value: `r${k}`, reversed: true, k, label: `Reversed, × ${coefOf(k).trim() || 1}` })),
];
const RATE = 0.7; // Hess-route steps per second of playback; animation only

export function mount(ui) {
  const qbox = section(ui.controls, 'Question');
  const mode = choice(qbox, {
    label: 'Question type',
    options: [
      { value: 'hess', label: 'ΔrH from ΔfH° (Hess)' },
      { value: 'phase', label: 'Phase change: ΔH = nΔH (given)' },
      { value: 'equation', label: 'Given ΔH for an equation: ΔH = (n ÷ coefficient) × ΔH' },
      { value: 'add', label: 'Adding equations: reverse, multiply, cancel' },
    ],
    value: 'hess',
  });
  const gbox = section(ui.controls, 'Phase change');
  const sub = choice(gbox, { label: 'Substance', options: SUBSTANCES, value: 'Al' });
  const proc = choice(gbox, { label: 'Process', options: PROCESS, value: 'melting' });
  const solve = choice(gbox, {
    label: 'Solve for',
    options: [
      { value: 'dh', label: 'ΔH, from the molar enthalpy given' },
      { value: 'molar', label: 'Molar enthalpy, from the heat given' },
      { value: 'mass', label: 'Mass, from the heat and molar enthalpy given' },
    ],
    value: 'dh',
  });
  const mass = slider(gbox, { label: 'Mass, m', min: 0.1, max: 500, step: 0.1, value: 9, unit: 'g', digits: 1 });
  const massRow = gbox.lastElementChild;
  const given = slider(gbox, { label: 'Molar enthalpy given (ΔfusH or ΔvapH)', min: 0.01, max: 100, step: 0.01, value: 10.7, unit: 'kJ/mol', digits: 2 });
  const givenRow = gbox.lastElementChild;
  const heat = slider(gbox, { label: 'Heat absorbed or released, given', min: 0.01, max: 1000, step: 0.01, value: 9.87, unit: 'kJ', digits: 2 });
  const heatRow = gbox.lastElementChild;
  const ebox = section(ui.controls, 'Equation given');
  const eSub = choice(ebox, { label: 'Substance whose mass is known', options: EQ_SUBSTANCES, value: 'O2' });
  const eCoef = slider(ebox, { label: 'Its coefficient in the equation', min: 0.5, max: 25, step: 0.5, value: 0.5, digits: 1 });
  const eMass = slider(ebox, { label: 'Mass, m', min: 0.01, max: 1000, step: 0.01, value: 1.6, unit: 'g', digits: 2 });
  const eDH = slider(ebox, { label: 'ΔH given for the equation', min: -6000, max: 6000, step: 0.1, value: -96.4, unit: 'kJ', digits: 1 });
  const xbox = section(ui.controls, 'Equations given');
  const preset = choice(xbox, { label: 'Question', options: H.additivity.map((p) => ({ value: p.id, label: p.label })), value: 'co' });
  const uses = [0, 1, 2, 3].map((i) => {
    const c = choice(xbox, { label: `Equation (${i + 1})`, options: USES, value: 'f1' });
    return { c, row: xbox.lastElementChild };
  });
  preset.onChange(() => uses.forEach((u) => (u.c.value = 'f1')));
  const rbox = section(ui.controls, 'Reaction');
  const pick = choice(rbox, {
    label: 'Balanced equation',
    options: H.reactions.map((r) => ({ value: r.id, label: r.label })),
    value: 'methane',
  });
  const water = choice(rbox, {
    label: 'Water in the equation',
    options: [
      { value: 'l', label: 'Liquid, H₂O(l)' },
      { value: 'g', label: 'Vapour, H₂O(g)' },
    ],
    value: 'l',
  });
  const hSolve = choice(rbox, {
    label: 'Solve for',
    options: [
      { value: 'drh', label: 'ΔrH, from the booklet’s ΔfH°' },
      { value: 'dfh', label: 'Unknown ΔfH°, from a given ΔrH' },
    ],
    value: 'drh',
  });
  const hGiven = slider(rbox, { label: 'ΔrH given, per mole of the named substance', min: -6000, max: 6000, step: 0.1, value: -890.5, unit: 'kJ/mol', digits: 1 });
  const hGivenRow = rbox.lastElementChild;
  // A new reaction starts the given ΔrH at the booklet's value, which solves back to the booklet ΔfH°.
  [pick, water].forEach((c) => c.onChange(() => {
    const rx = current();
    hGiven.value = H.molarEnthalpy(rx, rx.per);
  }));
  const abox = section(ui.controls, 'Amount');
  const amount = slider(abox, { label: 'Amount reacted, n', min: 0.1, max: 10, step: 0.01, value: 1, unit: 'mol' });

  const out = readouts(ui.readouts, [
    { id: 'sr', label: 'Σ nΔ<sub>f</sub>H° reactants' },
    { id: 'sp', label: 'Σ nΔ<sub>f</sub>H° products' },
    { id: 'drh', label: 'Δ<sub>r</sub>H, equation as written' },
    { id: 'molar', label: 'Δ<sub>r</sub>H per mole' },
    { id: 'dh', label: 'ΔH for n mol' },
    { id: 'kind', label: 'Reaction is' },
  ]);
  const dl1 = ui.readouts.lastElementChild;
  const table = el('table', { class: 'data-table', style: 'margin-top: 10px' }, ui.readouts);
  const out2 = readouts(ui.readouts, [
    { id: 'M', label: 'Molar mass M' },
    { id: 'n', label: 'Amount n' },
    { id: 'm', label: 'Mass m' },
    { id: 'molar', label: 'Molar enthalpy, with its sign' },
    { id: 'prop', label: 'Δ<sub>fus</sub>H or Δ<sub>vap</sub>H (as tabulated, +)' },
    { id: 'dh', label: 'ΔH = nΔH' },
    { id: 'kind', label: 'Heat is' },
  ]);
  const dl2 = ui.readouts.lastElementChild;
  const out3 = readouts(ui.readouts, [
    { id: 'M', label: 'Molar mass M' },
    { id: 'n', label: 'n = m/M' },
    { id: 'x', label: 'Moles of reaction = n ÷ coefficient' },
    { id: 'given', label: 'ΔH for the equation as written' },
    { id: 'dh', label: 'ΔH = (n ÷ coefficient) × ΔH' },
    { id: 'kind', label: 'Heat is' },
  ]);
  const dl3 = ui.readouts.lastElementChild;
  const out5 = readouts(ui.readouts, [
    { id: 'given', label: 'Δ<sub>r</sub>H given' },
    { id: 'known', label: 'Σ nΔ<sub>f</sub>H° of the rest, products − reactants' },
    { id: 'x', label: 'Unknown Δ<sub>f</sub>H°' },
    { id: 'book', label: 'Booklet value' },
  ]);
  const dl5 = ui.readouts.lastElementChild;
  const out4 = readouts(ui.readouts, [
    { id: 'sum', label: 'ΣΔH of the equations as used' },
    { id: 'left', label: 'Still to cancel or adjust' },
    { id: 'dh', label: 'ΔH for the target equation' },
    { id: 'kind', label: 'Reaction is' },
  ]);
  const dl4 = ui.readouts.lastElementChild;

  const canvas = fitCanvas(ui.canvas);
  const clock = createClock(ui.transport, { frame: draw });
  let shown = null;
  [mode, sub, proc, solve, mass, given, heat, eSub, eCoef, eMass, eDH, pick, water, amount, hSolve, hGiven, preset, ...uses.map((u) => u.c)].forEach((c) => c.onChange(() => (clock.pause(), clock.reset())));

  const current = () => H.withWater(H.reactions.find((r) => r.id === pick.value), water.value);

  // `u` (unknown mode) replaces the named substance's booklet ΔfH° with the solved one, marked ?.
  function fillTable(rx, u) {
    table.innerHTML = '<thead><tr><th>Species</th><th>n</th><th>Δ<sub>f</sub>H°</th><th>nΔ<sub>f</sub>H°</th></tr></thead>';
    const body = el('tbody', {}, table);
    const rows = (list, last) =>
      H.terms(list).forEach((t, i) => {
        const tr = el('tr', i === list.length - 1 && last ? { class: 'after' } : {}, body);
        const q = u && t.species === rx.per;
        const dfH = q ? u.dfH : t.dfH;
        el('td', { text: formula(t.species) }, tr);
        el('td', { text: String(t.n) }, tr);
        el('td', { text: (q ? '? = ' : '') + fixed(dfH, 1) }, tr);
        el('td', { text: fixed(t.n * dfH, 1) }, tr);
      });
    rows(rx.reactants, true);
    rows(rx.products, false);
    el('caption', { text: 'kJ/mol and kJ; reactants above the line', style: 'caption-side: bottom; text-align: left; color: var(--c-muted); font-size: 12px; padding-top: 4px' }, table);
  }

  const shownIf = (node, on) => {
    const d = on ? '' : 'none';
    if (node.style.display !== d) node.style.display = d;
  };

  function draw(clk) {
    const hess = mode.value === 'hess';
    const phase = mode.value === 'phase';
    const unknown = hSolve.value === 'dfh';
    [rbox, table].forEach((n) => shownIf(n, hess));
    [abox, dl1].forEach((n) => shownIf(n, hess && !unknown));
    shownIf(dl5, hess && unknown);
    shownIf(hGivenRow, unknown);
    [gbox, dl2].forEach((n) => shownIf(n, phase));
    [ebox, dl3].forEach((n) => shownIf(n, mode.value === 'equation'));
    [xbox, dl4].forEach((n) => shownIf(n, mode.value === 'add'));
    shownIf(givenRow, solve.value !== 'molar');
    shownIf(heatRow, solve.value !== 'dh');
    shownIf(massRow, solve.value !== 'mass');
    (hess ? drawHess : phase ? drawPhase : mode.value === 'add' ? drawAdd : drawEquation)(clk);
  }

  function drawPhase(clk) {
    const f = sub.value;
    const ph = H.PHASE_CHANGES[proc.value];
    const M = molarMass(f);
    const forwards = solve.value !== 'molar'; // the molar enthalpy is an input
    const r =
      solve.value === 'dh' ? { ...H.phaseChange(mass.value, M, given.value, proc.value), m: mass.value, given: given.value }
        : solve.value === 'molar' ? { ...H.molarFromHeat(mass.value, M, heat.value, proc.value), m: mass.value }
          : H.massFromHeat(M, heat.value, given.value, proc.value);
    const absorbed = r.dH > 0;
    const sym = proc.value === 'melting' || proc.value === 'freezing' ? 'ΔfusH' : 'ΔvapH';
    out2.set('M', `${fixed(M, 2)} g/mol`);
    out2.set('n', `${fmt(r.n, 3)} mol` + (solve.value === 'mass' ? ' (n = ΔH / molar ΔH)' : ' (n = m/M)'));
    out2.set('m', solve.value === 'mass' ? `${fmt(r.m, 3)} g (m = nM)` : `${fixed(r.m, 1)} g`);
    // A given value prints as entered (10.7, 1.37); a solved one to 3 significant figures.
    out2.set('molar', forwards ? `${r.molar > 0 ? '+' : '−'}${given.value} kJ/mol` : `${absorbed ? '+' : ''}${fmt(r.molar, 3)} kJ/mol`);
    out2.set('prop', `${sym} = +${forwards ? given.value : fmt(r.given, 3)} kJ/mol`);
    out2.set('dh', `${absorbed ? '+' : ''}${fmt(r.dH, 3)} kJ`);
    out2.set('kind', absorbed ? 'absorbed (endothermic)' : 'released (exothermic)');

    twoLevel(clk, formula(`${f}(${ph.from})`), formula(`${f}(${ph.to})`), null, r.dH);
  }

  function drawEquation(clk) {
    const M = molarMass(eSub.value);
    const r = H.givenEquation(eMass.value, M, eCoef.value, eDH.value);
    const absorbed = r.dH > 0;
    out3.set('M', `${fixed(M, 2)} g/mol`);
    out3.set('n', `${fmt(r.n, 3)} mol ${formula(eSub.value)}`);
    out3.set('x', `${fmt(r.extent, 3)} mol (÷ ${coefText(eCoef.value)})`);
    out3.set('given', `${eDH.value > 0 ? '+' : ''}${fixed(eDH.value, 1)} kJ per ${coefText(eCoef.value)} mol ${formula(eSub.value)}`);
    out3.set('dh', `${absorbed ? '+' : ''}${fmt(r.dH, 3)} kJ`);
    out3.set('kind', absorbed ? 'absorbed (endothermic)' : r.dH < 0 ? 'released (exothermic)' : '—');
    twoLevel(clk, 'reactants', 'products', `${fmt(eMass.value, 3)} g ${formula(eSub.value)}: ${fmt(r.extent, 3)} × (${fixed(eDH.value, 1)} kJ)`, r.dH);
  }

  function drawAdd() {
    const { ctx, w, h } = canvas;
    const th = theme();
    const p = H.additivity.find((x) => x.id === preset.value);
    const steps = p.given.map((eq, i) => ({ eq, reversed: uses[i].c.option.reversed, k: uses[i].c.option.k }));
    const r = H.combine(steps);
    const left = H.mismatches(r, p.target);
    const done = left.length === 0;
    const signedDp = (v) => (v > 0 ? '+' : '') + fixed(v, p.dp);
    uses.forEach((u, i) => shownIf(u.row, i < p.given.length));

    out4.set('sum', `${signedDp(r.dH)} kJ`);
    out4.set('left', done ? 'nothing: the sum is the target equation' : left.map(formula).join(', '));
    out4.set('dh', done ? `${signedDp(r.dH)} kJ` : '— (target not reached yet)');
    out4.set('kind', done ? (r.dH < 0 ? 'exothermic' : 'endothermic') : '—');

    clear(ctx, w, h);
    const narrow = w < 620;
    const x0 = 12;
    const maxW = w - 24;
    // One equation as coloured terms; a term that cancels in the sum is struck through.
    const eqLine = (reactants, products, y, size, { weight = 500, strike = false } = {}) => {
      const toks = [];
      const term = (n, sp) => ({ s: coefOf(n) + formula(sp), struck: strike && !r.net.get(sp) });
      reactants.forEach(([n, sp], i) => (i && toks.push({ s: ' + ' }), toks.push(term(n, sp))));
      toks.push({ s: ' → ' });
      products.forEach(([n, sp], i) => (i && toks.push({ s: ' + ' }), toks.push(term(n, sp))));
      let sz = size;
      const width = () => (ctx.font = `${weight} ${sz}px ${th.font}`, toks.reduce((a, t) => a + ctx.measureText(t.s).width, 0));
      while (sz > 9 && width() > maxW) sz--;
      let x = x0;
      for (const t of toks) {
        const tw = ctx.measureText(t.s).width;
        text(ctx, t.s, x, y, { size: sz, weight, color: t.struck ? th.muted : th.ink });
        if (t.struck) line(ctx, x, y, x + tw, y, { color: th.danger, width: 1.5 });
        ctx.font = `${weight} ${sz}px ${th.font}`;
        x += tw;
      }
    };
    const scaled = (side, s) => side.map(([n, sp]) => [n * s, sp]);

    text(ctx, 'Target', x0, 16, { color: th.muted, size: 12 });
    eqLine(p.target.reactants, p.target.products, 36, narrow ? 14 : 16, { weight: 650 });
    const rowH = Math.min(52, (h - 170) / p.given.length);
    let y = 70;
    steps.forEach((st, i) => {
      const dH = (st.reversed ? -1 : 1) * st.k * st.eq.dH;
      const how = `(${i + 1}) ${st.reversed ? 'reversed' : 'as written'}${st.k === 1 ? '' : `, × ${coefOf(st.k).trim()}`}`;
      text(ctx, how, x0, y, { color: th.muted, size: 12 });
      text(ctx, `ΔH = ${signedDp(dH)} kJ`, w - 12, y, { color: dH < 0 ? th.exo : th.endo, size: 12, weight: 650, align: 'right' });
      const [a, b] = st.reversed ? [st.eq.products, st.eq.reactants] : [st.eq.reactants, st.eq.products];
      eqLine(scaled(a, st.k), scaled(b, st.k), y + 18, narrow ? 13 : 15, { strike: true });
      y += rowH;
    });
    line(ctx, x0, y - 6, w - 12, y - 6, { color: th.ink, width: 1.5 });
    text(ctx, 'Sum', x0, y + 10, { color: th.muted, size: 12 });
    text(ctx, `ΣΔH = ${signedDp(r.dH)} kJ`, w - 12, y + 10, { color: r.dH < 0 ? th.exo : th.endo, size: 13, weight: 700, align: 'right' });
    if (r.reactants.length || r.products.length) eqLine(r.reactants, r.products, y + 30, narrow ? 14 : 16, { weight: 650 });
    text(ctx, done ? '✓ matches the target' : 'not the target yet', x0, y + 56, {
      color: done ? th.product : th.muted, size: 13, weight: done ? 700 : 500,
    });
    clock.setTimeLabel(done ? 'target reached' : 'reverse and multiply the given equations');
  }

  // Two enthalpy levels, reactant on the left and product on the right; the
  // higher-enthalpy side sits higher, so the ΔH arrow points up when heat is absorbed.
  function twoLevel(clk, s0, s1, title, dH) {
    const { ctx, w, h } = canvas;
    const th = theme();
    const absorbed = dH > 0;
    clear(ctx, w, h);
    const narrow = w < 620;
    text(ctx, title ?? `${s0} → ${s1}`, w / 2, 22, { size: narrow ? 13 : 16, weight: 600, align: 'center' });
    const top = 70;
    const bottom = h - 50;
    const yR = absorbed ? bottom : top;
    const yP = absorbed ? top : bottom;
    const x0 = w * (narrow ? 0.08 : 0.2);
    const x1 = w * (narrow ? 0.92 : 0.8);
    const xa = x0 + (x1 - x0) * 0.4;
    const xb = x0 + (x1 - x0) * 0.6;
    const ax = (x0 + x1) / 2;
    const color = absorbed ? th.endo : th.exo;
    line(ctx, x0, yR, xa, yR, { color: th.reactant, width: 5 });
    line(ctx, xb, yP, x1, yP, { color: th.product, width: 5 });
    const tag = (y) => (y === top ? -18 : 18);
    text(ctx, s0, (x0 + xa) / 2, yR + tag(yR), { size: 13, weight: 650, align: 'center' });
    text(ctx, s1, (xb + x1) / 2, yP + tag(yP), { size: 13, weight: 650, align: 'center' });
    text(ctx, 'H', x0 - 4, top - 18, { color: th.muted, size: 12 });
    const fgrow = Math.min(1, clk.t * RATE);
    line(ctx, xa, yR, ax, yR, { color: th.muted, width: 1, dash: [3, 3] });
    line(ctx, ax, yP, xb, yP, { color: th.muted, width: 1, dash: [3, 3] });
    arrow(ctx, ax, yR, 0, (yP - yR) * Math.max(fgrow, 0.02), { color, width: 3 });
    const label = `ΔH = ${absorbed ? '+' : ''}${fmt(dH, 3)} kJ`;
    ctx.font = `700 13px ${th.font}`;
    text(ctx, label, Math.min(ax + 10, w - 6 - ctx.measureText(label).width), (top + bottom) / 2, { color, size: 13, weight: 700 });
    clock.setTimeLabel(absorbed ? 'heat absorbed from the surroundings' : 'heat released to the surroundings');
  }

  function drawHess(clk) {
    const { ctx, w, h } = canvas;
    const th = theme();
    const rx = current();
    const unknown = hSolve.value === 'dfh';
    const coef = [...rx.reactants, ...rx.products].find(([, s]) => s === rx.per)[0];
    const u = unknown ? H.unknownFormation(rx, rx.per, hGiven.value * coef) : null;
    const e = u ?? H.reactionEnthalpy(rx);
    const molar = unknown ? hGiven.value : H.molarEnthalpy(rx, rx.per);
    const exo = e.dH < 0;

    const key = `${pick.value}|${water.value}|${unknown && hGiven.value}`;
    if (key !== shown) fillTable(rx, u), (shown = key);
    if (u) {
      const name = formula(rx.per);
      out5.set('given', `${signed(molar)} kJ/mol ${name}` + (coef === 1 ? '' : ` × ${coef} = ${signed(e.dH)} kJ`));
      out5.set('known', `${signed(u.known)} kJ`);
      const inP = rx.products.some(([, s]) => s === rx.per);
      out5.set('x', `${inP ? '' : '−'}(${signed(e.dH)} − (${signed(u.known)})) ÷ ${coef} = ${signed(u.dfH)} kJ/mol ${name}`);
      out5.set('book', `${signed(H.formationOf(rx.per))} kJ/mol`);
    }
    out.set('sr', `${fixed(e.reactants, 1)} kJ`);
    out.set('sp', `${fixed(e.products, 1)} kJ`);
    out.set('drh', `${signed(e.dH)} kJ`);
    out.set('molar', `${signed(molar)} kJ/mol ${formula(rx.per)}`);
    out.set('dh', `${fmt(H.enthalpyChange(amount.value, molar), 3)} kJ`);
    out.set('kind', exo ? 'exothermic' : 'endothermic');

    clear(ctx, w, h);
    const narrow = w < 620;
    // Equation across the top, shrunk to fit.
    const eq = `${side(rx.reactants)} → ${side(rx.products)}`;
    let size = narrow ? 14 : 16;
    ctx.font = `600 ${size}px ${th.font}`;
    while (size > 10 && ctx.measureText(eq).width > w - 24) ctx.font = `600 ${--size}px ${th.font}`;
    text(ctx, eq, w / 2, 22, { size, weight: 600, align: 'center' });

    // --- enthalpy axis: elements at 0, reactants and products at their sums ---
    const levels = [0, e.reactants, e.products];
    const lo = Math.min(...levels);
    const hi = Math.max(...levels);
    const span = hi - lo || 100;
    const top = 58;
    const bottom = h - 34;
    const ax = narrow ? 52 : 70;
    const Y = (v) => bottom - ((v - (lo - span * 0.08)) / (span * 1.16)) * (bottom - top);
    const step = niceStep(span * 1.16, 6);
    for (let v = Math.ceil((lo - span * 0.08) / step) * step; v <= hi + span * 0.08; v += step) {
      line(ctx, ax, Y(v), w - 12, Y(v), { color: th.grid, width: 1 });
      text(ctx, fixed(v, 0), ax - 6, Y(v), { color: th.muted, size: 11, align: 'right' });
    }
    text(ctx, 'H (kJ)', 8, top - 16, { color: th.muted, size: 12 });

    const inner = w - ax - 12;
    const rA = ax + inner * 0.08;
    const rB = ax + inner * 0.36;
    const pA = ax + inner * 0.64;
    const pB = ax + inner * 0.92;
    const mid = ax + inner * 0.5;

    // Elements: the zero of the formation scale.
    line(ctx, ax, Y(0), w - 12, Y(0), { color: th.element, width: 2, dash: [6, 4] });
    text(ctx, 'elements, 0 kJ', w - 14, Y(0) - 9, { color: th.element, size: 12, align: 'right' });

    const bar = (a, b, v, color, name) => {
      line(ctx, a, Y(v), b, Y(v), { color, width: 5 });
      const below = v < 0 || v === lo;
      text(ctx, name, (a + b) / 2, Y(v) + (below ? 16 : -29), { color, size: 12, weight: 650, align: 'center' });
      text(ctx, `${fixed(v, 1)} kJ`, (a + b) / 2, Y(v) + (below ? 31 : -14), { color, size: 12, align: 'center' });
    };
    bar(rA, rB, e.reactants, th.reactant, 'reactants');
    bar(pA, pB, e.products, th.product, 'products');

    // Direct route: the one arrow the formula gives.
    const dColor = exo ? th.exo : th.endo;
    line(ctx, rB, Y(e.reactants), mid, Y(e.reactants), { color: th.muted, width: 1, dash: [3, 3] });
    line(ctx, mid, Y(e.products), pA, Y(e.products), { color: th.muted, width: 1, dash: [3, 3] });
    arrow(ctx, mid, Y(e.reactants), 0, Y(e.products) - Y(e.reactants), { color: dColor, width: 3 });
    const dLabel = `ΔrH = ${signed(e.dH)} kJ`;
    ctx.font = `700 13px ${th.font}`;
    const dX = Math.min(mid + 8, w - 6 - ctx.measureText(dLabel).width);
    text(ctx, dLabel, dX, (Y(e.reactants) + Y(e.products)) / 2, { color: dColor, size: 13, weight: 700 });

    // Hess route, drawn on play: reactants → elements → products.
    const p = Math.min(2, clk.t * RATE);
    const leg = (x, from, to, f, label) => {
      if (f <= 0) return;
      const y0 = Y(from);
      arrow(ctx, x, y0, 0, (Y(to) - y0) * Math.min(1, f), { color: th.element, width: 2, dash: [6, 4] });
      // A quarter of the way along, so it clears the ΔrH label at the midpoint;
      // a leg too short to hold a label is already labelled by its bar.
      if (f >= 1 && Math.abs(Y(to) - y0) > 28) text(ctx, label, x + 7, y0 + (Y(to) - y0) * 0.25, { color: th.element, size: 11 });
    };
    const rx0 = (rA + rB) / 2;
    const px0 = (pA + pB) / 2;
    leg(rx0 - 34, e.reactants, 0, p, `${signed(-e.reactants)} kJ`);
    leg(px0 - 34, 0, e.products, p - 1, `${signed(e.products)} kJ`);
    clock.setTimeLabel(p === 0 ? 'Play to walk the Hess route' : p < 1 ? 'Step 1: reactants → elements' : p < 2 ? 'Step 2: elements → products' : 'Hess route = ΔrH');
  }
}
