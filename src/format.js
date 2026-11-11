/* ================= value formatting =================
   Color normalisation and the "Copy for AI" text block. */

// "rgb(31, 41, 55)" / "rgba(31,41,55,0.5)" -> "#1f2937" / "#1f293780".
// Anything else (gradients, "transparent") is returned untouched.
function uiiToHex(v) {
  // Chrome writes some computed colors as color(srgb 0.94 0.95 0.96 / 0.55): channels 0..1.
  const c = /^color\(\s*srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)$/.exec(String(v || '').trim());
  if (c) v = 'rgba(' + [c[1], c[2], c[3]].map((n) => Math.round(n * 255)).join(',') + (c[4] !== undefined ? ',' + c[4] : '') + ')';
  const m = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+%?))?\s*\)$/.exec(String(v || '').trim());
  if (!m) return v;
  const h = (n) => Math.round(Number(n)).toString(16).padStart(2, '0');
  let out = '#' + h(m[1]) + h(m[2]) + h(m[3]);
  if (m[4] !== undefined) {
    let a = m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    if (a === 0) return 'transparent';
    if (a < 1) out += h(a * 255);
  }
  return out;
}

function uiiIsTransparent(v) {
  return !v || v === 'transparent' || /^(?:rgba?|color)\([^)]*[,/]\s*0\s*\)$/.test(v);
}

// "Inter, -apple-system, system-ui" -> "Inter (+2 fallbacks)"
function uiiFirstFont(v) {
  const parts = String(v || '').split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
  if (!parts.length) return '';
  return parts.length > 1 ? parts[0] + ' (+' + (parts.length - 1) + ' fallbacks)' : parts[0];
}

// Collapse whitespace and cap length for names built from text content.
function uiiShort(s, n) {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n - 1) + '…' : t;
}

// One color line: "#ffffff (--surface)" or "#ffffff (inherited from #toolbar)".
function uiiColorLine(c) {
  if (!c) return '';
  let s = c.hex;
  const notes = [];
  if (c.vars && c.vars.length) notes.push(c.vars.join(', '));
  if (c.from) notes.push('inherited from ' + c.from);
  return notes.length ? s + ' (' + notes.join('; ') + ')' : s;
}

