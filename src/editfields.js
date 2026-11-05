/* ================= live editing: fields =================
   Design-tool style controls grouped in cards: number boxes (editnum.js), a
   weight dropdown, a text-align toggle, colour pickers. All of them go through uiiSet. */

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

// Shorthands that can carry a colour: CSSOM leaves the longhand empty when
// the shorthand holds a var(), so the var has to be read off the shorthand.
const UII_COLOR_SHORTHAND = { 'background-color': 'background', 'border-color': 'border' };

// The variable this colour comes from, '' when it is written out in full.
function uiiColorVarOf(el, prop) {
  const d = uiiRuleDecl(el, prop);
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
  const sel = uiiEl('select', 'cv');
  sel.title = 'Which variable this colour comes from. Pick one and the swatch'
    + ' edits the variable itself — every element using it changes.';
  sel.appendChild(new Option('— none —', ''));
  for (const c of info.colorVars) sel.appendChild(new Option(c.name + ' ' + c.hex, c.name));
  const named = uiiColorVarOf(target, prop);
  // A var the palette list missed (it resolves to something uiiColorVars does
  // not read as a colour) still belongs in the box: it is the current answer.
  if (named && ![...sel.options].some((o) => o.value === named)) sel.appendChild(new Option(named, named));
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

function uiiPair(a, b) {
  const g = uiiEl('div', 'g2');
  g.append(a, b);
  return g;
}

function uiiRenderEditRows(body, info) {
  const num = (label, props) => uiiNumField(info, label, props).f;
  body.append(
    uiiCard('Colour', uiiPair(uiiColorField(info, 'Background', 'background-color'), uiiColorField(info, 'Text', 'color'))),
    uiiCard('Size',
      uiiPair(num('Width', 'width'), num('Height', 'height')),
      uiiPair(num('Min W', 'min-width'), num('Min H', 'min-height'))),
    uiiCard('Typography',
      uiiTextField(info, 'Font', 'font-family'),
      uiiPair(num('Size', 'font-size'), num('Space', 'letter-spacing')),
      uiiPair(num('Line height', 'line-height'), uiiWeightField(info)),
      uiiAlignField(info)),
    uiiCard('Spacing',
      uiiPair(num('Padding ↕', ['padding-top', 'padding-bottom']), num('Padding ↔', ['padding-left', 'padding-right'])),
      uiiPair(num('Margin ↕', ['margin-top', 'margin-bottom']), num('Margin ↔', ['margin-left', 'margin-right']))),
    uiiCard('Border',
      uiiTextField(info, 'Border', 'border'),
      uiiPair(num('Radius', 'border-radius'), uiiColorField(info, 'Colour', 'border-color'))));
}
