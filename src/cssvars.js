/* ================= stylesheet lookups =================
   Two things the computed style cannot tell you: which --custom-property a
   colour came from, and which selectors put it there. Both are recovered by
   walking document.styleSheets — cross-origin sheets throw on .cssRules and
   are skipped. Runs only on click, so a few hundred rules is fine. */

// A sheet's name as an AI should read it: the file, not where the page is
// served from. Every same-origin sheet is the app's own, and
// "localhost:8765/style.css" spends thirteen characters saying where the
// reader already is — "style.css" is the string to grep. A cross-origin sheet
// keeps its host and drops everything else: "photoswipe.css" alone would not
// say which CDN served it, and the folders in front of it say nothing.
function uiiSheetName(href) {
  const url = String(href).split('?')[0];
  try {
    const u = new URL(url, document.baseURI);
    const segs = u.pathname.split('/').filter(Boolean);
    if (u.origin !== new URL(document.baseURI).origin) {
      return (u.host ? u.host + '/' : '') + (segs.pop() || u.pathname);
    }
    // Two segments on a same-origin sheet, not one: /renderer/style.css is
    // still the app's own file, and the folder is part of finding it.
    return segs.slice(-2).join('/') || url;
  } catch (e) {
    return url; // an unparsable href is named by what it says
  }
}

// Every CSSStyleRule in every readable sheet, flattened through @media /
// @supports / @layer. Each entry: { rule, file }.
function uiiAllRules() {
  const out = [];
  const walk = (rules, file) => {
    for (const r of rules) {
      if (r.style && r.selectorText) out.push({ rule: r, file });
      else if (r.cssRules) walk(r.cssRules, file);
    }
  };
  const sheets = document.styleSheets;
  for (let i = 0; i < sheets.length; i++) {
    const sh = sheets[i];
    let rules;
    try { rules = sh.cssRules; } catch (e) { continue; }
    if (!rules) continue;
    // A linked sheet is named by its file; an inline <style> by its id when it
    // has one (usually injected by a script at runtime).
    const node = sh.ownerNode;
    const file = sh.href ? uiiSheetName(sh.href)
      : node && node.id ? '<style id="' + node.id + '"> (injected)' : '<style>#' + i;
    walk(rules, file);
  }
  return out;
}

// Names of every custom property declared anywhere in the sheets.
function uiiVarNames(all) {
  const names = new Set();
  for (const { rule } of all) {
    const st = rule.style;
    for (let i = 0; i < st.length; i++) if (st[i].startsWith('--')) names.add(st[i]);
  }
  return [...names];
}

// A hidden scratch element inside the shadow root turns "#fff", "navy" or
// "var(--x)" into the same rgb() form getComputedStyle uses everywhere else.
function uiiNormColor(v) {
  const s = uiiState.scratch;
  if (!s) return v;
  s.style.color = '';
  s.style.color = v;
  if (!s.style.color) return null;
  return getComputedStyle(s).color;
}

// [{name, hex}] for every custom property whose value, resolved on this
// element, is a colour. Vars set on ancestors or :root all resolve here.
// This is the palette the colour fields offer, so it is sorted by name.
function uiiColorVars(el, all) {
  const cs = getComputedStyle(el);
  const out = [];
  for (const name of uiiVarNames(all)) {
    const raw = cs.getPropertyValue(name).trim();
    if (!raw || raw.length > 40) continue; // shadows, font stacks: never a colour
    const rgb = uiiNormColor(raw);
    if (!rgb) continue;
    out.push({ name, hex: uiiToHex(rgb) });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

// hex -> [--var, ...], from the same list.
function uiiColorVarMap(vars) {
  const map = new Map();
  for (const { name, hex } of vars) {
    if (!map.has(hex)) map.set(hex, []);
    map.get(hex).push(name);
  }
  return map;
}

// The rule that gives `name` its value for `el`: the last rule in sheet order
// that declares it and whose selector matches el or an ancestor (`:root` is
// where an app keeps its palette, but a theme block may set it lower down).
// null when no readable sheet declares it — the var came from an inline
// style attribute, and `uiiVarApply` writes it on :root instead.
function uiiVarRule(name, el, all) {
  let hit = null;
  for (const { rule, file } of all) {
    if (!rule.style.getPropertyValue(name)) continue;
    for (const sel of rule.selectorText.split(',')) {
      const s = sel.trim();
      let up = null;
      try { up = s && el.closest(s); } catch (e) { up = null; }
      if (up) { hit = { file, selector: s, style: rule.style }; break; }
    }
  }
  return hit;
}

// Rules whose selector matches el, in sheet order. Selector lists are split so
// the reported selector is the one that actually matched.
function uiiMatchedRules(el, all) {
  const out = [];
  for (const { rule, file } of all) {
    const parts = rule.selectorText.split(',');
    for (const sel of parts) {
      const s = sel.trim();
      if (!s) continue;
      let hit = false;
      try { hit = el.matches(s); } catch (e) { hit = false; }
      if (hit) { out.push({ file, selector: s, props: rule.style.length, style: rule.style }); break; }
    }
  }
  return out;
}
