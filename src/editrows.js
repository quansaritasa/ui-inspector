/* ================= live editing: state =================
   Each field writes straight to the pinned element's inline style, so a tweak
   shows on screen at once. Edits are remembered per element: the original
   style attribute (for Reset), the value typed, and the computed value before
   the first edit (for the "from → to" change log an AI can act on). */

function uiiEditsFor(el, create) {
  const S = uiiState;
  if (!S.edits) S.edits = new Map();
  let e = S.edits.get(el);
  if (!e && create) {
    e = { orig: el.getAttribute('style'), props: {}, from: {}, rule: {} };
    S.edits.set(el, e);
  }
  return e || null;
}

function uiiApplyEdit(el, prop, value) {
  const e = uiiEditsFor(el, true);
  uiiUndoAdd({ k: 'prop', el, prop, had: prop in e.props, to: e.props[prop],
    inline: el.style.getPropertyValue(prop), pri: el.style.getPropertyPriority(prop) });
  if (!(prop in e.from)) e.from[prop] = getComputedStyle(el).getPropertyValue(prop).trim();
  e.props[prop] = value;
  el.style.setProperty(prop, value);
  if (uiiState.similar) {
    // While a value is held or dragged the rule waits for the release:
    // rewriting it restyles the whole page (~100 ms a step on 60,000
    // elements), and the inline edit already shows on the pinned element.
    const S = uiiState;
    if (!S.holding) e.rule[prop] = uiiRuleApply(el, prop, value);
    else {
      if (!S.ruleLater) S.ruleLater = new Map();
      S.ruleLater.set(el, (S.ruleLater.get(el) || new Set()).add(prop));
    }
  }
  if (uiiState.panel) {
    uiiState.panel.reset.disabled = false;
    // Building the log matches CSS rules; once a drag settles is enough.
    clearTimeout(uiiState.chgTimer);
    uiiState.chgTimer = setTimeout(uiiRefreshChanges, 150);
  }
  uiiScheduleDraw();
}

// While a value is dragged or held, outline redraws wait (each re-measures
// every control on the page) and run once when it ends.
function uiiHold(on) {
  const S = uiiState;
  S.holding = on;
  if (on) uiiUndoBegin(); else uiiUndoEnd();
  // The rules uiiApplyEdit held back, each written once with its last value.
  if (!on && S.ruleLater) {
    for (const [el, props] of S.ruleLater) {
      const e = uiiEditsFor(el, false);
      if (!e || !S.similar) continue; // reset, or the box unticked, meanwhile
      for (const p of props) if (p in e.props) e.rule[p] = uiiRuleApply(el, p, e.props[p]);
    }
    S.ruleLater = null;
  }
  if (!on && S.drawLater) { S.drawLater = false; uiiScheduleDraw(); }
}

// A colour picker fires `input` on every move of its thumb: hold for the
// whole pick, so it is one undo step and one rule rewrite, like a drag.
function uiiPickHold(pick) {
  const end = () => { if (pick.uiiHeld) { pick.uiiHeld = false; uiiHold(false); } };
  pick.addEventListener('input', () => { if (!pick.uiiHeld) { pick.uiiHeld = true; uiiHold(true); } });
  pick.addEventListener('change', end);
  pick.addEventListener('blur', end); // a cancelled picker may never fire change
}

function uiiResetOne(el) {
  const e = uiiEditsFor(el, false);
  if (!e) return;
  if (e.orig === null) el.removeAttribute('style'); else el.setAttribute('style', e.orig);
  uiiRestoreText(e);
  uiiState.edits.delete(el);
}

// The pinned element plus every text child an edit reached (see uiiSet), and
// every variable edited from the colour fields. A var edit belongs to no
// element, so this button is the only place that can take it back.
// `el` is null in the palette, which has no element: the variables are then
// all there is to put back.
function uiiResetEdits(el) {
  const e = el && uiiEditsFor(el, false);
  if (!e && !uiiVarEdits.size) return;
  uiiVarReset();
  if (e) {
    for (const k of e.kids || []) uiiResetOne(k);
    uiiResetOne(el);
  }
  uiiUndoClear();
  uiiSyncRules();
  if (el) uiiSelect(el); else uiiVarsPanel();
}

// "font-size: 14px; color: #fff" or '' when the element is untouched.
function uiiEditsText(el) {
  const e = uiiEditsFor(el, false);
  if (!e) return '';
  return Object.entries(e.props).map(([k, v]) => k + ': ' + v).join('; ');
}

// [{prop, from, to}] for every edited property whose computed value really
// moved — typing a value back to where it started drops it from the log.
function uiiEditChanges(el) {
  const e = uiiEditsFor(el, false);
  if (!e) return [];
  const cs = getComputedStyle(el);
  const out = [];
  for (const [prop, to] of Object.entries(e.props)) {
    if (cs.getPropertyValue(prop).trim() === e.from[prop]) continue;
    out.push({ prop, from: uiiToHex(e.from[prop]), to });
  }
  return out;
}

// Current value shown in a field: the edit if there is one, else computed.
// Text properties read the main text, which is what the edit changes;
// a variable factor (calc(var(--x) * k)) or a plain authored value (1.125em)
// wins over the computed px.
function uiiEditValue(info, prop) {
  const el = uiiTargetEl(info, prop);
  const e = uiiEditsFor(el, false);
  if (e && prop in e.props) return e.props[prop];
  // A text edit on a child with no rule of its own lands on the pinned
  // element and reaches the text by inheritance (uiiWriteEl): the field shows
  // the value that was written, not the px it computes to.
  const h = el !== info.el && uiiEditsFor(info.el, false);
  if (h && prop in h.props) return h.props[prop];
  if (prop === 'background-color') return info.bg.hex;
  if (prop === 'color') return el === info.el ? info.color.hex : uiiToHex(getComputedStyle(el).color);
  // One picker sets all four sides; it shows the top one.
  if (prop === 'border-color') return uiiToHex(getComputedStyle(el).borderTopColor);
  if (prop === 'border') return info.border === 'none' ? 'none' : info.border;
  const fx = uiiFormula(el, prop);
  if (fx) return uiiVarCalc(fx.name, fx.k);
  return uiiAuthored(el, prop) || getComputedStyle(el).getPropertyValue(prop).trim();
}

// Refill the Changes box from the pinned element's edits, and from the
// variable edits, which belong to no element: the palette has a box of its
// own and nothing need be pinned to fill it.
function uiiRefreshChanges() {
  const P = uiiState.panel;
  if (P && P.changes && (uiiState.info || uiiState.varsMode)) P.changes.value = uiiFormatChanges();
}
