/* Theme: amber CRT (dark) by default, line-printer (light) on request.
   A stored choice always wins; otherwise a system light preference is honored. */
(() => {
  'use strict';
  const KEY = 'amh:theme';
  const root = document.documentElement;

  const read = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
  const write = (v) => { try { localStorage.setItem(KEY, v); } catch { /* storage blocked */ } };

  if (!root.getAttribute('data-theme')) {
    const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    root.setAttribute('data-theme', read() || (prefersLight ? 'light' : 'dark'));
  }

  const sync = (btn) => {
    const dark = root.getAttribute('data-theme') === 'dark';
    btn.setAttribute('aria-pressed', String(dark));
    btn.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
    btn.textContent = dark ? '[ crt ]' : '[ paper ]';
  };

  const init = () => {
    const btns = document.querySelectorAll('[data-theme-toggle]');
    btns.forEach((btn) => {
      sync(btn);
      btn.addEventListener('click', () => {
        const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        root.setAttribute('data-theme', next);
        write(next);
        btns.forEach(sync);
      });
    });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
