/* Start-here router: pick a role, see that reading path.
   Progressive enhancement — without JS every path is visible with its
   own heading, so the content is never hidden behind a script. */
(() => {
  'use strict';
  const KEY = 'amh:role';

  const read = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
  const write = (v) => { try { localStorage.setItem(KEY, v); } catch { /* blocked */ } };

  const init = () => {
    const root = document.querySelector('[data-router]');
    if (!root) return;

    const buttons = Array.from(root.querySelectorAll('[data-role]'));
    const paths = Array.from(root.querySelectorAll('[data-path]'));
    if (!buttons.length || !paths.length) return;

    // Hidden headings exist for the no-JS case; the buttons replace them.
    paths.forEach((p) => { const h = p.querySelector('[data-path-heading]'); if (h) h.hidden = true; });

    const select = (role, persist) => {
      buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.role === role)));
      paths.forEach((p) => { p.hidden = p.dataset.path !== role; });
      if (persist) write(role);
    };

    buttons.forEach((b) => {
      b.addEventListener('click', () => select(b.dataset.role, true));
    });

    const stored = read();
    const initial = buttons.some((b) => b.dataset.role === stored) ? stored : buttons[0].dataset.role;
    select(initial, false);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
