# PRs for 261121-ui-inspector-ancestor-rules

## https://github.com/quansaritasa/ui-inspector/pull/9 — 2026-11-21

## 261121-ui-inspector-ancestor-rules — Declared shows only ancestor rules that reach the element

**Type:** 🧩 Feature

### 🎨 UI changes
1 - Declared list: inherited properties from an ancestor rule now appear, with the source rule on hover.

### ➕ Added
**1 - Panel: Declared lists inherited properties, so an inherited font-size or color has a visible source.**
- Details: only inherited properties the element does not set itself, and whose value still matches the ancestor's, are listed.

### 🧭 Key decisions
| Decision | Why |
|---|---|
| "Affected" = the CSS inheritance rule | No heuristics; rejected: listing every ancestor rule |

### 🛡️ Risks
| Level | Risk | Mitigation |
|---|---|---|
| 🟢 Low | Same-ancestor rules ordered by sheet order, not specificity | None yet |

### 🧪 Testing
- ✅ Browser fixture: own color not repeated, padding/margin absent, nearest ancestor wins
- ⬜ Override-in-between case not exercised
