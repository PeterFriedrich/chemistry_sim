import * as B from '../chem/balancing.js';
import { fitCanvas, theme, clear, line, text, font, roundRect } from '../lib/canvas.js';
import { section, choice, buttons, readouts } from '../lib/controls.js';
import { createClock } from '../lib/clock.js';
import { species } from '../lib/format.js';

export const tallOnMobile = true;

export const equations = [
  { html: 'other atoms → O with H₂O → H with H⁺ → charge with e⁻', what: 'the half-reaction method; in basic solution add OH⁻ to both sides to cancel the H⁺' },
  { html: 'e⁻ on the left: reduction · e⁻ on the right: oxidation', what: 'reduction is a gain of electrons, oxidation a loss' },
  { html: 'electrons lost = electrons gained', what: 'multiply each half-reaction, add, and cancel what appears on both sides' },
  { html: 'Σ oxidation numbers = charge of the species', what: 'O −2 (−1 in peroxides), H +1 (−1 in metal hydrides), elements 0' },
  { html: 'oxidation number rises: oxidized (in the RA) · falls: reduced (in the OA)', what: 'no change anywhere: not a redox reaction' },
];

export const prompts = [
  'Balance NO₃⁻ → NO in acidic solution by hand, then step through it. Which step adds the electrons, and which side do they go on?',
  'Switch MnO₄⁻ → MnO₂ to basic solution. What do the two extra steps do to the H⁺?',
  'Net ionic equation: combine Cr₂O₇²⁻ → Cr³⁺ with C₂H₅OH → CH₃COOH (the breathalyzer). Why is the dichromate half multiplied by 2 and the ethanol half by 3?',
  'Choose two reductions for the net ionic equation. Why can they not be combined?',
  'Oxidation numbers: in 2 H₂O₂ → 2 H₂O + O₂, which atom is oxidized and which is reduced?',
  'Why is H₃O⁺ + OH⁻ → 2 H₂O not a redox reaction?',
];

export const legend = [
  { color: 'series-b', label: 'reduced (in the OA)' },
  { color: 'series-a', label: 'oxidized (in the RA)' },
  { color: 'product', label: 'balanced' },
  { color: 'danger', label: 'not balanced yet' },
];

const HALF_STEPS = {
  skeleton: 'Skeleton half-reaction',
  atoms: '1. Balance atoms other than O and H',
  oxygen: '2. Balance O by adding H₂O',
  hydrogen: '3. Balance H by adding H⁺',
  charge: '4. Balance charge by adding e⁻',
  hydroxide: '5. Basic: add OH⁻ to both sides, one per H⁺',
  water: '6. Basic: H⁺ + OH⁻ → H₂O, then cancel water',
};
const NET_STEPS = ['The two skeleton half-reactions', '1. Balance each half-reaction', '2. Multiply so electrons lost = electrons gained', '3. Add, and cancel what appears on both sides'];

const term = ([n, s]) => (n === 1 ? '' : `${n} `) + species(s);
const eTerm = (n) => (n === 1 ? 'e⁻' : `${n} e⁻`);
const sideText = (list, e) => [...list.map(term), ...(e ? [eTerm(e.n)] : [])].join(' + ');
const eq = ({ left, right, e }, k = 1) => {
  const scale = (list) => list.map(([n, s]) => [n * k, s]);
  const ek = e && { ...e, n: e.n * k };
  return `${sideText(scale(left), ek?.side === 'left' && ek)} → ${sideText(scale(right), ek?.side === 'right' && ek)}`;
};
const on = (v) => (v === 0 ? '0' : `${v > 0 ? '+' : '−'}${Math.abs(v)}`);
const check = (t) =>
  [...t.rows.map((r) => `${r.el} ${r.left}${r.left === r.right ? ' = ' : ' ≠ '}${r.right}`), `charge ${on(t.charge.left)}${t.charge.left === t.charge.right ? ' = ' : ' ≠ '}${on(t.charge.right)}`].join(', ');

