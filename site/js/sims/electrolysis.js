import * as X from '../chem/electrolysis.js';
import { netEquation } from '../chem/redox.js';
import { fitCanvas, theme, clear, line, text, roundRect } from '../lib/canvas.js';
import { section, slider, choice, toggle, readouts, el } from '../lib/controls.js';
import { createClock } from '../lib/clock.js';
import { fmt, fixed, species } from '../lib/format.js';

export const equations = [
  { html: 'SOA → cathode (reduction) · SRA → anode (oxidation)', what: 'list every species present, water included' },
  { html: 'E°<sub>cell</sub> = E°<sub>cathode</sub> − E°<sub>anode</sub> &lt; 0', what: 'non-spontaneous: the supply must provide at least −E°<sub>cell</sub>' },
  { html: 'Q = It', what: 'charge in C, current in A, time in s' },
  { html: 'n<sub>e⁻</sub> = Q / F', what: 'F = 9.65 × 10⁴ C/mol e⁻' },
  { html: 'n<sub>product</sub> = n<sub>e⁻</sub> × (mole ratio from the half-reaction), m = nM', what: 'M from the periodic table' },
];

export const prompts = [
  'Predict the products of electrolysing CuSO₄(aq) with inert electrodes: list every species present, then find the SOA and SRA. Check your answer.',
  'Calculate the mass of copper plated by 1.00 A for 30.0 min by hand (Q = It, then n = Q/F), then compare with the readout.',
  'Switch to KI(aq). Why is water reduced at the cathode instead of K⁺, but I⁻ oxidized at the anode instead of water?',
  'Turn on metal electrodes for CuSO₄. What happens to the anode, and why does the minimum voltage drop to 0.00 V?',
  'Double the time. What happens to the mass plated? Now double the current instead. Explain with Q = It.',
];

export const legend = [
  { color: 'electron', label: 'electrons (pushed by the supply)' },
  { color: 'product', label: 'products at the electrodes' },
];

const LABELS = {
  CuSO4: 'CuSO₄(aq), copper(II) sulfate',
  AgNO3: 'AgNO₃(aq), silver nitrate',
  NiSO4: 'NiSO₄(aq), nickel(II) sulfate',
  ZnSO4: 'ZnSO₄(aq), zinc sulfate',
  'Pb(NO3)2': 'Pb(NO₃)₂(aq), lead(II) nitrate',
  KI: 'KI(aq), potassium iodide',
  Na2SO4: 'Na₂SO₄(aq), sodium sulfate',
};
const volts = (v) => `${v > 0 ? '+' : ''}${fixed(v, 2)} V`;
const side = (list) => list.map(([n, s]) => (n === 1 ? '' : `${n} `) + species(s)).join(' + ');
const agents = (list) => list.map(([, s]) => species(s)).join(' + ');
const eText = (n) => (n === 1 ? 'e⁻' : `${n} e⁻`);
const E_SPEED = 45; // px/s along the wire; animation only

// The product worth reporting at an electrode: a solid or gas formed, else the
// electrode metal used up (a metal anode dissolving).
function headline(rows) {
  return rows.find((r) => r.sign > 0 && /\((s|g)\)$/.test(r.species)) ?? rows.find((r) => r.sign < 0 && r.m !== null);
}
const amountText = (r) =>
  `${species(r.species)}${r.sign < 0 ? ' used' : ''}: ${fmt(r.n, 3)} mol${r.m !== null ? `, ${fmt(r.m, 3)} g` : ''}`;

