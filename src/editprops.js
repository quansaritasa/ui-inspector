/* ================= the pinned element's own declarations =================
   The cards above cover the properties worth a dedicated control. This is the
   rest: every property the element's matched rules actually set, every
   variable those rules read, and a box for anything they do not mention yet.
   Values are written through uiiSet and uiiVarApply, so the Changes box and
   Reset treat them like any other edit. */

// The declarations a rule writes, as authored: [{name, value}]. Not the
// CSSOM property list — that expands `font:` into eighteen longhands and
// leaves `background-color` empty when the shorthand carries the var(), which
// is both noise and a lost variable. The text of a rule the inspector has
// rewritten is its text before that (uiiRuleText), so the list says what the
// stylesheet says.
function uiiDeclList(style) {
  const text = uiiRuleText.get(style) || style.cssText || '';
  const out = [];
  for (const part of text.split(';')) {
    const i = part.indexOf(':');
    const name = i < 0 ? '' : part.slice(0, i).trim();
    const value = i < 0 ? '' : part.slice(i + 1).trim();
    // A ';' inside a value (a data: URI) splits a declaration in two; the
    // halves have no property name and drop out here.
    if (/^-{0,2}[a-z][\w-]*$/i.test(name) && value) out.push({ name, value });
  }
  return out;
}

// Every --name a value mentions: "1px solid var(--line)" -> ["--line"], and a
// fallback chain "var(--a, var(--b))" -> both.
function uiiVarsIn(value) {
  return [...String(value || '').matchAll(/var\(\s*(--[\w-]+)/g)].map((m) => m[1]);
}

// The variables this element reads or sets, sorted, deduped, and only those
// that resolve here: a var() naming nothing has no value to show or edit.
function uiiElementVars(info) {
  const names = new Set();
  for (const r of info.rules) {
    if (!r.style) continue;
    for (const d of uiiDeclList(r.style)) {
      if (d.name.startsWith('--')) names.add(d.name);
      for (const n of uiiVarsIn(d.value)) names.add(n);
    }
  }
  const cs = getComputedStyle(info.el);
  return [...names].sort().map((name) => ({ name, value: cs.getPropertyValue(name).trim() })).filter((v) => v.value);
}

// Every property the element's matched rules set, with the value to edit:
// the live edit standing on it, else the last rule's own words (`var(--accent)`
// is worth more in the box than the colour it resolves to), else computed.
// Custom properties are left to uiiElementVars.
function uiiDeclaredProps(info) {
  const seen = new Map();
  for (const r of info.rules) {
    if (!r.style) continue;
    for (const d of uiiDeclList(r.style)) if (!d.name.startsWith('--')) seen.set(d.name, d.value);
  }
  const e = uiiEditsFor(info.el, false);
  const cs = getComputedStyle(info.el);
  return [...seen.keys()].sort()
    .map((prop) => ({ prop, value: (e && e.props[prop]) || seen.get(prop) || cs.getPropertyValue(prop).trim() }))
    .filter((p) => p.value);
}

// Anything the rules do not set yet: a name, a value, Enter or ↵ applies. A
// name opening with -- edits that variable, like the rows above.
function uiiAddPropRow(info) {
  const row = uiiEl('div', 'vr add');
  row.dataset.keep = '1'; // the filter never hides it
  const name = uiiEl('input', 'n', undefined, 'add-prop-name');
  name.placeholder = 'box-shadow, --accent…';
  name.spellcheck = false;
  const wrap = uiiEl('span', 'nf');
  const val = uiiEl('input', undefined, undefined, 'add-prop-value');
  val.placeholder = 'value';
  val.spellcheck = false;
  const go = uiiEl('button', 'go', '↵', 'add-prop-apply');
  go.type = 'button';
  go.title = 'Apply to the pinned element';
  const set = () => {
    const p = name.value.trim(), v = val.value.trim();
    if (!p || !v) return;
    if (p.startsWith('--')) uiiVarApply(p, v, info.el);
    // CSS.supports keeps a typo from landing as a silent no-op: setProperty
    // drops a value the browser cannot parse and says nothing.
    else if (!CSS.supports(p, v)) { uiiFlash('Not a CSS value: ' + p + ': ' + v); return; }
    else uiiSet(info, p, v);
    row.classList.add('on');
  };
  for (const i of [name, val]) {
    i.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); set(); } });
  }
  go.addEventListener('click', set);
  wrap.append(val, go);
  row.append(name, wrap);
  return row;
}

// The section itself, folded into a <details> so a long list does not push
// the Changes box off the panel. Open when it is short enough to read at a
// glance, and whenever one of its rows has been edited.
function uiiPropsSection(body, info) {
  const vars = uiiElementVars(info);
  const props = uiiDeclaredProps(info);
  const wrap = uiiEl('details', 'more');
  const n = (c, word) => c + ' ' + word + (c === 1 ? '' : 's');
  const sum = uiiEl('summary', 'sec', 'Declared — ' + n(props.length, 'property').replace('propertys', 'properties')
    + ', ' + n(vars.length, 'variable') + ' ', 'section-declared');
  const find = uiiEl('input', 'find', undefined, 'filter-declared');
  sum.appendChild(find);
  const list = uiiEl('div', 'vrs', undefined, 'declared-list');
  for (const v of vars) list.appendChild(uiiValueRow(v.name, v.value, (val) => uiiVarApply(v.name, val, info.el), v.name).row);
  for (const p of props) list.appendChild(uiiValueRow(p.prop, p.value, (val) => uiiSet(info, p.prop, val), p.prop).row);
  list.appendChild(uiiAddPropRow(info));
  uiiFindBox(find, list);
  // Short enough to read at a glance, or an element already being worked on.
  wrap.open = vars.length + props.length <= 8 || !!uiiEditsFor(info.el, false);
  wrap.append(sum, list);
  body.appendChild(wrap);
}
