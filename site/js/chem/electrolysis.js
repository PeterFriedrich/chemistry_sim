// Electrolytic cells from the booklet's redox table, and Faraday stoichiometry.
//   SOA (highest E° among the oxidizing agents present) is reduced at the cathode;
//   SRA (lowest E° among the reducing agents present) is oxidized at the anode.
//   E°cell = E°cathode − E°anode < 0; minimum applied voltage = −E°cell.
//   Q = It,  n(e⁻) = Q/F,  n(product) = n(e⁻) × coefficient / electrons,  m = nM.
// Units: I in A, t in s, Q in C, n in mol, m in g, E in V. Sign convention as in
// redox.js: E°cell < 0 is non-spontaneous, so an external supply must drive it.
// Water is always present and can be both an oxidizing and a reducing agent.
import { halfReactions } from './redox-data.js';
import { elements } from './elements-data.js';
import { F } from './constants.js';
import { cellPotential } from './redox.js';

// Aqueous electrolytes whose table prediction matches the lab. Chlorides are
// left out: the table predicts O₂ at the anode but Cl₂ forms (overvoltage).
// `metal` is the solid for "electrodes of the solution's metal", if a bench one.
export const electrolytes = [
  { id: 'CuSO4', ions: ['Cu^2+(aq)', 'SO4^2-(aq)'], metal: 'Cu(s)' },
  { id: 'AgNO3', ions: ['Ag^+(aq)', 'NO3^-(aq)'], metal: 'Ag(s)' },
  { id: 'NiSO4', ions: ['Ni^2+(aq)', 'SO4^2-(aq)'], metal: 'Ni(s)' },
  { id: 'ZnSO4', ions: ['Zn^2+(aq)', 'SO4^2-(aq)'], metal: 'Zn(s)' },
  { id: 'Pb(NO3)2', ions: ['Pb^2+(aq)', 'NO3^-(aq)'], metal: 'Pb(s)' },
  { id: 'KI', ions: ['K^+(aq)', 'I^-(aq)'], metal: null },
  { id: 'Na2SO4', ions: ['Na^+(aq)', 'SO4^2-(aq)'], metal: null },
];

export function speciesPresent(electrolyte, metalElectrodes) {
  const list = [...electrolyte.ions, 'H2O(l)'];
  if (metalElectrodes && electrolyte.metal) list.push(electrolyte.metal);
  return list;
}

// Every half-reaction that can run with what is present: as a reduction when all
// its left-side species are there (oxidizing agents, strongest first), as an
// oxidation when all its right-side species are (reducing agents, strongest first).
export function candidates(present) {
  const has = (side) => side.every(([, s]) => present.includes(s));
  return {
    oxidizing: halfReactions.filter((h) => has(h.ox)).sort((a, b) => b.E - a.E),
    reducing: halfReactions.filter((h) => has(h.red)).sort((a, b) => a.E - b.E),
  };
}

export function predict(present) {
  const { oxidizing, reducing } = candidates(present);
  const cathode = oxidizing[0];
  const anode = reducing[0];
  const E = cellPotential(cathode.E, anode.E);
  return { cathode, anode, E, minVoltage: Math.max(0, -E) };
}

export function charge(I, t) {
  return I * t;
}

export function electronMoles(Q) {
  return Q / F;
}

// Molar mass of a formula such as CuSO4(s), Ca(OH)2(s) or SO4^2-(aq) from the
// booklet's atomic molar masses (an ion's electrons are not counted).
export function molarMass(species) {
  const body = species.replace(/\((s|l|g|aq)\)$/, '').replace(/\^.*$/, '');
  const stack = [0];
  const re = /([A-Z][a-z]?|\(|\))(\d*)/g;
  let m;
  while ((m = re.exec(body))) {
    const [, tok, num] = m;
    const k = num ? Number(num) : 1;
    if (tok === '(') stack.push(0);
    else if (tok === ')') {
      const inner = stack.pop();
      stack[stack.length - 1] += inner * k;
    } else {
      if (!elements[tok]) throw new Error(`Unknown element ${tok}`);
      stack[stack.length - 1] += elements[tok].M * k;
    }
  }
  return stack[0];
}

// Amounts formed (products) or used up (reactants) at one electrode by n(e⁻)
// electrons, skipping water. `reduction` true reads the half-reaction left to
// right. Solids get a mass; gases and ions only an amount (the booklet prints
// no molar volume).
export function electrodeAmounts(half, ne, reduction) {
  const formed = reduction ? half.red : half.ox;
  const used = reduction ? half.ox : half.red;
  const rows = (side, sign) =>
    side
      .filter(([, s]) => s !== 'H2O(l)')
      .map(([coef, s]) => {
        const n = (ne * coef) / half.e;
        return { species: s, n, sign, m: s.endsWith('(s)') ? n * molarMass(s) : null };
      });
  return [...rows(formed, +1), ...rows(used, -1)];
}
