import * as R from '../chem/redox.js';
import { fitCanvas, theme, clear, line, text, roundRect } from '../lib/canvas.js';
import { section, choice, toggle, readouts } from '../lib/controls.js';
import { createClock } from '../lib/clock.js';
import { fixed, species } from '../lib/format.js';

export const equations = [
  { html: 'E°<sub>cell</sub> = E°<sub>cathode</sub> − E°<sub>anode</sub>', what: 'both E° read from the table as reduction potentials' },
  { html: 'E°<sub>cell</sub> &gt; 0', what: 'spontaneous: a voltaic cell' },
  { html: 'cathode: reduction (SOA) · anode: oxidation (SRA)', what: 'the strongest oxidizing agent sits higher on the table' },
  { html: 'electrons lost = electrons gained', what: 'scale each half-reaction before adding them' },
];

export const prompts = [
  'Predict: in a zinc–copper cell, which metal is the anode and which way do electrons flow in the wire? Check it, then calculate E°<sub>cell</sub> by hand.',
  'Build a silver–copper cell. Why does the net equation have 2 Ag⁺ but only 1 Cu? Check that electrons lost equal electrons gained.',
  'Replace one half-cell with hydrogen (Pt electrode). How does E°<sub>cell</sub> compare with the other half-cell’s E° from the table, and why?',
  'Turn on the swap. What sign does E°<sub>cell</sub> take, and what would you need to make this reaction happen?',
  'Which pair of half-cells in the list gives the largest E°<sub>cell</sub>? Predict from the table before trying it.',
];

export const legend = [
  { color: 'electron', label: 'electrons (in the wire)' },
  { color: 'cation', label: 'cations (to the cathode)' },
  { color: 'anion', label: 'anions (to the anode)' },
];

const NAMES = {
  Au: 'Gold', Ag: 'Silver', Cu: 'Copper', H: 'Hydrogen (Pt electrode)', Pb: 'Lead', Sn: 'Tin', Ni: 'Nickel',
  Co: 'Cobalt', Cd: 'Cadmium', Fe: 'Iron', Zn: 'Zinc', Al: 'Aluminium', Mg: 'Magnesium',
};
const volts = (v) => `${v > 0 ? '+' : ''}${fixed(v, 2)} V`;
const side = (list) => list.map(([n, s]) => (n === 1 ? '' : `${n} `) + species(s)).join(' + ');
const eText = (n) => (n === 1 ? 'e⁻' : `${n} e⁻`);
const reduction = (h) => `${side(h.ox)} + ${eText(h.e)} → ${side(h.red)}`;
const oxidation = (h) => `${side(h.red)} → ${side(h.ox)} + ${eText(h.e)}`;
// Cell notation half, electrode on the outside: Zn(s) | Zn²⁺(aq), Pt(s) | H₂(g) | H⁺(aq).
const cellHalf = (c) => (c.electrode === c.reduced ? [c.electrode, c.ion] : [c.electrode, c.reduced, c.ion]).map(species);
const E_SPEED = 45; // px/s along the wire; animation only

