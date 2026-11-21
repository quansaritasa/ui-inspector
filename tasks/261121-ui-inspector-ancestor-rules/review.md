# Review — 261121-ui-inspector-ancestor-rules

## Review Pass 1 — 2026-11-21 00:00 +0700
**Iteration:** 1
**Trigger:** planned review
**Verdict:** Pass with Changes

### Fit Check
**Acceptance Criteria Review**
1. Declared lists an inherited ancestor property with the rule's selector — Pass — `uiiInheritedProps` in `src/editinherit.js`, rendered in `src/editprops.js`; changelog probe case A/B listed `font-size` from `.a`.
2. Non-inherited ancestor properties never listed — Pass — `UII_INHERITED` is a whitelist of inherited longhands; probe showed no `padding`/`margin`.
3. Own/inline inherited property not repeated — Pass — `own.has(...)` and `el.style.getPropertyValue(...)` skip; probe case A (own `color` not repeated).
4. Property overridden in between is not listed — Cannot verify — code path (`cs` vs `pcs` compare, `blocked` set) reads correctly, but the changelog says no fixture hit it. A fixture with an in-between override would settle it.

**Plan Coverage Review**
1. Inherited-property finder — Pass — `src/editinherit.js` (32 lines), walk capped at 12, nearest ancestor wins, shorthands skipped.
2. Render in Declared — Pass — rows via `uiiValueRow`, title `Inherited from file selector`, summary count and open threshold updated, `editinherit` before `editprops` in ORDER; `node build.js` succeeds and leaves `dist` unchanged (tree clean).

**Scope Review**
- Unexpected files changed: `src/events.js`, `src/keys.js` — `drift` (commit de0847d, 0.19.9: focus picked text field, Copy AI copies all picks). No plan line, no user message / Jira comment / task.md note cites it. `dist/ui-inspector.js`, `package.json`, `extension/manifest.json`, `build.js` — `planned` (rebuild, version bump, ORDER).
- Scope drift: de0847d bundled into this branch; unrelated to ancestor rules, small and low-risk.
- Constraints / do-not-modify respected: Yes. Files ≤ 200 lines (editprops 127, editinherit 32, events 193). Out of scope (`↑` ancestor line, editing ancestor rule) untouched.

**Fit Issues**
1. Drift commit de0847d, see Quality Check 1.

### Quality Check
1. [minor] Medium Process — `src/events.js`, `src/keys.js`, version 0.19.9
   - Details: undocumented change, assumed intentional — not in plan or changelog, no cited request.
   - Suggested fix: confirm it is intended and log it to `changelog.md`, or split it to its own task.
2. [minor] Medium Correctness — `src/editinherit.js:21-25`
   - Details: within one ancestor the last matching rule in sheet order wins, ignoring specificity and `!important`. If `#x{color:blue}` precedes `.x{color:red}` on the same ancestor, the row shows `red` while the computed value is blue. The computed-equality check compares element to ancestor, not the shown value to either. Plan invariant states sheet order, but that is an approximation of the cascade.
   - Suggested fix: next iteration, compare `d.value` against the ancestor's resolved value or order by specificity; or accept and state the limit in the row title.
3. [minor] Medium Coverage — criterion 4 branch (`blocked`)
   - Details: the override-in-between path has no probe; no test runner exists.
   - Suggested fix: add an in-between override case to the demo fixture and probe it.

### Test & Verification Review
- Reviewer checks run: `node build.js` (ok, `git diff` clean afterward, so `dist` is current); line counts; read of full `editinherit.js` and the `editprops.js` diff; verified `uiiMatchedRules`, `uiiDeclList`, `uiiSet`, `uiiCopyPicks`, `uiiInEditable` exist.
- Coverage assessment: gaps — no test runner; manual probes only, blocked branch not run.
- Verification gaps or regression risk: criterion 4; specificity case above.

### Changelog Review
- Matches implementation: Yes for iteration 1 (0.19.10 bump, shorthand skip, probes).
- Missing or misleading entries: 0.19.9 change (events.js, keys.js) not logged.

### Record Check
- None

### Previous Issues Status
- Not applicable

### ADR Suggestion
- Suggested: No
- Reason: None

### Declined to Judge
- Variables inherited from ancestors — outside the iteration's scope (plan: `uiiElementVars` unchanged).
- Behaviour of de0847d itself (focus, copy picks) — outside the planned change set; only the process finding is raised.

### Final Recommendation
- Approve with Changes
- Confirm and log the 0.19.9 change; optionally add the in-between override probe and specificity handling next iteration.
