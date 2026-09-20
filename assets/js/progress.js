/* Roadmap completion and per-article read progress.
   Every page must render correctly when storage throws. */
(() => {
  'use strict';
  const KEY = 'amh:progress';
  const CELLS = 20;

  const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };
  const write = (s) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* blocked */ } };

  const drawBar = (el, done, total) => {
    const ratio = total ? done / total : 0;
    const filled = Math.round(ratio * CELLS);
    // The block characters are decorative; screen readers get the label instead.
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', done + ' of ' + total + ' complete in this stage');
    el.innerHTML =
      '<span class="bar__fill">' + '█'.repeat(filled) + '</span>' +
      '░'.repeat(CELLS - filled) +
      '<span class="bar__pct">' + String(Math.round(ratio * 100)).padStart(3) + '% ' +
      done + '/' + total + '</span>';
  };

  const initRoadmap = () => {
    const boxes = Array.from(document.querySelectorAll('.node__check'));
    if (!boxes.length) return;

    const state = read();
    const dash = document.querySelector('[data-progress-dash]');
    const fill = document.querySelector('.progress-dash__fill');
    const stageBars = Array.from(document.querySelectorAll('[data-stage-bar]'));

    const paint = () => {
      const done = boxes.filter((b) => b.checked).length;
      if (dash) dash.textContent = done + '/' + boxes.length;
      if (fill) fill.style.width = (boxes.length ? (done / boxes.length) * 100 : 0) + '%';
      stageBars.forEach((bar) => {
        const scope = bar.closest('.stage');
        if (!scope) return;
        const inStage = Array.from(scope.querySelectorAll('.node__check'));
        drawBar(bar, inStage.filter((b) => b.checked).length, inStage.length);
      });
    };

    boxes.forEach((b) => {
      b.checked = state[b.id] === true;
      b.addEventListener('change', () => {
        const s = read();
        if (b.checked) s[b.id] = true; else delete s[b.id];
        write(s);
        paint();
      });
    });

    const reset = document.querySelector('[data-progress-reset]');
    if (reset) {
      reset.addEventListener('click', () => {
        write({});
        boxes.forEach((b) => { b.checked = false; });
        paint();
      });
    }

    paint();
  };

  const initReadbar = () => {
    const bar = document.querySelector('[data-readbar]');
    if (!bar) return;
    let ticking = false;
    const paint = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = h > 0 ? Math.min(100, (window.scrollY / h) * 100) + '%' : '0%';
      ticking = false;
    };
    const onScroll = () => {
      if (!ticking) { ticking = true; requestAnimationFrame(paint); }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    paint();
  };

  const init = () => { initRoadmap(); initReadbar(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
