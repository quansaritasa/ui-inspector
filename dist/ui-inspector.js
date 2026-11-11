/*! ui-inspector v0.19.2 — Press a shortcut, hover any control, click to see its name, colors, font and matching CSS rules — then copy a summary for an AI to edit it.
 * https://github.com/quansaritasa/ui-inspector  (MIT)
 * Built from src/ by build.js — edit the sources, not this file. */
(function (global) {
'use strict';

const UiiColorPicker = (() => {
/* Vendored from the color-picker project, dist/color-picker.esm.js @ bb509bf.
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

// src/presets.js
var PRESET_SETS = {
  text: {
    /* Ordered so neighbours look alike: one tint family at a time, dark to light
       within it. `Normal` runs gray, slate, stone, neutral, then its light tail for
       dark surfaces; `#000000` leads it, and the first entry is what `options.js`
       hands a text slot with no color of its own. The two colored tabs walk the
       hue wheel; `Highlight` ends with its dark-surface row in the same hue order. */
    Normal: [
      "#000000",
      "#111827",
      "#1F2937",
      "#374151",
      "#4B5563",
      "#6B7280",
      "#020617",
      "#0F172A",
      "#1E293B",
      "#334155",
      "#475569",
      "#64748B",
      "#94A3B8",
      "#050A18",
      "#0A1128",
      "#0D1B2A",
      "#0B1B3A",
      "#111B33",
      "#14213D",
      "#1B263B",
      "#1B2A49",
      "#1E2A44",
      "#22304A",
      "#2B3A55",
      "#364A6B",
      "#1C1917",
      "#292524",
      "#44403C",
      "#57534E",
      "#171717",
      "#262626",
      "#404040",
      "#525252",
      "#737373",
      "#A3A3A3",
      "#D1D5DB",
      "#E5E7EB",
      "#F3F4F6",
      "#FFFFFF"
    ],
    Heading: [
      "#172554",
      "#1E3A5F",
      "#312E81",
      "#1E3A8A",
      "#3730A3",
      "#1E40AF",
      "#4338CA",
      "#1D4ED8",
      "#2563EB",
      "#1E1B4B",
      "#2E1065",
      "#3B0764",
      "#4C1D95",
      "#581C87",
      "#052E16",
      "#1A2E05",
      "#0F5132",
      "#14532D",
      "#365314",
      "#166534",
      "#3F6212",
      "#15803D",
      "#022C22",
      "#064E3B",
      "#134E4A",
      "#065F46",
      "#115E59",
      "#047857",
      "#0F766E",
      "#042F2E",
      "#083344",
      "#0A3D62",
      "#0C4A6E",
      "#164E63",
      "#075985",
      "#155E75",
      "#0369A1",
      "#0E7490"
    ],
    Highlight: [
      "#4F46E5",
      "#818CF8",
      "#60A5FA",
      "#5B21B6",
      "#6B21A8",
      "#6D28D9",
      "#7E22CE",
      "#7C3AED",
      "#9333EA",
      "#A78BFA",
      "#C084FC",
      "#701A75",
      "#86198F",
      "#A21CAF",
      "#C026D3",
      "#E879F9",
      "#9D174D",
      "#BE185D",
      "#DB2777",
      "#F472B6",
      "#7F1D1D",
      "#881337",
      "#991B1B",
      "#9A3412",
      "#B91C1C",
      "#BE123C",
      "#C2410C",
      "#DC2626",
      "#E11D48",
      "#EF4444",
      "#F87171",
      "#78350F",
      "#92400E",
      "#854D0E",
      "#A16207",
      "#B45309",
      "#EA580C",
      "#F97316",
      "#FB923C",
      "#CA8A04",
      "#F59E0B",
      "#4D7C0F",
      "#65A30A",
      "#22C55E",
      "#84CC16",
      "#0D9488",
      "#34D399",
      "#0891B2",
      "#38BDF8",
      "#93C5FD",
      "#F9A8D4",
      "#FDA4AF",
      "#FDBA74",
      "#FBBF24",
      "#EAB308",
      "#FACC15",
      "#FDE047",
      "#BEF264",
      "#A3E635",
      "#6EE7B7",
      "#2DD4BF",
      "#67E8F9",
      "#22D3EE"
    ]
  },
  background: {
    Vivid: [
      "#70B1ED",
      "#3189FD",
      "#6BA5FB",
      "#90AEFE",
      "#8AA2E4",
      "#8D9BFB",
      "#8075FD",
      "#B0A5F2",
      "#BC90FF",
      "#BB8FDE",
      "#B94BFD",
      "#D78FF6",
      "#D180E1",
      "#D995D9",
      "#E70CD0",
      "#F186D4",
      "#D289BB",
      "#EB77B6",
      "#E197BC",
      "#FF82B2",
      "#FA0C86",
      "#E183A1",
      "#F67591",
      "#F290A2",
      "#FE8B82",
      "#FE2832",
      "#DC8C81",
      "#F87868",
      "#FE8F5D",
      "#F3813F",
      "#D76807",
      "#DE8F57",
      "#F29B1D",
      "#DCA65E",
      "#DB940E",
      "#B88007",
      "#C4A040",
      "#D6AB1B",
      "#9B8F08",
      "#BDB55D",
      "#B1A92B",
      "#BAB818",
      "#93B25A",
      "#6C9E08",
      "#8AC652",
      "#51BF68",
      "#78C687",
      "#0BA75D",
      "#10D095",
      "#55BB96",
      "#51CAA7",
      "#0BA28F",
      "#39BAB4",
      "#09CBC5",
      "#1FB8CF",
      "#0A9DB2",
      "#04C4F0",
      "#6DBEDC",
      "#0A96D6",
      "#0EB0FD"
    ],
    /* The pale washes the group used to ship, kept as one category because the
       contrast suggestions rank partners out of this palette: none of the 60
       badge inks clears 4.5:1 against a mid-tone text like #0F766E, so without a
       pale set the suggestions panel has nothing to offer for such a pair. The
       old six categories are merged and de-duplicated here, with five more washes
       in the hue gaps and four across red and orange — 43 colors, then 17 more across every hue so it matches
       `Vivid` at 60. Contrast against #0F766E is what caps the set: a wash light enough to stay useful
       there has little chroma left to spend, so the red/orange four sit at
       3.78-5.00:1, inside the range the merged washes already covered. */
    Pale: [
      "#BFDBFE",
      "#EFF6FF",
      "#DBEAFE",
      "#D3DFF3",
      "#EDE9FE",
      "#E0D8FD",
      "#F3E8FF",
      "#F0D1FF",
      "#EAD7E8",
      "#FCE7F3",
      "#FBCFE8",
      "#FFE4E6",
      "#FEF2F2",
      "#FECACA",
      "#F1D7D2",
      "#FDE4CF",
      "#FFDAB9",
      "#FED7AA",
      "#FFF7ED",
      "#FFEDD5",
      "#F0DDA9",
      "#FDEAB6",
      "#FFFBEB",
      "#FEF3C7",
      "#FDE68A",
      "#E2DFC9",
      "#FBF6AE",
      "#EDF0BA",
      "#DCE4AF",
      "#F7FEE7",
      "#ECFCCB",
      "#E6F0D3",
      "#D5F9BA",
      "#CDE7C7",
      "#F0FDF4",
      "#BBF7D0",
      "#DCFCE7",
      "#B6EDCE",
      "#D1FAE5",
      "#ECFDF5",
      "#BAFBE8",
      "#D8F2EA",
      "#BCE9DC",
      "#99F6E4",
      "#F0FDFA",
      "#CCFBF1",
      "#E6FFFB",
      "#A6EDF0",
      "#A8FAFF",
      "#C8E4E7",
      "#CDF5FF",
      "#BAE6FD",
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
var SHEET = "(max-width: 680px)";
var MIN_ROOM = 160;
var within = (value, min, max) => max < min ? min : Math.min(Math.max(value, min), max);
function createPopover({ panel, getAnchor }) {
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
    let flipped = false;
    if (anchorBox) {
      if (left + box.width > innerWidth - MARGIN) left = anchorBox.right - box.width;
      if (top + box.height > innerHeight - MARGIN) {
        const above = anchorBox.top - GAP - box.height;
        flipped = above >= MARGIN;
        top = flipped ? above : innerHeight - MARGIN - box.height;
      }
    }
    const at = {
      left: Math.round(within(left, MARGIN, innerWidth - MARGIN - box.width)),
      top: Math.round(within(top, MARGIN, innerHeight - MARGIN - box.height))
    };
    return {
      ...at,
      /* A panel hung above its trigger stops at the trigger, not at the screen
         edge: growth downwards would cover the anchor it hangs off. */
      room: flipped ? Math.round(box.height) : Math.round(innerHeight - MARGIN - at.top)
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
  picker.popover = options.mode === "popover" ? createPopover({ panel: picker.refs.panel, getAnchor: () => picker.anchor }) : null;
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
var MARGIN2 = 8;
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
    offset.x = within2(offset.x, MARGIN2 - box.left, innerWidth - MARGIN2 - box.left - box.width);
    offset.y = within2(offset.y, MARGIN2 - box.top, innerHeight - MARGIN2 - box.top - box.height);
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
var MARGIN3 = 8;
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
    const roomWidth = mode === "popover" ? innerWidth - MARGIN3 - rect.left : innerWidth - 2 * MARGIN3;
    const roomHeight = mode === "popover" ? innerHeight - MARGIN3 - rect.top : innerHeight - 2 * MARGIN3;
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
var MARGIN4 = 8;
var SHEET4 = "(max-width: 680px)";
function createMaximize({ panel, button: button2, drag, pin, labels }) {
  let saved = null;
  const suggestions = () => panel.querySelector(".cp-suggestions");
  const setLabel = (name) => {
    button2.setAttribute("aria-label", name);
    button2.title = name;
  };
  const fill = () => {
    panel.style.width = `${Math.max(0, innerWidth - 2 * MARGIN4)}px`;
    panel.style.height = `${Math.max(0, innerHeight - 2 * MARGIN4)}px`;
    panel.style.maxHeight = "none";
    panel.style.position = "fixed";
    panel.style.left = `${MARGIN4}px`;
    panel.style.top = `${MARGIN4}px`;
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

return ColorPicker;
})();
const UII_CP_CSS = "\n.cp-root{--cp-accent: #2563eb;--cp-accent-strong: #2563eb;--cp-accent-soft: #eff6ff;--cp-accent-line: #bfd3ff;--cp-ink: #172033;--cp-muted: #667085;--cp-subtle: #667085;--cp-line: #e5e9f0;--cp-line-soft: #e7eaf0;--cp-surface: #ffffff;--cp-surface-alt: #f5f7fa;--cp-field-alt: #e9edf5;--cp-track: #eef1f6;--cp-pill-bg: #f7f8fb;--cp-pill-ink: #536075;--cp-btn-line: #dce2eb;--cp-btn-ink: #344054;--cp-hover: #f1f4f8;--cp-canvas: #f4f6fa;--cp-field: #d8dee8;--cp-danger: #b42318;--cp-radius: 22px;--cp-shadow: 0 24px 70px #1d2a441c, 0 3px 12px #1d2a440a;position:fixed;inset:0;z-index:1000;display:grid;place-items:center;padding:16px;background:#1018283d;color:var(--cp-ink);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;font-size:13px;line-height:1.4}.cp-root.cp-hidden{display:none}.cp-root[data-theme=dark]{--cp-accent: #60a5fa;--cp-accent-soft: #1c2740;--cp-accent-line: #3b5170;--cp-ink: #e8eefb;--cp-muted: #9aa8bd;--cp-subtle: #8595aa;--cp-line: #263143;--cp-line-soft: #263143;--cp-surface: #151d2c;--cp-surface-alt: #1b2434;--cp-field-alt: #243042;--cp-track: #263143;--cp-pill-bg: #1b2434;--cp-pill-ink: #b9c6d9;--cp-btn-line: #33415a;--cp-btn-ink: #dbe4f0;--cp-hover: #223047;--cp-canvas: #0f1522;--cp-field: #33415a;--cp-danger: #fca5a5;--cp-shadow: 0 24px 70px #00000080, 0 3px 12px #00000040;background:#0509124d}.cp-root *,.cp-root *:before,.cp-root *:after{box-sizing:border-box}.cp-root button,.cp-root input{font:inherit;color:inherit}.cp-root button{cursor:pointer}.cp-root .cp-picker{width:min(100%,500px);max-height:calc(100vh - 32px);display:flex;flex-direction:column;overflow:hidden;position:relative;background:var(--cp-surface);border:1px solid var(--cp-line-soft);border-radius:var(--cp-radius);box-shadow:var(--cp-shadow)}.cp-root .cp-picker-body{flex:1 1 auto;min-height:0;overflow:auto;display:flex;flex-direction:column}.cp-root .cp-picker-body{scrollbar-width:thin;scrollbar-color:var(--cp-field) transparent}.cp-root .cp-picker-body::-webkit-scrollbar{width:10px}.cp-root .cp-picker-body::-webkit-scrollbar-track{background:transparent}.cp-root .cp-picker-body::-webkit-scrollbar-thumb{background:var(--cp-field);border:3px solid transparent;border-radius:999px;background-clip:content-box}.cp-root .cp-picker-body::-webkit-scrollbar-thumb:hover{background:var(--cp-muted);background-clip:content-box}.cp-root .cp-picker-body>*{flex-shrink:0}.cp-root .cp-picker-body>.cp-editor{flex-grow:1}.cp-root .cp-picker.cp-is-maximized .cp-resize-grip,.cp-root .cp-picker:not(.cp-is-resizable) .cp-resize-grip{display:none}.cp-root .cp-picker-header{display:flex;align-items:center;justify-content:space-between;padding:10px 14px 9px}.cp-root .cp-picker-header.cp-is-draggable{cursor:grab;touch-action:none;user-select:none}.cp-root .cp-picker.cp-is-dragging .cp-picker-header.cp-is-draggable{cursor:grabbing}.cp-root .cp-picker.cp-is-maximized .cp-picker-header.cp-is-draggable{cursor:default}.cp-root .cp-heading{display:flex;align-items:center;gap:10px}.cp-root .cp-app-icon{width:26px;height:26px;border-radius:8px;display:grid;place-items:center;color:#fff;background:var(--cp-accent-strong);font-size:13px}.cp-root .cp-picker-header h2{margin:0;font-size:14px;letter-spacing:-.03em}.cp-root .cp-close-btn{width:26px;height:26px;border:0;border-radius:8px;background:transparent;color:var(--cp-subtle);font-size:18px;line-height:1;display:grid;place-items:center;padding:0 0 3px}.cp-root .cp-close-btn:hover{background:var(--cp-hover)}.cp-root .cp-tabs{margin:0 14px;padding:3px;display:grid;grid-template-columns:repeat(var(--cp-slots, 2),minmax(0,1fr));gap:3px;background:var(--cp-surface-alt);border:1px solid var(--cp-line);border-radius:11px}.cp-root .cp-tab{border:0;background:transparent;border-radius:8px;padding:6px 9px;display:flex;align-items:stretch;gap:9px;text-align:left;color:var(--cp-muted);min-width:0}.cp-root .cp-tab-body{display:flex;flex:1 1 auto;flex-direction:column;justify-content:space-between;min-width:0}.cp-root .cp-tab.cp-active{background:var(--cp-surface);color:var(--cp-ink);box-shadow:0 1px 4px #17203312;outline:1px solid var(--cp-line-soft)}.cp-root .cp-tab-symbol{width:22px;height:22px;flex:0 0 22px;align-self:center;display:grid;place-items:center;border-radius:50%;background:var(--cp-field-alt);color:var(--cp-muted);font-weight:750;font-size:12px}.cp-root .cp-tab.cp-active .cp-tab-symbol{background:var(--cp-accent-strong);color:#fff}.cp-root .cp-tab strong{display:block;font-size:12px;font-weight:700}.cp-root .cp-tab small{display:block;margin-top:1px;font-size:10px;color:var(--cp-subtle)}.cp-root .cp-editor{display:grid;grid-template-columns:minmax(0,1fr) minmax(232px,.8fr);gap:12px;padding:11px 14px}.cp-root .cp-sv-wrap{position:relative;min-height:116px}.cp-root .cp-sv{position:absolute;inset:0;border-radius:10px;overflow:hidden;cursor:crosshair;background-color:#10a294;background-image:linear-gradient(to top,#000,transparent),linear-gradient(to right,#fff,transparent);border:1px solid var(--cp-field);touch-action:none}.cp-root .cp-sv-thumb{position:absolute;width:15px;height:15px;border:2px solid #fff;border-radius:50%;box-shadow:0 1px 4px #0005;transform:translate(-50%,-50%);pointer-events:none}@media(min-width:681px){.cp-root .cp-picker.cp-is-maximized .cp-editor{grid-template-columns:minmax(0,1fr) minmax(232px,30vw)}}.cp-root .cp-editor-side{display:flex;flex-direction:column;gap:10px}.cp-root .cp-hex-row{display:flex;align-items:center;gap:9px}.cp-root .cp-color-preview{width:38px;height:38px;flex:0 0 38px;border-radius:9px;border:1px solid #00000012;background-image:repeating-conic-gradient(#d9dee7 0 25%,#fff 0 50%);background-size:10px 10px}.cp-root .cp-format-select{flex:0 0 auto;height:28px;border:1px solid var(--cp-field);border-radius:8px;padding:0 2px;font:inherit;font-size:12px;font-weight:650;color:inherit;background:var(--cp-surface);outline:none;cursor:pointer}.cp-root .cp-format-select:focus-visible{border-color:var(--cp-accent);box-shadow:0 0 0 3px #2563eb18}.cp-root .cp-format-select option{background:var(--cp-surface);color:var(--cp-ink)}@supports (appearance: base-select){.cp-root .cp-format-select,.cp-root .cp-format-select::picker(select){appearance:base-select}.cp-root .cp-format-select{display:flex;align-items:center;gap:5px;padding:0 7px 0 9px;transition:border-color .12s,background .12s}.cp-root .cp-format-select:hover{background:var(--cp-hover)}.cp-root .cp-format-select::picker-icon{font-size:8px;color:var(--cp-subtle);transition:rotate .15s}.cp-root .cp-format-select:open::picker-icon{rotate:180deg}.cp-root .cp-format-select::picker(select){min-width:anchor-size(width);margin-top:4px;padding:4px;border:1px solid var(--cp-line);border-radius:10px;background:var(--cp-surface);color:var(--cp-ink);box-shadow:var(--cp-shadow)}.cp-root .cp-format-select option{padding:6px 10px;border-radius:7px;font-size:12px;font-weight:650;cursor:pointer}.cp-root .cp-format-select option:hover,.cp-root .cp-format-select option:focus-visible{background:var(--cp-hover);outline:none}.cp-root .cp-format-select option:checked{background:var(--cp-accent-soft);color:var(--cp-accent-strong)}.cp-root .cp-format-select option::checkmark{display:none}}.cp-root .cp-hex-field{position:relative;flex:1 1 auto;min-width:0;display:flex}.cp-root .cp-hex-input{width:100%;min-width:0;height:38px;border:1px solid var(--cp-field);border-radius:9px;padding:0 38px 0 10px;font-weight:650;letter-spacing:.02em;outline:none;background:var(--cp-surface)}.cp-root .cp-hex-input:focus{border-color:var(--cp-accent);box-shadow:0 0 0 3px #2563eb18}.cp-root .cp-hex-input[aria-invalid=true]{border-color:var(--cp-danger);box-shadow:0 0 0 3px #b4231818}.cp-root .cp-hex-input[aria-invalid=true]:focus{border-color:var(--cp-danger);box-shadow:0 0 0 3px #b4231824}.cp-root .cp-copy-btn{position:absolute;right:4px;top:50%;transform:translateY(-50%);width:30px;height:30px;border:0;border-radius:8px;background:transparent;color:var(--cp-subtle);display:grid;place-items:center;padding:0;transition:background .12s ease,color .12s ease}.cp-root .cp-copy-btn:hover{background:var(--cp-hover);color:var(--cp-ink)}.cp-root .cp-copy-btn:focus-visible{outline:2px solid var(--cp-accent);outline-offset:1px}.cp-root .cp-copy-done{display:none;font-size:13px;font-weight:700;line-height:1}.cp-root .cp-copy-btn[data-copied=true]{color:var(--cp-accent-strong)}.cp-root .cp-copy-btn[data-copied=true] svg{display:none}.cp-root .cp-copy-btn[data-copied=true] .cp-copy-done{display:block}.cp-root .cp-range-block{display:grid;gap:7px}.cp-root .cp-range-block[hidden]{display:none}.cp-root .cp-range-label{display:flex;justify-content:space-between;color:var(--cp-muted);font-size:10px;font-weight:650}.cp-root .cp-range-block input[type=range]{appearance:none;width:100%;height:10px;border-radius:99px;outline:none;margin:2px 0;background:var(--cp-track)}.cp-root .cp-range-block input[type=range]:focus-visible{box-shadow:0 0 0 3px #2563eb33}.cp-root .cp-hue-range input[type=range]{background:linear-gradient(90deg,red,#ff0,#0f0,#0ff,#00f,#f0f,red)}.cp-root .cp-alpha-range input[type=range]{background:linear-gradient(90deg,transparent,#1475ef),repeating-conic-gradient(#d9dee7 0 25%,#fff 0 50%) 0/12px 12px}.cp-root .cp-range-block input[type=range]::-webkit-slider-thumb{appearance:none;width:16px;height:16px;border:2px solid #fff;border-radius:50%;background:var(--cp-accent);box-shadow:0 1px 5px #17203355}.cp-root .cp-range-block input[type=range]::-moz-range-thumb{width:12px;height:12px;border:2px solid #fff;border-radius:50%;background:var(--cp-accent);box-shadow:0 1px 5px #17203355}.cp-root .cp-divider{height:1px;background:var(--cp-line);margin:0 14px}.cp-root .cp-presets{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;padding:10px 14px 12px}.cp-root .cp-presets[hidden]{display:none}.cp-root .cp-presets:empty{display:none}.cp-root .cp-preset-section{min-width:0}.cp-root .cp-preset-section .cp-swatches{opacity:1;transition:opacity .15s ease}.cp-root .cp-preset-section:not(.cp-is-emphasis) .cp-swatches{opacity:.55}.cp-root .cp-preset-section+.cp-preset-section{border-left:1px solid var(--cp-line);padding-left:12px}.cp-root .cp-section-title{display:flex;align-items:center;gap:7px;margin-bottom:8px}.cp-root .cp-section-icon{width:22px;height:22px;border-radius:7px;display:grid;place-items:center;background:var(--cp-accent-soft);color:var(--cp-accent);font-size:11px;font-weight:800}.cp-root .cp-section-title strong{font-size:12px;letter-spacing:-.02em}.cp-root .cp-category-row{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:8px}.cp-root .cp-category{border:1px solid var(--cp-line-soft);background:var(--cp-pill-bg);color:var(--cp-pill-ink);border-radius:7px;padding:4px 8px;font-size:10px;font-weight:600}.cp-root .cp-category.cp-is-active{background:var(--cp-accent-soft);color:var(--cp-accent);border-color:var(--cp-accent-line)}.cp-root .cp-swatches{display:grid;grid-template-columns:repeat(auto-fill,26px);justify-content:start;gap:5px}.cp-root .cp-swatch{aspect-ratio:1;min-width:0;padding:0;border:1px solid #0000001f;border-radius:7px;position:relative;box-shadow:inset 0 0 0 1px #ffffff35;transition:transform .12s ease}.cp-root .cp-swatch:hover{transform:translateY(-1px)}.cp-root .cp-swatch.cp-is-selected{outline:2px solid var(--cp-accent);outline-offset:1px}.cp-root .cp-swatch.cp-is-selected:after{content:\"\\2713\";position:absolute;inset:0;display:grid;place-items:center;color:var(--cp-check-color, #fff);font-size:12px;font-weight:800;text-shadow:0 1px 3px #0006}.cp-root .cp-section-hint{margin:7px 0 0;color:var(--cp-subtle);font-size:10px}.cp-root .cp-suggestions-band{padding:0 18px}.cp-root .cp-suggestions-band[hidden]{display:none}.cp-root .cp-suggestions{margin-bottom:10px;border:1px solid var(--cp-line);border-radius:10px;background:var(--cp-canvas)}.cp-root .cp-suggestions>summary{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:8px 11px;color:var(--cp-muted);font-size:11px;font-weight:650;cursor:pointer;list-style:none}.cp-root .cp-suggestions>summary::-webkit-details-marker{display:none}.cp-root .cp-sugg-label:before{content:\"\\25b8\";display:inline-block;margin-right:8px;transition:transform .15s ease}.cp-root .cp-suggestions[open]>summary .cp-sugg-label:before{transform:rotate(90deg)}.cp-root .cp-sugg-verdict{display:inline-flex;align-items:center;gap:7px}.cp-root .cp-badge{border-radius:7px;padding:3px 7px;background:var(--cp-pill-bg);color:var(--cp-pill-ink);font-size:10px;font-weight:750;letter-spacing:.02em}.cp-root .cp-badge[data-level=AAA],.cp-root .cp-badge[data-level=AA]{background:#dcfce7;color:#166534}.cp-root .cp-badge[data-level=fail]{background:#fee2e2;color:#991b1b}.cp-root .cp-badge-large{background:#fef3c7;color:#92400e}.cp-root .cp-sugg-ratio{color:var(--cp-ink);font-variant-numeric:tabular-nums;font-weight:700}.cp-root .cp-sugg-hint,.cp-root .cp-sugg-empty{margin:0 11px 8px;color:var(--cp-subtle);font-size:10px}.cp-root .cp-partners{display:flex;flex-wrap:wrap;gap:6px;padding:0 11px 10px}.cp-root .cp-partners[hidden]{display:none}.cp-root .cp-partner{display:inline-flex;align-items:center;gap:6px;padding:4px 7px 4px 5px;border:1px solid var(--cp-line);border-radius:8px;background:var(--cp-surface);color:var(--cp-ink);font-size:10px}.cp-root .cp-partner:hover{border-color:var(--cp-accent)}.cp-root .cp-partner[hidden]{display:none}.cp-root .cp-partner-dot{width:13px;height:13px;border:1px solid #00000014;border-radius:4px}.cp-root .cp-partner-ratio{color:var(--cp-subtle);font-variant-numeric:tabular-nums}.cp-root[data-theme=dark] .cp-badge[data-level=AAA],.cp-root[data-theme=dark] .cp-badge[data-level=AA]{background:#14351f;color:#86efac}.cp-root[data-theme=dark] .cp-badge[data-level=fail]{background:#3f1d1d;color:#fca5a5}.cp-root[data-theme=dark] .cp-badge-large{background:#3a2c12;color:#fcd34d}.cp-root .cp-status{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0}.cp-root .cp-footer{border-top:1px solid var(--cp-line);display:flex;align-items:center;justify-content:flex-end;padding:9px 14px 11px;margin-top:auto}.cp-root .cp-header-actions{display:flex;align-items:center;gap:6px}.cp-root .cp-reset-btn{width:28px;height:28px;border:0;border-radius:8px;background:transparent;color:var(--cp-subtle);font-size:17px;line-height:1;display:grid;place-items:center;padding:0}.cp-root .cp-reset-btn:hover{background:var(--cp-hover);color:var(--cp-ink)}.cp-root .cp-compact-btn,.cp-root .cp-maximize-btn{width:28px;height:28px;border:0;border-radius:8px;background:transparent;color:var(--cp-subtle);display:grid;place-items:center;padding:0}.cp-root .cp-compact-btn:hover,.cp-root .cp-maximize-btn:hover{background:var(--cp-hover);color:var(--cp-ink)}.cp-root .cp-compact-btn svg,.cp-root .cp-maximize-btn svg{width:15px;height:15px;display:block}.cp-root .cp-compact-btn[aria-pressed=true]{background:var(--cp-hover);color:var(--cp-accent)}.cp-root .cp-picker.cp-is-compact :is(.cp-divider,.cp-presets,.cp-suggestions-band){display:none}.cp-root .cp-maximize-btn .cp-icon-collapse,.cp-root .cp-picker.cp-is-maximized .cp-maximize-btn .cp-icon-expand{display:none}.cp-root .cp-picker.cp-is-maximized .cp-maximize-btn .cp-icon-collapse{display:block}.cp-root .cp-resize-grip{position:absolute;right:0;bottom:0;width:18px;height:18px;z-index:3;cursor:nwse-resize;touch-action:none;border-bottom-right-radius:var(--cp-radius)}.cp-root .cp-resize-grip:after{content:\"\";position:absolute;right:3px;bottom:3px;width:11px;height:11px;background-image:repeating-linear-gradient(135deg,var(--cp-pill-ink) 0 1px,transparent 1px 3.5px);clip-path:polygon(100% 0,100% 100%,0 100%);opacity:.8}.cp-root .cp-resize-grip:hover{background:var(--cp-hover)}.cp-root .cp-resize-grip:hover:after{opacity:1;background-image:repeating-linear-gradient(135deg,var(--cp-ink) 0 1px,transparent 1px 3.5px)}.cp-root .cp-picker.cp-is-resizing{user-select:none}.cp-root .cp-actions{display:flex;gap:7px}.cp-root .cp-secondary-btn{background:var(--cp-surface);border:1px solid var(--cp-btn-line);color:var(--cp-btn-ink);border-radius:9px;padding:8px 15px;font-weight:600}.cp-root .cp-primary-btn{border:0;border-radius:9px;padding:8px 17px;background:var(--cp-accent-strong);color:#fff;font-weight:650;box-shadow:0 4px 12px #2563eb25}.cp-root :focus-visible{outline:2px solid var(--cp-accent);outline-offset:2px}.cp-root .cp-close-btn:focus-visible,.cp-root .cp-reset-btn:focus-visible,.cp-root .cp-compact-btn:focus-visible,.cp-root .cp-maximize-btn:focus-visible,.cp-root .cp-secondary-btn:focus-visible,.cp-root .cp-primary-btn:focus-visible,.cp-root .cp-tab:focus-visible{outline-offset:3px}@media(prefers-reduced-motion:reduce){.cp-root *,.cp-root *:before,.cp-root *:after{transition:none!important;animation:none!important}}@media(max-width:680px){.cp-root{padding:0;align-items:end}.cp-root .cp-picker{width:100%!important;height:auto!important;max-height:92vh;border-width:1px 0 0;border-radius:20px 20px 0 0;transform:none!important}.cp-root .cp-maximize-btn,.cp-root .cp-resize-grip{display:none}.cp-root .cp-picker-header{padding:13px 14px 11px}.cp-root .cp-tabs{margin:0 14px;grid-template-columns:repeat(auto-fit,minmax(120px,1fr))}.cp-root .cp-tab{padding:8px;gap:8px}.cp-root .cp-tab-symbol{width:26px;height:26px;flex:0 0 26px}.cp-root .cp-tab strong{font-size:12px}.cp-root .cp-tab small{font-size:10px}.cp-root .cp-editor{grid-template-columns:1fr;padding:12px 14px;gap:12px}.cp-root .cp-sv-wrap{min-height:150px}.cp-root .cp-editor-side{display:grid;grid-template-columns:1fr 1fr;align-items:center}.cp-root .cp-hex-row{grid-column:1 / -1}.cp-root .cp-divider{margin:0 14px}.cp-root .cp-presets{grid-template-columns:1fr;gap:14px;padding:12px 14px}.cp-root .cp-preset-section+.cp-preset-section{border-left:0;border-top:1px solid var(--cp-line);padding-left:0;padding-top:14px}.cp-root .cp-swatches{grid-template-columns:repeat(7,minmax(0,1fr));gap:6px}.cp-root .cp-suggestions-band{padding:0 14px}.cp-root .cp-footer{position:sticky;bottom:0;z-index:2;padding:11px 14px calc(14px + env(safe-area-inset-bottom,0px));background:var(--cp-surface)}}.cp-root.cp-popover{background:transparent;padding:0;display:block;pointer-events:none}.cp-root.cp-popover .cp-picker{position:fixed;left:0;top:0;width:min(calc(100vw - 16px),620px);max-height:calc(100vh - 16px);pointer-events:auto}.cp-root.cp-popover .cp-footer,.cp-root.cp-popover.cp-hidden{display:none}@media(max-width:680px){.cp-root.cp-popover .cp-picker{inset:auto 0 0;width:100%;max-height:78vh}}.cp-root.cp-inline{position:static;inset:auto;z-index:auto;display:block;padding:0;background:transparent}.cp-root.cp-inline .cp-picker{width:100%;max-height:none;border-radius:0;border-width:0 0 1px;box-shadow:none}.cp-root.cp-inline .cp-close-btn,.cp-root.cp-inline .cp-maximize-btn,.cp-root.cp-inline .cp-resize-grip,.cp-root.cp-inline .cp-footer{display:none}.cp-triggers{--cpt-surface: #ffffff;--cpt-ink: #344054;--cpt-muted: #667085;--cpt-line: #dce2eb;--cpt-accent: #2563eb;--cpt-accent-soft: #eff6ff;display:inline-flex;flex-wrap:wrap;gap:8px;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;line-height:1.3}.cp-triggers[data-theme=dark]{--cpt-surface: #151d2c;--cpt-ink: #e8eefb;--cpt-muted: #9aa8bd;--cpt-line: #33415a;--cpt-accent: #60a5fa;--cpt-accent-soft: #1c2740}.cp-triggers .cp-trigger{display:grid;grid-template-columns:auto 1fr;grid-template-rows:auto auto;align-items:center;column-gap:8px;padding:5px 12px 5px 5px;border:1px solid var(--cpt-line);border-radius:11px;background:var(--cpt-surface);color:var(--cpt-ink);font:inherit;font-size:12px;text-align:left;cursor:pointer}.cp-triggers .cp-trigger:hover{border-color:var(--cpt-accent)}.cp-triggers .cp-trigger[aria-expanded=true]{border-color:var(--cpt-accent);box-shadow:0 0 0 3px var(--cpt-accent-soft)}.cp-triggers .cp-trigger:focus-visible{outline:2px solid var(--cpt-accent);outline-offset:2px}.cp-triggers .cp-trigger-chip{grid-row:1 / span 2;width:26px;height:26px;border-radius:8px;box-shadow:inset 0 0 0 1px #0000001f;background-image:linear-gradient(var(--cpt-fill, transparent),var(--cpt-fill, transparent)),linear-gradient(45deg,#00000014 25%,transparent 25%,transparent 75%,#00000014 75%);background-size:auto,8px 8px}.cp-triggers .cp-trigger-name{font-weight:600;white-space:nowrap}.cp-triggers .cp-trigger-hex{color:var(--cpt-muted);font-size:10px;font-variant-numeric:tabular-nums;white-space:nowrap}\n";
/* ================= shadow-DOM stylesheet =================
   Everything the inspector draws lives inside one shadow root, so host CSS
   cannot restyle the panel and this sheet cannot leak into the host. */

const UII_PANEL_W = 500; // the .panel width; tree.js widens the panel from it

const UII_CSS = `
:host { all: initial; }
* { box-sizing: border-box; }
.layer { position: fixed; inset: 0; pointer-events: none; z-index: 2147483000; }
.box { position: fixed; pointer-events: none; border: 1px solid; border-radius: 2px; }
.box.button { border-color: #3b82f6; background: rgba(59,130,246,.06); }
.box.field  { border-color: #16a34a; background: rgba(22,163,74,.06); }
.box.link   { border-color: #9333ea; background: rgba(147,51,234,.06); }
.box.block  { border-color: rgba(249,115,22,.7); border-style: dashed; }  /* containers: no fill, they stack */
.hover { position: fixed; pointer-events: none; z-index: 2147483001; border: 2px dashed #ef4444;
  background: rgba(239,68,68,.08); border-radius: 2px; display: none; }
.hover.on { display: block; }
.pickbox { position: fixed; pointer-events: none; z-index: 2147483001; border: 2px solid #0ea5e9;
  background: rgba(14,165,233,.10); border-radius: 2px; }
.pickbox::before { content: attr(data-n); position: absolute; z-index: 2147483002; top: -2px; left: -2px; padding: 0 3px;
  background: #0ea5e9; color: #fff; border-radius: 2px 0 4px 0;
  font: 700 9px/11px -apple-system, "Segoe UI", system-ui, sans-serif; }
.tip { position: fixed; pointer-events: none; z-index: 2147483002; display: none; max-width: 360px;
  padding: 3px 8px; border-radius: 4px; background: #111827; color: #f9fafb;
  font: 12px/1.4 -apple-system, "Segoe UI", system-ui, sans-serif; white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis; }
.tip.on { display: block; }
.tip b { color: #fbbf24; font-weight: 600; }
.tip i { display: block; color: #93c5fd; font-style: normal; } /* snap hint: second line */
/* Padding (green, inside the border box) and margin (orange, outside it) of
   the pinned element, each drawn as a border so the hole is the inner box. */
.sp { position: fixed; pointer-events: none; z-index: 2147483001; display: none; border-style: solid; }
.sp.on { display: block; }
.sp.mg { border-color: rgba(246,178,107,.55); }
.sp.pd { border-color: rgba(147,196,125,.6); }
.spv { position: fixed; z-index: 2147483002; display: none; padding: 2px 6px; border-radius: 4px;
  background: #111827; color: #9ca3af; font: 11px/1.3 ui-monospace, Menlo, monospace; white-space: nowrap; }
.spv.on { display: block; }
.spv b { color: #93c47d; font-weight: 600; }
.spv i { color: #f6b26b; font-style: normal; }

.badge { position: fixed; z-index: 2147483002; top: 8px; left: 50%; transform: translateX(-50%);
  padding: 4px 12px; border-radius: 999px; background: #111827; color: #f9fafb;
  font: 12px/1.4 -apple-system, "Segoe UI", system-ui, sans-serif; pointer-events: none;
  transition: opacity .4s ease; }
.badge.off { opacity: 0; }
.ptrtoast { position: fixed; z-index: 2147483003; padding: 3px 10px; border-radius: 999px;
  background: #111827; color: #f9fafb; white-space: nowrap; pointer-events: none;
  font: 12px/1.4 -apple-system, "Segoe UI", system-ui, sans-serif; transition: opacity .3s ease; }
.ptrtoast.off { opacity: 0; }
.badge kbd { background: #374151; padding: 0 4px; border-radius: 3px; font: inherit; }
/* Normal view (V): the panel stays, everything the inspector draws goes, so
   an edit is judged against the real screen. !important, because the pieces
   are shown by a second class (.hover.on) of equal weight. */
:host(.peek) .layer, :host(.peek) .hover, :host(.peek) .tip,
:host(.peek) .sp, :host(.peek) .spv, :host(.peek) .pickbox, :host(.peek) .badge { display: none !important; }
.head button.on { background: #1f2937; border-color: #1f2937; color: #fff; }

.panel { position: fixed; z-index: 2147483003; top: 8px; right: 16px; width: ${UII_PANEL_W}px; max-height: calc(100vh - 16px);
  display: none; flex-direction: column; pointer-events: auto;
  background: #ffffff; color: #111827; border: 1px solid #d1d5db; border-radius: 8px;
  box-shadow: 0 12px 32px rgba(0,0,0,.25);
  font: 12px/1.45 -apple-system, "Segoe UI", system-ui, sans-serif; }
.panel.on { display: flex; }
/* Alt held: the panel fades, each key's tooltip stays sharp on top. */
.panel.hints > :not(.hk) { opacity: .3; transition: opacity .12s; }
.hk { position: absolute; z-index: 2; pointer-events: none; white-space: nowrap;
  background: #111827; color: #f9fafb; padding: 3px 7px; border-radius: 4px; font-size: 11px;
  box-shadow: 0 2px 8px rgba(0,0,0,.3); }
.hk b { color: #fbbf24; font-family: ui-monospace, Menlo, monospace; }
.panel.min .split { display: none; }
.panel.min .head { border-bottom: 0; border-radius: 8px; }
.head { display: flex; align-items: center; gap: 6px; padding: 6px 8px 6px 10px; cursor: move;
  background: #f3f4f6; border-bottom: 1px solid #e5e7eb; border-radius: 8px 8px 0 0; user-select: none; }
.head .name { flex: 1; min-width: 0; font-weight: 700; font-size: 13px; overflow: hidden;
  text-overflow: ellipsis; white-space: nowrap; }
.head .tag { color: #6b7280; font-family: ui-monospace, Menlo, monospace; }
/* Square icon buttons: one glyph each, so a fixed box reads as a row of
   equal keys — no word breaks the rhythm. */
.head button { width: 32px; height: 32px; flex: none; display: grid; place-items: center;
  font: inherit; padding: 0; border: 1px solid #d1d5db;
  border-radius: 4px; background: #fff; color: #111827; cursor: pointer; }
.head button:hover { background: #e5e7eb; }
/* Nothing to undo, nothing to reset: the key stays where it is and goes
   quiet, so the row never shifts under the pointer mid-edit. */
.head button:disabled { opacity: .3; cursor: default; }
.head button:disabled:hover { background: #fff; }
/* Three groups, left to right: what you did to the element, what you are
   looking at, and the window itself. */
.head .sep { width: 1px; height: 16px; flex: none; background: #d1d5db; margin: 0 1px; }
/* The body and the tree share the row below the header; each scrolls on its
   own, so a deep tree never pushes the style fields out of reach. */
.split { display: flex; min-height: 0; flex: 1; }
.body { flex: 1; min-width: 0; overflow: auto; padding: 0 0 6px; }
.tree { width: 260px; flex: none; overflow: auto; padding: 4px 0 6px;
  border-right: 1px solid #e5e7eb; background: #fafafa;
  font: 11px/1.5 ui-monospace, Menlo, monospace; }
.tree[hidden] { display: none; }
.tree .tr { display: flex; align-items: center; gap: 2px; white-space: nowrap;
  cursor: pointer; border-radius: 3px; }
.tree .tr:hover { background: #e5e7eb; }
.tree .tr.on { background: #1f2937; color: #fff; }
.tree .tr.on .tg, .tree .tr.on .tw { color: #d1d5db; }
/* A fixed box whether or not the node has children, so the names line up. */
.tree .tw { width: 11px; flex: none; color: #6b7280; text-align: center; }
/* A control reads as the panel would name it; a plain wrapper as its tag. */
.tree .nm { font-weight: 700; overflow: hidden; text-overflow: ellipsis; }
.tree .tg { color: #6b7280; overflow: hidden; text-overflow: ellipsis; }
/* The reset key in front of each row: a fixed 12px whether or not the element
   has edits, so a name never moves. An element WITH edits wears it at full
   strength — the row where you would reach for it — and one with nothing to
   reset keeps the glyph as a placeholder at a third. Inherits the row's ink,
   so the pinned (dark) row needs no color of its own. */
.tree .rs { width: 16px; height: 17px; flex: none; padding: 0; border: 0; border-radius: 3px;
  background: none; color: inherit; opacity: .85; cursor: pointer;
  font: 11px/1 ui-monospace, Menlo, monospace; }
.tree .tr:hover .rs { opacity: .85; }
.tree .rs:hover:not(:disabled) { opacity: 1; background: rgba(0, 0, 0, .09); }
.tree .tr.on .rs:hover:not(:disabled) { background: rgba(255, 255, 255, .2); }
/* Even with nothing to reset the glyph stays visible at a third: a key you
   only see after you have already edited something is a key nobody finds. */
.tree .rs:disabled { opacity: .38; cursor: default; }
.tree .more { color: #9ca3af; cursor: default; }
.tree .more:hover { background: none; }
.body > .sec:first-child { margin-top: 0; }
/* Resize handles: four edges, four corners on top of them, just outside the border. */
.grip { position: absolute; z-index: 1; }
.grip.n, .grip.s { left: 8px; right: 8px; height: 7px; cursor: ns-resize; }
.grip.e, .grip.w { top: 8px; bottom: 8px; width: 7px; cursor: ew-resize; }
.grip.n { top: -4px; } .grip.s { bottom: -4px; } .grip.e { right: -4px; } .grip.w { left: -4px; }
.grip.ne, .grip.nw, .grip.se, .grip.sw { width: 14px; height: 14px; z-index: 2; }
.grip.nw { top: -5px; left: -5px; cursor: nwse-resize; } .grip.se { bottom: -5px; right: -5px; cursor: nwse-resize; }
.grip.ne { top: -5px; right: -5px; cursor: nesw-resize; } .grip.sw { bottom: -5px; left: -5px; cursor: nesw-resize; }
/* Minimised: only the header shows, so only its width can change. */
.panel.min { height: auto !important; }
.panel.min .grip:not(.e):not(.w) { display: none; }
.sec { display: flex; align-items: center; min-height: 30px; margin: 6px 0 2px; padding: 3px 10px; background: #e5e7eb; color: #1f2937; font-weight: 700;
  text-transform: uppercase; font-size: 11px; letter-spacing: .05em; }
.row { display: grid; grid-template-columns: 56px minmax(0, 1fr); gap: 8px; padding: 2px 10px; }
.row .k { color: #6b7280; }
.row .v { font-family: ui-monospace, Menlo, monospace; word-break: break-all; }
.row .txt { width: 100%; min-height: 20px; padding: 2px 5px; resize: vertical;
  font: 12px/1.45 ui-monospace, Menlo, monospace; color: #111827; background: #fff;
  border: 1px solid #d1d5db; border-radius: 4px; }
.row .txt:focus { outline: 2px solid #3b82f6; outline-offset: -1px; }
.card { margin: 8px 10px; padding: 8px 10px 10px; border: 1px solid #d1d5db; border-radius: 8px; background: #eef0f3;
  display: flex; flex-direction: column; gap: 8px; }
.card .ct { font-weight: 700; font-size: 12px; }
.g2 { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 8px; }
.g4 { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
.g4 .lab { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fld { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
/* The label's line, with the field's ↺ leading it. The label keeps flex:1 so
   the ellipsis rules for the narrow grids still have a box to cut in. */
.lw { display: flex; align-items: center; gap: 3px; min-width: 0; }
.lw .lab { flex: 1; min-width: 0; }
/* Visible before it is useful: at a fifth the glyph is there and nobody sees
   it, which is the whole reason it exists. Edited rows wear it darker. */
.fld .rs, .vr .rs { flex: none; width: 16px; height: 16px; padding: 0; border: 0; border-radius: 3px;
  background: none; color: #6b7280; opacity: .38; cursor: pointer;
  font: 11px/1 ui-monospace, Menlo, monospace; }
.fld .rs:hover:not(:disabled), .vr .rs:hover:not(:disabled) { opacity: 1; background: rgba(0, 0, 0, .08); }
.fld .rs:disabled, .vr .rs:disabled { opacity: .38; cursor: default; }
.fld .rs:not(:disabled), .vr .rs:not(:disabled) { opacity: .9; color: #0f766e; }
.fld .lab { color: #374151; font-size: 11px; user-select: none; }
.fld .fml { font: 10px/1.4 ui-monospace, Consolas, monospace; color: #6b7280; word-break: break-all; user-select: text; }
.fld .lab.ovr { color: #d97706; font-weight: 700; }
.nf .os { color: #6b7280; font-size: 11px; }
.fld .fml.lost { text-decoration: line-through; opacity: .75; }
.fld .lab.scrub { cursor: ew-resize; }
.nf, .tf, .seg { height: 28px; border: 1px solid #d1d5db; border-radius: 6px; background: #fff; }
.nf { display: flex; align-items: center; gap: 4px; padding: 0 6px; min-width: 0; }
.nf:focus-within, .tf:focus { outline: 2px solid #3b82f6; outline-offset: -1px; }
.nf input, .tf { flex: 1; min-width: 0; font: 12px ui-monospace, Menlo, monospace; color: #111827; }
.nf.idle input, .nf.idle .pick { opacity: .5; }
.nf input { border: 0; background: none; outline: none; padding: 0; }
.tf { flex: none; padding: 0 6px; }
.nf select.u { appearance: none; color: #9ca3af; font-size: 10px; text-transform: uppercase; max-width: 45%; text-overflow: ellipsis; padding: 0 2px; }
.nf select.u:hover { color: #111827; }
.st { display: flex; flex-direction: column; margin-right: -4px; }
.st button { width: 18px; height: 12px; padding: 0; border: 0; border-radius: 2px; background: none;
  color: #9ca3af; font-size: 8px; line-height: 12px; cursor: pointer; }
.st button:hover { color: #111827; background: #e5e7eb; }
.nf button.cv { border: 0; background: none; color: #0f766e; font: inherit; font-size: 10px; max-width: 46%;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding: 0 2px; cursor: pointer; }
`;

/* ================= shadow-DOM stylesheet, part 2 ================= */

const UII_CSS2 = `
.nf button.cv::after { content: ' ▾'; color: #9ca3af; }
/* Border style: the same button and list, a stroke of the style in each row. */
.nf button.cv.pl { flex: 1; max-width: none; height: 100%; color: #374151; font: 12px ui-monospace, Menlo, monospace;
  text-align: left; padding: 0 6px; }
.nf button.cv.pl::after { float: right; }
.cvl i.ln { width: 28px; height: 0; border: 0 solid #374151; border-top-width: 4px; border-radius: 0; background: none; }
.cvl button.on i.ln { border-color: #0f766e; }
.cvl { position: fixed; z-index: 2147483004; min-width: 180px; max-width: 320px; max-height: 240px; overflow: auto;
  background: #fff; border: 1px solid #d1d5db; border-radius: 6px; box-shadow: 0 6px 20px rgba(0,0,0,.15); padding: 3px;
  pointer-events: auto; font: 12px/1.45 -apple-system, "Segoe UI", system-ui, sans-serif; } /* outside .panel: own font */
.cvl button { display: flex; align-items: center; gap: 6px; width: 100%; border: 0; background: none; padding: 3px 6px;
  border-radius: 4px; cursor: pointer; color: #374151; font: inherit; font-size: 11px; text-align: left; }
.cvl button:hover { background: #f3f4f6; }
/* The value in force, told apart from whatever the pointer happens to be over:
   the teal the .cv button already uses for a variable, and a bar down the side
   that costs no layout (a ::before would push the row's flex items along). */
.cvl button.on { background: #ecfdf5; color: #0f766e; font-weight: 600; box-shadow: inset 2px 0 0 #0f766e; }
.cvl button.on:hover { background: #d1fae5; }
.cvl .n { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cvl i { width: 14px; height: 14px; border-radius: 3px; border: 1px solid rgba(0,0,0,.15); flex: none; }
.cvl .h { color: #9ca3af; font-family: ui-monospace, Menlo, monospace; font-size: 10px; }
.nf select { font-size: 11px; border: 0; background: none; color: #374151; cursor: pointer; max-width: 55%; }
/* The open list is the browser's, not ours: Chrome on Windows and Linux and
   Firefox paint the options with this, macOS draws its own menu and marks the
   current value with a checkmark instead. */
.nf select option { background: #fff; color: #374151; font-weight: 400; text-transform: none; }
.nf select option:checked { background: #ecfdf5; color: #0f766e; font-weight: 600; }
.seg { display: flex; overflow: hidden; }
.seg button { flex: 1; border: 0; background: none; color: #4b5563; cursor: pointer; display: grid; place-items: center; }
.seg button + button { border-left: 1px solid #e5e7eb; }
.seg button.on { background: #111827; color: #fff; }
.nf button.pick { width: 22px; height: 22px; padding: 0; border: 1px solid #d1d5db; border-radius: 4px; cursor: pointer; flex: none; background: #000; }
.sec .sim { margin-left: auto; font-size: 11px; font-weight: 400; text-transform: none; letter-spacing: 0; cursor: pointer; }
.sec .sim input { margin: 0 2px 0 0; vertical-align: -2px; }
.sec input.find { margin-left: auto; width: 120px; height: 20px; padding: 0 6px; border: 1px solid #9ca3af; border-radius: 4px;
  background: #fff; color: #111827; font: 11px/1 inherit; font-weight: 400; text-transform: none; letter-spacing: 0; outline: none; }
/* The palette (editvars.js): one row per custom property the page declares. */
.vrs { display: flex; flex-direction: column; gap: 2px; padding: 4px 10px 8px; }
.vr { display: flex; align-items: center; gap: 8px; padding: 2px 4px; border-radius: 5px; }
.sec .find + .mini, .sec .mini + .mini, .sec .sim + .mini { margin-left: 6px; } /* one auto margin: the pair sits right together */
.vr[hidden] { display: none; } /* display:flex above beats the hidden attribute */
.vr .n { flex: 0 0 42%; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  color: #0f766e; font-family: ui-monospace, Menlo, monospace; font-size: 11px; }
.vr .nf { flex: 1; min-width: 0; height: 24px; }
.vr.on { background: #ecfdf5; box-shadow: inset 2px 0 0 #0f766e; }
.vnone { padding: 8px 10px; color: #6b7280; }
.vgrp { padding: 6px 4px 0; color: #6b7280; font: 600 10px/1.2 ui-monospace, Menlo, monospace; }
/* The pinned element's own declarations (editprops.js), folded away when the
   list is long. summary.sec keeps the section bar's look; the marker is the
   only part a <details> adds. */
.more > summary { cursor: pointer; }
.more > summary::marker { color: #6b7280; }
.vr.add { margin-top: 4px; padding-top: 6px; border-top: 1px dashed #d1d5db; border-radius: 0; }
.vr input.n { height: 24px; padding: 0 6px; border: 1px solid #d1d5db; border-radius: 5px;
  background: #fff; outline: none; }
.vr input.n:focus { outline: 2px solid #3b82f6; outline-offset: -1px; }
.vr .go { flex: none; width: 24px; height: 24px; padding: 0; border: 1px solid #d1d5db; border-radius: 4px;
  background: #fff; color: #374151; font: 13px/1 inherit; cursor: pointer; }
.vr .go:hover { background: #e5e7eb; }
.sec .mini { margin-left: auto; font-weight: 400; text-transform: none; letter-spacing: 0; padding: 6px 12px; font-size: 12px;
  border: 1px solid #9ca3af; border-radius: 4px; background: #fff; cursor: pointer; }
.chg { display: block; width: calc(100% - 20px); margin: 4px 10px 8px; padding: 6px; resize: vertical;
  font: 11px/1.45 ui-monospace, Menlo, monospace; color: #111827; background: #fff;
  border: 1px solid #d1d5db; border-radius: 6px; }
.sw { display: inline-block; width: 12px; height: 12px; vertical-align: -2px; margin-right: 5px;
  border: 1px solid rgba(0,0,0,.25); border-radius: 2px;
  background-image: linear-gradient(45deg,#ccc 25%,transparent 25%,transparent 75%,#ccc 75%),
    linear-gradient(45deg,#ccc 25%,transparent 25%,transparent 75%,#ccc 75%);
  background-size: 6px 6px; background-position: 0 0, 3px 3px; }
.nf button.pick.hollow { background-color: #fff;
  background-image: linear-gradient(45deg,#ccc 25%,transparent 25%,transparent 75%,#ccc 75%),
    linear-gradient(45deg,#ccc 25%,transparent 25%,transparent 75%,#ccc 75%);
  background-size: 8px 8px; background-position: 0 0, 4px 4px; }
.sw i { display: block; width: 100%; height: 100%; }
.head .undo { color: #1d4ed8; font-size: 15px; }
.head .reset { color: #b91c1c; font-size: 15px; }
.head .ok { color: #16a34a; white-space: nowrap; }
`;

/* ================= Bounce: a press that springs back =================
   Standalone click effect, no dependencies, nothing inspector-specific. Press
   a control and it dips; let go and it overshoots a little before settling —
   the feel of a key that moves. Built on the Web Animations API: the animation
   owns `transform` only while it runs and leaves no inline style behind, so it
   cannot fight the element's own CSS. Does nothing under prefers-reduced-motion
   or where there is no DOM (server-side rendering).

   Bounce.attach(root, selector, opts) -> detach()
     One delegated listener pair on root (document, an element or a shadow
     root). Every matching, enabled element dips on pointerdown and springs on
     release. A keyboard click (Enter / Space) plays the whole press at once. Release is
     heard on the window, so a re-rendered or left-behind control still springs.
     Two attaches matching one event bounce it once (the first attached wins).
     aria-disabled="true" counts as disabled. detach() ends any press in flight.
   Bounce.play(el, opts)
     One full dip-and-spring on el, for changes no pointer caused (e.g. an
     element was just selected).
   opts: scale (dip depth, .92), over (overshoot, .06), press (dip ms, 70),
     release (spring ms, 360), to (attach only: (matched) => element to animate,
     e.g. press a label, bounce the tiny checkbox inside it), eager (false: play
     dip and spring from the press at once instead of holding the dip until
     release; for controls whose click handler does heavy synchronous work, which
     would otherwise delay a spring that only starts at release).

   Use as <script src="bounce.js"> (global `Bounce`), require('./bounce'), or
   inlined by build.js (everything above the marker below). */

const Bounce = (() => {
  const DEFAULTS = { scale: 0.92, over: 0.06, press: 70, release: 360 };
  const running = new WeakMap(); // el -> drop() of the press now animating it
  const seen = new WeakSet();    // events already bounced, so two attaches never double up

  const calm = () => typeof window === 'undefined' || !Element.prototype.animate
    || !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // Dip to `scale` and hold there until up() springs back. drop() abandons the
  // press (cancels the animations and the pending spring). A newer press on the
  // same element drops the older one, so two never fight over `transform`.
  function down(el, o) {
    const prev = running.get(el);
    if (prev) prev();
    const s = o.scale, t0 = performance.now();
    const hold = el.animate([{ transform: 'scale(1)' }, { transform: `scale(${s})` }],
      { duration: o.press, easing: 'ease-out', fill: 'forwards' });
    let spring, released = false;
    const drop = () => {
      hold.cancel(); if (spring) spring.cancel();
      if (running.get(el) === drop) running.delete(el);
    };
    running.set(el, drop);
    const springAt = (delay) => el.animate([
      { transform: `scale(${s})` },
      { transform: `scale(${1 + o.over})`, offset: 0.45 },
      { transform: `scale(${1 - o.over / 3})`, offset: 0.75 },
      { transform: 'scale(1)' },
    ], { delay, duration: o.release, easing: 'ease-out', fill: 'forwards' });
    if (o.eager) {
      // Dip and the same spring, both started now, the spring delayed by the dip.
      // Created at release the spring could not start before the frame after the
      // click handler, and a handler that re-renders synchronously holds that
      // frame back: the spring then looks late. Started here it is already
      // running when the handler blocks, and it is the very curve a held press
      // gets, so the motion is no less smooth.
      spring = springAt(o.press);
      spring.onfinish = () => { hold.cancel(); spring.cancel(); if (running.get(el) === drop) running.delete(el); };
      return { up() {}, drop };
    }
    const up = () => {
      if (released) return;
      released = true;
      // A tap shorter than the dip would snap: let the dip finish, then spring.
      // The wait is the animation's own delay, not a timer: a click handler that
      // blocks the main thread right after release must not hold the spring back.
      spring = springAt(Math.max(0, o.press - (performance.now() - t0)));
      // Both fills hold scale(1) or the dip until here, so neither flashes if this runs late.
      spring.onfinish = () => { hold.cancel(); spring.cancel(); if (running.get(el) === drop) running.delete(el); };
    };
    return { up, drop };
  }

  function play(el, opts) {
    if (!el || calm()) return;
    down(el, Object.assign({}, DEFAULTS, opts)).up();
  }

  function attach(root, selector, opts) {
    const o = Object.assign({}, DEFAULTS, opts);
    const live = new Set(); // presses still held, so detach() can end them
    const hit = (e) => {
      const el = e.target.closest && e.target.closest(selector);
      return el && !el.disabled && el.getAttribute('aria-disabled') !== 'true' && root.contains(el) ? el : null;
    };
    const onDown = (e) => {
      const el = e.isPrimary && e.button === 0 && !seen.has(e) && !calm() && hit(e);
      if (!el) return;
      const t = o.to ? o.to(el) : el;
      if (!t) return;
      seen.add(e);
      const p = down(t, o);
      // Release is heard on the window, not on el: el may be re-rendered away
      // mid-press, and a pointer let go outside it must still end the press.
      const end = (ev) => { if (ev.pointerId === e.pointerId) { p.off(); p.up(); } };
      p.off = () => {
        window.removeEventListener('pointerup', end, true);
        window.removeEventListener('pointercancel', end, true);
        el.removeEventListener('pointerleave', end);
        live.delete(p);
      };
      window.addEventListener('pointerup', end, true);
      window.addEventListener('pointercancel', end, true);
      el.addEventListener('pointerleave', end);
      live.add(p);
    };
    // detail 0 = no pointer behind the click: Enter / Space on a focused control.
    // isTrusted drops a script's el.click(), which is not a press.
    const onClick = (e) => {
      const el = e.isTrusted && e.detail === 0 && !seen.has(e) && hit(e);
      const t = el && (o.to ? o.to(el) : el);
      if (t) { seen.add(e); play(t, o); }
    };
    root.addEventListener('pointerdown', onDown);
    root.addEventListener('click', onClick);
    return () => {
      root.removeEventListener('pointerdown', onDown);
      root.removeEventListener('click', onClick);
      for (const p of live) { p.off(); p.drop(); }
    };
  }

  return { attach, play };
})();


/* ================= value formatting =================
   Color normalisation and the "Copy for AI" text block. */

// "rgb(31, 41, 55)" / "rgba(31,41,55,0.5)" -> "#1f2937" / "#1f293780".
// Anything else (gradients, "transparent") is returned untouched.
function uiiToHex(v) {
  // Chrome writes some computed colors as color(srgb 0.94 0.95 0.96 / 0.55): channels 0..1.
  const c = /^color\(\s*srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)$/.exec(String(v || '').trim());
  if (c) v = 'rgba(' + [c[1], c[2], c[3]].map((n) => Math.round(n * 255)).join(',') + (c[4] !== undefined ? ',' + c[4] : '') + ')';
  const m = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+%?))?\s*\)$/.exec(String(v || '').trim());
  if (!m) return v;
  const h = (n) => Math.round(Number(n)).toString(16).padStart(2, '0');
  let out = '#' + h(m[1]) + h(m[2]) + h(m[3]);
  if (m[4] !== undefined) {
    let a = m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    if (a === 0) return 'transparent';
    if (a < 1) out += h(a * 255);
  }
  return out;
}

function uiiIsTransparent(v) {
  return !v || v === 'transparent' || /^(?:rgba?|color)\([^)]*[,/]\s*0\s*\)$/.test(v);
}

// "Inter, -apple-system, system-ui" -> "Inter (+2 fallbacks)"
function uiiFirstFont(v) {
  const parts = String(v || '').split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
  if (!parts.length) return '';
  return parts.length > 1 ? parts[0] + ' (+' + (parts.length - 1) + ' fallbacks)' : parts[0];
}

// Collapse whitespace and cap length for names built from text content.
function uiiShort(s, n) {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n - 1) + '…' : t;
}

// One color line: "#ffffff (--surface)" or "#ffffff (inherited from #toolbar)".
function uiiColorLine(c) {
  if (!c) return '';
  let s = c.hex;
  const notes = [];
  if (c.vars && c.vars.length) notes.push(c.vars.join(', '));
  if (c.from) notes.push('inherited from ' + c.from);
  return notes.length ? s + ' (' + notes.join('; ') + ')' : s;
}

// One line for an AI chat: the control's name and where to edit it — the
// stamped source location when the app set one, then the selector, the
// script(s) that mention it, the stylesheet(s) that style it.
//   [#edit-btn (edit.js:12 · edit.js · style.css)]
// An element with no id, name attribute or aria-label gets its visible text in
// front — ("Test icon")[...] — since many cells can share one selector.
function uiiFormatForAI(info) {
  // The selector leads: id plus classes. Then the source location, the one part
  // an AI acts on without searching. Brackets make it one paste-ready token.
  const loc = [];
  if (info.src) loc.push(info.src);
  if (info.code && info.code.length) loc.push(info.code.join(', '));
  const css = uiiCssFiles(info);
  if (css.length) loc.push(css.join(', '));
  const edits = uiiEditsText(info.el);
  const attr = uiiState.opts.nameAttr;
  const named = info.id || (attr && info.el.getAttribute(attr)) || info.el.getAttribute('aria-label');
  const words = String(info.el.innerText || info.el.value || '').replace(/"/g, "'").split(/\s+/).filter(Boolean);
  const label = !named && words.length ? '("' + words.slice(0, 10).join(' ') + (words.length > 10 ? '…' : '') + '")' : '';
  return label + '[' + info.path + (loc.length ? ' (' + loc.join(' · ') + ')' : '') +
    (edits ? ' — apply: ' + edits : '') + ']';
}

// Every edit made since the page loaded, on any element, as Map(head ->
// [decl]) — the final value per rule, no history. A detached element counts
// while its rule rewrite stands (Apply to similar): the re-rendered element
// still shows it. Otherwise the edit left the screen with the element.
function uiiChangeLines() {
  const byRule = new Map();
  // Two elements sharing one rule write the same property twice. A rule holds
  // one value per property — the last one written, which is what the page
  // shows — so the later edit replaces the earlier instead of adding a second,
  // contradicting line ("font-size: 1.5em; font-size: 2.25em").
  const put = (head, decl) => {
    if (!byRule.has(head)) byRule.set(head, new Map());
    byRule.get(head).set(decl.slice(0, decl.indexOf(':')), decl);
  };
  // Variable edits first: they move the whole page, not one element.
  for (const [head, decl] of uiiVarLines()) put(head, decl);
  const edits = uiiState.edits || new Map();
  for (const [el, e] of edits) {
    let lines = e.last;
    if (el.isConnected) {
      lines = e.last = uiiEditChanges(el).map((c) => uiiChangeDecl(el, c));
    } else if (!uiiState.similar || !lines) {
      edits.delete(el);
      continue;
    }
    for (const { head, decl } of lines) put(head, decl);
  }
  return new Map([...byRule].map(([head, decls]) => [head, [...decls.values()]]));
}

// How many edits stand — zero means the Changes box has nothing to copy.
// Counted without naming rules, so it works after inspect mode closed (no
// pinned info to cache rule lookups on); two elements sharing a rule
// therefore count twice where the box collapses them to one line.
function uiiEditCount() {
  let n = uiiVarEdits.size;
  for (const [el, e] of uiiState.edits || []) {
    n += el.isConnected ? uiiEditChanges(el).length : uiiState.similar && e.last ? e.last.length : 0;
  }
  return n;
}

// The Changes box, from uiiChangeLines.
//   style.css .grid-task-title { font-size: calc(var(--g) * 1.1) /* 14.3px */; }
//   #grid > … > td.grid-index (grid-helpers.js:132) /* no rule yet */ { background-color: #fe0; }
function uiiFormatChanges() {
  const L = ['Apply these CSS changes (final values) by editing each rule in place.'
    + ' A declaration with no marker replaces the value already in the rule;'
    + ' /* add */ = add the line; /* new rule */ = create the rule.'
    + ' Keep var()/calc() as written.'];
  for (const [head, decls] of uiiChangeLines()) L.push(head + ' { ' + decls.join('; ') + '; }');
  if (L.length === 1) return '(no changes yet)';
  if (!uiiState.similar) L.push('Only these elements: add a more specific selector, leave the shared rules.');
  return L.join('\n');
}

// What the Changes box's Copy button copies, for the A shortcut. The
// textarea is the source when the panel has one: it is editable, and the
// button copies what is in it, not what was last generated.
function uiiCopyChanges() {
  const P = uiiState.panel;
  if (!uiiEditCount()) { uiiFlash('No changes yet'); return; }
  uiiCopy(P && P.changes ? P.changes.value : uiiFormatChanges());
}

// The Changes box at the foot of the panel, in both of its modes. Rebuilt
// with the rest of the body, so typing in it lasts until the next edit or
// selection refills it.
function uiiChangesBox(body) {
  const head = uiiEl('div', 'sec', 'All changes ', 'section-changes');
  const copy = uiiEl('button', 'mini', '📋 Copy for AI', 'copy-for-ai');
  head.appendChild(copy);
  const changes = uiiEl('textarea', 'chg', undefined, 'changes');
  changes.spellcheck = false;
  changes.rows = 7;
  copy.addEventListener('click', () => uiiCopy(changes.value, copy));
  body.append(head, changes);
  uiiState.panel.changes = changes;
  uiiRefreshChanges();
}

// Multi-line block with the computed look, for when the AI must match or
// change colors and type rather than just locate the element.
function uiiFormatDetails(info) {
  const L = [];
  L.push('UI component: ' + info.name);
  L.push('Selector: ' + info.path);
  if (info.src) L.push('Source: ' + info.src);
  L.push('Element: <' + info.tag + (info.id ? ' id="' + info.id + '"' : '')
    + (info.classes.length ? ' class="' + info.classes.join(' ') + '"' : '') + '>');
  if (info.text) L.push('Text: "' + info.text + '"');
  L.push('Size: ' + info.width + '×' + info.height + 'px');
  L.push('Background: ' + uiiColorLine(info.bg));
  L.push('Text color: ' + uiiColorLine(info.color));
  L.push('Font: ' + info.fontFamily + ' ' + info.fontSize + ' / ' + info.lineHeight + ' weight ' + info.fontWeight);
  L.push('Padding: ' + info.padding + ' | Margin: ' + info.margin);
  L.push('Border: ' + info.border + ' | Radius: ' + info.borderRadius);
  const edits = uiiEditsText(info.el);
  if (edits) L.push('Live edits to apply: ' + edits);
  if (info.rules.length) {
    L.push('Matched CSS rules:');
    for (const r of info.rules) L.push('  ' + r.file + ' → ' + r.selector);
  }
  return L.join('\n');
}

/* ================= stylesheet lookups =================
   Two things the computed style cannot tell you: which --custom-property a
   color came from, and which selectors put it there. Both are recovered by
   walking document.styleSheets — cross-origin sheets throw on .cssRules and
   are skipped. Runs only on click, so a few hundred rules is fine. */

// A sheet's name as an AI should read it: the file, not where the page is
// served from. Every same-origin sheet is the app's own, and
// "localhost:8765/style.css" spends thirteen characters saying where the
// reader already is — "style.css" is the string to grep. A cross-origin sheet
// keeps its host and drops everything else: "photoswipe.css" alone would not
// say which CDN served it, and the folders in front of it say nothing.
function uiiSheetName(href) {
  const url = String(href).split('?')[0];
  try {
    const u = new URL(url, document.baseURI);
    const segs = u.pathname.split('/').filter(Boolean);
    if (u.origin !== new URL(document.baseURI).origin) {
      return (u.host ? u.host + '/' : '') + (segs.pop() || u.pathname);
    }
    // Two segments on a same-origin sheet, not one: /renderer/style.css is
    // still the app's own file, and the folder is part of finding it.
    return segs.slice(-2).join('/') || url;
  } catch (e) {
    return url; // an unparsable href is named by what it says
  }
}

// Every CSSStyleRule in every readable sheet, flattened through @media /
// @supports / @layer. Each entry: { rule, file, cond }; cond = it may not
// apply as written (inside @media / @layer / any group, or a sheet with a
// media attribute or disabled), so only a probe can say whether it wins.
function uiiAllRules() {
  const out = [];
  const walk = (rules, file, cond) => {
    for (const r of rules) {
      if (r.style && r.selectorText) out.push({ rule: r, file, cond });
      else if (r.cssRules) walk(r.cssRules, file, true);
    }
  };
  const sheets = document.styleSheets;
  for (let i = 0; i < sheets.length; i++) {
    const sh = sheets[i];
    let rules;
    try { rules = sh.cssRules; } catch (e) { continue; }
    if (!rules) continue;
    // A linked sheet is named by its file; an inline <style> by its id when it
    // has one (usually injected by a script at runtime).
    const node = sh.ownerNode;
    const file = sh.href ? uiiSheetName(sh.href)
      : node && node.id ? '<style id="' + node.id + '"> (injected)' : '<style>#' + i;
    walk(rules, file, sh.disabled || !!(sh.media && sh.media.mediaText));
  }
  return out;
}

// Names of every custom property declared anywhere in the sheets.
function uiiVarNames(all) {
  const names = new Set();
  for (const { rule } of all) {
    const st = rule.style;
    for (let i = 0; i < st.length; i++) if (st[i].startsWith('--')) names.add(st[i]);
  }
  return [...names];
}

// A hidden scratch element inside the shadow root turns "#fff", "navy" or
// "var(--x)" into the same rgb() form getComputedStyle uses everywhere else.
function uiiNormColor(v) {
  const s = uiiState.scratch;
  if (!s) return v;
  s.style.color = '';
  s.style.color = v;
  if (!s.style.color) return null;
  return getComputedStyle(s).color;
}

// [{name, hex}] for every custom property whose value, resolved on this
// element, is a color. Vars set on ancestors or :root all resolve here.
// This is the palette the color fields offer, so it is sorted by name.
function uiiColorVars(el, all) {
  const cs = getComputedStyle(el);
  const out = [];
  for (const name of uiiVarNames(all)) {
    const raw = cs.getPropertyValue(name).trim();
    if (!raw || raw.length > 40) continue; // shadows, font stacks: never a color
    const rgb = uiiNormColor(raw);
    if (!rgb) continue;
    out.push({ name, hex: uiiToHex(rgb) });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

// hex -> [--var, ...], from the same list.
function uiiColorVarMap(vars) {
  const map = new Map();
  for (const { name, hex } of vars) {
    if (!map.has(hex)) map.set(hex, []);
    map.get(hex).push(name);
  }
  return map;
}

// A rule's selector list as its top-level members. `:is(a, b)` / `:where(a, b)`
// / `:not(a, b)` carry commas of their own, so a plain split(',') cuts them into
// halves that are not selectors and never match.
function uiiSplitSelectors(text) {
  const out = [];
  let depth = 0, start = 0, quote = '';
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quote) { if (c === '\\') i++; else if (c === quote) quote = ''; continue; }
    if (c === '"' || c === "'") quote = c;
    else if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth--;
    else if (c === ',' && depth === 0) { out.push(text.slice(start, i)); start = i + 1; }
  }
  out.push(text.slice(start));
  return out;
}

// The rule that gives `name` its value for `el`: the last rule in sheet order
// that declares it and whose selector matches el or an ancestor (`:root` is
// where an app keeps its palette, but a theme block may set it lower down).
// null when no readable sheet declares it — the var came from an inline
// style attribute, and `uiiVarApply` writes it on :root instead.
function uiiVarRule(name, el, all) {
  let hit = null;
  for (const { rule, file } of all) {
    if (!rule.style.getPropertyValue(name)) continue;
    for (const sel of uiiSplitSelectors(rule.selectorText)) {
      const s = sel.trim();
      let up = null;
      try { up = s && el.closest(s); } catch (e) { up = null; }
      if (up) { hit = { file, selector: s, style: rule.style }; break; }
    }
  }
  return hit;
}

// Rules whose selector matches el, in sheet order. Selector lists are split so
// the reported selector is the one that actually matched.
function uiiMatchedRules(el, all) {
  const out = [];
  for (const { rule, file, cond } of all) {
    const parts = uiiSplitSelectors(rule.selectorText);
    for (const sel of parts) {
      const s = sel.trim();
      if (!s) continue;
      let hit = false;
      try { hit = el.matches(s); } catch (e) { hit = false; }
      if (hit) { out.push({ file, selector: s, props: rule.style.length, style: rule.style, cond }); break; }
    }
  }
  return out;
}

/* ================= which source files mention this element =================
   The DOM cannot say which script wired a button, so the page's own
   <script src> files are fetched once (same origin, works over file:// in
   Electron) and searched for the element's id and classes. Vendor bundles are
   skipped by default — a hit there names a library, not the app's code. */

function uiiScriptWanted(url) {
  const f = uiiState.opts.scripts;
  if (typeof f === 'function') return f(url);
  return !/\/(vendor|node_modules|dist)\//.test(url);
}

// Promise of Map url -> source text, started when inspect mode opens
// (uiiEnable) so the first pin does not wait on the fetches, and kept for the
// session. The promise itself is kept, so a pin during the fetch shares it.
function uiiScriptIndex() {
  const S = uiiState;
  return S.sources || (S.sources = uiiFetchScripts());
}

// A script that never answers must not hold the Copy ID line forever.
const UII_FETCH_MS = 3000;

async function uiiFetchScripts() {
  const map = new Map();
  const jobs = [...document.scripts]
    .filter((s) => s.src && uiiScriptWanted(s.src))
    .map(async (s) => {
      try {
        const res = await fetch(s.src, AbortSignal.timeout ? { signal: AbortSignal.timeout(UII_FETCH_MS) } : undefined);
        if (res.ok) map.set(s.src, await res.text()); // full URL: two index.js must not collide
      } catch (e) { /* cross-origin or unreadable: skip */ }
    });
  await Promise.all(jobs);
  return map;
}

// Tokens that identify the element in code: its id first, then each class.
// Quoted forms ('edit-btn', "edit-btn") and selector forms (#edit-btn,
// .row) count; a bare word does not, it would match prose in comments.
function uiiCodeTokens(info) {
  const toks = [];
  if (info.id) toks.push({ re: uiiTokenRe(info.id, '#'), w: 3 });
  for (const c of info.classes.slice(0, 3)) toks.push({ re: uiiTokenRe(c, '.'), w: 1 });
  return toks;
}

function uiiTokenRe(name, prefix) {
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp('([\'"`]' + esc + '[\'"`]|\\' + prefix + esc + '(?![\\w-]))', 'g');
}

// Basenames of the scripts that mention the element, best match first.
async function uiiCodeFiles(info) {
  const idx = await uiiScriptIndex();
  const toks = uiiCodeTokens(info);
  if (!toks.length) return [];
  const scored = [];
  for (const [file, text] of idx) {
    let score = 0;
    for (const t of toks) {
      const n = (text.match(t.re) || []).length;
      if (n) score += t.w * n;
    }
    if (score) scored.push({ file, score });
  }
  scored.sort((a, b) => b.score - a.score);
  const names = scored.map((s) => s.file.split('/').pop().split('?')[0]);
  return [...new Set(names)].slice(0, 3);
}

// Stylesheet files behind the matched rules, most specific last in sheet
// order so the first named is the app's own sheet, not a reset. No selector:
// the element's class in the locator greps every rule at once.
function uiiCssFiles(info) {
  const out = [];
  for (const r of info.rules) {
    if (r.selector === '*' || r.selector === 'html' || r.selector === 'body') continue;
    if (r.file.startsWith('<style')) continue; // injected at runtime: nothing to open
    const f = r.file.replace(/^renderer\//, '');
    if (!out.includes(f)) out.push(f);
  }
  return out.slice(0, 3);
}

/* ================= element facts =================
   Turns one DOM element into a plain object the panel renders and the
   "Copy for AI" text serialises. No DOM is touched here. */

// Which outline color an element gets. Order matters: a <button role="tab">
// is still a button.
function uiiKind(el) {
  const tag = el.tagName.toLowerCase();
  const role = el.getAttribute('role') || '';
  if (tag === 'button' || tag === 'summary' || role === 'button' || role === 'tab' || role === 'menuitem') return 'button';
  if (tag === 'input' || tag === 'select' || tag === 'textarea' || el.isContentEditable) return 'field';
  if (tag === 'a' || role === 'link') return 'link';
  return 'block';
}

// Human name, most intentional source first. nameAttr (data-ui by default) is
// the app's own label; the rest are fallbacks that usually exist anyway.
function uiiName(el) {
  const attr = uiiState.opts.nameAttr;
  const pick = [
    attr && el.getAttribute(attr),
    el.getAttribute('aria-label'),
    el.id,
    el.getAttribute('title'),
    el.getAttribute('placeholder'),
  ].find((v) => v && v.trim());
  if (pick) return pick.trim();
  const text = uiiShort(el.innerText || el.textContent, 30);
  if (text) return text;
  return el.tagName.toLowerCase() + (el.className && typeof el.className === 'string'
    ? '.' + el.className.trim().split(/\s+/).join('.') : '');
}

// One CSS segment for el: prefer #id, else tag.class, plus :nth-of-type when
// siblings share the tag and there is no class to tell them apart.
function uiiSegment(el) {
  if (el.id) return '#' + CSS.escape(el.id);
  const tag = el.tagName.toLowerCase();
  const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/).filter(Boolean) : [];
  if (cls.length) return tag + '.' + cls.slice(0, 2).map((c) => CSS.escape(c)).join('.');
  const p = el.parentElement;
  if (!p) return tag;
  const same = [...p.children].filter((c) => c.tagName === el.tagName);
  return same.length > 1 ? tag + ':nth-of-type(' + (same.indexOf(el) + 1) + ')' : tag;
}

// The nearest ancestor an AI can grep for: an #id, or the app's own nameAttr
// (data-ui), which is how an app labels a region. `up` counts the wrappers
// between it and el, so the caller knows whether anything was collapsed
// (0 = the direct parent).
function uiiAnchor(el) {
  const attr = uiiState.opts.nameAttr;
  let n = el.parentElement;
  let up = 0;
  while (n && n !== document.body) {
    const named = attr && n.getAttribute(attr);
    if (n.id || named) {
      const cls = typeof n.className === 'string' && n.className.trim();
      // A named ancestor with no class and no id has no segment worth
      // printing — uiiSegment() would answer "div:nth-of-type(2)" — so the
      // attribute itself is written, which is at least the string to grep.
      const seg = n.id || cls ? uiiSegment(n) : '[' + attr + '="' + named + '"]';
      return { seg, up };
    }
    n = n.parentElement;
    up += 1;
  }
  return null;
}

// Selector path: the element, and the nearest ancestor that pins it, with "…"
// for whatever sits between them. Two pieces name what to look for; six named
// where it was and nothing else —
//   div.jira-panel-body > div.jira-comments > div.jira-comments-list >
//   div.jira-comment-replies > div.jira-comment.jira-comment-reply >
//   div.jira-comment-body
// is the same element as
//   div.jira-comments-list > … > div.jira-comment-body
// and the long one repeats "div" five times to say "somewhere deep". A prompt
// pays for every one of those characters, and the source stamp beside the path
// is what actually leads to the line to edit; the path only has to say what to
// grep for. The "…" is the marker uiiFormatChanges() already writes.
// ".a.b" from the element's first two classes, or ''.
function uiiClassSel(el) {
  const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/).filter(Boolean) : [];
  return cls.slice(0, 2).map((c) => '.' + CSS.escape(c)).join('');
}

// Selector for a rule the AI must create: the classes when there are any —
// a minted id would tie the new CSS to a name that changes with a label.
function uiiNewRuleSel(el) {
  return (el.id && uiiClassSel(el)) || uiiPath(el);
}

function uiiPath(el) {
  const own = uiiSegment(el);
  // An id is unique but often minted at runtime, so nothing in the source
  // greps for it; the element's own classes do, in the JS and the CSS alike.
  if (el.id) return own + uiiClassSel(el);
  const anchor = uiiAnchor(el);
  if (!anchor) return own;
  return anchor.up > 0 ? anchor.seg + ' > … > ' + own : anchor.seg + ' > ' + own;
}

// Walk up until something actually paints a background.
function uiiEffectiveBg(el) {
  let n = el;
  while (n && n !== document.documentElement) {
    const v = getComputedStyle(n).backgroundColor;
    if (!uiiIsTransparent(v)) return { rgb: v, from: n === el ? null : uiiSegment(n), el: n };
    n = n.parentElement;
  }
  const v = getComputedStyle(document.documentElement).backgroundColor;
  return { rgb: uiiIsTransparent(v) ? 'transparent' : v, from: 'html', el: document.documentElement };
}

function uiiColorInfo(rgb, from, varMap) {
  const hex = uiiToHex(rgb);
  return { hex, rgb, from: from || null, vars: varMap.get(hex) || [] };
}

function uiiCollect(el) {
  const cs = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  const all = uiiAllRules();
  const colorVars = uiiColorVars(el, all);
  const varMap = uiiColorVarMap(colorVars);
  const bg = uiiEffectiveBg(el);
  return {
    el,
    name: uiiName(el),
    kind: uiiKind(el),
    tag: el.tagName.toLowerCase(),
    id: el.id || '',
    classes: typeof el.className === 'string' ? el.className.trim().split(/\s+/).filter(Boolean) : [],
    text: uiiShort(el.innerText || el.value || '', 60),
    path: uiiPath(el),
    src: uiiState.opts.srcAttr ? (el.getAttribute(uiiState.opts.srcAttr) || '') : '',
    width: Math.round(r.width),
    height: Math.round(r.height),
    bg: Object.assign(uiiColorInfo(bg.rgb, bg.from, varMap), { el: bg.el }),
    color: uiiColorInfo(cs.color, null, varMap),
    fontFamily: uiiFirstFont(cs.fontFamily),
    fontFamilyFull: cs.fontFamily,
    fontSize: cs.fontSize,
    fontWeight: cs.fontWeight,
    lineHeight: cs.lineHeight,
    padding: cs.padding,
    margin: cs.margin,
    border: uiiBorderSides(el).length ? uiiBorderText(el) : 'none',
    borderRadius: cs.borderRadius,
    display: cs.display,
    rules: uiiMatchedRules(el, all).slice(-30),
    colorVars, // the palette the color fields offer (cssvars.js)
    all, // every stylesheet rule, reused for the text children's lookups
  };
}

/* ================= occlusion: is a fixed layer painting over it? =================
   A control behind a popup is in the viewport, visible, and not ignored, yet
   the user cannot see it. No selector list can say "behind whatever is on top
   right now", so the renderer is asked — but once per scan, not once per
   element: a hit test costs ~0.13 ms on a large page, and 450 of them made
   every draw 8x slower. Instead a 5x5 grid of probes finds the fixed layers
   on screen (a popup's backdrop and panel), and geometry decides the rest.
   Small covers the probes miss — a toast, a tooltip — are not detected. The
   inspector's own host is never a layer: its panel already paints above the
   outline layer, so treating it as cover would only make outlines flicker. */

// Outermost position:fixed ancestor-or-self, or null for normal flow. Shared
// ancestors are styled once per scan, and nothing inside a fixed root is read.
function uiiFixedRoot(el, memo) {
  const path = [];
  let n = el;
  while (n && !memo.has(n)) { path.push(n); n = n.parentElement; }
  let root = n ? memo.get(n) : null;
  for (let i = path.length - 1; i >= 0; i--) {
    if (!root && getComputedStyle(path[i]).position === 'fixed') root = path[i];
    memo.set(path[i], root);
  }
  return root;
}

// Builds the per-scan test. An element is covered when its on-screen part
// lies wholly inside a probed layer's rect, it is neither inside that layer
// nor around it, and it is not part of another fixed layer that owns its own
// centre pixel — the rule that keeps a popup panel which is a sibling of its
// backdrop, not a child.
function uiiOcclusion() {
  const vw = window.innerWidth, vh = window.innerHeight;
  const memo = new Map(), layers = new Map(), onTop = new Map();
  for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) {
    const hit = document.elementFromPoint((i + 0.5) * vw / 5, (j + 0.5) * vh / 5);
    if (!hit || hit === uiiState.host) continue;
    const L = uiiFixedRoot(hit, memo);
    if (L && !layers.has(L)) layers.set(L, L.getBoundingClientRect());
  }
  if (!layers.size) return () => false;
  const above = (R) => {
    if (!onTop.has(R)) {
      const r = R.getBoundingClientRect();
      const x = Math.min(Math.max(r.left + r.width / 2, 0), vw - 1);
      const y = Math.min(Math.max(r.top + r.height / 2, 0), vh - 1);
      const hit = document.elementFromPoint(x, y);
      onTop.set(R, !!hit && (hit === R || R.contains(hit)));
    }
    return onTop.get(R);
  };
  return (el, r) => {
    // Only the on-screen part counts: a row running off the bottom is still
    // wholly under a full-screen backdrop.
    const left = Math.max(r.left, 0), top = Math.max(r.top, 0);
    const right = Math.min(r.right, vw), bottom = Math.min(r.bottom, vh);
    for (const [L, lr] of layers) {
      if (L.contains(el) || el.contains(L)) continue;
      if (left < lr.left || top < lr.top || right > lr.right || bottom > lr.bottom) continue;
      const own = uiiFixedRoot(el, memo);
      if (own && above(own)) continue;
      return true;
    }
    return false;
  };
}

/* ================= overlay: the host, the outlines, the hover box ============
   A single light-DOM host <div data-uii> carries a shadow root with every
   visual piece the inspector draws. What happens when the pointer moves over
   them is events.js; the padding and margin bands are spacing.js. */

function uiiMount() {
  const S = uiiState;
  if (S.host) return;
  const host = document.createElement('div');
  host.setAttribute('data-uii', '');
  const sh = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = UII_CSS + UII_CSS2 + UII_CP_CSS + UII_CP_TWEAKS;
  sh.appendChild(style);
  const mk = (cls) => { const d = document.createElement('div'); d.className = cls; sh.appendChild(d); return d; };
  S.layer = mk('layer');
  S.hoverBox = mk('hover');
  S.tip = mk('tip');
  S.mgBox = mk('sp mg');
  S.pdBox = mk('sp pd');
  S.spv = mk('spv');
  S.badge = mk('badge');
  S.badge.innerHTML = 'Inspect — click to pin, <kbd>Shift</kbd>+click to pick several, <kbd>C</kbd> copies it for an AI, <kbd>A</kbd> copies all changes,'
    + ' <kbd>V</kbd> normal view, <kbd>P</kbd> page variables, <kbd>I</kbd> color picker, <kbd>T</kbd> DOM tree, <kbd>Ctrl/Cmd+Z</kbd> undo, <kbd>Alt</kbd> for exact element, <kbd>↑↓←→</kbd> to walk, <kbd>Esc</kbd> to quit';
  S.badgeHtml = S.badge.innerHTML;
  S.ptrToast = mk('ptrtoast off');
  S.scratch = mk('scratch');
  S.scratch.style.display = 'none';
  uiiBuildPanel(sh);
  Bounce.attach(sh, 'button'); // every key in the panel and its popups
  // A 13px tick box needs a deep dip to be seen, and its label is the bigger target.
  Bounce.attach(sh, 'label.sim', { scale: 0.65, over: 0.3, to: (l) => l.querySelector('input[type=checkbox]') });
  Bounce.attach(sh, '.nf, .tf, .txt', { scale: 0.97, over: 0.02 }); // the type-in fields
  Bounce.attach(sh, '.tr', { scale: 0.97, over: 0.02 }); // DOM-tree rows: full width, so a shallow dip
  uiiAutoId(sh);
  document.documentElement.appendChild(host);
  S.host = host;
  S.shadow = sh;
}

function uiiUnmount() {
  const S = uiiState;
  uiiDestroyColorPicker(); // its mount dies with the host
  if (S.host) S.host.remove();
  S.host = S.shadow = S.layer = S.hoverBox = S.tip = S.badge = S.scratch = S.panel = null;
  S.mgBox = S.pdBox = S.spv = S.ptrToast = null;
  S.boxes = [];
  S.pickBoxes = [];
}

// The panel sits on the right, unless x (the pointer) is in the right 30% of
// the screen — then it moves left so it does not cover what was just picked.
// A panel already on the wanted side stays where it is, so a spot the user
// dragged it to is kept.
function uiiPanelAway(x) {
  const p = uiiState.panel.root;
  const r = p.getBoundingClientRect();
  const w = window.innerWidth;
  const wantLeft = x > w * 0.7;
  if (r.width && (r.left + r.width / 2 < w / 2) === wantLeft) return;
  if (wantLeft) { p.style.left = '16px'; p.style.right = 'auto'; }
  else { p.style.left = 'auto'; p.style.right = '16px'; }
}

// The panel opens with inspect mode, already filled: the element under the
// pointer is pinned, so there is no empty panel to look at and no click to
// make first. It is parked on the right, or on the left when the pointer is
// in the right 30% of the screen, because the pointer is sitting on what is
// about to be inspected and a 500px panel over it would be in the way.
// Without a pointer position (the shortcut pressed on a freshly loaded page)
// nothing is pinned and the panel stays closed until the first click.
function uiiOpenAtPointer() {
  const S = uiiState;
  if (!S.pos) return;
  uiiPanelAway(S.mx);
  const el = uiiSnap(document.elementFromPoint(S.mx, S.my), false);
  if (!el || el === document.body || el === document.documentElement || S.host.contains(el)) return;
  uiiSelect(el);
}

function uiiFromPanel(e) {
  return e.target === uiiState.host;
}

function uiiIgnored(el) {
  const ig = uiiState.opts.ignore;
  if (!ig.length) return false;
  for (const s of ig) { try { if (el.closest(s)) return true; } catch (err) { /* bad selector */ } }
  return false;
}

// Visible, uncovered candidates inside the viewport, capped so a 5,000-row
// tree does not turn into 5,000 divs. The time budget truncates in document
// order, so if it ever trips, a popup late in the markup is what goes
// unoutlined — the box count with a popup open is the check that it does not.
function uiiControls() {
  const S = uiiState;
  const vw = window.innerWidth, vh = window.innerHeight;
  const out = [];
  const all = document.querySelectorAll(S.selList);
  const t0 = performance.now();
  const covered = uiiOcclusion();
  for (const el of all) {
    if (out.length >= S.opts.maxOutlines) break;
    if (performance.now() - t0 > S.opts.maxScanMs) break;
    if (el === S.host || S.host.contains(el) || uiiIgnored(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1 || r.bottom < 0 || r.right < 0 || r.top > vh || r.left > vw) continue;
    if (getComputedStyle(el).visibility === 'hidden') continue;
    if (covered(el, r)) continue;
    out.push({ el, r });
  }
  return out;
}

function uiiPlace(box, r) {
  box.style.left = r.left + 'px';
  box.style.top = r.top + 'px';
  box.style.width = r.width + 'px';
  box.style.height = r.height + 'px';
}

function uiiDrawOutlines() {
  const S = uiiState;
  if (!S.layer) return;
  const items = uiiControls();
  while (S.boxes.length < items.length) {
    const d = document.createElement('div');
    S.layer.appendChild(d);
    S.boxes.push(d);
  }
  S.boxes.forEach((d, i) => {
    const it = items[i];
    if (!it) { d.style.display = 'none'; return; }
    d.style.display = '';
    d.className = 'box ' + uiiKind(it.el);
    uiiPlace(d, it.r);
  });
  uiiDrawSpacing(S.selected);
  uiiDrawPicks();
}

// One numbered box per Shift+click pick, in list order. Boxes are reused;
// spares hide. A picked element that left the page hides its box. Each box
// holds its own margin and padding bands (fixed, so they sit on the page, and
// hide with the box); the pinned pick leaves them off, uiiDrawSpacing has it.
function uiiDrawPicks() {
  const S = uiiState;
  if (!S.shadow) return;
  S.picks.forEach((p, i) => {
    let d = S.pickBoxes[i];
    if (!d) {
      d = document.createElement('div');
      d.className = 'pickbox';
      d.innerHTML = '<div class="sp mg"></div><div class="sp pd"></div>';
      S.shadow.appendChild(d);
      S.pickBoxes.push(d);
    }
    if (p.el === S.selected && p.bounce) { p.bounce = false; Bounce.play(d, { scale: 0.96, over: 0.03 }); }
    d.dataset.n = i + 1;
    d.style.display = p.el.isConnected ? '' : 'none';
    if (!p.el.isConnected) return;
    uiiPlace(d, p.el.getBoundingClientRect());
    const [mg, pd] = d.children;
    if (p.el === S.selected) { mg.classList.remove('on'); pd.classList.remove('on'); }
    else uiiDrawBands(mg, pd, p.el);
  });
  S.pickBoxes.slice(S.picks.length).forEach((d) => { d.style.display = 'none'; });
}

function uiiScheduleDraw() {
  const S = uiiState;
  if (S.holding) { S.drawLater = true; return; }
  if (S.raf) return;
  // A page that changes every frame (a timer, an animation) would rerun the
  // scan back to back — 45-120 ms each on 60,000 elements — and keys like Esc
  // would queue behind it. After a scan of d ms, wait 3·d before the next:
  // a small page still redraws every frame, a big one leaves 75% free.
  const go = () => {
    S.raf = requestAnimationFrame(() => {
      S.raf = 0;
      const t0 = performance.now();
      uiiDrawOutlines();
      S.drawEnd = performance.now();
      S.drawMs = S.drawEnd - t0;
    });
  };
  const wait = (S.drawEnd || 0) + 3 * (S.drawMs || 0) - performance.now();
  if (wait > 0) { S.raf = -1; S.drawTimer = setTimeout(go, wait); } else go();
}

// Say something in the badge for a moment, then let it fade back out. The
// badge is the one piece of chrome on screen whether the panel is open,
// minimised or closed, so it is where a keyboard action reports itself.
function uiiFlash(text) {
  const S = uiiState;
  if (!S.badge) return;
  clearTimeout(S.badgeTimer);
  S.badge.textContent = text;
  S.badge.classList.remove('off');
  S.badgeTimer = setTimeout(() => {
    if (!S.badge) return;
    S.badge.innerHTML = S.badgeHtml;
    S.badge.classList.add('off');
  }, 1200);
}

// The same kind of message beside the pointer, where the eye already is —
// a button or the badge can sit far from the click or key press.
function uiiPointerSay(text) {
  const S = uiiState;
  const t = S.ptrToast;
  if (!t || !S.pos) return;
  t.textContent = text;
  t.classList.remove('off');
  uiiPlacePtrToast();
  clearTimeout(S.ptrTimer);
  S.ptrTimer = setTimeout(() => { if (S.ptrToast) S.ptrToast.classList.add('off'); }, 1200);
}

// Below-right of the cursor, flipped to the other side near an edge. Called
// on every pointer move while the toast shows, so it follows the cursor. The
// color picker may hold back pointer moves while open; then the toast would
// otherwise stay where the pick started (the 💧 key) instead of the click.
function uiiPlacePtrToast() {
  const S = uiiState;
  const t = S.ptrToast;
  t.style.left = S.mx + 14 + 'px';
  t.style.top = S.my + 18 + 'px';
  const r = t.getBoundingClientRect();
  if (r.right > innerWidth) t.style.left = Math.max(0, S.mx - 8 - r.width) + 'px';
  if (r.bottom > innerHeight) t.style.top = Math.max(0, S.my - 8 - r.height) + 'px';
}

// Normal view: hide every outline and band, and hand the pointer back to the
// page, so a live edit can be judged on the real screen. The panel stays open
// with its edits, so the next press returns to a pinned element, not a blank
// one. Entering it unbinds the capture listeners — that is what makes the app
// clickable again — so nothing redraws until it is left.
function uiiPeek(on) {
  const S = uiiState;
  if (!S.on) return;
  const want = on === undefined ? !S.peek : !!on;
  if (want === S.peek) return;
  S.peek = want;
  S.host.classList.toggle('peek', want);
  if (want) {
    uiiUnbindEvents();
    if (S.raf) cancelAnimationFrame(S.raf);
    clearTimeout(S.drawTimer);
    S.raf = 0;
    uiiSetHover(null);
  } else {
    uiiBindEvents();
    uiiDrawOutlines();
    // The page may have scrolled or re-rendered while the overlay was off.
    if (S.selected && S.selected.isConnected) uiiDrawSpacing(S.selected);
    uiiDrawPicks();
  }
  const P = S.panel;
  if (!P || !P.peek) return;
  P.peek.classList.toggle('on', want);
  P.peek.title = want ? 'Back to inspect (V)' : 'Normal view — hide the overlay and use the page (V)';
}

/* ================= overlay: padding and margin =================
   The panel lists the numbers, but reading a layout means seeing where the
   space actually sits. The pinned element gets DevTools' two bands — green
   padding inside the border box, orange margin outside it — plus one chip
   carrying the numbers, because a 1px band is visible and still unreadable.
   Pinned and picked only: on hover the bands would chase the pointer. The
   chip goes on the pinned element alone; every other pick gets bare bands. */

const UII_SIDES = ['top', 'right', 'bottom', 'left'];

// [t, r, b, l] of a box property, in px.
function uiiBoxSides(cs, prop) {
  return UII_SIDES.map((s) => parseFloat(cs.getPropertyValue(prop + '-' + s + (prop === 'border' ? '-width' : ''))) || 0);
}

// CSS shorthand collapse: [8,8,8,8] -> "8", [4,8,4,8] -> "4 8".
function uiiShortSides(a) {
  const [t, r, b, l] = a.map((v) => Math.round(v * 10) / 10);
  if (t === r && r === b && b === l) return String(t);
  if (t === b && r === l) return t + ' ' + r;
  return [t, r, b, l].join(' ');
}

// Place a band: `out` is the outer rect, `w` the four band widths. The band
// is drawn as a border, so the hole in the middle is the inner box.
function uiiBand(box, out, w) {
  uiiPlace(box, out);
  box.style.borderWidth = w.map((v) => Math.max(0, v) + 'px').join(' ');
  box.classList.add('on');
}

// Margin band into mg, padding band into pd, for el; returns what the chip needs.
function uiiDrawBands(mg, pd, el) {
  const cs = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  const m = uiiBoxSides(cs, 'margin');
  const p = uiiBoxSides(cs, 'padding');
  const bw = uiiBoxSides(cs, 'border');
  // A negative margin pulls the element over its neighbour; the band cannot
  // be drawn inside-out, so only the chip reports it.
  uiiBand(mg, { left: r.left - Math.max(0, m[3]), top: r.top - Math.max(0, m[0]),
    width: r.width + Math.max(0, m[1]) + Math.max(0, m[3]), height: r.height + Math.max(0, m[0]) + Math.max(0, m[2]) }, m);
  uiiBand(pd, { left: r.left + bw[3], top: r.top + bw[0],
    width: r.width - bw[1] - bw[3], height: r.height - bw[0] - bw[2] }, p);
  return { r, m, p };
}

function uiiDrawSpacing(el) {
  const S = uiiState;
  if (!S.mgBox) return;
  if (!el || !el.isConnected) {
    for (const b of [S.mgBox, S.pdBox, S.spv]) b.classList.remove('on');
    return;
  }
  const { r, m, p } = uiiDrawBands(S.mgBox, S.pdBox, el);
  S.spv.title = 'padding · margin, in px';
  S.spv.innerHTML = 'padding <b></b> · margin <i></i>';
  S.spv.querySelector('b').textContent = uiiShortSides(p);
  S.spv.querySelector('i').textContent = uiiShortSides(m);
  // Under the margin box, or over it when the element sits at the bottom.
  const below = r.bottom + Math.max(0, m[2]) + 2;
  S.spv.style.left = Math.max(4, Math.min(r.left, window.innerWidth - 240)) + 'px';
  S.spv.style.top = (below + 20 < window.innerHeight ? below : Math.max(4, r.top - Math.max(0, m[0]) - 20)) + 'px';
  S.spv.classList.add('on');
}

/* ================= overlay: pointer events and pinning =================
   Every pointer event is captured on window so the app underneath never sees
   a click while inspect mode is on; events whose target is the host (they
   came from inside the panel) pass through untouched. Pinning an element is
   what builds the panel: see uiiCollect in inspect.js. */

// Nearest interactive ancestor of the pointer target, or the raw element while
// Alt is held (to reach a <span> inside a button, say).
function uiiTargetFrom(e) {
  return uiiSnap(e.target, e.altKey);
}

// Only interactive controls pull a click up to themselves. Containers that
// merely get outlined ([id], section, [role]) do not: a click on a <mark>
// inside <pre id="raw"> pins the <mark>, not the whole <pre>.
const UII_SNAP = 'button,a,label,input,select,textarea,summary,[contenteditable]';

// The snap itself, without an event: the pointer tracker has coordinates
// only, so uiiOpenAtPointer calls this one directly.
function uiiSnap(t, alt) {
  if (!t || t.nodeType !== 1 || t === uiiState.host) return null;
  if (alt) return t;
  const c = t.closest(UII_SNAP);
  return c && c !== document.body && c !== document.documentElement ? c : t;
}

// raw: the element under the pointer. When it sits inside el (the snap went
// up to a parent), the tip says how to reach it.
function uiiSetHover(el, raw) {
  const S = uiiState;
  S.hovered = el;
  if (!el) { S.hoverBox.classList.remove('on'); S.tip.classList.remove('on'); return; }
  const r = el.getBoundingClientRect();
  uiiPlace(S.hoverBox, r);
  S.hoverBox.classList.add('on');
  S.tip.innerHTML = '<b></b> <span></span>';
  S.tip.firstChild.textContent = uiiName(el);
  S.tip.lastChild.textContent = '<' + el.tagName.toLowerCase() + '> ' + Math.round(r.width) + '×' + Math.round(r.height)
    + ' · ' + getComputedStyle(el).fontSize;
  if (raw && raw !== el && raw.nodeType === 1) {
    const hint = document.createElement('i');
    hint.textContent = 'Hold Alt to pick the <' + raw.tagName.toLowerCase() + '> inside';
    S.tip.appendChild(hint);
  }
  // A parent its children cover edge to edge (a row of cells) has no spot to
  // hover; ↑ after the click is the way up, so name it.
  const up = el.parentElement;
  if (up && up !== document.body && up !== document.documentElement) {
    const hint = document.createElement('i');
    hint.textContent = 'Click, then ↑ for the <' + up.tagName.toLowerCase() + '> around it';
    S.tip.appendChild(hint);
  }
  const h = 24 + 18 * (S.tip.childElementCount - 2);
  const top = r.top > h + 4 ? r.top - h : r.bottom + 4;
  S.tip.style.left = Math.max(4, Math.min(r.left, window.innerWidth - 370)) + 'px';
  S.tip.style.top = top + 'px';
  S.tip.classList.add('on');
}

// Where the pointer is, kept up to date from init, not from enable: the
// shortcut carries no coordinates, and the panel has to know which half of
// the screen to avoid the moment the mode opens. Two assignments per move.
function uiiTrackPointer(e) {
  const S = uiiState;
  S.mx = e.clientX; S.my = e.clientY; S.pos = true;
  if (S.ptrToast && !S.ptrToast.classList.contains('off')) uiiPlacePtrToast();
}

function uiiOnMove(e) {
  // A pointer over the panel clears the hover — except over a tree row,
  // which has just asked for the outline on the element it names.
  if (uiiFromPanel(e)) { if (!uiiState.treeHover) uiiSetHover(null); return; }
  uiiSetHover(uiiTargetFrom(e), e.target);
}

function uiiOnBlock(e) {
  // A drag that starts in the panel (scrub, resize, move) and ends outside it
  // makes the browser click the common ancestor — <html> — which would re-pin.
  // pointerdown too: cancelling it below stops the browser sending mousedown,
  // so a stale flag from the last panel press would eat the next page click.
  if (e.type === 'mousedown' || e.type === 'pointerdown') uiiState.downInPanel = uiiFromPanel(e);
  if (uiiFromPanel(e)) return;
  e.preventDefault();
  e.stopPropagation();
}

function uiiOnClick(e) {
  if (uiiFromPanel(e)) return;
  e.preventDefault();
  e.stopPropagation();
  if (uiiState.downInPanel) { uiiState.downInPanel = false; return; }
  const el = uiiTargetFrom(e);
  if (!el) return;
  uiiPanelAway(e.clientX);
  const ready = uiiSelect(el, e.shiftKey);
  if (e.shiftKey) { uiiTogglePick(el, ready); return; }
  // Cmd/Ctrl+click (or any click with Auto copy ticked) pins and copies the
  // Copy ID line in one go. It waits for the script scan so the line names
  // the script files, as the button would.
  // (Ctrl+click on macOS arrives as contextmenu, which also lands here.)
  if (e.metaKey || e.ctrlKey || uiiState.autoCopy) ready.then((info) => uiiCopy(uiiFormatForAI(info)));
}

// Every pin (click, arrow walk, tree row, the shortcut) makes el pick 1 and
// drops the rest of the list; keep (Shift+click) leaves the list to the caller.
function uiiSelect(el, keep) {
  const S = uiiState;
  S.selected = el;
  uiiDrawSpacing(el); // the bands belong to the click, not to the next frame
  const info = uiiCollect(el);
  S.info = info;
  uiiRenderPanel(info);
  // Script scan is async (first call fetches every <script src>); the Copy
  // buttons read info.code when pressed. Resolves to info once it is set;
  // a failed scan just leaves the line without script files.
  const ready = uiiCodeFiles(info).then((files) => { info.code = files; }, () => {}).then(() => info);
  if (!keep) { S.picks = [{ el, ready, bounce: true }]; S.pickSeq++; uiiDrawPicks(); } // seq++: a pending Shift copy is stale now
  return ready;
}

// Shift+click: add el to the pick list, or take it out when already there,
// then copy every picked element's Copy ID line as one prompt opener. ready is
// uiiSelect's promise, kept so each line names its script files. The seq
// guard stops a slow, older copy from landing over a newer list.
function uiiTogglePick(el, ready) {
  const S = uiiState;
  const at = S.picks.findIndex((p) => p.el === el);
  if (at >= 0) S.picks.splice(at, 1); else S.picks.push({ el, ready, bounce: true });
  uiiDrawPicks();
  const seq = ++S.pickSeq;
  if (!S.picks.length) { uiiFlash('Pick list empty'); return; }
  Promise.all(S.picks.map((p) => p.ready)).then((infos) => {
    if (seq !== S.pickSeq) return;
    // Just the list, "[a], [b] and [c]", so the user writes the ask around it
    const ids = infos.map(uiiFormatForAI);
    uiiCopy(ids.length < 2 ? ids[0] : ids.slice(0, -1).join(', ') + ' and ' + ids[ids.length - 1]);
  });
}

const UII_EVENTS = [
  ['mousemove', uiiOnMove], ['mouseover', uiiOnBlock], ['mouseout', uiiOnBlock],
  ['mousedown', uiiOnBlock], ['mouseup', uiiOnBlock], ['click', uiiOnClick],
  ['dblclick', uiiOnBlock], ['contextmenu', uiiOnClick], ['pointerdown', uiiOnBlock],
  // The rest of what an app can hang a click on: pointerup/touch handlers, hover
  // menus, middle-click. Same rule as the others: the page never sees them.
  ['pointerup', uiiOnBlock], ['pointerover', uiiOnBlock], ['pointerout', uiiOnBlock],
  ['auxclick', uiiOnBlock], ['touchstart', uiiOnBlock], ['touchend', uiiOnBlock],
];

// Events from inside the panel pass the window untouched, then bubble out of
// the host to the app's document/window listeners — where a popup's "click
// outside" or "focus left" handler closes the popup being inspected. Stop them
// at the host: the panel's own listeners (deeper in the shadow tree) already ran.
const UII_PANEL_STOP = ['click', 'dblclick', 'auxclick', 'contextmenu', 'mousedown', 'mouseup',
  'pointerdown', 'pointerup', 'touchstart', 'touchend', 'focusin', 'focusout'];
const uiiStopAtHost = (e) => e.stopPropagation();

function uiiBindEvents() {
  for (const [n, fn] of UII_EVENTS) window.addEventListener(n, fn, { capture: true, passive: false });
  if (uiiState.host) for (const n of UII_PANEL_STOP) uiiState.host.addEventListener(n, uiiStopAtHost);
  window.addEventListener('scroll', uiiScheduleDraw, true);
  window.addEventListener('resize', uiiScheduleDraw);
  uiiState.mo = new MutationObserver(() => { uiiScheduleDraw(); uiiTreeTouch(); });
  uiiState.mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'hidden'] });
}

