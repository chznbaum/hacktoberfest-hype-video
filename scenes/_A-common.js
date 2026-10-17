// _A-common.js (owner A): shared helpers for the intro + bridge scenes (cold-open, chant-757, hosts, wake-up,
// builders, chant-757-b). Night bay world with a camera offset, beat lookup with fallbacks, chunky pixel-block
// numerals, splash / ripple fx, perched gulls, dither-blend between two renders, partner logos (logos.json).
import { C, RAMP, SKY } from '../lib/palette.js';
import { clamp, hash, onTwos, lerp } from '../lib/motion.js';
import { makeCanvas, rect, px, dither, bands, sprite, drawSprite, line } from '../lib/pixel.js';
import { stars, water, headland, lighthouse, moon, cloud, haloDisc, cached } from '../lib/world.js';
import { text, measure } from '../lib/text.js';

const R = Math.round;

// ------------------------------------------------------------------ timing
/** Beat times >= t0 (clip-relative), extrapolated past the end of c.beats so lookups never fail. */
export function beatAfter(c, t0, n = 0) {
  const B = c.beats;
  let i = B.findIndex((b) => b >= t0 - 1e-3);
  const len = B.length > 1 ? B[B.length - 1] - B[B.length - 2] : 0.588;
  if (i < 0) return B[B.length - 1] + (n + 1) * len;
  const j = i + n;
  if (j < B.length) return B[j];
  return B[B.length - 1] + (j - B.length + 1) * len;
}
/** i-th beat from the clip start. */
export const beatT = (c, i) => beatAfter(c, 0, i);
/** Beat length near t. */
export function beatLen(c, t = 0) {
  const b = c.beat(t);
  return b.len > 0 ? b.len : 0.588;
}
/** Cue start/end with a fallback (standalone scene renders have no cues). */
export function cue(c, id, fallback) {
  const l = c.lines && c.lines[id];
  return l ? l : fallback;
}
/** Chant hits for a cue, or fallback beat indices. */
export function hitsFor(c, id, fallbackBeats) {
  const h = c.hits && c.hits[id];
  if (h && h.length) return h;
  return fallbackBeats.map((i) => beatT(c, i));
}
/** Index of the last time in `times` <= t (-1 if none). */
export function passed(times, t) {
  let k = -1;
  for (let i = 0; i < times.length; i++) if (times[i] <= t + 1e-6) k = i;
  return k;
}

// ------------------------------------------------------------------ layouts
/** Night-bay layouts per format (pixel coords). The key-art placement, used across the intro. */
export const BAY = {
  '16x9': { lh: { x: 258, base: 124, h: 104 }, waterY: 131, waterX: 150, fadeW: 70, moon: { x: 46, y: 30, r: 7 },
    clouds: [{ kind: 'big', x: 150, y: 40, v: 0.8 }, { kind: 'wisp', x: 20, y: 70, v: 0.5 }, { kind: 'small', x: 96, y: 18, v: 0.6 }] },
  '9x16': { lh: { x: 124, base: 236, h: 110 }, waterY: 244, waterX: 0, fadeW: 40, moon: { x: 36, y: 104, r: 7 },
    clouds: [{ kind: 'big', x: 2, y: 150, v: 0.6 }, { kind: 'wisp', x: 120, y: 96, v: 0.4 }, { kind: 'small', x: 112, y: 64, v: 0.5 }] },
};

/**
 * Banded sky with a vertical camera offset: bands span [top .. horizon] in world space, everything above `top`
 * is the darkest band. preset: SKY key or array. Optional `to`/`k` dither toward a second preset.
 */
export function skyCam(ctx, o) {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  const A = Array.isArray(o.preset) ? o.preset : SKY[o.preset || 'night'];
  const top = R(o.top), bot = R(o.bottom);
  rect(ctx, 0, 0, W, H, A[0]);
  bands(ctx, 0, top, W, bot - top, A, { blend: 2 });
  if (bot < H) rect(ctx, 0, bot, W, H - bot, A[A.length - 1]);
  if (o.to && o.k > 0) {
    const B = Array.isArray(o.to) ? o.to : SKY[o.to];
    const k = clamp(o.k);
    if (k >= 1) { rect(ctx, 0, 0, W, H, B[0]); bands(ctx, 0, top, W, bot - top, B, { blend: 2 }); if (bot < H) rect(ctx, 0, bot, W, H - bot, B[B.length - 1]); return; }
    dither(ctx, 0, 0, W, Math.max(0, top), null, B[0], k);
    const n = B.length;
    for (let i = 0; i < n; i++) {
      const y0 = R(top + (i * (bot - top)) / n), y1 = R(top + ((i + 1) * (bot - top)) / n);
      dither(ctx, 0, y0, W, y1 - y0, null, B[i], k);
    }
    if (bot < H) dither(ctx, 0, bot, W, H - bot, null, B[B.length - 1], k);
  }
}

