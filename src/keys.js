/* ================= keyboard =================
   The shortcut that opens and closes inspect mode, and every key that acts
   while it is on: Escape, the arrow walk, and the bare letters that stand in
   for panel buttons. Bound once by uiiInit, in capture phase, so the app
   underneath never sees a key the inspector has claimed. */

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
  const plat = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '';
  const mac = /mac|iphone|ipad/i.test(plat);
  const wantMeta = k.meta || (k.mod && mac);
  const wantCtrl = k.ctrl || (k.mod && !mac);
  if (e.metaKey !== wantMeta || e.ctrlKey !== wantCtrl) return false;
  if (e.altKey !== k.alt || e.shiftKey !== k.shift) return false;
  const key = (e.key || '').toLowerCase();
  const code = (e.code || '').toLowerCase();
  return key === k.key || code === k.key || code === 'key' + k.key || code === 'digit' + k.key;
}

// Only boxes that take typing: a focused checkbox or colour swatch must not
// swallow the shortcuts.
const UII_TEXT_INPUT = /^(text|search|email|url|tel|password|number|date|time|datetime-local|month|week)$/;

function uiiInEditable(t) {
  return !!t && ((t.tagName === 'INPUT' && UII_TEXT_INPUT.test(t.type)) || t.tagName === 'TEXTAREA' || t.isContentEditable);
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
  // Shadow DOM retargets e.target to S.host for anything inside the panel —
  // a focused button reports the same target as a focused text input. Use
  // composedPath() to find what was actually focused, so Escape/arrows still
  // work after clicking a panel button; only real text entry gets skipped.
  // A page field can still hold focus from before inspect mode opened, and
  // its typing must stay typing — C is a shortcut only outside a text box.
  // Esc still works from a panel box or a page field: while inspecting it
  // means "quit", so the page's own Esc (clear a search) must not take it.
  if (uiiInEditable(e.target) && e.key !== 'Escape') return;
  const box = e.target === S.host && uiiInEditable(e.composedPath()[0]) ? e.composedPath()[0] : null;
  if (box && e.key !== 'Escape') return;
  if (e.key === 'Escape') {
    e.preventDefault();
    e.stopPropagation();
    if (box) box.blur(); // fires 'change', so a typed value lands before quitting
    if (S.cvList) uiiCloseVarList(); else uiiDisable(); // first Escape closes an open var list
    return;
  }
  if (/^Arrow(Up|Down|Left|Right)$/.test(e.key) && S.selected) {
    e.preventDefault(); e.stopPropagation(); uiiWalk(e.key);
    return;
  }
  // The one shortcut with a modifier: Cmd/Ctrl+Z takes back the last edit.
  // Guarded above, so inside a text box it stays the browser's own undo.
  if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'z') {
    uiiKeyAction(e, uiiUndo);
    return;
  }
  // Bare letters only: Cmd/Ctrl+C still copies whatever is selected, in the
  // panel or on the page. Each is a panel button without the reach — C the
  // Copy ID line, A the Changes box, V the Normal view toggle, P the page
  // variables, T the DOM tree.
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key.toLowerCase();
  if (k === 'c' && S.info) uiiKeyAction(e, () => uiiCopy(uiiFormatForAI(S.info)));
  else if (k === 'a') uiiKeyAction(e, uiiCopyChanges);
  else if (k === 'v') uiiKeyAction(e, uiiPeek);
  else if (k === 'p') uiiKeyAction(e, uiiToggleVars);
  else if (k === 't') uiiKeyAction(e, uiiToggleTree);
}

// A single-letter shortcut swallows its key, so the app underneath never
// sees it while inspect mode is on.
function uiiKeyAction(e, run) { e.preventDefault(); e.stopPropagation(); run(); }
