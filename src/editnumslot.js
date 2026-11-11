/* ================= live editing: own value vs what the text shows =================
   Text properties (font-size, line-height, letter-spacing) are read off the
   element that draws the text, which can differ from the pinned one: a child
   with a rule of its own overrides it. Then the field of the pinned element's
   own value gets a compact ↳ row under it for the value on screen, as the
   Color card does. Editing either refreshes the other. */

// Refresh callbacks of the fields that show one value from two angles.
function uiiSyncReset() { if (uiiState.panel) uiiState.panel.synced = []; }
function uiiSyncAdd(fn) { const P = uiiState.panel; if (P && P.synced) P.synced.push(fn); }
function uiiSyncOthers(self) {
  const P = uiiState.panel;
  if (P && P.synced) for (const r of P.synced) if (r !== self) r();
}

// Called by uiiNumField for the pair's two halves.
function uiiNumSync(c, val) {
  if (!c.opt.own && !c.opt.compact) return;
  const refresh = () => { c.show(val(c.props[0])); c.pxNote(); };
  uiiSyncAdd(refresh);
  c.others = () => uiiSyncOthers(refresh);
}

// The ↑ row: just the control, no label, reset key or source line.
function uiiNumCompact(wrap, c) {
  c.pxNote = () => {};
  wrap.prepend(uiiEl('span', 'os', '↳'));
  wrap.title = 'On screen';
  return { f: wrap, set: c.show };
}

// A text number field; when the text shows another value than the pinned
// element sets, the own field plus the on-screen row.
function uiiNumSlot(info, label, props) {
  const first = [].concat(props)[0];
  const text = uiiTargetEl(info, first);
  const diff = text !== info.el && UII_TEXT_PROPS.includes(first)
    && getComputedStyle(info.el).getPropertyValue(first) !== getComputedStyle(text).getPropertyValue(first);
  if (!diff) return uiiNumField(info, label, props).f;
  const f = uiiNumField(info, label, props, { own: true }).f;
  f.appendChild(uiiNumField(info, label, props, { compact: true }).f);
  uiiMarkOverridden(f);
  return f;
}
