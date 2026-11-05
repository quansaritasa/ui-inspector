/* ================= overlay: pointer events and pinning =================
   Every pointer event is captured on window so the app underneath never sees
   a click while inspect mode is on; events whose target is the host (they
   came from inside the panel) pass through untouched. Pinning an element is
   what builds the panel: see uiiCollect in inspect.js. */

// Nearest control ancestor of the pointer target, or the raw element while
// Alt is held (to reach a <span> inside a button, say).
function uiiTargetFrom(e) {
  const t = e.target;
  if (!t || t.nodeType !== 1 || t === uiiState.host) return null;
  if (e.altKey) return t;
  let c = null;
  try { c = t.closest(uiiState.selList); } catch (err) { c = null; }
  return c && c !== document.body && c !== document.documentElement ? c : t;
}

function uiiSetHover(el) {
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
  const top = r.top > 28 ? r.top - 24 : r.bottom + 4;
  S.tip.style.left = Math.max(4, Math.min(r.left, window.innerWidth - 370)) + 'px';
  S.tip.style.top = top + 'px';
  S.tip.classList.add('on');
}

function uiiOnMove(e) {
  if (uiiFromPanel(e)) { uiiSetHover(null); return; }
  uiiSetHover(uiiTargetFrom(e));
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
  if (el) uiiSelect(el);
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
  // buttons read info.code when pressed.
  uiiCodeFiles(info).then((files) => { info.code = files; });
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
