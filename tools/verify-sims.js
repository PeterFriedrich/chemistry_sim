#!/usr/bin/env node
// Browser smoke test: loads the home page and every sim in headless Chromium,
// presses Play, and fails on any console error, page error, or a canvas that
// is still blank. Screenshots land in output/ (gitignored) for a human look.
//
// Not on the merge gate: it needs a browser, and the gate stays offline and
// dependency-free (docs/DECISIONS.md). Run it before merging UI changes:
//   npm run verify            # uses a globally installed `playwright`
//   VERIFY_THEME=dark npm run verify
//   VERIFY_ROOT=_site npm run verify   # the built site (tools/build-site.js):
//                                      # also fails on any unversioned .js/.css request
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { createServer } from './serve.js';
import { sims } from '../site/js/catalog.js';

const require = createRequire(import.meta.url);
function loadPlaywright() {
  for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) {
    try {
      return require(p);
    } catch {}
  }
  console.error('playwright not found: npm i -g playwright (or set NODE_PATH)');
  process.exit(2);
}

const { chromium } = loadPlaywright();
const theme = process.env.VERIFY_THEME === 'dark' ? 'dark' : 'light';
const widths = (process.env.VERIFY_WIDTHS || '1280').split(',').map(Number);

const built = Boolean(process.env.VERIFY_ROOT);
const server = built ? createServer(resolve(process.env.VERIFY_ROOT)) : createServer();
await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}`;
await mkdir('output', { recursive: true });

const browser = await chromium.launch();
let failures = 0;

async function visit(path, name, width, { play }) {
  const page = await browser.newPage({ viewport: { width, height: 900 }, colorScheme: theme });
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  // On the built site every asset must go out versioned, or a browser cache
  // can serve it stale after a deploy.
  if (built) {
    page.on('request', (r) => {
      const u = new URL(r.url());
      if (/\.(js|css)$/.test(u.pathname) && !u.searchParams.has('v')) errors.push(`unversioned request: ${u.pathname}`);
    });
  }
  await page.goto(base + path);
  await page.waitForLoadState('networkidle');
  // A sim with nothing to animate may hide its transport bar, so wait for the
  // controls to exist rather than to be visible.
  const mounted = !play || (await page.waitForSelector('#sim-transport button', { state: 'attached', timeout: 5000 }).catch(() => null));
  if (!mounted) errors.push('sim did not mount (no transport controls)');
  else if (play) {
    // Autoplaying sims are already running; clicking would pause them.
    if ((await mounted.isVisible()) && (await mounted.getAttribute('aria-label')) === 'Play') await mounted.click();
    await page.waitForTimeout(1200);
    const blank = await page.evaluate(() => {
      const c = document.getElementById('sim-canvas');
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      const first = d.slice(0, 4).join();
      for (let i = 0; i < d.length; i += 4 * 97) if (d.slice(i, i + 4).join() !== first) return false;
      return true;
    });
    if (blank) errors.push('canvas is blank');
    const hScroll = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    if (hScroll) errors.push('page scrolls horizontally');
  }
  const shot = `output/${name}-${theme}-${width}.png`;
  // Sims: just the canvas + panel (the notes below are static text).
  if (play && mounted) await page.locator('.sim-layout').screenshot({ path: shot });
  else await page.screenshot({ path: shot, fullPage: true });
  await page.close();
  const status = errors.length ? 'FAIL' : 'ok  ';
  if (errors.length) failures++;
  console.log(`${status} ${name} @${width}${errors.length ? '\n     ' + errors.join('\n     ') : ''}`);
}

for (const width of widths) {
  await visit('/', 'home', width, { play: false });
  for (const s of sims) await visit(`/sim.html?id=${s.id}`, s.id, width, { play: true });
}
await browser.close();
server.close();
if (failures) {
  console.error(`\n${failures} page(s) failed`);
  process.exit(1);
}
console.log('\nall pages rendered without errors');
