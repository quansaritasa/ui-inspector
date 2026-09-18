# ui-inspector

A tiny, dependency-free overlay for any web page or Electron renderer. Press a
shortcut, and every control on screen gets a coloured outline. Hover to see its
name, click to pin it, and a panel shows the details you need to describe the
component to a person or an AI: selector, colours (with the CSS variable they
come from), font, spacing, and the stylesheet rules that match it. One button copies a one-line locator for an AI
prompt; another copies the full details.

## Install

Copy `dist/ui-inspector.js` into your app and load it with one script tag:

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
| **Copy for AI** | Copy one line: `name (selector · script files · stylesheet files)`, e.g. `edit-btn (#edit-btn · edit.js · style.css)` |
| **Copy selector** | Copy only the CSS selector path |
| **Copy details** | Copy a multi-line block with colours, font, spacing and every matched rule |
| Edit a value in the **Style** section | Apply it to the element at once (inline style) — try a colour, font size or padding without touching the code |
| **↺ Reset** | Undo every live edit on the pinned element |
| `Esc` or the shortcut again | Leave inspect mode and remove every overlay node |

Outline colours: blue for buttons, green for inputs, purple for links, orange
for other named blocks.

## How an element is named

The first of these that exists wins: the `nameAttr` attribute (`data-ui` by
default), `aria-label`, `id`, `title`, `placeholder`, the element's own text
(trimmed to 30 characters), or `tag.class`. Adding `data-ui="theme-menu"` to
your key controls gives the clearest labels.

## Options

```js
UIInspector.init({
  shortcut: 'Mod+/',      // 'Ctrl+Shift+I', 'Alt+I', … or null to disable the key
  selectors: ['button', 'input', 'select', 'textarea', 'a', 'label', 'summary',
              '[role]', '[id]', '[data-ui]', '[contenteditable]'],
  nameAttr: 'data-ui',    // attribute used as the preferred name
  ignore: [],             // selectors that are never outlined or pinned
  maxOutlines: 400,       // outline boxes drawn per frame
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
| `destroy()` | Disable and unbind the shortcut. |

## Trying a change live

The **Style** rows are inputs. Type a value and press Enter (or pick a colour)
and it is written to the element's inline style, so the page shows it right
away. Edits are listed in both Copy buttons as `apply: font-size: 14px; …`,
so an AI can turn the experiment into a real stylesheet change. **Reset**
restores the element's original `style` attribute. Edits survive leaving
inspect mode; reload the page to clear them all.

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
- While inspect mode is on, mouse events are captured before they reach your
  app, so clicking a button inspects it rather than pressing it.
- Matched rules are read from `document.styleSheets`. Cross-origin sheets are
  skipped. File names are shown; line numbers are not available from the CSSOM.
- The shortcut is ignored while an input, textarea or editable element has
  focus, unless inspect mode is already on.

## Development

Sources live in `src/` in fixed order (`styles`, `format`, `cssvars`,
`inspect`, `overlay`, `panel`, `core`). Run `node build.js` to regenerate
`dist/ui-inspector.js`. Do not edit the `dist` file by hand.
