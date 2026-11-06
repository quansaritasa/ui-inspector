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

// Promise of Map url -> source text, started when inspect mode opens
// (uiiEnable) so the first pin does not wait on the fetches, and kept for the
// session. The promise itself is kept, so a pin during the fetch shares it.
function uiiScriptIndex() {
  const S = uiiState;
  return S.sources || (S.sources = uiiFetchScripts());
}

// A script that never answers must not hold the Copy ID line forever.
const UII_FETCH_MS = 3000;

async function uiiFetchScripts() {
  const map = new Map();
  const jobs = [...document.scripts]
    .filter((s) => s.src && uiiScriptWanted(s.src))
    .map(async (s) => {
      try {
        const res = await fetch(s.src, AbortSignal.timeout ? { signal: AbortSignal.timeout(UII_FETCH_MS) } : undefined);
        if (res.ok) map.set(s.src, await res.text()); // full URL: two index.js must not collide
      } catch (e) { /* cross-origin or unreadable: skip */ }
    });
  await Promise.all(jobs);
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
  const names = scored.map((s) => s.file.split('/').pop().split('?')[0]);
  return [...new Set(names)].slice(0, 3);
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
