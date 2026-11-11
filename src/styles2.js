/* ================= shadow-DOM stylesheet, part 2 ================= */

const UII_CSS2 = `
.nf button.cv::after { content: ' ▾'; color: #9ca3af; }
/* Border style: the same button and list, a stroke of the style in each row. */
.nf button.cv.pl { flex: 1; max-width: none; height: 100%; color: #374151; font: 12px ui-monospace, Menlo, monospace;
  text-align: left; padding: 0 6px; }
.nf button.cv.pl::after { float: right; }
.cvl i.ln { width: 28px; height: 0; border: 0 solid #374151; border-top-width: 4px; border-radius: 0; background: none; }
.cvl button.on i.ln { border-color: #0f766e; }
.cvl { position: fixed; z-index: 2147483004; min-width: 180px; max-width: 320px; max-height: 240px; overflow: auto;
  background: #fff; border: 1px solid #d1d5db; border-radius: 6px; box-shadow: 0 6px 20px rgba(0,0,0,.15); padding: 3px;
  pointer-events: auto; font: 12px/1.45 -apple-system, "Segoe UI", system-ui, sans-serif; } /* outside .panel: own font */
.cvl button { display: flex; align-items: center; gap: 6px; width: 100%; border: 0; background: none; padding: 3px 6px;
  border-radius: 4px; cursor: pointer; color: #374151; font: inherit; font-size: 11px; text-align: left; }
.cvl button:hover { background: #f3f4f6; }
/* The value in force, told apart from whatever the pointer happens to be over:
   the teal the .cv button already uses for a variable, and a bar down the side
   that costs no layout (a ::before would push the row's flex items along). */
.cvl button.on { background: #ecfdf5; color: #0f766e; font-weight: 600; box-shadow: inset 2px 0 0 #0f766e; }
.cvl button.on:hover { background: #d1fae5; }
.cvl .n { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cvl i { width: 14px; height: 14px; border-radius: 3px; border: 1px solid rgba(0,0,0,.15); flex: none; }
.cvl .h { color: #9ca3af; font-family: ui-monospace, Menlo, monospace; font-size: 10px; }
.nf select { font-size: 11px; border: 0; background: none; color: #374151; cursor: pointer; max-width: 55%; }
/* The open list is the browser's, not ours: Chrome on Windows and Linux and
   Firefox paint the options with this, macOS draws its own menu and marks the
   current value with a checkmark instead. */
.nf select option { background: #fff; color: #374151; font-weight: 400; text-transform: none; }
.nf select option:checked { background: #ecfdf5; color: #0f766e; font-weight: 600; }
.seg { display: flex; overflow: hidden; }
.seg button { flex: 1; border: 0; background: none; color: #4b5563; cursor: pointer; display: grid; place-items: center; }
.seg button + button { border-left: 1px solid #e5e7eb; }
.seg button.on { background: #111827; color: #fff; }
.nf button.pick { width: 22px; height: 22px; padding: 0; border: 1px solid #d1d5db; border-radius: 4px; cursor: pointer; flex: none; background: #000; }
.sec .sim { margin-left: auto; font-size: 11px; font-weight: 400; text-transform: none; letter-spacing: 0; cursor: pointer; }
.sec .sim input { margin: 0 2px 0 0; vertical-align: -2px; }
.sec input.find { margin-left: auto; width: 120px; height: 20px; padding: 0 6px; border: 1px solid #9ca3af; border-radius: 4px;
  background: #fff; color: #111827; font: 11px/1 inherit; font-weight: 400; text-transform: none; letter-spacing: 0; outline: none; }
/* The palette (editvars.js): one row per custom property the page declares. */
.vrs { display: flex; flex-direction: column; gap: 2px; padding: 4px 10px 8px; }
.vr { display: flex; align-items: center; gap: 8px; padding: 2px 4px; border-radius: 5px; }
.sec .find + .mini, .sec .mini + .mini, .sec .sim + .mini { margin-left: 6px; } /* one auto margin: the pair sits right together */
.vr[hidden] { display: none; } /* display:flex above beats the hidden attribute */
.vr .n { flex: 0 0 42%; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  color: #0f766e; font-family: ui-monospace, Menlo, monospace; font-size: 11px; }
.vr .nf { flex: 1; min-width: 0; height: 24px; }
.vr.on { background: #ecfdf5; box-shadow: inset 2px 0 0 #0f766e; }
.vnone { padding: 8px 10px; color: #6b7280; }
.vgrp { padding: 6px 4px 0; color: #6b7280; font: 600 10px/1.2 ui-monospace, Menlo, monospace; }
/* The pinned element's own declarations (editprops.js), folded away when the
   list is long. summary.sec keeps the section bar's look; the marker is the
   only part a <details> adds. */
.more > summary { cursor: pointer; }
.more > summary::marker { color: #6b7280; }
.vr.add { margin-top: 4px; padding-top: 6px; border-top: 1px dashed #d1d5db; border-radius: 0; }
.vr input.n { height: 24px; padding: 0 6px; border: 1px solid #d1d5db; border-radius: 5px;
  background: #fff; outline: none; }
.vr input.n:focus { outline: 2px solid #3b82f6; outline-offset: -1px; }
.vr .go { flex: none; width: 24px; height: 24px; padding: 0; border: 1px solid #d1d5db; border-radius: 4px;
  background: #fff; color: #374151; font: 13px/1 inherit; cursor: pointer; }
.vr .go:hover { background: #e5e7eb; }
.sec .mini { margin-left: auto; font-weight: 400; text-transform: none; letter-spacing: 0; padding: 6px 12px; font-size: 12px;
  border: 1px solid #9ca3af; border-radius: 4px; background: #fff; cursor: pointer; }
.chg { display: block; width: calc(100% - 20px); margin: 4px 10px 8px; padding: 6px; resize: vertical;
  font: 11px/1.45 ui-monospace, Menlo, monospace; color: #111827; background: #fff;
  border: 1px solid #d1d5db; border-radius: 6px; }
.sw { display: inline-block; width: 12px; height: 12px; vertical-align: -2px; margin-right: 5px;
  border: 1px solid rgba(0,0,0,.25); border-radius: 2px;
  background-image: linear-gradient(45deg,#ccc 25%,transparent 25%,transparent 75%,#ccc 75%),
    linear-gradient(45deg,#ccc 25%,transparent 25%,transparent 75%,#ccc 75%);
  background-size: 6px 6px; background-position: 0 0, 3px 3px; }
.nf button.pick.hollow { background-color: #fff;
  background-image: linear-gradient(45deg,#ccc 25%,transparent 25%,transparent 75%,#ccc 75%),
    linear-gradient(45deg,#ccc 25%,transparent 25%,transparent 75%,#ccc 75%);
  background-size: 8px 8px; background-position: 0 0, 4px 4px; }
.sw i { display: block; width: 100%; height: 100%; }
.head .undo { color: #1d4ed8; font-size: 15px; }
.head .reset { color: #b91c1c; font-size: 15px; }
.head .ok { color: #16a34a; white-space: nowrap; }
`;
