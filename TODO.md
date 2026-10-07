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

### Before tutoring with it

- [ ] **Owner walkthrough of every sim against hand calculations.** SPEC_phase1.md §5 criterion 5: default settings for each sim, compute the readouts by hand with the booklet, confirm they match. Done when each sim has a ✓ (or a bug filed) here. `calorimetry`: ☐ `hess`: ☐ `voltaic`: ☐ `electrolysis`: ☐ `titration`: ☐ `lechatelier`: ☐ `organic`: ☐ `bronsted`: ☐ `fuel`: ☐ `activation`: ☐ `spontaneity`: ☐ `balancing`: ☐ `periodic`: ☐ `naming`: ☐ `bonding`: ☐ `forces`: ☐ `gaslaws`: ☐ `dissociation`: ☐
- [ ] **Map sims to program-of-studies outcomes.** Units are matched by title only; check specific outcome codes against the Alberta Education programs of study before showing them on a page.

### Phase 1 simulations (one per bullet; propose each first — CLAUDE.md)

- [ ] Chemistry 20 C: `dilution` and `ph`.
- [ ] Chemistry 20 D: `stoichiometry` — limiting reagent, plus a gas-volume mode for combining volumes (Avogadro: volume ratio = mole ratio at the same T and P; review package pp. 2–4, owner 2026-10-02). Molar masses are in (DATA_SHEET.md §1.8, `molarMass()` in `chem/electrolysis.js`).
- [ ] Chemistry 30 C: `organic` beyond phase 1 — rings and benzene, carboxylic acids, esters, diols, branched substituents (isopropyl), cis/trans; and organic reactions (addition, substitution, elimination, esterification, polymerization). Propose first.
- [ ] Chemistry 30 B: `spontaneity` "build the table from observations" mode — pick 3–4 metals and their ion solutions, a grid of which pairs react, then rank the OAs (SPEC_phase2.md §4 (e), deferred 2026-09-27). Offer to the owner; reuses `predict()`.
- [ ] Chemistry 30 D: polyprotic titrations (CO₃²⁻ with HCl, H₃PO₄ with NaOH: two or more equivalence points) — deferred from `titration` by the owner, 2026-09-25. Propose first.

### From the 2026-09-26 readouts audit (docs/FINDINGS_readouts.md)

- [ ] **Owner: should K<sub>b</sub> = K<sub>w</sub>/K<sub>a</sub> be rounded to 2 sf in `titration`?** ~17 % of weak-analyte settings differ by 0.01 pH between the two methods; defaults agree. Record as a DECISIONS row either way.
- [ ] `titration`: move `sigOf` and the shown-pH indicator comparison from `sims/titration.js` into `chem/titration.js` with tests.

### From the 2026-09-27 Unit B audit (docs/FINDINGS_unitB.md)

- [ ] **Owner: `spontaneity` with acidified MnO₄⁻ and Cl⁻**: keep the table's answer with a note that says Cl⁻ is oxidized in the lab, or leave the pair out (as `electrolysis` left chlorides out).
- [ ] Derive `spontaneity`'s precipitate list from the solubility table, now transcribed (DATA_SHEET.md §1.13, `solubility()` in `chem/dissociation.js`); Ag₂SO₄ is unchecked today.
- [ ] `balancing` tidy-ups: catalog summary; per-mode legend; per-atom change computed in `chem/`; peroxo-anions, NH₄⁺ in base, and the "disproportionation" wording for Fe + Fe³⁺.

### From the 2026-09-28 Unit A data audit (docs/FINDINGS_unitA_data.md)

- [ ] Extend the DATA_SHEET guards: compare §1.8's mass column with `M`/`isotope` (today only spot-checked), and §1.12's "or ClO⁻" with `alt`. Build Pb's expected value from `M`, not a literal (the audit's own script missed a seeded Pb error that way). Optionally print Pb as `207.2*` in §1.8.

### Tidy-ups from the setup

- [ ] **`fmt()` hides significant figures in round numbers ≥ 10<sup>sig</sup>**: `fmt(1000, 3)` prints "1000", not "1.00 × 10³" (toPrecision's e-notation is converted back on purpose). Changing it alters readouts in every sim (e.g. calorimetry's joules), so propose first. `lechatelier`'s chromate preset was chosen to avoid it. It already shows at `electrolysis` defaults ("1800 s", "1800 C") and in `hess` at n = 1 mol (propane "−2220 kJ"); full list in docs/FINDINGS_readouts.md.
- [ ] `site/js/lib/color.js` (wavelength → RGB) is inherited and unused; use it for flame colours / line spectra or delete it.

## Done

Closed items moved out of `## Open work` live in **`docs/TODO_archive.md`** — one line each below, reasoning there.

- [x] **Chemistry 20 C: `dissociation` — built 2026-10-07 (SPEC_chem20.md §2, DECISIONS row): ions in water, equations, [ion] = count × c, electrolytes, solub** — BUILT 2026-10-07 · `docs/TODO_archive.md`

- [x] **Chemistry 20 B: `gaslaws` — built 2026-10-02 (SPEC_chem20.md §1, DECISIONS row): gas laws, PV = nRT and molar volume, lab analysis; KMT as particles a** — BUILT 2026-10-02 · `docs/TODO_archive.md`

- [x] **Supply the Chemistry 20 gas values** — CLOSED 2026-10-02 · `docs/TODO_archive.md`

- [x] **Chemistry 20 A: `bonding` v2 — molecules with more than one central atom (CH₃CH₂OH, CH₃CN) and structural isomers — built 2026-09-28 (DECISIONS row).** — BUILT 2026-09-28 · `docs/TODO_archive.md`
- [x] **Chemistry 20 A: intermolecular forces (London, dipole–dipole, hydrogen bonding) and boiling-point trends — built 2026-09-28 as `forces` (DECISIONS row** — BUILT 2026-09-28 · `docs/TODO_archive.md`

- [x] **Chemistry 20 A: `bonding` — electronegativity difference, bond type and polarity. Built 2026-09-28 with Lewis structures and VSEPR shapes (DECISIONS r** — BUILT 2026-09-28 · `docs/TODO_archive.md`

- [x] **Fix the 4 FAILs in `balancing`** — 2026-09-27 · `docs/TODO_archive.md`

- [x] **Approve, edit or drop the phase 2 Chemistry 30 proposals** — all three approved and built: `bronsted` 2026-09-26, `fuel` and `activation` 2026-09-27 (SPEC_phase2.md, DECISIONS rows) · `docs/TODO_archive.md`

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
