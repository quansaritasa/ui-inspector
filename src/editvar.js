/* ================= live editing: variable-driven values =================
   A rule like `font-size: calc(var(--ui-font-size-grid) * 0.917)` sizes by a
   factor of a variable. Showing or logging the computed px would get an AI to
   hard-code it and cut the link to the variable, so such values are edited
   and reported as the factor: calc(var(--ui-font-size-grid) * 0.754). */

const uiiRound3 = (n) => Math.round(n * 1000) / 1000;

function uiiVarCalc(name, k) {
  return 'calc(var(' + name + ') * ' + uiiRound3(k) + ')';
}

// "var(--x)" / "calc(var(--x) * k)" / "calc(k * var(--x))" -> {name, k}.
function uiiParseVarFactor(v) {
  const s = String(v || '').trim();
  let m = /^var\((--[\w-]+)\)$/.exec(s);
  if (m) return { name: m[1], k: 1 };
  m = /^calc\(\s*var\((--[\w-]+)\)\s*\*\s*(-?\d*\.?\d+)\s*\)$/.exec(s);
  if (m) return { name: m[1], k: parseFloat(m[2]) };
  m = /^calc\(\s*(-?\d*\.?\d+)\s*\*\s*var\((--[\w-]+)\)\s*\)$/.exec(s);
  return m ? { name: m[2], k: parseFloat(m[1]) } : null;
}

