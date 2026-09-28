import * as B from '../chem/bonding.js';
import { lonePairs } from '../chem/structure.js';
import { fitCanvas, theme, clear, text, line, arrow } from '../lib/canvas.js';
import { section, choice, toggle, readouts, el } from '../lib/controls.js';
import { createClock } from '../lib/clock.js';

export const equations = [
  { html: 'bonding capacity = unpaired electrons in the Lewis symbol', what: 'C 4, N 3, O 2, H and halogens 1; every one is used in a bond' },
  { html: 'electron groups = bonded atoms + lone pairs on the central atom', what: 'a double or triple bond counts as one group' },
  { html: 'ΔEN = EN(higher) − EN(lower)', what: '0 nonpolar covalent · under 1.7 polar covalent · 1.7 or more ionic (booklet electronegativities)' },
  { html: 'polar molecule: bond dipoles that do not cancel', what: 'symmetrical shape, identical outer atoms, no central lone pairs → they cancel' },
  { html: 'isomers: the same molecular formula, different structures', what: 'CH₃CH₂OH and CH₃OCH₃ are both C₂H₆O' },
];

export const prompts = [
  'CH₄, NH₃ and H₂O all have four electron groups on the central atom. Why do they have three different shapes?',
  'CO₂ has polar bonds but is nonpolar. Why? Now try HCN, also linear.',
  'Compare CCl₄ and CH₃Cl. Which is polar, and what breaks the symmetry?',
  'Find the ΔEN of an O–H bond by hand from the booklet, then check.',
  'PH₃ has a lone pair but comes out nonpolar here. Look at its ΔEN: why?',
  'Type CO or SO₂. Why can bonding capacity not draw them?',
  'CH₃CN: find the triple bond from the bonding capacities. What shape is each carbon?',
  'Type C₂H₆O. Draw both isomers by hand, then compare them here. Which one can hydrogen-bond?',
  'Butane, C₄H₁₀, is nonpolar. Why do the C–H bond dipoles cancel even in a long chain?',
];

export const legend = [
  { color: 'electron', label: 'lone pair' },
  { color: 'cation', label: 'δ+ end' },
  { color: 'anion', label: 'δ− end, dipole arrow' },
  { color: 'accent', label: 'net dipole' },
];

export const tallOnMobile = true;

