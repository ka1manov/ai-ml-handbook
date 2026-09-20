#!/usr/bin/env node
// WCAG contrast gate for the palette. Dev-only.
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const L = (h) => { const [r, g, b] = hex(h).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const CR = (a, b) => { const [x, y] = [L(a), L(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

const D = { bg: '#0C0B08', raised: '#14120D', inset: '#080704', border: '#2A2620', bs: '#4A4438', graph: '#7E7768', text: '#E2DCCE', dim: '#968E7C', accent: '#FFB000', ok: '#7BC96F', warn: '#E8804A' };
const Lt = { bg: '#F2EEE3', raised: '#FBF9F3', inset: '#E7E1D3', border: '#CFC7B4', bs: '#A89C82', graph: '#7A7161', text: '#1C1A15', dim: '#6A6252', accent: '#8A5200', ok: '#2D6A22', warn: '#A33E12' };

const cases = [];
for (const [name, P] of [['dark', D], ['light', Lt]]) {
  for (const ground of [['bg', P.bg], ['raised', P.raised], ['inset', P.inset]]) {
    cases.push([`${name} text on ${ground[0]}`, P.text, ground[1], 4.5]);
    cases.push([`${name} dim on ${ground[0]}`, P.dim, ground[1], 4.5]);
    cases.push([`${name} accent on ${ground[0]}`, P.accent, ground[1], 4.5]);
    cases.push([`${name} ok on ${ground[0]}`, P.ok, ground[1], 4.5]);
    cases.push([`${name} warn on ${ground[0]}`, P.warn, ground[1], 4.5]);
  }
  // Non-text UI (borders, bar fills, focus rings) need 3:1
  // Non-text UI required to understand content: 3:1 (WCAG 1.4.11).
  // --border-strong is decorative ruling only and is exempt by design.
  cases.push([`${name} graph on bg (UI)`, P.graph, P.bg, 3]);
  cases.push([`${name} graph on raised (UI)`, P.graph, P.raised, 3]);
  cases.push([`${name} accent on bg (UI)`, P.accent, P.bg, 3]);
}

let bad = 0;
for (const [n, f, b, min] of cases) {
  const r = CR(f, b);
  const ok = r >= min;
  if (!ok) bad++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n.padEnd(34)} ${r.toFixed(2).padStart(6)}  >= ${min}`);
}
console.log(bad ? `\n${bad} contrast failure(s)` : '\nAll contrast ratios pass.');
process.exit(bad ? 1 : 0);
