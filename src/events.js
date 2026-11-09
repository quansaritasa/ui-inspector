/* ================= overlay: pointer events and pinning =================
   Every pointer event is captured on window so the app underneath never sees
   a click while inspect mode is on; events whose target is the host (they
   came from inside the panel) pass through untouched. Pinning an element is
   what builds the panel: see uiiCollect in inspect.js. */

// Nearest interactive ancestor of the pointer target, or the raw element while
// Alt is held (to reach a <span> inside a button, say).
function uiiTargetFrom(e) {
  return uiiSnap(e.target, e.altKey);
}

// Only interactive controls pull a click up to themselves. Containers that
// merely get outlined ([id], section, [role]) do not: a click on a <mark>
// inside <pre id="raw"> pins the <mark>, not the whole <pre>.
const UII_SNAP = 'button,a,label,input,select,textarea,summary,[contenteditable]';

// The snap itself, without an event: the pointer tracker has coordinates
// only, so uiiOpenAtPointer calls this one directly.
function uiiSnap(t, alt) {
  if (!t || t.nodeType !== 1 || t === uiiState.host) return null;
  if (alt) return t;
  const c = t.closest(UII_SNAP);
  return c && c !== document.body && c !== document.documentElement ? c : t;
}

// raw: the element under the pointer. When it sits inside el (the snap went
// up to a parent), the tip says how to reach it.
function uiiSetHover(el, raw) {
  const S = uiiState;
  S.hovered = el;
  if (!el) { S.hoverBox.classList.remove('on'); S.tip.classList.remove('on'); return; }
  const r = el.getBoundingClientRect();
  uiiPlace(S.hoverBox, r);
  S.hoverBox.classList.add('on');
  S.tip.innerHTML = '<b></b> <span></span>';
  S.tip.firstChild.textContent = uiiName(el);
  S.tip.lastChild.textContent = '<' + el.tagName.toLowerCase() + '> ' + Math.round(r.width) + '×' + Math.round(r.height)
    + ' · ' + getComputedStyle(el).fontSize;
  if (raw && raw !== el && raw.nodeType === 1) {
    const hint = document.createElement('i');
    hint.textContent = 'Hold Alt to pick the <' + raw.tagName.toLowerCase() + '> inside';
    S.tip.appendChild(hint);
  }
  // A parent its children cover edge to edge (a row of cells) has no spot to
  // hover; ↑ after the click is the way up, so name it.
  const up = el.parentElement;
  if (up && up !== document.body && up !== document.documentElement) {
    const hint = document.createElement('i');
    hint.textContent = 'Click, then ↑ for the <' + up.tagName.toLowerCase() + '> around it';
    S.tip.appendChild(hint);
  }
  const h = 24 + 18 * (S.tip.childElementCount - 2);
  const top = r.top > h + 4 ? r.top - h : r.bottom + 4;
  S.tip.style.left = Math.max(4, Math.min(r.left, window.innerWidth - 370)) + 'px';
  S.tip.style.top = top + 'px';
  S.tip.classList.add('on');
}

// Where the pointer is, kept up to date from init, not from enable: the
// shortcut carries no coordinates, and the panel has to know which half of
// the screen to avoid the moment the mode opens. Two assignments per move.
function uiiTrackPointer(e) {
  const S = uiiState;
  S.mx = e.clientX; S.my = e.clientY; S.pos = true;
  if (S.ptrToast && !S.ptrToast.classList.contains('off')) uiiPlacePtrToast();
}

function uiiOnMove(e) {
  // A pointer over the panel clears the hover — except over a tree row,
  // which has just asked for the outline on the element it names.
  if (uiiFromPanel(e)) { if (!uiiState.treeHover) uiiSetHover(null); return; }
  uiiSetHover(uiiTargetFrom(e), e.target);
}

function uiiOnBlock(e) {
  // A drag that starts in the panel (scrub, resize, move) and ends outside it
  // makes the browser click the common ancestor — <html> — which would re-pin.
  if (e.type === 'mousedown') uiiState.downInPanel = uiiFromPanel(e);
  if (uiiFromPanel(e)) return;
  e.preventDefault();
  e.stopPropagation();
}

function uiiOnClick(e) {
  if (uiiFromPanel(e)) return;
  e.preventDefault();
  e.stopPropagation();
  if (uiiState.downInPanel) { uiiState.downInPanel = false; return; }
  const el = uiiTargetFrom(e);
  if (!el) return;
  uiiPanelAway(e.clientX);
  const ready = uiiSelect(el, e.shiftKey);
  if (e.shiftKey) { uiiTogglePick(el, ready); return; }
  // Cmd/Ctrl+click (or any click with Auto copy ticked) pins and copies the
  // Copy ID line in one go. It waits for the script scan so the line names
  // the script files, as the button would.
  // (Ctrl+click on macOS arrives as contextmenu, which also lands here.)
  if (e.metaKey || e.ctrlKey || uiiState.autoCopy) ready.then((info) => uiiCopy(uiiFormatForAI(info)));
}

