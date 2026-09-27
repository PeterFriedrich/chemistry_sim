import * as P from '../chem/periodic.js';
import { fitCanvas, theme, clear, text, roundRect } from '../lib/canvas.js';
import { section, choice, toggle, readouts } from '../lib/controls.js';
import { createClock } from '../lib/clock.js';

export const equations = [
  { html: 'period = number of occupied energy levels', what: 'the row: period 3 atoms have electrons in levels 1, 2 and 3' },
  { html: 'valence electrons = group number (groups 1–2)', what: 'the column, for the main groups' },
  { html: 'valence electrons = group − 10 (groups 13–18)', what: 'helium is the exception: group 18, but 2 valence electrons' },
  { html: 'total electrons = protons = atomic number Z', what: 'for a neutral atom' },
];

export const prompts = [
  'Tap each element in period 3, from sodium to argon. What changes in the energy-level diagram, and what stays the same?',
  'Tap down group 2, from beryllium to calcium. How many energy levels does each have, and how many electrons in the outer one?',
  'Oxygen and sulfur are both in group 16. Predict their valence electrons and Lewis symbols, then check.',
  'Helium is in group 18 but has only 2 valence electrons. Why is it placed with the noble gases?',
  'An element has 3 energy levels and 5 valence electrons. Find it on the table before tapping it.',
  'Turn on "valence electrons on the table". Which columns share a count, and why does the middle of the table show none?',
];

export const legend = [
  { color: 'accent', label: 'selected element, its period and group' },
  { color: 'electron', label: 'valence electrons' },
  { color: 'muted', label: 'inner electrons' },
];

export const tallOnMobile = true;

const COLS = 18;

// Cell rectangles for every element plus the table's frame, for a canvas of w × h.
// Wide canvases put the diagrams to the right of the table; narrow ones below it.
function layout(w, h) {
  const wide = w / h > 1.15;
  const area = wide ? { x: 8, y: 8, w: w * 0.64, h: h - 16 } : { x: 8, y: 8, w: w - 16, h: h * 0.46 };
  const cols = COLS + 0.7; // + period labels
  const rows = 0.6 + 7 + 0.4 + 2; // group labels, 7 periods, gap, two f rows
  const s = Math.min(area.w / cols, area.h / rows);
  const x0 = area.x + (area.w - cols * s) / 2 + 0.7 * s;
  const y0 = area.y + 0.6 * s;
  const cells = P.byZ.map(({ Z }) => {
    const { period, group, frow } = P.position(Z);
    const col = group === null ? frow + 2 : group - 1;
    const row = group === null ? period + 1.4 : period - 1;
    return { Z, x: x0 + col * s, y: y0 + row * s, s };
  });
  const diag = wide
    ? { x: area.x + area.w + 12, y: 8, w: w - area.w - 28, h: h - 16 }
    : { x: 8, y: area.y + area.h + 8, w: w - 16, h: h - area.h - 24 };
  return { s, x0, y0, cells, diag, wide };
}

