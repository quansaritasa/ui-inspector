# ui-inspector

A tiny, dependency-free overlay for any web page or Electron renderer. Press a
shortcut, and every control on screen gets a coloured outline. Hover to see its
name, click to pin it, and a panel shows the details you need to describe the
component to a person or an AI: selector, colours (with the CSS variable they
come from), font, spacing, and the stylesheet rules that match it. One button copies a one-line locator for an AI
prompt; another copies the full details.

## Install

`dist/ui-inspector.js` is committed, so any tag can be fetched directly. Pin a
version and copy the file into your app:

```sh
# npm, straight from GitHub; copy node_modules/ui-inspector/dist/ui-inspector.js
npm i github:quansaritasa/ui-inspector#v0.4.1
# or one file, no npm
curl -fsSL https://raw.githubusercontent.com/quansaritasa/ui-inspector/v0.4.1/dist/ui-inspector.js -o vendor/ui-inspector.js
```

Then load it with one script tag:

```html
<script src="vendor/ui-inspector.js"></script>
<script>
  UIInspector.init({ shortcut: 'Mod+/' });
</script>
```

`UIInspector` is exposed on `window`; the file also works with `require()`.

## Use

| Action | Result |
|---|---|
| `Mod+/` (Cmd on macOS, Ctrl elsewhere) | Toggle inspect mode |
| Hover | Red dashed box and a tooltip with the element's name and size |
| Click | Pin the element and open the details panel |
| Hold `Alt` while hovering or clicking | Target the exact element under the pointer instead of its nearest control |
| `↑` `↓` `←` `→` | Walk to the parent, first child, previous or next sibling of the pinned element |
| Drag the panel header | Move the panel |
| Drag the panel's left edge | Resize its width |
| **—** / **▢** in the panel header | Minimize the panel to its header / restore it |
| `C` with an element pinned | Copy that same one line without reaching for the panel — the badge says `✅ copied` |
| **📋 Copy ID** on **Identity** | Copy one bracketed line: `[selector (source · script files · stylesheet files)]`, e.g. `[#edit-btn.btn (edit.js:12 · style.css)]` — an element with an id also carries its classes, the part that greps in the source |
| Edit a value in the **Style** section | Apply it to the element at once (inline style) — try a colour, font size or padding without touching the code |
| `↑` `↓` in a number box (`Shift` = ×10), or drag its label | Step the value live |
| **📋 Copy for AI** on **Changes** | Copy the control's location plus each edited rule with its final value |
| **↺ Reset** | Undo every live edit on the pinned element |
| `Esc` or the shortcut again | Leave inspect mode and remove every overlay node |

The pinned element also gets its box model drawn the way DevTools draws it:
a green band for padding inside the border box, an orange band for margin
outside it, and a chip under it with both as CSS shorthand (`padding 5 8 · margin 10 10
0 10`, in px) for the bands too thin to read.

The hint at the top fades out two seconds after inspect mode opens — long
enough to read, short enough not to sit over the page. It comes back for a
moment to confirm a copy.

Outline colours: blue for buttons, green for inputs, purple for links, orange
for other named blocks.

## How an element is named

The first of these that exists wins: the `nameAttr` attribute (`data-ui` by
default), `aria-label`, `id`, `title`, `placeholder`, the element's own text
(trimmed to 30 characters), or `tag.class`. Adding `data-ui="theme-menu"` to
your key controls gives the clearest labels.

## How an element's selector is written

Two pieces: the element, and the nearest ancestor that pins it — an `#id`, or
an ancestor carrying the `nameAttr`. Any wrappers between them collapse to `…`.

```
div.jira-comment.jira-comment-reply > div.jira-comment-body
[data-ui="plain-region"] > span.target-span
#grid
```

The chain from `<body>` used to be spelled out, six wrappers deep:

