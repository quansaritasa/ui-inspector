/* ================= click bounce: a press that springs back =================
   Standalone effect, no inspector state in it. Press a control and it dips,
   let go and it overshoots a little before settling — the feel of a key that
   moves. Built on the Web Animations API: the animation owns `transform` only
   while it runs and leaves no inline style behind, so it cannot fight the
   element's own CSS. Honors prefers-reduced-motion by doing nothing.

   uiiBounceAttach(root, selector, opts) — one delegated listener set on root;
     every matching, enabled element dips on pointerdown and springs on release.
     A keyboard click (Enter / Space) plays the whole press at once.
   uiiBounce(el, opts) — one full dip-and-spring on el, for state changes that
     no pointer caused (e.g. an element was just selected).
   opts: scale (dip depth, .92), over (overshoot, .06), press (dip ms, 70),
     release (spring ms, 360). */

const UII_BOUNCE = { scale: 0.92, over: 0.06, press: 70, release: 360 };

function uiiBounceCalm() {
  return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) || !Element.prototype.animate;
}

// Dip to `s` and hold there until the returned function springs back.
function uiiBounceDown(el, o) {
  const s = o.scale, t0 = performance.now();
  const hold = el.animate([{ transform: 'scale(1)' }, { transform: `scale(${s})` }],
    { duration: o.press, easing: 'ease-out', fill: 'forwards' });
  return () => {
    // A tap shorter than the dip would snap: let the dip finish, then spring.
    const wait = Math.max(0, o.press - (performance.now() - t0));
    setTimeout(() => {
      el.animate([
        { transform: `scale(${s})` },
        { transform: `scale(${1 + o.over})`, offset: 0.45 },
        { transform: `scale(${1 - o.over / 3})`, offset: 0.75 },
        { transform: 'scale(1)' },
      ], { duration: o.release, easing: 'ease-out' });
      hold.cancel(); // the spring is newer, so it already wins; this drops the held dip
    }, wait);
  };
}

function uiiBounce(el, opts) {
  if (!el || uiiBounceCalm()) return;
  uiiBounceDown(el, Object.assign({}, UII_BOUNCE, opts))();
}

function uiiBounceAttach(root, selector, opts) {
  const o = Object.assign({}, UII_BOUNCE, opts);
  const hit = (e) => {
    const el = e.target.closest && e.target.closest(selector);
    return el && !el.disabled && root.contains(el) ? el : null;
  };
  root.addEventListener('pointerdown', (e) => {
    const el = e.isPrimary && e.button === 0 && !uiiBounceCalm() && hit(e);
    if (!el) return;
    const up = uiiBounceDown(el, o);
    const done = () => {
      for (const n of ['pointerup', 'pointercancel', 'pointerleave']) el.removeEventListener(n, done);
      up();
    };
    for (const n of ['pointerup', 'pointercancel', 'pointerleave']) el.addEventListener(n, done);
  });
  // detail 0 = no pointer behind the click: Enter / Space on a focused control.
  root.addEventListener('click', (e) => {
    const el = e.detail === 0 && hit(e);
    if (el) uiiBounce(el, o);
  });
}
