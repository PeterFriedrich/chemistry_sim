import * as S from '../chem/spontaneity.js';
import { halfReactions } from '../chem/redox-data.js';
import { fitCanvas, theme, clear, line, text, roundRect } from '../lib/canvas.js';
import { section, choice, readouts } from '../lib/controls.js';
import { createClock } from '../lib/clock.js';
import { fixed, species } from '../lib/format.js';

export const tallOnMobile = true;

export const equations = [
  { html: 'SOA: the oxidizing agent highest on the table; SRA: the reducing agent lowest on it', what: 'H₂O is always present and is both an OA and an RA' },
  { html: 'reduction (SOA) + oxidation (SRA), electrons lost = electrons gained', what: 'multiply each half-reaction so the electrons cancel, then add' },
  { html: 'E°<sub>net</sub> = E°<sub>SOA</sub> − E°<sub>SRA</sub>', what: 'both E° as printed in the table (reduction potentials)' },
  { html: 'spontaneous when E°<sub>net</sub> &gt; 0', what: 'the same statement as “the SOA is above the SRA on the table”' },
];

export const prompts = [
  'Put Cu(s) in AgNO₃(aq). List every entity and label it OA, RA or both before you look, then find the SOA and SRA.',
  'Now put Cu(s) in ZnSO₄(aq). Why is nothing predicted to happen? What metal would react with Zn²⁺(aq)?',
  'Try Cu(s) with HCl(aq), then with HNO₃(aq). Why does nitric acid dissolve copper when hydrochloric acid cannot?',
  'Mix acidified KMnO₄(aq) with FeSO₄(aq). Balance the electrons by hand and compare the net equation.',
  'Choose Mg(s) with no second reagent. The table says it reacts with water. Why do you not see much happen in the lab?',
];

export const legend = [
  { color: 'series-b', label: 'strongest oxidizing agent (SOA)' },
  { color: 'series-a', label: 'strongest reducing agent (SRA)' },
  { color: 'electron', label: 'electron transfer, spontaneous' },
  { color: 'muted', label: 'non-spontaneous' },
];

const NONE = 'none';
const bare = (s) => species(s).replace(/\((aq|l|s|g)\)$/, '');
const side = (list) => list.map(([n, s]) => (n === 1 ? '' : `${n} `) + species(s)).join(' + ');
const agents = (list) => list.map(([, s]) => species(s)).join(' + ');
const eText = (n) => (n === 1 ? 'e⁻' : `${n} e⁻`);
const volts = (v) => `${v > 0 ? '+' : ''}${fixed(v, 2)} V`;
const E_SPEED = 0.6; // electron trips per second; picture only

