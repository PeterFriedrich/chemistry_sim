# Data booklet: what students have in front of them

Transcribed 2026-09-25 from the official Alberta Education **Chemistry 30 Data
Booklet ("Updated 2010")**, 16 pages, the current edition per the 2025–2026
Chemistry 30 information bulletin:
https://www.alberta.ca/system/files/custom_downloaded_images/edc-chemistry30-data-booklet.pdf
(Crown copyright; not committed to this repo — fetch it from that URL).
Chemistry 20 students use the same booklet in class.

Every constant in `site/js/chem/constants.js` must match a value here
(`tests/constants.test.js`). When the booklet is updated, update this file
first, then the constants, then the tests. **Tables marked "not yet
transcribed" are transcribed here the first time a sim needs them**, not before
— and from the PDF, never from memory.

## 1. Chemistry 30 Data Booklet

### 1.1 Constants and miscellaneous (p. 3)

| Quantity | Value |
|---|---|
| Temperature | 25.00 °C is equivalent to 298.15 K |
| c<sub>water</sub> | 4.19 J/(g·°C) |
| c<sub>air</sub> | 1.01 J/(g·°C) |
| c<sub>polystyrene foam cup</sub> | 1.01 J/(g·°C) |
| c<sub>copper</sub> | 0.385 J/(g·°C) |
| c<sub>aluminium</sub> | 0.897 J/(g·°C) |
| c<sub>iron</sub> | 0.449 J/(g·°C) |
| c<sub>tin</sub> | 0.227 J/(g·°C) |
| Water autoionization constant K<sub>w</sub> | 1.0 × 10⁻¹⁴ at 298.15 K (ion concentrations in mol/L) |
| Faraday constant F | 9.65 × 10⁴ C/mol e⁻ |

Specific heat capacities are "at 298.15 K and 100.000 kPa". Also printed: the
quadratic formula and SI prefixes tera → pico.

### 1.2 Notation and units (p. 2)

The booklet fixes the units students use: c in J/(g·°C); E° in V; E<sub>k</sub>,
E<sub>p</sub>, ΔH in **kJ**; Δ<sub>f</sub>H° in kJ/mol; I in A; m in **g**; M in
g/mol; n in mol; P in **kPa**; Q (charge) in C; T in K, t in °C; t (time) in s;
V in **L**; c (amount concentration) in mol/L; [ ] = amount concentration.

### 1.3 Tables (page numbers from the booklet)

| Page | Table | Transcribed? |
|---|---|---|
| PDF p. 2, above the periodic table | Common polyatomic ions | **yes — §1.12** |
| fold-out | Periodic table: atomic molar mass (g/mol, 2 d.p.), electronegativity, most stable ion charges, state at 101.325 kPa and 298.15 K | molar masses, ion charges and electronegativities — **§1.8** |
| 4–5 | Standard molar enthalpies of formation at 298.15 K (kJ/mol) | **yes — §1.6** |
| 6 | Solubility of some common ionic compounds in water at 298.15 K; flame colours | not yet |
| 7 | Selected standard electrode potentials (1.0 mol/L, 298.15 K, 101.325 kPa) | **yes — §1.7** |
| 8–9 | Relative strengths of acids and bases at 298.15 K, with K<sub>a</sub> | **yes — §1.9** |
| 10 | Acid–base indicators at 298.15 K (pH ranges and colours) | **yes — §1.10** |
| 11 | Colours of common aqueous ions | **yes — §1.11** |

### 1.4 Rules printed in the booklet that a sim must honour

- **Weak acid approximation (p. 9 note):** "An approximation may be used instead
  of the quadratic formula when the concentration of H₃O⁺ produced is less than
  5% of the original acid concentration (or the concentration of the acid is
  1 000 times greater than the K<sub>a</sub>)." Also allowed for weak bases.
- The solubility table "is only a guideline that is established using the
  K<sub>sp</sub> values. A concentration of 0.1 mol/L corresponds to
  approximately 10 g/L to 30 g/L depending on molar mass." Check the table's
  high/low threshold wording in the PDF before a sim relies on it.

### 1.5 Not printed

- **No molar enthalpies of fusion or vaporization, and no melting or boiling
  points** (searched the PDF text, 2026-09-26). `hess`'s phase-change mode takes
  the value the question gives.
- **No density of water.** `calorimetry`'s one-object mode takes water in mL at
  the textbook 1.00 g/mL (`WATER_DENSITY` in `constants.js`, DECISIONS row).
- **No gas constant R, no STP/SATP definitions, no Avogadro constant, no
  molar volumes.** Chemistry 20 Unit B (gases) takes R, STP and SATP from the
  2003 booklet instead (§2, DECISIONS row).
- No equations: unlike the physics sheets, the booklet prints no formulas
  (Q = mcΔt, ΔH = nΔ<sub>r</sub>H, pH = −log[H₃O⁺], n = It/F …). Sims print them
  under "Key equations" in the form the course uses.

### 1.6 Standard molar enthalpies of formation at 298.15 K (pp. 4–5)

Transcribed from the PDF with `pypdf` text extraction (93 rows), then read against
the page. Code: `site/js/chem/formation-data.js`. The booklet lists compounds
only: an element in its standard state has Δ<sub>f</sub>H° = 0 by definition.

