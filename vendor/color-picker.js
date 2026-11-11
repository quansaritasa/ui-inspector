/* Vendored from the color-picker project, dist/color-picker.esm.js @ e67e3d3.
 * Local patches (shadow-DOM awareness; every one marks a spot where the
 * library asked the document instead of its own root):
 *   - document.activeElement / .contains / querySelectorAll -> the root node
 *   - event.target in the document key/pointer handlers -> event.composedPath()
 * Also upstream (src/bindings.js): the outside-press handler ignores the anchor.
 * Re-vendor: copy the new bundle, drop its export block, re-apply the above. */
// src/color.js
var HEX_RE = /^[0-9a-f]+$/i;
var clamp = (n, min, max) => Math.min(max, Math.max(min, n));
var round255 = (n) => clamp(Math.round(n), 0, 255);
var toHex2 = (n) => round255(n).toString(16).padStart(2, "0").toUpperCase();
function parseHex(value) {
  if (typeof value !== "string") return null;
  const h = value.trim().replace(/^#/, "");
  if (![3, 4, 6, 8].includes(h.length) || !HEX_RE.test(h)) return null;
  const full = h.length <= 4 ? [...h].map((c) => c + c).join("") : h;
  const at = (i) => parseInt(full.slice(i, i + 2), 16);
  return {
    r: at(0),
    g: at(2),
    b: at(4),
    a: full.length === 8 ? at(6) / 255 : 1
  };
}
function formatHex({ r, g, b, a = 1 }) {
  const base = `#${toHex2(r)}${toHex2(g)}${toHex2(b)}`;
  return a >= 0.999 ? base : base + toHex2(a * 255);
}
function normalizeHex(value) {
  const rgba = parseHex(value);
  return rgba ? formatHex(rgba) : null;
}
function rgbToHsv({ r, g, b }) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d) {
    if (max === rn) h = (gn - bn) / d % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max === 0 ? 0 : d / max * 100, v: max * 100 };
}
function hsvToRgb(h, s, v) {
  const hue = (h % 360 + 360) % 360;
  const sn = clamp(s, 0, 100) / 100;
  const vn = clamp(v, 0, 100) / 100;
  const c = vn * sn;
  const x = c * (1 - Math.abs(hue / 60 % 2 - 1));
  const m = vn - c;
  let rgb;
  if (hue < 60) rgb = [c, x, 0];
  else if (hue < 120) rgb = [x, c, 0];
  else if (hue < 180) rgb = [0, c, x];
  else if (hue < 240) rgb = [0, x, c];
  else if (hue < 300) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  return { r: (rgb[0] + m) * 255, g: (rgb[1] + m) * 255, b: (rgb[2] + m) * 255 };
}
function rgbToHsl({ r, g, b }) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (d) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rn) h = (gn - bn) / d % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: s * 100, l: l * 100 };
}
function hslToRgb(h, s, l) {
  const hue = (h % 360 + 360) % 360;
  const sn = clamp(s, 0, 100) / 100;
  const ln = clamp(l, 0, 100) / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(hue / 60 % 2 - 1));
  const m = ln - c / 2;
  let rgb;
  if (hue < 60) rgb = [c, x, 0];
  else if (hue < 120) rgb = [x, c, 0];
  else if (hue < 180) rgb = [0, c, x];
  else if (hue < 240) rgb = [0, x, c];
  else if (hue < 300) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  return { r: (rgb[0] + m) * 255, g: (rgb[1] + m) * 255, b: (rgb[2] + m) * 255 };
}
var FORMATS = ["hex", "rgb", "hsl", "hsv"];
var trim = (n) => String(Math.round(n * 100) / 100);
function formatColor(color, format = "hex") {
  if (format === "hex" || !FORMATS.includes(format)) return formatHex(color);
  const { r, g, b, a = 1 } = color;
  let parts;
  if (format === "rgb") parts = [round255(r), round255(g), round255(b)].map(String);
  else {
    const m = format === "hsl" ? rgbToHsl({ r, g, b }) : rgbToHsv({ r, g, b });
    parts = [Math.round(m.h), ...[m.s, m.l ?? m.v].map((n) => `${Math.round(n)}%`)].map(String);
  }
  const alpha = a < 0.999;
  if (alpha) parts.push(trim(a));
  return `${format}${alpha ? "a" : ""}(${parts.join(", ")})`;
}
var FN_RE = /^(rgb|hsl|hsv|hsb)a?\(([^)]*)\)$/i;
function parseColor(value) {
  if (typeof value !== "string") return null;
  const fn = FN_RE.exec(value.trim());
  if (!fn) return parseHex(value);
  const args = fn[2].split(/[\s,/]+/).filter(Boolean);
  if (args.length !== 3 && args.length !== 4) return null;
  const nums = args.map((s) => /^[+-]?(\d+\.?\d*|\.\d+)(%|deg)?$/i.test(s) ? { n: parseFloat(s), pct: s.endsWith("%") } : null);
  if (nums.some((x) => !x)) return null;
  const kind = fn[1].toLowerCase();
  const alphaArg = nums[3];
  const a = alphaArg ? clamp(alphaArg.pct ? alphaArg.n / 100 : alphaArg.n, 0, 1) : 1;
  let rgb;
  if (kind === "rgb") {
    rgb = nums.slice(0, 3).map((x) => x.pct ? x.n * 2.55 : x.n);
    rgb = { r: rgb[0], g: rgb[1], b: rgb[2] };
  } else {
    const [h, s, x] = nums;
    rgb = (kind === "hsl" ? hslToRgb : hsvToRgb)(h.n, s.n, x.n);
  }
  return { r: round255(rgb.r), g: round255(rgb.g), b: round255(rgb.b), a };
}

// src/dom.js
var SVG_NS = "http://www.w3.org/2000/svg";
function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== void 0) node.textContent = text;
  return node;
}
function attr(node, attrs) {
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  return node;
}
function button(cls, text, attrs = {}) {
  const node = el("button", cls, text);
  node.type = "button";
  return attr(node, attrs);
}
function icon(d, cls) {
  const node = document.createElementNS(SVG_NS, "svg");
  attr(node, { viewBox: "0 0 16 16", class: cls, "aria-hidden": "true" });
  const path = document.createElementNS(SVG_NS, "path");
  attr(path, { d, fill: "none", stroke: "currentColor", "stroke-width": "1.5", "stroke-linecap": "round", "stroke-linejoin": "round" });
  node.append(path);
  return node;
}

// src/template.js
var moduleId = Math.random().toString(36).slice(2, 7);
var dialogCount = 0;
var LABELS = {
  title: "Choose Color",
  close: "Close",
  reset: "Reset",
  cancel: "Cancel",
  apply: "OK",
  hex: "Hex color value",
  format: "Color format",
  hue: "Hue",
  opacity: "Opacity",
  sv: "Saturation and brightness",
  svHint: "Drag, or use the arrow keys: left and right change saturation, up and down change brightness. Hold Shift for larger steps.",
  slotsLabel: "Color type",
  copy: "Copy HEX",
  maximize: "Maximize",
  restore: "Restore",
  compact: "Compact view"
};
function buildTemplate({ slots = [], groups = [], showAlpha = true, labels = {} } = {}) {
  const L = { ...LABELS, ...labels };
  const refs = {};
  const heading = el("div", "cp-heading");
  const title = el("h2", null, L.title);
  title.id = `cp-title-${moduleId}-${++dialogCount}`;
  heading.append(el("div", "cp-app-icon", "\u25C9"), title);
  const reset = button("cp-reset-btn", "\u21BA", { "aria-label": L.reset, title: L.reset });
  const maximize = button("cp-maximize-btn", void 0, { "aria-label": L.maximize, title: L.maximize });
  maximize.append(
    icon("M10 2.5h3.5V6M13.5 2.5 9.5 6.5M6 13.5H2.5V10M2.5 13.5 6.5 9.5", "cp-icon-expand"),
    icon("M13.5 9.5H10V6M10 9.5 13.5 6M2.5 6.5H6V10M6 6.5 2.5 10", "cp-icon-collapse")
  );
  const compact = button("cp-compact-btn", void 0, { "aria-label": L.compact, title: L.compact, "aria-pressed": "false" });
  compact.append(icon("M8 1.5v4M6 3.5l2 2 2-2M8 14.5v-4M6 12.5l2-2 2 2M2.5 8h11", "cp-icon-compact"));
  const format = attr(el("select", "cp-format-select"), { "aria-label": L.format });
  for (const name of FORMATS) {
    const option = el("option", null, name.toUpperCase());
    option.value = name;
    format.append(option);
  }
  const close = button("cp-close-btn", "\xD7", { "aria-label": L.close, title: L.close });
  const headerActions = el("div", "cp-header-actions");
  headerActions.append(format, reset, compact, maximize, close);
  const header = el("header", "cp-picker-header");
  header.append(heading, headerActions);
  let tabs = null;
  refs.tabs = [];
  if (slots.length > 1) {
    tabs = attr(el("div", "cp-tabs"), { role: "tablist", "aria-label": L.slotsLabel });
    refs.tabs = slots.map((slot) => {
      const tab = button("cp-tab", void 0, { role: "tab", "aria-selected": "false" });
      tab.dataset.slot = slot.id;
      if (slot.hint) tab.title = slot.hint;
      const body2 = el("span", "cp-tab-body");
      body2.append(el("strong", null, slot.label));
      if (slot.type) body2.append(el("small", "cp-tab-type", slot.type));
      tab.append(el("span", "cp-tab-symbol", slot.symbol), body2);
      tabs.append(tab);
      return tab;
    });
  }
  const svThumb = el("span", "cp-sv-thumb");
  const sv = attr(el("div", "cp-sv"), {
    role: "slider",
    "aria-label": L.sv,
    "aria-description": L.svHint,
    "aria-valuemin": "0",
    "aria-valuemax": "100",
    "aria-valuenow": "87",
    tabindex: "0"
  });
  sv.append(svThumb);
  const svWrap = el("div", "cp-sv-wrap");
  svWrap.append(sv);
  const hex = attr(el("input", "cp-hex-input"), { "aria-label": L.hex, spellcheck: "false" });
  const preview = el("div", "cp-color-preview");
  const copy = button("cp-copy-btn", void 0, { "aria-label": L.copy, title: L.copy });
  copy.dataset.copied = "false";
  const hexField = el("div", "cp-hex-field");
  hexField.append(hex, copy);
  const hexRow = el("div", "cp-hex-row");
  hexRow.append(preview, hexField);
  const range = (name, max) => {
    const label = el("div", "cp-range-label");
    const value = el("span");
    label.append(el("span", null, name), value);
    const input = attr(el("input"), { min: "0", max, "aria-label": name });
    input.type = "range";
    const block = el("div", "cp-range-block");
    block.append(label, input);
    return { block, input, value };
  };
  const hue = range(L.hue, 360);
  const alpha = range(L.opacity, 100);
  hue.block.classList.add("cp-hue-range");
  alpha.block.classList.add("cp-alpha-range");
  if (!showAlpha) alpha.block.hidden = true;
  const side = el("div", "cp-editor-side");
  side.append(hexRow, hue.block, alpha.block);
  const editor = attr(el("section", "cp-editor"), { "aria-label": "Custom color editor" });
  editor.append(svWrap, side);
  const presets = el("section", "cp-presets");
  const sections = {};
  for (const group of groups) {
    const sectionTitle = el("div", "cp-section-title");
    sectionTitle.append(el("span", "cp-section-icon", group.symbol), el("strong", null, group.label));
    const categories = el("div", "cp-category-row");
    const swatches = el("div", "cp-swatches");
    const section = el("div", "cp-preset-section");
    section.dataset.group = group.key;
    section.append(sectionTitle, categories, swatches, el("p", "cp-section-hint", group.hint));
    presets.append(section);
    sections[group.key] = { section, categories, swatches };
  }
  const status = attr(el("p", "cp-status"), { "aria-live": "polite" });
  const actions = el("div", "cp-actions");
  actions.append(button("cp-secondary-btn", L.cancel), button("cp-primary-btn", L.apply));
  const footer = el("footer", "cp-footer");
  footer.append(actions);
  const suggestions = el("div", "cp-suggestions-band");
  const picker = attr(el("div", "cp-picker"), {
    role: "dialog",
    "aria-modal": "true",
    "aria-labelledby": title.id
  });
  const body = el("div", "cp-picker-body");
  body.append(header, ...tabs ? [tabs] : [], editor, el("div", "cp-divider"), presets, suggestions, status, footer);
  const grip = attr(el("span", "cp-resize-grip"), { "aria-hidden": "true" });
  picker.append(body, grip);
  Object.assign(refs, {
    panel: picker,
    body,
    header,
    grip,
    compact,
    maximize,
    sv,
    svThumb,
    preview,
    hex,
    format,
    hue: hue.input,
    hueValue: hue.value,
    alpha: alpha.input,
    alphaValue: alpha.value,
    alphaBlock: alpha.block,
    status,
    reset,
    copy,
    cancel: actions.firstElementChild,
    apply: actions.lastElementChild,
    close,
    suggestions,
    sections
  });
  return { root: picker, refs };
}

