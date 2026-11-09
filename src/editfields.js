/* ================= live editing: fields =================
   Design-tool style controls grouped in cards: number boxes (editnum.js), a
   weight dropdown, a text-align toggle, color pickers (editcolor.js). All of
   them go through uiiSet. */

const UII_WEIGHTS = [[100, 'Thin'], [200, 'Extra Light'], [300, 'Light'], [400, 'Regular'],
  [500, 'Medium'], [600, 'Semibold'], [700, 'Bold'], [800, 'Extra Bold'], [900, 'Black']];

// Labelled field: <div.fld><span.lab>Size</span>{control}</div>. The label
// also names the pair for scripts: the field is "field-size", the control
// inside it "size" (see uiiEl — each name is written as id and data-ui).
// Shorthands a longhand can hide in, so "padding-top" finds `padding: 1px 8px`.
const UII_SHORTHAND = { 'background-color': ['background'], 'font-size': ['font'], 'line-height': ['font'],
  'font-weight': ['font'], 'font-family': ['font'] };
for (const side of ['top', 'right', 'bottom', 'left']) {
  UII_SHORTHAND['padding-' + side] = ['padding'];
  UII_SHORTHAND['margin-' + side] = ['margin'];
  for (const k of ['width', 'style']) UII_SHORTHAND['border-' + side + '-' + k] = ['border-' + side, 'border', 'border-' + k];
}

// How the page's CSS writes `prop` on `el`: the last matched rule that sets it,
// longhand or shorthand, as { code: 'font-size: 0.9rem', src: 'file.css .sel' }.
// null when no rule does (inherited, a default, or only inline). The panel
// shows the computed result; this is the source behind it.
function uiiDeclared(el, prop) {
  const heads = [prop, ...(UII_SHORTHAND[prop] || [])];
  if (prop === 'border-color') {
    const side = 'border-' + uiiBorderSide(el);
    heads.push('border', side + '-color', side);
  }
  const rules = uiiRulesOf(el);
  for (let i = rules.length - 1; i >= 0; i--) {
    if (!rules[i].style) continue;
    for (const h of heads) {
      const v = uiiDeclValue(rules[i].style, h);
      if (v) return { code: h + ': ' + v, src: (rules[i].file || '').split('/').pop() + ' ' + rules[i].selector };
    }
  }
  return null;
}

// `el` (optional) is the element the field speaks for: its source line goes
// under the control.
function uiiFld(label, control, props, el) {
  const name = uiiSlug(label);
  const f = uiiEl('div', 'fld', undefined, 'field-' + name);
  const lab = uiiEl('span', 'lab', label);
  if (!control.id) { control.setAttribute('data-ui', name); control.id = name; }
  if (props) {
    // The label and its ↺ share a line: the key leads the label, and the label
    // keeps its own box because that is what scrubs and what a px note
    // rewrites (uiiNumField). One line either way, so nothing shifts when a
    // value is edited and the key lights up.
    const lw = uiiEl('div', 'lw');
    lw.append(uiiResetKey([].concat(props).join(',')), lab);
    f.append(lw, control);
  } else f.append(lab, control);
  const fm = el && props && uiiDeclared(el, [].concat(props)[0]);
  // Unless the control already spells it out (the border and font-family boxes).
  if (fm && fm.code.slice(fm.code.indexOf(': ') + 2) !== control.value) {
    const line = f.appendChild(uiiEl('div', 'fml', fm.code));
    line.title = fm.src;
  }
  return { f, lab };
}

// The ↺ that leads a control: put back the one value that control writes.
// Dim until that value is actually changed — an always-live key reads as an
// action worth taking on every untouched row.
function uiiResetKey(name) {
  const b = uiiEl('button', 'rs', '↺');
  b.type = 'button';
  b.dataset.prop = name;
  b.setAttribute('data-ui', 'reset-' + uiiSlug(name));
  b.title = 'Reset ' + name + ' — put back what the page had';
  b.disabled = true;
  // A press here must not also start the label's scrub drag or reach the tree.
  b.addEventListener('mousedown', (e) => e.stopPropagation());
  b.addEventListener('click', (e) => { e.stopPropagation(); uiiResetValue(name); });
  return b;
}

