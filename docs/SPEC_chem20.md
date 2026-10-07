# Chemistry 20 proposals

Each proposal is one sim, built on its own branch, and has to meet every
criterion in SPEC_phase1.md §4–§5. The owner
approves, edits or drops each proposal and answers its open questions; each
approval becomes a DECISIONS row, and so does each answered question.

---

## 1. `gaslaws`: gas laws, the ideal gas law and kinetic molecular theory (Unit B) — APPROVED and built 2026-10-02

Approved by the owner ("do the proposal. keep lab data. addition rule fine.
combining volumes, into stoich i guess? captions only"): (a) all three modes;
(b) the addition rule for temperatures; (c) combining volumes moves to
`stoichiometry`; (d) real vs ideal gases as captions only. As built, a kelvin
answer goes back to °C by the same rule, so Q10 shows 358 K = 85 °C and Q18
shows 269 K = −4 °C (with V taken as 1.000 L for the density).

Scoped against the owner's *Gases Review Package* (10 pages, uploaded
2026-10-02; not committed): gas laws, combining volumes, kinetic molecular
theory (KMT), molar volume, real vs ideal gases, the ideal gas law, and two
water-displacement lab analyses. Gas values: DATA_SHEET.md §2.

**Teaches.**
- Boyle's, Charles's and Gay-Lussac's laws, and the combined gas law, as one
  sample of gas changing from state 1 to state 2.
- PV = nRT, with n entered directly or as a mass of a named gas (n = m/M);
  molar volume at STP and SATP; density.
- KMT, qualitatively: what the particles do when P, V or T changes.
- From the lab questions: an experimental molar mass or R, from measured
  P, V, T and mass, with the % difference.

**Modes.**

1. **Gas laws.** A fixed amount of gas in a cylinder. The student picks what
   is held constant: T (Boyle), P (Charles), V (Gay-Lussac) or nothing
   (combined). State 1 is P₁, V₁, T₁; state 2 gives two of P₂, V₂, T₂ and
   solves the third. With V constant the cylinder becomes a rigid steel
   canister; otherwise the piston moves.
2. **Ideal gas.** PV = nRT: enter three of P, V, T and n (or a mass and a gas)
   and solve the fourth. STP and SATP buttons set T and P. The readouts
   include V/n (molar volume) and m/V (density) whenever a gas is chosen.
3. **Lab data** (could be part of mode 2). Enter P, V, T, the gas and the
   canister masses before and after. Two readouts: the experimental M with the
   predicted M from the formula, or the experimental R with the booklet's
   8.314; each comes with its % difference. A gas that `bonding` finds polar
   (NH₃, HCl, SO₂) is flagged: it dissolves in water, so it cannot be
   collected by water displacement (package p. 4 Q3–4, p. 9 Q22).

**Units.** Inside `chem/gases.js` the units are R's: kPa, L, K and mol. The
display converts to atm (1 atm = 101.325 kPa, from the 2003 booklet's STP
line), mL, kL and °C. Temperatures are entered in °C with the kelvin value
shown beside them, because every question in the package gives °C. A
temperature at or below −273.15 °C is refused, with a reason.

**Canvas.**
- The particles are decoration (ARCHITECTURE.md §4). The count follows n,
  the spacing follows the volume, and the speed is drawn ∝ √T. Wall hits
  flash, with the flash rate drawn from the computed P. No readout reads
  them back.
- A pressure gauge, a thermometer and a volume scale on the cylinder.
- A small graph of the law in use: P against V (Boyle), V against T in °C
  extrapolated to −273.15 °C (Charles, which answers p. 6 Q5), or P against T
  (Gay-Lussac). Both states are marked on it.

**KMT captions and "Try this"** taken from the package:
- A helium balloon taken outside in winter.
- A heated closed flask: rigid container vs balloon.
- An open 10 L container at 20 °C vs 40 °C: which holds more gas?
- Equal volumes at the same T and P hold the same number of molecules but
  not the same g/L (Avogadro).
- Inhalation: the diaphragm increases the volume, so the pressure drops.

**Proposed chem module.** `site/js/chem/gases.js`, pure, with these functions:
- `combined(state1, state2, unknown)`, which also covers the three
  single-variable laws.
- `ideal({P, V, n, T}, unknown)`.
- `molarVolume(cond)`, `density`, `labMolarMass`, `labR` and
  `percentDifference`.
- `M` comes from `molarMass()` in `chem/electrolysis.js`, which is already
  tested.

**Worked examples, used as tests.** These come from the package's answer key
(pp. 8–9), computed with the booklet values (273.15, R = 8.314, booklet molar
masses):

| Q | Booklet method | Key | |
|---|---|---|---|
| 1 Boyle | 1.48 → 1.5 atm | 1.5 atm | ✓ |
| 2 Boyle (**default setting**) | 45.3 kPa | 45.3 kPa | ✓ |
| 3 Charles | 29.5 L | 29.5 L | ✓ |
| 4 Charles, 27 °C → 350 °C | 41.5 L | 42 L | sig figs, see (b) |
| 5 Gay-Lussac | 1.5 atm | 1.5 atm | ✓ |
| 6 Gay-Lussac, 27 °C → 350 °C | 4.15 atm | 4.2 atm | sig figs, see (b) |
| 7 combined to STP | **60.3 mL** | 60.5 mL | key disagrees |
| 8 combined | 5.9 L | 5.9 L | ✓ |
| 9 ideal V | **32.1 L** | 32.2 L | key disagrees |
| 10 ideal T | 358 K, **84.5 °C** | 358 K, 84.6 °C | key disagrees in the °C |
| 11 mass NO₂ | 1.21 g | 1.21 g | ✓ |
| 12 P of CO₂ | 40 MPa | 40 MPa | ✓ |
| 13 moles in a mixture | 1.20 mol total | 0.24 + 0.72 + 0.24 | ✓ |
| 14–17 molar volume | 53.3 L, 2.31 mmol, 7.26 L, 3.23 kg | same | ✓ |
| 18 T from density | 269 K → 270 K, **−3.8 °C** | 270 K, −3.48 °C | key disagrees in the °C |

