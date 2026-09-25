# Architecture

## 1. Shape

A static site with no build step and no dependencies. ES modules are served
as-is from `site/`, so GitHub Pages (or any static host) can publish the folder
directly, and tests import the same files the browser runs.

```
site/
├── index.html            home: renders the catalog
├── sim.html              one page for every sim: ?id=<catalog id>
├── css/style.css         tokens (light + dark), layout
└── js/
    ├── catalog.js        courses, units, sims — the single list
    ├── home.js           home page renderer
    ├── sim-page.js       loads js/sims/<id>.js into sim.html
    ├── chem/             pure functions, booklet units, no DOM   ← tested
    ├── lib/              canvas, controls, clock, format, colour
    └── sims/             one module per simulation: UI + drawing only
tests/                    node:test — chem, format, catalog, repo invariants
tools/                    serve.js (dev server), verify-sims.js (browser smoke test)
scripts/                  Python guards from the workflow template (stdlib only)
```

## 2. Layers and what each may do

| Layer | May | May not |
|---|---|---|
| `chem/` | maths, constants, booklet tables | touch the DOM, format numbers, know about pixels |
| `lib/` | DOM, canvas, formatting | contain chemistry formulas |
| `sims/` | wire controls → chem → drawing | compute a readout without a `chem/` function |
| `catalog.js` | list sims and units | import sim modules |

The rule that matters: **a number on screen traces to a tested `chem/`
function.** Rendering code can be wrong-looking; it cannot be wrong-valued.

## 3. The sim page contract

`sim-page.js` imports `js/sims/<id>.js` and expects:

- `equations`: `[{ html, what }]` — shown under "Key equations".
- `prompts`: `[html]` — shown under "Try this" (at least three).
- `legend` (optional): `[{ color, label }]`, `color` naming a `--c-*` token.
- `tallOnMobile` (optional): `true` gives the canvas a portrait aspect on phones
  for sims that stack two views.
- `mount(ui)`: builds the sim into `ui = { canvas, controls, readouts, transport }`.

`tests/catalog.test.js` checks every catalog entry against this contract, and
that no module in `sims/` is missing from the catalog.

## 4. Time and drawing

`lib/clock.js` runs one `requestAnimationFrame` loop per page. Simulated time
advances only while playing (times the speed setting); the frame callback runs
every frame regardless, so a paused sim still redraws when a slider moves.
Sims read control values each frame rather than keeping derived state, except
where a change must restart the run (`onChange` → reset).

Readouts come from closed-form answers (the textbook method), never from the
state of an animation. Where a sim shows particles moving at random (gases,
solutions, equilibrium), that motion is decoration: the counts it shows are
drawn from the computed values, and no readout reads the particles back.

## 5. Theming

Colours are CSS custom properties on `:root`, redefined for dark mode.
`lib/canvas.js` `theme()` reads them so canvas drawing follows the page theme.
Colour meanings are shared across sims so students learn one code:
`--c-reactant`, `--c-product`, `--c-element` (the zero of the formation
scale), `--c-exo` (warm: heat out) and `--c-endo` (cool: heat in), chosen with
`hess`; `--c-series-a`/`-b` are plain data series (calorimetry's water and
metal); `--c-danger` is the error box. The physics_sim vector tokens are gone.

## 6. Verification and deployment

- **Merge gate (`.github/workflows/tests.yml`)**: `node --test` plus the two
  Python doc guards. Offline, secret-free, dependency-free, so it cannot flake
  on an upstream outage and never gets ignored.
- **Browser smoke test (`tools/verify-sims.js`)**: headless Chromium over every
  page. Not on the gate — it needs a browser download there — so it is run
  locally before merging UI work (`npm run verify`). If UI regressions start
  slipping through, promote it to its own CI job rather than weakening it.
- **Deploy (`.github/workflows/deploy.yml`)**: on push to `main`, re-runs the
  unit tests, builds `site/` into `_site/` with `tools/build-site.js`, and
  publishes that to GitHub Pages. One-time setup: repository Settings → Pages →
  Source: *GitHub Actions*.
- **Cache busting (`tools/build-site.js`)**: Pages lets browsers cache every
  file for 10 minutes, so right after a deploy a fresh page could run against an
  old `catalog.js` ("the new sim isn't there"). The build stamps the stylesheet
  and entry scripts with `?v=<content hash>` and writes an import map into each
  HTML page that sends every module, including the sim page's dynamic import,
  to its hashed URL. Content hash rather than commit sha, so unchanged files
  stay cached; the same approach as edmonton-tax-viz's `scripts/build_site.py`.
  The HTML itself can't be stamped: a browser holding a stale page keeps its
  old map until max-age runs out or a hard refresh. `site/` stays unbuilt for
  local work (`npm run serve`); `npm run verify:built` checks the built output
  and fails on any unversioned `.js`/`.css` request.
- The workflow guards stay in Python (stdlib only, no `pip install`) as they
  came from the template; the one pytest file was ported to `node:test` so the
  repo has a single test runner.

## 7. Teaching models (deliberate simplifications)

Each is stated in the code where it lives and flagged to the student where it
could mislead.

- **Calorimetry** (`chem/calorimetry.js`): a perfect calorimeter — the foam
  cup absorbs no heat and none escapes. The approach to equilibrium on screen
  is an exponential with an arbitrary rate, for animation only; readouts use
  t<sub>f</sub> from heat lost = heat gained.
- **Enthalpy of reaction** (`chem/hess.js`): fixed, balanced preset equations
  only — no free equation entry, which would need a parser and a balancer (a
  general chemistry engine). Standard conditions throughout: Δ<sub>r</sub>H° from
  the booklet's Δ<sub>f</sub>H° at 298.15 K, elements in their standard states
  at 0. Sums and differences print to 0.1 kJ (the addition rule, since the
  table is to 0.1 kJ/mol); ΔH = nΔ<sub>r</sub>H prints to 3 significant figures.
  The Hess-route animation is drawing only.