```
div.jira-panel-body > div.jira-comments > div.jira-comments-list >
div.jira-comment-replies > div.jira-comment.jira-comment-reply >
div.jira-comment-body
```

which names the element once, at the end, and costs a prompt thirty words to
say "somewhere deep". What leads to the line to edit is the source stamp beside
it (`jira-comments-card.js:155`); the selector only has to say what to grep for.

A stylesheet keeps its file name and loses the origin the page is served from —
`style.css`, not `localhost:8765/style.css`. A cross-origin sheet keeps its host
(`cdn.jsdelivr.net/photoswipe.css`), since the file name alone would not say
who served it.

## Options

```js
UIInspector.init({
  shortcut: 'Mod+/',      // 'Ctrl+Shift+I', 'Alt+I', … or null to disable the key
  selectors: ['button', 'input', 'select', 'textarea', 'a', 'label', 'summary',
              'section', '[role]', '[id]', '[data-ui]', '[contenteditable]'],
  nameAttr: 'data-ui',    // attribute used as the preferred name
  srcAttr: 'data-src',    // attribute holding a stamped source location, e.g. 'grid-rows.js:33'; null = off
  ignore: [],             // selectors that are never outlined or pinned
  maxOutlines: 400,       // outline boxes drawn per frame
  maxScanMs: 120,         // time budget for one scan; anything unscanned waits for the next frame
  scripts: null,          // (url) => bool: which <script src> files to scan; default skips vendor/
  onCopy: null,           // (text) => void, replaces navigator.clipboard
  onToggle: null,         // (isOn) => void
});
```

## API

| Method | Purpose |
|---|---|
| `init(options)` | Apply options and bind the shortcut. Safe to call again to change options. |
| `enable()` / `disable()` / `toggle()` | Drive inspect mode without the keyboard. |
| `select(element)` | Enable and pin a specific element. |
| `info()` | The data object for the pinned element, or `null`. |
| `formatForAI(info)` | The one-line locator for any info object (`info.code` is filled asynchronously after `select`). |
| `formatDetails(info)` | The multi-line block with computed colours, font and spacing. |
| `isCovered(element)` | `true` when a fixed layer on screen (a popup and its backdrop) paints over the element — the rule that keeps it unoutlined. |
| `editCount()` | How many live style edits the Changes box lists — they stay on screen after inspect mode closes, so the host can say so. |
| `destroy()` | Disable and unbind the shortcut. |

## Trying a change live

The **Identity** section's **Text** row is a box, not a label: type in it and
the words on screen change as you type, which is how you find out whether a
button survives a longer label before anyone writes the copy. It writes to the
one text node holding most of the element's words, so an icon, a badge or a
nested `<b>` beside the text stays where it was; on an `<input>` or
`<textarea>` it writes `value`. **Reset** puts the original words back, and
the change is live only — it is for trying a label, not a string an AI should
apply, so the Changes box stays CSS.

The **Style** section groups fields in cards — Colour, Typography (font,
size, letter spacing, line height, weight, align), Spacing (padding and margin
as vertical ↕ / horizontal ↔) and Border. Type a value and press Enter, step a
number with `↑` `↓` or its ▲▼ buttons (hold to repeat; `Shift` for ×10), or
drag a field's label sideways to scrub it. The unit is the one the stylesheet
wrote when it is a plain value (`0.9em`), else computed px; click it to switch
px / em / rem / % — the value converts, so nothing jumps. A value the
stylesheet derives from a variable (`calc(var(--grid) * 0.917)`) is edited as
that factor, unit `× --grid`, and the Changes box writes the rule back with
the new factor so the variable keeps working. A bare number keeps
the shown unit. Every change is written to the
element's inline style, so the page shows it right away.

