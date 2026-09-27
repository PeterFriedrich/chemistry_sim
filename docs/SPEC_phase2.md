# Phase 2 proposals: Chemistry 30 sims (all approved and built)

The phase 1 sims cover one or two topics per Chemistry 30 unit. Three topics that come up often on the diploma exam have no sim yet. Each proposal is one sim, built on its own branch, and has to meet every criterion in SPEC_phase1.md §4–§5. **Nothing here is approved.** The owner approves, edits or drops each proposal and answers its open questions. Each approval then becomes a DECISIONS row, and each open question that gets answered becomes another.

The topic list comes from the Chemistry 30 unit titles and common diploma questions. It has **not** been checked against program-of-studies outcome codes; that is still an open TODO.

| # | Catalog id | Unit | Topic | Booklet data | New data needed |
|---|---|---|---|---|---|
| 1 | `bronsted` | D | Predicting Brønsted–Lowry reactions from the acid table | K<sub>a</sub> table (§1.9, in `acid-data.js`) | none |
| 2 | `fuel` | A | Molar enthalpy of combustion by calorimetry, and efficiency | specific heat of water, Δ<sub>f</sub>H°, molar masses (all transcribed) | an illustrative efficiency per apparatus |
| 3 | `activation` | A | Potential-energy diagram: E<sub>a</sub>, activated complex, catalyst | Δ<sub>f</sub>H° via `hess.js` presets | illustrative E<sub>a</sub> (the booklet prints none) |
| 4 | `spontaneity` | B | Predicting redox reactions (SOA/SRA) and their spontaneity from the redox table | electrode potentials (§1.7, in `redox-data.js`) | none |

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

## 2. `fuel`: molar enthalpy of combustion by calorimetry (Unit A) — APPROVED and built 2026-09-27

Approved by the owner ("Do fuel"), taking the recommended answers: (a) H₂O(g) with a toggle; (b) fixed efficiencies, open can 40 %, insulated can 70 %; (c) solution calorimetry left out. Added in the build: the thermometer reads to 0.1 °C and the readouts work from that reading; a setting that would boil the water shows no result.

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

## 3. `activation`: potential-energy diagram with E<sub>a</sub> and a catalyst (Unit A) — APPROVED and built 2026-09-27

Approved by the owner ("Yeah sure") with the recommendations: (a) its own sim; (b) a second slider for the catalysed E<sub>a</sub>, since questions give both values. An E<sub>a</sub> that would put the peak below the reactants or products shows an explanation instead of a diagram.

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

## 4. `spontaneity`: redox reaction predictor (Unit B) — APPROVED and built 2026-09-27

Approved by the owner ("yeah do it") with the recommendations: (a) the table's answer with a rate note; (b) no H₂SO₄, "acidified" adds H⁺ only; (c) ties by booklet row order, E°net = 0 non-spontaneous; (d) the list as proposed plus Na(s). (e) The observation grid is deferred (TODO). Added in the build: mixtures that would precipitate are declined, since two free pickers can form one.

**Why.** `voltaic` only pairs two bench half-cells, and `electrolysis` only predicts what an external supply forces. The most common Unit B question has no sim: "A strip of copper is placed in silver nitrate solution. Predict the reaction and whether it is spontaneous." It is the redox twin of `bronsted`, and uses the same kind of method.

**Teaches.** The Chemistry 30 SOA/SRA method:
1. List every entity present. Ionic compounds are written as their ions, "acidified" adds H⁺(aq), and H₂O(l) is always present.
2. Label each entity as an oxidizing agent (OA), a reducing agent (RA), or both, from the table. A multi-species OA such as MnO₄⁻ counts only when its partners (H⁺) are present too.
3. The SOA is the OA highest on the table, and the SRA is the RA lowest on it.
4. Write the reduction and oxidation half-reactions. Balance the electrons and add them to get the net equation.
5. E°net = E°(SOA) − E°(SRA). The reaction is spontaneous when the SOA is above the SRA on the table, i.e. E°net > 0.

**Controls.**
- Two reagents, each chosen from a fixed list (the same pattern as `bronsted`). Reagent 2 can be "none", which leaves reagent 1 and water only.
- Proposed list:
  - Metals: Ag(s), Cu(s), Pb(s), Sn(s), Ni(s), Fe(s), Zn(s), Al(s), Mg(s).
  - Solutions: AgNO₃, CuSO₄, Pb(NO₃)₂, SnCl₂, NiSO₄, FeSO₄, ZnSO₄, KI, KBr, NaCl, HCl, HNO₃, acidified KMnO₄, acidified K₂Cr₂O₇.
  - Halogens: Cl₂(g), Br₂(l), I₂(s).

