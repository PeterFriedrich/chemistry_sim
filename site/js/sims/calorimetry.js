import * as K from '../chem/calorimetry.js';
import { specificHeat } from '../chem/constants.js';
import { fitCanvas, theme, clear, line, text, roundRect } from '../lib/canvas.js';
import { section, slider, choice, readouts } from '../lib/controls.js';
import { createClock } from '../lib/clock.js';
import { fmt } from '../lib/format.js';

export const equations = [
  { html: 'Q = mcΔt', what: 'heat gained (+) or lost (−) by one object' },
  { html: 'Q<sub>lost by metal</sub> = Q<sub>gained by water</sub>', what: 'no heat leaves the cup' },
  { html: 't<sub>f</sub> = (m<sub>1</sub>c<sub>1</sub>t<sub>1</sub> + m<sub>2</sub>c<sub>2</sub>t<sub>2</sub>) / (m<sub>1</sub>c<sub>1</sub> + m<sub>2</sub>c<sub>2</sub>)', what: 'solving the line above for the final temperature' },
];

export const prompts = [
  'Predict: will the final temperature be closer to the metal’s or the water’s starting temperature? Play it and check.',
  'Swap copper for aluminium with the same mass. Which one warms the water more, and why?',
  'Calculate the heat the water gains by hand with c = 4.19 J/(g·°C), then compare with the readout.',
  'Double the water mass. Does the heat transferred double? Does the temperature change of the water?',
];

export const legend = [
  { color: 'series-b', label: 'metal temperature' },
  { color: 'series-a', label: 'water temperature' },
];

const METALS = [
  { value: 'copper', label: `Copper (c = ${specificHeat.copper} J/(g·°C))` },
  { value: 'aluminium', label: `Aluminium (c = ${specificHeat.aluminium} J/(g·°C))` },
  { value: 'iron', label: `Iron (c = ${specificHeat.iron} J/(g·°C))` },
  { value: 'tin', label: `Tin (c = ${specificHeat.tin} J/(g·°C))` },
];
const RATE = 0.8; // e-foldings per second of playback; animation only
const T_MAX = 100;

export function mount(ui) {
  const mbox = section(ui.controls, 'Metal block');
  const metal = choice(mbox, { label: 'Metal', options: METALS, value: 'copper' });
  const mm = slider(mbox, { label: 'Mass', min: 10, max: 200, step: 1, value: 50, unit: 'g' });
  const tm = slider(mbox, { label: 'Initial temperature', min: 30, max: 100, step: 0.5, value: 100, unit: '°C', digits: 1 });
  const wbox = section(ui.controls, 'Water');
  const mw = slider(wbox, { label: 'Mass', min: 50, max: 400, step: 1, value: 200, unit: 'g' });
  const tw = slider(wbox, { label: 'Initial temperature', min: 5, max: 30, step: 0.5, value: 20, unit: '°C', digits: 1 });

  const out = readouts(ui.readouts, [
    { id: 'tf', label: 'Final temperature t<sub>f</sub>' },
    { id: 'dtm', label: 'Δt of metal' },
    { id: 'dtw', label: 'Δt of water' },
    { id: 'qm', label: 'Q of metal' },
    { id: 'qw', label: 'Q of water' },
  ]);

  const canvas = fitCanvas(ui.canvas);
  const clock = createClock(ui.transport, { frame: draw });
  [metal, mm, tm, mw, tw].forEach((c) => c.onChange(() => (clock.pause(), clock.reset())));

  function draw(clk) {
    const { ctx, w, h } = canvas;
    const th = theme();
    const cm = specificHeat[metal.value];
    const cw = specificHeat.water;
    const tf = K.finalTemperature(mm.value, cm, tm.value, mw.value, cw, tw.value);
    const [nowM, nowW] = K.temperaturesAt(mm.value, cm, tm.value, mw.value, cw, tw.value, clk.t * RATE);

    out.set('tf', `${fmt(tf, 3)} °C`);
    out.set('dtm', `${fmt(tf - tm.value, 3)} °C`);
    out.set('dtw', `${fmt(tf - tw.value, 3)} °C`);
    out.set('qm', `${fmt(K.heat(mm.value, cm, tf - tm.value) / 1000, 3)} kJ`);
    out.set('qw', `${fmt(K.heat(mw.value, cw, tf - tw.value) / 1000, 3)} kJ`);

    clear(ctx, w, h);
    // --- left: the cup, water level ∝ mass, block size ∝ mass ---
    const narrow = w < 620;
    const cupW = Math.min(narrow ? w * 0.5 : w * 0.3, 220);
    const cupH = Math.min(h * 0.62, 260);
    const cx = narrow ? w * 0.28 : w * 0.2;
    const top = (h - cupH) / 2;
    const waterH = cupH * (0.35 + 0.55 * (mw.value / 400));
    ctx.fillStyle = th.seriesA + '33';
    ctx.fillRect(cx - cupW / 2, top + cupH - waterH, cupW, waterH);
    ctx.strokeStyle = th.ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - cupW / 2 - 8, top);
    ctx.lineTo(cx - cupW / 2, top + cupH);
    ctx.lineTo(cx + cupW / 2, top + cupH);
    ctx.lineTo(cx + cupW / 2 + 8, top);
    ctx.stroke();
    const side = 18 + 36 * Math.cbrt(mm.value / 200);
    ctx.fillStyle = th.seriesB;
    roundRect(ctx, cx - side / 2, top + cupH - side - 6, side, side, 4);
    ctx.fill();
    text(ctx, 'foam cup', cx, top + cupH + 16, { color: th.muted, size: 12, align: 'center' });

    // --- right: temperature bars against a shared scale ---
    const gx = narrow ? w * 0.6 : w * 0.48;
    const gw = w - gx - 24;
    const gy = top;
    const gh = cupH;
    const Y = (t) => gy + gh - (t / T_MAX) * gh;
    for (let t = 0; t <= T_MAX; t += 20) {
      line(ctx, gx, Y(t), gx + gw, Y(t), { color: th.grid });
      text(ctx, `${t}`, gx - 6, Y(t), { color: th.muted, size: 11, align: 'right' });
    }
    text(ctx, 't (°C)', gx, gy - 14, { color: th.muted, size: 12 });
    line(ctx, gx, Y(tf), gx + gw, Y(tf), { color: th.muted, dash: [5, 4] });
    text(ctx, `final = ${fmt(tf, 3)} °C`, gx + gw, Y(tf) - 10, { color: th.muted, size: 11, align: 'right' });
    const bw = Math.min(40, gw / 5);
    const bars = [
      [nowM, th.seriesB, 'metal'],
      [nowW, th.seriesA, 'water'],
    ];
    bars.forEach(([t, color, label], i) => {
      const x = gx + gw * (i ? 0.68 : 0.28) - bw / 2;
      ctx.fillStyle = color;
      ctx.fillRect(x, Y(t), bw, Y(0) - Y(t));
      text(ctx, label, x + bw / 2, Y(0) + 14, { color: th.ink, size: 12, align: 'center' });
    });
  }
}