/**
 * The night bay: sky, stars (parallax), moon, drifting clouds, water, headland with lighthouse, perched gulls.
 * opts: { oy (camera: +N = looking up, world shifted down), tod, starShow, beamAngle, beam, glow, flare,
 *         gulls (perched on the seawall), moon, clouds, waterGlints, skyPreset, skyTo, skyK, headland:false }
 * Returns { lh, waterY, seawallY } in screen coords.
 */
export function bayWorld(g, t, c, o = {}) {
  const { px: ctx, PW, PH } = g;
  const L = BAY[c.fmt];
  const oy = R(o.oy || 0);
  const tod = o.tod || 'night';
  const tq = onTwos(t);
  const horizon = (o.waterY ?? L.waterY) + oy;
  skyCam(ctx, { preset: o.skyPreset || (tod === 'night' ? 'night' : 'day'), top: horizon - (c.fmt === '9x16' ? 300 : 175), bottom: horizon, to: o.skyTo, k: o.skyK });
  if (o.dawn > 0) dawnGlow(ctx, horizon, o.dawn, c.fmt === '9x16' ? 9 : 7);
  if (o.starShow !== 0) {
    const sOy = R(oy * 0.45);
    stars(ctx, t, { x: 0, y: -90 + sOy, w: PW, h: L.waterY + 80, seed: o.starSeed ?? 5, show: o.starShow ?? 1, count: R((PW * (L.waterY + 80)) / 230) });
  }
  const M = o.moonAt || L.moon;
  if (o.moon !== false && M) moon(ctx, M.x, M.y + R(oy * 0.6), M.r || 7, { phase: 0.45, halo: true });
  if (o.clouds !== false) for (const cl of o.cloudsAt || L.clouds) cloud(ctx, R(cl.x + ((tq * cl.v) % 40)), cl.y + R(oy * 0.7), { kind: cl.kind, tod: tod === 'night' ? 'night' : 'day' });
  if (o.afterSky) o.afterSky(ctx, horizon);
  if (o.shore) distantShore(ctx, t, horizon, o.shore.x0 ?? 0, o.shore.x1 ?? PW, { seed: o.shore.seed ?? 3, lit: o.shore.lit ?? 1 });
  const lx = o.lhX ?? L.lh.x;
  const glints = o.waterGlints || (tod === 'night' ? [...(o.headland === false ? [] : [{ x: lx, color: C.gold, w: 10 }]), { x: M.x, color: '#B9D5DC', w: 6 }] : []);
  water(ctx, t, { x: o.waterX ?? L.waterX, y: horizon, w: PW - (o.waterX ?? L.waterX), h: Math.max(1, PH - horizon), tod, fade: c.fmt === '9x16' || o.waterFull ? 'none' : 'left', fadeW: L.fadeW, seed: 4, glints });
  let lh = null;
  if (o.headland === 'tower') {
    lh = lighthouse(ctx, lx, (o.lhBase ?? L.lh.base) + oy, { t, tod, h: o.lhH ?? L.lh.h, glow: o.glow ?? 1, beam: o.beam ?? (tod === 'night'),
      beamAngle: o.beamAngle, beamLen: c.fmt === '9x16' ? 130 : 180, beamStrength: o.beamStrength });
  } else if (o.headland !== false) {
    lh = headland(ctx, lx, (o.lhBase ?? L.lh.base) + oy, {
      t, tod, h: o.lhH ?? L.lh.h, glow: o.glow ?? 1, beam: o.beam ?? (tod === 'night'), beamAngle: o.beamAngle,
      beamLen: c.fmt === '9x16' ? 130 : 180, beamStrength: o.beamStrength, flare: o.flare, halo: o.halo,
    });
    if (o.lhX !== undefined) lh.custom = true;
    if (o.gulls !== false && o.lhX === undefined && o.lhBase === undefined) perchedGulls(ctx, c.fmt, oy, tod, o.gullsLeaving ?? -1);
  }
  return { lh, horizon, oy };
}

