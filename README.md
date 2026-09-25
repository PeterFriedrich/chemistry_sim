# chemistry_sim

Interactive simulations for tutoring **Alberta Chemistry 20 and Chemistry 30**.
Each sim shows the concept, lets the student change the variables, and prints
readouts computed with the Chemistry 30 Data Booklet values, so the numbers
match a hand calculation.

| Course | Unit | Simulations |
|---|---|---|
| Chemistry 30 | A Thermochemical Changes | Simple calorimetry (metal block in water) |

More are planned for every unit of both courses — see `docs/SPEC_phase1.md`
and `TODO.md`. Every page has a "Key equations" list and "Try this"
predict-and-check prompts.

**Live site (once Pages is enabled):** https://peterfriedrich.github.io/chemistry_sim/

## Run it

No install and no build step: plain HTML, CSS and ES modules.

```bash
./bootstrap.sh     # enables the git hooks, runs the tests
npm run serve      # http://localhost:8000
```

(Opening `site/index.html` straight from disk does not work: browsers block ES
modules on `file://`.)

## Check it

```bash
npm run check      # unit tests + doc guards (the CI merge gate)
npm run verify     # every page in headless Chromium; screenshots in output/
VERIFY_WIDTHS=390,1280 VERIFY_THEME=dark npm run verify
```

## Deploy

`.github/workflows/deploy.yml` builds `site/` with `tools/build-site.js`,
which cache-busts every asset, and publishes it to GitHub Pages on every push
to `main` after re-running the tests (Pages source: **GitHub Actions**).

## Working on it

The sibling of [physics_sim](https://github.com/PeterFriedrich/physics_sim),
with the same workflow from
[cc-data-project-template](https://github.com/PeterFriedrich/cc-data-project-template):
spec → architecture → one module at a time with tests, a decisions log whose
rows cite tests, `/handoff` notes between sessions, and a pre-push hook that
refuses to push to an already-merged branch. Start with `CLAUDE.md`,
`CONTRIBUTING.md` and `TODO.md`.

Not affiliated with Alberta Education.
