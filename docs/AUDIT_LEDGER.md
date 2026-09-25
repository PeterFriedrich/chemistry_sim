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

## Queued — briefed, not yet run

## Never audited (candidates, roughly ranked)

- Readouts vs hand calculations for every sim at default settings (SPEC_phase1.md §5) — the headline promise of the site.
- Sign conventions: ΔH and Q signs (system vs surroundings), E°cell = E°cathode − E°anode.
- The teaching models (ARCHITECTURE.md §7): does any of them teach something false at the edges of its sliders?
- Accessibility: keyboard use of every control, colour-only encodings on canvas (indicator colours especially).