/** Warm horizon bands that rise out of the bay as dawn comes (k 0..1): teal -> mauve -> rose -> coral -> gold. */
export const DAWN_BANDS = ['#214D49', '#2F5452', '#3D5653', '#6B5E62', '#B07A6E', '#F09A76', '#F5A55A', '#F5C04A'];
export function dawnGlow(ctx, horizon, k, bandH = 7) {
  const W = ctx.canvas.width;
  const n = clamp(k) * DAWN_BANDS.length;
  if (n <= 0.05) return;
  const top = R(horizon - n * bandH);
  const cnt = Math.ceil(n);
  const cols = DAWN_BANDS.slice(0, cnt);
  // each band is bandH tall; the newest (warmest) band is partly below the horizon line
  for (let i = 0; i < cols.length; i++) {
    const y0 = top + i * bandH, y1 = Math.min(horizon, y0 + bandH);
    if (y1 > y0) rect(ctx, 0, y0, W, y1 - y0, cols[i]);
    if (i > 0) for (let r = 0; r < 2; r++) dither(ctx, 0, y0 - 1 + r, W, 1, cols[i - 1], cols[i], (r + 0.5) / 2);
  }
}

/**
 * Distant Hampton shoreline on the horizon: a low blocky silhouette (rooftops, a water tower, tree bumps) with
 * tiny window lights that twinkle on twos. y = horizon row (the shore sits on it). lit 0..1 = share of lit windows.
 */
export function distantShore(ctx, t, y, x0, x1, o = {}) {
  const seed = o.seed ?? 3;
  const tq = onTwos(t);
  const body = o.color || '#173B38', edge = '#1B4440';
  let x = x0;
  let i = 0;
  while (x < x1 && i < 200) {
    const kind = hash(i, 1, seed);
    const w = kind < 0.25 ? 3 + R(hash(i, 2, seed) * 3) : 4 + R(hash(i, 2, seed) * 8);
    const h = kind < 0.25 ? 2 + R(hash(i, 3, seed) * 2) : kind < 0.9 ? 3 + R(hash(i, 3, seed) * 5) : 9;
    if (kind < 0.25) { // tree bump
      rect(ctx, x, y - h, w, h, body); rect(ctx, x + 1, y - h - 1, Math.max(1, w - 2), 1, body);
    } else if (kind < 0.9) { // building
      rect(ctx, x, y - h, w, h, body); rect(ctx, x, y - h, w, 1, edge);
      for (let wy = y - h + 2; wy < y - 1; wy += 2) for (let wx = x + 1; wx < x + w - 1; wx += 2) {
        const hv = hash(wx, wy, seed + 7);
        if (hv < 0.28 * (o.lit ?? 1)) {
          const tw = hash(wx, Math.floor(tq * 1.5) + wy, seed) > 0.12;
          if (tw) px(ctx, wx, wy, hv < 0.07 ? C.cream : C.gold);
        }
      }
    } else { // water tower / mast with a red light
      rect(ctx, x + 1, y - h + 3, 1, h - 3, body); rect(ctx, x, y - h + 1, 3, 2, body);
      if (Math.floor(tq * 1.2) % 2 === 0) px(ctx, x + 1, y - h, C.coral);
    }
    x += w + (hash(i, 4, seed) < 0.3 ? 1 + R(hash(i, 5, seed) * 4) : 0);
    i++;
  }
}

