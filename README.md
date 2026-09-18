# ui-inspector

A tiny, dependency-free overlay for any web page or Electron renderer. Press a
shortcut, and every control on screen gets a coloured outline. Hover to see its
name, click to pin it, and a panel shows the details you need to describe the
component to a person or an AI: selector, colours (with the CSS variable they
come from), font, spacing, and the stylesheet rules that match it. A single
button copies all of that as plain text.

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
| **Copy for AI** | Copy a plain-text summary of the pinned element |
| **Copy selector** | Copy only the CSS selector path |
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
| `formatForAI(info)` | The plain-text summary for any info object. |
| `destroy()` | Disable and unbind the shortcut. |

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
