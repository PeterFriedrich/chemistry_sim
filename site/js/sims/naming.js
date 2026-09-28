import * as N from '../chem/naming.js';
import { fitCanvas, theme, clear, text, roundRect } from '../lib/canvas.js';
import { section, choice, readouts, el } from '../lib/controls.js';
import { createClock } from '../lib/clock.js';
import { superscript } from '../lib/format.js';

export const equations = [
  { html: 'ionic: total positive charge = total negative charge', what: 'metal (or ammonium) first, then the anion; lowest whole-number ratio' },
  { html: 'Roman numeral = the metal’s charge', what: 'only for metals the booklet gives more than one charge: iron(III), copper(II)' },
  { html: 'molecular: mono, di, tri, tetra, penta, hexa, hepta, octa, nona, deca', what: 'two nonmetals; mono is left off the first element' },
  { html: 'acids: aqueous hydrogen ___; -ide → hydro…ic, -ate → -ic, -ite → -ous', what: 'IUPAC name first, then the classical name' },
];

export const prompts = [
  'Name Fe₂O₃ and FeO. Why does iron need a Roman numeral when sodium does not?',
  'Write the formula for calcium phosphate before checking. Where do the brackets go, and why?',
  'Type HCl, then HCl(aq). What changes in the name, and why?',
  'Nitric acid and nitrous acid: which comes from nitrate and which from nitrite? Check both.',
  'Type NaCl2. Which charge rule does it break?',
  'CO and CoO look alike. Type both: which is molecular and which is ionic?',
];

export const legend = [
  { color: 'cation', label: 'cation (positive ion)' },
  { color: 'anion', label: 'anion (negative ion)' },
  { color: 'element', label: 'atom in a molecule or element' },
  { color: 'endo', label: 'water of hydration' },
];

const EXAMPLES = [
  'Fe2(SO4)3', 'iron(II) sulfate', 'Ca3(PO4)2', 'ammonium nitrate', 'CuSO4·5H2O', 'NaOH(aq)', 'MnO2', 'Na2O2',
  'N2O4', 'carbon monoxide', 'diphosphorus pentoxide', 'CCl4',
  'HCl(aq)', 'HCl', 'sulfuric acid', 'HNO2(aq)', 'CH3COOH(aq)', 'hydrosulfuric acid',
  'O2', 'phosphorus', 'NH3', 'glucose',
];

const KIND = {
  ionic: 'Ionic compound',
  molecular: 'Molecular compound',
  acid: 'Acid (in water)',
  element: 'Element',
  common: 'Common name',
};

// Plain chemistry text → display: SO4^2- → SO₄²⁻, H2O → H₂O, -6 → −6. The
// digit after "·" in a hydrate is a coefficient and stays full size.
const SUB = '₀₁₂₃₄₅₆₇₈₉';
function chem(str) {
  return str
    .replace(/\^(\d*)([+-])/g, (_, d, sign) => `${d ? superscript(d) : ''}${sign === '+' ? '⁺' : '⁻'}`)
    .replace(/([A-Za-z)])(\d+)/g, (_, c, d) => c + d.replace(/\d/g, (x) => SUB[x]))
    .replace(/(^|[\s(])-(?=\d)/g, '$1−');
}

export function mount(ui) {
  const box = section(ui.controls, 'Formula or name');
  const row = el('div', { class: 'ctl ctl-choice' }, box);
  el('label', { for: 'ctl-naming', text: 'Type either one' }, row);
  const input = el('input', { id: 'ctl-naming', type: 'text', value: EXAMPLES[0], autocomplete: 'off', spellcheck: 'false' }, row);
  el('div', { class: 'ctl-unit', text: 'Formulas: Fe2(SO4)3, CuSO4·5H2O, HCl(aq). Names: iron(III) sulfate, dinitrogen tetroxide, nitrous acid.' }, row);
  const ex = choice(box, { label: 'Or pick an example', options: EXAMPLES.map((x) => ({ value: x, label: /^[A-Z(]/.test(x) ? chem(x) : x })), value: EXAMPLES[0] });
  ex.onChange((v) => (input.value = v));

  const out = readouts(ui.readouts, [
    { id: 'kind', label: 'Type' },
    { id: 'formula', label: 'Formula' },
    { id: 'name', label: 'Name' },
    { id: 'alt', label: 'Classical name' },
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
      r = N.convert(input.value);
      out.set('kind', r.error ? '—' : KIND[r.kind]);
      out.set('formula', r.error ? '—' : chem(r.formula));
      out.set('name', r.error ? chem(r.error) : r.name);
      out.set('alt', r.alt ?? '—');
      steps.replaceChildren(...(r.error ? [] : r.steps.map((st) => el('li', { text: chem(st) }))));
    }
    const { ctx, w, h } = canvas;
    const th = theme();
    clear(ctx, w, h);
    if (r.error) {
      text(ctx, 'Not recognised', w / 2, h / 2 - 12, { color: th.danger, size: 15, align: 'center', weight: 650 });
      text(ctx, 'See the message under Name.', w / 2, h / 2 + 12, { color: th.muted, size: 13, align: 'center' });
      return;
    }

    const narrow = w < 560;
    text(ctx, KIND[r.kind], w / 2, 22, { color: th.muted, size: 13, align: 'center', weight: 650 });
    text(ctx, chem(r.formula), w / 2, 58, { color: th.ink, size: narrow ? 26 : 34, align: 'center', weight: 700 });
    text(ctx, r.name, w / 2, 92, { color: th.ink, size: narrow ? 14 : 17, align: 'center' });

    // one row per ion or atom: "3 × SO₄²⁻" and that many tiles
    const top = 120;
    const bottom = h - (r.parts.some((p) => p.charge) ? 44 : 16);
    const rowH = Math.min(70, (bottom - top) / r.parts.length);
    const labelW = narrow ? 88 : 130;
    const tile = Math.min(rowH - 12, narrow ? 38 : 52);
    r.parts.forEach((p, i) => {
      const y = top + rowH * (i + 0.5);
      const color = p.water ? th.endo : p.charge > 0 ? th.cation : p.charge < 0 ? th.anion : th.element;
      const label = p.water ? 'H2O' : p.label;
      text(ctx, chem(`${p.count} × ${label}`), 16 + labelW, y, { color: th.ink, size: narrow ? 13 : 15, align: 'right', weight: 650 });
      const room = Math.floor((w - labelW - 44) / (tile + 6));
      const shown = p.count <= room ? p.count : Math.max(1, room - 2); // leave space for "… n in all"
      for (let k = 0; k < shown; k++) {
        const x = labelW + 32 + k * (tile + 6);
        roundRect(ctx, x, y - tile / 2, tile, tile, 8);
        ctx.fillStyle = color;
        ctx.fill();
        const size = Math.max(9, tile * (label.length > 5 ? 0.24 : 0.32));
        text(ctx, chem(label), x + tile / 2, y, { color: th.surface, size, align: 'center', weight: 700 });
      }
      if (shown < p.count) text(ctx, `… ${p.count} in all`, labelW + 36 + shown * (tile + 6), y, { color: th.muted, size: 13 });
    });

    const charged = r.parts.filter((p) => p.charge);
    if (charged.length) {
      const sum = charged.map((p) => `${p.count} × (${p.charge > 0 ? '+' : '−'}${Math.abs(p.charge)})`).join(' + ');
      text(ctx, `charges: ${sum} = ${N.totalCharge(r.parts)}`, w / 2, h - 20, { color: th.muted, size: narrow ? 12 : 14, align: 'center' });
    }
  }
}
