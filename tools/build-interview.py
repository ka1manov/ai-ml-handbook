#!/usr/bin/env python3
"""Dev-only: renders src/data/interview.json into src/02-interview.part.

Keeps 120+ question blocks structurally identical and lets the search
index read the same source. Never runs in production.
"""
import json, pathlib, html, re

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = json.loads((ROOT / 'src/data/interview.json').read_text())

TRACKS = [
    ('fundamentals',  'ML fundamentals'),
    ('deep-learning', 'Deep learning'),
    ('nlp-llm',       'NLP and LLMs'),
    ('rag-systems',   'RAG and LLM systems'),
    ('system-design', 'ML system design'),
    ('mlops',         'MLOps and production'),
    ('coding',        'Coding and data'),
    ('behavioral',    'Experience and judgement'),
]
LEVELS = ['junior', 'mid', 'senior']


def para(text):
    """Blank-line separated source -> paragraphs. Inline markup passes through."""
    out = []
    for block in [b.strip() for b in text.strip().split('\n\n') if b.strip()]:
        if block.startswith('WEAK:'):
            out.append(f'<p class="qa__weak"><b>Weak answer:</b> {block[5:].strip()}</p>')
        elif block.startswith('STRONG:'):
            out.append(f'<p class="qa__strong"><b>Strong answer:</b> {block[7:].strip()}</p>')
        elif block.startswith('PRE:'):
            out.append(f'<pre><code>{block[4:].strip()}</code></pre>')
        else:
            out.append(f'<p>{block}</p>')
    return '\n        '.join(out)


def render():
    counts = {t: 0 for t, _ in TRACKS}
    for q in DATA:
        counts[q['track']] += 1
    total = len(DATA)

    parts = []
    for track, label in TRACKS:
        qs = [q for q in DATA if q['track'] == track]
        if not qs:
            continue
        parts.append(f'''
  <section class="section" id="{track}">
    <div class="prose">
      <h2>{label}</h2>
      <p class="meta"><span class="k">questions</span> <span class="v">{len(qs)}</span></p>
    </div>
''')
        for i, q in enumerate(qs, 1):
            qid = f"q-{track}-{i}"
            parts.append(f'''    <article class="qa" id="{qid}" data-track="{track}" data-difficulty="{q['level']}">
      <div class="qa__head">
        <button class="btn qa__mark" type="button" data-mark-known aria-label="Mark as known">[ ]</button>
        <details>
          <summary class="qa__q">{q['q']}</summary>
          <div class="qa__a">
        {para(q['a'])}
          </div>
        </details>
        <span class="qa__tags"><span class="tag tag--{q['level']}">{q['level']}</span></span>
      </div>
    </article>
''')
        parts.append('  </section>\n')

    filters = '\n'.join(
        f'      <button class="btn" type="button" data-filter-track="{t}" aria-pressed="false">{t}</button>'
        for t, _ in TRACKS)
    levels = '\n'.join(
        f'      <button class="btn" type="button" data-filter-level="{l}" aria-pressed="false">{l}</button>'
        for l in LEVELS)
    nav = '\n'.join(
        f'      <li><a href="#{t}">{label}</a></li>' for t, label in TRACKS)

    head = f'''path: interview.html
title: AI/ML Interview Questions and Answers
ogtitle: AI/ML Interview Questions — With Real Answers
desc: {total} machine learning and LLM interview questions across eight tracks, with real answers and what separates a weak answer from a strong one. Filter by topic and level, shuffle, and drill.
og: og-interview.png
ogtype: article
scripts: drill, rail
---
<main id="main">
<div class="shell">

<section class="pagehead" style="border-bottom:0">
  <p class="prompt">./drill.sh --track all --level all</p>
  <h1>{total} interview questions, with real answers</h1>
  <p class="lede">Not flashcards. Each answer is what I would actually want to hear, and where the question genuinely separates candidates, what a weak answer sounds like next to a strong one. Filter by track and level, hide the ones you know, and shuffle so you cannot pattern-match on order.</p>
  <p class="meta"><span class="k">questions</span> <span class="v">{total}</span><span class="sep">|</span><span class="k">tracks</span> <span class="v">8</span><span class="sep">|</span><span class="k">read</span> <span class="v">~45m</span><span class="sep">|</span><span class="k">by</span> <span class="v"><a href="https://x.com/ka1manov" rel="me noopener" target="_blank">@ka1manov</a></span></p>

  <div class="filters" role="group" aria-label="Filter by track">
    <span class="filters__label">track</span>
      <button class="btn" type="button" data-filter-track="all" aria-pressed="true">all</button>
{filters}
  </div>
  <div class="filters" role="group" aria-label="Filter by level" style="margin-top:var(--sp-4)">
    <span class="filters__label">level</span>
      <button class="btn" type="button" data-filter-level="all" aria-pressed="true">all</button>
{levels}
  </div>
  <div class="filters" style="margin-top:var(--sp-4)">
    <span class="filters__label">drill</span>
      <button class="btn" type="button" data-qa-collapse>[ expand all ]</button>
      <button class="btn" type="button" data-qa-shuffle>[ shuffle ]</button>
      <button class="btn" type="button" data-qa-hide-known aria-pressed="false">[ hide known ]</button>
      <span class="btn" style="border-color:transparent">showing <span data-qa-count>{total}/{total}</span></span>
  </div>
</section>

<div class="withaside">
<aside class="withaside__nav">
  <nav class="rail" data-rail aria-label="Tracks">
    <h2>tracks</h2>
    <ol>
{nav}
    </ol>
  </nav>
</aside>
<div class="withaside__main" data-qa-list>
'''

    tail = '''
<section class="section">
  <div class="follow">
    <p><b>Free, no signup, nothing to buy.</b> Your "known" marks are saved in this browser only.</p>
    <p>If this helps you land the job, tell someone else about it — and follow <a href="https://x.com/ka1manov" rel="me noopener" target="_blank">@ka1manov</a> on X.</p>
    <p class="meta" style="margin-top:var(--sp-4)"><span class="k">also</span> <span class="v"><a href="rag.html">the RAG deep dive</a></span><span class="sep">|</span><span class="v"><a href="articles/evaluation.html">evaluation engineering</a></span><span class="sep">|</span><span class="v"><a href="index.html">the roadmap</a></span></p>
  </div>
</section>

</div>
</div>

</div>
</main>
'''
    (ROOT / 'src/02-interview.part').write_text(head + ''.join(parts) + tail)
    print(f'interview: {total} questions')
    for t, label in TRACKS:
        print(f'  {t:<14} {counts[t]}')


if __name__ == '__main__':
    render()
