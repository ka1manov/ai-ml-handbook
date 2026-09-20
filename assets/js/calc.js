/* Calculators. Every formula here is the one written out in the articles —
   if they ever disagree, the article is the specification.

   Binds declaratively: any [data-calc] root with [data-in] fields and
   [data-out] slots. No dependencies, no build step. */
(() => {
  'use strict';

  const fmt = {
    gb: (b) => b >= 1 ? b.toFixed(b < 10 ? 2 : 1) + ' GB' : (b * 1024).toFixed(0) + ' MB',
    int: (n) => Number.isFinite(n) ? Math.floor(n).toLocaleString('en-US') : '—',
    usd: (n) => !Number.isFinite(n) ? '—'
      : n >= 1000 ? '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 })
      : n >= 1 ? '$' + n.toFixed(2)
      : n >= 0.01 ? '$' + n.toFixed(4)
      : '$' + n.toFixed(6),
    pct: (n) => Number.isFinite(n) ? n.toFixed(0) + '%' : '—',
  };

  const GIB = 1024 ** 3;

  /* ---- shared plumbing ------------------------------------------------ */

  function readValues(root) {
    const v = {};
    root.querySelectorAll('[data-in]').forEach((el) => {
      if (el.type === 'number') v[el.dataset.in] = parseFloat(el.value);
      else v[el.dataset.in] = el.value;
    });
    root.querySelectorAll('[data-seg]').forEach((seg) => {
      const on = seg.querySelector('[aria-pressed="true"]');
      v[seg.dataset.seg] = on ? on.dataset.value : null;
    });
    return v;
  }

  function write(root, key, value, cls) {
    const el = root.querySelector(`[data-out="${key}"]`);
    if (!el) return;
    el.textContent = value;
    el.classList.remove('out__v--ok', 'out__v--warn');
    if (cls) el.classList.add(cls);
  }

  function bind(root, recompute) {
    root.querySelectorAll('[data-in]').forEach((el) => {
      el.addEventListener('input', recompute);
      el.addEventListener('change', recompute);
    });
    root.querySelectorAll('[data-seg]').forEach((seg) => {
      seg.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-value]');
        if (!btn) return;
        seg.querySelectorAll('button[data-value]').forEach((b) =>
          b.setAttribute('aria-pressed', String(b === btn)));
        recompute();
      });
    });
    recompute();
  }

  /* ---- 1. VRAM and KV cache ------------------------------------------- */

  const PRESETS = {
    '7b-mha':  { params: 7,  layers: 32, kv: 32, head: 128, label: '~7B, multi-head' },
    '8b-gqa':  { params: 8,  layers: 32, kv: 8,  head: 128, label: '~8B, grouped-query' },
    '13b-mha': { params: 13, layers: 40, kv: 40, head: 128, label: '~13B, multi-head' },
    '34b-gqa': { params: 34, layers: 48, kv: 8,  head: 128, label: '~34B, grouped-query' },
    '70b-gqa': { params: 70, layers: 80, kv: 8,  head: 128, label: '~70B, grouped-query' },
  };

  function initVram(root) {
    const apply = (key) => {
      const p = PRESETS[key];
      if (!p) return;
      const set = (n, val) => { const el = root.querySelector(`[data-in="${n}"]`); if (el) el.value = val; };
      set('params', p.params); set('layers', p.layers); set('kvheads', p.kv); set('headdim', p.head);
    };

    const recompute = () => {
      const v = readValues(root);
      const wBytes = { fp16: 2, int8: 1, int4: 0.5 }[v.precision] ?? 2;
      const kvBytes = { fp16: 2, int8: 1 }[v.kvprecision] ?? 2;

      const weights = v.params * 1e9 * wBytes;
      const perSeq = 2 * v.layers * v.kvheads * v.headdim * v.ctx * kvBytes;
      const kvTotal = perSeq * v.batch;
      const overhead = (weights + kvTotal) * (v.overhead / 100);
      const total = weights + kvTotal + overhead;
      const budget = v.vram * GIB;
      const fits = total <= budget;

      // max batch at this context, after weights and their share of overhead
      const oh = 1 + v.overhead / 100;
      const maxBatch = Math.floor((budget / oh - weights) / perSeq);

      write(root, 'weights', fmt.gb(weights / GIB));
      write(root, 'kvper', fmt.gb(perSeq / GIB));
      write(root, 'kvtotal', fmt.gb(kvTotal / GIB));
      write(root, 'overhead', fmt.gb(overhead / GIB));
      write(root, 'total', fmt.gb(total / GIB), fits ? 'out__v--ok' : 'out__v--warn');
      write(root, 'fits', fits ? 'yes' : 'NO — over budget', fits ? 'out__v--ok' : 'out__v--warn');
      write(root, 'maxbatch', maxBatch > 0 ? fmt.int(maxBatch) : '0 — weights alone exceed budget',
        maxBatch > 0 ? 'out__v--ok' : 'out__v--warn');
      write(root, 'kvshare', fmt.pct((kvTotal / total) * 100));
    };

    const sel = root.querySelector('[data-in="preset"]');
    if (sel) sel.addEventListener('change', () => { apply(sel.value); recompute(); });
    bind(root, recompute);
  }

  /* ---- 2. Cost per successful outcome --------------------------------- */

  function initCost(root) {
    const recompute = () => {
      const v = readValues(root);
      const inCost = (v.tin / 1e6) * v.pin;
      const outCost = (v.tout / 1e6) * v.pout;
      const perCall = inCost + outCost;

      const success = Math.min(Math.max(v.success, 1), 100) / 100;
      const retries = Math.max(v.retries, 0) / 100;
      const callsPerOutcome = (1 + retries) / success;

      const perOutcome = perCall * callsPerOutcome;
      const monthly = perOutcome * v.volume;

      write(root, 'percall', fmt.usd(perCall));
      write(root, 'inshare', fmt.pct(perCall ? (inCost / perCall) * 100 : 0));
      write(root, 'calls', callsPerOutcome.toFixed(2) + '×');
      write(root, 'peroutcome', fmt.usd(perOutcome));
      write(root, 'monthly', fmt.usd(monthly));
      write(root, 'annual', fmt.usd(monthly * 12));

      const bar = root.querySelector('[data-share]');
      if (bar && perCall > 0) {
        const p = (inCost / perCall) * 100;
        bar.children[0].style.width = p + '%';
        bar.children[1].style.width = (100 - p) + '%';
      }
    };
    bind(root, recompute);
  }

  /* ---- 3. Vector index memory ----------------------------------------- */

  function initIndex(root) {
    const recompute = () => {
      const v = readValues(root);
      const n = v.vectors * 1e6;
      const perEl = { fp32: 4, fp16: 2, int8: 1, binary: 0.125 }[v.quant] ?? 4;

      const vectors = n * v.dims * perEl;
      const full = n * v.dims * 4;                 // fp32 copy kept for rescoring
      const rescore = v.rescore === 'yes' ? full : 0;
      // HNSW layer-0 keeps ~2M neighbour ids; 4 bytes per id.
      const graph = v.index === 'hnsw' ? n * (2 * v.m) * 4 : 0;
      const total = vectors + graph + rescore;

      write(root, 'vectors', fmt.gb(vectors / GIB));
      write(root, 'graph', v.index === 'hnsw' ? fmt.gb(graph / GIB) : 'n/a — flat index');
      write(root, 'rescore', rescore ? fmt.gb(rescore / GIB) : 'not kept');
      write(root, 'total', fmt.gb(total / GIB));
      write(root, 'perv', (total / n).toFixed(0) + ' bytes');
      write(root, 'vsfp32', fmt.pct((total / (full + graph)) * 100));
    };
    bind(root, recompute);
  }

  /* ---- boot ------------------------------------------------------------ */

  const KINDS = { vram: initVram, cost: initCost, index: initIndex };

  const init = () => {
    document.querySelectorAll('[data-calc]').forEach((root) => {
      const fn = KINDS[root.dataset.calc];
      if (fn) fn(root);
    });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