const EXAMPLES = ['H2O', 'NH3', 'CH4', 'CO2', 'HCN', 'CH2O', 'BF3', 'CCl4', 'CH3Cl', 'PCl3', 'H2S', 'PH3', 'OF2', 'HCl', 'HF', 'N2', 'O2', 'Cl2',
  'CH3OH', 'CH3CN', 'C2H4', 'C2H2', 'CH3CH2OH', 'CH3OCH3', 'C2H6O', 'CH3NH2', 'CH3COOH', 'CH3CH2CH2CH3', 'CH3CH(CH3)CH3', 'C5H12'];

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
  el('div', { class: 'ctl-unit', text: 'A formula (H2O, CH2O, N2) or a condensed formula (CH3CH2OH, CH3CN); up to 6 atoms other than H and halogens' }, row);
  const ex = choice(box, { label: 'Or pick an example', options: EXAMPLES.map((x) => ({ value: x, label: sub(x) })), value: EXAMPLES[0] });
  ex.onChange((v) => (input.value = v));
  const showDipoles = toggle(box, { label: 'Show bond dipoles', checked: true });
  const dipoleRow = box.querySelector('.ctl-toggle'); // the chain drawing has no dipole arrows
  const isoResults = new Map();
  const isoBox = el('div', { class: 'ctl' }, box);
  const isoLabel = el('label', {}, isoBox);
  const isoRow = el('div', { class: 'ctl-buttons' }, isoBox);

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
      isoList(r);
      if (r.error) {
        ['mol', 'groups', 'shape', 'bonds'].forEach((id) => out.set(id, '—'));
        out.set('polar', sub(r.error));
        out.set('mol', '—');
        steps.replaceChildren();
      } else if (r.chain) {
        const once = (list) => [...new Set(list)].join('; ');
        out.set('mol', `${sub(r.formula)} (${sub(r.molecular)}): ${r.centres.length} central atoms`);
        out.set('groups', once(r.centres.map((c) => `${sub(c.label)}: ${c.bonded} bonded + ${c.lone} lone pair${c.lone === 1 ? '' : 's'} = ${c.bonded + c.lone}`)));
        out.set('shape', once(r.centres.map((c) => `${sub(c.label)}: ${c.shape.name}${c.shape.angle ? `, ${c.shape.angle}` : ''}`)));
        out.set('bonds', bondList(r.bonds));
        out.set('polar', `${r.polar ? 'polar' : 'nonpolar'}: ${r.reason}`);
        steps.replaceChildren(...r.steps.map((st) => el('li', { text: sub(st) })));
      } else {
        out.set('mol', `${sub(r.formula)}: central atom ${r.central}`);
        out.set('groups', r.diatomic ? '— (two atoms: always linear)' : `${r.terminals.length} bonded + ${r.centralLone} lone pair${r.centralLone === 1 ? '' : 's'} = ${r.terminals.length + r.centralLone}`);
        out.set('shape', `${r.shape.name}${r.shape.angle ? `, ${r.shape.angle}` : ''}`);
        out.set('bonds', bondList(r.bonds));
        out.set('polar', `${r.polar ? 'polar' : 'nonpolar'}: ${r.reason}`);
        steps.replaceChildren(...r.steps.map((st) => el('li', { text: sub(st) })));
      }
    }
    const { ctx, w, h } = canvas;
    const th = theme();
    clear(ctx, w, h);
    dipoleRow.hidden = !!(r.chain || r.isomers);
    if (r.error && r.isomers?.length > 1) {
      // a molecular formula: every structure it can have, side by side
      const n = Math.min(r.isomers.length, 9);
      const narrow = w < 560;
      const cols = narrow ? (n <= 3 ? 1 : 2) : Math.min(n, 3);
      const rows = Math.ceil(n / cols);
      r.isomers.slice(0, n).forEach((iso, k) => {
        const cell = { x: (k % cols) * (w / cols), y: 28 + Math.floor(k / cols) * ((h - 28) / rows), w: w / cols, h: (h - 28) / rows };
        drawChain(ctx, th, cell, isoResults.get(iso.formula) ?? isoResults.set(iso.formula, B.analyse(iso.formula)).get(iso.formula), sub(iso.formula));
      });
      const head = `${n < r.isomers.length ? `The first ${n} of ` : ''}${r.isomers.length} isomers`;
      text(ctx, narrow ? head : `${head}: tap one under Molecule to see its shapes and polarity`, w / 2, 16, { color: th.muted, size: 13, align: 'center', weight: 650 });
      return;
    }
    if (r.error) {
      text(ctx, 'Not drawn', w / 2, h / 2 - 12, { color: th.danger, size: 15, align: 'center', weight: 650 });
      text(ctx, 'See the message under Molecule.', w / 2, h / 2 + 12, { color: th.muted, size: 13, align: 'center' });
      return;
    }
    if (r.chain) {
      drawChain(ctx, th, { x: 0, y: 0, w, h }, r);
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

  function bondList(bonds) {
    const seen = new Set();
    return bonds.filter((b) => {
      const k = [b.a, b.b].sort().join() + b.order;
      return !seen.has(k) && seen.add(k);
    }).map((b) => {
      const [hi, lo] = b.dEN === 0 ? [b.a, b.b] : b.toward === b.b ? [b.b, b.a] : [b.a, b.b];
      return `${b.a}${bondSym(b.order)}${b.b}: ΔEN = ${enOf(hi)} − ${enOf(lo)} = ${b.dEN.toFixed(1)}, ${b.type}`;
    }).join('; ');
  }

  // "Same formula, other structures": tapping one loads it.
  function isoList(res) {
    const list = res.isomers ?? [];
    isoBox.hidden = !list.length;
    if (!list.length) return;
    const mf = res.molecular ? sub(res.molecular) : sub(res.error.split(' ')[0]);
    isoLabel.textContent = list.length === 1 ? `${mf}: the only structure (no rings)` : `${mf}: ${list.length} structures (isomers)`;
    isoRow.replaceChildren(...list.map((iso) => {
      const b = el('button', { type: 'button', class: iso.current ? 'btn btn-primary' : 'btn', text: sub(iso.formula) });
      b.addEventListener('click', () => (input.value = iso.formula));
      return b;
    }));
  }

  // The Lewis structure of a chain: the main chain across, branches and
  // outer atoms up and down, in grid units (a chain bond is 2, an outer bond 1).
  // With a `title`, a small panel of the isomer grid: no polarity footer.
  function drawChain(ctx, th, R, r, title) {
    const mol = r.structure;
    const adj = mol.atoms.map(() => []);
    mol.edges.forEach((e) => {
      adj[e.i].push({ w: e.j, order: e.order });
      adj[e.j].push({ w: e.i, order: e.order });
    });
    const nodes = []; // { sym, x, y }
    const links = []; // [a, b, order]
    const pairs = []; // [node, dx, dy]
    const place = (v, x, y, slots) => {
      const n = nodes.push({ sym: mol.atoms[v].sym, x, y }) - 1;
      const free = slots.slice();
      const take = (pref) => {
        const k = pref ? free.findIndex(([dx, dy]) => dx === pref[0] && dy === pref[1]) : 0;
        return free.splice(k < 0 ? 0 : k, 1)[0];
      };
      return { n, free, take };
    };
    const P = r.path;
    const index = new Map();
    let lastUp = null;
    P.forEach((v, k) => {
      const slots = [];
      if (k === 0) slots.push([-1, 0]);
      if (k === P.length - 1) slots.push([1, 0]);
      slots.push([0, 1], [0, -1]);
      const at = place(v, 2 * k, 0, slots);
      index.set(v, at.n);
      if (k > 0) links.push([index.get(P[k - 1]), at.n, adj[v].find((a) => a.w === P[k - 1]).order]);
      const branches = adj[v].filter((a) => !P.includes(a.w));
      let up = lastUp === k - 1 ? false : true;
      let placedUp = false;
      for (const b of branches) {
        const dir = at.take(up ? [0, 1] : [0, -1]);
        if (dir[1] === 1) placedUp = true;
        branch(b.w, v, at.n, 2 * k, 0, dir, b.order);
        up = !up;
      }
      if (placedUp) lastUp = k;
      mol.atoms[v].terms.forEach((t) => terminal(t, at.n, 2 * k, 0, at.take()));
      for (let i = 0; i < lonePairs(mol.atoms[v].sym); i++) pairs.push([at.n, ...at.take()]);
    });
    function branch(v, from, fromNode, x0, y0, [dx, dy], order) {
      const [x, y] = [x0 + 2 * dx, y0 + 2 * dy];
      const at = place(v, x, y, [[dx, dy], [-1, 0], [1, 0], [-dx, -dy]].filter(([a, b]) => !(a === -dx && b === -dy)));
      links.push([fromNode, at.n, order]);
      adj[v].filter((a) => a.w !== from).forEach((a) => branch(a.w, v, at.n, x, y, at.take([dx, dy]), a.order));
      mol.atoms[v].terms.forEach((t) => terminal(t, at.n, x, y, at.take([dx, dy])));
      for (let i = 0; i < lonePairs(mol.atoms[v].sym); i++) pairs.push([at.n, ...at.take(at.free.find(([a]) => a !== 0) ?? null)]);
    }
    function terminal(sym, fromNode, x0, y0, [dx, dy]) {
      const n = nodes.push({ sym, x: x0 + dx, y: y0 + dy }) - 1;
      links.push([fromNode, n, 1]);
      [[dx, dy], [dy, dx], [-dy, -dx]].slice(0, lonePairs(sym)).forEach(([ex, ey]) => pairs.push([n, ex, ey]));
    }

    text(ctx, title ?? 'Lewis structure', R.x + R.w / 2, R.y + 18, { color: title ? th.ink : th.muted, size: 13, align: 'center', weight: 650 });
    const xs = nodes.map((n) => n.x);
    const ys = nodes.map((n) => n.y);
    const [x0, x1, y0, y1] = [Math.min(...xs) - 0.6, Math.max(...xs) + 0.6, Math.min(...ys) - 0.6, Math.max(...ys) + 0.6];
    const u = Math.min((R.w - 24) / (x1 - x0), (R.h - (title ? 36 : 80)) / (y1 - y0), 64);
    const cx = R.x + R.w / 2 - ((x0 + x1) / 2) * u;
    const cy = R.y + R.h / 2 + (title ? 10 : 4) + ((y0 + y1) / 2) * u;
    const X = (n) => cx + n.x * u;
    const Y = (n) => cy - n.y * u;
    const fs = Math.max(title ? 9 : 13, Math.min(26, u * 0.5));
    for (const [a, b, order] of links) {
      const [A, Bn] = [nodes[a], nodes[b]];
      const [dx, dy] = [Math.sign(Bn.x - A.x), Math.sign(Bn.y - A.y)];
      const clear = (n) => (dx ? fs * (0.25 + 0.3 * n.sym.length) : fs * 0.55);
      for (let k = 0; k < order; k++) {
        const o = (k - (order - 1) / 2) * fs * 0.16;
        line(ctx, X(A) + dx * clear(A) - dy * o, Y(A) - dy * clear(A) - dx * o, X(Bn) - dx * clear(Bn) - dy * o, Y(Bn) + dy * clear(Bn) - dx * o, { color: th.ink, width: 2 });
      }
    }
    for (const n of nodes) text(ctx, n.sym, X(n), Y(n), { color: th.ink, size: fs, align: 'center', weight: 700 });
    for (const [i, dx, dy] of pairs) {
      const n = nodes[i];
      const g = fs * 0.2;
      const off = dx ? fs * (0.3 + 0.32 * n.sym.length) : fs * 0.62;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(X(n) + dx * off + dy * g * s, Y(n) - dy * off + dx * g * s, Math.max(2, fs * 0.08), 0, Math.PI * 2);
        ctx.fillStyle = th.electron;
        ctx.fill();
      }
    }
    if (title) return;
    text(ctx, r.polar ? 'polar: the bond dipoles do not cancel' : r.bonds.every((b) => !b.toward) ? 'nonpolar: no bond dipoles' : 'nonpolar: the bond dipoles cancel', R.x + R.w / 2, R.y + R.h - 20, { color: r.polar ? th.accent : th.muted, size: 13, align: 'center', weight: 650 });
  }

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
