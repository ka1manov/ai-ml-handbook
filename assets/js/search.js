/* Client-side search over the committed index.
   The index is fetched on first open, never on page load. */
(() => {
  'use strict';

  let index = null;
  let loading = null;
  let lastFocus = null;
  let selected = 0;
  let hits = [];

  const el = {};

  const indexUrl = () => {
    const base = document.documentElement.getAttribute('data-base') || './';
    return base + 'assets/data/search-index.json';
  };

  const load = () => {
    if (index) return Promise.resolve(index);
    if (loading) return loading;
    loading = fetch(indexUrl())
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then((json) => { index = json; return index; })
      .catch(() => { index = null; loading = null; return null; });
    return loading;
  };

  /* Subsequence match, so "hnw" still finds "hnsw". Earlier and tighter
     matches score higher; title matches outrank body matches. */
  const score = (needle, hay) => {
    const h = hay.toLowerCase();
    const exact = h.indexOf(needle);
    if (exact !== -1) return 1000 - exact - (h.length - needle.length) * 0.1;
    let i = 0, first = -1, last = -1;
    for (let j = 0; j < h.length && i < needle.length; j++) {
      if (h[j] === needle[i]) { if (first === -1) first = j; last = j; i++; }
    }
    if (i < needle.length) return -1;
    return 400 - (last - first) - first * 0.5;
  };

  const render = () => {
    if (!hits.length) {
      el.results.innerHTML = '';
      el.empty.hidden = false;
      return;
    }
    el.empty.hidden = true;
    el.results.innerHTML = hits.map((h, i) =>
      '<li class="search__hit" role="option" aria-selected="' + (i === selected) + '">' +
      '<a href="' + h.u + '">' + h.t +
      (h.s ? '<span class="s">' + h.s + '</span>' : '') +
      '</a></li>').join('');
  };

  const query = (raw) => {
    const q = raw.trim().toLowerCase();
    selected = 0;
    if (!q || !index) { hits = []; render(); return; }
    hits = index
      .map((e) => {
        const t = score(q, e.t);
        const k = e.k ? score(q, e.k) : -1;
        const best = Math.max(t, k * 0.6);
        return best > 0 ? { ...e, _s: best } : null;
      })
      .filter(Boolean)
      .sort((a, b) => b._s - a._s)
      .slice(0, 12);
    render();
  };

  const open = () => {
    lastFocus = document.activeElement;
    el.root.hidden = false;
    el.input.value = '';
    hits = [];
    el.results.innerHTML = '';
    el.empty.hidden = true;
    el.input.focus();
    load().then(() => {
      if (!index) {
        el.empty.hidden = false;
        el.empty.textContent = 'Search index unavailable. Browse from the navigation above.';
      }
    });
  };

  const close = () => {
    el.root.hidden = true;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  };

  const move = (delta) => {
    if (!hits.length) return;
    selected = (selected + delta + hits.length) % hits.length;
    render();
    const active = el.results.children[selected];
    if (active) active.scrollIntoView({ block: 'nearest' });
  };

  const init = () => {
    el.root = document.getElementById('search');
    if (!el.root) return;
    el.input = el.root.querySelector('.search__input');
    el.results = el.root.querySelector('.search__results');
    el.empty = el.root.querySelector('.search__empty');
    el.root.hidden = true;

    document.querySelectorAll('[data-search-open]').forEach((b) =>
      b.addEventListener('click', open));

    el.input.addEventListener('input', () => query(el.input.value));

    el.root.addEventListener('click', (e) => { if (e.target === el.root) close(); });

    el.root.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
      else if (e.key === 'Enter') {
        const active = el.results.children[selected];
        const link = active && active.querySelector('a');
        if (link) { e.preventDefault(); location.href = link.getAttribute('href'); }
      }
    });

    document.addEventListener('keydown', (e) => {
      const t = e.target;
      const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
      if (typing) return;
      if (e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key === 'k')) {
        e.preventDefault();
        if (el.root.hidden) open(); else close();
      }
    });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
