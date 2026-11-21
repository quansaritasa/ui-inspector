# PRs for 261121-ui-inspector-ancestor-rules

## https://github.com/quansaritasa/ui-inspector/pull/9 — 2026-11-21

# 261121-ui-inspector-ancestor-rules — Declared shows only ancestor rules that reach the element

## Goal
- The **Declared** section of the popup listed only the pinned element's own rules, so an inherited value (font-size, color…) coming from an ancestor was invisible. It now lists those, and only those that really reach the element.

## Added
**[1] - Panel - Inherited properties in Declared.**
- Purpose: show where an inherited value comes from, without listing ancestor rules that do not affect the element.
- Details: for each inherited longhand the element does not set itself, the nearest ancestor rule that declares it is listed with its source in the row title. An ancestor value is dropped when the value on screen differs from the ancestor's computed value (something in between overrides it). Properties that do not inherit (padding, margin, border…) are never listed. Rows are editable like own rows and write inline on the pinned element. The summary counts them (`N inherited`).

## Key decisions
- "Affected" means the CSS inheritance rule itself: inherited property, not set on the element, same computed value as the ancestor — Why: it needs no heuristics and matches what the browser does.
- Shorthands such as `font` are skipped — Why: authored as one declaration they carry no single longhand value to show.

## Risks
- Specificity between two rules on the same ancestor is not compared; the later rule in sheet order wins — Mitigation: none yet, low impact.
- Deep trees — Mitigation: the walk stops after 12 ancestors and the filter box narrows the list.

## Testing
- Verified: built with `node build.js`; probed in the browser on a fixture page — own `color` is not repeated, ancestor `padding`/`margin` are absent, the nearer ancestor wins for `font-weight`, `letter-spacing` still comes from the farther one.
- Not verified: the override-in-between branch (computed value differs); no fixture hit it.

## Related areas
- Declared section (`src/editprops.js`), new `src/editinherit.js`, `build.js` order, version 0.19.10.
