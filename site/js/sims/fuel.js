import * as F from '../chem/fuel.js';
import { specificHeat } from '../chem/constants.js';
import { fitCanvas, theme, clear, line, text, roundRect } from '../lib/canvas.js';
import { section, slider, choice, readouts } from '../lib/controls.js';
import { createClock } from '../lib/clock.js';
import { fmt, fixed, species } from '../lib/format.js';
import { molarMass } from '../chem/electrolysis.js';

export const equations = [
  { html: 'Q = mcΔt', what: 'heat gained by the water; m and c are the water’s' },
  { html: 'n = m/M', what: 'amount of fuel burned; m is the fuel’s mass lost' },
  { html: 'nΔ<sub>c</sub>H = −Q, so Δ<sub>c</sub>H = −Q/n', what: 'the fuel releases the heat the water gains (ΔcH < 0)' },
  { html: 'Δ<sub>c</sub>H° = Σ nΔ<sub>f</sub>H°<sub>products</sub> − Σ nΔ<sub>f</sub>H°<sub>reactants</sub>', what: 'the theoretical value, per mole of fuel' },
  { html: 'efficiency = Q ÷ (n × |Δ<sub>c</sub>H°|) × 100 %', what: 'the share of the fuel’s energy that reached the water' },
  { html: 'efficiency = energy gained ÷ energy released × 100 % = mcΔt ÷ n|Δ<sub>c</sub>H| × 100 %', what: 'given values: the object heated can be anything with a given c' },
];