// ------------------------------------------------------------------ perched gulls (sleep on the seawall in C01, take off in C04)
// side-view gull at rest: round head left, folded grey wing, tail right
const PERCH = ['.w....', 'wwwgg.', '.wwggg'];
const perchSpr = {};
export function perchedGullSpots(fmt, oy = 0) {
  const L = BAY[fmt];
  const s = L.lh.h / 104;
  const X = (v) => R(L.lh.x + v * s), Y = (v) => R(L.lh.base + oy + v * s);
  return [[X(-50), Y(4)], [X(-44), Y(4)], [X(-31), Y(12)], [X(-24), Y(12)], [X(30), Y(4)]];
}
export function perchedGulls(ctx, fmt, oy, tod, skip = -1) {
  const col = tod === 'night' ? '#A9B5AB' : C.cream;
  if (!perchSpr[col]) perchSpr[col] = sprite(PERCH, { w: col, g: tod === 'night' ? '#798F86' : '#B9D5DC' });
  perchedGullSpots(fmt, oy).forEach(([x, y], i) => {
    if (skip >= 0 && skip > i) return; // gulls with index < skip have left
    drawSprite(ctx, perchSpr[col], x - 3, y - 3, { flipX: i % 2 === 1 });
  });
}

// ------------------------------------------------------------------ dither blend between two renders
let blendBuf = null;
/** Draw `drawB` over the current ctx through a Bayer mask of density k (0 = none, 1 = all). */
export function ditherOver(ctx, k, drawB) {
  if (k <= 0) return;
  const W = ctx.canvas.width, H = ctx.canvas.height;
  if (!blendBuf || blendBuf.canvas.width !== W || blendBuf.canvas.height !== H) blendBuf = makeCanvas(W, H);
  const b = blendBuf.ctx;
  b.reset(); b.imageSmoothingEnabled = false;
  drawB(b);
  if (k < 1) {
    b.globalCompositeOperation = 'destination-in';
    dither(b, 0, 0, W, H, null, '#000000', clamp(k));
    b.globalCompositeOperation = 'source-over';
  }
  ctx.drawImage(blendBuf.canvas, 0, 0);
}

// ------------------------------------------------------------------ chunky pixel-block numerals
// 5x10 condensed grids, 2-block strokes: heavy and tall like the key-art "757" (Barlow Semi Condensed 800).
export const DIGITS = {
  7: ['#####', '#####', '...##', '...##', '..##.', '..##.', '..##.', '.##..', '.##..', '.##..'],
  5: ['#####', '#####', '##...', '##...', '####.', '#####', '...##', '...##', '#####', '####.'],
};
const DIGIT_TRIM = {};

/**
 * Render a block numeral into a cached canvas. bw/bh = block size (integers; squash with bw>bh).
 * depth = extrusion (px) toward the lower right. Palette: cream face (lighthouse ramp), sky extrusion.
 * style: 'block' (default) | 'neon' handled elsewhere.
 */
export function digitCanvas(ch, bw, bh, depth = 4, pal = 'cream') {
  const g = DIGITS[ch];
  const cols = g[0].length, rows = g.length;
  const W = cols * bw + depth + 1, H = rows * bh + depth + 1;
  return cached(`A-digit|${ch}|${bw}|${bh}|${depth}|${pal}`, W, H, (c) => {
    const on = (x, y) => y >= 0 && y < rows && x >= 0 && x < cols && g[y][x] === '#';
    const P = pal === 'sky'
      ? { face: C.sky, lit: '#A5CFE8', top: '#C1E2F2', seam: '#5A9CC6', shade: '#3F8ABD', ex: ['#214D49', '#2B6A80'] }
      : { face: C.cream, lit: '#FDF7EA', top: '#FDF7EA', seam: '#E6D9C1', shade: '#B9B19C', ex: ['#2B6A80', '#3F8ABD', C.sky] };
    // extrusion: far -> near
    for (let d = depth; d >= 1; d--) {
      const col = d === depth ? P.ex[0] : d >= depth - 1 && P.ex.length > 2 ? P.ex[1] : P.ex[P.ex.length - 1];
      c.fillStyle = col;
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (on(x, y)) c.fillRect(x * bw + d, y * bh + d, bw, bh);
    }
    // faces
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      if (!on(x, y)) continue;
      const X = x * bw, Y = y * bh;
      c.fillStyle = P.face; c.fillRect(X, Y, bw, bh);
      // block seams (subtle, every 2 blocks so strokes read as chunky bricks)
      if (x % 2 === 1 && on(x + 1, y)) { c.fillStyle = P.seam; c.fillRect(X + bw - 1, Y + 1, 1, bh - 1); }
      if (y % 2 === 1 && on(x, y + 1)) { c.fillStyle = P.seam; c.fillRect(X + 1, Y + bh - 1, bw - 1, 1); }
      // outer bevel: lit top / left, shaded bottom / right
      if (!on(x, y - 1)) { c.fillStyle = P.top; c.fillRect(X, Y, bw, 1); }
      if (!on(x - 1, y)) { c.fillStyle = P.lit; c.fillRect(X, Y, 1, bh); }
      if (!on(x, y + 1)) { c.fillStyle = P.shade; c.fillRect(X, Y + bh - 1, bw, 1); if (bh > 5) { c.fillStyle = P.seam; c.fillRect(X, Y + bh - 2, bw, 1); } }
      if (!on(x + 1, y)) { c.fillStyle = P.shade; c.fillRect(X + bw - 1, Y, 1, bh); }
    }
    for (const [x, y] of DIGIT_TRIM[ch] || []) c.clearRect(x * bw + bw - 2, y * bh + bh - 2, 2 + depth, 2 + depth);
  });
}
export const digitSize = (bw, bh, depth = 4) => ({ w: 5 * bw, h: 10 * bh, W: 5 * bw + depth + 1, H: 10 * bh + depth + 1 });

