import * as K from '../chem/calorimetry.js';
import { specificHeat, WATER_DENSITY } from '../chem/constants.js';
import { fitCanvas, theme, clear, line, text, roundRect } from '../lib/canvas.js';
import { section, slider, choice, readouts } from '../lib/controls.js';
import { createClock } from '../lib/clock.js';
import { fmt } from '../lib/format.js';

export const equations = [
  { html: 'Q = mcΔt', what: 'heat gained (+) or lost (−) by one object' },
  { html: 'Δt = t<sub>final</sub> − t<sub>initial</sub>', what: 'negative when the object cools, so Q is negative: heat lost' },
  { html: 'm = V × 1.00 g/mL', what: 'for water only (not printed in the booklet)' },
  { html: 'Q<sub>lost by metal</sub> = Q<sub>gained by the other object</sub>', what: 'two objects: no heat leaves the system' },
  { html: 't<sub>f</sub> = (m<sub>1</sub>c<sub>1</sub>t<sub>1</sub> + m<sub>2</sub>c<sub>2</sub>t<sub>2</sub>) / (m<sub>1</sub>c<sub>1</sub> + m<sub>2</sub>c<sub>2</sub>)', what: 'solving the line above for the final temperature' },
];

export const prompts = [
  'One object: how much energy is lost by 48 mL of water if its temperature drops by 30.0 °C? Work it out, then set the controls and check.',
  'One object: give 100 g of copper and 100 g of water the same 10.0 °C rise. Which needs more heat, and how many times more?',
  'Two objects — predict: will the final temperature be closer to the metal’s or the water’s starting temperature? Play it and check.',
  'Two objects: put the same hot block in 200 g of air instead of water. Why does the air warm so much more, for the same heat?',
  'Two objects: swap copper for aluminium with the same mass. Which one warms the water more, and why?',
  'Two objects: double the water mass. Does the heat transferred double? Does the temperature change of the water?',
];

export const legend = [
  { color: 'series-b', label: 'metal temperature' },
  { color: 'series-a', label: 'water, air or cup temperature' },
];

const cLabel = (name, key) => `${name} (c = ${specificHeat[key]} J/(g·°C))`;
const METALS = [
  { value: 'copper', label: cLabel('Copper', 'copper') },
  { value: 'aluminium', label: cLabel('Aluminium', 'aluminium') },
  { value: 'iron', label: cLabel('Iron', 'iron') },
  { value: 'tin', label: cLabel('Tin', 'tin') },
];
// What the metal exchanges heat with; c values from the Data Booklet.
const OTHERS = [
  { value: 'water', name: 'water', label: cLabel('Water', 'water') },
  { value: 'air', name: 'air', label: cLabel('Air', 'air') },
  { value: 'polystyreneCup', name: 'foam cup', bar: 'cup', label: cLabel('Polystyrene foam cup', 'polystyreneCup') },
];
const METAL_NAMES = { copper: 'copper', aluminium: 'aluminium', iron: 'iron', tin: 'tin' };
const RATE = 0.8; // e-foldings per second of playback; animation only
const T_MAX = 100;