// src/editor.js
var clamp01 = (n) => Math.min(1, Math.max(0, n));
var round = (n) => Math.min(255, Math.max(0, Math.round(n)));
function createEditor(refs, { showAlpha = true, format = "hex", onChange, onStatus } = {}) {
  let mode = FORMATS.includes(format) ? format : "hex";
  const state = { h: 174, s: 87, v: 46, a: 1 };
  let current = { r: 15, g: 118, b: 110, a: 1 };
  let dragging = false;
  let box = null;
  let paintedOpaque = null;
  const rgbaFromHsv = () => {
    const rgb = hsvToRgb(state.h, state.s, state.v);
    return { r: round(rgb.r), g: round(rgb.g), b: round(rgb.b), a: showAlpha ? clamp01(state.a) : 1 };
  };
  function render() {
    const rgb = hsvToRgb(state.h, state.s, state.v);
    const opaque = formatHex({ r: round(rgb.r), g: round(rgb.g), b: round(rgb.b), a: 1 });
    refs.sv.style.backgroundColor = `hsl(${state.h} 100% 50%)`;
    refs.svThumb.style.left = `${state.s}%`;
    refs.svThumb.style.top = `${100 - state.v}%`;
    refs.preview.style.background = `rgba(${round(rgb.r)}, ${round(rgb.g)}, ${round(rgb.b)}, ${state.a})`;
    if (refs.hex.getRootNode().activeElement !== refs.hex) refs.hex.value = formatColor(current, mode);
    refs.hue.value = String(Math.round(state.h));
    refs.hueValue.textContent = `${Math.round(state.h)}\xB0`;
    if (showAlpha) {
      refs.alpha.value = String(Math.round(state.a * 100));
      refs.alphaValue.textContent = `${Math.round(state.a * 100)}%`;
      if (opaque !== paintedOpaque) {
        paintedOpaque = opaque;
        refs.alpha.style.background = `linear-gradient(90deg, transparent, ${opaque}), repeating-conic-gradient(#d9dee7 0 25%, white 0 50%) 0/12px 12px`;
      }
    }
    refs.sv.setAttribute("aria-valuenow", String(Math.round(state.s)));
    refs.sv.setAttribute("aria-valuetext", formatHex(current));
  }
  function apply({ silent = false } = {}) {
    current = rgbaFromHsv();
    render();
    if (!silent && onChange) onChange({ ...current });
  }
  function setColor(rgba, { silent = true } = {}) {
    if (!rgba) return;
    const hsv = rgbToHsv(rgba);
    if (hsv.v > 0) {
      if (hsv.s > 0.01) state.h = hsv.h;
      state.s = hsv.s;
    }
    state.v = hsv.v;
    state.a = showAlpha && typeof rgba.a === "number" ? clamp01(rgba.a) : 1;
    current = { r: round(rgba.r), g: round(rgba.g), b: round(rgba.b), a: state.a };
    if (refs.hex) refs.hex.removeAttribute("aria-invalid");
    render();
    if (!silent && onChange) onChange({ ...current });
  }
  const pointTo = (event) => {
    const rect = box || refs.sv.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    state.s = clamp01((event.clientX - rect.left) / rect.width) * 100;
    state.v = (1 - clamp01((event.clientY - rect.top) / rect.height)) * 100;
    apply();
  };
  const onPointerDown = (event) => {
    dragging = true;
    box = refs.sv.getBoundingClientRect();
    try {
      if (refs.sv.setPointerCapture) refs.sv.setPointerCapture(event.pointerId);
    } catch (error) {
    }
    pointTo(event);
    event.preventDefault();
  };
  const onPointerMove = (event) => {
    if (dragging) pointTo(event);
  };
  const onPointerUp = () => {
    dragging = false;
    box = null;
  };
  const onSvKey = (event) => {
    const step = event.shiftKey ? 10 : 1;
    const moves = {
      ArrowLeft: ["s", -step],
      ArrowRight: ["s", step],
      ArrowUp: ["v", step],
      ArrowDown: ["v", -step]
    };
    const move = moves[event.key];
    if (!move) return;
    state[move[0]] = Math.min(100, Math.max(0, state[move[0]] + move[1]));
    apply();
    event.preventDefault();
  };
  const onHue = (event) => {
    state.h = Number(event.target.value) || 0;
    apply();
  };
  const onAlpha = (event) => {
    state.a = (Number(event.target.value) || 0) / 100;
    apply();
  };
  const commitHex = (event) => {
    const parsed = parseColor(event.target.value);
    if (!parsed) {
      refs.hex.value = formatColor(current, mode);
      refs.hex.setAttribute("aria-invalid", "true");
      if (onStatus) onStatus("Enter a valid color value.");
      return;
    }
    refs.hex.removeAttribute("aria-invalid");
    if (onStatus) onStatus("");
    setColor(parsed, { silent: false });
  };
  const onHexChange = (event) => commitHex(event);
  const onFormat = () => {
    mode = refs.format.value;
    refs.hex.removeAttribute("aria-invalid");
    render();
  };
  const setFormat = (next) => {
    if (!FORMATS.includes(next)) return;
    refs.format.value = next;
    onFormat();
  };
  const onHexKey = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      event.target.blur();
    }
  };
  refs.sv.addEventListener("pointerdown", onPointerDown);
  refs.sv.addEventListener("pointermove", onPointerMove);
  refs.sv.addEventListener("pointerup", onPointerUp);
  refs.sv.addEventListener("pointercancel", onPointerUp);
  refs.sv.addEventListener("keydown", onSvKey);
  refs.hue.addEventListener("input", onHue);
  refs.alpha.addEventListener("input", onAlpha);
  refs.hex.addEventListener("change", onHexChange);
  refs.hex.addEventListener("keydown", onHexKey);
  refs.format.addEventListener("change", onFormat);
  refs.format.value = mode;
  render();
  return {
    setColor,
    setFormat,
    /** The color as the field shows it: what Copy puts on the clipboard. */
    getText: (rgba = current) => formatColor(rgba, mode),
    getColor: () => ({ ...current }),
    destroy() {
      refs.sv.removeEventListener("pointerdown", onPointerDown);
      refs.sv.removeEventListener("pointermove", onPointerMove);
      refs.sv.removeEventListener("pointerup", onPointerUp);
      refs.sv.removeEventListener("pointercancel", onPointerUp);
      refs.sv.removeEventListener("keydown", onSvKey);
      refs.hue.removeEventListener("input", onHue);
      refs.alpha.removeEventListener("input", onAlpha);
      refs.hex.removeEventListener("change", onHexChange);
      refs.hex.removeEventListener("keydown", onHexKey);
      refs.format.removeEventListener("change", onFormat);
    }
  };
}

// src/copy.js
var FEEDBACK_MS = 1200;
var SVG_NS2 = "http://www.w3.org/2000/svg";
function copyIcon() {
  const svg = document.createElementNS(SVG_NS2, "svg");
  for (const [name, value] of Object.entries({
    viewBox: "0 0 16 16",
    width: "14",
    height: "14",
    "aria-hidden": "true",
    fill: "none",
    stroke: "currentColor",
    "stroke-width": "1.4",
    "stroke-linejoin": "round"
  })) svg.setAttribute(name, value);
  const front = document.createElementNS(SVG_NS2, "rect");
  for (const [name, value] of Object.entries({ x: "5.6", y: "5.6", width: "8", height: "8", rx: "1.7" })) {
    front.setAttribute(name, value);
  }
  const back = document.createElementNS(SVG_NS2, "path");
  back.setAttribute("d", "M10.4 2.6H4.3a1.7 1.7 0 0 0-1.7 1.7v6.1");
  svg.append(front, back);
  return svg;
}
function paintButton(button2) {
  const done = document.createElement("span");
  done.className = "cp-copy-done";
  done.textContent = "\u2713";
  done.setAttribute("aria-hidden", "true");
  button2.replaceChildren(copyIcon(), done);
}
async function writeClipboard(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (error) {
  }
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.top = "-1000px";
  document.body.append(area);
  area.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch (error) {
    ok = false;
  }
  area.remove();
  return ok;
}
function createCopy({ button: button2, getValue, onStatus, label = "Copy HEX" }) {
  let timer = null;
  paintButton(button2);
  const reset = () => {
    button2.dataset.copied = "false";
    button2.setAttribute("aria-label", label);
  };
  async function onClick() {
    const value = getValue();
    if (!value) return;
    const ok = await writeClipboard(value);
    if (onStatus) {
      onStatus(ok ? `Copied ${value}.` : `Copy failed \u2014 select ${value} and copy it.`);
    }
    if (!ok) return;
    button2.dataset.copied = "true";
    button2.setAttribute("aria-label", `Copied ${value}`);
    if (timer) clearTimeout(timer);
    timer = setTimeout(reset, FEEDBACK_MS);
  }
  button2.addEventListener("click", onClick);
  return {
    destroy() {
      if (timer) clearTimeout(timer);
      button2.removeEventListener("click", onClick);
    }
  };
}