Where the key disagrees, the tests hold the booklet method, and the
disagreement is listed for the owner.

**Not in this sim (recommended).**
- **Combining volumes** (package pp. 2–4) is mole-ratio stoichiometry with
  volumes in place of moles. It would be a gas-volume mode of the planned
  `stoichiometry` sim (Chemistry 20 D), which needs the same equation
  balancing and mole ratios.
- **Real vs ideal gases** (p. 6) is qualitative. Showing condensation needs a
  threshold that neither booklet prints. Captions cover it instead: real gases
  have intermolecular forces (link to `forces`) and particle volume, so they
  condense; ideal gases do not.

**Open questions for the owner.**
- (a) Approve the three modes, or drop the lab mode?
- (b) **Sig figs of temperatures.** The key treats "27 °C" as 2 sig figs, so
  Q4 gives 42 L and Q6 gives 4.2 atm. The addition rule (27 + 273.15 = 300 K,
  precise to the ones place, 3 sig figs) gives 41.5 L and 4.15 atm.
  Recommendation: the addition rule, the standard rule for a sum. Pick
  whichever your students are taught.
- (c) Combining volumes goes in `stoichiometry`, not here?
- (d) Real vs ideal as captions only, with no condensation animation?

---

## 2. `dissociation`: ions in water (Unit C) — PROPOSED 2026-10-07

The owner asked for "a nice visual for dissociation, like ions in water".
Nothing built shows this; `titration` only names "complete ionization".

**Teaches.**
- Ionic compounds dissociate into ions; molecular compounds dissolve as whole
  molecules; acids ionize (strong acids completely, weak acids partly).
- Writing dissociation and ionization equations with states, e.g.
  Na₂SO₄(s) → 2 Na⁺(aq) + SO₄²⁻(aq), HCl(g) + H₂O(l) → H₃O⁺(aq) + Cl⁻(aq).
- Hydration: water molecules turn their δ− oxygen toward cations and their δ+
  hydrogens toward anions (polarity, from `bonding`).
- Ion concentration from the solute's: [ion] = (ions per formula unit) × c,
  and back again. With a mass and a volume first: n = m/M, c = n/V.
- Electrolytes and conductivity: strong, weak, non-electrolyte.

**Controls.**
- The solute: typed formula or name (read by `naming`, so charges and
  polyatomic ions come from the booklet), plus a list of common ones: NaCl,
  CaCl₂, Na₂SO₄, Al₂(SO₄)₃, NH₄NO₃, CuSO₄·5H₂O, NaOH, sucrose, ethanol,
  HCl, CH₃COOH, NH₃.
- Given: the solute concentration, an ion concentration, or a mass of solute
  and a volume of solution. Values are typed as the question writes them,
  with sig figs counted from the text as in `gaslaws`.
- Play drops a crystal into water and pulls ions off it, one at a time.

**Readouts.**
- The type of substance and why (metal + nonmetal, polyatomic ion, acid in
  water, molecular).
- The dissociation or ionization equation, with states.
- [each ion] in mol/L, from the coefficient × c, with the sig figs of the
  given value.
- Electrolyte: strong, weak or none, with a conductivity bulb lit to match
  (bright, dim, off; qualitative, no number).

**Canvas.**
- A beaker: a crystal lattice at the bottom, ions leaving it, each wrapped in
  a few oriented water molecules. A sugar crystal sheds whole molecules.
- The particle counts follow the formula (2 Na⁺ for each SO₄²⁻), and the
  number drawn follows the concentration. The motion is decoration
  (ARCHITECTURE.md §4).
- A zoomed "one formula unit" panel matching the equation, coefficient for
  coefficient.

**Worked examples (tests).**
- 0.25 mol/L Na₂SO₄ → [Na⁺] = 0.50 mol/L, [SO₄²⁻] = 0.25 mol/L.
- [Cl⁻] = 0.300 mol/L from CaCl₂ → c(CaCl₂) = 0.150 mol/L.
- 5.85 g NaCl in 250 mL → 0.100 mol NaCl → 0.400 mol/L of each ion.
- CuSO₄·5H₂O(s) → Cu²⁺(aq) + SO₄²⁻(aq) + 5 H₂O(l).
- Sucrose: C₁₂H₂₂O₁₁(s) → C₁₂H₂₂O₁₁(aq), no ions.

**Booklet data.** Ion charges and polyatomic ions (`naming`, §1.8, §1.12),
molar masses (§1.8), the acid table for strong vs weak (§1.9). No new
constants.

**Open questions for the owner.**
- (a) **Low-solubility compounds** (AgCl, CaCO₃). Transcribe the booklet's
  solubility table (p. 6, already a TODO) and flag them as "slightly soluble:
  very few ions", or leave them out? Recommendation: transcribe it, since
  `spontaneity`'s precipitate list needs it too.
- (b) **Weak acids and bases.** Chemistry 20 treats them qualitatively, so the
  sim would draw a few ions among many molecules and give no [H₃O⁺]. The
  fraction drawn is illustrative only. Or leave acids out until `ph`?
  Recommendation: include them qualitatively, because "strong vs weak" is the
  conductivity contrast students are asked about.
- (c) **Its own sim, or a mode of `dilution`?** Recommendation: its own sim.
  `dilution` can link to it for the ion-concentration step.
