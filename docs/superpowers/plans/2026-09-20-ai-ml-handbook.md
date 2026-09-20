# AI/ML Engineering Handbook Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a zero-build, terminal-aesthetic static site containing ~30,000 words of senior-level AI/ML engineering content, hosted on GitHub Pages at `https://ka1manov.github.io/ai-ml-handbook/`.

**Architecture:** Eleven hand-written HTML pages sharing one CSS file and five vanilla-JS modules. No framework, no bundler, no CI. A Node verification harness (`tools/verify.mjs`) enforces structural rules on every page and acts as the test gate for every task. Playwright drives visual and console verification at two breakpoints in two themes.

**Tech Stack:** HTML5, CSS custom properties, vanilla ES modules, Node 26 (dev-only tooling), Playwright (dev-only verification). Zero runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-09-20-ai-ml-handbook-design.md`

## Global Constraints

Copied verbatim from the spec. Every task's requirements implicitly include this section.

- **Zero-build guarantee.** Nothing in `tools/` may be required to serve the site. Deleting `tools/` must leave a working site.
- **No runtime dependencies.** No npm packages referenced by any shipped HTML. One external stylesheet only: the JetBrains Mono Google Font, with fallback `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`.
- **Canonical base URL:** `https://ka1manov.github.io/ai-ml-handbook/`
- **Byline:** `@ka1manov`, linked to `https://x.com/ka1manov`, in the header and footer of every page.
- **Social meta on every page:** `og:title`, `og:description`, `og:image`, `og:url`, `og:type`, `twitter:card=summary_large_image`, `twitter:creator=@ka1manov`, `twitter:site=@ka1manov`.
- **Dark is the default theme.** Light theme is a toggle, persisted to `localStorage`, honoring `prefers-color-scheme` on first visit only.
- **Palette tokens** (exact hex, dark / light):
  `--bg` `#0B0D0C` / `#F4F1EA` · `--bg-raised` `#121514` / `#FFFFFF` · `--bg-inset` `#080A09` / `#EAE6DC` · `--border` `#242927` / `#D6D0C4` · `--text` `#D8DAD6` / `#1A1C1B` · `--text-dim` `#8A918C` / `#5C625E` · `--accent` `#FFB000` / `#9A5B00` · `--accent-alt` `#4AF626` / `#1E7A12`
- **Prose:** 17px, line-height 1.75, max measure 68ch.
- **Restraint:** one accent per view; no gradients; no box-shadows; no blur; 1px hairline borders only.
- **Accessibility:** one `h1` per page; heading levels never skip; every control keyboard-operable with a visible focus ring; WCAG AA contrast in both themes; `prefers-reduced-motion` honored.
- **Responsive:** 360px to 2560px, no horizontal page scroll. Only `pre`, `table` and `svg` wrappers may scroll, each in its own `overflow-x:auto` container.
- **Console must be clean.** Zero errors, zero warnings, on every page.
- **All `localStorage` access wrapped in try/catch.** A page must render correctly when storage throws.
- **Content rubric (spec §10).** Reject and rewrite any passage that: states a version-dependent claim without dating it; presents a technique without its failure mode or cost; gives a number without its conditions; describes an architecture without saying when it is wrong; cites a benchmark as production evidence; or reads as a paraphrase of documentation.

---

### Task 1: Verification harness and repo scaffolding

The harness is built first because it is the test gate for every subsequent task.

**Files:**
- Create: `tools/verify.mjs`
- Create: `tools/serve.mjs`
- Create: `.nojekyll`
- Create: `.gitignore`

**Interfaces:**
- Consumes: nothing.
- Produces: `node tools/verify.mjs` — exits 0 when all checks pass, exits 1 and prints one line per failure otherwise. Every later task runs this as its test step. `node tools/serve.mjs` serves the repo root on `http://localhost:4173`.

- [ ] **Step 1: Write the failing check runner**

Create `tools/verify.mjs`. It walks every `.html` file in the repo (excluding `docs/` and `tools/`) and asserts the structural rules from Global Constraints.

