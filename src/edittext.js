/* ================= live editing: text follows the edit =================
   Pinning a <td> and changing its font size does nothing when the text sits
   in a <span> with its own rule. The point is the result on screen, not the
   right element: text properties go to every element that draws text inside
   the pinned one, and the change log names the rule to edit for each. */

const UII_TEXT_PROPS = ['color', 'font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing'];

// Elements inside the pinned one (itself included) holding visible text
// directly, most text first — [0] is the main text, the one fields show.
// Cached per selection: a drag asks for it on every step.
function uiiTextEls(info) {
  if (!info.textEls) info.textEls = uiiFindTextEls(info.el);
  return info.textEls;
}

function uiiTargetEl(info, prop) {
  return UII_TEXT_PROPS.includes(prop) ? uiiTextEls(info)[0] : info.el;
}

// Does `t` set `prop` in a rule of its own? Text properties inherit: a child
// with no rule of its own gets the value from the pinned element, so only
// children that set it themselves need their own edit (and their own line in
// the log). A relative font-size (0.9em, 90%) already follows its parent —
// scaling it too would double up.
function uiiOwnsProp(info, t, prop) {
  if (t === info.el) return true;
  const d = uiiRuleDecl(t, prop);
  return !!d && !(prop === 'font-size' && /(^|[^r])em\b|%/.test(d.value));
}

// The element an edit to `prop` really lands on. Not always the one the field
// reads (uiiTargetEl): the main text is the one that shows the value, but with
// no rule of its own it is the pinned element that gets the declaration. A
// relative unit is measured against that element's parent, so a conversion
// asks here, not there — otherwise 20px on a <div> whose text sits in a plain
// <span> converts to 1em against the span's parent (the div itself) and the
// text jumps the moment the unit changes.
function uiiWriteEl(info, prop) {
  if (!UII_TEXT_PROPS.includes(prop)) return info.el;
  const main = uiiTextEls(info)[0];
  return uiiOwnsProp(info, main, prop) ? main : info.el;
}

// The ancestor whose rule sizes `el` by a variable factor, for a text property
// `el` only inherits: `.cm-label` has no font-size rule, `.context-menu` says
// calc(var(--g) * 1.05). That rule is what an AI should edit, so the field
// shows its factor and an edit lands on that element. Null when `el` has a rule
// of its own, or the nearest ancestor that sets it does so as a plain value
// (nothing to factor). Cached per selection; costs one rule match per ancestor
// climbed, so it only runs for a text property with no rule of its own.
function uiiVarOwner(el, prop) {
  if (!UII_TEXT_PROPS.includes(prop) || uiiAnyDecl(el, prop, Boolean)) return null;
  const I = uiiState.info;
  if (!I.ownerCache) I.ownerCache = new Map();
  let m = I.ownerCache.get(el);
  if (!m) I.ownerCache.set(el, (m = new Map()));
  if (!m.has(prop)) {
    let found = null;
    for (let p = el.parentElement, i = 0; p && p !== document.documentElement && i < 12; p = p.parentElement, i++) {
      if (!uiiAnyDecl(p, prop, Boolean)) continue;
      // Edited already: the screen no longer matches the rule, the edit is the formula.
      const pe = uiiEditsFor(p, false);
      if (pe && prop in pe.props && uiiParseVarFactor(pe.props[prop])) { found = p; break; }
      const d = uiiRuleDecl(p, prop);
      if (d && uiiVarFactor(p, d.value, parseFloat(getComputedStyle(p).getPropertyValue(prop)))) found = p;
      break;
    }
    m.set(prop, found);
  }
  return m.get(prop);
}

function uiiFindTextEls(el) {
  const len = new Map();
  const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let t;
  for (let i = 0; (t = walk.nextNode()) && i < 200; i++) {
    const n = t.data.trim().length;
    if (n && t.parentElement) len.set(t.parentElement, (len.get(t.parentElement) || 0) + n);
  }
  const out = [...len.keys()].sort((a, b) => len.get(b) - len.get(a));
  return out.length ? out : [el];
}

// Value before the first edit: the recorded one, else computed now.
function uiiOrig(el, prop) {
  const e = uiiEditsFor(el, false);
  return e && prop in e.from ? e.from[prop] : getComputedStyle(el).getPropertyValue(prop).trim();
}

// Every field writes through here. A text property lands on the main text
// exactly as typed; font-size scales the other text by the same ratio (an
// icon beside a title stays in proportion), any other text property goes to
// the text that shared the main text's value.
function uiiSet(info, prop, value) {
  uiiUndoBegin();
  try { uiiSetInner(info, prop, value); } finally { uiiUndoEnd(); }
}

// Only the pinned element, however its text is split: the field of what this
// element sets, beside the one for what its text shows (uiiNumSlot).
function uiiSetOwn(el, prop, value) {
  uiiUndoBegin();
  try { uiiApplyEdit(el, prop, value); } finally { uiiUndoEnd(); }
}

function uiiSetInner(info, prop, value) {
  if (!UII_TEXT_PROPS.includes(prop)) { uiiApplyEdit(info.el, prop, value); return; }
  const els = uiiTextEls(info);
  const main = els[0];
  const base = uiiOrig(main, prop);
  const host = uiiEditsFor(info.el, true);
  if (!host.kids) host.kids = new Set();
  const own = (t) => uiiOwnsProp(info, t, prop);
  const first = uiiWriteEl(info, prop);
  uiiApplyEdit(first, prop, value);
  if (first !== info.el) host.kids.add(first);
  // Ratio from computed px, so a value typed in em or rem scales too.
  const ratio = prop === 'font-size' ? parseFloat(getComputedStyle(main).fontSize) / parseFloat(base) : NaN;
  for (const t of els) {
    if (t === main || t === first || !own(t)) continue;
    const o = uiiOrig(t, prop);
    let v = value;
    if (isFinite(ratio)) {
      if (isNaN(parseFloat(o))) continue;
      v = Math.round(parseFloat(o) * ratio * 100) / 100 + 'px';
    }
    else if (o !== base) continue;
    uiiApplyEdit(t, prop, v);
    if (t !== info.el) host.kids.add(t);
  }
}

// Matched rules of `el`, cached per selection.
function uiiRulesOf(el) {
  const I = uiiState.info;
  if (!I.ruleCache) I.ruleCache = new Map();
  if (!I.ruleCache.has(el)) I.ruleCache.set(el, el === I.el ? I.rules : uiiMatchedRules(el, I.all));
  return I.ruleCache.get(el);
}

// What the winning declaration (uiiDeclared) wrote, when it is a plain number
// (1.125em, 12px, 1.4) that really is what the element shows; '' for calc(),
// var(), or when the cascade could not be settled (checked against computed).
function uiiAuthored(el, prop) {
  const d = uiiDeclared(el, prop);
  const p = d && uiiParseNum(d.code.slice(d.code.indexOf(': ') + 2));
  if (!p || !/^(px|em|rem|%|)$/.test(p.unit)) return '';
  return Math.abs(parseFloat(uiiConvertUnit(el, prop, p.unit)) - p.n) < 0.01 ? d.code.slice(d.code.indexOf(': ') + 2) : '';
}
