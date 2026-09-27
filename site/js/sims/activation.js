import * as A from '../chem/activation.js';
import * as H from '../chem/hess.js';
import { fitCanvas, theme, clear, line, text, arrow } from '../lib/canvas.js';
import { section, slider, choice, readouts } from '../lib/controls.js';
import { createClock } from '../lib/clock.js';
import { fixed } from '../lib/format.js';

export const equations = [
  { html: 'ΔH = E<sub>p</sub>(products) − E<sub>p</sub>(reactants)', what: 'from the booklet’s ΔfH° values; negative when the products are lower (exothermic)' },
  { html: 'E<sub>a</sub>(forward) = E<sub>p</sub>(activated complex) − E<sub>p</sub>(reactants)', what: 'the climb from the reactants to the top of the curve' },
  { html: 'E<sub>a</sub>(reverse) = E<sub>a</sub>(forward) − ΔH', what: 'the climb from the products to the same peak' },
  { html: 'a catalyst lowers E<sub>a</sub>(forward) and E<sub>a</sub>(reverse) by the same amount', what: 'a different, lower path; ΔH does not change' },
];

export const prompts = [
  'Haber process: ΔH = −91.8 kJ and Ea(forward) = 230 kJ. Find Ea(reverse) by hand, then check.',
  'For an endothermic reaction, which is larger: Ea(forward) or Ea(reverse)? Pick the limestone decomposition and check.',
  'Add a catalyst. How much does Ea(reverse) drop compared with Ea(forward)? What happens to ΔH?',
  'Why can Ea(forward) not be smaller than ΔH for an endothermic reaction? Try it.',
  'A catalyst speeds up the forward reaction. What does it do to the reverse reaction, and why?',
];

export const legend = [
  { color: 'reactant', label: 'reactants' },
  { color: 'product', label: 'products' },
  { color: 'ink', label: 'uncatalysed path' },
  { color: 'element', label: 'catalysed path' },
  { color: 'exo', label: 'exothermic ΔH' },
  { color: 'endo', label: 'endothermic ΔH' },
];

const RATE = 0.4; // passes over the barrier per second; animation only