export function mount(ui) {
  const qbox = section(ui.controls, 'Question');
  const mode = choice(qbox, {
    label: 'Question type',
    options: [
      { value: 'one', label: 'One object: Q = mcΔt' },
      { value: 'two', label: 'Two objects: heat lost = heat gained' },
    ],
    value: 'one',
  });

  // --- one object ---
  const obox = section(ui.controls, 'Object');
  const sub = choice(obox, { label: 'Substance', options: [...OTHERS, ...METALS], value: 'water' });
  const vol = slider(obox, { label: 'Volume of water', min: 1, max: 1000, step: 1, value: 48, unit: 'mL' });
  const volRow = obox.lastElementChild;
  const mass = slider(obox, { label: 'Mass', min: 1, max: 1000, step: 1, value: 100, unit: 'g' });
  const massRow = obox.lastElementChild;
  const ti = slider(obox, { label: 'Initial temperature', min: 0, max: 100, step: 0.5, value: 80, unit: '°C', digits: 1 });
  const tfin = slider(obox, { label: 'Final temperature', min: 0, max: 100, step: 0.5, value: 50, unit: '°C', digits: 1 });

  // --- two objects ---
  const mbox = section(ui.controls, 'Metal block');
  const metal = choice(mbox, { label: 'Metal', options: METALS, value: 'copper' });
  const mm = slider(mbox, { label: 'Mass', min: 10, max: 200, step: 1, value: 50, unit: 'g' });
  const tm = slider(mbox, { label: 'Initial temperature', min: 30, max: 100, step: 0.5, value: 100, unit: '°C', digits: 1 });
  const wbox = section(ui.controls, 'Absorbs the heat');
  const other = choice(wbox, { label: 'Substance', options: OTHERS, value: 'water' });
  const mw = slider(wbox, { label: 'Mass', min: 1, max: 400, step: 1, value: 200, unit: 'g' });
  const tw = slider(wbox, { label: 'Initial temperature', min: 5, max: 30, step: 0.5, value: 20, unit: '°C', digits: 1 });

  const out1 = readouts(ui.readouts, [
    { id: 'm', label: 'Mass m' },
    { id: 'c', label: 'Specific heat capacity c' },
    { id: 'dt', label: 'Δt = t<sub>final</sub> − t<sub>initial</sub>' },
    { id: 'q', label: 'Q = mcΔt' },
    { id: 'kind', label: 'Heat is' },
  ]);
  const dl1 = ui.readouts.lastElementChild;
  const out2 = readouts(ui.readouts, [
    { id: 'tf', label: 'Final temperature t<sub>f</sub>' },
    { id: 'dtm', label: 'Δt of metal' },
    { id: 'dtw', label: 'Δt of the other object' },
    { id: 'qm', label: 'Q of metal' },
    { id: 'qw', label: 'Q of the other object' },
  ]);
  const dl2 = ui.readouts.lastElementChild;

  const canvas = fitCanvas(ui.canvas);
  const clock = createClock(ui.transport, { frame: draw });
  [mode, sub, vol, mass, ti, tfin, metal, mm, tm, other, mw, tw].forEach((c) => c.onChange(() => (clock.pause(), clock.reset())));

  function draw(clk) {
    const one = mode.value === 'one';
    const shown = (node, on) => {
      const d = on ? '' : 'none';
      if (node.style.display !== d) node.style.display = d;
    };
    [obox, dl1].forEach((n) => shown(n, one));
    [mbox, wbox, dl2].forEach((n) => shown(n, !one));
    shown(volRow, sub.value === 'water');
    shown(massRow, sub.value !== 'water');
    clear(canvas.ctx, canvas.w, canvas.h);
    (one ? drawOne : drawTwo)(clk);
  }

  // The cup (with water ∝ fill when it holds water) and the shared temperature scale.
  function frame(waterFill) {
    const { ctx, w, h } = canvas;
    const th = theme();
    const narrow = w < 620;
    const cupW = Math.min(narrow ? w * 0.5 : w * 0.3, 220);
    const cupH = Math.min(h * 0.62, 260);
    const cx = narrow ? w * 0.28 : w * 0.2;
    const top = (h - cupH) / 2;
    if (waterFill !== null) {
      const waterH = cupH * (0.35 + 0.55 * waterFill);
      ctx.fillStyle = th.seriesA + '33';
      ctx.fillRect(cx - cupW / 2, top + cupH - waterH, cupW, waterH);
    }
    ctx.strokeStyle = th.ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - cupW / 2 - 8, top);
    ctx.lineTo(cx - cupW / 2, top + cupH);
    ctx.lineTo(cx + cupW / 2, top + cupH);
    ctx.lineTo(cx + cupW / 2 + 8, top);
    ctx.stroke();
    const gx = narrow ? w * 0.6 : w * 0.48;
    const gw = w - gx - 24;
    const Y = (t) => top + cupH - (t / T_MAX) * cupH;
    for (let t = 0; t <= T_MAX; t += 20) {
      line(ctx, gx, Y(t), gx + gw, Y(t), { color: th.grid });
      text(ctx, `${t}`, gx - 6, Y(t), { color: th.muted, size: 11, align: 'right' });
    }
    text(ctx, 't (°C)', gx, top - 14, { color: th.muted, size: 12 });
    const bar = (t, color, label, i) => {
      const bw = Math.min(40, gw / 5);
      const x = gx + gw * (i ? 0.68 : 0.28) - bw / 2;
      ctx.fillStyle = color;
      ctx.fillRect(x, Y(t), bw, Y(0) - Y(t));
      text(ctx, label, x + bw / 2, Y(0) + 14, { color: th.ink, size: 12, align: 'center' });
    };
    const finalLine = (t) => {
      line(ctx, gx, Y(t), gx + gw, Y(t), { color: th.muted, dash: [5, 4] });
      text(ctx, `final = ${fmt(t, 3)} °C`, gx + gw, Y(t) - 10, { color: th.muted, size: 11, align: 'right' });
    };
    const block = (m, maxM, color) => {
      const side = 18 + 36 * Math.cbrt(m / maxM);
      ctx.fillStyle = color;
      roundRect(ctx, cx - side / 2, top + cupH - side - 6, side, side, 4);
      ctx.fill();
    };
    const caption = (s) => text(ctx, s, cx, top + cupH + 16, { color: th.muted, size: 12, align: 'center' });
    return { th, bar, finalLine, block, caption };
  }

  function drawOne(clk) {
    const key = sub.value;
    const isWater = key === 'water';
    const isMetal = key in METAL_NAMES;
    const c = specificHeat[key];
    const m = isWater ? K.waterMass(vol.value) : mass.value;
    const dt = tfin.value - ti.value;
    const Q = K.heat(m, c, dt);
    const name = sub.option.name ?? METAL_NAMES[key];

    out1.set('m', isWater ? `${vol.value} mL × ${WATER_DENSITY.toFixed(2)} g/mL = ${fmt(m, 3)} g` : `${fmt(m, 3)} g`);
    out1.set('c', `${c} J/(g·°C)`);
    out1.set('dt', `${fmt(dt, 3)} °C`);
    out1.set('q', `${fmt(Q / 1000, 3)} kJ`);
    out1.set('kind', Q < 0 ? `lost by the ${name}` : Q > 0 ? `gained by the ${name}` : 'not transferred (Δt = 0)');

    const f = frame(isWater ? Math.min(1, vol.value / 1000) : null);
    const color = isMetal ? f.th.seriesB : f.th.seriesA;
    if (isMetal) f.block(mass.value, 1000, color);
    f.caption(isWater ? 'water in a cup' : isMetal ? `${name} block` : key === 'air' ? 'air' : 'foam cup');
    const now = tfin.value + (ti.value - tfin.value) * Math.exp(-clk.t * RATE);
    f.finalLine(tfin.value);
    f.bar(ti.value, f.th.muted, 'initial', 0);
    f.bar(now, color, 'now', 1);
  }

  function drawTwo(clk) {
    const cm = specificHeat[metal.value];
    const cw = specificHeat[other.value];
    const name = other.option.name;
    const tf = K.finalTemperature(mm.value, cm, tm.value, mw.value, cw, tw.value);
    const [nowM, nowW] = K.temperaturesAt(mm.value, cm, tm.value, mw.value, cw, tw.value, clk.t * RATE);

    // Name the other object in its readout labels (Δt of air, Q of foam cup).
    dl2.querySelectorAll('dt').forEach((dt, i) => {
      const label = i === 2 ? `Δt of ${name}` : i === 4 ? `Q of ${name}` : null;
      if (label && dt.textContent !== label) dt.textContent = label;
    });
    out2.set('tf', `${fmt(tf, 3)} °C`);
    out2.set('dtm', `${fmt(tf - tm.value, 3)} °C`);
    out2.set('dtw', `${fmt(tf - tw.value, 3)} °C`);
    out2.set('qm', `${fmt(K.heat(mm.value, cm, tf - tm.value) / 1000, 3)} kJ`);
    out2.set('qw', `${fmt(K.heat(mw.value, cw, tf - tw.value) / 1000, 3)} kJ`);

    const f = frame(other.value === 'water' ? mw.value / 400 : null);
    f.block(mm.value, 200, f.th.seriesB);
    f.caption('foam cup');
    f.finalLine(tf);
    f.bar(nowM, f.th.seriesB, 'metal', 0);
    f.bar(nowW, f.th.seriesA, other.option.bar ?? name, 1);
  }
}
