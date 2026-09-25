---
name: project-audit
description: >
  Focused audit skill for this chemistry-simulation site. Use this whenever the
  user asks to audit, review, check, or QA a simulation, a chemistry module, a
  readout, or project files. Picks ONE audit target per run; grounds in docs/AUDIT_LEDGER.md
  before scoping and adds a ledger row after executing. Triggers on: "audit my
  code", "check this sim", "review my project", "what should I look at",
  "is this right", or any QA/review request in the context of this project.
---

# Project Audit Skill

## Purpose

The goal of each audit run is a **single, deep, actionable verdict** on one
target. Do not attempt a broad sweep; pick one focus, go deep, produce clear
verdicts + specific fixes. A focused single-target audit is more useful than a
shallow pass over everything.

## The audit ecosystem (know the pieces before you start)

- **`docs/AUDIT_LEDGER.md`** — the coverage map: one row per *executed* audit
  run, plus a ranked never-audited inventory. **Read it FIRST when scoping;
  add a row when your audit executes.** This skill and the ledger are two
  halves of one loop.
- **Briefs** (`docs/AUDIT_<target>.md`) — reusable read-cold *instruments*. A
  brief is written once and can be re-run; it holds the grounding order and
  the questions, never the findings. **A brief wins over these steps wherever
  the two disagree** — it was written knowing more about its target.
- **Findings** (`docs/FINDINGS_<target>.md`, or handoff sections for smaller
  runs) — one run's *output*. Never duplicated into the ledger.
- **`docs/DECISIONS.md`** — if an audit locks or reopens a decision, append a
  row there too.

## How to run an audit

### Step 1 — Ground before scoping (non-negotiable)

1. Read `docs/AUDIT_LEDGER.md` — all tables.
2. Cross-check the latest session summary. **TODO.md can lag executed work** —
   a backlog item that "smells like an audit" may have already run and only be
   recorded in a handoff. If the ledger and TODO disagree, the ledger +
   summaries win; reconcile TODO in your PR.
3. Ledger verdicts are **point-in-time**: a target audited before a relevant
   change is fair game to re-audit — say so explicitly ("re-run, prior row
   YYYY-MM-DD, delta since: …").

### Step 2 — Pick ONE target

- If the user named a target, use it.
- Otherwise take the top of the ledger's "Never audited" ranked list.
- Tell the user which target you picked and why before going deep.

### Step 3 — Choose the audit family

**(a) Decision audit** (what a sim teaches, a teaching model — the default for
anything a student sees): audit the **fundamental decisions top-down, highest level
first**, not the code.

- Build the target's **decision stack** (L0 "does this sim teach the concept at all"
  → … → Ln "is the code right") and evaluate in order. **When a level is
  unsound, everything beneath it is moot** — don't polish an edge case under
  a broken unit-of-analysis choice.
- Per-level verdicts: **SOUND / CONDITIONAL** (sound only if a stated caveat
  holds) **/ UNSOUND**, plus the single sharpest argument against the level
  and what evidence would change the verdict.
- Not looking for reassurance: assume the authors believe their own metric;
  the value is the argument they didn't make against themselves. One finding
  that kills a level beats ten that polish one.
- Ground in the repo's written reasoning (SPEC, DECISIONS.md, prior FINDINGS)
  and *challenge* it — don't re-derive it. ⚠️ **Read the BODIES of every
  `DECISIONS.md` row touching your target, and never truncate them** — the
  reasoning lives in the tail, and `grep | cut` hands you a row that matched
  while hiding the sentence that settles your finding. Do this BEFORE writing
  any finding. Runs have published findings the repo had already decided.
- For a substantial new target, **write the brief as a standalone
  `docs/AUDIT_<target>.md`** so the instrument outlives the run.

**(b) Correctness audit** (wrong-readout risk): verdicts are **PASS /
FAIL / WARN** per target. The checklists are in the appendix below.

### Step 4 — Deliver verdicts

⚠️ **Every findings document MUST end with a `What this run got wrong` section,
and it may not be empty.** This is an *output shape*, not a good intention — a
file missing the heading is visibly missing it. The pattern is consistent:
**the class you are auditing shows up in your own instruments.**

If you genuinely found no error, you have not looked — re-read your sharpest
claim and ask what would have to be true for it to be wrong, then go check
that thing. ⚠️ **A confident NEGATIVE — "nothing reads this", "this can never
fire", "no gate covers this" — is the highest-risk claim shape.** Verify a
negative by finding the reader/trigger, not by failing to find one.

Decision audits: one verdict line per level, sharpest counter-argument,
evidence-that-would-change-it. Correctness audits:

```
## Audit: [Target]
**Verdict:** PASS / FAIL / WARN
**Finding:** [One paragraph. Quote the actual line if there's a bug. Don't hedge.]
**Fix (if needed):** [Concrete change; if PASS, what you confirmed and why.]
```

### Step 5 — Close the loop (this is what makes the run count)

1. **Add a row to `docs/AUDIT_LEDGER.md`**: date, target/scope, instrument,
   output pointer, one-line verdict, outstanding items.
2. Write findings where they belong: a `FINDINGS_*.md` for big runs, the
   session handoff §2 for smaller runs — the ledger row just points.
3. Reconcile `TODO.md` (tick executed items, add follow-ups for
   CONDITIONAL/WARN outcomes) and append to `DECISIONS.md` if a decision
   locked or reopened.
4. Update the ledger's "Never audited" list if your run covered (or
   surfaced) an inventory item.
5. Ship as a PR like any other docs change (`git pull` main before cutting
   the branch — ledger/DECISIONS/TODO tails are append-conflict magnets).

## Escalation

A FAIL on anything that makes a readout wrong is **blocking** — stop
auditing other targets in the same run; a student checking their work against it
would be misled until it's fixed. An UNSOUND on a top decision level moots the rest of that stack: report
it and stop descending. WARN/CONDITIONAL/architecture issues: list them, let
the user decide order.

---

## Appendix — correctness checklists (family b)

### Readouts vs hand calculation
Pick the default settings and two slider extremes. Compute every readout by hand
with the Data Booklet values; they must agree to the shown significant
figures. A readout that is right at defaults and wrong at an extreme is the
common failure.

### Units and sign conventions
Every conversion (J ↔ kJ, °C ↔ K, mL ↔ L, mmol ↔ mol) happens once, at the display
edge, and the label says the unit. Signs match the convention in the chemistry
module's header comment (Q and ΔH: + means gained by / endothermic for the named
system). Anything students derive with a rule (the spontaneity rule on the redox
table, which way an equilibrium shifts, which ion is the stronger acid) agrees
with what the canvas draws.

### Readouts trace to tested chemistry
Each number on screen comes from a function in `site/js/chem/` that a test
exercises (docs/DECISIONS.md, the "every on-screen number" row). A formula
written inline in a sim module is a finding even when it is right.

### Rendering tells the truth
Particle counts, bar heights and colours agree with the readouts at every slider
setting; qualitative sizes are not presented as to-scale; axes and scale bars are labelled; nothing draws off
canvas at phone width (`VERIFY_WIDTHS=390`).

### Teaching models at their edges
For each simplification in ARCHITECTURE.md §7, push the sliders to their limits
and ask whether the sim now shows something physically false. State the limit
or clamp the slider.

### Docs currency
SPEC, ARCHITECTURE and the catalog agree with what ships: every sim listed,
every contract field documented, every DECISIONS row still true.
