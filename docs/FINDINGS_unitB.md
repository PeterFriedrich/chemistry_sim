# Findings: Chemistry 30 Unit B additions (2026-09-27)

**Target.** Everything built for Unit B this session: `spontaneity` (`chem/spontaneity.js`) and all five `balancing` modes (`chem/balancing.js`):
- assign oxidation numbers in one species;
- balance a half-reaction;
- net ionic equation from two half-reactions;
- balance using oxidation numbers, with a typed skeleton equation;
- oxidation numbers in a reaction.

It also covers the move of `candidates()` into `redox.js`. The run used the code of PR #37 (typed equations), which was open at the time.

**Instrument.** `project-audit` family (b), correctness. The probes:
- a Node sweep of all 405 `spontaneity` reagent pairs;
- about 40 hand-picked typed formulas and equations aimed at the parser and the rules;
- Playwright on the live page to confirm each FAIL.

## Summary

| # | Verdict | Where | One line |
|---|---|---|---|
| 1 | **FAIL** | `balancing` typed equation | A species the rules cannot fix (Cu(NO₃)₂, MnSO₄) makes `pairHalves` throw, and the whole page freezes until reloaded |
| 2 | **FAIL** | `balancing` assign | LiAlH₄ and NaBH₄ give Al −5 and B −5, with H +1 (should be +3, +3 and H −1) |
| 3 | **FAIL** | `balancing` assign | `SO42-`, `CO32-` and `Cr2O72-` read as SO₄₂⁻ etc., giving S +83, C +63, Cr +71.5 |
| 4 | **FAIL** | `balancing` typed ON balancing | A fractional average oxidation number (Fe₃O₄) gives float electrons and coefficients around 10¹⁶ |
| 5 | WARN | `spontaneity` | Acidified MnO₄⁻ with Cl⁻ (HCl, NaCl): the table picks water as the SRA, but the lab gives Cl₂; the note says only "too slow to see" |
| 6 | WARN | `balancing` ON balancing | The per-atom change "e⁻ per Mn" is computed in the sim (`Math.abs(h.to - h.from)`), not in `chem/` |
| 7 | WARN | `spontaneity` precipitates | Ag⁺ with SO₄²⁻ is not declined; the booklet's solubility table is not transcribed, so the list is unchecked |
| 8 | WARN | docs / UI | The `balancing` catalog summary omits the single-species and oxidation-number-balancing modes; the canvas legend (OA/RA, balanced) is shown in modes where it means nothing |
| 9 | WARN | edges | Na₂S₂O₈ gives S +7 by the rules (textbooks give +6, with a peroxide O); NO₃⁻ → NH₄⁺ in basic solution leaves NH₄⁺ beside OH⁻; Fe + Fe³⁺ → Fe²⁺ is refused as a "disproportionation" (it is the reverse) |
| — | PASS | `spontaneity` | All 405 pairs: 14 declined as precipitates, 9 "no net reaction", 382 with a net equation that balances in atoms and charge; spontaneous ⇔ E°net > 0 in every case; ties and water flag as decided |
| — | PASS | `balancing` half / net / preset ON | Every skeleton balances in both media; the oxidation-number method equals the half-reaction method for every skeleton pair (tested); the algebra lines and rule ids behave as their tests say |
| — | PASS | `redox.js` `candidates()` move | `electrolysis` predictions unchanged; its tests pass |

## 1. FAIL — a typed species the rules cannot fix freezes the page

**Finding.** `pairHalves()` calls `oxidationNumbers()`. For a compound with two elements that no rule fixes, `oxidationNumbers()` throws: "Oxidation numbers of Cu(NO3)2 are not set by the rules". A molecular equation such as `Cu + HNO3 -> Cu(NO3)2 + NO + H2O`, or `KMnO4 + FeSO4 -> MnSO4 + Fe2(SO4)3`, is exactly what a student will type.

The throw happens inside the draw callback. `lib/clock.js` calls `frame(clock, dSim)` before `requestAnimationFrame(tick)`, so the animation loop dies. On the page:
- one error is reported;
- after that, no control does anything, and switching mode leaves the old controls hidden.

**Fix.**
- **Chem.** `pairHalves()` uses `assignSteps()` and returns `{ error }`: "Cu(NO₃)₂ has two elements no rule fixes; write the equation as net ionic (Cu²⁺, NO₃⁻)".
- **Shared `lib/clock.js`.** Schedule the next frame before calling `frame()`, so one bad frame can never freeze a sim. This changes a shared helper, so it needs a proposal first.