export function mount(ui) {
  const box = section(ui.controls, 'Cell');
  const pick = choice(box, {
    label: 'Electrolyte',
    options: X.electrolytes.map((e) => ({ value: e.id, label: LABELS[e.id] })),
    value: 'CuSO4',
  });
  const metal = toggle(box, { label: 'Electrodes of the solution’s metal (plating / refining)' });
  const run = section(ui.controls, 'Current and time');
  const I = slider(run, { label: 'Current, I', min: 0.1, max: 10, step: 0.01, value: 1, unit: 'A' });
  const tMin = slider(run, { label: 'Time, t', min: 1, max: 120, step: 0.5, value: 30, unit: 'min', digits: 1 });

  const out = readouts(ui.readouts, [
    { id: 'soa', label: 'SOA (cathode)' },
    { id: 'sra', label: 'SRA (anode)' },
    { id: 'cell', label: 'E°<sub>cell</sub>' },
    { id: 'vmin', label: 'Minimum voltage' },
    { id: 'ts', label: 't' },
    { id: 'q', label: 'Q = It' },
    { id: 'ne', label: 'n<sub>e⁻</sub> = Q/F' },
    { id: 'cp', label: 'Cathode' },
    { id: 'ap', label: 'Anode' },
  ]);
  const table = el('table', { class: 'data-table', style: 'margin-top: 10px' }, ui.readouts);

  const canvas = fitCanvas(ui.canvas);
  const clock = createClock(ui.transport, { frame: draw });
  let shown = null;
  [pick, metal, I, tMin].forEach((c) => c.onChange(() => (clock.pause(), clock.reset())));

  function fillTable(present, cell) {
    const { oxidizing, reducing } = X.candidates(present);
    table.innerHTML = '<thead><tr><th>Agent</th><th>Species</th><th>E° (V)</th></tr></thead>';
    const body = el('tbody', {}, table);
    const rows = (list, best, tag, pick, last) =>
      list.forEach((h, i) => {
        const tr = el('tr', i === list.length - 1 && last ? { class: 'after' } : {}, body);
        el('td', { text: h === best ? `S${tag}` : tag }, tr);
        el('td', { text: agents(pick(h)), style: 'text-align: left' }, tr);
        el('td', { text: volts(h.E).replace(' V', '') }, tr);
      });
    rows(oxidizing, cell.cathode, 'OA', (h) => h.ox, true);
    rows(reducing, cell.anode, 'RA', (h) => h.red, false);
    el('caption', { text: `Species present: ${present.map(species).join(', ')}`, style: 'caption-side: bottom; text-align: left; color: var(--c-muted); font-size: 12px; padding-top: 4px' }, table);
  }

  function draw(clk) {
    const { ctx, w, h } = canvas;
    const th = theme();
    const ely = X.electrolytes.find((e) => e.id === pick.value);
    const useMetal = metal.value && !!ely.metal;
    const present = X.speciesPresent(ely, useMetal);
    const cell = X.predict(present);
    const t = tMin.value * 60;
    const Q = X.charge(I.value, t);
    const ne = X.electronMoles(Q);
    const atCathode = X.electrodeAmounts(cell.cathode, ne, true);
    const atAnode = X.electrodeAmounts(cell.anode, ne, false);
    const net = netEquation(cell.cathode, cell.anode);

    const key = `${pick.value}|${useMetal}`;
    if (key !== shown) fillTable(present, cell), (shown = key);
    out.set('soa', `${species(cell.cathode.ox[0][1])}  ${volts(cell.cathode.E)}`);
    out.set('sra', `${species(cell.anode.red[0][1])}  ${volts(cell.anode.E)}`);
    out.set('cell', volts(cell.E));
    out.set('vmin', `${fixed(cell.minVoltage, 2)} V`);
    out.set('ts', `${fmt(t, 3)} s`);
    out.set('q', `${fmt(Q, 3)} C`);
    out.set('ne', `${fmt(ne, 3)} mol`);
    out.set('cp', amountText(headline(atCathode)));
    out.set('ap', amountText(headline(atAnode)));

    clear(ctx, w, h);
    const narrow = w < 620;
    const fit = (str, y, size, opts = {}) => {
      ctx.font = `${opts.weight ?? 500} ${size}px ${th.font}`;
      while (size > 9 && ctx.measureText(str).width > w - 20) ctx.font = `${opts.weight ?? 500} ${--size}px ${th.font}`;
      text(ctx, str, w / 2, y, { size, align: 'center', ...opts });
    };
    const refining = net.reactants.length === 0;
    fit(refining ? 'Net: no overall change in the solution (metal moves anode → cathode)' : `${side(net.reactants)} → ${side(net.products)}`, 18, narrow ? 13 : 15, { weight: 600 });

    // --- geometry: one beaker, anode (+) left, cathode (−) right ---
    const wireY = 58;
    const bw = Math.min(w * 0.8, 440);
    const by = Math.max(wireY + 60, h * 0.3);
    const bh = Math.min(280, h - by - 52);
    const bx = w / 2;
    const exA = bx - bw * 0.28;
    const exC = bx + bw * 0.28;
    const top = by - 22;
    const f = Math.min(1, clk.t / 15);

    ctx.fillStyle = th.anion + '14';
    ctx.fillRect(bx - bw / 2, by + bh * 0.2, bw, bh * 0.8);
    ctx.strokeStyle = th.ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bx - bw / 2, by);
    ctx.lineTo(bx - bw / 2, by + bh);
    ctx.lineTo(bx + bw / 2, by + bh);
    ctx.lineTo(bx + bw / 2, by);
    ctx.stroke();
    text(ctx, ely.ions.map(species).join('  '), bx, by + bh - 14, { color: th.muted, size: 12, align: 'center' });

    const bottom = by + bh * 0.82;
    const electrodeName = useMetal ? ely.metal : 'Pt(s)';
    const electrode = (x, width) => {
      ctx.fillStyle = th.element;
      roundRect(ctx, x - width / 2, top, width, bottom - top, 2);
      ctx.fill();
    };
    const bubbles = (x, n) => {
      ctx.strokeStyle = th.product;
      ctx.lineWidth = 1.2;
      for (let i = 0; i < n; i++) {
        const yy = bottom - 6 - ((clk.t * 32 + i * 19) % (bh * 0.6));
        ctx.beginPath();
        ctx.arc(x + ((i % 3) - 1) * 6, yy, 2.6, 0, Math.PI * 2);
        ctx.stroke();
      }
    };
    const cathodeRow = headline(atCathode);
    const anodeRow = headline(atAnode);
    // Cathode: a metal coat that thickens, or gas bubbles.
    const baseW = useMetal ? 18 : 8;
    electrode(exC, baseW);
    if (cathodeRow.species.endsWith('(s)')) {
      const coat = 2 + 6 * f;
      ctx.fillStyle = th.product;
      roundRect(ctx, exC - baseW / 2 - coat, top + (bottom - top) * 0.35, baseW + 2 * coat, (bottom - top) * 0.65, 3);
      ctx.fill();
    } else if (clk.t > 0) bubbles(exC, 8);
    // Anode: a metal anode wears away; otherwise gas or iodine.
    if (anodeRow.sign < 0) electrode(exA, baseW * (1 - 0.45 * f));
    else {
      electrode(exA, baseW);
      if (anodeRow.species.endsWith('(g)') && clk.t > 0) bubbles(exA, 5);
      if (anodeRow.species === 'I2(s)') {
        ctx.fillStyle = th.exo + '40';
        ctx.beginPath();
        ctx.ellipse(exA, bottom - (bh * 0.3) * f, 16 + 22 * f, 10 + 40 * f, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    text(ctx, species(electrodeName), exA - 14, top + 10, { size: 12, weight: 650, align: 'right' });
    text(ctx, species(electrodeName), exC + 14, top + 10, { size: 12, weight: 650 });

    const half = (hr, reduction) => (reduction ? `${side(hr.ox)} + ${eText(hr.e)} → ${side(hr.red)}` : `${side(hr.red)} → ${side(hr.ox)} + ${eText(hr.e)}`);
    const caption = (x, title, eq) => {
      text(ctx, title, x, by + bh + 16, { size: 12, weight: 650, align: 'center' });
      let size = 12;
      ctx.font = `500 ${size}px ${th.font}`;
      while (size > 9 && ctx.measureText(eq).width > w / 2 - 8) ctx.font = `500 ${--size}px ${th.font}`;
      text(ctx, eq, x, by + bh + 33, { color: th.muted, size, align: 'center' });
    };
    if (narrow) {
      fit(`Anode (+), oxidation: ${half(cell.anode, false)}`, by + bh + 16, 12);
      fit(`Cathode (−), reduction: ${half(cell.cathode, true)}`, by + bh + 34, 12);
    } else {
      caption(w * 0.25, 'Anode (+): oxidation', half(cell.anode, false));
      caption(w * 0.75, 'Cathode (−): reduction', half(cell.cathode, true));
    }

    // Wires to the supply; electrons leave the anode and are pushed into the cathode.
    const sw = 120;
    const sL = bx - sw / 2;
    const sR = bx + sw / 2;
    line(ctx, exA, top, exA, wireY, { color: th.ink, width: 2 });
    line(ctx, exA, wireY, sL, wireY, { color: th.ink, width: 2 });
    line(ctx, sR, wireY, exC, wireY, { color: th.ink, width: 2 });
    line(ctx, exC, wireY, exC, top, { color: th.ink, width: 2 });
    if (clk.t > 0) {
      const dots = (pts, offset) => {
        const segs = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
        const L = segs.reduce((a, b) => a + b, 0);
        ctx.fillStyle = th.electron;
        for (let d = offset % 26; d < L; d += 26) {
          let rest = d;
          let i = 0;
          while (i < segs.length - 1 && rest > segs[i]) rest -= segs[i++];
          const [x0, y0] = pts[i];
          const [x1, y1] = pts[i + 1];
          ctx.beginPath();
          ctx.arc(x0 + ((x1 - x0) * rest) / segs[i], y0 + ((y1 - y0) * rest) / segs[i], 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
      };
      dots([[exA, top], [exA, wireY], [sL, wireY]], clk.t * E_SPEED);
      dots([[sR, wireY], [exC, wireY], [exC, top]], clk.t * E_SPEED);
    }
    ctx.fillStyle = th.surface;
    roundRect(ctx, sL, wireY - 17, sw, 34, 6);
    ctx.fill();
    ctx.strokeStyle = th.ink;
    ctx.lineWidth = 2;
    ctx.stroke();
    text(ctx, '+', sL + 10, wireY, { size: 15, weight: 700, align: 'center' });
    text(ctx, '−', sR - 10, wireY, { size: 15, weight: 700, align: 'center' });
    text(ctx, `${fixed(I.value, 2)} A`, bx, wireY - 6, { size: 12, weight: 700, align: 'center' });
    text(ctx, `≥ ${fixed(cell.minVoltage, 2)} V`, bx, wireY + 8, { size: 11, color: th.muted, align: 'center' });
  }
}
