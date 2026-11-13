/* ================= live editing: number fields =================
   A number box with a unit dropdown, ▲▼ steppers (hold to repeat), arrow
   keys, and a label that scrubs when dragged; Shift = ×10 on all of them.
   The unit shown is the one the stylesheet wrote (1.125em) when it is a
   plain value; switching unit converts, so nothing jumps on screen. */

// Units offered per property; anything not listed gets UII_UNITS_BOX.
const UII_UNITS = {
  'font-size': ['px', 'em', 'rem', '%'],
  'line-height': ['', 'px', 'em'],
  'letter-spacing': ['px', 'em'],
};
const UII_UNITS_BOX = ['px', 'em', 'rem'];

// "16px" -> {n: 16, unit: 'px'}; "normal" / "1px solid red" -> null.
function uiiParseNum(v) {
  const m = /^(-?\d*\.?\d+)([a-z%]*)$/i.exec(String(v).trim());
  return m ? { n: parseFloat(m[1]), unit: m[2] } : null;
}

// The current computed value of `prop` on `el`, written in `unit`.
// em is relative to the parent's font for font-size, the element's own
// font otherwise; '' is a unitless line-height.
function uiiConvertUnit(el, prop, unit) {
  const own = parseFloat(getComputedStyle(el).fontSize);
  let px = parseFloat(getComputedStyle(el).getPropertyValue(prop));
  if (isNaN(px)) px = prop === 'line-height' ? own * 1.2 : 0; // 'normal'
  const parent = el.parentElement ? parseFloat(getComputedStyle(el.parentElement).fontSize) : own;
  const font = prop === 'font-size' ? parent : own;
  const root = parseFloat(getComputedStyle(document.documentElement).fontSize);
  const ref = { px: 1, em: font, rem: root, '%': font / 100, '': own }[unit] || 1;
  return Math.round((px / ref) * 1000) / 1000 + unit;
}

// The unit dropdown: a variable factor first ("× --x"), then `units`.
function uiiUnitSelect(units, fx) {
  const sel = uiiEl('select', 'u');
  if (fx) {
    sel.appendChild(new Option('× ' + fx.name, 'var'));
    sel.title = 'Factor of ' + fx.name + ' (' + fx.varPx + 'px here)';
  }
  for (const u of units) sel.appendChild(new Option(u || '×', u));
  return sel;
}

// write / nudge / cur for a number field, wired to its box. c: {info, props,
// opt, fx, target, conv, box, unit, show, pxNote}; pxNote is read at call
// time, as the field sets it once its label exists.
function uiiNumWriter(c) {
  const { info, props, opt, fx, conv, box, unit } = c;
  const write = (raw) => {
    const t = String(raw).trim();
    // A bare number takes the selected unit; anything else ("auto", "1.5em",
    // "normal") is passed through as typed.
    const bare = /^-?\d*\.?\d+$/.test(t);
    const v = bare && unit() === 'var' ? uiiVarCalc(fx.name, parseFloat(t)) : bare ? t + unit() : t;
    for (const p of props) (opt.own ? uiiSetOwn(info.el, p, v) : uiiSet(info, p, v));
    c.show(v);
    if (c.others) c.others();
    if (opt.onSet) opt.onSet(v);
    c.pxNote();
  };
  const step = () => opt.step || (unit() === 'var' ? 0.01 : unit() === 'px' || unit() === '%' ? 1 : 0.1);
  // Number now; for "normal" / "auto" / Mixed the computed value in the shown unit.
  const cur = () => {
    const n = parseFloat(box.value);
    return isNaN(n) ? parseFloat(conv(unit())) : n;
  };
  // Sizes, padding and radius below 0 are invalid CSS — the text would vanish.
  const min = /^(margin|letter-spacing)/.test(props[0]) ? -Infinity : 0;
  const nudge = (start, steps) => {
    if (!isNaN(start)) write(String(Math.max(min, Math.round((start + steps * step()) * 1000) / 1000)));
  };
  box.addEventListener('change', () => write(box.value));
  uiiEnterKeeps(box);
  box.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      nudge(cur(), (e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? 10 : 1));
    }
  });
  return { write, nudge, cur };
}

