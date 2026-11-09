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
  style.textContent = UII_CSS + UII_CP_CSS + UII_CP_TWEAKS;
  sh.appendChild(style);
  const mk = (cls) => { const d = document.createElement('div'); d.className = cls; sh.appendChild(d); return d; };
  S.layer = mk('layer');
  S.hoverBox = mk('hover');
  S.tip = mk('tip');
  S.mgBox = mk('sp mg');
  S.pdBox = mk('sp pd');
  S.spv = mk('spv');
  S.badge = mk('badge');
  S.badge.innerHTML = 'Inspect — click to pin, <kbd>Shift</kbd>+click to pick several, <kbd>C</kbd> copies it for an AI, <kbd>A</kbd> copies all changes,'
    + ' <kbd>V</kbd> normal view, <kbd>P</kbd> page variables, <kbd>I</kbd> color picker, <kbd>T</kbd> DOM tree, <kbd>Ctrl/Cmd+Z</kbd> undo, <kbd>Alt</kbd> for exact element, <kbd>↑↓←→</kbd> to walk, <kbd>Esc</kbd> to quit';
  S.badgeHtml = S.badge.innerHTML;
  S.ptrToast = mk('ptrtoast off');
  S.scratch = mk('scratch');
  S.scratch.style.display = 'none';
  uiiBuildPanel(sh);
  Bounce.attach(sh, 'button'); // every key in the panel and its popups
  // A 13px tick box needs a deep dip to be seen, and its label is the bigger target.
  Bounce.attach(sh, 'label.sim', { scale: 0.65, over: 0.3, to: (l) => l.querySelector('input[type=checkbox]') });
  Bounce.attach(sh, '.nf, .tf, .txt', { scale: 0.97, over: 0.02 }); // the type-in fields
  Bounce.attach(sh, '.tr', { scale: 0.97, over: 0.02 }); // DOM-tree rows: full width, so a shallow dip
  document.documentElement.appendChild(host);
  S.host = host;
  S.shadow = sh;
}

function uiiUnmount() {
  const S = uiiState;
  uiiDestroyColorPicker(); // its mount dies with the host
  if (S.host) S.host.remove();
  S.host = S.shadow = S.layer = S.hoverBox = S.tip = S.badge = S.scratch = S.panel = null;
  S.mgBox = S.pdBox = S.spv = S.ptrToast = null;
  S.boxes = [];
  S.pickBoxes = [];
}

// The panel sits on the right, unless x (the pointer) is in the right 30% of
// the screen — then it moves left so it does not cover what was just picked.
// A panel already on the wanted side stays where it is, so a spot the user
// dragged it to is kept.
function uiiPanelAway(x) {
  const p = uiiState.panel.root;
  const r = p.getBoundingClientRect();
  const w = window.innerWidth;
  const wantLeft = x > w * 0.7;
  if (r.width && (r.left + r.width / 2 < w / 2) === wantLeft) return;
  if (wantLeft) { p.style.left = '16px'; p.style.right = 'auto'; }
  else { p.style.left = 'auto'; p.style.right = '16px'; }
}

