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
  if (!(prop in e.from)) e.from[prop] = getComputedStyle(el).getPropertyValue(prop).trim();
  e.props[prop] = value;
  el.style.setProperty(prop, value);
  if (uiiState.similar) e.rule[prop] = uiiRuleApply(el, prop, value);
  if (uiiState.panel) {
    uiiState.panel.reset.hidden = false;
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
  if (!on && S.drawLater) { S.drawLater = false; uiiScheduleDraw(); }
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
function uiiResetEdits(el) {
  const e = uiiEditsFor(el, false);
  if (!e && !uiiVarEdits.size) return;
  uiiVarReset();
  if (e) {
    for (const k of e.kids || []) uiiResetOne(k);
    uiiResetOne(el);
  }
  uiiSyncRules();
  uiiSelect(el);
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
  if (prop === 'background-color') return info.bg.hex;
  if (prop === 'color') return el === info.el ? info.color.hex : uiiToHex(getComputedStyle(el).color);
  // One picker sets all four sides; it shows the top one.
  if (prop === 'border-color') return uiiToHex(getComputedStyle(el).borderTopColor);
  if (prop === 'border') return info.border === 'none' ? 'none' : info.border;
  const fx = uiiFormula(el, prop);
  if (fx) return uiiVarCalc(fx.name, fx.k);
  return uiiAuthored(el, prop) || getComputedStyle(el).getPropertyValue(prop).trim();
}

// Refill the Changes box from the pinned element's edits.
function uiiRefreshChanges() {
  const P = uiiState.panel;
  if (P && P.changes && uiiState.info) P.changes.value = uiiFormatChanges();
}
