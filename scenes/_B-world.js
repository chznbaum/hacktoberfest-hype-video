// _B-world.js (owner B): extra world pieces in the lib/world.js style, for the autumn-morning verse.
//   autumnTree(): street tree with an autumn canopy (rust -> orange -> gold), lit from the upper-left.
import { C, RAMP } from '../lib/palette.js';
import { rng, hash, onTwos } from '../lib/motion.js';
import { rect, px, disc } from '../lib/pixel.js';
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
    // canopy: cauliflower clumps drawn back-to-front; each clump = shadow (offset down-right) + base + lit
    // crescent upper-left + a few gold highlight pixels on the top clumps. Front clumps' shadows carve crevices.
    const r = rng(seed * 7 + 1);
    const cr = Math.max(4, R(w * 0.19));
    const rows = [
      { n: 1, y: cr + 1, spread: 0.0 },
      { n: 2, y: R(ch * 0.36), spread: 0.42 },
      { n: 3, y: R(ch * 0.58), spread: 0.62 },
      { n: 3, y: ch - cr - 3, spread: 0.7 },
    ];
    const clumps = [];
    rows.forEach((row, ri) => {
      for (let i = 0; i < row.n; i++) {
        const u = row.n === 1 ? 0 : (i / (row.n - 1)) * 2 - 1;
        const x = w / 2 + u * row.spread * (w / 2 - cr) + r.range(-1.5, 1.5);
        const y = row.y + r.range(-1.5, 1.5);
        clumps.push({ x: R(x), y: R(y), r: R(cr * r.range(0.85, 1.15)), top: ri < 2 });
      }
    });
    clumps.sort((a, b) => a.y - b.y);
    for (const k of clumps) {
      disc(c, k.x + 1, k.y + 1, k.r, AUTUMN[0]);
      disc(c, k.x, k.y, k.r, AUTUMN[1]);
      disc(c, k.x - R(k.r * 0.2), k.y - R(k.r * 0.22), R(k.r * 0.72), AUTUMN[2]);
      disc(c, k.x - R(k.r * 0.38), k.y - R(k.r * 0.42), Math.max(1, R(k.r * 0.32)), AUTUMN[3]);
      if (k.top) {
        px(c, k.x - R(k.r * 0.5), k.y - R(k.r * 0.5), AUTUMN[4]);
        px(c, k.x - R(k.r * 0.5) + 1, k.y - R(k.r * 0.5), AUTUMN[4]);
      }
      // a few leaf flecks breaking the round edge
      for (let j = 0; j < 3; j++) {
        const a = r.range(Math.PI * 0.9, Math.PI * 1.6);
        px(c, R(k.x + Math.cos(a) * (k.r + 1)), R(k.y + Math.sin(a) * (k.r + 1)), AUTUMN[2]);
      }
    }
    // gaps showing the trunk through the canopy bottom
    rect(c, tx, ch - 3, 3, 3, TRUNK[1]);
  });
  ctx.drawImage(cvs, R(cx) - (w >> 1), R(base) - h);
}
