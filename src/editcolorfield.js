/* ================= live editing: the Color card =================
   Text and Background are the colors this element sets. When what is drawn
   on screen differs (a child's text color, the ancestor that paints through a
   transparent background) it follows as a compact ↳ row under the field, no
   label or source line. Editing one refreshes the others. */

// A color either sits on the element (#1f2937) or comes from a variable
// (var(--bg)). The dropdown says which, and the picker edits whatever the
// dropdown points at: on a variable it moves that palette entry, so every
// rule using it follows; on "— none —" the element gets a color of its own
// again. Pointing a color at a different variable is the dropdown alone.
// `own`: the pinned element's own value; else the one painted on screen, as
// the bare ↳ row (`compact`) when it sits under the own field.
function uiiColorField(info, label, prop, own, compact) {
  const painter = !own && prop === 'background-color' && info.bg.from && info.bg.el;
  const target = own ? info.el : painter || uiiTargetEl(info, prop);
  const put = (v) => (own ? uiiSetOwn(info.el, prop, v) : uiiSet(info, prop, v));
  const cur = () => {
    // On screen: read live, an edit elsewhere may or may not reach this element.
    if (!own && prop === 'background-color') return uiiToHex(uiiEffectiveBg(info.el).rgb);
    if (!own && prop === 'color') return uiiToHex(getComputedStyle(target).color);
    if (!own) return uiiEditValue(info, prop);
    const e = uiiEditsFor(info.el, false);
    return e && prop in e.props ? e.props[prop] : uiiToHex(getComputedStyle(info.el).getPropertyValue(prop));
  };
  const wrap = uiiEl('span', 'nf');
  const pick = uiiColorSwatch('#000000', (v) => write(v), UII_PAIR_SLOT[prop], () => uiiDeclared(target, prop)); // write is defined below, used on click
  const box = uiiEl('input');
  box.spellcheck = false;
  const named = uiiColorVarOf(target, prop);
  const names = info.colorVars.map((c) => c.name);
  // A var the palette list missed (it resolves to something uiiColorVars does
  // not read as a color) still belongs in the list: it is the current answer.
  if (named && !names.includes(named)) names.push(named);
  const sel = uiiVarPicker(names, target);
  if (painter) wrap.title = 'Painted by ' + info.bg.from + ' (this element is transparent)';
  sel.title = 'Which variable this color comes from. Pick one and the swatch'
    + ' edits the variable itself — every element using it changes.';
  sel.value = named;
  const show = (v) => { box.value = v; if (/^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/i.test(v)) pick.value = v; };
  const refresh = () => show(sel.value ? uiiVarHex(info, sel.value, target) : cur());
  refresh();
  if (prop !== 'border-color') uiiSyncAdd(refresh);
  const others = () => uiiSyncOthers(refresh);
  // One write, two places it can land.
  const write = (v) => {
    if (sel.value) uiiVarApply(sel.value, v, target); else put(v);
    show(v);
    others();
  };
  box.addEventListener('change', () => write(box.value.trim()));
  uiiLiveColor(box, write);
  uiiEnterKeeps(box);
  sel.addEventListener('change', () => {
    put(sel.value ? 'var(' + sel.value + ')' : box.value.trim());
    if (sel.value) show(uiiVarHex(info, sel.value, target));
    others();
  });
  if (compact) wrap.append(uiiEl('span', 'os', '↳'));
  wrap.append(pick, box, sel);
  if (compact) return wrap;
  // No side draws a line: the color is real but invisible. Still editable.
  if (prop === 'border-color' && !uiiBorderDrawnSide(target)) {
    wrap.classList.add('idle');
    wrap.title = 'No border is drawn (style none or width 0), so this color is not visible yet';
  }
  return uiiFld(label, wrap, prop, target).f;
}

// One slot: the own field, and the on-screen row under it only when it differs.
function uiiColorSlot(info, label, prop, same) {
  const f = uiiColorField(info, label, prop, true);
  if (!same) {
    f.appendChild(uiiColorField(info, label, prop, false, true)).title = 'On screen';
    uiiMarkOverridden(f);
  }
  return f;
}

function uiiColorCard(info) {
  uiiSyncReset();
  const text = uiiTargetEl(info, 'color');
  return uiiCard('Color', uiiPair(
    uiiColorSlot(info, 'Text', 'color', getComputedStyle(info.el).color === getComputedStyle(text).color),
    uiiColorSlot(info, 'Background', 'background-color', !info.bg.from)));
}
