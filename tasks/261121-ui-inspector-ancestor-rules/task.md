# 261121-ui-inspector-ancestor-rules

Request: "Display only effected rule from ancestor only, do not display un-affected rules on the popup."

Decided in conversation:
- Surface: the **Declared** list in the Style section of the popup (user's answer).
- Base: origin/main (0.19.9). Main checkout carries unrelated uncommitted WIP (editancestor.js refactor) — untouched.

Open (blocks dev-plan): `Declared` reads `info.rules` = `uiiMatchedRules(el)` only — the pinned element's own rules.
No ancestor rule is listed today (src/editprops.js uiiDeclaredProps / uiiElementVars), so the reported behaviour is not reproduced from source.
