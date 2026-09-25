import * as O from '../chem/organic.js';
import { fitCanvas, theme, clear, line, text } from '../lib/canvas.js';
import { section, slider, choice, readouts } from '../lib/controls.js';
import { createClock } from '../lib/clock.js';
import { species } from '../lib/format.js';

export const equations = [
  { html: '[locants-prefixes][parent stem][-locant-]an / en / yn[-locant-]e / ol', what: 'e.g. 3-methylpent-1-ene, 2-methylbutan-2-ol' },
  { html: 'Parent chain: contains the C–OH, then the multiple bond, then longest, then most branches', what: 'it need not be the chain drawn in a straight line' },
  { html: 'Number for the lowest locant to –OH, then the multiple bond, then the branches', what: 'ties go to the branch first in alphabetical order' },
  { html: 'meth, eth, prop, but, pent, hex, hept, oct, non, dec', what: 'stems for 1 to 10 carbons; branches end in -yl, halogens are fluoro, chloro, bromo, iodo' },
];

export const prompts = [
  'Name the default molecule by hand, then check. Why is the chain numbered from the right?',
  'Choose “Pentane with an ethyl on C2”. Why is the name not 2-ethylpentane? Find the longest chain in the diagram.',
  'Build but-2-ene, then move the double bond to C3. Why does the name become but-1-ene?',
  'Put an –OH on C2 of propane, then add a methyl on C2. Name both and give each molecular formula.',
  'Build 2-bromo-3-methylbutane. Both numbering directions give locants 2 and 3 — which rule decides?',
  'Try a triple bond at C2 with a methyl on C2. Why does the sim refuse it?',
];

export const legend = [
  { color: 'accent', label: 'parent chain, numbered' },
  { color: 'ink', label: 'branches and groups' },
];

const SUB_OPTIONS = [
  { value: 'none', label: 'none' },
  { value: 'methyl', label: 'methyl, –CH₃' },
  { value: 'ethyl', label: 'ethyl, –CH₂CH₃' },
  { value: 'propyl', label: 'propyl, –CH₂CH₂CH₃' },
  { value: 'F', label: 'fluoro, –F' },
  { value: 'Cl', label: 'chloro, –Cl' },
  { value: 'Br', label: 'bromo, –Br' },
  { value: 'I', label: 'iodo, –I' },
  { value: 'OH', label: 'hydroxyl, –OH' },
];
const EXAMPLES = [
  { id: 'custom', label: '— your own —' },
  { id: 'a', label: 'Butane with a methyl on C2', n: 4, subs: [['methyl', 2]] },
  { id: 'b', label: 'Pentane with an ethyl on C2', n: 5, subs: [['ethyl', 2]] },
  { id: 'c', label: 'Propane with two methyls on C2', n: 3, subs: [['methyl', 2], ['methyl', 2]] },
  { id: 'd', label: 'Four carbons, double bond at C2', n: 4, bond: [2, 2] },
  { id: 'e', label: 'Five carbons, triple bond at C2, methyl on C4', n: 5, bond: [3, 2], subs: [['methyl', 4]] },
  { id: 'f', label: 'Propane with –OH on C2', n: 3, subs: [['OH', 2]] },
  { id: 'g', label: 'Propane with –OH and a methyl on C2', n: 3, subs: [['OH', 2], ['methyl', 2]] },
  { id: 'h', label: 'Butane, Br on C3, methyl on C2', n: 4, subs: [['Br', 3], ['methyl', 2]] },
  { id: 'i', label: 'Methane with three Cl', n: 1, subs: [['Cl', 1], ['Cl', 1], ['Cl', 1]] },
];
const BOND_OPTIONS = [
  { value: 1, label: 'none (all single)' },
  { value: 2, label: 'double bond' },
  { value: 3, label: 'triple bond' },
];
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