```js
#!/usr/bin/env node
// Structural verification for the handbook. Dev-only; never required to serve.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const SKIP = new Set(['docs', 'tools', '.git', 'node_modules', '.idea', '.venv']);
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
  const levels = [...html.matchAll(/<h([1-6])\b/g)].map(m => Number(m[1]));
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
  for (const m of html.matchAll(/<link[^>]+href="([^"]+)"[^>]*>/g)) {
    const href = m[1];
    if (/^https?:/.test(href) && !/fonts\.googleapis\.com|fonts\.gstatic\.com/.test(href)) {
      fail(rel, `external stylesheet not allowed: ${href}`);
    }
  }

  // --- accessibility ---------------------------------------------------
  for (const m of html.matchAll(/<img\b(?![^>]*\balt=)[^>]*>/g)) fail(rel, `img without alt: ${m[0].slice(0, 60)}`);
  for (const m of html.matchAll(/<a\b[^>]*target="_blank"(?![^>]*rel=)[^>]*>/g)) {
    fail(rel, `target=_blank without rel: ${m[0].slice(0, 60)}`);
  }
  for (const m of html.matchAll(/<svg\b([^>]*)>/g)) {
    const attrs = m[1];
    const isDecorative = /aria-hidden="true"/.test(attrs);
    const isLabelled = /role="img"/.test(attrs) && /aria-label=/.test(attrs);
    if (!isDecorative && !isLabelled) fail(rel, 'svg needs aria-hidden="true" or role="img" + aria-label');
  }
  // every button/summary needs a discernible name
  for (const m of html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)) {
    const hasText = m[2].replace(/<[^>]+>/g, '').trim().length > 0;
    if (!hasText && !/aria-label=/.test(m[1])) fail(rel, 'button without text or aria-label');
  }

  // --- overflow containment -------------------------------------------
  for (const m of html.matchAll(/<table\b/g)) void m; // tables must be wrapped
  const tableCount = (html.match(/<table\b/g) || []).length;
  const wrappedTables = (html.match(/class="[^"]*\bscroll-x\b[^"]*"[^>]*>\s*<table\b/g) || []).length;
  if (tableCount !== wrappedTables) fail(rel, `${tableCount - wrappedTables} <table> not wrapped in .scroll-x`);

  // --- local asset references resolve ----------------------------------
  const dirOf = file.slice(0, file.lastIndexOf('/'));
  for (const m of html.matchAll(/(?:href|src)="(?!https?:|mailto:|#|data:)([^"#?]+)/g)) {
    const target = m[1].startsWith('/') ? join(ROOT, m[1]) : join(dirOf, m[1]);
    if (!existsSync(target)) fail(rel, `broken local reference: ${m[1]}`);
  }
}

const files = htmlFiles();
files.forEach(check);

// --- repo-level checks -------------------------------------------------
if (!existsSync(join(ROOT, '.nojekyll'))) failures.push('repo: missing .nojekyll');
if (existsSync(join(ROOT, 'assets/css/site.css'))) {
  const css = readFileSync(join(ROOT, 'assets/css/site.css'), 'utf8');
  if (!/prefers-reduced-motion/.test(css)) failures.push('site.css: no prefers-reduced-motion block');
  if (/box-shadow:\s*(?!none)/.test(css)) failures.push('site.css: box-shadow is forbidden by the design system');
  if (/linear-gradient|radial-gradient/.test(css)) failures.push('site.css: gradients are forbidden by the design system');
  for (const tok of ['--bg', '--bg-raised', '--bg-inset', '--border', '--text', '--text-dim', '--accent', '--accent-alt']) {
    if (!new RegExp(`\\${tok}:`).test(css)) failures.push(`site.css: missing token ${tok}`);
  }
}
for (const f of readdirSync(join(ROOT, 'assets/js')).filter(n => n.endsWith('.js'))) {
  const js = readFileSync(join(ROOT, 'assets/js', f), 'utf8');
  if (/localStorage/.test(js) && !/try\s*{/.test(js)) failures.push(`assets/js/${f}: localStorage not wrapped in try/catch`);
}

if (failures.length) {
  console.error(`\nFAIL — ${failures.length} problem(s) across ${files.length} page(s):\n`);
  for (const f of failures) console.error('  ' + f);
  process.exit(1);
}
console.log(`PASS — ${files.length} page(s) verified.`);
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node tools/verify.mjs`
Expected: FAIL — `repo: missing .nojekyll`, plus a crash or failure because `assets/js` is empty and no HTML exists yet. This confirms the harness actually runs and reports.

- [ ] **Step 3: Create the supporting files**

`.nojekyll` — empty file. Prevents GitHub Pages' Jekyll step from processing the site.

`.gitignore`:
```
.DS_Store
node_modules/
.venv/
.idea/
*.log
```

`tools/serve.mjs`:
```js
#!/usr/bin/env node
// Minimal static server for local verification. Dev-only.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const PORT = 4173;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
};

createServer(async (req, res) => {
  try {
    let path = decodeURIComponent(req.url.split('?')[0]);
    if (path.endsWith('/')) path += 'index.html';
    let full = join(ROOT, path);
    try {
      if ((await stat(full)).isDirectory()) full = join(full, 'index.html');
    } catch { /* fall through to readFile error */ }
    const body = await readFile(full);
    res.writeHead(200, { 'content-type': TYPES[extname(full)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('404');
  }
}).listen(PORT, () => console.log(`serving ${ROOT} on http://localhost:${PORT}`));
```

Also make `assets/js/.gitkeep` so the harness's `readdirSync` on `assets/js` does not throw before Task 3 lands.

- [ ] **Step 4: Run the harness to verify it now passes on an empty site**

Run: `node tools/verify.mjs`
Expected: PASS — `PASS — 0 page(s) verified.`

- [ ] **Step 5: Verify the server starts and 404s cleanly**

Run: `node tools/serve.mjs & sleep 1; curl -s -o /dev/null -w '%{http_code}\n' http://localhost:4173/nope.html; kill %1`
Expected: `404`

