/* Marks the section currently being read in the contents rail.
   Purely additive: without it every link still works.

   Picks the LAST section whose top has scrolled past the threshold,
   rather than the first one intersecting a band — with sections taller
   than the viewport, two are frequently in view at once and "first
   intersecting" reports the one you have already finished reading. */
(() => {
  'use strict';

  const init = () => {
    const rail = document.querySelector('[data-rail]');
    if (!rail) return;

    const entries = [];
    rail.querySelectorAll('a[href^="#"]').forEach((a) => {
      const el = document.getElementById(a.getAttribute('href').slice(1));
      if (el) entries.push({ a, el });
    });
    if (!entries.length) return;

    const THRESHOLD = 140;
    let current = null;
    let ticking = false;

    const paint = () => {
      ticking = false;
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;

      let found = entries[0];
      if (atBottom) {
        found = entries[entries.length - 1];
      } else {
        for (const e of entries) {
          if (e.el.getBoundingClientRect().top <= THRESHOLD) found = e;
          else break;
        }
      }

      if (found === current) return;
      if (current) current.a.removeAttribute('aria-current');
      found.a.setAttribute('aria-current', 'true');
      current = found;

      // Keep the marker in view when the rail itself is scrollable.
      const nav = rail.parentElement;
      if (nav && nav.scrollHeight > nav.clientHeight) {
        const r = found.a.getBoundingClientRect();
        const n = nav.getBoundingClientRect();
        if (r.top < n.top || r.bottom > n.bottom) found.a.scrollIntoView({ block: 'nearest' });
      }
    };

    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(paint); } };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    paint();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
