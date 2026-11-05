/* ================= overlay: the host, the outlines, the hover box ============
   A single light-DOM host <div data-uii> carries a shadow root with every
   visual piece the inspector draws. What happens when the pointer moves over
   them is events.js; the padding and margin bands are spacing.js. */

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
  S.mgBox = mk('sp mg');
  S.pdBox = mk('sp pd');
  S.spv = mk('spv');
  S.badge = mk('badge');
  S.badge.innerHTML = 'Inspect — click to pin, <kbd>C</kbd> copies it for an AI, <kbd>Alt</kbd> for exact element,'
    + ' <kbd>↑↓←→</kbd> to walk, <kbd>Esc</kbd> to quit';
  S.badgeHtml = S.badge.innerHTML;
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
  S.mgBox = S.pdBox = S.spv = null;
  S.boxes = [];
}

// Say something in the badge for a moment, then let it fade back out. The
// badge is the one piece of chrome on screen whether the panel is open,
// minimised or closed, so it is where a keyboard action reports itself.
function uiiFlash(text) {
  const S = uiiState;
  if (!S.badge) return;
  clearTimeout(S.badgeTimer);
  S.badge.textContent = text;
  S.badge.classList.remove('off');
  S.badgeTimer = setTimeout(() => {
    if (!S.badge) return;
    S.badge.innerHTML = S.badgeHtml;
    S.badge.classList.add('off');
  }, 1200);
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
  uiiDrawSpacing(S.selected);
}

function uiiScheduleDraw() {
  const S = uiiState;
  if (S.holding) { S.drawLater = true; return; }
  if (S.raf) return;
  S.raf = requestAnimationFrame(() => { S.raf = 0; uiiDrawOutlines(); });
}