- [ ] **Step 6: Commit**

```bash
git add tools/verify.mjs tools/serve.mjs .nojekyll .gitignore assets/js/.gitkeep
git commit -m "build: verification harness and static dev server"
```

---

### Task 2: Design system stylesheet

**Files:**
- Create: `assets/css/site.css`

**Interfaces:**
- Consumes: nothing.
- Produces: the class vocabulary every page uses. Exact names, because later tasks reference them and their implementers see only their own task:
  - Layout: `.shell`, `.win`, `.win__bar`, `.win__dots`, `.win__title`, `.win__body`, `.prose`, `.scroll-x`, `.grid-2`, `.grid-3`
  - Nav: `.topbar`, `.topbar__brand`, `.topbar__links`, `.topbar__tools`, `.footer`, `.tree`, `.tree__item`
  - Content: `.prompt`, `.rule`, `.tag`, `.tag--junior`, `.tag--mid`, `.tag--senior`, `.callout`, `.callout--warn`, `.callout--note`, `.callout--kill`, `.kbd`, `.meta`, `.lede`
  - Roadmap: `.stage`, `.stage__head`, `.stage__num`, `.node`, `.node__check`, `.node__body`, `.node__prove`, `.node__time`
  - Interview: `.qa`, `.qa__q`, `.qa__a`, `.qa__weak`, `.qa__strong`, `.filters`, `.filter-btn`, `.filter-btn[aria-pressed="true"]`
  - Overlay: `.search`, `.search__input`, `.search__results`, `.search__hit`, `.search__hit[aria-selected="true"]`
  - Progress: `.readbar`, `.progress-dash`, `.progress-dash__fill`
  - Utility: `.sr-only`, `.visually-focusable`

- [ ] **Step 1: Write the stylesheet**

Structure the file in this order: `@font-face`/import · tokens on bare `:root` · dark-mode media query guarded `:root:not([data-theme="light"])` · `:root[data-theme="light"]` · reset · typography · layout · components · utilities · `prefers-reduced-motion` · print.

Non-negotiable details:
- The light palette is defined on bare `:root`. The dark palette is defined **twice** — once under `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { … } }` and once under `:root[data-theme="dark"]` — so the toggle wins in both directions and no color has its only definition inside a media query.
- Because dark is the *default* rather than the system default, also stamp `data-theme="dark"` from `theme.js` on first visit when no stored preference and no `prefers-color-scheme: light`. See Task 3.
- `body` gets an explicit `background: var(--bg)`.
- `.prose` sets `max-width: 68ch; font-size: 17px; line-height: 1.75;`.
- `.prose p + p` gets `margin-top: 1.15em`. No `<br>` spacing anywhere.
- `pre`, `.scroll-x` get `overflow-x: auto` and `-webkit-overflow-scrolling: touch`.
- Focus: `:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }`. Never `outline: none` without a replacement.
- `.win__bar` renders the `[_][□][X]` chrome using text, not images.
- Reduced motion: `@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: .001ms !important; animation-iteration-count: 1 !important; transition-duration: .001ms !important; scroll-behavior: auto !important; } }`
- Side gutters: `.shell { max-width: 1180px; margin-inline: auto; padding-inline: clamp(16px, 4vw, 40px); }` — set once, never zeroed by a `padding` shorthand.
- No `box-shadow`, no gradients — the harness fails the build on either.

- [ ] **Step 2: Run the harness to verify token and forbidden-property checks pass**

Run: `node tools/verify.mjs`
Expected: PASS. If it reports `missing token --accent-alt` or `box-shadow is forbidden`, fix and rerun.

- [ ] **Step 3: Verify contrast ratios in both themes**

Run this one-off contrast check:
```bash
node -e '
const hex=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255);
const lin=c=>c<=.03928?c/12.92:((c+.055)/1.055)**2.4;
const L=h=>{const[r,g,b]=hex(h).map(lin);return .2126*r+.7152*g+.0722*b};
const CR=(a,b)=>{const[x,y]=[L(a),L(b)].sort((p,q)=>q-p);return (x+.05)/(y+.05)};
const pairs=[
 ["dark body","#D8DAD6","#0B0D0C",4.5],["dark dim","#8A918C","#0B0D0C",4.5],
 ["dark accent","#FFB000","#0B0D0C",4.5],["dark accent-alt","#4AF626","#0B0D0C",4.5],
 ["light body","#1A1C1B","#F4F1EA",4.5],["light dim","#5C625E","#F4F1EA",4.5],
 ["light accent","#9A5B00","#F4F1EA",4.5],["light accent-alt","#1E7A12","#F4F1EA",4.5]];
let bad=0;
for(const[n,f,b,min]of pairs){const r=CR(f,b);const ok=r>=min;if(!ok)bad++;
 console.log((ok?"PASS":"FAIL"),n,r.toFixed(2),">= "+min)}
process.exit(bad?1:0)'
```
Expected: every line PASS, exit 0. If `--text-dim` fails in either theme, darken/lighten it until it passes and update the token in both the CSS and the spec.

