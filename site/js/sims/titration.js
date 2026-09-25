import * as T from '../chem/titration.js';
import { indicators } from '../chem/indicator-data.js';
import { fitCanvas, theme, clear, line, text, roundRect, niceStep } from '../lib/canvas.js';
import { section, slider, choice, readouts } from '../lib/controls.js';
import { createClock } from '../lib/clock.js';
import { fmt, fixed, species } from '../lib/format.js';

export const tallOnMobile = true;

export const equations = [
  { html: 'n = cV', what: 'at equivalence, n<sub>titrant</sub> = n<sub>analyte</sub> (1 : 1 here)' },
  { html: 'V<sub>eq</sub> = c<sub>a</sub>V<sub>a</sub> / c<sub>t</sub>', what: 'volume of titrant to reach equivalence' },
  { html: 'pH = −log[H₃O⁺], [H₃O⁺][OH⁻] = K<sub>w</sub> = 1.0 × 10⁻¹⁴', what: 'pH decimal places = significant figures in [H₃O⁺]' },
  { html: 'K<sub>a</sub> = [H₃O⁺][A⁻] / [HA], [H₃O⁺] ≈ √(K<sub>a</sub>c)', what: 'the approximation only when c &gt; 1000 K<sub>a</sub> (booklet p. 9); otherwise the quadratic' },
  { html: 'K<sub>b</sub> = K<sub>w</sub> / K<sub>a</sub>', what: 'a weak base, from its conjugate acid’s K<sub>a</sub>' },
  { html: 'half-equivalence: [HA] = [A⁻], so [H₃O⁺] = K<sub>a</sub>', what: 'pH = pK<sub>a</sub> = −log K<sub>a</sub>' },
];

export const prompts = [
  'Titrate 25.0 mL of 0.100 mol/L CH₃COOH(aq) with 0.100 mol/L NaOH(aq). Calculate V<sub>eq</sub>, the initial pH and the equivalence pH by hand, then check the readouts.',
  'Why is the equivalence pH above 7 for CH₃COOH but 7.00 for HCl? Which species is left in the flask at equivalence?',
  'Pick methyl orange for the CH₃COOH titration and press Play. When does it change colour compared with the equivalence point? Find an indicator in the booklet that fits.',
  'Switch to NH₃(aq), titrated with HCl(aq). Why is the equivalence pH below 7, and which indicator would you choose?',
  'Compare HCl, CH₃COOH and HCN at the same concentration. What happens to the jump at equivalence as the acid gets weaker?',
  'Choose HF at 0.100 mol/L. Why does the readout use the quadratic? Work out the initial pH both ways.',
];

export const legend = [
  { color: 'accent', label: 'titration curve' },
  { color: 'product', label: 'equivalence point' },
  { color: 'reactant', label: 'half-equivalence (pH = pK<sub>a</sub>)' },
];

const NAMES = { SB: 'sodium hydroxide', WB: 'ammonia' };
const label = (a) => `${species(a.formula)}, ${NAMES[a.kind] ?? a.pair.name}`;
const range = (r) => `${r.lo.toFixed(1)}–${r.hi.toFixed(1)}`;
const side = (list) => list.map(([n, s]) => (n === 1 ? '' : `${n} `) + species(s)).join(' + ');
const METHOD = {
  strong: 'complete ionization',
  water: 'neutral: [H₃O⁺] = √Kw',
  approximation: 'approximation, c > 1000 K',
  quadratic: 'quadratic, c < 1000 K',
};
// Significant figures in a control value as it is shown (0.050 → 2, 25.0 → 3).
const sigOf = (x, dp) => x.toFixed(dp).replace('.', '').replace(/^0+/, '').length;

// Picture colours for the booklet's colour names; colourless fades to clear.
const RGB = { yellow: [240, 196, 25], blue: [37, 99, 235], red: [215, 38, 61], pink: [232, 90, 168], orange: [242, 140, 40] };
function liquid(c, k = 1) {
  const a = RGB[c.from] ?? RGB[c.to] ?? [200, 200, 200];
  const b = RGB[c.to] ?? a;
  const alpha = (name) => (name === 'colourless' ? 0 : 0.8);
  const mix = (i) => Math.round(a[i] + (b[i] - a[i]) * c.f);
  return `rgba(${mix(0)}, ${mix(1)}, ${mix(2)}, ${k * (alpha(c.from) + (alpha(c.to) - alpha(c.from)) * c.f)})`;
}

