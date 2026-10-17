// scenes/_G-endcard.js (owner G): helpers for the end card (C31).
//  - content loading (logos.json + qr-mlh.json are not in `c`, so we fetch them once in setup())
//  - partner logos: white alpha masks drawn TINTED (cream); no file -> condensed-caps text wordmark
//  - pixel QR card on the LOW-RES layer: 1 module = 1 art pixel (6 device px), cream quiet zone, tealDeep modules,
//    coral viewfinder brackets OUTSIDE the quiet zone (so the code stays decodable while they pulse)
//  - beat helpers (half-beat grid from a cue start)
import { C, RAMP } from '../lib/palette.js';
import { clamp, ease, tween, snap, onTwos, hash, stamp as stampCurve } from '../lib/motion.js';
import { rect, px as dot, sprite, drawSprite } from '../lib/pixel.js';
import { text, measure, capRatio, anim, fitSize } from '../lib/text.js';

const R = Math.round;

// ------------------------------------------------------------------ content
const G = { logos: [], images: {}, qr: null, ready: null };

/** Test hook (dev only): force every partner to its text wordmark ('text') or to a logo image ('logo'). Keep null. */
export const FORCE_PARTNERS = null;
/** Test hook (dev only): pretend these logo ids have this file (e.g. { hacktoberfest: 'assets/logos/dev.png' }). Keep null. */
export const FAKE_FILES = null;

function loadImg(src) {
  return new Promise((res) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => res(null); // missing / broken file -> text fallback, never a crash
    im.src = src;
  });
}

export function loadEndcardContent() {
  if (!G.ready) {
    G.ready = (async () => {
      const get = async (p) => { try { const r = await fetch(p, { cache: 'no-store' }); return r.ok ? r.json() : null; } catch (e) { return null; } };
      const [logos, qr] = await Promise.all([get('content/logos.json'), get('content/qr-mlh.json')]);
      G.logos = (logos && logos.logos) || [];
      if (FAKE_FILES) for (const l of G.logos) if (FAKE_FILES[l.id]) l.file = FAKE_FILES[l.id];
      G.qr = qr && Array.isArray(qr.matrix) ? qr : null;
      await Promise.all(G.logos.map(async (l) => {
        if (l.file) G.images[l.id] = await loadImg(l.file);
        if (l.mark) G.images[l.id + '#mark'] = await loadImg(l.mark);
        if (l.fileVertical) G.images[l.id + '#v'] = await loadImg(l.fileVertical);
      }));
    })();
  }
  return G.ready;
}

/** { entry, img, mark, vimg } for a logo id (img null -> use the text wordmark). */
export function logo(id) {
  const entry = G.logos.find((x) => x.id === id) || null;
  let img = G.images[id] || null;
  if (FORCE_PARTNERS === 'text') img = null;
  return { entry, img, mark: G.images[id + '#mark'] || null, vimg: FORCE_PARTNERS === 'text' ? null : G.images[id + '#v'] || null };
}
export const qrData = () => G.qr;

