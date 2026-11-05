/*! ui-inspector v0.9.2 — Press a shortcut, hover any control, click to see its name, colours, font and matching CSS rules — then copy a summary for an AI to edit it.
 * https://github.com/quansaritasa/ui-inspector  (MIT)
 * Built from src/ by build.js — edit the sources, not this file. */
(function (global) {
'use strict';

/* ================= shadow-DOM stylesheet =================
   Everything the inspector draws lives inside one shadow root, so host CSS
   cannot restyle the panel and this sheet cannot leak into the host. */

const UII_CSS = `
:host { all: initial; }
* { box-sizing: border-box; }
.layer { position: fixed; inset: 0; pointer-events: none; z-index: 2147483000; }
.box { position: fixed; pointer-events: none; border: 1px solid; border-radius: 2px; }
.box.button { border-color: #3b82f6; background: rgba(59,130,246,.06); }
.box.field  { border-color: #16a34a; background: rgba(22,163,74,.06); }
.box.link   { border-color: #9333ea; background: rgba(147,51,234,.06); }
.box.block  { border-color: rgba(249,115,22,.7); border-style: dashed; }  /* containers: no fill, they stack */
.hover { position: fixed; pointer-events: none; z-index: 2147483001; border: 2px solid #ef4444;
  background: rgba(239,68,68,.08); border-radius: 2px; display: none; }
.hover.on { display: block; }
.hover:not(.sel) { border-style: dashed; }
.hover.sel { background: rgba(239,68,68,.14); }
.tip { position: fixed; pointer-events: none; z-index: 2147483002; display: none; max-width: 360px;
  padding: 3px 8px; border-radius: 4px; background: #111827; color: #f9fafb;
  font: 12px/1.4 -apple-system, "Segoe UI", system-ui, sans-serif; white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis; }
.tip.on { display: block; }
.tip b { color: #fbbf24; font-weight: 600; }
.tip i { display: block; color: #93c5fd; font-style: normal; } /* snap hint: second line */
/* Padding (green, inside the border box) and margin (orange, outside it) of
   the pinned element, each drawn as a border so the hole is the inner box. */
.sp { position: fixed; pointer-events: none; z-index: 2147483001; display: none; border-style: solid; }
.sp.on { display: block; }
.sp.mg { border-color: rgba(246,178,107,.55); }
.sp.pd { border-color: rgba(147,196,125,.6); }
.spv { position: fixed; z-index: 2147483002; display: none; padding: 2px 6px; border-radius: 4px;
  background: #111827; color: #9ca3af; font: 11px/1.3 ui-monospace, Menlo, monospace; white-space: nowrap; }
.spv.on { display: block; }
.spv b { color: #93c47d; font-weight: 600; }
.spv i { color: #f6b26b; font-style: normal; }

.badge { position: fixed; z-index: 2147483002; top: 8px; left: 50%; transform: translateX(-50%);
  padding: 4px 12px; border-radius: 999px; background: #111827; color: #f9fafb;
  font: 12px/1.4 -apple-system, "Segoe UI", system-ui, sans-serif; pointer-events: none;
  transition: opacity .4s ease; }
.badge.off { opacity: 0; }
.badge kbd { background: #374151; padding: 0 4px; border-radius: 3px; font: inherit; }
/* Normal view (V): the panel stays, everything the inspector draws goes, so
   an edit is judged against the real screen. !important, because the pieces
   are shown by a second class (.hover.on) of equal weight. */
:host(.peek) .layer, :host(.peek) .hover, :host(.peek) .tip,
:host(.peek) .sp, :host(.peek) .spv, :host(.peek) .badge { display: none !important; }
.head button.on { background: #1f2937; border-color: #1f2937; color: #fff; }

.panel { position: fixed; z-index: 2147483003; top: 48px; right: 16px; width: 500px; max-height: calc(100vh - 64px);
  display: none; flex-direction: column; pointer-events: auto;
  background: #ffffff; color: #111827; border: 1px solid #d1d5db; border-radius: 8px;
  box-shadow: 0 12px 32px rgba(0,0,0,.25);
  font: 12px/1.45 -apple-system, "Segoe UI", system-ui, sans-serif; }
.panel.on { display: flex; }
.panel.min .body { display: none; }
.panel.min .head { border-bottom: 0; border-radius: 8px; }
.head { display: flex; align-items: center; gap: 6px; padding: 6px 8px 6px 10px; cursor: move;
  background: #f3f4f6; border-bottom: 1px solid #e5e7eb; border-radius: 8px 8px 0 0; user-select: none; }
.head .name { flex: 1; min-width: 0; font-weight: 700; font-size: 13px; overflow: hidden;
  text-overflow: ellipsis; white-space: nowrap; }
.head .tag { color: #6b7280; font-family: ui-monospace, Menlo, monospace; }
/* Square icon buttons: one glyph each, so a fixed box reads as a row of
   equal keys. Reset carries a word and keeps its own width. */
.head button { width: 26px; height: 26px; flex: none; display: grid; place-items: center;
  font: inherit; padding: 0; border: 1px solid #d1d5db;
  border-radius: 4px; background: #fff; color: #111827; cursor: pointer; }
.head button.reset { width: auto; padding: 0 8px; }
.head button:hover { background: #e5e7eb; }
.body { overflow: auto; padding: 0 0 6px; }
.body > .sec:first-child { margin-top: 0; }
.grip { position: absolute; left: -3px; top: 0; bottom: 0; width: 7px; cursor: ew-resize; z-index: 1; }
.grip:hover { background: rgba(59,130,246,.35); }
.sec { display: flex; align-items: center; min-height: 30px; margin: 6px 0 2px; padding: 3px 10px; background: #e5e7eb; color: #1f2937; font-weight: 700;
  text-transform: uppercase; font-size: 11px; letter-spacing: .05em; }
.row { display: grid; grid-template-columns: 56px minmax(0, 1fr); gap: 8px; padding: 2px 10px; }
.row .k { color: #6b7280; }
.row .v { font-family: ui-monospace, Menlo, monospace; word-break: break-all; }
.row .txt { width: 100%; min-height: 20px; padding: 2px 5px; resize: vertical;
  font: 12px/1.45 ui-monospace, Menlo, monospace; color: #111827; background: #fff;
  border: 1px solid #d1d5db; border-radius: 4px; }
.row .txt:focus { outline: 2px solid #3b82f6; outline-offset: -1px; }
.card { margin: 8px 10px; padding: 8px 10px 10px; border: 1px solid #d1d5db; border-radius: 8px; background: #eef0f3;
  display: flex; flex-direction: column; gap: 8px; }
.card .ct { font-weight: 700; font-size: 12px; }
.g2 { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 8px; }
.g4 { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
.g4 .lab { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fld { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.fld .lab { color: #6b7280; font-size: 11px; user-select: none; }
.fld .lab.scrub { cursor: ew-resize; }
.nf, .tf, .seg { height: 26px; border: 1px solid #d1d5db; border-radius: 6px; background: #fff; }
.nf { display: flex; align-items: center; gap: 4px; padding: 0 6px; min-width: 0; }
.nf:focus-within, .tf:focus { outline: 2px solid #3b82f6; outline-offset: -1px; }
.nf input, .tf { flex: 1; min-width: 0; font: 12px ui-monospace, Menlo, monospace; color: #111827; }
.nf input { border: 0; background: none; outline: none; padding: 0; }
.tf { flex: none; padding: 0 6px; }
.nf select.u { appearance: none; color: #9ca3af; font-size: 10px; text-transform: uppercase; max-width: 45%; text-overflow: ellipsis; padding: 0 2px; }
.nf select.u:hover { color: #111827; }
.st { display: flex; flex-direction: column; margin-right: -4px; }
.st button { width: 14px; height: 11px; padding: 0; border: 0; border-radius: 2px; background: none;
  color: #9ca3af; font-size: 7px; line-height: 11px; cursor: pointer; }
.st button:hover { color: #111827; background: #e5e7eb; }
.nf button.cv { border: 0; background: none; color: #0f766e; font: inherit; font-size: 10px; max-width: 46%;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding: 0 2px; cursor: pointer; }
.nf button.cv::after { content: ' ▾'; color: #9ca3af; }
.cvl { position: fixed; z-index: 2147483004; min-width: 180px; max-width: 320px; max-height: 240px; overflow: auto;
  background: #fff; border: 1px solid #d1d5db; border-radius: 6px; box-shadow: 0 6px 20px rgba(0,0,0,.15); padding: 3px;
  pointer-events: auto; font: 12px/1.45 -apple-system, "Segoe UI", system-ui, sans-serif; } /* outside .panel: own font */
.cvl button { display: flex; align-items: center; gap: 6px; width: 100%; border: 0; background: none; padding: 3px 6px;
  border-radius: 4px; cursor: pointer; color: #374151; font: inherit; font-size: 11px; text-align: left; }
.cvl button:hover { background: #f3f4f6; }
/* The value in force, told apart from whatever the pointer happens to be over:
   the teal the .cv button already uses for a variable, and a bar down the side
   that costs no layout (a ::before would push the row's flex items along). */
.cvl button.on { background: #ecfdf5; color: #0f766e; font-weight: 600; box-shadow: inset 2px 0 0 #0f766e; }
.cvl button.on:hover { background: #d1fae5; }
.cvl .n { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cvl i { width: 14px; height: 14px; border-radius: 3px; border: 1px solid rgba(0,0,0,.15); flex: none; }
.cvl .h { color: #9ca3af; font-family: ui-monospace, Menlo, monospace; font-size: 10px; }
.nf select { font-size: 11px; border: 0; background: none; color: #374151; cursor: pointer; max-width: 55%; }
/* The open list is the browser's, not ours: Chrome on Windows and Linux and
   Firefox paint the options with this, macOS draws its own menu and marks the
   current value with a checkmark instead. */
.nf select option { background: #fff; color: #374151; font-weight: 400; text-transform: none; }
.nf select option:checked { background: #ecfdf5; color: #0f766e; font-weight: 600; }
.seg { display: flex; overflow: hidden; }
.seg button { flex: 1; border: 0; background: none; color: #4b5563; cursor: pointer; display: grid; place-items: center; }
.seg button + button { border-left: 1px solid #e5e7eb; }
.seg button.on { background: #111827; color: #fff; }
.nf input.pick { width: 18px; height: 18px; padding: 0; border: 1px solid #d1d5db; border-radius: 4px; cursor: pointer; flex: none; background: none; }
/* The swatch fills the whole box: browsers pad and border it by default. */
.nf input.pick::-webkit-color-swatch-wrapper { padding: 0; }
.nf input.pick::-webkit-color-swatch { border: 0; border-radius: 3px; }
.nf input.pick::-moz-color-swatch { border: 0; border-radius: 3px; }
.sec .sim { margin-left: auto; font-size: 11px; font-weight: 400; text-transform: none; letter-spacing: 0; cursor: pointer; }
.sec .sim input { margin: 0 2px 0 0; vertical-align: -2px; }
.sec input.find { margin-left: auto; width: 120px; height: 20px; padding: 0 6px; border: 1px solid #9ca3af; border-radius: 4px;
  background: #fff; color: #111827; font: 11px/1 inherit; font-weight: 400; text-transform: none; letter-spacing: 0; outline: none; }
/* The palette (editvars.js): one row per custom property the page declares. */
.vrs { display: flex; flex-direction: column; gap: 2px; padding: 4px 10px 8px; }
.vr { display: flex; align-items: center; gap: 8px; padding: 2px 4px; border-radius: 5px; }
.vr .n { flex: 0 0 42%; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  color: #0f766e; font-family: ui-monospace, Menlo, monospace; font-size: 11px; }
.vr .nf { flex: 1; min-width: 0; height: 24px; }
.vr.on { background: #ecfdf5; box-shadow: inset 2px 0 0 #0f766e; }
.vnone { padding: 8px 10px; color: #6b7280; }
/* The pinned element's own declarations (editprops.js), folded away when the
   list is long. summary.sec keeps the section bar's look; the marker is the
   only part a <details> adds. */
.more > summary { cursor: pointer; }
.more > summary::marker { color: #6b7280; }
.vr.add { margin-top: 4px; padding-top: 6px; border-top: 1px dashed #d1d5db; border-radius: 0; }
.vr input.n { height: 24px; padding: 0 6px; border: 1px solid #d1d5db; border-radius: 5px;
  background: #fff; outline: none; }
.vr input.n:focus { outline: 2px solid #3b82f6; outline-offset: -1px; }
.vr .go { flex: none; width: 18px; height: 18px; padding: 0; border: 1px solid #d1d5db; border-radius: 4px;
  background: #fff; color: #374151; font: 11px/1 inherit; cursor: pointer; }
.vr .go:hover { background: #e5e7eb; }
.sec .mini { margin-left: auto; font-size: 11px; font-weight: 400; text-transform: none; letter-spacing: 0; padding: 4px 10px;
  border: 1px solid #9ca3af; border-radius: 4px; background: #fff; cursor: pointer; }
.chg { display: block; width: calc(100% - 20px); margin: 4px 10px 8px; padding: 6px; resize: vertical;
  font: 11px/1.45 ui-monospace, Menlo, monospace; color: #111827; background: #fff;
  border: 1px solid #d1d5db; border-radius: 6px; }
.sw { display: inline-block; width: 12px; height: 12px; vertical-align: -2px; margin-right: 5px;
  border: 1px solid rgba(0,0,0,.25); border-radius: 2px;
  background-image: linear-gradient(45deg,#ccc 25%,transparent 25%,transparent 75%,#ccc 75%),
    linear-gradient(45deg,#ccc 25%,transparent 25%,transparent 75%,#ccc 75%);
  background-size: 6px 6px; background-position: 0 0, 3px 3px; }
.sw i { display: block; width: 100%; height: 100%; }
.head .reset { color: #b91c1c; }
.head .reset[hidden] { display: none; }
.head .ok { color: #16a34a; white-space: nowrap; }
`;

/* ================= value formatting =================
   Colour normalisation and the "Copy for AI" text block. */

// "rgb(31, 41, 55)" / "rgba(31,41,55,0.5)" -> "#1f2937" / "#1f293780".
// Anything else (gradients, "transparent") is returned untouched.
function uiiToHex(v) {
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
  return !v || v === 'transparent' || /^rgba?\([^)]*[,/]\s*0\s*\)$/.test(v);
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

// One colour line: "#ffffff (--surface)" or "#ffffff (inherited from #toolbar)".
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
//   edit-btn (edit.js:12 · #edit-btn · edit.js · style.css)
function uiiFormatForAI(info) {
  // The selector leads: id plus classes. Then the source location, the one part
  // an AI acts on without searching. Brackets make it one paste-ready token.
  const loc = [];
  if (info.src) loc.push(info.src);
  if (info.code && info.code.length) loc.push(info.code.join(', '));
  const css = uiiCssFiles(info);
  if (css.length) loc.push(css.join(', '));
  const edits = uiiEditsText(info.el);
  return '[' + info.path + (loc.length ? ' (' + loc.join(' · ') + ')' : '') +
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
  const L = ['Apply these CSS changes (final values). Edit each rule in place; a declaration with no'
    + ' marker replaces the value already in the rule; /* add */ = add that line to the rule;'
    + ' /* new rule */ = create it. Keep var()/calc() as written.'];
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
// change colours and type rather than just locate the element.
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

/* ================= stylesheet lookups =================
   Two things the computed style cannot tell you: which --custom-property a
   colour came from, and which selectors put it there. Both are recovered by
   walking document.styleSheets — cross-origin sheets throw on .cssRules and
   are skipped. Runs only on click, so a few hundred rules is fine. */

// A sheet's name as an AI should read it: the file, not where the page is
// served from. Every same-origin sheet is the app's own, and
// "localhost:8765/style.css" spends thirteen characters saying where the
// reader already is — "style.css" is the string to grep. A cross-origin sheet
// keeps its host and drops everything else: "photoswipe.css" alone would not
// say which CDN served it, and the folders in front of it say nothing.
function uiiSheetName(href) {
  const url = String(href).split('?')[0];
  try {
    const u = new URL(url, document.baseURI);
    const segs = u.pathname.split('/').filter(Boolean);
    if (u.origin !== new URL(document.baseURI).origin) {
      return (u.host ? u.host + '/' : '') + (segs.pop() || u.pathname);
    }
    // Two segments on a same-origin sheet, not one: /renderer/style.css is
    // still the app's own file, and the folder is part of finding it.
    return segs.slice(-2).join('/') || url;
  } catch (e) {
    return url; // an unparsable href is named by what it says
  }
}

// Every CSSStyleRule in every readable sheet, flattened through @media /
// @supports / @layer. Each entry: { rule, file, cond }; cond = it may not
// apply as written (inside @media / @layer / any group, or a sheet with a
// media attribute or disabled), so only a probe can say whether it wins.
function uiiAllRules() {
  const out = [];
  const walk = (rules, file, cond) => {
    for (const r of rules) {
      if (r.style && r.selectorText) out.push({ rule: r, file, cond });
      else if (r.cssRules) walk(r.cssRules, file, true);
    }
  };
  const sheets = document.styleSheets;
  for (let i = 0; i < sheets.length; i++) {
    const sh = sheets[i];
    let rules;
    try { rules = sh.cssRules; } catch (e) { continue; }
    if (!rules) continue;
    // A linked sheet is named by its file; an inline <style> by its id when it
    // has one (usually injected by a script at runtime).
    const node = sh.ownerNode;
    const file = sh.href ? uiiSheetName(sh.href)
      : node && node.id ? '<style id="' + node.id + '"> (injected)' : '<style>#' + i;
    walk(rules, file, sh.disabled || !!(sh.media && sh.media.mediaText));
  }
  return out;
}

// Names of every custom property declared anywhere in the sheets.
function uiiVarNames(all) {
  const names = new Set();
  for (const { rule } of all) {
    const st = rule.style;
    for (let i = 0; i < st.length; i++) if (st[i].startsWith('--')) names.add(st[i]);
  }
  return [...names];
}

// A hidden scratch element inside the shadow root turns "#fff", "navy" or
// "var(--x)" into the same rgb() form getComputedStyle uses everywhere else.
function uiiNormColor(v) {
  const s = uiiState.scratch;
  if (!s) return v;
  s.style.color = '';
  s.style.color = v;
  if (!s.style.color) return null;
  return getComputedStyle(s).color;
}

// [{name, hex}] for every custom property whose value, resolved on this
// element, is a colour. Vars set on ancestors or :root all resolve here.
// This is the palette the colour fields offer, so it is sorted by name.
function uiiColorVars(el, all) {
  const cs = getComputedStyle(el);
  const out = [];
  for (const name of uiiVarNames(all)) {
    const raw = cs.getPropertyValue(name).trim();
    if (!raw || raw.length > 40) continue; // shadows, font stacks: never a colour
    const rgb = uiiNormColor(raw);
    if (!rgb) continue;
    out.push({ name, hex: uiiToHex(rgb) });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

// hex -> [--var, ...], from the same list.
function uiiColorVarMap(vars) {
  const map = new Map();
  for (const { name, hex } of vars) {
    if (!map.has(hex)) map.set(hex, []);
    map.get(hex).push(name);
  }
  return map;
}

// The rule that gives `name` its value for `el`: the last rule in sheet order
// that declares it and whose selector matches el or an ancestor (`:root` is
// where an app keeps its palette, but a theme block may set it lower down).
// null when no readable sheet declares it — the var came from an inline
// style attribute, and `uiiVarApply` writes it on :root instead.
function uiiVarRule(name, el, all) {
  let hit = null;
  for (const { rule, file } of all) {
    if (!rule.style.getPropertyValue(name)) continue;
    for (const sel of rule.selectorText.split(',')) {
      const s = sel.trim();
      let up = null;
      try { up = s && el.closest(s); } catch (e) { up = null; }
      if (up) { hit = { file, selector: s, style: rule.style }; break; }
    }
  }
  return hit;
}

// Rules whose selector matches el, in sheet order. Selector lists are split so
// the reported selector is the one that actually matched.
function uiiMatchedRules(el, all) {
  const out = [];
  for (const { rule, file, cond } of all) {
    const parts = rule.selectorText.split(',');
    for (const sel of parts) {
      const s = sel.trim();
      if (!s) continue;
      let hit = false;
      try { hit = el.matches(s); } catch (e) { hit = false; }
      if (hit) { out.push({ file, selector: s, props: rule.style.length, style: rule.style, cond }); break; }
    }
  }
  return out;
}

/* ================= which source files mention this element =================
   The DOM cannot say which script wired a button, so the page's own
   <script src> files are fetched once (same origin, works over file:// in
   Electron) and searched for the element's id and classes. Vendor bundles are
   skipped by default — a hit there names a library, not the app's code. */

function uiiScriptWanted(url) {
  const f = uiiState.opts.scripts;
  if (typeof f === 'function') return f(url);
  return !/\/(vendor|node_modules|dist)\//.test(url);
}

// Promise of Map basename -> source text, started when inspect mode opens
// (uiiEnable) so the first pin does not wait on the fetches, and kept for the
// session. The promise itself is kept, so a pin during the fetch shares it.
function uiiScriptIndex() {
  const S = uiiState;
  return S.sources || (S.sources = uiiFetchScripts());
}

async function uiiFetchScripts() {
  const map = new Map();
  const jobs = [...document.scripts]
    .filter((s) => s.src && uiiScriptWanted(s.src))
    .map(async (s) => {
      try {
        const res = await fetch(s.src);
        if (res.ok) map.set(s.src.split('/').pop().split('?')[0], await res.text());
      } catch (e) { /* cross-origin or unreadable: skip */ }
    });
  await Promise.all(jobs);
  return map;
}

// Tokens that identify the element in code: its id first, then each class.
// Quoted forms ('edit-btn', "edit-btn") and selector forms (#edit-btn,
// .row) count; a bare word does not, it would match prose in comments.
function uiiCodeTokens(info) {
  const toks = [];
  if (info.id) toks.push({ re: uiiTokenRe(info.id, '#'), w: 3 });
  for (const c of info.classes.slice(0, 3)) toks.push({ re: uiiTokenRe(c, '.'), w: 1 });
  return toks;
}

function uiiTokenRe(name, prefix) {
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp('([\'"`]' + esc + '[\'"`]|\\' + prefix + esc + '(?![\\w-]))', 'g');
}

// Basenames of the scripts that mention the element, best match first.
async function uiiCodeFiles(info) {
  const idx = await uiiScriptIndex();
  const toks = uiiCodeTokens(info);
  if (!toks.length) return [];
  const scored = [];
  for (const [file, text] of idx) {
    let score = 0;
    for (const t of toks) {
      const n = (text.match(t.re) || []).length;
      if (n) score += t.w * n;
    }
    if (score) scored.push({ file, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 3).map((s) => s.file);
}

// Stylesheet files behind the matched rules, most specific last in sheet
// order so the first named is the app's own sheet, not a reset. No selector:
// the element's class in the locator greps every rule at once.
function uiiCssFiles(info) {
  const out = [];
  for (const r of info.rules) {
    if (r.selector === '*' || r.selector === 'html' || r.selector === 'body') continue;
    if (r.file.startsWith('<style')) continue; // injected at runtime: nothing to open
    const f = r.file.replace(/^renderer\//, '');
    if (!out.includes(f)) out.push(f);
  }
  return out.slice(0, 3);
}

/* ================= element facts =================
   Turns one DOM element into a plain object the panel renders and the
   "Copy for AI" text serialises. No DOM is touched here. */

// Which outline colour an element gets. Order matters: a <button role="tab">
// is still a button.
function uiiKind(el) {
  const tag = el.tagName.toLowerCase();
  const role = el.getAttribute('role') || '';
  if (tag === 'button' || tag === 'summary' || role === 'button' || role === 'tab' || role === 'menuitem') return 'button';
  if (tag === 'input' || tag === 'select' || tag === 'textarea' || el.isContentEditable) return 'field';
  if (tag === 'a' || role === 'link') return 'link';
  return 'block';
}

// Human name, most intentional source first. nameAttr (data-ui by default) is
// the app's own label; the rest are fallbacks that usually exist anyway.
function uiiName(el) {
  const attr = uiiState.opts.nameAttr;
  const pick = [
    attr && el.getAttribute(attr),
    el.getAttribute('aria-label'),
    el.id,
    el.getAttribute('title'),
    el.getAttribute('placeholder'),
  ].find((v) => v && v.trim());
  if (pick) return pick.trim();
  const text = uiiShort(el.innerText || el.textContent, 30);
  if (text) return text;
  return el.tagName.toLowerCase() + (el.className && typeof el.className === 'string'
    ? '.' + el.className.trim().split(/\s+/).join('.') : '');
}

// One CSS segment for el: prefer #id, else tag.class, plus :nth-of-type when
// siblings share the tag and there is no class to tell them apart.
function uiiSegment(el) {
  if (el.id) return '#' + CSS.escape(el.id);
  const tag = el.tagName.toLowerCase();
  const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/).filter(Boolean) : [];
  if (cls.length) return tag + '.' + cls.slice(0, 2).map((c) => CSS.escape(c)).join('.');
  const p = el.parentElement;
  if (!p) return tag;
  const same = [...p.children].filter((c) => c.tagName === el.tagName);
  return same.length > 1 ? tag + ':nth-of-type(' + (same.indexOf(el) + 1) + ')' : tag;
}

// The nearest ancestor an AI can grep for: an #id, or the app's own nameAttr
// (data-ui), which is how an app labels a region. `up` counts the wrappers
// between it and el, so the caller knows whether anything was collapsed
// (0 = the direct parent).
function uiiAnchor(el) {
  const attr = uiiState.opts.nameAttr;
  let n = el.parentElement;
  let up = 0;
  while (n && n !== document.body) {
    const named = attr && n.getAttribute(attr);
    if (n.id || named) {
      const cls = typeof n.className === 'string' && n.className.trim();
      // A named ancestor with no class and no id has no segment worth
      // printing — uiiSegment() would answer "div:nth-of-type(2)" — so the
      // attribute itself is written, which is at least the string to grep.
      const seg = n.id || cls ? uiiSegment(n) : '[' + attr + '="' + named + '"]';
      return { seg, up };
    }
    n = n.parentElement;
    up += 1;
  }
  return null;
}

// Selector path: the element, and the nearest ancestor that pins it, with "…"
// for whatever sits between them. Two pieces name what to look for; six named
// where it was and nothing else —
//   div.jira-panel-body > div.jira-comments > div.jira-comments-list >
//   div.jira-comment-replies > div.jira-comment.jira-comment-reply >
//   div.jira-comment-body
// is the same element as
//   div.jira-comments-list > … > div.jira-comment-body
// and the long one repeats "div" five times to say "somewhere deep". A prompt
// pays for every one of those characters, and the source stamp beside the path
// is what actually leads to the line to edit; the path only has to say what to
// grep for. The "…" is the marker uiiFormatChanges() already writes.
// ".a.b" from the element's first two classes, or ''.
function uiiClassSel(el) {
  const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/).filter(Boolean) : [];
  return cls.slice(0, 2).map((c) => '.' + CSS.escape(c)).join('');
}

// Selector for a rule the AI must create: the classes when there are any —
// a minted id would tie the new CSS to a name that changes with a label.
function uiiNewRuleSel(el) {
  return (el.id && uiiClassSel(el)) || uiiPath(el);
}

function uiiPath(el) {
  const own = uiiSegment(el);
  // An id is unique but often minted at runtime, so nothing in the source
  // greps for it; the element's own classes do, in the JS and the CSS alike.
  if (el.id) return own + uiiClassSel(el);
  const anchor = uiiAnchor(el);
  if (!anchor) return own;
  return anchor.up > 0 ? anchor.seg + ' > … > ' + own : anchor.seg + ' > ' + own;
}

// Walk up until something actually paints a background.
function uiiEffectiveBg(el) {
  let n = el;
  while (n && n !== document.documentElement) {
    const v = getComputedStyle(n).backgroundColor;
    if (!uiiIsTransparent(v)) return { rgb: v, from: n === el ? null : uiiSegment(n) };
    n = n.parentElement;
  }
  const v = getComputedStyle(document.documentElement).backgroundColor;
  return { rgb: uiiIsTransparent(v) ? 'transparent' : v, from: 'html' };
}

function uiiColorInfo(rgb, from, varMap) {
  const hex = uiiToHex(rgb);
  return { hex, rgb, from: from || null, vars: varMap.get(hex) || [] };
}

function uiiCollect(el) {
  const cs = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  const all = uiiAllRules();
  const colorVars = uiiColorVars(el, all);
  const varMap = uiiColorVarMap(colorVars);
  const bg = uiiEffectiveBg(el);
  return {
    el,
    name: uiiName(el),
    kind: uiiKind(el),
    tag: el.tagName.toLowerCase(),
    id: el.id || '',
    classes: typeof el.className === 'string' ? el.className.trim().split(/\s+/).filter(Boolean) : [],
    text: uiiShort(el.innerText || el.value || '', 60),
    path: uiiPath(el),
    src: uiiState.opts.srcAttr ? (el.getAttribute(uiiState.opts.srcAttr) || '') : '',
    width: Math.round(r.width),
    height: Math.round(r.height),
    bg: uiiColorInfo(bg.rgb, bg.from, varMap),
    color: uiiColorInfo(cs.color, null, varMap),
    fontFamily: uiiFirstFont(cs.fontFamily),
    fontFamilyFull: cs.fontFamily,
    fontSize: cs.fontSize,
    fontWeight: cs.fontWeight,
    lineHeight: cs.lineHeight,
    padding: cs.padding,
    margin: cs.margin,
    border: cs.borderWidth === '0px' ? 'none' : cs.borderWidth + ' ' + cs.borderStyle + ' ' + uiiToHex(cs.borderColor),
    borderRadius: cs.borderRadius,
    display: cs.display,
    rules: uiiMatchedRules(el, all).slice(-30),
    colorVars, // the palette the colour fields offer (cssvars.js)
    all, // every stylesheet rule, reused for the text children's lookups
  };
}

/* ================= occlusion: is a fixed layer painting over it? =================
   A control behind a popup is in the viewport, visible, and not ignored, yet
   the user cannot see it. No selector list can say "behind whatever is on top
   right now", so the renderer is asked — but once per scan, not once per
   element: a hit test costs ~0.13 ms on a large page, and 450 of them made
   every draw 8x slower. Instead a 5x5 grid of probes finds the fixed layers
   on screen (a popup's backdrop and panel), and geometry decides the rest.
   Small covers the probes miss — a toast, a tooltip — are not detected. The
   inspector's own host is never a layer: its panel already paints above the
   outline layer, so treating it as cover would only make outlines flicker. */

// Outermost position:fixed ancestor-or-self, or null for normal flow. Shared
// ancestors are styled once per scan, and nothing inside a fixed root is read.
function uiiFixedRoot(el, memo) {
  const path = [];
  let n = el;
  while (n && !memo.has(n)) { path.push(n); n = n.parentElement; }
  let root = n ? memo.get(n) : null;
  for (let i = path.length - 1; i >= 0; i--) {
    if (!root && getComputedStyle(path[i]).position === 'fixed') root = path[i];
    memo.set(path[i], root);
  }
  return root;
}

// Builds the per-scan test. An element is covered when its on-screen part
// lies wholly inside a probed layer's rect, it is neither inside that layer
// nor around it, and it is not part of another fixed layer that owns its own
// centre pixel — the rule that keeps a popup panel which is a sibling of its
// backdrop, not a child.
function uiiOcclusion() {
  const vw = window.innerWidth, vh = window.innerHeight;
  const memo = new Map(), layers = new Map(), onTop = new Map();
  for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) {
    const hit = document.elementFromPoint((i + 0.5) * vw / 5, (j + 0.5) * vh / 5);
    if (!hit || hit === uiiState.host) continue;
    const L = uiiFixedRoot(hit, memo);
    if (L && !layers.has(L)) layers.set(L, L.getBoundingClientRect());
  }
  if (!layers.size) return () => false;
  const above = (R) => {
    if (!onTop.has(R)) {
      const r = R.getBoundingClientRect();
      const x = Math.min(Math.max(r.left + r.width / 2, 0), vw - 1);
      const y = Math.min(Math.max(r.top + r.height / 2, 0), vh - 1);
      const hit = document.elementFromPoint(x, y);
      onTop.set(R, !!hit && (hit === R || R.contains(hit)));
    }
    return onTop.get(R);
  };
  return (el, r) => {
    // Only the on-screen part counts: a row running off the bottom is still
    // wholly under a full-screen backdrop.
    const left = Math.max(r.left, 0), top = Math.max(r.top, 0);
    const right = Math.min(r.right, vw), bottom = Math.min(r.bottom, vh);
    for (const [L, lr] of layers) {
      if (L.contains(el) || el.contains(L)) continue;
      if (left < lr.left || top < lr.top || right > lr.right || bottom > lr.bottom) continue;
      const own = uiiFixedRoot(el, memo);
      if (own && above(own)) continue;
      return true;
    }
    return false;
  };
}

/* ================= overlay: the host, the outlines, the hover box ============
   A single light-DOM host <div data-uii> carries a shadow root with every
   visual piece the inspector draws. What happens when the pointer moves over
   them is events.js; the padding and margin bands are spacing.js. */

function uiiMount() {
  const S = uiiState;
  if (S.host) return;
  const host = document.createElement('div');
  host.setAttribute('data-uii', '');
  const sh = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = UII_CSS;
  sh.appendChild(style);
  const mk = (cls) => { const d = document.createElement('div'); d.className = cls; sh.appendChild(d); return d; };
  S.layer = mk('layer');
  S.hoverBox = mk('hover');
  S.selBox = mk('hover sel');
  S.tip = mk('tip');
  S.mgBox = mk('sp mg');
  S.pdBox = mk('sp pd');
  S.spv = mk('spv');
  S.badge = mk('badge');
  S.badge.innerHTML = 'Inspect — click to pin, <kbd>C</kbd> copies it for an AI, <kbd>A</kbd> copies all changes,'
    + ' <kbd>V</kbd> normal view, <kbd>P</kbd> page variables, <kbd>Alt</kbd> for exact element, <kbd>↑↓←→</kbd> to walk, <kbd>Esc</kbd> to quit';
  S.badgeHtml = S.badge.innerHTML;
  S.scratch = mk('scratch');
  S.scratch.style.display = 'none';
  uiiBuildPanel(sh);
  document.documentElement.appendChild(host);
  S.host = host;
  S.shadow = sh;
}

function uiiUnmount() {
  const S = uiiState;
  if (S.host) S.host.remove();
  S.host = S.shadow = S.layer = S.hoverBox = S.selBox = S.tip = S.badge = S.scratch = S.panel = null;
  S.mgBox = S.pdBox = S.spv = null;
  S.boxes = [];
}

// The panel opens with inspect mode, already filled: the element under the
// pointer is pinned, so there is no empty panel to look at and no click to
// make first. It is parked on the half of the screen the pointer is NOT on,
// because the pointer is sitting on what is about to be inspected and a
// 500px panel over it would be the first thing to drag out of the way.
// Without a pointer position (the shortcut pressed on a freshly loaded page)
// nothing is pinned and the panel stays closed until the first click.
function uiiOpenAtPointer() {
  const S = uiiState;
  if (!S.pos) return;
  const p = S.panel.root;
  if (S.mx > window.innerWidth / 2) { p.style.left = '16px'; p.style.right = 'auto'; }
  else { p.style.left = 'auto'; p.style.right = '16px'; }
  const el = uiiSnap(document.elementFromPoint(S.mx, S.my), false);
  if (!el || el === document.body || el === document.documentElement || S.host.contains(el)) return;
  uiiSelect(el);
}

// Say something in the badge for a moment, then let it fade back out. The
// badge is the one piece of chrome on screen whether the panel is open,
// minimised or closed, so it is where a keyboard action reports itself.
function uiiFlash(text) {
  const S = uiiState;
  if (!S.badge) return;
  clearTimeout(S.badgeTimer);
  S.badge.textContent = text;
  S.badge.classList.remove('off');
  S.badgeTimer = setTimeout(() => {
    if (!S.badge) return;
    S.badge.innerHTML = S.badgeHtml;
    S.badge.classList.add('off');
  }, 1200);
}

// Normal view: hide every outline and band, and hand the pointer back to the
// page, so a live edit can be judged on the real screen. The panel stays open
// with its edits, so the next press returns to a pinned element, not a blank
// one. Entering it unbinds the capture listeners — that is what makes the app
// clickable again — so nothing redraws until it is left.
function uiiPeek(on) {
  const S = uiiState;
  if (!S.on) return;
  const want = on === undefined ? !S.peek : !!on;
  if (want === S.peek) return;
  S.peek = want;
  S.host.classList.toggle('peek', want);
  if (want) {
    uiiUnbindEvents();
    if (S.raf) cancelAnimationFrame(S.raf);
    clearTimeout(S.drawTimer);
    S.raf = 0;
    uiiSetHover(null);
  } else {
    uiiBindEvents();
    uiiDrawOutlines();
    // The page may have scrolled or re-rendered while the overlay was off.
    if (S.selected && S.selected.isConnected) {
      uiiPlace(S.selBox, S.selected.getBoundingClientRect());
      uiiDrawSpacing(S.selected);
    }
  }
  const P = S.panel;
  if (!P || !P.peek) return;
  P.peek.classList.toggle('on', want);
  P.peek.title = want ? 'Back to inspect (V)' : 'Normal view — hide the overlay and use the page (V)';
}

function uiiFromPanel(e) {
  return e.target === uiiState.host;
}

function uiiIgnored(el) {
  const ig = uiiState.opts.ignore;
  if (!ig.length) return false;
  for (const s of ig) { try { if (el.closest(s)) return true; } catch (err) { /* bad selector */ } }
  return false;
}

// Visible, uncovered candidates inside the viewport, capped so a 5,000-row
// tree does not turn into 5,000 divs. The time budget truncates in document
// order, so if it ever trips, a popup late in the markup is what goes
// unoutlined — the box count with a popup open is the check that it does not.
function uiiControls() {
  const S = uiiState;
  const vw = window.innerWidth, vh = window.innerHeight;
  const out = [];
  const all = document.querySelectorAll(S.selList);
  const t0 = performance.now();
  const covered = uiiOcclusion();
  for (const el of all) {
    if (out.length >= S.opts.maxOutlines) break;
    if (performance.now() - t0 > S.opts.maxScanMs) break;
    if (el === S.host || S.host.contains(el) || uiiIgnored(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1 || r.bottom < 0 || r.right < 0 || r.top > vh || r.left > vw) continue;
    if (getComputedStyle(el).visibility === 'hidden') continue;
    if (covered(el, r)) continue;
    out.push({ el, r });
  }
  return out;
}

function uiiPlace(box, r) {
  box.style.left = r.left + 'px';
  box.style.top = r.top + 'px';
  box.style.width = r.width + 'px';
  box.style.height = r.height + 'px';
}

function uiiDrawOutlines() {
  const S = uiiState;
  if (!S.layer) return;
  const items = uiiControls();
  while (S.boxes.length < items.length) {
    const d = document.createElement('div');
    S.layer.appendChild(d);
    S.boxes.push(d);
  }
  S.boxes.forEach((d, i) => {
    const it = items[i];
    if (!it) { d.style.display = 'none'; return; }
    d.style.display = '';
    d.className = 'box ' + uiiKind(it.el);
    uiiPlace(d, it.r);
  });
  if (S.selected && S.selected.isConnected) uiiPlace(S.selBox, S.selected.getBoundingClientRect());
  else S.selBox.classList.remove('on');
  uiiDrawSpacing(S.selected);
}

function uiiScheduleDraw() {
  const S = uiiState;
  if (S.holding) { S.drawLater = true; return; }
  if (S.raf) return;
  // A page that changes every frame (a timer, an animation) would rerun the
  // scan back to back — 45-120 ms each on 60,000 elements — and keys like Esc
  // would queue behind it. After a scan of d ms, wait 3·d before the next:
  // a small page still redraws every frame, a big one leaves 75% free.
  const go = () => {
    S.raf = requestAnimationFrame(() => {
      S.raf = 0;
      const t0 = performance.now();
      uiiDrawOutlines();
      S.drawEnd = performance.now();
      S.drawMs = S.drawEnd - t0;
    });
  };
  const wait = (S.drawEnd || 0) + 3 * (S.drawMs || 0) - performance.now();
  if (wait > 0) { S.raf = -1; S.drawTimer = setTimeout(go, wait); } else go();
}

/* ================= overlay: padding and margin =================
   The panel lists the numbers, but reading a layout means seeing where the
   space actually sits. The pinned element gets DevTools' two bands — green
   padding inside the border box, orange margin outside it — plus one chip
   carrying the numbers, because a 1px band is visible and still unreadable.
   Pinned only: on hover the bands would chase the pointer. */

const UII_SIDES = ['top', 'right', 'bottom', 'left'];

// [t, r, b, l] of a box property, in px.
function uiiBoxSides(cs, prop) {
  return UII_SIDES.map((s) => parseFloat(cs.getPropertyValue(prop + '-' + s + (prop === 'border' ? '-width' : ''))) || 0);
}

// CSS shorthand collapse: [8,8,8,8] -> "8", [4,8,4,8] -> "4 8".
function uiiShortSides(a) {
  const [t, r, b, l] = a.map((v) => Math.round(v * 10) / 10);
  if (t === r && r === b && b === l) return String(t);
  if (t === b && r === l) return t + ' ' + r;
  return [t, r, b, l].join(' ');
}

// Place a band: `out` is the outer rect, `w` the four band widths. The band
// is drawn as a border, so the hole in the middle is the inner box.
function uiiBand(box, out, w) {
  uiiPlace(box, out);
  box.style.borderWidth = w.map((v) => Math.max(0, v) + 'px').join(' ');
  box.classList.add('on');
}

function uiiDrawSpacing(el) {
  const S = uiiState;
  if (!S.mgBox) return;
  if (!el || !el.isConnected) {
    for (const b of [S.mgBox, S.pdBox, S.spv]) b.classList.remove('on');
    return;
  }
  const cs = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  const m = uiiBoxSides(cs, 'margin');
  const p = uiiBoxSides(cs, 'padding');
  const bw = uiiBoxSides(cs, 'border');
  // A negative margin pulls the element over its neighbour; the band cannot
  // be drawn inside-out, so only the chip reports it.
  uiiBand(S.mgBox, { left: r.left - Math.max(0, m[3]), top: r.top - Math.max(0, m[0]),
    width: r.width + Math.max(0, m[1]) + Math.max(0, m[3]), height: r.height + Math.max(0, m[0]) + Math.max(0, m[2]) }, m);
  uiiBand(S.pdBox, { left: r.left + bw[3], top: r.top + bw[0],
    width: r.width - bw[1] - bw[3], height: r.height - bw[0] - bw[2] }, p);
  S.spv.title = 'padding · margin, in px';
  S.spv.innerHTML = 'padding <b></b> · margin <i></i>';
  S.spv.querySelector('b').textContent = uiiShortSides(p);
  S.spv.querySelector('i').textContent = uiiShortSides(m);
  // Under the margin box, or over it when the element sits at the bottom.
  const below = r.bottom + Math.max(0, m[2]) + 2;
  S.spv.style.left = Math.max(4, Math.min(r.left, window.innerWidth - 240)) + 'px';
  S.spv.style.top = (below + 20 < window.innerHeight ? below : Math.max(4, r.top - Math.max(0, m[0]) - 20)) + 'px';
  S.spv.classList.add('on');
}

/* ================= overlay: pointer events and pinning =================
   Every pointer event is captured on window so the app underneath never sees
   a click while inspect mode is on; events whose target is the host (they
   came from inside the panel) pass through untouched. Pinning an element is
   what builds the panel: see uiiCollect in inspect.js. */

// Nearest control ancestor of the pointer target, or the raw element while
// Alt is held (to reach a <span> inside a button, say).
function uiiTargetFrom(e) {
  return uiiSnap(e.target, e.altKey);
}

// The snap itself, without an event: the pointer tracker has coordinates
// only, so uiiOpenAtPointer calls this one directly.
function uiiSnap(t, alt) {
  if (!t || t.nodeType !== 1 || t === uiiState.host) return null;
  if (alt) return t;
  let c = null;
  try { c = t.closest(uiiState.selList); } catch (err) { c = null; }
  return c && c !== document.body && c !== document.documentElement ? c : t;
}

// raw: the element under the pointer. When it sits inside el (the snap went
// up to a parent), the tip says how to reach it.
function uiiSetHover(el, raw) {
  const S = uiiState;
  S.hovered = el;
  if (!el) { S.hoverBox.classList.remove('on'); S.tip.classList.remove('on'); return; }
  const r = el.getBoundingClientRect();
  uiiPlace(S.hoverBox, r);
  S.hoverBox.classList.add('on');
  S.tip.innerHTML = '<b></b> <span></span>';
  S.tip.firstChild.textContent = uiiName(el);
  S.tip.lastChild.textContent = '<' + el.tagName.toLowerCase() + '> ' + Math.round(r.width) + '×' + Math.round(r.height)
    + ' · ' + getComputedStyle(el).fontSize;
  if (raw && raw !== el && raw.nodeType === 1) {
    const hint = document.createElement('i');
    hint.textContent = 'Hold Alt to pick the <' + raw.tagName.toLowerCase() + '> inside';
    S.tip.appendChild(hint);
  }
  const h = S.tip.childElementCount > 2 ? 42 : 24;
  const top = r.top > h + 4 ? r.top - h : r.bottom + 4;
  S.tip.style.left = Math.max(4, Math.min(r.left, window.innerWidth - 370)) + 'px';
  S.tip.style.top = top + 'px';
  S.tip.classList.add('on');
}

// Where the pointer is, kept up to date from init, not from enable: the
// shortcut carries no coordinates, and the panel has to know which half of
// the screen to avoid the moment the mode opens. Two assignments per move.
function uiiTrackPointer(e) {
  const S = uiiState;
  S.mx = e.clientX; S.my = e.clientY; S.pos = true;
}

function uiiOnMove(e) {
  if (uiiFromPanel(e)) { uiiSetHover(null); return; }
  uiiSetHover(uiiTargetFrom(e), e.target);
}

function uiiOnBlock(e) {
  // A drag that starts in the panel (scrub, resize, move) and ends outside it
  // makes the browser click the common ancestor — <html> — which would re-pin.
  if (e.type === 'mousedown') uiiState.downInPanel = uiiFromPanel(e);
  if (uiiFromPanel(e)) return;
  e.preventDefault();
  e.stopPropagation();
}

function uiiOnClick(e) {
  if (uiiFromPanel(e)) return;
  e.preventDefault();
  e.stopPropagation();
  if (uiiState.downInPanel) { uiiState.downInPanel = false; return; }
  const el = uiiTargetFrom(e);
  if (!el) return;
  const ready = uiiSelect(el);
  // Cmd/Ctrl+click pins and copies the Copy ID line in one go. It waits for
  // the script scan so the line names the script files, as the button would.
  // (Ctrl+click on macOS arrives as contextmenu, which also lands here.)
  if (e.metaKey || e.ctrlKey) ready.then((info) => uiiCopy(uiiFormatForAI(info)));
}

function uiiSelect(el) {
  const S = uiiState;
  S.selected = el;
  uiiPlace(S.selBox, el.getBoundingClientRect());
  S.selBox.classList.add('on');
  uiiDrawSpacing(el); // the bands belong to the click, not to the next frame
  const info = uiiCollect(el);
  S.info = info;
  uiiRenderPanel(info);
  // Script scan is async (first call fetches every <script src>); the Copy
  // buttons read info.code when pressed. Resolves to info once it is set;
  // a failed scan just leaves the line without script files.
  return uiiCodeFiles(info).then((files) => { info.code = files; }, () => {}).then(() => info);
}

const UII_EVENTS = [
  ['mousemove', uiiOnMove], ['mouseover', uiiOnBlock], ['mouseout', uiiOnBlock],
  ['mousedown', uiiOnBlock], ['mouseup', uiiOnBlock], ['click', uiiOnClick],
  ['dblclick', uiiOnBlock], ['contextmenu', uiiOnClick], ['pointerdown', uiiOnBlock],
];

function uiiBindEvents() {
  for (const [n, fn] of UII_EVENTS) window.addEventListener(n, fn, true);
  window.addEventListener('scroll', uiiScheduleDraw, true);
  window.addEventListener('resize', uiiScheduleDraw);
  uiiState.mo = new MutationObserver(uiiScheduleDraw);
  uiiState.mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'hidden'] });
}

function uiiUnbindEvents() {
  for (const [n, fn] of UII_EVENTS) window.removeEventListener(n, fn, true);
  window.removeEventListener('scroll', uiiScheduleDraw, true);
  window.removeEventListener('resize', uiiScheduleDraw);
  if (uiiState.mo) uiiState.mo.disconnect();
  uiiState.mo = null;
}

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

/* ================= live editing: apply to similar =================
   With "Apply to similar" on, an edit also rewrites the CSS rule that sets
   the property (the one the Changes box names), in memory only, so every
   element that rule styles changes with the pinned one. Originals are kept
   per rule so Reset, the checkbox, or a reload puts the sheet back. */

// CSSStyleDeclaration -> Map(prop -> {v, p}): the rule's text before any edit.
const uiiRuleOrig = new Map();

// CSSStyleDeclaration -> cssText before any edit. Restoring the block as a
// whole, not property by property: a rule whose colour comes from a shorthand
// ("background: color-mix(…)") has an empty background-color longhand, and
// putting that emptiness back would strip the colour out of the shorthand and
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
  for (const [name, e] of uiiVarEdits) e.style.setProperty(name, e.to);
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
   A colour field pointed at `--bg` edits the variable rather than the
   element, so every rule that uses it follows in one go — which is what an
   app's palette is for. The declaring rule is rewritten in memory, the way
   "Apply to similar" rewrites a plain one, and Reset puts it back. */

// --name -> {style, file, selector, from, to, add}; `from` is what the sheet
// said before the inspector touched it, `add` marks a var no sheet declared.
const uiiVarEdits = new Map();

function uiiVarApply(name, value, el) {
  let e = uiiVarEdits.get(name);
  if (!e) {
    // The palette edits variables with nothing pinned: no info to carry the
    // rule list, so the one it collected on open stands in.
    const r = uiiVarRule(name, el, (uiiState.info && uiiState.info.all) || uiiState.all || []);
    // Nothing readable declares it (an inline style, a cross-origin sheet):
    // own it on :root, where a palette belongs, and say so in the log.
    const style = r ? r.style : document.documentElement.style;
    e = { style, file: r ? r.file.split('/').pop() : '', selector: r ? r.selector : ':root',
      from: style.getPropertyValue(name), add: !r };
    uiiVarEdits.set(name, e);
  }
  e.to = value;
  e.style.setProperty(name, value);
  if (uiiState.panel) {
    uiiState.panel.reset.hidden = false;
    uiiRefreshChanges();
  }
  uiiScheduleDraw();
}

function uiiVarReset() {
  for (const [name, e] of uiiVarEdits) {
    if (e.from) e.style.setProperty(name, e.from); else e.style.removeProperty(name);
  }
  uiiVarEdits.clear();
}

// [[head, decl]] for the Changes box: "style.css :root", "--bg: #1f2937".
// Page-wide, so uiiChangeLines lists these before the per-element ones.
function uiiVarLines() {
  return [...uiiVarEdits].map(([name, e]) => [
    (e.file ? e.file + ' ' : '') + e.selector + (e.add ? ' /* new rule */' : ''),
    name + ': ' + e.to,
  ]);
}

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

/* ================= live editing: variable-driven values =================
   A rule like `font-size: calc(var(--ui-font-size-grid) * 0.917)` sizes by a
   factor of a variable. Showing or logging the computed px would get an AI to
   hard-code it and cut the link to the variable, so such values are edited
   and reported as the factor: calc(var(--ui-font-size-grid) * 0.754). */

const uiiRound3 = (n) => Math.round(n * 1000) / 1000;

function uiiVarCalc(name, k) {
  return 'calc(var(' + name + ') * ' + uiiRound3(k) + ')';
}

// "var(--x)" / "calc(var(--x) * k)" / "calc(k * var(--x))" -> {name, k}.
function uiiParseVarFactor(v) {
  const s = String(v || '').trim();
  let m = /^var\((--[\w-]+)\)$/.exec(s);
  if (m) return { name: m[1], k: 1 };
  m = /^calc\(\s*var\((--[\w-]+)\)\s*\*\s*(-?\d*\.?\d+)\s*\)$/.exec(s);
  if (m) return { name: m[1], k: parseFloat(m[2]) };
  m = /^calc\(\s*(-?\d*\.?\d+)\s*\*\s*var\((--[\w-]+)\)\s*\)$/.exec(s);
  return m ? { name: m[2], k: parseFloat(m[1]) } : null;
}

// The variable a value is built on: "var(--bg)" -> "--bg". Anywhere in the
// value, not only at the front, so a shorthand ("1px solid var(--line)") and
// a fallback chain ("var(--btn-bg, var(--panel-2))") both answer with the
// variable the page is actually reading.
function uiiVarName(v) {
  const m = /var\(\s*(--[\w-]+)/.exec(String(v || ''));
  return m ? m[1] : '';
}

// The factor form of `value` on `el`, only when it really produces `px`
// (the variable resolves to px there and k × var = px). Guards against a
// rule that a more specific one overrides — sheet order is not the cascade.
function uiiVarFactor(el, value, px) {
  const f = uiiParseVarFactor(value);
  if (!f) return null;
  const varPx = parseFloat(getComputedStyle(el).getPropertyValue(f.name));
  if (isNaN(varPx) || !varPx || Math.abs(f.k * varPx - px) > 0.05) return null;
  return { name: f.name, k: f.k, varPx };
}

// Values no real stylesheet uses, so a computed change proves the rule wins.
const UII_PROBE = { color: 'rgb(1, 2, 3)', 'background-color': 'rgb(1, 2, 3)', 'font-family': 'uii-probe',
  'font-weight': '137', 'text-align': 'justify', border: '7px dotted rgb(1, 2, 3)' };

// {file, selector, value, style} of the matched rule that really sets `prop`
// on `el`, or null when none does (the value is inherited). Sheet order is
// not the cascade (specificity, !important), so each candidate, last first,
// is probed: set a sentinel, see if the element's computed value moves,
// put the rule back. The element's own inline value is lifted meanwhile.
// Cached per selection.
function uiiRuleDecl(el, prop) {
  const I = uiiState.info;
  if (!I.declCache) I.declCache = new Map();
  let m = I.declCache.get(el);
  if (!m) I.declCache.set(el, (m = new Map()));
  if (!m.has(prop)) m.set(prop, uiiFindDecl(el, prop));
  return m.get(prop);
}

// The part of a selector that names the element itself: "td" out of
// "#grid tbody > td". `*` here means the rule styles everything.
function uiiLastSeg(selector) {
  return selector.split(/[\s>+~]+/).pop();
}

function uiiFindDecl(el, prop) {
  const rules = uiiRulesOf(el);
  const sets = rules.filter((r) => r.style && r.style.getPropertyValue(prop));
  // One matched rule sets it, unconditionally, with no `*` rule beside it
  // (an `!important` reset could still beat it): nothing can override it,
  // so it wins without the probe, which restyles the whole page. Not when
  // the list may be cut (uiiCollect keeps the last 30): a dropped rule counts.
  const sure = rules.length < 30 && sets.length === 1 && !sets[0].cond && uiiLastSeg(sets[0].selector) !== '*';
  // Candidates, last in sheet order first. A universal rule — the
  // `* { margin: 0 }` reset — is never an answer: uiiFindEditRule() refuses
  // to edit one, so finding it is work thrown away. Probing it is also the
  // most expensive probe there is: the sentinel lands on every element in
  // the document, and reading the result back relayouts all of them
  // (measured: 2 such probes = 82 of the 389 ms one panel render cost on a
  // 5,000-element page).
  const cands = sets.filter((r) => uiiLastSeg(r.selector) !== '*').reverse();
  const out = (r) => ({ file: r.file.split('/').pop(), selector: r.selector, value: uiiDeclValue(r.style, prop), style: r.style });
  if (sure) return out(cands[0]);
  const w = cands.length > 1 ? uiiProbeAll(el, prop, cands) : null;
  if (w) return out(w);
  if (w === false) return null;
  const r = cands.find((c) => uiiWins(el, prop, c.style));
  return r ? out(r) : null;
}

// Sentinel number i for `prop`, distinct per i; null where a property has too
// few values to tell rules apart (text-align).
function uiiProbeVal(prop, i) {
  if (prop === 'text-align') return null;
  if (prop === 'font-weight') return String(137 + i);
  if (prop === 'font-family') return 'uii-probe-' + i;
  if (prop === 'border') return '7px dotted rgb(1, 2, ' + (3 + i) + ')';
  if (/color$/.test(prop)) return 'rgb(1, 2, ' + (3 + i) + ')';
  return (1234.5 + i) + 'px';
}

// uiiWins for every candidate in one go: each gets its own sentinel, the
// element is read once, and the sentinel that shows names the winner — one
// page restyle instead of one per rule (~110 ms each on 60,000 elements).
// false when the value did not move at all: the winner is none of them (a
// rule past the 30 kept, an `!important` `*`), which is what probing rule by
// rule would also conclude, one restyle per rule later. null when it moved to
// none of the sentinels (max-width clamping a width, say): the caller falls
// back to probing rule by rule.
function uiiProbeAll(el, prop, cands) {
  const s = uiiState.scratch;
  if (!s || cands.length > 200) return null;
  const vals = cands.map((r, i) => uiiProbeVal(prop, i));
  if (vals.includes(null)) return null;
  // Each sentinel as getComputedStyle writes it, from the hidden scratch
  // element (the uiiNormColor trick): only that one element restyles.
  const want = vals.map((v) => { s.style.setProperty(prop, v); return getComputedStyle(s).getPropertyValue(prop); });
  s.style.removeProperty(prop);
  if (new Set(want).size !== want.length) return null;
  const iv = el.style.getPropertyValue(prop), ip = el.style.getPropertyPriority(prop);
  if (iv) el.style.removeProperty(prop);
  const before = getComputedStyle(el).getPropertyValue(prop);
  // Put back by whole cssText, for the reason uiiWins gives.
  const texts = cands.map((r) => r.style.cssText);
  cands.forEach((r, i) => r.style.setProperty(prop, vals[i], r.style.getPropertyPriority(prop)));
  const got = getComputedStyle(el).getPropertyValue(prop);
  cands.forEach((r, i) => { r.style.cssText = texts[i]; });
  if (iv) el.style.setProperty(prop, iv, ip);
  const i = want.indexOf(got);
  return i >= 0 ? cands[i] : got === before ? false : null;
}

// Would `prop` in this rule decide the element's value? Set a sentinel, see
// if the computed value moves, put everything back (the element's own inline
// value is lifted meanwhile, or it would always win).
// The rule is put back by its whole cssText, never property by property: a
// rule that paints through a shorthand ("background: color-mix(…)") reports
// an empty background-color longhand, so removing the sentinel would take the
// colour out of the shorthand with it and leave the page quietly restyled by
// a probe that was only meant to read.
function uiiWins(el, prop, style) {
  const iv = el.style.getPropertyValue(prop), ip = el.style.getPropertyPriority(prop);
  if (iv) el.style.removeProperty(prop);
  const before = getComputedStyle(el).getPropertyValue(prop);
  const text = style.cssText;
  style.setProperty(prop, UII_PROBE[prop] || '1234.5px', style.getPropertyPriority(prop));
  const win = getComputedStyle(el).getPropertyValue(prop) !== before;
  style.cssText = text;
  if (iv) el.style.setProperty(prop, iv, ip);
  return win;
}

// Where an edit lands, cached per selection. The rule that sets the value
// today, unless it is broad — its last part is a bare tag, like `#grid td` —
// and a rule naming the element's own class or id would win if given the
// line: then that one, as an `add`. Never `*`: editing it would move every
// element on the page — uiiFindDecl skips universal rules before they reach
// here, and the `*` arms below keep that true for a hand-made call.
function uiiEditRule(el, prop) {
  const I = uiiState.info;
  if (!I.declCache) I.declCache = new Map();
  let m = I.declCache.get(el);
  if (!m) I.declCache.set(el, (m = new Map()));
  const key = 'edit:' + prop;
  if (!m.has(key)) m.set(key, uiiFindEditRule(el, prop));
  return m.get(key);
}

function uiiFindEditRule(el, prop) {
  const d = uiiRuleDecl(el, prop);
  // No rule found reads as `*`: both mean "nothing worth editing here", so
  // the own-rule search below runs either way.
  const last = d ? uiiLastSeg(d.selector) : '*';
  // add: the line exists only because Apply to similar put it there.
  if (d && !/^(\*|[a-z][\w-]*)$/i.test(last)) return { ...d, add: !d.value };
  const own = uiiOwnRules(el).find((r) => uiiWins(el, prop, r.style));
  if (own) return { file: own.file.split('/').pop(), selector: own.selector, style: own.style, add: !uiiDeclValue(own.style, prop) };
  return d && last !== '*' ? { ...d, add: false } : null;
}

// Does any matched rule write `prop` as a value `test` accepts? Asked before
// uiiRuleDecl, whose probes restyle the whole page (~10 ms each on a 5,000-
// element page, two dozen per panel): when no candidate could give the
// answer, which one wins does not matter.
function uiiAnyDecl(el, prop, test) {
  return uiiRulesOf(el).some((r) => r.style && test(uiiDeclValue(r.style, prop)));
}

// The rule's variable factor for `prop` before any edit, or null.
function uiiFormula(el, prop) {
  if (!uiiAnyDecl(el, prop, uiiParseVarFactor)) return null;
  const d = uiiRuleDecl(el, prop);
  return d ? uiiVarFactor(el, d.value, parseFloat(uiiOrig(el, prop))) : null;
}

function uiiSrcNote(el) {
  const a = uiiState.opts.srcAttr;
  const v = a && el.getAttribute(a);
  return v ? ' (' + v + ')' : '';
}

// One edit as {head, decl} for the Changes box: head names the rule to edit
// ("style.css .grid-task-title"), decl is the final value only. A
// variable-driven value is written as the rule with the new factor; a
// non-px value carries its px as a comment for reference.
function uiiChangeDecl(el, c) {
  const d = uiiRuleDecl(el, c.prop);
  const f = d && uiiVarFactor(el, d.value, parseFloat(c.from));
  const cv = getComputedStyle(el).getPropertyValue(c.prop).trim();
  const now = parseFloat(cv);
  const value = f && !isNaN(now) ? uiiVarCalc(f.name, now / f.varPx) : c.to;
  // px for reference only where the value hides a length: a factor, em, %.
  const note = /^-?[\d.]+px$/.test(cv) && /calc\(|var\(|\d(em|rem|%)/.test(value) ? ' /* ' + uiiRound3(now) + 'px */' : '';
  // The rule to edit (see uiiEditRule); `add` = a line the rule lacks today.
  // No such rule: the element's path, so the AI creates one.
  const t = uiiEditRule(el, c.prop);
  return t
    ? { head: t.file + ' ' + t.selector, decl: c.prop + ': ' + value + note + (t.add ? ' /* add */' : '') }
    : { head: uiiNewRuleSel(el) + uiiSrcNote(el) + ' /* new rule */', decl: c.prop + ': ' + value + note };
}

// Matched rules whose last part names this element's id or one of its
// classes — `.grid-task`, not `td` or `*` — last in sheet order first.
function uiiOwnRules(el) {
  return uiiRulesOf(el).filter((r) => {
    const last = uiiLastSeg(r.selector);
    return (el.id && last.includes('#' + el.id)) || [...el.classList].some((c) => last.includes('.' + c));
  }).reverse();
}

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
    for (const p of props) uiiSet(info, p, v);
    c.show(v);
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
  box.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); box.blur(); }
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
  const target = uiiTargetEl(info, props[0]);
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
  show(uiiEditValue(info, props[0]));
  // A ↕ / ↔ pair whose sides differ shows no number: either one would lie.
  // The first write sets both sides; show() clears the placeholder.
  if (new Set(props.map((p) => uiiEditValue(info, p))).size > 1) { box.value = ''; box.placeholder = 'Mixed'; }
  // em and % are read off the element the edit lands on, which is not always
  // the one the field shows (see uiiWriteEl). Asked at conversion time: the
  // answer costs a rule probe, and only switching a unit needs it.
  const conv = (u) => uiiConvertUnit(uiiWriteEl(info, props[0]), props[0], u);
  const c = { info, props, opt, fx, target, conv, box, unit, show };
  const { write, nudge, cur } = uiiNumWriter(c);
  if (sel) sel.addEventListener('change', () => write(sel.value === 'var'
    ? uiiVarCalc(fx.name, parseFloat(getComputedStyle(target).getPropertyValue(props[0])) / fx.varPx)
    : conv(sel.value)));
  wrap.appendChild(uiiStepper((d) => nudge(cur(), d)));
  const fld = uiiFld(label, wrap);
  // A factor, em or % says nothing about the size on screen: "Size (13.2px)".
  c.pxNote = () => {
    const px = parseFloat(getComputedStyle(target).getPropertyValue(props[0]));
    fld.lab.textContent = label + (unit() && unit() !== 'px' && !isNaN(px) ? ' (' + uiiRound3(px) + 'px)' : '');
  };
  c.pxNote();
  uiiScrub(fld.lab, cur, nudge);
  fld.set = show;
  return fld;
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
      const stop = () => { clearTimeout(timer); uiiHold(false); window.removeEventListener('mouseup', stop, true); };
      window.addEventListener('mouseup', stop, true);
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
      if (raf) cancelAnimationFrame(raf);
      flush();
      uiiHold(false);
    };
    uiiHold(true);
    window.addEventListener('mousemove', move, true);
    window.addEventListener('mouseup', up, true);
    e.preventDefault();
  });
}

