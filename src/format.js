/* ================= value formatting =================
   Colour normalisation and the "Copy for AI" text block. */

// "rgb(31, 41, 55)" / "rgba(31,41,55,0.5)" -> "#1f2937" / "#1f293780".
// Anything else (gradients, "transparent") is returned untouched.
function uiiToHex(v) {
  const m = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+%?))?\s*\)$/.exec(String(v || '').trim());
  if (!m) return v;
  const h = (n) => Math.round(Number(n)).toString(16).padStart(2, '0');
  let out = '#' + h(m[1]) + h(m[2]) + h(m[3]);
  if (m[4] !== undefined) {
    let a = m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    if (a === 0) return 'transparent';
    if (a < 1) out += h(a * 255);
  }
  return out;
}

function uiiIsTransparent(v) {
  return !v || v === 'transparent' || /^rgba?\([^)]*[,/]\s*0\s*\)$/.test(v);
}

// "Inter, -apple-system, system-ui" -> "Inter (+2 fallbacks)"
function uiiFirstFont(v) {
  const parts = String(v || '').split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
  if (!parts.length) return '';
  return parts.length > 1 ? parts[0] + ' (+' + (parts.length - 1) + ' fallbacks)' : parts[0];
}

// Collapse whitespace and cap length for names built from text content.
function uiiShort(s, n) {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n - 1) + '…' : t;
}

// One colour line: "#ffffff (--surface)" or "#ffffff (inherited from #toolbar)".
function uiiColorLine(c) {
  if (!c) return '';
  let s = c.hex;
  const notes = [];
  if (c.vars && c.vars.length) notes.push(c.vars.join(', '));
  if (c.from) notes.push('inherited from ' + c.from);
  return notes.length ? s + ' (' + notes.join('; ') + ')' : s;
}

// One line for an AI chat: just enough to find the element in the source.
// UI: #edit-btn — <button id="edit-btn"> "✎ Edit" — css: style.css: #edit-btn, #edit-btn:hover | themes/modern.css: .md-editor ×4
function uiiFormatForAI(info) {
  const ident = info.id && info.name !== info.id ? info.name + ' (' + info.path + ')' : info.path;
  const elem = '<' + info.tag + (info.id ? ' id="' + info.id + '"' : '')
    + (!info.id && info.classes.length ? ' class="' + info.classes.join(' ') + '"' : '') + '>';
  const parts = ['UI: ' + ident, elem + (info.text ? ' "' + uiiShort(info.text, 30) + '"' : '')];
  // Same selector from several rules (top level + @media) collapses to "sel ×N".
  const byFile = new Map();
  for (const r of info.rules) {
    if (r.selector === '*' || r.selector === 'html' || r.selector === 'body') continue; // resets, not this component
    if (!byFile.has(r.file)) byFile.set(r.file, new Map());
    const m = byFile.get(r.file);
    m.set(r.selector, (m.get(r.selector) || 0) + 1);
  }
  const files = [];
  for (const [file, m] of byFile) {
    const sels = [...m].map(([sel, n]) => n > 1 ? sel + ' ×' + n : sel).slice(-6);
    files.push(file.replace(/^renderer\//, '') + ': ' + sels.join(', '));
  }
  if (files.length) parts.push('css: ' + files.join(' | '));
  return parts.join(' — ');
}

// Multi-line block with the computed look, for when the AI must match or
// change colours and type rather than just locate the element.
function uiiFormatDetails(info) {
  const L = [];
  L.push('UI component: ' + info.name);
  L.push('Selector: ' + info.path);
  L.push('Element: <' + info.tag + (info.id ? ' id="' + info.id + '"' : '')
    + (info.classes.length ? ' class="' + info.classes.join(' ') + '"' : '') + '>');
  if (info.text) L.push('Text: "' + info.text + '"');
  L.push('Size: ' + info.width + '×' + info.height + 'px');
  L.push('Background: ' + uiiColorLine(info.bg));
  L.push('Text color: ' + uiiColorLine(info.color));
  L.push('Font: ' + info.fontFamily + ' ' + info.fontSize + ' / ' + info.lineHeight + ' weight ' + info.fontWeight);
  L.push('Padding: ' + info.padding + ' | Margin: ' + info.margin);
  L.push('Border: ' + info.border + ' | Radius: ' + info.borderRadius);
  if (info.rules.length) {
    L.push('Matched CSS rules:');
    for (const r of info.rules) L.push('  ' + r.file + ' → ' + r.selector);
  }
  return L.join('\n');
}
