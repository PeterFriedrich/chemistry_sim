import * as B from '../chem/balancing.js';
import { fitCanvas, theme, clear, line, text, font, roundRect } from '../lib/canvas.js';
import { section, choice, buttons, readouts, el } from '../lib/controls.js';
import { elements } from '../chem/elements-data.js';
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
  'Balance MnO₄⁻ + Fe²⁺ → Mn²⁺ + Fe³⁺ using oxidation numbers. How many electrons does each Mn gain, and each Fe lose? Why does Fe²⁺ get a 5?',
  'Balance Cr₂O₇²⁻ + C₂H₅OH using oxidation numbers. Why is the change for Cr multiplied by 2 before you compare electrons?',
  'Assign oxidation numbers in H₂SO₄, NO₃⁻ and CO₃²⁻ by hand, then step through each. Which rule sets S, N and C?',
  'Type S8, then Fe3+. Why is every atom in an element 0, but Fe in Fe³⁺ is +3?',
  'Compare H₂O, H₂O₂ and NaH. Why is O −1 in one and H −1 in another?',
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
const ON_STEPS = {
  skeleton: 'Skeleton equation',
  atoms: '1. Balance the atoms whose oxidation number changes',
  electrons: '2. Electrons = change in oxidation number × atoms',
  multiply: '3. Multiply so electrons lost = electrons gained',
  oxygen: '4. Balance O by adding H₂O',
  hydrogen: '5. Balance H by adding H⁺',
  check: '6. Check: the charge now balances by itself',
  hydroxide: '7. Basic: add OH⁻ to both sides, one per H⁺',
  water: '8. Basic: H⁺ + OH⁻ → H₂O, then cancel water',
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
const frac = ({ num, den }) => (den === 1 ? on(num) : `${num > 0 ? '+' : '−'}${Math.abs(num)}/${den}`);
const stepOn = (st) => (st.sum ? frac(st.sum) : on(st.value));
// "2(+1) + x + 4(−2) = 0" in formula order, x for the element the sum sets.
const sumText = (st, order) => {
  const terms = order.map((el) => {
    if (el === st.el) return st.sum.count === 1 ? 'x' : `${st.sum.count}x`;
    const [n, , v] = st.sum.known.find(([, e]) => e === el);
    return `${n === 1 ? '' : n}(${on(v)})`;
  });
  return `${terms.join(' + ')} = ${on(st.sum.charge)}`;
};
const EXAMPLES = ['H2O', 'NO3^-', 'H2SO4', 'S8', 'CO3^2-', 'K2Cr2O7', 'MnO4^-', 'NH4^+', 'H2O2', 'NaH', 'OF2', 'C2H5OH', 'Fe3O4', 'Fe^3+'];
const check = (t) =>
  [...t.rows.map((r) => `${r.el} ${r.left}${r.left === r.right ? ' = ' : ' ≠ '}${r.right}`), `charge ${on(t.charge.left)}${t.charge.left === t.charge.right ? ' = ' : ' ≠ '}${on(t.charge.right)}`].join(', ');

export function mount(ui) {
  const qbox = section(ui.controls, 'Question');
  const mode = choice(qbox, {
    label: 'Question type',
    options: [
      { value: 'assign', label: 'Assign oxidation numbers in one species' },
      { value: 'half', label: 'Balance a half-reaction' },
      { value: 'net', label: 'Net ionic equation from two half-reactions' },
      { value: 'onbal', label: 'Balance using oxidation numbers' },
      { value: 'on', label: 'Oxidation numbers: what is oxidized and reduced?' },
    ],
    value: 'assign',
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
  const abox = section(ui.controls, 'Species');
  const frow = el('div', { class: 'ctl ctl-choice' }, abox);
  el('label', { for: 'ctl-formula', text: 'Formula' }, frow);
  const formula = el('input', { id: 'ctl-formula', type: 'text', value: 'H2SO4', autocomplete: 'off', spellcheck: 'false' }, frow);
  el('div', { class: 'ctl-unit', text: 'Charges: NO3^-, CO3^2-, [CO3]2- or CO3 2-' }, frow);
  const ex = choice(abox, { label: 'Or pick an example', options: EXAMPLES.map((x) => ({ value: x, label: species(x) })), value: 'H2SO4' });
  ex.onChange((v) => {
    formula.value = v;
    step = 0;
  });
  formula.addEventListener('input', () => (step = 0));
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
  const outB = readouts(ui.readouts, [
    { id: 'step', label: 'Step' },
    { id: 'eq', label: 'Equation' },
    { id: 'chg', label: 'Oxidation number changes' },
    { id: 'e', label: 'Electrons lost = gained' },
    { id: 'chk', label: 'Check (left vs right)' },
  ]);
  const dlB = ui.readouts.lastElementChild;
  const outO = readouts(ui.readouts, [
    { id: 'nums', label: 'Oxidation numbers' },
    { id: 'oxd', label: 'Oxidized' },
    { id: 'rdd', label: 'Reduced' },
    { id: 'oa', label: 'Oxidizing agent (OA)' },
    { id: 'ra', label: 'Reducing agent (RA)' },
  ]);
  const dlO = ui.readouts.lastElementChild;
  const outA = readouts(ui.readouts, [
    { id: 'read', label: 'Read as' },
    { id: 'step', label: 'Latest step' },
    { id: 'nums', label: 'Oxidation numbers' },
    { id: 'chk', label: 'Check: Σ = charge' },
  ]);
  const dlA = ui.readouts.lastElementChild;
  // The full rule list; the rows used so far are ticked, the latest marked.
  const rulesTable = el('table', { class: 'data-table', style: 'margin-top: 12px' }, ui.readouts);
  el('thead', { html: '<tr><th colspan="2" style="text-align: left">Oxidation number rules</th></tr>' }, rulesTable);
  const rbody = el('tbody', {}, rulesTable);
  const ruleRows = new Map(B.RULES.map((r, i) => {
    const tr = el('tr', { class: 'after' }, rbody);
    const mark = el('td', { style: 'width: 1.6em; font-family: inherit' }, tr);
    const td = el('td', { style: 'text-align: left; font-weight: 400; font-family: inherit' }, tr);
    el('div', { text: `${i + 1}. ${r.text}` }, td);
    el('div', { text: `e.g. ${r.eg}`, style: 'color: var(--c-muted); font-size: 12px' }, td);
    return [r.id, { tr, mark, td }];
  }));

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
    shown(nbox, m === 'net' || m === 'onbal');
    shown(dlN, m === 'net');
    shown(dlB, m === 'onbal');
    [obox, dlO].forEach((n) => shown(n, m === 'on'));
    [abox, dlA, rulesTable].forEach((n) => shown(n, m === 'assign'));
    shown(sbox, m !== 'on');
    shown(qbox.querySelectorAll('.ctl-choice')[1], m === 'half' || m === 'net' || m === 'onbal');
    clear(ctx, w, h);
    if (m === 'half') drawHalf(ctx, th, w);
    else if (m === 'net') drawNet(ctx, th, w);
    else if (m === 'onbal') drawOnBalance(ctx, th, w);
    else if (m === 'assign') drawAssign(ctx, th, w);
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

  function drawOnBalance(ctx, th, w) {
    const sk1 = B.skeletons.find((s) => s.id === n1.value);
    const sk2 = B.skeletons.find((s) => s.id === n2.value);
    const r = B.balanceByOxidationNumbers(sk1, sk2, medium.value);
    if (r.problem) {
      const why = r.problem === 'no change' ? 'One of these has no change in oxidation number.' : `Both are ${r.problem.replace('both ', '')}: ${r.halves.map((h) => `${h.key} ${on(h.from)} → ${on(h.to)}`).join(', ')}.`;
      for (const id of ['step', 'eq', 'e', 'chk']) outB.set(id, '—');
      outB.set('chg', `${why} One element must be oxidized and another reduced.`);
      text(ctx, why, w / 2, 40, { size: 15, weight: 650, align: 'center' });
      text(ctx, 'One element must be oxidized and another reduced.', w / 2, 64, { color: th.muted, size: 13, align: 'center' });
      return;
    }
    step = Math.min(step, r.steps.length - 1);
    const st = r.steps[step];
    const at = (id) => r.steps.findIndex((x) => x.id === id);
    const change = (h) => {
      const what = h.kind === 'reduced' ? 'gains' : 'loses';
      return `${h.key}: ${on(h.from)} → ${on(h.to)}, ${what} ${Math.abs(h.to - h.from)} e⁻ per ${h.key} × ${h.atoms} ${h.key} = ${h.e} e⁻`;
    };
    const t = B.tally(st);
    outB.set('step', ON_STEPS[st.id]);
    outB.set('eq', eq(st));
    outB.set('chg', step >= at('electrons') ? `${change(r.red)} (reduced); ${change(r.ox)} (oxidized)` : '—');
    outB.set('e', step >= at('multiply') ? `${r.red.e} × ${r.kRed} = ${r.ox.e} × ${r.kOx} = ${r.electrons} e⁻` : '—');
    outB.set('chk', step >= at('oxygen') ? check(t) : '—');

    fitLine(ctx, ON_STEPS[st.id], 22, w, { color: th.muted, size: 13, weight: 650 });
    let y = fitLine(ctx, eq(st), 54, w, { color: t.balanced ? th.product : th.ink });
    if (step >= at('electrons')) {
      y = fitLine(ctx, change(r.red), y, w, { size: 14, weight: 600, color: th.seriesB });
      y = fitLine(ctx, change(r.ox), y, w, { size: 14, weight: 600, color: th.seriesA });
    }
    if (step >= at('multiply')) y = fitLine(ctx, `×${r.kRed} and ×${r.kOx}: ${r.electrons} e⁻ gained = ${r.electrons} e⁻ lost`, y, w, { size: 13, weight: 500, color: th.muted });
    if (step >= at('oxygen')) drawTally(ctx, th, t, y + 6, w);
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

  function drawAssign(ctx, th, w) {
    const parsed = B.parseSpecies(formula.value, elements);
    if (parsed.error) {
      for (const id of ['step', 'nums', 'chk']) outA.set(id, '—');
      outA.set('read', parsed.error);
      text(ctx, parsed.error, w / 2, 60, { color: th.danger, size: 14, weight: 600, align: 'center' });
      return;
    }
    const sp = parsed.species;
    const r = B.assignSteps(sp);
    const order = Object.keys(B.atomsOf(sp));
    // What "Next step" reveals: each rule, then each line of algebra for the last element.
    const last = r.steps.at(-1);
    const ruleSteps = r.problem ? r.steps : r.steps.slice(0, -1);
    const alg = r.problem ? [] : B.algebra(last, order);
    const items = [...ruleSteps.map((st) => ({ st })), ...(r.problem ? [{ problem: true }] : alg.map((l) => ({ l })))];
    step = Math.min(step, items.length);
    const shownItems = items.slice(0, step);
    const done = !r.problem && step === items.length;
    const known = new Map(shownItems.filter((it) => it.st).map((it) => [it.st.el, stepOn(it.st)]));
    if (done) known.set(last.el, stepOn(last));
    const finalOn = new Map(r.steps.map((st) => [st.el, stepOn(st)])); // slot widths stay put as steps reveal
    const ruleText = (st) => `${st.el} ${stepOn(st)}: ${st.rule}`;
    const latest = shownItems.at(-1);
    const used = new Set(shownItems.filter((it) => it.st).flatMap((it) => [it.st.id, it.st.also]));
    if (shownItems.some((it) => it.l)) used.add(last.id).add(last.also);
    const now = latest?.st ? [latest.st.id, latest.st.also] : latest?.l ? [last.id, last.also] : [];
    for (const [id, row] of ruleRows) {
      const mark = now.includes(id) ? '▶' : used.has(id) ? '✓' : '';
      if (row.mark.textContent !== mark) row.mark.textContent = mark;
      const weight = now.includes(id) ? '650' : '400';
      if (row.td.style.fontWeight !== weight) row.td.style.fontWeight = weight;
      row.mark.style.color = now.includes(id) ? 'var(--c-accent)' : 'var(--c-product)';
    }
    outA.set('read', species(sp));
    outA.set('step', !latest ? 'Press “Next step” to apply the first rule.' : latest.st ? ruleText(latest.st) : latest.problem ? 'No rule fixes the rest: split the compound into its ions' : `${latest.l.eq}   (${latest.l.why})`);
    outA.set('nums', done ? order.map((el) => `${el} ${known.get(el)}`).join(', ') : '—');
    outA.set('chk', done && last.sum.known.length ? `${sumText(last, order).replace(/(\d*)x/, (_, n) => `${n}(${frac(last.sum)})`)} ✓` : '—');

    // The formula, with each element's oxidation number above it once found.
    const size = w < 620 ? 34 : 44;
    const tokens = [];
    const body = sp.replace(/\^.*$/, '');
    const re = /([A-Z][a-z]?)(\d*)|(\()|(\))(\d*)/g;
    let mt;
    while ((mt = re.exec(body))) {
      if (mt[1]) tokens.push({ el: mt[1], str: mt[1] }, ...(mt[2] ? [{ str: species(mt[2]), sub: true }] : []));
      else if (mt[3]) tokens.push({ str: '(' });
      else tokens.push({ str: ')' }, ...(mt[5] ? [{ str: species(mt[5]), sub: true }] : []));
    }
    const chargeStr = species(sp).slice(species(body).length);
    if (chargeStr) tokens.push({ str: chargeStr, sub: true });
    // An element's slot is wide enough for its oxidation number too, so labels never touch.
    const widthOf = (t) => {
      ctx.font = font(t.sub ? size * 0.9 : size, 650);
      const tw = ctx.measureText(t.str).width;
      if (!t.el) return tw;
      ctx.font = font(size * 0.5, 700);
      return Math.max(tw, ctx.measureText(finalOn.get(t.el) ?? '?').width + 10);
    };
    const totalW = tokens.reduce((a, t) => a + widthOf(t), 0);
    let x = (w - totalW) / 2;
    const y = 110;
    for (const t of tokens) {
      const tw = widthOf(t);
      text(ctx, t.str, x + tw / 2, y, { size: t.sub ? size * 0.9 : size, weight: 650, align: 'center' });
      if (t.el) {
        const v = known.get(t.el);
        text(ctx, v ?? '?', x + tw / 2, y - size * 0.95, { size: size * 0.5, weight: 700, align: 'center', color: v ? th.accent : th.muted });
      }
      x += tw;
    }
    let yy = y + size + 16;
    text(ctx, 'Rules applied in order: F, Group 1, Group 2, H, O, Cl/Br/I; the last element from the sum', w / 2, yy, { color: th.muted, size: w < 620 ? 10 : 12, align: 'center' });
    yy += 34;
    const narrow = w < 620;
    shownItems.filter((it) => it.st).forEach((it, i) => {
      yy = fitLine(ctx, `${i + 1}. ${ruleText(it.st)}`, yy, w, { size: narrow ? 14 : 15, weight: 500 });
    });
    // The algebra, lined up on its "=" signs, with the reason beside (or under) each line.
    const algShown = shownItems.filter((it) => it.l).map((it) => it.l);
    if (algShown.length) {
      const size = narrow ? 15 : 17;
      ctx.font = font(size, 600);
      const parts = algShown.map((l) => (l.eq.startsWith('let') ? [l.eq, null] : l.eq.split(' = ')));
      const lw = Math.max(...parts.map(([L, R]) => (R === null ? 0 : ctx.measureText(`${L} `).width)));
      const rw = Math.max(...parts.map(([L, R]) => (R === null ? 0 : ctx.measureText(`= ${R}`).width)));
      ctx.font = font(12, 500);
      const ww = Math.max(...algShown.map((l) => ctx.measureText(l.why).width));
      const beside = lw + rw + 24 + ww < w - 24;
      const x0 = (w - (beside ? lw + rw + 24 + ww : lw + rw)) / 2;
      yy += 4;
      algShown.forEach((l, i) => {
        const [L, R] = parts[i];
        const col = i === algShown.length - 1 && done ? th.accent : th.ink;
        if (R === null) text(ctx, L, x0, yy, { size: size - 3, weight: 500, color: th.muted });
        else {
          text(ctx, `${L} `, x0 + lw, yy, { size, weight: 600, align: 'right', color: col });
          text(ctx, `= ${R}`, x0 + lw, yy, { size, weight: 600, color: col });
          if (beside) text(ctx, l.why, x0 + lw + rw + 24, yy, { size: 12, color: th.muted });
          else text(ctx, l.why, w / 2, yy + size - 2, { size: 11, color: th.muted, align: 'center' });
        }
        yy += R === null || beside ? size + 12 : size + 22;
      });
      if (done && last.sum.den !== 1) yy = fitLine(ctx, `an average over the ${last.sum.count} ${last.el} atoms`, yy, w, { size: 12, weight: 500, color: th.muted });
      if (done && last.el === 'H' && last.value === -1) yy = fitLine(ctx, 'H is −1 here: a metal hydride', yy, w, { size: 12, weight: 500, color: th.muted });
      if (done && last.el === 'O' && last.value === -1) yy = fitLine(ctx, 'O is −1 here: a peroxide', yy, w, { size: 12, weight: 500, color: th.muted });
    }
    if (r.problem && step === items.length) {
      const say = [`No rule fixes ${r.problem.join(' and ')}.`, 'Split the compound into its ions,', 'then enter each ion on its own:', 'for example CuSO₄ is Cu²⁺ and SO₄²⁻.'];
      say.forEach((str, i) => text(ctx, str, w / 2, yy + 22 * i, { size: 14, weight: 600, color: th.danger, align: 'center' }));
    }
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