/* ================= live editing: colour fields =================
   A colour either sits on the element or comes from a variable. The picker
   below edits whichever the dropdown points at, so moving a palette entry
   moves every rule that reads it. Split out of editfields.js to keep each
   file short. */

// Shorthands that can carry a colour: CSSOM leaves the longhand empty when
// the shorthand holds a var(), so the var has to be read off the shorthand.
const UII_COLOR_SHORTHAND = { 'background-color': 'background', 'border-color': 'border' };

// The variable this colour comes from, '' when it is written out in full.
function uiiColorVarOf(el, prop) {
  const d = uiiAnyDecl(el, prop, uiiVarName) && uiiRuleDecl(el, prop);
  const named = uiiVarName(d && d.value);
  if (named || !UII_COLOR_SHORTHAND[prop]) return named;
  const rules = uiiRulesOf(el);
  for (let i = rules.length - 1; i >= 0; i--) {
    const n = rules[i].style && uiiVarName(uiiDeclValue(rules[i].style, UII_COLOR_SHORTHAND[prop]));
    if (n) return n;
  }
  return '';
}

// The hex a variable resolves to on this element, '' when it is not a colour.
function uiiVarHex(info, name, el) {
  const v = info.colorVars.find((c) => c.name === name);
  if (v) return v.hex;
  const raw = getComputedStyle(el).getPropertyValue(name).trim();
  return raw ? uiiToHex(uiiNormColor(raw) || raw) : '';
}

