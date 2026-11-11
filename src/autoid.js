/* ================= ids for every panel element =================
   The panel and the color picker popup name their controls by hand (see
   uiiEl); this fills in the rest — wrappers, labels, the picker's own parts —
   so "copy ID" can aim at any of them. id = nearest named ancestor + tag (+
   first class) + position among the same kind inside that ancestor, e.g.
   card-border-span-lab-2. Written as id and data-ui, like the hand names. */

const UII_ID_ROOTS = '#inspector-panel, #color-picker';

function uiiKey(el) {
  const cls = (el.getAttribute('class') || '').trim().split(/\s+/)[0];
  return uiiSlug(el.localName + (cls ? '-' + cls : ''));
}

function uiiAutoId(sh) {
  const run = () => {
    for (const el of sh.querySelectorAll(UII_ID_ROOTS.split(', ').map((r) => r + ' *:not([id])').join(', '))) {
      const up = el.parentElement.closest('[id]');
      const key = uiiKey(el);
      let n = 1;
      for (const o of up.querySelectorAll('*')) { if (o === el) break; if (uiiKey(o) === key) n++; }
      let id = up.id + '-' + key + '-' + n;
      while (sh.getElementById(id)) id += '-x';
      el.id = id;
      el.setAttribute('data-ui', id);
    }
  };
  run();
  new MutationObserver(run).observe(sh, { childList: true, subtree: true });
}
