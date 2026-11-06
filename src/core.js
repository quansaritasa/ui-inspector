/* ================= public API + keyboard =================
   UIInspector.init(opts) binds the shortcut; toggle()/enable()/disable()
   drive it by hand; destroy() removes everything including the shortcut. */

const UII_DEFAULTS = {
  shortcut: 'Mod+\\',          // Mod = Cmd on macOS, Ctrl elsewhere; null = no key binding
  selectors: ['button', 'input', 'select', 'textarea', 'a', 'label', 'summary',
    'section', '[role]', '[id]', '[data-ui]', '[contenteditable]'],
  nameAttr: 'data-ui',        // attribute the app uses to label components
  // Attribute holding a source location the app stamped on the element, e.g.
  // "grid-rows.js:33". It is a location, not a name: it never enters the name
  // chain, and null turns the whole feature off.
  srcAttr: 'data-src',
  ignore: [],                 // selectors never outlined or selectable
  maxOutlines: 400,           // cap on outline boxes per frame
  // Time budget for ONE scan, in ms. This is a hard cap on the whole walk, not
  // only on how much it outlines, because reading a rect is the expensive half:
  // on a list whose rows opt into `content-visibility: auto` every
  // getBoundingClientRect() forces the layout that rule was skipping, so a
  // 56,000-element document measured ~3 ms PER ELEMENT — three minutes with the
  // renderer pinned and no key reaching the page. Anything left unscanned is
  // simply not outlined this frame; a scroll or a mutation reschedules the draw.
  maxScanMs: 120,
  scripts: null,              // (url) => bool: which <script src> to scan for the element; default skips vendor/
  onCopy: null,               // (text) => void; default navigator.clipboard
  onToggle: null,             // (on) => void
};

const uiiState = {
  similar: true,  // edits also rewrite the CSS rule (see editrules.js)
  opts: null, selList: '', on: false, bound: false,
  host: null, shadow: null, layer: null, hoverBox: null, selBox: null, tip: null,
  badge: null, scratch: null, panel: null, boxes: [], raf: 0, mo: null,
  hovered: null, selected: null, info: null, key: null, sources: null,
  mgBox: null, pdBox: null, spv: null, badgeTimer: 0, badgeHtml: '', peek: false,
  mx: 0, my: 0, pos: false,  // last pointer position, tracked while bound (see uiiTrackPointer)
};

// How long the hint at the top stays before it fades. It says what the keys
// do; once it has been read it is a strip across whatever sits under it.
const UII_BADGE_MS = 2000;

function uiiEnable() {
  const S = uiiState;
  if (S.on) return;
  S.on = true;
  uiiMount();
  uiiBindEvents();
  uiiDrawOutlines();
  uiiScriptIndex(); // warm the script scan; never rejects (each fetch catches)
  uiiOpenAtPointer();
  S.badgeTimer = setTimeout(() => { if (S.badge) S.badge.classList.add('off'); }, UII_BADGE_MS);
  if (typeof S.opts.onToggle === 'function') S.opts.onToggle(true);
}

function uiiDisable() {
  const S = uiiState;
  if (!S.on) return;
  S.on = false;
  clearTimeout(S.badgeTimer);
  uiiCloseVarList();
  uiiUnbindEvents();
  if (S.raf) cancelAnimationFrame(S.raf);
  clearTimeout(S.drawTimer); // a redraw waiting out uiiScheduleDraw's gap
  clearTimeout(S.treeTimer); clearTimeout(S.chgTimer); // their targets go with the panel
  S.raf = 0;
  uiiUnmount();
  S.hovered = S.selected = S.info = null;
  S.peek = false;
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
    window.addEventListener('mousemove', uiiTrackPointer, { capture: true, passive: true });
    S.bound = true;
  }
  return uiiApi;
}

function uiiDestroy() {
  uiiDisable();
  if (uiiState.bound) {
    window.removeEventListener('keydown', uiiOnKey, true);
    window.removeEventListener('mousemove', uiiTrackPointer, true);
  }
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
  isCovered: (el) => uiiOcclusion()(el, el.getBoundingClientRect()),
  editCount: uiiEditCount,
};