| Name | Formula | Δ<sub>f</sub>H° (kJ/mol) |
|---|---|---|
| aluminium oxide | Al2O3(s) | −1675.7 |
| ammonia | NH3(g) | −45.9 |
| ammonium chloride | NH4Cl(s) | −314.4 |
| ammonium nitrate | NH4NO3(s) | −365.6 |
| barium carbonate | BaCO3(s) | −1213.0 |
| barium chloride | BaCl2(s) | −855.0 |
| barium hydroxide | Ba(OH)2(s) | −944.7 |
| barium oxide | BaO(s) | −548.0 |
| barium sulfate | BaSO4(s) | −1473.2 |
| benzene | C6H6(l) | +49.1 |
| butane | C4H10(g) | −125.7 |
| calcium carbonate | CaCO3(s) | −1207.6 |
| calcium chloride | CaCl2(s) | −795.4 |
| calcium hydroxide | Ca(OH)2(s) | −985.2 |
| calcium oxide | CaO(s) | −634.9 |
| calcium sulfate | CaSO4(s) | −1434.5 |
| carbon dioxide | CO2(g) | −393.5 |
| carbon monoxide | CO(g) | −110.5 |
| chromium(III) oxide | Cr2O3(s) | −1139.7 |
| copper(I) oxide | Cu2O(s) | −168.6 |
| copper(II) oxide | CuO(s) | −157.3 |
| copper(II) sulfate | CuSO4(s) | −771.4 |
| copper(I) sulfide | Cu2S(s) | −79.5 |
| copper(II) sulfide | CuS(s) | −53.1 |
| dinitrogen tetroxide | N2O4(g) | +11.1 |
| ethane | C2H6(g) | −84.0 |
| ethanoic acid (acetic acid) | CH3COOH(l) | −484.3 |
| ethanol | C2H5OH(l) | −277.6 |
| ethene (ethylene) | C2H4(g) | +52.4 |
| ethyne (acetylene) | C2H2(g) | +227.4 |
| glucose | C6H12O6(s) | −1273.3 |
| hydrogen bromide | HBr(g) | −36.3 |
| hydrogen chloride | HCl(g) | −92.3 |
| hydrogen fluoride | HF(g) | −273.3 |
| hydrogen iodide | HI(g) | +26.5 |
| hydrogen perchlorate | HClO4(l) | −40.6 |
| hydrogen peroxide | H2O2(l) | −187.8 |
| hydrogen sulfide | H2S(g) | −20.6 |
| iron(II) oxide | FeO(s) | −272.0 |
| iron(III) oxide | Fe2O3(s) | −824.2 |
| iron(II,III) oxide (magnetite) | Fe3O4(s) | −1118.4 |
| lead(II) bromide | PbBr2(s) | −278.7 |
| lead(II) chloride | PbCl2(s) | −359.4 |
| lead(II) oxide (red) | PbO(s) | −219.0 |
| lead(IV) oxide | PbO2(s) | −277.4 |
| magnesium carbonate | MgCO3(s) | −1095.8 |
| magnesium chloride | MgCl2(s) | −641.3 |
| magnesium hydroxide | Mg(OH)2(s) | −924.5 |
| magnesium oxide | MgO(s) | −601.6 |
| magnesium sulfate | MgSO4(s) | −1284.9 |
| manganese(II) oxide | MnO(s) | −385.2 |
| manganese(IV) oxide | MnO2(s) | −520.0 |
| mercury(II) oxide (red) | HgO(s) | −90.8 |
| mercury(II) sulfide (red) | HgS(s) | −58.2 |
| methanal (formaldehyde) | CH2O(g) | −108.6 |
| methane | CH4(g) | −74.6 |
| methanoic acid (formic acid) | HCOOH(l) | −425.0 |
| methanol | CH3OH(l) | −239.2 |
| nickel(II) oxide | NiO(s) | −240.6 |
| nitric acid | HNO3(l) | −174.1 |
| nitrogen dioxide | NO2(g) | +33.2 |
| nitrogen monoxide | NO(g) | +91.3 |
| octane | C8H18(l) | −250.1 |
| pentane | C5H12(l) | −173.5 |
| phosphorus pentachloride | PCl5(s) | −443.5 |
| phosphorus trichloride (liquid) | PCl3(l) | −319.7 |
| phosphorus trichloride (vapour) | PCl3(g) | −287.0 |
| potassium bromide | KBr(s) | −393.8 |
| potassium chlorate | KClO3(s) | −397.7 |
| potassium chloride | KCl(s) | −436.5 |
| potassium hydroxide | KOH(s) | −424.6 |
| propane | C3H8(g) | −103.8 |
| silicon dioxide (α−quartz) | SiO2(s) | -910.7 |
| silver bromide | AgBr(s) | −100.4 |
| silver chloride | AgCl(s) | −127.0 |
| silver iodide | AgI(s) | −61.8 |
| sodium bromide | NaBr(s) | −361.1 |
| sodium chloride | NaCl(s) | −411.2 |
| sodium hydroxide | NaOH(s) | −425.8 |
| sodium iodide | NaI(s) | −287.8 |
| sucrose | C12H22O11(s) | −2226.1 |
| sulfur dioxide | SO2(g) | −296.8 |
| sulfuric acid | H2SO4(l) | −814.0 |
| sulfur trioxide (liquid) | SO3(l) | −441.0 |
| sulfur trioxide (vapour) | SO3(g) | −395.7 |
| tin(II) chloride | SnCl2(s) | −325.1 |
| tin(IV) chloride | SnCl4(l) | −511.3 |
| tin(II) oxide | SnO(s) | −280.7 |
| tin(IV) oxide | SnO2(s) | −577.6 |
| water (liquid) | H2O(l) | −285.8 |
| water (vapour) | H2O(g) | −241.8 |
| zinc oxide | ZnO(s) | −350.5 |
| zinc sulfide (sphalerite) | ZnS(s) | −206.0 |

