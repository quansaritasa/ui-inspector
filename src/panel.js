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
  // Minimize folds the panel to its header so the page underneath shows;
  // the class lives on the panel, so a new selection stays folded.
  const fold = uiiEl('button', '', '—');
  fold.title = 'Minimize';
  const close = uiiEl('button', '', '✕');
  close.title = 'Close panel (selection stays)';
  // Reset shows only once the element has an edit; ok flashes "copied".
  const reset = uiiEl('button', 'reset', '↺ Reset');
  reset.title = 'Undo every live edit on this element';
  const ok = uiiEl('span', 'ok', '');
  head.append(name, tag, ok, reset, fold, close);
  const body = uiiEl('div', 'body');
  const grip = uiiEl('div', 'grip');
  grip.title = 'Drag to resize';
  p.append(grip, head, body);
  sh.appendChild(p);
  S.panel = { root: p, name, tag, body, ok, reset };
  close.addEventListener('click', () => p.classList.remove('on'));
  fold.addEventListener('click', () => {
    const min = p.classList.toggle('min');
    fold.textContent = min ? '▢' : '—';
    fold.title = min ? 'Maximize' : 'Minimize';
  });
  reset.addEventListener('click', () => uiiResetEdits(S.info.el));
  uiiDrag(head, p);
  uiiResizeLeft(grip, p);
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

// Drag the left edge to resize; the right edge stays put, as the panel sits
// at the right of the window. Same capture-listener pattern as uiiDrag.
function uiiResizeLeft(handle, box) {
  let sx = 0, sw = 0, right = 0;
  const move = (e) => {
    const w = Math.max(320, Math.min(window.innerWidth - 16, sw + sx - e.clientX));
    box.style.width = w + 'px';
    box.style.left = Math.max(0, right - w) + 'px';
    box.style.right = 'auto';
  };
  const up = () => { window.removeEventListener('mousemove', move, true); window.removeEventListener('mouseup', up, true); };
  handle.addEventListener('mousedown', (e) => {
    const r = box.getBoundingClientRect();
    sx = e.clientX; sw = r.width; right = r.right;
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

function uiiRenderPanel(info) {
  const P = uiiState.panel;
  if (!P) return;
  P.name.textContent = info.name;
  P.tag.textContent = '<' + info.tag + '>';
  const b = P.body;
  b.textContent = '';
  const idHead = uiiEl('div', 'sec', 'Identity ');
  const copyAI = uiiEl('button', 'mini', '📋 Copy ID');
  copyAI.title = 'One line: name, selector, element, stylesheet rules';
  copyAI.addEventListener('click', () => uiiCopy(uiiFormatForAI(info)));
  idHead.appendChild(copyAI);
  b.appendChild(idHead);
  b.appendChild(uiiRow('Selector', info.path));
  if (info.id) b.appendChild(uiiRow('id', info.id));
  if (info.classes.length) b.appendChild(uiiRow('class', info.classes.join(' ')));
  if (info.text) b.appendChild(uiiRow('Text', info.text));
  b.appendChild(uiiRow('Size', info.width + ' × ' + info.height + 'px · ' + info.display + ' · font ' + info.fontSize));


  // Where-to-edit and the matched-rule list live in the Copy buttons; the
  // Changes box names the one rule each edit touches.
  const stHead = uiiEl('div', 'sec', 'Style — type, ↑↓ or drag a label ');
  const sim = uiiEl('label', 'sim');
  const box = uiiEl('input');
  box.type = 'checkbox';
  box.checked = uiiState.similar;
  sim.title = 'Also edit the CSS rule itself, so every element it styles changes too';
  sim.append(box, document.createTextNode(' Apply to similar'));
  box.addEventListener('change', () => { uiiState.similar = box.checked; uiiSyncRules(); uiiRefreshChanges(); });
  stHead.appendChild(sim);
  b.appendChild(stHead);
  uiiRenderEditRows(b, info);

  // Rebuilt with the rest of the body, so typing in it lasts until the next
  // edit or selection refills it.
  const chHead = uiiEl('div', 'sec', 'All changes ');
  const chCopy = uiiEl('button', 'mini', '📋 Copy for AI');
  chHead.appendChild(chCopy);
  const changes = uiiEl('textarea', 'chg');
  changes.spellcheck = false;
  changes.rows = 7;
  chCopy.addEventListener('click', () => uiiCopy(changes.value));
  b.append(chHead, changes);
  P.changes = changes;
  uiiRefreshChanges();
  P.reset.hidden = !uiiEditsFor(info.el, false);
  P.root.classList.add('on');
}
