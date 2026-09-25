#!/usr/bin/env node
// Deploy-time cache busting: copies site/ to an output dir and stamps every
// asset URL with ?v=<content hash>, so a deploy is never half-seen through a
// browser cache. GitHub Pages sends max-age=600; without this a fresh page can
// run against a 10-minute-old catalog.js and "the new sim isn't there".
//
// Same idea as edmonton-tax-viz's scripts/build_site.py (styles.css?v=<hash>),
// extended for ES modules: a ?v= on the entry <script> does not reach the files
// it imports, so each HTML page also gets an import map that sends every
// module URL (static imports and the sim page's dynamic import alike) to its
// hashed twin. Content hash, not commit sha: an unchanged file keeps its URL
// and stays cached across deploys.
//
// Limit: the HTML itself cannot be stamped. A browser holding stale HTML holds
// the old map with it until max-age runs out or the page is hard-refreshed.
//
//   node tools/build-site.js [--out _site]
import { createHash } from 'node:crypto';
import { cpSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SITE = resolve(fileURLToPath(new URL('../site', import.meta.url)));

export const hashOf = (buf) => createHash('sha256').update(buf).digest('hex').slice(0, 10);

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const urlOf = (root, file) => relative(root, file).split(sep).join('/');

// { "js/lib/format.js": "3f9a…", … } for every .js and .css under root.
export function assetHashes(root) {
  const out = {};
  for (const f of walk(root)) if (/\.(js|css)$/.test(f)) out[urlOf(root, f)] = hashOf(readFileSync(f));
  return out;
}

// Rewrites one HTML page: stylesheet and entry-script URLs get ?v=, and an
// import map covering every module goes in before the first module script.
// Fails loudly when the page no longer has the shape this expects.
export function stampHtml(html, hashes, name = 'page') {
  const fail = (msg) => {
    throw new Error(`build-site: ${name}: ${msg}`);
  };
  let n = 0;
  html = html.replace(/(<link rel="stylesheet" href=")([^"?]+\.css)(")/g, (m, a, url, b) => {
    if (!hashes[url]) fail(`stylesheet ${url} is not in site/`);
    n++;
    return `${a}${url}?v=${hashes[url]}${b}`;
  });
  if (n === 0) fail('no stylesheet link found');

  const entries = [];
  html = html.replace(/(<script type="module" src=")([^"?]+\.js)(")/g, (m, a, url, b) => {
    if (!hashes[url]) fail(`module script ${url} is not in site/`);
    entries.push(url);
    return `${a}${url}?v=${hashes[url]}${b}`;
  });
  if (entries.length === 0) fail('no module script found');
  if (html.includes('type="importmap"')) fail('already has an import map');

  const imports = {};
  for (const [url, h] of Object.entries(hashes)) if (url.endsWith('.js')) imports[`./${url}`] = `./${url}?v=${h}`;
  const map = `<script type="importmap">${JSON.stringify({ imports })}</script>\n  `;
  const at = html.indexOf('<script type="module"');
  return html.slice(0, at) + map + html.slice(at);
}

export function build(src = SITE, out) {
  rmSync(out, { recursive: true, force: true });
  cpSync(src, out, { recursive: true });
  const hashes = assetHashes(out);
  const pages = readdirSync(out).filter((f) => f.endsWith('.html'));
  for (const page of pages) {
    const p = join(out, page);
    writeFileSync(p, stampHtml(readFileSync(p, 'utf8'), hashes, page));
  }
  return { pages, assets: Object.keys(hashes).length };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const i = process.argv.indexOf('--out');
  const out = resolve(i > 0 ? process.argv[i + 1] : '_site');
  if (out === SITE || out.startsWith(SITE + sep)) throw new Error('build-site: --out must be outside site/');
  const r = build(SITE, out);
  console.log(`built ${out}: ${r.pages.length} pages stamped, ${r.assets} assets hashed`);
}
