#!/usr/bin/env node
/* Dev-only: writes sitemap.xml and robots.txt from the shipped HTML.
   Committed output is what serves. */
import { readdirSync, statSync, writeFileSync, readFileSync } from 'node:fs';
import { join, relative, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'https://ka1manov.github.io/ai-ml-handbook/';
const SKIP = new Set(['docs', 'tools', '.git', 'node_modules', '.idea', '.venv', 'src', 'assets']);

let updated = new Date().toISOString().slice(0, 10);
try { updated = execSync('git log -1 --format=%cs', { encoding: 'utf8' }).trim() || updated; } catch {}

function files(dir = ROOT, acc = []) {
  for (const n of readdirSync(dir)) {
    if (SKIP.has(n)) continue;
    const f = join(dir, n);
    if (statSync(f).isDirectory()) files(f, acc);
    else if (n.endsWith('.html')) acc.push(f);
  }
  return acc;
}

const PRIORITY = { 'index.html': '1.0', 'rag.html': '0.9', 'interview.html': '0.9', 'calculators.html': '0.9' };

const urls = files()
  .map((f) => relative(ROOT, f).split(sep).join('/'))
  .filter((p) => p !== '404.html')
  .sort()
  .map((p) => {
    const loc = BASE + (p === 'index.html' ? '' : p);
    const pr = PRIORITY[p] || (p.startsWith('articles/') ? '0.8' : '0.7');
    return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${updated}</lastmod>\n    <priority>${pr}</priority>\n  </url>`;
  });

writeFileSync(join(ROOT, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);

writeFileSync(join(ROOT, 'robots.txt'),
  `# The AI/ML Engineering Handbook — free to read, free to index.\nUser-agent: *\nAllow: /\n\nSitemap: ${BASE}sitemap.xml\n`);

console.log(`seo: sitemap.xml (${urls.length} urls), robots.txt`);
