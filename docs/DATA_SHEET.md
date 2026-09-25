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
| inside cover | Common polyatomic ions | not yet |
| fold-out | Periodic table: atomic molar mass (g/mol, 2 d.p.), electronegativity, most stable ion charges, state at 101.325 kPa and 298.15 K | not yet |
| 4–5 | Standard molar enthalpies of formation at 298.15 K (kJ/mol) | **yes — §1.6** |
| 6 | Solubility of some common ionic compounds in water at 298.15 K; flame colours | not yet |
| 7 | Selected standard electrode potentials (1.0 mol/L, 298.15 K, 101.325 kPa) | not yet |
| 8–9 | Relative strengths of acids and bases at 298.15 K, with K<sub>a</sub> | not yet |
| 10 | Acid–base indicators at 298.15 K (pH ranges and colours) | not yet |
| 11 | Colours of common aqueous ions | not yet |

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

- **No gas constant R, no molar volume at STP or SATP, no STP/SATP
  definitions, no Avogadro constant.** Chemistry 20 Unit B (gases) needs these.
  Before a gas sim is built, the owner supplies the values their Chemistry 20
  resource uses (commonly R = 8.314 kPa·L/(mol·K); STP 0 °C and 101.325 kPa,
  22.4 L/mol; SATP 25 °C and 100 kPa, 24.8 L/mol — **unconfirmed**, listed only
  so the question is concrete). Record them in §2 with their source and add a
  DECISIONS row, as physics_sim did for its Physics 20 sheet.
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

## 2. Chemistry 20: values not in the booklet

Empty until the owner supplies a source (§1.5). Nothing in `constants.js` may
come from this section until it has one.
