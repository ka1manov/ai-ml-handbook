# The AI/ML Engineering Handbook — Design Spec

**Date:** 2026-09-20
**Author:** built with Claude Code for @ka1manov
**Status:** Approved, ready for implementation planning

---

## 1. Purpose

A free, public, technically serious AI/ML engineering reference, published as a gift to
@ka1manov's X subscribers and hosted on GitHub Pages.

The bar, stated by the requester: **a Senior AI/ML engineer should read it and approve it.**
That single constraint drives every content decision below. Anything that reads as a
listicle, a link dump, or a blog-flavored summary of documentation fails the bar and
does not ship.

Target reading time: **~2 hours** of substantive content (~30,000 words).

## 2. Non-goals

- Not a course. No videos, no exercises to submit, no accounts.
- Not a news site. No "latest model released this week" content that rots in 60 days.
- Not a framework tutorial. Concepts and trade-offs outlive API surfaces.
- No backend, no database, no analytics, no tracking, no cookies.

## 3. Audience

Three readers, in priority order:

1. **The mid-level engineer levelling up.** Knows Python and some ML, wants the map from
   "I can train a model in a notebook" to "I run this in production."
2. **The interview candidate.** Two weeks out from an AI/ML loop, needs depth fast.
3. **The startup founder/CTO.** Deciding what to build, what to buy, and what it costs.

Every page states who it is for in its first screen.

## 4. Architecture

Zero-build multi-page static site. No dependencies, no CI, no build step required to host.

```
ai-ml-handbook/
├── index.html              Landing + roadmap (7 stages)
├── rag.html                RAG deep dive (flagship)
├── interview.html          Question bank + drill mode
├── startups.html           Startup AI playbook
├── tips.html               Field notes
├── articles/
│   ├── index.html
│   ├── transformers.html
│   ├── inference.html
│   ├── finetuning.html
│   ├── evaluation.html
│   ├── vector-search.html
│   └── agents.html
├── assets/
│   ├── css/site.css
│   ├── js/{theme,nav,progress,search,drill}.js
│   ├── data/search-index.json
│   └── img/og-*.png
├── tools/build-index.mjs   Dev-only. Never runs in production.
├── .nojekyll
└── README.md
```

**Zero-build guarantee.** `tools/build-index.mjs` regenerates the committed search index
as a local convenience. GitHub Pages serves the committed JSON. If the tool is deleted,
the site still works. `.nojekyll` prevents Jekyll from touching `_`-prefixed paths.

**No framework.** Shared layout is duplicated HTML rather than templated. This is a
deliberate trade: duplication costs edit effort, a build step costs the zero-build
guarantee, and the guarantee was the explicit requirement. Shared behavior lives in JS;
shared appearance lives in one CSS file.

## 5. Visual design — terminal / brutalist

### 5.1 The readability tension, and the resolution

Pure monospace at high contrast is fatiguing past ~10 minutes. The site asks for two
hours. Resolution: **terminal identity in the chrome, readability in the prose.**

- Terminal treatment: window title bars, `$` prompts, box-drawing rules, file-tree nav,
  stage numbering `[00]`–`[06]`, tag chips, blinking cursor (hero only), ASCII dividers.
- Prose treatment: 17px, line-height 1.75, max measure 68ch, text at ~87% opacity on
  near-black rather than pure white on pure black.

### 5.2 Palette

Dark is the default theme.

| Token | Dark | Light | Role |
|---|---|---|---|
| `--bg` | `#0B0D0C` | `#F4F1EA` | page ground |
| `--bg-raised` | `#121514` | `#FFFFFF` | cards, window bodies |
| `--bg-inset` | `#080A09` | `#EAE6DC` | code blocks, wells |
| `--border` | `#242927` | `#D6D0C4` | 1px hairlines |
| `--text` | `#D8DAD6` | `#1A1C1B` | body prose |
| `--text-dim` | `#8A918C` | `#5C625E` | captions, meta |
| `--accent` | `#FFB000` | `#9A5B00` | primary (amber phosphor) |
| `--accent-alt` | `#4AF626` | `#1E7A12` | secondary (green phosphor) |

Both themes verified at WCAG AA for body text and UI controls.

### 5.3 Typography

- Chrome, headings, code, tags: `JetBrains Mono` with a full `ui-monospace, SFMono-Regular,
  Menlo, Consolas, monospace` fallback stack.
- Body prose: same mono family at a comfortable size, because the terminal identity is the
  point — compensated with line-height and measure rather than a font switch.
- Scale: 13 / 15 / 17 / 20 / 26 / 34 / 44px. No fluid clamps below 15px.

### 5.4 Restraint rules

One accent per view. No gradients. No box-shadows. No blur. Borders are 1px hairlines.
Motion only on state change, all of it behind `prefers-reduced-motion`.

## 6. Content plan

### 6.1 Roadmap (index.html)

Seven stages, ~6 nodes each (~42 nodes). Every node carries:

- **What** — the concept, in one sentence.
- **Why it matters in production** — the failure it prevents. Not "it's fundamental."
- **Prove it** — a concrete artifact that demonstrates competence. This is the key
  differentiator from every other roadmap: you can check your own work.
- **Time** — an honest range, with the assumption stated.

Stages: `[00]` Foundations · `[01]` Classical ML · `[02]` Deep Learning ·
`[03]` Transformers & LLMs · `[04]` Applied LLM Systems · `[05]` Production &
LLMOps · `[06]` Specialization tracks.

### 6.2 RAG deep dive (rag.html) — flagship

