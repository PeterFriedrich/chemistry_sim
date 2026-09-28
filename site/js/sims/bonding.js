import * as B from '../chem/bonding.js';
import { fitCanvas, theme, clear, text, line, arrow } from '../lib/canvas.js';
import { section, choice, toggle, readouts, el } from '../lib/controls.js';
import { createClock } from '../lib/clock.js';

export const equations = [
  { html: 'bonding capacity = unpaired electrons in the Lewis symbol', what: 'C 4, N 3, O 2, H and halogens 1; every one is used in a bond' },
  { html: 'electron groups = bonded atoms + lone pairs on the central atom', what: 'a double or triple bond counts as one group' },
  { html: 'ΔEN = EN(higher) − EN(lower)', what: '0 nonpolar covalent · under 1.7 polar covalent · 1.7 or more ionic (booklet electronegativities)' },
  { html: 'polar molecule: bond dipoles that do not cancel', what: 'symmetrical shape, identical outer atoms, no central lone pairs → they cancel' },
];

export const prompts = [
  'CH₄, NH₃ and H₂O all have four electron groups on the central atom. Why do they have three different shapes?',
  'CO₂ has polar bonds but is nonpolar. Why? Now try HCN, also linear.',
  'Compare CCl₄ and CH₃Cl. Which is polar, and what breaks the symmetry?',
  'Find the ΔEN of an O–H bond by hand from the booklet, then check.',
  'PH₃ has a lone pair but comes out nonpolar here. Look at its ΔEN: why?',
  'Type CO or SO₂. Why can bonding capacity not draw them?',
];

export const legend = [
  { color: 'electron', label: 'lone pair' },
  { color: 'cation', label: 'δ+ end' },
  { color: 'anion', label: 'δ− end, dipole arrow' },
  { color: 'accent', label: 'net dipole' },
];

export const tallOnMobile = true;

const EXAMPLES = ['H2O', 'NH3', 'CH4', 'CO2', 'HCN', 'CH2O', 'BF3', 'CCl4', 'CH3Cl', 'PCl3', 'H2S', 'PH3', 'OF2', 'HCl', 'HF', 'N2', 'O2', 'Cl2'];

const SUB = '₀₁₂₃₄₅₆₇₈₉';
const sub = (s) => s.replace(/([A-Za-z)])(\d+)/g, (_, c, d) => c + d.replace(/\d/g, (x) => SUB[x]));
const bondSym = (order) => ['', '–', '=', '≡'][order];

// Lewis-structure directions (x right, y up): terminals first, lone pairs in the gaps.
const AXES = [[-1, 0], [1, 0], [0, 1], [0, -1]];
const LEWIS_SLOTS = { 1: [[1, 0]], 2: [[-1, 0], [1, 0]], 3: [[-1, 0], [1, 0], [0, -1]], 4: [[-1, 0], [1, 0], [0, 1], [0, -1]] };

