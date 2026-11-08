/* ================= live editing: taking one step back =================
   Reset throws every edit away at once, which is too blunt while you are
   trying values out. Undo takes back the last one and leaves the rest
   standing: ↶ in the header, or Ctrl/Cmd+Z while inspect mode is on.

   A step is one thing the user did, not one property written. Typing a font
   size that scales three nested spans is one step; so is a whole drag of a
   label, from mousedown to mouseup. uiiUndoBegin/uiiUndoEnd mark those out,
   and nest, so a drag swallows the edits the fields make inside it.

   Each entry records what the target looked like before, which is all undo
   needs: the edit standing on it, if any, and the inline value underneath. */

const uiiUndoState = { stack: [], open: null, depth: 0, busy: false };

function uiiUndoBegin() { if (!uiiUndoState.depth++) uiiUndoState.open = []; }

function uiiUndoEnd() {
  const U = uiiUndoState;
  if (U.depth && --U.depth) return;
  if (U.open && U.open.length) U.stack.push(U.open);
  U.open = null;
  uiiUndoSync();
}

// Two entries aim at the same thing when undoing one would undo the other.
function uiiUndoSame(a, b) {
  return a.k === b.k && (a.k === 'var' ? a.name === b.name : a.el === b.el && a.prop === b.prop);
}

// Within a step only the first entry for a target counts: it holds the value
// from before the step began, which is where undo has to land.
function uiiUndoAdd(entry) {
  const U = uiiUndoState;
  if (U.busy) return; // undoing writes through the same fields; it records nothing
  if (U.open) { if (!U.open.some((x) => uiiUndoSame(x, entry))) U.open.push(entry); return; }
  U.stack.push([entry]);
  uiiUndoSync();
}

// Reset has already put everything back: the stack now describes a world
// that no longer exists.
function uiiUndoClear() {
  uiiUndoState.stack.length = 0;
  uiiUndoState.open = null;
  uiiUndoState.depth = 0;
  uiiUndoSync();
}

// The button keeps its place and goes dim with nothing left to take back.
function uiiUndoSync() {
  const P = uiiState.panel;
  if (P && P.undo) P.undo.disabled = !uiiUndoState.stack.length;
}

function uiiUndoRunVar(e) {
  if (e.had) { uiiDeclSet(e.name, e.to); return; }
  const v = uiiVarEdits.get(e.name);
  if (v) { if (v.from) v.style.setProperty(v.prop, v.from, v.pri); else v.style.removeProperty(v.prop); }
  uiiVarEdits.delete(e.name);
}

// An element the undo emptied is no longer an edited element — unless a text
// child still carries an edit of its own, which only this entry can reach.
function uiiUndoDrop(el, ed) {
  if (!ed || Object.keys(ed.props).length || ed.text) return;
  if (ed.kids && [...ed.kids].some((k) => k !== el && uiiEditsFor(k, false))) return;
  uiiState.edits.delete(el);
}

function uiiUndoRun(e) {
  if (e.k === 'var') { uiiUndoRunVar(e); return; }
  const ed = uiiEditsFor(e.el, false);
  if (e.k === 'text') { if (ed) { uiiRestoreText(ed); delete ed.text; } }
  else if (e.had) uiiApplyEdit(e.el, e.prop, e.to);
  else {
    if (ed) { delete ed.props[e.prop]; delete ed.from[e.prop]; delete ed.rule[e.prop]; }
    // The inline value the page itself wrote, if any, goes back untouched:
    // removing the property outright would strip a style="" the app set.
    if (e.inline) e.el.style.setProperty(e.prop, e.inline, e.pri);
    else e.el.style.removeProperty(e.prop);
  }
  uiiUndoDrop(e.el, ed);
}

// A step that would put back a value nobody is editing any more describes a
// world that no longer exists. `hit` decides which entries those are; every
// other step stands, which is the point of resetting one value or one row.
function uiiUndoDrop(hit) {
  const U = uiiUndoState;
  const keep = (step) => step.filter((x) => !hit(x));
  U.stack = U.stack.map(keep).filter((step) => step.length);
  if (U.open) U.open = keep(U.open);
  uiiUndoSync();
}

// One element: everything (prop == null) or just one property of it.
function uiiUndoForget(el, prop) {
  uiiUndoDrop((x) => x.k !== 'var' && x.el === el && (prop == null || x.prop === prop));
}

// One variable, which belongs to no element.
function uiiUndoForgetVar(name) {
  uiiUndoDrop((x) => x.k === 'var' && x.name === name);
}

// Newest step first, and within it newest entry first. Stylesheet rules are
// put back wholesale by uiiSyncRules, which restores every rule the inspector
// touched and replays the edits still standing — the same path the "Apply to
// similar" checkbox uses, so no rule bookkeeping is needed here.
function uiiUndo() {
  const U = uiiUndoState;
  uiiUndoEnd(); // a step still open (a key held down) is a step to take back
  const step = U.stack.pop();
  if (!step) { uiiFlash('Nothing to undo'); return; }
  U.busy = true;
  try { for (let i = step.length - 1; i >= 0; i--) uiiUndoRun(step[i]); }
  finally { U.busy = false; }
  uiiSyncRules();
  const S = uiiState;
  if (S.varsMode) uiiVarsPanel();
  else if (S.info && S.info.el.isConnected) uiiSelect(S.info.el);
  else uiiRefreshChanges();
  uiiUndoSync();
}

// Built here rather than in uiiBuildPanel so the whole feature reads in one
// file. Dim until there is something to take back.
function uiiUndoButton() {
  const b = uiiHeadBtn('↶', 'undo-edit', 'Undo the last edit (Ctrl/Cmd+Z)', 'undo');
  b.disabled = true;
  b.addEventListener('click', () => uiiUndo());
  return b;
}