// src/preset-sets.js
var PRESET_SETS = {
  text: {
    /* Ordered so neighbours look alike, the same way in every tab: the colors that
       read on white first, then the light tail for dark surfaces. Each part walks
       one tint family at a time (20° oklch hue buckets from 250°: blue, violet,
       pink, red, orange, yellow, green, teal, cyan; greys last), dark to light
       within it. `#000000` leads `Normal`: the first entry is what `options.js`
       hands a text slot with no color of its own. */
    Normal: [
      "#000000",
      "#020617",
      "#050A18",
      "#0A1128",
      "#0F172A",
      "#111827",
      "#0D1B2A",
      "#111B33",
      "#0B1B3A",
      "#14213D",
      "#1B263B",
      "#1F2937",
      "#1E293B",
      "#1E2A44",
      "#1B2A49",
      "#22304A",
      "#2B3A55",
      "#334155",
      "#374151",
      "#364A6B",
      "#475569",
      "#4B5563",
      "#6B7280",
      "#64748B",
      "#544E66",
      "#786F89",
      "#483242",
      "#745A6A",
      "#250E14",
      "#3C2519",
      "#5E423D",
      "#81655A",
      "#594732",
      "#756B51",
      "#312B13",
      "#131904",
      "#424F3F",
      "#5F665A",
      "#687B64",
      "#476061",
      "#597C7E",
      "#171717",
      "#1C1917",
      "#292524",
      "#262626",
      "#404040",
      "#44403C",
      "#525252",
      "#57534E",
      "#737373",
      "#94A3B8",
      "#DCDAF8",
      "#BFB1CB",
      "#FEDEEC",
      "#CFADB2",
      "#E2C3B5",
      "#C2B69B",
      "#F5E6CA",
      "#C3D0B4",
      "#EFF5DF",
      "#D5FBF5",
      "#9AC0C0",
      "#CEEEFE",
      "#A9C6D8",
      "#A3A3A3",
      "#D1D5DB",
      "#E5E7EB",
      "#F3F4F6",
      "#FFFFFF"
    ],
    Heading: [
      "#172554",
      "#1E3A5F",
      "#1E3A8A",
      "#1E40AF",
      "#1A57AD",
      "#1D4ED8",
      "#4A6DA0",
      "#2563EB",
      "#1E1B4B",
      "#18188C",
      "#393558",
      "#312E81",
      "#3730A3",
      "#4D4B82",
      "#4338CA",
      "#555E96",
      "#67678E",
      "#645BBE",
      "#311344",
      "#2E1065",
      "#342241",
      "#3B0764",
      "#4D2368",
      "#4C1D95",
      "#581C87",
      "#553D72",
      "#6F458C",
      "#6244A5",
      "#6C5A7F",
      "#7959A5",
      "#8946BA",
      "#1A2E05",
      "#083E13",
      "#04510E",
      "#344A29",
      "#365314",
      "#3F6212",
      "#4B6341",
      "#056F15",
      "#537842",
      "#052E16",
      "#064E3B",
      "#0F5132",
      "#14532D",
      "#065F46",
      "#166534",
      "#3B654F",
      "#047857",
      "#15803D",
      "#487764",
      "#022C22",
      "#134E4A",
      "#115E59",
      "#0F766E",
      "#042F2E",
      "#01434C",
      "#225C63",
      "#027A84",
      "#083344",
      "#164E63",
      "#155E75",
      "#366C77",
      "#0E7490",
      "#0A3D62",
      "#0C4A6E",
      "#075985",
      "#0369A1",
      "#4A718B"
    ],
    Highlight: [
      "#4F46E5",
      "#5B21B6",
      "#6B21A8",
      "#6D28D9",
      "#7E22CE",
      "#9333EA",
      "#701A75",
      "#86198F",
      "#A21CAF",
      "#C026D3",
      "#94116A",
      "#9E4F80",
      "#CE0999",
      "#9D174D",
      "#BE185D",
      "#DB2777",
      "#7F1D1D",
      "#881337",
      "#991B1B",
      "#B91C1C",
      "#BE123C",
      "#B35851",
      "#DC2626",
      "#E11D48",
      "#78350F",
      "#9A3412",
      "#92400E",
      "#C2410C",
      "#B45309",
      "#854D0E",
      "#A16207",
      "#4D7C0F",
      "#60A5FA",
      "#93C5FD",
      "#818CF8",
      "#9B63F5",
      "#A78BFA",
      "#C084FC",
      "#AE6EB0",
      "#E879F9",
      "#DDA9F7",
      "#CA5E96",
      "#E741C4",
      "#CF88C8",
      "#F472B6",
      "#F9A8D4",
      "#FF5387",
      "#C66878",
      "#EF4444",
      "#F87171",
      "#FDA4AF",
      "#EA580C",
      "#D0765A",
      "#F97316",
      "#F99B7E",
      "#BF7439",
      "#FB923C",
      "#FDBA74",
      "#CA8A04",
      "#F59E0B",
      "#EAB308",
      "#8F8214",
      "#B69836",
      "#B8B351",
      "#FACC15",
      "#D9DB7B",
      "#FDE047",
      "#8F9B3C",
      "#C0CC0E",
      "#BEF264",
      "#0C9B33",
      "#65A30A",
      "#75AD62",
      "#22C55E",
      "#84CC16",
      "#9DD384",
      "#2FFD70",
      "#3B9F6D",
      "#34D399",
      "#6EE7B7",
      "#0D9488",
      "#2DB396",
      "#2DD4BF",
      "#15BBBD",
      "#67E8F9",
      "#0891B2",
      "#0BAEC8",
      "#22D3EE",
      "#1086D3",
      "#38BDF8"
    ]
  },
  background: {
    Vivid: [
      "#70B1ED",
      "#3189FD",
      "#6BA5FB",
      "#9DB0DF",
      "#90AEFE",
      "#8AA2E4",
      "#8D9BFB",
      "#8075FD",
      "#9B8BFB",
      "#B0A5F2",
      "#AA9CCB",
      "#BC90FF",
      "#BB8FDE",
      "#B94BFD",
      "#D78FF6",
      "#D180E1",
      "#BC89C3",
      "#C8A2CB",
      "#D995D9",
      "#E70CD0",
      "#F186D4",
      "#D289BB",
      "#EB77B6",
      "#E197BC",
      "#C993A6",
      "#FF82B2",
      "#FA0C86",
      "#E183A1",
      "#F67591",
      "#F290A2",
      "#D5848E",
      "#DA9FA4",
      "#E8777A",
      "#FE8B82",
      "#FE2832",
      "#DC8C81",
      "#F87868",
      "#DD8364",
      "#E89B80",
      "#FE8F5D",
      "#F3813F",
      "#D76807",
      "#D6A588",
      "#DE8F57",
      "#FC933C",
      "#E58212",
      "#CF8F43",
      "#F29B1D",
      "#C69C6D",
      "#DCA65E",
      "#DB940E",
      "#B88007",
      "#C4A040",
      "#C3AF7E",
      "#D6AB1B",
      "#AF9F52",
      "#9B8F08",
      "#BDB55D",
      "#ABA874",
      "#B1A92B",
      "#BAB818",
      "#ADBC48",
      "#92AC18",
      "#93B25A",
      "#6C9E08",
      "#8AC652",
      "#9CBC91",
      "#69B54C",
      "#7FAD70",
      "#51BF68",
      "#78C687",
      "#0BA75D",
      "#82B291",
      "#10D095",
      "#55BB96",
      "#51CAA7",
      "#76C2B2",
      "#0BA28F",
      "#39BAB4",
      "#09CBC5",
      "#30C7D1",
      "#6DB2BA",
      "#1FB8CF",
      "#0A9DB2",
      "#04C4F0",
      "#6DBEDC",
      "#37ACD9",
      "#0A96D6",
      "#0EB0FD",
      "#7FAACE"
    ],
    /* The pale washes the group used to ship, kept as one category because the
       contrast suggestions rank partners out of this palette: none of the 60
       badge inks clears 4.5:1 against a mid-tone text like #0F766E, so without a
       pale set the suggestions panel has nothing to offer for such a pair. The
       old six categories are merged and de-duplicated here, with five more washes
       in the hue gaps and four across red and orange — 43 colors, then 17 more across every hue, then
       30 more picked farthest-first (oklch L .88-.96, chroma .03-.075, dE00 >= 4.1 from every other
       entry, >= 3.78:1 against #0F766E) so it matches `Vivid` at 90. Contrast against #0F766E is what
       caps the set: a wash light enough to stay useful there has little chroma left to spend, so the
       red/orange four sit at 3.78-5.00:1, inside the range the merged washes already covered. */
    Pale: [
      "#BFDBFE",
      "#EFF6FF",
      "#DBEAFE",
      "#D3DFF3",
      "#CFD6F6",
      "#D8D4EA",
      "#EDE9FE",
      "#E0D8FD",
      "#F3E8FF",
      "#E8D6F4",
      "#F0D1FF",
      "#FCE1FC",
      "#EAD7E8",
      "#FDCCF4",
      "#FCE7F3",
      "#FBCFE8",
      "#F9D2DC",
      "#FFE4E6",
      "#FEF2F2",
      "#FECACA",
      "#F1D7D2",
      "#FDE6DB",
      "#F1D0BE",
      "#FDE4CF",
      "#FFDAB9",
      "#E5D4C3",
      "#FED7AA",
      "#FFF7ED",
      "#FFEDD5",
      "#FAE1B8",
      "#E7D5B7",
      "#F0DDA9",
      "#FDEAB6",
      "#F0E4C3",
      "#FFFBEB",
      "#FEF3C7",
      "#FDE68A",
      "#E2DFC9",
      "#DFDAAC",
      "#FBF6AE",
      "#EFEECB",
      "#EDF0BA",
      "#D7DBBA",
      "#DCE4AF",
      "#F7FEE7",
      "#ECFCCB",
      "#E6F0D3",
      "#C7E2AE",
      "#D5F9BA",
      "#CDE7C7",
      "#DCFDD8",
      "#DFF1DF",
      "#B8E5BA",
      "#CBDDCD",
      "#F0FDF4",
      "#BBF7D0",
      "#DCFCE7",
      "#C0E1CC",
      "#B6EDCE",
      "#D1FAE5",
      "#ECFDF5",
      "#A4E8D2",
      "#BAFBE8",
      "#D8F2EA",
      "#BCE9DC",
      "#C4DED7",
      "#99F6E4",
      "#F0FDFA",
      "#CCFBF1",
      "#E6FFFB",
      "#9EE8DF",
      "#B0FCF4",
      "#B6E1E0",
      "#D0FCFD",
      "#A6EDF0",
      "#A8FAFF",
      "#C8E4E7",
      "#CDF5FF",
      "#A4EBFE",
      "#B7DFEB",
      "#BAE6FD",
      "#C5DBE9",
      "#F0F9FF",
      "#E0F2FE",
      "#FAFAFA",
      "#F9FAFB",
      "#F5F5F5",
      "#F3F4F6",
      "#E5E7EB",
      "#D1D5DB"
    ]
  }
};

// src/presets.js
function mergePalette(base = {}, override = {}) {
  const merged = { ...base, ...override };
  return Object.fromEntries(Object.entries(merged).map(([name, colors]) => {
    if (!Array.isArray(colors)) {
      throw new TypeError(`ColorPicker: preset category "${name}" must be an array of hex colors.`);
    }
    return [name, colors.map((hex) => {
      const valid = normalizeHex(hex);
      if (!valid) throw new TypeError(`ColorPicker: preset category "${name}" has an invalid color ${JSON.stringify(hex)}.`);
      return valid;
    })];
  }));
}
var shipped = {};
function shippedPalette(group) {
  if (!shipped[group]) {
    const merged = mergePalette(PRESET_SETS[group]);
    for (const list of Object.values(merged)) Object.freeze(list);
    shipped[group] = Object.freeze(merged);
  }
  return shipped[group];
}
var PRESET_GROUPS = {
  text: {
    label: "Text color presets",
    /* Short name a slot tab shows as its type; a slot may override it. */
    type: "Text",
    symbol: "Aa",
    hint: "Body copy, headings and highlights, for text and icons."
  },
  background: {
    label: "Background color presets",
    type: "Background",
    symbol: "\u25B0",
    hint: "The badge inks and their deep tier, plus the pale washes."
  }
};
var GROUP_KEYS = ["text", "background"];
var OTHER_GROUP = { text: "background", background: "text" };
var ALL_CATEGORY = "All";
function categoriesWithAll(palette = {}) {
  const names = Object.keys(palette);
  return names.length ? [ALL_CATEGORY, ...names] : [];
}
function allColors(palette = {}) {
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  for (const list of Object.values(palette)) {
    for (const hex of list) {
      const key = String(hex).toUpperCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(hex);
    }
  }
  return out;
}