### 1.7 Selected standard electrode potentials (p. 7)

Reduction half-reactions, strongest oxidizing agent first, "for 1.0 mol/L
solutions at 298.15 K (25.00 °C) and a pressure of 101.325 kPa". Transcribed
from the PDF with `pypdf` (49 rows; charges the extraction split onto the next
line were rejoined), then read against the page; every row is checked for
charge and atom balance by `test_redox_every_half_reaction_balances`. Code:
`site/js/chem/redox-data.js`.

| Reduction half-reaction | E° (V) |
|---|---|
| F₂(g) + 2 e⁻ ⇌ 2 F⁻(aq) | +2.87 |
| PbO₂(s) + SO₄²⁻(aq) + 4 H⁺(aq) + 2 e⁻ ⇌ PbSO₄(s) + 2 H₂O(l) | +1.69 |
| MnO₄⁻(aq) + 8 H⁺(aq) + 5 e⁻ ⇌ Mn²⁺(aq) + 4 H₂O(l) | +1.51 |
| Au³⁺(aq) + 3 e⁻ ⇌ Au(s) | +1.50 |
| ClO₄⁻(aq) + 8 H⁺(aq) + 8 e⁻ ⇌ Cl⁻(aq) + 4 H₂O(l) | +1.39 |
| Cl₂(g) + 2 e⁻ ⇌ 2 Cl⁻(aq) | +1.36 |
| 2 HNO₂(aq) + 4 H⁺(aq) + 4 e⁻ ⇌ N₂O(g) + 3 H₂O(l) | +1.30 |
| Cr₂O₇²⁻(aq) + 14 H⁺(aq) + 6 e⁻ ⇌ 2 Cr³⁺(aq) + 7 H₂O(l) | +1.23 |
| O₂(g) + 4 H⁺(aq) + 4 e⁻ ⇌ 2 H₂O(l) | +1.23 |
| MnO₂(s) + 4 H⁺(aq) + 2 e⁻ ⇌ Mn²⁺(aq) + 2 H₂O(l) | +1.22 |
| Br₂(l) + 2 e⁻ ⇌ 2 Br⁻(aq) | +1.07 |
| Hg²⁺(aq) + 2 e⁻ ⇌ Hg(l) | +0.85 |
| OCl⁻(aq) + H₂O(l) + 2 e⁻ ⇌ Cl⁻(aq) + 2 OH⁻(aq) | +0.84 |
| 2 NO₃⁻(aq) + 4 H⁺(aq) + 2 e⁻ ⇌ N₂O₄(g) + 2 H₂O(l) | +0.80 |
| Ag⁺(aq) + e⁻ ⇌ Ag(s) | +0.80 |
| Fe³⁺(aq) + e⁻ ⇌ Fe²⁺(aq) | +0.77 |
| O₂(g) + 2 H⁺(aq) + 2 e⁻ ⇌ H₂O₂(l) | +0.70 |
| I₂(s) + 2 e⁻ ⇌ 2 I⁻(aq) | +0.54 |
| O₂(g) + 2 H₂O(l) + 4 e⁻ ⇌ 4 OH⁻(aq) | +0.40 |
| Cu²⁺(aq) + 2 e⁻ ⇌ Cu(s) | +0.34 |
| SO₄²⁻(aq) + 4 H⁺(aq) + 2 e⁻ ⇌ H₂SO₃(aq) + H₂O(l) | +0.17 |
| Sn⁴⁺(aq) + 2 e⁻ ⇌ Sn²⁺(aq) | +0.15 |
| S(s) + 2 H⁺(aq) + 2 e⁻ ⇌ H₂S(aq) | +0.14 |
| AgBr(s) + e⁻ ⇌ Ag(s) + Br⁻(aq) | +0.07 |
| 2 H⁺(aq) + 2 e⁻ ⇌ H₂(g) | 0.00 |
| Pb²⁺(aq) + 2 e⁻ ⇌ Pb(s) | −0.13 |
| Sn²⁺(aq) + 2 e⁻ ⇌ Sn(s) | −0.14 |
| AgI(s) + e⁻ ⇌ Ag(s) + I⁻(aq) | −0.15 |
| Ni²⁺(aq) + 2 e⁻ ⇌ Ni(s) | −0.26 |
| Co²⁺(aq) + 2 e⁻ ⇌ Co(s) | −0.28 |
| PbSO₄(s) + 2 e⁻ ⇌ Pb(s) + SO₄²⁻(aq) | −0.36 |
| Se(s) + 2 H⁺(aq) + 2 e⁻ ⇌ H₂Se(aq) | −0.40 |
| Cd²⁺(aq) + 2 e⁻ ⇌ Cd(s) | −0.40 |
| Cr³⁺(aq) + e⁻ ⇌ Cr²⁺(aq) | −0.41 |
| Fe²⁺(aq) + 2 e⁻ ⇌ Fe(s) | −0.45 |
| NO₂⁻(aq) + H₂O(l) + e⁻ ⇌ NO(g) + 2 OH⁻(aq) | −0.46 |
| Ag₂S(s) + 2 e⁻ ⇌ 2 Ag(s) + S²⁻(aq) | −0.69 |
| Zn²⁺(aq) + 2 e⁻ ⇌ Zn(s) | −0.76 |
| 2 H₂O(l) + 2 e⁻ ⇌ H₂(g) + 2 OH⁻(aq) | −0.83 |
| Cr²⁺(aq) + 2 e⁻ ⇌ Cr(s) | −0.91 |
| Se(s) + 2 e⁻ ⇌ Se²⁻(aq) | −0.92 |
| SO₄²⁻(aq) + H₂O(l) + 2 e⁻ ⇌ SO₃²⁻(aq) + 2 OH⁻(aq) | −0.93 |
| Al³⁺(aq) + 3 e⁻ ⇌ Al(s) | −1.66 |
| Mg²⁺(aq) + 2 e⁻ ⇌ Mg(s) | −2.37 |
| Na⁺(aq) + e⁻ ⇌ Na(s) | −2.71 |
| Ca²⁺(aq) + 2 e⁻ ⇌ Ca(s) | −2.87 |
| Ba²⁺(aq) + 2 e⁻ ⇌ Ba(s) | −2.91 |
| K⁺(aq) + e⁻ ⇌ K(s) | −2.93 |
| Li⁺(aq) + e⁻ ⇌ Li(s) | −3.04 |

