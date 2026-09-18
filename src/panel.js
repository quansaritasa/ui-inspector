/* ================= details panel =================
   Built once per mount inside the shadow root; re-rendered on every
   selection. Drag by the header; buttons copy text for the clipboard. */

function uiiEl(tag, cls, text) {
  const d = document.createElement(tag);
  if (cls) d.className = cls;
  if (text !== undefined) d.textContent = text;
  return d;
}

function uiiBuildPanel(sh) {
  const S = uiiState;
  const p = uiiEl('div', 'panel');
  const head = uiiEl('div', 'head');
  const name = uiiEl('span', 'name');
  const tag = uiiEl('span', 'tag');
  const close = uiiEl('button', '', '✕');
  close.title = 'Close panel (selection stays)';
  head.append(name, tag, close);
  const body = uiiEl('div', 'body');
  const foot = uiiEl('div', 'foot');
  const copyAI = uiiEl('button', '', '📋 Copy for AI');
  const copySel = uiiEl('button', '', 'Copy selector');
  const ok = uiiEl('span', 'ok', '');
  foot.append(copyAI, copySel, ok);
  p.append(head, body, foot);
  sh.appendChild(p);
  S.panel = { root: p, name, tag, body, ok };
  close.addEventListener('click', () => p.classList.remove('on'));
  copyAI.addEventListener('click', () => uiiCopy(uiiFormatForAI(S.info)));
  copySel.addEventListener('click', () => uiiCopy(S.info.path));
  uiiDrag(head, p);
}

function uiiDrag(handle, box) {
  let sx = 0, sy = 0, ox = 0, oy = 0;
  const move = (e) => {
    box.style.left = Math.max(0, ox + e.clientX - sx) + 'px';
    box.style.top = Math.max(0, oy + e.clientY - sy) + 'px';
    box.style.right = 'auto';
  };
  // Capture phase: the overlay stops propagation of mouseup outside the panel,
  // and only same-node capture listeners still run after that.
  const up = () => { window.removeEventListener('mousemove', move, true); window.removeEventListener('mouseup', up, true); };
  handle.addEventListener('mousedown', (e) => {
    if (e.target.tagName === 'BUTTON') return;
    const r = box.getBoundingClientRect();
    sx = e.clientX; sy = e.clientY; ox = r.left; oy = r.top;
    window.addEventListener('mousemove', move, true);
    window.addEventListener('mouseup', up, true);
    e.preventDefault();
  });
}

function uiiCopy(text) {
  const S = uiiState;
  const done = () => {
    S.panel.ok.textContent = '✅ copied';
    setTimeout(() => { if (S.panel) S.panel.ok.textContent = ''; }, 1200);
  };
  if (typeof S.opts.onCopy === 'function') { S.opts.onCopy(text); done(); return; }
  navigator.clipboard.writeText(text).then(done, () => { S.panel.ok.textContent = '⚠ clipboard blocked'; });
}

function uiiRow(k, v, swatchHex) {
  const row = uiiEl('div', 'row');
  row.appendChild(uiiEl('span', 'k', k));
  const val = uiiEl('span', 'v');
  if (swatchHex && swatchHex !== 'transparent') {
    const sw = uiiEl('span', 'sw');
    const i = uiiEl('i');
    i.style.background = swatchHex;
    sw.appendChild(i);
    val.appendChild(sw);
  }
  val.appendChild(document.createTextNode(v));
  row.appendChild(val);
  return row;
}

function uiiColorRow(k, c) {
  const row = uiiRow(k, c.hex, c.hex);
  const v = row.lastChild;
  if (c.vars.length) v.appendChild(uiiEl('span', 'var', '  ' + c.vars.join(' ')));
  if (c.from) v.appendChild(document.createTextNode('  ← ' + c.from));
  return row;
}

function uiiRenderPanel(info) {
  const P = uiiState.panel;
  if (!P) return;
  P.name.textContent = info.name;
  P.tag.textContent = '<' + info.tag + '>';
  const b = P.body;
  b.textContent = '';
  b.appendChild(uiiEl('div', 'sec', 'Identity'));
  b.appendChild(uiiRow('Selector', info.path));
  if (info.id) b.appendChild(uiiRow('id', info.id));
  if (info.classes.length) b.appendChild(uiiRow('class', info.classes.join(' ')));
  if (info.text) b.appendChild(uiiRow('Text', info.text));
  b.appendChild(uiiRow('Size', info.width + ' × ' + info.height + 'px · ' + info.display));

  b.appendChild(uiiEl('div', 'sec', 'Colours'));
  b.appendChild(uiiColorRow('Background', info.bg));
  b.appendChild(uiiColorRow('Text', info.color));

  b.appendChild(uiiEl('div', 'sec', 'Type'));
  const ff = uiiRow('Font', info.fontFamily);
  ff.title = info.fontFamilyFull;
  b.appendChild(ff);
  b.appendChild(uiiRow('Size / line', info.fontSize + ' / ' + info.lineHeight));
  b.appendChild(uiiRow('Weight', info.fontWeight));

  b.appendChild(uiiEl('div', 'sec', 'Box'));
  b.appendChild(uiiRow('Padding', info.padding));
  b.appendChild(uiiRow('Margin', info.margin));
  b.appendChild(uiiRow('Border', info.border));
  b.appendChild(uiiRow('Radius', info.borderRadius));

  b.appendChild(uiiEl('div', 'sec', 'Matched CSS rules (' + info.rules.length + ')'));
  for (const r of info.rules) {
    const d = uiiEl('div', 'rule');
    d.appendChild(uiiEl('span', 'f', r.file + ' → '));
    d.appendChild(document.createTextNode(r.selector));
    b.appendChild(d);
  }
  P.root.classList.add('on');
}
