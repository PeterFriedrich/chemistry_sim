import * as B from '../chem/bronsted.js';
import { acids } from '../chem/acid-data.js';
import { fitCanvas, theme, clear, line, text, arrow, roundRect } from '../lib/canvas.js';
import { section, choice, readouts } from '../lib/controls.js';
import { createClock } from '../lib/clock.js';
import { fmt, species } from '../lib/format.js';

export const tallOnMobile = true;

export const equations = [
  { html: 'SA + SB ⇌ conjugate base + conjugate acid', what: 'one proton moves from the strongest acid to the strongest base' },
  { html: 'SA: the acid highest on the table; SB: the base lowest on it', what: 'H₂O is always present and is both an acid and a base' },
  { html: 'products favoured (&gt; 50 %) when the SA is above the SB on the table', what: 'otherwise reactants are favoured (&lt; 50 %)' },
  { html: 'K<sub>eq</sub> = K<sub>a</sub>(SA) / K<sub>a</sub>(conjugate acid of SB)', what: 'K<sub>eq</sub> &gt; 1 is the same statement as “SA above SB”' },
];

export const prompts = [
  'Mix CH₃COOH(aq) with NaHCO₃(aq). List every entity and label it A, B or A/B before you look, then find the SA and SB.',
  'Why is the SA in HCl(aq) + NH₃(aq) the hydronium ion, not HCl?',
  'Choose NH₄Cl(aq) and NaF(aq). Which side is favoured? Check with the positions of NH₄⁺ and HF on the table.',
  'Choose NaHCO₃(aq) with no second solution. How can one entity be both the SA and the SB?',
  'Keep NaOH(aq) and change the first solution down the list. When does the reaction stop being products-favoured?',
];

export const legend = [
  { color: 'series-b', label: 'strongest acid (SA)' },
  { color: 'series-a', label: 'strongest base (SB)' },
  { color: 'product', label: 'proton transfer, products favoured' },
  { color: 'muted', label: 'proton transfer, reactants favoured' },
];

const NONE = 'none';
const bare = (s) => species(s).replace(/\((aq|l|s|g)\)$/, '');
const side = (list) => list.map(([n, s]) => (n === 1 ? '' : `${n} `) + species(s)).join(' + ');
const ka = (K) => (K === Infinity ? 'very large' : K === 1 ? '1' : fmt(K, 2));
const P_SPEED = 0.6; // proton trips per second; picture only

