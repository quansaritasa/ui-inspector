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
    out.push({ name, value, hex: uiiRowHex(value) });
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
    uiiPickHold(pick);
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
  P.reset.disabled = !uiiVarEdits.size;
  P.root.classList.add('on');
}

// P, and the header button. Leaving the mode goes back to the pinned element
// when there is one, and closes the panel when there is not.
function uiiToggleVars() {
  const S = uiiState;
  if (!S.panel) return;
  uiiCloseVarList();
  S.varsMode = !S.varsMode;
  S.panel.vars.classList.toggle('on', S.varsMode);
  if (S.varsMode) uiiVarsPanel();
  else if (S.info) uiiRenderPanel(S.info);
  else S.panel.root.classList.remove('on');
}