// ------------------------------------------------------------------ fx
/** Upward splash of water droplets from a base line (x0..x0+w at y). k = seconds since impact. */
export function splash(ctx, x0, y, w, k, o = {}) {
  const life = o.life ?? 0.7;
  if (k < 0 || k > life) return;
  const n = o.n ?? 26, seed = o.seed ?? 1, gr = o.gravity ?? 260;
  const cols = o.colors || ['#C1E2F2', '#A5CFE8', C.cream, C.sky, '#79AED3'];
  const kq = onTwos(k);
  for (let i = 0; i < n; i++) {
    const side = hash(i, 1, seed) < 0.5 ? -1 : 1;
    const sx = x0 + (side < 0 ? hash(i, 2, seed) * w * 0.35 : w - hash(i, 2, seed) * w * 0.35);
    const vx = side * (14 + hash(i, 3, seed) * 46);
    const vy = -(50 + hash(i, 4, seed) * 90);
    const X = sx + vx * kq, Y = y + vy * kq + 0.5 * gr * kq * kq;
    if (Y > y + 1) continue;
    if (hash(i, 5, seed) < (kq / life) * 0.9) continue;
    const big = kq < life * 0.35 && hash(i, 6, seed) < 0.5;
    rect(ctx, R(X), R(Y), big ? 2 : 1, big ? 2 : 1, cols[i % cols.length]);
  }
}
/** Expanding ripple ring on the water surface (lower half of an ellipse) + a foam line. */
export function ripple(ctx, cx, y, w, k, o = {}) {
  const life = o.life ?? 0.6;
  if (k < 0 || k > life) return;
  const kq = onTwos(k);
  const rx = R(w / 2 + kq * (o.speed ?? 90)), ry = R(1 + kq * 7);
  const col = kq < life * 0.5 ? '#C1E2F2' : '#A5CFE8';
  for (let x = -rx; x <= rx; x++) {
    const yy = R(ry * Math.sqrt(Math.max(0, 1 - (x * x) / (rx * rx))));
    if (hash(x + R(cx), 3, R(kq * 30)) < 0.25 + kq) continue;
    px(ctx, R(cx) + x, y + yy, col);
  }
}
/** Vertical speed streaks above a falling object (x0..x0+w), length ~len, ending at yEnd. */
export function speedLines(ctx, x0, w, yEnd, len, seed = 1, col = C.sky) {
  for (let i = 0; i < 7; i++) {
    const x = R(x0 + hash(i, 1, seed) * w);
    const l = R(len * (0.4 + hash(i, 2, seed) * 0.6));
    const y1 = R(yEnd - hash(i, 3, seed) * 6);
    rect(ctx, x, y1 - l, 1, l, col);
  }
}
/** Dust puffs that roll outward along the ground from both sides of a landing. */
export function dustPuffs(ctx, x0, x1, y, k, o = {}) {
  const life = o.life ?? 0.5;
  if (k < 0 || k > life) return;
  const kq = onTwos(k), f = kq / life;
  const cols = o.colors || [C.cream, '#B9D5DC', C.sky];
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < 4; i++) {
      const d = R((6 + i * 7) * (0.3 + f * 1.2));
      const cx = side < 0 ? x0 - d : x1 + d;
      const r = Math.max(1, R((3 - i * 0.5) * (1 - f * 0.7)));
      const cy = y - r - R(f * 4);
      const col = cols[Math.min(cols.length - 1, Math.floor(f * cols.length))];
      if (f > 0.85 && i > 1) continue;
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > r * r + 0.5) continue;
        if (f > 0.5 && (dx + dy + i) % 2) continue; // breaks up into dither as it fades
        px(ctx, cx + dx, cy + dy, col);
      }
    }
  }
}

