// _F-kit.js (owner F: challenges / uno-q / swag / pizza, verse 2b)
// Local helpers lib/ does not provide:
//   clock()        beat grid keyed on a cue (works with lines that start on a vocal pickup before the downbeat)
//   painter()      tiny per-pixel painter for procedural sprites (cached canvases)
//   lathe()        cylinder-shaded spans (cups, stems, plinths) with light from the upper-left
//   drawSquash()   integer squash/stretch of a cached canvas, bottom-centre anchored (landings)
//   shineCanvas()  diagonal glint sweep clipped to a sprite's alpha
//   woodShelf() / woodTable()  the verse-2b furniture (warm wood, same family as the C24 hack table)
//   confetti(), puff(), impact(), steam()   pixel fx on twos
//   lbl()          stamped condensed caps label line (cream / sky)
import { C, RAMP } from '../lib/palette.js';
import { clamp, hash, onTwos, ease, tween, mod, FPS } from '../lib/motion.js';
import { makeCanvas, rect, px, hline, vline, dither } from '../lib/pixel.js';
import { text, textBox, anim, measure } from '../lib/text.js';

export const R = Math.round;

// ---------------------------------------------------------------- timing
/**
 * Beat clock for cue `id`. k.beat(n) = time of the n-th beat counted from the first beat at/after the cue start
 * (fractional n interpolates; negative n / past-the-end extrapolate). k.start/k.end = cue range clamped to the clip.
 */
export function clock(c, id) {
  const L = (c.lines && c.lines[id]) || { start: 0, end: c.dur };
  const start = Math.max(0, L.start), end = Math.min(c.dur, L.end);
  const b = c.beats || [];
  let i0 = b.findIndex((x) => x >= start - 0.06);
  let spb = 0.6;
  if (b.length > 1) {
    const j = clamp(i0 < 1 ? 1 : i0, 1, b.length - 1);
    if (b[j] - b[j - 1] > 0.05) spb = b[j] - b[j - 1];
  }
  const at = (j) => (j < 0 ? b[0] + j * spb : j >= b.length ? b[b.length - 1] + (j - b.length + 1) * spb : b[j]);
  const beat = (n) => {
    if (i0 < 0 || !b.length) return start + n * spb;
    const f = i0 + n, i = Math.floor(f), fr = f - i;
    return at(i) + (at(i + 1) - at(i)) * fr;
  };
  return { start, end, span: Math.max(0.3, end - start), spb, beat, b0: beat(0) };
}

// ---------------------------------------------------------------- procedural sprites
const artCache = new Map();
/** Build (once) a canvas w x h painted by fn(p) where p has put/rect/span helpers. Returns the canvas. */
export function painter(key, w, h, fn) {
  let cv = artCache.get(key);
  if (cv) return cv;
  const { canvas, ctx } = makeCanvas(w, h);
  const p = {
    ctx, w, h,
    put: (x, y, col) => { if (col) { ctx.fillStyle = col; ctx.fillRect(R(x), R(y), 1, 1); } },
    rect: (x, y, ww, hh, col) => rect(ctx, x, y, ww, hh, col),
    clear: (x, y, ww = 1, hh = 1) => ctx.clearRect(R(x), R(y), ww, hh),
  };
  fn(p);
  artCache.set(key, canvas);
  return canvas;
}
/** Cylinder tone for u in 0..1 across a lit-from-upper-left body. ramp = [deep, shade, base, light, hi]. */
export function cyl(u, ramp) {
  return u < 0.1 ? ramp[2] : u < 0.2 ? ramp[3] : u < 0.32 ? ramp[4] : u < 0.5 ? ramp[3] : u < 0.7 ? ramp[2] : u < 0.88 ? ramp[1] : ramp[0];
}
/** Lathe: rows of integer half-widths centred on pixel column cx, cylinder-shaded. prof[i] = half-width of row y0+i. */
export function lathe(p, cx, y0, prof, ramp) {
  prof.forEach((hw, i) => {
    if (hw < 0) return;
    for (let x = -hw; x <= hw; x++) p.put(cx + x, y0 + i, cyl((x + hw + 0.5) / (2 * hw + 1), ramp));
  });
}
/** 1px outline around a canvas's opaque pixels (cached per key). Returns a canvas 2px larger each way. */
export function outlined(key, src, col) {
  return painter('ol|' + key, src.width + 2, src.height + 2, (p) => {
    const d = src.getContext('2d').getImageData(0, 0, src.width, src.height).data;
    const on = (x, y) => x >= 0 && y >= 0 && x < src.width && y < src.height && d[(y * src.width + x) * 4 + 3] > 0;
    for (let y = -1; y <= src.height; y++) for (let x = -1; x <= src.width; x++) {
      if (on(x, y)) continue;
      if (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1)) p.put(x + 1, y + 1, col);
    }
    p.ctx.drawImage(src, 1, 1);
  });
}