// The variable dropdown as a custom list: a native <select> cannot draw a
// swatch in an option, and a name alone rarely says which colour it is.
// Same surface as the <select> it replaces: .value, and a 'change' event.
// The list lives on the shadow root, not in the panel, so the panel's
// scrolling body does not clip it.
function uiiVarPicker(names, target) {
  const S = uiiState;
  const btn = uiiEl('button', 'cv');
  btn.type = 'button';
  let value = '';
  Object.defineProperty(btn, 'value', {
    get: () => value,
    set: (v) => { value = v; btn.textContent = v || '— none —'; },
  });
  // Read live: a variable edited through the swatch has moved since collect.
  const hexOf = (n) => {
    const raw = getComputedStyle(target).getPropertyValue(n).trim();
    return raw ? uiiToHex(uiiNormColor(raw) || raw) : '';
  };
  btn.addEventListener('click', () => {
    const mine = S.cvList && S.cvList.owner === btn;
    uiiCloseVarList();
    if (mine) return; // second click on the button closes it
    const list = uiiEl('div', 'cvl');
    list.owner = btn;
    for (const n of ['', ...names]) {
      const it = list.appendChild(uiiEl('button', n === value ? 'on' : ''));
      it.type = 'button';
      it.appendChild(uiiEl('span', 'n', n || '— none —'));
      const hex = n && hexOf(n);
      if (hex) {
        const sw = uiiEl('i');
        sw.style.background = hex;
        it.append(sw, uiiEl('span', 'h', hex));
      }
      it.addEventListener('click', () => {
        uiiCloseVarList();
        if (n === value) return;
        btn.value = n;
        btn.dispatchEvent(new Event('change'));
      });
    }
    const r = btn.getBoundingClientRect();
    list.style.right = Math.max(4, window.innerWidth - r.right) + 'px';
    list.style.top = (r.bottom + 244 < window.innerHeight ? r.bottom + 2 : Math.max(4, r.top - 244)) + 'px';
    S.shadow.appendChild(list);
    // A long palette scrolls: the value in force opens in view, not below it.
    const on = list.querySelector('.on');
    if (on) on.scrollIntoView({ block: 'nearest' });
    // Close on a press anywhere else, or when the panel scrolls under it.
    const down = (e) => { if (!e.composedPath().some((t) => t === list || t === btn)) uiiCloseVarList(); };
    const scroll = (e) => { if (e.target !== list) uiiCloseVarList(); };
    window.addEventListener('pointerdown', down, true);
    S.shadow.addEventListener('scroll', scroll, true);
    list.off = () => {
      window.removeEventListener('pointerdown', down, true);
      S.shadow.removeEventListener('scroll', scroll, true);
    };
    S.cvList = list;
  });
  return btn;
}

