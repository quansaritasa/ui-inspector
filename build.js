#!/usr/bin/env node
// Concatenate src/*.js (fixed order) into dist/ui-inspector.js — one file an
// app can drop in with a single <script> tag. No transpiling, no minifying.
const fs = require('fs');
const path = require('path');

const ORDER = ['styles', 'format', 'cssvars', 'sources', 'inspect', 'occlusion', 'overlay', 'spacing', 'events', 'editrows', 'editrules', 'edittext', 'editvar', 'editnum', 'colorpick', 'editcolor', 'editvars', 'editprops', 'editfields', 'content', 'undo', 'tree', 'panelhead', 'panel', 'keys', 'core'];
const SRC = path.join(__dirname, 'src');
const OUT = path.join(__dirname, 'dist', 'ui-inspector.js');
const pkg = require('./package.json');

const parts = ORDER.map((n) => fs.readFileSync(path.join(SRC, n + '.js'), 'utf8'));
// The vendored colour picker (vendor/): its own scope, so none of its names meet ours.
const vjs = fs.readFileSync(path.join(__dirname, 'vendor', 'color-picker.js'), 'utf8');
const vcss = fs.readFileSync(path.join(__dirname, 'vendor', 'color-picker.css'), 'utf8').trim();
const vendor = `const UiiColorPicker = (() => {\n${vjs}\nreturn ColorPicker;\n})();\nconst UII_CP_CSS = ${JSON.stringify('\n' + vcss + '\n')};\n`;
const body = vendor + parts.join('\n');
const out = `/*! ui-inspector v${pkg.version} — ${pkg.description}
 * ${pkg.homepage || ''}  (${pkg.license})
 * Built from src/ by build.js — edit the sources, not this file. */
(function (global) {
'use strict';

${body}
global.UIInspector = uiiApi;
if (typeof module !== 'undefined' && module.exports) module.exports = uiiApi;
})(typeof window !== 'undefined' ? window : globalThis);
`;
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, out);
fs.copyFileSync(OUT, path.join(__dirname, 'extension', 'ui-inspector.js')); // the extension can only load files inside its own folder
console.log(`[ui-inspector] built ${path.relative(process.cwd(), OUT)} (${out.split('\n').length} lines)`);

// Chrome shows the manifest's version on chrome://extensions, so it is not a
// second place to bump by hand: derive it here. Only the number is rewritten.
const MANIFEST = path.join(__dirname, 'extension', 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
if (manifest.version !== pkg.version) {
  manifest.version = pkg.version;
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`[ui-inspector] extension manifest → v${pkg.version}`);
}