// The variable a value is built on: "var(--bg)" -> "--bg". Anywhere in the
// value, not only at the front, so a shorthand ("1px solid var(--line)") and
// a fallback chain ("var(--btn-bg, var(--panel-2))") both answer with the
// variable the page is actually reading.
function uiiVarName(v) {
  const m = /var\(\s*(--[\w-]+)/.exec(String(v || ''));
  return m ? m[1] : '';
}

// The factor form of `value` on `el`, only when it really produces `px`
// (the variable resolves to px there and k × var = px). Guards against a
// rule that a more specific one overrides — sheet order is not the cascade.
function uiiVarFactor(el, value, px) {
  const f = uiiParseVarFactor(value);
  if (!f) return null;
  const varPx = parseFloat(getComputedStyle(el).getPropertyValue(f.name));
  if (isNaN(varPx) || !varPx || Math.abs(f.k * varPx - px) > 0.05) return null;
  return { name: f.name, k: f.k, varPx };
}

// Values no real stylesheet uses, so a computed change proves the rule wins.
const UII_PROBE = { color: 'rgb(1, 2, 3)', 'background-color': 'rgb(1, 2, 3)', 'font-family': 'uii-probe',
  'font-weight': '137', 'text-align': 'justify', border: '7px dotted rgb(1, 2, 3)' };

// {file, selector, value, style} of the matched rule that really sets `prop`
// on `el`, or null when none does (the value is inherited). Sheet order is
// not the cascade (specificity, !important), so each candidate, last first,
// is probed: set a sentinel, see if the element's computed value moves,
// put the rule back. The element's own inline value is lifted meanwhile.
// Cached per selection.
function uiiRuleDecl(el, prop) {
  const I = uiiState.info;
  if (!I.declCache) I.declCache = new Map();
  let m = I.declCache.get(el);
  if (!m) I.declCache.set(el, (m = new Map()));
  if (!m.has(prop)) m.set(prop, uiiFindDecl(el, prop));
  return m.get(prop);
}

// The part of a selector that names the element itself: "td" out of
// "#grid tbody > td". `*` here means the rule styles everything.
function uiiLastSeg(selector) {
  return selector.split(/[\s>+~]+/).pop();
}

function uiiFindDecl(el, prop) {
  const rules = uiiRulesOf(el);
  const sets = rules.filter((r) => r.style && r.style.getPropertyValue(prop));
  // One matched rule sets it, unconditionally, with no `*` rule beside it
  // (an `!important` reset could still beat it): nothing can override it,
  // so it wins without the probe, which restyles the whole page. Not when
  // the list may be cut (uiiCollect keeps the last 30): a dropped rule counts.
  const sure = rules.length < 30 && sets.length === 1 && !sets[0].cond && uiiLastSeg(sets[0].selector) !== '*';
  // Candidates, last in sheet order first. A universal rule — the
  // `* { margin: 0 }` reset — is never an answer: uiiFindEditRule() refuses
  // to edit one, so finding it is work thrown away. Probing it is also the
  // most expensive probe there is: the sentinel lands on every element in
  // the document, and reading the result back relayouts all of them
  // (measured: 2 such probes = 82 of the 389 ms one panel render cost on a
  // 5,000-element page).
  const cands = sets.filter((r) => uiiLastSeg(r.selector) !== '*').reverse();
  const out = (r) => ({ file: r.file.split('/').pop(), selector: r.selector, value: uiiDeclValue(r.style, prop), style: r.style });
  if (sure) return out(cands[0]);
  const w = cands.length > 1 ? uiiProbeAll(el, prop, cands) : null;
  if (w) return out(w);
  if (w === false) return null;
  const r = cands.find((c) => uiiWins(el, prop, c.style));
  return r ? out(r) : null;
}

// Sentinel number i for `prop`, distinct per i; null where a property has too
// few values to tell rules apart (text-align).
function uiiProbeVal(prop, i) {
  if (prop === 'text-align') return null;
  if (prop === 'font-weight') return String(137 + i);
  if (prop === 'font-family') return 'uii-probe-' + i;
  if (prop === 'border') return '7px dotted rgb(1, 2, ' + (3 + i) + ')';
  if (/color$/.test(prop)) return 'rgb(1, 2, ' + (3 + i) + ')';
  return (1234.5 + i) + 'px';
}

// uiiWins for every candidate in one go: each gets its own sentinel, the
// element is read once, and the sentinel that shows names the winner — one
// page restyle instead of one per rule (~110 ms each on 60,000 elements).
// false when the value did not move at all: the winner is none of them (a
// rule past the 30 kept, an `!important` `*`), which is what probing rule by
// rule would also conclude, one restyle per rule later. null when it moved to
// none of the sentinels (max-width clamping a width, say): the caller falls
// back to probing rule by rule.
function uiiProbeAll(el, prop, cands) {
  const s = uiiState.scratch;
  if (!s || cands.length > 200) return null;
  const vals = cands.map((r, i) => uiiProbeVal(prop, i));
  if (vals.includes(null)) return null;
  // Each sentinel as getComputedStyle writes it, from the hidden scratch
  // element (the uiiNormColor trick): only that one element restyles.
  const want = vals.map((v) => { s.style.setProperty(prop, v); return getComputedStyle(s).getPropertyValue(prop); });
  s.style.removeProperty(prop);
  if (new Set(want).size !== want.length) return null;
  const iv = el.style.getPropertyValue(prop), ip = el.style.getPropertyPriority(prop);
  if (iv) el.style.removeProperty(prop);
  const before = getComputedStyle(el).getPropertyValue(prop);
  // Put back by whole cssText, for the reason uiiWins gives.
  const texts = cands.map((r) => r.style.cssText);
  cands.forEach((r, i) => r.style.setProperty(prop, vals[i], r.style.getPropertyPriority(prop)));
  const got = getComputedStyle(el).getPropertyValue(prop);
  cands.forEach((r, i) => { r.style.cssText = texts[i]; });
  if (iv) el.style.setProperty(prop, iv, ip);
  const i = want.indexOf(got);
  return i >= 0 ? cands[i] : got === before ? false : null;
}

// Would `prop` in this rule decide the element's value? Set a sentinel, see
// if the computed value moves, put everything back (the element's own inline
// value is lifted meanwhile, or it would always win).
// The rule is put back by its whole cssText, never property by property: a
// rule that paints through a shorthand ("background: color-mix(…)") reports
// an empty background-color longhand, so removing the sentinel would take the
// color out of the shorthand with it and leave the page quietly restyled by
// a probe that was only meant to read.
function uiiWins(el, prop, style) {
  const iv = el.style.getPropertyValue(prop), ip = el.style.getPropertyPriority(prop);
  if (iv) el.style.removeProperty(prop);
  const before = getComputedStyle(el).getPropertyValue(prop);
  const text = style.cssText;
  style.setProperty(prop, UII_PROBE[prop] || '1234.5px', style.getPropertyPriority(prop));
  const win = getComputedStyle(el).getPropertyValue(prop) !== before;
  style.cssText = text;
  if (iv) el.style.setProperty(prop, iv, ip);
  return win;
}

// Where an edit lands, cached per selection. The rule that sets the value
// today, unless it is broad — its last part is a bare tag, like `#grid td` —
// and a rule naming the element's own class or id would win if given the
// line: then that one, as an `add`. Never `*`: editing it would move every
// element on the page — uiiFindDecl skips universal rules before they reach
// here, and the `*` arms below keep that true for a hand-made call.
function uiiEditRule(el, prop) {
  const I = uiiState.info;
  if (!I.declCache) I.declCache = new Map();
  let m = I.declCache.get(el);
  if (!m) I.declCache.set(el, (m = new Map()));
  const key = 'edit:' + prop;
  if (!m.has(key)) m.set(key, uiiFindEditRule(el, prop));
  return m.get(key);
}

function uiiFindEditRule(el, prop) {
  const d = uiiRuleDecl(el, prop);
  // No rule found reads as `*`: both mean "nothing worth editing here", so
  // the own-rule search below runs either way.
  const last = d ? uiiLastSeg(d.selector) : '*';
  // add: the line exists only because Apply to similar put it there.
  if (d && !/^(\*|[a-z][\w-]*)$/i.test(last)) return { ...d, add: !d.value };
  const own = uiiOwnRules(el).find((r) => uiiWins(el, prop, r.style));
  if (own) return { file: own.file.split('/').pop(), selector: own.selector, style: own.style, add: !uiiDeclValue(own.style, prop) };
  return d && last !== '*' ? { ...d, add: false } : null;
}

// Does any matched rule write `prop` as a value `test` accepts? Asked before
// uiiRuleDecl, whose probes restyle the whole page (~10 ms each on a 5,000-
// element page, two dozen per panel): when no candidate could give the
// answer, which one wins does not matter.
function uiiAnyDecl(el, prop, test) {
  return uiiRulesOf(el).some((r) => r.style && test(uiiDeclValue(r.style, prop)));
}

// The rule's variable factor for `prop` before any edit, or null.
function uiiFormula(el, prop) {
  if (!uiiAnyDecl(el, prop, uiiParseVarFactor)) return null;
  const d = uiiRuleDecl(el, prop);
  return d ? uiiVarFactor(el, d.value, parseFloat(uiiOrig(el, prop))) : null;
}

function uiiSrcNote(el) {
  const a = uiiState.opts.srcAttr;
  const v = a && el.getAttribute(a);
  return v ? ' (' + v + ')' : '';
}

// One edit as {head, decl} for the Changes box: head names the rule to edit
// ("style.css .grid-task-title"), decl is the final value only. A
// variable-driven value is written as the rule with the new factor; a
// non-px value carries its px as a comment for reference.
function uiiChangeDecl(el, c) {
  const d = uiiRuleDecl(el, c.prop);
  const f = d && uiiVarFactor(el, d.value, parseFloat(c.from));
  const cv = getComputedStyle(el).getPropertyValue(c.prop).trim();
  const now = parseFloat(cv);
  const value = f && !isNaN(now) ? uiiVarCalc(f.name, now / f.varPx) : c.to;
  // px for reference only where the value hides a length: a factor, em, %.
  const note = /^-?[\d.]+px$/.test(cv) && /calc\(|var\(|\d(em|rem|%)/.test(value) ? ' /* ' + uiiRound3(now) + 'px */' : '';
  // The rule to edit (see uiiEditRule); `add` = a line the rule lacks today.
  // No such rule: the element's path, so the AI creates one.
  const t = uiiEditRule(el, c.prop);
  return t
    ? { head: t.file + ' ' + t.selector, decl: c.prop + ': ' + value + note + (t.add ? ' /* add */' : '') }
    : { head: uiiNewRuleSel(el) + uiiSrcNote(el) + ' /* new rule */', decl: c.prop + ': ' + value + note };
}

// Matched rules whose last part names this element's id or one of its
// classes — `.grid-task`, not `td` or `*` — last in sheet order first.
function uiiOwnRules(el) {
  return uiiRulesOf(el).filter((r) => {
    const last = uiiLastSeg(r.selector);
    return (el.id && last.includes('#' + el.id)) || [...el.classList].some((c) => last.includes('.' + c));
  }).reverse();
}
