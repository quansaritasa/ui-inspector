/* ================= Bounce: a press that springs back =================
   Standalone click effect, no dependencies, nothing inspector-specific. Press
   a control and it dips; let go and it overshoots a little before settling —
   the feel of a key that moves. Built on the Web Animations API: the animation
   owns `transform` only while it runs and leaves no inline style behind, so it
   cannot fight the element's own CSS. Does nothing under prefers-reduced-motion
   or where there is no DOM (server-side rendering).

   Bounce.attach(root, selector, opts) -> detach()
     One delegated listener pair on root (document, an element or a shadow
     root). Every matching, enabled element dips on pointerdown and springs on
     release. A keyboard click (Enter / Space) plays the whole press at once. Release is
     heard on the window, so a re-rendered or left-behind control still springs.
     Two attaches matching one event bounce it once (the first attached wins).
     aria-disabled="true" counts as disabled. detach() ends any press in flight.
   Bounce.play(el, opts)
     One full dip-and-spring on el, for changes no pointer caused (e.g. an
     element was just selected).
   opts: scale (dip depth, .92), over (overshoot, .06), press (dip ms, 70),
     release (spring ms, 360), to (attach only: (matched) => element to animate,
     e.g. press a label, bounce the tiny checkbox inside it), eager (false: play
     dip and spring from the press at once instead of holding the dip until
     release; for controls whose click handler does heavy synchronous work, which
     would otherwise delay a spring that only starts at release).

   Use as <script src="bounce.js"> (global `Bounce`), require('./bounce'), or
   inlined by build.js (everything above the marker below). */

const Bounce = (() => {
  const DEFAULTS = { scale: 0.92, over: 0.06, press: 70, release: 360 };
  const running = new WeakMap(); // el -> drop() of the press now animating it
  const seen = new WeakSet();    // events already bounced, so two attaches never double up

  const calm = () => typeof window === 'undefined' || !Element.prototype.animate
    || !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // Dip to `scale` and hold there until up() springs back. drop() abandons the
  // press (cancels the animations and the pending spring). A newer press on the
  // same element drops the older one, so two never fight over `transform`.
  function down(el, o) {
    const prev = running.get(el);
    if (prev) prev();
    const s = o.scale, t0 = performance.now();
    const hold = el.animate([{ transform: 'scale(1)' }, { transform: `scale(${s})` }],
      { duration: o.press, easing: 'ease-out', fill: 'forwards' });
    let spring, released = false;
    const drop = () => {
      hold.cancel(); if (spring) spring.cancel();
      if (running.get(el) === drop) running.delete(el);
    };
    running.set(el, drop);
    const springAt = (delay) => el.animate([
      { transform: `scale(${s})` },
      { transform: `scale(${1 + o.over})`, offset: 0.45 },
      { transform: `scale(${1 - o.over / 3})`, offset: 0.75 },
      { transform: 'scale(1)' },
    ], { delay, duration: o.release, easing: 'ease-out', fill: 'forwards' });
    if (o.eager) {
      // Dip and the same spring, both started now, the spring delayed by the dip.
      // Created at release the spring could not start before the frame after the
      // click handler, and a handler that re-renders synchronously holds that
      // frame back: the spring then looks late. Started here it is already
      // running when the handler blocks, and it is the very curve a held press
      // gets, so the motion is no less smooth.
      spring = springAt(o.press);
      spring.onfinish = () => { hold.cancel(); spring.cancel(); if (running.get(el) === drop) running.delete(el); };
      return { up() {}, drop };
    }
    const up = () => {
      if (released) return;
      released = true;
      // A tap shorter than the dip would snap: let the dip finish, then spring.
      // The wait is the animation's own delay, not a timer: a click handler that
      // blocks the main thread right after release must not hold the spring back.
      spring = springAt(Math.max(0, o.press - (performance.now() - t0)));
      // Both fills hold scale(1) or the dip until here, so neither flashes if this runs late.
      spring.onfinish = () => { hold.cancel(); spring.cancel(); if (running.get(el) === drop) running.delete(el); };
    };
    return { up, drop };
  }

  function play(el, opts) {
    if (!el || calm()) return;
    down(el, Object.assign({}, DEFAULTS, opts)).up();
  }

  function attach(root, selector, opts) {
    const o = Object.assign({}, DEFAULTS, opts);
    const live = new Set(); // presses still held, so detach() can end them
    const hit = (e) => {
      const el = e.target.closest && e.target.closest(selector);
      return el && !el.disabled && el.getAttribute('aria-disabled') !== 'true' && root.contains(el) ? el : null;
    };
    const onDown = (e) => {
      const el = e.isPrimary && e.button === 0 && !seen.has(e) && !calm() && hit(e);
      if (!el) return;
      const t = o.to ? o.to(el) : el;
      if (!t) return;
      seen.add(e);
      const p = down(t, o);
      // Release is heard on the window, not on el: el may be re-rendered away
      // mid-press, and a pointer let go outside it must still end the press.
      const end = (ev) => { if (ev.pointerId === e.pointerId) { p.off(); p.up(); } };
      p.off = () => {
        window.removeEventListener('pointerup', end, true);
        window.removeEventListener('pointercancel', end, true);
        el.removeEventListener('pointerleave', end);
        live.delete(p);
      };
      window.addEventListener('pointerup', end, true);
      window.addEventListener('pointercancel', end, true);
      el.addEventListener('pointerleave', end);
      live.add(p);
    };
    // detail 0 = no pointer behind the click: Enter / Space on a focused control.
    // isTrusted drops a script's el.click(), which is not a press.
    const onClick = (e) => {
      const el = e.isTrusted && e.detail === 0 && !seen.has(e) && hit(e);
      const t = el && (o.to ? o.to(el) : el);
      if (t) { seen.add(e); play(t, o); }
    };
    root.addEventListener('pointerdown', onDown);
    root.addEventListener('click', onClick);
    return () => {
      root.removeEventListener('pointerdown', onDown);
      root.removeEventListener('click', onClick);
      for (const p of live) { p.off(); p.drop(); }
    };
  }

  return { attach, play };
})();

/* ---- standalone export: build.js drops everything from here down ---- */
if (typeof module !== 'undefined' && module.exports) module.exports = Bounce;
else if (typeof window !== 'undefined') window.Bounce = Bounce;
