/* ================= live editing: apply to similar =================
   With "Apply to similar" on, an edit also rewrites the CSS rule that sets
   the property (the one the Changes box names), in memory only, so every
   element that rule styles changes with the pinned one. Originals are kept
   per rule so Reset, the checkbox, or a reload puts the sheet back. */

// CSSStyleDeclaration -> Map(prop -> {v, p}): the rule's text before any edit.
const uiiRuleOrig = new Map();

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
  if (!uiiRuleOrig.has(d.style)) uiiRuleOrig.set(d.style, new Map());
  const m = uiiRuleOrig.get(d.style);
  if (!m.has(prop)) m.set(prop, { v: d.style.getPropertyValue(prop), p: d.style.getPropertyPriority(prop) });
  d.style.setProperty(prop, value, m.get(prop).p);
  return d;
}

// Put every touched rule back, then — when the box is ticked — replay the
// edits still standing. Used by Reset and by the checkbox.
function uiiSyncRules() {
  for (const [style, m] of uiiRuleOrig) {
    for (const [prop, o] of m) style.setProperty(prop, o.v, o.p);
  }
  uiiRuleOrig.clear();
  if (uiiState.similar && uiiState.edits) {
    for (const [el, e] of uiiState.edits) {
      for (const [prop, v] of Object.entries(e.props)) {
        e.rule[prop] = uiiRuleApply(el, prop, v, el.isConnected ? undefined : e.rule[prop] || null);
      }
    }
  }
  uiiScheduleDraw();
}
