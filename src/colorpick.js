/* ================= color picker: the swatch and the one shared panel =========
   Every place that picks a color shows a swatch; clicking it opens the
   vendored color-picker (vendor/) as a popover under that swatch. One picker
   serves them all: opening it for another swatch re-aims it. It lives on the
   shadow root, so the page's CSS cannot reach it. */

// Over the panel (…003) and its var list (…004).
const UII_CP_TWEAKS = '.cp-root { z-index: 2147483005; }'
  + ' .cp-root .cpf { margin: 0 14px 4px; padding: 6px 9px; border-radius: 8px; background: var(--cp-surface-alt);'
  + ' border: 1px solid var(--cp-line); font-size: 11px; line-height: 1.45; }'
  + ' .cp-root .cpf code { display: block; font: 11px ui-monospace, Consolas, monospace; color: var(--cp-ink);'
  + ' word-break: break-all; user-select: text; }'
  + ' .cp-root .cpf small { display: block; color: var(--cp-subtle); font-size: 10px; }';

// The Text and Background swatches of the card on screen. Opening either one
// shows both in the picker (Text tab first), so the pair is tuned together.
const uiiCpPair = {};
const UII_CP_SLOTS = [
  { id: 'text', label: 'Text', symbol: 'Aa', presetSet: 'text' },
  { id: 'background', label: 'Background', symbol: '■', presetSet: 'background' },
];

// A swatch with the surface of the <input type=color> it replaces: `.value`
// reads and writes a #rrggbb; `onPick` gets each color picked from the panel.
// `slot` ('text' | 'background') enrols it in the pair above. `formula()`
// answers { code, src }: how the page's CSS writes this color, shown in the popup.
function uiiColorSwatch(initial, onPick, slot, formula) {
  const btn = uiiEl('button', 'pick');
  btn.type = 'button';
  btn.title = 'Pick a color';
  let value = '#000000';
  Object.defineProperty(btn, 'value', {
    get: () => value,
    set: (v) => {
      // Fully transparent paints nothing: show the checkerboard (.hollow), and give the picker a valid #rrggbbaa.
      const hollow = v === 'transparent' || /^#[0-9a-f]{6}00$/i.test(v);
      value = v === 'transparent' ? '#00000000' : v;
      btn.classList.toggle('hollow', hollow);
      btn.style.background = hollow ? '' : v;
    },
  });
  btn.value = initial;
  const me = { swatch: btn, onPick, formula };
  if (slot) uiiCpPair[slot] = me;
  btn.addEventListener('click', () => uiiOpenPicker(btn, me, slot));
  return btn;
}

// Private state: the one picker, what it is aimed at, and whether a pick is held.
let uiiCp = null;     // the library instance, built on first use
let uiiCpUse = null;  // { anchor, targets: {slot: {swatch, onPick}}, last } it serves; null = none, writes ignored
let uiiCpKind = '';   // 'pair' | 'single': the slots the instance was built with
let uiiCpHeld = false;
let uiiCpFormula = null; // the line in the popup that says how the CSS writes the color

// Fill the formula line for the tab in view.
function uiiShowFormula() {
  if (!uiiCp || !uiiCpFormula || !uiiCpUse) return;
  const f = uiiCpUse.formulas[uiiCp.activeSlot];
  uiiCpFormula.replaceChildren();
  uiiCpFormula.hidden = !f;
  if (!f) return;
  uiiCpFormula.append(uiiEl('code', '', f.code));
  if (f.src) uiiCpFormula.append(uiiEl('small', '', f.src));
}

function uiiBuildPicker(paired) {
  // The library takes an element for a container, not a shadow root.
  const old = uiiState.shadow.getElementById('color-picker');
  if (old) old.remove(); // destroy() may leave its mount; ids stay unique
  const mount = uiiState.shadow.appendChild(uiiEl('div', '', undefined, 'color-picker'));
  const picker = new UiiColorPicker({
    container: mount,
    mode: 'popover',
    showAlpha: true, // #rrggbb, or #rrggbbaa when translucent
    ...(paired ? { slots: UII_CP_SLOTS } : { initialColors: { color: '#000000' } }),
    onChange: (c) => {
      const use = uiiCpUse;
      if (!use) return;
      // The whole pick is one undo step and one rule rewrite, like a drag.
      if (!uiiCpHeld) { uiiCpHeld = true; uiiHold(true, true); }
      for (const id of Object.keys(use.targets)) {
        if (c[id] === use.last[id]) continue;
        use.targets[id].onPick(c[id]);
        use.targets[id].swatch.value = c[id]; // the one place a pick repaints its swatch
      }
      use.last = { ...c };
    },
    onClose: () => {
      if (uiiCpHeld) { uiiCpHeld = false; uiiHold(false); }
      uiiCpUse = null;
    },
  });
  // Above the editor, where it reads with the tabs; follows a tab change.
  uiiCpFormula = uiiEl('div', 'cpf');
  picker.root.querySelector('.cp-editor').before(uiiCpFormula);
  const later = () => setTimeout(uiiShowFormula, 0);
  picker.root.addEventListener('click', later);
  picker.root.addEventListener('keyup', later);
  return picker;
}

function uiiOpenPicker(anchor, me, slot) {
  const onPick = me.onPick;
  // Both halves of the pair must be on screen, else this swatch goes alone.
  const mate = slot === 'text' ? 'background' : 'text';
  const peer = slot && uiiCpPair[mate];
  const paired = !!(peer && peer.swatch.isConnected && uiiCpPair[slot].swatch === anchor);
  // A press on an open picker's own swatch closes it (the library lets that
  // press through, see vendor/ header), so the click only has to toggle.
  if (uiiCp && uiiCp.isOpen && uiiCpUse && uiiCpUse.anchor === anchor) { uiiCp.dismiss(); return; }
  if (uiiCp && uiiCp.isOpen) uiiCp.close();
  const kind = paired ? 'pair' : 'single';
  if (uiiCp && uiiCpKind !== kind) { uiiCp.destroy(); uiiCp = uiiCpFormula = null; }
  if (!uiiCp) { uiiCp = uiiBuildPicker(paired); uiiCpKind = kind; }
  // setColors emits onChange: aim at nothing first, or switching swatches writes.
  uiiCpUse = null;
  const targets = paired
    ? { [slot]: me, [mate]: peer }
    : { color: me };
  const last = Object.fromEntries(Object.entries(targets).map(([id, t]) => [id, t.swatch.value]));
  uiiCp.setColors(last);
  if (paired) uiiCp.setActiveSlot(slot);
  const formulas = {};
  for (const id of Object.keys(targets)) formulas[id] = targets[id].formula && targets[id].formula();
  uiiCpUse = { anchor, targets, last, formulas };
  uiiCp.open(anchor);
  uiiShowFormula();
}

function uiiColorPickerOpen() { return !!uiiCp && uiiCp.isOpen; }
function uiiDismissColorPicker() { if (uiiColorPickerOpen()) uiiCp.dismiss(); }
function uiiCloseColorPicker() { if (uiiColorPickerOpen()) uiiCp.close(); }
function uiiDestroyColorPicker() {
  if (uiiCpHeld) { uiiCpHeld = false; uiiHold(false); } // never leave an undo step open
  if (uiiCp) uiiCp.destroy();
  uiiCp = uiiCpUse = uiiCpFormula = null;
  uiiCpKind = '';
}
