/* ================= which source files mention this element =================
   The DOM cannot say which script wired a button, so the page's own
   <script src> files are fetched once (same origin, works over file:// in
   Electron) and searched for the element's id and classes. Vendor bundles are
   skipped by default — a hit there names a library, not the app's code. */

function uiiScriptWanted(url) {
  const f = uiiState.opts.scripts;
  if (typeof f === 'function') return f(url);
  return !/\/(vendor|node_modules|dist)\//.test(url);
}

// Map basename -> source text, built on first use and kept for the session.
async function uiiScriptIndex() {
  const S = uiiState;
  if (S.sources) return S.sources;
  const map = new Map();
  const jobs = [...document.scripts]
    .filter((s) => s.src && uiiScriptWanted(s.src))
    .map(async (s) => {
      try {
        const res = await fetch(s.src);
        if (res.ok) map.set(s.src.split('/').pop().split('?')[0], await res.text());
      } catch (e) { /* cross-origin or unreadable: skip */ }
    });
  await Promise.all(jobs);
  S.sources = map;
  return map;
}

// Tokens that identify the element in code: its id first, then each class.
// Quoted forms ('edit-btn', "edit-btn") and selector forms (#edit-btn,
// .row) count; a bare word does not, it would match prose in comments.
function uiiCodeTokens(info) {
  const toks = [];
  if (info.id) toks.push({ re: uiiTokenRe(info.id, '#'), w: 3 });
  for (const c of info.classes.slice(0, 3)) toks.push({ re: uiiTokenRe(c, '.'), w: 1 });
  return toks;
}

function uiiTokenRe(name, prefix) {
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp('([\'"`]' + esc + '[\'"`]|\\' + prefix + esc + '(?![\\w-]))', 'g');
}

// Basenames of the scripts that mention the element, best match first.
async function uiiCodeFiles(info) {
  const idx = await uiiScriptIndex();
  const toks = uiiCodeTokens(info);
  if (!toks.length) return [];
  const scored = [];
  for (const [file, text] of idx) {
    let score = 0;
    for (const t of toks) {
      const n = (text.match(t.re) || []).length;
      if (n) score += t.w * n;
    }
    if (score) scored.push({ file, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 3).map((s) => s.file);
}

// Stylesheet files behind the matched rules, most specific last in sheet
// order so the first named is the app's own sheet, not a reset. No selector:
// the element's class in the locator greps every rule at once.
function uiiCssFiles(info) {
  const out = [];
  for (const r of info.rules) {
    if (r.selector === '*' || r.selector === 'html' || r.selector === 'body') continue;
    if (r.file.startsWith('<style')) continue; // injected at runtime: nothing to open
    const f = r.file.replace(/^renderer\//, '');
    if (!out.includes(f)) out.push(f);
  }
  return out.slice(0, 3);
}
