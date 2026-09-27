// Potential-energy diagram for a reaction as written. Energies in kJ; ΔH from
// the booklet's ΔfH° (hess.js), ΔH < 0 exothermic. Activation energies are the
// student's input: the booklet prints none.
//   Ea(reverse) = Ea(forward) − ΔH
// A catalyst lowers the peak, so both activation energies drop by the same
// amount and ΔH is unchanged.

export function barrier(dH, EaF) {
  return { EaF, EaR: EaF - dH };
}

// Why an activation energy cannot be drawn, or null if it can: the activated
// complex must sit above both the reactants and the products.
export function problem(dH, EaF) {
  if (!(EaF > 0)) return 'Ea(forward) must be greater than 0';
  if (!(EaF - dH > 0)) return 'Ea(forward) must be greater than ΔH, so the peak is above the products';
  return null;
}

// Why a catalysed Ea cannot be used with the uncatalysed one, or null.
export function catalystProblem(dH, EaF, EaCat) {
  return problem(dH, EaCat) ?? (EaCat < EaF ? null : 'a catalyst lowers Ea: the catalysed Ea must be smaller');
}