// src/presets-panel.js
var CHECK_DARK = "#172033";
var CHECK_LIGHT = "#FFFFFF";
function checkColor(hex) {
  const rgb = parseHex(hex);
  if (!rgb) return CHECK_LIGHT;
  const luma = rgb.r * 0.299 + rgb.g * 0.587 + rgb.b * 0.114;
  return luma > 150 ? CHECK_DARK : CHECK_LIGHT;
}
function createPresetPanel({ refs, groups, palettes, onSelect }) {
  const state = {};
  const handlers = [];
  let activeGroup = null;
  let activeColor = null;
  const listen = (node, type, fn) => {
    node.addEventListener(type, fn);
    handlers.push({ node, type, fn });
  };
  const refOf = (key) => (refs.sections || {})[key];
  function buildPills(key, ref, names) {
    ref.categories.replaceChildren();
    for (const name of names) {
      const pill = document.createElement("button");
      pill.type = "button";
      pill.className = "cp-category";
      pill.textContent = name;
      pill.dataset.category = name;
      pill.setAttribute("aria-pressed", String(state[key].category === name));
      pill.classList.toggle("cp-is-active", state[key].category === name);
      ref.categories.append(pill);
    }
  }
  function buildSwatches(key, ref) {
    const entry = state[key];
    const list = entry.category === ALL_CATEGORY ? allColors(palettes[key]) : (palettes[key] || {})[entry.category] || [];
    ref.swatches.replaceChildren();
    ref.swatches.classList.toggle("cp-is-all", entry.category === ALL_CATEGORY);
    entry.byHex = /* @__PURE__ */ new Map();
    entry.selected = [];
    entry.paintedColor = null;
    const frag = document.createDocumentFragment();
    for (const hex of list) {
      const node = document.createElement("button");
      node.type = "button";
      node.className = "cp-swatch";
      node.dataset.hex = hex;
      node.title = hex;
      node.style.background = hex;
      node.setAttribute("aria-pressed", "false");
      node.setAttribute("aria-label", `${entry.category} ${hex}`);
      frag.append(node);
      const key2 = hex.toUpperCase();
      const nodes = entry.byHex.get(key2);
      if (nodes) nodes.push(node);
      else entry.byHex.set(key2, [node]);
    }
    ref.swatches.append(frag);
    entry.built = entry.category;
  }
  function selectCategory(key, name) {
    const ref = refOf(key);
    if (!ref || !state[key] || name === state[key].category) return;
    state[key].category = name;
    buildPills(key, ref, categoriesWithAll(palettes[key] || {}));
    buildSwatches(key, ref);
    paint(key, ref);
  }
  function paint(key, ref) {
    const entry = state[key];
    const target = String(activeColor).toUpperCase();
    if (entry.paintedColor !== target) {
      for (const node of entry.selected) {
        node.classList.remove("cp-is-selected");
        node.setAttribute("aria-pressed", "false");
        node.style.removeProperty("--cp-check-color");
      }
      entry.selected = entry.byHex.get(target) || [];
      for (const node of entry.selected) {
        node.classList.add("cp-is-selected");
        node.setAttribute("aria-pressed", "true");
        node.style.setProperty("--cp-check-color", checkColor(node.dataset.hex));
      }
      entry.paintedColor = target;
    }
    ref.section.classList.toggle("cp-is-emphasis", key === activeGroup);
  }
  for (const { key } of groups) {
    const ref = refOf(key);
    if (!ref) continue;
    listen(ref.categories, "click", (event) => {
      const pill = event.target.closest(".cp-category");
      if (pill) selectCategory(key, pill.dataset.category);
    });
    listen(ref.categories, "keydown", (event) => {
      const pill = event.target.closest(".cp-category");
      if (!pill || event.altKey || event.ctrlKey || event.metaKey) return;
      const names = categoriesWithAll(palettes[key] || {});
      const step = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
      if (step) {
        const next = names[(names.indexOf(pill.dataset.category) + step + names.length) % names.length];
        selectCategory(key, next);
        ref.categories.querySelector(`[data-category="${CSS.escape(next)}"]`)?.focus();
      } else if (event.key === "ArrowDown") {
        (ref.swatches.querySelector(".cp-is-selected") || ref.swatches.firstElementChild)?.focus();
      } else return;
      event.preventDefault();
    });
    listen(ref.swatches, "keydown", (event) => {
      const node = event.target.closest(".cp-swatch");
      if (!node || event.altKey || event.ctrlKey || event.metaKey) return;
      const items = [...ref.swatches.children];
      const index = items.indexOf(node);
      const columns = items.filter((item) => item.offsetTop === items[0].offsetTop).length || 1;
      const to = {
        ArrowLeft: index - 1,
        ArrowRight: index + 1,
        ArrowUp: index - columns,
        ArrowDown: index + columns
      }[event.key];
      if (to === void 0) return;
      event.preventDefault();
      if (to < 0 && event.key === "ArrowUp") {
        const pills = ref.categories;
        (pills.querySelector(".cp-is-active") || pills.firstElementChild)?.focus();
      } else if (items[to]) {
        items[to].focus();
        if (typeof onSelect === "function") onSelect(items[to].dataset.hex);
      }
    });
    listen(ref.swatches, "click", (event) => {
      const node = event.target.closest(".cp-swatch");
      if (node && typeof onSelect === "function") onSelect(node.dataset.hex);
    });
  }
  function render(group, color) {
    activeGroup = group;
    activeColor = color;
    for (const entry of groups) {
      const key = entry.key;
      const ref = refOf(key);
      if (!ref) continue;
      const own2 = Object.keys(palettes[key] || {});
      if (!own2.length) {
        ref.section.hidden = true;
        continue;
      }
      const names = categoriesWithAll(palettes[key] || {});
      ref.section.hidden = false;
      const current = state[key];
      const signature = names.join("|");
      if (!current || current.signature !== signature) {
        state[key] = { category: own2[0], signature, built: null, byHex: /* @__PURE__ */ new Map(), selected: [], paintedColor: null };
        buildPills(key, ref, names);
      } else if (!names.includes(current.category)) {
        current.category = own2[0];
        buildPills(key, ref, names);
      }
      if (state[key].built !== state[key].category) buildSwatches(key, ref);
      paint(key, ref);
    }
  }
  return {
    render,
    destroy() {
      for (const { node, type, fn } of handlers) node.removeEventListener(type, fn);
      handlers.length = 0;
      for (const entry of groups) {
        const ref = refOf(entry.key);
        if (ref) {
          ref.categories.replaceChildren();
          ref.swatches.replaceChildren();
        }
      }
    }
  };
}

