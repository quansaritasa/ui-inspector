/* ================= colour picker: the swatch and the one shared panel =========
   Every place that picks a colour shows a swatch; clicking it opens the
   vendored color-picker (vendor/) as a popover under that swatch. One picker
   serves them all: opening it for another swatch re-aims it. It lives on the
   shadow root, so the page's CSS cannot reach it. */

// Over the panel (…003) and its var list (…004).
const UII_CP_TWEAKS = '.cp-root { z-index: 2147483005; }';

// A swatch with the surface of the <input type=color> it replaces: `.value`
// reads and writes a #rrggbb; `onPick` gets each colour picked from the panel.
function uiiColorSwatch(initial, onPick) {
  const btn = uiiEl('button', 'pick');
  btn.type = 'button';
  btn.title = 'Pick a colour';
  let value = '#000000';
  Object.defineProperty(btn, 'value', {
    get: () => value,
    set: (v) => { value = v; btn.style.background = v; },
  });
  btn.value = initial;
  btn.addEventListener('click', () => uiiOpenPicker(btn, onPick));
  return btn;
}

// Private state: the one picker, what it is aimed at, and whether a pick is held.
let uiiCp = null;     // the library instance, built on first use
let uiiCpUse = null;  // { anchor, onPick } of the swatch it serves; null = none, writes ignored
let uiiCpHeld = false;

function uiiBuildPicker() {
  // The library takes an element for a container, not a shadow root.
  const mount = uiiState.shadow.appendChild(uiiEl('div'));
  return new UiiColorPicker({
    container: mount,
    mode: 'popover',
    showAlpha: false, // the swatch it replaces took #rrggbb alone
    initialColors: { color: '#000000' },
    onChange: (c) => {
      if (!uiiCpUse) return;
      // The whole pick is one undo step and one rule rewrite, like a drag.
      if (!uiiCpHeld) { uiiCpHeld = true; uiiHold(true); }
      uiiCpUse.onPick(c.color);
      uiiCpUse.anchor.value = c.color; // the one place a pick repaints its swatch
    },
    onClose: () => {
      if (uiiCpHeld) { uiiCpHeld = false; uiiHold(false); }
      uiiCpUse = null;
    },
  });
}

function uiiOpenPicker(anchor, onPick) {
  if (!uiiCp) uiiCp = uiiBuildPicker();
  // A press on an open picker's own swatch closes it (the library lets that
  // press through, see vendor/ header), so the click only has to toggle.
  if (uiiCp.isOpen && uiiCpUse && uiiCpUse.anchor === anchor) { uiiCp.dismiss(); return; }
  if (uiiCp.isOpen) uiiCp.close();
  // setColors emits onChange: aim at nothing first, or switching swatches writes.
  uiiCpUse = null;
  uiiCp.setColors({ color: anchor.value });
  uiiCpUse = { anchor, onPick };
  uiiCp.open(anchor);
}

function uiiColorPickerOpen() { return !!uiiCp && uiiCp.isOpen; }
function uiiDismissColorPicker() { if (uiiColorPickerOpen()) uiiCp.dismiss(); }
function uiiCloseColorPicker() { if (uiiColorPickerOpen()) uiiCp.close(); }
function uiiDestroyColorPicker() {
  if (uiiCpHeld) { uiiCpHeld = false; uiiHold(false); } // never leave an undo step open
  if (uiiCp) uiiCp.destroy();
  uiiCp = uiiCpUse = null;
}