export function mount(ui) {
  const box = section(ui.controls, 'Half-cells');
  const options = R.couples.map((c) => ({ value: c.id, label: `${NAMES[c.id]}: ${species(c.ion)} | ${species(c.reduced)}  (${volts(c.half.E)})` }));
  const pickA = choice(box, { label: 'Half-cell 1', options, value: 'Cu' });
  const pickB = choice(box, { label: 'Half-cell 2', options, value: 'Zn' });
  const swap = toggle(box, { label: 'Swap cathode and anode (forces the non-spontaneous direction)' });

  const out = readouts(ui.readouts, [
    { id: 'cat', label: 'Cathode (reduction)' },
    { id: 'ec', label: 'E°<sub>cathode</sub>' },
    { id: 'an', label: 'Anode (oxidation)' },
    { id: 'ea', label: 'E°<sub>anode</sub>' },
    { id: 'cell', label: 'E°<sub>cell</sub>' },
    { id: 'ne', label: 'Electrons transferred' },
    { id: 'kind', label: 'Reaction is' },
  ]);

  const canvas = fitCanvas(ui.canvas);
  const clock = createClock(ui.transport, { frame: draw });
  [pickA, pickB, swap].forEach((c) => c.onChange(() => (clock.pause(), clock.reset())));

  function draw(clk) {
    const { ctx, w, h } = canvas;
    const th = theme();
    const a = R.couples.find((c) => c.id === pickA.value);
    const b = R.couples.find((c) => c.id === pickB.value);
    let { cathode, anode } = R.assignElectrodes(a, b);
    if (swap.value) [cathode, anode] = [anode, cathode];
    const same = a.id === b.id;
    const E = R.cellPotential(cathode.half.E, anode.half.E);
    const net = R.netEquation(cathode.half, anode.half);
    const runs = !same && E > 0;

    out.set('cat', `${species(cathode.ion)} | ${species(cathode.reduced)}`);
    out.set('ec', volts(cathode.half.E));
    out.set('an', `${species(anode.reduced)} | ${species(anode.ion)}`);
    out.set('ea', volts(anode.half.E));
    out.set('cell', volts(E));
    out.set('ne', same ? '—' : `${net.electrons} mol e⁻ per mole of reaction`);
    out.set('kind', same ? 'no reaction (same half-cell)' : runs ? 'spontaneous: voltaic' : 'non-spontaneous');

    clear(ctx, w, h);
    const narrow = w < 620;
    const fit = (str, y, size, opts) => {
      ctx.font = `${opts.weight ?? 500} ${size}px ${th.font}`;
      while (size > 9 && ctx.measureText(str).width > w - 20) ctx.font = `${opts.weight ?? 500} ${--size}px ${th.font}`;
      text(ctx, str, w / 2, y, { size, align: 'center', ...opts });
    };
    fit(same ? 'Both half-cells are the same: no net reaction' : `${side(net.reactants)} → ${side(net.products)}`, 18, narrow ? 13 : 15, { weight: 600 });
    fit([...cellHalf(anode), '‖', ...cellHalf(cathode).reverse()].join(' | ').replace('| ‖ |', '‖'), 38, 12, { color: th.muted });

    // --- geometry: anode beaker left, cathode beaker right ---
    const warn = !same && !runs;
    if (warn) fit('E°cell < 0: no current without an external power supply', 56, 12, { color: th.danger, weight: 650 });
    const wireY = warn ? 86 : 66;
    const bw = Math.min(w * 0.36, 230);
    const by = Math.max(wireY + 58, h * 0.36);
    const bh = Math.min(280, h - by - 52);
    const ax = w * 0.25;
    const cx = w * 0.75;
    const top = by - 22; // electrode tops
    const f = runs ? Math.min(1, clk.t / 20) : 0;

    const beaker = (x, c, isCathode) => {
      ctx.fillStyle = th.anion + '14';
      ctx.fillRect(x - bw / 2, by + bh * 0.22, bw, bh * 0.78);
      ctx.strokeStyle = th.ink;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - bw / 2, by);
      ctx.lineTo(x - bw / 2, by + bh);
      ctx.lineTo(x + bw / 2, by + bh);
      ctx.lineTo(x + bw / 2, by);
      ctx.stroke();
      const inert = c.electrode !== c.reduced;
      const ew = inert ? 7 : 18 * (isCathode ? 1 + 0.4 * f : 1 - 0.4 * f);
      const ex = x - bw * 0.12;
      ctx.fillStyle = th.element;
      roundRect(ctx, ex - ew / 2, top, ew, by + bh * 0.82 - top, 2);
      ctx.fill();
      line(ctx, ex, top, ex, wireY, { color: th.ink, width: 2 });
      if (inert) {
        // H₂ bubbling over the platinum; decoration.
        for (let i = 0; i < 6; i++) {
          const yy = by + bh * 0.8 - ((clk.t * 30 + i * 23) % (bh * 0.55));
          ctx.beginPath();
          ctx.arc(ex + 9 + (i % 2) * 5, yy, 2.5, 0, Math.PI * 2);
          ctx.strokeStyle = th.muted;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
      const outer = isCathode ? 1 : -1;
      text(ctx, species(c.electrode), ex + outer * 14, top + 10, { size: 12, weight: 650, align: isCathode ? 'left' : 'right' });
      text(ctx, species(c.ion), x, by + bh - 14, { color: th.muted, size: 12, align: 'center' });
      const role = isCathode ? 'Cathode' : 'Anode';
      const sign = runs ? (isCathode ? ' (+)' : ' (−)') : '';
      text(ctx, `${role}${sign}: ${isCathode ? 'reduction' : 'oxidation'}`, x, by + bh + 16, { size: 12, weight: 650, align: 'center' });
      const half = isCathode ? reduction(c.half) : oxidation(c.half);
      let size = 12;
      ctx.font = `500 ${size}px ${th.font}`;
      while (size > 9 && ctx.measureText(half).width > w / 2 - 8) ctx.font = `500 ${--size}px ${th.font}`;
      text(ctx, half, x, by + bh + 33, { color: th.muted, size, align: 'center' });
      return ex;
    };
    const exA = beaker(ax, anode, false);
    const exC = beaker(cx, cathode, true);

    line(ctx, exA, wireY, exC, wireY, { color: th.ink, width: 2 });
    // Salt bridge: an upturned U between the beakers.
    const lx = ax + bw * 0.3;
    const rx = cx - bw * 0.3;
    const ty = by - 16;
    const byy = by + bh * 0.55;
    ctx.strokeStyle = th.muted;
    ctx.lineWidth = 16;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(lx, byy);
    ctx.lineTo(lx, ty);
    ctx.lineTo(rx, ty);
    ctx.lineTo(rx, byy);
    ctx.stroke();
    ctx.strokeStyle = th.surface;
    ctx.lineWidth = 12;
    ctx.stroke();
    text(ctx, 'salt bridge', w / 2, ty - 16, { color: th.muted, size: 11, align: 'center' });

    const meter = () => {
      const mw = 82;
      ctx.fillStyle = th.surface;
      roundRect(ctx, w / 2 - mw / 2, wireY - 15, mw, 30, 6);
      ctx.fill();
      ctx.strokeStyle = th.ink;
      ctx.lineWidth = 2;
      ctx.stroke();
      text(ctx, volts(same ? 0 : E), w / 2, wireY, { size: 13, weight: 700, align: 'center', color: runs ? th.ink : th.danger });
    };

    if (!runs) {
      meter();
      return;
    }
    // Decoration: electrons anode → cathode through the wire; cations drift
    // through the bridge toward the cathode, anions toward the anode.
    const wire = [[exA, top], [exA, wireY], [exC, wireY], [exC, top]];
    const along = (pts, d) => {
      for (let i = 1; i < pts.length; i++) {
        const [x0, y0] = pts[i - 1];
        const [x1, y1] = pts[i];
        const seg = Math.hypot(x1 - x0, y1 - y0);
        if (d <= seg) return [x0 + ((x1 - x0) * d) / seg, y0 + ((y1 - y0) * d) / seg];
        d -= seg;
      }
      return pts.at(-1);
    };
    const length = (pts) => pts.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);
    const dots = (pts, color, gap, offset, r) => {
      const L = length(pts);
      ctx.fillStyle = color;
      for (let d = offset % gap; d < L; d += gap) {
        const [x, y] = along(pts, d);
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    dots(wire, th.electron, 26, clk.t * E_SPEED, 3.5);
    // Two lanes in the tube so the two ion streams stay distinguishable.
    const lane = (k) => [[lx + k, byy], [lx + k, ty + k], [rx - k, ty + k], [rx - k, byy]];
    dots(lane(3), th.cation, 34, clk.t * 14, 2.6);
    dots(lane(-3).reverse(), th.anion, 34, clk.t * 14, 2.6);
    meter();
  }
}