### 1.8 Periodic table: atomic molar masses (fold-out)

Transcribed from the PDF with `pypdf` (111 elements, Z = 1–111). 93 parsed
directly; 18 that the extraction laid out differently (Ti, Sr, Ba, Eu–Lu, Pb, Am,
Cm, Bk, Sg, Bh) were read from the raw text by hand. Values in parentheses are
the mass number of the most stable isotope. Lead is printed as 207.2 with the
booklet's note that its isotopic mix prevents more precision. Code:
`site/js/chem/elements-data.js`.

Layout (used by `periodic`, read 2026-09-27 from the PDF rendered as an
image): groups are numbered 1–18 and periods 1–7. Lanthanum (57) and actinium
(89) sit in group 3; the two separate rows below the table are cerium–lutetium
(58–71) and thorium–lawrencium (90–103), marked "lanthanide and actinide series
begin" after La and Ac. The table itself runs to roentgenium (111).

**Most stable ion charges** (the "Ion charges" column below; code: `ions` in
`elements-data.js`), read from the rendered image, because text extraction
garbled Li, Pt, Pb, Bi, Ac and Rf. Listed in the booklet's printed order; the
sims default to the first one listed, as students are taught to. The booklet prints **no charge** ("—", or a blank cell) for B, C, Si, the
nonmetals of groups 15–17 (N, O, F, P, S, Cl, As, Se, Br, Te, I, At), the noble
gases, and Db–Rg. Only hydrogen has a negative charge printed (1+, 1−). The
charges a student gives for N³⁻, O²⁻, Cl⁻ and similar come from the group
(8 − valence electrons), not from the booklet.

**Electronegativities** (the last column; code: `en`), read 2026-09-28 from the
rendered image the same way; text extraction garbled Li, Pt, Pb and Bi. The
booklet prints "—" for He, Ne, Ar, Kr, Rn, Pm, Eu, Tb, Yb and Am–Lr, and
leaves Rf–Rg blank. Xenon has one (2.6). States are **not** transcribed yet.

