/* ================= overlay: padding and margin =================
   The panel lists the numbers, but reading a layout means seeing where the
   space actually sits. The pinned element gets DevTools' two bands — green
   padding inside the border box, orange margin outside it — plus one chip
   carrying the numbers, because a 1px band is visible and still unreadable.
   Pinned and picked only: on hover the bands would chase the pointer. The
   chip goes on the pinned element alone; every other pick gets bare bands. */

const UII_SIDES = ['top', 'right', 'bottom', 'left'];

// [t, r, b, l] of a box property, in px.
function uiiBoxSides(cs, prop) {
  return UII_SIDES.map((s) => parseFloat(cs.getPropertyValue(prop + '-' + s + (prop === 'border' ? '-width' : ''))) || 0);
}

// CSS shorthand collapse: [8,8,8,8] -> "8", [4,8,4,8] -> "4 8".
function uiiShortSides(a) {
  const [t, r, b, l] = a.map((v) => Math.round(v * 10) / 10);
  if (t === r && r === b && b === l) return String(t);
  if (t === b && r === l) return t + ' ' + r;
  return [t, r, b, l].join(' ');
}

// Place a band: `out` is the outer rect, `w` the four band widths. The band
// is drawn as a border, so the hole in the middle is the inner box.
function uiiBand(box, out, w) {
  uiiPlace(box, out);
  box.style.borderWidth = w.map((v) => Math.max(0, v) + 'px').join(' ');
  box.classList.add('on');
}

// Margin band into mg, padding band into pd, for el; returns what the chip needs.
function uiiDrawBands(mg, pd, el) {
  const cs = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  const m = uiiBoxSides(cs, 'margin');
  const p = uiiBoxSides(cs, 'padding');
  const bw = uiiBoxSides(cs, 'border');
  // A negative margin pulls the element over its neighbour; the band cannot
  // be drawn inside-out, so only the chip reports it.
  uiiBand(mg, { left: r.left - Math.max(0, m[3]), top: r.top - Math.max(0, m[0]),
    width: r.width + Math.max(0, m[1]) + Math.max(0, m[3]), height: r.height + Math.max(0, m[0]) + Math.max(0, m[2]) }, m);
  uiiBand(pd, { left: r.left + bw[3], top: r.top + bw[0],
    width: r.width - bw[1] - bw[3], height: r.height - bw[0] - bw[2] }, p);
  return { r, m, p };
}

function uiiDrawSpacing(el) {
  const S = uiiState;
  if (!S.mgBox) return;
  if (!el || !el.isConnected) {
    for (const b of [S.mgBox, S.pdBox, S.spv]) b.classList.remove('on');
    return;
  }
  const { r, m, p } = uiiDrawBands(S.mgBox, S.pdBox, el);
  S.spv.title = 'padding · margin, in px';
  S.spv.innerHTML = 'padding <b></b> · margin <i></i>';
  S.spv.querySelector('b').textContent = uiiShortSides(p);
  S.spv.querySelector('i').textContent = uiiShortSides(m);
  // Under the margin box, or over it when the element sits at the bottom.
  const below = r.bottom + Math.max(0, m[2]) + 2;
  S.spv.style.left = Math.max(4, Math.min(r.left, window.innerWidth - 240)) + 'px';
  S.spv.style.top = (below + 20 < window.innerHeight ? below : Math.max(4, r.top - Math.max(0, m[0]) - 20)) + 'px';
  S.spv.classList.add('on');
}