Each colour field carries the variable it comes from in a dropdown beside the
swatch — `--btn-bg` for `background: var(--btn-bg)`, read off a shorthand or a
fallback chain too. The dropdown lists every custom property that resolves to
a colour on this element, so picking another one points the colour at it
(`background-color: var(--accent)`), and picking `— none —` gives the element
a colour of its own again. While a variable is selected the swatch edits **the
variable**, not the element: every rule using it moves at once, and the
Changes box names the rule that declares it
(`style.css :root { --accent: #00ff00; }`). ↺ Reset puts the palette back.

**Apply to similar** (on by default) also edits the CSS rule itself in
memory — the rule the Changes box names — so every element it styles
changes too, the way the real stylesheet edit will. Untick it to change only
the pinned element; the Changes box then asks for a more specific selector.

The **Changes** box under it holds the selector (and source location), then
one line per rule to edit with the final values only — for every element
edited since the page loaded, not just the pinned one —
`style.css .grid-task-title { font-size: calc(var(--grid) * 1.1) /* 14.3px */; }`.
The box opens with one instruction line for the AI. A broad rule (`*`, a
bare tag like `#grid td`) is never the target when the element has a rule of
its own that would win; `*` never is. When no rule sets a property, the line
names a rule that already targets
the element and marks the declaration `/* add */`; only with no such rule does
it fall back to the element's path, marked `/* new rule */`. Text properties
the children only inherit are set once, on the pinned element. Text properties (colour,
font, size, weight, line height, spacing) follow the text: pin a cell and
change its size, and the title span inside it changes too — the field shows
the main text's value, other text scales in proportion, and the log lists a
line per element so an AI edits each rule. It is plain text you can
trim before **📋 Copy for AI** — it refills on the next edit. Edits are also listed in
**📋 Copy ID** as `apply: font-size: 14px; …`. **Reset**
restores the element's original `style` attribute. Edits survive leaving
inspect mode; reload the page to clear them all. `editCount()` lets the host
say so when inspect mode closes.

## Where to edit

The panel's **Where to edit** rows name the files to open:

- **Code** — the page's own `<script src>` files are fetched once (same origin;
  works over `file://` in Electron) and searched for the element's id and
  classes in quoted or selector form. Best matches first, up to three.
  Files under `vendor/`, `node_modules/` or `dist/` are skipped; pass
  `scripts: (url) => bool` to change that.
- **CSS** — the stylesheets behind the matched rules, resets excluded.

## Notes

- Everything is drawn inside one shadow root on a `<div data-uii>` host, so
  your CSS cannot restyle the overlay and the overlay's CSS cannot leak out.
- A control under a fixed layer — the grid behind an open popup — is not
  outlined. One scan hit-tests a 5x5 grid of points to find the fixed layers
  on screen, then decides by geometry, so the cost does not grow with the
  page. Small covers the probes miss (a toast, a tooltip) are not detected,
  and the inspector's own panel never counts as cover.
- While inspect mode is on, mouse events are captured before they reach your
  app, so clicking a button inspects it rather than pressing it.
- Matched rules are read from `document.styleSheets`. Cross-origin sheets are
  skipped. File names are shown; line numbers are not available from the CSSOM.
- The shortcut is ignored while an input, textarea or editable element has
  focus, unless inspect mode is already on.
- Every control in the panel carries a name of its own, written as both `id`
  and `data-ui` — `inspector-panel`, `reset-edits`, `text-content`,
  `field-line-height`, `changes` — so a test or a script can aim at one without
  depending on a class that moves with the layout:
  `document.querySelector('[data-uii]').shadowRoot.getElementById('text-content')`.
  The ids cannot collide with your page: they live in the shadow root.

## Development

Sources live in `src/` in the fixed order `build.js` lists (`styles`,
`format`, `cssvars`, `sources`, `inspect`, `occlusion`, `overlay`, `editrows`,
`editrules`, `edittext`, `editvar`, `editnum`, `editfields`, `content`,
`panel`, `core`). Run `node build.js` to regenerate
`dist/ui-inspector.js`. Do not edit the `dist` file by hand.
