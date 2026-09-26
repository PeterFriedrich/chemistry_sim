# TODO — archive of CLOSED items

Closed work moved out of `TODO.md` so the file that is read at the start of **every** session carries only live work. **Nothing here is a to-do.**

`TODO.md`'s `## Done` section keeps a one-line entry for each of these, so the *never redo a closed item without asking* rule still works by grepping there; this file holds the reasoning behind each one.

Items are verbatim as they were closed, newest-moved first in the order they appeared in `TODO.md`. Line numbers and "next up" markers inside them are historical — do not act on them.

---

- [x] **Chemistry 30 D: `bronsted` — built 2026-09-26: Brønsted–Lowry reaction predictor from the booklet acid table (SPEC_phase2.md §1).**

- [x] **FAIL `calorimetry`: equal starting temperatures print float residue** (Δt = −3.55 × 10⁻¹⁵ °C, e.g. 10 g Cu / 63 g water both at 30.0 °C). Snap Δt in a tested `chem/calorimetry.js` helper; test Δt = Q = 0. — FIXED 2026-09-26: `finalTemperature` returns t1 exactly when t1 = t2 (the only case with residue; unequal starts give real Δt), `test_calorimetry_equal_start_temperatures_give_zero_change`.

- [x] Chemistry 30 C: `organic` — built 2026-09-25: acyclic alkanes, alkenes, alkynes, organic halides and alcohols with one –OH, IUPAC 1993 names (owner).

- [x] Chemistry 30 D: `lechatelier` — built 2026-09-25 with the ion colour table (DATA_SHEET.md §1.11); illustrative K<sub>c</sub> presets and temperature factor (owner).

- [x] Chemistry 30 D: `titration` — built 2026-09-25, monoprotic only (owner), with the K<sub>a</sub> and indicator tables (DATA_SHEET.md §1.9, §1.10).

- [x] Chemistry 30 B: `electrolysis` — built 2026-09-25, with the periodic table's molar masses (DATA_SHEET.md §1.8).

- [x] Chemistry 30 B: `voltaic` — built 2026-09-25 with the full electrode potential table (DATA_SHEET.md §1.7).

- [x] Chemistry 30 A: `hess` — built 2026-09-25 with the full Δ<sub>f</sub>H° table (DATA_SHEET.md §1.6).

- [x] Replace the physics colour tokens inherited in `site/css/style.css` / `lib/canvas.js` `theme()` (`--c-velocity` … `--c-total`) with a chemistry colour code once the second sim needs one (ARCHITECTURE.md §5).