// src/contrast.js
var CHANNEL_MIN = 0.03928;
var linear = (value) => {
  const c = value / 255;
  return c <= CHANNEL_MIN ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
var LINEAR = Array.from({ length: 256 }, (_, value) => linear(value));
var channel = (value) => LINEAR[value] ?? linear(value);
function relativeLuminance({ r, g, b }) {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}
function compositeOver(color, surface) {
  const a = Math.min(1, Math.max(0, color.a ?? 1));
  if (a >= 1) return { r: color.r, g: color.g, b: color.b };
  const mix = (fg, bg) => Math.round(fg * a + bg * (1 - a));
  return { r: mix(color.r, surface.r), g: mix(color.g, surface.g), b: mix(color.b, surface.b) };
}
function contrastRatio(a, b) {
  let fg = a;
  let bg = b;
  if ((fg.a ?? 1) < 1) fg = compositeOver(fg, bg);
  else if ((bg.a ?? 1) < 1) bg = compositeOver(bg, fg);
  const la = relativeLuminance(fg);
  const lb = relativeLuminance(bg);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
function wcagLevel(ratio, { largeText = false } = {}) {
  if (ratio >= 7) return "AAA";
  if (ratio >= 4.5) return "AA";
  if (ratio >= 3) return largeText ? "AA-large" : "fail";
  return "fail";
}
function formatRatio(ratio) {
  return `${(Math.round(ratio * 10) / 10).toFixed(1)}:1`;
}
function suggestPartners(color, candidates = [], { limit = 3, minRatio = 4.5 } = {}) {
  const seen = /* @__PURE__ */ new Set();
  const ranked = [];
  for (const candidate of candidates) {
    const rgba = typeof candidate === "string" ? parseHex(candidate) : candidate;
    if (!rgba) continue;
    const hex = candidate.hex || formatHex(rgba);
    if (seen.has(hex)) continue;
    seen.add(hex);
    const ratio = contrastRatio(color, rgba);
    if (ratio < minRatio) continue;
    ranked.push({ hex, ratio, level: wcagLevel(ratio) });
  }
  return ranked.sort((x, y) => y.ratio - x.ratio).slice(0, limit);
}

// src/suggestions.js
var CAPACITY = 3;
function candidatesOf(palette) {
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  for (const list of Object.values(palette || {})) {
    for (const hex of list) {
      const rgba = parseHex(hex);
      if (!rgba || seen.has(hex)) continue;
      seen.add(hex);
      out.push({ ...rgba, hex });
    }
  }
  return out;
}
function createSuggestions({ mount, slots = [], pair = null, palettes = {}, enabled = false, onPick }) {
  const labelOf = (id) => (slots.find((slot) => slot.id === id) || {}).label || id;
  const otherOf = (activeSlot) => {
    if (!pair) return null;
    if (pair[0] === activeSlot) return pair[1];
    if (pair[1] === activeSlot) return pair[0];
    return null;
  };
  const candidates = {};
  const candidatesFor = (group) => candidates[group] ||= candidatesOf(palettes[group]);
  if (!enabled) {
    mount.hidden = true;
    return { render() {
    }, destroy() {
    } };
  }
  const details = document.createElement("details");
  details.className = "cp-suggestions";
  const summary = document.createElement("summary");
  const label = document.createElement("span");
  label.className = "cp-sugg-label";
  label.textContent = "Contrast suggestions";
  const verdict = document.createElement("span");
  verdict.className = "cp-sugg-verdict";
  const badge = document.createElement("span");
  badge.className = "cp-badge";
  const largeBadge = document.createElement("span");
  largeBadge.className = "cp-badge cp-badge-large";
  largeBadge.textContent = "AA-large";
  largeBadge.title = "Passes for large text only (3:1)";
  largeBadge.hidden = true;
  const ratioOut = document.createElement("span");
  ratioOut.className = "cp-sugg-ratio";
  verdict.append(badge, largeBadge, ratioOut);
  summary.append(label, verdict);
  const hint = document.createElement("p");
  hint.className = "cp-sugg-hint";
  hint.textContent = "Partners that read well against the current color. Picking one sets the other color.";
  const empty = document.createElement("p");
  empty.className = "cp-sugg-empty";
  empty.textContent = "No preset in this palette reaches 4.5:1.";
  empty.hidden = true;
  const list = document.createElement("div");
  list.className = "cp-partners";
  const partners = Array.from({ length: CAPACITY }, () => {
    const button2 = document.createElement("button");
    button2.type = "button";
    button2.className = "cp-partner";
    button2.hidden = true;
    const dot = document.createElement("span");
    dot.className = "cp-partner-dot";
    const hexOut = document.createElement("span");
    hexOut.className = "cp-partner-hex";
    const partnerRatio = document.createElement("span");
    partnerRatio.className = "cp-partner-ratio";
    button2.append(dot, hexOut, partnerRatio);
    button2.addEventListener("click", () => {
      if (typeof onPick === "function" && button2.dataset.hex) onPick(button2.dataset.hex, button2.dataset.slot);
    });
    list.append(button2);
    return { button: button2, dot, hexOut, partnerRatio };
  });
  details.append(summary, hint, list, empty);
  mount.append(details);
  mount.hidden = !enabled || !pair;
  if (enabled && !pair && typeof console !== "undefined") {
    console.warn("ColorPicker: showContrastSuggestions needs contrastPair: [slotA, slotB] \u2014 suggestions stay hidden.");
  }
  function paintSlot(slot, partner, id) {
    if (!partner) {
      slot.button.hidden = true;
      slot.button.removeAttribute("aria-label");
      delete slot.button.dataset.hex;
      return;
    }
    slot.button.hidden = false;
    slot.button.dataset.hex = partner.hex;
    slot.button.dataset.slot = id;
    slot.dot.style.background = partner.hex;
    slot.hexOut.textContent = partner.hex;
    slot.partnerRatio.textContent = `${formatRatio(partner.ratio)} ${partner.level}`;
    slot.button.setAttribute("aria-label", `Use ${partner.hex} (${formatRatio(partner.ratio)}) as the ${labelOf(id).toLowerCase()} color`);
  }
  return {
    render(activeSlot, group, colors = {}) {
      if (!enabled) return;
      const other = otherOf(activeSlot);
      if (!other) {
        mount.hidden = true;
        return;
      }
      const base = parseHex(colors[activeSlot] || "");
      const surface = parseHex(colors[other] || "");
      if (!base || !surface) return;
      mount.hidden = false;
      const ratio = contrastRatio(base, surface);
      const level = wcagLevel(ratio);
      badge.dataset.level = level;
      badge.textContent = level === "fail" ? "Fail" : level;
      largeBadge.hidden = !(level === "fail" && ratio >= 3);
      ratioOut.textContent = formatRatio(ratio);
      const ranked = suggestPartners(base, candidatesFor(OTHER_GROUP[group]), { limit: CAPACITY });
      partners.forEach((slot, i) => paintSlot(slot, ranked[i], other));
      empty.hidden = ranked.length > 0;
      list.hidden = ranked.length === 0;
    },
    destroy() {
      details.remove();
    }
  };
}

// src/triggers.js
function createTriggers({ picker, target, slots, labels = {} }) {
  const host = typeof target === "string" ? document.querySelector(target) : target instanceof Element ? target : null;
  if (!host) {
    console.warn("ColorPicker: `triggers` target not found \u2014 no trigger controls rendered.");
    return null;
  }
  const names = labels.triggers || {};
  const nameOf = (slot) => Object.hasOwn(names, slot.id) && names[slot.id] || slot.label;
  const bar = document.createElement("div");
  bar.className = "cp-triggers";
  bar.dataset.theme = picker.options.theme;
  bar.setAttribute("role", "group");
  bar.setAttribute("aria-label", labels.triggersLabel || "Colors");
  const buttons = {};
  for (const slot of slots) {
    const button2 = document.createElement("button");
    button2.type = "button";
    button2.className = "cp-trigger";
    button2.dataset.slot = slot.id;
    button2.setAttribute("aria-haspopup", "dialog");
    button2.setAttribute("aria-expanded", "false");
    const chip = document.createElement("span");
    chip.className = "cp-trigger-chip";
    chip.setAttribute("aria-hidden", "true");
    const name = document.createElement("span");
    name.className = "cp-trigger-name";
    name.textContent = nameOf(slot);
    const hex = document.createElement("span");
    hex.className = "cp-trigger-hex";
    button2.append(chip, name, hex);
    button2.addEventListener("click", () => {
      if (picker.isOpen && picker.activeSlot === slot.id) {
        picker.close();
        return;
      }
      picker.setActiveSlot(slot.id);
      picker.open(button2);
    });
    bar.append(button2);
    buttons[slot.id] = { button: button2, chip, hex };
  }
  host.append(bar);
  return {
    element: bar,
    anchorFor: (id) => buttons[id] ? buttons[id].button : null,
    contains: (node) => bar.contains(node),
    render(colors) {
      for (const slot of slots) {
        const { button: button2, chip, hex } = buttons[slot.id];
        if (hex.textContent === colors[slot.id]) continue;
        chip.style.setProperty("--cpt-fill", colors[slot.id]);
        hex.textContent = colors[slot.id];
        button2.setAttribute("aria-label", `Edit ${nameOf(slot)}, currently ${colors[slot.id]}`);
      }
    },
    /** `aria-expanded` follows the panel; only the slot it opened on is on. */
    sync(open) {
      for (const slot of slots) {
        buttons[slot.id].button.setAttribute("aria-expanded", String(Boolean(open) && picker.activeSlot === slot.id));
      }
    },
    destroy() {
      bar.remove();
    }
  };
}

// src/fields.js
var OWNED = {
  "aria-haspopup": "dialog",
  "aria-expanded": "false",
  autocomplete: "off",
  spellcheck: "false"
};
function readFields(target) {
  const found = typeof target === "string" ? [...document.querySelectorAll(target)] : target instanceof Element ? [target] : [...target || []];
  const inputs = found.filter((node) => node instanceof HTMLInputElement);
  if (found.length && !inputs.length) {
    console.warn("ColorPicker: `fields` matched no inputs \u2014 nothing to bind.");
  }
  return inputs.map((input, index) => {
    const id = input.dataset.slot || input.id || (index ? `color${index + 1}` : "color");
    const label = input.dataset.label || input.getAttribute("aria-label") || (input.labels && input.labels[0] ? input.labels[0].textContent.trim() : "") || id;
    return { input, id, label, raw: input.value };
  });
}
function fieldSlots(entries) {
  return entries.map(({ id, label }) => ({ id, label, presetSet: "text" }));
}
function createFields({ picker, entries, labels = {} }) {
  const names = labels.triggers || {};
  const nameOf = (entry) => Object.hasOwn(names, entry.id) && names[entry.id] || entry.label;
  const byId = Object.fromEntries(entries.map((entry) => [entry.id, entry]));
  const undo = [];
  const on = (node, type, handler) => {
    node.addEventListener(type, handler);
    undo.push(() => node.removeEventListener(type, handler));
  };
  const commit = (entry) => {
    const hex = normalizeHex(entry.input.value);
    if (!hex) {
      entry.input.setAttribute("aria-invalid", "true");
      entry.input.value = picker.colors[entry.id];
      return;
    }
    entry.input.removeAttribute("aria-invalid");
    picker.selectColor(hex, { source: "field", slot: entry.id });
  };
  for (const entry of entries) {
    const { input, id } = entry;
    entry.saved = Object.keys(OWNED).map((name) => [name, input.getAttribute(name)]);
    for (const [name, value] of Object.entries(OWNED)) input.setAttribute(name, value);
    if (!input.getAttribute("aria-label") && !(input.labels && input.labels.length)) {
      input.setAttribute("aria-label", `Edit ${nameOf(entry)}`);
      entry.ownedLabel = true;
    }
    on(input, "click", () => {
      if (picker.isOpen && picker.activeSlot === id) {
        picker.close();
        return;
      }
      picker.setActiveSlot(id);
      picker.open(input);
    });
    on(input, "keydown", (event) => {
      if (event.key !== "Enter" || picker.isOpen) return;
      event.preventDefault();
      picker.setActiveSlot(id);
      picker.open(input);
    });
    on(input, "change", () => commit(entry));
  }
  return {
    element: null,
    anchorFor: (id) => byId[id] ? byId[id].input : null,
    contains: (node) => entries.some((entry) => entry.input === node),
    render(colors) {
      for (const entry of entries) {
        const hex = colors[entry.id];
        if (entry.input.value === hex) continue;
        entry.input.value = hex;
        entry.input.dispatchEvent(new Event("input", { bubbles: true }));
      }
    },
    /** `aria-expanded` follows the panel; only the field it opened on is on. */
    sync(open) {
      for (const entry of entries) {
        entry.input.setAttribute("aria-expanded", String(Boolean(open) && picker.activeSlot === entry.id));
      }
    },
    destroy() {
      for (const off of undo) off();
      for (const { input, ownedLabel, saved } of entries) {
        for (const [name, value] of saved) {
          if (value === null) input.removeAttribute(name);
          else input.setAttribute(name, value);
        }
        if (ownedLabel) input.removeAttribute("aria-label");
      }
    }
  };
}

// src/popover.js
var MARGIN = 8;
var GAP = 10;
var PLACEMENTS = ["bottom-start", "bottom-end", "top-start", "top-end", "right-start", "right-end", "left-start", "left-end"];
var SHEET = "(max-width: 680px)";
var MIN_ROOM = 160;
var within = (value, min, max) => max < min ? min : Math.min(Math.max(value, min), max);
function createPopover({ panel, getAnchor, placement: wanted = "bottom-start", offset: nudge, position: fixed }) {
  if (!PLACEMENTS.includes(wanted)) console.warn(`ColorPicker: unknown placement ${JSON.stringify(wanted)} \u2014 using 'bottom-start'.`);
  const placement = PLACEMENTS.includes(wanted) ? wanted : "bottom-start";
  const at0 = fixed && Number.isFinite(fixed.x) && Number.isFinite(fixed.y) ? fixed : null;
  const offset = { x: Number(nudge && nudge.x) || 0, y: Number(nudge && nudge.y) || 0 };
  let frame = 0;
  let placed = null;
  let pinned = false;
  const keyOf = (anchorBox) => {
    const box = anchorBox ? [anchorBox.left, anchorBox.top, anchorBox.width, anchorBox.height].map(Math.round).join(",") : "none";
    return `${innerWidth}|${innerHeight}|${box}`;
  };
  const coordinates = (box, anchorBox) => {
    let left = anchorBox ? anchorBox.left : (innerWidth - box.width) / 2;
    let top = anchorBox ? anchorBox.bottom + GAP : (innerHeight - box.height) / 2;
    let above = false;
    if (anchorBox) {
      const [side, align] = placement.split("-");
      const end = align === "end";
      if (side === "left" || side === "right") {
        const before = anchorBox.left - GAP - box.width;
        const after = anchorBox.right + GAP;
        left = side === "left" ? before : after;
        if (side === "left" ? left < MARGIN && after + box.width <= innerWidth - MARGIN : left + box.width > innerWidth - MARGIN && before >= MARGIN) {
          left = side === "left" ? after : before;
        }
        top = end ? anchorBox.bottom - box.height : anchorBox.top;
      } else {
        left = end ? anchorBox.right - box.width : anchorBox.left;
        if (!end && left + box.width > innerWidth - MARGIN) left = anchorBox.right - box.width;
        const under = anchorBox.bottom + GAP;
        const over = anchorBox.top - GAP - box.height;
        above = side === "top" ? !(over < MARGIN && under + box.height <= innerHeight - MARGIN) : under + box.height > innerHeight - MARGIN && over >= MARGIN;
        top = above ? over : under;
      }
      left += offset.x;
      top += offset.y;
    }
    if (at0) {
      left = at0.x;
      top = at0.y;
    }
    const at = {
      left: Math.round(within(left, MARGIN, innerWidth - MARGIN - box.width)),
      top: Math.round(within(top, MARGIN, innerHeight - MARGIN - box.height))
    };
    return {
      ...at,
      /* A panel hung above its trigger stops at the trigger, not at the screen
         edge: growth downwards would cover the anchor it hangs off. */
      room: above ? Math.round(box.height) : Math.round(innerHeight - MARGIN - at.top)
    };
  };
  const paint = () => {
    panel.style.left = `${placed.left}px`;
    panel.style.top = `${placed.top}px`;
    panel.style.maxHeight = `${Math.max(MIN_ROOM, placed.room)}px`;
  };
  const place = () => {
    if (!panel.getClientRects().length) return;
    if (window.matchMedia(SHEET).matches) {
      panel.style.left = "";
      panel.style.top = "";
      panel.style.maxHeight = "";
      placed = null;
      pinned = false;
      return;
    }
    if (pinned) {
      const box = panel.getBoundingClientRect();
      panel.style.maxHeight = `${Math.max(MIN_ROOM, Math.round(innerHeight - MARGIN - box.top))}px`;
      return;
    }
    const anchor = getAnchor();
    const anchorBox = anchor && anchor.isConnected ? anchor.getBoundingClientRect() : null;
    const key = keyOf(anchorBox);
    if (!placed || placed.key !== key) {
      panel.style.maxHeight = "";
      placed = { key, ...coordinates(panel.getBoundingClientRect(), anchorBox) };
    }
    paint();
  };
  const schedule = () => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      place();
    });
  };
  const watcher = new ResizeObserver(schedule);
  let watching = false;
  const detach = () => {
    if (!watching) return;
    watching = false;
    watcher.disconnect();
    window.removeEventListener("resize", schedule);
    window.removeEventListener("scroll", schedule, true);
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  };
  return {
    place,
    /** The panel is open: follow content, viewport and scroll. */
    attach() {
      if (watching) return;
      watching = true;
      watcher.observe(panel);
      window.addEventListener("resize", schedule);
      window.addEventListener("scroll", schedule, true);
    },
    /** The panel closed: stop following. */
    detach,
    /** The user moved or resized the box: stop placing it from its anchor. */
    pin() {
      pinned = true;
    },
    /** Back to the anchor — the next open starts under its trigger again. */
    unpin() {
      pinned = false;
      placed = null;
    },
    destroy: detach
  };
}