// Picture coordinates (bond length 1) for every carbon and group.
function layout(mol, n) {
  const pos = [];
  const labels = [];
  const H = 0.5;
  for (let i = 0; i < n; i++) pos[i] = [i * 0.87, i % 2 ? H : 0];
  const groups = Array.from({ length: n }, () => []);
  mol.atoms.forEach((a, k) => a.main === null && a.depth === 1 && groups[a.attach].push({ slot: a.slot, alkyl: k }));
  mol.hetero.forEach((h) => groups[h.atom].push({ slot: h.slot, X: h.X }));
  const dirOf = new Map();
  for (let i = 0; i < n; i++) {
    const out = i % 2 ? 'down' : 'up';
    const inn = i % 2 ? 'up' : 'down';
    const cands = n === 1 ? ['right', 'left', 'up', 'down'] : i === 0 ? ['left', out, inn] : i === n - 1 ? ['right', out, inn] : [out, inn];
    groups[i].sort((a, b) => a.slot - b.slot).forEach((g, k) => {
      const d = DIRS[cands[k % cands.length]];
      if (g.X) labels.push({ at: i, X: g.X, p: [pos[i][0] + d[0] * 0.9, pos[i][1] + d[1] * 0.9] });
      else dirOf.set(g.slot, { from: i, d });
    });
  }
  // Branch carbons zigzag ±30° about the branch direction, like the main chain.
  const tip = new Map();
  mol.atoms.forEach((a, k) => {
    if (a.main !== null) return;
    const { from, d } = dirOf.get(a.slot);
    const prev = tip.get(a.slot) ?? pos[from];
    const t = (a.depth % 2 ? 1 : -1) * (Math.PI / 6);
    pos[k] = [prev[0] + d[0] * Math.cos(t) - d[1] * Math.sin(t), prev[1] + d[0] * Math.sin(t) + d[1] * Math.cos(t)];
    tip.set(a.slot, pos[k]);
  });
  return { pos, labels };
}

