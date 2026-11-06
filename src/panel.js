/* ================= details panel =================
   Built once per mount inside the shadow root; re-rendered on every
   selection. Drag by the header; buttons copy text for the clipboard.
   Every control carries a name of its own, written as both id and data-ui,
   so a script driving the panel has something stable to aim at — the classes
   here are styling hooks and change with the layout. The ids are safe: the
   panel lives in a shadow root, so they cannot collide with the host page. */

function uiiEl(tag, cls, text, ui) {
  const d = document.createElement(tag);
  if (cls) d.className = cls;
  if (text !== undefined) d.textContent = text;
  if (ui) { d.setAttribute('data-ui', ui); d.id = ui; }
  return d;
}

// "Padding top ↑" → "padding-top": a data-ui name from a human label.
function uiiSlug(label) {
  return String(label).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function uiiBuildPanel(sh) {
  const p = uiiEl('div', 'panel', undefined, 'inspector-panel');
  const parts = uiiBuildHead(p);
  const body = uiiEl('div', 'body', undefined, 'panel-body');
  // The tree sits beside the body, not in it, so pinning from the tree
  // re-renders the fields and leaves the list where it was.
  const tree = uiiEl('div', 'tree', undefined, 'dom-tree');
  tree.hidden = true;
  const split = uiiEl('div', 'split');
  split.append(tree, body);
  p.append(parts.head, split);
  sh.appendChild(p);
  uiiState.panel = Object.assign({ root: p, body, tree }, parts);
  uiiTreeBind(tree);
  uiiDrag(parts.head, p);
  uiiResize(p);
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

// Drag any edge or corner to resize, as in a desktop window: the opposite
// edge stays put, and the panel stays inside the window. Same capture-listener
// pattern as uiiDrag.
const UII_EDGES = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
const UII_MIN_W = 320, UII_MIN_H = 120;

function uiiResize(box) {
  let dir = '', sx = 0, sy = 0, r0 = null;
  const move = (e) => {
    const dx = e.clientX - sx, dy = e.clientY - sy;
    let { left, top, right, bottom } = r0;
    if (dir.includes('w')) left = Math.max(0, Math.min(right - UII_MIN_W, left + dx));
    if (dir.includes('e')) right = Math.min(window.innerWidth, Math.max(left + UII_MIN_W, right + dx));
    if (dir.includes('n')) top = Math.max(0, Math.min(bottom - UII_MIN_H, top + dy));
    if (dir.includes('s')) bottom = Math.min(window.innerHeight, Math.max(top + UII_MIN_H, bottom + dy));
    Object.assign(box.style, { left: left + 'px', top: top + 'px', right: 'auto', width: right - left + 'px' });
    // A height set by hand replaces the fit-to-content one (CSS max-height).
    if (/[ns]/.test(dir)) Object.assign(box.style, { height: bottom - top + 'px', maxHeight: 'none' });
  };
  const up = () => { window.removeEventListener('mousemove', move, true); window.removeEventListener('mouseup', up, true); };
  for (const d of UII_EDGES) {
    const g = uiiEl('div', 'grip ' + d, undefined, 'resize-' + d);
    g.addEventListener('mousedown', (e) => {
      dir = d; sx = e.clientX; sy = e.clientY; r0 = box.getBoundingClientRect();
      window.addEventListener('mousemove', move, true);
      window.addEventListener('mouseup', up, true);
      e.preventDefault();
    });
    box.appendChild(g);
  }
}

// Switching views (P, T) swaps what the panel holds, and a fit-to-content
// panel would jump to the new content's height. An open panel keeps the size it has, as if the
// user had resized it by hand (see uiiResize).
function uiiHoldPanelSize(p) {
  if (!p.classList.contains('on') || p.classList.contains('min')) return;
  const r = p.getBoundingClientRect();
  Object.assign(p.style, { width: r.width + 'px', height: r.height + 'px', maxHeight: 'none' });
}

// btn: the Copy button pressed, if any. It shows the result in its own
// place for 2s, then its label comes back.
function uiiCopy(text, btn) {
  const S = uiiState;
  // Both places: the panel's own line, and the badge for when C was pressed
  // with the panel closed.
  const say = (msg) => {
    if (btn) { uiiButtonSay(btn, msg); return; }
    uiiFlash(msg);
    if (S.panel) S.panel.ok.textContent = msg;
  };
  const done = () => {
    say('✅ copied');
    setTimeout(() => { if (S.panel) S.panel.ok.textContent = ''; }, 1200);
  };
  if (typeof S.opts.onCopy === 'function') { S.opts.onCopy(text); done(); return; }
  if (!navigator.clipboard) { say('⚠ clipboard blocked'); return; } // plain http: no clipboard API
  navigator.clipboard.writeText(text).then(done, () => say('⚠ clipboard blocked'));
}

function uiiButtonSay(btn, msg) {
  if (!btn.dataset.label) {
    btn.dataset.label = btn.textContent;
    btn.style.minWidth = btn.offsetWidth + 'px'; // no jump when the text is shorter
  }
  btn.textContent = msg;
  clearTimeout(btn.uiiTimer);
  btn.uiiTimer = setTimeout(() => {
    btn.textContent = btn.dataset.label;
    delete btn.dataset.label;
    btn.style.minWidth = '';
  }, 2000);
}

function uiiRow(k, v, swatchHex) {
  const row = uiiEl('div', 'row', undefined, 'row-' + uiiSlug(k));
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
  uiiState.varsMode = false; // a selection is an element view, whatever was open
  P.name.textContent = info.name;
  P.tag.textContent = '<' + info.tag + '>';
  const b = P.body;
  b.textContent = '';
  const idHead = uiiEl('div', 'sec', 'Identity ', 'section-identity');
  const copyAI = uiiEl('button', 'mini', '📋 Copy ID', 'copy-id');
  copyAI.title = 'One line: name, selector, element, stylesheet rules';
  copyAI.addEventListener('click', () => uiiCopy(uiiFormatForAI(info), copyAI));
  idHead.appendChild(copyAI);
  b.appendChild(idHead);
  b.appendChild(uiiRow('Selector', info.path));
  if (info.id) b.appendChild(uiiRow('id', info.id));
  if (info.classes.length) b.appendChild(uiiRow('class', info.classes.join(' ')));
  const textRow = uiiTextContentField(info);
  if (textRow) b.appendChild(textRow);
  b.appendChild(uiiRow('Size', info.width + ' × ' + info.height + 'px · ' + info.display + ' · font ' + info.fontSize));


  // Where-to-edit and the matched-rule list live in the Copy buttons; the
  // Changes box names the one rule each edit touches.
  const stHead = uiiEl('div', 'sec', 'Style — type, ↑↓ or drag a label ', 'section-style');
  const sim = uiiEl('label', 'sim');
  const box = uiiEl('input', '', undefined, 'apply-to-similar');
  box.type = 'checkbox';
  box.checked = uiiState.similar;
  sim.title = 'Also edit the CSS rule itself, so every element it styles changes too';
  sim.append(box, document.createTextNode(' Apply to similar'));
  box.addEventListener('change', () => { uiiState.similar = box.checked; uiiSyncRules(); uiiRefreshChanges(); });
  stHead.appendChild(sim);
  b.appendChild(stHead);
  uiiRenderEditRows(b, info);

  uiiChangesBox(b);
  P.vars.classList.remove('on');
  uiiTreeReveal(info.el); // however the element was picked, the tree follows
  P.reset.disabled = !uiiEditsFor(info.el, false) && !uiiVarEdits.size;
  P.root.classList.add('on');
}
