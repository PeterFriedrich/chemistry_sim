import * as F from '../chem/fuel.js';
import { specificHeat } from '../chem/constants.js';
import { fitCanvas, theme, clear, line, text, roundRect } from '../lib/canvas.js';
import { section, slider, choice, readouts } from '../lib/controls.js';
import { createClock } from '../lib/clock.js';
import { fmt, fixed, species } from '../lib/format.js';

export const equations = [
  { html: 'Q = mcΔt', what: 'heat gained by the water; m and c are the water’s' },
  { html: 'n = m/M', what: 'amount of fuel burned; m is the fuel’s mass lost' },
  { html: 'nΔ<sub>c</sub>H = −Q, so Δ<sub>c</sub>H = −Q/n', what: 'the fuel releases the heat the water gains (ΔcH < 0)' },
  { html: 'Δ<sub>c</sub>H° = Σ nΔ<sub>f</sub>H°<sub>products</sub> − Σ nΔ<sub>f</sub>H°<sub>reactants</sub>', what: 'the theoretical value, per mole of fuel' },
  { html: 'efficiency = Q ÷ (n × |Δ<sub>c</sub>H°|) × 100 %', what: 'the share of the fuel’s energy that reached the water' },
];

export const prompts = [
  'Burn 1.00 g of ethanol under 200 g of water in the open can. Read Δt, then find the experimental ΔcH and the efficiency by hand before you check.',
  'Why is the experimental ΔcH so much smaller in size than the theoretical ΔcH°? Name three places the missing heat went.',
  'Switch to the insulated can with the same fuel and masses. What changes: the experimental ΔcH, the theoretical ΔcH°, or both?',
  'Switch the water in the theoretical equation from vapour to liquid. Which value changes, and why is H₂O(g) the usual choice for an open flame?',
  'Double the mass of fuel. What happens to Δt, to Q, and to the experimental ΔcH? Explain why ΔcH stays the same.',
];

export const legend = [
  { color: 'series-a', label: 'water temperature' },
  { color: 'exo', label: 'flame' },
];

const FUELS = F.fuels.map((f) => ({ value: f.id, label: `${species(f.formula)}, ${f.name}`, fuel: f }));
const BURN = 6; // seconds of playback for the burn; animation only

