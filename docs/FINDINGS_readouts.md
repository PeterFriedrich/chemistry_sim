# FINDINGS — readouts vs hand calculation, all seven sims (2026-09-26)

One run's output. Instrument: the `project-audit` skill's correctness family,
checklist "Readouts vs hand calculation" (defaults plus slider extremes), with
parts of "Readouts trace to tested chemistry". Target picked from the top of
`AUDIT_LEDGER.md`'s never-audited list. First executed audit in the repo.

**Method.**
- Scratch Node probes called the `site/js/chem/` functions over slider grids and compared them with an independent hand method.
- A Playwright script read the readout text off each live page (`dl.readouts`), so the sim wiring was checked, not only the chem layer.
- Hand values used the Data Booklet numbers in `docs/DATA_SHEET.md`.
- `node --test`: 64 pass at the start of the run.
- None of the probes are committed; they are in the session scratchpad.

**Summary.**

| Sim | Verdict | One line |
|-----|---------|----------|
| calorimetry | **FAIL** | Equal starting temperatures show Δt = −3.55 × 10⁻¹⁵ °C and Q<sub>metal</sub> ≠ −Q<sub>water</sub> |
| lechatelier | **FAIL** | A stress pressed before the previous shift settles starts from a non-equilibrium "before" state |
| titration | WARN | ~17 % of weak-analyte settings differ by 0.01 pH if the student rounds K<sub>b</sub> = K<sub>w</sub>/K<sub>a</sub> to 2 sf; sig-fig and indicator-fit logic lives untested in the sim |
| hess, electrolysis, titration, lechatelier | WARN (known) | The `fmt()` gap (existing TODO) shows at default or near-default settings |
| hess | PASS | 12 presets × n = 0.1, 1, 10 mol checked |
| voltaic | PASS | All 156 ordered pairs of the 13 couples: E°<sub>cell</sub> = hand value to 0.01 V |
| electrolysis | PASS | All 12 electrolyte/electrode combinations: SOA, SRA, E°<sub>cell</sub> and masses match by hand |
| organic | PASS | 34 hand-named molecules, 0 mismatches |

Default readouts, read off the live pages, all agree with hand calculation:
- calorimetry: 21.8 °C, −1.51 / 1.51 kJ
- hess: −890.5 kJ
- voltaic: +1.10 V
- electrolysis: 0.593 g Cu
- titration: 25.0 mL, pH 2.87 / 4.74 / 8.72
- lechatelier: K<sub>c</sub> 0.156
- organic: 2-methylbutane

This checks the numbers only. It does not replace the owner walkthrough in TODO.md (SPEC_phase1.md §5 criterion 5).

---

## Audit: calorimetry — equal starting temperatures
**Verdict:** FAIL
**Finding:** When the metal and the water both start at 30.0 °C, float residue in `finalTemperature` reaches the readouts. This is reachable: the metal slider's minimum and the water slider's maximum are both 30.0 °C. The readouts are computed inline in `site/js/sims/calorimetry.js`:
```js
out.set('dtm', `${fmt(tf - tm.value, 3)} °C`);
out.set('qm', `${fmt(K.heat(mm.value, cm, tf - tm.value) / 1000, 3)} kJ`);
```
In the browser, with 10 g Cu and 63 g water, both at 30.0 °C, the page shows:
- Δt of metal: −3.55 × 10⁻¹⁵ °C
- Δt of water: −3.55 × 10⁻¹⁵ °C
- Q of metal: −1.37 × 10⁻¹⁷ kJ
- Q of water: −9.38 × 10⁻¹⁶ kJ

So both objects appear to lose heat, which contradicts the sim's own Q<sub>lost</sub> = Q<sub>gained</sub> equation. A student expects 0.00 everywhere. 1 417 of the probed (metal, mass, mass) combinations at 30.0 °C show it. Other combinations happen to round-trip exactly, e.g. 63 g Cu with 50 g water.
**Fix:** Snap the temperature changes with the existing `lib/format.js` `snap(x, scale)`, for example `snap(tf - t, t)`. The better home is a tested `chem/calorimetry.js` helper that returns both Δt values, so the Δt readouts also stop being inline arithmetic. Add a test pinning Δt = 0 and Q = 0 for equal starting temperatures.

## Audit: lechatelier — stress applied mid-shift
**Verdict:** FAIL
**Finding:** `apply()` takes the pre-stress state from the animation:
```js
const before = at(t);
```
`at(t)` is an exponential relaxation with τ = 1.5 s (4× longer at 0.25× speed). If a second stress is pressed within about 5 s of the first, "before" is a transient, not an equilibrium. Every readout derived from it drifts.

Reproduced in the browser (Haber process, add 0.200 N₂, then double the volume):

| Second press after | "before" column | Q readout |
|---|---|---|
| 1 s | 0.695, 0.784, 0.211 | 0.531 |
| 8 s | 0.690, 0.769, 0.221 | 0.624 |

- Kc from the 1 s "before" column is 0.133, not the displayed K<sub>c</sub> 0.156.
- A student who reasons "V doubled, Δn<sub>gas</sub> = −2, so Q = 4 K<sub>c</sub>" gets 0.624.
- The shift direction stays right, so the qualitative lesson survives. The numbers do not.

The final equilibrium is unaffected: the transient lies on the reaction-extent line, so `equilibrate` lands where it would have anyway.
**Fix (owner choice):** either
- (a) take `before` as the last segment's target equilibrium (`segs.at(-1).to`), so the in-flight shift completes instantly before the new stress (the animation jumps), or
- (b) disable the stress buttons until the relaxation is within display precision.

(a) is one line and keeps every readout exact. Either way, add a test on a sequence of two stresses.

