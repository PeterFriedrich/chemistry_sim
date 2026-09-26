import * as E from '../chem/equilibrium.js';
import { ionColours } from '../chem/ion-colour-data.js';
import { fitCanvas, theme, clear, line, text, roundRect, niceStep } from '../lib/canvas.js';
import { section, slider, choice, buttons, readouts, el } from '../lib/controls.js';
import { createClock } from '../lib/clock.js';
import { fmt, fixed, species } from '../lib/format.js';

export const tallOnMobile = true;

export const equations = [
  { html: 'K<sub>c</sub> = [C]<sup>c</sup>[D]<sup>d</sup> / ([A]<sup>a</sup>[B]<sup>b</sup>)', what: 'for aA + bB ⇌ cC + dD; pure liquids and solids (H₂O(l)) are left out' },
  { html: 'Q &lt; K<sub>c</sub> → forward, Q &gt; K<sub>c</sub> → reverse', what: 'Q is the same expression with the concentrations right after the stress' },
  { html: 'Only a temperature change alters K<sub>c</sub>', what: 'raising T favours the endothermic direction' },
  { html: 'Δ<sub>r</sub>H = ΣnΔ<sub>f</sub>H°(products) − ΣnΔ<sub>f</sub>H°(reactants)', what: 'from the Data Booklet; ΔH &lt; 0 is exothermic' },
];

export const prompts = [
  'Write the K<sub>c</sub> expression for the Haber process and calculate K<sub>c</sub> from the starting concentrations. Check the readout.',
  'Add 0.200 mol/L N₂. Calculate Q by hand. Is Q bigger or smaller than K<sub>c</sub>, and which way does the system shift?',
  'Halve the volume. Why do all the concentrations jump, and why does the system then shift toward NH₃?',
  'Raise the temperature. Why is this the only stress that changes K<sub>c</sub>? Use the sign of Δ<sub>r</sub>H.',
  'Switch to chromate ⇌ dichromate. Add H₃O⁺, then remove H₃O⁺ (add OH⁻). Predict the colour change each time before you press the button.',
  'Add a catalyst, then an inert gas. Why does neither shift the equilibrium?',
];

const LABELS = {
  haber: 'Haber process: N₂ + 3 H₂ ⇌ 2 NH₃',
  contact: 'Contact process: 2 SO₂ + O₂ ⇌ 2 SO₃',
  no2: '2 NO₂ (brown) ⇌ N₂O₄ (colourless)',
  chromate: 'Chromate (yellow) ⇌ dichromate (orange)',
};
const side = (list) => list.map(([n, s]) => (n === 1 ? '' : `${n} `) + species(s)).join(' + ');
const bare = (s) => species(s.replace(/\((g|aq|l|s)\)$/, ''));
const term = ([n, s]) => `[${bare(s)}]${n === 1 ? '' : String(n).replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d])}`;
const DIR = { forward: 'forward (toward products)', reverse: 'reverse (toward reactants)', none: 'no shift' };
const TAU = 1.5; // s of relaxation on screen; animation only
const RGB = { yellow: [240, 196, 25], orange: [242, 140, 40] };
const WINDOW = 25;
// A fixed scatter in [0, 1) for particle positions.
const rand = (a) => {
  const x = Math.sin(a) * 43758.5453;
  return x - Math.floor(x);
};