function uiiCloseVarList() {
  const l = uiiState.cvList;
  if (!l) return;
  uiiState.cvList = null;
  l.off();
  l.remove();
}

// A colour either sits on the element (#1f2937) or comes from a variable
// (var(--bg)). The dropdown says which, and the picker edits whatever the
// dropdown points at: on a variable it moves that palette entry, so every
// rule using it follows; on "— none —" the element gets a colour of its own
// again. Pointing a colour at a different variable is the dropdown alone.
function uiiColorField(info, label, prop) {
  const target = uiiTargetEl(info, prop);
  const wrap = uiiEl('span', 'nf');
  const pick = uiiEl('input', 'pick');
  pick.type = 'color';
  const box = uiiEl('input');
  box.spellcheck = false;
  const named = uiiColorVarOf(target, prop);
  const names = info.colorVars.map((c) => c.name);
  // A var the palette list missed (it resolves to something uiiColorVars does
  // not read as a colour) still belongs in the list: it is the current answer.
  if (named && !names.includes(named)) names.push(named);
  const sel = uiiVarPicker(names, target);
  sel.title = 'Which variable this colour comes from. Pick one and the swatch'
    + ' edits the variable itself — every element using it changes.';
  sel.value = named;
  const show = (v) => { box.value = v; if (/^#[0-9a-f]{6}$/i.test(v)) pick.value = v; };
  show(sel.value ? uiiVarHex(info, sel.value, target) : uiiEditValue(info, prop));
  // One write, two places it can land.
  const write = (v) => {
    if (sel.value) uiiVarApply(sel.value, v, target); else uiiSet(info, prop, v);
    show(v);
  };
  pick.addEventListener('input', () => write(pick.value));
  box.addEventListener('change', () => write(box.value.trim()));
  box.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); box.blur(); } });
  sel.addEventListener('change', () => {
    uiiSet(info, prop, sel.value ? 'var(' + sel.value + ')' : box.value.trim());
    if (sel.value) show(uiiVarHex(info, sel.value, target));
  });
  wrap.append(pick, box, sel);
  return uiiFld(label, wrap).f;
}

