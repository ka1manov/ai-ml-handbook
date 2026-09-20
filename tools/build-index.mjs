#!/usr/bin/env node
/* Dev-only: regenerates assets/data/search-index.json from the shipped HTML.
   The committed JSON is what serves; deleting tools/ leaves search working. */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SKIP = new Set(['docs', 'tools', '.git', 'node_modules', '.idea', '.venv', 'src', 'assets']);

const strip = (s) => s.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

function htmlFiles(dir = ROOT, acc = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) htmlFiles(full, acc);
    else if (name.endsWith('.html')) acc.push(full);
  }
  return acc;
}

const entries = [];
const seen = new Set();
const push = (t, u, s, k) => {
  const key = u + '|' + t;
  if (!t || seen.has(key)) return;
  seen.add(key);
  entries.push(k ? { t, u, s, k } : { t, u, s });
};

for (const file of htmlFiles()) {
  const rel = relative(ROOT, file).split(sep).join('/');
  const html = readFileSync(file, 'utf8');
  const pageTitle = strip((html.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || rel);
  const short = pageTitle.replace(/\s*[—:|].*$/, '');

  // the page itself
  const desc = (html.match(/<meta name="description" content="([^"]+)"/) || [])[1] || '';
  push(pageTitle, rel, 'page', strip(desc).slice(0, 180));

  // section headings with ids
  for (const m of html.matchAll(/<section class="section" id="([^"]+)"[\s\S]{0,900}?<h2[^>]*>([\s\S]*?)<\/h2>/g)) {
    push(strip(m[2]), `${rel}#${m[1]}`, short);
  }
  // sub-headings, excluding roadmap nodes (handled below with their anchor)
  for (const m of html.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>/g)) {
    if (/<label for=/.test(m[1])) continue;
    const t = strip(m[1]);
    if (t.length > 3 && t.length < 90) push(t, rel, short);
  }
  // roadmap nodes
  for (const m of html.matchAll(/<h3><label for="([^"]+)">([\s\S]*?)<\/label><\/h3>/g)) {
    push(strip(m[2]), `${rel}#${m[1].replace(/-n\d+$/, '')}`, 'roadmap');
  }
  // interview questions
  for (const m of html.matchAll(/<article class="qa" id="([^"]+)" data-track="([^"]+)" data-difficulty="([^"]+)"[\s\S]{0,400}?<summary class="qa__q">([\s\S]*?)<\/summary>/g)) {
    push(strip(m[4]), `${rel}#${m[1]}`, `interview · ${m[2]} · ${m[3]}`, m[2]);
  }
  // field notes
  for (const m of html.matchAll(/<div class="tip__body"><b>([\s\S]*?)<\/b>/g)) {
    push(strip(m[1]), rel, 'field note');
  }
}

// Roadmap stage anchors are emitted per node; collapse to one per stage heading.
writeFileSync(join(ROOT, 'assets/data/search-index.json'), JSON.stringify(entries));
const bytes = statSync(join(ROOT, 'assets/data/search-index.json')).size;
console.log(`search index: ${entries.length} entries, ${(bytes / 1024).toFixed(1)} KB`);
