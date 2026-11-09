/* ================= the page's variables =================
   The palette without an element. Every custom property the sheets declare,
   the value it resolves to, and a box to try another one — for the question
   "what happens to the page if this token moves", which has no one element to
   click. Edits go through uiiVarApply, the same path the color fields use,
   so they show at once, land in the Changes box and come back with Reset. */

// [{name, value, hex}] — colors first, a swatch says more than a name; each
// group by name. A var only an inactive theme block sets (`.dark { --bg }`
// under the light theme) resolves to nothing here and is left out: there is
// no value to show and editing it would change nothing on screen.
function uiiPageVars(all) {
  const cs = getComputedStyle(document.documentElement);
  const out = [];
  for (const name of uiiVarNames(all)) {
    const value = cs.getPropertyValue(name).trim();
    if (!value) continue;
    out.push({ name, value, hex: uiiRowHex(value) });
  }
  return out.sort((a, b) => (a.hex ? 0 : 1) - (b.hex ? 0 : 1) || a.name.localeCompare(b.name));
}

// The hex of a value that is a color, '' when it is not one.
function uiiRowHex(value) {
  const rgb = value && value.length <= 40 ? uiiNormColor(value) : null; // shadows, font stacks: never a color
  return rgb ? uiiToHex(rgb) : '';
}