- [ ] **Step 4: Commit**

```bash
git add assets/css/site.css
git commit -m "feat: terminal design system with dual-theme tokens"
```

---

### Task 3: Shared JavaScript modules

**Files:**
- Create: `assets/js/theme.js`
- Create: `assets/js/nav.js`
- Create: `assets/js/progress.js`
- Create: `assets/js/search.js`
- Create: `assets/js/drill.js`
- Delete: `assets/js/.gitkeep`

**Interfaces:**
- Consumes: the class vocabulary from Task 2.
- Produces, each as a plain `<script defer>`-loadable module with no exports (they self-initialize on `DOMContentLoaded`):
  - `theme.js` — reads `localStorage.getItem('amh:theme')`; stamps `data-theme` on `<html>`; binds any `[data-theme-toggle]` button; updates that button's `aria-label` and `aria-pressed`.
  - `nav.js` — binds `[data-nav-toggle]` for the mobile menu; sets `aria-current="page"` on the matching `.topbar__links a`; traps nothing (menu is not modal).
  - `progress.js` — storage key `amh:progress` holding `{ [nodeId]: true }`; binds every `.node__check` input; renders `[data-progress-dash]` as `N/TOTAL`; drives `.readbar` width from scroll position on pages carrying `[data-readbar]`.
  - `search.js` — fetches `assets/data/search-index.json` lazily on first open; opens on `/` or `Ctrl/Cmd+K`; closes on `Escape`; arrow keys move `aria-selected`; `Enter` navigates. Falls back to a visible link if the fetch fails.
  - `drill.js` — storage key `amh:known` holding an array of question ids; binds `.filters` buttons (track + difficulty), the shuffle button, and per-question reveal via native `<details>`; hides/shows `.qa` elements with the `hidden` property, never inline `display`.
- Later tasks reference these exact file names, storage keys, and data attributes.

- [ ] **Step 1: Write `theme.js`**

```js
// Theme: dark by default. Stored preference wins; otherwise system light is honored.
(() => {
  const KEY = 'amh:theme';
  const root = document.documentElement;

  const read = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
  const write = v => { try { localStorage.setItem(KEY, v); } catch { /* storage blocked */ } };

  const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  const initial = read() || (prefersLight ? 'light' : 'dark');
  root.setAttribute('data-theme', initial);

  const sync = btn => {
    const dark = root.getAttribute('data-theme') === 'dark';
    btn.setAttribute('aria-pressed', String(dark));
    btn.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
    btn.textContent = dark ? '[ dark ]' : '[ light ]';
  };

  addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-theme-toggle]').forEach(btn => {
      sync(btn);
      btn.addEventListener('click', () => {
        const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        root.setAttribute('data-theme', next);
        write(next);
        document.querySelectorAll('[data-theme-toggle]').forEach(sync);
      });
    });
  });
})();
```

To avoid a flash of the wrong theme, every page inlines this one-liner in `<head>` **before** the stylesheet:
```html
<script>try{document.documentElement.setAttribute('data-theme',localStorage.getItem('amh:theme')||(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'))}catch(e){document.documentElement.setAttribute('data-theme','dark')}</script>
```

- [ ] **Step 2: Write `progress.js`**

```js
// Roadmap completion + per-article read progress. Degrades silently without storage.
(() => {
  const KEY = 'amh:progress';
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };
  const write = s => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* blocked */ } };

  addEventListener('DOMContentLoaded', () => {
    const boxes = [...document.querySelectorAll('.node__check')];
    if (boxes.length) {
      const state = read();
      const dash = document.querySelector('[data-progress-dash]');
      const fill = document.querySelector('.progress-dash__fill');
      const paint = () => {
        const done = boxes.filter(b => b.checked).length;
        if (dash) dash.textContent = `${done}/${boxes.length}`;
        if (fill) fill.style.width = `${(done / boxes.length) * 100}%`;
      };
      boxes.forEach(b => {
        b.checked = !!state[b.id];
        b.addEventListener('change', () => {
          const s = read();
          if (b.checked) s[b.id] = true; else delete s[b.id];
          write(s); paint();
        });
      });
      paint();
    }

    const bar = document.querySelector('[data-readbar]');
    if (bar) {
      const paintBar = () => {
        const h = document.documentElement.scrollHeight - innerHeight;
        bar.style.width = h > 0 ? `${Math.min(100, (scrollY / h) * 100)}%` : '0%';
      };
      addEventListener('scroll', paintBar, { passive: true });
      addEventListener('resize', paintBar, { passive: true });
      paintBar();
    }
  });
})();
```

- [ ] **Step 3: Write `search.js`, `nav.js`, `drill.js`**