/* ================= the page's variables =================
   The palette without an element. Every custom property the sheets declare,
   the value it resolves to, and a box to try another one — for the question
   "what happens to the page if this token moves", which has no one element to
   click. Edits go through uiiVarApply, the same path the colour fields use,
   so they show at once, land in the Changes box and come back with Reset. */

// [{name, value, hex}] — colours first, a swatch says more than a name; each
// group by name. A var only an inactive theme block sets (`.dark { --bg }`
// under the light theme) resolves to nothing here and is left out: there is
// no value to show and editing it would change nothing on screen.
function uiiPageVars(all) {
  const cs = getComputedStyle(document.documentElement);
  const out = [];
  for (const name of uiiVarNames(all)) {
    const value = cs.getPropertyValue(name).trim();
    if (!value) continue;
    const rgb = value.length <= 40 ? uiiNormColor(value) : null; // shadows, font stacks: never a colour
    out.push({ name, value, hex: rgb ? uiiToHex(rgb) : '' });
  }
  return out.sort((a, b) => (a.hex ? 0 : 1) - (b.hex ? 0 : 1) || a.name.localeCompare(b.name));
}

// The hex of a value that is a colour, '' when it is not one.
function uiiRowHex(value) {
  const rgb = value && value.length <= 40 ? uiiNormColor(value) : null; // shadows, font stacks: never a colour
  return rgb ? uiiToHex(rgb) : '';
}

