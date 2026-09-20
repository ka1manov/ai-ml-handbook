/* Interview drill mode: filter by track and difficulty, shuffle,
   collapse answers, and remember which questions you already know. */
(() => {
  'use strict';
  const KEY = 'amh:known';

  const read = () => { try { return new Set(JSON.parse(localStorage.getItem(KEY) || '[]')); } catch { return new Set(); } };
  const write = (s) => { try { localStorage.setItem(KEY, JSON.stringify([...s])); } catch { /* blocked */ } };

  let track = 'all';
  let level = 'all';
  let hideKnown = false;

  const init = () => {
    const list = document.querySelector('[data-qa-list]');
    if (!list) return;

    const cards = Array.from(list.querySelectorAll('.qa'));
    const known = read();
    const count = document.querySelector('[data-qa-count]');

    const apply = () => {
      let shown = 0;
      cards.forEach((c) => {
        const okTrack = track === 'all' || c.dataset.track === track;
        const okLevel = level === 'all' || c.dataset.difficulty === level;
        const okKnown = !hideKnown || !known.has(c.id);
        const visible = okTrack && okLevel && okKnown;
        c.hidden = !visible;
        if (visible) shown++;
      });
      if (count) count.textContent = shown + '/' + cards.length;
    };

    const press = (group, value) => {
      document.querySelectorAll('[data-filter-' + group + ']').forEach((b) => {
        b.setAttribute('aria-pressed', String(b.dataset['filter' + group[0].toUpperCase() + group.slice(1)] === value));
      });
    };

    document.querySelectorAll('[data-filter-track]').forEach((b) => {
      b.addEventListener('click', () => { track = b.dataset.filterTrack; press('track', track); apply(); });
    });
    document.querySelectorAll('[data-filter-level]').forEach((b) => {
      b.addEventListener('click', () => { level = b.dataset.filterLevel; press('level', level); apply(); });
    });

    const shuffle = document.querySelector('[data-qa-shuffle]');
    if (shuffle) {
      shuffle.addEventListener('click', () => {
        const pool = cards.slice();
        for (let i = pool.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        pool.forEach((c) => list.appendChild(c));
      });
    }

    const collapse = document.querySelector('[data-qa-collapse]');
    if (collapse) {
      collapse.addEventListener('click', () => {
        const anyOpen = cards.some((c) => c.querySelector('details').open);
        cards.forEach((c) => { c.querySelector('details').open = !anyOpen; });
        collapse.textContent = anyOpen ? '[ expand all ]' : '[ collapse all ]';
      });
    }

    const toggleKnown = document.querySelector('[data-qa-hide-known]');
    if (toggleKnown) {
      toggleKnown.addEventListener('click', () => {
        hideKnown = !hideKnown;
        toggleKnown.setAttribute('aria-pressed', String(hideKnown));
        toggleKnown.textContent = hideKnown ? '[ showing unknown ]' : '[ hide known ]';
        apply();
      });
    }

    cards.forEach((c) => {
      const mark = c.querySelector('[data-mark-known]');
      if (!mark) return;
      const sync = () => {
        const isKnown = known.has(c.id);
        c.dataset.known = isKnown ? '1' : '0';
        mark.setAttribute('aria-pressed', String(isKnown));
        mark.textContent = isKnown ? '[x]' : '[ ]';
        mark.setAttribute('aria-label', isKnown ? 'Mark as not yet known' : 'Mark as known');
      };
      mark.addEventListener('click', () => {
        if (known.has(c.id)) known.delete(c.id); else known.add(c.id);
        write(known); sync(); apply();
      });
      sync();
    });

    apply();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
