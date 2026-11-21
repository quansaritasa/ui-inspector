# Changelog — 261121-ui-inspector-ancestor-rules

## Iteration 1 — 2026-11-21
Delivery: Skill

### Added
1. Declared now lists inherited properties that an ancestor's rule sets and that reach the pinned element: the nearest ancestor wins, an own rule or inline value is never repeated, and a value something in between overrides is dropped. Each row's title names the source rule. Ancestor properties that do not inherit (padding, margin…) stay out.
2. `font`-style shorthands are skipped on purpose: authored as one declaration they carry no single longhand value to show.

### Checked
- Built with `node build.js`. Probed in a fixture page in the browser: case A listed `font-size` from `.a` only (own `color` not repeated, no `padding`/`margin`); case B listed `font-weight` from the nearer `.y` and `letter-spacing` from `.x`.
- Not run: the blocked-by-override branch (computed value differs) — no fixture hit it.
- Version bumped to 0.19.10 (`package.json`, `extension/manifest.json`), as the repo does per change.
