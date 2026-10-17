// scenes/_H-kit.js (owner H): art + timing helpers for scenes/post-chorus.js.
//   - clock(c): fractional beat -> clip time (robust to real-song timing / --dur-scale)
//   - banner-tow planes: pixel plane + rippling pixel banner, with the partner logo riding the fabric on g.hi
//   - fireworks (rocket + peony burst with trails + glitter), string lights, the waterfront crowd (lit + silhouettes)
//   - logos: tinted white alpha masks (single palette tint, never stretched), text wordmarks, 6px-grid dither reveal
import { C, RAMP } from '../lib/palette.js';
import { clamp, ease, onTwos, frameIndex, hash, lerp, snap } from '../lib/motion.js';
import { makeCanvas, rect, px, hline, vline, line, sprite, drawSprite, silhouette, bayer } from '../lib/pixel.js';
import { person } from '../lib/world.js';
import { text, measure } from '../lib/text.js';

export const R = Math.round;
const P = 6;

// ------------------------------------------------------------------ timing
/** Beat clock for a clip: B(n) = clip time of beat n (fractional, n = 0 is the first beat at/after t = 0). */
export function clock(c) {
  const bs = c.beats;
  let i0 = bs.findIndex((b) => b >= -1e-6);
  if (i0 < 0) i0 = 0;
  const spb = bs[i0 + 1] !== undefined ? bs[i0 + 1] - bs[i0] : 0.6;
  const B = (n) => {
    const i = Math.floor(n), f = n - i;
    const a = bs[i0 + i], b = bs[i0 + i + 1];
    if (a === undefined) return (bs[i0] ?? 0) + n * spb;
    if (b === undefined) return a + f * spb;
    return a + (b - a) * f;
  };
  return { B, spb, nB: c.dur / spb, t0: bs[i0] ?? 0 };
}

// ------------------------------------------------------------------ logos (hi layer)
const tintCache = new Map();
/** White alpha-mask logo tinted to one flat palette color at device size w x h (aspect kept by the caller). */
export function tinted(img, w, h, color) {
  w = Math.max(1, R(w)); h = Math.max(1, R(h));
  const key = `${img.src}|${w}|${h}|${color}`;
  let cv = tintCache.get(key);
  if (!cv) {
    cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const x = cv.getContext('2d');
    x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
    x.drawImage(img, 0, 0, w, h);
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = color;
    x.fillRect(0, 0, w, h);
    tintCache.set(key, cv);
  }
  return cv;
}
/** Fit an image's aspect into maxW x maxH (never stretched). */
export function fit(img, maxW, maxH) {
  const a = img.width / img.height;
  let w = maxW, h = maxW / a;
  if (h > maxH) { h = maxH; w = maxH * a; }
  return { w: R(w), h: R(h) };
}
let scratchHi = null;
const sctx = () => (scratchHi || (scratchHi = makeCanvas(8, 8))).ctx;
const wordCache = new Map();
/** Text wordmark (for partners without a logo file) rendered once to a canvas: { canvas, w, h }. */
export function wordmark(str, size, color, { role = 'display', weight = 800, tracking = 0.01 } = {}) {
  const key = `${str}|${size}|${color}|${role}|${weight}|${tracking}`;
  let m = wordCache.get(key);
  if (!m) {
    const ms = measure(sctx(), str, { role, size, weight, tracking });
    const pad = R(size * 0.06);
    const w = Math.ceil(ms.w) + pad * 2, h = Math.ceil(ms.cap) + pad * 2;
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const x = cv.getContext('2d');
    text(x, str, pad, pad, { role, size, weight, color, baseline: 'cap-top', tracking });
    m = { canvas: cv, w, h };
    wordCache.set(key, m);
  }
  return m;
}
const compCache = new Map();
/**
 * Compose several pieces side by side (vertically centred) into one cached canvas, optionally with the key-art hard
 * drop shadow (tealDeep, +6/+6) under the whole thing. pieces: [{ canvas, w, h }], gap px.
 */
export function compose(key, pieces, gap = 0, shadowColor = null) {
  let m = compCache.get(key);
  if (m) return m;
  const sh = shadowColor ? P : 0;
  const w = pieces.reduce((s, p) => s + p.w, 0) + gap * (pieces.length - 1) + sh;
  const h = Math.max(...pieces.map((p) => p.h)) + sh;
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, w); cv.height = Math.max(1, h);
  const x = cv.getContext('2d');
  const put = (dx, dy) => {
    let cx = dx;
    for (const p of pieces) { x.drawImage(p.canvas, cx, dy + R((h - sh - p.h) / 2)); cx += p.w + gap; }
  };
  if (shadowColor) {
    put(sh, sh);
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = shadowColor;
    x.fillRect(0, 0, w, h);
    x.globalCompositeOperation = 'source-over';
  }
  put(0, 0);
  m = { canvas: cv, w, h };
  compCache.set(key, m);
  return m;
}

