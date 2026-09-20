#!/usr/bin/env node
/* Dev-only: flags SVG <text> labels on the same baseline whose estimated
   widths overlap. Catches collisions that only show up when rendered. */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SKIP = new Set(['docs', 'tools', '.git', 'node_modules', '.idea', '.venv', 'src', 'assets']);
const SIZE = { 'dg-text': 12, 'dg-text--dim': 11, 'dg-text--accent': 11 };
const ADV = 0.6; // IBM Plex Mono advance width, in em

function files(dir = ROOT, acc = []) {
  for (const n of readdirSync(dir)) {
    if (SKIP.has(n)) continue;
    const f = join(dir, n);
    if (statSync(f).isDirectory()) files(f, acc);
    else if (n.endsWith('.html')) acc.push(f);
  }
  return acc;
}

const problems = [];
for (const file of files()) {
  const rel = relative(ROOT, file).split(sep).join('/');
  for (const svg of readFileSync(file, 'utf8').matchAll(/<svg\b[\s\S]*?<\/svg>/g)) {
    const labels = [];
    for (const m of svg[0].matchAll(/<text class="([^"]+)" x="([\d.]+)" y="([\d.]+)">([\s\S]*?)<\/text>/g)) {
      const text = m[4].replace(/<[^>]*>/g, '');
      const fs = SIZE[m[1]] || 12;
      labels.push({ x: +m[2], y: +m[3], w: text.length * fs * ADV, text });
    }
    // Group into baseline bands FIRST, then order each band by x —
    // sorting by (y, x) together mis-orders labels whose y differs by
    // a pixel, which produces false collisions.
    labels.sort((a, b) => a.y - b.y);
    const bands = [];
    for (const l of labels) {
      const band = bands[bands.length - 1];
      if (band && Math.abs(band[0].y - l.y) < 2) band.push(l);
      else bands.push([l]);
    }
    for (const band of bands) {
      band.sort((a, b) => a.x - b.x);
      for (let i = 1; i < band.length; i++) {
        const a = band[i - 1], b = band[i];
        if (a.x + a.w > b.x + 1) {
          problems.push(`${rel}: "${a.text.slice(0, 32)}" overlaps "${b.text.slice(0, 32)}" at y≈${a.y}`);
        }
      }
    }
  }
}

if (problems.length) {
  console.error(`\nFAIL — ${problems.length} SVG label collision(s):\n`);
  problems.forEach((p) => console.error('  ' + p));
  process.exit(1);
}
console.log('PASS — no SVG label collisions.');