export function mount(ui) {
  const fbox = section(ui.controls, 'Fuel');
  const fuel = choice(fbox, { label: 'Fuel', options: FUELS, value: 'ethanol' });
  const mf = slider(fbox, { label: 'Mass of fuel burned', min: 0.5, max: 3, step: 0.01, value: 1, unit: 'g', digits: 2 });
  const wbox = section(ui.controls, 'Water in the can');
  const mw = slider(wbox, { label: 'Mass of water', min: 100, max: 400, step: 1, value: 200, unit: 'g' });
  const ti = slider(wbox, { label: 'Initial temperature', min: 10, max: 25, step: 0.1, value: 20, unit: '°C', digits: 1 });
  const abox = section(ui.controls, 'Apparatus');
  const app = choice(abox, {
    label: 'Set-up',
    options: Object.entries(F.apparatus).map(([value, a]) => ({ value, label: a.label })),
    value: 'open',
  });
  const water = choice(abox, {
    label: 'Water in the theoretical ΔcH°',
    options: [
      { value: 'g', label: 'Vapour, H₂O(g)' },
      { value: 'l', label: 'Liquid, H₂O(l)' },
    ],
    value: 'g',
  });

  const out = readouts(ui.readouts, [
    { id: 'tf', label: 'Final temperature (thermometer)' },
    { id: 'dt', label: 'Δt = t<sub>final</sub> − t<sub>initial</sub>' },
    { id: 'q', label: 'Q = mcΔt (water)' },
    { id: 'n', label: 'n = m/M (fuel)' },
    { id: 'exp', label: 'Δ<sub>c</sub>H, experimental = −Q/n' },
    { id: 'theo', label: 'Δ<sub>c</sub>H°, from Δ<sub>f</sub>H°' },
    { id: 'eff', label: 'Efficiency' },
  ]);

  const canvas = fitCanvas(ui.canvas);
  const clock = createClock(ui.transport, { frame: draw });
  [fuel, mf, mw, ti, app, water].forEach((c) => c.onChange(() => (clock.pause(), clock.reset())));

  function draw(clk) {
    const f = fuel.option.fuel;
    const eff = F.apparatus[app.value].efficiency;
    const tf = F.finalReading(f, water.value, mf.value, mw.value, ti.value, eff);
    const boils = tf >= 100;
    const r = F.analyse(f, water.value, mf.value, mw.value, ti.value, tf);

    if (boils) {
      out.set('tf', '— the water would boil: burn less fuel or use more water');
      ['dt', 'q', 'n', 'exp', 'eff'].forEach((id) => out.set(id, '—'));
    } else {
      out.set('tf', `${fixed(tf, 1)} °C`);
      out.set('dt', `${fixed(tf, 1)} − ${fixed(ti.value, 1)} = ${fixed(r.dt, 1)} °C`);
      out.set('q', `${mw.value} g × ${specificHeat.water} J/(g·°C) × ${fixed(r.dt, 1)} °C = ${fmt(r.Q, 3)} kJ`);
      out.set('n', `${fixed(mf.value, 2)} g ÷ ${fixed(r.M, 2)} g/mol = ${fmt(r.n, 3)} mol`);
      out.set('exp', `${fmt(r.experimental, 3)} kJ/mol`);
      out.set('eff', `${fmt(r.efficiency * 100, 3)} %`);
    }
    out.set('theo', `${fixed(r.theoretical, 1)} kJ/mol`);

    const { ctx, w, h } = canvas;
    const th = theme();
    clear(ctx, w, h);
    const narrow = w < 620;
    const p = Math.min(1, clk.t / BURN);
    const tEnd = boils ? 100 : tf;
    const tNow = ti.value + (tEnd - ti.value) * p;

    // --- apparatus: can of water on a stand over the burner ---
    const cx = narrow ? w * 0.24 : w * 0.22;
    const canW = Math.min(narrow ? w * 0.3 : w * 0.18, 150);
    const canH = h * 0.32;
    const canTop = h * 0.12;
    const canBot = canTop + canH;
    const fillH = canH * (0.45 + 0.4 * (mw.value / 400));
    ctx.fillStyle = th.seriesA + '33';
    ctx.fillRect(cx - canW / 2, canBot - fillH, canW, fillH);
    ctx.strokeStyle = th.ink;
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - canW / 2, canTop, canW, canH);
    // Tripod under the can.
    line(ctx, cx - canW / 2 - 8, canBot + 2, cx + canW / 2 + 8, canBot + 2, { color: th.ink, width: 3 });
    line(ctx, cx - canW / 2, canBot + 2, cx - canW / 2 - 10, h * 0.86, { color: th.ink, width: 2 });
    line(ctx, cx + canW / 2, canBot + 2, cx + canW / 2 + 10, h * 0.86, { color: th.ink, width: 2 });
    // Thermometer in the water.
    line(ctx, cx + canW * 0.25, canTop - 24, cx + canW * 0.25, canBot - 8, { color: th.muted, width: 3 });
    if (app.value === 'insulated') {
      // Draught shield around the can and flame.
      const sw = canW + 28;
      ctx.save();
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = th.muted;
      ctx.strokeRect(cx - sw / 2, canTop - 8, sw, h * 0.86 - canTop);
      ctx.restore();
      text(ctx, 'shield', cx - sw / 2 + 4, canTop - 16, { color: th.muted, size: 11 });
    }
    // Burner: a jar whose fuel level falls as it burns.
    const jarW = canW * 0.5;
    const jarH = h * 0.16;
    const jarBot = h * 0.86;
    const jarTop = jarBot - jarH;
    const fuelFrac = 0.75 - 0.35 * p * (mf.value / 3);
    ctx.fillStyle = th.muted + '55';
    ctx.fillRect(cx - jarW / 2, jarBot - jarH * fuelFrac, jarW, jarH * fuelFrac);
    ctx.strokeStyle = th.ink;
    roundRect(ctx, cx - jarW / 2, jarTop, jarW, jarH, 4);
    ctx.stroke();
    line(ctx, cx, jarTop, cx, jarTop - 8, { color: th.ink, width: 2 });
    if (clk.t > 0 && p < 1) {
      const fh = (jarTop - 8 - canBot) * (0.7 + 0.15 * Math.sin(clk.t * 17));
      ctx.fillStyle = th.exo;
      ctx.beginPath();
      ctx.moveTo(cx - 9, jarTop - 8);
      ctx.quadraticCurveTo(cx, jarTop - 8 - fh * 1.4, cx + 9, jarTop - 8);
      ctx.fill();
    }
    text(ctx, `${f.name}`, cx, jarBot + 14, { color: th.muted, size: 12, align: 'center' });

    // --- temperature against time ---
    const gx = narrow ? w * 0.55 : w * 0.46;
    const gw = w - gx - 20;
    const gTop = h * 0.12;
    const gBot = h * 0.82;
    const lo = Math.floor(ti.value / 10) * 10;
    const hi = Math.min(100, Math.max(lo + 20, Math.ceil((tEnd + 2) / 10) * 10));
    const Y = (t) => gBot - ((t - lo) / (hi - lo)) * (gBot - gTop);
    const X = (s) => gx + s * gw;
    const step = hi - lo > 50 ? 20 : hi - lo > 20 ? 10 : 5;
    for (let t = lo; t <= hi; t += step) {
      line(ctx, gx, Y(t), gx + gw, Y(t), { color: th.grid });
      text(ctx, `${t}`, gx - 6, Y(t), { color: th.muted, size: 11, align: 'right' });
    }
    text(ctx, 't (°C)', gx, gTop - 16, { color: th.muted, size: 12 });
    text(ctx, 'time →', gx + gw, gBot + 16, { color: th.muted, size: 12, align: 'right' });
    line(ctx, X(0), Y(ti.value), X(p), Y(tNow), { color: th.seriesA, width: 3 });
    if (p === 1 && !boils) {
      line(ctx, gx, Y(tf), gx + gw, Y(tf), { color: th.muted, dash: [5, 4] });
      text(ctx, `${fixed(tf, 1)} °C`, gx + gw, Y(tf) - 10, { color: th.muted, size: 11, align: 'right' });
    }
    if (boils) text(ctx, 'the water would boil', gx + gw / 2, gTop + 8, { color: th.danger, size: 13, weight: 650, align: 'center' });
    clock.setTimeLabel(clk.t === 0 ? 'Play to burn the fuel' : p < 1 ? 'burning…' : 'burned: read the thermometer');
  }
}