// opt: {units: [...] | null (no unit), step, onSet(v)}
function uiiNumField(info, label, props, opt) {
  props = [].concat(props);
  opt = opt || {};
  const units = 'units' in opt ? opt.units : (UII_UNITS[props[0]] || UII_UNITS_BOX);
  const target = opt.own ? info.el : uiiTargetEl(info, props[0]);
  const val = (p) => uiiEditValue(info, p, opt.own);
  const wrap = uiiEl('span', 'nf');
  const box = uiiEl('input');
  box.spellcheck = false;
  wrap.appendChild(box);
  // calc(var(--x) * k) in the stylesheet: the box edits k, unit "× --x".
  const fx = units ? uiiFormula(target, props[0]) : null;
  const sel = units ? wrap.appendChild(uiiUnitSelect(units, fx)) : null;
  const unit = () => (sel ? sel.value : '');
  const show = (v) => {
    box.placeholder = '';
    const f = fx && uiiParseVarFactor(v);
    if (f) { box.value = String(f.k); sel.value = 'var'; return; }
    const p = uiiParseNum(v);
    box.value = p ? String(p.n) : v;
    if (!sel || !p) return;
    if (![...sel.options].some((o) => o.value === p.unit)) sel.appendChild(new Option(p.unit, p.unit));
    sel.value = p.unit;
  };
  show(val(props[0]));
  // A ↕ / ↔ pair whose sides differ shows no number: either one would lie.
  // The first write sets both sides; show() clears the placeholder.
  if (new Set(props.map(val)).size > 1) { box.value = ''; box.placeholder = 'Mixed'; }
  // em and % are read off the element the edit lands on, which is not always
  // the one the field shows (see uiiWriteEl). Asked at conversion time: the
  // answer costs a rule probe, and only switching a unit needs it.
  const conv = (u) => uiiConvertUnit(opt.own ? info.el : uiiWriteEl(info, props[0]), props[0], u);
  const c = { info, props, opt, fx, target, conv, box, unit, show };
  uiiNumSync(c, val);
  const { write, nudge, cur } = uiiNumWriter(c);
  if (sel) sel.addEventListener('change', () => write(sel.value === 'var'
    ? uiiVarCalc(fx.name, parseFloat(getComputedStyle(target).getPropertyValue(props[0])) / fx.varPx)
    : conv(sel.value)));
  wrap.appendChild(uiiStepper((d) => nudge(cur(), d)));
  if (opt.compact) return uiiNumCompact(wrap, c);
  const fld = uiiFld(label, wrap, props, target);
  // A factor, em or % says nothing about the size on screen: "Size (13.2px)".
  c.pxNote = () => {
    const px = parseFloat(getComputedStyle(target).getPropertyValue(props[0]));
    fld.lab.textContent = label + ((c.anc || (unit() && unit() !== 'px')) && !isNaN(px) ? ' (' + uiiRound3(px) + 'px)' : '');
  };
  c.pxNote();
  uiiScrub(fld.lab, cur, nudge);
  fld.set = show;
  if (sel) uiiAncestorLine(fld, c);
  return fld;
}

// An inherited text size: the ancestor whose rule sizes it by a variable factor
// gets its own line under the field, editable. The box above stays what this
// element draws (px, em…, written on the element itself); a factor typed here
// lands on the ancestor; the box keeps its value and the title shows the px. Anything that is not a variable
// factor is refused, since a px value could not go back into the css.
function uiiAncestorLine(fld, c) {
  const { info, props, opt } = c, prop = props[0];
  const ow = c.fx || opt.own ? null : uiiVarOwner(c.target, prop);
  if (!ow) return;
  const fx = uiiFormula(ow, prop), d = uiiRuleDecl(ow, prop);
  if (!fx || !d) return;
  const now = () => { const e = uiiEditsFor(ow, false); return e && prop in e.props ? e.props[prop] : uiiVarCalc(fx.name, fx.k); };
  const line = uiiEl('div', 'fml');
  const inp = uiiEl('input', 'fmi');
  inp.spellcheck = false;
  inp.title = 'Inherited from ' + d.file + ' ' + d.selector + ': an edit changes that rule for everything under it';
  inp.value = now();
  line.append('↑ ' + prop + ': ', inp);
  fld.f.appendChild(line);
  c.anc = true; // the title always spells out the px on screen
  c.pxNote();
  inp.addEventListener('change', () => {
    const v = inp.value.trim();
    if (!uiiParseVarFactor(v)) { inp.value = now(); return; }
    uiiSetOwn(ow, prop, v);
    c.pxNote(); // the box keeps what it says; only the title follows the screen
  });
  uiiEnterKeeps(inp);
}

// ▲▼ pair: click steps once, holding repeats after 400ms.
function uiiStepper(bump) {
  const st = uiiEl('span', 'st');
  for (const [d, ch] of [[1, '▲'], [-1, '▼']]) {
    const b = uiiEl('button', '', ch);
    b.type = 'button';
    b.tabIndex = -1;
    b.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return; // a right-click opens no menu here, and must not step
      e.preventDefault();
      const k = d * (e.shiftKey ? 10 : 1);
      uiiHold(true);
      bump(k);
      let timer = setTimeout(function rep() { bump(k); timer = setTimeout(rep, 60); }, 400);
      // blur too: a mouseup outside the window (alt-tab) never arrives.
      const stop = () => {
        clearTimeout(timer); uiiHold(false);
        window.removeEventListener('mouseup', stop, true);
        window.removeEventListener('blur', stop);
      };
      window.addEventListener('mouseup', stop, true);
      window.addEventListener('blur', stop);
    });
    st.appendChild(b);
  }
  return st;
}

// Drag a label left/right to change the number: one step per 2px, applied at
// most once a frame. Capture listeners on window, like the header drag.
function uiiScrub(handle, read, apply) {
  handle.classList.add('scrub');
  handle.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    const sx = e.clientX, start = read();
    let want = 0, done = 0, raf = 0;
    const flush = () => { raf = 0; if (want !== done) { done = want; apply(start, want); } };
    const move = (m) => {
      want = Math.round((m.clientX - sx) / 2) * (m.shiftKey ? 10 : 1);
      if (!raf) raf = requestAnimationFrame(flush);
    };
    const up = () => {
      window.removeEventListener('mousemove', move, true);
      window.removeEventListener('mouseup', up, true);
      window.removeEventListener('blur', up);
      if (raf) cancelAnimationFrame(raf);
      flush();
      uiiHold(false);
    };
    uiiHold(true);
    window.addEventListener('mousemove', move, true);
    window.addEventListener('mouseup', up, true);
    window.addEventListener('blur', up); // a mouseup outside the window never arrives
    e.preventDefault();
  });
}