// dither reveal on the 6px grid: cells appear in Bayer order, radially from the centre (fireworks "glitter" reveal)
let revealWork = null, revealMask = null;
/**
 * Draw canvas `src` at device (x, y) (snapped to the 6px grid) revealed by k (0..1). mode 'radial' grows from the
 * centre with a dithered edge; 'scatter' dissolves cells in Bayer order (for exits pass 1 - k).
 */
export function ditherReveal(hi, src, x, y, k, mode = 'radial') {
  x = snap(x); y = snap(y);
  if (k <= 0) return;
  if (k >= 1) { hi.drawImage(src.canvas || src, x, y); return; }
  const cv = src.canvas || src;
  const w = cv.width, h = cv.height;
  const cw = Math.ceil(w / P), ch = Math.ceil(h / P);
  if (!revealWork || revealWork.canvas.width < w || revealWork.canvas.height < h) {
    revealWork = makeCanvas(Math.max(w, revealWork ? revealWork.canvas.width : 0), Math.max(h, revealWork ? revealWork.canvas.height : 0));
  }
  if (!revealMask || revealMask.canvas.width < cw || revealMask.canvas.height < ch) {
    revealMask = makeCanvas(Math.max(cw, revealMask ? revealMask.canvas.width : 0), Math.max(ch, revealMask ? revealMask.canvas.height : 0));
  }
  const mctx = revealMask.ctx;
  const img = mctx.createImageData(cw, ch);
  const gx0 = x / P, gy0 = y / P;
  const mx = cw / 2, my = ch / 2, maxD = Math.hypot(mx, my);
  for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) {
    const b = bayer(gx0 + i, gy0 + j, 4);
    let th;
    if (mode === 'radial') th = (Math.hypot(i + 0.5 - mx, (j + 0.5 - my) * 1.6) / (maxD * 1.25)) * 0.72 + b * 0.28;
    else th = b * 0.85 + hash(i, j, 7) * 0.15;
    if (th < k) img.data[(j * cw + i) * 4 + 3] = 255;
  }
  mctx.clearRect(0, 0, revealMask.canvas.width, revealMask.canvas.height);
  mctx.putImageData(img, 0, 0);
  const wc = revealWork.ctx;
  wc.save();
  wc.clearRect(0, 0, revealWork.canvas.width, revealWork.canvas.height);
  wc.drawImage(cv, 0, 0);
  wc.globalCompositeOperation = 'destination-in';
  wc.imageSmoothingEnabled = false;
  wc.drawImage(revealMask.canvas, 0, 0, cw, ch, 0, 0, cw * P, ch * P);
  wc.restore();
  hi.drawImage(revealWork.canvas, 0, 0, w, h, x, y, w, h);
}