export function mount(ui) {
  const box = section(ui.controls, 'Mix two solutions');
  const options = B.solutions.map((s) => ({ value: s.id, label: species(s.formula) }));
  const s1 = choice(box, { label: 'Solution 1', options, value: 'CH3COOH' });
  const s2 = choice(box, { label: 'Solution 2', options: [{ value: NONE, label: 'none (solution 1 and water only)' }, ...options], value: 'NaHCO3' });

  const out = readouts(ui.readouts, [
    { id: 'ent', label: 'Entities present' },
    { id: 'sa', label: 'Strongest acid (SA)' },
    { id: 'sb', label: 'Strongest base (SB)' },
    { id: 'rx', label: 'Net equation' },
    { id: 'keq', label: 'K<sub>eq</sub>' },
    { id: 'fav', label: 'Favoured' },
  ]);

  const canvas = fitCanvas(ui.canvas);
  const clock = createClock(ui.transport, { frame: draw, autoplay: true });
  [s1, s2].forEach((c) => c.onChange(() => clock.reset()));

  function draw(clk) {
    const { ctx, w, h } = canvas;
    const th = theme();
    const present = B.entitiesOf([s1.value, s2.value].filter((v) => v !== NONE));
    const p = B.predict(present);
    const tag = (s) => {
      const r = B.roles(s);
      return r.acid && r.base ? 'A/B' : r.acid ? 'A' : r.base ? 'B' : 'spectator';
    };

    out.set('ent', present.map((s) => `${species(s)} (${tag(s)})`).join(', '));
    out.set('sa', `${species(p.sa.species)}, Kₐ = ${ka(p.sa.row.Ka)}`);
    out.set('sb', `${species(p.sb.species)}, conjugate acid ${species(p.sb.row.acid)}, Kₐ = ${ka(p.sb.row.Ka)}`);
    if (p.favoured === 'none') {
      out.set('rx', `${species(p.sa.species)} + ${species(p.sb.species)} ⇌ ${species(p.sb.species)} + ${species(p.sa.species)}`);
      out.set('keq', '1');
      out.set('fav', 'no net reaction: the SA and SB are a conjugate pair');
    } else {
      out.set('rx', `${side(p.reactants)} ⇌ ${side(p.products)}`);
      out.set('keq', fmt(p.Keq, 2));
      out.set('fav', p.favoured === 'products'
        ? 'products (> 50 %): the SA is above the SB on the table'
        : 'reactants (< 50 %): the SA is below the SB on the table');
    }

    // --- the booklet's table, only the rows with an entity present, in table order ---
    clear(ctx, w, h);
    const rows = acids.filter((r) => present.includes(r.acid) || present.includes(r.base));
    const items = [];
    rows.forEach((r, i) => {
      if (i && acids.indexOf(r) > acids.indexOf(rows[i - 1]) + 1) items.push(null); // rows skipped
      items.push(r);
    });
    const narrow = w < 620;
    const top = 44;
    const bottom = h - 24;
    const rowH = Math.min(46, (bottom - top) / items.length);
    const xA = narrow ? w * 0.18 : w * 0.3;
    const xK = w * 0.5;
    const xB = narrow ? w * 0.82 : w * 0.7;
    const cellW = narrow ? w * 0.28 : 170;
    const size = narrow ? 12 : 14;

    text(ctx, 'Acid', xA, 16, { color: th.muted, size: 12, align: 'center', weight: 650 });
    text(ctx, 'Kₐ', xK, 16, { color: th.muted, size: 12, align: 'center', weight: 650 });
    text(ctx, narrow ? 'Base' : 'Conjugate base', xB, 16, { color: th.muted, size: 12, align: 'center', weight: 650 });
    text(ctx, 'stronger acids ↑   ·   stronger bases ↓', w / 2, 32, { color: th.muted, size: 11, align: 'center' });

    const at = new Map(); // "acid:row" / "base:row" → y
    items.forEach((r, i) => {
      const y = top + rowH * (i + 0.5);
      if (!r) {
        text(ctx, '· · ·', xK, y, { color: th.muted, size: 14, align: 'center' });
        return;
      }
      line(ctx, 12, y + rowH / 2, w - 12, y + rowH / 2, { color: th.grid, width: 1 });
      text(ctx, ka(r.Ka), xK, y, { color: th.muted, size: size - 1, align: 'center' });
      for (const [col, x, s] of [['acid', xA, r.acid], ['base', xB, r.base]]) {
        const here = present.includes(s);
        const key = (col === 'acid' && p.sa.row === r && p.sa.species === s) ? th.seriesB
          : (col === 'base' && p.sb.row === r && p.sb.species === s) ? th.seriesA : null;
        if (key) {
          ctx.fillStyle = key + '2e';
          roundRect(ctx, x - cellW / 2, y - rowH * 0.38, cellW, rowH * 0.76, 6);
          ctx.fill();
          ctx.strokeStyle = key;
          ctx.lineWidth = 2;
          ctx.stroke();
        } else if (here) {
          ctx.strokeStyle = th.ink;
          ctx.lineWidth = 1;
          roundRect(ctx, x - cellW / 2, y - rowH * 0.38, cellW, rowH * 0.76, 6);
          ctx.stroke();
        }
        text(ctx, bare(s), x, y, { color: here ? th.ink : th.muted, size, align: 'center', weight: here ? 650 : 450 });
        at.set(`${col}:${acids.indexOf(r)}`, y);
      }
    });

    // --- the proton transfer, SA → SB: downhill means products are favoured ---
    if (p.favoured === 'none') {
      text(ctx, 'no net reaction', w / 2, bottom + 8, { color: th.muted, size: 12, align: 'center' });
      return;
    }
    const y1 = at.get(`acid:${acids.indexOf(p.sa.row)}`);
    const y2 = at.get(`base:${acids.indexOf(p.sb.row)}`);
    const x1 = xA + cellW / 2 + 4;
    const x2 = xB - cellW / 2 - 4;
    const color = p.favoured === 'products' ? th.product : th.muted;
    arrow(ctx, x1, y1, x2 - x1, y2 - y1, { color, width: 2.5 });
    const f = (clk.t * P_SPEED) % 1;
    const px = x1 + (x2 - x1) * f;
    const py = y1 + (y2 - y1) * f;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(px, py, 9, 0, 2 * Math.PI);
    ctx.fill();
    text(ctx, 'H⁺', px, py, { color: th.surface, size: 10, align: 'center', weight: 700 });
  }
}