## 2. FAIL — H in a complex metal hydride

**Finding.** The rules are applied in priority order. H +1 is assigned whenever another element is still left. So in LiAlH₄, Li +1 and H +1 are fixed first, and the sum gives Al = 0 − 1 − 4 = −5. The page shows "Li +1, Al −5, H +1" and a ✓ on the Σ check. NaBH₄ gives B −5.

My claim that the exceptions come out of the rule order without special cases is wrong here: it only holds when H is the last element.

**Fix.** H is −1 when every other element in the species is a metal (or B). Add a test for LiAlH₄, NaBH₄ and CaH₂.

## 3. FAIL — `SO42-` read as SO₄₂⁻

**Finding.** `parseSpecies('SO42-')` gives `SO42^-`. Only a caret, a space or brackets separate a multi-digit charge, so the page shows "Read as SO₄₂⁻" and "S +83". Typing the charge straight after the subscript is the commonest way to write it, and the "Read as" line is easy to miss.

**Fix.** Refuse a formula of more than one element whose last number is two or more digits followed directly by a sign. Say: "Ambiguous: write SO4^2- or SO4 2-". (`NO3-` and `Fe3+` stay as they are.)

## 4. FAIL — fractional oxidation numbers in typed oxidation-number balancing

**Finding.** In `balanceByOxidationNumbers()`, `e = Math.abs(to - from) * atoms`. For Fe₃O₄ → Fe³⁺, that is (3 − 8/3) × 3 = 1.0000000000000004. The least common multiple and the multipliers then run on floats, and the page shows coefficients like "11258999068426240 Fe₃O₄". The charge check still shows ✓, because every side is equally wrong.

**Fix.** Compute electrons from integer totals: the key element's total oxidation number in a·from and in b·to are integers, so e is their difference. Show a fractional per-atom change as a fraction, as the assign mode already does.

## 5. WARN — table versus lab for MnO₄⁻ with Cl⁻

**Finding.** With HCl or NaCl plus acidified KMnO₄:
- the SOA is MnO₄⁻ (+1.51), and the SRA is H₂O (+1.23), below Cl⁻ (+1.36);
- the sim predicts water is oxidized to O₂, with the rate note;
- in the lab, Cl₂ forms.

Cl₂ with water is similar. The owner approved "the table's answer with a rate note" (SPEC_phase2 §4 (a)). But the note says the reaction "may be too slow to see" and does not say the next reducing agent reacts instead. `electrolysis` left chlorides out for this same kind of disagreement.

**Owner decision.** Either keep the prediction and change the note, e.g. "In the lab the next reducing agent, Cl⁻, is oxidized instead", or leave out chloride with acidified MnO₄⁻.

## 6–9. WARN (smaller)

- **6.** Move the per-atom change into `balanceByOxidationNumbers()`, as `per: { num, den }`. This is part of the fix for 4.
- **7.** Transcribe the booklet's solubility table (DATA_SHEET §1.3, p. 6), then derive `PRECIPITATES` from it instead of a hand list.
- **8.**
  - Update the `balancing` catalog summary.
  - Give each mode its own legend, or hide the legend where it does not apply.
- **9.**
  - Refuse peroxo-oxyanions such as Na₂S₂O₈ (or accept +7 and say so).
  - Change the NO₃⁻ → NH₄⁺ basic case to NH₃, or keep NH₄⁺ acidic-only.
  - Change the pairing error to "an element in two species on one side".

## What this run got wrong

- **An earlier claim of mine.** I said this session that "the priority order gives the exceptions without special cases" (DECISIONS row for the single-species mode, and in chat). Finding 2 shows that is false for complex hydrides.
- **A stale readout.** The first Playwright probe typed an equation after the page had already frozen, and it printed stale readouts. I nearly recorded "Fe₃O₄: nothing shown" as a separate bug before seeing that the loop was dead. The Fe₃O₄ finding is from a fresh page.
- **What the sweep checks.** The `spontaneity` sweep checks internal consistency (balanced, sign ⇔ E°net > 0), not agreement with a hand-worked prediction for every pair. Only the 7 worked examples and about 15 spot pairs were checked against the booklet by hand.
- **Formula coverage.** The free-entry probe is about 40 chosen formulas, not systematic, so other rule-order failures may exist beyond hydrides.