// ------------------------------------------------------------------ banner-tow plane (pixel layer)
// Side view, facing right (nose at the right). Cub-style high wing, cabin windows, fixed gear. The propeller is
// drawn separately one column in front of the spinner (2 frames on twos). Tow hook = row 5 of column 0.
const PLANE_ROWS = [
  '.LL...........WWWWWWWWWWWW....',
  '.LBB..........wwwwwwwwwwwwww..',
  '.LBBB...........LGGGgGGGgL....',
  '.LBBBB.........LBGGGgGGGgBe...',
  '..BBBBBLLLLLLLLBBBBBBBBBBBBee.',
  'dddddBBBBBBBBBBBnnnnnnnBBBBeek',
  '...bbbbBBBBBBBBBBBBBBBBBBBBeek',
  '.......bbbbbbbbbbbbbbbbbbbbbe.',
  '.................k.....k......',
  '................kk....kk......',
];
export const PLANE = { w: 30, h: PLANE_ROWS.length, cy: 5, span: 31 };
const BODY = {
  gold: { B: C.gold, L: '#F8CC87', b: '#D1AC70', d: '#B97469', n: C.coral, W: C.cream, w: '#E6D9C1' },
  coral: { B: C.coral, L: '#FB7966', b: '#AD5E52', d: '#8F4F47', n: C.cream, W: C.cream, w: '#E6D9C1' },
  sky: { B: C.sky, L: '#A5CFE8', b: '#3F8ABD', d: '#2B6A80', n: C.cream, W: C.cream, w: '#E6D9C1' },
  cream: { B: '#F2EADA', L: '#FDF7EA', b: '#B9B19C', d: '#827F6F', n: C.coral, W: C.coral, w: '#AD5E52' },
};
const planeCache = new Map();
function planeSprite(kind) {
  let s = planeCache.get(kind);
  if (!s) {
    const b = BODY[kind] || BODY.gold;
    s = sprite(PLANE_ROWS, { ...b, G: '#C1E2F2', g: RAMP.iron[2], e: '#E3CDAB', k: RAMP.ink[0] });
    planeCache.set(kind, s);
  }
  return s;
}
/** Pixel plane with nose (propeller column) at (nose, y) = centre row; dir +1 flies right, -1 flies left. */
export function plane(p, t, nose, y, dir, kind) {
  const spr = planeSprite(kind);
  const left = dir > 0 ? nose - PLANE.w : nose + 1;
  drawSprite(p, spr, left, y - PLANE.cy, { flipX: dir < 0 });
  // propeller: long blur blade / short blade, alternating on twos
  const f = frameIndex(t, 15, 2);
  if (f === 0) { vline(p, nose, y - 4, y - 1, '#9A9787'); vline(p, nose, y + 2, y + 5, '#9A9787'); px(p, nose, y - 4, C.cream); }
  else vline(p, nose, y - 1, y + 2, RAMP.ink[1]);
}

/** Fabric ramps for banners: [hem, shade, base, light]. */
export const FABRIC = {
  coral: ['#AD5E52', '#D55449', C.coral, '#FB7966'],
  cream: ['#B9B19C', '#E6D9C1', C.cream, '#FDF7EA'],
  sky: ['#3F8ABD', '#5A9CC6', C.sky, '#A5CFE8'],
  gold: ['#D1AC70', '#F5C04A', C.gold, '#F8CC87'],
};

/**
 * A towed banner group: plane + tow rope bridle + pole + rippling fabric (g.px) and the logo riding the fabric (g.hi).
 * o: { x (nose), y (plane centre row), dir, len (fabric px), h (fabric px), rope (px), fabric: FABRIC key,
 *      plane: BODY key, content: {canvas,w,h} device px, seed, amp }
 * Returns geometry { x0, x1, top, bot } of the whole group (pixels).
 */
export function tow(g, t, o) {
  const p = g.px, hi = g.hi;
  const dir = o.dir, nose = R(o.x), y = R(o.y);
  const tq = onTwos(t);
  const H = o.h, len = o.len, rope = o.rope ?? 16;
  const tail = nose - dir * (PLANE.span - 1);
  const pole = tail - dir * rope;
  const top = y - 3;
  const fab = FABRIC[o.fabric] || FABRIC.cream;
  const seed = o.seed ?? 0;
  const amp0 = o.amp ?? 1;
  // ripple per column (i = 0 next to the pole .. len-1 at the trailing end); travels from the pole to the tail
  const offs = new Array(len), shade = new Array(len);
  for (let i = 0; i < len; i++) {
    const ph = i * 0.16 - tq * 7.5 + seed * 1.7;
    const a = amp0 * (0.2 + 1.15 * Math.pow(i / len, 1.3));
    offs[i] = R(a * Math.sin(ph));
    shade[i] = Math.cos(ph) * (0.5 + 0.5 * (i / len));
  }
  const colX = (i) => pole - dir * (1 + i);
  // tow rope: single line from the tail hook to a junction, then a V bridle to the pole ends
  const jx = tail - dir * 6;
  const ropeC = RAMP.ink[1];
  hline(p, tail - dir, jx, y, ropeC);
  line(p, jx, y, pole, top - 1 + offs[0], ropeC);
  line(p, jx, y, pole, top + H + offs[0], ropeC);
  // fabric
  const fl = frameIndex(t, 15, 2);
  for (let i = 0; i < len; i++) {
    const X = colX(i), o2 = offs[i];
    let y0 = top + o2, hh = H;
    if (i >= len - 2) { const cut = (i === len - 1 ? 2 : 1) + ((i + fl) % 2); y0 += cut; hh -= cut * 2; } // frayed flapping end
    const s = shade[i];
    const col = s > 0.62 ? fab[3] : s < -0.62 ? fab[1] : fab[2];
    rect(p, X, y0, 1, hh, col);
    px(p, X, y0 + hh - 1, fab[0]);                       // bottom hem
    if (s > 0.62) px(p, X, y0, C.cream); else px(p, X, y0, fab[3]);
  }
  // leading pole + weight
  vline(p, pole, top - 2 + offs[0], top + H + 1 + offs[0], RAMP.ink[0]);
  rect(p, pole - (dir > 0 ? 1 : 0), top + H + 1 + offs[0], 2, 2, RAMP.ink[0]);
  // plane on top of the rope
  plane(p, t, nose, y, dir, o.plane || 'gold');
  // logo / wordmark riding the fabric (hi layer): it bobs with the fabric's mean offset under it, so it stays crisp
  // and readable while the cloth ripples around it (most of the wave lives in the trailing end)
  const ct = o.content;
  if (ct && ct.canvas) {
    const xa = Math.min(colX(0), colX(len - 1)), xb = Math.max(colX(0), colX(len - 1));
    const cxDev = ((xa + xb + 1) / 2) * P;
    const L = snap(cxDev - ct.w / 2), T = snap(top * P + (H * P - ct.h) / 2);
    let sum = 0, cnt = 0;
    for (let X = Math.floor(L / P); X < Math.ceil((L + ct.w) / P); X++) {
      const i = dir < 0 ? X - colX(0) : colX(0) - X;
      if (i >= 0 && i < len) { sum += offs[i]; cnt++; }
    }
    const lo = cnt ? R(sum / cnt) : 0;
    hi.drawImage(ct.canvas, L, T + lo * P);
  }
  const gx0 = Math.min(nose, colX(len - 1)), gx1 = Math.max(nose, colX(len - 1));
  return { x0: gx0, x1: gx1, top, bot: top + H, pole, fabricX0: Math.min(colX(0), colX(len - 1)), fabricX1: Math.max(colX(0), colX(len - 1)) };
}
/** Total width (px) of a tow group: plane + rope + pole + fabric. */
export const towWidth = (len, rope = 16) => PLANE.span + rope + len;