End-to-end anatomy; when NOT to use RAG; chunking strategies with trade-off table;
embedding model selection, dimensionality, quantization; vector index internals
(flat / IVF-PQ / HNSW) and the recall–latency–memory triangle; hybrid BM25 + dense with
RRF; reranking and its latency budget; query transformation (HyDE, multi-query,
decomposition, routing); context assembly and lost-in-the-middle; **evaluation**
(recall@k, nDCG@k, MRR, faithfulness, answer relevance, LLM-as-judge and its documented
failure modes); a **failure-mode taxonomy with a debug procedure per mode**; production
concerns (incremental indexing, freshness, multi-tenancy, ACL-aware retrieval, cost
model, caching); advanced (contextual retrieval, ColBERT late interaction, GraphRAG,
agentic RAG). Hand-authored SVG pipeline diagram.

### 6.3 Interview bank (interview.html)

120+ questions across 8 tracks: ML Fundamentals, Deep Learning, NLP & LLMs, RAG &
LLM Systems, ML System Design, MLOps & Production, Coding, Behavioral.

Each question carries a real answer plus — where it discriminates — **what a weak
answer sounds like versus what a strong answer sounds like.** Difficulty tags
(`junior` / `mid` / `senior`). Drill mode: collapse answers, filter by track and
difficulty, shuffle, mark-known persisted to localStorage.

### 6.4 Startup playbook (startups.html)

Build / buy / fine-tune decision tree; the 0→1 ladder (wizard-of-oz → prompting → RAG →
fine-tuning → custom); unit economics with explicit token math; eval-first development;
moats and why "we use an LLM" is not one; team composition by stage; failure patterns
(demo-to-prod gap, eval debt, prompt spaghetti, the 80% wall); privacy, data residency
and vendor risk; a 90-day plan template.

### 6.5 Field notes (tips.html)

50 concentrated, opinionated tips grouped by theme. Each is a claim plus the reason it
is true. No filler.

### 6.6 Articles (articles/*.html)

Six long-form pieces, 2,500–4,000 words each, each with at least one hand-authored SVG:

1. **transformers** — attention math, multi-head, positional encodings (absolute → RoPE),
   KV cache, why context length is quadratic and what that costs.
2. **inference** — serving economics: prefill vs decode, continuous batching, KV cache
   memory math, quantization, speculative decoding, throughput vs latency trade-off.
3. **finetuning** — when not to; SFT, LoRA/QLoRA mechanics, DPO vs RLHF, data quality
   over data quantity, catastrophic forgetting, evaluation of a fine-tune.
4. **evaluation** — eval engineering: golden sets, task decomposition, LLM-as-judge
   calibration, offline vs online, regression suites, statistical significance.
5. **vector-search** — HNSW internals, IVF-PQ, recall measurement, index parameter tuning,
   filtered search and why it is hard.
6. **agents** — ReAct and successors, tool-use design, planning, memory, failure taxonomy,
   why agents fail in production and what actually works.

## 7. Interactivity

| Feature | Behavior | Degradation |
|---|---|---|
| Theme | Dark default; toggle persisted; respects `prefers-color-scheme` on first visit | CSS-only fallback to dark |
| Progress | Roadmap node checkboxes; per-article scroll bar; `N/42` dashboard | Content fully readable without it |
| Search | `/` or `Ctrl+K` opens overlay; matches title, heading, tag, question text; arrow-key navigable | Link to a static index page |
| Drill | Collapse answers, filter by track + difficulty, shuffle, mark-known | Answers render expanded |

All `localStorage` access is wrapped in try/catch. Private browsing and blocked site data
must not break a page.

## 8. Social sharing

Every page emits `og:title`, `og:description`, `og:image`, `og:url`, `og:type`,
`twitter:card=summary_large_image`, `twitter:creator=@ka1manov`, `twitter:site=@ka1manov`.

Cards are hand-authored HTML at 1200×630, screenshotted to PNG with Playwright, and
committed. Canonical base URL: `https://ka1manov.github.io/ai-ml-handbook/`.

## 9. Quality bar — the definition of done

1. Semantic HTML; one `h1` per page; heading levels never skip.
2. Every interactive control reachable and operable by keyboard; visible focus ring.
3. WCAG AA contrast for body text and controls in **both** themes.
4. Responsive 360px → 2560px. No horizontal page scroll. Only code blocks, tables and
   diagrams scroll, each in its own container.
5. `prefers-reduced-motion` honored everywhere.
6. Zero console errors or warnings on every page.
7. No external network requests except one font stylesheet, with a real fallback.
8. Every page verified in Playwright at 1440px and 390px, in both themes.
9. **Technical content reviewed against a Senior AI/ML engineer rubric** (§10) and every
   failure fixed before ship.

## 10. Senior review rubric

Content is rejected and rewritten if it:

- States a claim that is version-dependent without dating or qualifying it.
- Presents a technique without its failure mode or its cost.
- Gives a number without the conditions under which it holds.
- Describes an architecture without saying when it is the wrong choice.
- Uses a benchmark result as evidence of production quality.
- Reads as a paraphrase of official documentation rather than earned judgment.

Content passes if a reader who already ships ML systems finds at least one thing per
section they would not have thought to say themselves.

## 11. Risks

| Risk | Mitigation |
|---|---|
| Terminal aesthetic fatigues readers over 2h | Measure, line-height, opacity, generous spacing (§5.1); verified by reading a full article start to finish |
| 30k words of duplicated page chrome drifts | One CSS file, one JS nav module, chrome verified page-by-page in the Playwright pass |
| Content rots as models change | Concepts and trade-offs over API surfaces; version-dependent claims dated inline |
| Search index goes stale vs page content | Regenerated by `tools/build-index.mjs` and verified in the final pass |
