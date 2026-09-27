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
| 2026-09-27 | Chemistry 30 Unit B additions: `spontaneity` (all 405 reagent pairs) and all five `balancing` modes, plus `candidates()` moved to `redox.js` (code of PR #37) | `project-audit` correctness checklist; Node sweeps and ~40 targeted formula/equation probes; Playwright on the live page | `docs/FINDINGS_unitB.md` | 4 FAIL (typed species with two unfixed elements freezes the page; LiAlH₄/NaBH₄ wrong; `SO42-` read as SO₄₂⁻; fractional ONs give float coefficients), 5 WARN (MnO₄⁻/Cl⁻ table vs lab note; sim-side arithmetic; unverified precipitate list; catalog/legend currency; edge species); spontaneity sweep, half/net/preset ON modes PASS | Fix the 4 FAILs (clock change needs a proposal); owner decision on the MnO₄⁻/Cl⁻ note; transcribe the solubility table |

## Queued — briefed, not yet run

## Never audited (candidates, roughly ranked)

- Sign conventions: ΔH and Q signs (system vs surroundings), E°cell = E°cathode − E°anode.
- The teaching models (ARCHITECTURE.md §7): does any of them teach something false at the edges of its sliders?
- Rendering tells the truth (canvas vs readouts at every slider setting, phone width) — not covered by the 2026-09-26 readouts run.
- Accessibility: keyboard use of every control, colour-only encodings on canvas (indicator colours especially).
