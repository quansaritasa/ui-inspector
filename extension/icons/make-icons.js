#!/usr/bin/env node
// Draw the toolbar mark at every size Chrome asks for, with no dependencies:
// supersample a coverage mask, then hand-roll a PNG (zlib + CRC32). run:
//   node extension/icons/make-icons.js
// The mark is the panel's blue selection frame with the pinned element inside
// it, and the stroke is thick enough to survive a 16px toolbar button.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const BLUE = [59, 130, 246]; // #3b82f6, the panel's own outline blue
const SIZES = [16, 32, 48, 128];
const SS = 8; // supersamples per axis

// Is (x, y) — both 0..1 — inside a rounded rect inset from the edges?
function inRect(x, y, inset, radius) {
  const lo = inset, hi = 1 - inset;
  if (x < lo || x > hi || y < lo || y > hi) return false;
  const cx = Math.min(Math.max(x, lo + radius), hi - radius);
  const cy = Math.min(Math.max(y, lo + radius), hi - radius);
  if (x >= lo + radius && x <= hi - radius) return true;
  if (y >= lo + radius && y <= hi - radius) return true;
  return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2;
}

function ink(x, y) {
  const frame = inRect(x, y, 0.06, 0.12) && !inRect(x, y, 0.26, 0.03);
  const pinned = x >= 0.30 && x <= 0.70 && y >= 0.30 && y <= 0.70;
  return frame || pinned;
}

function render(size) {
  const n = size * SS;
  const mask = new Uint8Array(n * n);
  for (let py = 0; py < n; py++) {
    for (let px = 0; px < n; px++) mask[py * n + px] = ink((px + 0.5) / n, (py + 0.5) / n) ? 1 : 0;
  }
  const rgba = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let sum = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) sum += mask[(y * SS + sy) * n + x * SS + sx];
      }
      const i = (y * size + x) * 4;
      rgba[i] = BLUE[0];
      rgba[i + 1] = BLUE[1];
      rgba[i + 2] = BLUE[2];
      rgba[i + 3] = Math.round((sum / (SS * SS)) * 255);
    }
  }
  return rgba;
}

const CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return (buf) => {
    let c = -1;
    for (const b of buf) c = t[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ -1) >>> 0;
  };
})();

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(CRC(body));
  return Buffer.concat([len, body, crc]);
}

function png(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  const stride = size * 4 + 1;
  const raw = Buffer.alloc(size * stride);
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0; // filter: none
    rgba.copy(raw, y * stride + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// The store asks for 96x96 of artwork inside a 128x128 image, so draw the mark
// at 104 (its own margin lands the ink at ~96) and centre it in transparent padding; the toolbar sizes stay full bleed.
for (const size of SIZES) {
  const file = path.join(__dirname, `icon-${size}.png`);
  if (size !== 128) {
    fs.writeFileSync(file, png(size, render(size)));
    continue;
  }
  const art = 104;
  const big = render(art);
  const canvas = Buffer.alloc(size * size * 4);
  for (let y = 0; y < art; y++) {
    big.copy(canvas, ((y + 12) * size + 12) * 4, y * art * 4, (y + 1) * art * 4);
  }
  fs.writeFileSync(file, png(size, canvas));
}
console.log(`[ui-inspector] wrote icon-{${SIZES.join(',')}}.png to ${__dirname} (128 = 96px art + padding)`);