| Z | Symbol | Name | M (g/mol) | Ion charges | Electronegativity |
|---|---|---|---|---|---|
| 1 | H | hydrogen | 1.01 | 1+, 1− | 2.2 |
| 2 | He | helium | 4.00 | — | — |
| 3 | Li | lithium | 6.94 | 1+ | 1.0 |
| 4 | Be | beryllium | 9.01 | 2+ | 1.6 |
| 5 | B | boron | 10.81 | — | 2.0 |
| 6 | C | carbon | 12.01 | — | 2.6 |
| 7 | N | nitrogen | 14.01 | — | 3.0 |
| 8 | O | oxygen | 16.00 | — | 3.4 |
| 9 | F | fluorine | 19.00 | — | 4.0 |
| 10 | Ne | neon | 20.18 | — | — |
| 11 | Na | sodium | 22.99 | 1+ | 0.9 |
| 12 | Mg | magnesium | 24.31 | 2+ | 1.3 |
| 13 | Al | aluminium | 26.98 | 3+ | 1.6 |
| 14 | Si | silicon | 28.09 | — | 1.9 |
| 15 | P | phosphorus | 30.97 | — | 2.2 |
| 16 | S | sulfur | 32.07 | — | 2.6 |
| 17 | Cl | chlorine | 35.45 | — | 3.2 |
| 18 | Ar | argon | 39.95 | — | — |
| 19 | K | potassium | 39.10 | 1+ | 0.8 |
| 20 | Ca | calcium | 40.08 | 2+ | 1.0 |
| 21 | Sc | scandium | 44.96 | 3+ | 1.4 |
| 22 | Ti | titanium | 47.87 | 4+, 3+ | 1.5 |
| 23 | V | vanadium | 50.94 | 5+, 4+ | 1.6 |
| 24 | Cr | chromium | 52.00 | 3+, 2+ | 1.7 |
| 25 | Mn | manganese | 54.94 | 2+, 4+ | 1.6 |
| 26 | Fe | iron | 55.85 | 3+, 2+ | 1.8 |
| 27 | Co | cobalt | 58.93 | 2+, 3+ | 1.9 |
| 28 | Ni | nickel | 58.69 | 2+, 3+ | 1.9 |
| 29 | Cu | copper | 63.55 | 2+, 1+ | 1.9 |
| 30 | Zn | zinc | 65.41 | 2+ | 1.7 |
| 31 | Ga | gallium | 69.72 | 3+ | 1.8 |
| 32 | Ge | germanium | 72.64 | 4+ | 2.0 |
| 33 | As | arsenic | 74.92 | — | 2.2 |
| 34 | Se | selenium | 78.96 | — | 2.6 |
| 35 | Br | bromine | 79.90 | — | 3.0 |
| 36 | Kr | krypton | 83.80 | — | — |
| 37 | Rb | rubidium | 85.47 | 1+ | 0.8 |
| 38 | Sr | strontium | 87.62 | 2+ | 1.0 |
| 39 | Y | yttrium | 88.91 | 3+ | 1.2 |
| 40 | Zr | zirconium | 91.22 | 4+ | 1.3 |
| 41 | Nb | niobium | 92.91 | 5+, 3+ | 1.6 |
| 42 | Mo | molybdenum | 95.94 | 6+ | 2.2 |
| 43 | Tc | technetium | (98) | 7+ | 2.1 |
| 44 | Ru | ruthenium | 101.07 | 3+ | 2.2 |
| 45 | Rh | rhodium | 102.91 | 3+ | 2.3 |
| 46 | Pd | palladium | 106.42 | 2+, 3+ | 2.2 |
| 47 | Ag | silver | 107.87 | 1+ | 1.9 |
| 48 | Cd | cadmium | 112.41 | 2+ | 1.7 |
| 49 | In | indium | 114.82 | 3+ | 1.8 |
| 50 | Sn | tin | 118.71 | 4+, 2+ | 2.0 |
| 51 | Sb | antimony | 121.76 | 3+, 5+ | 2.1 |
| 52 | Te | tellurium | 127.60 | — | 2.1 |
| 53 | I | iodine | 126.90 | — | 2.7 |
| 54 | Xe | xenon | 131.29 | — | 2.6 |
| 55 | Cs | cesium | 132.91 | 1+ | 0.8 |
| 56 | Ba | barium | 137.33 | 2+ | 0.9 |
| 57 | La | lanthanum | 138.91 | 3+ | 1.1 |
| 58 | Ce | cerium | 140.12 | 3+ | 1.1 |
| 59 | Pr | praseodymium | 140.91 | 3+ | 1.1 |
| 60 | Nd | neodymium | 144.24 | 3+ | 1.1 |
| 61 | Pm | promethium | (145) | 3+ | — |
| 62 | Sm | samarium | 150.36 | 3+, 2+ | 1.2 |
| 63 | Eu | europium | 151.96 | 3+, 2+ | — |
| 64 | Gd | gadolinium | 157.25 | 3+ | 1.2 |
| 65 | Tb | terbium | 158.93 | 3+ | — |
| 66 | Dy | dysprosium | 162.50 | 3+ | 1.2 |
| 67 | Ho | holmium | 164.93 | 3+ | 1.2 |
| 68 | Er | erbium | 167.26 | 3+ | 1.2 |
| 69 | Tm | thulium | 168.93 | 3+ | 1.3 |
| 70 | Yb | ytterbium | 173.04 | 3+, 2+ | — |
| 71 | Lu | lutetium | 174.97 | 3+ | 1.0 |
| 72 | Hf | hafnium | 178.49 | 4+ | 1.3 |
| 73 | Ta | tantalum | 180.95 | 5+ | 1.5 |
| 74 | W | tungsten | 183.84 | 6+ | 1.7 |
| 75 | Re | rhenium | 186.21 | 7+ | 1.9 |
| 76 | Os | osmium | 190.23 | 4+ | 2.2 |
| 77 | Ir | iridium | 192.22 | 4+ | 2.2 |
| 78 | Pt | platinum | 195.08 | 4+, 2+ | 2.2 |
| 79 | Au | gold | 196.97 | 3+, 1+ | 2.4 |
| 80 | Hg | mercury | 200.59 | 2+, 1+ | 1.9 |
| 81 | Tl | thallium | 204.38 | 1+, 3+ | 1.8 |
| 82 | Pb | lead | 207.2 | 2+, 4+ | 1.8 |
| 83 | Bi | bismuth | 208.98 | 3+, 5+ | 1.9 |
| 84 | Po | polonium | (209) | 2+, 4+ | 2.0 |
| 85 | At | astatine | (210) | — | 2.2 |
| 86 | Rn | radon | (222) | — | — |
| 87 | Fr | francium | (223) | 1+ | 0.7 |
| 88 | Ra | radium | (226) | 2+ | 0.9 |
| 89 | Ac | actinium | (227) | 3+ | 1.1 |
| 90 | Th | thorium | 232.04 | 4+ | 1.3 |
| 91 | Pa | protactinium | 231.04 | 5+, 4+ | 1.5 |
| 92 | U | uranium | 238.03 | 6+, 4+ | 1.7 |
| 93 | Np | neptunium | (237) | 5+ | 1.3 |
| 94 | Pu | plutonium | (244) | 4+, 6+ | 1.3 |
| 95 | Am | americium | (243) | 3+, 4+ | — |
| 96 | Cm | curium | (247) | 3+ | — |
| 97 | Bk | berkelium | (247) | 3+, 4+ | — |
| 98 | Cf | californium | (251) | 3+ | — |
| 99 | Es | einsteinium | (252) | 3+ | — |
| 100 | Fm | fermium | (257) | 3+ | — |
| 101 | Md | mendelevium | (258) | 2+, 3+ | — |
| 102 | No | nobelium | (259) | 2+, 3+ | — |
| 103 | Lr | lawrencium | (262) | 3+ | — |
| 104 | Rf | rutherfordium | (261) | 4+ | — |
| 105 | Db | dubnium | (262) | — | — |
| 106 | Sg | seaborgium | (266) | — | — |
| 107 | Bh | bohrium | (264) | — | — |
| 108 | Hs | hassium | (277) | — | — |
| 109 | Mt | meitnerium | (268) | — | — |
| 110 | Ds | darmstadtium | (271) | — | — |
| 111 | Rg | roentgenium | (272) | — | — |

