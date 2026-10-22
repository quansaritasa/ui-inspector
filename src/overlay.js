/* ================= overlay: outlines, hover box, click capture =================
   A single light-DOM host <div data-uii> carries a shadow root with every
   visual piece. Events are captured on window so the app underneath never
   sees a click while inspect mode is on; events whose target is the host
   (i.e. came from inside the panel) pass through untouched. */

function uiiMount() {
  const S = uiiState;
  if (S.host) return;
  const host = document.createElement('div');
  host.setAttribute('data-uii', '');
  const sh = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = UII_CSS;
  sh.appendChild(style);
  const mk = (cls) => { const d = document.createElement('div'); d.className = cls; sh.appendChild(d); return d; };
  S.layer = mk('layer');
  S.hoverBox = mk('hover');
  S.selBox = mk('hover sel');
  S.tip = mk('tip');
  S.badge = mk('badge');
  S.badge.innerHTML = 'Inspect — hover, click to pin, <kbd>Alt</kbd> for exact element, <kbd>↑↓←→</kbd> to walk, <kbd>Esc</kbd> to quit';
  S.scratch = mk('scratch');
  S.scratch.style.display = 'none';
  uiiBuildPanel(sh);
  document.documentElement.appendChild(host);
  S.host = host;
  S.shadow = sh;
}

function uiiUnmount() {
  const S = uiiState;
  if (S.host) S.host.remove();
  S.host = S.shadow = S.layer = S.hoverBox = S.selBox = S.tip = S.badge = S.scratch = S.panel = null;
  S.boxes = [];
}

function uiiFromPanel(e) {
  return e.target === uiiState.host;
}

function uiiIgnored(el) {
  const ig = uiiState.opts.ignore;
  if (!ig.length) return false;
  for (const s of ig) { try { if (el.closest(s)) return true; } catch (err) { /* bad selector */ } }
  return false;
}

// Visible, uncovered candidates inside the viewport, capped so a 5,000-row
// tree does not turn into 5,000 divs. The time budget truncates in document
// order, so if it ever trips, a popup late in the markup is what goes
// unoutlined — the box count with a popup open is the check that it does not.
function uiiControls() {
  const S = uiiState;
  const vw = window.innerWidth, vh = window.innerHeight;
  const out = [];
  const all = document.querySelectorAll(S.selList);
  const t0 = performance.now();
  const covered = uiiOcclusion();
  for (const el of all) {
    if (out.length >= S.opts.maxOutlines) break;
    if (performance.now() - t0 > S.opts.maxScanMs) break;
    if (el === S.host || S.host.contains(el) || uiiIgnored(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1 || r.bottom < 0 || r.right < 0 || r.top > vh || r.left > vw) continue;
    if (getComputedStyle(el).visibility === 'hidden') continue;
    if (covered(el, r)) continue;
    out.push({ el, r });
  }
  return out;
}

function uiiPlace(box, r) {
  box.style.left = r.left + 'px';
  box.style.top = r.top + 'px';
  box.style.width = r.width + 'px';
  box.style.height = r.height + 'px';
}

function uiiDrawOutlines() {
  const S = uiiState;
  if (!S.layer) return;
  const items = uiiControls();
  while (S.boxes.length < items.length) {
    const d = document.createElement('div');
    S.layer.appendChild(d);
    S.boxes.push(d);
  }
  S.boxes.forEach((d, i) => {
    const it = items[i];
    if (!it) { d.style.display = 'none'; return; }
    d.style.display = '';
    d.className = 'box ' + uiiKind(it.el);
    uiiPlace(d, it.r);
  });
  if (S.selected && S.selected.isConnected) uiiPlace(S.selBox, S.selected.getBoundingClientRect());
  else S.selBox.classList.remove('on');
}

function uiiScheduleDraw() {
  const S = uiiState;
  if (S.holding) { S.drawLater = true; return; }
  if (S.raf) return;
  S.raf = requestAnimationFrame(() => { S.raf = 0; uiiDrawOutlines(); });
}

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