function uiiUnbindEvents() {
  for (const [n, fn] of UII_EVENTS) window.removeEventListener(n, fn, true);
  window.removeEventListener('scroll', uiiScheduleDraw, true);
  window.removeEventListener('resize', uiiScheduleDraw);
  if (uiiState.mo) uiiState.mo.disconnect();
  uiiState.mo = null;
}

/* ================= live editing: state =================
   Each field writes straight to the pinned element's inline style, so a tweak
   shows on screen at once. Edits are remembered per element: the original
   style attribute (for Reset), the value typed, and the computed value before
   the first edit (for the "from → to" change log an AI can act on). */

function uiiEditsFor(el, create) {
  const S = uiiState;
  if (!S.edits) S.edits = new Map();
  let e = S.edits.get(el);
  if (!e && create) {
    e = { orig: el.getAttribute('style'), props: {}, from: {}, rule: {} };
    S.edits.set(el, e);
  }
  return e || null;
}

function uiiApplyEdit(el, prop, value) {
  const e = uiiEditsFor(el, true);
  uiiUndoAdd({ k: 'prop', el, prop, had: prop in e.props, to: e.props[prop],
    inline: el.style.getPropertyValue(prop), pri: el.style.getPropertyPriority(prop) });
  if (!(prop in e.from)) e.from[prop] = getComputedStyle(el).getPropertyValue(prop).trim();
  e.props[prop] = value;
  el.style.setProperty(prop, value);
  if (uiiState.similar) {
    // While a value is held or dragged the rule waits for the release:
    // rewriting it restyles the whole page (~100 ms a step on 60,000
    // elements), and the inline edit already shows on the pinned element.
    const S = uiiState;
    if (!S.holding) e.rule[prop] = uiiRuleApply(el, prop, value);
    else {
      if (!S.ruleLater) S.ruleLater = new Map();
      S.ruleLater.set(el, (S.ruleLater.get(el) || new Set()).add(prop));
    }
  }
  if (uiiState.panel) {
    uiiState.panel.reset.disabled = false;
    // Building the log matches CSS rules; once a drag settles is enough.
    clearTimeout(uiiState.chgTimer);
    uiiState.chgTimer = setTimeout(uiiRefreshChanges, 150);
  }
  uiiScheduleDraw();
}

