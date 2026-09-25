// Guards on the LOADED PATH — what every session is told to read before it works.
//
// CLAUDE.md names the files a session must open: itself, TODO.md, the latest
// handoff. The handoff pile stays a small share of that only while the archive
// discipline holds: "keep the 3 most recent at top level, archive older" is a
// rule with a reader and no check unless this file exists, and a lapse is
// silent and compounding — nobody notices the 4th file.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO = fileURLToPath(new URL('..', import.meta.url));
const SUMMARIES = new URL('../session-summary/', import.meta.url);
const MAX_LIVE = 3; // CLAUDE.md, "Token Efficiency"

const md = (dir) => (existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.md')).sort() : []);
const live = () => md(SUMMARIES);
const archived = () => md(new URL('archive/', SUMMARIES));

test('test_at_most_three_handoffs_at_top_level', () => {
  const l = live();
  assert.ok(
    l.length <= MAX_LIVE,
    `${l.length} handoffs at session-summary/ top level, max ${MAX_LIVE} (CLAUDE.md). Move the oldest into ` +
      `session-summary/archive/ in this same PR — \`git mv session-summary/${l[0]} session-summary/archive/\`. ` +
      'Archiving is not deletion: the files stay, out of the loaded path.'
  );
});

test('test_the_live_handoffs_are_the_most_recent_ones', () => {
  // Filenames are date-prefixed, so every archived name must sort before every
  // live one. Catches archiving the wrong end, which passes the count test.
  const l = live();
  const a = archived();
  if (!l.length || !a.length) return;
  assert.ok(a[a.length - 1] < l[0], `session-summary/archive/${a[a.length - 1]} is newer than the live ${l[0]} — the wrong end was archived.`);
});

test('test_archive_is_never_deleted_from', () => {
  // A young repo (no archive yet) and one that emptied its archive look the
  // same on disk, so ask git. -M so a rename is not read as a deletion. Fails
  // open without git or history (tests.yml uses fetch-depth 0 for this).
  let out;
  try {
    out = execFileSync('git', ['log', '-M', '--diff-filter=D', '--name-only', '--format=', '--', 'session-summary/archive/'], {
      cwd: REPO,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return;
  }
  const deleted = out.split('\n').filter((l) => l.trim());
  assert.equal(deleted.length, 0, `${deleted.length} file(s) were DELETED from session-summary/archive/ (e.g. ${deleted[0]}). The archive is append-only. Restore them.`);
});
