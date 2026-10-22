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
  if (!UII_TEXT_PROPS.includes(prop)) { uiiApplyEdit(info.el, prop, value); return; }
  const els = uiiTextEls(info);
  const main = els[0];
  const base = uiiOrig(main, prop);
  const host = uiiEditsFor(info.el, true);
  if (!host.kids) host.kids = new Set();
  // Text properties inherit: a child with no rule of its own gets the value
  // from the pinned element, so only children that set it themselves need
  // their own edit (and their own line in the log). A relative font-size
  // (0.9em, 90%) already follows its parent — scaling it too would double up.
  const own = (t) => t === info.el || (uiiRuleDecl(t, prop)
    && !(prop === 'font-size' && /(^|[^r])em\b|%/.test(uiiRuleDecl(t, prop).value)));
  const first = own(main) ? main : info.el;
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

// What the last rule setting `prop` wrote, when it is a plain number
// (1.125em, 12px, 1.4) that really is what the element shows; '' for calc(),
// var(), or a rule a more specific one overrides (sheet order is not the
// cascade, so the value is checked against computed).
function uiiAuthored(el, prop) {
  const rules = uiiRulesOf(el);
  for (let i = rules.length - 1; i >= 0; i--) {
    const v = rules[i].style && uiiDeclValue(rules[i].style, prop);
    if (!v) continue;
    const p = uiiParseNum(v);
    if (!p || !/^(px|em|rem|%|)$/.test(p.unit)) return '';
    return Math.abs(parseFloat(uiiConvertUnit(el, prop, p.unit)) - p.n) < 0.01 ? v : '';
  }
  return '';
}
