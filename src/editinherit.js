/* ================= inherited declarations =================
   The Declared list shows what the pinned element's own rules set. A property
   that inherits can also come from an ancestor's rule; this finds those, and
   only those that really reach the element. */

// Inherited longhands worth listing. Shorthands (`font`, `list-style`) are
// left out: authored as one declaration they carry no single longhand value.
const UII_INHERITED = ['color', 'cursor', 'direction', 'font-family', 'font-size', 'font-style', 'font-variant',
  'font-weight', 'letter-spacing', 'line-height', 'list-style-type', 'text-align', 'text-indent', 'text-transform',
  'visibility', 'white-space', 'word-spacing'];

// [{prop, value, file, selector}] — for every inherited property the element
// does not set itself (`own`: names its rules set), the nearest ancestor rule
// that declares it, kept only while the value on screen is still that
// ancestor's: something in between overriding it means this rule does not
// reach the element.
function uiiInheritedProps(info, own) {
  const el = info.el, cs = getComputedStyle(el), found = new Map(), blocked = new Set();
  for (let p = el.parentElement, i = 0; p && p !== document.documentElement && i < 12; p = p.parentElement, i++) {
    const pcs = getComputedStyle(p);
    for (const r of uiiMatchedRules(p, info.all)) {
      if (!r.style) continue;
      for (const d of uiiDeclList(r.style)) {
        if (!UII_INHERITED.includes(d.name) || own.has(d.name) || el.style.getPropertyValue(d.name)) continue;
        if (blocked.has(d.name) || (found.has(d.name) && found.get(d.name).anc !== p)) continue; // a nearer ancestor decided it
        if (cs.getPropertyValue(d.name) !== pcs.getPropertyValue(d.name)) { blocked.add(d.name); continue; }
        found.set(d.name, { prop: d.name, value: d.value, file: r.file, selector: r.selector, anc: p });
      }
    }
  }
  return [...found.values()].sort((a, b) => (a.prop < b.prop ? -1 : 1));
}