export function mount(ui) {
  const rbox = section(ui.controls, 'Reaction');
  const pick = choice(rbox, {
    label: 'Balanced equation',
    options: H.reactions.map((r) => ({ value: r.id, label: r.label })),
    value: 'haber',
  });
  const ebox = section(ui.controls, 'Activation energy');
  const ea = slider(ebox, { label: 'E<sub>a</sub>(forward)', min: 0.1, max: 5000, step: 0.1, value: 230, unit: 'kJ', digits: 1 });
  const cat = choice(ebox, {
    label: 'Catalyst',
    options: [
      { value: 'none', label: 'None' },
      { value: 'yes', label: 'Added' },
    ],
    value: 'none',
  });
  const eaCat = slider(ebox, { label: 'E<sub>a</sub>(forward) with the catalyst', min: 0.1, max: 5000, step: 0.1, value: 150, unit: 'kJ', digits: 1 });
  const eaCatRow = ebox.lastElementChild;

  const rx = () => H.reactions.find((r) => r.id === pick.value);
  // A new reaction starts with a barrier that can be drawn: 230 and 150 kJ above
  // whichever of reactants and products is higher.
  pick.onChange(() => {
    const base = Math.max(0, H.reactionEnthalpy(rx()).dH);
    ea.value = Math.round((base + 230) * 10) / 10;
    eaCat.value = Math.round((base + 150) * 10) / 10;
  });

  const out = readouts(ui.readouts, [
    { id: 'dh', label: 'ΔH, equation as written' },
    { id: 'kind', label: 'Reaction is' },
    { id: 'f', label: 'E<sub>a</sub>(forward)' },
    { id: 'r', label: 'E<sub>a</sub>(reverse) = E<sub>a</sub>(forward) − ΔH' },
    { id: 'fc', label: 'E<sub>a</sub>(forward), catalysed' },
    { id: 'rc', label: 'E<sub>a</sub>(reverse), catalysed' },
  ]);
  const dl = ui.readouts.lastElementChild;

  const canvas = fitCanvas(ui.canvas);
  const clock = createClock(ui.transport, { frame: draw });
  [pick, ea, cat, eaCat].forEach((c) => c.onChange(() => (clock.pause(), clock.reset())));

  function draw(clk) {
    const dH = H.reactionEnthalpy(rx()).dH;
    const withCat = cat.value === 'yes';
    const show = (node, on) => {
      const d = on ? '' : 'none';
      if (node.style.display !== d) node.style.display = d;
    };
    show(eaCatRow, withCat);
    show(dl.children[8], withCat);
    show(dl.children[9], withCat);
    show(dl.children[10], withCat);
    show(dl.children[11], withCat);

    const u = A.barrier(dH, ea.value);
    const c = A.barrier(dH, eaCat.value);
    const bad = A.problem(dH, ea.value);
    const badCat = withCat ? A.catalystProblem(dH, ea.value, eaCat.value) : null;
    const kJ = (v) => `${fixed(v, 1)} kJ`;
    out.set('dh', `${dH > 0 ? '+' : ''}${kJ(dH)}`);
    out.set('kind', dH < 0 ? 'exothermic: products lower than reactants' : 'endothermic: products higher than reactants');
    out.set('f', kJ(u.EaF));
    out.set('r', bad ? `— ${bad}` : kJ(u.EaR));
    out.set('fc', bad ? '—' : badCat ? `— ${badCat}` : kJ(c.EaF));
    out.set('rc', bad || badCat ? '—' : kJ(c.EaR));

    const { ctx, w, h } = canvas;
    const th = theme();
    clear(ctx, w, h);
    const narrow = w < 620;
    const pad = narrow ? 44 : 64;
    const x0 = pad;
    const x1 = w - (narrow ? 12 : 24);
    const peak = bad ? Math.max(0, dH) : ea.value;
    const lo = Math.min(0, dH);
    const hi = peak;
    const top = 40;
    const bottom = h - 56;
    const span = hi - lo || 1;
    const Y = (v) => bottom - ((v - lo) / span) * (bottom - top);
    const X = (f) => x0 + (x1 - x0) * f;

    text(ctx, 'Eₚ (kJ)', 8, top - 20, { color: th.muted, size: 12 });
    text(ctx, 'reaction progress →', x1, bottom + 40, { color: th.muted, size: 12, align: 'right' });
    line(ctx, x0, top - 10, x0, bottom + 6, { color: th.muted, width: 1 });
    line(ctx, x0, bottom + 6, x1, bottom + 6, { color: th.muted, width: 1 });

    // Reactants flat to 0.18, up to the peak at 0.5, down to the products at 0.82.
    const Ep = (f, top) => {
      if (f <= 0.18) return 0;
      if (f >= 0.82) return dH;
      if (f <= 0.5) return (top * (1 - Math.cos((Math.PI * (f - 0.18)) / 0.32))) / 2;
      return top + ((dH - top) * (1 - Math.cos((Math.PI * (f - 0.5)) / 0.32))) / 2;
    };
    const curve = (topE, color, dash) => {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      if (dash) ctx.setLineDash(dash);
      ctx.beginPath();
      for (let i = 0; i <= 200; i++) {
        const f = i / 200;
        const y = Y(Ep(f, topE));
        i ? ctx.lineTo(X(f), y) : ctx.moveTo(X(f), y);
      }
      ctx.stroke();
      ctx.restore();
    };
    if (bad) {
      bad.split(', ').forEach((part, i) =>
        text(ctx, part, (x0 + x1) / 2, (top + bottom) / 2 + i * 20, { color: th.danger, size: narrow ? 12 : 13, weight: 650, align: 'center' }));
      clock.setTimeLabel('');
      return;
    }
    curve(u.EaF, th.ink);
    const catOk = withCat && !badCat;
    if (catOk) curve(c.EaF, th.element, [7, 5]);
    // Reactant and product levels over the flat ends.
    line(ctx, X(0), Y(0), X(0.18), Y(0), { color: th.reactant, width: 5 });
    line(ctx, X(0.82), Y(dH), X(1), Y(dH), { color: th.product, width: 5 });
    text(ctx, 'reactants', X(0.09), Y(0) + (dH < 0 ? -14 : 16), { color: th.reactant, size: 12, weight: 650, align: 'center' });
    text(ctx, 'products', X(0.91), Y(dH) + (dH < 0 ? 16 : -14), { color: th.product, size: 12, weight: 650, align: 'center' });
    text(ctx, 'activated complex', X(0.5), Y(u.EaF) - 12, { color: th.muted, size: 12, align: 'center' });

    // Guide lines at the peak and the product level, then the arrows.
    line(ctx, X(0.18), Y(0), X(0.93), Y(0), { color: th.muted, width: 1, dash: [3, 3] });
    line(ctx, X(0.3), Y(u.EaF), X(0.7), Y(u.EaF), { color: th.muted, width: 1, dash: [3, 3] });
    line(ctx, X(0.62), Y(dH), X(0.82), Y(dH), { color: th.muted, width: 1, dash: [3, 3] });
    const vArrow = (f, from, to, color, label, right) => {
      arrow(ctx, X(f), Y(from), 0, Y(to) - Y(from), { color, width: 2 });
      text(ctx, label, X(f) + (right ? 6 : -6), (Y(from) + Y(to)) / 2, { color, size: 12, weight: 650, align: right ? 'left' : 'right' });
    };
    // A phone has room for short tags only; the readouts carry the values.
    const tag = (short, long, v) => (narrow ? short : `${long} ${fixed(v, 1)}`);
    vArrow(0.3, 0, u.EaF, th.ink, tag('Ea', 'Ea(fwd)', u.EaF), false);
    vArrow(0.7, dH, u.EaF, th.ink, tag('Ea(rev)', 'Ea(rev)', u.EaR), true);
    if (catOk) vArrow(0.4, 0, c.EaF, th.element, tag('cat.', 'catalysed', c.EaF), true);
    vArrow(0.93, 0, dH, dH < 0 ? th.exo : th.endo, narrow ? 'ΔH' : `ΔH ${dH > 0 ? '+' : ''}${fixed(dH, 1)}`, false);

    // Decoration: a particle crossing the barrier on the path in use.
    if (clk.t > 0) {
      const f = (clk.t * RATE) % 1;
      const topE = catOk ? c.EaF : u.EaF;
      ctx.fillStyle = th.exo;
      ctx.beginPath();
      ctx.arc(X(f), Y(Ep(f, topE)) - 7, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    clock.setTimeLabel(catOk ? 'crossing the catalysed path (kJ)' : 'energies in kJ');
  }
}
