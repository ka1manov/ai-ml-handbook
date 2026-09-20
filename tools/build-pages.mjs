#!/usr/bin/env node
/* Dev-only page assembler.
   Reads src/*.part (front matter + <main> content) and writes the committed
   HTML. The site never runs this — deleting tools/ leaves a working site.
   It exists so the shared chrome cannot drift across twelve pages. */
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');
const BASE_URL = 'https://ka1manov.github.io/ai-ml-handbook/';

const NAV = [
  ['index.html', 'roadmap'],
  ['rag.html', 'rag'],
  ['interview.html', 'interview'],
  ['startups.html', 'startups'],
  ['tips.html', 'field-notes'],
  ['articles/index.html', 'articles'],
];

function head(m) {
  const url = BASE_URL + (m.path === 'index.html' ? '' : m.path);
  return `<!doctype html>
<html lang="en" data-base="${m.base}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${m.title}</title>
<meta name="description" content="${m.desc}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="${m.ogtype || 'website'}">
<meta property="og:site_name" content="The AI/ML Engineering Handbook">
<meta property="og:title" content="${m.ogtitle || m.title}">
<meta property="og:description" content="${m.desc}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${BASE_URL}assets/img/${m.og}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${m.ogtitle || m.title} — the AI/ML Engineering Handbook by @ka1manov">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@ka1manov">
<meta name="twitter:creator" content="@ka1manov">
<meta name="twitter:image" content="${BASE_URL}assets/img/${m.og}">
<meta name="author" content="@ka1manov">
<meta name="theme-color" content="#0C0B08" media="(prefers-color-scheme: dark)">
<meta name="theme-color" content="#F2EEE3" media="(prefers-color-scheme: light)">
<script>try{document.documentElement.setAttribute('data-theme',localStorage.getItem('amh:theme')||(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'))}catch(e){document.documentElement.setAttribute('data-theme','dark')}</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,400;0,500;0,600;1,400&display=swap">
<link rel="stylesheet" href="${m.base}assets/css/site.css">
<link rel="icon" href="${m.base}assets/img/favicon.svg" type="image/svg+xml">
</head>
<body>
<a class="sr-only" href="#main">Skip to content</a>
${m.readbar === 'yes' ? '<div class="readbar-track"><div class="readbar" data-readbar></div></div>\n' : ''}<header class="topbar">
  <div class="shell topbar__inner">
    <a class="topbar__brand" href="${m.base}index.html">~/<span class="topbar__brand-long">ai-ml-</span>handbook</a>
    <span class="topbar__by">by <a href="https://x.com/ka1manov" rel="me noopener" target="_blank">@ka1manov</a></span>
    <nav class="topbar__links" aria-label="Sections">
${NAV.map(([h, l]) => `      <a href="${m.base}${h}">${l}</a>`).join('\n')}
    </nav>
    <div class="topbar__tools">
      <button class="btn" type="button" data-search-open aria-label="Search the handbook">[ / ]</button>
      <button class="btn" type="button" data-theme-toggle>[ crt ]</button>
      <button class="btn" type="button" data-nav-toggle>[ menu ]</button>
    </div>
  </div>
  <div class="shell">
    <nav class="navmenu" id="navmenu" aria-label="Sections, compact" hidden>
${NAV.map(([h, l]) => `      <a href="${m.base}${h}">${l}</a>`).join('\n')}
    </nav>
  </div>
</header>
`;
}

function foot(m) {
  return `
<footer class="footer">
  <div class="shell footer__grid">
    <div>
      <h2>about</h2>
      <p>The AI/ML Engineering Handbook. Written for people who ship systems, not notebooks.</p>
      <p style="margin-top:var(--sp-3)">A gift to my subscribers on X. Free, no signup, no tracking, no ads.</p>
      <p style="margin-top:var(--sp-3)">by <a href="https://x.com/ka1manov" rel="me noopener" target="_blank">@ka1manov</a></p>
    </div>
    <div>
      <h2>contents</h2>
      <ul>
${NAV.map(([h, l]) => `        <li><a href="${m.base}${h}">${l}</a></li>`).join('\n')}
      </ul>
    </div>
    <div>
      <h2>this page</h2>
      <ul>
        <li><a href="https://x.com/ka1manov" rel="noopener" target="_blank">follow on X</a></li>
        <li><a href="${m.base}index.html#how-to-use">how to use this</a></li>
        <li><span class="meta">prose CC BY 4.0<br>code MIT</span></li>
      </ul>
    </div>
  </div>
</footer>

<div class="search" id="search" role="dialog" aria-modal="true" aria-label="Search the handbook" hidden>
  <div class="search__panel">
    <input class="search__input" type="search" placeholder="search the handbook…" aria-label="Search query" autocomplete="off" spellcheck="false">
    <ul class="search__results" role="listbox" aria-label="Search results"></ul>
    <p class="search__empty" hidden>No matches.</p>
    <p class="search__foot"><span class="kbd">↑</span> <span class="kbd">↓</span> to move · <span class="kbd">enter</span> to open · <span class="kbd">esc</span> to close</p>
  </div>
</div>

<script src="${m.base}assets/js/theme.js" defer></script>
<script src="${m.base}assets/js/nav.js" defer></script>
<script src="${m.base}assets/js/search.js" defer></script>
${(m.scripts || '').split(',').filter(Boolean).map((s) => `<script src="${m.base}assets/js/${s.trim()}.js" defer></script>`).join('\n')}
</body>
</html>
`;
}

/* A four-column prose table wraps to ~24 characters per column inside the
   reading measure, which is unreadable. Tag those so they scroll instead. */
function markWideTables(html) {
  return html.replace(/<div class="scroll-x"([^>]*)>([\s\S]*?)<\/table>/g, (m, attrs, inner) => {
    const head = inner.match(/<thead>[\s\S]*?<\/thead>/);
    const cols = head ? (head[0].match(/<th\b/g) || []).length : 0;
    return cols >= 4
      ? m.replace('class="scroll-x"', 'class="scroll-x scroll-x--wide"')
      : m;
  });
}

function build(file) {
  const raw = readFileSync(join(SRC, file), 'utf8');
  const split = raw.indexOf('\n---\n');
  const meta = Object.fromEntries(
    raw.slice(0, split).trim().split('\n').map((l) => {
      const i = l.indexOf(':');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
  );
  meta.base = meta.path.includes('/') ? '../' : './';
  const body = raw.slice(split + 5);
  const out = join(ROOT, meta.path);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, head(meta) + markWideTables(body.trimEnd()) + '\n' + foot(meta));
  return meta.path;
}

const parts = readdirSync(SRC).filter((f) => f.endsWith('.part')).sort();
const built = parts.map(build);
console.log(`built ${built.length} page(s):\n  ` + built.join('\n  '));
