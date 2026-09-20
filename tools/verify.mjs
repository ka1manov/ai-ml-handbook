#!/usr/bin/env node
// Structural verification for the handbook. Dev-only; never required to serve.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SKIP = new Set(['docs', 'tools', '.git', 'node_modules', '.idea', '.venv', 'src']);
const BASE = 'https://ka1manov.github.io/ai-ml-handbook/';
const failures = [];
const fail = (file, msg) => failures.push(`${file}: ${msg}`);

function htmlFiles(dir = ROOT, acc = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) htmlFiles(full, acc);
    else if (name.endsWith('.html')) acc.push(full);
  }
  return acc;
}

function check(file) {
  const rel = relative(ROOT, file).split(sep).join('/');
  const html = readFileSync(file, 'utf8');

  // --- document basics -------------------------------------------------
  if (!/^<!doctype html>/i.test(html.trim())) fail(rel, 'missing <!doctype html>');
  if (!/<html[^>]+lang="en"/.test(html)) fail(rel, 'missing lang="en" on <html>');
  if (!/<meta charset="utf-8">/i.test(html)) fail(rel, 'missing charset meta');
  if (!/name="viewport"[^>]*viewport-fit=cover/.test(html)) fail(rel, 'viewport missing viewport-fit=cover');

  // --- exactly one h1, no skipped heading levels -----------------------
  const h1s = html.match(/<h1\b/g) || [];
  if (h1s.length !== 1) fail(rel, `expected exactly 1 <h1>, found ${h1s.length}`);
  const levels = [...html.matchAll(/<h([1-6])\b/g)].map((m) => Number(m[1]));
  for (let i = 1; i < levels.length; i++) {
    if (levels[i] > levels[i - 1] + 1) {
      fail(rel, `heading jumps h${levels[i - 1]} -> h${levels[i]}`);
      break;
    }
  }

  // --- social meta -----------------------------------------------------
  for (const prop of ['og:title', 'og:description', 'og:image', 'og:url', 'og:type']) {
    if (!new RegExp(`property="${prop}"`).test(html)) fail(rel, `missing ${prop}`);
  }
  if (!/name="twitter:card" content="summary_large_image"/.test(html)) fail(rel, 'missing twitter:card');
  if (!/name="twitter:creator" content="@ka1manov"/.test(html)) fail(rel, 'missing twitter:creator');
  if (!/name="twitter:site" content="@ka1manov"/.test(html)) fail(rel, 'missing twitter:site');
  if (!/rel="canonical"/.test(html)) fail(rel, 'missing canonical link');
  const og = html.match(/property="og:url" content="([^"]+)"/);
  if (og && !og[1].startsWith(BASE)) fail(rel, `og:url not under ${BASE}`);
  if (!/<meta name="description"/.test(html)) fail(rel, 'missing meta description');
  if (!/<title>[^<]{10,70}<\/title>/.test(html)) fail(rel, 'title missing or not 10-70 chars');

  // --- byline ----------------------------------------------------------
  if (!/https:\/\/x\.com\/ka1manov/.test(html)) fail(rel, 'missing @ka1manov byline link');

  // --- no runtime dependencies ----------------------------------------
  for (const m of html.matchAll(/<script[^>]+src="([^"]+)"/g)) {
    if (/^https?:/.test(m[1])) fail(rel, `external script not allowed: ${m[1]}`);
  }
  for (const m of html.matchAll(/<link\b([^>]*)>/g)) {
    const tag = m[1];
    if (!/rel="stylesheet"/.test(tag)) continue;
    const href = (tag.match(/href="([^"]+)"/) || [])[1] || '';
    if (/^https?:/.test(href) && !/fonts\.googleapis\.com|fonts\.gstatic\.com/.test(href)) {
      fail(rel, `external stylesheet not allowed: ${href}`);
    }
  }

  // --- accessibility ---------------------------------------------------
  for (const m of html.matchAll(/<img\b(?![^>]*\balt=)[^>]*>/g)) fail(rel, `img without alt: ${m[0].slice(0, 60)}`);
  for (const m of html.matchAll(/<a\b([^>]*)>/g)) {
    const tag = m[1];
    if (!/target="_blank"/.test(tag)) continue;
    if (!/rel="[^"]*noopener[^"]*"/.test(tag)) {
      fail(rel, `target=_blank without rel=noopener: ${m[0].slice(0, 70)}`);
    }
  }
  for (const m of html.matchAll(/<svg\b([^>]*)>/g)) {
    const attrs = m[1];
    const isDecorative = /aria-hidden="true"/.test(attrs);
    const isLabelled = /role="img"/.test(attrs) && /aria-label=/.test(attrs);
    if (!isDecorative && !isLabelled) fail(rel, 'svg needs aria-hidden="true" or role="img" + aria-label');
  }
  for (const m of html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)) {
    const hasText = m[2].replace(/<[^>]+>/g, '').trim().length > 0;
    if (!hasText && !/aria-label=/.test(m[1])) fail(rel, 'button without text or aria-label');
  }

  // --- overflow containment -------------------------------------------
  const tableCount = (html.match(/<table\b/g) || []).length;
  const wrappedTables = (html.match(/class="[^"]*\bscroll-x\b[^"]*"[^>]*>\s*<table\b/g) || []).length;
  if (tableCount !== wrappedTables) fail(rel, `${tableCount - wrappedTables} <table> not wrapped in .scroll-x`);

  // --- local asset references resolve ----------------------------------
  const dirOf = dirname(file);
  for (const m of html.matchAll(/(?:href|src)="(?!https?:|mailto:|#|data:)([^"#?]+)/g)) {
    const target = m[1].startsWith('/') ? join(ROOT, m[1]) : join(dirOf, m[1]);
    if (!existsSync(target)) fail(rel, `broken local reference: ${m[1]}`);
  }
}

const files = htmlFiles();
files.forEach(check);

// --- repo-level checks -------------------------------------------------
if (!existsSync(join(ROOT, '.nojekyll'))) failures.push('repo: missing .nojekyll');
const cssPath = join(ROOT, 'assets/css/site.css');
if (existsSync(cssPath)) {
  const css = readFileSync(cssPath, 'utf8');
  if (!/prefers-reduced-motion/.test(css)) failures.push('site.css: no prefers-reduced-motion block');
  if (/box-shadow:\s*(?!none)/.test(css)) failures.push('site.css: box-shadow is forbidden by the design system');
  if (/linear-gradient|radial-gradient/.test(css)) failures.push('site.css: gradients are forbidden by the design system');
  for (const tok of ['--bg', '--bg-raised', '--bg-inset', '--border', '--border-strong', '--text', '--text-dim', '--accent', '--ok', '--warn', '--graph', '--font-mono', '--font-prose', '--measure']) {
    if (!new RegExp(`\\${tok}:`).test(css)) failures.push(`site.css: missing token ${tok}`);
  }
}
const jsDir = join(ROOT, 'assets/js');
if (existsSync(jsDir)) {
  for (const f of readdirSync(jsDir).filter((n) => n.endsWith('.js'))) {
    const js = readFileSync(join(jsDir, f), 'utf8');
    if (/localStorage/.test(js) && !/try\s*\{/.test(js)) failures.push(`assets/js/${f}: localStorage not wrapped in try/catch`);
  }
}

if (failures.length) {
  console.error(`\nFAIL — ${failures.length} problem(s) across ${files.length} page(s):\n`);
  for (const f of failures) console.error('  ' + f);
  process.exit(1);
}
console.log(`PASS — ${files.length} page(s) verified.`);
