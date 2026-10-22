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

function uiiFindDecl(el, prop) {
  const rules = uiiRulesOf(el);
  for (let i = rules.length - 1; i >= 0; i--) {
    const r = rules[i];
    if (r.style && r.style.getPropertyValue(prop) && uiiWins(el, prop, r.style)) {
      return { file: r.file.split('/').pop(), selector: r.selector, value: uiiDeclValue(r.style, prop), style: r.style };
    }
  }
  return null;
}

// Would `prop` in this rule decide the element's value? Set a sentinel, see
// if the computed value moves, put everything back (the element's own inline
// value is lifted meanwhile, or it would always win).
function uiiWins(el, prop, style) {
  const iv = el.style.getPropertyValue(prop), ip = el.style.getPropertyPriority(prop);
  if (iv) el.style.removeProperty(prop);
  const before = getComputedStyle(el).getPropertyValue(prop);
  const cv = style.getPropertyValue(prop), cp = style.getPropertyPriority(prop);
  style.setProperty(prop, UII_PROBE[prop] || '1234.5px', cp);
  const win = getComputedStyle(el).getPropertyValue(prop) !== before;
  if (cv) style.setProperty(prop, cv, cp); else style.removeProperty(prop);
  if (iv) el.style.setProperty(prop, iv, ip);
  return win;
}

// Where an edit lands, cached per selection. The rule that sets the value
// today, unless it is broad — its last part is `*` or a bare tag, like the
// `* { margin }` reset or `#grid td` — and a rule naming the element's own
// class or id would win if given the line: then that one, as an `add`.
// Never `*`: editing it would move every element on the page.
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
  const last = d ? d.selector.split(/[\s>+~]+/).pop() : '*';
  // add: the line exists only because Apply to similar put it there.
  if (d && !/^(\*|[a-z][\w-]*)$/i.test(last)) return { ...d, add: !d.value };
  const own = uiiOwnRules(el).find((r) => uiiWins(el, prop, r.style));
  if (own) return { file: own.file.split('/').pop(), selector: own.selector, style: own.style, add: !uiiDeclValue(own.style, prop) };
  return d && last !== '*' ? { ...d, add: false } : null;
}

// The rule's variable factor for `prop` before any edit, or null.
function uiiFormula(el, prop) {
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
    : { head: uiiPath(el) + uiiSrcNote(el) + ' /* new rule */', decl: c.prop + ': ' + value + note };
}

// Matched rules whose last part names this element's id or one of its
// classes — `.grid-task`, not `td` or `*` — last in sheet order first.
function uiiOwnRules(el) {
  return uiiRulesOf(el).filter((r) => {
    const last = r.selector.split(/[\s>+~]+/).pop();
    return (el.id && last.includes('#' + el.id)) || [...el.classList].some((c) => last.includes('.' + c));
  }).reverse();
}