Follow the interface contract above exactly. Requirements that the harness and the Playwright pass will check:
- `search.js` must not fetch on page load — only on first open. Guard with a `let index = null; let loading = null;` promise cache.
- `search.js` must `preventDefault()` on `/` only when focus is not in an `input`, `textarea`, or `[contenteditable]`.
- The overlay must set `aria-modal="true"`, `role="dialog"`, move focus to the input on open, and restore focus to the trigger on close.
- `drill.js` must toggle with `el.hidden = true/false`, never `style.display`.
- `nav.js` must set `aria-expanded` on the toggle and `aria-current="page"` on the active link.

- [ ] **Step 4: Run the harness**

Run: `rm -f assets/js/.gitkeep && node tools/verify.mjs`
Expected: PASS. Specifically no `localStorage not wrapped in try/catch` lines.

- [ ] **Step 5: Commit**

```bash
git add assets/js/
git commit -m "feat: theme, nav, progress, search and drill modules"
```

---

### Task 4: Landing page and roadmap (`index.html`)

**Files:**
- Create: `index.html`

**Interfaces:**
- Consumes: `assets/css/site.css`, `assets/js/{theme,nav,progress,search}.js`, class vocabulary from Task 2.
- Produces: the canonical page chrome — `<head>` block, `.topbar`, `.footer`, byline markup — that Tasks 5–9 copy verbatim, changing only title, description, `og:url`, `og:image`, and `aria-current`. It also produces the roadmap node id scheme `s{stage}-n{index}` (e.g. `s0-n1`), which `progress.js` persists and Task 12's search index references.

- [ ] **Step 1: Build the page chrome**

`<head>` contains, in order: charset, viewport with `viewport-fit=cover`, title, meta description, canonical, the full OG/Twitter set, the inline anti-flash theme script, the font `<link>`, then `site.css`.

`.topbar` contains: brand (`~/ai-ml-handbook`), the byline `by <a href="https://x.com/ka1manov">@ka1manov</a>`, the page links, a search trigger showing `[ / ]`, and the theme toggle.

`.footer` repeats the byline, states the license, and links back to X with a follow CTA.

- [ ] **Step 2: Write the hero and framing**

A terminal window (`.win`) whose body renders a `$ cat README` prompt, the `<h1>`, a lede stating who the handbook is for and who it is not for, the honest reading time, and the gift framing for X subscribers. Include the `[00]`–`[06]` stage index as a file-tree.

- [ ] **Step 3: Write all seven stages**

Seven `.stage` sections, ~6 `.node` entries each, ~42 total. Each node is:

```html
<li class="node">
  <input class="node__check" type="checkbox" id="s0-n1">
  <div class="node__body">
    <h3><label for="s0-n1">Linear algebra you actually use</label></h3>
    <p>…what it is, in one sentence…</p>
    <p class="node__why"><b>Why it matters:</b> …the production failure it prevents…</p>
    <p class="node__prove"><b>Prove it:</b> …a concrete artifact…</p>
    <p class="node__time">~12–18h · assumes you can already write Python confidently</p>
  </div>
</li>
```

Every node must satisfy the content rubric in Global Constraints. In particular, **"Prove it" must name an artifact, not an activity** — "implement batched multi-head attention and match PyTorch's output to 1e-5" is an artifact; "study attention" is not.

- [ ] **Step 4: Verify structure**

Run: `node tools/verify.mjs`
Expected: PASS.

- [ ] **Step 5: Verify the roadmap renders and progress persists**