// While a value is dragged or held, outline redraws wait (each re-measures
// every control on the page) and run once when it ends.
// `live` keeps the undo step but lets rules and outlines follow every change.
function uiiHold(on, live) {
  const S = uiiState;
  S.holding = on && !live;
  if (on) uiiUndoBegin(); else uiiUndoEnd();
  // The rules uiiApplyEdit held back, each written once with its last value.
  if (!on && S.ruleLater) {
    for (const [el, props] of S.ruleLater) {
      const e = uiiEditsFor(el, false);
      if (!e || !S.similar) continue; // reset, or the box unticked, meanwhile
      for (const p of props) if (p in e.props) e.rule[p] = uiiRuleApply(el, p, e.props[p]);
    }
    S.ruleLater = null;
  }
  if (!on && S.drawLater) { S.drawLater = false; uiiScheduleDraw(); }
}

function uiiResetOne(el) {
  const e = uiiEditsFor(el, false);
  if (!e) return;
  if (e.orig === null) el.removeAttribute('style'); else el.setAttribute('style', e.orig);
  uiiRestoreText(e);
  uiiState.edits.delete(el);
}

// One element, and only that element: the ↺ in front of a tree row. The
// header's ↺ is the wider one — it also puts back every variable edit, which
// belongs to no element. Rules this element rewrote (Apply to similar) go back
// through uiiSyncRules, which replays the edits still standing.
function uiiResetEl(el) {
  const e = uiiEditsFor(el, false);
  if (!e) return false;
  for (const k of e.kids || []) uiiResetOne(k);
  uiiResetOne(el);
  // Steps that would put this element back describe a world that is gone.
  uiiUndoForget(el);
  uiiSyncRules();
  uiiRefreshChanges();
  const P = uiiState.panel;
  if (P) {
    // The header's ↺ goes dim only when NOTHING is left — variables included.
    P.reset.disabled = !((uiiState.edits ? uiiState.edits.size : 0) + uiiVarEdits.size);
    if (uiiState.info && uiiState.info.el === el) uiiSelect(el);
    else uiiRenderTree();
  }
  uiiScheduleDraw();
  return true;
}