// ------------------------------------------------------------------ partner logos (content/logos.json)
// Engine doesn't load logos.json, so scenes that need it load it in setup(). A logo with a `file` is drawn as a
// tinted alpha mask (cream by default); without a file it falls back to a condensed-caps text wordmark.
const LOGOS = { list: [], images: {} };
let logoLoad = null;
export function loadLogos() {
  if (!logoLoad) {
    logoLoad = (async () => {
      try {
        const r = await fetch('content/logos.json');
        const j = await r.json();
        LOGOS.list = j.logos || [];
      } catch (e) { LOGOS.list = []; }
      await Promise.all(LOGOS.list.filter((l) => l.file).map((l) => new Promise((res) => {
        const im = new Image();
        im.onload = () => { LOGOS.images[l.id] = im; res(); };
        im.onerror = () => res(); // missing file -> text fallback
        im.src = l.file;
      })));
    })();
  }
  return logoLoad;
}
export function logo(id) {
  const l = LOGOS.list.find((x) => x.id === id);
  return { entry: l || null, img: LOGOS.images[id] || null };
}
const tintCache = new Map();
/** Image tinted to a flat color (alpha mask), at device size w x h. */
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
/** Fit an image into maxW x maxH preserving aspect. */
export function fitBox(img, maxW, maxH) {
  const a = img.width / img.height;
  let w = maxW, h = maxW / a;
  if (h > maxH) { h = maxH; w = maxH * a; }
  return { w, h };
}
/** Split a long wordmark into two balanced lines at a word boundary. */
export function splitTwo(str) {
  const words = String(str).split(' ');
  if (words.length < 3) return [str];
  let best = null;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
    const score = Math.abs(a.length - b.length) + (b.length > a.length ? 2 : 0);
    if (!best || score < best.score) best = { a, b, score };
  }
  return [best.a, best.b];
}

/**
 * Pixel lens flare at a light source: dithered gold halo + horizontal anamorphic streak (cream core, sky ends)
 * + short vertical spike. k 0..1 intensity.
 */
export function lensFlare(ctx, x, y, k, o = {}) {
  if (k <= 0) return;
  const len = R((o.len ?? 60) * k), r = R((o.r ?? 9) * (0.5 + k * 0.5));
  haloDisc(ctx, x, y, r + 4, C.gold, 0.12 * k);
  haloDisc(ctx, x, y, r, C.gold, 0.28 * k);
  haloDisc(ctx, x, y, R(r * 0.5), C.cream, 0.5 * k);
  rect(ctx, x - len, y, len * 2 + 1, 1, C.sky);
  rect(ctx, x - R(len * 0.6), y, R(len * 1.2) + 1, 1, '#C1E2F2');
  rect(ctx, x - R(len * 0.25), y, R(len * 0.5) + 1, 1, C.cream);
  if (k > 0.5) rect(ctx, x - R(len * 0.15), y - 1, R(len * 0.3) + 1, 3, C.cream);
  const v = R(len * 0.22);
  rect(ctx, x, y - v, 1, v * 2 + 1, '#C1E2F2');
}

/** Small pixel star-burst (8 rays) for light-ups. k 0..1 */
export function starBurst(ctx, x, y, k, col = C.gold, r = 6) {
  if (k <= 0 || k >= 1) return;
  const kq = k;
  const r0 = R(2 + kq * r * 0.6), r1 = R(3 + kq * r);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const len = i % 2 ? 0.6 : 1;
    line(ctx, x + Math.cos(a) * r0, y + Math.sin(a) * r0, x + Math.cos(a) * (r0 + (r1 - r0) * len), y + Math.sin(a) * (r0 + (r1 - r0) * len), kq > 0.6 ? C.cream : col);
  }
}

export { measure, text, lerp, haloDisc };
