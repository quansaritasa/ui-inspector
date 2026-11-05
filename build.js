#!/usr/bin/env node
// Concatenate src/*.js (fixed order) into dist/ui-inspector.js — one file an
// app can drop in with a single <script> tag. No transpiling, no minifying.
const fs = require('fs');
const path = require('path');

const ORDER = ['styles', 'format', 'cssvars', 'sources', 'inspect', 'occlusion', 'overlay', 'spacing', 'events', 'editrows', 'editrules', 'edittext', 'editvar', 'editnum', 'editfields', 'content', 'panel', 'core'];
const SRC = path.join(__dirname, 'src');
const OUT = path.join(__dirname, 'dist', 'ui-inspector.js');
const pkg = require('./package.json');

const parts = ORDER.map((n) => fs.readFileSync(path.join(SRC, n + '.js'), 'utf8'));
const body = parts.join('\n');
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
console.log(`[ui-inspector] built ${path.relative(process.cwd(), OUT)} (${out.split('\n').length} lines)`);