// src/assemble.js
function assemble(picker) {
  const { options, slots } = picker;
  const host = (() => {
    if (!options.container) return document.body;
    if (options.container instanceof Element) return options.container;
    if (typeof options.container !== "string") {
      console.warn("ColorPicker: `container` must be an element or a selector \u2014 mounting on document.body.");
      return document.body;
    }
    const found = document.querySelector(options.container);
    if (!found) console.warn(`ColorPicker: container "${options.container}" matches nothing \u2014 mounting on document.body.`);
    return found || document.body;
  })();
  const groupLabels = options.labels.presets || {};
  const groups = GROUP_KEYS.map((key) => ({ key, ...PRESET_GROUPS[key], label: groupLabels[key] || PRESET_GROUPS[key].label }));
  const built = buildTemplate({ slots, groups, showAlpha: options.showAlpha, labels: options.labels });
  picker.refs = built.refs;
  picker.root.append(built.root);
  picker.root.style.setProperty("--cp-slots", String(slots.length));
  for (const key of ["width", "height"]) {
    const size = options[key];
    if (typeof size === "number" && size > 0) picker.root.style.setProperty(`--cp-${key}`, `${size}px`);
    else if (typeof size === "string" && size) picker.root.style.setProperty(`--cp-${key}`, size);
  }
  if (options.mode === "popover") picker.root.classList.add("cp-popover");
  if (options.mode === "inline") picker.root.classList.add("cp-inline");
  host.append(picker.root);
  picker.editor = createEditor(picker.refs, {
    showAlpha: options.showAlpha,
    format: options.format,
    onChange: (rgba) => picker.commit(rgba),
    onStatus: (message) => picker.setStatus(message)
  });
  picker.copy = createCopy({
    button: picker.refs.copy,
    label: options.labels.copy,
    getValue: () => picker.editor.getText(parseHex(picker.colors[picker.activeSlot])),
    onStatus: (message) => picker.setStatus(message)
  });
  picker.palettes = {};
  for (const key of GROUP_KEYS) {
    const override = (options.presets || {})[key];
    picker.palettes[key] = override ? mergePalette(PRESET_SETS[key], override) : shippedPalette(key);
  }
  picker.groups = groups;
  picker.panel = createPresetPanel({
    refs: picker.refs,
    groups,
    palettes: picker.palettes,
    onSelect: (hex) => picker.selectColor(hex, { source: "preset" })
  });
  picker.suggestions = createSuggestions({
    mount: picker.refs.suggestions,
    slots,
    pair: picker.pair,
    palettes: picker.palettes,
    enabled: options.showContrastSuggestions,
    onPick: (hex, slot) => picker.selectColor(hex, { source: "suggestion", slot })
  });
  picker.triggers = null;
  if (options.fieldEntries.length) {
    picker.triggers = createFields({ picker, entries: options.fieldEntries, labels: options.labels });
  } else if (options.triggers) {
    picker.triggers = createTriggers({ picker, target: options.triggers, slots, labels: options.labels });
  }
  picker.popover = options.mode === "popover" ? createPopover({ panel: picker.refs.panel, getAnchor: () => picker.anchor, placement: options.placement, offset: options.offset, position: options.position }) : null;
}

// src/tablist.js
function syncTabs(refs, activeSlot) {
  for (const button2 of refs.tabs) {
    const active = button2.dataset.slot === activeSlot;
    button2.classList.toggle("cp-active", active);
    button2.setAttribute("aria-selected", String(active));
    button2.tabIndex = active ? 0 : -1;
  }
}
function tabAfterKey(event, activeSlot, slots) {
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return null;
  const index = slots.indexOf(activeSlot);
  const step = event.key === "ArrowRight" ? 1 : slots.length - 1;
  return slots[(index + step) % slots.length];
}

// src/focus.js
var FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])'
].join(",");
function edgesWithin(root) {
  const all = root.querySelectorAll(FOCUSABLE);
  const shown = (node) => node.getClientRects().length > 0;
  let first = null;
  let last = null;
  for (let i = 0; i < all.length && !first; i += 1) if (shown(all[i])) first = all[i];
  for (let i = all.length - 1; i >= 0 && !last; i -= 1) if (shown(all[i])) last = all[i];
  return [first, last];
}
function createFocusTrap(root) {
  let previous = null;
  const onKey = (event) => {
    if (event.key !== "Tab") return;
    const [first, last] = edgesWithin(root);
    if (!first) return;
    if (!root.contains(root.getRootNode().activeElement)) {
      first.focus();
      event.preventDefault();
      return;
    }
    if (event.shiftKey && root.getRootNode().activeElement === first) {
      last.focus();
      event.preventDefault();
    } else if (!event.shiftKey && root.getRootNode().activeElement === last) {
      first.focus();
      event.preventDefault();
    }
  };
  return {
    /** Remember the opener and start wrapping Tab inside the root. */
    activate(opener) {
      previous = opener || root.getRootNode().activeElement;
      document.addEventListener("keydown", onKey, true);
    },
    /** Stop wrapping and restore focus, when the opener is still on the page. */
    deactivate() {
      document.removeEventListener("keydown", onKey, true);
      const opener = previous;
      previous = null;
      if (opener && typeof opener.focus === "function" && opener.isConnected) opener.focus();
    }
  };
}

// src/drag.js
var GRAB = 80;
var SHEET2 = "(max-width: 680px)";
var CONTROLS = 'button, input, select, textarea, a[href], [role="slider"]';
var within2 = (value, min, max) => max < min ? min : Math.min(Math.max(value, min), max);
function createDrag({ panel, handle, onStart }) {
  const offset = { x: 0, y: 0 };
  let start = null;
  const frame = () => {
    const rect = panel.getBoundingClientRect();
    return { left: rect.left - offset.x, top: rect.top - offset.y, width: rect.width, height: rect.height };
  };
  const paint = () => {
    panel.style.transform = offset.x || offset.y ? `translate(${offset.x}px, ${offset.y}px)` : "";
  };
  const clampTo = (box) => {
    offset.x = within2(offset.x, GRAB - box.left - box.width, innerWidth - GRAB - box.left);
    offset.y = within2(offset.y, -box.top, innerHeight - GRAB - box.top);
  };
  const clamp2 = () => {
    if (!offset.x && !offset.y) return;
    clampTo(frame());
    paint();
  };
  const onPointerDown = (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (window.matchMedia(SHEET2).matches) return;
    if (panel.classList.contains("cp-is-maximized")) return;
    if (event.target.closest(CONTROLS)) return;
    start = { x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y, box: frame() };
    panel.classList.add("cp-is-dragging");
    if (onStart) onStart();
    try {
      handle.setPointerCapture(event.pointerId);
    } catch (error) {
    }
    event.preventDefault();
  };
  const onPointerMove = (event) => {
    if (!start) return;
    const box = start.box;
    offset.x = start.ox + (event.clientX - start.x);
    offset.y = start.oy + (event.clientY - start.y);
    clampTo(box);
    paint();
  };
  const onPointerUp = () => {
    if (!start) return;
    start = null;
    panel.classList.remove("cp-is-dragging");
  };
  const onDoubleClick = (event) => {
    if (event.target.closest(CONTROLS)) return;
    offset.x = 0;
    offset.y = 0;
    paint();
  };
  handle.addEventListener("pointerdown", onPointerDown);
  handle.addEventListener("pointermove", onPointerMove);
  handle.addEventListener("pointerup", onPointerUp);
  handle.addEventListener("pointercancel", onPointerUp);
  handle.addEventListener("dblclick", onDoubleClick);
  window.addEventListener("resize", clamp2);
  return {
    clamp: clamp2,
    /** Move back to the layout position: a fresh open starts anchored. */
    reset() {
      offset.x = 0;
      offset.y = 0;
      paint();
    },
    /** The live translate, so maximize can put the box back where it was. */
    getOffset: () => ({ x: offset.x, y: offset.y }),
    setOffset(x, y) {
      offset.x = x;
      offset.y = y;
      paint();
    },
    destroy() {
      handle.removeEventListener("pointerdown", onPointerDown);
      handle.removeEventListener("pointermove", onPointerMove);
      handle.removeEventListener("pointerup", onPointerUp);
      handle.removeEventListener("pointercancel", onPointerUp);
      handle.removeEventListener("dblclick", onDoubleClick);
      window.removeEventListener("resize", clamp2);
    }
  };
}

