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

// Selector path up to the nearest ancestor with an id (or <body>), so it is
// short but still unique enough to grep for.
function uiiPath(el) {
  const segs = [];
  let n = el;
  while (n && n !== document.body && segs.length < 6) {
    segs.unshift(uiiSegment(n));
    if (n.id) break;
    n = n.parentElement;
  }
  return segs.join(' > ');
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
  const varMap = uiiColorVarMap(el, all);
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
  };
}
