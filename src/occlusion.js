/* ================= occlusion: is a fixed layer painting over it? =================
   A control behind a popup is in the viewport, visible, and not ignored, yet
   the user cannot see it. No selector list can say "behind whatever is on top
   right now", so the renderer is asked — but once per scan, not once per
   element: a hit test costs ~0.13 ms on a large page, and 450 of them made
   every draw 8x slower. Instead a 5x5 grid of probes finds the fixed layers
   on screen (a popup's backdrop and panel), and geometry decides the rest.
   Small covers the probes miss — a toast, a tooltip — are not detected. The
   inspector's own host is never a layer: its panel already paints above the
   outline layer, so treating it as cover would only make outlines flicker. */

// Outermost position:fixed ancestor-or-self, or null for normal flow. Shared
// ancestors are styled once per scan, and nothing inside a fixed root is read.
function uiiFixedRoot(el, memo) {
  const path = [];
  let n = el;
  while (n && !memo.has(n)) { path.push(n); n = n.parentElement; }
  let root = n ? memo.get(n) : null;
  for (let i = path.length - 1; i >= 0; i--) {
    if (!root && getComputedStyle(path[i]).position === 'fixed') root = path[i];
    memo.set(path[i], root);
  }
  return root;
}

// Builds the per-scan test. An element is covered when its on-screen part
// lies wholly inside a probed layer's rect, it is neither inside that layer
// nor around it, and it is not part of another fixed layer that owns its own
// centre pixel — the rule that keeps a popup panel which is a sibling of its
// backdrop, not a child.
function uiiOcclusion() {
  const vw = window.innerWidth, vh = window.innerHeight;
  const memo = new Map(), layers = new Map(), onTop = new Map();
  for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) {
    const hit = document.elementFromPoint((i + 0.5) * vw / 5, (j + 0.5) * vh / 5);
    if (!hit || hit === uiiState.host) continue;
    const L = uiiFixedRoot(hit, memo);
    if (L && !layers.has(L)) layers.set(L, L.getBoundingClientRect());
  }
  if (!layers.size) return () => false;
  const above = (R) => {
    if (!onTop.has(R)) {
      const r = R.getBoundingClientRect();
      const x = Math.min(Math.max(r.left + r.width / 2, 0), vw - 1);
      const y = Math.min(Math.max(r.top + r.height / 2, 0), vh - 1);
      const hit = document.elementFromPoint(x, y);
      onTop.set(R, !!hit && (hit === R || R.contains(hit)));
    }
    return onTop.get(R);
  };
  return (el, r) => {
    // Only the on-screen part counts: a row running off the bottom is still
    // wholly under a full-screen backdrop.
    const left = Math.max(r.left, 0), top = Math.max(r.top, 0);
    const right = Math.min(r.right, vw), bottom = Math.min(r.bottom, vh);
    for (const [L, lr] of layers) {
      if (L.contains(el) || el.contains(L)) continue;
      if (left < lr.left || top < lr.top || right > lr.right || bottom > lr.bottom) continue;
      const own = uiiFixedRoot(el, memo);
      if (own && above(own)) continue;
      return true;
    }
    return false;
  };
}
