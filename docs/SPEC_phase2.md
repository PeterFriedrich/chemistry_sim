# Phase 2 proposals: three Chemistry 30 sims (PROPOSED, not approved)

The phase 1 sims cover one or two topics per Chemistry 30 unit. Three topics that come up often on the diploma exam have no sim yet. Each proposal is one sim, built on its own branch, and has to meet every criterion in SPEC_phase1.md §4–§5. **Nothing here is approved.** The owner approves, edits or drops each proposal and answers its open questions. Each approval then becomes a DECISIONS row, and each open question that gets answered becomes another.

The topic list comes from the Chemistry 30 unit titles and common diploma questions. It has **not** been checked against program-of-studies outcome codes; that is still an open TODO.

| # | Catalog id | Unit | Topic | Booklet data | New data needed |
|---|---|---|---|---|---|
| 1 | `bronsted` | D | Predicting Brønsted–Lowry reactions from the acid table | K<sub>a</sub> table (§1.9, in `acid-data.js`) | none |
| 2 | `fuel` | A | Molar enthalpy of combustion by calorimetry, and efficiency | specific heat of water, Δ<sub>f</sub>H°, molar masses (all transcribed) | an illustrative efficiency per apparatus |
| 3 | `activation` | A | Potential-energy diagram: E<sub>a</sub>, activated complex, catalyst | Δ<sub>f</sub>H° via `hess.js` presets | illustrative E<sub>a</sub> (the booklet prints none) |

Recommended order: 1, then 2, then 3 (smallest).

---

## 1. `bronsted`: Brønsted–Lowry reaction predictor (Unit D) — APPROVED and built 2026-09-26

Approved as proposed (DECISIONS row). Open questions settled by default: (a) the list below; (b) K<sub>eq</sub> is shown; (c) no "quantitative" label.

**Teaches.** The five-step student method:
1. List every entity present, with strong acids written as H₃O⁺ and ionic compounds as their ions.
2. Label each entity as an acid, a base, or both.
3. Pick the strongest acid (SA) and the strongest base (SB) using the table.
4. Write SA + SB ⇌ conjugate base + conjugate acid.
5. Decide whether products or reactants are favoured.

**Controls.**
- Two solutions, each chosen from a fixed list, for example: HCl, HNO₃, CH₃COOH, HF, NH₄Cl, NaHSO₄, NaH₂PO₄, NaHCO₃, Na₂CO₃, NaCH₃COO, NaF, NaOCl, NH₃, Na₃PO₄, NaOH.
- A fixed list, not free entry, matches `electrolysis` and `hess`.
- Water is always present.

**Readouts, all from `chem/bronsted.js`.**
- Entities present, with spectators (Na⁺, Cl⁻ from a strong acid) marked.
- The SA with its K<sub>a</sub>, and the SB with its conjugate acid's K<sub>a</sub>.
- The net ionic equation.
- The favoured side: products when the SA sits above the SB's conjugate acid on the table, i.e. K<sub>a</sub>(SA) > K<sub>a</sub>(conjugate acid of SB). Otherwise reactants.
- Optional: K<sub>eq</sub> = K<sub>a</sub>(SA) / K<sub>a</sub>(conjugate acid of SB). See open question (b).

**Canvas.** The booklet table as a ladder, acids on the left and bases on the right. Present entities are highlighted, and an arrow runs from the SA down to the SB. It slopes downhill when products are favoured and uphill when reactants are. This is the "upper-left to lower-right" picture teachers draw.

**Worked examples, for the tests.**
- CH₃COOH(aq) + NaHCO₃(aq). Entities: CH₃COOH, Na⁺, HCO₃⁻, H₂O.
  - SA CH₃COOH (1.8 × 10⁻⁵); SB HCO₃⁻ (conjugate acid H₂CO₃, 4.5 × 10⁻⁷).
  - CH₃COOH + HCO₃⁻ ⇌ CH₃COO⁻ + H₂CO₃, products favoured, K<sub>eq</sub> = 40.
- NH₄Cl(aq) + NaF(aq).
  - SA NH₄⁺ (5.6 × 10⁻¹⁰); SB F⁻ (conjugate acid HF, 6.3 × 10⁻⁴).
  - Reactants favoured, K<sub>eq</sub> = 8.9 × 10⁻⁷.
- NaHCO₃(aq) alone (a chem-level test case): HCO₃⁻ is both the SA and the SB. The result is 2 HCO₃⁻ ⇌ H₂CO₃ + CO₃²⁻, reactants favoured. This is the amphiprotic case the tests must pin.

**Teaching model.**
- Only the single strongest pair reacts: one proton transfer, no follow-on steps.
- Strong acids are levelled to H₃O⁺, and strong bases give OH⁻.
- No concentrations, so the sim gives no pH readout. `titration` covers that.

**Open questions for the owner.**
- (a) Is the solution list above right? Add or drop entries.
- (b) Show K<sub>eq</sub>, or only "products / reactants favoured"? Some Chemistry 30 resources teach K<sub>eq</sub> = K<sub>a</sub>/K<sub>a</sub> and some don't.
- (c) Label reactions with H₃O⁺ + OH⁻, or with a strong acid or strong base generally, as "quantitative (> 99.9 %)"? Or keep only "> 50 % / < 50 %"?

