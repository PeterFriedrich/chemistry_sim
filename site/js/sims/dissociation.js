import * as D from '../chem/dissociation.js';
import { reading, answerSig, molarMassSig } from '../chem/gases.js';
import { fitCanvas, theme, clear, line, text, roundRect } from '../lib/canvas.js';
import { section, choice, readouts, el } from '../lib/controls.js';
import { createClock } from '../lib/clock.js';
import { fmt, fixed, species } from '../lib/format.js';

export const equations = [
  { html: 'ionic: MₐXᵦ(s) → a M<sup>+</sup>(aq) + b X<sup>−</sup>(aq)', what: 'dissociation: the ions separate; count them from the formula' },
  { html: 'molecular: X(s) → X(aq)', what: 'the molecules stay whole, so no ions form' },
  { html: 'acid: HA(aq) + H₂O(l) → H₃O⁺(aq) + A⁻(aq)', what: 'ionization: strong acids completely (→), weak acids partly (⇌)' },
  { html: '[ion] = (ions per formula unit) × c<sub>solute</sub>', what: 'e.g. 0.25 mol/L Na₂SO₄ gives [Na⁺] = 2 × 0.25 = 0.50 mol/L' },
  { html: 'n = m/M, c = n/V', what: 'concentration in mol/L from a mass dissolved to V litres of solution' },
];

export const prompts = [
  'Dissolve Na₂SO₄. Before you press Play, predict how many Na⁺ ions leave the crystal for every SO₄²⁻. Then count them in the beaker.',
  'Look at the water around a cation and around an anion. Which end of each water molecule points at the ion, and why? (Hint: the bonding sim says water is polar.)',
  'Compare sodium chloride, sucrose and hydrochloric acid. Which conduct electricity in water, and what is in the beaker that carries the charge?',
  'Compare HCl and CH₃COOH at the same concentration. Why is the bulb dim for acetic acid?',
  'Try AgCl and CaCO₃. The booklet’s solubility table says they are slightly soluble: what happens to the crystal, and to the bulb?',
  'Given [Cl⁻] = 0.300 mol/L in a CaCl₂ solution, find c(CaCl₂) by hand first, then check.',
  'Dissolve 5.85 g of NaCl to make 250 mL of solution. Find n, c, [Na⁺] and [Cl⁻].',
];

export const tallOnMobile = true;

export const legend = [
  { color: 'cation', label: 'cation (+)' },
  { color: 'anion', label: 'anion (−)' },
  { color: 'element', label: 'molecule' },
];

const PRESETS = ['NaCl', 'CaCl2', 'Na2SO4', 'Al2(SO4)3', 'NH4NO3', 'CuSO4·5H2O', 'NaOH', 'AgCl', 'CaCO3', 'C12H22O11', 'C2H5OH', 'HCl', 'CH3COOH', 'NH3'];
// species() subscripts every digit; a hydrate's water count stays full size.
const chem = (f) => species(f).replace(/·([₀-₉]+)/, (_, d) => `·${[...d].map((c) => '₀₁₂₃₄₅₆₇₈₉'.indexOf(c)).join('')}`);
const label = (sp) => chem(sp.replace(/\((aq|s|l|g)\)$/, ''));
const term = ([n, sp]) => `${n === 1 ? '' : `${n} `}${chem(sp)}`;