export function mount(ui) {
  const box = section(ui.controls, 'Molecule');
  const row = el('div', { class: 'ctl ctl-choice' }, box);
  el('label', { for: 'ctl-molecule', text: 'Formula' }, row);
  const input = el('input', { id: 'ctl-molecule', type: 'text', value: EXAMPLES[0], autocomplete: 'off', spellcheck: 'false' }, row);
  el('div', { class: 'ctl-unit', text: 'One central atom, or two atoms: H2O, CH2O, HCN, N2' }, row);
  const ex = choice(box, { label: 'Or pick an example', options: EXAMPLES.map((x) => ({ value: x, label: sub(x) })), value: EXAMPLES[0] });
  ex.onChange((v) => (input.value = v));
  const showDipoles = toggle(box, { label: 'Show bond dipoles', checked: true });

  const out = readouts(ui.readouts, [
    { id: 'mol', label: 'Molecule' },
    { id: 'groups', label: 'Electron groups' },
    { id: 'shape', label: 'Shape' },
    { id: 'bonds', label: 'Bonds' },
    { id: 'polar', label: 'Polarity' },
  ]);
  el('h3', { text: 'Steps', style: 'font-size: 14px; margin: 14px 0 6px' }, ui.readouts);
  const steps = el('ol', { style: 'margin: 0; padding-left: 20px; line-height: 1.45' }, ui.readouts);

  const canvas = fitCanvas(ui.canvas);
  createClock(ui.transport, { frame: draw });
  ui.transport.hidden = true; // nothing moves

  let last = null;
  let r = null;
  function draw() {
    if (input.value !== last) {
      last = input.value;
      r = B.analyse(input.value);
      if (r.error) {
        ['mol', 'groups', 'shape', 'bonds'].forEach((id) => out.set(id, '—'));
        out.set('polar', sub(r.error));
        out.set('mol', '—');
        steps.replaceChildren();
      } else {
        out.set('mol', `${sub(r.formula)}: central atom ${r.central}`);
        out.set('groups', r.diatomic ? '— (two atoms: always linear)' : `${r.terminals.length} bonded + ${r.centralLone} lone pair${r.centralLone === 1 ? '' : 's'} = ${r.terminals.length + r.centralLone}`);
        out.set('shape', `${r.shape.name}${r.shape.angle ? `, ${r.shape.angle}` : ''}`);
        const seen = new Set();
        out.set('bonds', r.bonds.filter((b) => !seen.has(b.b + b.order) && seen.add(b.b + b.order)).map((b) => {
          const [hi, lo] = B.deltaEN(b.a, b.b) === 0 ? [b.a, b.b] : b.toward === b.b ? [b.b, b.a] : [b.a, b.b];
          return `${b.a}${bondSym(b.order)}${b.b}: ΔEN = ${enOf(hi)} − ${enOf(lo)} = ${b.dEN.toFixed(1)}, ${b.type}`;
        }).join('; '));
        out.set('polar', `${r.polar ? 'polar' : 'nonpolar'}: ${r.reason}`);
        steps.replaceChildren(...r.steps.map((st) => el('li', { text: sub(st) })));
      }
    }
    const { ctx, w, h } = canvas;
    const th = theme();
    clear(ctx, w, h);
    if (r.error) {
      text(ctx, 'Not drawn', w / 2, h / 2 - 12, { color: th.danger, size: 15, align: 'center', weight: 650 });
      text(ctx, 'See the message under Molecule.', w / 2, h / 2 + 12, { color: th.muted, size: 13, align: 'center' });
      return;
    }
    const wide = w / h > 1.1;
    const left = wide ? { x: 0, y: 0, w: w / 2, h } : { x: 0, y: 0, w, h: h / 2 };
    const right = wide ? { x: w / 2, y: 0, w: w / 2, h } : { x: 0, y: h / 2, w, h: h / 2 };
    line(ctx, wide ? w / 2 : 16, wide ? 16 : h / 2, wide ? w / 2 : w - 16, wide ? h - 16 : h / 2, { color: th.grid, width: 1 });
    drawLewis(ctx, th, left);
    drawShape(ctx, th, right);
  }

  const enOf = (sym) => B.enOf(sym).toFixed(1);

  function drawLewis(ctx, th, R) {
    text(ctx, 'Lewis structure', R.x + R.w / 2, R.y + 18, { color: th.muted, size: 13, align: 'center', weight: 650 });
    const cx = R.x + R.w / 2 + (r.diatomic ? -R.w * 0.12 : 0);
    const cy = R.y + R.h / 2 + 8;
    const d = Math.min(R.w, R.h) * (r.diatomic ? 0.26 : 0.27);
    const fs = Math.max(16, Math.min(28, d * 0.32));
    const slots = LEWIS_SLOTS[r.terminals.length];
    // two dots beside a symbol; sideways ones clear a two-letter symbol (Cl, Br)
    const pair = (x, y, [dx, dy], color, sym) => {
      const g = fs * 0.2;
      const off = dx ? fs * (0.3 + 0.32 * sym.length) : fs * 0.62;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(x + dx * off + dy * g * s, y - dy * off + dx * g * s, Math.max(2.2, fs * 0.08), 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      }
    };
    text(ctx, r.central, cx, cy, { color: th.ink, size: fs, align: 'center', weight: 700 });
    const free = AXES.filter(([ax, ay]) => !slots.some(([sx, sy]) => sx === ax && sy === ay));
    free.slice(0, r.centralLone).forEach((dir) => pair(cx, cy, dir, th.electron, r.central));
    r.terminals.forEach((t, i) => {
      const [dx, dy] = slots[i];
      const tx = cx + dx * d;
      const ty = cy - dy * d;
      text(ctx, t.sym, tx, ty, { color: th.ink, size: fs, align: 'center', weight: 700 });
      // the bond: 1–3 parallel lines between the two symbols
      const gap = fs * 0.16;
      for (let k = 0; k < t.order; k++) {
        const o = (k - (t.order - 1) / 2) * gap;
        const [ga, gb] = [fs * (0.25 + 0.3 * r.central.length), fs * (0.25 + 0.3 * t.sym.length)].map((g) => (dx ? g : fs * 0.55));
        line(ctx, cx + dx * ga - dy * o, cy - dy * ga - dx * o, tx - dx * gb - dy * o, ty + dy * gb - dx * o, { color: th.ink, width: 2 });
      }
      // terminal lone pairs: straight out first, then the two sides
      const out = [[dx, dy], [dy, dx], [-dy, -dx]];
      out.slice(0, t.lone).forEach((dir) => pair(tx, ty, dir, th.electron, t.sym));
    });
  }

  function drawShape(ctx, th, R) {
    text(ctx, `Shape: ${r.shape.name}`, R.x + R.w / 2, R.y + 18, { color: th.muted, size: 13, align: 'center', weight: 650 });
    // Fit the projected molecule (atoms and lone pairs) into the panel, centred.
    const proj = ([x, y, z]) => [x + 0.4 * z, y - 0.4 * z]; // oblique: wedge and dash both clear of the centre
    const pts = [[0, 0, 0], ...r.bonds.map((b) => b.dir), ...(r.diatomic ? [] : r.shape.lone.map((v) => v.map((c) => c * 0.62)))].map(proj);
    const [x0, x1] = [Math.min(...pts.map((q) => q[0])), Math.max(...pts.map((q) => q[0]))];
    const [y0, y1] = [Math.min(...pts.map((q) => q[1])), Math.max(...pts.map((q) => q[1]))];
    const L = Math.min((R.w - 150) / Math.max(1, x1 - x0), (R.h - 110) / Math.max(1, y1 - y0), Math.min(R.w, R.h) * 0.36);
    const cx = R.x + R.w / 2 - ((x0 + x1) / 2) * L - (r.net && Math.abs(r.net[0]) < 0.5 ? 30 : 0);
    const cy = R.y + R.h / 2 + 6 + ((y0 + y1) / 2) * L;
    const P = (v) => {
      const [x, y] = proj(v);
      return [cx + x * L, cy - y * L];
    };
    const atomR = Math.max(11, L * 0.2);

    // lone pairs as lobes
    r.shape.lone.forEach((v) => {
      if (r.diatomic) return;
      const [x, y] = P(v.map((c) => c * 0.62));
      ctx.save();
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = th.electron;
      ctx.beginPath();
      ctx.ellipse(x, y, atomR * 0.9, atomR * 0.6, Math.atan2(-(v[1] - 0.4 * v[2]), v[0] + 0.4 * v[2]), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(x + s * 4, y, 2.6, 0, Math.PI * 2);
        ctx.fillStyle = th.electron;
        ctx.fill();
      }
    });

    // bonds back to front, then atoms
    const order = r.bonds.map((b, i) => i).sort((i, j) => r.bonds[i].dir[2] - r.bonds[j].dir[2]);
    for (const i of order) {
      const b = r.bonds[i];
      const [x, y] = P(b.dir);
      const z = b.dir[2];
      if (z > 0.3) wedge(ctx, cx, cy, x, y, th.ink, false);
      else if (z < -0.3) wedge(ctx, cx, cy, x, y, th.ink, true);
      else {
        const len = Math.hypot(x - cx, y - cy);
        const [nx, ny] = [-(y - cy) / len, (x - cx) / len];
        for (let k = 0; k < b.order; k++) {
          const o = (k - (b.order - 1) / 2) * 6;
          line(ctx, cx + nx * o, cy + ny * o, x + nx * o, y + ny * o, { color: th.ink, width: 2.2 });
        }
      }
    }
    const atom = (x, y, sym, delta) => {
      ctx.beginPath();
      ctx.arc(x, y, atomR, 0, Math.PI * 2);
      ctx.fillStyle = th.surface;
      ctx.fill();
      ctx.strokeStyle = delta === '+' ? th.cation : delta === '−' ? th.anion : th.muted;
      ctx.lineWidth = delta ? 2.5 : 1.2;
      ctx.stroke();
      text(ctx, sym, x, y, { color: th.ink, size: Math.max(12, atomR * 0.9), align: 'center', weight: 700 });
      if (delta && showDipoles.value) text(ctx, `δ${delta}`, x + atomR * 0.9, y - atomR * 1.05, { color: delta === '+' ? th.cation : th.anion, size: 13, weight: 700 });
    };
    // δ on the central atom only when every polar bond pulls the same way
    const pulls = new Set(r.bonds.filter((b) => b.toward).map((b) => (b.toward === b.a ? '−' : '+')));
    atom(cx, cy, r.central, pulls.size === 1 ? [...pulls][0] : null);
    for (const b of r.bonds) {
      const [x, y] = P(b.dir);
      atom(x, y, b.b, b.toward ? (b.toward === b.b ? '−' : '+') : null);
    }

    // bond dipole arrows, beside each bond, pointing to δ−
    if (showDipoles.value) {
      for (const b of r.bonds) {
        if (!b.toward) continue;
        const [x, y] = P(b.dir);
        const len = Math.hypot(x - cx, y - cy);
        const [ux, uy] = [(x - cx) / len, (y - cy) / len];
        // the same side of every bond: below it, or right of a vertical one
        let [nx, ny] = [-uy, ux];
        if (ny < -0.2 || (Math.abs(ny) <= 0.2 && nx < 0)) [nx, ny] = [-nx, -ny];
        const off = 14 + (b.order - 1) * 4;
        const s = b.toward === b.b ? 1 : -1;
        const a0 = s > 0 ? atomR + 4 : len - atomR - 4;
        const a1 = s > 0 ? len - atomR - 4 : atomR + 4;
        const [x0, y0] = [cx + ux * a0 + nx * off, cy + uy * a0 + ny * off];
        const [x1, y1] = [cx + ux * a1 + nx * off, cy + uy * a1 + ny * off];
        arrow(ctx, x0, y0, x1 - x0, y1 - y0, { color: th.anion, width: 2, head: 8 });
        line(ctx, x0 + (x1 - x0) * 0.12 - nx * 5, y0 + (y1 - y0) * 0.12 - ny * 5, x0 + (x1 - x0) * 0.12 + nx * 5, y0 + (y1 - y0) * 0.12 + ny * 5, { color: th.anion, width: 2 });
      }
    }

    // net dipole
    const foot = R.y + R.h - 20;
    if (r.net) {
      const [n0, n1, n2] = r.net;
      const [px, py] = [n0 + 0.4 * n2, -(n1 - 0.4 * n2)];
      const m = Math.hypot(px, py);
      const [ux, uy] = [px / m, py / m];
      // beside the molecule: to the right of an up/down dipole, below a sideways one
      const [sx, sy] = Math.abs(ux) > Math.abs(uy) ? [0, 1] : [1, 0];
      const reach = L * 1.1;
      const [ax, ay] = [cx + sx * (L * (x1 + 0.35) + 30) - ux * reach / 2, cy + sy * (L * (0.35 - y0) + 22) - uy * reach / 2];
      arrow(ctx, ax, ay, ux * reach, uy * reach, { color: th.accent, width: 3.5, head: 12, dash: [7, 5] });
      text(ctx, 'polar: net dipole (dashed)', R.x + R.w / 2, foot, { color: th.accent, size: 13, align: 'center', weight: 650 });
    } else {
      text(ctx, r.bonds.every((b) => !b.toward) ? 'nonpolar: no bond dipoles' : 'nonpolar: the bond dipoles cancel', R.x + R.w / 2, foot, { color: th.muted, size: 13, align: 'center', weight: 650 });
    }
  }
}

// A wedge (toward the viewer) or a hashed wedge (away) from (x0, y0) to (x1, y1).
function wedge(ctx, x0, y0, x1, y1, color, hashed) {
  const len = Math.hypot(x1 - x0, y1 - y0);
  const [nx, ny] = [-(y1 - y0) / len, (x1 - x0) / len];
  const wd = 7;
  ctx.save();
  ctx.strokeStyle = ctx.fillStyle = color;
  if (!hashed) {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1 + nx * wd, y1 + ny * wd);
    ctx.lineTo(x1 - nx * wd, y1 - ny * wd);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.lineWidth = 1.6;
    for (let t = 0.12; t <= 1; t += 0.11) {
      const [px, py] = [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t];
      ctx.beginPath();
      ctx.moveTo(px + nx * wd * t, py + ny * wd * t);
      ctx.lineTo(px - nx * wd * t, py - ny * wd * t);
      ctx.stroke();
    }
  }
  ctx.restore();
}