---

## 2. `fuel`: molar enthalpy of combustion by calorimetry (Unit A)

**Why.** The existing `calorimetry` sim is heat exchange between two objects (Q<sub>lost</sub> = Q<sub>gained</sub>). That is the Q = mcΔt groundwork, but it is not the Chemistry 30 calorimetry question. That question is: burn a measured mass of fuel under a can of water, then find the molar enthalpy from nΔ<sub>c</sub>H = −mcΔt, and the efficiency against the Δ<sub>f</sub>H° value.

**Controls.**
- The fuel: methanol, ethanol, pentane, octane, or butane (a lighter). Every one is in the Δ<sub>f</sub>H° table.
- The mass of fuel burned, 0.50–3.00 g.
- The water mass, 100–400 g, and its initial temperature.
- The apparatus: an open can or an insulated can.

**How the sim produces a "measured" Δt.** Heat reaching the water = efficiency × n × |Δ<sub>c</sub>H°|, with Δ<sub>c</sub>H° from `hess.js`. Each apparatus has a fixed, illustrative efficiency, e.g. open can 40 %, insulated 70 %. That is the only invented number, and it needs a DECISIONS row. Δt then follows from Q = mcΔt.

**Readouts, in the order a student works.**
1. Q = mcΔt, in kJ.
2. n = m/M, using `molarMass()`.
3. Experimental Δ<sub>c</sub>H = −Q/n, in kJ/mol.
4. Theoretical Δ<sub>c</sub>H° from Δ<sub>f</sub>H°, in kJ/mol.
5. Efficiency = Q / (n × |Δ<sub>c</sub>H°|), in %.

**Worked example (with water as H₂O(g), see question (a)).**
- Ethanol, 1.00 g, 200 g water, open can at 40 %.
- Δ<sub>c</sub>H° = 2(−393.5) + 3(−241.8) − (−277.6) = −1 234.8 kJ/mol.
- n = 1.00 / 46.08 = 0.0217 mol.
- Heat to the water = 0.40 × 0.0217 × 1 234.8 = 10.7 kJ, so Δt = 12.8 °C.
- The readouts recover −494 kJ/mol experimental (40 % of the theoretical value) and 40.0 % efficiency.

**Teaching model.**
- Complete combustion: no soot and no CO.
- The can's own heat capacity is ignored, since the booklet gives none for steel. The lost heat is lumped into the efficiency.

**Open questions for the owner.**
- (a) Water state in the theoretical Δ<sub>c</sub>H°: H₂O(g), as usually assumed for an open flame, or H₂O(l)? My recommendation is (g), with a toggle like `hess` has.
- (b) Fixed apparatus efficiencies, or an efficiency slider? A slider shows the answer the student is meant to compute, so I recommend fixed values.
- (c) Solution calorimetry (dissolving, neutralization) is left out. The booklet's Δ<sub>f</sub>H° table has no aqueous species, so the sim would have no theoretical value to compare against. Adding it needs a named non-booklet source.

---

## 3. `activation`: potential-energy diagram with E<sub>a</sub> and a catalyst (Unit A)

**Teaches.**
- The reactants, activated complex and products on a potential-energy diagram.
- E<sub>a</sub>(forward), E<sub>a</sub>(reverse) and ΔH, and the rule E<sub>a</sub>(reverse) = E<sub>a</sub>(forward) − ΔH.
- A catalyst lowers both activation energies by the same amount and leaves ΔH unchanged.

**Controls.**
- The reaction: the `hess` presets, so ΔH comes from Δ<sub>f</sub>H°.
- E<sub>a</sub>(forward): a slider, clamped so the activated complex sits above both reactants and products.
- A catalyst toggle.

**Readouts.**
- ΔH, from `hess.js`.
- E<sub>a</sub> forward and reverse, uncatalysed and catalysed.
- Exothermic or endothermic.

The canvas draws the uncatalysed curve plus a dashed catalysed curve, with the E<sub>a</sub> and ΔH arrows labelled.

**Worked example.** Haber process as written, ΔH = −91.8 kJ; with E<sub>a</sub>(forward) = 230 kJ, E<sub>a</sub>(reverse) = 321.8 kJ.

**Teaching model.** The booklet prints no activation energies, so E<sub>a</sub> is the student's input, and the catalyst's reduction is illustrative. Only ΔH is booklet data.

**Open questions for the owner.**
- (a) Build this as its own small sim, or as a mode on `hess`? My recommendation is its own sim: `hess` is already dense, and changing a built sim means re-checking its readouts.
- (b) The catalyst's reduction: a fixed fraction of E<sub>a</sub>, or a second slider?

---

## Also missing, not proposed yet

- Hess's law by combining given equations.
- Redox titration (MnO₄⁻ / Fe²⁺).
- A general spontaneity predictor for any two reagents.
- Organic reactions (already a TODO).
- ICE-table K<sub>c</sub> calculations.
- Polyprotic titrations (already a TODO).
- Buffers.