## Audit: titration — K<sub>b</sub> rounding and untested sim logic
**Verdict:** WARN
**Finding 1 (method ambiguity).** `equivalencePH` and the NH₃ initial pH use K<sub>b</sub> = K<sub>w</sub>/K<sub>a</sub> unrounded. A student who writes K<sub>b</sub> to 2 sf (e.g. 5.6 × 10⁻¹⁰ for CH₃COO⁻) and carries on gets a pH 0.01 different at about 17 % of the weak-analyte slider settings (V<sub>a</sub> = 25.0 mL grid, ~1 000 of ~5 900 per analyte). Examples:
- CH₃COOH, 0.010 / 0.070 mol/L: app 8.34, student 8.35
- HCN, 0.010 / 0.070 mol/L: app 10.57, student 10.56
- NH₃, 0.013 mol/L: initial pH, app 10.67, student 10.68

Defaults agree either way. Both methods are defensible, and neither is wrong to the shown precision. But the site's promise is "matches the student", so the choice should be explicit.
**Fix:** Owner decision. Either round the derived K<sub>b</sub> to 2 sf, as the booklet's K<sub>a</sub> is, or keep it unrounded and show "K<sub>b</sub> = …" in the equivalence readout so a student can see which value was used. Record it as a DECISIONS row with a test.

**Finding 2 (traces to tested chemistry).** Two pieces of readout logic live in `sims/titration.js`, and no test exercises them:
- the significant-figure count of each control, `sigOf`, which sets the decimal places of every pH readout
- the rounding before the indicator check, `eqShown = Number(eq.pH.toFixed(eq.sig))`, which decides ✓ or ✗

Both are right today. The indicator one is right on purpose: it compares the shown pH, as a student would. They are still chemistry-method decisions outside `chem/`.
**Fix:** Move both into `chem/titration.js` (e.g. an `indicatorFits` that takes the pH as shown) and test them.

**PASS items confirmed.** Over 20 592 slider combinations, the exact drawn curve and the student-method pH never differ by more than 0.02, at the initial point or at equivalence. The approximation rule switches where the booklet says (HF 0.100 → quadratic).

## Audit: `fmt()` gap at reachable settings
**Verdict:** WARN (existing TODO, new evidence)
**Finding:** The open TODO says `fmt(1000, 3)` prints "1000". It shows at these settings:
- **electrolysis defaults**: "t: 1800 s", "Q = It: 1800 C". The student writes 1.80 × 10³.
- **hess**, n = 1.00 mol: propane "−2220 kJ", octane "−5470 kJ", respiration "−2800 kJ".
- **titration** with 2-sf concentrations: "V<sub>eq</sub> 20 mL", "100 mL".
- **lechatelier** after chromate stresses: Q "1780"; the contact K<sub>c</sub> after repeated T changes: "1900".

The TODO noted only that the chromate preset avoided it. The electrolysis defaults show it now.
**Fix:** The existing TODO, now with this list as its re-check set.

## PASS details
- **hess**: ΔH for n mol is `fmt(n × ΔrH per mol, 3)`. At n = 1.00 mol, methane shows −891 kJ, the same as a student's 1.00 × −890.5 to 3 sf.
- **voltaic**: no float artefacts: every pair prints the hand difference, and E° ≤ 0 never appears for the spontaneous arrangement.
- **electrolysis**: hand values at 1.00 A for 30.0 min (n<sub>e⁻</sub> = 0.018 65 mol):
  - Cu 0.593 g, Ag 2.01 g, Ni 0.547 g, Zn 0.610 g, Pb 1.93 g, I₂ 2.37 g, O₂ 0.004 66 mol
  - ZnSO₄ plates Zn (−0.76 > −0.83), as the booklet predicts
  - refining cells show E°<sub>cell</sub> 0.00 V
- **organic**, names checked:
  - parent-chain re-selection: 2-ethylpentane → 3-methylhexane
  - OH/multiple-bond priority: pent-4-en-1-ol, prop-2-en-1-ol
  - alphabetical tie-break: 3-ethyl-4-methylhexane from either drawing
  - halides: 1,1-dichloroethene, trichloromethane
  - formulas: C₅H₁₂, C₃H₈O; condensed CH₃CH(OH)CH₃

## What this run got wrong
- **I nearly reported the calorimetry FAIL as not reproducible.** The first browser check set 63 g metal with 50 g water, the swapped pair, and the page showed a clean 0.00. The probe's failing case was 10 g metal with 63 g water, and that one reproduces. A single browser spot check nearly overrode a 1 417-case sweep. Residue bugs depend on the exact inputs.
- **The first calorimetry sweep iterated over every `specificHeat` key**, including water, air and the polystyrene cup, as if they were metals. That inflated the count (2 496) until I narrowed it to the four metals the sim offers (1 417).
- **The lechatelier "settled" value was not settled either** (found while fixing it, 2026-09-26). The 8 s row shows Q 0.624, but the exact value is 4 × 0.15625 = 0.625: the exponential relaxation never quite arrives, so even a patient student saw a readout 0.001 off. The fix (start from the target equilibrium) gives 0.625 at any timing.
- **The titration WARN rests on my own "student method"** (round K<sub>b</sub> to 2 sf, then carry on). I did not check it against an Alberta answer key. If diploma keys carry the unrounded K<sub>b</sub>, the app already matches and Finding 1 goes away.
- **The organic PASS is only as good as my 34 expected names.** Two accept either textbook form ("2-methylpropene" or "2-methylprop-1-ene"; "2-chloroethanol" or "2-chloroethan-1-ol"). I did not test the "most substituents" tie-break when a complex and a simple candidate chain tie.
