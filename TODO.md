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
- [ ] **Approve, edit or drop the remaining phase 2 Chemistry 30 proposals** (`fuel`, `activation`; `bronsted` approved and built 2026-09-26) and answer their open questions — docs/SPEC_phase2.md. Each approval is a DECISIONS row.
- [ ] **Supply the Chemistry 20 gas values** (R, STP/SATP definitions and molar volumes) and their source — the Data Booklet prints none of them (DATA_SHEET.md §1.5). Blocks `gaslaws`.

### Before tutoring with it

- [ ] **Owner walkthrough of every sim against hand calculations.** SPEC_phase1.md §5 criterion 5: default settings for each sim, compute the readouts by hand with the booklet, confirm they match. Done when each sim has a ✓ (or a bug filed) here. `calorimetry`: ☐ `hess`: ☐ `voltaic`: ☐ `electrolysis`: ☐ `titration`: ☐ `lechatelier`: ☐ `organic`: ☐ `bronsted`: ☐
- [ ] **Map sims to program-of-studies outcomes.** Units are matched by title only; check specific outcome codes against the Alberta Education programs of study before showing them on a page.

### Phase 1 simulations (one per bullet; propose each first — CLAUDE.md)

- [ ] Chemistry 20 A: `bonding` — electronegativity difference, bond type and polarity. Needs the periodic table transcribed (DATA_SHEET.md §1.3).
- [ ] Chemistry 20 B: `gaslaws` — blocked on the gas values above.
- [ ] Chemistry 20 C: `dilution` and `ph`.
- [ ] Chemistry 20 D: `stoichiometry` — limiting reagent. Molar masses are in (DATA_SHEET.md §1.8, `molarMass()` in `chem/electrolysis.js`).
- [ ] Chemistry 30 C: `organic` beyond phase 1 — rings and benzene, carboxylic acids, esters, diols, branched substituents (isopropyl), cis/trans; and organic reactions (addition, substitution, elimination, esterification, polymerization). Propose first.
- [ ] Chemistry 30 D: polyprotic titrations (CO₃²⁻ with HCl, H₃PO₄ with NaOH: two or more equivalence points) — deferred from `titration` by the owner, 2026-09-25. Propose first.

### From the 2026-09-26 readouts audit (docs/FINDINGS_readouts.md)

- [ ] **Owner: should K<sub>b</sub> = K<sub>w</sub>/K<sub>a</sub> be rounded to 2 sf in `titration`?** ~17 % of weak-analyte settings differ by 0.01 pH between the two methods; defaults agree. Record as a DECISIONS row either way.
- [ ] `titration`: move `sigOf` and the shown-pH indicator comparison from `sims/titration.js` into `chem/titration.js` with tests.

### Tidy-ups from the setup

- [ ] **`fmt()` hides significant figures in round numbers ≥ 10<sup>sig</sup>**: `fmt(1000, 3)` prints "1000", not "1.00 × 10³" (toPrecision's e-notation is converted back on purpose). Changing it alters readouts in every sim (e.g. calorimetry's joules), so propose first. `lechatelier`'s chromate preset was chosen to avoid it. It already shows at `electrolysis` defaults ("1800 s", "1800 C") and in `hess` at n = 1 mol (propane "−2220 kJ"); full list in docs/FINDINGS_readouts.md.
- [ ] `site/js/lib/color.js` (wavelength → RGB) is inherited and unused; use it for flame colours / line spectra or delete it.

## Done

Closed items moved out of `## Open work` live in **`docs/TODO_archive.md`** — one line each below, reasoning there.

- [x] **FAIL `lechatelier`: a stress pressed before the last shift settles uses the animation's transient as "before"** — 2026-09-26 · `docs/TODO_archive.md`

- [x] **Chemistry 30 D: `bronsted` — built 2026-09-26: Brønsted–Lowry reaction predictor from the booklet acid table (SPEC_phase2.md §1).** — BUILT 2026-09-26 · `docs/TODO_archive.md`

- [x] **FAIL `calorimetry`: equal starting temperatures print float residue** — 2026-09-26 · `docs/TODO_archive.md`

- [x] **Chemistry 30 C: `organic` — built 2026-09-25: acyclic alkanes, alkenes, alkynes, organic halides and alcohols with one –OH, IUPAC 1993 names (owner).** — BUILT 2026-09-25 · `docs/TODO_archive.md`

- [x] **Chemistry 30 D: `lechatelier` — built 2026-09-25 with the ion colour table (DATA_SHEET.md §1.11); illustrative K<sub>c</sub> presets and temperature f** — BUILT 2026-09-25 · `docs/TODO_archive.md`

- [x] **Chemistry 30 D: `titration` — built 2026-09-25, monoprotic only (owner), with the K<sub>a</sub> and indicator tables (DATA_SHEET.md §1.9, §1.10).** — BUILT 2026-09-25 · `docs/TODO_archive.md`

- [x] **Chemistry 30 B: `electrolysis` — built 2026-09-25, with the periodic table's molar masses (DATA_SHEET.md §1.8).** — BUILT 2026-09-25 · `docs/TODO_archive.md`

- [x] **Chemistry 30 B: `voltaic` — built 2026-09-25 with the full electrode potential table (DATA_SHEET.md §1.7).** — BUILT 2026-09-25 · `docs/TODO_archive.md`

- [x] **Chemistry 30 A: `hess` — built 2026-09-25 with the full Δ<sub>f</sub>H° table (DATA_SHEET.md §1.6).** — BUILT 2026-09-25 · `docs/TODO_archive.md`
- [x] **Replace the physics colour tokens inherited in `site/css/style.css` / `lib/canvas.js` `theme()` (`--c-velocity` … `--c-total`) with a chemistry colour** · `docs/TODO_archive.md`

- [x] **Repo set up from physics_sim's apparatus, with the seed sim `calorimetry` (2026-09-25).**
- [x] **GitHub repo created and Pages enabled (source: GitHub Actions), 2026-09-25.**
