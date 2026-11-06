/* ================= the panel header =================
   The title line and the row of keys at its right, in three groups read
   left to right: what you did to the element (↶ ↺), what you are looking at
   (🌳 🎨 👁 💧), and the window itself (— ✕). A thin rule separates the groups.

   Every key is the same square, one glyph, no word — a label on one of them
   would break the rhythm and move its neighbours. The contextual pair stays
   in the row and goes dim instead of vanishing, so nothing ever slides out
   from under the pointer halfway through an edit. */

// One glyph, its name in the tooltip and on the accessibility tree, since
// no word is shown.
function uiiHeadBtn(glyph, ui, title, cls) {
  const b = uiiEl('button', cls, glyph, ui);
  b.title = title;
  b.setAttribute('aria-label', title);
  return b;
}

// Builds the header, wires its keys, and returns the parts uiiBuildPanel
// keeps on uiiState.panel.
function uiiBuildHead(p) {
  const S = uiiState;
  const head = uiiEl('div', 'head', undefined, 'panel-head');
  const name = uiiEl('span', 'name', undefined, 'panel-name');
  const tag = uiiEl('span', 'tag', undefined, 'panel-tag');
  const ok = uiiEl('span', 'ok', '', 'copy-status');

  // Group 1 — what you did. Dim with nothing to take back.
  const undo = uiiUndoButton();
  const reset = uiiHeadBtn('↺', 'reset-edits',
    'Reset — put every live edit on this element back, and every variable edit', 'reset');
  reset.disabled = true; // nothing to put back until an edit lands

  // Group 2 — what you are looking at. Each lights up while its mode is on.
  // The palette is the page's variables, editable with nothing pinned;
  // Normal view hides the overlay without closing the panel, so the edits,
  // the Changes box and the pinned element all survive the look.
  const treeBtn = uiiHeadBtn('🌳', 'dom-tree-toggle',
    'DOM tree — pick an element from the page structure (T)');
  const vars = uiiHeadBtn('🎨', 'vars-mode',
    'Page variables — edit the palette without pinning anything (P)');
  const peek = uiiHeadBtn('👁', 'normal-view',
    'Normal view — hide the overlay and use the page (V)');
  const drop = uiiHeadBtn('💧', 'color-picker',
    window.EyeDropper ? 'Color picker — click any pixel on screen to copy its colour (I).'
      + ' Ctrl/Cmd+I copies the hovered colour with no click'
      : 'Color picker — not supported in this browser (Chrome/Edge only)');
  drop.disabled = !window.EyeDropper;

  // Group 3 — the window. Minimize folds the panel to its header so the page
  // underneath shows; the class lives on the panel, so a new selection stays
  // folded.
  const fold = uiiHeadBtn('—', 'minimize', 'Minimize');
  const close = uiiHeadBtn('✕', 'close-panel', 'Close panel (selection stays)');

  const sep = () => uiiEl('span', 'sep');
  head.append(name, tag, ok, undo, reset, sep(), treeBtn, vars, peek, drop, sep(), fold, close);

  close.addEventListener('click', () => p.classList.remove('on'));
  peek.addEventListener('click', () => uiiPeek());
  treeBtn.addEventListener('click', () => uiiToggleTree());
  vars.addEventListener('click', () => uiiToggleVars());
  drop.addEventListener('click', () => uiiPickColor());
  fold.addEventListener('click', () => {
    const min = p.classList.toggle('min');
    fold.textContent = min ? '▢' : '—';
    fold.title = min ? 'Maximize' : 'Minimize';
    fold.setAttribute('aria-label', fold.title);
  });
  reset.addEventListener('click', () => uiiResetEdits(S.varsMode ? null : S.info && S.info.el));
  return { head, name, tag, ok, undo, reset, treeBtn, vars, peek };
}

// The browser's own eyedropper: it samples any pixel on screen, the page's
// own colours included. The outlines go while it is open so a sample never
// lands on the inspector's drawing instead of the page. Esc cancels it.
function uiiPickColor() {
  const S = uiiState;
  const hid = S.host && !S.host.classList.contains('peek');
  if (hid) S.host.classList.add('peek');
  new EyeDropper().open()
    // No btn: the key is a one-glyph square, a message would stretch it.
    .then((r) => uiiCopy(r.sRGBHex, null, `✅ ${r.sRGBHex} copied`), () => {}) // rejected = cancelled
    .finally(() => { if (hid && S.host) S.host.classList.remove('peek'); });
}

// Ctrl/Cmd+I: the colour under the pointer, read from CSS, no click. Over a
// glyph it is the text colour; anywhere else the first background that is
// not transparent, walking up — what shows behind the pointer. A background
// image or gradient is not a colour and is walked past.
function uiiCopyHoverColor() {
  const S = uiiState;
  if (!S.pos) return;
  const x = S.mx, y = S.my;
  const el = document.elementFromPoint(x, y);
  if (!el || (S.host && S.host.contains(el))) return; // over the panel
  let hex, what;
  const node = uiiTextNodeAt(x, y);
  if (node) { hex = uiiToHex(getComputedStyle(node.parentElement).color); what = 'text'; }
  else {
    let bg = el;
    while (bg && uiiIsTransparent(getComputedStyle(bg).backgroundColor)) bg = bg.parentElement;
    hex = bg ? uiiToHex(getComputedStyle(bg).backgroundColor) : '#ffffff'; // nothing set: the canvas default
    what = 'background';
  }
  uiiCopy(hex, null, `✅ ${hex} copied (${what})`);
}

// The text node whose glyph sits under (x, y), or null. The caret APIs snap
// to the nearest character even from blank space, so the glyph's own box
// has to contain the point.
function uiiTextNodeAt(x, y) {
  let node, off;
  if (document.caretPositionFromPoint) {
    const p = document.caretPositionFromPoint(x, y);
    if (p) { node = p.offsetNode; off = p.offset; }
  } else if (document.caretRangeFromPoint) {
    const r = document.caretRangeFromPoint(x, y);
    if (r) { node = r.startContainer; off = r.startOffset; }
  }
  if (!node || node.nodeType !== 3) return null;
  const hit = (a, b) => {
    if (a < 0 || b > node.length) return false;
    const r = document.createRange();
    r.setStart(node, a); r.setEnd(node, b);
    return [...r.getClientRects()].some((q) => x >= q.left && x <= q.right && y >= q.top && y <= q.bottom);
  };
  return hit(off, off + 1) || hit(off - 1, off) ? node : null;
}
