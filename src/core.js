/* ================= public API + keyboard =================
   UIInspector.init(opts) binds the shortcut; toggle()/enable()/disable()
   drive it by hand; destroy() removes everything including the shortcut. */

const UII_DEFAULTS = {
  shortcut: 'Mod+/',          // Mod = Cmd on macOS, Ctrl elsewhere; null = no key binding
  selectors: ['button', 'input', 'select', 'textarea', 'a', 'label', 'summary',
    '[role]', '[id]', '[data-ui]', '[contenteditable]'],
  nameAttr: 'data-ui',        // attribute the app uses to label components
  ignore: [],                 // selectors never outlined or selectable
  maxOutlines: 400,           // cap on outline boxes per frame
  scripts: null,              // (url) => bool: which <script src> to scan for the element; default skips vendor/
  onCopy: null,               // (text) => void; default navigator.clipboard
  onToggle: null,             // (on) => void
};

const uiiState = {
  opts: null, selList: '', on: false, bound: false,
  host: null, shadow: null, layer: null, hoverBox: null, selBox: null, tip: null,
  badge: null, scratch: null, panel: null, boxes: [], raf: 0, mo: null,
  hovered: null, selected: null, info: null, key: null, sources: null,
};

// "Mod+Shift+/" -> { mod, ctrl, meta, alt, shift, key }
function uiiParseShortcut(s) {
  if (!s) return null;
  const k = { mod: false, ctrl: false, meta: false, alt: false, shift: false, key: '' };
  for (const part of String(s).split('+')) {
    const p = part.trim().toLowerCase();
    if (p === 'mod') k.mod = true;
    else if (p === 'ctrl' || p === 'control') k.ctrl = true;
    else if (p === 'cmd' || p === 'meta' || p === 'command') k.meta = true;
    else if (p === 'alt' || p === 'option') k.alt = true;
    else if (p === 'shift') k.shift = true;
    else k.key = p;
  }
  return k;
}

function uiiKeyMatches(e, k) {
  if (!k) return false;
  const mac = /Mac|iPhone|iPad/.test(navigator.platform);
  const wantMeta = k.meta || (k.mod && mac);
  const wantCtrl = k.ctrl || (k.mod && !mac);
  if (e.metaKey !== wantMeta || e.ctrlKey !== wantCtrl) return false;
  if (e.altKey !== k.alt || e.shiftKey !== k.shift) return false;
  const key = (e.key || '').toLowerCase();
  const code = (e.code || '').toLowerCase();
  return key === k.key || code === k.key || code === 'key' + k.key || code === 'digit' + k.key;
}

function uiiInEditable(t) {
  return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
}

// Arrow keys walk the DOM from the pinned element, DevTools style.
function uiiWalk(dir) {
  const S = uiiState;
  const cur = S.selected;
  if (!cur) return;
  let next = null;
  if (dir === 'ArrowUp') next = cur.parentElement;
  else if (dir === 'ArrowDown') next = cur.firstElementChild;
  else if (dir === 'ArrowLeft') next = cur.previousElementSibling;
  else if (dir === 'ArrowRight') next = cur.nextElementSibling;
  if (next && next !== document.documentElement && next !== S.host) uiiSelect(next);
}

function uiiOnKey(e) {
  const S = uiiState;
  if (uiiKeyMatches(e, S.key)) {
    if (!S.on && uiiInEditable(e.target)) return; // leave the editor's own binding alone
    e.preventDefault();
    e.stopPropagation();
    uiiToggle();
    return;
  }
  if (!S.on) return;
  if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); uiiDisable(); return; }
  if (/^Arrow(Up|Down|Left|Right)$/.test(e.key) && S.selected) {
    e.preventDefault(); e.stopPropagation(); uiiWalk(e.key);
  }
}

function uiiEnable() {
  const S = uiiState;
  if (S.on) return;
  S.on = true;
  uiiMount();
  uiiBindEvents();
  uiiDrawOutlines();
  if (typeof S.opts.onToggle === 'function') S.opts.onToggle(true);
}

function uiiDisable() {
  const S = uiiState;
  if (!S.on) return;
  S.on = false;
  uiiUnbindEvents();
  if (S.raf) cancelAnimationFrame(S.raf);
  S.raf = 0;
  uiiUnmount();
  S.hovered = S.selected = S.info = null;
  if (typeof S.opts.onToggle === 'function') S.opts.onToggle(false);
}

function uiiToggle() {
  if (uiiState.on) uiiDisable(); else uiiEnable();
}

function uiiInit(opts) {
  const S = uiiState;
  S.opts = Object.assign({}, UII_DEFAULTS, opts || {});
  S.selList = S.opts.selectors.join(',');
  S.key = uiiParseShortcut(S.opts.shortcut);
  if (!S.bound) {
    window.addEventListener('keydown', uiiOnKey, true);
    S.bound = true;
  }
  return uiiApi;
}

function uiiDestroy() {
  uiiDisable();
  if (uiiState.bound) window.removeEventListener('keydown', uiiOnKey, true);
  uiiState.bound = false;
}

const uiiApi = {
  init: uiiInit,
  enable: uiiEnable,
  disable: uiiDisable,
  toggle: uiiToggle,
  destroy: uiiDestroy,
  select: (el) => { uiiEnable(); uiiSelect(el); },
  info: () => uiiState.info,
  isOn: () => uiiState.on,
  formatForAI: uiiFormatForAI,
  formatDetails: uiiFormatDetails,
};
