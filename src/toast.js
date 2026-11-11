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