// ---------------------------------------------------------------- drawing utils
/** Draw a canvas bottom-centre anchored at (x, base) with integer size deltas (dw, dh) for squash/stretch. */
export function drawSquash(ctx, cv, x, base, dw = 0, dh = 0) {
  const w = cv.width + dw, h = cv.height + dh;
  ctx.drawImage(cv, R(x - w / 2), R(base - h), w, h);
}
/** Landing squash sequence (integer [dw, dh]) for the frames after tLand. */
export function squashAt(t, tLand, amt = 2) {
  const f = Math.floor((t - tLand) * FPS + 1e-6);
  if (t < tLand || f > 5) return [0, 0];
  return [[amt * 2, -amt], [amt * 2, -amt], [-1, 1], [-1, 1], [0, 0], [0, 0]][f];
}
const tmp = { cv: null, ctx: null };
function scratch(w, h) {
  if (!tmp.cv || tmp.cv.width < w || tmp.cv.height < h) {
    const m = makeCanvas(Math.max(w, 64), Math.max(h, 64));
    tmp.cv = m.canvas; tmp.ctx = m.ctx;
  }
  tmp.ctx.clearRect(0, 0, tmp.cv.width, tmp.cv.height);
  return tmp;
}
/**
 * Draw canvas cv at integer (x, y) (top-left) with a diagonal glint band at progress k (0..1 sweeps left -> right),
 * clipped to cv's alpha. width = band width in px.
 */
export function shineCanvas(ctx, cv, x, y, k, { width = 3, col = C.cream, col2 = null } = {}) {
  if (k <= 0 || k >= 1) { ctx.drawImage(cv, R(x), R(y)); return; }
  const s = scratch(cv.width, cv.height);
  s.ctx.globalCompositeOperation = 'source-over';
  s.ctx.drawImage(cv, 0, 0);
  s.ctx.globalCompositeOperation = 'source-atop';
  const span = cv.width + cv.height;
  const x0 = R(-cv.height + k * span);
  for (let yy = 0; yy < cv.height; yy++) {
    const xx = x0 + (cv.height - yy);
    s.ctx.fillStyle = col;
    s.ctx.fillRect(xx, yy, width, 1);
    if (col2) { s.ctx.fillStyle = col2; s.ctx.fillRect(xx + width + 1, yy, 1, 1); }
  }
  s.ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(s.cv, 0, 0, cv.width, cv.height, R(x), R(y), cv.width, cv.height);
}
/** Dithered contact shadow (flat ellipse) on a surface. */
export function contact(ctx, cx, y, w, col = C.tealDeep, level = 0.5) {
  const hw = R(w / 2);
  rect(ctx, cx - hw + 1, y, hw * 2 - 1, 1, col);
  dither(ctx, cx - hw - 1, y, 2, 1, null, col, level);
  dither(ctx, cx + hw, y, 2, 1, null, col, level);
}

// ---------------------------------------------------------------- furniture
const WOOD = { deep: RAMP.hair[1], shade: '#5A3A26', base: RAMP.hair[2], light: RAMP.autumn[0], hi: RAMP.hair[3] };
export { WOOD };
/**
 * Wall shelf (front view): top surface at row y (objects stand on y), plank `th` thick, iron brackets below,
 * dithered shadow on the wall. x..x+w.
 */
export function woodShelf(ctx, x, y, w, { th = 5, brackets = [], shadowCol = C.tealDark } = {}) {
  dither(ctx, x + 2, y + th, w - 2, 3, null, shadowCol, 0.5);
  rect(ctx, x + 2, y + th, w - 2, 1, shadowCol);
  for (const bx of brackets) {
    // iron bracket seen edge-on: a tapered bar under the plank
    rect(ctx, bx, y + th, 2, 6, RAMP.ink[1]);
    rect(ctx, bx, y + th, 1, 5, RAMP.stone[1]);
    rect(ctx, bx - 1, y + th, 4, 1, RAMP.ink[1]);
  }
  rect(ctx, x, y, w, 1, WOOD.hi);                 // lit top edge
  rect(ctx, x, y + 1, w, 1, WOOD.light);
  rect(ctx, x, y + 2, w, th - 3, WOOD.base);       // front face
  rect(ctx, x, y + th - 1, w, 1, WOOD.deep);       // underside
  // grain: short darker streaks on the face (deterministic)
  for (let i = 0; i < w; i += 7) {
    const gx = x + i + R(hash(i, y, 5) * 4), gl = 2 + R(hash(i, y, 6) * 4);
    if (th > 4) hline(ctx, gx, Math.min(x + w - 1, gx + gl), y + 2 + (i % 2), WOOD.shade);
  }
}
/** Front-view table: top surface rows from y (lit lip), apron below to the canvas bottom. */
export function woodTable(ctx, y, W, H) {
  rect(ctx, 0, y, W, 2, WOOD.light);
  rect(ctx, 0, y, W, 1, WOOD.hi);
  rect(ctx, 0, y + 2, W, 4, WOOD.base);
  for (let i = 0; i < W; i += 9) {
    const gx = i + R(hash(i, y, 3) * 5);
    hline(ctx, gx, Math.min(W - 1, gx + 3 + R(hash(i, y, 4) * 5)), y + 3 + (i % 3 === 0 ? 1 : 0), WOOD.shade);
  }
  rect(ctx, 0, y + 6, W, 1, WOOD.deep);
  rect(ctx, 0, y + 7, W, H - y - 7, RAMP.teal[2]);
  dither(ctx, 0, y + 7, W, 3, RAMP.ink[1], RAMP.teal[2], 0.5);
  for (let x = 30; x < W; x += 60) vline(ctx, x, y + 10, H, RAMP.teal[1]);
}

