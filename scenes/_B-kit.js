// _B-kit.js (owner B: calendar / boot / makerspace): small local helpers that lib/ does not provide.
//   - beat-grid helpers keyed on cue starts (fractional beats, null-safe cue lookup)
//   - nearest-neighbour sprite rotation (no anti-aliased edges, palette-clean), cached per angle step
//   - chunky calendar / clock digits drawn natively on the pixel grid (no scaled "mixel" fonts)
//   - big hand-drawn autumn leaves (maple-ish) that tumble on twos
import { C, RAMP } from '../lib/palette.js';
import { hash, mod, onTwos, frameIndex, clamp } from '../lib/motion.js';
import { makeCanvas, rect, px, sprite, drawSprite, line, poly } from '../lib/pixel.js';

const R = Math.round;
export const SPB = 60 / 102;

// ---------------------------------------------------------------- timing
/** Cue {start,end} relative to clip start, falling back to [0, c.dur] (or a given fallback) when the cue is absent. */
export function cueOr(c, id, fb) {
  const l = c.lines && c.lines[id];
  if (l) return l;
  return fb || { start: 0, end: c.dur };
}
/** Index of the beat nearest to time t in c.beats. */
function nearestBeat(c, t) {
  const b = c.beats;
  let best = 0, bd = Infinity;
  for (let i = 0; i < b.length; i++) {
    const d = Math.abs(b[i] - t);
    if (d < bd) { bd = d; best = i; }
  }
  return best;
}
/**
 * Time of the n-th beat (fractional allowed) counted from the beat nearest to t0 (usually a cue start).
 * Follows the real beat grid (works with measured, uneven beats); extrapolates past the ends.
 */
export function beatT(c, t0, n) {
  const b = c.beats;
  if (!b || b.length < 2) return t0 + n * SPB;
  const i0 = nearestBeat(c, t0);
  const f = i0 + n;
  const i = Math.floor(f), k = f - i;
  const at = (j) => {
    if (j < 0) return b[0] + j * (b[1] - b[0]);
    if (j >= b.length) return b[b.length - 1] + (j - b.length + 1) * (b[b.length - 1] - b[b.length - 2]);
    return b[j];
  };
  return at(i) + (at(i + 1) - at(i)) * k;
}
/** Local beat length near t. */
export function beatLen(c, t) {
  const l = c.beat(t);
  return l.len > 0.05 ? l.len : SPB;
}

// ---------------------------------------------------------------- rotation (nearest neighbour, cached)
const rotCache = new Map();
/**
 * Rotate a canvas by deg (quantized to `step` degrees) with nearest-neighbour sampling done per pixel,
 * so edges stay hard and colors stay exactly the source palette. Returns { canvas, w, h } centred on the source centre.
 */
