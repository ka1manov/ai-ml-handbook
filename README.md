# The AI/ML Engineering Handbook

**[→ Read it at ka1manov.github.io/ai-ml-handbook](https://ka1manov.github.io/ai-ml-handbook/)**

A staged roadmap, a RAG deep dive, 122 interview questions with real answers, a
startup playbook, 50 field notes and six long-form articles — for people who
ship machine learning systems, not notebooks.

Free, no signup, no tracking, no ads. A gift to my subscribers on X.

by [@ka1manov](https://x.com/ka1manov)

---

## What's in it

| | | |
|---|---|---|
| **[Roadmap](https://ka1manov.github.io/ai-ml-handbook/)** | 7 stages, 42 nodes | Every node has a *prove it* — a concrete artifact, not an activity — plus what it prevents in production and an honest time estimate. |
| **[RAG deep dive](https://ka1manov.github.io/ai-ml-handbook/rag.html)** | 7420 words | The full pipeline, plus a failure-mode taxonomy: symptom → cause → the diagnostic that distinguishes it → the fix. |
| **[Interview bank](https://ka1manov.github.io/ai-ml-handbook/interview.html)** | 122 questions | Eight tracks with real answers, and what a weak answer sounds like next to a strong one. Filter, shuffle, drill. |
| **[Startup playbook](https://ka1manov.github.io/ai-ml-handbook/startups.html)** | 3972 words | Build/buy/fine-tune, unit economics with the arithmetic shown, and why "we use an LLM" is not a moat. |
| **[Field notes](https://ka1manov.github.io/ai-ml-handbook/tips.html)** | 50 notes | The things that only show up after you've shipped something and watched it break. |
| **[Long reads](https://ka1manov.github.io/ai-ml-handbook/articles/)** | 6 articles | Transformer internals · inference economics · fine-tuning decisions · evaluation engineering · vector search internals · agent architectures. |

**~56k words. About two hours of reading.**

## Features

- **Progress tracking** — tick roadmap nodes, saved in your browser only
- **Search** — press <kbd>/</kbd> or <kbd>⌘K</kbd>, instant, over every page, question and note
- **Drill mode** — collapse answers, filter by track and level, shuffle, mark known
- **Two themes** — amber-phosphor CRT (default) and line-printer paper
- Works on a phone, works with a keyboard, works with a screen reader

## Running it locally

There is no build step. Clone it and open `index.html`, or serve it:

```bash
git clone https://github.com/ka1manov/ai-ml-handbook.git
cd ai-ml-handbook
node tools/serve.mjs          # http://localhost:4173
```

## Hosting your own copy on GitHub Pages

1. Fork this repository (or push it to a repo of your own).
2. **Settings → Pages → Build and deployment**, set *Source* to **Deploy from a branch**.
3. Choose branch `main` and folder `/ (root)`. Save.

It is live in about a minute at `https://<your-username>.github.io/<repo>/`.

No Actions, no workflow file, nothing to configure. If you change the repo name
or owner, update the absolute URLs in `tools/build-pages.mjs` (`BASE_URL`) and
re-run `node tools/build-pages.mjs`.

## Repository layout

```
index.html              landing + roadmap          ┐
rag.html                RAG deep dive              │
interview.html          question bank              │ committed HTML —
startups.html           startup playbook           │ this is what ships
tips.html               field notes                │
articles/*.html         six long reads             ┘

assets/css/site.css     the whole design system, one file
assets/js/*.js          theme, nav, progress, search, drill, rail
assets/data/            committed search index
assets/img/             favicon + social cards

src/*.part              page content (front matter + <main>)
src/data/interview.json the 122 questions
tools/                  dev-only; the site never runs any of it
docs/superpowers/       the design spec and implementation plan
```

### The tools/ directory is optional

The site is plain static files. Everything in `tools/` exists to make editing
pleasant and to keep quality honest — **delete the whole directory and the site
still works**.

| Command | What it does |
|---|---|
| `node tools/serve.mjs` | Local static server on :4173 |
| `node tools/verify.mjs` | Structural gate: headings, social meta, a11y, broken links, design-system rules |
| `node tools/build-pages.mjs` | Rebuilds the HTML from `src/*.part` so the shared chrome can't drift |
| `node tools/build-index.mjs` | Regenerates the search index |
| `node tools/contrast.mjs` | WCAG contrast gate over the palette, both themes |
| `python3 tools/build-interview.py` | Renders the question bank from JSON |

### Editing content

Edit `src/<page>.part`, then:

```bash
node tools/build-pages.mjs && node tools/build-index.mjs && node tools/verify.mjs
```

Don't edit the root `.html` files directly — they're generated and your changes
will be overwritten on the next build.

## Design

Dark is an amber-phosphor CRT (the DEC VT220 / IBM 3270 monochrome monitor).
Light is line-printer output on continuous-feed paper. They're two concepts
rather than an inversion of each other.

One typeface (IBM Plex Mono), one accent colour, no gradients, no shadows, 1px
hairline borders. Every colour pair passes WCAG AA in both themes — enforced by
`tools/contrast.mjs`, which is why `--graph` exists separately from `--border`.

## Corrections

Found something wrong? [Open an issue](https://github.com/ka1manov/ai-ml-handbook/issues)
or tell me on X. Technical corrections are genuinely welcome — the content is
written to be reviewed by people who do this work, and being wrong in public is
the fastest way to stop being wrong.

## Licence

Prose, diagrams and content: **CC BY 4.0** — share and adapt with attribution.
Code: **MIT**.

See [LICENSE](LICENSE).

---

If this was useful, the only thing I'd ask is that you share it with someone
it would help — and follow [@ka1manov](https://x.com/ka1manov) on X.
