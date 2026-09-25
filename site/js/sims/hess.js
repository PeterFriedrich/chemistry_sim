import * as H from '../chem/hess.js';
import { fitCanvas, theme, clear, line, text, arrow, niceStep } from '../lib/canvas.js';
import { section, slider, choice, readouts, el } from '../lib/controls.js';
import { createClock } from '../lib/clock.js';
import { fmt, fixed } from '../lib/format.js';

export const equations = [
  { html: 'Δ<sub>r</sub>H° = Σ nΔ<sub>f</sub>H°<sub>products</sub> − Σ nΔ<sub>f</sub>H°<sub>reactants</sub>', what: 'n = coefficient in the balanced equation' },
  { html: 'Δ<sub>f</sub>H° = 0', what: 'for an element in its standard state: O₂(g), H₂(g), N₂(g), C(s), Al(s), Fe(s)' },
  { html: 'ΔH = nΔ<sub>r</sub>H', what: 'n = amount of the substance Δ<sub>r</sub>H is quoted per' },
  { html: 'ΔH &lt; 0 exothermic, ΔH &gt; 0 endothermic', what: 'the sign is the change in the system’s enthalpy' },
];

export const prompts = [
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

const SUB = '₀₁₂₃₄₅₆₇₈₉';
const formula = (s) => s.replace(/\d/g, (d) => SUB[d]);
const side = (list) => list.map(([n, s]) => (n === 1 ? '' : `${n} `) + formula(s)).join(' + ');
// Endothermic values carry an explicit + as students write them.
const signed = (v) => (v > 0 ? '+' : '') + fixed(v, 1);
const RATE = 0.7; // Hess-route steps per second of playback; animation only

export function mount(ui) {
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
  const table = el('table', { class: 'data-table', style: 'margin-top: 10px' }, ui.readouts);

  const canvas = fitCanvas(ui.canvas);
  const clock = createClock(ui.transport, { frame: draw });
  let shown = null;
  [pick, water, amount].forEach((c) => c.onChange(() => (clock.pause(), clock.reset())));

  const current = () => H.withWater(H.reactions.find((r) => r.id === pick.value), water.value);

  function fillTable(rx) {
    table.innerHTML = '<thead><tr><th>Species</th><th>n</th><th>Δ<sub>f</sub>H°</th><th>nΔ<sub>f</sub>H°</th></tr></thead>';
    const body = el('tbody', {}, table);
    const rows = (list, last) =>
      H.terms(list).forEach((t, i) => {
        const tr = el('tr', i === list.length - 1 && last ? { class: 'after' } : {}, body);
        el('td', { text: formula(t.species) }, tr);
        el('td', { text: String(t.n) }, tr);
        el('td', { text: fixed(t.dfH, 1) }, tr);
        el('td', { text: fixed(t.total, 1) }, tr);
      });
    rows(rx.reactants, true);
    rows(rx.products, false);
    el('caption', { text: 'kJ/mol and kJ; reactants above the line', style: 'caption-side: bottom; text-align: left; color: var(--c-muted); font-size: 12px; padding-top: 4px' }, table);
  }

  function draw(clk) {
    const { ctx, w, h } = canvas;
    const th = theme();
    const rx = current();
    const e = H.reactionEnthalpy(rx);
    const molar = H.molarEnthalpy(rx, rx.per);
    const exo = e.dH < 0;

    const key = `${pick.value}|${water.value}`;
    if (key !== shown) fillTable(rx), (shown = key);
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