// One line for an AI chat: the control's name and where to edit it — the
// stamped source location when the app set one, then the selector, the
// script(s) that mention it, the stylesheet(s) that style it.
//   [#edit-btn (edit.js:12 · edit.js · style.css)]
// An element with no id, name attribute or aria-label gets its visible text in
// front — ("Test icon")[...] — since many cells can share one selector.
function uiiFormatForAI(info) {
  // The selector leads: id plus classes. Then the source location, the one part
  // an AI acts on without searching. Brackets make it one paste-ready token.
  const loc = [];
  if (info.src) loc.push(info.src);
  if (info.code && info.code.length) loc.push(info.code.join(', '));
  const css = uiiCssFiles(info);
  if (css.length) loc.push(css.join(', '));
  const edits = uiiEditsText(info.el);
  const attr = uiiState.opts.nameAttr;
  const named = info.id || (attr && info.el.getAttribute(attr)) || info.el.getAttribute('aria-label');
  const words = String(info.el.innerText || info.el.value || '').replace(/"/g, "'").split(/\s+/).filter(Boolean);
  const label = !named && words.length ? '("' + words.slice(0, 10).join(' ') + (words.length > 10 ? '…' : '') + '")' : '';
  return label + '[' + info.path + (loc.length ? ' (' + loc.join(' · ') + ')' : '') +
    (edits ? ' — apply: ' + edits : '') + ']';
}

// Every edit made since the page loaded, on any element, as Map(head ->
// [decl]) — the final value per rule, no history. A detached element counts
// while its rule rewrite stands (Apply to similar): the re-rendered element
// still shows it. Otherwise the edit left the screen with the element.
function uiiChangeLines() {
  const byRule = new Map();
  // Two elements sharing one rule write the same property twice. A rule holds
  // one value per property — the last one written, which is what the page
  // shows — so the later edit replaces the earlier instead of adding a second,
  // contradicting line ("font-size: 1.5em; font-size: 2.25em").
  const put = (head, decl) => {
    if (!byRule.has(head)) byRule.set(head, new Map());
    byRule.get(head).set(decl.slice(0, decl.indexOf(':')), decl);
  };
  // Variable edits first: they move the whole page, not one element.
  for (const [head, decl] of uiiVarLines()) put(head, decl);
  const edits = uiiState.edits || new Map();
  for (const [el, e] of edits) {
    let lines = e.last;
    if (el.isConnected) {
      lines = e.last = uiiEditChanges(el).map((c) => uiiChangeDecl(el, c));
    } else if (!uiiState.similar || !lines) {
      edits.delete(el);
      continue;
    }
    for (const { head, decl } of lines) put(head, decl);
  }
  return new Map([...byRule].map(([head, decls]) => [head, [...decls.values()]]));
}

// How many edits stand — zero means the Changes box has nothing to copy.
// Counted without naming rules, so it works after inspect mode closed (no
// pinned info to cache rule lookups on); two elements sharing a rule
// therefore count twice where the box collapses them to one line.
function uiiEditCount() {
  let n = uiiVarEdits.size;
  for (const [el, e] of uiiState.edits || []) {
    n += el.isConnected ? uiiEditChanges(el).length : uiiState.similar && e.last ? e.last.length : 0;
  }
  return n;
}

// The Changes box, from uiiChangeLines.
//   style.css .grid-task-title { font-size: calc(var(--g) * 1.1) /* 14.3px */; }
//   #grid > … > td.grid-index (grid-helpers.js:132) /* no rule yet */ { background-color: #fe0; }
function uiiFormatChanges() {
  const L = ['Apply these CSS changes (final values) by editing each rule in place.'
    + ' A declaration with no marker replaces the value already in the rule;'
    + ' /* add */ = add the line; /* new rule */ = create the rule.'
    + ' Keep var()/calc() as written.'];
  for (const [head, decls] of uiiChangeLines()) L.push(head + ' { ' + decls.join('; ') + '; }');
  if (L.length === 1) return '(no changes yet)';
  if (!uiiState.similar) L.push('Only these elements: add a more specific selector, leave the shared rules.');
  return L.join('\n');
}

// What the Changes box's Copy button copies, for the A shortcut. The
// textarea is the source when the panel has one: it is editable, and the
// button copies what is in it, not what was last generated.
function uiiCopyChanges() {
  const P = uiiState.panel;
  if (!uiiEditCount()) { uiiFlash('No changes yet'); return; }
  uiiCopy(P && P.changes ? P.changes.value : uiiFormatChanges());
}

// The Changes box at the foot of the panel, in both of its modes. Rebuilt
// with the rest of the body, so typing in it lasts until the next edit or
// selection refills it.
function uiiChangesBox(body) {
  const head = uiiEl('div', 'sec', 'All changes ', 'section-changes');
  const copy = uiiEl('button', 'mini', '📋 Copy for AI', 'copy-for-ai');
  head.appendChild(copy);
  const changes = uiiEl('textarea', 'chg', undefined, 'changes');
  changes.spellcheck = false;
  changes.rows = 7;
  copy.addEventListener('click', () => uiiCopy(changes.value, copy));
  body.append(head, changes);
  uiiState.panel.changes = changes;
  uiiRefreshChanges();
}

// Multi-line block with the computed look, for when the AI must match or
// change colors and type rather than just locate the element.
function uiiFormatDetails(info) {
  const L = [];
  L.push('UI component: ' + info.name);
  L.push('Selector: ' + info.path);
  if (info.src) L.push('Source: ' + info.src);
  L.push('Element: <' + info.tag + (info.id ? ' id="' + info.id + '"' : '')
    + (info.classes.length ? ' class="' + info.classes.join(' ') + '"' : '') + '>');
  if (info.text) L.push('Text: "' + info.text + '"');
  L.push('Size: ' + info.width + '×' + info.height + 'px');
  L.push('Background: ' + uiiColorLine(info.bg));
  for (const state of ['hover', 'active']) if (info.bgStates[state]) L.push('Background (' + state + '): ' + uiiColorLine(info.bgStates[state]));
  L.push('Text color: ' + uiiColorLine(info.color));
  L.push('Font: ' + info.fontFamily + ' ' + info.fontSize + ' / ' + info.lineHeight + ' weight ' + info.fontWeight);
  L.push('Padding: ' + info.padding + ' | Margin: ' + info.margin);
  L.push('Border: ' + info.border + ' | Radius: ' + info.borderRadius);
  const edits = uiiEditsText(info.el);
  if (edits) L.push('Live edits to apply: ' + edits);
  if (info.rules.length) {
    L.push('Matched CSS rules:');
    for (const r of info.rules) L.push('  ' + r.file + ' → ' + r.selector);
  }
  return L.join('\n');
}
