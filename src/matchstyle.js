/* ================= match the last pick =================
   Shift+click several elements, then copy a prompt: make the earlier ones
   look like the last. Only the props that differ are listed. */

const UII_MATCH_PROPS = [
  'color', 'background-color', 'background-image', 'font-family', 'font-size', 'font-weight',
  'font-style', 'line-height', 'letter-spacing', 'text-align', 'text-transform', 'text-decoration-line',
  'padding', 'border-width', 'border-style', 'border-color', 'border-radius', 'box-shadow', 'opacity',
];

// "[a], [b] and [c]" — the pick list as one phrase.
const uiiJoinList = (ids) => (ids.length < 2 ? ids[0] : ids.slice(0, -1).join(', ') + ' and ' + ids[ids.length - 1]);

const uiiMatchRead = (el) => {
  const cs = getComputedStyle(el);
  return UII_MATCH_PROPS.map((p) => cs.getPropertyValue(p).replace(/rgba?\([^)]*\)/g, uiiToHex));
};

// infos: the pick list, the last one the style source.
function uiiMatchPrompt(infos) {
  const src = infos[infos.length - 1], targets = infos.slice(0, -1);
  const want = uiiMatchRead(src.el);
  const diffs = targets.map((t) => {
    const have = uiiMatchRead(t.el);
    return UII_MATCH_PROPS.filter((_, i) => have[i] !== want[i]);
  });
  const head = 'Make ' + uiiJoinList(targets.map(uiiFormatForAI)) + ' match the styling of ' + uiiFormatForAI(src) + '.';
  const used = UII_MATCH_PROPS.filter((p) => diffs.some((d) => d.includes(p)));
  if (!used.length) return head + '\nThey already match on every visual property checked.';
  const decls = used.map((p) => '  ' + p + ': ' + want[UII_MATCH_PROPS.indexOf(p)] + ';');
  const per = targets.map((t, i) => '  ' + (t.name || t.tag) + ' → ' + (diffs[i].join(', ') || 'already matches'));
  return head + '\nApply to each target:\n' + decls.join('\n') + '\nCurrently differs:\n' + per.join('\n');
}

// btn: shows the "Copied" feedback; the C-style key passes none.
function uiiCopyMatch(btn) {
  const S = uiiState;
  if (S.picks.length < 2) { uiiFlash('Shift+click 2+ elements — the last one is the style'); return; }
  Promise.all(S.picks.map((p) => p.ready)).then((infos) => uiiCopy(uiiMatchPrompt(infos), btn));
}

// Spread into the Identity header; nothing until two elements are picked.
function uiiMatchBtn() {
  if (uiiState.picks.length < 2) return [];
  const b = uiiEl('button', 'mini', '🎯 Match last', 'match-last');
  b.title = 'Prompt: make the earlier picks match the last pick\'s styling (props that differ)';
  b.addEventListener('click', () => uiiCopyMatch(b));
  return [b];
}
