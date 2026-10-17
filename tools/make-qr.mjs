#!/usr/bin/env node
// Generate the registration QR (MLH URL from content/facts.json) as a module matrix for PIXEL-ART drawing:
//   content/qr-mlh.json   { url, size, ecc, matrix: ["1010...", ...] }   (1 = dark module; no quiet zone included)
//   assets/img/qr-mlh.png reference PNG (dark teal on cream, 4-module quiet zone, 8 px per module)
// Draw it on the pixel layer: 1 module = 1 low-res pixel (or 2 for scanning comfort), cream background +
// tealDeep modules, keep a 2-4 module cream quiet zone around it. Scan-test your still with a phone.
import fs from 'node:fs';
import path from 'node:path';
import QRCode from 'qrcode';
import { ROOT } from './lib/browser.mjs';

const facts = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/facts.json'), 'utf8'));
const url = facts.registration.url;
const ecc = 'M';
const qr = QRCode.create(url, { errorCorrectionLevel: ecc });
const n = qr.modules.size;
const rows = [];
for (let y = 0; y < n; y++) {
  let s = '';
  for (let x = 0; x < n; x++) s += qr.modules.get(y, x) ? '1' : '0';
  rows.push(s);
}
fs.writeFileSync(path.join(ROOT, 'content/qr-mlh.json'), JSON.stringify({ url, size: n, ecc, matrix: rows }, null, 1) + '\n');
await QRCode.toFile(path.join(ROOT, 'assets/img/qr-mlh.png'), url, { errorCorrectionLevel: ecc, margin: 4, scale: 8, color: { dark: '#173B38', light: '#F7F7F2' } });
console.log(`QR ${n}x${n} modules (ECC ${ecc}) for ${url}`);
