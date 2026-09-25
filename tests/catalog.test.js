import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { courses, sims, findSim } from '../site/js/catalog.js';

test('test_catalog_every_sim_module_exports_page_contract', async () => {
  // sim-page.js calls mount(ui) and renders equations/prompts; a sim missing
  // any of them loads to a blank or broken page with no build step to catch it.
  for (const s of sims) {
    const path = new URL(`../site/js/sims/${s.id}.js`, import.meta.url);
    assert.ok(existsSync(path), `${s.id}: no module at site/js/sims/${s.id}.js`);
    const mod = await import(path);
    assert.equal(typeof mod.mount, 'function', `${s.id}: mount() missing`);
    assert.ok(Array.isArray(mod.equations) && mod.equations.length, `${s.id}: no equations`);
    assert.ok(mod.equations.every((e) => typeof e.html === 'string'), `${s.id}: equation without html`);
    assert.ok(Array.isArray(mod.prompts) && mod.prompts.length >= 3, `${s.id}: fewer than 3 prompts`);
  }
});

test('test_catalog_ids_unique_and_units_exist', () => {
  const ids = sims.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length, 'duplicate sim id');
  for (const s of sims) {
    assert.match(s.id, /^[a-z0-9-]+$/, `${s.id}: ids are used in URLs and file names`);
    const course = courses.find((c) => c.id === s.course);
    assert.ok(course, `${s.id}: unknown course ${s.course}`);
    assert.ok(course.units.some((u) => u.id === s.unit), `${s.id}: unknown unit ${s.unit}`);
    assert.ok(s.title && s.summary && s.concepts.length, `${s.id}: missing card text`);
  }
  assert.equal(findSim('nope'), null);
});

test('test_catalog_every_sim_module_is_listed', async () => {
  const { readdirSync } = await import('node:fs');
  const files = readdirSync(new URL('../site/js/sims/', import.meta.url)).filter((f) => f.endsWith('.js'));
  const listed = new Set(sims.map((s) => `${s.id}.js`));
  for (const f of files) assert.ok(listed.has(f), `site/js/sims/${f} is not in catalog.js, so no page links to it`);
});