export function mount(ui) {
  const box = section(ui.controls, 'System');
  const pick = choice(box, { label: 'Equilibrium', options: E.systems.map((s) => ({ value: s.id, label: LABELS[s.id] })), value: 'haber' });
  const stressBox = section(ui.controls, 'Stress');
  const amount = slider(stressBox, { label: 'Amount added', min: 0.05, max: 0.5, step: 0.01, value: 0.2, unit: 'mol/L', digits: 3 });
  const btnBox = el('div', {}, stressBox);

  const out = readouts(ui.readouts, [
    { id: 'rx', label: 'Reaction' },
    { id: 'dh', label: 'Δ<sub>r</sub>H' },
    { id: 'kexp', label: 'K<sub>c</sub> expression' },
    { id: 'k', label: 'K<sub>c</sub>' },
    { id: 'stress', label: 'Last stress' },
    { id: 'q', label: 'Right after it' },
    { id: 'shift', label: 'Shift' },
  ]);
  const table = el('table', { class: 'data-table', style: 'margin-top: 10px' }, ui.readouts);

  const canvas = fitCanvas(ui.canvas);
  let sys;
  let K;
  let V;
  let segs; // [{ t0, from, to, tau, tag }]
  let last;
  let temp;
  let catalyst;
  const clock = createClock(ui.transport, { frame: draw, onReset: restart, autoplay: true });
  pick.onChange(() => clock.reset());
  restart();

  const at = (t) => {
    let seg = segs[0];
    for (const s of segs) if (s.t0 <= t) seg = s;
    const k = Math.exp(-(t - seg.t0) / seg.tau);
    return Object.fromEntries(Object.keys(seg.to).map((s) => [s, seg.to[s] + (seg.from[s] - seg.to[s]) * k]));
  };

  function restart() {
    sys = E.systems.find((s) => s.id === pick.value);
    K = E.massAction(sys, sys.start);
    V = 1;
    segs = [{ t0: 0, from: { ...sys.start }, to: { ...sys.start }, tau: TAU, tag: '' }];
    last = null;
    temp = 0;
    catalyst = false;
    buildButtons();
    fillTable();
  }

  function apply(stress, label, tag) {
    const t = clock.t;
    // Start from the equilibrium the last shift is heading to, not the animation's
    // transient: a stress pressed mid-shift would otherwise begin off equilibrium
    // and Q would not follow the student method (docs/FINDINGS_readouts.md).
    const before = segs.at(-1).to;
    const after = E.applyStress(sys, { c: before, K, V }, stress);
    const Q = E.massAction(sys, after.c);
    const dir = E.shiftDirection(Q, after.K);
    const eq = dir === 'none' ? after.c : E.equilibrate(sys, after.c, after.K);
    if (stress.kind === 'catalyst') catalyst = true;
    if (stress.kind === 'temperature') temp += stress.dir;
    segs.push({ t0: t, from: after.c, to: eq, tau: catalyst ? TAU / 3 : TAU, tag });
    last = { stress, label, before, after: after.c, eq, Q, K0: K, K1: after.K, dir };
    K = after.K;
    V = after.V;
    fillTable();
    clock.play();
  }

  function buildButtons() {
    btnBox.innerHTML = '';
    const all = [...sys.reactants, ...sys.products].filter(([, s]) => s in sys.start);
    const acid = (s) => s === 'H3O^+(aq)';
    for (const [, s] of all) {
      buttons(btnBox, [
        { label: `Add ${species(s)}${acid(s) ? ' (acid)' : ''}`, onClick: () => apply({ kind: 'add', species: s, amount: amount.value }, `added ${fixed(amount.value, 3)} mol/L ${species(s)}`, `+${bare(s)}`) },
        { label: `Remove half the ${bare(s)}${acid(s) ? ' (add OH⁻)' : ''}`, onClick: () => apply({ kind: 'remove', species: s }, `removed half the ${species(s)}`, `−${bare(s)}`) },
      ]);
    }
    const more = [];
    if (E.isGasSystem(sys)) {
      more.push({ label: 'Halve the volume', onClick: () => apply({ kind: 'volume', factor: 0.5 }, 'volume halved (pressure up)', 'V÷2') });
      more.push({ label: 'Double the volume', onClick: () => apply({ kind: 'volume', factor: 2 }, 'volume doubled (pressure down)', 'V×2') });
    }
    if (sys.thermo) {
      more.push({ label: 'Raise T', onClick: () => apply({ kind: 'temperature', dir: 1 }, 'temperature raised', 'T↑') });
      more.push({ label: 'Lower T', onClick: () => apply({ kind: 'temperature', dir: -1 }, 'temperature lowered', 'T↓') });
    }
    more.push({ label: 'Add a catalyst', onClick: () => apply({ kind: 'catalyst' }, 'catalyst added', 'cat.') });
    if (E.isGasSystem(sys)) more.push({ label: 'Add inert gas', onClick: () => apply({ kind: 'inert' }, 'inert gas added at constant volume', 'inert') });
    for (let i = 0; i < more.length; i += 2) buttons(btnBox, more.slice(i, i + 2));
  }

  function fillTable() {
    const { num, den } = E.expression(sys);
    const cols = last ? ['before', 'just after', 'new equilibrium ≈'] : ['at equilibrium'];
    table.innerHTML = `<thead><tr><th>Species (mol/L)</th>${cols.map((c) => `<th>${c}</th>`).join('')}</tr></thead>`;
    const body = el('tbody', {}, table);
    for (const [, s] of [...den, ...num]) {
      const tr = el('tr', {}, body);
      el('td', { text: species(s), style: 'text-align: left' }, tr);
      const vals = last ? [last.before[s], last.after[s], last.eq[s]] : [sys.start[s]];
      for (const v of vals) el('td', { text: fmt(v, 3) }, tr);
    }
  }

  function reason() {
    const { stress, dir } = last;
    const q = dir === 'forward' ? 'Q < Kc' : dir === 'reverse' ? 'Q > Kc' : 'Q = Kc';
    if (stress.kind === 'catalyst') return 'no shift: a catalyst speeds up both directions equally, so equilibrium is reached sooner';
    if (stress.kind === 'inert') return 'no shift: at constant volume no concentration in Q changes';
    if (stress.kind === 'volume') {
      const nR = E.gasMoles(sys.reactants);
      const nP = E.gasMoles(sys.products);
      return `${DIR[dir]}: ${q}. ${stress.factor < 1 ? 'Higher pressure favours fewer' : 'Lower pressure favours more'} moles of gas (${nR} reactant, ${nP} product)`;
    }
    if (stress.kind === 'temperature') {
      const exo = E.deltaH(sys) < 0;
      return `${DIR[dir]}: forward is ${exo ? 'exothermic' : 'endothermic'}, so ${stress.dir > 0 ? 'raising' : 'lowering'} T ${last.K1 < last.K0 ? 'lowers' : 'raises'} Kc and now ${q}`;
    }
    return `${DIR[dir]}: ${q}, so the ${dir} reaction runs until Q = Kc`;
  }

  function draw(clk) {
    const { ctx, w, h } = canvas;
    const th = theme();
    const { num, den } = E.expression(sys);
    const dH = E.deltaH(sys);

    out.set('rx', `${side(sys.reactants)} ⇌ ${side(sys.products)}`);
    out.set('dh', dH === null ? '— (no ΔfH° for these ions in the booklet)' : `${fixed(dH, 1)} kJ (${dH < 0 ? 'exothermic' : 'endothermic'} forward)`);
    out.set('kexp', `Kc = ${num.map(term).join('')} / ${den.length > 1 ? `(${den.map(term).join('')})` : den.map(term).join('')}`);
    out.set('k', `${fmt(K, 3)}${temp !== 0 ? ` (at the new T; illustrative, Kc ${temp > 0 === dH < 0 ? '÷' : '×'} ${E.TEMPERATURE_FACTOR ** Math.abs(temp)})` : ''}`);
    out.set('stress', last ? last.label : '— (press a stress button)');
    out.set('q', last ? `Q = ${fmt(last.Q, 3)}, Kc = ${fmt(last.K1, 3)}` : '—');
    out.set('shift', last ? reason() : '—');

    const now = at(clk.t);
    const colourOf = new Map();
    den.forEach(([, s], i) => colourOf.set(s, [th.reactant, th.seriesA][i]));
    num.forEach(([, s], i) => colourOf.set(s, [th.product, th.seriesB][i]));
    const all = [...den, ...num].map(([, s]) => s);

    clear(ctx, w, h);
    const narrow = w < 620;
    const app = narrow ? { x: 0, y: 0, w, h: h * 0.38 } : { x: 0, y: 0, w: w * 0.3, h };
    const gr = narrow ? { x: 0, y: h * 0.38, w, h: h * 0.62 } : { x: w * 0.3, y: 0, w: w * 0.7, h };

    // --- vessel: a cylinder with a piston for gases, a beaker for the solution ---
    const cx = app.x + app.w / 2;
    const vw = Math.min(app.w * 0.6, narrow ? 150 : 180);
    const vBot = app.y + app.h - (narrow ? 30 : 60);
    const full = vBot - app.y - 34;
    const gas = E.isGasSystem(sys);
    const vh = gas ? full * Math.min(1, Math.max(0.2, Math.sqrt(V) * 0.6)) : full * 0.8;
    const vTop = vBot - vh;
    if (sys.id === 'no2') {
      ctx.fillStyle = `rgba(150, 75, 20, ${Math.min(0.6, now['NO2(g)'] * 1.6)})`;
      ctx.fillRect(cx - vw / 2, vTop, vw, vh);
    } else if (!gas) {
      const cr = 2 * now['Cr2O7^2-(aq)'];
      const f = cr / (cr + now['CrO4^2-(aq)']);
      const a = RGB[ionColours['CrO4^2-(aq)'].strong];
      const b = RGB[ionColours['Cr2O7^2-(aq)'].strong];
      const mix = (i) => Math.round(a[i] + (b[i] - a[i]) * f);
      ctx.fillStyle = `rgba(${mix(0)}, ${mix(1)}, ${mix(2)}, 0.75)`;
      ctx.fillRect(cx - vw / 2, vTop + vh * 0.25, vw, vh * 0.75);
    }
    ctx.strokeStyle = th.ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - vw / 2, gas ? app.y + 30 : vTop);
    ctx.lineTo(cx - vw / 2, vBot);
    ctx.lineTo(cx + vw / 2, vBot);
    ctx.lineTo(cx + vw / 2, gas ? app.y + 30 : vTop);
    ctx.stroke();
    if (gas) {
      ctx.fillStyle = th.element;
      roundRect(ctx, cx - vw / 2 + 2, vTop - 8, vw - 4, 8, 2);
      ctx.fill();
      line(ctx, cx, vTop - 8, cx, app.y + 22, { color: th.element, width: 4 });
    }
    // Particles: counts follow the amounts (c × V); positions are decoration.
    const inner = { x: cx - vw / 2 + 6, y: (gas ? vTop : vTop + vh * 0.25) + 6, w: vw - 12, h: (gas ? vh : vh * 0.75) - 12 };
    all.forEach((s, k) => {
      const n = Math.min(70, Math.round(now[s] * V * 40));
      ctx.fillStyle = colourOf.get(s);
      for (let i = 0; i < n; i++) {
        const x = inner.x + inner.w * rand(i * 12.9898 + k * 78.233) + 3 * Math.sin(clk.t * 2 + i);
        const y = inner.y + inner.h * rand(i * 39.3468 + k * 11.135) + 3 * Math.cos(clk.t * 1.7 + i * 1.3);
        ctx.beginPath();
        ctx.arc(Math.min(inner.x + inner.w, Math.max(inner.x, x)), Math.min(inner.y + inner.h, Math.max(inner.y, y)), 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    const notes = [];
    if (temp) notes.push(`T ${temp > 0 ? 'raised' : 'lowered'}${Math.abs(temp) > 1 ? ` ×${Math.abs(temp)}` : ''}`);
    if (catalyst) notes.push('catalyst');
    if (gas && V !== 1) notes.push(`V × ${fmt(V, 3)}`);
    text(ctx, notes.join(' · ') || (gas ? 'sealed, piston free to move' : 'aqueous'), cx, vBot + 14, { size: 11, color: th.muted, align: 'center' });

    // --- concentration vs time ---
    const x0 = Math.max(0, clk.t - WINDOW * 0.9);
    const x1 = x0 + WINDOW;
    const X0 = gr.x + (narrow ? 40 : 52);
    const X1 = gr.x + gr.w - (narrow ? 44 : 64);
    const Y0 = gr.y + 22;
    const Y1 = gr.y + gr.h - 34;
    let top = 0;
    const samples = [];
    for (let t = x0; t <= Math.min(clk.t, x1) + 1e-9; t += 0.05) samples.push([t, at(t)]);
    for (const sg of segs) if (sg.t0 > x0 && sg.t0 <= clk.t) samples.push([sg.t0 - 1e-6, at(sg.t0 - 1e-6)], [sg.t0, at(sg.t0)]);
    samples.push([clk.t, now]);
    samples.sort((p, q) => p[0] - q[0]);
    for (const [, c] of samples) for (const s of all) top = Math.max(top, c[s]);
    const step = niceStep(top * 1.15, 5);
    const yMax = Math.ceil((top * 1.15) / step) * step;
    const px = (t) => X0 + ((t - x0) / WINDOW) * (X1 - X0);
    const py = (c) => Y1 - (c / yMax) * (Y1 - Y0);
    for (let c = 0; c <= yMax + 1e-9; c += step) {
      line(ctx, X0, py(c), X1, py(c), { color: th.grid, width: 1 });
      text(ctx, fixed(c, Math.max(0, -Math.floor(Math.log10(step)))), X0 - 6, py(c), { size: 11, color: th.muted, align: 'right' });
    }
    ctx.strokeStyle = th.muted;
    ctx.lineWidth = 1;
    ctx.strokeRect(X0, Y0, X1 - X0, Y1 - Y0);
    text(ctx, 'c (mol/L)', X0, Y0 - 12, { size: 12, color: th.muted, weight: 650 });
    text(ctx, 'time →', (X0 + X1) / 2, Y1 + 16, { size: 12, color: th.muted, align: 'center' });
    for (const sg of segs) {
      if (!sg.tag || sg.t0 < x0 || sg.t0 > clk.t) continue;
      line(ctx, px(sg.t0), Y0, px(sg.t0), Y1, { color: th.muted, width: 1, dash: [3, 4] });
      text(ctx, sg.tag, px(sg.t0) + 3, Y0 + 9, { size: 11, color: th.muted });
    }
    for (const s of all) {
      ctx.strokeStyle = colourOf.get(s);
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      samples.forEach(([t, c], i) => (i ? ctx.lineTo(px(t), py(c[s])) : ctx.moveTo(px(t), py(c[s]))));
      ctx.stroke();
      text(ctx, bare(s), px(clk.t) + 6, py(now[s]), { size: 12, weight: 650, color: colourOf.get(s) });
    }
  }
}
