/* ================= live editing: the words on screen =================
   The style fields change how a control looks; this one changes what it
   says. Retyping the label is how you find out whether a button survives a
   longer word, so the Text row in the panel is a box you can type into and
   the page follows every keystroke. Reset puts the original words back. */

// The text node holding most of an element's words. A node, not an element:
// writing to it leaves an icon, a badge or a nested <b> exactly where it was,
// where setting textContent would wipe them out.
function uiiMainTextNode(el) {
  const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let best = null, n;
  for (let i = 0; (n = walk.nextNode()) && i < 200; i++) {
    if (n.data.trim() && (!best || n.data.trim().length > best.data.trim().length)) best = n;
  }
  return best;
}

// What a form control says lives in .value, not in a child node.
function uiiValueEl(el) {
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' ? el : null;
}

function uiiSetText(info, value) {
  const el = info.el;
  const e = uiiEditsFor(el, true);
  const ve = uiiValueEl(el);
  // One step for the whole retype: the first keystroke records the words as
  // they were, and every keystroke after lands inside that same step.
  if (!e.text) {
    uiiUndoAdd({ k: 'text', el });
    e.text = ve ? { el: ve, from: ve.value } : { node: info.textNode, from: info.textNode.data };
  }
  // The node's own indentation is not part of the words: a <span> written
  // across two lines keeps the spaces that separate it from its neighbours.
  if (ve) ve.value = value;
  else {
    const pad = /^(\s*)[\s\S]*?(\s*)$/.exec(e.text.from);
    e.text.node.data = pad[1] + value + pad[2];
  }
  if (uiiState.panel) uiiState.panel.reset.disabled = false;
  uiiScheduleDraw();
}

// The Text row: a box, not a label, whenever there are words to retype.
function uiiTextContentField(info) {
  const ve = uiiValueEl(info.el);
  info.textNode = ve ? null : uiiMainTextNode(info.el);
  if (!ve && !info.textNode) return null;
  const row = uiiEl('div', 'row', undefined, 'row-text');
  row.appendChild(uiiEl('span', 'k', 'Text'));
  const box = uiiEl('textarea', 'txt', undefined, 'text-content');
  box.spellcheck = false;
  box.rows = 1;
  box.title = 'Type to change the words on screen — ↺ Reset puts them back';
  box.value = ve ? ve.value : info.textNode.data.trim();
  box.addEventListener('input', () => uiiSetText(info, box.value));
  row.appendChild(box);
  return row;
}

// Undo half of uiiSetText, for uiiResetOne.
function uiiRestoreText(e) {
  if (!e.text) return;
  if (e.text.el) e.text.el.value = e.text.from;
  else e.text.node.data = e.text.from;
}
