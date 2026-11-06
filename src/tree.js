/* ================= the DOM tree =================
   A column down the left of the panel, so picking an element no longer means
   finding it on screen: scan the structure, hover a row to outline it on the
   page, click to pin it. The style fields stay beside it — the column is a
   sibling of the body, not a mode that replaces it.

   Every element is listed, the real tree, with the ones the inspector would
   outline drawn in their human name and the plain wrappers in `<tag.class>`.
   Only expanded nodes are built: a 60,000-element page costs as many rows as
   you have actually opened, never more. */

const UII_TREE_W = 260;    // the column's width, added to the panel's own
const UII_TREE_KIDS = 300; // children drawn per node before "… N more"

// Which nodes show their children. Keyed by element, so the shape survives
// a rebuild after the page mutates; weak, so a removed node is not kept alive.
const uiiTreeOpen = new WeakSet();

// Children worth a row: the inspector's own host and anything the host page
// asked it to ignore are not part of the page you are styling, and <script>
// and <style> draw nothing.
function uiiTreeKids(el) {
  const S = uiiState;
  return [...el.children].filter((c) => c !== S.host && !uiiIgnored(c)
    && c.tagName !== 'SCRIPT' && c.tagName !== 'STYLE' && c.tagName !== 'TEMPLATE');
}

// Would the overlay outline it? Those are the rows worth scanning for, so
// they carry the name and the weight.
function uiiTreeIsControl(el) {
  try { return el.matches(uiiState.selList); } catch (err) { return false; }
}

function uiiTreeTag(el) {
  const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/).filter(Boolean) : [];
  return '<' + el.tagName.toLowerCase() + (el.id ? '#' + el.id : '')
    + (cls.length ? '.' + cls.slice(0, 2).join('.') : '') + '>';
}

function uiiTreeRow(el, depth) {
  const row = uiiEl('div', 'tr');
  row.uii = el;
  row.style.paddingLeft = (4 + depth * 12) + 'px';
  const kids = uiiTreeKids(el);
  const open = uiiTreeOpen.has(el);
  row.appendChild(uiiEl('span', 'tw', kids.length ? (open ? '▾' : '▸') : ''));
  const ctl = uiiTreeIsControl(el);
  row.appendChild(uiiEl('span', ctl ? 'nm' : 'tg', uiiShort(ctl ? uiiName(el) : uiiTreeTag(el), 40)));
  row.title = uiiSegment(el);
  if (el === uiiState.selected) row.classList.add('on');
  return row;
}

function uiiTreeWalk(el, depth, out) {
  out.push(uiiTreeRow(el, depth));
  if (!uiiTreeOpen.has(el)) return;
  const kids = uiiTreeKids(el);
  for (const c of kids.slice(0, UII_TREE_KIDS)) uiiTreeWalk(c, depth + 1, out);
  if (kids.length > UII_TREE_KIDS) {
    const more = uiiEl('div', 'tr more', '… ' + (kids.length - UII_TREE_KIDS) + ' more');
    more.style.paddingLeft = (16 + depth * 12) + 'px';
    out.push(more);
  }
}

// Rebuilt whole, which is cheap because only open nodes produce rows, and
// keeps the scroll where it was so a mutation does not jump the list.
function uiiRenderTree() {
  const P = uiiState.panel;
  if (!P || !P.tree || P.tree.hidden) return;
  const top = P.tree.scrollTop;
  P.tree.textContent = '';
  const out = [];
  uiiTreeWalk(document.body, 0, out);
  P.tree.append(...out);
  P.tree.scrollTop = top;
}

// Open every ancestor of the pinned element so its row exists, then bring it
// into view. Called on every selection, however the element was picked.
function uiiTreeReveal(el) {
  const P = uiiState.panel;
  if (!P || !P.tree || P.tree.hidden) return;
  for (let p = el && el.parentElement; p && p !== document.documentElement; p = p.parentElement) {
    uiiTreeOpen.add(p);
  }
  uiiRenderTree();
  const row = P.tree.querySelector('.tr.on');
  // Guarded: this runs inside every uiiSelect, and a host without
  // scrollIntoView (a test DOM, an old webview) must not break pinning.
  if (row && row.scrollIntoView) row.scrollIntoView({ block: 'nearest' });
}

// The page changed under the tree. Debounced, because a mutation observer
// fires in bursts and a rebuild during one is work thrown away.
function uiiTreeTouch() {
  const S = uiiState;
  clearTimeout(S.treeTimer);
  S.treeTimer = setTimeout(uiiRenderTree, 300);
}

// The panel's width now. Measuring is no good here: T opens the tree with
// nothing pinned, and a panel that has never been shown measures zero, which
// would collapse it to the minimum instead of widening it.
function uiiPanelW(p) {
  return parseFloat(p.style.width) || parseFloat(getComputedStyle(p).width) || UII_PANEL_W;
}

// T, and the header key. The column is a sibling of the body, so the panel
// widens to keep the body the size it was.
function uiiToggleTree() {
  const S = uiiState, P = S.panel;
  if (!P || !P.tree) return;
  const on = P.tree.hidden;
  P.tree.hidden = !on;
  P.treeBtn.classList.toggle('on', on);
  const w = uiiPanelW(P.root);
  // Closing takes off what opening added: a clamped open added less.
  const nw = Math.max(320, Math.min(window.innerWidth - 16,
    on ? w + UII_TREE_W : w - (P.treeAdd ?? UII_TREE_W)));
  if (on) P.treeAdd = nw - w;
  P.root.style.width = nw + 'px';
  if (on) {
    uiiTreeOpen.add(document.body);
    for (const c of uiiTreeKids(document.body)) uiiTreeOpen.add(c);
    uiiTreeReveal(S.selected);
    P.root.classList.add('on'); // T alone opens the panel, with nothing pinned
  }
}

// Bound once, on the column rather than on every row: the rows are thrown
// away and rebuilt, the column is not.
function uiiTreeBind(tree) {
  tree.addEventListener('click', (e) => {
    const row = e.target.closest('.tr');
    if (!row || !row.uii) return;
    if (e.target.classList.contains('tw')) {
      if (uiiTreeOpen.has(row.uii)) uiiTreeOpen.delete(row.uii); else uiiTreeOpen.add(row.uii);
      uiiRenderTree();
      return;
    }
    uiiSelect(row.uii);
  });
  // Hovering a row outlines its element on the page, which is the whole point
  // of scanning the list. uiiOnMove reads the flag: a pointer over the panel
  // normally clears the hover, and here it must not.
  tree.addEventListener('mouseover', (e) => {
    const row = e.target.closest('.tr');
    if (!row || !row.uii) return;
    uiiState.treeHover = true;
    uiiSetHover(row.uii);
  });
  tree.addEventListener('mouseleave', () => {
    uiiState.treeHover = false;
    uiiSetHover(null);
  });
}
