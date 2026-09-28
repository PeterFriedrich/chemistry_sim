# Findings: Chemistry 20 Unit A data vs the booklet (2026-09-28)

**Target.** Queued audit 1 in `docs/AUDIT_LEDGER.md`: the booklet data that `naming`, `bonding` and `forces` read.
- `site/js/chem/elements-data.js`: ion charges and electronegativities for all 111 elements (DATA_SHEET §1.8). Molar masses and names were checked too, because the same pass reads them.
- `site/js/chem/polyatomic-data.js`: the 34 ions of the Table of Common Polyatomic Ions (§1.12).

**Source.** The Chemistry 30 Data Booklet PDF, fetched again from the DATA_SHEET URL on 2026-09-28. Its md5 is `f2d3fb56…` and its size is 556 738 bytes, the same file the earlier sessions used, so the booklet has not changed since the transcription.

**Instrument.** `project-audit` family (b), correctness. Two independent readings of PDF pp. 2–3, compared with the code:
1. **The image.** pdf.js in headless Chromium rendered pp. 2–3 at scale 4 (2448 × 3168 px), and each cell was read by eye.
2. **The PDF's own text layer** (pdf.js `getTextContent`, with positions), which is not the same as the pypdf extraction S06 found garbled. Each item was assigned to a cell by its position relative to the atomic number, then the cell's symbol, name, molar mass, ion charges and electronegativity were compared field by field with `elements-data.js`. The polyatomic table was grouped by row, with subscripts and superscripts as separate items.

The scratch scripts (`cmp.mjs`, `text.cjs`) were not committed. The method is the S06 one, with the text-layer comparison added.

## Summary

| # | Verdict | Where | One line |
|---|---|---|---|
| 1 | **PASS** | `elements-data.js` `ions` | All 111 cells match the booklet in value and in printed order, including H "1+, 1−" and every "—" |
| 2 | **PASS** | `elements-data.js` `en` | All 111 match, including "—" for the noble gases except Xe, Pm, Eu, Tb, Yb and Am–Lr, and blank for Rf–Rg. There are 85 values |
| 3 | **PASS** | `elements-data.js` `M`, `name`, `isotope` | All 111 masses match, including the bracketed isotopes and Pb "207.2*"; all 111 names match (aluminium, cesium) |
| 4 | **PASS** | `polyatomic-data.js` | All 34 ions match in name, formula, charge and order (three columns, read down), including hypochlorite "OCl⁻ or ClO⁻" |
| 5 | WARN | the booklet's text layer | The four chlorine oxyanions are typed **"CIO"** (capital i) in the PDF text: ClO₄⁻, ClO₃⁻, ClO₂⁻ and the "or ClO⁻" form. They look identical when rendered. The code has Cl, which is correct. Anyone re-transcribing from extracted text would get iodine |
| 6 | WARN | guard coverage | The DATA_SHEET ↔ code guards cover `ions`, `en` and the polyatomic name/formula/charge. They do **not** cover molar masses (only spot checks in `test_elements_molar_masses_match_alberta_data_booklet`) or the hypochlorite `alt` form. DATA_SHEET prints lead as "207.2" without the booklet's asterisk |

**No FAIL.** Nothing in the data that `naming`, `bonding` and `forces` read differs from the booklet, so audits 3 and 4 can take the data as given.

## Details

### 1–3. Periodic table (PDF pp. 2–3)
The text-layer comparison found **0 differences** across 111 cells × 5 fields.
- Two items were flagged but are formatting only:
  - H's charge is typed with an en dash ("1+,1–"). The code stores `[1, -1]`.
  - Four long names (molybdenum, praseodymium, rutherfordium, seaborgium) are set in a smaller font, so the first pass missed them. The strings match.
- The eye pass over the image agreed cell by cell. The cells most likely to be misread were each checked in the image:
  - Mn, Co, Ni, Pd and Tl put the lower charge first ("2+, 4+", "1+, 3+").
  - Sb, Bi and Pu put the higher charge second.
  - Md and No give "2+, 3+".
  - Rf gives 4+ with no electronegativity.

### 4. Polyatomic ions (PDF p. 2)
All 34 match the code in order. The text layer gives each charge as a separate superscript item ("2 –", "3 –"), and every one matches `charge`. Ammonium is the only cation.

### 5. "CIO" in the text layer
The PDF text for perchlorate, chlorate and chlorite is `CIO` + subscript, and hypochlorite reads `OCl – or CIO –`. In the booklet's sans-serif font, capital I and lowercase l are the same glyph, so the rendered page reads ClO. This is a booklet typesetting slip, not a code error. It is a reason to keep the S06 rule ("read from the image, cross-check the text") the right way round: the text layer can be wrong in ways the image hides.

**Fix:** none in code. Add one line to DATA_SHEET §1.12 so a future re-transcription does not "correct" Cl to I.

### 6. Guard gaps
`test_periodic_ion_charges_match_data_sheet` and `test_periodic_electronegativities_match_data_sheet` tie `ions` and `en` to the §1.8 table. `test_naming_polyatomic_table_matches_data_sheet` ties §1.12's name, formula and charge. However:
- The mass column in §1.8 is parsed by those regexes (`[\d.()*]+`) but never compared. A mass typo made in both places, or in only one, would pass. As of this run the two agree (checked with a scratch script), except that DATA_SHEET gives Pb as `207.2` without the booklet's `*`.
- The polyatomic regex skips the `or ClO⁻` form with `(?: or \S+)?`, so `alt: 'ClO'` is unguarded.

**Fix (small, proposed):** extend the §1.8 guard to compare `M`/`isotope` with the mass column, and the §1.12 guard to compare `alt`. Optionally print Pb as `207.2*` in DATA_SHEET. This is TODO work, not done in this run.

## What this run got wrong
- **The first eye pass used an 816 px downsample** of each page. At that size the small charge and electronegativity digits (3 vs 8, 5 vs 6) are the exact misreads this audit exists to catch. The eye pass alone was not enough evidence. The text-layer comparison is what makes the PASS verdicts hold; the eye pass is the second reading, not the first.
- **The text-layer reading is not the image either**, as finding 5 shows: the text says CIO where the page shows ClO. Where the two readings agree, the PASS stands. Only two places disagreed: CIO/ClO and the en dash. Both were settled by the chemistry and the glyph, not by either reading alone.
- **The first name comparison reported 4 false differences.** The matcher assumed one font size for names. So I seeded errors afterwards: Mn charges swapped, Sb and Tb electronegativities changed, and Pb's mass set to 207.3. The comparison caught the first three. **It missed the Pb mass**, because the script built Pb's expected string as the literal `'207.2*'` rather than from `M`. For that one cell the mass check was a tautology. Pb was then checked by hand: the code has `M: 207.2` and the PDF has "207.2*", so they match. Mass is the one field where the automated comparison had a blind spot, and that was the cell with a special case. The same shape (a special case that skips the value it is meant to check) is worth looking for in the proposed mass guard (finding 6).
