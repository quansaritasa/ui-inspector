/* ================= overlay: pointer events and pinning =================
   Every pointer event is captured on window so the app underneath never sees
   a click while inspect mode is on; events whose target is the host (they
   came from inside the panel) pass through untouched. Pinning an element is
   what builds the panel: see uiiCollect in inspect.js. */

// Nearest control ancestor of the pointer target, or the raw element while
// Alt is held (to reach a <span> inside a button, say).
function uiiTargetFrom(e) {
  return uiiSnap(e.target, e.altKey);
}

// The snap itself, without an event: the pointer tracker has coordinates
// only, so uiiOpenAtPointer calls this one directly.
function uiiSnap(t, alt) {
  if (!t || t.nodeType !== 1 || t === uiiState.host) return null;
  if (alt) return t;
  let c = null;
  try { c = t.closest(uiiState.selList); } catch (err) { c = null; }
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
  const h = S.tip.childElementCount > 2 ? 42 : 24;
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
}

function uiiOnMove(e) {
  if (uiiFromPanel(e)) { uiiSetHover(null); return; }
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
  const ready = uiiSelect(el);
  // Cmd/Ctrl+click pins and copies the Copy ID line in one go. It waits for
  // the script scan so the line names the script files, as the button would.
  // (Ctrl+click on macOS arrives as contextmenu, which also lands here.)
  if (e.metaKey || e.ctrlKey) ready.then((info) => uiiCopy(uiiFormatForAI(info)));
}

function uiiSelect(el) {
  const S = uiiState;
  S.selected = el;
  uiiPlace(S.selBox, el.getBoundingClientRect());
  S.selBox.classList.add('on');
  uiiDrawSpacing(el); // the bands belong to the click, not to the next frame
  const info = uiiCollect(el);
  S.info = info;
  uiiRenderPanel(info);
  // Script scan is async (first call fetches every <script src>); the Copy
  // buttons read info.code when pressed. Resolves to info once it is set;
  // a failed scan just leaves the line without script files.
  return uiiCodeFiles(info).then((files) => { info.code = files; }, () => {}).then(() => info);
}

const UII_EVENTS = [
  ['mousemove', uiiOnMove], ['mouseover', uiiOnBlock], ['mouseout', uiiOnBlock],
  ['mousedown', uiiOnBlock], ['mouseup', uiiOnBlock], ['click', uiiOnClick],
  ['dblclick', uiiOnBlock], ['contextmenu', uiiOnClick], ['pointerdown', uiiOnBlock],
];

function uiiBindEvents() {
  for (const [n, fn] of UII_EVENTS) window.addEventListener(n, fn, true);
  window.addEventListener('scroll', uiiScheduleDraw, true);
  window.addEventListener('resize', uiiScheduleDraw);
  uiiState.mo = new MutationObserver(uiiScheduleDraw);
  uiiState.mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'hidden'] });
}

function uiiUnbindEvents() {
  for (const [n, fn] of UII_EVENTS) window.removeEventListener(n, fn, true);
  window.removeEventListener('scroll', uiiScheduleDraw, true);
  window.removeEventListener('resize', uiiScheduleDraw);
  if (uiiState.mo) uiiState.mo.disconnect();
  uiiState.mo = null;
}
