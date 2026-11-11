# ui-inspector

A tiny, dependency-free overlay for any web page or Electron renderer. Press a
shortcut, and every control on screen gets a colored outline. Hover to see its
name, click to pin it, and a panel shows the details you need to describe the
component to a person or an AI: selector, colors (with the CSS variable they
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
  UIInspector.init({ shortcut: 'Mod+\\' });
</script>
```

`UIInspector` is exposed on `window`; the file also works with `require()`.

`init` takes a few options besides `shortcut`: `tree: true` opens the DOM-tree
column with the panel, so every element's **↺** is in view without knowing the
`T` key; `selectors` and `ignore` say which elements count as controls, and
`onCopy` / `onToggle` hook the clipboard and the mode switch.

### Chrome extension

`extension/` is the same library packaged as a Manifest V3 extension, for the
pages you do not own. Its toolbar button injects `ui-inspector.js` into the
page's own world — so the `<script src>` scan and the `cssRules` walk behave as
they do for an app that loads the file — and then toggles inspect mode. It is
loaded unpacked; it is not in the Web Store:

```sh
npm run build   # writes extension/ui-inspector.js and the manifest version
```

Then open `chrome://extensions`, turn on **Developer mode**, **Load unpacked**,
and pick this repository's `extension/` folder. The button is per tab: the first
click injects and turns inspect mode on, later clicks only toggle. After a
rebuild, press **Reload** on the extension's card — Chrome runs the copy it
loaded, not the file on disk.

Chrome refuses injection into `chrome://` pages, the Web Store and the PDF
viewer; there the button shows a red `!` and its tooltip says why.

The mark in `extension/icons/` is drawn by `node extension/icons/make-icons.js`,
which writes the four PNG sizes Chrome asks for and needs nothing installed.

### Try it

`npm run demo` builds the library and serves the repository at
[http://127.0.0.1:6279/demo/](http://127.0.0.1:6279/demo/) (Python 3 required).
The demo page is a UI mock with design-token variables, inputs, and icon and
symbol galleries, and opens with inspect mode on. It is served over HTTP rather
than opened as a file because the code scan fetches the page's `<script src>`
files, and browsers block that fetch from `file://`.

## Use

| Action | Result |
|---|---|
| `Mod+\` (Cmd on macOS, Ctrl elsewhere) | Toggle inspect mode. Opening it pins whatever the pointer is already on and opens the panel with it, on the right side of the screen, or on the left when the pointer is in the right 30%, so the panel stays off the element being looked at |
| Hover | Red dashed box and a tooltip with the element's name and size |
| Click | Pin the element (a blue box numbered `1`) and open the details panel |
| `Mod+click` (Cmd on macOS, Ctrl elsewhere) | Pin the element and copy its **📋 Copy ID** line in one go |
| **Auto copy** on **Identity** | Tick it and every plain click copies the **📋 Copy ID** line too, as `Mod+click` does. Off by default; the choice is kept across reloads (per site, in `localStorage`) |
| `Shift+click` | Add the element to the list started by the last pin, as the next numbered blue box, or take it out if already picked, and copy every picked element's **📋 Copy ID** line as one list, `[a], [b] and [c]` — paste it into your prompt and say what to change. Any other pin (click, arrows, tree row) starts the list again at `1`; `Esc` clears it |
| Hold `Alt` while hovering or clicking | Target the exact element under the pointer instead of its nearest button, link, label or input |
| `↑` `↓` `←` `→` | Walk to the parent, first child, previous or next sibling of the pinned element |
| Drag the panel header | Move the panel |
| Drag any panel edge or corner | Resize it, like a desktop window |
| **—** / **▢** in the panel header | Minimize the panel to its header / restore it |
| `C` with an element pinned | Copy that same one line without reaching for the panel — the badge says `✅ copied` |
| **📋 Copy ID** on **Identity** | Copy one bracketed line: `[selector (source · script files · stylesheet files)]`, e.g. `[#edit-btn.btn (edit.js:12 · style.css)]` — an element with an id also carries its classes, the part that greps in the source; one with no id, `data-ui` name or `aria-label` gets its visible text (first 10 words) in front, `("Test icon")[…]`, to tell it from its look-alikes |
| Edit a value in the **Style** section | Apply it to the element at once (inline style) — try a color, font size or padding without touching the code |
| **↺** in front of a field, or of a **Declared** row | Put back that one value: the inline edit and the rule the same change rewrote, and nothing else on the element. Dim until the value is actually changed |
| `↑` `↓` in a number box (`Shift` = ×10), or drag its label | Step the value live |
| **📋 Copy for AI** on **Changes** | Copy the control's location plus each edited rule with its final value |
| `A` | Copy the same **Changes** text from the keyboard — the badge says `No changes yet` when there is nothing to copy |
| **Declared** at the foot of the **Style** section | Every property the pinned element's own rules set, and every variable they read, each with its value in a box. The last row adds any other property or variable the rules do not mention yet |
| `T`, or **🌳** in the panel header | DOM tree: a column down the left of the panel listing every element on the page. Hover a row to outline that element, click it to pin it, click a twisty to open a branch. Only open branches are built, so the cost is what you opened, not what the page holds |
| **↺** in front of a DOM-tree row | Reset that element alone: the edits made to it go back, while variables and every other element's edits stay. Dim when that element has nothing to reset |
| `I`, or **💧** in the panel header | Color picker: the browser's eyedropper opens with a magnifier at the pointer. Click any pixel to copy its hex code; `Esc` cancels. Chrome and Edge only |
| `Ctrl/Cmd + I` | Copy the hovered color with no click: the text color when the pointer is on a letter, otherwise the first non-transparent background behind it. Read from CSS, so a gradient or image is skipped |
| `P`, or **🎨** in the panel header | Page variables: the panel lists every custom property the stylesheets declare, with its value in a box — edit the palette with nothing pinned. Press again to go back to the pinned element, or to close the panel when nothing is pinned |
| `V`, or **👁** in the panel header | Normal view: hide every overlay and give the pointer back to the page, so an edit can be judged on the real screen. The panel, its edits and the pinned element stay; press again to go back to inspecting |
| **↶**, or `Ctrl/Cmd+Z` | Take back the last edit and leave the rest standing. One press is one thing you did: a whole drag of a label, a retyped label, a size that scaled three nested spans |
| **↺** | Reset: put every live edit on the pinned element back, and every variable edit, in one go |
| `Esc` or the shortcut again | Leave inspect mode and remove every overlay node |

The header's keys are grouped left to right: what you did to the element
(**↶ ↺**), what you are looking at (**🌳 🎨 👁**), and the window itself
(**— ✕**). Each is one glyph in a square, with its name in the tooltip, and
the two mode keys stay lit while their mode is on. **↶** and **↺** keep their
place and go dim when there is nothing to take back, so no key ever moves out
from under the pointer halfway through an edit.

The pinned element also gets its box model drawn the way DevTools draws it:
a green band for padding inside the border box, an orange band for margin
outside it, and a chip under it with both as CSS shorthand (`padding 5 8 · margin 10 10
0 10`, in px) for the bands too thin to read. Every other Shift+click pick gets the
same two bands without the chip, so a row of picks does not pile up labels.

The hint at the top fades out two seconds after inspect mode opens — long
enough to read, short enough not to sit over the page. It comes back for a
moment to confirm a copy.

Outline colors: blue for buttons, green for inputs, purple for links, orange
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
  shortcut: 'Mod+\\',      // 'Ctrl+Shift+I', 'Alt+I', … or null to disable the key
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
| `formatDetails(info)` | The multi-line block with computed colors, font and spacing. |
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

The cards cover the properties worth a dedicated control. **Declared**, folded
in under them, is the rest: every property the element's matched rules actually
set — as the stylesheet writes it, so `background: var(--accent)` stays a
variable and not the color it resolves to — and above them every variable
those rules read, editable here as in the palette. A filter narrows a long
list, and the last row takes any property the rules do not mention yet: a name,
a value, Enter. A name opening with `--` edits that variable instead. A value
the browser cannot parse is refused with a message rather than dropped in
silence. The section opens by itself when the list is short or the element
already carries an edit.

**Page variables** (`P`, or **🎨**) answers the other half of the question —
what the page looks like if a design token moves. The panel lists every custom
property the readable stylesheets declare, resolved on `:root`: colors first,
each with a swatch and a picker, then sizes, fonts and everything else, with a
filter box for a palette that runs long. Type a value and the whole page
follows at once, the row is marked as edited, and the change joins the Changes
box as `style.css :root { --accent: #123456; }`. Nothing need be pinned, and
**↺** Reset puts every variable back. A variable only an inactive theme block
sets (`.dark { --bg }` while the light theme is on) resolves to nothing here
and is left out: there would be no value to show and editing it would change
nothing on screen.

The **Style** section groups fields in cards — Color, Border, Size, Spacing (padding
and margin, one field per side ↑ ↓ ← →), Typography (font, size, letter
spacing, line height, weight, align). Type a value and press Enter, step a
number with `↑` `↓` or its ▲▼ buttons (hold to repeat; `Shift` for ×10), or
drag a field's label sideways to scrub it. The unit is the one the stylesheet
wrote when it is a plain value (`0.9em`), else computed px; click it to switch
px / em / rem / % — the value converts, so nothing jumps. A value the
stylesheet derives from a variable (`calc(var(--grid) * 0.917)`) is edited as
that factor, unit `× --grid`, and the Changes box writes the rule back with
the new factor so the variable keeps working. A bare number keeps
the shown unit. Every change is written to the
element's inline style, so the page shows it right away.

Each color field carries the variable it comes from in a dropdown beside the
swatch — `--btn-bg` for `background: var(--btn-bg)`, read off a shorthand or a
fallback chain too. The dropdown lists every custom property that resolves to
a color on this element, each with its swatch and hex on the right, so picking another one points the color at it
(`background-color: var(--accent)`), and picking `— none —` gives the element
a color of its own again. While a variable is selected the swatch edits **the
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
it fall back to the element's classes (its id or path only when it has none,
since a runtime id changes with a label), marked `/* new rule */`. Text properties
the children only inherit are set once, on the pinned element. Text properties (color,
font, size, weight, line height, spacing) follow the text: pin a cell and
change its size, and the title span inside it changes too — the field shows
the main text's value, other text scales in proportion, and the log lists a
line per element so an AI edits each rule. It is plain text you can
trim before **📋 Copy for AI** — it refills on the next edit. Edits are also listed in
**📋 Copy ID** as `apply: font-size: 14px; …`. **↶ Undo** (`Ctrl/Cmd+Z`)
takes back the last edit alone, including the rule "Apply to similar" rewrote;
**Reset** restores the element's original `style` attribute and empties the
undo history with it. Edits survive leaving
inspect mode; reload the page to clear them all. `editCount()` lets the host
say so when inspect mode closes.

## The DOM tree

**🌳**, or `T`, opens a column down the left of the panel. It lists the page
as it really is, from `<body>` down, and the panel widens so the style fields
keep the room they had. Elements the inspector would outline — buttons,
fields, links, anything carrying `data-ui`, an id or a role — are shown by the
name the panel gives them; everything else reads as `<div.wrapper>`, so the
rows worth aiming at stand out from the scaffolding around them.

Hover a row and that element is outlined on the page, which is the fastest way
to find out what a wrapper actually covers. Click a row to pin it: the fields
beside it fill in at once, with no mode to leave. Pinning from the page works
the other way too — the branch opens and the row scrolls into view.

Only open branches are built. A branch you never opened costs nothing, and a
node with thousands of children draws the first 300 and says how many are
left, so the column stays responsive on a page the outline scan itself has to
budget for. A page that rewrites itself under the tree refreshes it a moment
later, keeping your scroll position.

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
  and `data-ui` — `inspector-panel`, `reset-edits`, `undo-edit`, `dom-tree`, `text-content`,
  `field-line-height`, `changes` — so a test or a script can aim at one without
  depending on a class that moves with the layout:
  `document.querySelector('[data-uii]').shadowRoot.getElementById('text-content')`.
  The ids cannot collide with your page: they live in the shadow root.

## Development

Sources live in `src/` in the fixed order `build.js` lists (`styles`,
`format`, `cssvars`, `sources`, `inspect`, `occlusion`, `overlay`, `spacing`,
`events`, `editrows`, `editrules`, `edittext`, `editvar`, `editnum`,
`editcolor`, `editvars`, `editprops`, `editfields`, `content`, `panel`, `keys`,
`core`). Run `node build.js` to regenerate
`dist/ui-inspector.js`. Do not edit the `dist` file by hand. The same run copies
the build into `extension/` and writes `package.json`'s version into
`extension/manifest.json`, so neither the injected copy nor the number Chrome
shows is a second place to bump.