// One row of a value list: the name, a picker when the value is a colour, and
// a box that writes through `set`. Edited rows carry .on, the mark the colour
// list uses for the value in force. Shared by the palette and by the pinned
// element's own declarations (editprops.js).
function uiiValueRow(name, value, set) {
  const row = uiiEl('div', 'vr');
  row.dataset.name = name.toLowerCase();
  const wrap = uiiEl('span', 'nf');
  const box = uiiEl('input');
  box.spellcheck = false;
  box.value = value;
  const write = (val) => {
    box.value = val;
    set(val);
    row.classList.add('on');
  };
  const hex = uiiRowHex(value);
  if (hex) {
    const pick = uiiEl('input', 'pick');
    pick.type = 'color';
    // A colour picker takes #rrggbb alone: an alpha value keeps its text box.
    pick.value = /^#[0-9a-f]{6}$/i.test(hex) ? hex : '#000000';
    pick.addEventListener('input', () => write(pick.value));
    wrap.appendChild(pick);
  }
  box.addEventListener('change', () => write(box.value.trim()));
  box.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); box.blur(); } });
  wrap.appendChild(box);
  row.append(uiiEl('span', 'n', name), wrap);
  return { row, box };
}

function uiiVarRow(v) {
  const r = uiiValueRow(v.name, v.value, (val) => uiiVarApply(v.name, val, document.documentElement));
  // An edit made here or from a colour field, before this list was built.
  const e = uiiVarEdits.get(v.name);
  if (e) { r.box.value = e.to; r.row.classList.add('on'); }
  return r.row;
}

// A filter box over a list of rows, each named by data-name. A row marked
// data-keep (the "add a property" row) stays whatever is typed.
function uiiFindBox(find, list) {
  find.placeholder = 'Filter';
  find.spellcheck = false;
  // Inside a <summary> every click toggles the section: not this one.
  find.addEventListener('click', (e) => e.stopPropagation());
  find.addEventListener('keydown', (e) => e.stopPropagation());
  find.addEventListener('input', () => {
    const q = find.value.trim().toLowerCase();
    for (const r of list.children) {
      if (!r.dataset.keep) r.hidden = !!q && !(r.dataset.name || '').includes(q);
    }
  });
}

// The list, with a filter in its header: an app's palette runs to hundreds of
// names, and the one being tried is usually known by part of it.
function uiiRenderVars(body) {
  const vars = uiiPageVars(uiiState.all);
  const head = uiiEl('div', 'sec', 'Variables — type a value, Enter applies ', 'section-vars');
  const find = uiiEl('input', 'find', undefined, 'filter-vars');
  head.appendChild(find);
  const list = uiiEl('div', 'vrs', undefined, 'vars-list');
  for (const v of vars) list.appendChild(uiiVarRow(v));
  if (!vars.length) list.appendChild(uiiEl('div', 'vnone', 'No custom properties in the stylesheets this page lets us read.'));
  uiiFindBox(find, list);
  body.append(head, list);
  return vars.length;
}

// The palette as a panel mode: it needs no element, so it opens the panel on
// its own. The rule list is collected here — uiiVarApply reads it to find the
// rule that declares a variable, and with nothing pinned there is no info to
// carry it.
function uiiVarsPanel() {
  const S = uiiState, P = S.panel;
  if (!P) return;
  S.all = uiiAllRules();
  P.name.textContent = 'Variables';
  P.body.textContent = '';
  const n = uiiRenderVars(P.body);
  P.tag.textContent = n + (n === 1 ? ' var' : ' vars');
  uiiChangesBox(P.body);
  P.reset.hidden = !uiiVarEdits.size;
  P.root.classList.add('on');
}

// P, and the header button. Leaving the mode goes back to the pinned element
// when there is one, and closes the panel when there is not.
function uiiToggleVars() {
  const S = uiiState;
  if (!S.panel) return;
  uiiCloseVarList();
  S.varsMode = !S.varsMode;
  if (S.varsMode) uiiVarsPanel();
  else if (S.info) uiiRenderPanel(S.info);
  else S.panel.root.classList.remove('on');
}

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
  for (const v of vars) list.appendChild(uiiValueRow(v.name, v.value, (val) => uiiVarApply(v.name, val, info.el)).row);
  for (const p of props) list.appendChild(uiiValueRow(p.prop, p.value, (val) => uiiSet(info, p.prop, val)).row);
  list.appendChild(uiiAddPropRow(info));
  uiiFindBox(find, list);
  // Short enough to read at a glance, or an element already being worked on.
  wrap.open = vars.length + props.length <= 8 || !!uiiEditsFor(info.el, false);
  wrap.append(sum, list);
  body.appendChild(wrap);
}

