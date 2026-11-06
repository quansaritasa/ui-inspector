/* ================= shadow-DOM stylesheet =================
   Everything the inspector draws lives inside one shadow root, so host CSS
   cannot restyle the panel and this sheet cannot leak into the host. */

const UII_PANEL_W = 500; // the .panel width; tree.js widens the panel from it

const UII_CSS = `
:host { all: initial; }
* { box-sizing: border-box; }
.layer { position: fixed; inset: 0; pointer-events: none; z-index: 2147483000; }
.box { position: fixed; pointer-events: none; border: 1px solid; border-radius: 2px; }
.box.button { border-color: #3b82f6; background: rgba(59,130,246,.06); }
.box.field  { border-color: #16a34a; background: rgba(22,163,74,.06); }
.box.link   { border-color: #9333ea; background: rgba(147,51,234,.06); }
.box.block  { border-color: rgba(249,115,22,.7); border-style: dashed; }  /* containers: no fill, they stack */
.hover { position: fixed; pointer-events: none; z-index: 2147483001; border: 2px dashed #ef4444;
  background: rgba(239,68,68,.08); border-radius: 2px; display: none; }
.hover.on { display: block; }
.pickbox { position: fixed; pointer-events: none; z-index: 2147483001; border: 2px solid #0ea5e9;
  background: rgba(14,165,233,.10); border-radius: 2px; }
.pickbox::before { content: attr(data-n); position: absolute; z-index: 2147483002; top: -2px; left: -2px; padding: 0 3px;
  background: #0ea5e9; color: #fff; border-radius: 2px 0 4px 0;
  font: 700 9px/11px -apple-system, "Segoe UI", system-ui, sans-serif; }
.tip { position: fixed; pointer-events: none; z-index: 2147483002; display: none; max-width: 360px;
  padding: 3px 8px; border-radius: 4px; background: #111827; color: #f9fafb;
  font: 12px/1.4 -apple-system, "Segoe UI", system-ui, sans-serif; white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis; }
.tip.on { display: block; }
.tip b { color: #fbbf24; font-weight: 600; }
.tip i { display: block; color: #93c5fd; font-style: normal; } /* snap hint: second line */
/* Padding (green, inside the border box) and margin (orange, outside it) of
   the pinned element, each drawn as a border so the hole is the inner box. */
.sp { position: fixed; pointer-events: none; z-index: 2147483001; display: none; border-style: solid; }
.sp.on { display: block; }
.sp.mg { border-color: rgba(246,178,107,.55); }
.sp.pd { border-color: rgba(147,196,125,.6); }
.spv { position: fixed; z-index: 2147483002; display: none; padding: 2px 6px; border-radius: 4px;
  background: #111827; color: #9ca3af; font: 11px/1.3 ui-monospace, Menlo, monospace; white-space: nowrap; }
.spv.on { display: block; }
.spv b { color: #93c47d; font-weight: 600; }
.spv i { color: #f6b26b; font-style: normal; }

.badge { position: fixed; z-index: 2147483002; top: 8px; left: 50%; transform: translateX(-50%);
  padding: 4px 12px; border-radius: 999px; background: #111827; color: #f9fafb;
  font: 12px/1.4 -apple-system, "Segoe UI", system-ui, sans-serif; pointer-events: none;
  transition: opacity .4s ease; }
.badge.off { opacity: 0; }
.ptrtoast { position: fixed; z-index: 2147483003; padding: 3px 10px; border-radius: 999px;
  background: #111827; color: #f9fafb; white-space: nowrap; pointer-events: none;
  font: 12px/1.4 -apple-system, "Segoe UI", system-ui, sans-serif; transition: opacity .3s ease; }
.ptrtoast.off { opacity: 0; }
.badge kbd { background: #374151; padding: 0 4px; border-radius: 3px; font: inherit; }
/* Normal view (V): the panel stays, everything the inspector draws goes, so
   an edit is judged against the real screen. !important, because the pieces
   are shown by a second class (.hover.on) of equal weight. */
:host(.peek) .layer, :host(.peek) .hover, :host(.peek) .tip,
:host(.peek) .sp, :host(.peek) .spv, :host(.peek) .pickbox, :host(.peek) .badge { display: none !important; }
.head button.on { background: #1f2937; border-color: #1f2937; color: #fff; }

.panel { position: fixed; z-index: 2147483003; top: 8px; right: 16px; width: ${UII_PANEL_W}px; max-height: calc(100vh - 16px);
  display: none; flex-direction: column; pointer-events: auto;
  background: #ffffff; color: #111827; border: 1px solid #d1d5db; border-radius: 8px;
  box-shadow: 0 12px 32px rgba(0,0,0,.25);
  font: 12px/1.45 -apple-system, "Segoe UI", system-ui, sans-serif; }
.panel.on { display: flex; }
/* Alt held: the panel fades, each key's tooltip stays sharp on top. */
.panel.hints > :not(.hk) { opacity: .3; transition: opacity .12s; }
.hk { position: absolute; z-index: 2; pointer-events: none; white-space: nowrap;
  background: #111827; color: #f9fafb; padding: 3px 7px; border-radius: 4px; font-size: 11px;
  box-shadow: 0 2px 8px rgba(0,0,0,.3); }
.hk b { color: #fbbf24; font-family: ui-monospace, Menlo, monospace; }
.panel.min .split { display: none; }
.panel.min .head { border-bottom: 0; border-radius: 8px; }
.head { display: flex; align-items: center; gap: 6px; padding: 6px 8px 6px 10px; cursor: move;
  background: #f3f4f6; border-bottom: 1px solid #e5e7eb; border-radius: 8px 8px 0 0; user-select: none; }
.head .name { flex: 1; min-width: 0; font-weight: 700; font-size: 13px; overflow: hidden;
  text-overflow: ellipsis; white-space: nowrap; }
.head .tag { color: #6b7280; font-family: ui-monospace, Menlo, monospace; }
/* Square icon buttons: one glyph each, so a fixed box reads as a row of
   equal keys — no word breaks the rhythm. */
.head button { width: 26px; height: 26px; flex: none; display: grid; place-items: center;
  font: inherit; padding: 0; border: 1px solid #d1d5db;
  border-radius: 4px; background: #fff; color: #111827; cursor: pointer; }
.head button:hover { background: #e5e7eb; }
/* Nothing to undo, nothing to reset: the key stays where it is and goes
   quiet, so the row never shifts under the pointer mid-edit. */
.head button:disabled { opacity: .3; cursor: default; }
.head button:disabled:hover { background: #fff; }
/* Three groups, left to right: what you did to the element, what you are
   looking at, and the window itself. */
.head .sep { width: 1px; height: 16px; flex: none; background: #d1d5db; margin: 0 1px; }
/* The body and the tree share the row below the header; each scrolls on its
   own, so a deep tree never pushes the style fields out of reach. */
.split { display: flex; min-height: 0; flex: 1; }
.body { flex: 1; min-width: 0; overflow: auto; padding: 0 0 6px; }
.tree { width: 260px; flex: none; overflow: auto; padding: 4px 0 6px;
  border-right: 1px solid #e5e7eb; background: #fafafa;
  font: 11px/1.5 ui-monospace, Menlo, monospace; }
.tree[hidden] { display: none; }
.tree .tr { display: flex; align-items: center; gap: 2px; white-space: nowrap;
  cursor: pointer; border-radius: 3px; }
.tree .tr:hover { background: #e5e7eb; }
.tree .tr.on { background: #1f2937; color: #fff; }
.tree .tr.on .tg, .tree .tr.on .tw { color: #d1d5db; }
/* A fixed box whether or not the node has children, so the names line up. */
.tree .tw { width: 11px; flex: none; color: #6b7280; text-align: center; }
/* A control reads as the panel would name it; a plain wrapper as its tag. */
.tree .nm { font-weight: 700; overflow: hidden; text-overflow: ellipsis; }
.tree .tg { color: #6b7280; overflow: hidden; text-overflow: ellipsis; }
.tree .more { color: #9ca3af; cursor: default; }
.tree .more:hover { background: none; }
.body > .sec:first-child { margin-top: 0; }
/* Resize handles: four edges, four corners on top of them, just outside the border. */
.grip { position: absolute; z-index: 1; }
.grip.n, .grip.s { left: 8px; right: 8px; height: 7px; cursor: ns-resize; }
.grip.e, .grip.w { top: 8px; bottom: 8px; width: 7px; cursor: ew-resize; }
.grip.n { top: -4px; } .grip.s { bottom: -4px; } .grip.e { right: -4px; } .grip.w { left: -4px; }
.grip.ne, .grip.nw, .grip.se, .grip.sw { width: 14px; height: 14px; z-index: 2; }
.grip.nw { top: -5px; left: -5px; cursor: nwse-resize; } .grip.se { bottom: -5px; right: -5px; cursor: nwse-resize; }
.grip.ne { top: -5px; right: -5px; cursor: nesw-resize; } .grip.sw { bottom: -5px; left: -5px; cursor: nesw-resize; }
/* Minimised: only the header shows, so only its width can change. */
.panel.min { height: auto !important; }
.panel.min .grip:not(.e):not(.w) { display: none; }
.sec { display: flex; align-items: center; min-height: 30px; margin: 6px 0 2px; padding: 3px 10px; background: #e5e7eb; color: #1f2937; font-weight: 700;
  text-transform: uppercase; font-size: 11px; letter-spacing: .05em; }
.row { display: grid; grid-template-columns: 56px minmax(0, 1fr); gap: 8px; padding: 2px 10px; }
.row .k { color: #6b7280; }
.row .v { font-family: ui-monospace, Menlo, monospace; word-break: break-all; }
.row .txt { width: 100%; min-height: 20px; padding: 2px 5px; resize: vertical;
  font: 12px/1.45 ui-monospace, Menlo, monospace; color: #111827; background: #fff;
  border: 1px solid #d1d5db; border-radius: 4px; }
.row .txt:focus { outline: 2px solid #3b82f6; outline-offset: -1px; }
.card { margin: 8px 10px; padding: 8px 10px 10px; border: 1px solid #d1d5db; border-radius: 8px; background: #eef0f3;
  display: flex; flex-direction: column; gap: 8px; }
.card .ct { font-weight: 700; font-size: 12px; }
.g2 { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 8px; }
.g4 { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
.g4 .lab { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fld { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.fld .lab { color: #6b7280; font-size: 11px; user-select: none; }
.fld .lab.scrub { cursor: ew-resize; }
.nf, .tf, .seg { height: 26px; border: 1px solid #d1d5db; border-radius: 6px; background: #fff; }
.nf { display: flex; align-items: center; gap: 4px; padding: 0 6px; min-width: 0; }
.nf:focus-within, .tf:focus { outline: 2px solid #3b82f6; outline-offset: -1px; }
.nf input, .tf { flex: 1; min-width: 0; font: 12px ui-monospace, Menlo, monospace; color: #111827; }
.nf input { border: 0; background: none; outline: none; padding: 0; }
.tf { flex: none; padding: 0 6px; }
.nf select.u { appearance: none; color: #9ca3af; font-size: 10px; text-transform: uppercase; max-width: 45%; text-overflow: ellipsis; padding: 0 2px; }
.nf select.u:hover { color: #111827; }
.st { display: flex; flex-direction: column; margin-right: -4px; }
.st button { width: 14px; height: 11px; padding: 0; border: 0; border-radius: 2px; background: none;
  color: #9ca3af; font-size: 7px; line-height: 11px; cursor: pointer; }
.st button:hover { color: #111827; background: #e5e7eb; }
.nf button.cv { border: 0; background: none; color: #0f766e; font: inherit; font-size: 10px; max-width: 46%;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding: 0 2px; cursor: pointer; }
.nf button.cv::after { content: ' ▾'; color: #9ca3af; }
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
.nf input.pick { width: 18px; height: 18px; padding: 0; border: 1px solid #d1d5db; border-radius: 4px; cursor: pointer; flex: none; background: none; }
/* The swatch fills the whole box: browsers pad and border it by default. */
.nf input.pick::-webkit-color-swatch-wrapper { padding: 0; }
.nf input.pick::-webkit-color-swatch { border: 0; border-radius: 3px; }
.nf input.pick::-moz-color-swatch { border: 0; border-radius: 3px; }
.sec .sim { margin-left: auto; font-size: 11px; font-weight: 400; text-transform: none; letter-spacing: 0; cursor: pointer; }
.sec .sim input { margin: 0 2px 0 0; vertical-align: -2px; }
.sec input.find { margin-left: auto; width: 120px; height: 20px; padding: 0 6px; border: 1px solid #9ca3af; border-radius: 4px;
  background: #fff; color: #111827; font: 11px/1 inherit; font-weight: 400; text-transform: none; letter-spacing: 0; outline: none; }
/* The palette (editvars.js): one row per custom property the page declares. */
.vrs { display: flex; flex-direction: column; gap: 2px; padding: 4px 10px 8px; }
.vr { display: flex; align-items: center; gap: 8px; padding: 2px 4px; border-radius: 5px; }
.sec .find + .mini, .sec .mini + .mini { margin-left: 6px; } /* one auto margin: the pair sits right together */
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
.vr .go { flex: none; width: 18px; height: 18px; padding: 0; border: 1px solid #d1d5db; border-radius: 4px;
  background: #fff; color: #374151; font: 11px/1 inherit; cursor: pointer; }
.vr .go:hover { background: #e5e7eb; }
.sec .mini { margin-left: auto; font-size: 11px; font-weight: 400; text-transform: none; letter-spacing: 0; padding: 4px 10px;
  border: 1px solid #9ca3af; border-radius: 4px; background: #fff; cursor: pointer; }
.chg { display: block; width: calc(100% - 20px); margin: 4px 10px 8px; padding: 6px; resize: vertical;
  font: 11px/1.45 ui-monospace, Menlo, monospace; color: #111827; background: #fff;
  border: 1px solid #d1d5db; border-radius: 6px; }
.sw { display: inline-block; width: 12px; height: 12px; vertical-align: -2px; margin-right: 5px;
  border: 1px solid rgba(0,0,0,.25); border-radius: 2px;
  background-image: linear-gradient(45deg,#ccc 25%,transparent 25%,transparent 75%,#ccc 75%),
    linear-gradient(45deg,#ccc 25%,transparent 25%,transparent 75%,#ccc 75%);
  background-size: 6px 6px; background-position: 0 0, 3px 3px; }
.sw i { display: block; width: 100%; height: 100%; }
.head .undo { color: #1d4ed8; font-size: 15px; }
.head .reset { color: #b91c1c; font-size: 15px; }
.head .ok { color: #16a34a; white-space: nowrap; }
`;