export function mount(ui) {
  const ex = section(ui.controls, 'Examples');
  const pickEx = choice(ex, { label: 'Start from', options: EXAMPLES.map((e) => ({ value: e.id, label: e.label })), value: 'a' });
  const main = section(ui.controls, 'Main chain');
  const n = slider(main, { label: 'Carbons in the chain', min: 1, max: 10, step: 1, value: 4 });
  const bondType = choice(main, { label: 'Multiple bond', options: BOND_OPTIONS, value: 1 });
  const bondPos = slider(main, { label: 'between C<sub>x</sub> and C<sub>x+1</sub>, x =', min: 1, max: 9, step: 1, value: 1 });
  const subBox = section(ui.controls, 'Substituents');
  const slots = [0, 1, 2, 3].map((k) => ({
    type: choice(subBox, { label: `Group ${k + 1}`, options: SUB_OPTIONS, value: 'none' }),
    pos: slider(subBox, { label: 'on carbon', min: 1, max: 10, step: 1, value: 2 }),
  }));

  const load = (id) => {
    const e = EXAMPLES.find((x) => x.id === id);
    if (!e.n) return;
    n.value = e.n;
    bondType.value = e.bond?.[0] ?? 1;
    bondPos.value = e.bond?.[1] ?? 1;
    slots.forEach((s, k) => {
      s.type.value = e.subs?.[k]?.[0] ?? 'none';
      s.pos.value = e.subs?.[k]?.[1] ?? 2;
    });
  };
  load('a');
  pickEx.onChange(load);
  [n, bondType, bondPos, ...slots.flatMap((s) => [s.type, s.pos])].forEach((c) => c.onChange(() => (pickEx.value = 'custom')));

  const out = readouts(ui.readouts, [
    { id: 'name', label: 'IUPAC name' },
    { id: 'parent', label: 'Parent chain' },
    { id: 'family', label: 'Family' },
    { id: 'mf', label: 'Molecular formula' },
    { id: 'cf', label: 'Condensed structural formula' },
  ]);

  const canvas = fitCanvas(ui.canvas);
  createClock(ui.transport, { frame: draw });
  ui.transport.hidden = true; // nothing moves

  function draw() {
    const { ctx, w, h } = canvas;
    const th = theme();
    const spec = {
      n: n.value,
      bond: { order: bondType.value, pos: bondPos.value },
      subs: slots.filter((s) => s.type.value !== 'none').map((s) => ({ type: s.type.value, pos: s.pos.value })),
    };
    clear(ctx, w, h);
    const mol = O.build(spec);
    const named = mol.error ? null : O.name(mol);
    const error = mol.error ?? named.error;
    const fitTitle = (str, color, weight) => {
      let size = w < 620 ? 18 : 24;
      ctx.font = `${weight} ${size}px ${th.font}`;
      while (size > 11 && ctx.measureText(str).width > w - 24) ctx.font = `${weight} ${--size}px ${th.font}`;
      text(ctx, str, w / 2, 28, { size, weight, color, align: 'center' });
    };
    if (error) {
      ['name', 'parent', 'family', 'mf', 'cf'].forEach((id) => out.set(id, '—'));
      out.set('name', `— ${error}`);
      fitTitle(error, th.danger, 600);
    } else {
      const chain = named.chain;
      const asDrawn = chain.p.length === spec.n && chain.p.every((a) => mol.atoms[a].main !== null);
      out.set('name', named.name);
      out.set('parent', `${chain.p.length} carbon${chain.p.length > 1 ? 's' : ''}${asDrawn ? ', the chain as drawn' : `, not the ${spec.n}-carbon chain drawn`}`);
      out.set('family', O.families(mol).join(', '));
      out.set('mf', species(O.formula(mol)));
      out.set('cf', species(O.condensed(mol, chain)));
      fitTitle(named.name, th.ink, 650);
    }
    if (mol.error) return;

    // --- skeletal diagram: vertices are carbons, hydrogens on carbon are implied ---
    if (mol.atoms.length === 1) {
      text(ctx, species(O.condensed(mol, named.chain)), w / 2, h / 2, { size: 30, weight: 600, align: 'center' });
      return;
    }
    const { pos, labels } = layout(mol, spec.n);
    const pts = [...pos, ...labels.map((l) => l.p)];
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const top = 64;
    const s = Math.min(90, (w - 80) / Math.max(1, x1 - x0), (h - top - 50) / Math.max(1, y1 - y0));
    const ox = w / 2 - ((x0 + x1) / 2) * s;
    const oy = top + (h - top - 20) / 2 - ((y0 + y1) / 2) * s;
    const P = (p) => [ox + p[0] * s, oy + p[1] * s];
    const onParent = new Set(named?.chain?.p ?? []);
    for (const b of mol.bonds) {
      const [ax, ay] = P(pos[b.a]);
      const [bx, by] = P(pos[b.b]);
      const color = onParent.has(b.a) && onParent.has(b.b) ? th.accent : th.ink;
      const width = color === th.accent ? 3.5 : 2.5;
      line(ctx, ax, ay, bx, by, { color, width });
      const len = Math.hypot(bx - ax, by - ay);
      const [nx, ny] = [(-(by - ay) / len) * 7, ((bx - ax) / len) * 7];
      const [tx, ty] = [((bx - ax) / len) * 7, ((by - ay) / len) * 7];
      const extra = b.order === 2 ? [1] : b.order === 3 ? [1, -1] : [];
      for (const side of extra) line(ctx, ax + nx * side + tx, ay + ny * side + ty, bx + nx * side - tx, by + ny * side - ty, { color, width: 2.5 });
    }
    for (const l of labels) {
      const [ax, ay] = P(pos[l.at]);
      const [lx, ly] = P(l.p);
      const t = Math.hypot(lx - ax, ly - ay);
      const back = Math.min(1, 14 / t);
      line(ctx, ax, ay, lx - (lx - ax) * back, ly - (ly - ay) * back, { color: th.ink, width: 2.5 });
      text(ctx, l.X, lx, ly, { size: 17, weight: 650, align: 'center' });
    }
    if (!named?.chain) return;
    // Each locant goes on the side of its carbon away from all its bonds.
    named.chain.p.forEach((a, k) => {
      const [x, y] = P(pos[a]);
      const ends = [
        ...mol.bonds.filter((b) => b.a === a || b.b === a).map((b) => pos[b.a === a ? b.b : b.a]),
        ...labels.filter((l) => l.at === a).map((l) => l.p),
      ];
      let [vx, vy] = ends.reduce(([sx, sy], p) => {
        const len = Math.hypot(p[0] - pos[a][0], p[1] - pos[a][1]);
        return [sx - (p[0] - pos[a][0]) / len, sy - (p[1] - pos[a][1]) / len];
      }, [0, 0]);
      const len = Math.hypot(vx, vy);
      [vx, vy] = len < 1e-6 ? [0, -1] : [vx / len, vy / len];
      text(ctx, String(k + 1), x + vx * 16, y + vy * 16, { size: 12, weight: 700, color: th.accent, align: 'center' });
    });
  }
}
