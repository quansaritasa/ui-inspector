/* ================= shadow-DOM stylesheet =================
   Everything the inspector draws lives inside one shadow root, so host CSS
   cannot restyle the panel and this sheet cannot leak into the host. */

const UII_CSS = `
:host { all: initial; }
* { box-sizing: border-box; }
.layer { position: fixed; inset: 0; pointer-events: none; z-index: 2147483000; }
.box { position: fixed; pointer-events: none; border: 1px solid; border-radius: 2px; }
.box.button { border-color: #3b82f6; background: rgba(59,130,246,.06); }
.box.field  { border-color: #16a34a; background: rgba(22,163,74,.06); }
.box.link   { border-color: #9333ea; background: rgba(147,51,234,.06); }
.box.block  { border-color: rgba(249,115,22,.7); border-style: dashed; }  /* containers: no fill, they stack */
.hover { position: fixed; pointer-events: none; z-index: 2147483001; border: 2px solid #ef4444;
  background: rgba(239,68,68,.08); border-radius: 2px; display: none; }
.hover.on { display: block; }
.hover:not(.sel) { border-style: dashed; }
.hover.sel { background: rgba(239,68,68,.14); }
.tip { position: fixed; pointer-events: none; z-index: 2147483002; display: none; max-width: 360px;
  padding: 3px 8px; border-radius: 4px; background: #111827; color: #f9fafb;
  font: 12px/1.4 -apple-system, "Segoe UI", system-ui, sans-serif; white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis; }
.tip.on { display: block; }
.tip b { color: #fbbf24; font-weight: 600; }
.badge { position: fixed; z-index: 2147483002; top: 8px; left: 50%; transform: translateX(-50%);
  padding: 4px 12px; border-radius: 999px; background: #111827; color: #f9fafb;
  font: 12px/1.4 -apple-system, "Segoe UI", system-ui, sans-serif; pointer-events: none; }
.badge kbd { background: #374151; padding: 0 4px; border-radius: 3px; font: inherit; }

.panel { position: fixed; z-index: 2147483003; top: 48px; right: 16px; width: 500px; max-height: calc(100vh - 64px);
  display: none; flex-direction: column; pointer-events: auto;
  background: #ffffff; color: #111827; border: 1px solid #d1d5db; border-radius: 8px;
  box-shadow: 0 12px 32px rgba(0,0,0,.25);
  font: 12px/1.45 -apple-system, "Segoe UI", system-ui, sans-serif; }
.panel.on { display: flex; }
.panel.min .body, .panel.min .foot { display: none; }
.panel.min .head { border-bottom: 0; border-radius: 8px; }
.head { display: flex; align-items: center; gap: 8px; padding: 8px 10px; cursor: move;
  background: #f3f4f6; border-bottom: 1px solid #e5e7eb; border-radius: 8px 8px 0 0; user-select: none; }
.head .name { flex: 1; min-width: 0; font-weight: 700; font-size: 13px; overflow: hidden;
  text-overflow: ellipsis; white-space: nowrap; }
.head .tag { color: #6b7280; font-family: ui-monospace, Menlo, monospace; }
.head button, .foot button { font: inherit; padding: 3px 8px; border: 1px solid #d1d5db;
  border-radius: 4px; background: #fff; color: #111827; cursor: pointer; }
.head button:hover, .foot button:hover { background: #e5e7eb; }
.body { overflow: auto; padding: 0 0 6px; }
.body > .sec:first-child { margin-top: 0; }
.grip { position: absolute; left: -3px; top: 0; bottom: 0; width: 7px; cursor: ew-resize; z-index: 1; }
.grip:hover { background: rgba(59,130,246,.35); }
.sec { margin: 6px 0 2px; padding: 3px 10px; background: #e5e7eb; color: #1f2937; font-weight: 700;
  text-transform: uppercase; font-size: 11px; letter-spacing: .05em; }
.row { display: grid; grid-template-columns: 56px minmax(0, 1fr); gap: 8px; padding: 2px 10px; }
.row .k { color: #6b7280; }
.row .v { font-family: ui-monospace, Menlo, monospace; word-break: break-all; }
.row .v .var { color: #0f766e; margin-left: 6px; }
.card { margin: 8px 10px; padding: 8px 10px 10px; border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb;
  display: flex; flex-direction: column; gap: 8px; }
.card .ct { font-weight: 700; font-size: 12px; }
.g2 { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 8px; }
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
.nf .var { color: #0f766e; font-size: 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 40%; }
.nf select { font-size: 11px; border: 0; background: none; color: #374151; cursor: pointer; max-width: 55%; }
.seg { display: flex; overflow: hidden; }
.seg button { flex: 1; border: 0; background: none; color: #4b5563; cursor: pointer; display: grid; place-items: center; }
.seg button + button { border-left: 1px solid #e5e7eb; }
.seg button.on { background: #111827; color: #fff; }
.nf input.pick { width: 18px; height: 18px; padding: 0; border: 1px solid #d1d5db; border-radius: 4px; cursor: pointer; flex: none; }
.sec .sim { float: right; font-size: 11px; font-weight: 400; text-transform: none; letter-spacing: 0; cursor: pointer; }
.sec .sim input { margin: 0 2px 0 0; vertical-align: -2px; }
.sec .mini { float: right; font-size: 11px; font-weight: 400; text-transform: none; letter-spacing: 0; padding: 0 6px;
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
.foot { display: flex; flex-wrap: wrap; gap: 6px; padding: 8px 10px; border-top: 1px solid #e5e7eb; }
.foot .reset { color: #b91c1c; }
.foot .reset[hidden] { display: none; }
.foot .ok { color: #16a34a; align-self: center; }
`;