### 1.9 Relative strengths of acids and bases at 298.15 K (pp. 8–9)

Strongest acid first. Transcribed from the PDF with `pypdf` (35 rows; charges
the extraction split onto the next line were rejoined), then read row by row
against the rendered pages. Only the common name is kept; the booklet also
prints an IUPAC/systematic name and says either is acceptable. Code:
`site/js/chem/acid-data.js` ("very large" is `Infinity`).

| Acid | Acid formula | Conjugate base | K<sub>a</sub> |
|---|---|---|---|
| perchloric acid | HClO₄(aq) | ClO₄⁻(aq) | very large |
| hydroiodic acid | HI(aq) | I⁻(aq) | very large |
| hydrobromic acid | HBr(aq) | Br⁻(aq) | very large |
| hydrochloric acid | HCl(aq) | Cl⁻(aq) | very large |
| sulfuric acid | H₂SO₄(aq) | HSO₄⁻(aq) | very large |
| nitric acid | HNO₃(aq) | NO₃⁻(aq) | very large |
| hydronium ion | H₃O⁺(aq) | H₂O(l) | 1 |
| oxalic acid | HOOCCOOH(aq) | HOOCCOO⁻(aq) | 5.6 × 10<sup>−2</sup> |
| sulfurous acid | H₂SO₃(aq) | HSO₃⁻(aq) | 1.4 × 10<sup>−2</sup> |
| hydrogen sulfate ion | HSO₄⁻(aq) | SO₄²⁻(aq) | 1.0 × 10<sup>−2</sup> |
| phosphoric acid | H₃PO₄(aq) | H₂PO₄⁻(aq) | 6.9 × 10<sup>−3</sup> |
| citric acid | C₃H₅O(COOH)₃(aq) | C₃H₅O(COOH)₂COO⁻(aq) | 7.4 × 10<sup>−4</sup> |
| hydrofluoric acid | HF(aq) | F⁻(aq) | 6.3 × 10<sup>−4</sup> |
| nitrous acid | HNO₂(aq) | NO₂⁻(aq) | 5.6 × 10<sup>−4</sup> |
| formic acid | HCOOH(aq) | HCOO⁻(aq) | 1.8 × 10<sup>−4</sup> |
| hydrogen oxalate ion | HOOCCOO⁻(aq) | OOCCOO²⁻(aq) | 1.5 × 10<sup>−4</sup> |
| lactic acid | C₂H₅OCOOH(aq) | C₂H₅OCOO⁻(aq) | 1.4 × 10<sup>−4</sup> |
| ascorbic acid | H₂C₆H₆O₆(aq) | HC₆H₆O₆⁻(aq) | 9.1 × 10<sup>−5</sup> |
| benzoic acid | C₆H₅COOH(aq) | C₆H₅COO⁻(aq) | 6.3 × 10<sup>−5</sup> |
| acetic acid | CH₃COOH(aq) | CH₃COO⁻(aq) | 1.8 × 10<sup>−5</sup> |
| dihydrogen citrate ion | C₃H₅O(COOH)₂COO⁻(aq) | C₃H₅OCOOH(COO)₂²⁻(aq) | 1.7 × 10<sup>−5</sup> |
| butanoic acid | C₃H₇COOH(aq) | C₃H₇COO⁻(aq) | 1.5 × 10<sup>−5</sup> |
| propanoic acid | C₂H₅COOH(aq) | C₂H₅COO⁻(aq) | 1.3 × 10<sup>−5</sup> |
| carbonic acid | H₂CO₃(aq) | HCO₃⁻(aq) | 4.5 × 10<sup>−7</sup> |
| hydrogen citrate ion | C₃H₅OCOOH(COO)₂²⁻(aq) | C₃H₅O(COO)₃³⁻(aq) | 4.0 × 10<sup>−7</sup> |
| hydrosulfuric acid | H₂S(aq) | HS⁻(aq) | 8.9 × 10<sup>−8</sup> |
| hydrogen sulfite ion | HSO₃⁻(aq) | SO₃²⁻(aq) | 6.3 × 10<sup>−8</sup> |
| dihydrogen phosphate ion | H₂PO₄⁻(aq) | HPO₄²⁻(aq) | 6.2 × 10<sup>−8</sup> |
| hypochlorous acid | HOCl(aq) | OCl⁻(aq) | 4.0 × 10<sup>−8</sup> |
| hydrocyanic acid | HCN(aq) | CN⁻(aq) | 6.2 × 10<sup>−10</sup> |
| ammonium ion | NH₄⁺(aq) | NH₃(aq) | 5.6 × 10<sup>−10</sup> |
| hydrogen carbonate ion | HCO₃⁻(aq) | CO₃²⁻(aq) | 4.7 × 10<sup>−11</sup> |
| hydrogen ascorbate ion | HC₆H₆O₆⁻(aq) | C₆H₆O₆²⁻(aq) | 2.0 × 10<sup>−12</sup> |
| hydrogen phosphate ion | HPO₄²⁻(aq) | PO₄³⁻(aq) | 4.8 × 10<sup>−13</sup> |
| water | H₂O(l) | OH⁻(aq) | 1.0 × 10<sup>−14</sup> |