/** Horizontal speed streaks behind a fast-moving group (pixel layer). v = px/s (signed). */
export function speedLines(p, t, xBack, ys, v, seed = 0) {
  const s = Math.abs(v);
  if (s < 70) return;
  const dir = Math.sign(v);
  const L = Math.min(34, R(s * 0.045));
  ys.forEach((y, i) => {
    const off = R(hash(i, frameIndex(t, 15, 1000), seed) * 6);
    const l = R(L * (0.55 + 0.45 * hash(i, 3, seed)));
    hline(p, xBack - dir * (off + 2), xBack - dir * (off + 2 + l), y, i % 2 ? C.cream : '#B9D5DC');
  });
}

// ------------------------------------------------------------------ fireworks (pixel layer)
/**
 * Rocket rising from (x0, y0) to its burst point (x1, y1) during [0, dur] (k = seconds since launch).
 */
export function rocket(p, x0, y0, x1, y1, k, dur, seed = 0) {
  if (k < 0 || k >= dur) return;
  const kq = onTwos(k);
  const e = ease.outQuad(kq / dur);
  const x = R(lerp(x0, x1, e) + Math.sin(kq * 40 + seed) * 0.6), y = R(lerp(y0, y1, e));
  for (let j = 1; j <= 6; j++) {
    const ty = y + j * 2;
    if (ty > y0) break;
    if (j < 3 || (j + frameIndex(k, 15, 2)) % 2 === 0) px(p, x + (j > 3 ? R(Math.sin(seed + j) * 0.8) : 0), ty, j < 3 ? C.gold : '#B97469');
  }
  px(p, x, y, C.cream);
  px(p, x, y + 1, C.cream);
}
/**
 * Peony/chrysanthemum burst at (x, y). k = seconds since the burst. o: { n, r, life, colors:[head, trail], seed,
 * gravity, ring2: {colors, r, n} }. Expands fast, trails shrink, then glitter twinkles and drops out.
 */