// What the page itself had for one property, before the inspector wrote it.
function uiiRestoreProp(el, e, prop) {
  const probe = document.createElement('div');
  if (e.orig) probe.setAttribute('style', e.orig);
  const had = probe.style.getPropertyValue(prop);
  if (had) el.style.setProperty(prop, had, probe.style.getPropertyPriority(prop));
  else el.style.removeProperty(prop);
  // Nothing left inline: drop the empty attribute the property removal leaves,
  // or the element reads as styled when it is not.
  if (!el.style.length) el.removeAttribute('style');
}

// ONE value of ONE element: the ↺ in front of a field or a Declared row. The
// tree's ↺ takes the whole element, the header's every element plus the
// variables — this is the smaller undo, for the number that was just wrong.
function uiiResetProp(el, prop) {
  const e = uiiEditsFor(el, false);
  if (!e || !(prop in e.props)) return false;
  uiiRestoreProp(el, e, prop);
  delete e.props[prop]; delete e.from[prop]; delete e.rule[prop];
  const kids = e.kids ? [...e.kids].filter((k) => k !== el && uiiEditsFor(k, false)) : [];
  if (!Object.keys(e.props).length && !e.text && !kids.length) uiiState.edits.delete(el);
  uiiUndoForget(el, prop);
  uiiSyncRules();
  uiiRefreshChanges();
  if (uiiState.info) uiiSelect(uiiState.info.el);
  uiiScheduleDraw();
  return true;
}

// The same for a variable, which belongs to no element: it is declared in a
// rule of its own, and every element reading it follows.
function uiiResetVarOne(name) {
  const v = uiiVarEdits.get(name);
  if (!v) return false;
  if (v.from) v.style.setProperty(v.prop, v.from, v.pri); else v.style.removeProperty(v.prop);
  uiiVarEdits.delete(name);
  uiiUndoForgetVar(name);
  uiiRefreshChanges();
  const P = uiiState.panel;
  if (P) P.reset.disabled = !((uiiState.edits ? uiiState.edits.size : 0) + uiiVarEdits.size);
  if (uiiState.varsMode) uiiVarsPanel();
  else if (uiiState.info) uiiSelect(uiiState.info.el);
  uiiScheduleDraw();
  return true;
}

// One entry point for both: a Declared row's name is either a property or a
// custom property, and the key in front of it does not care which.
function uiiResetValue(name) {
  const n = String(name || '');
  if (n.startsWith('--')) return uiiResetVarOne(n);
  // A field that writes several properties (the border sides) lists them all.
  return uiiState.info ? n.split(',').map((p) => uiiResetProp(uiiState.info.el, p)).some(Boolean) : false;
}

// A key is live only while its own value is changed, so a panel of keys reads
// as a map of what was actually touched.
function uiiSyncResetKeys() {
  const S = uiiState, P = S.panel;
  if (!P || !P.body || !S.info) return;
  const e = uiiEditsFor(S.info.el, false);
  for (const b of P.body.querySelectorAll('.rs')) {
    const n = b.dataset.prop;
    if (!n) continue;
    b.disabled = n.startsWith('--') ? !uiiVarEdits.has(n) : !(e && n.split(',').some((p) => p in e.props));
  }
}

// The pinned element plus every text child an edit reached (see uiiSet), and
// every variable edited from the color fields. A var edit belongs to no
// element, so this button is the only place that can take it back.
// `el` is null in the palette, which has no element: the variables are then
// all there is to put back.
function uiiResetEdits(el) {
  const e = el && uiiEditsFor(el, false);
  if (!e && !uiiVarEdits.size) return;
  uiiVarReset();
  if (e) {
    for (const k of e.kids || []) uiiResetOne(k);
    uiiResetOne(el);
  }
  uiiUndoClear();
  uiiSyncRules();
  if (el) uiiSelect(el); else uiiVarsPanel();
}

// Refill the Changes box from the pinned element's edits, and from the
// variable edits, which belong to no element: the palette has a box of its
// own and nothing need be pinned to fill it.
function uiiRefreshChanges() {
  const P = uiiState.panel;
  if (P && P.changes && (uiiState.info || uiiState.varsMode)) P.changes.value = uiiFormatChanges();
  if (P && P.borderSync && uiiState.info) P.borderSync();
  uiiSyncResetKeys();
}

// "font-size: 14px; color: #fff" or '' when the element is untouched.
function uiiEditsText(el) {
  const e = uiiEditsFor(el, false);
  if (!e) return '';
  return Object.entries(e.props).map(([k, v]) => k + ': ' + v).join('; ');
}

// [{prop, from, to}] for every edited property whose computed value really
// moved — typing a value back to where it started drops it from the log.
function uiiEditChanges(el) {
  const e = uiiEditsFor(el, false);
  if (!e) return [];
  const cs = getComputedStyle(el);
  const out = [];
  for (const [prop, to] of Object.entries(e.props)) {
    if (cs.getPropertyValue(prop).trim() === e.from[prop]) continue;
    out.push({ prop, from: uiiToHex(e.from[prop]), to });
  }
  return out;
}

// Current value shown in a field: the edit if there is one, else computed.
// Text properties read the main text, which is what the edit changes;
// a variable factor (calc(var(--x) * k)) or a plain authored value (1.125em)
// wins over the computed px.
function uiiEditValue(info, prop, own) {
  const el = own ? info.el : uiiTargetEl(info, prop);
  const e = uiiEditsFor(el, false);
  if (e && prop in e.props) return e.props[prop];
  // A text edit on a child with no rule of its own lands on the pinned
  // element and reaches the text by inheritance (uiiWriteEl): the field shows
  // the value that was written, not the px it computes to.
  // (not when the text has a rule of its own: the edit never reaches it)
  const h = !own && el !== info.el && !uiiOwnsProp(info, el, prop) && uiiEditsFor(info.el, false);
  if (h && prop in h.props) return h.props[prop];
  if (prop === 'background-color') return info.bg.hex;
  if (prop === 'color') return el === info.el ? info.color.hex : uiiToHex(getComputedStyle(el).color);
  // One picker sets all four sides; it shows the first one that draws.
  if (prop === 'border-color') return uiiToHex(getComputedStyle(el).getPropertyValue('border-' + uiiBorderSide(el) + '-color'));
  const fx = uiiFormula(el, prop);
  if (fx) return uiiVarCalc(fx.name, fx.k);
  return uiiAuthored(el, prop) || getComputedStyle(el).getPropertyValue(prop).trim();
}


/* ================= live editing: apply to similar =================
   With "Apply to similar" on, an edit also rewrites the CSS rule that sets
   the property (the one the Changes box names), in memory only, so every
   element that rule styles changes with the pinned one. Originals are kept
   per rule so Reset, the checkbox, or a reload puts the sheet back. */

// CSSStyleDeclaration -> Map(prop -> {v, p}): the rule's text before any edit.
const uiiRuleOrig = new Map();

// CSSStyleDeclaration -> cssText before any edit. Restoring the block as a
// whole, not property by property: a rule whose color comes from a shorthand
// ("background: color-mix(…)") has an empty background-color longhand, and
// putting that emptiness back would strip the color out of the shorthand and
// leave the element painted by some weaker rule.
const uiiRuleText = new Map();

// What the stylesheet said before the inspector touched it.
function uiiDeclValue(style, prop) {
  const m = uiiRuleOrig.get(style);
  const o = m && m.get(prop);
  return (o ? o.v : style.getPropertyValue(prop)).trim();
}

// uiiDeclValue, or the shorthand's when the longhand reads empty: CSSOM blanks
// `background-color` when the rule writes `background: var(--x)`.
function uiiDeclOrShort(style, prop) {
  return uiiDeclValue(style, prop) || (UII_COLOR_SHORTHAND[prop] ? uiiDeclValue(style, UII_COLOR_SHORTHAND[prop]) : '');
}

// Returns the rule it rewrote, so a caller can replay it once the element is
// gone (a detached element has no computed style to find the rule by).
function uiiRuleApply(el, prop, value, d = uiiEditRule(el, prop)) {
  if (!d) return null; // no rule to share (inherited, or only `*`): the inline edit is it
  if (!uiiRuleText.has(d.style)) uiiRuleText.set(d.style, d.style.cssText);
  if (!uiiRuleOrig.has(d.style)) uiiRuleOrig.set(d.style, new Map());
  const m = uiiRuleOrig.get(d.style);
  if (!m.has(prop)) m.set(prop, { v: d.style.getPropertyValue(prop), p: d.style.getPropertyPriority(prop) });
  d.style.setProperty(prop, value, m.get(prop).p);
  return d;
}

// Put every touched rule back, then — when the box is ticked — replay the
// edits still standing. Used by Reset and by the checkbox.
function uiiSyncRules() {
  for (const [style, text] of uiiRuleText) style.cssText = text;
  uiiRuleText.clear();
  uiiRuleOrig.clear();
  // A variable edit may live in a rule just restored, and it outlives this:
  // it belongs to the palette, not to the checkbox.
  for (const e of uiiVarEdits.values()) e.style.setProperty(e.prop, e.to, e.pri);
  if (uiiState.similar && uiiState.edits) {
    for (const [el, e] of uiiState.edits) {
      for (const [prop, v] of Object.entries(e.props)) {
        e.rule[prop] = uiiRuleApply(el, prop, v, el.isConnected ? undefined : e.rule[prop] || null);
      }
    }
  }
  uiiScheduleDraw();
}

/* ================= live editing: the variables themselves =================
   A color field pointed at `--bg` edits the variable rather than the
   element, so every rule that uses it follows in one go — which is what an
   app's palette is for. The declaring rule is rewritten in memory, the way
   "Apply to similar" rewrites a plain one, and Reset puts it back. */

// key -> {style, prop, pri, file, selector, from, to, add}. A variable is
// keyed by its name; a declaration in a state rule (the States section) by
// uiiDeclKey. `from` is what the sheet said before the inspector touched it,
// `add` marks a var no sheet declared.
const uiiVarEdits = new Map();

