import * as F from '../chem/forces.js';
import { fitCanvas, theme, clear, text, line, roundRect } from '../lib/canvas.js';
import { section, choice, readouts, el } from '../lib/controls.js';
import { createClock } from '../lib/clock.js';

export const equations = [
  { html: 'London dispersion forces: between all molecules', what: 'stronger with more electrons (Σ Z)' },
  { html: 'dipole–dipole forces: between polar molecules', what: 'δ+ of one molecule attracts δ− of the next' },
  { html: 'hydrogen bonding: H bonded directly to N, O or F', what: 'the strongest of the three' },
  { html: 'stronger intermolecular forces → higher boiling point', what: 'a prediction: the booklet prints no boiling points' },
];

export const prompts = [
  'H₂O has 10 electrons and H₂S has 18. Predict which boils higher, then check the reason.',
  'HCl is polar and Cl₂ is not, yet Cl₂ is predicted to boil higher. Why?',
  'CH₄ and SiH₄ are both nonpolar. What is the only difference in their forces?',
  'CH₂O has hydrogen atoms and an oxygen atom. Why does it not hydrogen-bond?',
  'Compare HCl and F₂: same number of electrons. What decides?',
  'Try H₂O and I₂. Why does the sim call it a close call?',
];

export const legend = [
  { color: 'muted', label: 'London forces' },
  { color: 'anion', label: 'dipole–dipole' },
  { color: 'electron', label: 'hydrogen bond' },
  { color: 'accent', label: 'higher boiling point (predicted)' },
];

export const tallOnMobile = true;

const PAIRS = [
  ['H2O', 'H2S'], ['HF', 'HCl'], ['NH3', 'PH3'], ['CH4', 'NH3'], ['HCl', 'F2'], ['HCl', 'Cl2'],
  ['CH4', 'SiH4'], ['HCl', 'HBr'], ['Ne', 'Ar'], ['CO2', 'H2S'], ['CH3Cl', 'Cl2'], ['H2O', 'I2'],
];

const SUB = '₀₁₂₃₄₅₆₇₈₉';
const sub = (s) => s.replace(/([A-Za-z)])(\d+)/g, (_, c, d) => c + d.replace(/\d/g, (x) => SUB[x]));
const FORCE_NAME = { london: 'London', dipole: 'dipole–dipole', hbond: 'hydrogen bonding' };

