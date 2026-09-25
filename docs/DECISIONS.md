# Decisions Index

Append-only. **One ROW per locked decision** — when, what, why (including what
was rejected), and a pointer to where the argument lives in full. When a decision
locks, add a row; when one is superseded, strike it (`~~...~~`) or mark it
`SUPERSEDED <date>` in place and add the successor — don't delete history.

**What a row owes you:**

1. ⚠️ **EVERY ROW CARRIES A POINTER TO A DOC** — not only to code. Code moves;
   the argument has to live somewhere prose can hold it.
   `scripts/check_doc_citations.py` checks that every pointer resolves.
2. **The row is a self-contained summary** and may paraphrase the argument.
3. **The pointer is the authority.** When a row and its target disagree, the
   target wins and the row gets fixed.
4. **A row names the test that protects it** (`test_x`, the ID opening a
   `test(...)` title in `tests/*.test.js`; `verify-x.js`; `check_x.py`), or
   carries `[unverifiable]`. `scripts/check_decisions_log.py` enforces this on
   the merge gate (and that a superseded row is marked where it stands).

| When | Decision | Full reasoning |
|------|----------|----------------|
| 2026-09-25 | **Constants and tables are the Alberta Chemistry 30 Data Booklet values** ("Updated 2010"), not CODATA or a handbook. Students check readouts against hand calculations done with the booklet; a more precise value would make a correct student answer look wrong in the third significant figure. Values the booklet does not print (R, molar volumes) need a named source before use. Protected by `test_constants_match_alberta_data_booklet`. | DATA_SHEET.md §1 |
| 2026-09-25 | **Same apparatus as physics_sim**: static site, ES modules, no build step and no npm dependencies; offline merge gate (node:test + stdlib Python guards); GitHub Pages deploy with content-hash cache busting; the pre-push merged-branch guard. Copied rather than shared (a template or package), because the two sites will diverge in their lib helpers and a shared dependency would add a toolchain. Protected by `test_catalog_every_sim_module_exports_page_contract`, `test_build_site_every_module_is_in_the_import_map_with_its_content_hash`, `test_at_most_three_handoffs_at_top_level`. | ARCHITECTURE.md §1 |
| 2026-09-25 | **Every on-screen number traces to a tested function in `site/js/chem/`**; sim modules only wire controls and draw, and particle animations feed no readout. No mechanical check that a sim does not compute a readout inline — review catches it. [unverifiable] | ARCHITECTURE.md §2 |
| 2026-09-25 | **Calorimetry uses a perfect calorimeter** (cup absorbs nothing, nothing escapes), matching the textbook assumption; the on-screen approach to equilibrium is animation only. Protected by `test_calorimetry_heat_lost_equals_heat_gained`, `test_calorimetry_final_temperature_worked_example`. | ARCHITECTURE.md §7 |
| 2026-09-25 | **Chemistry 30 phase 1 sims approved as proposed** (owner): A `calorimetry` + `hess`, B `voltaic` + `electrolysis`, C `organic` (naming, qualitative), D `lechatelier` + `titration`. `hess` is built first. Chemistry 20 rows stay proposed. A scope choice, not a number — [unverifiable] | SPEC_phase1.md §3 |
| 2026-09-25 | **`hess` computes Δ<sub>r</sub>H° from the Data Booklet Δ<sub>f</sub>H° table over fixed, balanced presets** (no free equation entry), elements at 0, and prints sums to 0.1 kJ by the addition rule. Booklet values give −890.5 kJ for methane combustion, not the −890.3 kJ quoted in texts that use other data. Protected by `test_formation_table_matches_alberta_data_booklet`, `test_hess_methane_combustion_worked_example`, `test_hess_presets_are_balanced_and_in_the_booklet`, `test_format_fixed_decimal_places_like_the_booklet`. | ARCHITECTURE.md §7 |
| 2026-09-25 | **`voltaic` uses the Data Booklet electrode potential table at standard conditions only** (no Nernst correction): E°cell = E°cathode − E°anode with both read as reduction potentials, the higher E° as the cathode, and the net equation scaled so electrons lost = electrons gained. Offered half-cells are bench metal \| ion couples plus hydrogen. Protected by `test_redox_table_matches_alberta_data_booklet`, `test_redox_every_half_reaction_balances`, `test_voltaic_zinc_copper_worked_example`, `test_voltaic_electron_balance`. | ARCHITECTURE.md §7 |
| 2026-09-25 | **`electrolysis` predicts products strictly from the Data Booklet redox table** (SOA/SRA among all species present, water included) and **leaves chloride electrolytes out** (owner): the table predicts O₂ at the anode where Cl₂ actually forms by overvoltage, and a sim should not show the table and the lab disagreeing. Faraday stoichiometry uses the booklet's F and periodic-table molar masses; time is entered in min and converted to s. Protected by `test_electrolysis_copper_sulfate_predicts_soa_and_sra`, `test_electrolysis_predictions_follow_the_table`, `test_electrolysis_faraday_worked_example`, `test_elements_molar_masses_match_alberta_data_booklet`. | ARCHITECTURE.md §7 |
| 2026-09-25 | **`titration` covers monoprotic analytes only** (owner): strong acid, weak acid, strong base and NH₃, titrated 1 : 1 with NaOH(aq) or HCl(aq); polyprotic titrations are a separate TODO. Readouts follow the student method with the Data Booklet K<sub>a</sub> and K<sub>w</sub>, including its approximation rule (c > 1000 K, otherwise the quadratic), and an indicator fits when a printed range contains the equivalence pH. Protected by `test_acid_table_matches_alberta_data_booklet`, `test_acid_table_pairs_differ_by_one_proton`, `test_indicator_table_matches_alberta_data_booklet`, `test_titration_weak_acid_worked_example`, `test_titration_weak_base_worked_example`, `test_titration_strong_acid_strong_base_worked_example`, `test_titration_follows_the_booklet_approximation_rule`, `test_titration_indicator_choice`. | ARCHITECTURE.md §7 |
| 2026-09-25 | **The titration curve is exact and only drawn; the pH between marked points is a graph reading** (owner): no Chemistry 30 hand method gives pH in the buffer region, so it is shown to 0.1 and labelled "read from graph", never as a readout. Protected by `test_titration_exact_curve_agrees_with_the_student_method`. | ARCHITECTURE.md §7 |