### 1.10 Acid–base indicators at 298.15 K (p. 10)

Transcribed from the PDF with `pypdf` (15 indicators; cresol red and thymol
blue change colour twice), then read against the rendered page. A "~" K<sub>a</sub>
is printed that way. Code: `site/js/chem/indicator-data.js`.

| Indicator | Abbreviations | pH range | Colour change as pH increases | K<sub>a</sub> |
|---|---|---|---|---|
| methyl violet | HMv(aq) / Mv⁻(aq) | 0.0 – 1.6 | yellow to blue | ~2 × 10<sup>−1</sup> |
| cresol red | H₂Cr(aq) / HCr⁻(aq) | 0.0 – 1.0 | red to yellow | ~3 × 10<sup>−1</sup> |
| cresol red | HCr⁻(aq) / Cr²⁻(aq) | 7.0 – 8.8 | yellow to red | 3.5 × 10<sup>−9</sup> |
| thymol blue | H₂Tb(aq) / HTb⁻(aq) | 1.2 – 2.8 | red to yellow | 2.2 × 10<sup>−2</sup> |
| thymol blue | HTb⁻(aq) / Tb²⁻(aq) | 8.0 – 9.6 | yellow to blue | 6.3 × 10<sup>−10</sup> |
| orange IV | HOr(aq) / Or⁻(aq) | 1.4 – 2.8 | red to yellow | ~1 × 10<sup>−2</sup> |
| methyl orange | HMo(aq) / Mo⁻(aq) | 3.2 – 4.4 | red to yellow | 3.5 × 10<sup>−4</sup> |
| bromocresol green | HBg(aq) / Bg⁻(aq) | 3.8 – 5.4 | yellow to blue | 1.3 × 10<sup>−5</sup> |
| methyl red | HMr(aq) / Mr⁻(aq) | 4.8 – 6.0 | red to yellow | 1.0 × 10<sup>−5</sup> |
| chlorophenol red | HCh(aq) / Ch⁻(aq) | 5.2 – 6.8 | yellow to red | 5.6 × 10<sup>−7</sup> |
| bromothymol blue | HBb(aq) / Bb⁻(aq) | 6.0 – 7.6 | yellow to blue | 5.0 × 10<sup>−8</sup> |
| phenol red | HPr(aq) / Pr⁻(aq) | 6.6 – 8.0 | yellow to red | 1.0 × 10<sup>−8</sup> |
| phenolphthalein | HPh(aq) / Ph⁻(aq) | 8.2 – 10.0 | colourless to pink | 3.2 × 10<sup>−10</sup> |
| thymolphthalein | HTh(aq) / Th⁻(aq) | 9.4 – 10.6 | colourless to blue | 1.0 × 10<sup>−10</sup> |
| alizarin yellow R | HAy(aq) / Ay⁻(aq) | 10.1 – 12.0 | yellow to red | 6.9 × 10<sup>−12</sup> |
| indigo carmine | HIc(aq) / Ic⁻(aq) | 11.4 – 13.0 | blue to yellow | ~6 × 10<sup>−12</sup> |
| 1,3,5-trinitrobenzene | HNb(aq) / Nb⁻(aq) | 12.0 – 14.0 | colourless to orange | ~1 × 10<sup>−13</sup> |

### 1.11 Colours of common aqueous ions (p. 11)

Transcribed from the PDF with `pypdf` (12 ions), then read against the rendered
page. The booklet prints names only; the formulas in the code are added as keys.
Code: `site/js/chem/ion-colour-data.js`.