// The panel opens with inspect mode, already filled: the element under the
// pointer is pinned, so there is no empty panel to look at and no click to
// make first. It is parked on the right, or on the left when the pointer is
// in the right 30% of the screen, because the pointer is sitting on what is
// about to be inspected and a 500px panel over it would be in the way.
// Without a pointer position (the shortcut pressed on a freshly loaded page)
// nothing is pinned and the panel stays closed until the first click.
function uiiOpenAtPointer() {
  const S = uiiState;
  if (!S.pos) return;
  uiiPanelAway(S.mx);
  const el = uiiSnap(document.elementFromPoint(S.mx, S.my), false);
  if (!el || el === document.body || el === document.documentElement || S.host.contains(el)) return;
  uiiSelect(el);
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

// The same kind of message beside the pointer, where the eye already is —
// a button or the badge can sit far from the click or key press.
function uiiPointerSay(text) {
  const S = uiiState;
  const t = S.ptrToast;
  if (!t || !S.pos) return;
  t.textContent = text;
  t.classList.remove('off');
  uiiPlacePtrToast();
  clearTimeout(S.ptrTimer);
  S.ptrTimer = setTimeout(() => { if (S.ptrToast) S.ptrToast.classList.add('off'); }, 1200);
}

// Below-right of the cursor, flipped to the other side near an edge. Called
// on every pointer move while the toast shows, so it follows the cursor. The
// color picker may hold back pointer moves while open; then the toast would
// otherwise stay where the pick started (the 💧 key) instead of the click.
function uiiPlacePtrToast() {
  const S = uiiState;
  const t = S.ptrToast;
  t.style.left = S.mx + 14 + 'px';
  t.style.top = S.my + 18 + 'px';
  const r = t.getBoundingClientRect();
  if (r.right > innerWidth) t.style.left = Math.max(0, S.mx - 8 - r.width) + 'px';
  if (r.bottom > innerHeight) t.style.top = Math.max(0, S.my - 8 - r.height) + 'px';
}

// Normal view: hide every outline and band, and hand the pointer back to the
// page, so a live edit can be judged on the real screen. The panel stays open
// with its edits, so the next press returns to a pinned element, not a blank
// one. Entering it unbinds the capture listeners — that is what makes the app
// clickable again — so nothing redraws until it is left.
function uiiPeek(on) {
  const S = uiiState;
  if (!S.on) return;
  const want = on === undefined ? !S.peek : !!on;
  if (want === S.peek) return;
  S.peek = want;
  S.host.classList.toggle('peek', want);
  if (want) {
    uiiUnbindEvents();
    if (S.raf) cancelAnimationFrame(S.raf);
    clearTimeout(S.drawTimer);
    S.raf = 0;
    uiiSetHover(null);
  } else {
    uiiBindEvents();
    uiiDrawOutlines();
    // The page may have scrolled or re-rendered while the overlay was off.
    if (S.selected && S.selected.isConnected) uiiDrawSpacing(S.selected);
    uiiDrawPicks();
  }
  const P = S.panel;
  if (!P || !P.peek) return;
  P.peek.classList.toggle('on', want);
  P.peek.title = want ? 'Back to inspect (V)' : 'Normal view — hide the overlay and use the page (V)';
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
  uiiDrawSpacing(S.selected);
  uiiDrawPicks();
}

// One numbered box per Shift+click pick, in list order. Boxes are reused;
// spares hide. A picked element that left the page hides its box. Each box
// holds its own margin and padding bands (fixed, so they sit on the page, and
// hide with the box); the pinned pick leaves them off, uiiDrawSpacing has it.
function uiiDrawPicks() {
  const S = uiiState;
  if (!S.shadow) return;
  S.picks.forEach((p, i) => {
    let d = S.pickBoxes[i];
    if (!d) {
      d = document.createElement('div');
      d.className = 'pickbox';
      d.innerHTML = '<div class="sp mg"></div><div class="sp pd"></div>';
      S.shadow.appendChild(d);
      S.pickBoxes.push(d);
    }
    if (p.el === S.selected && p.bounce) { p.bounce = false; Bounce.play(d, { scale: 0.96, over: 0.03 }); }
    d.dataset.n = i + 1;
    d.style.display = p.el.isConnected ? '' : 'none';
    if (!p.el.isConnected) return;
    uiiPlace(d, p.el.getBoundingClientRect());
    const [mg, pd] = d.children;
    if (p.el === S.selected) { mg.classList.remove('on'); pd.classList.remove('on'); }
    else uiiDrawBands(mg, pd, p.el);
  });
  S.pickBoxes.slice(S.picks.length).forEach((d) => { d.style.display = 'none'; });
}

function uiiScheduleDraw() {
  const S = uiiState;
  if (S.holding) { S.drawLater = true; return; }
  if (S.raf) return;
  // A page that changes every frame (a timer, an animation) would rerun the
  // scan back to back — 45-120 ms each on 60,000 elements — and keys like Esc
  // would queue behind it. After a scan of d ms, wait 3·d before the next:
  // a small page still redraws every frame, a big one leaves 75% free.
  const go = () => {
    S.raf = requestAnimationFrame(() => {
      S.raf = 0;
      const t0 = performance.now();
      uiiDrawOutlines();
      S.drawEnd = performance.now();
      S.drawMs = S.drawEnd - t0;
    });
  };
  const wait = (S.drawEnd || 0) + 3 * (S.drawMs || 0) - performance.now();
  if (wait > 0) { S.raf = -1; S.drawTimer = setTimeout(go, wait); } else go();
}