// ---------------------------------------------------------------- lights
/**
 * Track spotlight: a can on a rail at (x, yTop) throwing a banded, dithered cone down to yBot (no gradients).
 * k: 0 = off (can only), 1 = on, flash = extra-bright first frames after switching on.
 */
export function spot(ctx, x, yTop, yBot, { wTop = 6, wBot = 44, on = 0, flash = false } = {}) {
  const h = yBot - yTop;
  if (on > 0) {
    const cv = painter(`cone|${wTop}|${wBot}|${h}|${flash}`, wBot + 2, h, (p) => {
      for (let y = 0; y < h; y++) {
        const hw = (wTop + (wBot - wTop) * (y / h)) / 2;
        const cx = (wBot + 2) / 2;
        const outer = R(hw), inner = R(hw * 0.62);
        dither(p.ctx, R(cx - outer), y, outer * 2, 1, null, flash ? RAMP.teal[6] : RAMP.teal[5], 0.5);
        p.rect(R(cx - inner), y, inner * 2, 1, flash ? RAMP.teal[6] : RAMP.teal[5]);
      }
    });
    ctx.drawImage(cv, R(x - (wBot + 2) / 2), yTop);
  }
  // the can
  rect(ctx, x - 3, yTop - 4, 6, 3, RAMP.ink[1]);
  rect(ctx, x - 2, yTop - 5, 4, 1, RAMP.ink[1]);
  rect(ctx, x - 3, yTop - 4, 1, 3, RAMP.stone[1]);
  rect(ctx, x - 2, yTop - 1, 4, 1, on > 0 ? RAMP.glow[4] : RAMP.ink[0]);
}
/** Ceiling track rail across the wall at row y. */
export function rail(ctx, x0, x1, y) {
  rect(ctx, x0, y, x1 - x0, 2, RAMP.ink[1]);
  rect(ctx, x0, y, x1 - x0, 1, RAMP.stone[0]);
}

