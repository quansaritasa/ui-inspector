/* ================= live editing: what the page draws =================
   The rule behind a value is the one that wins the cascade, not the last one
   in sheet order. Rules that set the same property but lose are kept apart so
   the panel can show them: an edit on a loser does nothing on screen. */

// Lights the title of a field whose value is overridden by something else.
function uiiMarkOverridden(f) {
  const lab = f.querySelector('.lab');
  if (!lab) return;
  lab.classList.add('ovr');
  lab.title = 'Overridden by something else, see below';
}

// Every rule that sets `prop` on `el`, last in sheet order first, longhand or
// shorthand, as { code: 'font-size: 0.9rem', src: 'file.css .sel', style }.
function uiiDeclsOf(el, prop) {
  const heads = [prop, ...(UII_SHORTHAND[prop] || [])];
  if (prop === 'border-color') {
    const side = 'border-' + uiiBorderSide(el);
    heads.push('border', side + '-color', side);
  }
  const rules = uiiRulesOf(el), out = [];
  for (let i = rules.length - 1; i >= 0; i--) {
    if (!rules[i].style) continue;
    for (const h of heads) {
      const v = uiiDeclValue(rules[i].style, h);
      if (!v) continue;
      out.push({ code: h + ': ' + v, src: (rules[i].file || '').split('/').pop() + ' ' + rules[i].selector, style: rules[i].style });
      break;
    }
  }
  return out;
}

// What the page draws for `prop` on `el`: its own inline style, else the rule
// that wins the cascade. { code, src, lost: [the others] }; null when no rule
// or inline style sets it (inherited, or a default). An inline value we wrote
// ourselves is an edit, not the page's.
function uiiDeclared(el, prop) {
  const all = uiiDeclsOf(el, prop);
  const e = uiiEditsFor(el, false);
  const inl = !(e && prop in e.props) && el.style.getPropertyValue(prop).trim();
  const win = !inl && all.length > 1 && uiiRuleDecl(el, prop);
  const shown = inl ? { code: prop + ': ' + inl, src: 'inline style' }
    : (win && all.find((d) => d.style === win.style)) || all[0];
  return shown && Object.assign({}, shown, { lost: all.filter((d) => d !== shown) });
}
