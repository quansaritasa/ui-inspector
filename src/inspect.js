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
function uiiPath(el) {
  const own = uiiSegment(el);
  // An id on the element is already unique and already short.
  if (el.id) return own;
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
    all, // every stylesheet rule, reused for the text children's lookups
  };
}
