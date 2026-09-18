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

.panel { position: fixed; z-index: 2147483003; top: 48px; right: 16px; width: 380px; max-height: calc(100vh - 64px);
  display: none; flex-direction: column; pointer-events: auto;
  background: #ffffff; color: #111827; border: 1px solid #d1d5db; border-radius: 8px;
  box-shadow: 0 12px 32px rgba(0,0,0,.25);
  font: 12px/1.45 -apple-system, "Segoe UI", system-ui, sans-serif; }
.panel.on { display: flex; }
.head { display: flex; align-items: center; gap: 8px; padding: 8px 10px; cursor: move;
  background: #f3f4f6; border-bottom: 1px solid #e5e7eb; border-radius: 8px 8px 0 0; user-select: none; }
.head .name { flex: 1; min-width: 0; font-weight: 700; font-size: 13px; overflow: hidden;
  text-overflow: ellipsis; white-space: nowrap; }
.head .tag { color: #6b7280; font-family: ui-monospace, Menlo, monospace; }
.head button, .foot button { font: inherit; padding: 3px 8px; border: 1px solid #d1d5db;
  border-radius: 4px; background: #fff; color: #111827; cursor: pointer; }
.head button:hover, .foot button:hover { background: #e5e7eb; }
.body { overflow: auto; padding: 6px 0; }
.sec { padding: 4px 10px 2px; color: #6b7280; font-weight: 600; text-transform: uppercase;
  font-size: 10px; letter-spacing: .04em; }
.row { display: grid; grid-template-columns: 96px minmax(0, 1fr); gap: 8px; padding: 2px 10px; }
.row .k { color: #6b7280; }
.row .v { font-family: ui-monospace, Menlo, monospace; word-break: break-all; }
.row .v .var { color: #0f766e; }
.sw { display: inline-block; width: 12px; height: 12px; vertical-align: -2px; margin-right: 5px;
  border: 1px solid rgba(0,0,0,.25); border-radius: 2px;
  background-image: linear-gradient(45deg,#ccc 25%,transparent 25%,transparent 75%,#ccc 75%),
    linear-gradient(45deg,#ccc 25%,transparent 25%,transparent 75%,#ccc 75%);
  background-size: 6px 6px; background-position: 0 0, 3px 3px; }
.sw i { display: block; width: 100%; height: 100%; }
.rule { padding: 2px 10px; font-family: ui-monospace, Menlo, monospace; word-break: break-all; }
.rule .f { color: #6b7280; }
.foot { display: flex; gap: 6px; padding: 8px 10px; border-top: 1px solid #e5e7eb; }
.foot .ok { color: #16a34a; align-self: center; }
`;