// Every pin (click, arrow walk, tree row, the shortcut) makes el pick 1 and
// drops the rest of the list; keep (Shift+click) leaves the list to the caller.
function uiiSelect(el, keep) {
  const S = uiiState;
  S.selected = el;
  uiiDrawSpacing(el); // the bands belong to the click, not to the next frame
  const info = uiiCollect(el);
  S.info = info;
  uiiRenderPanel(info);
  // Script scan is async (first call fetches every <script src>); the Copy
  // buttons read info.code when pressed. Resolves to info once it is set;
  // a failed scan just leaves the line without script files.
  const ready = uiiCodeFiles(info).then((files) => { info.code = files; }, () => {}).then(() => info);
  if (!keep) { S.picks = [{ el, ready }]; S.pickSeq++; uiiDrawPicks(); } // seq++: a pending Shift copy is stale now
  return ready;
}

// Shift+click: add el to the pick list, or take it out when already there,
// then copy every picked element's Copy ID line as one prompt opener. ready is
// uiiSelect's promise, kept so each line names its script files. The seq
// guard stops a slow, older copy from landing over a newer list.
function uiiTogglePick(el, ready) {
  const S = uiiState;
  const at = S.picks.findIndex((p) => p.el === el);
  if (at >= 0) S.picks.splice(at, 1); else S.picks.push({ el, ready });
  uiiDrawPicks();
  const seq = ++S.pickSeq;
  if (!S.picks.length) { uiiFlash('Pick list empty'); return; }
  Promise.all(S.picks.map((p) => p.ready)).then((infos) => {
    if (seq !== S.pickSeq) return;
    // Just the list, "[a], [b] and [c]", so the user writes the ask around it
    const ids = infos.map(uiiFormatForAI);
    uiiCopy(ids.length < 2 ? ids[0] : ids.slice(0, -1).join(', ') + ' and ' + ids[ids.length - 1]);
  });
}

const UII_EVENTS = [
  ['mousemove', uiiOnMove], ['mouseover', uiiOnBlock], ['mouseout', uiiOnBlock],
  ['mousedown', uiiOnBlock], ['mouseup', uiiOnBlock], ['click', uiiOnClick],
  ['dblclick', uiiOnBlock], ['contextmenu', uiiOnClick], ['pointerdown', uiiOnBlock],
  // The rest of what an app can hang a click on: pointerup/touch handlers, hover
  // menus, middle-click. Same rule as the others: the page never sees them.
  ['pointerup', uiiOnBlock], ['pointerover', uiiOnBlock], ['pointerout', uiiOnBlock],
  ['auxclick', uiiOnBlock], ['touchstart', uiiOnBlock], ['touchend', uiiOnBlock],
];

// Events from inside the panel pass the window untouched, then bubble out of
// the host to the app's document/window listeners — where a popup's "click
// outside" or "focus left" handler closes the popup being inspected. Stop them
// at the host: the panel's own listeners (deeper in the shadow tree) already ran.
const UII_PANEL_STOP = ['click', 'dblclick', 'auxclick', 'contextmenu', 'mousedown', 'mouseup',
  'pointerdown', 'pointerup', 'touchstart', 'touchend', 'focusin', 'focusout'];
const uiiStopAtHost = (e) => e.stopPropagation();

function uiiBindEvents() {
  for (const [n, fn] of UII_EVENTS) window.addEventListener(n, fn, { capture: true, passive: false });
  if (uiiState.host) for (const n of UII_PANEL_STOP) uiiState.host.addEventListener(n, uiiStopAtHost);
  window.addEventListener('scroll', uiiScheduleDraw, true);
  window.addEventListener('resize', uiiScheduleDraw);
  uiiState.mo = new MutationObserver(() => { uiiScheduleDraw(); uiiTreeTouch(); });
  uiiState.mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'hidden'] });
}

function uiiUnbindEvents() {
  for (const [n, fn] of UII_EVENTS) window.removeEventListener(n, fn, true);
  window.removeEventListener('scroll', uiiScheduleDraw, true);
  window.removeEventListener('resize', uiiScheduleDraw);
  if (uiiState.mo) uiiState.mo.disconnect();
  uiiState.mo = null;
}
