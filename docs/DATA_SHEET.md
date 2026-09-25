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
| 4–5 | Standard molar enthalpies of formation at 298.15 K (kJ/mol) | not yet |
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

## 2. Chemistry 20: values not in the booklet

Empty until the owner supplies a source (§1.5). Nothing in `constants.js` may
come from this section until it has one.