export function firework(p, x, y, k, o = {}) {
  const life = o.life ?? 1.5;
  if (k < 0 || k > life) return;
  const kq = onTwos(k);
  const u = kq / life;
  const n = o.n ?? 36, r = o.r ?? 40, seed = o.seed ?? 1;
  const cols = o.colors || [C.gold, '#B97469'];
  const ex = ease.outCubic(clamp(kq / (life * 0.38)));
  const drop = (o.gravity ?? 16) * kq * kq;
  if (kq < 0.1) { // ignition flash
    rect(p, x - 2, y - 1, 5, 3, C.cream); rect(p, x - 1, y - 2, 3, 5, C.cream);
  }
  const ring = (cnt, rad, cc, sd) => {
    for (let i = 0; i < cnt; i++) {
      const a = (i / cnt) * Math.PI * 2 + hash(i, 1, sd) * 0.25;
      const rr = rad * (0.8 + hash(i, 2, sd) * 0.2) * ex;
      const ca = Math.cos(a), sa = Math.sin(a) * 0.9;
      const hx = x + ca * rr, hy = y + sa * rr + drop;
      const die = hash(i, 3, sd);
      if (u > 0.45 + die * 0.55) continue;
      // trail: a short streak back toward the centre while expanding
      if (u < 0.42) {
        const tl = Math.max(2, rr * 0.45 * (1 - u * 2));
        line(p, hx - ca * tl, hy - sa * tl - drop * 0.3, hx - ca * 1.5, hy - sa * 1.5, cc[1]);
      }
      // glitter: late particles twinkle on twos
      if (u > 0.5 && hash(i, frameIndex(k, 15, 4096), sd) < 0.4) continue;
      const head = u < 0.3 ? cc[0] : u < 0.62 ? cc[0] : (i % 2 ? C.cream : cc[0]);
      if (u < 0.28) rect(p, R(hx), R(hy), 2, 2, head);
      else px(p, hx, hy, head);
    }
  };
  ring(n, r, cols, seed);
  if (o.ring2) ring(o.ring2.n ?? R(n * 0.5), o.ring2.r ?? r * 0.5, o.ring2.colors || [C.cream, cols[1]], seed + 17);
}

// ------------------------------------------------------------------ party string lights (pixel layer)
/**
 * Festoon lights hanging between points xs[] at height y with sag. Bulbs cycle palette colours and pop on beats.
 */
export function stringLights(p, t, c, xs, y, sag, o = {}) {
  const cols = o.colors || [C.gold, C.coral, C.sky, C.cream];
  const dim = { [C.gold]: '#B97469', [C.coral]: '#8F4F47', [C.sky]: '#2B6A80', [C.cream]: '#827F6F' };
  const beatI = c.beat(t).index;
  const pul = c.pulse(t, 0.3);
  let bi = 0;
  for (let s = 0; s + 1 < xs.length; s++) {
    const xa = xs[s], xb = xs[s + 1];
    const yy = (x) => y + R(sag * (1 - Math.pow(((x - xa) / (xb - xa)) * 2 - 1, 2)));
    for (let x = xa; x <= xb; x++) px(p, x, yy(x), RAMP.ink[0]);
    for (let x = xa + 3; x < xb - 1; x += 7, bi++) {
      const col = cols[bi % cols.length];
      const on = (bi + beatI) % 2 === 0 ? true : pul < 0.35;
      const by = yy(x) + 1;
      px(p, x, by, on ? col : dim[col] || col);
      px(p, x, by + 1, on ? col : dim[col] || col);
      if (on && pul > 0.5 && (bi + beatI) % 2 === 0) { px(p, x - 1, by + 1, col); px(p, x + 1, by + 1, col); }
    }
  }
}

// ------------------------------------------------------------------ crowd (pixel layer)
let scratchPx = null;
const silCache = new WeakMap();
function silOf(spr, color) {
  let m = silCache.get(spr);
  if (!m) { m = new Map(); silCache.set(spr, m); }
  let s = m.get(color);
  if (!s) { s = silhouette(spr, color); m.set(color, s); }
  return s;
}
/**
 * One partygoer. o: { t, seed, skin, hair, style, top, pants, pose, flip, sil (silhouette colour), rim (rim colour),
 * pass: 'rim' | 'body' }. Lit people are world.person(); silhouettes are its sprite filled flat. For a crowd draw every
 * silhouette's rim pass (1px up) first, then every body pass, so rims only survive on the crowd's outer edge.
 */
export function partygoer(p, x, base, o) {
  if (!o.sil) { person(p, x, base, o); return; }
  if (!scratchPx) scratchPx = makeCanvas(12, 20);
  const spr = person(scratchPx.ctx, 5, 18, o);
  const X = x - Math.floor(spr.w / 2), Y = base - spr.h;
  if (o.pass === 'rim') { if (o.rim) drawSprite(p, silOf(spr, o.rim), X, Y - 1, { flipX: o.flip }); return; }
  drawSprite(p, silOf(spr, o.sil), X, Y, { flipX: o.flip });
}
