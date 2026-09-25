// Acid–base indicators at 298.15 K: the Chemistry 30 Data Booklet p. 10,
// transcribed in docs/DATA_SHEET.md §1.10. Each colour change is one range
// (cresol red and thymol blue have two), in order of increasing pH; `from` is the
// colour below the range, `to` above it. `approx` marks a Ka printed with "~".
export const indicators = [
  { name: 'methyl violet', ranges: [{ acid: 'HMv(aq)', base: 'Mv^-(aq)', lo: 0.0, hi: 1.6, from: 'yellow', to: 'blue', Ka: 2e-1, approx: true }] },
  {
    name: 'cresol red',
    ranges: [
      { acid: 'H2Cr(aq)', base: 'HCr^-(aq)', lo: 0.0, hi: 1.0, from: 'red', to: 'yellow', Ka: 3e-1, approx: true },
      { acid: 'HCr^-(aq)', base: 'Cr^2-(aq)', lo: 7.0, hi: 8.8, from: 'yellow', to: 'red', Ka: 3.5e-9 },
    ],
  },
  {
    name: 'thymol blue',
    ranges: [
      { acid: 'H2Tb(aq)', base: 'HTb^-(aq)', lo: 1.2, hi: 2.8, from: 'red', to: 'yellow', Ka: 2.2e-2 },
      { acid: 'HTb^-(aq)', base: 'Tb^2-(aq)', lo: 8.0, hi: 9.6, from: 'yellow', to: 'blue', Ka: 6.3e-10 },
    ],
  },
  { name: 'orange IV', ranges: [{ acid: 'HOr(aq)', base: 'Or^-(aq)', lo: 1.4, hi: 2.8, from: 'red', to: 'yellow', Ka: 1e-2, approx: true }] },
  { name: 'methyl orange', ranges: [{ acid: 'HMo(aq)', base: 'Mo^-(aq)', lo: 3.2, hi: 4.4, from: 'red', to: 'yellow', Ka: 3.5e-4 }] },
  { name: 'bromocresol green', ranges: [{ acid: 'HBg(aq)', base: 'Bg^-(aq)', lo: 3.8, hi: 5.4, from: 'yellow', to: 'blue', Ka: 1.3e-5 }] },
  { name: 'methyl red', ranges: [{ acid: 'HMr(aq)', base: 'Mr^-(aq)', lo: 4.8, hi: 6.0, from: 'red', to: 'yellow', Ka: 1.0e-5 }] },
  { name: 'chlorophenol red', ranges: [{ acid: 'HCh(aq)', base: 'Ch^-(aq)', lo: 5.2, hi: 6.8, from: 'yellow', to: 'red', Ka: 5.6e-7 }] },
  { name: 'bromothymol blue', ranges: [{ acid: 'HBb(aq)', base: 'Bb^-(aq)', lo: 6.0, hi: 7.6, from: 'yellow', to: 'blue', Ka: 5.0e-8 }] },
  { name: 'phenol red', ranges: [{ acid: 'HPr(aq)', base: 'Pr^-(aq)', lo: 6.6, hi: 8.0, from: 'yellow', to: 'red', Ka: 1.0e-8 }] },
  { name: 'phenolphthalein', ranges: [{ acid: 'HPh(aq)', base: 'Ph^-(aq)', lo: 8.2, hi: 10.0, from: 'colourless', to: 'pink', Ka: 3.2e-10 }] },
  { name: 'thymolphthalein', ranges: [{ acid: 'HTh(aq)', base: 'Th^-(aq)', lo: 9.4, hi: 10.6, from: 'colourless', to: 'blue', Ka: 1.0e-10 }] },
  { name: 'alizarin yellow R', ranges: [{ acid: 'HAy(aq)', base: 'Ay^-(aq)', lo: 10.1, hi: 12.0, from: 'yellow', to: 'red', Ka: 6.9e-12 }] },
  { name: 'indigo carmine', ranges: [{ acid: 'HIc(aq)', base: 'Ic^-(aq)', lo: 11.4, hi: 13.0, from: 'blue', to: 'yellow', Ka: 6e-12, approx: true }] },
  { name: '1,3,5-trinitrobenzene', ranges: [{ acid: 'HNb(aq)', base: 'Nb^-(aq)', lo: 12.0, hi: 14.0, from: 'colourless', to: 'orange', Ka: 1e-13, approx: true }] },
];
