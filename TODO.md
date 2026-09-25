# TODO

The source of truth for what's left. Read first every session; update in place.

**Format contract** (`tools/todo_archive.py` depends on it): top-level items are
`- [ ]` / `- [x]` lines directly under `## Open work`; `###` sub-headings may
group them; closed items are moved to `docs/TODO_archive.md` by the tool, which
leaves a one-line stub under `## Done`. An open item can be stale — reproduce the
symptom before acting on it.

## Open work

### Needs the owner

- [ ] **Approve or edit the Chemistry 20 rows of the phase 1 sim list** (SPEC_phase1.md §3). The Chemistry 30 rows were approved 2026-09-25 (DECISIONS row). Record the Chemistry 20 approval as another DECISIONS row.
- [ ] **Supply the Chemistry 20 gas values** (R, STP/SATP definitions and molar volumes) and their source — the Data Booklet prints none of them (DATA_SHEET.md §1.5). Blocks `gaslaws`.

### Before tutoring with it

- [ ] **Owner walkthrough of every sim against hand calculations.** SPEC_phase1.md §5 criterion 5: default settings for each sim, compute the readouts by hand with the booklet, confirm they match. Done when each sim has a ✓ (or a bug filed) here. `calorimetry`: ☐ `hess`: ☐
- [ ] **Map sims to program-of-studies outcomes.** Units are matched by title only; check specific outcome codes against the Alberta Education programs of study before showing them on a page.

### Phase 1 simulations (one per bullet; propose each first — CLAUDE.md)

- [ ] Chemistry 20 A: `bonding` — electronegativity difference, bond type and polarity. Needs the periodic table transcribed (DATA_SHEET.md §1.3).
- [ ] Chemistry 20 B: `gaslaws` — blocked on the gas values above.
- [ ] Chemistry 20 C: `dilution` and `ph`.
- [ ] Chemistry 20 D: `stoichiometry` — limiting reagent. Needs molar masses transcribed.
- [ ] Chemistry 30 B: `voltaic` and `electrolysis` — needs the electrode potential table transcribed.
- [ ] Chemistry 30 C: `organic` — naming, qualitative.
- [ ] Chemistry 30 D: `lechatelier` and `titration` — needs the K<sub>a</sub> and indicator tables transcribed.

### Tidy-ups from the setup

- [ ] `site/js/lib/color.js` (wavelength → RGB) is inherited and unused; use it for flame colours / line spectra or delete it.

## Done

Closed items moved out of `## Open work` live in **`docs/TODO_archive.md`** — one line each below, reasoning there.

- [x] **Chemistry 30 A: `hess` — built 2026-09-25 with the full Δ<sub>f</sub>H° table (DATA_SHEET.md §1.6).** — BUILT 2026-09-25 · `docs/TODO_archive.md`
- [x] **Replace the physics colour tokens inherited in `site/css/style.css` / `lib/canvas.js` `theme()` (`--c-velocity` … `--c-total`) with a chemistry colour** · `docs/TODO_archive.md`

- [x] **Repo set up from physics_sim's apparatus, with the seed sim `calorimetry` (2026-09-25).**
- [x] **GitHub repo created and Pages enabled (source: GitHub Actions), 2026-09-25.**