// ---------------------------------------------------------------- fx (pixel layer, on twos)
/** Confetti burst falling from the top: k = seconds since t0. */
export function confetti(ctx, k, { x = 0, w = 320, y = -6, n = 28, seed = 4, fall = 70, life = 1.6, cols } = {}) {
  if (k < 0 || k > life) return;
  const kq = onTwos(k);
  const colors = cols || [C.coral, C.gold, C.sky, C.cream];
  for (let i = 0; i < n; i++) {
    const delay = hash(i, 1, seed) * 0.25;
    const kk = kq - delay;
    if (kk < 0) continue;
    const vx = (hash(i, 2, seed) - 0.5) * 18;
    const sp = fall * (0.6 + hash(i, 3, seed) * 0.6);
    const X = R(x + hash(i, 4, seed) * w + vx * kk + Math.sin(kk * 7 + i) * 3);
    const Y = R(y + sp * kk);
    const col = colors[i % colors.length];
    const f = Math.floor(kk * 12 + i) % 3;
    if (f === 0) rect(ctx, X, Y, 3, 2, col); else if (f === 1) rect(ctx, X, Y, 2, 3, col); else rect(ctx, X, Y, 2, 2, col);
  }
}
/** Landing dust puff: little pixels kicked sideways along the surface row y. k = seconds since landing. */
export function puff(ctx, cx, y, k, { w = 10, col = RAMP.tower[2], n = 6, seed = 1 } = {}) {
  if (k < 0 || k > 0.3) return;
  const kq = onTwos(k);
  for (let i = 0; i < n; i++) {
    const s = i % 2 ? 1 : -1;
    const sp = 30 + hash(i, 1, seed) * 30;
    const X = R(cx + s * (w / 2 + sp * kq));
    const Y = R(y - 1 - hash(i, 2, seed) * 3 - kq * 10 * hash(i, 3, seed));
    if (kq > 0.2 && i % 2) continue;
    px(ctx, X, Y, col);
  }
}
/** Impact ticks around a slap point (4 short lines radiating), k = seconds since impact. */
export function impact(ctx, cx, cy, k, { r = 8, col = C.cream } = {}) {
  if (k < 0 || k > 0.2) return;
  const f = Math.floor(k * 15);
  const rr = r + f * 2, L = f > 1 ? 1 : 2;
  const dirs = [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1.3], [-1.3, 0], [1.3, 0]];
  for (const [dx, dy] of dirs) {
    for (let i = 0; i < L; i++) {
      const s = rr + i;
      px(ctx, R(cx + dx * s * 0.75), R(cy + dy * s * 0.75), col);
    }
  }
}
/** Rising pixel steam curls (1px columns that wiggle), on twos. */
export function steam(ctx, x, base, t, { h = 24, amp = 2, seed = 1, speed = 14, show = 1, col = C.cream, col2 = RAMP.cloud[2], w = 1, edge = null } = {}) {
  if (show <= 0) return;
  const tq = onTwos(t);
  const seg = 6, period = h + seg * 2;
  for (let s = 0; s < 3; s++) {
    const off = mod(tq * speed + s * (period / 3) + hash(seed, s) * 4, period);
    for (let i = 0; i < seg; i++) {
      const yy = base - off + i;
      const up = base - yy;
      if (up < 0 || up > h * show) continue;
      const fade = up / h;
      if (fade > 0.7 && (i + Math.floor(tq * 15)) % 2) continue;
      const xx = R(x + Math.sin((yy + seed * 5) * 0.35 + tq * 3) * amp * (0.4 + fade));
      const ww = fade > 0.6 ? 1 : w;
      if (edge) px(ctx, xx + ww, R(yy), edge);
      rect(ctx, xx, R(yy), ww, 1, fade > 0.55 ? col2 : col);
    }
  }
}

/**
 * One continuous steam wisp: a 1px S-curve (2px at the base) that rises from (x, base) and dithers out as it climbs.
 * Loops every `period` seconds (phase offset by seed). edge = optional 1px shade on the right so it reads over light food.
 */
export function wisp(ctx, x, base, t, { len = 16, rise = 18, amp = 2, period = 1.1, seed = 0, col = C.cream, colTop = RAMP.cloud[2], edge = null, show = 1 } = {}) {
  if (show <= 0) return;
  const tq = onTwos(t);
  const ph = mod(tq / period + hash(seed, 3, 11), 1);
  const y0 = base - ph * rise;
  for (let i = 0; i < len; i++) {
    const y = R(y0 - i);
    const u = i / len;
    const fade = ph * 0.7 + u * 0.55;
    if (fade > 1.05) continue;
    if (fade > 0.8 && (i + Math.floor(tq * 15)) % 2) continue;
    const xx = R(x + Math.sin(y * 0.3 + seed * 1.7 + tq * 3) * amp * (0.4 + u));
    if (edge) px(ctx, xx + 1, y, edge);
    px(ctx, xx, y, u > 0.55 ? colTop : col);
    if (u < 0.25 && ph < 0.5) px(ctx, xx - 1, y, col);
  }
}

// ---------------------------------------------------------------- type
/**
 * Stamped condensed caps label line. (x, y) = anchor at the BASELINE; returns the cap box.
 * opts: size, color, align, weight, t1, exit, enter, role ('cond' | 'display'), tracking
 */
export function lbl(hi, t, t0, str, x, y, o = {}) {
  const opts = { role: o.role || 'cond', size: o.size || 100, weight: o.weight || 800, color: o.color || C.cream, align: o.align || 'left', tracking: o.tracking ?? 0.01, shadow: o.shadow };
  const s = o.keepCase ? String(str) : String(str).toUpperCase();
  const bx = textBox(hi, s, x, y, opts);
  anim(hi, t, { t0, t1: o.t1, x: bx.cx, y: bx.cy, enter: o.enter || 'stamp', exit: o.exit || 'cut', dist: o.dist, dur: o.dur }, (h) => text(h, s, x, y, opts));
  return bx;
}
/** Greedy word wrap of str into lines no wider than maxW at the given type opts. */
export function wrap(hi, str, maxW, o) {
  const words = String(str).split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? cur + ' ' + w : w;
    if (!cur || measure(hi, test, o).w <= maxW) cur = test;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines;
}
export { clamp, hash, onTwos, ease, tween, mod };
