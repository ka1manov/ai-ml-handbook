/* Top navigation: mobile menu disclosure and current-page marking. */
(() => {
  'use strict';

  const init = () => {
    const toggle = document.querySelector('[data-nav-toggle]');
    const menu = document.getElementById('navmenu');
    if (toggle && menu) {
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-controls', 'navmenu');
      menu.hidden = true;
      toggle.addEventListener('click', () => {
        const open = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', String(!open));
        menu.hidden = open;
        toggle.textContent = open ? '[ menu ]' : '[ close ]';
      });
      menu.addEventListener('click', (e) => {
        if (e.target.tagName === 'A') {
          toggle.setAttribute('aria-expanded', 'false');
          menu.hidden = true;
          toggle.textContent = '[ menu ]';
        }
      });
    }

    // Mark the current page in every nav list.
    const here = location.pathname.replace(/index\.html$/, '').replace(/\/$/, '');
    document.querySelectorAll('.topbar__links a, .navmenu a').forEach((a) => {
      const target = new URL(a.getAttribute('href'), location.href).pathname
        .replace(/index\.html$/, '').replace(/\/$/, '');
      if (target === here) a.setAttribute('aria-current', 'page');
    });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