/* ================= live editing: fields =================
   Design-tool style controls grouped in cards: number boxes (editnum.js), a
   weight dropdown, a text-align toggle, colour pickers (editcolor.js). All of
   them go through uiiSet. */

const UII_WEIGHTS = [[100, 'Thin'], [200, 'Extra Light'], [300, 'Light'], [400, 'Regular'],
  [500, 'Medium'], [600, 'Semibold'], [700, 'Bold'], [800, 'Extra Bold'], [900, 'Black']];

// Labelled field: <div.fld><span.lab>Size</span>{control}</div>. The label
// also names the pair for scripts: the field is "field-size", the control
// inside it "size" (see uiiEl — each name is written as id and data-ui).
function uiiFld(label, control) {
  const name = uiiSlug(label);
  const f = uiiEl('div', 'fld', undefined, 'field-' + name);
  const lab = uiiEl('span', 'lab', label);
  if (!control.id) { control.setAttribute('data-ui', name); control.id = name; }
  f.append(lab, control);
  return { f, lab };
}

function uiiTextField(info, label, prop) {
  const box = uiiEl('input', 'tf');
  box.spellcheck = false;
  box.value = uiiEditValue(info, prop);
  box.addEventListener('change', () => uiiSet(info, prop, box.value.trim()));
  box.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); box.blur(); } });
  return uiiFld(label, box).f;
}

function uiiWeightField(info) {
  const sel = uiiEl('select');
  for (const [n, name] of UII_WEIGHTS) sel.appendChild(new Option(name, String(n)));
  const sync = (v) => { sel.value = String(Math.round(parseFloat(v) / 100) * 100); };
  const fld = uiiNumField(info, 'Weight', 'font-weight', { units: null, step: 100, onSet: sync });
  const nf = fld.f.querySelector('.nf');
  nf.insertBefore(sel, nf.querySelector('.st'));
  sync(uiiEditValue(info, 'font-weight'));
  sel.addEventListener('change', () => { uiiSet(info, 'font-weight', sel.value); fld.set(sel.value); });
  return fld.f;
}

// Three-line glyph for the align buttons, lines pushed to the given side.
function uiiAlignIcon(a) {
  const w = [12, 8, 10];
  return '<svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor">'
    + w.map((wi, i) => '<rect x="' + (a === 'left' ? 2 : a === 'right' ? 14 - wi : 8 - wi / 2)
      + '" y="' + (1 + i * 4) + '" width="' + wi + '" height="1.5" rx=".75"/>').join('') + '</svg>';
}

function uiiAlignField(info) {
  const seg = uiiEl('span', 'seg');
  const now = uiiEditValue(info, 'text-align').replace('start', 'left').replace('end', 'right');
  for (const a of ['left', 'center', 'right']) {
    const b = uiiEl('button');
    b.type = 'button';
    b.title = 'text-align: ' + a;
    b.innerHTML = uiiAlignIcon(a);
    b.classList.toggle('on', now === a);
    b.addEventListener('click', () => {
      for (const o of seg.children) o.classList.toggle('on', o === b);
      uiiSet(info, 'text-align', a);
    });
    seg.appendChild(b);
  }
  return uiiFld('Align', seg).f;
}

function uiiCard(title, ...rows) {
  const c = uiiEl('div', 'card', undefined, 'card-' + uiiSlug(title));
  c.appendChild(uiiEl('div', 'ct', title));
  for (const r of rows) if (r) c.appendChild(r);
  return c;
}

// One grid row of fields: two (g2) or four (g4) columns.
function uiiPair(...fields) {
  const g = uiiEl('div', 'g' + fields.length);
  g.append(...fields);
  return g;
}

function uiiRenderEditRows(body, info) {
  uiiCloseVarList(); // its fields are about to be replaced
  const num = (label, props) => uiiNumField(info, label, props).f;
  body.append(
    uiiCard('Colour', uiiPair(uiiColorField(info, 'Background', 'background-color'), uiiColorField(info, 'Text', 'color'))),
    uiiCard('Size',
      uiiPair(num('Width', 'width'), num('Height', 'height')),
      uiiPair(num('Min width', 'min-width'), num('Min height', 'min-height'))),
    uiiCard('Spacing',
      uiiPair(num('Padding top ↑', 'padding-top'), num('Padding right →', 'padding-right'),
        num('Padding bottom ↓', 'padding-bottom'), num('Padding left ←', 'padding-left')),
      uiiPair(num('Margin top ↑', 'margin-top'), num('Margin right →', 'margin-right'),
        num('Margin bottom ↓', 'margin-bottom'), num('Margin left ←', 'margin-left'))),
    uiiCard('Typography',
      uiiTextField(info, 'Font', 'font-family'),
      uiiPair(num('Size', 'font-size'), num('Space', 'letter-spacing')),
      uiiPair(num('Line height', 'line-height'), uiiWeightField(info)),
      uiiAlignField(info)),
    uiiCard('Border',
      uiiTextField(info, 'Border', 'border'),
      uiiPair(num('Radius', 'border-radius'), uiiColorField(info, 'Colour', 'border-color'))));
  uiiPropsSection(body, info); // everything the cards above do not cover
}

/* ================= live editing: the words on screen =================
   The style fields change how a control looks; this one changes what it
   says. Retyping the label is how you find out whether a button survives a
   longer word, so the Text row in the panel is a box you can type into and
   the page follows every keystroke. Reset puts the original words back. */

// The text node holding most of an element's words. A node, not an element:
// writing to it leaves an icon, a badge or a nested <b> exactly where it was,
// where setting textContent would wipe them out.
function uiiMainTextNode(el) {
  const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let best = null, n;
  for (let i = 0; (n = walk.nextNode()) && i < 200; i++) {
    if (n.data.trim() && (!best || n.data.trim().length > best.data.trim().length)) best = n;
  }
  return best;
}

// What a form control says lives in .value, not in a child node.
function uiiValueEl(el) {
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' ? el : null;
}

function uiiSetText(info, value) {
  const el = info.el;
  const e = uiiEditsFor(el, true);
  const ve = uiiValueEl(el);
  if (!e.text) e.text = ve ? { el: ve, from: ve.value } : { node: info.textNode, from: info.textNode.data };
  // The node's own indentation is not part of the words: a <span> written
  // across two lines keeps the spaces that separate it from its neighbours.
  if (ve) ve.value = value;
  else {
    const pad = /^(\s*)[\s\S]*?(\s*)$/.exec(e.text.from);
    e.text.node.data = pad[1] + value + pad[2];
  }
  if (uiiState.panel) uiiState.panel.reset.hidden = false;
  uiiScheduleDraw();
}

// The Text row: a box, not a label, whenever there are words to retype.
function uiiTextContentField(info) {
  const ve = uiiValueEl(info.el);
  info.textNode = ve ? null : uiiMainTextNode(info.el);
  if (!ve && !info.textNode) return null;
  const row = uiiEl('div', 'row', undefined, 'row-text');
  row.appendChild(uiiEl('span', 'k', 'Text'));
  const box = uiiEl('textarea', 'txt', undefined, 'text-content');
  box.spellcheck = false;
  box.rows = 1;
  box.title = 'Type to change the words on screen — ↺ Reset puts them back';
  box.value = ve ? ve.value : info.textNode.data.trim();
  box.addEventListener('input', () => uiiSetText(info, box.value));
  row.appendChild(box);
  return row;
}

// Undo half of uiiSetText, for uiiResetOne.
function uiiRestoreText(e) {
  if (!e.text) return;
  if (e.text.el) e.text.el.value = e.text.from;
  else e.text.node.data = e.text.from;
}

/* ================= details panel =================
   Built once per mount inside the shadow root; re-rendered on every
   selection. Drag by the header; buttons copy text for the clipboard.
   Every control carries a name of its own, written as both id and data-ui,
   so a script driving the panel has something stable to aim at — the classes
   here are styling hooks and change with the layout. The ids are safe: the
   panel lives in a shadow root, so they cannot collide with the host page. */

function uiiEl(tag, cls, text, ui) {
  const d = document.createElement(tag);
  if (cls) d.className = cls;
  if (text !== undefined) d.textContent = text;
  if (ui) { d.setAttribute('data-ui', ui); d.id = ui; }
  return d;
}

