# AUDIT LEDGER — what has been audited, when, and what came back

One row per **executed audit run**. This is the coverage map the audit docs
don't give individually: briefs are reusable *instruments*, findings docs record
*one run's output*, and the `project-audit` skill deliberately picks ONE target
per session — so nothing else says what has and hasn't been looked at. This does.

Rules: add a row when an audit **executes** (not when a brief is written); every
row carries a **pointer to the findings doc**; verdicts are **point-in-time** — a
row says the target was audited *as of that date*, not that it's still clean
after later changes. Not part of any session's mandatory reading — open it to
scope an audit or to check what has already been covered. Audits are framed
top-down, fundamental decisions first.

## Executed audits

| Date | Target / scope | Instrument | Output | Verdict (one line) | Outstanding |
|------|----------------|------------|--------|--------------------|-------------|
| 2026-09-26 | Readouts vs hand calculation, all 7 sims (defaults + slider extremes, live page text) | `project-audit` correctness checklist; scratch Node probes + Playwright readout dump | `docs/FINDINGS_readouts.md` | 2 FAIL (calorimetry equal-T float residue; lechatelier stress mid-shift), 2 WARN (titration Kb rounding + untested sim logic; `fmt()` gap at defaults), hess/voltaic/electrolysis/organic PASS | Fix both FAILs; owner decision on Kb rounding; move titration sig/indicator logic into `chem/`; owner walkthrough (SPEC §5.5) still open |
| 2026-09-27 | Chemistry 30 Unit B additions: `spontaneity` (all 405 reagent pairs) and all five `balancing` modes, plus `candidates()` moved to `redox.js` (code of PR #37) | `project-audit` correctness checklist; Node sweeps and ~40 targeted formula/equation probes; Playwright on the live page | `docs/FINDINGS_unitB.md` | 4 FAIL (typed species with two unfixed elements freezes the page; LiAlH₄/NaBH₄ wrong; `SO42-` read as SO₄₂⁻; fractional ONs give float coefficients), 5 WARN (MnO₄⁻/Cl⁻ table vs lab note; sim-side arithmetic; unverified precipitate list; catalog/legend currency; edge species); spontaneity sweep, half/net/preset ON modes PASS | 4 FAILs fixed 2026-09-27 (clock change approved); owner decision on the MnO₄⁻/Cl⁻ note; transcribe the solubility table |
| 2026-09-28 | Chemistry 20 Unit A data: `elements-data.js` ion charges, electronegativities, masses and names (111 elements) and `polyatomic-data.js` (34 ions) vs booklet PDF pp. 2–3 (live PDF re-fetched, unchanged) | `project-audit` correctness; pdf.js render at scale 4 read by eye, plus the PDF text layer matched to cells by position and compared field by field; seeded errors to test the comparison | `docs/FINDINGS_unitA_data.md` | 4 PASS (ions, en, masses/names, polyatomic: 0 differences), 2 WARN (the booklet's text layer types ClO as "CIO"; the mass column and hypochlorite `alt` are unguarded) | Extend the DATA_SHEET guards (TODO) |

## Queued — briefed, not yet run

Lined up 2026-09-28 for the next sessions, in this order (the owner may reorder). One per session (`project-audit`). Each entry is its own brief.
The sims not yet audited: `bronsted`, `fuel` and `activation` (Chemistry 30), and all of Chemistry 20 Unit A: `periodic`, `naming`, `bonding` (with v2, PR #47) and `forces`.

1. ~~**Chemistry 20 Unit A data transcription vs the booklet image.**~~ **Ran 2026-09-28**: see the executed row and `docs/FINDINGS_unitA_data.md`.
2. **Typed-input robustness, every text box.** Why: the Unit B audit found that typed input could freeze the page.
   - Scope: `naming`, `bonding`, `forces` and `balancing`.
   - Method: fuzz each chem entry point (`parseFormula`, `analyse`, `forcesOf`, the naming parsers) with junk, very long input, unbalanced brackets, lowercase, (aq)/(g), hydrates and 7+ heavy atoms. Pass means it returns `{ error }` quickly: no throw and no hang. Check that the page stays responsive in Playwright.
   - v2-specific: `isomers()` time at 6 heavy atoms with several halogens, and a condensed formula that has several C=O branches.
3. **`bonding` + `forces` correctness vs Chemistry 20 answers.** This includes v2.
   - Every example and pair, against the textbook's shape, bond type and polarity.
   - Isomer counts against known values.
   - v2 judgement calls: ClCH₂CH₂Cl, the cis/trans flag, whether unusual isomers such as CH₂=C=NH belong in the list, and the "about 120°" bent shape.
   - The S06 open calls: HF and BF past the 1.7 ΔEN cut-off, PH₃ nonpolar, and the forces thresholds.
   - Does the drawing match the readouts (lone pairs, bond orders) at 390 px?
4. **`naming` correctness.**
   - Round-trip every booklet metal with every booklet anion and polyatomic ion (formula → name → formula).
   - Roman numerals only where the booklet lists more than one charge.
   - Acids named both ways (IUPAC and classical); hydrates; binary molecular prefixes.
   - The S06 judgement calls (tetroxide, MnO₂/PbO₂, Hg⁺, the common-name list), checked against the Chemistry 20 texts.
5. **Chemistry 30 readouts vs hand calculation for the sims built after the 2026-09-26 run:** `bronsted`, `fuel` and `activation`. Use the same checklist as `FINDINGS_readouts.md`: defaults plus slider extremes, reading the live page text.
6. **`periodic` readouts.** Valence electrons, energy levels (Z ≤ 20), Lewis symbols, ion electrons and the matching noble gas, checked for every element against the student method, including the f-block and group 3 layout.

After these, the cross-cutting candidates below still stand.

## Never audited (candidates, roughly ranked)

- Sign conventions: ΔH and Q signs (system vs surroundings), E°cell = E°cathode − E°anode.
- The teaching models (ARCHITECTURE.md §7): does any of them teach something false at the edges of its sliders?
- Rendering tells the truth (canvas vs readouts at every slider setting, phone width) — not covered by the 2026-09-26 readouts run.
- Accessibility: keyboard use of every control, colour-only encodings on canvas (indicator colours especially).
