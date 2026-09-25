# Remote VM sessions (Claude Code on the web) — read FIRST in one of these

A remote session is recognizable by: repo cloned at `/home/user/<repo>` and a
session-specific branch name like `claude/<something>`.

## The rules that differ from local sessions

- **Push proactively at every checkpoint** — see CLAUDE.md "Session
  Management". The container is ephemeral; unpushed work is lost when it
  idles out. Never wait for a "push it".
- **Work on the session's designated branch** (the harness names it). The
  handoff commit goes on the branch too; the merge carries it over.
- **No PR unless asked.**

## Network policy — the big constraint

The VM's outbound HTTPS goes through an allowlist proxy that ALLOWS
registry.npmjs.org, pypi.org and GitHub, and **BLOCKS most of the web**. This
project needs nothing from outside: no npm install, no CDN, no data. Chromium
and a global `playwright` are preinstalled, so `npm run verify` works.

- Diagnose: `curl -sS "$HTTPS_PROXY/__agentproxy/status"` — a
  `connect_rejected` / "gateway answered 403 to CONNECT" entry for a host
  means policy denial, not a transient failure. Don't retry; don't disable
  TLS or unset HTTPS_PROXY.
- **The fix is the owner's, not the session's**: claude.ai/code → this
  environment's settings → network access. Applies to NEW sessions.

## Environment setup (fresh container)

```bash
./bootstrap.sh                       # hooks (⚠️ NOT CLONED — see below) + tests
node tools/verify-sims.js            # headless Chromium over every page
```

⚠️ **`core.hooksPath` matters MOST here.** `.githooks/pre-push` blocks a push to
a branch whose PR is already merged. Git does not clone hooks, so in a fresh
container it is **OFF until you set it**, and this is exactly the environment
where a stranded commit is unrecoverable. The hook **fails open**, so it can
never be the reason work goes unsaved. It is a backstop, not a substitute for
`git merge-base --is-ancestor <sha> origin/main` after any merge.
