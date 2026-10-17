// scenes/uno-q.js (owner F) C21, cue v2.6 "Sixteen Arduino Uno Qs up for grabs this time".
// A makerspace pegboard. "×16" stamps with the vocal ("Sixteen"), ARDUINO / UNO Q on the next beat. Sixteen pixel
// UNO Q boards (teal-blue PCB, UNO footprint, header rows, USB-C, two chips, LED matrix) rain down and snap into a
// 4x4 grid bottom-up, a few per beat; each board's LED matrix lights up with a heart as it lands, and on the last
// beat all sixteen matrices ripple. Generic board art only (no logos). Never implies how boards are distributed.
import { C, RAMP } from '../lib/palette.js';
import { ease, clamp, onTwos, hash } from '../lib/motion.js';
import { rect, px as dot, dither } from '../lib/pixel.js';
import { sparkle } from '../lib/world.js';
import { clock, painter, outlined, drawSquash, squashAt, puff, lbl, R } from './_F-kit.js';

const W = RAMP.water, T = RAMP.tower;
export const BW = 34, BH = 26; // board footprint (USB-C sticks out 2px on the left)

/** The UNO Q board, top view, lit from the upper-left. Canvas 36x26; board body at x 2..35. */
export function boardArt() {
  const raw = painter('unoq-board2', BW + 2, BH, (p) => {
    const ox = 2;
    const put = p.put;
    for (let y = 0; y < BH; y++) for (let x = 0; x < BW; x++) {
      // chamfered right corners (UNO footprint notch)
      if (x > BW - 3 + y || x > BW - 3 + (BH - 1 - y)) continue;
      let col = W[1];
      if (y === 0 || x === 0) col = W[3];
      else if (y === BH - 1 || x === BW - 1 || x > BW - 3 + y - 1 || x > BW - 3 + (BH - 1 - y) - 1) col = W[0];
      put(ox + x, y, col);
    }
    // copper traces (lighter teal-blue)
    for (let x = 14; x <= 22; x++) put(ox + x, 13, W[2]);
    for (let y = 13; y <= 16; y++) put(ox + 22, y, W[2]);
    for (let x = 5; x <= 12; x++) put(ox + x, 17, W[2]);
    for (let y = 3; y <= 6; y++) put(ox + 14, y, W[2]);
    // top header (digital pins): black strip with holes
    for (let x = 8; x <= 31; x++) { put(ox + x, 1, RAMP.ink[1]); put(ox + x, 2, x % 2 ? RAMP.ink[0] : RAMP.ink[1]); }
    put(ox + 8, 1, RAMP.stone[0]);
    // bottom headers (power + analog)
    for (const [a, b] of [[9, 16], [19, 30]]) for (let x = a; x <= b; x++) { put(ox + x, 23, RAMP.ink[1]); put(ox + x, 24, x % 2 ? RAMP.ink[0] : RAMP.ink[1]); }
    // USB-C shell on the left edge (silver, seen from above)
    for (let y = 4; y <= 7; y++) for (let x = 0; x <= 4; x++) put(x, y, y === 4 ? T[4] : y === 7 ? T[0] : x === 0 ? T[3] : y === 5 ? T[3] : T[2]);
    // MPU (big square chip) + MCU (small chip)
    const chip = (x0, y0, s) => {
      for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) put(ox + x0 + x, y0 + y, y === 0 || x === 0 ? RAMP.stone[0] : RAMP.ink[1]);
      put(ox + x0 + 1, y0 + 1, T[1]);
    };
    chip(4, 5, 9);
    chip(24, 15, 6);
    for (let i = 0; i < 6; i += 2) { put(ox + 23, 15 + i, T[0]); put(ox + 30, 16 + i, T[0]); }
    // LED matrix (unlit dots), 8 x 4
    for (let j = 0; j < 4; j++) for (let i = 0; i < 8; i++) put(ox + 16 + i * 2, 4 + j * 2, W[0]);
    // mounting holes: gold rings
    for (const [hx, hy] of [[2, 21], [31, 19]]) {
      put(ox + hx - 1, hy, RAMP.glow[1]); put(ox + hx + 1, hy, RAMP.glow[1]); put(ox + hx, hy - 1, RAMP.glow[3]); put(ox + hx, hy + 1, RAMP.glow[1]);
      put(ox + hx, hy, RAMP.ink[0]);
    }
    // silkscreen: pin-1 ticks + a small white label box
    for (let x = 4; x <= 11; x++) { put(ox + x, 19, T[3]); }
    put(ox + 4, 20, T[3]); put(ox + 11, 20, T[3]);
  });
  return outlined('unoq-board2', raw, RAMP.ink[0]);
}
// LED matrix origin on the outlined canvas (+1 outline, +2 USB-C offset)
const LED = { x: 1 + 2 + 16, y: 1 + 4 };
const HEART = ['.X.X.', 'XXXXX', '.XXX.', '..X..'];

const LAYOUT = {
  '16x9': { gx: 147, gy: 31, gap: 5, panel: [138, 22, 169, 137] },
  '9x16': { gx: 18, gy: 112, gap: 3, panel: [8, 102, 165, 133] },
};

