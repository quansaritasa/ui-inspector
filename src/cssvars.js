/* ================= stylesheet lookups =================
   Two things the computed style cannot tell you: which --custom-property a
   colour came from, and which selectors put it there. Both are recovered by
   walking document.styleSheets — cross-origin sheets throw on .cssRules and
   are skipped. Runs only on click, so a few hundred rules is fine. */

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
    const file = sh.href ? sh.href.split('/').slice(-2).join('/').split('?')[0]
      : '<style>#' + i + (sh.ownerNode && sh.ownerNode.id ? ' (' + sh.ownerNode.id + ')' : '');
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

// hex -> [--var, ...] for every custom property whose value, resolved on this
// element, is a colour. Vars set on ancestors or :root all resolve here.
function uiiColorVarMap(el, all) {
  const cs = getComputedStyle(el);
  const map = new Map();
  for (const name of uiiVarNames(all)) {
    const raw = cs.getPropertyValue(name).trim();
    if (!raw || raw.length > 40) continue; // shadows, font stacks: never a colour
    const rgb = uiiNormColor(raw);
    if (!rgb) continue;
    const hex = uiiToHex(rgb);
    if (!map.has(hex)) map.set(hex, []);
    map.get(hex).push(name);
  }
  return map;
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
      if (hit) { out.push({ file, selector: s, props: rule.style.length }); break; }
    }
  }
  return out;
}
