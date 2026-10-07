// Solubility of some common ionic compounds in water at 298.15 K: the
// Chemistry 30 Data Booklet p. 6, transcribed in docs/DATA_SHEET.md §1.13.
// Ions as naming.js writes them ("SO4^2-"); "Group 1 ions" are Li⁺ … Fr⁺.
// The booklet's own note: "only a guideline that is established using the
// Ksp values"; high means ≥ 0.1 mol/L (very soluble), low < 0.1 mol/L.
//
// Each column lists its ions, what most compounds do, and the exceptions,
// as [cation, anion] pairs or bare cations (any anion of the column).
export const GROUP_1 = ['Li^+', 'Na^+', 'K^+', 'Rb^+', 'Cs^+', 'Fr^+'];

export const solubilityTable = [
  {
    ions: [...GROUP_1, 'NH4^+', 'NO3^-', 'ClO3^-', 'ClO4^-', 'CH3COO^-'],
    most: 'high',
    except: [['Rb^+', 'ClO4^-'], ['Cs^+', 'ClO4^-'], ['Ag^+', 'CH3COO^-'], ['Hg2^2+', 'CH3COO^-']],
  },
  { ions: ['F^-'], most: 'high', except: ['Li^+', 'Mg^2+', 'Ca^2+', 'Sr^2+', 'Ba^2+', 'Fe^2+', 'Hg2^2+', 'Pb^2+'] },
  { ions: ['Cl^-', 'Br^-', 'I^-'], most: 'high', except: ['Cu^+', 'Ag^+', 'Hg2^2+', 'Pb^2+', 'Tl^+'] },
  { ions: ['SO4^2-'], most: 'high', except: ['Ca^2+', 'Sr^2+', 'Ba^2+', 'Ag^+', 'Hg2^2+', 'Pb^2+', 'Ra^2+'] },
  { ions: ['CO3^2-', 'PO4^3-', 'SO3^2-'], most: 'low', except: [...GROUP_1, 'NH4^+'] },
  { ions: ['IO3^-', 'OOCCOO^2-'], most: 'low', except: [...GROUP_1, 'NH4^+', ['Co^2+', 'IO3^-'], ['Fe^3+', 'OOCCOO^2-']] },
  { ions: ['OH^-'], most: 'low', except: [...GROUP_1, 'NH4^+'] },
];