| Ion | 1.0 mol/L | 0.010 mol/L |
|---|---|---|
| chromate, CrO₄²⁻ | yellow | pale yellow |
| chromium(III), Cr³⁺ | blue-green | green |
| chromium(II), Cr²⁺ | dark blue | pale blue |
| cobalt(II), Co²⁺ | red | pink |
| copper(I), Cu⁺ | blue-green | pale blue-green |
| copper(II), Cu²⁺ | blue | pale blue |
| dichromate, Cr₂O₇²⁻ | orange | pale orange |
| iron(II), Fe²⁺ | lime green | colourless |
| iron(III), Fe³⁺ | orange-yellow | pale yellow |
| manganese(II), Mn²⁺ | pale pink | colourless |
| nickel(II), Ni²⁺ | blue-green | pale blue-green |
| permanganate, MnO₄⁻ | deep purple | purple-pink |

### 1.12 Table of Common Polyatomic Ions (PDF p. 2)

Transcribed 2026-09-27 from the PDF rendered as an image, in the booklet's
order (three columns, read down). 34 ions; ammonium is the only cation. Code:
`site/js/chem/polyatomic-data.js`. The booklet gives hypochlorite two ways; the
sims write OCl⁻ and accept ClO⁻. Ions students may know by analogy but the
booklet does not list (bromate, iodite and so on) are not included.
The PDF's text layer types the four chlorine oxyanions as "CIO" (capital i),
which renders the same as ClO in the booklet's font. The formulas below are ClO,
chlorine. Don't re-transcribe them from extracted text (audit 2026-09-28,
docs/FINDINGS_unitA_data.md).

| Name | Formula |
|---|---|
| acetate (ethanoate) | CH₃COO⁻ |
| ammonium | NH₄⁺ |
| benzoate | C₆H₅COO⁻ |
| borate | BO₃³⁻ |
| carbide | C₂²⁻ |
| carbonate | CO₃²⁻ |
| hydrogen carbonate | HCO₃⁻ |
| perchlorate | ClO₄⁻ |
| chlorate | ClO₃⁻ |
| chlorite | ClO₂⁻ |
| hypochlorite | OCl⁻ or ClO⁻ |
| chromate | CrO₄²⁻ |
| dichromate | Cr₂O₇²⁻ |
| cyanide | CN⁻ |
| hydroxide | OH⁻ |
| iodate | IO₃⁻ |
| nitrate | NO₃⁻ |
| nitrite | NO₂⁻ |
| oxalate | OOCCOO²⁻ |
| hydrogen oxalate | HOOCCOO⁻ |
| permanganate | MnO₄⁻ |
| peroxide | O₂²⁻ |
| persulfide | S₂²⁻ |
| phosphate | PO₄³⁻ |
| hydrogen phosphate | HPO₄²⁻ |
| dihydrogen phosphate | H₂PO₄⁻ |
| silicate | SiO₃²⁻ |
| sulfate | SO₄²⁻ |
| hydrogen sulfate | HSO₄⁻ |
| sulfite | SO₃²⁻ |
| hydrogen sulfite | HSO₃⁻ |
| hydrogen sulfide | HS⁻ |
| thiocyanate | SCN⁻ |
| thiosulfate | S₂O₃²⁻ |

## 2. Chemistry 20: values not in the booklet

Source (owner, 2026-10-02): the **2003 Chemistry 30 Data Booklet** ("revised
2003", Alberta Learning, 16 pages), p. 3 "Miscellaneous", fetched 2026-10-02 from
https://www.mathpro.ca/wp-content/uploads/2022/09/chem30_databooklet.pdf
(md5 `f9a9b3b481019a09682fc4879a7639df`, 275 262 bytes; third-party copy, Crown
copyright, not committed). Read from the text layer and the rendered page; the
two agree. Code: `R`, `STP`, `SATP` in `constants.js`.

| Quantity | Value |
|---|---|
| Gas constant R | 8.314 (L·kPa)/(K·mol), or 8.314 J/(K·mol) |
| Ideal gas law | PV = nRT |
| STP | 273.15 K and 101.325 kPa (1 atm) |
| SATP | 298.15 K and 100.000 kPa |

Also on that page, not used yet: N<sub>A</sub> = 6.02 × 10²³ particles/mol;
m<sub>air</sub> = 29.18 g for 1.00 mol of dry air; c<sub>wood</sub> 1.26,
c<sub>glass</sub> 0.84, c<sub>Styrofoam</sub> 0.30 J/(g·°C). Its K<sub>w</sub>
(1.00 × 10⁻¹⁴) and F match §1.1 except for K<sub>w</sub>'s extra sig fig;
§1.1 (the current booklet) wins wherever both print a value.

**Molar volumes are not printed in either booklet.** They are derived as
V = RT/P (owner, 2026-10-02): 22.4 L/mol at STP and 24.8 L/mol at SATP, which
are also the textbook values.

The 2003 booklet also prints melting and boiling points and ΔH<sub>fusion</sub>,
ΔH<sub>vaporization</sub> (pp. 4–5), which the current booklet does not (§1.5).
Not transcribed; transcribe them the first time a sim needs them.