export function rotated(key, src, deg, step = 15) {
  const q = mod(R(deg / step) * step, 360);
  const k = key + '|' + q;
  let out = rotCache.get(k);
  if (out) return out;
  const w = src.width, h = src.height;
  const sctx = src.getContext('2d');
  const sd = sctx.getImageData(0, 0, w, h).data;
  const a = (q * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a);
  const D = Math.ceil(Math.sqrt(w * w + h * h)) + 2;
  const { canvas, ctx } = makeCanvas(D, D);
  const img = ctx.createImageData(D, D);
  const cx = w / 2, cy = h / 2, dc = D / 2;
  for (let y = 0; y < D; y++) for (let x = 0; x < D; x++) {
    const dx = x + 0.5 - dc, dy = y + 0.5 - dc;
    const sx = Math.floor(ca * dx + sa * dy + cx), sy = Math.floor(-sa * dx + ca * dy + cy);
    if (sx < 0 || sy < 0 || sx >= w || sy >= h) continue;
    const si = (sy * w + sx) * 4, di = (y * D + x) * 4;
    if (sd[si + 3] < 128) continue;
    img.data[di] = sd[si]; img.data[di + 1] = sd[si + 1]; img.data[di + 2] = sd[si + 2]; img.data[di + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  out = { canvas, w: D, h: D };
  rotCache.set(k, out);
  return out;
}
/** Draw a rotated canvas centred at (x, y). */
export function drawRotated(ctx, key, src, x, y, deg, step = 15) {
  const r = rotated(key, src, deg, step);
  ctx.drawImage(r.canvas, R(x - r.w / 2), R(y - r.h / 2));
}

// ---------------------------------------------------------------- chunky digits (native pixel grid)
// Seven-segment skeleton with custom 1 and 7, chamfered outer corners: reads like a bold calendar numeral.
const SEG = {
  0: 'abcdef', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 8: 'abcdefg', 9: 'abcdfg',
};
/**
 * Draw one bold digit with its top-left at (x, y): w x h box, stroke s. Returns w.
 * opts.hi: highlight color for the top-left edge of strokes (optional, 1px), opts.lo: shade for the right edge.
 */
export function bigDigit(ctx, ch, x, y, w, h, s, col, o = {}) {
  x = R(x); y = R(y);
  const mid = y + R((h - s) / 2);
  const d = String(ch);
  if (d === '1') {
    const sx = x + w - s - R((w - s) * 0.22);                       // stem sits right of centre (optical)
    rect(ctx, sx, y, s, h, col);
    // slanted flag: an s-thick band from the stem top running down-left
    const L = R(w * 0.42), drop = R(L * 0.62);
    poly(ctx, [[sx + 1, y], [sx + 1, y + s + 1], [sx - L, y + s + 1 + drop], [sx - L, y + 1 + drop]], col);
    return w;
  }
  if (d === '7') {
    rect(ctx, x, y, w, s, col);                                    // top bar
    // diagonal stem: from the top-right down to the lower-middle, s px thick, stepped
    const x0 = x + w - s, x1 = x + R(w * 0.22);
    for (let yy = y + s; yy < y + h; yy++) {
      const k = (yy - (y + s)) / Math.max(1, h - s - 1);
      const xx = R(x0 + (x1 - x0) * Math.min(1, k * 1.15));
      rect(ctx, xx, yy, s, 1, col);
    }
    return w;
  }
  const segs = SEG[d] || '';
  const vh = mid - y + R(s / 2);
  if (segs.includes('a')) rect(ctx, x + 1, y, w - 2, s, col);
  if (segs.includes('g')) rect(ctx, x + 1, mid, w - 2, s, col);
  if (segs.includes('d')) rect(ctx, x + 1, y + h - s, w - 2, s, col);
  if (segs.includes('f')) rect(ctx, x, y + 1, s, vh, col);
  if (segs.includes('b')) rect(ctx, x + w - s, y + 1, s, vh, col);
  if (segs.includes('e')) rect(ctx, x, mid, s, y + h - 1 - mid, col);
  if (segs.includes('c')) rect(ctx, x + w - s, mid, s, y + h - 1 - mid, col);
  // round the outer corners where a horizontal meets a vertical
  const fill = (cx, cy) => rect(ctx, cx, cy, 1, 1, col);
  if (segs.includes('a') && segs.includes('f')) fill(x, y + 1);
  if (segs.includes('a') && segs.includes('b')) fill(x + w - 1, y + 1);
  if (segs.includes('d') && segs.includes('e')) fill(x, y + h - 2);
  if (segs.includes('d') && segs.includes('c')) fill(x + w - 1, y + h - 2);
  return w;
}
/** Two-or-more digit number, centred on cx. Returns total width. */
export function bigNumber(ctx, str, cx, y, w, h, s, gap, col) {
  str = String(str);
  const tw = str.length * w + (str.length - 1) * gap;
  let x = R(cx - tw / 2);
  for (const ch of str) { bigDigit(ctx, ch, x, y, w, h, s, col); x += w + gap; }
  return tw;
}

// ---------------------------------------------------------------- autumn leaves (big, foreground)
const LEAF_ROWS = [
  // 7x7 maple-ish leaf, 4 tumble frames (flat, tilted, edge-on, flipped)
  ['...a...', '.a.a.a.', '.aabaa.', 'aaabaaa', '.aabaa.', '...b...', '...b...'],
  ['.....a.', '..a.aa.', '..aaba.', '.aaba..', 'aaba...', '..b....', '.b.....'],
  ['.......', '.......', '.......', '.aaaab.', '.......', '.......', '.......'],
  ['.a.....', '.aa.a..', '.abaa..', '..abaa.', '...abaa', '....b..', '.....b.'],
];
const leafSpr = new Map();
function leafSprite(f, col, vein) {
  const k = f + col + vein;
  if (!leafSpr.has(k)) leafSpr.set(k, sprite(LEAF_ROWS[f], { a: col, b: vein }));
  return leafSpr.get(k);
}
/**
 * Big tumbling leaves drifting across a region (deterministic loop). bigLeaves(ctx, t, { x, y, w, h, n, seed, wind, fall })
 */
export function bigLeaves(ctx, t, o = {}) {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  const x = o.x ?? -10, y = o.y ?? -12, w = o.w ?? W + 20, h = o.h ?? H + 24;
  const n = o.n ?? 5, seed = o.seed ?? 3, wind = o.wind ?? 18, fall = o.fall ?? 16;
  const cols = [[RAMP.autumn[2], RAMP.autumn[1]], [C.coral, RAMP.autumn[0]], [RAMP.autumn[4], RAMP.autumn[2]], [C.gold, RAMP.autumn[2]]];
  const tq = onTwos(t);
  for (let i = 0; i < n; i++) {
    const sp = fall * (0.75 + hash(i, 1, seed) * 0.5);
    const period = h / sp;
    const tt = mod(tq + hash(i, 2, seed) * period, period);
    const ly = y + tt * sp;
    const lx = x + mod(hash(i, 3, seed) * w + tt * wind + Math.sin(tt * 1.7 + i * 2) * 7, w);
    const [col, vein] = cols[i % cols.length];
    const f = frameIndex(tt + hash(i, 5, seed), 5, 4);
    drawSprite(ctx, leafSprite(f, col, vein), R(lx), R(ly), { anchor: 'c', flipX: hash(i, 6, seed) < 0.5 });
  }
}

// ---------------------------------------------------------------- misc
/** Pixel ellipse outline points ordered by angle (for progressive "marker" circles). */
export function ellipsePoints(cx, cy, rx, ry, start = -Math.PI / 2, turns = 1.08, n = 220) {
  const pts = [];
  let last = '';
  for (let i = 0; i <= n; i++) {
    const a = start - (i / n) * turns * Math.PI * 2;
    const wob = 1 + 0.05 * Math.sin(i / n * Math.PI * 2 * turns) * (i / n);
    const X = R(cx + Math.cos(a) * rx * wob), Y = R(cy + Math.sin(a) * ry * wob);
    const key = X + ',' + Y;
    if (key !== last) { pts.push([X, Y]); last = key; }
  }
  return pts;
}
/** Draw the first fraction k of a point list as a 2px "marker" stroke. */
export function strokePts(ctx, pts, k, col, thick = 2) {
  const m = Math.floor(clamp(k) * pts.length);
  ctx.fillStyle = col;
  for (let i = 0; i < m; i++) ctx.fillRect(pts[i][0], pts[i][1], thick, thick);
}
export { R };