export function mount(ui) {
  const sbox = section(ui.controls, 'Solute');
  const preset = choice(sbox, { label: 'Pick one', options: PRESETS.map((f) => ({ value: f, label: chem(f) })), value: 'Na2SO4' });
  const row = el('div', { class: 'ctl ctl-choice' }, sbox);
  el('label', { for: 'ctl-solute', text: 'Or type a formula or name' }, row);
  const input = el('input', { id: 'ctl-solute', type: 'text', autocomplete: 'off', spellcheck: 'false' }, row);
  input.value = 'Na2SO4';
  preset.onChange((v) => (input.value = v));

  const gbox = section(ui.controls, 'Given in the question');
  const given = choice(gbox, {
    label: 'Given',
    options: [
      { value: 'c', label: 'Concentration of the solute' },
      { value: 'ion', label: 'Concentration of one ion' },
      { value: 'mass', label: 'Mass dissolved and volume of solution' },
    ],
    value: 'c',
  });
  const field = (lbl, value, units) => {
    const r = el('div', { class: 'ctl ctl-choice' }, gbox);
    el('label', { text: lbl }, r);
    const wrap = el('div', { style: 'display: flex; gap: 6px' }, r);
    const inp = el('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off', style: 'flex: 1; min-width: 0' }, wrap);
    inp.value = value;
    const sel = el('select', { 'aria-label': `${lbl} unit`, style: 'width: auto' }, wrap);
    units.forEach((u) => el('option', { value: u, text: u }, sel));
    return { row: r, input: inp, sel };
  };
  const entRow = el('div', { class: 'ctl ctl-choice' }, gbox);
  el('label', { for: 'ctl-entity', text: 'Which ion' }, entRow);
  const entSel = el('select', { id: 'ctl-entity' }, entRow);
  const cF = field('Concentration', '0.25', ['mol/L']);
  const mF = field('Mass of solute', '5.85', ['g']);
  const vF = field('Volume of solution', '250', ['mL', 'L']);

  const out = readouts(ui.readouts, [
    { id: 'kind', label: 'What it is' },
    { id: 'eq', label: 'Equation' },
    { id: 'sol', label: 'Solubility (booklet)' },
    { id: 'n', label: 'n = m/M' },
    { id: 'c', label: 'c (solute)' },
    { id: 'ions', label: 'Concentrations' },
    { id: 'elec', label: 'Electrolyte' },
  ]);
  const rows = [...ui.readouts.lastElementChild.children];
  const IDS = ['kind', 'eq', 'sol', 'n', 'c', 'ions', 'elec'];
  const shown = (node, on) => {
    const d = on ? '' : 'none';
    if (node.style.display !== d) node.style.display = d;
  };
  const set = (id, s) => {
    out.set(id, s || '');
    const i = IDS.indexOf(id);
    shown(rows[2 * i], !!s);
    shown(rows[2 * i + 1], !!s);
  };

  const canvas = fitCanvas(ui.canvas);
  const clock = createClock(ui.transport, { frame: draw });
  const restart = () => (clock.pause(), clock.reset());
  ui.controls.addEventListener('input', restart);
  ui.controls.addEventListener('change', restart);

  let lastKey = '';
  let a = null;
  function analyse() {
    if (input.value === lastKey) return;
    lastKey = input.value;
    a = D.analyse(input.value);
    // The ion menu lists what this solute gives.
    const ents = a.error ? [] : (a.entities ?? []).filter((e) => e.species.includes('^'));
    const prev = entSel.value;
    entSel.replaceChildren(...ents.map((e) => el('option', { value: e.species, text: label(e.species) })));
    if (ents.some((e) => e.species === prev)) entSel.value = prev;
  }

  function solve() {
    analyse();
    if (a.error) return a;
    const g = given.value;
    const hasIons = (a.entities ?? []).some((e) => e.species.includes('^'));
    shown(entRow, g === 'ion');
    shown(cF.row, g !== 'mass');
    shown(mF.row, g === 'mass');
    shown(vF.row, g === 'mass');
    if (g === 'ion' && !hasIons) return { ...a, calcError: a.entities ? 'This solute gives no ions: pick another “Given”' : 'A weak acid or base ionizes only partly, so its ion concentrations are Chemistry 30' };
    if (!a.entities) return { ...a, calcError: 'A weak acid or base ionizes only partly: its [H₃O⁺] or [OH⁻] is a Chemistry 30 calculation' };
    let res;
    let sig;
    if (g === 'mass') {
      const m = reading(mF.input.value);
      const V = reading(vF.input.value);
      if (m.error || V.error) return { ...a, calcError: (m.error || V.error) };
      const VL = V.value * (vF.sel.value === 'mL' ? 1e-3 : 1);
      if (!(m.value > 0 && VL > 0)) return { ...a, calcError: 'The mass and the volume must be greater than 0' };
      res = D.soluteConcentration(a, { m: m.value, V: VL });
      sig = answerSig(m.sig, V.sig, molarMassSig(res.M));
      res.steps = {
        n: `${mF.input.value} g ÷ ${fixed(res.M, 2)} g/mol = ${fmt(res.n, answerSig(m.sig, molarMassSig(res.M)))} mol`,
        c: `c = n/V = ${fmt(res.n, answerSig(m.sig, molarMassSig(res.M)))} mol ÷ ${fmt(VL, V.sig)} L = ${fmt(res.c, sig)} mol/L`,
      };
    } else {
      const c = reading(cF.input.value);
      if (c.error) return { ...a, calcError: c.error };
      if (!(c.value > 0)) return { ...a, calcError: 'The concentration must be greater than 0' };
      sig = c.sig;
      if (g === 'ion') {
        res = D.soluteConcentration(a, { ion: entSel.value, conc: c.value });
        if (res.error) return { ...a, calcError: res.error };
        res.steps = { c: `c = [${label(entSel.value)}] ÷ ${res.count} = ${cF.input.value} ÷ ${res.count} = ${fmt(res.c, sig)} mol/L` };
      } else {
        res = { c: c.value, steps: { c: `${cF.input.value} mol/L` } };
      }
    }
    if (D.exceedsSolubility(a, res.c)) return { ...a, calcError: `Slightly soluble: less than 0.1 mol/L dissolves (booklet), so ${fmt(res.c, sig)} mol/L of ${chem(a.formula)} cannot be made` };
    return { ...a, res, sig, list: D.entityConcentrations(a, res.c) };
  }

  function draw(clk) {
    const r = solve();
    const { ctx, w, h } = canvas;
    const th = theme();
    clear(ctx, w, h);
    if (r.error) {
      IDS.forEach((id) => set(id, ''));
      set('kind', `— ${r.error}`);
      text(ctx, r.error, w / 2, h / 2, { color: th.danger, size: 14, weight: 650, align: 'center' });
      clock.setTimeLabel('');
      return;
    }
    // --- readouts ---
    const why = {
      ionic: `ionic compound (${r.name}): a metal or NH₄⁺ with a nonmetal or polyatomic ion, so it dissociates into ions`,
      acid: `${r.strong ? 'strong' : 'weak'} acid (${r.name}): it ionizes with water ${r.strong ? 'completely' : 'only partly'} (booklet acid table)`,
      base: `weak base (${r.name}): it reacts with water only partly (booklet acid table)`,
      molecular: `molecular compound (${r.name}): it dissolves as whole molecules, so no ions form${r.polar === false ? '; nonpolar, so very little dissolves (like dissolves like)' : ''}`,
    }[r.kind];
    set('kind', why);
    set('eq', `${r.reactants.map(term).join(' + ')} ${r.arrow} ${r.products.map(term).join(' + ')}`);
    const sol = r.kind !== 'ionic' ? '' : r.solubility === 'high' ? 'very soluble (≥ 0.1 mol/L)'
      : r.solubility === 'low' ? 'slightly soluble (< 0.1 mol/L): very few ions in solution' : 'not in the booklet’s solubility table';
    set('sol', r.mercuryI ? `${sol}; the booklet writes mercury(I) as the polyatomic ion Hg₂²⁺` : sol);
    if (r.calcError) {
      set('n', '');
      set('c', '');
      set('ions', r.calcError);
    } else {
      set('n', r.res.steps.n ?? '');
      set('c', r.res.steps.c);
      set('ions', r.list.map((e) => `[${label(e.species)}] = ${e.count === 1 ? '' : `${e.count} × ${fmt(r.res.c, r.sig)} = `}${fmt(e.conc, r.sig)} mol/L`).join('; '));
    }
    const low = r.solubility === 'low';
    const bulb = r.electrolyte === 'strong' && !low ? 1 : r.electrolyte === 'weak' || low ? 0.3 : 0;
    set('elec', r.electrolyte === 'strong'
      ? low ? 'strong electrolyte, but so few ions dissolve that the bulb is dim' : 'strong electrolyte: many ions carry charge, the bulb is bright'
      : r.electrolyte === 'weak' ? 'weak electrolyte: few ions, the bulb is dim' : 'non-electrolyte: no ions, the bulb stays off');

    // --- picture ---
    const narrow = w < 620;
    const beaker = narrow ? { x: 16, y: 56, w: w - 32, h: h * 0.62 - 56 } : { x: 24, y: 64, w: w * 0.58, h: h - 96 };
    const unitBox = narrow ? { x: 16, y: h * 0.66, w: w - 32, h: h * 0.34 - 12 } : { x: w * 0.64, y: 64, w: w * 0.36 - 20, h: h - 96 };
    drawBeaker(ctx, beaker, r, clk.t, bulb);
    drawUnit(ctx, unitBox, r);
    clock.setTimeLabel(clk.t === 0 ? 'Play: add the solute to water' : '');
  }

  // Pseudo-random but fixed per index, so the picture does not flicker.
  const rnd = (k) => {
    const x = Math.sin(k * 12.9898 + 78.233) * 43758.5453;
    return x - Math.floor(x);
  };

  function particle(ctx, x, y, sp, kind) {
    const th = theme();
    const charge = sp.includes('^') ? (sp.includes('+') ? 1 : -1) : 0;
    const txt = label(sp);
    const rad = Math.max(9, Math.min(17, 5 + txt.length * 2));
    ctx.fillStyle = charge > 0 ? th.cation : charge < 0 ? th.anion : th.element;
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.fill();
    if (kind !== 'tiny') text(ctx, txt, x, y, { color: th.surface, size: rad > 12 ? 9 : 10, weight: 700, align: 'center' });
    return { rad, charge };
  }

  // A water molecule: O with two H; `toward` is the angle its H side points at.
  function water(ctx, x, y, ang, hToward) {
    const th = theme();
    const a = hToward ? ang : ang + Math.PI;
    for (const d of [-0.9, 0.9]) {
      ctx.fillStyle = th.muted;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a + d) * 5, y + Math.sin(a + d) * 5, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = th.danger;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawBeaker(ctx, b, r, t, bulb) {
    const th = theme();
    const top = b.y + 20;
    const bottom = b.y + b.h;
    const surf = top + 24;
    ctx.fillStyle = th.seriesA + '18';
    ctx.fillRect(b.x, surf, b.w, bottom - surf);
    ctx.strokeStyle = th.ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(b.x, top);
    ctx.lineTo(b.x, bottom);
    ctx.lineTo(b.x + b.w, bottom);
    ctx.lineTo(b.x + b.w, top);
    ctx.stroke();
    // Conductivity tester: two electrodes and a bulb.
    const ex1 = b.x + b.w * 0.12;
    const ex2 = b.x + b.w * 0.88;
    const by = b.y - 30;
    line(ctx, ex1, by, ex1, bottom - 30, { color: th.element, width: 4 });
    line(ctx, ex2, by, ex2, bottom - 30, { color: th.element, width: 4 });
    line(ctx, ex1, by, b.x + b.w / 2 - 12, by, { color: th.ink });
    line(ctx, b.x + b.w / 2 + 12, by, ex2, by, { color: th.ink });
    const lit = t > 0 ? bulb * Math.min(1, t / 3) : 0;
    if (lit > 0) {
      ctx.fillStyle = `rgba(250, 204, 21, ${0.25 + 0.7 * lit})`;
      ctx.beginPath();
      ctx.arc(b.x + b.w / 2, by, 12 + 10 * lit, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = th.ink;
    ctx.beginPath();
    ctx.arc(b.x + b.w / 2, by, 11, 0, Math.PI * 2);
    ctx.stroke();

    // Background water molecules, unoriented.
    const L = b.x + 30;
    const W = b.w - 60;
    const H = bottom - surf - 30;
    for (let i = 0; i < 26; i++) {
      water(ctx, L + rnd(i) * W, surf + 10 + rnd(i + 50) * H, rnd(i + 99) * 6.28 + t * 0.3, true);
    }

    // What dissolves: formula units released one at a time from the solid.
    const units = r.kind === 'ionic' ? (r.solubility === 'low' ? 2 : Math.max(3, Math.min(8, Math.round(3 + 10 * (r.res?.c ?? 0.25))))) : 8;
    const parts = r.kind === 'ionic'
      ? r.entities.flatMap((e) => Array(e.count).fill(e.species))
      : [r.molecule ?? r.entities[0].species];
    const solid = r.reactants[0][1].endsWith('(s)');
    const extra = r.solubility === 'low' ? 6 : 0;
    const total = units + extra;
    // Lattice at the bottom middle.
    const cell = 30; // wider than the largest ion drawn, so the lattice does not overlap
    const perRow = Math.max(2, Math.min(Math.floor((b.w - 80) / cell), Math.ceil(Math.sqrt(total * parts.length) * 1.5)));
    const lx0 = b.x + b.w / 2 - (perRow * cell) / 2 + cell / 2;
    const ly0 = bottom - 16;
    let k = 0;
    const latticeAt = (n) => [lx0 + (n % perRow) * cell, ly0 - Math.floor(n / perRow) * cell];
    for (let u = 0; u < total; u++) {
      const release = 0.6 + u * 0.7;
      const freed = u < units && t > release;
      const p = freed ? Math.min(1, (t - release) / 1.6) : 0;
      // A weak acid or base: most molecules stay whole (illustrative fraction).
      const splits = r.kind === 'acid' || r.kind === 'base' ? (r.strong ? true : u % 4 === 0) : r.kind === 'ionic';
      const pieces = r.kind === 'acid' || r.kind === 'base' ? (splits && p >= 1 ? r.products.map(([, sp]) => sp) : [r.molecule]) : parts;
      pieces.forEach((sp, j) => {
        const n = k + j;
        const [sx, sy] = solid ? latticeAt(n) : [b.x + b.w / 2 + (rnd(n + 7) - 0.5) * 60, surf + 6];
        const tx = L + rnd(n * 3 + 1) * W;
        const ty = surf + 18 + rnd(n * 3 + 2) * (H - 30);
        const wob = p >= 1 ? 6 : 0;
        const x = sx + (tx - sx) * p + Math.sin(t * 1.3 + n) * wob;
        const y = sy + (ty - sy) * p + Math.cos(t * 1.1 + n * 2) * wob;
        if (!solid && !freed) return; // a liquid or gas solute appears as it is added
        const { rad, charge } = particle(ctx, x, y, sp.replace('H2O(l)', 'H2O'));
        if (p >= 1 && (charge !== 0 || r.kind === 'molecular' && r.polar !== false)) {
          // Hydration: water's δ− O faces a cation, its δ+ H faces an anion.
          for (let q = 0; q < 4; q++) {
            const ang = (q / 4) * Math.PI * 2 + n;
            const d = rad + 8;
            water(ctx, x + Math.cos(ang) * d, y + Math.sin(ang) * d, ang + Math.PI, charge < 0);
          }
        }
      });
      k += pieces.length;
    }
    if (r.kind === 'ionic' && r.products.some(([, sp]) => sp === 'H2O(l)')) {
      text(ctx, 'the hydrate’s water joins the solvent', b.x + b.w / 2, bottom + 14, { color: th.muted, size: 11, align: 'center' });
    }
    if (r.solubility === 'low' && t > 0) text(ctx, 'most of the solid stays undissolved', b.x + b.w / 2, surf + 12, { color: th.danger, size: 12, weight: 650, align: 'center' });
    if ((r.kind === 'acid' && !r.strong) || r.kind === 'base') text(ctx, 'drawn: about 1 in 4 ionized (illustrative; really far fewer)', b.x + b.w / 2, bottom + 14, { color: th.muted, size: 11, align: 'center' });
  }

  // One formula unit (or molecule) and what it becomes, coefficient for coefficient.
  function drawUnit(ctx, b, r) {
    const th = theme();
    text(ctx, 'One formula unit', b.x, b.y + 4, { size: 13, weight: 700 });
    const left = r.reactants.map(term).join(' + ');
    text(ctx, left, b.x, b.y + 30, { size: 14, weight: 650 });
    text(ctx, r.arrow, b.x, b.y + 56, { size: 18, weight: 700, color: th.muted });
    let y = b.y + 84;
    const narrow = b.h < 220;
    let x = b.x + 12;
    for (const [n, sp] of r.products) {
      if (sp === 'H2O(l)' && r.kind === 'ionic') {
        text(ctx, `+ ${n} H₂O(l)`, x, y, { size: 12, color: th.muted });
        x += 70;
        continue;
      }
      const shownN = Math.min(n, 4);
      for (let i = 0; i < shownN; i++) {
        particle(ctx, x + 10, y, sp);
        x += 34;
        if (x > b.x + b.w - 30) {
          x = b.x + 12;
          y += 36;
        }
      }
      if (n > shownN) text(ctx, `×${n}`, x, y, { size: 12, color: th.muted });
      x += 14;
    }
    if (!narrow) {
      const tally = r.entities ? r.products.filter(([, sp]) => sp.includes('^')).map(([n, sp]) => `${n} ${label(sp)}`).join(' + ') : '';
      if (tally) text(ctx, `per formula unit: ${tally}`, b.x, y + 40, { size: 12, color: th.muted });
    }
    roundRect(ctx, b.x - 6, b.y - 14, b.w, Math.min(b.h, y - b.y + 70), 8);
    ctx.strokeStyle = th.grid;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}