Run `node tools/serve.mjs &`, then in Playwright: navigate to `http://localhost:4173/`, assert exactly 42 `.node__check` elements, check three of them, reload, assert the same three are still checked and `[data-progress-dash]` reads `3/42`. Assert console has zero errors.

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "feat: landing page and seven-stage roadmap"
```

---

### Task 5: RAG deep dive (`rag.html`)

**Files:**
- Create: `rag.html`

**Interfaces:**
- Consumes: page chrome from Task 4 (copy verbatim, change title/description/og:url/og:image/aria-current).
- Produces: the `.callout--kill` pattern ("when NOT to use this") reused by Tasks 6–9, and the inline-SVG diagram conventions (`role="img"`, `aria-label`, tokens via `fill="var(--accent)"`) reused by Task 10.

- [ ] **Step 1: Write the page in the section order fixed by the spec**

1. Who this is for · what RAG is in one paragraph · **when not to use RAG** (`.callout--kill`)
2. End-to-end anatomy with the inline SVG pipeline diagram
3. Ingestion and chunking — strategy trade-off table in `.scroll-x`
4. Embeddings — model selection, dimensionality, quantization, the cost of getting this wrong
5. Vector indexes — flat vs IVF-PQ vs HNSW, the recall–latency–memory triangle
6. Hybrid retrieval — BM25 + dense, RRF, when lexical beats semantic
7. Reranking — cross-encoders, the latency budget, when to skip it
8. Query transformation — HyDE, multi-query, decomposition, routing
9. Context assembly — ordering, lost-in-the-middle, dedup, citation
10. **Evaluation** — recall@k, nDCG@k, MRR, faithfulness, answer relevance, LLM-as-judge and its documented failure modes, building a golden set
11. **Failure-mode taxonomy** — a table of symptom → likely cause → the diagnostic that distinguishes it → the fix
12. Production — incremental indexing, freshness, multi-tenancy, ACL-aware retrieval, caching, a worked cost model
13. Advanced — contextual retrieval, ColBERT late interaction, GraphRAG, agentic RAG
14. A reference architecture and what to build first

- [ ] **Step 2: Enforce the rubric on every numeric claim**

Every number in this page carries its conditions inline. "HNSW gives ~95% recall@10" is a rubric failure; "HNSW at `M=16, efConstruction=200, efSearch=64` reached ~95% recall@10 on a 1M-vector 768-dim corpus in our test — your recall depends on intrinsic dimensionality, so measure it" passes.

- [ ] **Step 3: Verify structure and reading flow**

Run: `node tools/verify.mjs` → PASS.
Then read the rendered page top to bottom at 1440px. This is a real step: the spec's stated risk is reader fatigue. If any screen is a wall of undifferentiated mono text, break it with a rule, a callout, a table or a diagram.

- [ ] **Step 4: Commit**

```bash
git add rag.html
git commit -m "feat: RAG deep dive with failure-mode taxonomy and eval methodology"
```

---

### Task 6: Interview bank (`interview.html`)

**Files:**
- Create: `interview.html`

**Interfaces:**
- Consumes: page chrome (Task 4), `.callout--kill` (Task 5), `assets/js/drill.js` (Task 3).
- Produces: the question id scheme `q-{track}-{n}` (e.g. `q-rag-7`) consumed by `drill.js` storage and Task 12's search index.

- [ ] **Step 1: Build the filter bar and drill controls**

```html
<div class="filters" role="group" aria-label="Filter questions">
  <button class="filter-btn" data-filter-track="all" aria-pressed="true">all</button>
  <button class="filter-btn" data-filter-track="fundamentals" aria-pressed="false">fundamentals</button>
  <!-- … one per track … -->
</div>
```
Plus difficulty buttons (`junior`/`mid`/`senior`), a `[ shuffle ]` button, and a `[ hide answers ]` toggle. Every button is a real `<button>` with `aria-pressed`.

- [ ] **Step 2: Write 120+ questions across 8 tracks**

Tracks: `fundamentals`, `deep-learning`, `nlp-llm`, `rag-systems`, `system-design`, `mlops`, `coding`, `behavioral`.

Each question:
```html
<article class="qa" id="q-rag-7" data-track="rag-systems" data-difficulty="senior">
  <details>
    <summary class="qa__q">Your RAG system's answers are fluent but wrong. Walk me through the diagnosis.</summary>
    <div class="qa__a">
      <p>…the real answer…</p>
      <p class="qa__weak"><b>Weak answer:</b> …</p>
      <p class="qa__strong"><b>Strong answer:</b> …</p>
    </div>
  </details>
  <span class="tag tag--senior">senior</span>
