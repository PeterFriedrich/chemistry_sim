// Colours of common aqueous ions: the Chemistry 30 Data Booklet p. 11,
// transcribed in docs/DATA_SHEET.md §1.11. The booklet prints names only; the
// formulas are added as keys. `strong` is the colour at 1.0 mol/L, `dilute` at 0.010 mol/L.
export const ionColours = {
  'CrO4^2-(aq)': { name: 'chromate', strong: 'yellow', dilute: 'pale yellow' },
  'Cr^3+(aq)': { name: 'chromium(III)', strong: 'blue-green', dilute: 'green' },
  'Cr^2+(aq)': { name: 'chromium(II)', strong: 'dark blue', dilute: 'pale blue' },
  'Co^2+(aq)': { name: 'cobalt(II)', strong: 'red', dilute: 'pink' },
  'Cu^+(aq)': { name: 'copper(I)', strong: 'blue-green', dilute: 'pale blue-green' },
  'Cu^2+(aq)': { name: 'copper(II)', strong: 'blue', dilute: 'pale blue' },
  'Cr2O7^2-(aq)': { name: 'dichromate', strong: 'orange', dilute: 'pale orange' },
  'Fe^2+(aq)': { name: 'iron(II)', strong: 'lime green', dilute: 'colourless' },
  'Fe^3+(aq)': { name: 'iron(III)', strong: 'orange-yellow', dilute: 'pale yellow' },
  'Mn^2+(aq)': { name: 'manganese(II)', strong: 'pale pink', dilute: 'colourless' },
  'Ni^2+(aq)': { name: 'nickel(II)', strong: 'blue-green', dilute: 'pale blue-green' },
  'MnO4^-(aq)': { name: 'permanganate', strong: 'deep purple', dilute: 'purple-pink' },
};