// src/resize.js
var MARGIN2 = 8;
var MIN_WIDTH = 400;
var MIN_HEIGHT = 320;
var SHEET3 = "(max-width: 680px)";
var within3 = (value, min, max) => max < min ? min : Math.min(Math.max(value, min), max);
function createResize({ panel, grip, mode, onStart, onChange }) {
  let start = null;
  const onPointerDown = (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (window.matchMedia(SHEET3).matches) return;
    if (panel.classList.contains("cp-is-maximized")) return;
    const rect = panel.getBoundingClientRect();
    start = { x: event.clientX, y: event.clientY, width: rect.width, height: rect.height, rect };
    panel.classList.add("cp-is-resizing");
    if (onStart) onStart();
    try {
      grip.setPointerCapture(event.pointerId);
    } catch (error) {
    }
    event.preventDefault();
  };
  const onPointerMove = (event) => {
    if (!start) return;
    const { rect } = start;
    const roomWidth = mode === "popover" ? innerWidth - MARGIN2 - rect.left : innerWidth - 2 * MARGIN2;
    const roomHeight = mode === "popover" ? innerHeight - MARGIN2 - rect.top : innerHeight - 2 * MARGIN2;
    const width = within3(start.width + (event.clientX - start.x), MIN_WIDTH, roomWidth);
    const height = within3(start.height + (event.clientY - start.y), MIN_HEIGHT, roomHeight);
    panel.style.width = `${Math.round(width)}px`;
    panel.style.height = `${Math.round(height)}px`;
    if (onChange) onChange();
  };
  const onPointerUp = () => {
    if (!start) return;
    start = null;
    panel.classList.remove("cp-is-resizing");
  };
  grip.addEventListener("pointerdown", onPointerDown);
  grip.addEventListener("pointermove", onPointerMove);
  grip.addEventListener("pointerup", onPointerUp);
  grip.addEventListener("pointercancel", onPointerUp);
  return {
    destroy() {
      grip.removeEventListener("pointerdown", onPointerDown);
      grip.removeEventListener("pointermove", onPointerMove);
      grip.removeEventListener("pointerup", onPointerUp);
      grip.removeEventListener("pointercancel", onPointerUp);
    }
  };
}

// src/maximize.js
var MARGIN3 = 8;
var SHEET4 = "(max-width: 680px)";
function createMaximize({ panel, button: button2, drag, pin, labels }) {
  let saved = null;
  const suggestions = () => panel.querySelector(".cp-suggestions");
  const setLabel = (name) => {
    button2.setAttribute("aria-label", name);
    button2.title = name;
  };
  const fill = () => {
    panel.style.width = `${Math.max(0, innerWidth - 2 * MARGIN3)}px`;
    panel.style.height = `${Math.max(0, innerHeight - 2 * MARGIN3)}px`;
    panel.style.maxHeight = "none";
    panel.style.position = "fixed";
    panel.style.left = `${MARGIN3}px`;
    panel.style.top = `${MARGIN3}px`;
  };
  const maximize = () => {
    if (saved) return;
    if (window.matchMedia(SHEET4).matches) return;
    const details = suggestions();
    saved = {
      width: panel.style.width,
      height: panel.style.height,
      position: panel.style.position,
      left: panel.style.left,
      top: panel.style.top,
      maxHeight: panel.style.maxHeight,
      offset: drag.getOffset(),
      /* `null` means there was no panel to open, so there is none to put back. */
      suggestionsOpen: details ? details.open : null
    };
    if (details) details.open = true;
    if (pin) pin();
    drag.setOffset(0, 0);
    fill();
    panel.classList.add("cp-is-maximized");
    setLabel(labels.restore);
  };
  const restore = () => {
    if (!saved) return;
    const previous = saved;
    saved = null;
    panel.classList.remove("cp-is-maximized");
    panel.style.width = previous.width;
    panel.style.height = previous.height;
    panel.style.maxHeight = previous.maxHeight;
    panel.style.position = previous.position;
    panel.style.left = previous.left;
    panel.style.top = previous.top;
    drag.setOffset(previous.offset.x, previous.offset.y);
    const details = suggestions();
    if (details && previous.suggestionsOpen !== null) details.open = previous.suggestionsOpen;
    setLabel(labels.maximize);
  };
  const toggle = () => saved ? restore() : maximize();
  const onClick = () => toggle();
  const onViewport = () => {
    if (!saved) return;
    if (window.matchMedia(SHEET4).matches) restore();
    else fill();
  };
  button2.addEventListener("click", onClick);
  window.addEventListener("resize", onViewport);
  return {
    get active() {
      return !!saved;
    },
    toggle,
    restore,
    destroy() {
      button2.removeEventListener("click", onClick);
      window.removeEventListener("resize", onViewport);
    }
  };
}

// src/geometry.js
var stillDrag = {
  clamp() {
  },
  reset() {
  },
  getOffset: () => ({ x: 0, y: 0 }),
  setOffset() {
  },
  destroy() {
  }
};
function createGeometry({ panel, header, grip, button: button2, mode, draggable, resizable, getPopover, labels }) {
  const pin = () => {
    const popover = getPopover();
    if (popover) popover.pin();
  };
  const drag = draggable ? createDrag({ panel, handle: header, onStart: pin }) : stillDrag;
  if (draggable) header.classList.add("cp-is-draggable");
  const resize = resizable ? createResize({ panel, grip, mode, onStart: pin, onChange: () => drag.clamp() }) : { destroy() {
  } };
  panel.classList.toggle("cp-is-resizable", Boolean(resizable));
  const maximize = createMaximize({ panel, button: button2, drag, pin, labels });
  return {
    get maximized() {
      return maximize.active;
    },
    toggleMaximize: () => maximize.toggle(),
    clamp: () => drag.clamp(),
    /** Back to the shipped box: not maximized, not moved, re-anchored. */
    reset() {
      maximize.restore();
      if (mode === "popover") drag.reset();
      const popover = getPopover();
      if (popover) popover.unpin();
    },
    destroy() {
      drag.destroy();
      resize.destroy();
      maximize.destroy();
    }
  };
}

// src/bindings.js
var COMPACT_BOX = { width: 380, height: 270 };
var SHEET5 = "(max-width: 680px)";
var isTextEntry = (node) => !!node && (node.isContentEditable || node.tagName === "TEXTAREA" || node.tagName === "INPUT" && node.type !== "range");
function bindShell(picker) {
  const { refs, slotIds } = picker;
  const tabs = refs.tabs;
  const focusSlot = (id) => {
    picker.setActiveSlot(id);
    tabs[slotIds.indexOf(id)].focus();
  };
  for (const button2 of tabs) {
    button2.addEventListener("click", () => picker.setActiveSlot(button2.dataset.slot));
  }
  if (tabs.length) tabs[0].parentElement.addEventListener("keydown", (event) => {
    let next = null;
    if (event.key === "Home") next = slotIds[0];
    else if (event.key === "End") next = slotIds[slotIds.length - 1];
    else next = tabAfterKey(event, picker.activeSlot, slotIds);
    if (!next) return;
    focusSlot(next);
    event.preventDefault();
  });
  refs.close.addEventListener("click", () => picker.dismiss());
  refs.cancel.addEventListener("click", () => picker.dismiss());
  refs.apply.addEventListener("click", () => picker.apply());
  refs.reset.addEventListener("click", () => picker.reset());
  let restoreBox = null;
  const toggleCompact = () => {
    const on = refs.panel.classList.toggle("cp-is-compact");
    refs.compact.setAttribute("aria-pressed", String(on));
    if (picker.options.mode === "inline" || window.matchMedia(SHEET5).matches) return;
    const style = refs.panel.style;
    if (on) {
      restoreBox = { width: style.width, height: style.height };
      style.width = `${COMPACT_BOX.width}px`;
      style.height = `${COMPACT_BOX.height}px`;
    } else if (restoreBox) {
      style.width = restoreBox.width;
      style.height = restoreBox.height;
      restoreBox = null;
    }
  };
  refs.compact.addEventListener("click", toggleCompact);
  const isTopmostOpen = (root) => {
    const open = root.getRootNode().querySelectorAll(".cp-root:not(.cp-hidden)");
    return open[open.length - 1] === root;
  };
  picker.onDocumentKey = (event) => {
    if (!picker.isOpen) return;
    if (!isTopmostOpen(picker.root)) return;
    if (picker.options.mode === "inline" && !event.composedPath().includes(picker.root)) return;
    if (event.key === "Escape") {
      picker.dismiss();
      return;
    }
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      if (picker.options.mode === "popover") picker.dismiss();
      else picker.apply();
      return;
    }
    if ((event.key === "PageUp" || event.key === "PageDown") && tabs.length && !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey && !(event.composedPath()[0].tagName === "INPUT" && event.composedPath()[0].type === "range")) {
      event.preventDefault();
      const step = event.key === "PageDown" ? 1 : slotIds.length - 1;
      const next = slotIds[(slotIds.indexOf(picker.activeSlot) + step) % slotIds.length];
      if (tabs.includes(picker.root.getRootNode().activeElement)) focusSlot(next);
      else picker.setActiveSlot(next);
      return;
    }
    if ((event.key === "m" || event.key === "M") && !event.metaKey && !event.ctrlKey && !event.altKey && !event.repeat && !isTextEntry(event.composedPath()[0])) {
      event.preventDefault();
      picker.geometry.toggleMaximize();
      return;
    }
    if ((event.key === "c" || event.key === "C") && !event.metaKey && !event.ctrlKey && !event.altKey && !event.repeat && !isTextEntry(event.composedPath()[0])) {
      event.preventDefault();
      toggleCompact();
    }
  };
  document.addEventListener("keydown", picker.onDocumentKey);
  if (picker.options.mode === "popover") {
    picker.onDocumentPointer = (event) => {
      if (!picker.isOpen) return;
      if (event.composedPath().includes(picker.root)) return;
      if (picker.triggers && event.composedPath().includes(picker.triggers)) return;
      if (picker.anchor && event.composedPath().includes(picker.anchor)) return;
      picker.dismiss();
    };
    document.addEventListener("pointerdown", picker.onDocumentPointer, true);
  }
  picker.focusTrap = createFocusTrap(picker.root);
  picker.geometry = createGeometry({
    panel: refs.panel,
    header: refs.header,
    grip: refs.grip,
    button: refs.maximize,
    mode: picker.options.mode,
    draggable: picker.options.draggable,
    resizable: picker.options.resizable,
    getPopover: () => picker.popover,
    labels: { ...LABELS, ...picker.options.labels }
  });
}
function unbindShell(picker) {
  document.removeEventListener("keydown", picker.onDocumentKey);
  if (picker.onDocumentPointer) {
    document.removeEventListener("pointerdown", picker.onDocumentPointer, true);
  }
}