// Writes one declaration and records it for undo, Reset and the Changes box.
// `find` builds the entry the first time a key is written; undo passes none,
// the entry it replays already exists.
function uiiDeclSet(key, value, find) {
  let e = uiiVarEdits.get(key);
  if (!e && !find) return;
  uiiUndoAdd({ k: 'var', name: key, had: !!e, to: e && e.to });
  if (!e) uiiVarEdits.set(key, e = find());
  e.to = value;
  e.style.setProperty(e.prop, value, e.pri);
  if (uiiState.panel) {
    uiiState.panel.reset.disabled = false;
    uiiRefreshChanges();
  }
  uiiScheduleDraw();
}

function uiiVarApply(name, value, el) {
  uiiDeclSet(name, value, () => {
    // The palette edits variables with nothing pinned: no info to carry the
    // rule list, so the one it collected on open stands in.
    const r = uiiVarRule(name, el, (uiiState.info && uiiState.info.all) || uiiState.all || []);
    // Nothing readable declares it (an inline style, a cross-origin sheet):
    // own it on :root, where a palette belongs, and say so in the log.
    const style = r ? r.style : document.documentElement.style;
    return { style, prop: name, pri: '', file: r ? r.file.split('/').pop() : '',
      selector: r ? r.selector : ':root', from: style.getPropertyValue(name), add: !r };
  });
}

// One id per rule, so two rules with the same selector (a second @media copy)
// never share an edit.
const uiiRuleIds = new WeakMap();
let uiiRuleSeq = 0;
function uiiDeclKey(style, prop) {
  if (!uiiRuleIds.has(style)) uiiRuleIds.set(style, ++uiiRuleSeq);
  return 'rule#' + uiiRuleIds.get(style) + ' ' + prop;
}

function uiiVarReset() {
  for (const e of uiiVarEdits.values()) {
    if (e.from) e.style.setProperty(e.prop, e.from, e.pri); else e.style.removeProperty(e.prop);
  }
  uiiVarEdits.clear();
}

// [[head, decl]] for the Changes box: "style.css :root", "--bg: #1f2937".
// Page-wide, so uiiChangeLines lists these before the per-element ones.
function uiiVarLines() {
  return [...uiiVarEdits.values()].map((e) => [
    (e.file ? e.file + ' ' : '') + e.selector + (e.add ? ' /* new rule */' : ''),
    e.prop + ': ' + e.to + (e.pri ? ' !important' : ''),
  ]);
}

/* ================= live editing: text follows the edit =================
   Pinning a <td> and changing its font size does nothing when the text sits
   in a <span> with its own rule. The point is the result on screen, not the
   right element: text properties go to every element that draws text inside
   the pinned one, and the change log names the rule to edit for each. */

const UII_TEXT_PROPS = ['color', 'font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing'];

// Elements inside the pinned one (itself included) holding visible text
// directly, most text first — [0] is the main text, the one fields show.
// Cached per selection: a drag asks for it on every step.
function uiiTextEls(info) {
  if (!info.textEls) info.textEls = uiiFindTextEls(info.el);
  return info.textEls;
}

function uiiTargetEl(info, prop) {
  return UII_TEXT_PROPS.includes(prop) ? uiiTextEls(info)[0] : info.el;
}

// Does `t` set `prop` in a rule of its own? Text properties inherit: a child
// with no rule of its own gets the value from the pinned element, so only
// children that set it themselves need their own edit (and their own line in
// the log). A relative font-size (0.9em, 90%) already follows its parent —
// scaling it too would double up.
function uiiOwnsProp(info, t, prop) {
  if (t === info.el) return true;
  const d = uiiRuleDecl(t, prop);
  return !!d && !(prop === 'font-size' && /(^|[^r])em\b|%/.test(d.value));
}

// The element an edit to `prop` really lands on. Not always the one the field
// reads (uiiTargetEl): the main text is the one that shows the value, but with
// no rule of its own it is the pinned element that gets the declaration. A
// relative unit is measured against that element's parent, so a conversion
// asks here, not there — otherwise 20px on a <div> whose text sits in a plain
// <span> converts to 1em against the span's parent (the div itself) and the
// text jumps the moment the unit changes.
function uiiWriteEl(info, prop) {
  if (!UII_TEXT_PROPS.includes(prop)) return info.el;
  const main = uiiTextEls(info)[0];
  return uiiOwnsProp(info, main, prop) ? main : info.el;
}

function uiiFindTextEls(el) {
  const len = new Map();
  const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let t;
  for (let i = 0; (t = walk.nextNode()) && i < 200; i++) {
    const n = t.data.trim().length;
    if (n && t.parentElement) len.set(t.parentElement, (len.get(t.parentElement) || 0) + n);
  }
  const out = [...len.keys()].sort((a, b) => len.get(b) - len.get(a));
  return out.length ? out : [el];
}

// Value before the first edit: the recorded one, else computed now.
function uiiOrig(el, prop) {
  const e = uiiEditsFor(el, false);
  return e && prop in e.from ? e.from[prop] : getComputedStyle(el).getPropertyValue(prop).trim();
}

// Every field writes through here. A text property lands on the main text
// exactly as typed; font-size scales the other text by the same ratio (an
// icon beside a title stays in proportion), any other text property goes to
// the text that shared the main text's value.
function uiiSet(info, prop, value) {
  uiiUndoBegin();
  try { uiiSetInner(info, prop, value); } finally { uiiUndoEnd(); }
}

// Only the pinned element, however its text is split: the field of what this
// element sets, beside the one for what its text shows (uiiNumSlot).
function uiiSetOwn(el, prop, value) {
  uiiUndoBegin();
  try { uiiApplyEdit(el, prop, value); } finally { uiiUndoEnd(); }
}

function uiiSetInner(info, prop, value) {
  if (!UII_TEXT_PROPS.includes(prop)) { uiiApplyEdit(info.el, prop, value); return; }
  const els = uiiTextEls(info);
  const main = els[0];
  const base = uiiOrig(main, prop);
  const host = uiiEditsFor(info.el, true);
  if (!host.kids) host.kids = new Set();
  const own = (t) => uiiOwnsProp(info, t, prop);
  const first = uiiWriteEl(info, prop);
  uiiApplyEdit(first, prop, value);
  if (first !== info.el) host.kids.add(first);
  // Ratio from computed px, so a value typed in em or rem scales too.
  const ratio = prop === 'font-size' ? parseFloat(getComputedStyle(main).fontSize) / parseFloat(base) : NaN;
  for (const t of els) {
    if (t === main || t === first || !own(t)) continue;
    const o = uiiOrig(t, prop);
    let v = value;
    if (isFinite(ratio)) {
      if (isNaN(parseFloat(o))) continue;
      v = Math.round(parseFloat(o) * ratio * 100) / 100 + 'px';
    }
    else if (o !== base) continue;
    uiiApplyEdit(t, prop, v);
    if (t !== info.el) host.kids.add(t);
  }
}

// Matched rules of `el`, cached per selection.
function uiiRulesOf(el) {
  const I = uiiState.info;
  if (!I.ruleCache) I.ruleCache = new Map();
  if (!I.ruleCache.has(el)) I.ruleCache.set(el, el === I.el ? I.rules : uiiMatchedRules(el, I.all));
  return I.ruleCache.get(el);
}

// What the winning declaration (uiiDeclared) wrote, when it is a plain number
// (1.125em, 12px, 1.4) that really is what the element shows; '' for calc(),
// var(), or when the cascade could not be settled (checked against computed).
function uiiAuthored(el, prop) {
  const d = uiiDeclared(el, prop);
  const p = d && uiiParseNum(d.code.slice(d.code.indexOf(': ') + 2));
  if (!p || !/^(px|em|rem|%|)$/.test(p.unit)) return '';
  return Math.abs(parseFloat(uiiConvertUnit(el, prop, p.unit)) - p.n) < 0.01 ? d.code.slice(d.code.indexOf(': ') + 2) : '';
}

/* ================= live editing: variable-driven values =================
   A rule like `font-size: calc(var(--ui-font-size-grid) * 0.917)` sizes by a
   factor of a variable. Showing or logging the computed px would get an AI to
   hard-code it and cut the link to the variable, so such values are edited
   and reported as the factor: calc(var(--ui-font-size-grid) * 0.754). */

const uiiRound3 = (n) => Math.round(n * 1000) / 1000;

function uiiVarCalc(name, k) {
  return 'calc(var(' + name + ') * ' + uiiRound3(k) + ')';
}

// "var(--x)" / "calc(var(--x) * k)" / "calc(k * var(--x))" -> {name, k}.
function uiiParseVarFactor(v) {
  const s = String(v || '').trim();
  let m = /^var\((--[\w-]+)\)$/.exec(s);
  if (m) return { name: m[1], k: 1 };
  m = /^calc\(\s*var\((--[\w-]+)\)\s*\*\s*(-?\d*\.?\d+)\s*\)$/.exec(s);
  if (m) return { name: m[1], k: parseFloat(m[2]) };
  m = /^calc\(\s*(-?\d*\.?\d+)\s*\*\s*var\((--[\w-]+)\)\s*\)$/.exec(s);
  return m ? { name: m[2], k: parseFloat(m[1]) } : null;
}

// The variable a value is built on: "var(--bg)" -> "--bg". Anywhere in the
// value, not only at the front, so a shorthand ("1px solid var(--line)") and
// a fallback chain ("var(--btn-bg, var(--panel-2))") both answer with the
// variable the page is actually reading.
function uiiVarName(v) {
  const m = /var\(\s*(--[\w-]+)/.exec(String(v || ''));
  return m ? m[1] : '';
}

// The factor form of `value` on `el`, only when it really produces `px`
// (the variable resolves to px there and k × var = px). Guards against a
// rule that a more specific one overrides — sheet order is not the cascade.
function uiiVarFactor(el, value, px) {
  const f = uiiParseVarFactor(value);
  if (!f) return null;
  const varPx = parseFloat(getComputedStyle(el).getPropertyValue(f.name));
  if (isNaN(varPx) || !varPx || Math.abs(f.k * varPx - px) > 0.05) return null;
  return { name: f.name, k: f.k, varPx };
}

// Values no real stylesheet uses, so a computed change proves the rule wins.
const UII_PROBE = { color: 'rgb(1, 2, 3)', 'background-color': 'rgb(1, 2, 3)', 'font-family': 'uii-probe',
  'font-weight': '137', 'text-align': 'justify', border: '7px dotted rgb(1, 2, 3)' };

// {file, selector, value, style} of the matched rule that really sets `prop`
// on `el`, or null when none does (the value is inherited). Sheet order is
// not the cascade (specificity, !important), so each candidate, last first,
// is probed: set a sentinel, see if the element's computed value moves,
// put the rule back. The element's own inline value is lifted meanwhile.
// Cached per selection.
function uiiRuleDecl(el, prop) {
  const I = uiiState.info;
  if (!I.declCache) I.declCache = new Map();
  let m = I.declCache.get(el);
  if (!m) I.declCache.set(el, (m = new Map()));
  if (!m.has(prop)) m.set(prop, uiiFindDecl(el, prop));
  return m.get(prop);
}

// The part of a selector that names the element itself: "td" out of
// "#grid tbody > td". `*` here means the rule styles everything.
function uiiLastSeg(selector) {
  return selector.split(/[\s>+~]+/).pop();
}

function uiiFindDecl(el, prop) {
  const rules = uiiRulesOf(el);
  const sets = rules.filter((r) => r.style && uiiDeclOrShort(r.style, prop));
  // One matched rule sets it, unconditionally, with no `*` rule beside it
  // (an `!important` reset could still beat it): nothing can override it,
  // so it wins without the probe, which restyles the whole page. Not when
  // the list may be cut (uiiCollect keeps the last 30): a dropped rule counts.
  const sure = rules.length < 30 && sets.length === 1 && !sets[0].cond && uiiLastSeg(sets[0].selector) !== '*';
  // Candidates, last in sheet order first. A universal rule — the
  // `* { margin: 0 }` reset — is never an answer: uiiFindEditRule() refuses
  // to edit one, so finding it is work thrown away. Probing it is also the
  // most expensive probe there is: the sentinel lands on every element in
  // the document, and reading the result back relayouts all of them
  // (measured: 2 such probes = 82 of the 389 ms one panel render cost on a
  // 5,000-element page).
  const cands = sets.filter((r) => uiiLastSeg(r.selector) !== '*').reverse();
  const out = (r) => ({ file: r.file.split('/').pop(), selector: r.selector, value: uiiDeclOrShort(r.style, prop), style: r.style });
  if (sure) return out(cands[0]);
  const w = cands.length > 1 ? uiiProbeAll(el, prop, cands) : null;
  if (w) return out(w);
  if (w === false) return null;
  const r = cands.find((c) => uiiWins(el, prop, c.style));
  return r ? out(r) : null;
}

// Sentinel number i for `prop`, distinct per i; null where a property has too
// few values to tell rules apart (text-align).
function uiiProbeVal(prop, i) {
  if (prop === 'text-align') return null;
  if (prop === 'font-weight') return String(137 + i);
  if (prop === 'font-family') return 'uii-probe-' + i;
  if (prop === 'border') return '7px dotted rgb(1, 2, ' + (3 + i) + ')';
  if (/color$/.test(prop)) return 'rgb(1, 2, ' + (3 + i) + ')';
  return (1234.5 + i) + 'px';
}

// uiiWins for every candidate in one go: each gets its own sentinel, the
// element is read once, and the sentinel that shows names the winner — one
// page restyle instead of one per rule (~110 ms each on 60,000 elements).
// false when the value did not move at all: the winner is none of them (a
// rule past the 30 kept, an `!important` `*`), which is what probing rule by
// rule would also conclude, one restyle per rule later. null when it moved to
// none of the sentinels (max-width clamping a width, say): the caller falls
// back to probing rule by rule.
function uiiProbeAll(el, prop, cands) {
  const s = uiiState.scratch;
  if (!s || cands.length > 200) return null;
  const vals = cands.map((r, i) => uiiProbeVal(prop, i));
  if (vals.includes(null)) return null;
  // Each sentinel as getComputedStyle writes it, from the hidden scratch
  // element (the uiiNormColor trick): only that one element restyles.
  const want = vals.map((v) => { s.style.setProperty(prop, v); return getComputedStyle(s).getPropertyValue(prop); });
  s.style.removeProperty(prop);
  if (new Set(want).size !== want.length) return null;
  const iv = el.style.getPropertyValue(prop), ip = el.style.getPropertyPriority(prop);
  if (iv) el.style.removeProperty(prop);
  const before = getComputedStyle(el).getPropertyValue(prop);
  // Put back by whole cssText, for the reason uiiWins gives.
  const texts = cands.map((r) => r.style.cssText);
  cands.forEach((r, i) => r.style.setProperty(prop, vals[i], r.style.getPropertyPriority(prop)));
  const got = getComputedStyle(el).getPropertyValue(prop);
  cands.forEach((r, i) => { r.style.cssText = texts[i]; });
  if (iv) el.style.setProperty(prop, iv, ip);
  const i = want.indexOf(got);
  return i >= 0 ? cands[i] : got === before ? false : null;
}

// Would `prop` in this rule decide the element's value? Set a sentinel, see
// if the computed value moves, put everything back (the element's own inline
// value is lifted meanwhile, or it would always win).
// The rule is put back by its whole cssText, never property by property: a
// rule that paints through a shorthand ("background: color-mix(…)") reports
// an empty background-color longhand, so removing the sentinel would take the
// color out of the shorthand with it and leave the page quietly restyled by
// a probe that was only meant to read.
function uiiWins(el, prop, style) {
  const iv = el.style.getPropertyValue(prop), ip = el.style.getPropertyPriority(prop);
  if (iv) el.style.removeProperty(prop);
  const before = getComputedStyle(el).getPropertyValue(prop);
  const text = style.cssText;
  style.setProperty(prop, UII_PROBE[prop] || '1234.5px', style.getPropertyPriority(prop));
  const win = getComputedStyle(el).getPropertyValue(prop) !== before;
  style.cssText = text;
  if (iv) el.style.setProperty(prop, iv, ip);
  return win;
}

// Where an edit lands, cached per selection. The rule that sets the value
// today, unless it is broad — its last part is a bare tag, like `#grid td` —
// and a rule naming the element's own class or id would win if given the
// line: then that one, as an `add`. Never `*`: editing it would move every
// element on the page — uiiFindDecl skips universal rules before they reach
// here, and the `*` arms below keep that true for a hand-made call.
function uiiEditRule(el, prop) {
  const I = uiiState.info;
  if (!I.declCache) I.declCache = new Map();
  let m = I.declCache.get(el);
  if (!m) I.declCache.set(el, (m = new Map()));
  const key = 'edit:' + prop;
  if (!m.has(key)) m.set(key, uiiFindEditRule(el, prop));
  return m.get(key);
}

function uiiFindEditRule(el, prop) {
  const d = uiiRuleDecl(el, prop);
  // No rule found reads as `*`: both mean "nothing worth editing here", so
  // the own-rule search below runs either way.
  const last = d ? uiiLastSeg(d.selector) : '*';
  // add: the line exists only because Apply to similar put it there.
  if (d && !/^(\*|[a-z][\w-]*)$/i.test(last)) return { ...d, add: !d.value };
  const own = uiiOwnRules(el).find((r) => uiiWins(el, prop, r.style));
  if (own) return { file: own.file.split('/').pop(), selector: own.selector, style: own.style, add: !uiiDeclValue(own.style, prop) };
  return d && last !== '*' ? { ...d, add: false } : null;
}

// Does any matched rule write `prop` as a value `test` accepts? Asked before
// uiiRuleDecl, whose probes restyle the whole page (~10 ms each on a 5,000-
// element page, two dozen per panel): when no candidate could give the
// answer, which one wins does not matter.
function uiiAnyDecl(el, prop, test) {
  return uiiRulesOf(el).some((r) => r.style && test(uiiDeclOrShort(r.style, prop)));
}

// The rule's variable factor for `prop` before any edit, or null.
function uiiFormula(el, prop) {
  if (!uiiAnyDecl(el, prop, uiiParseVarFactor)) return null;
  const d = uiiRuleDecl(el, prop);
  return d ? uiiVarFactor(el, d.value, parseFloat(uiiOrig(el, prop))) : null;
}

function uiiSrcNote(el) {
  const a = uiiState.opts.srcAttr;
  const v = a && el.getAttribute(a);
  return v ? ' (' + v + ')' : '';
}

// One edit as {head, decl} for the Changes box: head names the rule to edit
// ("style.css .grid-task-title"), decl is the final value only. A
// variable-driven value is written as the rule with the new factor; a
// non-px value carries its px as a comment for reference.
function uiiChangeDecl(el, c) {
  const d = uiiRuleDecl(el, c.prop);
  const f = d && uiiVarFactor(el, d.value, parseFloat(c.from));
  const cv = getComputedStyle(el).getPropertyValue(c.prop).trim();
  const now = parseFloat(cv);
  const value = f && !isNaN(now) ? uiiVarCalc(f.name, now / f.varPx) : c.to;
  // px for reference only where the value hides a length: a factor, em, %.
  const note = /^-?[\d.]+px$/.test(cv) && /calc\(|var\(|\d(em|rem|%)/.test(value) ? ' /* ' + uiiRound3(now) + 'px */' : '';
  // The rule to edit (see uiiEditRule); `add` = a line the rule lacks today.
  // No such rule: the element's path, so the AI creates one.
  const t = uiiEditRule(el, c.prop);
  return t
    ? { head: t.file + ' ' + t.selector, decl: c.prop + ': ' + value + note + (t.add ? ' /* add */' : '') }
    : { head: uiiNewRuleSel(el) + uiiSrcNote(el) + ' /* new rule */', decl: c.prop + ': ' + value + note };
}

// Matched rules whose last part names this element's id or one of its
// classes — `.grid-task`, not `td` or `*` — last in sheet order first.
function uiiOwnRules(el) {
  return uiiRulesOf(el).filter((r) => {
    const last = uiiLastSeg(r.selector);
    return (el.id && last.includes('#' + el.id)) || [...el.classList].some((c) => last.includes('.' + c));
  }).reverse();
}

/* ================= live editing: number fields =================
   A number box with a unit dropdown, ▲▼ steppers (hold to repeat), arrow
   keys, and a label that scrubs when dragged; Shift = ×10 on all of them.
   The unit shown is the one the stylesheet wrote (1.125em) when it is a
   plain value; switching unit converts, so nothing jumps on screen. */

// Units offered per property; anything not listed gets UII_UNITS_BOX.
const UII_UNITS = {
  'font-size': ['px', 'em', 'rem', '%'],
  'line-height': ['', 'px', 'em'],
  'letter-spacing': ['px', 'em'],
};
const UII_UNITS_BOX = ['px', 'em', 'rem'];

// "16px" -> {n: 16, unit: 'px'}; "normal" / "1px solid red" -> null.
function uiiParseNum(v) {
  const m = /^(-?\d*\.?\d+)([a-z%]*)$/i.exec(String(v).trim());
  return m ? { n: parseFloat(m[1]), unit: m[2] } : null;
}

// The current computed value of `prop` on `el`, written in `unit`.
// em is relative to the parent's font for font-size, the element's own
// font otherwise; '' is a unitless line-height.
function uiiConvertUnit(el, prop, unit) {
  const own = parseFloat(getComputedStyle(el).fontSize);
  let px = parseFloat(getComputedStyle(el).getPropertyValue(prop));
  if (isNaN(px)) px = prop === 'line-height' ? own * 1.2 : 0; // 'normal'
  const parent = el.parentElement ? parseFloat(getComputedStyle(el.parentElement).fontSize) : own;
  const font = prop === 'font-size' ? parent : own;
  const root = parseFloat(getComputedStyle(document.documentElement).fontSize);
  const ref = { px: 1, em: font, rem: root, '%': font / 100, '': own }[unit] || 1;
  return Math.round((px / ref) * 1000) / 1000 + unit;
}

// The unit dropdown: a variable factor first ("× --x"), then `units`.
function uiiUnitSelect(units, fx) {
  const sel = uiiEl('select', 'u');
  if (fx) {
    sel.appendChild(new Option('× ' + fx.name, 'var'));
    sel.title = 'Factor of ' + fx.name + ' (' + fx.varPx + 'px here)';
  }
  for (const u of units) sel.appendChild(new Option(u || '×', u));
  return sel;
}

// write / nudge / cur for a number field, wired to its box. c: {info, props,
// opt, fx, target, conv, box, unit, show, pxNote}; pxNote is read at call
// time, as the field sets it once its label exists.
function uiiNumWriter(c) {
  const { info, props, opt, fx, conv, box, unit } = c;
  const write = (raw) => {
    const t = String(raw).trim();
    // A bare number takes the selected unit; anything else ("auto", "1.5em",
    // "normal") is passed through as typed.
    const bare = /^-?\d*\.?\d+$/.test(t);
    const v = bare && unit() === 'var' ? uiiVarCalc(fx.name, parseFloat(t)) : bare ? t + unit() : t;
    for (const p of props) (opt.own ? uiiSetOwn(info.el, p, v) : uiiSet(info, p, v));
    c.show(v);
    if (c.others) c.others();
    if (opt.onSet) opt.onSet(v);
    c.pxNote();
  };
  const step = () => opt.step || (unit() === 'var' ? 0.01 : unit() === 'px' || unit() === '%' ? 1 : 0.1);
  // Number now; for "normal" / "auto" / Mixed the computed value in the shown unit.
  const cur = () => {
    const n = parseFloat(box.value);
    return isNaN(n) ? parseFloat(conv(unit())) : n;
  };
  // Sizes, padding and radius below 0 are invalid CSS — the text would vanish.
  const min = /^(margin|letter-spacing)/.test(props[0]) ? -Infinity : 0;
  const nudge = (start, steps) => {
    if (!isNaN(start)) write(String(Math.max(min, Math.round((start + steps * step()) * 1000) / 1000)));
  };
  box.addEventListener('change', () => write(box.value));
  uiiEnterKeeps(box);
  box.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      nudge(cur(), (e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? 10 : 1));
    }
  });
  return { write, nudge, cur };
}

// opt: {units: [...] | null (no unit), step, onSet(v)}
function uiiNumField(info, label, props, opt) {
  props = [].concat(props);
  opt = opt || {};
  const units = 'units' in opt ? opt.units : (UII_UNITS[props[0]] || UII_UNITS_BOX);
  const target = opt.own ? info.el : uiiTargetEl(info, props[0]);
  const val = (p) => uiiEditValue(info, p, opt.own);
  const wrap = uiiEl('span', 'nf');
  const box = uiiEl('input');
  box.spellcheck = false;
  wrap.appendChild(box);
  // calc(var(--x) * k) in the stylesheet: the box edits k, unit "× --x".
  const fx = units ? uiiFormula(target, props[0]) : null;
  const sel = units ? wrap.appendChild(uiiUnitSelect(units, fx)) : null;
  const unit = () => (sel ? sel.value : '');
  const show = (v) => {
    box.placeholder = '';
    const f = fx && uiiParseVarFactor(v);
    if (f) { box.value = String(f.k); sel.value = 'var'; return; }
    const p = uiiParseNum(v);
    box.value = p ? String(p.n) : v;
    if (!sel || !p) return;
    if (![...sel.options].some((o) => o.value === p.unit)) sel.appendChild(new Option(p.unit, p.unit));
    sel.value = p.unit;
  };
  show(val(props[0]));
  // A ↕ / ↔ pair whose sides differ shows no number: either one would lie.
  // The first write sets both sides; show() clears the placeholder.
  if (new Set(props.map(val)).size > 1) { box.value = ''; box.placeholder = 'Mixed'; }
  // em and % are read off the element the edit lands on, which is not always
  // the one the field shows (see uiiWriteEl). Asked at conversion time: the
  // answer costs a rule probe, and only switching a unit needs it.
  const conv = (u) => uiiConvertUnit(opt.own ? info.el : uiiWriteEl(info, props[0]), props[0], u);
  const c = { info, props, opt, fx, target, conv, box, unit, show };
  uiiNumSync(c, val);
  const { write, nudge, cur } = uiiNumWriter(c);
  if (sel) sel.addEventListener('change', () => write(sel.value === 'var'
    ? uiiVarCalc(fx.name, parseFloat(getComputedStyle(target).getPropertyValue(props[0])) / fx.varPx)
    : conv(sel.value)));
  wrap.appendChild(uiiStepper((d) => nudge(cur(), d)));
  if (opt.compact) return uiiNumCompact(wrap, c);
  const fld = uiiFld(label, wrap, props, target);
  // A factor, em or % says nothing about the size on screen: "Size (13.2px)".
  c.pxNote = () => {
    const px = parseFloat(getComputedStyle(target).getPropertyValue(props[0]));
    fld.lab.textContent = label + (unit() && unit() !== 'px' && !isNaN(px) ? ' (' + uiiRound3(px) + 'px)' : '');
  };
  c.pxNote();
  uiiScrub(fld.lab, cur, nudge);
  fld.set = show;
  return fld;
}

// ▲▼ pair: click steps once, holding repeats after 400ms.
function uiiStepper(bump) {
  const st = uiiEl('span', 'st');
  for (const [d, ch] of [[1, '▲'], [-1, '▼']]) {
    const b = uiiEl('button', '', ch);
    b.type = 'button';
    b.tabIndex = -1;
    b.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return; // a right-click opens no menu here, and must not step
      e.preventDefault();
      const k = d * (e.shiftKey ? 10 : 1);
      uiiHold(true);
      bump(k);
      let timer = setTimeout(function rep() { bump(k); timer = setTimeout(rep, 60); }, 400);
      // blur too: a mouseup outside the window (alt-tab) never arrives.
      const stop = () => {
        clearTimeout(timer); uiiHold(false);
        window.removeEventListener('mouseup', stop, true);
        window.removeEventListener('blur', stop);
      };
      window.addEventListener('mouseup', stop, true);
      window.addEventListener('blur', stop);
    });
    st.appendChild(b);
  }
  return st;
}

// Drag a label left/right to change the number: one step per 2px, applied at
// most once a frame. Capture listeners on window, like the header drag.
function uiiScrub(handle, read, apply) {
  handle.classList.add('scrub');
  handle.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    const sx = e.clientX, start = read();
    let want = 0, done = 0, raf = 0;
    const flush = () => { raf = 0; if (want !== done) { done = want; apply(start, want); } };
    const move = (m) => {
      want = Math.round((m.clientX - sx) / 2) * (m.shiftKey ? 10 : 1);
      if (!raf) raf = requestAnimationFrame(flush);
    };
    const up = () => {
      window.removeEventListener('mousemove', move, true);
      window.removeEventListener('mouseup', up, true);
      window.removeEventListener('blur', up);
      if (raf) cancelAnimationFrame(raf);
      flush();
      uiiHold(false);
    };
    uiiHold(true);
    window.addEventListener('mousemove', move, true);
    window.addEventListener('mouseup', up, true);
    window.addEventListener('blur', up); // a mouseup outside the window never arrives
    e.preventDefault();
  });
}

/* ================= live editing: own value vs what the text shows =================
   Text properties (font-size, line-height, letter-spacing) are read off the
   element that draws the text, which can differ from the pinned one: a child
   with a rule of its own overrides it. Then the field of the pinned element's
   own value gets a compact ↳ row under it for the value on screen, as the
   Color card does. Editing either refreshes the other. */

// Refresh callbacks of the fields that show one value from two angles.
function uiiSyncReset() { if (uiiState.panel) uiiState.panel.synced = []; }
function uiiSyncAdd(fn) { const P = uiiState.panel; if (P && P.synced) P.synced.push(fn); }
function uiiSyncOthers(self) {
  const P = uiiState.panel;
  if (P && P.synced) for (const r of P.synced) if (r !== self) r();
}

// Called by uiiNumField for the pair's two halves.
function uiiNumSync(c, val) {
  if (!c.opt.own && !c.opt.compact) return;
  const refresh = () => { c.show(val(c.props[0])); c.pxNote(); };
  uiiSyncAdd(refresh);
  c.others = () => uiiSyncOthers(refresh);
}

// The ↑ row: just the control, no label, reset key or source line.
function uiiNumCompact(wrap, c) {
  c.pxNote = () => {};
  wrap.prepend(uiiEl('span', 'os', '↳'));
  wrap.title = 'On screen';
  return { f: wrap, set: c.show };
}

// A text number field; when the text shows another value than the pinned
// element sets, the own field plus the on-screen row.
function uiiNumSlot(info, label, props) {
  const first = [].concat(props)[0];
  const text = uiiTargetEl(info, first);
  const diff = text !== info.el && UII_TEXT_PROPS.includes(first)
    && getComputedStyle(info.el).getPropertyValue(first) !== getComputedStyle(text).getPropertyValue(first);
  if (!diff) return uiiNumField(info, label, props).f;
  const f = uiiNumField(info, label, props, { own: true }).f;
  f.appendChild(uiiNumField(info, label, props, { compact: true }).f);
  uiiMarkOverridden(f);
  return f;
}

/* ================= color picker: the swatch and the one shared panel =========
   Every place that picks a color shows a swatch; clicking it opens the
   vendored color-picker (vendor/) as a popover under that swatch. One picker
   serves them all: opening it for another swatch re-aims it. It lives on the
   shadow root, so the page's CSS cannot reach it. */

// Over the panel (…003) and its var list (…004).
const UII_CP_TWEAKS = '.cp-root { z-index: 2147483005; }'
  + ' .cp-root .cpf { margin: 0 14px 4px; padding: 6px 9px; border-radius: 8px; background: var(--cp-surface-alt);'
  + ' border: 1px solid var(--cp-line); font-size: 11px; line-height: 1.45; }'
  + ' .cp-root .cpf code { display: block; font: 11px ui-monospace, Consolas, monospace; color: var(--cp-ink);'
  + ' word-break: break-all; user-select: text; }'
  + ' .cp-root .cpf small { display: block; color: var(--cp-subtle); font-size: 10px; }';

