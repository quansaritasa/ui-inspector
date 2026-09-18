/* ================= live editing =================
   Each editable row writes straight to the pinned element's inline style, so
   a tweak shows on screen at once. Edits are remembered per element so Reset
   can put the original style attribute back, and so the Copy buttons can
   tell an AI what was changed. */

// [label, css property, kind] — kind 'color' adds a colour picker.
const UII_EDITABLE = [
  ['Background', 'background-color', 'color'],
  ['Text', 'color', 'color'],
  ['Font', 'font-family', 'text'],
  ['Size', 'font-size', 'text'],
  ['Line height', 'line-height', 'text'],
  ['Weight', 'font-weight', 'text'],
  ['Padding', 'padding', 'text'],
  ['Margin', 'margin', 'text'],
  ['Border', 'border', 'text'],
  ['Radius', 'border-radius', 'text'],
];

function uiiEditsFor(el, create) {
  const S = uiiState;
  if (!S.edits) S.edits = new Map();
  let e = S.edits.get(el);
  if (!e && create) {
    e = { orig: el.getAttribute('style'), props: {} };
    S.edits.set(el, e);
  }
  return e || null;
}

function uiiApplyEdit(el, prop, value) {
  const e = uiiEditsFor(el, true);
  e.props[prop] = value;
  el.style.setProperty(prop, value);
  if (uiiState.panel) uiiState.panel.reset.hidden = false;
  uiiScheduleDraw();
}

function uiiResetEdits(el) {
  const e = uiiEditsFor(el, false);
  if (!e) return;
  if (e.orig === null) el.removeAttribute('style'); else el.setAttribute('style', e.orig);
  uiiState.edits.delete(el);
  uiiSelect(el);
}

// "font-size: 14px; color: #fff" or '' when the element is untouched.
function uiiEditsText(el) {
  const e = uiiEditsFor(el, false);
  if (!e) return '';
  return Object.entries(e.props).map(([k, v]) => k + ': ' + v).join('; ');
}

// Current value shown in the box: the edit if there is one, else computed.
function uiiEditValue(info, prop) {
  const e = uiiEditsFor(info.el, false);
  if (e && prop in e.props) return e.props[prop];
  const cs = getComputedStyle(info.el);
  if (prop === 'background-color') return info.bg.hex;
  if (prop === 'color') return info.color.hex;
  if (prop === 'border') return info.border === 'none' ? 'none' : info.border;
  return cs.getPropertyValue(prop);
}

function uiiEditRow(info, label, prop, kind) {
  const row = uiiEl('div', 'row');
  row.appendChild(uiiEl('span', 'k', label));
  const v = uiiEl('span', 'v edit');
  const value = uiiEditValue(info, prop);
  const box = uiiEl('input', 'in');
  box.type = 'text';
  box.value = value;
  box.spellcheck = false;
  if (kind === 'color') {
    const pick = uiiEl('input', 'pick');
    pick.type = 'color';
    if (/^#[0-9a-f]{6}$/i.test(value)) pick.value = value;
    pick.addEventListener('input', () => { box.value = pick.value; uiiApplyEdit(info.el, prop, pick.value); });
    v.appendChild(pick);
  }
  box.addEventListener('change', () => uiiApplyEdit(info.el, prop, box.value.trim()));
  box.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); box.blur(); } });
  v.appendChild(box);
  const c = info[prop === 'background-color' ? 'bg' : prop === 'color' ? 'color' : ''];
  if (c && c.vars && c.vars.length) v.appendChild(uiiEl('span', 'var', c.vars.join(' ')));
  row.appendChild(v);
  return row;
}

function uiiRenderEditRows(body, info) {
  for (const [label, prop, kind] of UII_EDITABLE) body.appendChild(uiiEditRow(info, label, prop, kind));
}