export function mount(ui) {
  const qbox = section(ui.controls, 'Question');
  const mode = choice(qbox, {
    label: 'Question type',
    options: [
      { value: 'half', label: 'Balance a half-reaction' },
      { value: 'net', label: 'Net ionic equation from two half-reactions' },
      { value: 'on', label: 'Oxidation numbers: what is oxidized and reduced?' },
    ],
    value: 'half',
  });
  const medium = choice(qbox, {
    label: 'Solution',
    options: [{ value: 'acidic', label: 'Acidic (H⁺)' }, { value: 'basic', label: 'Basic (OH⁻)' }],
    value: 'acidic',
  });
  const skOptions = B.skeletons.map((s) => ({ value: s.id, label: `${species(s.from)} → ${species(s.to)}` }));
  const hbox = section(ui.controls, 'Skeleton');
  const half = choice(hbox, { label: 'Half-reaction', options: skOptions, value: 'NO3' });
  const nbox = section(ui.controls, 'Skeletons given in the question');
  const n1 = choice(nbox, { label: 'Half-reaction 1', options: skOptions, value: 'Cr2O7' });
  const n2 = choice(nbox, { label: 'Half-reaction 2', options: skOptions, value: 'C2H5OH' });
  const obox = section(ui.controls, 'Reaction');
  const rx = choice(obox, {
    label: 'Balanced equation',
    options: B.reactions.map((r) => ({ value: r.id, label: eq({ left: r.left, right: r.right, e: null }) })),
    value: 'breath',
  });

  let step = 0;
  const sbox = section(ui.controls, 'Steps');
  buttons(sbox, [
    { label: 'Next step', primary: true, onClick: () => (step += 1) },
    { label: 'Show all', onClick: () => (step = Infinity) },
    { label: 'Start over', onClick: () => (step = 0) },
  ]);

  const outH = readouts(ui.readouts, [
    { id: 'step', label: 'Step' },
    { id: 'eq', label: 'Half-reaction' },
    { id: 'chk', label: 'Check (left vs right)' },
    { id: 'type', label: 'Type' },
  ]);
  const dlH = ui.readouts.lastElementChild;
  const outN = readouts(ui.readouts, [
    { id: 'step', label: 'Step' },
    { id: 'red', label: 'Reduction' },
    { id: 'ox', label: 'Oxidation' },
    { id: 'net', label: 'Net ionic equation' },
    { id: 'ne', label: 'Electrons transferred' },
  ]);
  const dlN = ui.readouts.lastElementChild;
  const outO = readouts(ui.readouts, [
    { id: 'nums', label: 'Oxidation numbers' },
    { id: 'oxd', label: 'Oxidized' },
    { id: 'rdd', label: 'Reduced' },
    { id: 'oa', label: 'Oxidizing agent (OA)' },
    { id: 'ra', label: 'Reducing agent (RA)' },
  ]);
  const dlO = ui.readouts.lastElementChild;

  const canvas = fitCanvas(ui.canvas);
  createClock(ui.transport, { frame: draw });
  [mode, medium, half, n1, n2, rx].forEach((c) => c.onChange(() => (step = 0)));
  const shown = (node, show) => {
    const d = show ? '' : 'none';
    if (node.style.display !== d) node.style.display = d;
  };

  // One line of centred text, shrunk to fit; split at the arrow if it still does not.
  function fitLine(ctx, str, y, w, { size = 17, weight = 600, color } = {}) {
    let s = size;
    ctx.font = font(s, weight);
    while (s > 12 && ctx.measureText(str).width > w - 24) ctx.font = font(--s, weight);
    if (ctx.measureText(str).width <= w - 24 || !str.includes(' → ')) {
      text(ctx, str, w / 2, y, { size: s, weight, color, align: 'center' });
      return y + s + 12;
    }
    const [a, b] = str.split(' → ');
    text(ctx, a, w / 2, y, { size: s, weight, color, align: 'center' });
    text(ctx, `→ ${b}`, w / 2, y + s + 6, { size: s, weight, color, align: 'center' });
    return y + 2 * s + 18;
  }

  function drawTally(ctx, th, t, y0, w) {
    const rows = [...t.rows.map((r) => [r.el, r.left, r.right]), ['charge', t.charge.left, t.charge.right]];
    const narrow = w < 620;
    const x0 = narrow ? w * 0.08 : w * 0.12;
    const cols = [x0, x0 + (narrow ? 90 : 110), x0 + (narrow ? 150 : 180), x0 + (narrow ? 205 : 250)];
    const rh = 24;
    ['', 'Left', 'Right', ''].forEach((h, i) => text(ctx, h, cols[i], y0, { color: th.muted, size: 12, weight: 650, align: i ? 'center' : 'left' }));
    rows.forEach(([name, l, r], i) => {
      const y = y0 + rh * (i + 1);
      const ok = l === r;
      const f = name === 'charge' ? on : String;
      text(ctx, name, cols[0], y, { size: 14, weight: 600 });
      text(ctx, f(l), cols[1], y, { size: 14, align: 'center' });
      text(ctx, f(r), cols[2], y, { size: 14, align: 'center' });
      text(ctx, ok ? '✓' : '✗', cols[3], y, { size: 15, weight: 700, align: 'center', color: ok ? th.product : th.danger });
    });
    // The balance: tilts while anything is unbalanced, level when every row matches. Picture only.
    const off = rows.filter(([, l, r]) => l !== r).length;
    const cx = narrow ? w * 0.5 : w * 0.72;
    const cy = narrow ? y0 + rh * (rows.length + 1) + 50 : y0 + 60;
    const half = narrow ? w * 0.3 : Math.min(150, w * 0.18);
    const ang = (Math.min(off, 3) * 5 * Math.PI) / 180;
    const dx = half * Math.cos(ang);
    const dy = half * Math.sin(ang);
    const color = off ? th.danger : th.product;
    ctx.fillStyle = th.muted;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx - 12, cy + 40);
    ctx.lineTo(cx + 12, cy + 40);
    ctx.closePath();
    ctx.fill();
    line(ctx, cx - dx, cy + dy, cx + dx, cy - dy, { color, width: 4 });
    for (const [px, py, label] of [[cx - dx, cy + dy, 'left side'], [cx + dx, cy - dy, 'right side']]) {
      line(ctx, px, py, px, py + 22, { color: th.muted, width: 1 });
      line(ctx, px - 34, py + 22, px + 34, py + 22, { color, width: 3 });
      text(ctx, label, px, py + 36, { color: th.muted, size: 11, align: 'center' });
    }
    text(ctx, off ? 'not balanced yet' : 'balanced', cx, cy + 58, { color, size: 13, weight: 650, align: 'center' });
  }

  function draw() {
    const { ctx, w, h } = canvas;
    const th = theme();
    const m = mode.value;
    [hbox, dlH].forEach((n) => shown(n, m === 'half'));
    [nbox, dlN].forEach((n) => shown(n, m === 'net'));
    [obox, dlO].forEach((n) => shown(n, m === 'on'));
    shown(sbox, m !== 'on');
    shown(qbox.querySelectorAll('.ctl-choice')[1], m !== 'on');
    clear(ctx, w, h);
    if (m === 'half') drawHalf(ctx, th, w);
    else if (m === 'net') drawNet(ctx, th, w);
    else drawOn(ctx, th, w, h);
  }

  function drawHalf(ctx, th, w) {
    const r = B.balanceHalf(B.skeletons.find((s) => s.id === half.value), medium.value);
    step = Math.min(step, r.steps.length - 1);
    const st = r.steps[step];
    const t = B.tally(st);
    outH.set('step', HALF_STEPS[st.id]);
    outH.set('eq', eq(st));
    outH.set('chk', check(t));
    outH.set('type', st.e ? (r.reduction ? 'reduction: electrons gained (on the left)' : 'oxidation: electrons lost (on the right)') : '— (after step 4)');
    fitLine(ctx, HALF_STEPS[st.id], 22, w, { color: th.muted, size: 13, weight: 650 });
    const y = fitLine(ctx, eq(st), 54, w, { color: t.balanced ? th.product : th.ink });
    drawTally(ctx, th, t, y + 8, w);
  }

  function drawNet(ctx, th, w) {
    const sk1 = B.skeletons.find((s) => s.id === n1.value);
    const sk2 = B.skeletons.find((s) => s.id === n2.value);
    const c = B.combine(sk1, sk2, medium.value);
    step = Math.min(step, c.problem ? 1 : 3);
    outN.set('step', NET_STEPS[step]);
    const skel = (sk) => `${species(sk.from)} → ${species(sk.to)}`;
    if (c.problem) {
      outN.set('red', c.problem === 'both reductions' ? `${eq(c.h1.final)}; ${eq(c.h2.final)}` : '—');
      outN.set('ox', c.problem === 'both oxidations' ? `${eq(c.h1.final)}; ${eq(c.h2.final)}` : '—');
      outN.set('net', `none: these are ${c.problem}. One half-reaction must gain electrons and the other lose them.`);
      outN.set('ne', '—');
      text(ctx, `These are ${c.problem}.`, w / 2, 40, { size: 15, weight: 650, align: 'center' });
      text(ctx, 'One half-reaction must gain electrons and the other lose them.', w / 2, 64, { color: th.muted, size: 13, align: 'center' });
      let y = 100;
      if (step >= 1) for (const hr of [c.h1, c.h2]) y = fitLine(ctx, eq(hr.final), y, w, { size: 15, weight: 500 });
      return;
    }
    const redShown = step >= 2 ? `${eq(c.red.final, c.kRed)}  (×${c.kRed})` : eq(c.red.final);
    const oxShown = step >= 2 ? `${eq(c.ox.final, c.kOx)}  (×${c.kOx})` : eq(c.ox.final);
    outN.set('red', step >= 1 ? redShown : '—');
    outN.set('ox', step >= 1 ? oxShown : '—');
    const netText = `${sideText(c.net.reactants)} → ${sideText(c.net.products)}`;
    outN.set('net', step >= 3 ? netText : '—');
    outN.set('ne', step >= 2 ? `${c.net.electrons} e⁻ (${c.red.half.e} × ${c.kRed} gained = ${c.ox.half.e} × ${c.kOx} lost)` : '—');

    fitLine(ctx, NET_STEPS[step], 22, w, { color: th.muted, size: 13, weight: 650 });
    let y = 54;
    if (step === 0) {
      y = fitLine(ctx, skel(sk1), y, w, { size: 16, weight: 500 });
      fitLine(ctx, skel(sk2), y, w, { size: 16, weight: 500 });
      return;
    }
    if (step < 3) {
      text(ctx, 'reduction', w / 2, y, { color: th.seriesB, size: 12, weight: 650, align: 'center' });
      y = fitLine(ctx, step >= 2 ? eq(c.red.final, c.kRed) : eq(c.red.final), y + 20, w, { size: 16, weight: 500, color: th.seriesB });
      text(ctx, 'oxidation', w / 2, y, { color: th.seriesA, size: 12, weight: 650, align: 'center' });
      y = fitLine(ctx, step >= 2 ? eq(c.ox.final, c.kOx) : eq(c.ox.final), y + 20, w, { size: 16, weight: 500, color: th.seriesA });
      if (step >= 2) text(ctx, `${c.net.electrons} e⁻ gained = ${c.net.electrons} e⁻ lost`, w / 2, y + 4, { color: th.muted, size: 13, align: 'center' });
      return;
    }
    y = fitLine(ctx, netText, y, w, { color: th.product });
    drawTally(ctx, th, B.tally({ left: c.net.reactants, right: c.net.products, e: null }), y + 8, w);
  }

  function drawOn(ctx, th, w) {
    const r = B.reactions.find((x) => x.id === rx.value);
    const a = B.redoxAnalysis(r);
    const list = (xs) => xs.map((x) => `${species(x.species)}: ${Object.entries(x.on).map(([el, v]) => `${el} ${on(v)}`).join(', ')}`);
    outO.set('nums', [...list(a.L), ...list(a.R)].join('; '));
    const ch = (kind) => a.changes.filter((c) => c.kind === kind).map((c) => `${c.el}: ${on(c.from)} → ${on(c.to)} (in ${c.toSpecies.map(species).join(', ')})`).join('; ');
    outO.set('oxd', a.redox ? ch('oxidized') : 'nothing: no oxidation number changes, so this is not a redox reaction');
    outO.set('rdd', a.redox ? ch('reduced') : 'nothing');
    outO.set('oa', a.redox ? a.oa.map(species).join(', ') : '—');
    outO.set('ra', a.redox ? a.ra.map(species).join(', ') : '—');

    // Each species as a card with its oxidation numbers; changed elements coloured.
    const kindOf = (el, sp, left) => {
      const kinds = new Set(a.changes.filter((c) => c.el === el && (left ? c.fromSpecies : c.toSpecies).includes(sp)).map((c) => c.kind));
      if (kinds.size !== 1) return null;
      return [...kinds][0] === 'reduced' ? th.seriesB : th.seriesA;
    };
    const cards = [
      ...r.left.map(([n], i) => ({ n, x: a.L[i], left: true })),
      { arrow: true },
      ...r.right.map(([n], i) => ({ n, x: a.R[i], left: false })),
    ];
    const gap = 10;
    const size = w < 620 ? 13 : 15;
    ctx.font = font(size, 650);
    const width = (c) => (c.arrow ? 24 : Math.max(ctx.measureText(term([c.n, c.x.species])).width, 60) + 18);
    // Lay out in rows that fit the canvas.
    const rows = [[]];
    let used = 0;
    for (const c of cards) {
      const cw = width(c);
      if (used + cw > w - 24 && rows.at(-1).length) {
        rows.push([]);
        used = 0;
      }
      rows.at(-1).push(c);
      used += cw + gap;
    }
    let y = 30;
    for (const row of rows) {
      const total = row.reduce((t, c) => t + width(c) + gap, -gap);
      let x = (w - total) / 2;
      const hCard = 34 + 20 * Math.max(...row.filter((c) => !c.arrow).map((c) => Object.keys(c.x.on).length));
      for (const c of row) {
        const cw = width(c);
        if (c.arrow) {
          text(ctx, '→', x + cw / 2, y + 17, { size: 18, weight: 650, align: 'center' });
        } else {
          ctx.strokeStyle = th.grid;
          ctx.lineWidth = 1;
          roundRect(ctx, x, y, cw, hCard, 6);
          ctx.stroke();
          text(ctx, term([c.n, c.x.species]), x + cw / 2, y + 17, { size, weight: 650, align: 'center' });
          Object.entries(c.x.on).forEach(([el, v], i) => {
            const col = kindOf(el, c.x.species, c.left);
            text(ctx, `${el} ${on(v)}`, x + cw / 2, y + 42 + 20 * i, { size: size - 1, weight: col ? 700 : 500, align: 'center', color: col ?? th.muted });
          });
        }
        x += cw + gap;
      }
      y += hCard + 16;
    }
    y += 8;
    if (!a.redox) {
      text(ctx, 'No oxidation number changes: not a redox reaction.', w / 2, y, { size: 14, weight: 650, align: 'center' });
      return;
    }
    for (const c of a.changes) {
      const col = c.kind === 'reduced' ? th.seriesB : th.seriesA;
      const what = c.kind === 'reduced' ? 'reduced (gains e⁻)' : 'oxidized (loses e⁻)';
      text(ctx, `${c.el}: ${on(c.from)} → ${on(c.to)}   ${what}`, w / 2, y, { size: 14, weight: 650, align: 'center', color: col });
      y += 24;
    }
  }
}