// "Padding top ↑" → "padding-top": a data-ui name from a human label.
function uiiSlug(label) {
  return String(label).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function uiiBuildPanel(sh) {
  const S = uiiState;
  const p = uiiEl('div', 'panel', undefined, 'inspector-panel');
  const head = uiiEl('div', 'head', undefined, 'panel-head');
  const name = uiiEl('span', 'name', undefined, 'panel-name');
  const tag = uiiEl('span', 'tag', undefined, 'panel-tag');
  // Minimize folds the panel to its header so the page underneath shows;
  // the class lives on the panel, so a new selection stays folded.
  const fold = uiiEl('button', '', '—', 'minimize');
  fold.title = 'Minimize';
  // Normal view hides the overlay without closing the panel: the edits, the
  // Changes box and the pinned element all survive the look.
  const peek = uiiEl('button', '', '👁', 'normal-view');
  peek.title = 'Normal view — hide the overlay and use the page (V)';
  // The palette: the page's variables, editable with nothing pinned.
  const vars = uiiEl('button', '', '🎨', 'vars-mode');
  vars.title = 'Page variables — edit the palette without pinning anything (P)';
  const close = uiiEl('button', '', '✕', 'close-panel');
  close.title = 'Close panel (selection stays)';
  // Reset shows only once the element has an edit; ok flashes "copied".
  const reset = uiiEl('button', 'reset', '↺ Reset', 'reset-edits');
  reset.title = 'Undo every live edit on this element, and every variable edit';
  const ok = uiiEl('span', 'ok', '', 'copy-status');
  head.append(name, tag, ok, reset, vars, peek, fold, close);
  const body = uiiEl('div', 'body', undefined, 'panel-body');
  const grip = uiiEl('div', 'grip', undefined, 'resize-grip');
  grip.title = 'Drag to resize';
  p.append(grip, head, body);
  sh.appendChild(p);
  S.panel = { root: p, name, tag, body, ok, reset, peek };
  close.addEventListener('click', () => p.classList.remove('on'));
  peek.addEventListener('click', () => uiiPeek());
  vars.addEventListener('click', () => uiiToggleVars());
  fold.addEventListener('click', () => {
    const min = p.classList.toggle('min');
    fold.textContent = min ? '▢' : '—';
    fold.title = min ? 'Maximize' : 'Minimize';
  });
  reset.addEventListener('click', () => uiiResetEdits(S.varsMode ? null : S.info.el));
  uiiDrag(head, p);
  uiiResizeLeft(grip, p);
}

function uiiDrag(handle, box) {
  let sx = 0, sy = 0, ox = 0, oy = 0;
  const move = (e) => {
    box.style.left = Math.max(0, ox + e.clientX - sx) + 'px';
    box.style.top = Math.max(0, oy + e.clientY - sy) + 'px';
    box.style.right = 'auto';
  };
  // Capture phase: the overlay stops propagation of mouseup outside the panel,
  // and only same-node capture listeners still run after that.
  const up = () => { window.removeEventListener('mousemove', move, true); window.removeEventListener('mouseup', up, true); };
  handle.addEventListener('mousedown', (e) => {
    if (e.target.tagName === 'BUTTON') return;
    const r = box.getBoundingClientRect();
    sx = e.clientX; sy = e.clientY; ox = r.left; oy = r.top;
    window.addEventListener('mousemove', move, true);
    window.addEventListener('mouseup', up, true);
    e.preventDefault();
  });
}

// Drag the left edge to resize; the right edge stays put, as the panel sits
// at the right of the window. Same capture-listener pattern as uiiDrag.
function uiiResizeLeft(handle, box) {
  let sx = 0, sw = 0, right = 0;
  const move = (e) => {
    const w = Math.max(320, Math.min(window.innerWidth - 16, sw + sx - e.clientX));
    box.style.width = w + 'px';
    box.style.left = Math.max(0, right - w) + 'px';
    box.style.right = 'auto';
  };
  const up = () => { window.removeEventListener('mousemove', move, true); window.removeEventListener('mouseup', up, true); };
  handle.addEventListener('mousedown', (e) => {
    const r = box.getBoundingClientRect();
    sx = e.clientX; sw = r.width; right = r.right;
    window.addEventListener('mousemove', move, true);
    window.addEventListener('mouseup', up, true);
    e.preventDefault();
  });
}

// btn: the Copy button pressed, if any. It shows the result in its own
// place for 2s, then its label comes back.
function uiiCopy(text, btn) {
  const S = uiiState;
  // Both places: the panel's own line, and the badge for when C was pressed
  // with the panel closed.
  const say = (msg) => {
    if (btn) { uiiButtonSay(btn, msg); return; }
    uiiFlash(msg);
    if (S.panel) S.panel.ok.textContent = msg;
  };
  const done = () => {
    say('✅ copied');
    setTimeout(() => { if (S.panel) S.panel.ok.textContent = ''; }, 1200);
  };
  if (typeof S.opts.onCopy === 'function') { S.opts.onCopy(text); done(); return; }
  navigator.clipboard.writeText(text).then(done, () => say('⚠ clipboard blocked'));
}

function uiiButtonSay(btn, msg) {
  if (!btn.dataset.label) {
    btn.dataset.label = btn.textContent;
    btn.style.minWidth = btn.offsetWidth + 'px'; // no jump when the text is shorter
  }
  btn.textContent = msg;
  clearTimeout(btn.uiiTimer);
  btn.uiiTimer = setTimeout(() => {
    btn.textContent = btn.dataset.label;
    delete btn.dataset.label;
    btn.style.minWidth = '';
  }, 2000);
}

function uiiRow(k, v, swatchHex) {
  const row = uiiEl('div', 'row', undefined, 'row-' + uiiSlug(k));
  row.appendChild(uiiEl('span', 'k', k));
  const val = uiiEl('span', 'v');
  if (swatchHex && swatchHex !== 'transparent') {
    const sw = uiiEl('span', 'sw');
    const i = uiiEl('i');
    i.style.background = swatchHex;
    sw.appendChild(i);
    val.appendChild(sw);
  }
  val.appendChild(document.createTextNode(v));
  row.appendChild(val);
  return row;
}

function uiiRenderPanel(info) {
  const P = uiiState.panel;
  if (!P) return;
  uiiState.varsMode = false; // a selection is an element view, whatever was open
  P.name.textContent = info.name;
  P.tag.textContent = '<' + info.tag + '>';
  const b = P.body;
  b.textContent = '';
  const idHead = uiiEl('div', 'sec', 'Identity ', 'section-identity');
  const copyAI = uiiEl('button', 'mini', '📋 Copy ID', 'copy-id');
  copyAI.title = 'One line: name, selector, element, stylesheet rules';
  copyAI.addEventListener('click', () => uiiCopy(uiiFormatForAI(info), copyAI));
  idHead.appendChild(copyAI);
  b.appendChild(idHead);
  b.appendChild(uiiRow('Selector', info.path));
  if (info.id) b.appendChild(uiiRow('id', info.id));
  if (info.classes.length) b.appendChild(uiiRow('class', info.classes.join(' ')));
  const textRow = uiiTextContentField(info);
  if (textRow) b.appendChild(textRow);
  b.appendChild(uiiRow('Size', info.width + ' × ' + info.height + 'px · ' + info.display + ' · font ' + info.fontSize));


  // Where-to-edit and the matched-rule list live in the Copy buttons; the
  // Changes box names the one rule each edit touches.
  const stHead = uiiEl('div', 'sec', 'Style — type, ↑↓ or drag a label ', 'section-style');
  const sim = uiiEl('label', 'sim');
  const box = uiiEl('input', '', undefined, 'apply-to-similar');
  box.type = 'checkbox';
  box.checked = uiiState.similar;
  sim.title = 'Also edit the CSS rule itself, so every element it styles changes too';
  sim.append(box, document.createTextNode(' Apply to similar'));
  box.addEventListener('change', () => { uiiState.similar = box.checked; uiiSyncRules(); uiiRefreshChanges(); });
  stHead.appendChild(sim);
  b.appendChild(stHead);
  uiiRenderEditRows(b, info);

  uiiChangesBox(b);
  P.reset.hidden = !uiiEditsFor(info.el, false) && !uiiVarEdits.size;
  P.root.classList.add('on');
}

/* ================= keyboard =================
   The shortcut that opens and closes inspect mode, and every key that acts
   while it is on: Escape, the arrow walk, and the bare letters that stand in
   for panel buttons. Bound once by uiiInit, in capture phase, so the app
   underneath never sees a key the inspector has claimed. */

// "Mod+Shift+/" -> { mod, ctrl, meta, alt, shift, key }
function uiiParseShortcut(s) {
  if (!s) return null;
  const k = { mod: false, ctrl: false, meta: false, alt: false, shift: false, key: '' };
  for (const part of String(s).split('+')) {
    const p = part.trim().toLowerCase();
    if (p === 'mod') k.mod = true;
    else if (p === 'ctrl' || p === 'control') k.ctrl = true;
    else if (p === 'cmd' || p === 'meta' || p === 'command') k.meta = true;
    else if (p === 'alt' || p === 'option') k.alt = true;
    else if (p === 'shift') k.shift = true;
    else k.key = p;
  }
  return k;
}

function uiiKeyMatches(e, k) {
  if (!k) return false;
  const mac = /Mac|iPhone|iPad/.test(navigator.platform);
  const wantMeta = k.meta || (k.mod && mac);
  const wantCtrl = k.ctrl || (k.mod && !mac);
  if (e.metaKey !== wantMeta || e.ctrlKey !== wantCtrl) return false;
  if (e.altKey !== k.alt || e.shiftKey !== k.shift) return false;
  const key = (e.key || '').toLowerCase();
  const code = (e.code || '').toLowerCase();
  return key === k.key || code === k.key || code === 'key' + k.key || code === 'digit' + k.key;
}

function uiiInEditable(t) {
  return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
}

// Arrow keys walk the DOM from the pinned element, DevTools style.
function uiiWalk(dir) {
  const S = uiiState;
  const cur = S.selected;
  if (!cur) return;
  let next = null;
  if (dir === 'ArrowUp') next = cur.parentElement;
  else if (dir === 'ArrowDown') next = cur.firstElementChild;
  else if (dir === 'ArrowLeft') next = cur.previousElementSibling;
  else if (dir === 'ArrowRight') next = cur.nextElementSibling;
  if (next && next !== document.documentElement && next !== S.host) uiiSelect(next);
}

function uiiOnKey(e) {
  const S = uiiState;
  if (uiiKeyMatches(e, S.key)) {
    if (!S.on && uiiInEditable(e.target)) return; // leave the editor's own binding alone
    e.preventDefault();
    e.stopPropagation();
    uiiToggle();
    return;
  }
  if (!S.on) return;
  // Shadow DOM retargets e.target to S.host for anything inside the panel —
  // a focused button reports the same target as a focused text input. Use
  // composedPath() to find what was actually focused, so Escape/arrows still
  // work after clicking a panel button; only real text entry gets skipped.
  // A page field can still hold focus from before inspect mode opened, and
  // its typing must stay typing — C is a shortcut only outside a text box.
  // Esc still works from a panel box or a page field: while inspecting it
  // means "quit", so the page's own Esc (clear a search) must not take it.
  if (uiiInEditable(e.target) && e.key !== 'Escape') return;
  const box = e.target === S.host && uiiInEditable(e.composedPath()[0]) ? e.composedPath()[0] : null;
  if (box && e.key !== 'Escape') return;
  if (e.key === 'Escape') {
    e.preventDefault();
    e.stopPropagation();
    if (box) box.blur(); // fires 'change', so a typed value lands before quitting
    if (S.cvList) uiiCloseVarList(); else uiiDisable(); // first Escape closes an open var list
    return;
  }
  if (/^Arrow(Up|Down|Left|Right)$/.test(e.key) && S.selected) {
    e.preventDefault(); e.stopPropagation(); uiiWalk(e.key);
    return;
  }
  // Bare letters only: Cmd/Ctrl+C still copies whatever is selected, in the
  // panel or on the page. Each is a panel button without the reach — C the
  // Copy ID line, A the Changes box, V the Normal view toggle, P the page
  // variables.
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key.toLowerCase();
  if (k === 'c' && S.info) uiiKeyAction(e, () => uiiCopy(uiiFormatForAI(S.info)));
  else if (k === 'a') uiiKeyAction(e, uiiCopyChanges);
  else if (k === 'v') uiiKeyAction(e, uiiPeek);
  else if (k === 'p') uiiKeyAction(e, uiiToggleVars);
}

// A single-letter shortcut swallows its key, so the app underneath never
// sees it while inspect mode is on.
function uiiKeyAction(e, run) { e.preventDefault(); e.stopPropagation(); run(); }

/* ================= public API + keyboard =================
   UIInspector.init(opts) binds the shortcut; toggle()/enable()/disable()
   drive it by hand; destroy() removes everything including the shortcut. */

const UII_DEFAULTS = {
  shortcut: 'Mod+/',          // Mod = Cmd on macOS, Ctrl elsewhere; null = no key binding
  selectors: ['button', 'input', 'select', 'textarea', 'a', 'label', 'summary',
    'section', '[role]', '[id]', '[data-ui]', '[contenteditable]'],
  nameAttr: 'data-ui',        // attribute the app uses to label components
  // Attribute holding a source location the app stamped on the element, e.g.
  // "grid-rows.js:33". It is a location, not a name: it never enters the name
  // chain, and null turns the whole feature off.
  srcAttr: 'data-src',
  ignore: [],                 // selectors never outlined or selectable
  maxOutlines: 400,           // cap on outline boxes per frame
  // Time budget for ONE scan, in ms. This is a hard cap on the whole walk, not
  // only on how much it outlines, because reading a rect is the expensive half:
  // on a list whose rows opt into `content-visibility: auto` every
  // getBoundingClientRect() forces the layout that rule was skipping, so a
  // 56,000-element document measured ~3 ms PER ELEMENT — three minutes with the
  // renderer pinned and no key reaching the page. Anything left unscanned is
  // simply not outlined this frame; a scroll or a mutation reschedules the draw.
  maxScanMs: 120,
  scripts: null,              // (url) => bool: which <script src> to scan for the element; default skips vendor/
  onCopy: null,               // (text) => void; default navigator.clipboard
  onToggle: null,             // (on) => void
};

const uiiState = {
  similar: true,  // edits also rewrite the CSS rule (see editrules.js)
  opts: null, selList: '', on: false, bound: false,
  host: null, shadow: null, layer: null, hoverBox: null, selBox: null, tip: null,
  badge: null, scratch: null, panel: null, boxes: [], raf: 0, mo: null,
  hovered: null, selected: null, info: null, key: null, sources: null,
  mgBox: null, pdBox: null, spv: null, badgeTimer: 0, badgeHtml: '', peek: false,
  mx: 0, my: 0, pos: false,  // last pointer position, tracked while bound (see uiiTrackPointer)
};

// How long the hint at the top stays before it fades. It says what the keys
// do; once it has been read it is a strip across whatever sits under it.
const UII_BADGE_MS = 2000;

function uiiEnable() {
  const S = uiiState;
  if (S.on) return;
  S.on = true;
  uiiMount();
  uiiBindEvents();
  uiiDrawOutlines();
  uiiScriptIndex(); // warm the script scan; never rejects (each fetch catches)
  uiiOpenAtPointer();
  S.badgeTimer = setTimeout(() => { if (S.badge) S.badge.classList.add('off'); }, UII_BADGE_MS);
  if (typeof S.opts.onToggle === 'function') S.opts.onToggle(true);
}

function uiiDisable() {
  const S = uiiState;
  if (!S.on) return;
  S.on = false;
  clearTimeout(S.badgeTimer);
  uiiCloseVarList();
  uiiUnbindEvents();
  if (S.raf) cancelAnimationFrame(S.raf);
  clearTimeout(S.drawTimer); // a redraw waiting out uiiScheduleDraw's gap
  S.raf = 0;
  uiiUnmount();
  S.hovered = S.selected = S.info = null;
  S.peek = false;
  if (typeof S.opts.onToggle === 'function') S.opts.onToggle(false);
}

function uiiToggle() {
  if (uiiState.on) uiiDisable(); else uiiEnable();
}

function uiiInit(opts) {
  const S = uiiState;
  S.opts = Object.assign({}, UII_DEFAULTS, opts || {});
  S.selList = S.opts.selectors.join(',');
  S.key = uiiParseShortcut(S.opts.shortcut);
  if (!S.bound) {
    window.addEventListener('keydown', uiiOnKey, true);
    window.addEventListener('mousemove', uiiTrackPointer, { capture: true, passive: true });
    S.bound = true;
  }
  return uiiApi;
}

function uiiDestroy() {
  uiiDisable();
  if (uiiState.bound) {
    window.removeEventListener('keydown', uiiOnKey, true);
    window.removeEventListener('mousemove', uiiTrackPointer, true);
  }
  uiiState.bound = false;
}

const uiiApi = {
  init: uiiInit,
  enable: uiiEnable,
  disable: uiiDisable,
  toggle: uiiToggle,
  destroy: uiiDestroy,
  select: (el) => { uiiEnable(); uiiSelect(el); },
  info: () => uiiState.info,
  isOn: () => uiiState.on,
  formatForAI: uiiFormatForAI,
  formatDetails: uiiFormatDetails,
  isCovered: (el) => uiiOcclusion()(el, el.getBoundingClientRect()),
  editCount: uiiEditCount,
};

global.UIInspector = uiiApi;
if (typeof module !== 'undefined' && module.exports) module.exports = uiiApi;
})(typeof window !== 'undefined' ? window : globalThis);