// The Text and Background swatches of the card on screen. Opening either one
// shows both in the picker (Text tab first), so the pair is tuned together.
const uiiCpPair = {};
const UII_CP_SLOTS = [
  { id: 'text', label: 'Text', symbol: 'Aa', presetSet: 'text' },
  { id: 'background', label: 'Background', symbol: '■', presetSet: 'background' },
];

// A swatch with the surface of the <input type=color> it replaces: `.value`
// reads and writes a #rrggbb; `onPick` gets each color picked from the panel.
// `slot` ('text' | 'background') enrols it in the pair above. `formula()`
// answers { code, src }: how the page's CSS writes this color, shown in the popup.
function uiiColorSwatch(initial, onPick, slot, formula) {
  const btn = uiiEl('button', 'pick');
  btn.type = 'button';
  btn.title = 'Pick a color';
  let value = '#000000';
  Object.defineProperty(btn, 'value', {
    get: () => value,
    set: (v) => {
      // Fully transparent paints nothing: show the checkerboard (.hollow), and give the picker a valid #rrggbbaa.
      const hollow = v === 'transparent' || /^#[0-9a-f]{6}00$/i.test(v);
      value = v === 'transparent' ? '#00000000' : v;
      btn.classList.toggle('hollow', hollow);
      btn.style.background = hollow ? '' : v;
    },
  });
  btn.value = initial;
  const me = { swatch: btn, onPick, formula };
  if (slot) uiiCpPair[slot] = me;
  btn.addEventListener('click', () => uiiOpenPicker(btn, me, slot));
  return btn;
}

// Private state: the one picker, what it is aimed at, and whether a pick is held.
let uiiCp = null;     // the library instance, built on first use
let uiiCpUse = null;  // { anchor, targets: {slot: {swatch, onPick}}, last } it serves; null = none, writes ignored
let uiiCpKind = '';   // 'pair' | 'single': the slots the instance was built with
let uiiCpHeld = false;
let uiiCpFormula = null; // the line in the popup that says how the CSS writes the color

// Fill the formula line for the tab in view.
function uiiShowFormula() {
  if (!uiiCp || !uiiCpFormula || !uiiCpUse) return;
  const f = uiiCpUse.formulas[uiiCp.activeSlot];
  uiiCpFormula.replaceChildren();
  uiiCpFormula.hidden = !f;
  if (!f) return;
  uiiCpFormula.append(uiiEl('code', '', f.code));
  if (f.src) uiiCpFormula.append(uiiEl('small', '', f.src));
}

function uiiBuildPicker(paired) {
  // The library takes an element for a container, not a shadow root.
  const old = uiiState.shadow.getElementById('color-picker');
  if (old) old.remove(); // destroy() may leave its mount; ids stay unique
  const mount = uiiState.shadow.appendChild(uiiEl('div', '', undefined, 'color-picker'));
  const picker = new UiiColorPicker({
    container: mount,
    mode: 'popover',
    showAlpha: true, // #rrggbb, or #rrggbbaa when translucent
    ...(paired ? { slots: UII_CP_SLOTS } : { initialColors: { color: '#000000' } }),
    onChange: (c) => {
      const use = uiiCpUse;
      if (!use) return;
      // The whole pick is one undo step and one rule rewrite, like a drag.
      if (!uiiCpHeld) { uiiCpHeld = true; uiiHold(true, true); }
      for (const id of Object.keys(use.targets)) {
        if (c[id] === use.last[id]) continue;
        use.targets[id].onPick(c[id]);
        use.targets[id].swatch.value = c[id]; // the one place a pick repaints its swatch
      }
      use.last = { ...c };
    },
    onClose: () => {
      if (uiiCpHeld) { uiiCpHeld = false; uiiHold(false); }
      uiiCpUse = null;
    },
  });
  // Above the editor, where it reads with the tabs; follows a tab change.
  uiiCpFormula = uiiEl('div', 'cpf');
  picker.root.querySelector('.cp-editor').before(uiiCpFormula);
  const later = () => setTimeout(uiiShowFormula, 0);
  picker.root.addEventListener('click', later);
  picker.root.addEventListener('keyup', later);
  return picker;
}

function uiiOpenPicker(anchor, me, slot) {
  const onPick = me.onPick;
  // Both halves of the pair must be on screen, else this swatch goes alone.
  const mate = slot === 'text' ? 'background' : 'text';
  const peer = slot && uiiCpPair[mate];
  const paired = !!(peer && peer.swatch.isConnected && uiiCpPair[slot].swatch === anchor);
  // A press on an open picker's own swatch closes it (the library lets that
  // press through, see vendor/ header), so the click only has to toggle.
  if (uiiCp && uiiCp.isOpen && uiiCpUse && uiiCpUse.anchor === anchor) { uiiCp.dismiss(); return; }
  if (uiiCp && uiiCp.isOpen) uiiCp.close();
  const kind = paired ? 'pair' : 'single';
  if (uiiCp && uiiCpKind !== kind) { uiiCp.destroy(); uiiCp = uiiCpFormula = null; }
  if (!uiiCp) { uiiCp = uiiBuildPicker(paired); uiiCpKind = kind; }
  // setColors emits onChange: aim at nothing first, or switching swatches writes.
  uiiCpUse = null;
  const targets = paired
    ? { [slot]: me, [mate]: peer }
    : { color: me };
  const last = Object.fromEntries(Object.entries(targets).map(([id, t]) => [id, t.swatch.value]));
  uiiCp.setColors(last);
  if (paired) uiiCp.setActiveSlot(slot);
  const formulas = {};
  for (const id of Object.keys(targets)) formulas[id] = targets[id].formula && targets[id].formula();
  uiiCpUse = { anchor, targets, last, formulas };
  uiiCp.open(anchor);
  uiiShowFormula();
}

function uiiColorPickerOpen() { return !!uiiCp && uiiCp.isOpen; }
function uiiDismissColorPicker() { if (uiiColorPickerOpen()) uiiCp.dismiss(); }
function uiiCloseColorPicker() { if (uiiColorPickerOpen()) uiiCp.close(); }
function uiiDestroyColorPicker() {
  if (uiiCpHeld) { uiiCpHeld = false; uiiHold(false); } // never leave an undo step open
  if (uiiCp) uiiCp.destroy();
  uiiCp = uiiCpUse = uiiCpFormula = null;
  uiiCpKind = '';
}

/* ================= live editing: color fields =================
   A color either sits on the element or comes from a variable. The picker
   below edits whichever the dropdown points at, so moving a palette entry
   moves every rule that reads it. Split out of editfields.js to keep each
   file short. */

// Shorthands that can carry a color: CSSOM leaves the longhand empty when
// the shorthand holds a var(), so the var has to be read off the shorthand.
const UII_COLOR_SHORTHAND = { 'background-color': 'background', 'border-color': 'border' };

// Which tab of the shared picker a color field's swatch opens on.
const UII_PAIR_SLOT = { color: 'text', 'background-color': 'background' };

// The side the border color field speaks for: the first one that draws a
// line. A rule like `td { border-bottom: 1px solid var(--x) }` leaves the top
// at currentColor, which is not the color anyone sees.
function uiiBorderSides(el) {
  const cs = getComputedStyle(el);
  return ['top', 'right', 'bottom', 'left'].filter((s) =>
    parseFloat(cs.getPropertyValue('border-' + s + '-width')) > 0 && cs.getPropertyValue('border-' + s + '-style') !== 'none');
}
// A transparent side (the grid's 18px panel gap on a sprint header cell) draws
// nothing anyone sees, so a visible side comes first.
function uiiBorderDrawnSide(el) {
  const cs = getComputedStyle(el), sides = uiiBorderSides(el);
  return sides.find((s) => !uiiIsTransparent(cs.getPropertyValue('border-' + s + '-color'))) || sides[0];
}
// The border as one copyable line, from the side the fields speak for.
function uiiBorderText(el) {
  const cs = getComputedStyle(el), s = 'border-' + uiiBorderSide(el);
  return cs.getPropertyValue(s + '-width') + ' ' + cs.getPropertyValue(s + '-style') + ' ' + uiiToHex(cs.getPropertyValue(s + '-color'));
}
function uiiBorderSide(el) { return uiiBorderDrawnSide(el) || 'top'; }

// Like uiiVarName, but only a var() that IS the color (or a token of a
// shorthand): one inside color-mix(), rgb(from …) and the like only feeds a
// derived color, and the field would show the variable's, not the result.
function uiiColorVarName(v) {
  const s = String(v || '');
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '(') depth++;
    else if (s[i] === ')') depth--;
    else if (depth === 0 && s.startsWith('var(', i) && !/[\w-]/.test(s[i - 1] || '')) return uiiVarName(s.slice(i));
  }
  return '';
}

// The variable this color comes from, '' when it is written out in full.
function uiiColorVarOf(el, prop) {
  const d = uiiAnyDecl(el, prop, uiiColorVarName) && uiiRuleDecl(el, prop);
  const named = uiiColorVarName(d && d.value);
  // A winner that is not a var ("transparent", a hex) is the answer: the sheet-order scan below
  // would name a losing rule's var instead.
  if (named || d || !UII_COLOR_SHORTHAND[prop]) return named;
  const rules = uiiRulesOf(el);
  const heads = [UII_COLOR_SHORTHAND[prop]];
  if (prop === 'border-color') heads.unshift('border-' + uiiBorderSide(el), 'border-' + uiiBorderSide(el) + '-color');
  for (let i = rules.length - 1; i >= 0; i--) {
    if (!rules[i].style) continue;
    for (const h of heads) {
      const n = uiiColorVarName(uiiDeclValue(rules[i].style, h));
      if (n) return n;
    }
  }
  return '';
}

// The hex a variable resolves to on this element, '' when it is not a color.
function uiiVarHex(info, name, el) {
  const v = info.colorVars.find((c) => c.name === name);
  if (v) return v.hex;
  const raw = getComputedStyle(el).getPropertyValue(name).trim();
  return raw ? uiiToHex(uiiNormColor(raw) || raw) : '';
}

// The variable dropdown as a custom list: a native <select> cannot draw a
// swatch in an option, and a name alone rarely says which color it is.
// Same surface as the <select> it replaces: .value, and a 'change' event.
// The list lives on the shadow root, not in the panel, so the panel's
// scrolling body does not clip it.
// `kind` 'line': the same list for border styles — no "none" entry, a stroke
// of the style where a color swatch would be.
function uiiVarPicker(names, target, kind) {
  const S = uiiState;
  const btn = uiiEl('button', 'cv');
  btn.type = 'button';
  let value = '';
  Object.defineProperty(btn, 'value', {
    get: () => value,
    set: (v) => { value = v; btn.textContent = v || (kind ? '' : '— none —'); },
  });
  // Read live: a variable edited through the swatch has moved since collect.
  const hexOf = (n) => {
    const raw = getComputedStyle(target).getPropertyValue(n).trim();
    return raw ? uiiToHex(uiiNormColor(raw) || raw) : '';
  };
  btn.addEventListener('click', () => {
    const mine = S.cvList && S.cvList.owner === btn;
    uiiCloseVarList();
    if (mine) return; // second click on the button closes it
    const list = uiiEl('div', 'cvl');
    list.owner = btn;
    for (const n of kind ? names : ['', ...names]) {
      const it = list.appendChild(uiiEl('button', n === value ? 'on' : ''));
      it.type = 'button';
      it.appendChild(uiiEl('span', 'n', n || '— none —'));
      const hex = !kind && n && hexOf(n);
      if (kind) {
        const ln = uiiEl('i', 'ln');
        ln.style.borderTopStyle = n;
        it.appendChild(ln);
      } else if (hex) {
        const sw = uiiEl('i');
        sw.style.background = hex;
        it.append(sw, uiiEl('span', 'h', hex));
      }
      it.addEventListener('click', () => {
        uiiCloseVarList();
        if (n === value) return;
        btn.value = n;
        btn.dispatchEvent(new Event('change'));
      });
    }
    const r = btn.getBoundingClientRect();
    list.style.right = Math.max(4, window.innerWidth - r.right) + 'px';
    list.style.top = (r.bottom + 244 < window.innerHeight ? r.bottom + 2 : Math.max(4, r.top - 244)) + 'px';
    S.shadow.appendChild(list);
    // A long palette scrolls: the value in force opens in view, not below it.
    const on = list.querySelector('.on');
    if (on) on.scrollIntoView({ block: 'nearest' });
    // Close on a press anywhere else, or when the panel scrolls under it.
    const down = (e) => { if (!e.composedPath().some((t) => t === list || t === btn)) uiiCloseVarList(); };
    const scroll = (e) => { if (e.target !== list) uiiCloseVarList(); };
    window.addEventListener('pointerdown', down, true);
    S.shadow.addEventListener('scroll', scroll, true);
    list.off = () => {
      window.removeEventListener('pointerdown', down, true);
      S.shadow.removeEventListener('scroll', scroll, true);
    };
    S.cvList = list;
  });
  return btn;
}

function uiiCloseVarList() {
  const l = uiiState.cvList;
  if (!l) return;
  uiiState.cvList = null;
  l.off();
  l.remove();
}

// Typing a color string applies it on the spot; Enter is no longer needed.
// Half-typed text ("#1f", "rgb(") is not a color yet and is left alone.
// One burst of typing is one undo step, closed 600ms after the last key.
function uiiLiveColor(box, write) {
  let timer = 0;
  const end = () => { if (timer) { clearTimeout(timer); timer = 0; uiiUndoEnd(); } };
  box.addEventListener('change', end);
  box.addEventListener('input', () => {
    const v = box.value.trim();
    if (!v || !CSS.supports('color', v)) return;
    if (timer) clearTimeout(timer); else uiiUndoBegin();
    timer = setTimeout(end, 600);
    write(v);
  });
}

/* ================= live editing: the Color card =================
   Text and Background are the colors this element sets. When what is drawn
   on screen differs (a child's text color, the ancestor that paints through a
   transparent background) it follows as a compact ↳ row under the field, no
   label or source line. Editing one refreshes the others. */

// A color either sits on the element (#1f2937) or comes from a variable
// (var(--bg)). The dropdown says which, and the picker edits whatever the
// dropdown points at: on a variable it moves that palette entry, so every
// rule using it follows; on "— none —" the element gets a color of its own
// again. Pointing a color at a different variable is the dropdown alone.
// `own`: the pinned element's own value; else the one painted on screen, as
// the bare ↳ row (`compact`) when it sits under the own field.
function uiiColorField(info, label, prop, own, compact) {
  const painter = !own && prop === 'background-color' && info.bg.from && info.bg.el;
  const target = own ? info.el : painter || uiiTargetEl(info, prop);
  // The ↳ row of a transparent element edits the ancestor that paints it.
  const put = (v) => (own ? uiiSetOwn(info.el, prop, v) : painter ? uiiSetOwn(painter, prop, v) : uiiSet(info, prop, v));
  const cur = () => {
    // On screen: read live, an edit elsewhere may or may not reach this element.
    if (!own && prop === 'background-color') return uiiToHex(uiiEffectiveBg(info.el).rgb);
    if (!own && prop === 'color') return uiiToHex(getComputedStyle(target).color);
    if (!own) return uiiEditValue(info, prop);
    const e = uiiEditsFor(info.el, false);
    return e && prop in e.props ? e.props[prop] : uiiToHex(getComputedStyle(info.el).getPropertyValue(prop));
  };
  const wrap = uiiEl('span', 'nf');
  const pick = uiiColorSwatch('#000000', (v) => write(v), UII_PAIR_SLOT[prop], () => uiiDeclared(target, prop)); // write is defined below, used on click
  const box = uiiEl('input');
  box.spellcheck = false;
  const named = uiiColorVarOf(target, prop);
  const names = info.colorVars.map((c) => c.name);
  // A var the palette list missed (it resolves to something uiiColorVars does
  // not read as a color) still belongs in the list: it is the current answer.
  if (named && !names.includes(named)) names.push(named);
  const sel = uiiVarPicker(names, target);
  if (painter) wrap.title = 'Painted by ' + info.bg.from + ' (this element is transparent)';
  sel.title = 'Which variable this color comes from. Pick one and the swatch'
    + ' edits the variable itself — every element using it changes.';
  sel.value = named;
  const show = (v) => { box.value = v; if (v === 'transparent' || /^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/i.test(v)) pick.value = v; };
  const refresh = () => show(sel.value ? uiiVarHex(info, sel.value, target) : cur());
  refresh();
  if (prop !== 'border-color') uiiSyncAdd(refresh);
  const others = () => uiiSyncOthers(refresh);
  // One write, two places it can land.
  const write = (v) => {
    if (sel.value) uiiVarApply(sel.value, v, target); else put(v);
    show(v);
    others();
  };
  box.addEventListener('change', () => write(box.value.trim()));
  uiiLiveColor(box, write);
  uiiEnterKeeps(box);
  sel.addEventListener('change', () => {
    put(sel.value ? 'var(' + sel.value + ')' : box.value.trim());
    if (sel.value) show(uiiVarHex(info, sel.value, target));
    others();
  });
  if (compact) wrap.append(uiiEl('span', 'os', '↳'));
  wrap.append(pick, box, sel);
  if (compact) return wrap;
  // No side draws a line: the color is real but invisible. Still editable.
  if (prop === 'border-color' && !uiiBorderDrawnSide(target)) {
    wrap.classList.add('idle');
    wrap.title = 'No border is drawn (style none or width 0), so this color is not visible yet';
  }
  return uiiFld(label, wrap, prop, target).f;
}

// One slot: the own field, and the on-screen row under it only when it differs.
function uiiColorSlot(info, label, prop, same) {
  const f = uiiColorField(info, label, prop, true);
  if (!same) {
    f.appendChild(uiiColorField(info, label, prop, false, true)).title = 'On screen';
    uiiMarkOverridden(f);
  }
  return f;
}

function uiiColorCard(info) {
  uiiSyncReset();
  const text = uiiTargetEl(info, 'color');
  return uiiCard('Color', uiiPair(
    uiiColorSlot(info, 'Text', 'color', getComputedStyle(info.el).color === getComputedStyle(text).color),
    uiiColorSlot(info, 'Background', 'background-color', !info.bg.from)));
}

/* ================= the page's variables =================
   The palette without an element. Every custom property the sheets declare,
   the value it resolves to, and a box to try another one — for the question
   "what happens to the page if this token moves", which has no one element to
   click. Edits go through uiiVarApply, the same path the color fields use,
   so they show at once, land in the Changes box and come back with Reset. */

// [{name, value, hex}] — colors first, a swatch says more than a name; each
// group by name. A var only an inactive theme block sets (`.dark { --bg }`
// under the light theme) resolves to nothing here and is left out: there is
// no value to show and editing it would change nothing on screen.
function uiiPageVars(all) {
  const cs = getComputedStyle(document.documentElement);
  const out = [];
  for (const name of uiiVarNames(all)) {
    const value = cs.getPropertyValue(name).trim();
    if (!value) continue;
    out.push({ name, value, hex: uiiRowHex(value) });
  }
  return out.sort((a, b) => (a.hex ? 0 : 1) - (b.hex ? 0 : 1) || a.name.localeCompare(b.name));
}

// The hex of a value that is a color, '' when it is not one.
function uiiRowHex(value) {
  const rgb = value && value.length <= 40 ? uiiNormColor(value) : null; // shadows, font stacks: never a color
  return rgb ? uiiToHex(rgb) : '';
}

// One row of a value list: the name, a picker when the value is a color, and
// a box that writes through `set`. Edited rows carry .on, the mark the color
// list uses for the value in force. Shared by the palette and by the pinned
// element's own declarations (editprops.js).
function uiiValueRow(name, value, set, resetName) {
  const row = uiiEl('div', 'vr');
  row.dataset.name = name.toLowerCase();
  const wrap = uiiEl('span', 'nf');
  const box = uiiEl('input');
  box.spellcheck = false;
  box.value = value;
  const write = (val) => {
    box.value = val;
    set(val);
    row.classList.add('on');
  };
  const hex = uiiRowHex(value);
  if (hex) {
    // The picker takes #rrggbb[aa]; "transparent" shows hollow. Anything else falls back to black.
    wrap.appendChild(uiiColorSwatch(hex === 'transparent' || /^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/i.test(hex) ? hex : '#000000', write));
  }
  box.addEventListener('change', () => write(box.value.trim()));
  if (hex) uiiLiveColor(box, write);
  uiiEnterKeeps(box);
  wrap.appendChild(box);
  row.append(uiiEl('span', 'n', name), wrap);
  // A row that writes exactly one property or variable gets a key for it; a
  // composite label (a state rule's "selector · prop") names no single value,
  // so it passes null and goes without.
  if (resetName) row.insertBefore(uiiResetKey(resetName), row.firstChild);
  return { row, box };
}

function uiiVarRow(v) {
  const r = uiiValueRow(v.name, v.value, (val) => uiiVarApply(v.name, val, document.documentElement), v.name);
  // An edit made here or from a color field, before this list was built.
  const e = uiiVarEdits.get(v.name);
  if (e) { r.box.value = e.to; r.row.classList.add('on'); }
  return r.row;
}

// A filter box over a list of rows, each named by data-name. A row marked
// data-keep (the "add a property" row) stays whatever is typed.
function uiiFindBox(find, list) {
  find.placeholder = 'Filter';
  find.spellcheck = false;
  // Inside a <summary> every click toggles the section: not this one.
  find.addEventListener('click', (e) => e.stopPropagation());
  find.addEventListener('keydown', (e) => e.stopPropagation());
  find.addEventListener('input', () => {
    const q = find.value.trim().toLowerCase();
    for (const r of list.children) {
      if (!r.dataset.keep) r.hidden = !!q && !(r.dataset.name || '').includes(q);
    }
  });
}

// The list, with a filter in its header: an app's palette runs to hundreds of
// names, and the one being tried is usually known by part of it.
function uiiRenderVars(body) {
  const vars = uiiPageVars(uiiState.all);
  const head = uiiEl('div', 'sec', 'Variables ', 'section-vars');
  const find = uiiEl('input', 'find', undefined, 'filter-vars');
  const copy = uiiEl('button', 'mini', '📋 Copy', 'copy-vars');
  copy.title = 'Copy every variable as a :root block, edits included';
  // Read at click time, so edits made since the list was built are in it.
  copy.addEventListener('click', (e) => {
    e.stopPropagation();
    const lines = uiiPageVars(uiiState.all).map((v) => `  ${v.name}: ${v.value};`);
    uiiCopy(`:root {\n${lines.join('\n')}\n}`, copy);
  });
  const imp = uiiEl('button', 'mini', '📥 Import', 'import-vars');
  imp.title = 'Apply --name: value pairs from the clipboard (one undo step)';
  imp.addEventListener('click', (e) => { e.stopPropagation(); uiiImportVars(); });
  head.append(find, copy, imp);
  const list = uiiEl('div', 'vrs', undefined, 'vars-list');
  for (const v of vars) list.appendChild(uiiVarRow(v));
  if (!vars.length) list.appendChild(uiiEl('div', 'vnone', 'No custom properties in the stylesheets this page lets us read.'));
  uiiFindBox(find, list);
  body.append(head, list);
  return vars.length;
}

/* States: the colors a rule only paints while a state holds — :hover,
   :focus, :disabled… The list above shows values in force now; these wait
   for a pointer or a key, so they are listed rule by rule, grouped by state.
   Editing one rewrites that rule, through the same records as a variable. */
