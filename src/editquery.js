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
function uiiEditValue(info, prop, own) {
  const el = own ? info.el : uiiTargetEl(info, prop);
  const e = uiiEditsFor(el, false);
  if (e && prop in e.props) return e.props[prop];
  // A text edit on a child with no rule of its own lands on the pinned
  // element and reaches the text by inheritance (uiiWriteEl): the field shows
  // the value that was written, not the px it computes to.
  // (not when the text has a rule of its own: the edit never reaches it)
  const h = !own && el !== info.el && !uiiOwnsProp(info, el, prop) && uiiEditsFor(info.el, false);
  if (h && prop in h.props) return h.props[prop];
  if (prop === 'background-color') return info.bg.hex;
  if (prop === 'color') return el === info.el ? info.color.hex : uiiToHex(getComputedStyle(el).color);
  // One picker sets all four sides; it shows the first one that draws.
  if (prop === 'border-color') return uiiToHex(getComputedStyle(el).getPropertyValue('border-' + uiiBorderSide(el) + '-color'));
  const fx = uiiFormula(el, prop);
  if (fx) return uiiVarCalc(fx.name, fx.k);
  return uiiAuthored(el, prop) || getComputedStyle(el).getPropertyValue(prop).trim();
}

