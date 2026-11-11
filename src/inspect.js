/* ================= element facts =================
   Turns one DOM element into a plain object the panel renders and the
   "Copy for AI" text serialises. No DOM is touched here. */

// Which outline color an element gets. Order matters: a <button role="tab">
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
// ".a.b" from the element's first two classes, or ''.
function uiiClassSel(el) {
  const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/).filter(Boolean) : [];
  return cls.slice(0, 2).map((c) => '.' + CSS.escape(c)).join('');
}

// Selector for a rule the AI must create: the classes when there are any —
// a minted id would tie the new CSS to a name that changes with a label.
function uiiNewRuleSel(el) {
  return (el.id && uiiClassSel(el)) || uiiPath(el);
}

function uiiPath(el) {
  const own = uiiSegment(el);
  // An id is unique but often minted at runtime, so nothing in the source
  // greps for it; the element's own classes do, in the JS and the CSS alike.
  if (el.id) return own + uiiClassSel(el);
  const anchor = uiiAnchor(el);
  if (!anchor) return own;
  return anchor.up > 0 ? anchor.seg + ' > … > ' + own : anchor.seg + ' > ' + own;
}

// Walk up until something actually paints a background.
function uiiEffectiveBg(el) {
  let n = el;
  while (n && n !== document.documentElement) {
    const v = getComputedStyle(n).backgroundColor;
    if (!uiiIsTransparent(v)) return { rgb: v, from: n === el ? null : uiiSegment(n), el: n };
    n = n.parentElement;
  }
  const v = getComputedStyle(document.documentElement).backgroundColor;
  return { rgb: uiiIsTransparent(v) ? 'transparent' : v, from: 'html', el: document.documentElement };
}

// The :hover / :active rules that paint a background, read once per collect.
function uiiHoverBgDecls(all) {
  const out = [];
  for (const { rule } of all) {
    if (!/:(hover|active)/.test(rule.selectorText)) continue;
    const m = /(?:^|;)\s*background(?:-color)?\s*:\s*([^;]+)/.exec(rule.style.cssText);
    if (m) out.push({ rule, value: m[1].replace(/\s*!important\s*$/, '').trim() });
  }
  return out;
}

// Those among them that apply to el. A member's `:hover`/`:active` taken out is
// what el matches while the pointer is elsewhere; `state` is which one it
// waits for (`:active` wins when both are named) and `now` whether the pointer
// makes it apply this moment. A member with `:not(:hover)` is a resting rule.
function uiiHoverBgRules(el, decls) {
  const out = [];
  for (const d of decls) {
    for (const part of uiiSplitSelectors(d.rule.selectorText)) {
      const s = part.trim();
      if (!/:(hover|active)/.test(s) || /:not\(:(hover|active)/.test(s)) continue;
      let hit = false, now = false;
      try { hit = el.matches(s.replace(/:(hover|active)/g, '') || '*'); now = el.matches(s); } catch (e) { continue; }
      if (hit) { out.push({ ...d, now, state: s.includes(':active') ? 'active' : 'hover' }); break; }
    }
  }
  return out;
}

// Run fn with the pointer's :hover background rules blanked, so the cascade
// reads as it does with the pointer elsewhere: while it is over el, the element
// that paints the background (el or an ancestor) wins with its :hover color.
// Synchronous, rules put back at once: nothing repaints in between.
function uiiAtRest(el, decls, fn) {
  const live = new Set();
  for (let n = el; n; n = n.parentElement) uiiHoverBgRules(n, decls).forEach((h) => h.now && live.add(h.rule));
  if (!live.size) return fn();
  const saved = [...live].map((r) => [r, r.style.cssText]);
  try {
    live.forEach((r) => { r.style.cssText = ''; });
    return fn();
  } finally {
    saved.forEach(([r, t]) => { r.style.cssText = t; });
  }
}

// What each pointer state paints, as {hover, active} color records (a state
// that paints nothing, or the resting color, is left out).
function uiiStateBgInfo(painter, decls, resting, varMap) {
  const rules = uiiHoverBgRules(painter, decls);
  const out = {};
  for (const state of ['hover', 'active']) {
    const last = rules.filter((h) => h.state === state).pop();
    if (!last) continue;
    const info = uiiColorInfo(uiiNormColor(last.value) || last.value, null, varMap);
    if (info.hex === resting.hex) continue;
    info.selector = last.rule.selectorText;
    out[state] = info;
  }
  return out;
}

function uiiColorInfo(rgb, from, varMap) {
  const hex = uiiToHex(rgb);
  return { hex, rgb, from: from || null, vars: varMap.get(hex) || [] };
}

function uiiCollect(el) {
  const cs = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  const all = uiiAllRules();
  const colorVars = uiiColorVars(el, all);
  const varMap = uiiColorVarMap(colorVars);
  const hoverDecls = uiiHoverBgDecls(all);
  const bg = uiiAtRest(el, hoverDecls, () => uiiEffectiveBg(el));
  const bgInfo = Object.assign(uiiColorInfo(bg.rgb, bg.from, varMap), { el: bg.el });
  return {
    el,
    hoverDecls,
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
    bg: bgInfo,
    bgStates: uiiStateBgInfo(bg.el, hoverDecls, bgInfo, varMap),
    color: uiiColorInfo(cs.color, null, varMap),
    fontFamily: uiiFirstFont(cs.fontFamily),
    fontFamilyFull: cs.fontFamily,
    fontSize: cs.fontSize,
    fontWeight: cs.fontWeight,
    lineHeight: cs.lineHeight,
    padding: cs.padding,
    margin: cs.margin,
    border: uiiBorderSides(el).length ? uiiBorderText(el) : 'none',
    borderRadius: cs.borderRadius,
    display: cs.display,
    rules: uiiMatchedRules(el, all).slice(-30),
    colorVars, // the palette the color fields offer (cssvars.js)
    all, // every stylesheet rule, reused for the text children's lookups
  };
}