function pegboard(px, [x, y, w, h]) {
  rect(px, x + 2, y + 2, w, h, C.tealDeep);                 // cast shadow
  rect(px, x, y, w, h, C.tealDark);
  rect(px, x, y, w, 1, RAMP.teal[5]);
  rect(px, x, y, 1, h, RAMP.teal[5]);
  rect(px, x, y + h - 1, w, 1, RAMP.teal[1]);
  rect(px, x + w - 1, y, 1, h, RAMP.teal[1]);
  for (let yy = y + 3; yy < y + h - 2; yy += 4) for (let xx = x + 3; xx < x + w - 2; xx += 4) dot(px, xx, yy, RAMP.teal[1]);
  // screws in the corners
  for (const [sx, sy] of [[x + 2, y + 2], [x + w - 3, y + 2], [x + 2, y + h - 3], [x + w - 3, y + h - 3]]) dot(px, sx, sy, RAMP.stone[2]);
}

export default {
  id: 'uno-q',
  draw(g, t, c) {
    const { px, hi } = g;
    const k = clock(c, 'v2.6');
    const L = LAYOUT[c.fmt] || LAYOUT['16x9'];
    const n = (c.facts.hardware && c.facts.hardware.count) || 16;
    const cols = 4, rows = Math.ceil(n / cols);
    pegboard(px, L.panel);

    // landing order: bottom row first, shuffled within each row
    const order = [];
    for (let r = rows - 1; r >= 0; r--) {
      const rowIdx = [0, 1, 2, 3].map((cIdx) => ({ cIdx, h: hash(r, cIdx, 21) })).sort((a, b) => a.h - b.h);
      for (const { cIdx } of rowIdx) if (r * cols + cIdx < n) order.push(r * cols + cIdx);
    }
    const spanBeats = 2.5;
    const landAt = new Array(n);
    order.forEach((cell, i) => { landAt[cell] = k.beat((i * spanBeats) / Math.max(1, n - 1)); });
    const fall = Math.min(0.2, k.spb * 0.34);
    const tWave = k.beat(3);
    const board = boardArt();
    const tq = onTwos(t);

    for (let cell = 0; cell < n; cell++) {
      const r = Math.floor(cell / cols), cc = cell % cols;
      const x = L.gx + cc * (BW + L.gap), y = L.gy + r * (BH + L.gap);
      const tl = landAt[cell];
      if (t < tl - fall) continue;
      const kf = clamp((t - (tl - fall)) / fall);
      const dy = t < tl ? -R((y + BH + 10) * (1 - ease.inQuad(kf))) : 0;
      const [dw, dh] = squashAt(t, tl, 1);
      // drop shadow on the pegboard (only once it is close)
      if (dy > -8) dither(px, x + 2, y + 3, BW, BH, null, C.tealDeep, 0.5);
      const ox = x - 1 - 2, oy = y - 1 + dy;
      if (dw || dh) drawSquash(px, board, ox + board.width / 2, oy + board.height, dw, dh);
      else px.drawImage(board, ox, oy);
      // LED matrix: sparkle-on, then a heart that beats; ripple across the grid on the wave beat
      if (t >= tl && !dw && !dh) {
        const since = t - tl;
        const bp = c.pulse(t, 0.3);
        const wave = t >= tWave ? clamp(1 - Math.abs((t - tWave) * 10 - (r + cc) * 1.2) / 2) : 0;
        for (let j = 0; j < 4; j++) for (let i = 0; i < 8; i++) {
          let on;
          if (since < 0.1) on = hash(i, j, Math.floor(since * 30) + cell) > 0.5;
          else { const hx = i - 1 - (cell % 2); on = hx >= 0 && hx < 5 && HEART[j][hx] === 'X'; }
          if (wave > 0.3) on = true;
          if (!on) continue;
          const col = wave > 0.3 ? C.cream : bp > 0.5 ? RAMP.glow[4] : C.gold;
          dot(px, ox + LED.x + i * 2, oy + LED.y + j * 2, col);
        }
      }
      if (t >= tl) {
        puff(px, x + BW / 2, y + BH + 1, t - tl, { w: BW - 6, col: RAMP.teal[5], n: 4, seed: cell });
        if (cell % 3 === 0) sparkle(px, x + 4, y + 4, t, tl + 0.03, { size: 2, dur: 0.28 });
      }
    }
    if (t >= tWave) for (let i = 0; i < 4; i++) sparkle(px, L.gx + 10 + i * 37, L.gy - 4 + (i % 2) * 120, t, tWave + i * 0.05, { size: 2, dur: 0.35 });

    // ---- type: ×16 with the vocal, ARDUINO / UNO Q on the downbeat
    const s = c.safe;
    const name = ((c.facts.hardware && c.facts.hardware.name) || 'Arduino UNO Q').toUpperCase();
    const parts = name.split(' ');
    const l1 = parts.slice(0, -2).join(' ') || parts[0], l2 = parts.slice(-2).join(' ');
    if (c.fmt === '9x16') {
      const bx = lbl(hi, t, k.start, '×', s.x0, 452, { role: 'display', size: 230, color: C.sky });
      lbl(hi, t, k.start, String(n), bx.x1 + 6, 452, { role: 'display', size: 230, color: C.cream });
      lbl(hi, t, k.b0, `${l1} ${l2}`, s.x0, 560, { size: 84, color: C.cream });
    } else {
      const x0 = s.x0 + 30;
      const bx = lbl(hi, t, k.start, '×', x0, 520, { role: 'display', size: 290, color: C.sky });
      lbl(hi, t, k.start, String(n), bx.x1 + 8, 520, { role: 'display', size: 290, color: C.cream });
      lbl(hi, t, k.b0, l1, x0 + 6, 660, { size: 104, color: C.cream });
      lbl(hi, t, k.b0, l2, x0 + 6, 776, { size: 104, color: C.sky });
    }
  },
};