export function mount(ui) {
  const box = section(ui.controls, 'Mix two reagents');
  const options = S.reagents.map((r) => ({ value: r.id, label: species(r.formula) }));
  const r1 = choice(box, { label: 'Reagent 1', options, value: 'Cu' });
  const r2 = choice(box, { label: 'Reagent 2', options: [{ value: NONE, label: 'none (reagent 1 and water only)' }, ...options], value: 'AgNO3' });

  const out = readouts(ui.readouts, [
    { id: 'ent', label: 'Entities present' },
    { id: 'oa', label: 'Oxidizing agents' },
    { id: 'ra', label: 'Reducing agents' },
    { id: 'red', label: 'Reduction (SOA)' },
    { id: 'ox', label: 'Oxidation (SRA)' },
    { id: 'net', label: 'Net equation' },
    { id: 'e', label: 'E°<sub>net</sub> = E°<sub>SOA</sub> − E°<sub>SRA</sub>' },
    { id: 'res', label: 'Spontaneous?' },
  ]);

  const canvas = fitCanvas(ui.canvas);
  const clock = createClock(ui.transport, { frame: draw, autoplay: true });
  [r1, r2].forEach((c) => c.onChange(() => clock.reset()));

  function draw(clk) {
    const { ctx, w, h } = canvas;
    const th = theme();
    const present = S.entitiesOf([r1.value, r2.value].filter((v) => v !== NONE));
    out.set('ent', present.map(species).join(', '));
    clear(ctx, w, h);

    const ppt = S.precipitate(present);
    if (ppt) {
      for (const id of ['oa', 'ra', 'red', 'ox', 'net', 'e']) out.set(id, '—');
      const msg = `${species(ppt[0])} and ${species(ppt[1])} form a precipitate; this sim does not model precipitation.`;
      out.set('res', `${msg} Choose another pair.`);
      text(ctx, 'These two solutions form a precipitate.', w / 2, h / 2 - 10, { color: th.ink, size: 14, align: 'center', weight: 650 });
      text(ctx, 'Choose another pair.', w / 2, h / 2 + 12, { color: th.muted, size: 13, align: 'center' });
      return;
    }

    const p = S.predict(present);
    const list = (hs, pick, best) => hs.map((x) => `${agents(pick(x))} (${volts(x.E)})${x === best ? ' ← S' : ''}`).join('; ');
    out.set('oa', list(p.oxidizing, (x) => x.ox, p.soa).replace('← S', '← SOA'));
    out.set('ra', list(p.reducing, (x) => x.red, p.sra).replace('← S', '← SRA'));
    out.set('red', `${side(p.soa.ox)} + ${eText(p.soa.e)} → ${side(p.soa.red)}`);
    out.set('ox', `${side(p.sra.red)} → ${side(p.sra.ox)} + ${eText(p.sra.e)}`);
    out.set('e', `${volts(p.soa.E)} − (${volts(p.sra.E)}) = ${volts(p.E)}`);
    if (!p.net) {
      out.set('net', 'no net reaction: the SOA and SRA are the same couple');
      out.set('res', 'no: E°net = 0');
    } else {
      out.set('net', `${side(p.net.reactants)} → ${side(p.net.products)}`);
      out.set('res', p.spontaneous
        ? `yes: the SOA is above the SRA on the table${p.water ? '. Water is the SOA or SRA: the table predicts that it can react, not how fast. Many such reactions are too slow to see.' : ''}`
        : 'no: the SOA is not above the SRA on the table');
    }

    // --- the booklet's table, only the rows with an agent present, in table order ---
    const has = (sd) => sd.every(([, s]) => present.includes(s));
    const rows = halfReactions.filter((r) => has(r.ox) || has(r.red));
    const items = [];
    rows.forEach((r, i) => {
      if (i && halfReactions.indexOf(r) > halfReactions.indexOf(rows[i - 1]) + 1) items.push(null); // rows skipped
      items.push(r);
    });
    const narrow = w < 620;
    const top = 44;
    const bottom = h - 24;
    const rowH = Math.min(46, (bottom - top) / items.length);
    const xO = narrow ? w * 0.19 : w * 0.3;
    const xE = w * 0.5;
    const xR = narrow ? w * 0.81 : w * 0.7;
    const cellW = narrow ? w * 0.3 : 170;
    const size = narrow ? 12 : 14;

    text(ctx, 'Oxidizing agent', xO, 16, { color: th.muted, size: 12, align: 'center', weight: 650 });
    text(ctx, 'E° (V)', xE, 16, { color: th.muted, size: 12, align: 'center', weight: 650 });
    text(ctx, 'Reducing agent', xR, 16, { color: th.muted, size: 12, align: 'center', weight: 650 });
    text(ctx, 'stronger OAs ↑   ·   stronger RAs ↓', w / 2, 32, { color: th.muted, size: 11, align: 'center' });

    const at = new Map(); // row → y
    items.forEach((r, i) => {
      const y = top + rowH * (i + 0.5);
      if (!r) {
        text(ctx, '· · ·', xE, y, { color: th.muted, size: 14, align: 'center' });
        return;
      }
      at.set(r, y);
      line(ctx, 12, y + rowH / 2, w - 12, y + rowH / 2, { color: th.grid, width: 1 });
      text(ctx, volts(r.E).replace(' V', ''), xE, y, { color: th.muted, size: size - 1, align: 'center' });
      for (const [x, sd, key] of [[xO, r.ox, r === p.soa ? th.seriesB : null], [xR, r.red, r === p.sra ? th.seriesA : null]]) {
        const here = has(sd);
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
        text(ctx, sd.map(([, s]) => bare(s)).join(' + '), x, y, { color: here ? th.ink : th.muted, size, align: 'center', weight: here ? 650 : 450 });
      }
    });

    // --- SOA to SRA: downhill (upper left to lower right) means spontaneous ---
    if (!p.net) {
      text(ctx, 'no net reaction', w / 2, bottom + 8, { color: th.muted, size: 12, align: 'center' });
      return;
    }
    const x1 = xO + cellW / 2 + 4;
    const y1 = at.get(p.soa);
    const x2 = xR - cellW / 2 - 4;
    const y2 = at.get(p.sra);
    if (!p.spontaneous) {
      line(ctx, x1, y1, x2, y2, { color: th.muted, width: 2, dash: [6, 5] });
      return;
    }
    line(ctx, x1, y1, x2, y2, { color: th.electron, width: 2.5 });
    // Electrons move from the SRA to the SOA.
    const f = (clk.t * E_SPEED) % 1;
    const ex = x2 + (x1 - x2) * f;
    const ey = y2 + (y1 - y2) * f;
    ctx.fillStyle = th.electron;
    ctx.beginPath();
    ctx.arc(ex, ey, 9, 0, 2 * Math.PI);
    ctx.fill();
    text(ctx, 'e⁻', ex, ey, { color: th.surface, size: 10, align: 'center', weight: 700 });
  }
}