// Enter commits and the box keeps focus. Browsers fire `change` on Enter in a
// text box on their own (as long as keydown is not cancelled); the keyup then
// selects the text so the next typing replaces it.
function uiiEnterKeeps(box) {
  box.addEventListener('keyup', (e) => { if (e.key === 'Enter') box.select(); });
}

function uiiTextField(info, label, prop) {
  const box = uiiEl('input', 'tf');
  box.spellcheck = false;
  box.value = uiiEditValue(info, prop);
  box.addEventListener('change', () => uiiSet(info, prop, box.value.trim()));
  uiiEnterKeeps(box);
  return uiiFld(label, box, prop, uiiTargetEl(info, prop)).f;
}

// Border = three parts and the line they add up to. Width and style write the
// sides that draw (all four when none or all do); color is its own field. The
// Border box is the whole value, to copy or to type over: it rebuilds the card.
const UII_BORDER_STYLES = ['none', 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset', 'hidden'];
function uiiBorderCard(info) {
  const el = uiiTargetEl(info, 'border');
  const sides = uiiBorderSides(el);
  const part = sides.length && sides.length < 4 ? sides : ['top', 'right', 'bottom', 'left'];
  const props = (k) => part.map((s) => 'border-' + s + '-' + k);
  const side = 'border-' + uiiBorderSide(el);
  const sel = uiiVarPicker(UII_BORDER_STYLES, el, 'line');
  sel.classList.add('pl');
  sel.value = getComputedStyle(el).getPropertyValue(side + '-style');
  const selWrap = uiiEl('span', 'nf');
  selWrap.appendChild(sel);
  sel.addEventListener('change', () => { for (const p of props('style')) uiiSet(info, p, sel.value); });
  const box = uiiEl('input', 'tf');
  box.spellcheck = false;
  const sync = () => {
    box.value = uiiBorderText(el);
    box.title = sides.length && sides.length < 4 ? 'Only the ' + sides.join(', ') + ' side draws; this reads that one.' : '';
  };
  sync();
  box.addEventListener('change', () => {
    const typed = box.value.trim(); // before the resets below refresh this box
    // The shorthand speaks for every side: longhand edits made before it are void.
    const sides = ['top', 'right', 'bottom', 'left'], e = uiiEditsFor(el, false);
    for (const p of ['border-color'].concat(...sides.map((x) => ['width', 'style', 'color'].map((k) => 'border-' + x + '-' + k))))
      if (e && p in e.props) uiiResetProp(el, p);
    uiiSet(uiiState.info, 'border', typed);
    const old = uiiState.panel.borderCard;
    uiiCloseColorPicker();
    const fresh = uiiBorderCard(uiiState.info);
    old.replaceWith(fresh);
    fresh.querySelector('.tf').focus();
  });
  uiiEnterKeeps(box);
  const card = uiiCard('Border',
    uiiFld('Border', box, 'border', el).f,
    uiiPair(uiiNumField(info, 'Border width', props('width')).f, uiiFld('Border style', selWrap, props('style'), el).f),
    uiiPair(uiiNumField(info, 'Radius', 'border-radius').f, uiiColorField(info, 'Color', 'border-color')));
  uiiState.panel.borderCard = card;
  uiiState.panel.borderSync = sync;
  return card;
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
  return uiiFld('Align', seg, 'text-align', uiiTargetEl(info, 'text-align')).f;
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
  uiiCloseColorPicker();
  const num = (label, props) => uiiNumField(info, label, props).f;
  body.append(
    uiiCard('Color', uiiPair(uiiColorField(info, 'Text', 'color'), uiiColorField(info, 'Background', 'background-color'))),
    uiiBorderCard(info),
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
      uiiAlignField(info)));
  uiiPropsSection(body, info); // everything the cards above do not cover
}