// One row of a value list: the name, a picker when the value is a color, and
// a box that writes through `set`. Edited rows carry .on, the mark the color
// list uses for the value in force. Shared by the palette and by the pinned
// element's own declarations (editprops.js).
function uiiValueRow(name, value, set, resetName) {
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
    // A color picker takes #rrggbb alone: an alpha value keeps its text box.
    wrap.appendChild(uiiColorSwatch(/^#[0-9a-f]{6}$/i.test(hex) ? hex : '#000000', write));
  }
  box.addEventListener('change', () => write(box.value.trim()));
  uiiEnterKeeps(box);
  wrap.appendChild(box);
  row.append(uiiEl('span', 'n', name), wrap);
  // A row that writes exactly one property or variable gets a key for it; a
  // composite label (a state rule's "selector · prop") names no single value,
  // so it passes null and goes without.
  if (resetName) row.insertBefore(uiiResetKey(resetName), row.firstChild);
  return { row, box };
}

function uiiVarRow(v) {
  const r = uiiValueRow(v.name, v.value, (val) => uiiVarApply(v.name, val, document.documentElement), v.name);
  // An edit made here or from a color field, before this list was built.
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
  const head = uiiEl('div', 'sec', 'Variables ', 'section-vars');
  const find = uiiEl('input', 'find', undefined, 'filter-vars');
  const copy = uiiEl('button', 'mini', '📋 Copy', 'copy-vars');
  copy.title = 'Copy every variable as a :root block, edits included';
  // Read at click time, so edits made since the list was built are in it.
  copy.addEventListener('click', (e) => {
    e.stopPropagation();
    const lines = uiiPageVars(uiiState.all).map((v) => `  ${v.name}: ${v.value};`);
    uiiCopy(`:root {\n${lines.join('\n')}\n}`, copy);
  });
  const imp = uiiEl('button', 'mini', '📥 Import', 'import-vars');
  imp.title = 'Apply --name: value pairs from the clipboard (one undo step)';
  imp.addEventListener('click', (e) => { e.stopPropagation(); uiiImportVars(); });
  head.append(find, copy, imp);
  const list = uiiEl('div', 'vrs', undefined, 'vars-list');
  for (const v of vars) list.appendChild(uiiVarRow(v));
  if (!vars.length) list.appendChild(uiiEl('div', 'vnone', 'No custom properties in the stylesheets this page lets us read.'));
  uiiFindBox(find, list);
  body.append(head, list);
  return vars.length;
}

/* States: the colors a rule only paints while a state holds — :hover,
   :focus, :disabled… The list above shows values in force now; these wait
   for a pointer or a key, so they are listed rule by rule, grouped by state.
   Editing one rewrites that rule, through the same records as a variable. */
const UII_STATES = [[':hover', /:hover/], [':focus', /:focus/], [':active', /:active/],
  [':disabled', /:disabled|\[disabled|\[aria-disabled/], [':read-only', /:read-only|\[readonly/],
  [':checked / selected', /:checked|\[aria-(checked|selected)/],
  [':invalid', /:(user-)?invalid|\[aria-invalid/], ['::placeholder', /::?placeholder/], [':visited', /:visited/]];
const UII_COLOR_PROP = /(^|-)color$|^(background|border(-(top|right|bottom|left))?|outline|fill|stroke|box-shadow|text-shadow)$/;

// [[label, [{style, prop, pri, value, file, selector}]]], empty groups left
// out. cssText, not the longhands: `background: var(--x)` leaves every
// longhand empty and only the shorthand says what the rule meant. A selector
// list naming two states lands in the first one.
function uiiStateDecls(all) {
  const groups = new Map(UII_STATES.map(([label]) => [label, []]));
  for (const { rule, file } of all) {
    const st = UII_STATES.find(([, re]) => re.test(rule.selectorText));
    if (!st) continue;
    for (const [, prop, raw] of rule.style.cssText.matchAll(/([\w-]+)\s*:\s*([^;]+)/g)) {
      const pri = /!important\s*$/.test(raw) ? 'important' : '';
      const value = raw.replace(/\s*!important\s*$/, '').trim();
      if (prop.startsWith('--') ? !uiiRowHex(value) : !UII_COLOR_PROP.test(prop)) continue;
      groups.get(st[0]).push({ style: rule.style, prop, pri, value, file, selector: rule.selectorText });
    }
  }
  return [...groups].filter(([, rows]) => rows.length);
}

function uiiRenderStates(body, all) {
  const groups = uiiStateDecls(all);
  const n = groups.reduce((s, [, rows]) => s + rows.length, 0);
  const wrap = uiiEl('details', 'more');
  const sum = uiiEl('summary', 'sec', 'States — ' + n + ' ', 'section-states');
  const find = uiiEl('input', 'find', undefined, 'filter-states');
  sum.appendChild(find);
  const list = uiiEl('div', 'vrs', undefined, 'states-list');
  let edited = false;
  for (const [label, rows] of groups) {
    list.appendChild(uiiEl('div', 'vgrp', label));
    for (const d of rows) {
      const key = uiiDeclKey(d.style, d.prop);
      const { row } = uiiValueRow(d.selector + ' · ' + d.prop, d.value, (val) => uiiDeclSet(key, val, () => ({
        style: d.style, prop: d.prop, pri: d.pri, file: d.file.split('/').pop(),
        selector: d.selector, from: d.value, add: false })));
      row.dataset.name += ' ' + label; // "hover" finds the whole group
      row.querySelector('.n').title = d.selector + ' { ' + d.prop + ' }'; // the name is cut short
      if (uiiVarEdits.has(key)) { row.classList.add('on'); edited = true; }
      list.appendChild(row);
    }
  }
  if (!n) list.appendChild(uiiEl('div', 'vnone', 'No color rules for hover, focus, disabled… in the stylesheets this page lets us read.'));
  uiiFindBox(find, list);
  wrap.open = n <= 12 || edited;
  wrap.append(sum, list);
  body.appendChild(wrap);
}

// The other half of Copy: any text holding `--name: value` pairs — a :root
// block, a bare list, one line — lands as one undo step. The clipboard read
// can be refused (permission, plain http): a prompt takes the paste instead.
async function uiiImportVars() {
  let text = null;
  try { text = await navigator.clipboard.readText(); } catch (_) { /* refused */ }
  if (!text || !text.includes('--')) text = prompt('Paste the palette (--name: value; …)');
  if (!text) return;
  const pairs = [...text.matchAll(/(--[\w-]+)\s*:\s*([^;}]+)/g)];
  if (!pairs.length) { uiiFlash('No --variables found'); return; }
  uiiUndoBegin();
  try { for (const [, name, value] of pairs) uiiVarApply(name, value.trim(), document.documentElement); }
  finally { uiiUndoEnd(); }
  if (uiiState.varsMode) uiiVarsPanel();
  uiiFlash('✅ imported ' + pairs.length + (pairs.length === 1 ? ' var' : ' vars'));
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
  uiiRenderStates(P.body, S.all);
  uiiChangesBox(P.body);
  P.reset.disabled = !uiiVarEdits.size;
  P.root.classList.add('on');
}

// P, and the header button. Leaving the mode goes back to the pinned element
// when there is one, and closes the panel when there is not.
function uiiToggleVars() {
  const S = uiiState;
  if (!S.panel) return;
  uiiCloseVarList();
  uiiCloseColorPicker();
  uiiHoldPanelSize(S.panel.root);
  S.varsMode = !S.varsMode;
  S.panel.vars.classList.toggle('on', S.varsMode);
  if (S.varsMode) {
    uiiVarsPanel();
    // Only on the switch: uiiVarsPanel also re-renders after undo/reset.
    S.panel.body.querySelector('input.find').focus();
  } else if (S.info) uiiRenderPanel(S.info);
  else S.panel.root.classList.remove('on');
}
