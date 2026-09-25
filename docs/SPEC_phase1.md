# Spec — Phase 1: one simulation per course unit

**Status: PROPOSED.** The sim list in §3 is a starting proposal written when the
repo was set up (2026-09-25); the owner approves or edits it before any sim
other than the seed `calorimetry` is built. Record the approval as a DECISIONS
row.

## 1. Goal

A tutor (or student) opens a link, picks a Chemistry 20 or Chemistry 30 topic,
and gets an interactive simulation that makes the concept visible and whose
numbers can be checked against a hand calculation done with the Data Booklet.
Phase 1 covers every unit of both courses with at least one simulation.

## 2. Audience and use

- **Tutor-led:** screen-shared or on a tablet during a session. The tutor sets
  up a situation, asks the student to predict, then plays it.
- **Student alone:** the "Try this" prompts on each page give a predict →
  check → explain sequence without a tutor.
- Devices: laptop and phone/tablet browsers. Light and dark mode.

## 3. Scope (proposed)

| Course | Unit | Simulation (catalog id) | Booklet data it needs |
|---|---|---|---|
| Chemistry 20 | A Diversity of Matter and Chemical Bonding | Electronegativity difference and bond type / polarity (`bonding`) | periodic table (electronegativity) |
| Chemistry 20 | B Forms of Matter: Gases | Gas laws in a piston: P, V, T, n (`gaslaws`) | **R and molar volumes are not in the booklet** (DATA_SHEET.md §1.5) — blocked on the owner's source |
| Chemistry 20 | C Matter as Solutions, Acids, and Bases | Dilution and concentration, c₁V₁ = c₂V₂ (`dilution`); pH and [H₃O⁺] of strong acids and bases (`ph`) | K<sub>w</sub> |
| Chemistry 20 | D Quantitative Relationships in Chemical Changes | Stoichiometry and limiting reagent, with a particle view (`stoichiometry`) | periodic table (molar masses) |
| Chemistry 30 | A Thermochemical Changes | Simple calorimetry (`calorimetry`, **built — seed sim**); Hess's law / enthalpy diagram from Δ<sub>f</sub>H° (`hess`) | specific heats; Δ<sub>f</sub>H° table |
| Chemistry 30 | B Electrochemical Changes | Voltaic cell builder, E°<sub>cell</sub> from the redox table (`voltaic`); electrolysis, n = It/F (`electrolysis`) | electrode potentials; F |
| Chemistry 30 | C Chemical Changes of Organic Compounds | Naming and drawing alkanes/alkenes/alcohols (`organic`) — qualitative | none |
| Chemistry 30 | D Chemical Equilibrium: Acid–Base Systems | Le Châtelier shifts (`lechatelier`); titration curve with indicators (`titration`) | K<sub>a</sub> table; indicator table |

Out of scope for phase 1: accounts, saved progress, a backend, worked-solution
generation, 3-D molecular models, and any claim of alignment to specific outcome
codes (units are mapped by unit title only — see `TODO.md`).

## 4. Every simulation page must have

1. A canvas view with play/pause, reset and slow-motion where anything moves.
2. Controls for every variable the unit's equations use, with units shown.
3. Readouts of the quantities a student would calculate, in significant
   figures and scientific notation written the way students write it.
4. A "Key equations" list and at least three "Try this" prompts.
5. Consistent colour coding across sims (legend tokens in `css/style.css`).

## 5. Acceptance criteria

1. Every readout comes from a function in `site/js/chem/` with a unit test
   that checks it against a worked example.
2. Constants and tabulated values are the Data Booklet's (`DATA_SHEET.md`); a
   value the booklet lacks has a named source and a DECISIONS row.
3. `npm run check` passes (unit tests + doc guards) on the merge gate.
4. `npm run verify` loads every page at 390 px and 1280 px, light and dark,
   with no console errors, no blank canvas and no horizontal scroll.
5. A human has looked at each sim's screenshot and the numbers on screen agree
   with a hand calculation for the default settings.
