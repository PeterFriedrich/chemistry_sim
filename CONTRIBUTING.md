# Contributing

## Development Pipeline

Work follows this sequence. Do not skip steps — each one informs the next.

| Step | Artifact | Purpose |
|------|----------|---------|
| 1. Spec | `docs/SPEC_<phase>.md` | What to build, who it is for, acceptance criteria |
| 2. Architecture | `docs/ARCHITECTURE.md` | Module contracts, the sim page contract, key technical decisions |
| 3. Chemistry | `site/js/chem/*.js` + `tests/*.test.js` | Pure functions first, each with tests against worked examples |
| 4. Sim | `site/js/sims/<id>.js` + `catalog.js` entry | UI and drawing only, calling the chem functions |
| 5. Look at it | `npm run verify` + the screenshot | Phone and desktop, light and dark |

For a new phase, start at step 1 and write a new spec before touching code.

### AI-assisted workflow

This project uses Claude Code. The pipeline above is designed for it:

- **Spec first** — a written spec gives the AI unambiguous scope. Without it,
  the AI fills gaps with assumptions.
- **Architecture before implementation** — explicit module interfaces prevent
  different design decisions across separate conversations.
- **One sim at a time** — implement, review, then move on.
- **Tests alongside each chem module** — while the design intent is in context.
- **`CLAUDE.md` is the AI's working memory** — a convention that is not written
  there does not persist across sessions.
- **A decision is a test first, prose second** — `docs/DECISIONS.md` rows cite
  the test that protects them.

## Getting Started

```bash
./bootstrap.sh     # git hooks (NOT cloned automatically) + tests
npm run serve      # http://localhost:8000
```

Needs node ≥ 20 and python ≥ 3.10 (guards only). No `npm install`.

## Adding a simulation

1. Propose it (CLAUDE.md "Comments & Scope"): which unit, what the student
   changes, what they read off, which equations.
2. Chemistry in `site/js/chem/<topic>.js`, tested in `tests/<topic>.test.js`
   with a worked example. Name tests `test_<topic>_<what>` so DECISIONS rows can
   cite them.
3. Sim module in `site/js/sims/<id>.js` exporting `equations`, `prompts`,
   `mount(ui)` (and optionally `legend`, `tallOnMobile`) — `docs/ARCHITECTURE.md` §3.
4. Add it to `site/js/catalog.js`. `tests/catalog.test.js` fails until the two agree.
5. `npm run check && npm run verify`, then look at the screenshots.

## Code Conventions

- Chem modules are pure: the Data Booklet's units, no DOM, sign conventions in the header comment.
- Constants and tables only from `site/js/chem/` (Chemistry 30 Data Booklet, `docs/DATA_SHEET.md`).
- Readouts through `lib/format.js` `fmt()` (significant figures, × 10ⁿ).
- Colours only through CSS tokens (`--c-*`) and `theme()` on canvas.

## Project Structure

```
/
├── site/                     # the web app (published as-is)
│   ├── index.html, sim.html
│   ├── css/style.css
│   └── js/{catalog,home,sim-page}.js, chem/, lib/, sims/
├── tests/                    # node:test — chem, format, catalog, repo invariants
├── tools/                    # serve.js, verify-sims.js, todo_archive.py, retrieval_report.py
├── scripts/                  # guards (check_*.py) and the handoff-gap hook
├── docs/                     # spec, architecture, decisions, ledgers
├── session-summary/          # handoffs; archive/ holds all but the newest 3
├── output/                   # screenshots — not committed
├── CLAUDE.md
├── TODO.md
└── README.md
```