export function mount(ui) {
  const box = section(ui.controls, 'Element');
  const pick = choice(box, {
    label: 'Element',
    options: P.byZ.map((e) => ({ value: e.Z, label: `${e.Z}  ${e.symbol} — ${e.name}` })),
    value: 17,
  });
  const showValence = toggle(box, { label: 'Valence electrons on the table' });

  const out = readouts(ui.readouts, [
    { id: 'el', label: 'Element' },
    { id: 'z', label: 'Atomic number' },
    { id: 'period', label: 'Period' },
    { id: 'group', label: 'Group' },
    { id: 'val', label: 'Valence electrons' },
    { id: 'tot', label: 'Total electrons' },
    { id: 'shells', label: 'Electrons per energy level' },
    { id: 'lewis', label: 'Lewis symbol' },
  ]);

  const canvas = fitCanvas(ui.canvas);
  createClock(ui.transport, { frame: draw });
  ui.transport.hidden = true; // nothing moves

  const hit = (ev) => {
    const r = ui.canvas.getBoundingClientRect();
    const x = ev.clientX - r.left;
    const y = ev.clientY - r.top;
    return layout(canvas.w, canvas.h).cells.find((c) => x >= c.x && x < c.x + c.s && y >= c.y && y < c.y + c.s);
  };
  ui.canvas.addEventListener('pointerdown', (ev) => {
    const c = hit(ev);
    if (c) pick.value = c.Z;
  });
  ui.canvas.addEventListener('pointermove', (ev) => (ui.canvas.style.cursor = hit(ev) ? 'pointer' : ''));

  function draw() {
    const { ctx, w, h } = canvas;
    const th = theme();
    const Z = pick.value;
    const e = P.element(Z);
    const pos = P.position(Z);
    const val = P.valence(Z);
    const sh = P.shells(Z);
    const lw = P.lewis(Z);
    const fam = P.family(Z);

    out.set('el', `${e.name}, ${e.symbol}`);
    out.set('z', `Z = ${Z}`);
    out.set('period', `${pos.period}: electrons occupy ${pos.period} energy level${pos.period > 1 ? 's' : ''}`);
    out.set('group', pos.group === null
      ? `none: ${pos.period === 6 ? 'lanthanum–lutetium' : 'actinium–lawrencium'} row below the table`
      : `${pos.group}${fam ? ` (${fam})` : ''}`);
    out.set('val', val.n === null ? `— (${val.rule})` : `${val.n}: ${val.rule}`);
    out.set('tot', `${P.totalElectrons(Z)}: a neutral atom has as many electrons as protons (Z)`);
    out.set('shells', sh ? sh.join(', ') : `— (drawn for Z ≤ ${P.SHELL_LIMIT_Z} only)`);
    out.set('lewis', lw
      ? `${lw.pairs} lone pair${lw.pairs === 1 ? '' : 's'}, ${lw.single} bonding electron${lw.single === 1 ? '' : 's'}`
      : '— (main groups only)');

    clear(ctx, w, h);
    const L = layout(w, h);
    const s = L.s;

    // period and group highlight bands
    ctx.save();
    ctx.globalAlpha = 0.14;
    ctx.fillStyle = th.accent;
    const me = L.cells[Z - 1];
    if (pos.group !== null) ctx.fillRect(me.x, L.y0, s, 7 * s);
    ctx.fillRect(L.x0, L.y0 + (pos.period - 1) * s, COLS * s, s);
    if (pos.group === null) ctx.fillRect(L.x0, me.y, COLS * s, s);
    ctx.restore();

    // labels
    const lab = Math.max(8, Math.min(12, s * 0.38));
    for (let g = 1; g <= COLS; g++) {
      text(ctx, String(g), L.x0 + (g - 0.5) * s, L.y0 - s * 0.28, { color: g === pos.group ? th.accent : th.muted, size: lab, align: 'center', weight: g === pos.group ? 700 : 500 });
    }
    for (let p = 1; p <= 7; p++) {
      text(ctx, String(p), L.x0 - s * 0.35, L.y0 + (p - 0.5) * s, { color: p === pos.period ? th.accent : th.muted, size: lab, align: 'center', weight: p === pos.period ? 700 : 500 });
    }
    // where the two f rows belong
    for (const p of [6, 7]) {
      const x = L.x0 + 2 * s;
      const y = L.y0 + (p - 1) * s;
      ctx.save();
      ctx.strokeStyle = th.muted;
      ctx.setLineDash([2, 2]);
      ctx.strokeRect(x + 1.5, y + 1.5, s - 3, s - 3);
      ctx.restore();
      text(ctx, '↓', x + s / 2, y + s / 2, { color: th.muted, size: lab, align: 'center' });
    }

    const symSize = s * 0.4;
    const small = s * 0.24;
    for (const c of L.cells) {
      const sel = c.Z === Z;
      const main = P.isMainGroup(c.Z);
      roundRect(ctx, c.x + 1, c.y + 1, c.s - 2, c.s - 2, Math.min(4, s * 0.12));
      ctx.fillStyle = sel ? th.accent : main ? th.surface : th.grid;
      ctx.fill();
      ctx.strokeStyle = sel ? th.accent : th.muted;
      ctx.lineWidth = sel ? 2 : 0.6;
      ctx.stroke();
      const ink = sel ? th.surface : th.ink;
      const sym = P.element(c.Z).symbol;
      // With the overlay on, the valence count replaces the atomic number,
      // or on cells too small for two lines, the symbol.
      const v = showValence.value ? P.valence(c.Z).n : null;
      const vStyle = { color: sel ? th.surface : th.electron, align: 'center', weight: 800 };
      if (s < 22) {
        if (v !== null) text(ctx, String(v), c.x + c.s / 2, c.y + c.s / 2, { ...vStyle, size: symSize * 1.2 });
        else text(ctx, sym, c.x + c.s / 2, c.y + c.s / 2, { color: ink, size: symSize, align: 'center', weight: 650 });
        continue;
      }
      if (v !== null) text(ctx, String(v), c.x + c.s / 2, c.y + small * 0.95, { ...vStyle, size: small * 1.1 });
      else text(ctx, String(c.Z), c.x + c.s / 2, c.y + small * 0.95, { color: sel ? th.surface : th.muted, size: small, align: 'center' });
      text(ctx, sym, c.x + c.s / 2, c.y + c.s * 0.62, { color: ink, size: symSize, align: 'center', weight: 650 });
    }

    // --- energy levels and Lewis symbol ---
    const D = L.diag;
    const half = L.wide ? { h: D.h / 2 } : { w: D.w / 2 };
    const bohr = L.wide ? { x: D.x, y: D.y, w: D.w, h: half.h } : { x: D.x, y: D.y, w: half.w, h: D.h };
    const lew = L.wide ? { x: D.x, y: D.y + half.h, w: D.w, h: half.h } : { x: D.x + half.w, y: D.y, w: half.w, h: D.h };
    const head = 13;

    text(ctx, 'Energy levels', bohr.x + bohr.w / 2, bohr.y + 10, { color: th.muted, size: head, align: 'center', weight: 650 });
    const bcx = bohr.x + bohr.w / 2;
    const bcy = bohr.y + 18 + (bohr.h - 18) / 2;
    if (!sh) {
      text(ctx, `drawn for Z ≤ ${P.SHELL_LIMIT_Z} only`, bcx, bcy, { color: th.muted, size: 12, align: 'center' });
    } else {
      const rMax = Math.min(bohr.w, bohr.h - 40) / 2 - 6;
      const nuc = Math.max(12, rMax * 0.26);
      const step = (rMax - nuc) / 4;
      ctx.beginPath();
      ctx.arc(bcx, bcy, nuc, 0, Math.PI * 2);
      ctx.fillStyle = th.grid;
      ctx.fill();
      ctx.strokeStyle = th.muted;
      ctx.lineWidth = 1;
      ctx.stroke();
      text(ctx, `${Z}p⁺`, bcx, bcy, { color: th.ink, size: Math.max(10, nuc * 0.55), align: 'center', weight: 650 });
      sh.forEach((n, i) => {
        const r = nuc + step * (i + 1);
        const outer = i === sh.length - 1;
        ctx.beginPath();
        ctx.arc(bcx, bcy, r, 0, Math.PI * 2);
        ctx.strokeStyle = th.muted;
        ctx.lineWidth = 1;
        ctx.stroke();
        for (let k = 0; k < n; k++) {
          const a = -Math.PI / 2 + (2 * Math.PI * k) / n;
          ctx.beginPath();
          ctx.arc(bcx + r * Math.cos(a), bcy + r * Math.sin(a), Math.max(2.5, step * 0.14), 0, Math.PI * 2);
          ctx.fillStyle = outer && val.n !== null ? th.electron : th.muted;
          ctx.fill();
        }
      });
    }

    text(ctx, 'Lewis symbol', lew.x + lew.w / 2, lew.y + 10, { color: th.muted, size: head, align: 'center', weight: 650 });
    const lcx = lew.x + lew.w / 2;
    const lcy = lew.y + 18 + (lew.h - 18) / 2;
    if (!lw) {
      text(ctx, 'main groups only', lcx, lcy, { color: th.muted, size: 12, align: 'center' });
    } else {
      const fs = Math.max(22, Math.min(56, Math.min(lew.w, lew.h) * 0.3));
      text(ctx, e.symbol, lcx, lcy, { color: th.ink, size: fs, align: 'center', weight: 650 });
      // One dot per side first (top, right, bottom, left), then pairs.
      const sides = [0, 0, 0, 0];
      for (let k = 0; k < lw.single + lw.pairs; k++) sides[k] = k < lw.pairs ? 2 : 1;
      const off = fs * 0.62 + e.symbol.length * fs * 0.12;
      const dot = Math.max(2.5, fs * 0.07);
      const gap = dot * 1.6;
      sides.forEach((n, i) => {
        const [dx, dy] = [[0, -1], [1, 0], [0, 1], [-1, 0]][i];
        const ox = lcx + dx * (dx ? off : 0);
        const oy = lcy + dy * fs * 0.62;
        for (let k = 0; k < n; k++) {
          const t = n === 2 ? (k ? gap : -gap) : 0;
          ctx.beginPath();
          ctx.arc(ox + (dy ? t : 0), oy + (dx ? t : 0), dot, 0, Math.PI * 2);
          ctx.fillStyle = th.electron;
          ctx.fill();
        }
      });
    }
  }
}
