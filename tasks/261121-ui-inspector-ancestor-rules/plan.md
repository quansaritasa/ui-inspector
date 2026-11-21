# Task Plan

## Task Context
- ID: 261121-ui-inspector-ancestor-rules
- Title: Declared list shows only ancestor rules that affect the pinned element
- Source of truth: User request (+ 2 answers, see Constraints)
- Current status: In Progress
- Repository / Project: ui-inspector
- Owner / Assignee: Unknown

## Stable Requirements
- Objective: the **Declared** section lists what really styles the pinned element, including inherited properties that come from an ancestor's rule — and nothing from an ancestor that does not reach the element.
- Acceptance criteria:
  1. Declared lists an inherited property (e.g. `font-size`) set by an ancestor rule, labelled with that rule's selector — new (`grep -n uiiInheritedProps src/editinherit.js`).
  2. An ancestor rule whose property is not inherited (`padding`, `margin`, `border`…) is never listed — new; check: demo probe, no `padding` row from the ancestor.
  3. An inherited property the element sets itself (own rule or inline) is not repeated from the ancestor — new; check: only the own row appears.
  4. An inherited property whose computed value differs from the ancestor's (something in between overrides it) is not listed — new; check: computed-value equality in `uiiInheritedProps`.
- Invariants:
  - The nearest ancestor that declares the property wins; within one element the last rule in sheet order wins — probe: nested demo case.
- Constraints:
  - Assumed: "affected" = inherited property, not set on the element, value reaching the element equals the ancestor's computed value — the CSS inheritance rule itself.
  - Assumed: rows are editable like own rows (writes inline on the pinned element) — same `uiiValueRow`.
  - Declared today reads only `info.rules` (the element's own rules): no ancestor rule is listed at all. User chose "add effective ancestors".
  - Files stay under 200 lines.
- Out of scope:
  - The `↑` ancestor line under text-size fields; editing the ancestor's rule from Declared.
- ADR constraints:
  - None found
- Related tasks:
  - None

## Notes for Future Iterations
- Keep the sections above stable across the task lifetime unless core task understanding changes.

---

## Iteration 1 — 2026-11-21 +0700
**Trigger:** user request
**Input summary:**
- Declared should show only ancestor rules that affect the element.
**Depends on:** None
**Supersedes:** None

### Plan
Add the ancestor-inherited properties to Declared, filtered to the ones that actually reach the element.

### Scope
- In scope:
  - New `src/editinherit.js`, a call from `src/editprops.js`, `build.js` ORDER, rebuilt `dist`.
- Out of scope for this iteration:
  - Variables inherited from ancestors (`uiiElementVars` unchanged).

### Proposed Changes
#### 1. Inherited-property finder
- User outcome: Declared explains where an inherited value comes from.
- Why: today an inherited font-size/color is invisible in Declared.
- Affected area: UI / panel
- Confidence: Medium — `uiiMatchedRules` (src/cssvars.js) and `uiiDeclList` give the data; the only thing not read is how shorthands (`font`) expand, so they are skipped.
- Implementation:
  - `src/editinherit.js`: `UII_INHERITED` longhand list; `uiiInheritedProps(info, ownNames)` walks `parentElement` up to `<html>` (cap 12), takes the nearest ancestor's last declaration per property, drops names in `ownNames` or set inline on the element, drops it when `getComputedStyle(el)[p] !== getComputedStyle(anc)[p]`.
  - Verify: build, then probe in `demo/index.html`.
- Test Impact:
  - Add: None (the repo has no test runner)
  - Update: None
  - Verify manually: demo probe for criteria 1–4

#### 2. Render in Declared
- User outcome: rows with the source rule on hover, editable.
- Why: show it where the user looks.
- Affected area: UI
- Confidence: High
- Implementation:
  - `src/editprops.js` `uiiPropsSection`: after own rows, append `uiiValueRow` for each inherited prop, `row.title = 'Inherited from ' + file + ' ' + selector`; count them in the summary and the open threshold.
  - `build.js` ORDER: `editinherit` before `editprops`; `npm run build`.
  - Verify: `node build.js` succeeds; `wc -l src/editprops.js src/editinherit.js` ≤ 200.
- Test Impact:
  - Add: None
  - Update: None
  - Verify manually: Declared in the demo

### Done Criteria
- Criteria 1–4 hold in the demo page; both files ≤ 200 lines; `dist` rebuilt.

### Risks
- Many inherited rows on deep trees → capped by the 12-ancestor walk and the property list; covered by the filter box already in the section.

## Progress
| Row | Status |
|---|---|
| Plan | Iteration 1 planned |

- [x] 1. Inherited-property finder
- [x] 2. Render in Declared

Current status: coded, awaiting review
