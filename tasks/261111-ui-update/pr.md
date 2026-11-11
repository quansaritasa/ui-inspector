# PRs for 261111-ui-update

https://github.com/quansaritasa/ui-inspector/pull/1
Date: 2026-11-11

# 261111-ui-update — Panel shows what the page draws

**Type:** ✨ Feature

## 🎨 UI changes
- Text, Background: `↳` row for on-screen color
- Size, Text fields: `↳` row for on-screen value
- Overridden field: title highlighted
- Losing rules: listed struck through
- Copy ID line: leads with visible text

## ➕ Added
**[1] - Cascade - On-screen rows.**
- Purpose: show the value the page draws when a child or ancestor overrides the pinned element.
- Details: `editcolorfield.js`, `editnumslot.js`; Background follows the ancestor that paints it.

**[2] - Cascade - Overridden rules.**
- Purpose: explain edits that seem to do nothing.
- Details: `uiiDeclared` (`editcascade.js`) returns the winner plus the losers.

**[3] - Identity - Text label in Copy ID.**
- Purpose: tell look-alike cells apart.
- Details: no id, name attribute or aria-label → first 10 words lead the line.

**[4] - Panel - Ids on every control.**
- Purpose: let Copy ID aim at any panel or picker part.
- Details: `autoid.js`, `id` + `data-ui`, positional, unique.

## ✏️ Changed
**[1] - Color - Live typing.**
- Reason: Enter was required.
- Impact: valid colors apply per keystroke; one undo step per burst (600ms).

**[2] - Cascade - Authored value.**
- Reason: last rule in sheet order is not the cascade winner.
- Impact: `uiiAuthored` follows the winning declaration.

**[3] - Structure - Files under 200 lines.**
- Details: split `toast.js`, `styles2.js`, `editquery.js`; changes prompt reworded; v0.19.1.

## 🧭 Key decisions
| Decision | Why |
|---|---|
| Winner from `uiiRuleDecl`, else last in sheet order | Probe is exact; fallback checked against computed |
| `↳` background row edits the painting ancestor | Row's title says it is painted there |

## 🛡️ Risks
| Level | Risk | Mitigation |
|---|---|---|
| 🟡 **Medium** | Authored values may differ where the cascade winner was not the last rule | Checked against computed value |
| 🟢 Low | `autoid` observer cost on a very large tree | One indexing pass per run; not measured |

## 🧪 Testing
- ✅ `node build.js` reproduces `dist`; demo loads, no console errors, no duplicate panel ids
- ⬜ `↳` edits, undo grouping and the Overrides demo section by hand
- ⬜ No automated tests in the repo

## 🔗 Related areas
- Style editing, Color picker, Undo, Copy ID, Panel DOM