const UII_STATES = [[':hover', /:hover/], [':focus', /:focus/], [':active', /:active/],
  [':disabled', /:disabled|\[disabled|\[aria-disabled/], [':read-only', /:read-only|\[readonly/],
  [':checked / selected', /:checked|\[aria-(checked|selected)/],
  [':invalid', /:(user-)?invalid|\[aria-invalid/], ['::placeholder', /::?placeholder/], [':visited', /:visited/]];
const UII_COLOR_PROP = /(^|-)color$|^(background|border(-(top|right|bottom|left))?|outline|fill|stroke|box-shadow|text-shadow)$/;

// [[label, [{style, prop, pri, value, file, selector}]]], empty groups left
// out. cssText, not the longhands: `background: var(--x)` leaves every
// longhand empty and only the shorthand says what the rule meant. A selector
// list naming two states lands in the first one.
function uiiStateDecls(all) {
  const groups = new Map(UII_STATES.map(([label]) => [label, []]));
  for (const { rule, file } of all) {
    const st = UII_STATES.find(([, re]) => re.test(rule.selectorText));
    if (!st) continue;
    for (const [, prop, raw] of rule.style.cssText.matchAll(/([\w-]+)\s*:\s*([^;]+)/g)) {
      const pri = /!important\s*$/.test(raw) ? 'important' : '';
      const value = raw.replace(/\s*!important\s*$/, '').trim();
      if (prop.startsWith('--') ? !uiiRowHex(value) : !UII_COLOR_PROP.test(prop)) continue;
      groups.get(st[0]).push({ style: rule.style, prop, pri, value, file, selector: rule.selectorText });
    }
  }
  return [...groups].filter(([, rows]) => rows.length);
}

function uiiRenderStates(body, all) {
  const groups = uiiStateDecls(all);
  const n = groups.reduce((s, [, rows]) => s + rows.length, 0);
  const wrap = uiiEl('details', 'more');
  const sum = uiiEl('summary', 'sec', 'States — ' + n + ' ', 'section-states');
  const find = uiiEl('input', 'find', undefined, 'filter-states');
  sum.appendChild(find);
  const list = uiiEl('div', 'vrs', undefined, 'states-list');
  let edited = false;
  for (const [label, rows] of groups) {
    list.appendChild(uiiEl('div', 'vgrp', label));
    for (const d of rows) {
      const key = uiiDeclKey(d.style, d.prop);
      const { row } = uiiValueRow(d.selector + ' · ' + d.prop, d.value, (val) => uiiDeclSet(key, val, () => ({
        style: d.style, prop: d.prop, pri: d.pri, file: d.file.split('/').pop(),
        selector: d.selector, from: d.value, add: false })));
      row.dataset.name += ' ' + label; // "hover" finds the whole group
      row.querySelector('.n').title = d.selector + ' { ' + d.prop + ' }'; // the name is cut short
      if (uiiVarEdits.has(key)) { row.classList.add('on'); edited = true; }
      list.appendChild(row);
    }
  }
  if (!n) list.appendChild(uiiEl('div', 'vnone', 'No color rules for hover, focus, disabled… in the stylesheets this page lets us read.'));
  uiiFindBox(find, list);
  wrap.open = n <= 12 || edited;
  wrap.append(sum, list);
  body.appendChild(wrap);
}

// The other half of Copy: any text holding `--name: value` pairs — a :root
// block, a bare list, one line — lands as one undo step. The clipboard read
// can be refused (permission, plain http): a prompt takes the paste instead.
async function uiiImportVars() {
  let text = null;
  try { text = await navigator.clipboard.readText(); } catch (_) { /* refused */ }
  if (!text || !text.includes('--')) text = prompt('Paste the palette (--name: value; …)');
  if (!text) return;
  const pairs = [...text.matchAll(/(--[\w-]+)\s*:\s*([^;}]+)/g)];
  if (!pairs.length) { uiiFlash('No --variables found'); return; }
  uiiUndoBegin();
  try { for (const [, name, value] of pairs) uiiVarApply(name, value.trim(), document.documentElement); }
  finally { uiiUndoEnd(); }
  if (uiiState.varsMode) uiiVarsPanel();
  uiiFlash('✅ imported ' + pairs.length + (pairs.length === 1 ? ' var' : ' vars'));
}

// The palette as a panel mode: it needs no element, so it opens the panel on
// its own. The rule list is collected here — uiiVarApply reads it to find the
// rule that declares a variable, and with nothing pinned there is no info to
// carry it.
function uiiVarsPanel() {
  const S = uiiState, P = S.panel;
  if (!P) return;
  S.all = uiiAllRules();
  P.name.textContent = 'Variables';
  P.body.textContent = '';
  const n = uiiRenderVars(P.body);
  P.tag.textContent = n + (n === 1 ? ' var' : ' vars');
  uiiRenderStates(P.body, S.all);
  uiiChangesBox(P.body);
  P.reset.disabled = !uiiVarEdits.size;
  P.root.classList.add('on');
}

// P, and the header button. Leaving the mode goes back to the pinned element
// when there is one, and closes the panel when there is not.
function uiiToggleVars() {
  const S = uiiState;
  if (!S.panel) return;
  uiiCloseVarList();
  uiiCloseColorPicker();
  uiiHoldPanelSize(S.panel.root);
  S.varsMode = !S.varsMode;
  S.panel.vars.classList.toggle('on', S.varsMode);
  if (S.varsMode) {
    uiiVarsPanel();
    // Only on the switch: uiiVarsPanel also re-renders after undo/reset.
    S.panel.body.querySelector('input.find').focus();
  } else if (S.info) uiiRenderPanel(S.info);
  else S.panel.root.classList.remove('on');
}

/* ================= the pinned element's own declarations =================
   The cards above cover the properties worth a dedicated control. This is the
   rest: every property the element's matched rules actually set, every
   variable those rules read, and a box for anything they do not mention yet.
   Values are written through uiiSet and uiiVarApply, so the Changes box and
   Reset treat them like any other edit. */

// The declarations a rule writes, as authored: [{name, value}]. Not the
// CSSOM property list — that expands `font:` into eighteen longhands and
// leaves `background-color` empty when the shorthand carries the var(), which
// is both noise and a lost variable. The text of a rule the inspector has
// rewritten is its text before that (uiiRuleText), so the list says what the
// stylesheet says.
function uiiDeclList(style) {
  const text = uiiRuleText.get(style) || style.cssText || '';
  const out = [];
  for (const part of text.split(';')) {
    const i = part.indexOf(':');
    const name = i < 0 ? '' : part.slice(0, i).trim();
    const value = i < 0 ? '' : part.slice(i + 1).trim();
    // A ';' inside a value (a data: URI) splits a declaration in two; the
    // halves have no property name and drop out here.
    if (/^-{0,2}[a-z][\w-]*$/i.test(name) && value) out.push({ name, value });
  }
  return out;
}

// Every --name a value mentions: "1px solid var(--line)" -> ["--line"], and a
// fallback chain "var(--a, var(--b))" -> both.
function uiiVarsIn(value) {
  return [...String(value || '').matchAll(/var\(\s*(--[\w-]+)/g)].map((m) => m[1]);
}

// The variables this element reads or sets, sorted, deduped, and only those
// that resolve here: a var() naming nothing has no value to show or edit.
function uiiElementVars(info) {
  const names = new Set();
  for (const r of info.rules) {
    if (!r.style) continue;
    for (const d of uiiDeclList(r.style)) {
      if (d.name.startsWith('--')) names.add(d.name);
      for (const n of uiiVarsIn(d.value)) names.add(n);
    }
  }
  const cs = getComputedStyle(info.el);
  return [...names].sort().map((name) => ({ name, value: cs.getPropertyValue(name).trim() })).filter((v) => v.value);
}

// Every property the element's matched rules set, with the value to edit:
// the live edit standing on it, else the last rule's own words (`var(--accent)`
// is worth more in the box than the color it resolves to), else computed.
// Custom properties are left to uiiElementVars.
function uiiDeclaredProps(info) {
  const seen = new Map();
  for (const r of info.rules) {
    if (!r.style) continue;
    for (const d of uiiDeclList(r.style)) if (!d.name.startsWith('--')) seen.set(d.name, d.value);
  }
  const e = uiiEditsFor(info.el, false);
  const cs = getComputedStyle(info.el);
  return [...seen.keys()].sort()
    .map((prop) => ({ prop, value: (e && e.props[prop]) || seen.get(prop) || cs.getPropertyValue(prop).trim() }))
    .filter((p) => p.value);
}

// Anything the rules do not set yet: a name, a value, Enter or ↵ applies. A
// name opening with -- edits that variable, like the rows above.
function uiiAddPropRow(info) {
  const row = uiiEl('div', 'vr add');
  row.dataset.keep = '1'; // the filter never hides it
  const name = uiiEl('input', 'n', undefined, 'add-prop-name');
  name.placeholder = 'box-shadow, --accent…';
  name.spellcheck = false;
  const wrap = uiiEl('span', 'nf');
  const val = uiiEl('input', undefined, undefined, 'add-prop-value');
  val.placeholder = 'value';
  val.spellcheck = false;
  const go = uiiEl('button', 'go', '↵', 'add-prop-apply');
  go.type = 'button';
  go.title = 'Apply to the pinned element';
  const set = () => {
    const p = name.value.trim(), v = val.value.trim();
    if (!p || !v) return;
    if (p.startsWith('--')) uiiVarApply(p, v, info.el);
    // CSS.supports keeps a typo from landing as a silent no-op: setProperty
    // drops a value the browser cannot parse and says nothing.
    else if (!CSS.supports(p, v)) { uiiFlash('Not a CSS value: ' + p + ': ' + v); return; }
    else uiiSet(info, p, v);
    row.classList.add('on');
  };
  for (const i of [name, val]) {
    i.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); set(); } });
  }
  go.addEventListener('click', set);
  wrap.append(val, go);
  row.append(name, wrap);
  return row;
}

// The section itself, folded into a <details> so a long list does not push
// the Changes box off the panel. Open when it is short enough to read at a
// glance, and whenever one of its rows has been edited.
function uiiPropsSection(body, info) {
  const vars = uiiElementVars(info);
  const props = uiiDeclaredProps(info);
  const wrap = uiiEl('details', 'more');
  const n = (c, word) => c + ' ' + word + (c === 1 ? '' : 's');
  const sum = uiiEl('summary', 'sec', 'Declared — ' + n(props.length, 'property').replace('propertys', 'properties')
    + ', ' + n(vars.length, 'variable') + ' ', 'section-declared');
  const find = uiiEl('input', 'find', undefined, 'filter-declared');
  sum.appendChild(find);
  const list = uiiEl('div', 'vrs', undefined, 'declared-list');
  for (const v of vars) list.appendChild(uiiValueRow(v.name, v.value, (val) => uiiVarApply(v.name, val, info.el), v.name).row);
  for (const p of props) list.appendChild(uiiValueRow(p.prop, p.value, (val) => uiiSet(info, p.prop, val), p.prop).row);
  list.appendChild(uiiAddPropRow(info));
  uiiFindBox(find, list);
  // Short enough to read at a glance, or an element already being worked on.
  wrap.open = vars.length + props.length <= 8 || !!uiiEditsFor(info.el, false);
  wrap.append(sum, list);
  body.appendChild(wrap);
}

/* ================= live editing: what the page draws =================
   The rule behind a value is the one that wins the cascade, not the last one
   in sheet order. Rules that set the same property but lose are kept apart so
   the panel can show them: an edit on a loser does nothing on screen. */

// Lights the title of a field whose value is overridden by something else.
function uiiMarkOverridden(f) {
  const lab = f.querySelector('.lab');
  if (!lab) return;
  lab.classList.add('ovr');
  lab.title = 'Overridden by something else, see below';
}

// Every rule that sets `prop` on `el`, last in sheet order first, longhand or
// shorthand, as { code: 'font-size: 0.9rem', src: 'file.css .sel', style }.
function uiiDeclsOf(el, prop) {
  const heads = [prop, ...(UII_SHORTHAND[prop] || [])];
  if (prop === 'border-color') {
    const side = 'border-' + uiiBorderSide(el);
    heads.push('border', side + '-color', side);
  }
  const rules = uiiRulesOf(el), out = [];
  for (let i = rules.length - 1; i >= 0; i--) {
    if (!rules[i].style) continue;
    for (const h of heads) {
      const v = uiiDeclValue(rules[i].style, h);
      if (!v) continue;
      out.push({ code: h + ': ' + v, src: (rules[i].file || '').split('/').pop() + ' ' + rules[i].selector, style: rules[i].style });
      break;
    }
  }
  return out;
}

// What the page draws for `prop` on `el`: its own inline style, else the rule
// that wins the cascade. { code, src, lost: [the others] }; null when no rule
// or inline style sets it (inherited, or a default). An inline value we wrote
// ourselves is an edit, not the page's.
function uiiDeclared(el, prop) {
  const all = uiiDeclsOf(el, prop);
  const e = uiiEditsFor(el, false);
  const inl = !(e && prop in e.props) && el.style.getPropertyValue(prop).trim();
  const win = !inl && all.length > 1 && uiiRuleDecl(el, prop);
  const shown = inl ? { code: prop + ': ' + inl, src: 'inline style' }
    : (win && all.find((d) => d.style === win.style)) || all[0];
  return shown && Object.assign({}, shown, { lost: all.filter((d) => d !== shown) });
}

/* ================= live editing: fields =================
   Design-tool style controls grouped in cards: number boxes (editnum.js), a
   weight dropdown, a text-align toggle, color pickers (editcolor.js). All of
   them go through uiiSet. */

const UII_WEIGHTS = [[100, 'Thin'], [200, 'Extra Light'], [300, 'Light'], [400, 'Regular'],
  [500, 'Medium'], [600, 'Semibold'], [700, 'Bold'], [800, 'Extra Bold'], [900, 'Black']];

// Labelled field: <div.fld><span.lab>Size</span>{control}</div>. The label
// also names the pair for scripts: the field is "field-size", the control
// inside it "size" (see uiiEl — each name is written as id and data-ui).
// Shorthands a longhand can hide in, so "padding-top" finds `padding: 1px 8px`.
const UII_SHORTHAND = { 'background-color': ['background'], 'font-size': ['font'], 'line-height': ['font'],
  'font-weight': ['font'], 'font-family': ['font'] };
for (const side of ['top', 'right', 'bottom', 'left']) {
  UII_SHORTHAND['padding-' + side] = ['padding'];
  UII_SHORTHAND['margin-' + side] = ['margin'];
  for (const k of ['width', 'style']) UII_SHORTHAND['border-' + side + '-' + k] = ['border-' + side, 'border', 'border-' + k];
}

// `el` (optional) is the element the field speaks for: its source line goes
// under the control.
function uiiFld(label, control, props, el) {
  const name = uiiSlug(label);
  const f = uiiEl('div', 'fld', undefined, 'field-' + name);
  const lab = uiiEl('span', 'lab', label);
  if (!control.id) { control.setAttribute('data-ui', name); control.id = name; }
  if (props) {
    // The label and its ↺ share a line: the key leads the label, and the label
    // keeps its own box because that is what scrubs and what a px note
    // rewrites (uiiNumField). One line either way, so nothing shifts when a
    // value is edited and the key lights up.
    const lw = uiiEl('div', 'lw');
    lw.append(uiiResetKey([].concat(props).join(',')), lab);
    f.append(lw, control);
  } else f.append(lab, control);
  const fm = el && props && uiiDeclared(el, [].concat(props)[0]);
  // Unless the control already spells it out (the border and font-family boxes).
  if (fm && fm.code.slice(fm.code.indexOf(': ') + 2) !== control.value) {
    const line = f.appendChild(uiiEl('div', 'fml', fm.code));
    line.title = fm.src;
  }
  // Rules that set it too but lose: what to look at when an edit seems to do nothing.
  if (fm) for (const d of fm.lost) f.appendChild(uiiEl('div', 'fml lost', d.code + ' · ' + d.src)).title = 'Overridden';
  if (fm && fm.lost.length) uiiMarkOverridden(f);
  return { f, lab };
}

// The ↺ that leads a control: put back the one value that control writes.
// Dim until that value is actually changed — an always-live key reads as an
// action worth taking on every untouched row.
function uiiResetKey(name) {
  const b = uiiEl('button', 'rs', '↺');
  b.type = 'button';
  b.dataset.prop = name;
  b.setAttribute('data-ui', 'reset-' + uiiSlug(name));
  b.title = 'Reset ' + name + ' — put back what the page had';
  b.disabled = true;
  // A press here must not also start the label's scrub drag or reach the tree.
  b.addEventListener('mousedown', (e) => e.stopPropagation());
  b.addEventListener('click', (e) => { e.stopPropagation(); uiiResetValue(name); });
  return b;
}

// Enter commits and the box keeps focus. Browsers fire `change` on Enter in a
// text box on their own (as long as keydown is not cancelled); the keyup then
// selects the text so the next typing replaces it.
function uiiEnterKeeps(box) {
  box.addEventListener('keyup', (e) => { if (e.key === 'Enter') box.select(); });
}

function uiiTextField(info, label, prop) {
  const box = uiiEl('input', 'tf');
  box.spellcheck = false;
  box.value = uiiEditValue(info, prop);
  box.addEventListener('change', () => uiiSet(info, prop, box.value.trim()));
  uiiEnterKeeps(box);
  return uiiFld(label, box, prop, uiiTargetEl(info, prop)).f;
}

// Border = three parts and the line they add up to. Width and style write the
// sides that draw (all four when none or all do); color is its own field. The
// Border box is the whole value, to copy or to type over: it rebuilds the card.
const UII_BORDER_STYLES = ['none', 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset', 'hidden'];
function uiiBorderCard(info) {
  const el = uiiTargetEl(info, 'border');
  const sides = uiiBorderSides(el);
  const part = sides.length && sides.length < 4 ? sides : ['top', 'right', 'bottom', 'left'];
  const props = (k) => part.map((s) => 'border-' + s + '-' + k);
  const side = 'border-' + uiiBorderSide(el);
  const sel = uiiVarPicker(UII_BORDER_STYLES, el, 'line');
  sel.classList.add('pl');
  sel.value = getComputedStyle(el).getPropertyValue(side + '-style');
  const selWrap = uiiEl('span', 'nf');
  selWrap.appendChild(sel);
  sel.addEventListener('change', () => { for (const p of props('style')) uiiSet(info, p, sel.value); });
  const box = uiiEl('input', 'tf');
  box.spellcheck = false;
  const sync = () => {
    box.value = uiiBorderText(el);
    box.title = sides.length && sides.length < 4 ? 'Only the ' + sides.join(', ') + ' side draws; this reads that one.' : '';
  };
  sync();
  box.addEventListener('change', () => {
    const typed = box.value.trim(); // before the resets below refresh this box
    // The shorthand speaks for every side: longhand edits made before it are void.
    const sides = ['top', 'right', 'bottom', 'left'], e = uiiEditsFor(el, false);
    for (const p of ['border-color'].concat(...sides.map((x) => ['width', 'style', 'color'].map((k) => 'border-' + x + '-' + k))))
      if (e && p in e.props) uiiResetProp(el, p);
    uiiSet(uiiState.info, 'border', typed);
    const old = uiiState.panel.borderCard;
    uiiCloseColorPicker();
    const fresh = uiiBorderCard(uiiState.info);
    old.replaceWith(fresh);
    fresh.querySelector('.tf').focus();
  });
  uiiEnterKeeps(box);
  const card = uiiCard('Border',
    uiiFld('Border', box, 'border', el).f,
    uiiPair(uiiNumField(info, 'Border width', props('width')).f, uiiFld('Border style', selWrap, props('style'), el).f),
    uiiPair(uiiNumField(info, 'Radius', 'border-radius').f, uiiColorField(info, 'Color', 'border-color')));
  uiiState.panel.borderCard = card;
  uiiState.panel.borderSync = sync;
  return card;
}

function uiiWeightField(info) {
  const sel = uiiEl('select');
  for (const [n, name] of UII_WEIGHTS) sel.appendChild(new Option(name, String(n)));
  const sync = (v) => { sel.value = String(Math.round(parseFloat(v) / 100) * 100); };
  const fld = uiiNumField(info, 'Weight', 'font-weight', { units: null, step: 100, onSet: sync });
  const nf = fld.f.querySelector('.nf');
  nf.insertBefore(sel, nf.querySelector('.st'));
  sync(uiiEditValue(info, 'font-weight'));
  sel.addEventListener('change', () => { uiiSet(info, 'font-weight', sel.value); fld.set(sel.value); });
  return fld.f;
}

// Three-line glyph for the align buttons, lines pushed to the given side.
function uiiAlignIcon(a) {
  const w = [12, 8, 10];
  return '<svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor">'
    + w.map((wi, i) => '<rect x="' + (a === 'left' ? 2 : a === 'right' ? 14 - wi : 8 - wi / 2)
      + '" y="' + (1 + i * 4) + '" width="' + wi + '" height="1.5" rx=".75"/>').join('') + '</svg>';
}

function uiiAlignField(info) {
  const seg = uiiEl('span', 'seg');
  const now = uiiEditValue(info, 'text-align').replace('start', 'left').replace('end', 'right');
  for (const a of ['left', 'center', 'right']) {
    const b = uiiEl('button');
    b.type = 'button';
    b.title = 'text-align: ' + a;
    b.innerHTML = uiiAlignIcon(a);
    b.classList.toggle('on', now === a);
    b.addEventListener('click', () => {
      for (const o of seg.children) o.classList.toggle('on', o === b);
      uiiSet(info, 'text-align', a);
    });
    seg.appendChild(b);
  }
  return uiiFld('Align', seg, 'text-align', uiiTargetEl(info, 'text-align')).f;
}

function uiiCard(title, ...rows) {
  const c = uiiEl('div', 'card', undefined, 'card-' + uiiSlug(title));
  c.appendChild(uiiEl('div', 'ct', title));
  for (const r of rows) if (r) c.appendChild(r);
  return c;
}

// One grid row of fields: two (g2) or four (g4) columns.
function uiiPair(...fields) {
  const g = uiiEl('div', 'g' + fields.length);
  g.append(...fields);
  return g;
}

function uiiRenderEditRows(body, info) {
  uiiCloseVarList(); // its fields are about to be replaced
  uiiCloseColorPicker();
  const num = (label, props) => uiiNumSlot(info, label, props);
  body.append(
    uiiColorCard(info),
    uiiBorderCard(info),
    uiiCard('Size',
      uiiPair(num('Width', 'width'), num('Height', 'height')),
      uiiPair(num('Min width', 'min-width'), num('Min height', 'min-height'))),
    uiiCard('Spacing',
      uiiPair(num('Padding top ↑', 'padding-top'), num('Padding right →', 'padding-right'),
        num('Padding bottom ↓', 'padding-bottom'), num('Padding left ←', 'padding-left')),
      uiiPair(num('Margin top ↑', 'margin-top'), num('Margin right →', 'margin-right'),
        num('Margin bottom ↓', 'margin-bottom'), num('Margin left ←', 'margin-left'))),
    uiiCard('Typography',
      uiiTextField(info, 'Font', 'font-family'),
      uiiPair(num('Size', 'font-size'), num('Space', 'letter-spacing')),
      uiiPair(num('Line height', 'line-height'), uiiWeightField(info)),
      uiiAlignField(info)));
  uiiPropsSection(body, info); // everything the cards above do not cover
}

/* ================= live editing: the words on screen =================
   The style fields change how a control looks; this one changes what it
   says. Retyping the label is how you find out whether a button survives a
   longer word, so the Text row in the panel is a box you can type into and
   the page follows every keystroke. Reset puts the original words back. */

// The text node holding most of an element's words. A node, not an element:
// writing to it leaves an icon, a badge or a nested <b> exactly where it was,
// where setting textContent would wipe them out.
function uiiMainTextNode(el) {
  const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let best = null, n;
  for (let i = 0; (n = walk.nextNode()) && i < 200; i++) {
    if (n.data.trim() && (!best || n.data.trim().length > best.data.trim().length)) best = n;
  }
  return best;
}

// What a form control says lives in .value, not in a child node.
function uiiValueEl(el) {
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' ? el : null;
}

function uiiSetText(info, value) {
  const el = info.el;
  const e = uiiEditsFor(el, true);
  const ve = uiiValueEl(el);
  // One step for the whole retype: the first keystroke records the words as
  // they were, and every keystroke after lands inside that same step.
  if (!e.text) {
    uiiUndoAdd({ k: 'text', el });
    e.text = ve ? { el: ve, from: ve.value } : { node: info.textNode, from: info.textNode.data };
  }
  // The node's own indentation is not part of the words: a <span> written
  // across two lines keeps the spaces that separate it from its neighbours.
  if (ve) ve.value = value;
  else {
    const pad = /^(\s*)[\s\S]*?(\s*)$/.exec(e.text.from);
    e.text.node.data = pad[1] + value + pad[2];
  }
  if (uiiState.panel) uiiState.panel.reset.disabled = false;
  uiiScheduleDraw();
}

// The Text row: a box, not a label, whenever there are words to retype.
function uiiTextContentField(info) {
  const ve = uiiValueEl(info.el);
  info.textNode = ve ? null : uiiMainTextNode(info.el);
  if (!ve && !info.textNode) return null;
  const row = uiiEl('div', 'row', undefined, 'row-text');
  row.appendChild(uiiEl('span', 'k', 'Text'));
  const box = uiiEl('textarea', 'txt', undefined, 'text-content');
  box.spellcheck = false;
  box.rows = 1;
  box.title = 'Type to change the words on screen — ↺ Reset puts them back';
  box.value = ve ? ve.value : info.textNode.data.trim();
  box.addEventListener('input', () => uiiSetText(info, box.value));
  row.appendChild(box);
  return row;
}

// Undo half of uiiSetText, for uiiResetOne.
function uiiRestoreText(e) {
  if (!e.text) return;
  if (e.text.el) e.text.el.value = e.text.from;
  else e.text.node.data = e.text.from;
}

/* ================= live editing: taking one step back =================
   Reset throws every edit away at once, which is too blunt while you are
   trying values out. Undo takes back the last one and leaves the rest
   standing: ↶ in the header, or Ctrl/Cmd+Z while inspect mode is on.

   A step is one thing the user did, not one property written. Typing a font
   size that scales three nested spans is one step; so is a whole drag of a
   label, from mousedown to mouseup. uiiUndoBegin/uiiUndoEnd mark those out,
   and nest, so a drag swallows the edits the fields make inside it.

   Each entry records what the target looked like before, which is all undo
   needs: the edit standing on it, if any, and the inline value underneath. */

const uiiUndoState = { stack: [], open: null, depth: 0, busy: false };

function uiiUndoBegin() { if (!uiiUndoState.depth++) uiiUndoState.open = []; }

function uiiUndoEnd() {
  const U = uiiUndoState;
  if (U.depth && --U.depth) return;
  if (U.open && U.open.length) U.stack.push(U.open);
  U.open = null;
  uiiUndoSync();
}

// Two entries aim at the same thing when undoing one would undo the other.
function uiiUndoSame(a, b) {
  return a.k === b.k && (a.k === 'var' ? a.name === b.name : a.el === b.el && a.prop === b.prop);
}

// Within a step only the first entry for a target counts: it holds the value
// from before the step began, which is where undo has to land.
function uiiUndoAdd(entry) {
  const U = uiiUndoState;
  if (U.busy) return; // undoing writes through the same fields; it records nothing
  if (U.open) { if (!U.open.some((x) => uiiUndoSame(x, entry))) U.open.push(entry); return; }
  U.stack.push([entry]);
  uiiUndoSync();
}

// Reset has already put everything back: the stack now describes a world
// that no longer exists.
function uiiUndoClear() {
  uiiUndoState.stack.length = 0;
  uiiUndoState.open = null;
  uiiUndoState.depth = 0;
  uiiUndoSync();
}

// The button keeps its place and goes dim with nothing left to take back.
function uiiUndoSync() {
  const P = uiiState.panel;
  if (P && P.undo) P.undo.disabled = !uiiUndoState.stack.length;
}

function uiiUndoRunVar(e) {
  if (e.had) { uiiDeclSet(e.name, e.to); return; }
  const v = uiiVarEdits.get(e.name);
  if (v) { if (v.from) v.style.setProperty(v.prop, v.from, v.pri); else v.style.removeProperty(v.prop); }
  uiiVarEdits.delete(e.name);
}

// An element the undo emptied is no longer an edited element — unless a text
// child still carries an edit of its own, which only this entry can reach.
function uiiUndoDrop(el, ed) {
  if (!ed || Object.keys(ed.props).length || ed.text) return;
  if (ed.kids && [...ed.kids].some((k) => k !== el && uiiEditsFor(k, false))) return;
  uiiState.edits.delete(el);
}

function uiiUndoRun(e) {
  if (e.k === 'var') { uiiUndoRunVar(e); return; }
  const ed = uiiEditsFor(e.el, false);
  if (e.k === 'text') { if (ed) { uiiRestoreText(ed); delete ed.text; } }
  else if (e.had) uiiApplyEdit(e.el, e.prop, e.to);
  else {
    if (ed) { delete ed.props[e.prop]; delete ed.from[e.prop]; delete ed.rule[e.prop]; }
    // The inline value the page itself wrote, if any, goes back untouched:
    // removing the property outright would strip a style="" the app set.
    if (e.inline) e.el.style.setProperty(e.prop, e.inline, e.pri);
    else e.el.style.removeProperty(e.prop);
  }
  uiiUndoDrop(e.el, ed);
}

// A step that would put back a value nobody is editing any more describes a
// world that no longer exists. `hit` decides which entries those are; every
// other step stands, which is the point of resetting one value or one row.
function uiiUndoDrop(hit) {
  const U = uiiUndoState;
  const keep = (step) => step.filter((x) => !hit(x));
  U.stack = U.stack.map(keep).filter((step) => step.length);
  if (U.open) U.open = keep(U.open);
  uiiUndoSync();
}

// One element: everything (prop == null) or just one property of it.
function uiiUndoForget(el, prop) {
  uiiUndoDrop((x) => x.k !== 'var' && x.el === el && (prop == null || x.prop === prop));
}

// One variable, which belongs to no element.
function uiiUndoForgetVar(name) {
  uiiUndoDrop((x) => x.k === 'var' && x.name === name);
}

// Newest step first, and within it newest entry first. Stylesheet rules are
// put back wholesale by uiiSyncRules, which restores every rule the inspector
// touched and replays the edits still standing — the same path the "Apply to
// similar" checkbox uses, so no rule bookkeeping is needed here.
function uiiUndo() {
  const U = uiiUndoState;
  uiiUndoEnd(); // a step still open (a key held down) is a step to take back
  const step = U.stack.pop();
  if (!step) { uiiFlash('Nothing to undo'); return; }
  U.busy = true;
  try { for (let i = step.length - 1; i >= 0; i--) uiiUndoRun(step[i]); }
  finally { U.busy = false; }
  uiiSyncRules();
  const S = uiiState;
  if (S.varsMode) uiiVarsPanel();
  else if (S.info && S.info.el.isConnected) uiiSelect(S.info.el);
  else uiiRefreshChanges();
  uiiUndoSync();
}

// Built here rather than in uiiBuildPanel so the whole feature reads in one
// file. Dim until there is something to take back.
function uiiUndoButton() {
  const b = uiiHeadBtn('↶', 'undo-edit', 'Undo the last edit (Ctrl/Cmd+Z)', 'undo');
  b.disabled = true;
  b.addEventListener('click', () => uiiUndo());
  return b;
}

/* ================= the DOM tree =================
   A column down the left of the panel, so picking an element no longer means
   finding it on screen: scan the structure, hover a row to outline it on the
   page, click to pin it. The style fields stay beside it — the column is a
   sibling of the body, not a mode that replaces it.

   Every element is listed, the real tree, with the ones the inspector would
   outline drawn in their human name and the plain wrappers in `<tag.class>`.
   Only expanded nodes are built: a 60,000-element page costs as many rows as
   you have actually opened, never more. */

const UII_TREE_W = 260;    // the column's width, added to the panel's own
const UII_TREE_KIDS = 300; // children drawn per node before "… N more"

// Which nodes show their children. Keyed by element, so the shape survives
// a rebuild after the page mutates; weak, so a removed node is not kept alive.
const uiiTreeOpen = new WeakSet();

// Children worth a row: the inspector's own host and anything the host page
// asked it to ignore are not part of the page you are styling, and <script>
// and <style> draw nothing.
function uiiTreeKids(el) {
  const S = uiiState;
  return [...el.children].filter((c) => c !== S.host && !uiiIgnored(c)
    && c.tagName !== 'SCRIPT' && c.tagName !== 'STYLE' && c.tagName !== 'TEMPLATE');
}

// Would the overlay outline it? Those are the rows worth scanning for, so
// they carry the name and the weight.
function uiiTreeIsControl(el) {
  try { return el.matches(uiiState.selList); } catch (err) { return false; }
}

function uiiTreeTag(el) {
  const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/).filter(Boolean) : [];
  return '<' + el.tagName.toLowerCase() + (el.id ? '#' + el.id : '')
    + (cls.length ? '.' + cls.slice(0, 2).join('.') : '') + '>';
}

function uiiTreeRow(el, depth) {
  const row = uiiEl('div', 'tr');
  row.uii = el;
  row.style.paddingLeft = (4 + depth * 12) + 'px';
  const kids = uiiTreeKids(el);
  const open = uiiTreeOpen.has(el);
  // In front of every element: put back the edits made to THAT element, so a
  // page full of tweaks can be unwound one control at a time instead of all at
  // once. Dim with nothing to reset, and always the same width, so the names
  // never shift under the pointer. Stopped here, or the row would pin instead.
  const rst = uiiEl('button', 'rs', '↺', 'tree-reset');
  rst.type = 'button';
  rst.title = 'Reset this element — put back the edits made to it';
  rst.disabled = !uiiEditsFor(el, false);
  rst.addEventListener('click', (e) => { e.stopPropagation(); uiiResetEl(el); });
  row.appendChild(rst);
  row.appendChild(uiiEl('span', 'tw', kids.length ? (open ? '▾' : '▸') : ''));
  const ctl = uiiTreeIsControl(el);
  row.appendChild(uiiEl('span', ctl ? 'nm' : 'tg', uiiShort(ctl ? uiiName(el) : uiiTreeTag(el), 40)));
  row.title = uiiSegment(el);
  if (el === uiiState.selected) row.classList.add('on');
  return row;
}

function uiiTreeWalk(el, depth, out) {
  out.push(uiiTreeRow(el, depth));
  if (!uiiTreeOpen.has(el)) return;
  const kids = uiiTreeKids(el);
  for (const c of kids.slice(0, UII_TREE_KIDS)) uiiTreeWalk(c, depth + 1, out);
  if (kids.length > UII_TREE_KIDS) {
    const more = uiiEl('div', 'tr more', '… ' + (kids.length - UII_TREE_KIDS) + ' more');
    more.style.paddingLeft = (16 + depth * 12) + 'px';
    out.push(more);
  }
}

// Rebuilt whole, which is cheap because only open nodes produce rows, and
// keeps the scroll where it was so a mutation does not jump the list.
function uiiRenderTree() {
  const P = uiiState.panel;
  if (!P || !P.tree || P.tree.hidden) return;
  const top = P.tree.scrollTop;
  P.tree.textContent = '';
  const out = [];
  uiiTreeWalk(document.body, 0, out);
  P.tree.append(...out);
  P.tree.scrollTop = top;
}

// Open every ancestor of the pinned element so its row exists, then bring it
// into view. Called on every selection, however the element was picked.
function uiiTreeReveal(el) {
  const P = uiiState.panel;
  if (!P || !P.tree || P.tree.hidden) return;
  for (let p = el && el.parentElement; p && p !== document.documentElement; p = p.parentElement) {
    uiiTreeOpen.add(p);
  }
  uiiRenderTree();
  const row = P.tree.querySelector('.tr.on');
  // Guarded: this runs inside every uiiSelect, and a host without
  // scrollIntoView (a test DOM, an old webview) must not break pinning.
  if (row && row.scrollIntoView) row.scrollIntoView({ block: 'nearest' });
}

// The page changed under the tree. Debounced, because a mutation observer
// fires in bursts and a rebuild during one is work thrown away.
function uiiTreeTouch() {
  const S = uiiState;
  clearTimeout(S.treeTimer);
  S.treeTimer = setTimeout(uiiRenderTree, 300);
}

// The panel's width now. Measuring is no good here: T opens the tree with
// nothing pinned, and a panel that has never been shown measures zero, which
// would collapse it to the minimum instead of widening it.
function uiiPanelW(p) {
  return parseFloat(p.style.width) || parseFloat(getComputedStyle(p).width) || UII_PANEL_W;
}

// T, and the header key. The column is a sibling of the body, so the panel
// widens to keep the body the size it was.
function uiiToggleTree() {
  const S = uiiState, P = S.panel;
  if (!P || !P.tree) return;
  uiiHoldPanelSize(P.root); // the height stays; the width changes below
  const on = P.tree.hidden;
  P.tree.hidden = !on;
  P.treeBtn.classList.toggle('on', on);
  const w = uiiPanelW(P.root);
  // Closing takes off what opening added: a clamped open added less.
  const nw = Math.max(320, Math.min(window.innerWidth - 16,
    on ? w + UII_TREE_W : w - (P.treeAdd ?? UII_TREE_W)));
  if (on) P.treeAdd = nw - w;
  P.root.style.width = nw + 'px';
  // A panel placed by its left edge (dragged, resized, or parked on the left)
  // grows to the right; slide it back so its right edge stays on screen, and
  // put it back where it was when the tree closes — unless it was moved since.
  const st = P.root.style;
  if (on) {
    P.treeSlide = null;
    const left = parseFloat(st.left);
    if (left + nw > window.innerWidth - 8) {
      st.left = Math.max(8, window.innerWidth - 8 - nw) + 'px';
      P.treeSlide = { from: left + 'px', to: st.left };
    }
  } else if (P.treeSlide) {
    if (st.left === P.treeSlide.to) st.left = P.treeSlide.from;
    P.treeSlide = null;
  }
  if (on) {
    uiiTreeOpen.add(document.body);
    for (const c of uiiTreeKids(document.body)) uiiTreeOpen.add(c);
    uiiTreeReveal(S.selected);
    P.root.classList.add('on'); // T alone opens the panel, with nothing pinned
  }
}

// Bound once, on the column rather than on every row: the rows are thrown
// away and rebuilt, the column is not.
function uiiTreeBind(tree) {
  tree.addEventListener('click', (e) => {
    const row = e.target.closest('.tr');
    if (!row || !row.uii) return;
    if (e.target.classList.contains('tw')) {
      if (uiiTreeOpen.has(row.uii)) uiiTreeOpen.delete(row.uii); else uiiTreeOpen.add(row.uii);
      uiiRenderTree();
      return;
    }
    uiiSelect(row.uii);
  });
  // Hovering a row outlines its element on the page, which is the whole point
  // of scanning the list. uiiOnMove reads the flag: a pointer over the panel
  // normally clears the hover, and here it must not.
  tree.addEventListener('mouseover', (e) => {
    const row = e.target.closest('.tr');
    if (!row || !row.uii) return;
    uiiState.treeHover = true;
    uiiSetHover(row.uii);
  });
  tree.addEventListener('mouseleave', () => {
    uiiState.treeHover = false;
    uiiSetHover(null);
  });
}

/* ================= the panel header =================
   The title line and the row of keys at its right, in three groups read
   left to right: what you did to the element (↶ ↺), what you are looking at
   (🌳 🎨 👁 💧), and the window itself (— ✕). A thin rule separates the groups.

   Every key is the same square, one glyph, no word — a label on one of them
   would break the rhythm and move its neighbours. The contextual pair stays
   in the row and goes dim instead of vanishing, so nothing ever slides out
   from under the pointer halfway through an edit. */

// One glyph, its name in the tooltip and on the accessibility tree, since
// no word is shown.
function uiiHeadBtn(glyph, ui, title, cls) {
  const b = uiiEl('button', cls, glyph, ui);
  b.title = title;
  b.setAttribute('aria-label', title);
  return b;
}

// Builds the header, wires its keys, and returns the parts uiiBuildPanel
// keeps on uiiState.panel.
function uiiBuildHead(p) {
  const S = uiiState;
  const head = uiiEl('div', 'head', undefined, 'panel-head');
  const name = uiiEl('span', 'name', undefined, 'panel-name');
  const tag = uiiEl('span', 'tag', undefined, 'panel-tag');
  const ok = uiiEl('span', 'ok', '', 'copy-status');

  // Group 1 — what you did. Dim with nothing to take back.
  const undo = uiiUndoButton();
  const reset = uiiHeadBtn('↺', 'reset-edits',
    'Reset — put every live edit on this element back, and every variable edit', 'reset');
  reset.disabled = true; // nothing to put back until an edit lands

  // Group 2 — what you are looking at. Each lights up while its mode is on.
  // The palette is the page's variables, editable with nothing pinned;
  // Normal view hides the overlay without closing the panel, so the edits,
  // the Changes box and the pinned element all survive the look.
  const treeBtn = uiiHeadBtn('🌳', 'dom-tree-toggle',
    'DOM tree — pick an element from the page structure (T)');
  const vars = uiiHeadBtn('🎨', 'vars-mode',
    'Page variables — edit the palette without pinning anything (P)');
  const peek = uiiHeadBtn('👁', 'normal-view',
    'Normal view — hide the overlay and use the page (V)');
  const drop = uiiHeadBtn('💧', 'color-picker',
    window.EyeDropper ? 'Color picker — click any pixel on screen to copy its color (I).'
      + ' Ctrl/Cmd+I copies the hovered color with no click'
      : 'Color picker — not supported in this browser (Chrome/Edge only)');
  drop.disabled = !window.EyeDropper;

  // Group 3 — the window. Minimize folds the panel to its header so the page
  // underneath shows; the class lives on the panel, so a new selection stays
  // folded.
  const fold = uiiHeadBtn('—', 'minimize', 'Minimize');
  const close = uiiHeadBtn('✕', 'close-panel', 'Close panel (selection stays)');

  const sep = () => uiiEl('span', 'sep');
  head.append(name, tag, ok, undo, reset, sep(), treeBtn, vars, peek, drop, sep(), fold, close);

  close.addEventListener('click', () => p.classList.remove('on'));
  peek.addEventListener('click', () => uiiPeek());
  treeBtn.addEventListener('click', () => uiiToggleTree());
  vars.addEventListener('click', () => uiiToggleVars());
  drop.addEventListener('click', () => uiiPickColor());
  fold.addEventListener('click', () => {
    const min = p.classList.toggle('min');
    fold.textContent = min ? '▢' : '—';
    fold.title = min ? 'Maximize' : 'Minimize';
    fold.setAttribute('aria-label', fold.title);
  });
  reset.addEventListener('click', () => uiiResetEdits(S.varsMode ? null : S.info && S.info.el));
  return { head, name, tag, ok, undo, reset, treeBtn, vars, peek };
}

// The browser's own eyedropper: it samples any pixel on screen, the page's
// own colors included. The outlines go while it is open so a sample never
// lands on the inspector's drawing instead of the page. Esc cancels it.
function uiiPickColor() {
  const S = uiiState;
  const hid = S.host && !S.host.classList.contains('peek');
  if (hid) S.host.classList.add('peek');
  new EyeDropper().open()
    // No btn: the key is a one-glyph square, a message would stretch it.
    .then((r) => uiiCopy(r.sRGBHex, null, `✅ ${r.sRGBHex} copied`), () => {}) // rejected = cancelled
    .finally(() => { if (hid && S.host) S.host.classList.remove('peek'); });
}

// Ctrl/Cmd+I: the color under the pointer, read from CSS, no click. Over a
// glyph it is the text color; anywhere else the first background that is
// not transparent, walking up — what shows behind the pointer. A background
// image or gradient is not a color and is walked past.
function uiiCopyHoverColor() {
  const S = uiiState;
  if (!S.pos) return;
  const x = S.mx, y = S.my;
  const el = document.elementFromPoint(x, y);
  if (!el || (S.host && S.host.contains(el))) return; // over the panel
  let hex, what;
  const node = uiiTextNodeAt(x, y);
  if (node) { hex = uiiToHex(getComputedStyle(node.parentElement).color); what = 'text'; }
  else {
    let bg = el;
    while (bg && uiiIsTransparent(getComputedStyle(bg).backgroundColor)) bg = bg.parentElement;
    hex = bg ? uiiToHex(getComputedStyle(bg).backgroundColor) : '#ffffff'; // nothing set: the canvas default
    what = 'background';
  }
  uiiCopy(hex, null, `✅ ${hex} copied (${what})`);
}

// The text node whose glyph sits under (x, y), or null. The caret APIs snap
// to the nearest character even from blank space, so the glyph's own box
// has to contain the point.
function uiiTextNodeAt(x, y) {
  let node, off;
  if (document.caretPositionFromPoint) {
    const p = document.caretPositionFromPoint(x, y);
    if (p) { node = p.offsetNode; off = p.offset; }
  } else if (document.caretRangeFromPoint) {
    const r = document.caretRangeFromPoint(x, y);
    if (r) { node = r.startContainer; off = r.startOffset; }
  }
  if (!node || node.nodeType !== 3) return null;
  const hit = (a, b) => {
    if (a < 0 || b > node.length) return false;
    const r = document.createRange();
    r.setStart(node, a); r.setEnd(node, b);
    return [...r.getClientRects()].some((q) => x >= q.left && x <= q.right && y >= q.top && y <= q.bottom);
  };
  return hit(off, off + 1) || hit(off - 1, off) ? node : null;
}

/* ================= details panel =================
   Built once per mount inside the shadow root; re-rendered on every
   selection. Drag by the header; buttons copy text for the clipboard.
   Every control carries a name of its own, written as both id and data-ui,
   so a script driving the panel has something stable to aim at — the classes
   here are styling hooks and change with the layout. The ids are safe: the
   panel lives in a shadow root, so they cannot collide with the host page. */

function uiiEl(tag, cls, text, ui) {
  const d = document.createElement(tag);
  if (cls) d.className = cls;
  if (text !== undefined) d.textContent = text;
  if (ui) { d.setAttribute('data-ui', ui); d.id = ui; }
  return d;
}

// "Padding top ↑" → "padding-top": a data-ui name from a human label.
function uiiSlug(label) {
  return String(label).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function uiiBuildPanel(sh) {
  const p = uiiEl('div', 'panel', undefined, 'inspector-panel');
  const parts = uiiBuildHead(p);
  const body = uiiEl('div', 'body', undefined, 'panel-body');
  // The tree sits beside the body, not in it, so pinning from the tree
  // re-renders the fields and leaves the list where it was.
  const tree = uiiEl('div', 'tree', undefined, 'dom-tree');
  tree.hidden = true;
  const split = uiiEl('div', 'split');
  split.append(tree, body);
  p.append(parts.head, split);
  sh.appendChild(p);
  uiiState.panel = Object.assign({ root: p, body, tree }, parts);
  uiiTreeBind(tree);
  uiiDrag(parts.head, p);
  uiiResize(p);
}

function uiiDrag(handle, box) {
  let sx = 0, sy = 0, ox = 0, oy = 0;
  const move = (e) => {
    box.style.left = Math.max(0, ox + e.clientX - sx) + 'px';
    box.style.top = Math.max(0, oy + e.clientY - sy) + 'px';
    box.style.right = 'auto';
  };
  // Capture phase: the overlay stops propagation of mouseup outside the panel,
  // and only same-node capture listeners still run after that.
  const up = () => { window.removeEventListener('mousemove', move, true); window.removeEventListener('mouseup', up, true); };
  handle.addEventListener('mousedown', (e) => {
    if (e.target.tagName === 'BUTTON') return;
    const r = box.getBoundingClientRect();
    sx = e.clientX; sy = e.clientY; ox = r.left; oy = r.top;
    window.addEventListener('mousemove', move, true);
    window.addEventListener('mouseup', up, true);
    e.preventDefault();
  });
}

// Drag any edge or corner to resize, as in a desktop window: the opposite
// edge stays put, and the panel stays inside the window. Same capture-listener
// pattern as uiiDrag.
const UII_EDGES = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
const UII_MIN_W = 320, UII_MIN_H = 120;

function uiiResize(box) {
  let dir = '', sx = 0, sy = 0, r0 = null;
  const move = (e) => {
    const dx = e.clientX - sx, dy = e.clientY - sy;
    let { left, top, right, bottom } = r0;
    if (dir.includes('w')) left = Math.max(0, Math.min(right - UII_MIN_W, left + dx));
    if (dir.includes('e')) right = Math.min(window.innerWidth, Math.max(left + UII_MIN_W, right + dx));
    if (dir.includes('n')) top = Math.max(0, Math.min(bottom - UII_MIN_H, top + dy));
    if (dir.includes('s')) bottom = Math.min(window.innerHeight, Math.max(top + UII_MIN_H, bottom + dy));
    Object.assign(box.style, { left: left + 'px', top: top + 'px', right: 'auto', width: right - left + 'px' });
    // A height set by hand replaces the fit-to-content one (CSS max-height).
    if (/[ns]/.test(dir)) Object.assign(box.style, { height: bottom - top + 'px', maxHeight: 'none' });
  };
  const up = () => { window.removeEventListener('mousemove', move, true); window.removeEventListener('mouseup', up, true); };
  for (const d of UII_EDGES) {
    const g = uiiEl('div', 'grip ' + d, undefined, 'resize-' + d);
    g.addEventListener('mousedown', (e) => {
      dir = d; sx = e.clientX; sy = e.clientY; r0 = box.getBoundingClientRect();
      window.addEventListener('mousemove', move, true);
      window.addEventListener('mouseup', up, true);
      e.preventDefault();
    });
    box.appendChild(g);
  }
}

// Switching views (P, T) swaps what the panel holds, and a fit-to-content
// panel would jump to the new content's height. An open panel keeps the size it has, as if the
// user had resized it by hand (see uiiResize).
function uiiHoldPanelSize(p) {
  if (!p.classList.contains('on') || p.classList.contains('min')) return;
  const r = p.getBoundingClientRect();
  Object.assign(p.style, { width: r.width + 'px', height: r.height + 'px', maxHeight: 'none' });
}

// btn: the Copy button pressed, if any. It shows the result in its own
// place for 2s, then its label comes back. label: the success message, when
// the copied text is worth echoing.
function uiiCopy(text, btn, label) {
  const S = uiiState;
  // Both places: the panel's own line, and the badge for when C was pressed
  // with the panel closed.
  const say = (msg) => {
    uiiPointerSay(msg);
    if (btn) { uiiButtonSay(btn, msg); return; }
    uiiFlash(msg);
    if (S.panel) S.panel.ok.textContent = msg;
  };
  const done = () => {
    say(label || '✅ copied');
    setTimeout(() => { if (S.panel) S.panel.ok.textContent = ''; }, 1200);
  };
  if (typeof S.opts.onCopy === 'function') { S.opts.onCopy(text); done(); return; }
  if (!navigator.clipboard) { say('⚠ clipboard blocked'); return; } // plain http: no clipboard API
  navigator.clipboard.writeText(text).then(done, () => say('⚠ clipboard blocked'));
}

function uiiButtonSay(btn, msg) {
  if (!btn.dataset.label) {
    btn.dataset.label = btn.textContent;
    btn.style.minWidth = btn.offsetWidth + 'px'; // no jump when the text is shorter
  }
  btn.textContent = msg;
  clearTimeout(btn.uiiTimer);
  btn.uiiTimer = setTimeout(() => {
    btn.textContent = btn.dataset.label;
    delete btn.dataset.label;
    btn.style.minWidth = '';
  }, 2000);
}

// A section-bar checkbox bound to the uiiState flag key; then runs after it flips.
function uiiCheck(key, text, title, then) {
  const lab = uiiEl('label', 'sim');
  const box = uiiEl('input', '', undefined, uiiSlug(text));
  box.type = 'checkbox';
  box.checked = uiiState[key];
  lab.title = title;
  lab.append(box, document.createTextNode(text));
  box.addEventListener('change', () => { uiiState[key] = box.checked; if (then) then(); });
  return lab;
}

function uiiRow(k, v, swatchHex) {
  const row = uiiEl('div', 'row', undefined, 'row-' + uiiSlug(k));
  row.appendChild(uiiEl('span', 'k', k));
  const val = uiiEl('span', 'v');
  if (swatchHex && swatchHex !== 'transparent') {
    const sw = uiiEl('span', 'sw');
    const i = uiiEl('i');
    i.style.background = swatchHex;
    sw.appendChild(i);
    val.appendChild(sw);
  }
  val.appendChild(document.createTextNode(v));
  row.appendChild(val);
  return row;
}

function uiiRenderPanel(info) {
  const P = uiiState.panel;
  if (!P) return;
  uiiState.varsMode = false; // a selection is an element view, whatever was open
  P.name.textContent = info.name;
  P.tag.textContent = '<' + info.tag + '>';
  const b = P.body;
  b.textContent = '';
  const idHead = uiiEl('div', 'sec', 'Identity ', 'section-identity');
  const copyAI = uiiEl('button', 'mini', '📋 Copy ID', 'copy-id');
  copyAI.title = 'One line: name, selector, element, stylesheet rules';
  copyAI.addEventListener('click', () => uiiCopy(uiiFormatForAI(info), copyAI));
  idHead.append(uiiCheck('autoCopy', ' Auto copy', 'Copy the ID line on every click, no Cmd/Ctrl needed', uiiAutoCopySave), copyAI);
  b.appendChild(idHead);
  b.appendChild(uiiRow('Selector', info.path));
  if (info.id) b.appendChild(uiiRow('id', info.id));
  if (info.classes.length) b.appendChild(uiiRow('class', info.classes.join(' ')));
  const textRow = uiiTextContentField(info);
  if (textRow) b.appendChild(textRow);
  b.appendChild(uiiRow('Size', info.width + ' × ' + info.height + 'px · ' + info.display + ' · font ' + info.fontSize));

  // Where-to-edit and the matched-rule list live in the Copy buttons; the
  // Changes box names the one rule each edit touches.
  const stHead = uiiEl('div', 'sec', 'Style — type, ↑↓ or drag a label ', 'section-style');
  stHead.appendChild(uiiCheck('similar', ' Apply to similar',
    'Also edit the CSS rule itself, so every element it styles changes too',
    () => { uiiSyncRules(); uiiRefreshChanges(); }));
  b.appendChild(stHead);
  uiiRenderEditRows(b, info);

  uiiChangesBox(b);
  P.vars.classList.remove('on');
  uiiTreeReveal(info.el); // however the element was picked, the tree follows
  P.reset.disabled = !uiiEditsFor(info.el, false) && !uiiVarEdits.size;
  P.root.classList.add('on');
}

/* ================= ids for every panel element =================
   The panel and the color picker popup name their controls by hand (see
   uiiEl); this fills in the rest — wrappers, labels, the picker's own parts —
   so "copy ID" can aim at any of them. id = nearest named ancestor + tag (+
   first class) + position among the same kind inside that ancestor, e.g.
   card-border-span-lab-2. Written as id and data-ui, like the hand names. */

const UII_ID_ROOTS = '#inspector-panel, #color-picker';

function uiiKey(el) {
  const cls = (el.getAttribute('class') || '').trim().split(/\s+/)[0];
  return uiiSlug(el.localName + (cls ? '-' + cls : ''));
}

// Position of every element under `up` among those of its kind, one pass.
function uiiKindIndex(up) {
  const seen = {}, at = new Map();
  for (const o of up.querySelectorAll('*')) { const k = uiiKey(o); at.set(o, seen[k] = (seen[k] || 0) + 1); }
  return at;
}

function uiiAutoId(sh) {
  const run = () => {
    const idx = new Map();
    for (const el of sh.querySelectorAll(UII_ID_ROOTS.split(', ').map((r) => r + ' *:not([id])').join(', '))) {
      const up = el.parentElement.closest('[id]');
      const key = uiiKey(el);
      if (!idx.has(up)) idx.set(up, uiiKindIndex(up));
      let id = up.id + '-' + key + '-' + idx.get(up).get(el);
      while (sh.getElementById(id)) id += '-x';
      el.id = id;
      el.setAttribute('data-ui', id);
    }
  };
  run();
  new MutationObserver(run).observe(sh, { childList: true, subtree: true });
}

/* ================= keyboard =================
   The shortcut that opens and closes inspect mode, and every key that acts
   while it is on: Escape, the arrow walk, and the bare letters that stand in
   for panel buttons. Bound once by uiiInit, in capture phase, so the app
   underneath never sees a key the inspector has claimed. */

// "Mod+Shift+/" -> { mod, ctrl, meta, alt, shift, key }
function uiiParseShortcut(s) {
  if (!s) return null;
  const k = { mod: false, ctrl: false, meta: false, alt: false, shift: false, key: '' };
  for (const part of String(s).split('+')) {
    const p = part.trim().toLowerCase();
    if (p === 'mod') k.mod = true;
    else if (p === 'ctrl' || p === 'control') k.ctrl = true;
    else if (p === 'cmd' || p === 'meta' || p === 'command') k.meta = true;
    else if (p === 'alt' || p === 'option') k.alt = true;
    else if (p === 'shift') k.shift = true;
    else k.key = p;
  }
  return k;
}

function uiiKeyMatches(e, k) {
  if (!k) return false;
  const plat = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '';
  const mac = /mac|iphone|ipad/i.test(plat);
  const wantMeta = k.meta || (k.mod && mac);
  const wantCtrl = k.ctrl || (k.mod && !mac);
  if (e.metaKey !== wantMeta || e.ctrlKey !== wantCtrl) return false;
  if (e.altKey !== k.alt || e.shiftKey !== k.shift) return false;
  const key = (e.key || '').toLowerCase();
  const code = (e.code || '').toLowerCase();
  return key === k.key || code === k.key || code === 'key' + k.key || code === 'digit' + k.key;
}

// Only boxes that take typing: a focused checkbox or color swatch must not
// swallow the shortcuts.
const UII_TEXT_INPUT = /^(text|search|email|url|tel|password|number|date|time|datetime-local|month|week)$/;

function uiiInEditable(t) {
  return !!t && ((t.tagName === 'INPUT' && UII_TEXT_INPUT.test(t.type)) || t.tagName === 'TEXTAREA' || t.isContentEditable);
}

// Arrow keys walk the DOM from the pinned element, DevTools style.
function uiiWalk(dir) {
  const S = uiiState;
  const cur = S.selected;
  if (!cur) return;
  let next = null;
  if (dir === 'ArrowUp') next = cur.parentElement;
  else if (dir === 'ArrowDown') next = cur.firstElementChild;
  else if (dir === 'ArrowLeft') next = cur.previousElementSibling;
  else if (dir === 'ArrowRight') next = cur.nextElementSibling;
  if (next && next !== document.documentElement && next !== S.host) uiiSelect(next);
}

function uiiOnKey(e) {
  const S = uiiState;
  if (uiiKeyMatches(e, S.key)) {
    if (!S.on && uiiInEditable(e.target)) return; // leave the editor's own binding alone
    e.preventDefault();
    e.stopPropagation();
    uiiToggle();
    return;
  }
  if (!S.on) return;
  if (e.key === 'Alt') { if (!e.repeat) uiiHintsSoon(); return; }
  // Shadow DOM retargets e.target to S.host for anything inside the panel —
  // a focused button reports the same target as a focused text input. Use
  // composedPath() to find what was actually focused, so Escape/arrows still
  // work after clicking a panel button; only real text entry gets skipped.
  // A page field can still hold focus from before inspect mode opened, and
  // its typing must stay typing — C is a shortcut only outside a text box.
  // Esc still works from a panel box or a page field: while inspecting it
  // means "quit", so the page's own Esc (clear a search) must not take it.
  if (uiiInEditable(e.target) && e.key !== 'Escape') return;
  const box = e.target === S.host && uiiInEditable(e.composedPath()[0]) ? e.composedPath()[0] : null;
  if (box && e.key !== 'Escape') return;
  if (e.key === 'Escape') {
    e.preventDefault();
    e.stopPropagation();
    if (box) box.blur(); // fires 'change', so a typed value lands before quitting
    // First Escape closes an open var list or color panel.
    if (S.cvList) uiiCloseVarList(); else if (uiiColorPickerOpen()) uiiDismissColorPicker(); else uiiDisable();
    return;
  }
  if (uiiColorPickerOpen()) return; // the color panel owns arrows and letters while it is open
  if (/^Arrow(Up|Down|Left|Right)$/.test(e.key) && S.selected) {
    e.preventDefault(); e.stopPropagation(); uiiWalk(e.key);
    return;
  }
  // The shortcuts with a modifier: Cmd/Ctrl+Z takes back the last edit,
  // Cmd/Ctrl+I copies the hovered color with no click. Guarded above, so
  // inside a text box they stay the browser's own undo and italic.
  if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'z') {
    uiiKeyAction(e, uiiUndo);
    return;
  }
  if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'i') {
    uiiKeyAction(e, uiiCopyHoverColor);
    return;
  }
  // Bare letters only: Cmd/Ctrl+C still copies whatever is selected, in the
  // panel or on the page. Each is a panel button without the reach — C the
  // Copy ID line, A the Changes box, V the Normal view toggle, P the page
  // variables, T the DOM tree, I the color picker.
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key.toLowerCase();
  if (k === 'c' && S.info) uiiKeyAction(e, () => uiiCopy(uiiFormatForAI(S.info)));
  else if (k === 'a') uiiKeyAction(e, uiiCopyChanges);
  else if (k === 'v') uiiKeyAction(e, uiiPeek);
  else if (k === 'p') uiiKeyAction(e, uiiToggleVars);
  else if (k === 't') uiiKeyAction(e, uiiToggleTree);
  else if (k === 'i' && window.EyeDropper) uiiKeyAction(e, uiiPickColor);
}

