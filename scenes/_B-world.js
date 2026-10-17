// _B-world.js (owner B): extra world pieces in the lib/world.js style, for the autumn-morning verse.
//   autumnTree(): street tree with an autumn canopy (rust -> orange -> gold), lit from the upper-left.
import { C, RAMP } from '../lib/palette.js';
import { rng, hash, onTwos } from '../lib/motion.js';
import { rect, px } from '../lib/pixel.js';
import { cached } from '../lib/world.js';

const R = Math.round;
const TRUNK = ['#2E241B', '#4A3B2C', '#5E4A36'];
const AUTUMN = [RAMP.autumn[0], RAMP.autumn[1], RAMP.autumn[2], RAMP.autumn[4], C.gold];

function blob(w, h, seed, lobes) {
  const r = rng(seed);
  const m = new Uint8Array(w * h);
  const ells = [[w / 2, h * 0.6, w * 0.47, h * 0.38]];
  for (let i = 0; i < lobes; i++) ells.push([r.range(w * 0.22, w * 0.78), r.range(h * 0.25, h * 0.7), r.range(w * 0.2, w * 0.36), r.range(h * 0.24, h * 0.42)]);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    for (const [ex, ey, rx, ry] of ells) {
      const dx = (x + 0.5 - ex) / rx, dy = (y + 0.5 - ey) / ry;
      if (dx * dx + dy * dy <= 1) { m[y * w + x] = 1; break; }
    }
  }
  return m;
}

/** Autumn street tree: autumnTree(ctx, cx, base, { w, h, seed }) - centred on cx, standing on base. */
export function autumnTree(ctx, cx, base, o = {}) {
  const w = R(o.w ?? 36), h = R(o.h ?? 56), seed = o.seed ?? 3;
  const cvs = cached(`B-atree|${w}|${h}|${seed}`, w, h, (c) => {
    const trunkH = R(h * 0.36), ch = h - trunkH + 4;
    // trunk with a fork, lit on the left
    const tx = (w >> 1) - 1;
    rect(c, tx, h - trunkH, 3, trunkH, TRUNK[1]);
    rect(c, tx, h - trunkH, 1, trunkH, TRUNK[2]);
    rect(c, tx + 2, h - trunkH, 1, trunkH, TRUNK[0]);
    rect(c, tx - 2, h - 1, 7, 1, TRUNK[0]);
    rect(c, tx - 3, ch - 6, 1, 4, TRUNK[1]); rect(c, tx - 2, ch - 3, 2, 1, TRUNK[1]);
    rect(c, tx + 4, ch - 5, 1, 3, TRUNK[1]); rect(c, tx + 3, ch - 3, 1, 1, TRUNK[1]);
    // canopy
    const m = blob(w, ch, seed, 6);
    const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= ch ? 0 : m[y * w + x]);
    const put = (x, y, col) => { if (at(x, y)) { c.fillStyle = col; c.fillRect(x, y, 1, 1); } };
    for (let y = 0; y < ch; y++) for (let x = 0; x < w; x++) {
      if (!at(x, y)) continue;
      const v = y / ch;
      put(x, y, v > 0.78 ? AUTUMN[0] : v > 0.5 ? AUTUMN[1] : AUTUMN[2]);
    }
    const r = rng(seed * 7 + 1);
    const n = Math.max(4, R((w * ch) / 20));
    for (let i = 0; i < n; i++) {
      const bx = r.range(0, w * 0.9), by = r.range(0, ch * 0.72);
      const rad = r.pick([1, 2, 2, 3]);
      const top = by / ch < 0.38;
      for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
        if (dx * dx + dy * dy > rad * rad + rad * 0.6) continue;
        const lit = dx + dy < -rad * 0.6, dark = dx + dy > rad * 0.9;
        put(R(bx + dx), R(by + dy), lit ? (top ? AUTUMN[4] : AUTUMN[3]) : dark ? AUTUMN[1] : (top ? AUTUMN[3] : AUTUMN[2]));
      }
    }
    for (let y = 0; y < ch; y++) for (let x = 0; x < w; x++) {
      if (!at(x, y)) continue;
      if ((!at(x - 1, y) || !at(x, y - 1)) && y / ch < 0.5 && hash(x >> 1, y >> 1, seed) < 0.6) put(x, y, AUTUMN[3]);
      if (!at(x, y + 1)) put(x, y, AUTUMN[0]);
    }
    // gaps showing the trunk through the canopy bottom
    rect(c, tx, ch - 3, 3, 3, TRUNK[1]);
  });
  ctx.drawImage(cvs, R(cx) - (w >> 1), R(base) - h);
}