export function mount(ui) {
  const box = section(ui.controls, 'Substances');
  const inputs = ['A', 'B'].map((k, i) => {
    const row = el('div', { class: 'ctl ctl-choice' }, box);
    el('label', { for: `ctl-sub-${k}`, text: `Substance ${k}` }, row);
    return el('input', { id: `ctl-sub-${k}`, type: 'text', value: PAIRS[0][i], autocomplete: 'off', spellcheck: 'false' }, row);
  });
  el('div', { class: 'ctl-unit', text: 'Molecules bonding can draw (H2O, CH3Cl, N2) or a noble gas (Ar)' }, box);
  const pick = choice(box, { label: 'Or pick a pair', options: PAIRS.map(([a, b]) => ({ value: `${a}|${b}`, label: `${sub(a)} vs ${sub(b)}` })), value: PAIRS[0].join('|') });
  pick.onChange((v) => v.split('|').forEach((x, i) => (inputs[i].value = x)));

  const out = readouts(ui.readouts, [
    { id: 'a', label: 'Substance A' },
    { id: 'b', label: 'Substance B' },
    { id: 'win', label: 'Higher boiling point' },
    { id: 'why', label: 'Reason' },
  ]);

  const canvas = fitCanvas(ui.canvas);
  createClock(ui.transport, { frame: draw });
  ui.transport.hidden = true; // nothing moves

  let key = null;
  let S = null;
  let cmp = null;
  function draw() {
    const k = inputs.map((x) => x.value).join('|');
    if (k !== key) {
      key = k;
      S = inputs.map((x) => F.forcesOf(x.value));
      cmp = S.every((s) => !s.error) ? F.compare(S[0], S[1]) : null;
      S.forEach((s, i) => out.set('ab'[i], s.error
        ? sub(s.error)
        : `${sub(s.formula)}: ${s.forces.map((f) => (f.id.startsWith('no') ? f.why : `${FORCE_NAME[f.id]} (${f.why})`)).join('; ')}`));
      out.set('win', cmp ? (cmp.winner === null ? 'cannot tell by this rule' : `${sub(S[cmp.winner].formula)} (predicted)${cmp.close ? ', a close call' : ''}`) : '—');
      out.set('why', cmp ? sub(cmp.reason) : '—');
    }
    const { ctx, w, h } = canvas;
    const th = theme();
    clear(ctx, w, h);
    const wide = w / h > 1.1;
    const maxE = Math.max(...S.map((s) => s.electrons ?? 0), 1);
    S.forEach((s, i) => {
      const R = wide ? { x: (i * w) / 2, y: 0, w: w / 2, h } : { x: 0, y: (i * h) / 2, w, h: h / 2 };
      panel(ctx, th, R, s, i, maxE);
    });
  }

  function panel(ctx, th, R, s, i, maxE) {
    const pad = 10;
    const won = cmp && cmp.winner === i;
    roundRect(ctx, R.x + pad, R.y + pad, R.w - 2 * pad, R.h - 2 * pad, 10);
    ctx.strokeStyle = won ? th.accent : th.grid;
    ctx.lineWidth = won ? 3 : 1;
    ctx.stroke();
    if (s.error) {
      text(ctx, `Substance ${'AB'[i]}: not recognised`, R.x + R.w / 2, R.y + R.h / 2, { color: th.danger, size: 14, align: 'center', weight: 650 });
      return;
    }
    text(ctx, sub(s.formula), R.x + R.w / 2, R.y + 34, { color: th.ink, size: 22, align: 'center', weight: 700 });

    // three molecules in a triangle, joined by the forces between them
    const cx = R.x + R.w / 2;
    const cy = R.y + R.h * 0.5 + (R.h < 320 ? 4 : 0);
    const short = R.h < 320;
    const rad = Math.min(R.w, R.h) * (short ? 0.2 : 0.22);
    const pts = [0, 1, 2].map((k) => {
      const a = -Math.PI / 2 + (k * 2 * Math.PI) / 3;
      return [cx + rad * Math.cos(a) * (short ? 1.9 : 1.25), cy + rad * Math.sin(a) + (short ? 0 : 10)];
    });
    const blobW = Math.max(40, sub(s.formula).length * (short ? 9 : 11) + (short ? 12 : 18));
    const blobH = short ? 24 : 30;
    for (const [p, q] of [[0, 1], [1, 2], [2, 0]]) {
      const [x0, y0] = pts[p];
      const [x1, y1] = pts[q];
      const len = Math.hypot(x1 - x0, y1 - y0);
      const [ux, uy] = [(x1 - x0) / len, (y1 - y0) / len];
      const [nx, ny] = [-uy, ux];
      const trim = blobW * 0.55;
      const [a0, a1] = [trim, len - trim];
      const lanes = [['london', th.muted, [2, 4], 1.5]];
      if (s.polar) lanes.push(['dipole', th.anion, [6, 4], 2]);
      if (s.hbond) lanes.push(['hbond', th.electron, [2, 3], 4]);
      lanes.forEach(([, color, dash, width], k) => {
        const o = (k - (lanes.length - 1) / 2) * 7;
        line(ctx, x0 + ux * a0 + nx * o, y0 + uy * a0 + ny * o, x0 + ux * a1 + nx * o, y0 + uy * a1 + ny * o, { color, width, dash });
      });
    }
    for (const [x, y] of pts) {
      roundRect(ctx, x - blobW / 2, y - blobH / 2, blobW, blobH, blobH / 2);
      ctx.fillStyle = th.surface;
      ctx.fill();
      ctx.strokeStyle = s.polar ? th.anion : th.muted;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      text(ctx, sub(s.formula), x, y, { color: th.ink, size: short ? 12 : 14, align: 'center', weight: 650 });
    }

    // electrons: the London-force measure, on one scale for both panels
    const barY = R.y + R.h - 36;
    const barW = (R.w - 80) * (s.electrons / maxE);
    text(ctx, `${s.electrons} electrons`, R.x + 30, barY - 12, { color: th.muted, size: 12 });
    if (won) text(ctx, `higher boiling point${cmp.close ? ' (close call)' : ''}`, R.x + R.w - 30, barY - 12, { color: th.accent, size: 13, align: 'right', weight: 700 });
    roundRect(ctx, R.x + 30, barY, Math.max(4, barW), 10, 5);
    ctx.fillStyle = th.muted;
    ctx.fill();
  }
}
