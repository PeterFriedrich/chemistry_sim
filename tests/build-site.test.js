import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build, assetHashes, hashOf, stampHtml, SITE } from '../tools/build-site.js';
import { sims } from '../site/js/catalog.js';

const out = mkdtempSync(join(tmpdir(), 'site-'));
build(SITE, out);
const importMap = (html) => JSON.parse(/<script type="importmap">(.*?)<\/script>/s.exec(html)[1]).imports;

test('test_build_site_every_module_is_in_the_import_map_with_its_content_hash', () => {
  // A module missing from the map is fetched unversioned and can be served
  // stale from the browser cache — the bug this build step exists to prevent.
  const hashes = assetHashes(SITE);
  for (const page of ['index.html', 'sim.html']) {
    const map = importMap(readFileSync(join(out, page), 'utf8'));
    for (const [url, h] of Object.entries(hashes)) {
      if (!url.endsWith('.js')) continue;
      assert.equal(map[`./${url}`], `./${url}?v=${h}`, `${page}: ${url} not versioned`);
    }
    for (const s of sims) assert.ok(map[`./js/sims/${s.id}.js`], `${page}: sim ${s.id} missing (dynamic import)`);
  }
});

test('test_build_site_stamps_stylesheet_and_entry_script', () => {
  const html = readFileSync(join(out, 'sim.html'), 'utf8');
  const cssHash = hashOf(readFileSync(join(SITE, 'css/style.css')));
  assert.ok(html.includes(`href="css/style.css?v=${cssHash}"`));
  assert.match(html, /<script type="module" src="js\/sim-page\.js\?v=[0-9a-f]{10}"><\/script>/);
  assert.ok(html.indexOf('type="importmap"') < html.indexOf('<script type="module"'), 'import map must precede module scripts');
});

test('test_build_site_hash_changes_only_with_content', () => {
  assert.equal(hashOf(Buffer.from('a')), hashOf(Buffer.from('a')));
  assert.notEqual(hashOf(Buffer.from('a')), hashOf(Buffer.from('b')));
});

test('test_build_site_fails_loudly_on_unexpected_html', () => {
  assert.throws(() => stampHtml('<html></html>', {}), /no stylesheet link/);
  assert.throws(
    () => stampHtml('<link rel="stylesheet" href="css/x.css">', { 'css/x.css': 'abc' }),
    /no module script/
  );
});