**Readouts, all from a new `chem/spontaneity.js` that reuses `redox-data.js` and `netEquation()`.**
- Entities present.
- The OAs and RAs present, each with its E°, and the SOA and SRA marked.
- The reduction and oxidation half-reactions.
- The net equation.
- E°net, in V.
- Spontaneous or non-spontaneous.

Code change: `candidates()` moves from `chem/electrolysis.js` into `chem/redox.js`, since two sims would then use it. `electrolysis` behaviour is unchanged, and its tests pin that.

**Canvas.** The booklet table as a ladder, like `bronsted`: OAs on the left, RAs on the right, and only the rows holding a present entity, in table order with their E°. An arrow runs from the SOA to the SRA. It slopes downhill (upper-left to lower-right) when the reaction is spontaneous and uphill when it isn't.

**Worked examples, for the tests.** All were computed with the existing `redox.js` code and match the booklet by hand.

| Reagents | SOA (E°) | SRA (E°) | Net equation | E°net | Result |
|---|---|---|---|---|---|
| Cu(s) + AgNO₃(aq) | Ag⁺ (+0.80) | Cu (+0.34) | 2 Ag⁺ + Cu → 2 Ag + Cu²⁺ | +0.46 V | spontaneous |
| Cu(s) + ZnSO₄(aq) | Zn²⁺ (−0.76) | Cu (+0.34) | Zn²⁺ + Cu → Zn + Cu²⁺ | −1.10 V | non-spontaneous |
| Zn(s) + HCl(aq) | H⁺ (0.00) | Zn (−0.76) | 2 H⁺ + Zn → H₂ + Zn²⁺ | +0.76 V | spontaneous |
| Cu(s) + HCl(aq) | H⁺ (0.00) | Cu (+0.34) | 2 H⁺ + Cu → H₂ + Cu²⁺ | −0.34 V | non-spontaneous |
| Cu(s) + HNO₃(aq) | NO₃⁻/H⁺ (+0.80) | Cu (+0.34) | 2 NO₃⁻ + 4 H⁺ + Cu → N₂O₄ + 2 H₂O + Cu²⁺ | +0.46 V | spontaneous |
| acidified KMnO₄ + FeSO₄ | MnO₄⁻/H⁺ (+1.51) | Fe²⁺ (+0.77) | MnO₄⁻ + 8 H⁺ + 5 Fe²⁺ → Mn²⁺ + 4 H₂O + 5 Fe³⁺ | +0.74 V | spontaneous |
| Cl₂(g) + KI(aq) | Cl₂ (+1.36) | I⁻ (+0.54) | Cl₂ + 2 I⁻ → 2 Cl⁻ + I₂ | +0.82 V | spontaneous |

**Teaching model.**
- Standard conditions only, as in `voltaic`. The table predicts whether a reaction can happen, not how fast.
- Only the single SOA–SRA pair reacts: there are no follow-on reactions.
- Precipitation is not modelled. The proposed list avoids precipitating pairs where it can, e.g. there is no AgNO₃ with a halide; see (d).

**Open questions for the owner.**
- (a) **Where the table and the lab disagree.** Followed strictly, the table says acidified KMnO₄ alone oxidizes water (+1.51 over +1.23, E°net = +0.28 V), and Cl₂ in water does too. Should the sim:
  - show the table's answer with a note that the reaction is slow in practice (my recommendation, since this is what the method gives on an exam), or
  - leave those reagents out, the way `electrolysis` left out chlorides?
- (b) **Sulfuric acid.** With H₂SO₄ the table's SOA is SO₄²⁻/H⁺ (+0.17), not H⁺. Zn + H₂SO₄ then gives H₂SO₃, not H₂. My recommendation: leave H₂SO₄ off the list, and have "acidified" add H⁺(aq) with no named anion, which is how most questions word it.
- (c) **Ties on the table.** Ag⁺ and NO₃⁻/H⁺ are both +0.80 V, and O₂/H⁺ and Cr₂O₇²⁻/H⁺ are both +1.23 V. My recommendation: break a tie by the booklet's printed row order (higher row wins), and say so in the UI. E°net = 0 counts as non-spontaneous.
- (d) Is the reagent list right? Add or drop entries. One candidate is Na(s) in water: the table predicts H₂ and OH⁻ (+1.88 V).
- (e) **Optional second mode: "Build the table from observations."** Pick 3–4 metals and their ion solutions, see a grid of which pairs react, then rank the OAs. This is a common diploma question, and it would reuse the same `predict()`. Build it now, or later?

---

## Also missing, not proposed yet

- Redox titration (MnO₄⁻ / Fe²⁺).
- Organic reactions (already a TODO).
- ICE-table K<sub>c</sub> calculations.
- Polyprotic titrations (already a TODO).
- Buffers.