// A single-letter shortcut swallows its key, so the app underneath never
// sees it while inspect mode is on.
function uiiKeyAction(e, run) { e.preventDefault(); e.stopPropagation(); run(); }

// Hold Alt: the panel dims and every control with a key shows it. A short
// wait first, so a quick Alt+click (pick the exact element) does not flash.
const UII_HINTS = [
  ['undo-edit', 'Ctrl/Cmd+Z', 'undo last edit'],
  ['dom-tree-toggle', 'T', 'DOM tree'],
  ['vars-mode', 'P', 'page variables'],
  ['normal-view', 'V', 'normal view'],
  ['color-picker', 'I', 'color picker'],
  ['copy-id', 'C', 'copy ID'],
  ['copy-for-ai', 'A', 'copy all changes'],
];

function uiiHintsSoon() {
  clearTimeout(uiiState.hintTimer);
  uiiState.hintTimer = setTimeout(() => uiiHints(true), 300);
}

function uiiHints(on) {
  const S = uiiState;
  clearTimeout(S.hintTimer);
  const P = S.panel;
  if (!P) return;
  const p = P.root;
  p.querySelectorAll('.hk').forEach((t) => t.remove());
  p.classList.toggle('hints', on && p.classList.contains('on'));
  if (!p.classList.contains('hints')) return;
  const pr = p.getBoundingClientRect();
  const placed = [];
  const hit = (a) => placed.some((b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom);
  // Right to left, so neighbouring header keys step down like stairs instead of overlapping.
  for (const [id, key, what] of UII_HINTS.slice().reverse()) {
    const el = p.querySelector('#' + id);
    if (!el || !el.offsetParent) continue; // folded away or not on this view
    const r = el.getBoundingClientRect();
    if (r.bottom <= pr.top || r.top >= pr.bottom) continue; // scrolled out of the body
    const tip = uiiEl('div', 'hk');
    tip.append(uiiEl('b', '', key), document.createTextNode(' - ' + what));
    // Right edges line up: the buttons sit at the panel's right side.
    let top = r.bottom - pr.top + 4;
    Object.assign(tip.style, { top: top + 'px', right: pr.right - r.right + 'px' });
    p.appendChild(tip);
    let tr = tip.getBoundingClientRect();
    while (hit(tr)) { top += tr.height + 2; tip.style.top = top + 'px'; tr = tip.getBoundingClientRect(); }
    placed.push(tr);
  }
}

function uiiOnKeyUp(e) { if (e.key === 'Alt') uiiHints(false); }
function uiiHintsOff() { uiiHints(false); } // the window lost focus: Alt's keyup may never come

/* ================= public API + keyboard =================
   UIInspector.init(opts) binds the shortcut; toggle()/enable()/disable()
   drive it by hand; destroy() removes everything including the shortcut. */

const UII_DEFAULTS = {
  shortcut: 'Mod+\\',          // Mod = Cmd on macOS, Ctrl elsewhere; null = no key binding
  selectors: ['button', 'input', 'select', 'textarea', 'a', 'label', 'summary',
    'section', '[role]', '[id]', '[data-ui]', '[contenteditable]'],
  nameAttr: 'data-ui',        // attribute the app uses to label components
  // Attribute holding a source location the app stamped on the element, e.g.
  // "grid-rows.js:33". It is a location, not a name: it never enters the name
  // chain, and null turns the whole feature off.
  srcAttr: 'data-src',
  ignore: [],                 // selectors never outlined or selectable
  maxOutlines: 400,           // cap on outline boxes per frame
  // Time budget for ONE scan, in ms. This is a hard cap on the whole walk, not
  // only on how much it outlines, because reading a rect is the expensive half:
  // on a list whose rows opt into `content-visibility: auto` every
  // getBoundingClientRect() forces the layout that rule was skipping, so a
  // 56,000-element document measured ~3 ms PER ELEMENT — three minutes with the
  // renderer pinned and no key reaching the page. Anything left unscanned is
  // simply not outlined this frame; a scroll or a mutation reschedules the draw.
  maxScanMs: 120,
  scripts: null,              // (url) => bool: which <script src> to scan for the element; default skips vendor/
  onCopy: null,               // (text) => void; default navigator.clipboard
  onToggle: null,             // (on) => void
  // Open the DOM-tree column as soon as inspect mode turns on. Every row in it
  // carries its own ↺, and a list that needs a key nobody told you about is a
  // list nobody finds. Off by default: it widens the panel by UII_TREE_W.
  tree: false,
};

// Auto copy survives a reload in the page's localStorage. Storage can be
// blocked (private mode, sandboxed frame): then the box just starts unticked.
const UII_AUTO_COPY_KEY = 'ui-inspector.autoCopy';
function uiiAutoCopySaved() {
  try { return localStorage.getItem(UII_AUTO_COPY_KEY) === '1'; } catch (_) { return false; }
}
function uiiAutoCopySave() {
  try { localStorage.setItem(UII_AUTO_COPY_KEY, uiiState.autoCopy ? '1' : '0'); } catch (_) { /* not saved */ }
}

const uiiState = {
  similar: true,  // edits also rewrite the CSS rule (see editrules.js)
  autoCopy: uiiAutoCopySaved(), // every plain click also copies the Copy ID line (see uiiOnClick)
  opts: null, selList: '', on: false, bound: false,
  host: null, shadow: null, layer: null, hoverBox: null, tip: null,
  badge: null, scratch: null, panel: null, boxes: [], raf: 0, mo: null,
  hovered: null, selected: null, info: null, key: null, sources: null,
  mgBox: null, pdBox: null, spv: null, badgeTimer: 0, ptrToast: null, ptrTimer: 0, badgeHtml: '', peek: false,
  picks: [], pickBoxes: [], pickSeq: 0,  // Shift+click list: [{el, ready}] and its numbered boxes
  mx: 0, my: 0, pos: false,  // last pointer position, tracked while bound (see uiiTrackPointer)
};

// How long the hint at the top stays before it fades. It says what the keys
// do; once it has been read it is a strip across whatever sits under it.
const UII_BADGE_MS = 2000;

function uiiEnable() {
  const S = uiiState;
  if (S.on) return;
  S.on = true;
  uiiMount();
  uiiBindEvents();
  uiiDrawOutlines();
  uiiScriptIndex(); // warm the script scan; never rejects (each fetch catches)
  uiiOpenAtPointer();
  if (S.opts.tree) uiiToggleTree();
  S.badgeTimer = setTimeout(() => { if (S.badge) S.badge.classList.add('off'); }, UII_BADGE_MS);
  if (typeof S.opts.onToggle === 'function') S.opts.onToggle(true);
}

function uiiDisable() {
  const S = uiiState;
  if (!S.on) return;
  S.on = false;
  clearTimeout(S.badgeTimer);
  uiiCloseVarList();
  uiiCloseColorPicker();
  uiiUnbindEvents();
  if (S.raf) cancelAnimationFrame(S.raf);
  clearTimeout(S.drawTimer); // a redraw waiting out uiiScheduleDraw's gap
  clearTimeout(S.treeTimer); clearTimeout(S.chgTimer); // their targets go with the panel
  S.raf = 0;
  uiiUnmount();
  S.hovered = S.selected = S.info = null;
  S.picks = [];
  S.peek = false;
  if (typeof S.opts.onToggle === 'function') S.opts.onToggle(false);
}

function uiiToggle() {
  if (uiiState.on) uiiDisable(); else uiiEnable();
}

function uiiInit(opts) {
  const S = uiiState;
  S.opts = Object.assign({}, UII_DEFAULTS, opts || {});
  S.selList = S.opts.selectors.join(',');
  S.key = uiiParseShortcut(S.opts.shortcut);
  if (!S.bound) {
    window.addEventListener('keydown', uiiOnKey, true);
    window.addEventListener('keyup', uiiOnKeyUp, true);
    window.addEventListener('blur', uiiHintsOff);
    window.addEventListener('mousemove', uiiTrackPointer, { capture: true, passive: true });
    S.bound = true;
  }
  return uiiApi;
}

function uiiDestroy() {
  uiiDisable();
  if (uiiState.bound) {
    window.removeEventListener('keydown', uiiOnKey, true);
    window.removeEventListener('keyup', uiiOnKeyUp, true);
    window.removeEventListener('blur', uiiHintsOff);
    window.removeEventListener('mousemove', uiiTrackPointer, true);
  }
  uiiState.bound = false;
}

const uiiApi = {
  init: uiiInit,
  enable: uiiEnable,
  disable: uiiDisable,
  toggle: uiiToggle,
  destroy: uiiDestroy,
  select: (el) => { uiiEnable(); uiiSelect(el); },
  info: () => uiiState.info,
  isOn: () => uiiState.on,
  formatForAI: uiiFormatForAI,
  formatDetails: uiiFormatDetails,
  isCovered: (el) => uiiOcclusion()(el, el.getBoundingClientRect()),
  editCount: uiiEditCount,
};

global.UIInspector = uiiApi;
if (typeof module !== 'undefined' && module.exports) module.exports = uiiApi;
})(typeof window !== 'undefined' ? window : globalThis);
