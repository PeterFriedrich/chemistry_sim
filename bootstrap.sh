#!/usr/bin/env bash
# One-time setup after cloning. Idempotent. No installs: the site and tests
# need only node >= 20, the guards only python3 >= 3.10.
set -euo pipefail
cd "$(dirname "$0")"

# Hooks are not cloned. Without this the pre-push guard is OFF.
git config core.hooksPath .githooks
echo "core.hooksPath -> .githooks"

node --version >/dev/null 2>&1 || { echo "node not found (need >= 20)"; exit 1; }
py=""
for c in "${PYTHON:-}" python3.13 python3.12 python3.11 python3.10 python3; do
  [ -n "$c" ] && command -v "$c" >/dev/null 2>&1 && "$c" -c 'import sys; sys.exit(sys.version_info < (3, 10))' && { py="$c"; break; }
done
[ -n "$py" ] || { echo "no python >= 3.10 on PATH (set PYTHON=/path/to/python3.x)"; exit 1; }

node --test
"$py" scripts/check_doc_citations.py
"$py" scripts/check_decisions_log.py
echo
echo "Ready. Run the site with: npm run serve   (http://localhost:8000)"
