/* ================= live editing: color fields =================
   A color either sits on the element or comes from a variable. The picker
   below edits whichever the dropdown points at, so moving a palette entry
   moves every rule that reads it. Split out of editfields.js to keep each
   file short. */

// Shorthands that can carry a color: CSSOM leaves the longhand empty when
// the shorthand holds a var(), so the var has to be read off the shorthand.
const UII_COLOR_SHORTHAND = { 'background-color': 'background', 'border-color': 'border' };

// Which tab of the shared picker a color field's swatch opens on.
const UII_PAIR_SLOT = { color: 'text', 'background-color': 'background' };

// The side the border color field speaks for: the first one that draws a
// line. A rule like `td { border-bottom: 1px solid var(--x) }` leaves the top
// at currentColor, which is not the color anyone sees.
function uiiBorderSides(el) {
  const cs = getComputedStyle(el);
  return ['top', 'right', 'bottom', 'left'].filter((s) =>
    parseFloat(cs.getPropertyValue('border-' + s + '-width')) > 0 && cs.getPropertyValue('border-' + s + '-style') !== 'none');
}
function uiiBorderDrawnSide(el) { return uiiBorderSides(el)[0]; }
// The border as one copyable line, from the side the fields speak for.
function uiiBorderText(el) {
  const cs = getComputedStyle(el), s = 'border-' + uiiBorderSide(el);
  return cs.getPropertyValue(s + '-width') + ' ' + cs.getPropertyValue(s + '-style') + ' ' + uiiToHex(cs.getPropertyValue(s + '-color'));
}
function uiiBorderSide(el) { return uiiBorderDrawnSide(el) || 'top'; }

// Like uiiVarName, but only a var() that IS the color (or a token of a
// shorthand): one inside color-mix(), rgb(from …) and the like only feeds a
// derived color, and the field would show the variable's, not the result.
function uiiColorVarName(v) {
  const s = String(v || '');
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '(') depth++;
    else if (s[i] === ')') depth--;
    else if (depth === 0 && s.startsWith('var(', i) && !/[\w-]/.test(s[i - 1] || '')) return uiiVarName(s.slice(i));
  }
  return '';
}

// The variable this color comes from, '' when it is written out in full.
function uiiColorVarOf(el, prop) {
  const d = uiiAnyDecl(el, prop, uiiColorVarName) && uiiRuleDecl(el, prop);
  const named = uiiColorVarName(d && d.value);
  if (named || !UII_COLOR_SHORTHAND[prop]) return named;
  const rules = uiiRulesOf(el);
  const heads = [UII_COLOR_SHORTHAND[prop]];
  if (prop === 'border-color') heads.unshift('border-' + uiiBorderSide(el), 'border-' + uiiBorderSide(el) + '-color');
  for (let i = rules.length - 1; i >= 0; i--) {
    if (!rules[i].style) continue;
    for (const h of heads) {
      const n = uiiColorVarName(uiiDeclValue(rules[i].style, h));
      if (n) return n;
    }
  }
  return '';
}

// The hex a variable resolves to on this element, '' when it is not a color.
function uiiVarHex(info, name, el) {
  const v = info.colorVars.find((c) => c.name === name);
  if (v) return v.hex;
  const raw = getComputedStyle(el).getPropertyValue(name).trim();
  return raw ? uiiToHex(uiiNormColor(raw) || raw) : '';
}

// The variable dropdown as a custom list: a native <select> cannot draw a
// swatch in an option, and a name alone rarely says which color it is.
// Same surface as the <select> it replaces: .value, and a 'change' event.
// The list lives on the shadow root, not in the panel, so the panel's
// scrolling body does not clip it.
// `kind` 'line': the same list for border styles — no "none" entry, a stroke
// of the style where a color swatch would be.
function uiiVarPicker(names, target, kind) {
  const S = uiiState;
  const btn = uiiEl('button', 'cv');
  btn.type = 'button';
  let value = '';
  Object.defineProperty(btn, 'value', {
    get: () => value,
    set: (v) => { value = v; btn.textContent = v || (kind ? '' : '— none —'); },
  });
  // Read live: a variable edited through the swatch has moved since collect.
  const hexOf = (n) => {
    const raw = getComputedStyle(target).getPropertyValue(n).trim();
    return raw ? uiiToHex(uiiNormColor(raw) || raw) : '';
  };
  btn.addEventListener('click', () => {
    const mine = S.cvList && S.cvList.owner === btn;
    uiiCloseVarList();
    if (mine) return; // second click on the button closes it
    const list = uiiEl('div', 'cvl');
    list.owner = btn;
    for (const n of kind ? names : ['', ...names]) {
      const it = list.appendChild(uiiEl('button', n === value ? 'on' : ''));
      it.type = 'button';
      it.appendChild(uiiEl('span', 'n', n || '— none —'));
      const hex = !kind && n && hexOf(n);
      if (kind) {
        const ln = uiiEl('i', 'ln');
        ln.style.borderTopStyle = n;
        it.appendChild(ln);
      } else if (hex) {
        const sw = uiiEl('i');
        sw.style.background = hex;
        it.append(sw, uiiEl('span', 'h', hex));
      }
      it.addEventListener('click', () => {
        uiiCloseVarList();
        if (n === value) return;
        btn.value = n;
        btn.dispatchEvent(new Event('change'));
      });
    }
    const r = btn.getBoundingClientRect();
    list.style.right = Math.max(4, window.innerWidth - r.right) + 'px';
    list.style.top = (r.bottom + 244 < window.innerHeight ? r.bottom + 2 : Math.max(4, r.top - 244)) + 'px';
    S.shadow.appendChild(list);
    // A long palette scrolls: the value in force opens in view, not below it.
    const on = list.querySelector('.on');
    if (on) on.scrollIntoView({ block: 'nearest' });
    // Close on a press anywhere else, or when the panel scrolls under it.
    const down = (e) => { if (!e.composedPath().some((t) => t === list || t === btn)) uiiCloseVarList(); };
    const scroll = (e) => { if (e.target !== list) uiiCloseVarList(); };
    window.addEventListener('pointerdown', down, true);
    S.shadow.addEventListener('scroll', scroll, true);
    list.off = () => {
      window.removeEventListener('pointerdown', down, true);
      S.shadow.removeEventListener('scroll', scroll, true);
    };
    S.cvList = list;
  });
  return btn;
}

function uiiCloseVarList() {
  const l = uiiState.cvList;
  if (!l) return;
  uiiState.cvList = null;
  l.off();
  l.remove();
}

// Typing a color string applies it on the spot; Enter is no longer needed.
// Half-typed text ("#1f", "rgb(") is not a color yet and is left alone.
// One burst of typing is one undo step, closed 600ms after the last key.
function uiiLiveColor(box, write) {
  let timer = 0;
  const end = () => { if (timer) { clearTimeout(timer); timer = 0; uiiUndoEnd(); } };
  box.addEventListener('change', end);
  box.addEventListener('input', () => {
    const v = box.value.trim();
    if (!v || !CSS.supports('color', v)) return;
    if (timer) clearTimeout(timer); else uiiUndoBegin();
    timer = setTimeout(end, 600);
    write(v);
  });
}