</article>
```

The `weak`/`strong` contrast is included only where it genuinely discriminates — on questions where every candidate says roughly the same thing, omit it rather than pad.

- [ ] **Step 3: Verify count and filtering**

Run: `node tools/verify.mjs` → PASS.
Then: `grep -c 'class="qa"' interview.html` → expect ≥ 120.
Then in Playwright: click `data-filter-track="rag-systems"`, assert every visible `.qa` has `data-track="rag-systems"`; click `all`, assert all are visible again; toggle `[ hide answers ]`, assert no `<details>` is `open`.

- [ ] **Step 4: Commit**

```bash
git add interview.html
git commit -m "feat: 120+ question interview bank with drill mode"
```

---

### Task 7: Startup playbook (`startups.html`)

**Files:**
- Create: `startups.html`

**Interfaces:**
- Consumes: page chrome (Task 4), `.callout--kill` (Task 5).
- Produces: nothing consumed downstream.

- [ ] **Step 1: Write the page**

Sections: who this is for · what LLMs are actually good at and actually bad at · the build/buy/fine-tune decision tree (inline SVG) · the 0→1 ladder · **unit economics with explicit token math shown as a worked example** · eval-first development · moats, and why "we use an LLM" is not one · team composition by stage · failure patterns (demo-to-prod gap, eval debt, prompt spaghetti, the 80% wall) · privacy, data residency, vendor risk · a 90-day plan.

- [ ] **Step 2: Make the cost model concrete and dated**

Show the arithmetic — tokens per request × requests per month × price per million, with the assumption block stated above it and the date the prices were checked. State plainly that prices move and the reader must re-check; give the formula so the conclusion survives the numbers changing.

- [ ] **Step 3: Verify**

Run: `node tools/verify.mjs` → PASS.

- [ ] **Step 4: Commit**

```bash
git add startups.html
git commit -m "feat: startup AI playbook with unit economics"
```

---

### Task 8: Field notes (`tips.html`)

**Files:**
- Create: `tips.html`

**Interfaces:**
- Consumes: page chrome (Task 4).
- Produces: nothing consumed downstream.

- [ ] **Step 1: Write 50 numbered tips grouped by theme**

Themes: data, modelling, LLM application work, evaluation, production, career. Each tip is a claim in bold plus one to three sentences giving the reason it is true. A tip that cannot state its reason gets cut rather than padded.

- [ ] **Step 2: Verify**

Run: `node tools/verify.mjs` → PASS. Then `grep -c 'class="tip"' tips.html` → expect 50.

- [ ] **Step 3: Commit**

```bash
git add tips.html
git commit -m "feat: 50 field notes"
```

---

### Task 9: Articles

**Files:**
- Create: `articles/index.html`
- Create: `articles/transformers.html`
- Create: `articles/inference.html`
- Create: `articles/finetuning.html`
- Create: `articles/evaluation.html`
- Create: `articles/vector-search.html`
- Create: `articles/agents.html`

**Interfaces:**
- Consumes: page chrome (Task 4) with `../` prefixes on every asset path; `[data-readbar]` from `progress.js` (Task 3).
- Produces: article URLs consumed by Task 12's search index.

- [ ] **Step 1: Build `articles/index.html`**

A file-tree listing of the six articles with one-line descriptions and word counts.

- [ ] **Step 2: Write each article, 2,500–4,000 words**

Per the spec §6.6. Every article carries `[data-readbar]`, at least one inline SVG, and ends with the follow CTA.

Each article is its own commit so a reviewer can reject one without rejecting the rest:
```bash
git add articles/transformers.html && git commit -m "feat(articles): transformer internals"
```

- [ ] **Step 3: Verify after each article**

Run: `node tools/verify.mjs` → PASS. Broken `../assets/...` paths are the likeliest failure here; the harness catches them as `broken local reference`.

- [ ] **Step 4: Verify word counts**

Run:
```bash
for f in articles/*.html; do
  printf '%-34s %s\n' "$f" "$(sed 's/<[^>]*>/ /g' "$f" | wc -w)"
done
```
Expected: each article between 2,500 and 4,000 words of rendered text.

---

### Task 10: SVG diagrams

**Files:**
- Modify: `rag.html`, `startups.html`, `articles/transformers.html`, `articles/inference.html`, `articles/vector-search.html`, `articles/agents.html`

**Interfaces:**
- Consumes: the SVG conventions from Task 5 — `role="img"`, `aria-label`, `viewBox`, no fixed `width`/`height`, colors via `fill="var(--accent)"` / `stroke="var(--border)"` so they theme automatically.
- Produces: nothing consumed downstream.

- [ ] **Step 1: Author each diagram to show mechanism, not decoration**

Required diagrams: the RAG pipeline; the build/buy/fine-tune decision tree; attention head data flow; the prefill-vs-decode timeline; HNSW layer structure; the agent loop with its failure points marked.

A diagram that only restates the adjacent heading gets cut. Each one must carry information the prose does not.

- [ ] **Step 2: Verify they theme correctly**

Run: `node tools/verify.mjs` → PASS (catches any SVG missing `aria-hidden` or `role`+`aria-label`).
Then in Playwright, screenshot each diagram in both themes and confirm every stroke and label is legible in each.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: hand-authored SVG diagrams"
```

---

### Task 11: Search index

**Files:**
- Create: `tools/build-index.mjs`
- Create: `assets/data/search-index.json`

**Interfaces:**
- Consumes: every `.html` file; the id schemes from Tasks 4 and 6.
- Produces: `assets/data/search-index.json` — an array of `{ "t": title, "u": url, "s": section, "k": keywords }` objects consumed by `search.js` (Task 3).

- [ ] **Step 1: Write the generator**

`tools/build-index.mjs` walks the shipped HTML, extracts `<title>`, every `h2`/`h3` with its `id`, every `.qa__q` with its question id, and every `.node` heading, and writes the JSON. It is dev-only — the committed JSON is what ships.

- [ ] **Step 2: Generate and verify**

Run: `node tools/build-index.mjs && node -e 'const j=require("./assets/data/search-index.json");console.log(j.length+" entries");if(j.length<250)process.exit(1);for(const e of j)if(!e.t||!e.u)throw new Error("bad entry "+JSON.stringify(e))'`
Expected: ≥ 250 entries, no bad entries, exit 0.

- [ ] **Step 3: Verify search works end to end**

In Playwright on `http://localhost:4173/`: press `/`, assert the overlay opens and focus is in `.search__input`; type `hnsw`; assert ≥ 1 `.search__hit`; press `ArrowDown` then `Enter`; assert the URL changed. Press `/` again then `Escape`; assert the overlay closed and focus returned to the trigger.

- [ ] **Step 4: Commit**

```bash
git add tools/build-index.mjs assets/data/search-index.json
git commit -m "feat: client-side search index"
```

---

### Task 12: Social cards

**Files:**
- Create: `tools/og-card.html`
- Create: `assets/img/og-default.png` and one per top-level page
- Modify: every `.html` file's `og:image` to point at its card

**Interfaces:**
- Consumes: the palette tokens from Task 2.
- Produces: PNG files referenced by every page's `og:image`.

- [ ] **Step 1: Author the card template**

`tools/og-card.html` renders a 1200×630 terminal window with the site name, the page title from a `?t=` query param, the byline `@ka1manov`, and the stage index. Dark theme only — social cards do not adapt.

- [ ] **Step 2: Screenshot each card to PNG**

Use Playwright at viewport 1200×630 with `deviceScaleFactor: 1`, navigate to `http://localhost:4173/tools/og-card.html?t=<title>`, screenshot to `assets/img/og-<page>.png`.

- [ ] **Step 3: Verify**

Run: `node tools/verify.mjs` → PASS, with no `broken local reference` on any `og:image`.
Then: `node -e 'const{readdirSync,statSync}=require("fs");for(const f of readdirSync("assets/img")){const s=statSync("assets/img/"+f).size;console.log(f,s);if(s<5000)process.exit(1)}'`
Expected: every PNG > 5KB, exit 0. A sub-5KB PNG means the card rendered blank.

- [ ] **Step 4: Commit**

```bash
git add tools/og-card.html assets/img/ *.html articles/*.html
git commit -m "feat: social cards for X sharing"
```

---

### Task 13: README, license, and final verification

**Files:**
- Create: `README.md`
- Create: `LICENSE`
- Modify: any file failing final verification

**Interfaces:**
- Consumes: everything.
- Produces: the shippable repo.

- [ ] **Step 1: Write the README**

Contents: what this is, who it is for, the live link, a contents table, how to run it locally (`node tools/serve.mjs`), how to enable GitHub Pages in three steps, the attribution to `@ka1manov`, and the license.

- [ ] **Step 2: Choose and add the license**

CC BY 4.0 for the prose, MIT for the code, both stated explicitly in `LICENSE` and the README. Content this widely shared needs its terms unambiguous.

- [ ] **Step 3: Full structural verification**

Run: `node tools/verify.mjs`
Expected: `PASS — 12 page(s) verified.`

- [ ] **Step 4: Full Playwright sweep**

For each of the 12 pages, at 1440×900 and 390×844, in both `data-theme` values:
- assert zero console errors and zero console warnings
- assert `document.documentElement.scrollWidth <= window.innerWidth` (no horizontal page scroll)
- screenshot

That is 48 page-views. Any horizontal overflow or console noise is a defect to fix, not to note.

- [ ] **Step 5: Word count check against the 2-hour target**

Run:
```bash
sed 's/<[^>]*>/ /g' *.html articles/*.html | wc -w
```
Expected: ≥ 28,000 words. Below that, the 2-hour claim is false and either the content grows or the claim changes.

- [ ] **Step 6: Senior-review pass against the rubric**

Re-read every page against Global Constraints' content rubric. Every violation is fixed, not annotated. This is the gate the requester actually named — it does not get skipped because the harness is green.

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "docs: README, license, and final verification pass"
```

---

## Self-Review

**Spec coverage.** §4 architecture → Task 1. §5 visual design → Task 2. §6.1 roadmap → Task 4. §6.2 RAG → Task 5. §6.3 interview → Task 6. §6.4 startups → Task 7. §6.5 tips → Task 8. §6.6 articles → Task 9. §7 interactivity → Task 3, verified in Tasks 4/6/11. §8 social → Task 12. §9 quality bar → Task 13 steps 3–5. §10 rubric → Global Constraints, enforced in Tasks 5 and 13. §11 risks → fatigue in Task 5 step 3, chrome drift in Task 13 step 4, stale index in Task 11.

**Placeholder scan.** No TBDs. Every verification step names a command and its expected output. Content tasks specify structure, id schemes and the rubric rather than pre-writing 30,000 words, which is the deliverable itself.

**Type consistency.** Storage keys `amh:theme`, `amh:progress`, `amh:known` are used identically in Task 3 and referenced consistently after. Id schemes `s{n}-n{n}` (Task 4) and `q-{track}-{n}` (Task 6) match their consumers in Tasks 3 and 11. Class names in Task 2's Produces block match every later usage. Data attributes `[data-theme-toggle]`, `[data-nav-toggle]`, `[data-progress-dash]`, `[data-readbar]`, `[data-filter-track]` are defined in Task 3 and used as written.

One gap found and closed during review: the harness in Task 1 reads `assets/js` before Task 3 creates it, so Task 1 step 3 now creates `assets/js/.gitkeep` and Task 3 step 4 removes it.