export const prompts = [
  'Given values: propane’s ΔcH is −2043.9 kJ/mol. A barbecue burns 1.00 g of propane to heat a 400 g knife (c = 0.503 J/(g·°C)) by 30.0 °C. Find the efficiency, then check.',
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

const OBJECTS = [
  { value: 'water', name: 'water', c: specificHeat.water },
  { value: 'copper', name: 'copper', c: specificHeat.copper },
  { value: 'aluminium', name: 'aluminium', c: specificHeat.aluminium },
  { value: 'iron', name: 'iron', c: specificHeat.iron },
  { value: 'tin', name: 'tin', c: specificHeat.tin },
].map((o) => ({ ...o, label: `${o.name[0].toUpperCase()}${o.name.slice(1)} (c = ${o.c})` }))
  .concat({ value: 'other', name: 'object', c: null, label: 'Something else: c given in the question' });

export function mount(ui) {
  const qbox = section(ui.controls, 'Question');
  const mode = choice(qbox, {
    label: 'Question type',
    options: [
      { value: 'exp', label: 'Experiment: burn a fuel under a can' },
      { value: 'given', label: 'Given values: efficiency, mass or Δt' },
    ],
    value: 'exp',
  });

  // --- given values ---
  const gbox = section(ui.controls, 'Given in the question');
  const solve = choice(gbox, {
    label: 'Solve for',
    options: [
      { value: 'eff', label: 'Efficiency' },
      { value: 'mass', label: 'Mass of fuel needed' },
      { value: 'dt', label: 'Temperature change Δt' },
    ],
    value: 'eff',
  });
  const gFuel = choice(gbox, { label: 'Fuel', options: FUELS, value: 'propane' });
  const gdcH = slider(gbox, { label: 'Δ<sub>c</sub>H given', min: -10000, max: -1, step: 0.1, value: -2043.9, unit: 'kJ/mol', digits: 1 });
  const gm = slider(gbox, { label: 'Mass of fuel burned', min: 0.01, max: 1000, step: 0.01, value: 1, unit: 'g', digits: 2 });
  const gmRow = gbox.lastElementChild;
  const obj = choice(gbox, { label: 'Object heated', options: OBJECTS, value: 'other' });
  const gc = slider(gbox, { label: 'Its specific heat capacity c', min: 0.001, max: 5, step: 0.001, value: 0.503, unit: 'J/(g·°C)', digits: 3 });
  const gcRow = gbox.lastElementChild;
  const gmo = slider(gbox, { label: 'Mass of the object', min: 1, max: 100000, step: 1, value: 400, unit: 'g' });
  const gdt = slider(gbox, { label: 'Temperature change Δt', min: 0.1, max: 200, step: 0.1, value: 30, unit: '°C', digits: 1 });
  const gdtRow = gbox.lastElementChild;
  const geff = slider(gbox, { label: 'Efficiency', min: 0.1, max: 100, step: 0.1, value: 13, unit: '%', digits: 1 });
  const geffRow = gbox.lastElementChild;
  // A new fuel starts at the booklet's ΔcH° with H₂O(g), the value such questions usually quote.
  gFuel.onChange(() => (gdcH.value = Math.round(F.theoretical(gFuel.option.fuel, 'g') * 10) / 10));

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
  const dl1 = ui.readouts.lastElementChild;
  const out2 = readouts(ui.readouts, [
    { id: 'M', label: 'Molar mass M (fuel)' },
    { id: 'n', label: 'n (fuel)' },
    { id: 'in', label: 'Energy released = n|Δ<sub>c</sub>H|' },
    { id: 'out', label: 'Energy gained = mcΔt' },
    { id: 'ans', label: 'Answer' },
  ]);
  const dl2 = ui.readouts.lastElementChild;

  const canvas = fitCanvas(ui.canvas);
  const clock = createClock(ui.transport, { frame: draw });
  [mode, solve, gFuel, gdcH, gm, obj, gc, gmo, gdt, geff, fuel, mf, mw, ti, app, water].forEach((c) => c.onChange(() => (clock.pause(), clock.reset())));
  const shown = (node, on) => {
    const d = on ? '' : 'none';
    if (node.style.display !== d) node.style.display = d;
  };

  function draw(clk) {
    const given = mode.value === 'given';
    [gbox, dl2].forEach((n) => shown(n, given));
    [fbox, wbox, abox, dl1].forEach((n) => shown(n, !given));
    if (given) return drawGiven();
    drawExperiment(clk);
  }

  function drawGiven() {
    const f = gFuel.option.fuel;
    const M = molarMass(f.formula);
    const c = obj.option.c ?? gc.value;
    const name = obj.option.name;
    shown(gcRow, obj.value === 'other');
    shown(gmRow, solve.value !== 'mass');
    shown(gdtRow, solve.value !== 'dt');
    shown(geffRow, solve.value !== 'eff');
    const q = { mFuel: gm.value, M, dcH: gdcH.value, mObj: gmo.value, c, dt: gdt.value, efficiency: geff.value / 100 };
    const r = solve.value === 'eff' ? F.efficiencyGiven(q) : solve.value === 'mass' ? F.fuelNeeded(q) : F.tempRise(q);
    const efficiency = r.efficiency ?? q.efficiency;
    const mFuel = r.mFuel ?? q.mFuel;
    const dt = r.dt ?? q.dt;
    const kJ = (v) => `${fmt(v, 3)} kJ`;

    out2.set('M', `${fixed(M, 2)} g/mol ${species(f.formula)}`);
    out2.set('n', solve.value === 'mass' ? `${kJ(r.released)} ÷ ${fixed(-q.dcH, 1)} kJ/mol = ${fmt(r.n, 3)} mol` : `${fixed(q.mFuel, 2)} g ÷ ${fixed(M, 2)} g/mol = ${fmt(r.n, 3)} mol`);
    out2.set('in', solve.value === 'mass' ? `${kJ(r.gained)} ÷ ${fixed(geff.value, 1)} % = ${kJ(r.released)}` : `${fmt(r.n, 3)} mol × ${fixed(-q.dcH, 1)} kJ/mol = ${kJ(r.released)}`);
    out2.set('out', solve.value === 'dt' ? `${fixed(geff.value, 1)} % × ${kJ(r.released)} = ${kJ(r.gained)}` : `${q.mObj} g × ${c} J/(g·°C) × ${fixed(q.dt, 1)} °C = ${kJ(r.gained)}`);
    out2.set('ans', solve.value === 'eff' ? `efficiency = ${fmt(efficiency * 100, 3)} %`
      : solve.value === 'mass' ? `m = n × M = ${fmt(mFuel, 3)} g of ${f.name}`
        : `Δt = energy ÷ (mc) = ${fmt(dt, 3)} °C`);

    // Energy flow: what the fuel released, and the share the object gained.
    const { ctx, w, h } = canvas;
    const th = theme();
    clear(ctx, w, h);
    const narrow = w < 620;
    const x0 = 16;
    const bw = w - 32;
    const bh = Math.min(56, h * 0.14);
    const y1 = h * 0.22;
    const y2 = h * 0.55;
    text(ctx, `${species(f.formula)} burning: energy released`, x0, y1 - 16, { size: narrow ? 13 : 15, weight: 650 });
    ctx.fillStyle = th.exo;
    ctx.fillRect(x0, y1, bw, bh);
    text(ctx, kJ(r.released), x0 + bw - 8, y1 + bh / 2, { color: th.surface, size: 14, weight: 700, align: 'right' });
    const e = Math.min(1, efficiency);
    text(ctx, `gained by the ${name}`, x0, y2 - 16, { size: narrow ? 13 : 15, weight: 650 });
    ctx.fillStyle = th.seriesA;
    ctx.fillRect(x0, y2, Math.max(2, bw * e), bh);
    ctx.strokeStyle = th.muted;
    ctx.setLineDash([5, 4]);
    ctx.strokeRect(x0, y2, bw, bh);
    ctx.setLineDash([]);
    const label = `${kJ(r.gained)}  (${fmt(efficiency * 100, 3)} %)`;
    ctx.font = `700 14px ${th.font}`;
    const inside = ctx.measureText(label).width + 16 < bw * e;
    text(ctx, label, inside ? x0 + 8 : x0 + bw * e + 8, y2 + bh / 2, { color: inside ? th.surface : th.ink, size: 14, weight: 700 });
    text(ctx, `lost to the surroundings: ${kJ(r.released - r.gained)}`, x0, y2 + bh + 22, { color: th.muted, size: 12 });
    if (efficiency > 1) text(ctx, 'more than 100 %: check the given values', x0, h - 20, { color: th.danger, size: 13, weight: 650 });
    clock.setTimeLabel('');
  }

  function drawExperiment(clk) {
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