export function mount(ui) {
  const flask = section(ui.controls, 'Flask (analyte)');
  const pick = choice(flask, { label: 'Analyte', options: T.analytes.map((a) => ({ value: a.id, label: label(a) })), value: 'CH3COOH' });
  const ca = slider(flask, { label: 'Concentration, c<sub>a</sub>', min: 0.01, max: 0.2, step: 0.001, value: 0.1, unit: 'mol/L', digits: 3 });
  const Va = slider(flask, { label: 'Volume, V<sub>a</sub>', min: 10, max: 25, step: 0.1, value: 25, unit: 'mL', digits: 1 });
  const bur = section(ui.controls, 'Burette (titrant)');
  const ct = slider(bur, { label: 'Concentration, c<sub>t</sub>', min: 0.05, max: 0.2, step: 0.001, value: 0.1, unit: 'mol/L', digits: 3 });
  const pickInd = choice(bur, {
    label: 'Indicator',
    options: indicators.map((i) => ({ value: i.name, label: `${i.name} (${i.ranges.map(range).join(', ')})` })),
    value: 'phenolphthalein',
  });
  const add = section(ui.controls, 'Titration');
  const Vadd = slider(add, { label: 'Titrant added', min: 0, max: 100, step: 0.05, value: 0, unit: 'mL', digits: 2 });

  const out = readouts(ui.readouts, [
    { id: 'rx', label: 'Reaction' },
    { id: 'titrant', label: 'Titrant' },
    { id: 'n', label: 'n<sub>analyte</sub> = c<sub>a</sub>V<sub>a</sub>' },
    { id: 'veq', label: 'V<sub>eq</sub> (shown in mL)' },
    { id: 'pi', label: 'Initial pH' },
    { id: 'ph', label: 'Half-equivalence pH = pK<sub>a</sub>' },
    { id: 'pe', label: 'Equivalence pH' },
    { id: 'ind', label: 'Indicator fits?' },
  ]);

  const canvas = fitCanvas(ui.canvas);
  // Titrant added in mL. Kept here, not in the slider, because the slider
  // snaps to its 0.05 mL step and would swallow a frame's worth of flow.
  let added = 0;
  let curve = null;
  const clock = createClock(ui.transport, { frame: draw, onReset: () => (added = 0, (Vadd.value = 0)) });
  Vadd.onChange((v) => (clock.pause(), (added = v)));
  [pick, ca, Va, ct].forEach((c) => c.onChange(() => (clock.pause(), clock.reset())));

  function draw(clk, dt) {
    const { ctx, w, h } = canvas;
    const th = theme();
    const a = T.analytes.find((x) => x.id === pick.value);
    const ind = indicators.find((i) => i.name === pickInd.value);
    const sa = sigOf(ca.value, 3);
    const sig = Math.min(sa, sigOf(ct.value, 3), sigOf(Va.value, 1));
    const VaL = Va.value / 1000;
    const Veq = T.equivalenceVolume(ca.value, VaL, ct.value);
    const init = T.initialPH(a, ca.value, sa);
    const half = T.halfEquivalencePH(a);
    const eq = T.equivalencePH(a, ca.value, VaL, ct.value, sig);
    const eqShown = Number(eq.pH.toFixed(eq.sig));
    const fit = T.indicatorFits(ind, eqShown);

    const rx = T.netIonic(a);
    out.set('rx', `${side(rx.reactants)} → ${side(rx.products)}`);
    out.set('titrant', species(T.titrantFor(a)));
    out.set('n', `${fmt(T.moles(ca.value, VaL), Math.min(sa, 3))} mol`);
    out.set('veq', `${fmt(Veq * 1000, sig)} mL`);
    out.set('pi', `${fixed(init.pH, init.sig)} (${METHOD[init.method]})`);
    out.set('ph', half ? `${fixed(half.pH, half.sig)} (Kₐ of ${species(a.pair.acid)})` : '— (strong: no buffer region)');
    out.set('pe', `${fixed(eq.pH, eq.sig)}` + (eq.species ? ` (${species(eq.species)} at ${fmt(eq.c, sig)} mol/L, ${METHOD[eq.method]})` : ` (${METHOD.water})`));
    out.set('ind', fit.fits ? `✓ range ${range(fit.range)} contains ${fixed(eq.pH, eq.sig)}` : `✗ changes at ${ind.ranges.map(range).join(' and ')}, not at ${fixed(eq.pH, eq.sig)}`);

    const VeqMl = Veq * 1000;
    const raw = Math.max(2 * VeqMl, 10);
    const step = niceStep(raw, 5);
    let Vmax = Math.ceil(raw / step) * step;

    // Dropwise near the endpoint, as in the lab: the flow slows as V nears Veq.
    if (clk.running) {
      const rate = 0.25 + 2.75 * Math.min(1, Math.abs(added - VeqMl) / (0.15 * VeqMl));
      added = Math.min(Vmax, added + rate * dt);
      Vadd.value = added;
      if (added >= Vmax) clock.pause();
    }
    Vmax = Math.max(Vmax, Math.ceil(added / step) * step);
    clock.setTimeLabel(`${fixed(added, 2)} mL added`);

    const key = `${a.id}|${ca.value}|${Va.value}|${ct.value}|${Vmax}`;
    if (curve?.key !== key) {
      const pts = [];
      for (let i = 0; i <= 400; i++) pts.push(Vmax * (i / 400));
      pts.push(VeqMl, VeqMl / 2);
      pts.sort((p, q) => p - q);
      curve = { key, pts: pts.map((V) => [V, T.curvePH(a, ca.value, VaL, ct.value, V / 1000)]) };
    }
    const pHnow = T.curvePH(a, ca.value, VaL, ct.value, added / 1000);

    clear(ctx, w, h);
    const narrow = w < 620;
    const app = narrow ? { x: 0, y: 0, w, h: h * 0.44 } : { x: 0, y: 0, w: w * 0.3, h };
    const gr = narrow ? { x: 0, y: h * 0.44, w, h: h * 0.56 } : { x: w * 0.3, y: 0, w: w * 0.7, h };

    // --- burette and flask ---
    const cx = app.x + app.w / 2;
    const bTop = app.y + 16;
    const bBot = app.y + app.h * 0.5;
    const tip = app.y + app.h * 0.57;
    const neck = app.y + app.h * 0.64;
    const fBot = app.y + app.h - (narrow ? 8 : 40);
    const bw = narrow ? 12 : 16;
    const level = bTop + 6 + (bBot - bTop - 6) * Math.min(1, added / Vmax);
    ctx.fillStyle = th.endo + '30';
    ctx.fillRect(cx - bw / 2, level, bw, bBot - level);
    ctx.strokeStyle = th.ink;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cx - bw / 2, bTop, bw, bBot - bTop);
    for (let i = 1; i < 10; i++) {
      const y = bTop + 6 + ((bBot - bTop - 6) * i) / 10;
      line(ctx, cx - bw / 2, y, cx - bw / 2 + (i % 5 ? 4 : 8), y, { color: th.muted, width: 1 });
    }
    ctx.beginPath();
    ctx.moveTo(cx - bw / 2, bBot);
    ctx.lineTo(cx - 2, tip);
    ctx.lineTo(cx + 2, tip);
    ctx.lineTo(cx + bw / 2, bBot);
    ctx.stroke();
    ctx.fillStyle = th.element;
    ctx.fillRect(cx - bw / 2 - 6, bBot + (tip - bBot) * 0.3, bw + 12, 5);
    text(ctx, species(T.titrantFor(a)), cx + bw / 2 + 6, bTop + 10, { size: 12, weight: 650 });
    text(ctx, `${fmt(ct.value, sigOf(ct.value, 3))} mol/L`, cx + bw / 2 + 6, bTop + 26, { size: 11, color: th.muted });
    if (clk.running) {
      const y = tip + ((clk.t * 2.5) % 1) * (neck + (fBot - neck) * 0.45 - tip);
      ctx.fillStyle = th.endo + '90';
      ctx.beginPath();
      ctx.arc(cx, y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    const fw = Math.min(app.w * 0.7, (fBot - neck) * 1.3);
    const flaskPath = () => {
      ctx.beginPath();
      ctx.moveTo(cx - 9, neck);
      ctx.lineTo(cx - 9, neck + (fBot - neck) * 0.25);
      ctx.lineTo(cx - fw / 2, fBot);
      ctx.lineTo(cx + fw / 2, fBot);
      ctx.lineTo(cx + 9, neck + (fBot - neck) * 0.25);
      ctx.lineTo(cx + 9, neck);
    };
    const fill = neck + (fBot - neck) * 0.55;
    ctx.save();
    flaskPath();
    ctx.clip();
    ctx.fillStyle = th.endo + '18';
    ctx.fillRect(cx - fw / 2, fill, fw, fBot - fill);
    ctx.fillStyle = liquid(T.indicatorColour(ind, pHnow));
    ctx.fillRect(cx - fw / 2, fill, fw, fBot - fill);
    ctx.restore();
    flaskPath();
    ctx.strokeStyle = th.ink;
    ctx.lineWidth = 2;
    ctx.stroke();
    const nowText = `pH ≈ ${fixed(pHnow, 1)} (read from graph)`;
    if (narrow) {
      text(ctx, species(a.formula), cx + fw / 2 + 6, fBot - 8, { size: 12, weight: 650 });
      text(ctx, `pH ≈ ${fixed(pHnow, 1)}`, cx - fw / 2 - 6, fBot - 24, { size: 12, weight: 650, align: 'right' });
      text(ctx, 'read from graph', cx - fw / 2 - 6, fBot - 8, { size: 11, color: th.muted, align: 'right' });
    } else {
      text(ctx, species(a.formula), cx, fBot + 12, { size: 12, weight: 650, align: 'center' });
      text(ctx, nowText, cx, fBot + 29, { size: 11, align: 'center' });
    }

    // --- pH curve ---
    const X0 = gr.x + (narrow ? 34 : 44);
    const X1 = gr.x + gr.w - 14;
    const Y0 = gr.y + 20;
    const Y1 = gr.y + gr.h - 38;
    const px = (V) => X0 + (V / Vmax) * (X1 - X0);
    const py = (p) => Y1 - (Math.min(14, Math.max(0, p)) / 14) * (Y1 - Y0);
    for (const r of ind.ranges) {
      const g = ctx.createLinearGradient(0, py(r.lo), 0, py(r.hi));
      g.addColorStop(0, liquid({ from: r.from, to: r.from, f: 0 }, 0.3));
      g.addColorStop(1, liquid({ from: r.to, to: r.to, f: 1 }, 0.3));
      ctx.fillStyle = g;
      ctx.fillRect(X0, py(r.hi), X1 - X0, py(r.lo) - py(r.hi));
    }
    for (let p = 0; p <= 14; p += 2) {
      line(ctx, X0, py(p), X1, py(p), { color: th.grid, width: 1 });
      text(ctx, String(p), X0 - 6, py(p), { size: 11, color: th.muted, align: 'right' });
    }
    for (let V = 0; V <= Vmax + 1e-9; V += step) {
      line(ctx, px(V), Y0, px(V), Y1, { color: th.grid, width: 1 });
      text(ctx, fmt(V, 3).replace(/\.0+$/, ''), px(V), Y1 + 12, { size: 11, color: th.muted, align: 'center' });
    }
    ctx.strokeStyle = th.muted;
    ctx.lineWidth = 1;
    ctx.strokeRect(X0, Y0, X1 - X0, Y1 - Y0);
    text(ctx, `${narrow ? '' : 'shaded: '}${ind.name}, pH ${ind.ranges.map(range).join(' and ')}`, X1, Y0 - 10, { size: 11, color: th.muted, align: 'right' });
    text(ctx, 'pH', X0 - 6, Y0 - 11, { size: 12, color: th.muted, align: 'right', weight: 650 });
    text(ctx, `Volume of ${species(T.titrantFor(a))} added (mL)`, (X0 + X1) / 2, Y1 + 28, { size: 12, color: th.muted, align: 'center' });

    ctx.save();
    ctx.beginPath();
    ctx.rect(X0, Y0, X1 - X0, Y1 - Y0);
    ctx.clip();
    ctx.strokeStyle = th.accent;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    curve.pts.forEach(([V, p], i) => (i ? ctx.lineTo(px(V), py(p)) : ctx.moveTo(px(V), py(p))));
    ctx.stroke();
    ctx.restore();

    const dot = (V, p, color, r = 5) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(px(V), py(p), r, 0, Math.PI * 2);
      ctx.fill();
    };
    const onCurve = (V) => curve.pts.find(([x]) => x === V)[1];
    const acid = T.isAcid(a);
    const pe = onCurve(VeqMl);
    line(ctx, px(VeqMl), py(pe), px(VeqMl), Y1, { color: th.product, width: 1.2, dash: [4, 4] });
    dot(VeqMl, pe, th.product);
    const eqText = `${narrow ? 'eq.' : 'equivalence'}: ${fmt(VeqMl, sig)} mL, pH ${fixed(eq.pH, eq.sig)}`;
    ctx.font = `650 12px ${th.font}`;
    const toRight = px(VeqMl) + 8 + ctx.measureText(eqText).width < X1;
    text(ctx, eqText, px(VeqMl) + (toRight ? 8 : -8), py(pe), { size: 12, weight: 650, color: th.product, align: toRight ? 'left' : 'right' });
    if (half) {
      const ph = onCurve(VeqMl / 2);
      dot(VeqMl / 2, ph, th.reactant);
      // Below-right of a rising curve (above-right of a falling one) is clear.
      text(ctx, `pKₐ = ${fixed(half.pH, half.sig)}`, px(VeqMl / 2) + 8, py(ph) + (acid ? 14 : -14), { size: 12, weight: 650, color: th.reactant });
    }
    // The flask's pH is a graph reading, printed by the flask: no hand method gives it between the marked points.
    line(ctx, X0, py(pHnow), px(added), py(pHnow), { color: th.ink, width: 1, dash: [2, 3] });
    dot(added, pHnow, th.ink, 4);
  }
}
