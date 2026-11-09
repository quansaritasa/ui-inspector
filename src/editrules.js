/* ================= live editing: apply to similar =================
   With "Apply to similar" on, an edit also rewrites the CSS rule that sets
   the property (the one the Changes box names), in memory only, so every
   element that rule styles changes with the pinned one. Originals are kept
   per rule so Reset, the checkbox, or a reload puts the sheet back. */

// CSSStyleDeclaration -> Map(prop -> {v, p}): the rule's text before any edit.
const uiiRuleOrig = new Map();

// CSSStyleDeclaration -> cssText before any edit. Restoring the block as a
// whole, not property by property: a rule whose color comes from a shorthand
// ("background: color-mix(…)") has an empty background-color longhand, and
// putting that emptiness back would strip the color out of the shorthand and
// leave the element painted by some weaker rule.
const uiiRuleText = new Map();

// What the stylesheet said before the inspector touched it.
function uiiDeclValue(style, prop) {
  const m = uiiRuleOrig.get(style);
  const o = m && m.get(prop);
  return (o ? o.v : style.getPropertyValue(prop)).trim();
}

// Returns the rule it rewrote, so a caller can replay it once the element is
// gone (a detached element has no computed style to find the rule by).
function uiiRuleApply(el, prop, value, d = uiiEditRule(el, prop)) {
  if (!d) return null; // no rule to share (inherited, or only `*`): the inline edit is it
  if (!uiiRuleText.has(d.style)) uiiRuleText.set(d.style, d.style.cssText);
  if (!uiiRuleOrig.has(d.style)) uiiRuleOrig.set(d.style, new Map());
  const m = uiiRuleOrig.get(d.style);
  if (!m.has(prop)) m.set(prop, { v: d.style.getPropertyValue(prop), p: d.style.getPropertyPriority(prop) });
  d.style.setProperty(prop, value, m.get(prop).p);
  return d;
}

// Put every touched rule back, then — when the box is ticked — replay the
// edits still standing. Used by Reset and by the checkbox.
function uiiSyncRules() {
  for (const [style, text] of uiiRuleText) style.cssText = text;
  uiiRuleText.clear();
  uiiRuleOrig.clear();
  // A variable edit may live in a rule just restored, and it outlives this:
  // it belongs to the palette, not to the checkbox.
  for (const e of uiiVarEdits.values()) e.style.setProperty(e.prop, e.to, e.pri);
  if (uiiState.similar && uiiState.edits) {
    for (const [el, e] of uiiState.edits) {
      for (const [prop, v] of Object.entries(e.props)) {
        e.rule[prop] = uiiRuleApply(el, prop, v, el.isConnected ? undefined : e.rule[prop] || null);
      }
    }
  }
  uiiScheduleDraw();
}

/* ================= live editing: the variables themselves =================
   A color field pointed at `--bg` edits the variable rather than the
   element, so every rule that uses it follows in one go — which is what an
   app's palette is for. The declaring rule is rewritten in memory, the way
   "Apply to similar" rewrites a plain one, and Reset puts it back. */

// key -> {style, prop, pri, file, selector, from, to, add}. A variable is
// keyed by its name; a declaration in a state rule (the States section) by
// uiiDeclKey. `from` is what the sheet said before the inspector touched it,
// `add` marks a var no sheet declared.
const uiiVarEdits = new Map();

// Writes one declaration and records it for undo, Reset and the Changes box.
// `find` builds the entry the first time a key is written; undo passes none,
// the entry it replays already exists.
function uiiDeclSet(key, value, find) {
  let e = uiiVarEdits.get(key);
  if (!e && !find) return;
  uiiUndoAdd({ k: 'var', name: key, had: !!e, to: e && e.to });
  if (!e) uiiVarEdits.set(key, e = find());
  e.to = value;
  e.style.setProperty(e.prop, value, e.pri);
  if (uiiState.panel) {
    uiiState.panel.reset.disabled = false;
    uiiRefreshChanges();
  }
  uiiScheduleDraw();
}

function uiiVarApply(name, value, el) {
  uiiDeclSet(name, value, () => {
    // The palette edits variables with nothing pinned: no info to carry the
    // rule list, so the one it collected on open stands in.
    const r = uiiVarRule(name, el, (uiiState.info && uiiState.info.all) || uiiState.all || []);
    // Nothing readable declares it (an inline style, a cross-origin sheet):
    // own it on :root, where a palette belongs, and say so in the log.
    const style = r ? r.style : document.documentElement.style;
    return { style, prop: name, pri: '', file: r ? r.file.split('/').pop() : '',
      selector: r ? r.selector : ':root', from: style.getPropertyValue(name), add: !r };
  });
}

// One id per rule, so two rules with the same selector (a second @media copy)
// never share an edit.
const uiiRuleIds = new WeakMap();
let uiiRuleSeq = 0;
function uiiDeclKey(style, prop) {
  if (!uiiRuleIds.has(style)) uiiRuleIds.set(style, ++uiiRuleSeq);
  return 'rule#' + uiiRuleIds.get(style) + ' ' + prop;
}

function uiiVarReset() {
  for (const e of uiiVarEdits.values()) {
    if (e.from) e.style.setProperty(e.prop, e.from, e.pri); else e.style.removeProperty(e.prop);
  }
  uiiVarEdits.clear();
}

// [[head, decl]] for the Changes box: "style.css :root", "--bg: #1f2937".
// Page-wide, so uiiChangeLines lists these before the per-element ones.
function uiiVarLines() {
  return [...uiiVarEdits.values()].map((e) => [
    (e.file ? e.file + ' ' : '') + e.selector + (e.add ? ' /* new rule */' : ''),
    e.prop + ': ' + e.to + (e.pri ? ' !important' : ''),
  ]);
}
