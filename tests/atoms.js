// Test-only formula arithmetic: atom counts for C2H5OH(l), Ca(OH)2(s) or
// SO4^2-(aq), and the charge after the caret. No readout needs either.
export function atoms(formula) {
  const body = formula.replace(/\((s|l|g|aq)\)$/, '').replace(/\^.*$/, '');
  const stack = [{}];
  const re = /([A-Z][a-z]?|\(|\))(\d*)/g;
  let m;
  while ((m = re.exec(body))) {
    const [, tok, num] = m;
    const k = num ? Number(num) : 1;
    if (tok === '(') stack.push({});
    else if (tok === ')') {
      const inner = stack.pop();
      for (const [el, c] of Object.entries(inner)) stack.at(-1)[el] = (stack.at(-1)[el] ?? 0) + c * k;
    } else stack.at(-1)[tok] = (stack.at(-1)[tok] ?? 0) + k;
  }
  return stack[0];
}

export function charge(species) {
  const m = /\^(\d*)([+-])/.exec(species);
  return m ? (m[2] === '-' ? -1 : 1) * (m[1] ? Number(m[1]) : 1) : 0;
}

// Totals over one side of an equation, [[n, species], ...].
export function count(side) {
  const tot = {};
  for (const [n, s] of side) for (const [el, c] of Object.entries(atoms(s))) tot[el] = (tot[el] ?? 0) + n * c;
  return tot;
}

export const netCharge = (side) => side.reduce((q, [n, s]) => q + n * charge(s), 0);
