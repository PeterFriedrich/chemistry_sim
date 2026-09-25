# Claude Instructions

## Project
A static web app of interactive chemistry simulations for tutoring the Alberta Chemistry 20 and Chemistry 30 courses. It is a teaching aid: every readout must match what a student gets by hand with the Chemistry 30 Data Booklet. It is deliberately not a general chemistry engine or molecular-dynamics package, not a course replacement, and has no backend or accounts. Sibling of `physics_sim` (https://github.com/PeterFriedrich/physics_sim), whose apparatus it reuses — when in doubt about a shared helper or workflow rule, that repo is the reference implementation.

## Key Files
- `TODO.md` — living backlog and **the source of truth for progress**. Read it first to know what to work on; update it in place as items open/close. Session summaries narrate *what happened*; TODO.md owns *what's left*. Never redo a closed item without asking — its `## Done` section lists every closed item in one line each. Conversely, an *open* item can be stale — reproduce the symptom before acting on it. **When an item closes, move its body to `docs/TODO_archive.md` and leave a `## Done` line** (`python3 tools/todo_archive.py` does it in bulk).
- `docs/DECISIONS.md` — append-only index of locked decisions: one row + pointer to the doc holding the full reasoning. **Add a row whenever a decision locks.** Check it before re-opening anything that feels "already settled".
- `docs/SPEC_phase1.md` — phase 1 (one sim per unit, **proposed, not yet approved**) and the acceptance criteria every sim must meet. Read before adding or changing a sim.
- `docs/DATA_SHEET.md` — the Chemistry 30 Data Booklet, transcribed, and what it does **not** print (R, molar volumes). **Check a constant or an "is it in the booklet?" question here first.**
- `docs/ARCHITECTURE.md` — module contracts (chem / lib / sims / catalog) and the sim page contract. Read before a new module or a change to a shared helper.
- `docs/TOKEN_EFFICIENCY.md` — context/token hygiene. Read before bulk-reading screenshots or summaries.
- `docs/AUDIT_LEDGER.md` — coverage map of executed audit runs. **Add a row when an audit executes; check it before scoping a new one.**
- `docs/REMOTE_VM.md` — **read FIRST in a Claude Code web/remote VM session**: network-policy constraints, environment setup.
- `session-summary/` — session handoff notes. Read the latest before starting work; older ones live in `session-summary/archive/` (don't bulk-read them).

## Token Efficiency
- **Screenshots are expensive.** `tools/verify-sims.js` writes one per page to `output/`; open only the sims you changed. See `docs/TOKEN_EFFICIENCY.md`.
- Read only the **latest** session summary; keep the 3 most recent at top level, archive older — enforced by `tests/loaded-path.test.js`.

## Session Management
- **At session start, check open GitHub issues** — nothing pushes these to a model. ⚠️ **A working guard on a channel nobody reads is the standing failure mode** — treat an unread report as a finding, not as background.
- Always run `/handoff` before `/clear` — never wipe context without a written record in `session-summary/`. The `SessionStart` and `SessionEnd` hooks run `scripts/handoff_gap.py`, which names the commits and uncommitted files that landed after the newest handoff was last committed, and **says nothing when nothing is owed**.
- Commit after each working unit with a descriptive message, rather than batching a session into one commit.
- **Pushing is normal — push proactively after committing, in every environment.**
- **Remote/cloud VM sessions: commit + push at every natural checkpoint.** The container is ephemeral; unpushed work is LOST when it is reclaimed. Quirks: `docs/REMOTE_VM.md`.
- **⚠️ The owner may merge PRs mid-session. Re-check before EVERY push to an existing branch.** Commits pushed after the PR merged land on a dead branch.
  - Enforced by `.githooks/pre-push`. **A fresh clone must enable it: `git config core.hooksPath .githooks`** (`./bootstrap.sh` does). It fails OPEN, so it can never be the reason work goes unsaved. Escape hatch: `git push --no-verify`.
  - After any merge, confirm the work landed: `git merge-base --is-ancestor <sha> origin/main`.
- **No scheduled PR check-ins** (owner, 2026-09-24): each one costs a full turn of usage. Subscribe to a PR's activity so CI failures and reviews still arrive, but never arm a `send_later` / trigger check-in for it.

## Code Style
- **A decision that protects a number is a test first, prose second.** Write the guard, then the `DECISIONS.md` row cites its ID (`test_x` — the string that opens a `test(...)` title). A row with nothing to cite is tagged `[unverifiable]`. `scripts/check_decisions_log.py` gates new rows on the merge path.
- **Chemistry lives in `site/js/chem/`, pure and DOM-free.** Sims only draw and wire controls; any number shown in a readout comes from a `chem/` function that has a test. Rendering code contains no formulas beyond unit conversion.
- **Constants and tabulated data come from `site/js/chem/`** (`constants.js`; later tables such as ΔfH°, E° and Ka go in their own data modules) — the Data Booklet values, never CODATA, never an inline literal. A value the booklet does not print needs a DECISIONS row naming its source.
- **Closed-form over simulation** wherever one exists (ICE-table quadratics, Q = mcΔt, n = It/F), so readouts equal the textbook method exactly. Random particle motion is decoration only and feeds no readout.
- **The booklet's units inside chem functions** (g, mol, L, kPa, °C, J or kJ as the booklet's notation table says); convert only at the display edge (mL, mmol) and say so in the label.
- **Significant figures follow the student method**: readouts use `lib/format.js` `fmt()`; pH shows decimal places equal to the sig figs in [H₃O⁺].
- Sign conventions are stated in the chem module's header comment (ΔH < 0 exothermic; Q > 0 gained by the named object; E°cell = E°cathode − E°anode) and in the sim's UI where a student could get them backwards.
- No dependencies and no build step: ES modules served as-is. Adding one is a DECISIONS row.

## Comments & Scope
- Comments only where the *why* is non-obvious. Don't narrate what the code plainly does.
- Make the **smallest change that satisfies the request**. Don't refactor, rename, or reformat code you weren't asked to touch.
- No abstractions for a single use case — inline until there are 3+ call sites (the lib/ helpers each already have them).
- Deleting obsolete code is valid and **preferred** over leaving it behind.
- **Propose the plan first** for: a new sim, a change to the sim page contract or a shared lib helper, or anything that changes CI or deployment. Routine edits don't need a proposal.
- These are scope rules, not verification rules. They do **not** relax the chem tests, the guard scripts, or checking a changed sim in a real browser (`npm run verify`, then look at its screenshot).

## Verification
- `npm run check` — unit tests + doc-citation and decisions-log guards (what CI runs).
- `npm run verify:built` — the deploy build (cache-busted `_site/`) in the browser; also fails on any unversioned `.js`/`.css` request. Run it after touching `tools/build-site.js` or the HTML shells.
- `npm run verify` — every page in headless Chromium; fails on console errors, blank canvas, horizontal scroll. `VERIFY_WIDTHS=390,1280 VERIFY_THEME=dark` for phone and dark mode. Look at the screenshot of anything you changed — "no errors" is not "looks right".
