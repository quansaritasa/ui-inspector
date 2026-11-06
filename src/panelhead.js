/* ================= the panel header =================
   The title line and the row of keys at its right, in three groups read
   left to right: what you did to the element (↶ ↺), what you are looking at
   (🎨 👁), and the window itself (— ✕). A thin rule separates the groups.

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

  // Group 3 — the window. Minimize folds the panel to its header so the page
  // underneath shows; the class lives on the panel, so a new selection stays
  // folded.
  const fold = uiiHeadBtn('—', 'minimize', 'Minimize');
  const close = uiiHeadBtn('✕', 'close-panel', 'Close panel (selection stays)');

  const sep = () => uiiEl('span', 'sep');
  head.append(name, tag, ok, undo, reset, sep(), treeBtn, vars, peek, sep(), fold, close);

  close.addEventListener('click', () => p.classList.remove('on'));
  peek.addEventListener('click', () => uiiPeek());
  treeBtn.addEventListener('click', () => uiiToggleTree());
  vars.addEventListener('click', () => uiiToggleVars());
  fold.addEventListener('click', () => {
    const min = p.classList.toggle('min');
    fold.textContent = min ? '▢' : '—';
    fold.title = min ? 'Maximize' : 'Minimize';
    fold.setAttribute('aria-label', fold.title);
  });
  reset.addEventListener('click', () => uiiResetEdits(S.varsMode ? null : S.info && S.info.el));
  return { head, name, tag, ok, undo, reset, treeBtn, vars, peek };
}