// src/options.js
var ID_PATTERN = /^[A-Za-z][\w-]*$/;
var MODES = ["auto", "popover", "modal", "inline"];
var own = (obj, key) => obj && Object.hasOwn(obj, key) ? obj[key] : void 0;
var DEFAULT_SLOTS = [
  {
    id: "color",
    label: "Color",
    symbol: "\u25CF",
    presetSet: "text",
    color: "#0F766E"
  }
];
var DEFAULTS = {
  container: null,
  slots: null,
  initialColors: null,
  activeSlot: null,
  showAlpha: true,
  /* How the editor field shows (and Copy copies) the color: 'hex' | 'rgb' | 'hsl' | 'hsv'. */
  format: "hex",
  showContrastSuggestions: false,
  /* Suggestions measure a pair: `['text', 'background']`. Without one they stay off. */
  contrastPair: null,
  /* Panel size: a number is px, a string is any CSS length. null = the stylesheet's default. */
  width: null,
  height: null,
  /* Popover only: which side/edge of the trigger the panel hangs off (see PLACEMENTS in popover.js), nudged by `offset: { x, y }` px. */
  placement: "bottom-start",
  offset: null,
  /* Popover only: `{ x, y }` viewport px. Overrides the trigger-relative placement. */
  position: null,
  draggable: true,
  resizable: true,
  theme: "light",
  presets: null,
  classNames: "",
  labels: {},
  /* A host element (or selector) for the trigger bar. See `createTriggers`. */
  triggers: null,
  /* Inputs that *are* the controls (`<input data-color-picker>`); see `fields.js`. */
  fields: null,
  /* 'auto' = popover when a trigger is rendered, modal otherwise. 'inline' =
     always shown, docked in `container`: no scrim, no dismiss, no focus trap. */
  mode: "auto",
  onChange: null,
  onApply: null,
  onCancel: null,
  onOpen: null,
  onClose: null
};
function resolveOptions(options = {}, fieldEntries = null) {
  if (!options || typeof options !== "object") {
    throw new TypeError(`ColorPicker: options must be an object, got ${options === null ? "null" : typeof options}.`);
  }
  if (options.mode !== void 0 && !MODES.includes(options.mode)) {
    console.warn(`ColorPicker: unknown mode ${JSON.stringify(options.mode)} \u2014 using 'auto'.`);
  }
  const fields = Array.isArray(fieldEntries) ? fieldEntries : [];
  if (fields.length && Array.isArray(options.slots) && options.slots.length) {
    throw new TypeError("ColorPicker: `fields` names its own slots \u2014 drop `slots`.");
  }
  if (options.fields && !fields.length) {
    console.warn(`ColorPicker: \`fields\` ${JSON.stringify(options.fields)} matched no inputs \u2014 opening as a centred modal.`);
  }
  const picked = options.mode === "popover" || options.mode === "modal" || options.mode === "inline" ? options.mode : options.triggers || fields.length ? "popover" : "modal";
  const fieldColors = fields.length ? Object.fromEntries(fields.map((field) => [field.id, field.raw])) : null;
  return {
    ...DEFAULTS,
    ...options,
    mode: picked,
    slots: fields.length ? fieldSlots(fields) : options.slots,
    fieldEntries: fields,
    /* A field's own value is the color it starts with; `initialColors` wins. */
    startColors: { ...fieldColors, ...options.initialColors || {} },
    /* An inline panel is a part of the page, not a box over it: nothing to move. */
    draggable: picked !== "inline" && (options.draggable === void 0 ? DEFAULTS.draggable : Boolean(options.draggable)),
    resizable: picked !== "inline" && (options.resizable === void 0 ? DEFAULTS.resizable : Boolean(options.resizable)),
    showAlpha: options.showAlpha === void 0 ? DEFAULTS.showAlpha : Boolean(options.showAlpha),
    labels: { ...DEFAULTS.labels, ...options.labels || {} }
  };
}
function firstPresetHex(set) {
  const palette = PRESET_SETS[set] || PRESET_SETS.background;
  const first = palette[Object.keys(palette)[0]];
  return first && first[0] || "#000000";
}
function resolveSlots(slots, labels = {}) {
  const usingDefaults = !(Array.isArray(slots) && slots.length);
  const list = usingDefaults ? DEFAULT_SLOTS : slots;
  const tabLabels = labels.tabs || {};
  const out = [];
  for (const raw of list) {
    const spec = typeof raw === "string" ? { id: raw } : raw || {};
    const explicit = usingDefaults ? {} : spec;
    const id = spec.id;
    if (typeof id !== "string" || !ID_PATTERN.test(id)) {
      throw new TypeError(`ColorPicker: slot id must match ${ID_PATTERN}, got ${JSON.stringify(id)}`);
    }
    if (out.some((slot) => slot.id === id)) {
      throw new TypeError(`ColorPicker: duplicate slot id "${id}"`);
    }
    if (spec.presetSet !== void 0 && !PRESET_GROUPS[spec.presetSet]) {
      console.warn(`ColorPicker: slot "${id}" has unknown presetSet ${JSON.stringify(spec.presetSet)} \u2014 using 'background'.`);
    }
    const presetSet = spec.presetSet === "text" ? "text" : "background";
    const shipped2 = DEFAULT_SLOTS.find((slot) => slot.id === id) || {};
    const overrides = own(tabLabels, id) || {};
    const color = explicit.color == null ? shipped2.color || firstPresetHex(presetSet) : normalizeHex(explicit.color);
    if (!color) {
      throw new TypeError(`ColorPicker: slot "${id}" color must be a hex string, got ${JSON.stringify(explicit.color)}`);
    }
    out.push({
      id,
      label: explicit.label || overrides.title || shipped2.label || id,
      type: explicit.type || overrides.type || shipped2.type || PRESET_GROUPS[presetSet].type,
      hint: explicit.hint || overrides.hint || shipped2.hint || "",
      symbol: explicit.symbol || shipped2.symbol || id.charAt(0).toUpperCase(),
      presetSet,
      color
    });
  }
  return out;
}
function resolvePair(pair, slotIds) {
  if (!Array.isArray(pair) || pair.length !== 2) return null;
  const [a, b] = pair;
  if (a === b || !slotIds.includes(a) || !slotIds.includes(b)) return null;
  return [a, b];
}
function clampAlpha(hex, showAlpha) {
  if (showAlpha || typeof hex !== "string") return hex;
  const rgba = parseHex(hex);
  return rgba ? formatHex({ ...rgba, a: 1 }) : hex;
}
function resolveColors(values, slots, showAlpha = true, fallback = {}) {
  const resolved = {};
  for (const slot of slots) {
    const raw = own(values, slot.id);
    const valid = typeof raw === "string" && normalizeHex(raw) || own(fallback, slot.id) || slot.color;
    resolved[slot.id] = clampAlpha(valid, showAlpha);
  }
  return resolved;
}

// src/color-picker.js
var ColorPicker = class {
  constructor(options = {}) {
    this.options = resolveOptions(options, options && options.fields ? readFields(options.fields) : null);
    this.slots = resolveSlots(this.options.slots, this.options.labels);
    this.slotIds = this.slots.map((slot) => slot.id);
    this.pair = resolvePair(this.options.contrastPair, this.slotIds);
    this.initialColors = resolveColors(this.options.startColors, this.slots, this.options.showAlpha);
    this.colors = { ...this.initialColors };
    this.snapshot = { ...this.colors };
    this.activeSlot = this.slotIds.includes(this.options.activeSlot) ? this.options.activeSlot : this.slotIds[0];
    this.isOpen = false;
    this.anchor = null;
    this.root = document.createElement("div");
    this.root.className = `cp-root${this.options.classNames ? ` ${this.options.classNames}` : ""}`;
    this.root.dataset.theme = this.options.theme;
    this.root.classList.add("cp-hidden");
    assemble(this);
    bindShell(this);
    syncTabs(this.refs, this.activeSlot);
    if (this.options.mode === "inline") {
      this.isOpen = true;
      this.root.classList.remove("cp-hidden");
    }
    this.refresh();
  }
  setStatus(message) {
    this.refs.status.textContent = message || "";
  }
  emit(name) {
    const handler = this.options[name];
    if (typeof handler === "function") handler(this.getColors());
  }
  commit(rgba) {
    this.selectColor(formatHex(rgba), { source: "editor" });
  }
  /** Push editor + panels from `this.colors` without emitting. */
  refresh() {
    this.editor.setColor(parseHex(this.colors[this.activeSlot]));
    this.renderPanels();
  }
  /** Repaint the read-only surfaces; the editor is left alone mid-drag. */
  renderPanels() {
    const slot = this.slots.find((entry) => entry.id === this.activeSlot) || this.slots[0];
    if (this.isOpen) this.panel.render(slot.presetSet, this.colors[this.activeSlot]);
    this.suggestions.render(this.activeSlot, slot.presetSet, this.colors);
    if (this.triggers) this.triggers.render(this.colors);
  }
  /**
   * The single writer to `colors`. Swatch clicks, HEX/SV edits and
   * `setColors()` all land here, so editor, HEX, preview and per-slot memory
   * can never disagree. `slot` defaults to the one the editor is showing; a
   * preset grid passes its own slot, so its click never lands elsewhere.
   */
  selectColor(hex, { source = "preset", slot = this.activeSlot } = {}) {
    const normalized = clampAlpha(normalizeHex(hex), this.options.showAlpha);
    if (!normalized || !this.slotIds.includes(slot)) return;
    if (slot !== this.activeSlot) {
      this.activeSlot = slot;
      syncTabs(this.refs, this.activeSlot);
      this.setStatus("");
    }
    const changed = this.colors[slot] !== normalized;
    this.colors[slot] = normalized;
    if (source === "editor") {
      if (this.refs.status.textContent) {
        this.setStatus("");
        this.refs.hex.removeAttribute("aria-invalid");
      }
      this.renderPanels();
    } else {
      this.refresh();
      this.setStatus(normalized);
    }
    if (changed) this.emit("onChange");
  }
  setActiveSlot(slot) {
    if (!this.slotIds.includes(slot) || slot === this.activeSlot) return;
    this.activeSlot = slot;
    syncTabs(this.refs, this.activeSlot);
    this.refresh();
    this.setStatus("");
  }
  getColors() {
    return { ...this.colors };
  }
  setColors(partial) {
    const next = resolveColors({ ...this.colors, ...partial || {} }, this.slots, this.options.showAlpha, this.colors);
    let changed = false;
    for (const id of this.slotIds) {
      if (next[id] !== this.colors[id]) {
        this.colors[id] = next[id];
        changed = true;
      }
    }
    if (!changed) return;
    this.refresh();
    this.setStatus("");
    this.emit("onChange");
  }
  open(anchor = null) {
    if (this.isOpen) return;
    this.anchor = anchor || (this.triggers ? this.triggers.anchorFor(this.activeSlot) : null);
    this.snapshot = { ...this.colors };
    this.isOpen = true;
    this.root.classList.remove("cp-hidden");
    this.refresh();
    this.geometry.reset();
    if (this.popover) {
      this.popover.attach();
      this.popover.place();
    }
    this.setStatus("");
    this.focusTrap.activate(this.anchor);
    const activeTab = this.refs.tabs[this.slotIds.indexOf(this.activeSlot)];
    (activeTab || this.refs.sv).focus();
    if (this.triggers) this.triggers.sync(true);
    this.emit("onOpen");
  }
  close() {
    if (!this.isOpen || this.options.mode === "inline") return;
    this.isOpen = false;
    this.anchor = null;
    this.root.classList.add("cp-hidden");
    this.focusTrap.deactivate();
    if (this.popover) this.popover.detach();
    if (this.triggers) this.triggers.sync(false);
    this.emit("onClose");
  }
  /**
   * The one dismiss path for the shell. A popover commits on the way out —
   * every edit is painted live and there is no OK/Cancel to undo it — while a
   * modal restores the snapshot it opened with.
   */
  dismiss() {
    if (this.options.mode === "inline") return;
    if (this.options.mode === "popover") this.close();
    else this.cancel();
  }
  reset() {
    this.colors = { ...this.initialColors };
    this.refresh();
    this.setStatus("Restored the initial colors.");
    this.emit("onChange");
  }
  cancel() {
    if (!this.isOpen || this.options.mode === "inline") return;
    this.colors = { ...this.snapshot };
    this.refresh();
    this.setStatus("Changes discarded.");
    this.emit("onCancel");
    this.close();
  }
  apply() {
    if (this.options.mode === "inline") return;
    this.snapshot = { ...this.colors };
    this.setStatus("Colors applied.");
    this.emit("onApply");
    this.close();
  }
  destroy() {
    unbindShell(this);
    this.focusTrap.deactivate();
    this.geometry.destroy();
    if (this.popover) this.popover.destroy();
    if (this.triggers) this.triggers.destroy();
    for (const part of [this.copy, this.suggestions, this.panel, this.editor]) part.destroy();
    this.root.remove();
    this.isOpen = false;
  }
};