const tintCache = new Map();
/** Image drawn as a flat-color silhouette (alpha mask tint) at device size w x h (cached). */
export function tinted(img, w, h, color = C.cream) {
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
/** Fit an image into maxW x maxH keeping its aspect ratio. */
export function fitBox(img, maxW, maxH) {
  const a = img.width / img.height;
  let w = maxW, h = maxW / a;
  if (h > maxH) { h = maxH; w = maxH * a; }
  return { w, h };
}

// ------------------------------------------------------------------ timing
/** First beat at or after time `from` (clip-relative). */
export function beatIdx(c, from) {
  const i = c.beats.findIndex((b) => b >= from - 0.03);
  return i < 0 ? c.beats.length - 1 : i;
}
/** Half-beat grid starting at the first beat >= from: hb(k) = time of the k-th half beat. */
export function halfBeats(c, from) {
  const i0 = beatIdx(c, from);
  const B = c.beats;
  const spb = B.length > 1 ? (B[Math.min(B.length - 1, i0 + 1)] - B[i0]) || 0.6 : 0.6;
  return (k) => {
    const i = i0 + Math.floor(k / 2);
    const a = B[i] ?? B[i0] + Math.floor(k / 2) * spb;
    const b = B[i + 1] ?? a + spb;
    return k % 2 ? (a + b) / 2 : a;
  };
}

// ------------------------------------------------------------------ pixel QR card (g.px)
/**
 * Draws the registration QR as pixel art. (x, y) = top-left of the cream card in low-res px.
 * Card = (N + 2*quiet) px square; returns { x0, y0, x1, y1, size } (low-res).
 * t0 = when it lands: the card snaps open on twos, then the modules wipe in on a stair-step diagonal (~0.3 s).
 * brackets: coral viewfinder corners 2 px outside the card, they breathe 1 px on the beat (pulse 0..1).
 */
export function qrCard(ctx, x, y, t, t0, o = {}) {
  const Q = G.qr;
  const N = Q ? Q.size : 37, quiet = o.quiet ?? 4;
  const S = N + quiet * 2;
  const out = { x0: x, y0: y, x1: x + S, y1: y + S, size: S };
  if (t < t0) return out;
  const k = onTwos(t - t0);
  // 1) card opens (3 steps on twos) from its centre
  const open = k < 1 / 15 ? 0.34 : k < 2 / 15 ? 0.7 : 1;
  const cw = R(S * open), ch = R(S * (open < 1 ? Math.min(1, open * 1.15) : 1));
  const cx0 = x + ((S - cw) >> 1), cy0 = y + ((S - ch) >> 1);
  // hard tealDeep drop shadow (pixel style), then the card with 1px notched corners
  rect(ctx, cx0 + 2, cy0 + 2, cw, ch, C.tealDeep);
  rect(ctx, cx0, cy0 + 1, cw, ch - 2, C.cream);
  rect(ctx, cx0 + 1, cy0, cw - 2, ch, C.cream);
  if (open < 1 || !Q) return out;
  // 2) modules wipe in: diagonal stair steps of 4x4 module blocks
  const wk = clamp((k - 0.15) / 0.3);
  const blocks = Math.ceil(N / 4);
  const front = wk * (blocks * 2 + 1);
  const ox = x + quiet, oy = y + quiet;
  ctx.fillStyle = o.ink || C.tealDeep;
  for (let r = 0; r < N; r++) {
    const row = Q.matrix[r];
    const br = r >> 2;
    for (let q = 0; q < N; q++) {
      if (row.charCodeAt(q) !== 49) continue; // '1'
      if (wk < 1 && (br + (q >> 2)) > front) continue;
      ctx.fillRect(ox + q, oy + r, 1, 1);
    }
  }
  // the wipe's leading edge flashes coral/gold for a frame (outside-in energy, then clean)
  if (wk > 0 && wk < 1) {
    for (let br = 0; br < blocks; br++) {
      const bq = Math.floor(front) - br;
      if (bq < 0 || bq >= blocks) continue;
      rect(ctx, ox + bq * 4, oy + br * 4, Math.min(4, N - bq * 4), Math.min(4, N - br * 4), (br + bq) % 2 ? C.coral : C.gold);
    }
  }
  return out;
}

/** Coral viewfinder brackets around a rect (low-res), arm length `arm`, gap `gap` px outside, breathe by `b` px. */
export function brackets(ctx, r, { arm = 6, gap = 2, b = 0, color = C.coral, show = 1 } = {}) {
  if (show <= 0) return;
  const g = gap + b;
  const x0 = r.x0 - g - 1, y0 = r.y0 - g - 1, x1 = r.x1 + g, y1 = r.y1 + g;
  const a = Math.max(2, R(arm * show));
  // top-left, top-right, bottom-left, bottom-right (2 px thick arms read better at phone size)
  const L = (x, y, dx, dy) => {
    rect(ctx, dx > 0 ? x : x - a + 1, y, a, 1, color);
    rect(ctx, x, dy > 0 ? y : y - a + 1, 1, a, color);
  };
  L(x0, y0, 1, 1); L(x1, y0, -1, 1); L(x0, y1, 1, -1); L(x1, y1, -1, -1);
}

// ------------------------------------------------------------------ sailboat (g.px)
// 15x16 sloop: cream main + jib (lit left, sky-shaded right), coral pennant, teal-ink hull with a cream stripe.
// x, y = hull bottom-left on the waterline. Sails flutter on twos (2 frames).
const BOAT = [
  ['.......r.......', '.......m.......', '......cm.......', '......cmc......', '.....ccms......', '.....ccmss.....', '....cccmsss....',
   '....cccmssss...', '...ccccmsssss..', '...ccccmssssss.', '..cccccm.......', '..cccccm.......', '.......m.......',
   'hhhhhhhhhhhhhhh', '.ewwwwwwwwwwwe.', '..hhhhhhhhhhh..'],
  ['.......rr......', '.......m.......', '......cm.......', '......cmc......', '.....ccms......', '.....ccmss.....', '....cccmsss....',
   '....cccmssss...', '...ccccmsssss..', '...ccccmssss...', '..cccccm.......', '..cccccm.......', '.......m.......',
   'hhhhhhhhhhhhhhh', '.ewwwwwwwwwwwe.', '..hhhhhhhhhhh..'],
];
let boatSprites = null;
export function sailboat(ctx, x, y, t) {
  if (!boatSprites) {
    const map = { r: C.coral, m: RAMP.iron[2], c: C.cream, s: RAMP.cloud[2], h: RAMP.ink[1], e: RAMP.ink[2], w: C.cream };
    boatSprites = BOAT.map((rows) => sprite(rows, map));
  }
  const f = Math.floor(onTwos(t) * 2) % 2;
  drawSprite(ctx, boatSprites[f], x, y - 16);
  // a 1-px wake that trails behind
  for (let i = 1; i <= 4; i++) if (hash(i, Math.floor(onTwos(t) * 4), 3) > 0.35) rect(ctx, x - i * 3, y, 2, 1, RAMP.water[6]);
}

// ------------------------------------------------------------------ partner row (g.hi)
/**
 * One partner "item": logo image (tinted) or a condensed wordmark, fitted to a row of height H.
 * Returns the width it takes (device px). draw=false only measures.
 */
export function partnerItem(h, id, x, cy, H, { draw = true, color = C.cream, maxW = 9999 } = {}) {
  const { entry, img } = logo(id);
  const name = (entry && (entry.display || entry.label)) || id.toUpperCase();
  if (img) {
    // optical sizing: square/round badges a bit smaller than the row, wide wordmarks shorter
    const a = img.width / img.height;
    const kind = (entry && entry.kind) || '';
    const hh = a < 1.3 ? H * 0.92 : a < 2.6 ? H * 0.78 : H * 0.62;
    const fb = fitBox(img, maxW, /badge/.test(kind) ? H * 0.92 : hh);
    if (draw) h.drawImage(tinted(img, fb.w, fb.h, color), R(x), R(cy - fb.h / 2));
    return fb.w;
  }
  // text wordmark: condensed caps, cap height ~ 0.4 H (reads like a logo, not like a label)
  const size = Math.min((H * 0.37) / capRatio(h, 'cond', 800), fitSize(h, name, maxW, { role: 'cond', maxSize: 200, weight: 800, tracking: 0.02 }));
  const m = measure(h, name, { role: 'cond', size, weight: 800, tracking: 0.02 });
  if (draw) text(h, name, x, cy, { role: 'cond', size, weight: 800, color, baseline: 'cap-middle', tracking: 0.02 });
  return m.w;
}

/**
 * The partner row: groups of { label, ids } laid out left to right from x at vertical centre cy (row height H).
 * Each item pops on its own time (times[i], from a flat list in reading order). Group labels are tiny sky mono
 * eyebrows above the group. Separators are 6px coral pixel dots. Returns the total width.
 */
export function partnerRow(h, t, x, cy, H, groups, times, o = {}) {
  const gap = o.gap ?? R(H * 0.55), ggap = o.groupGap ?? R(H * 0.9);
  const labSize = o.labelSize ?? 22;
  let cx = x, n = 0;
  groups.forEach((gr, gi) => {
    if (gi > 0) {
      // group separator: a small sky stair (key-art motif), on the grid
      const tt = times[n] ?? Infinity;
      if (t >= tt) {
        h.save(); h.fillStyle = o.sepColor || C.sky;
        h.fillRect(snap(cx + ggap / 2 - 3), snap(cy - H * 0.3), 6, snap(H * 0.6));
        h.restore();
      }
      cx += ggap;
    }
    const gx = cx;
    gr.ids.forEach((id, j) => {
      if (j > 0) cx += gap;
      const w = partnerItem(h, id, 0, 0, H, { draw: false, maxW: o.maxItemW });
      const tt = times[n++] ?? Infinity;
      const ix = cx, icx = cx + w / 2;
      anim(h, t, { t0: tt, x: icx, y: cy, enter: 'pop', dur: 0.2 }, (q) => partnerItem(q, id, ix, cy, H, { maxW: o.maxItemW }));
      cx += w;
    });
    if (gr.label) {
      const tt = times[n - gr.ids.length] ?? Infinity;
      anim(h, t, { t0: tt, x: gx, y: cy - H / 2, enter: 'slide-up', dist: 24, dur: 0.18 }, (q) =>
        text(q, gr.label, gx, cy - H / 2 - (o.labelGap ?? 14), { role: 'mono', size: labSize, weight: 700, color: C.sky, tracking: 0.12 }));
    }
  });
  return cx - x;
}
/** Measure a partner row without drawing. */
export function partnerRowWidth(h, H, groups, o = {}) {
  const gap = o.gap ?? R(H * 0.55), ggap = o.groupGap ?? R(H * 0.9);
  let w = 0;
  groups.forEach((gr, gi) => {
    if (gi > 0) w += ggap;
    gr.ids.forEach((id, j) => { if (j > 0) w += gap; w += partnerItem(h, id, 0, 0, H, { draw: false, maxW: o.maxItemW }); });
  });
  return w;
}

export { R, dot, hash, ease, tween, stampCurve };
