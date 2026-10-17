// world.js: reusable PIXEL-ART world pieces (draw on g.px, the low-res canvas). Everything is deterministic:
// a frame depends only on the arguments (positions, t, tod, seed). Static pieces are cached as offscreen canvases.
//
// Conventions
//   - (x, y) are integer pixel coords on the low-res canvas. "base"/"ground" y = the first row BELOW the object.
//   - tod = time of day: 'night' | 'dawn' | 'day' | 'dusk' (props use TOD[tod] colors; sky uses SKY presets).
//   - t = seconds (clip time is fine); sprite animation is quantized "on twos" (15 fps) internally.
//   - Light comes from the upper-left (lit left faces, shaded right faces), matching the key art.

import { C, RAMP, SKY, TOD } from './palette.js';
import { hash, rng, clamp, onTwos, frameIndex, lerp, mod } from './motion.js';
import { makeCanvas, rect, px, hline, vline, dither, bands, ellipse, disc, poly, sprite, drawSprite, line } from './pixel.js';

const R = Math.round;
const pal = (tod) => TOD[tod] || TOD.day;

// ---------------------------------------------------------------- caching
const cache = new Map();
/** Build (once) and return an offscreen canvas for a static piece. draw(ctx) paints it. */
export function cached(key, w, h, draw) {
  let c = cache.get(key);
  if (!c) {
    const m = makeCanvas(w, h);
    draw(m.ctx);
    c = m.canvas;
    cache.set(key, c);
  }
  return c;
}

// ---------------------------------------------------------------- sky
/**
 * Banded sky (no smooth gradients): sky(ctx, { tod: 'night'|'predawn'|'dawn'|'day'|'dusk', x, y, w, h, blend })
 * Optional { to: 'day', k: 0..1 } dithers a second preset over the first (sunrise / sunset transitions).
 * Defaults: full canvas width, h = canvas height.
 */
export function sky(ctx, o = {}) {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  const x = o.x ?? 0, y = o.y ?? 0, w = o.w ?? W, h = o.h ?? H;
  const A = SKY[o.tod || 'day'] || SKY.day;
  bands(ctx, x, y, w, h, A, { blend: o.blend ?? 2 });
  if (o.to && o.k > 0) {
    const B = SKY[o.to] || SKY.day;
    const k = clamp(o.k);
    if (k >= 1) return bands(ctx, x, y, w, h, B, { blend: o.blend ?? 2 });
    const n = B.length;
    for (let i = 0; i < n; i++) {
      const y0 = R(y + (i * h) / n), y1 = R(y + ((i + 1) * h) / n);
      dither(ctx, x, y0, w, y1 - y0, null, B[i], k);
    }
  }
}

/**
 * Twinkling stars. stars(ctx, t, { x, y, w, h, count, seed, colors, big (fraction of big plus-stars), show 0..1 })
 * Stars twinkle on twos; ~12% are plus-shaped sparkles in gold/cream. show < 1 hides stars progressively (dawn).
 */
export function stars(ctx, t, o = {}) {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  const x = o.x ?? 0, y = o.y ?? 0, w = o.w ?? W, h = o.h ?? H * 0.6;
  const n = o.count ?? Math.round((w * h) / 260);
  const seed = o.seed ?? 11;
  const cols = o.colors || [C.cream, C.sky, '#B9D5DC', C.gold];
  const tq = onTwos(t);
  const show = o.show ?? 1;
  for (let i = 0; i < n; i++) {
    if (hash(i, 99, seed) > show) continue;
    const sx = R(x + hash(i, 1, seed) * w), sy = R(y + hash(i, 2, seed) * h);
    const kind = hash(i, 3, seed);
    const ph = hash(i, 4, seed) * 10, sp = 0.6 + hash(i, 5, seed) * 1.6;
    const tw = Math.sin((tq * sp + ph) * Math.PI);
    const col = cols[Math.floor(hash(i, 6, seed) * cols.length)];
    if (kind < (o.big ?? 0.07)) {
      // plus sparkle: grows on peaks of its twinkle
      px(ctx, sx, sy, col);
      if (tw > -0.2) { px(ctx, sx - 1, sy, col); px(ctx, sx + 1, sy, col); px(ctx, sx, sy - 1, col); px(ctx, sx, sy + 1, col); }
      if (tw > 0.75) { px(ctx, sx - 2, sy, C.cream); px(ctx, sx + 2, sy, C.cream); px(ctx, sx, sy - 2, C.cream); px(ctx, sx, sy + 2, C.cream); }
    } else if (tw > -0.55) {
      px(ctx, sx, sy, tw > 0.5 ? C.cream : col === C.gold ? C.sky : col);
    }
  }
}

// ---------------------------------------------------------------- water
/**
 * Chesapeake Bay water in horizontal pixel streaks (key-art style), animated.
 * water(ctx, t, { x, y, w, h, tod, seed, fade: 'left'|'right'|'both'|'none', fadeW, speed, glints: [{x, color, w}], foam })
 *  - rows are grouped in 2px bands; each band is a mosaic of horizontal runs (base blue, lighter streaks, rare
 *    foam whites, a few dark streaks) drifting sideways at its own speed = shimmer
 *  - fade: ragged streaky edge that dissolves into the background (key art: left edge of the bay)
 *  - glints: vertical columns of broken reflection streaks (sun / moon / lighthouse) at x
 */
export function water(ctx, t, o = {}) {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  const x0 = R(o.x ?? 0), y0 = R(o.y ?? H * 0.7), w = R(o.w ?? W - x0), h = R(o.h ?? H - y0);
  const P = pal(o.tod).water;
  const seed = o.seed ?? 3;
  const fade = o.fade || 'none';
  const fadeW = o.fadeW ?? Math.min(70, w * 0.4);
  const speed = o.speed ?? 1;
  const cell = o.cell ?? 3;
  const tq = onTwos(t);
  const fL = fade === 'left' || fade === 'both', fR = fade === 'right' || fade === 'both';
  // colour table: [colour, cumulative weight]
  const pick = (u, depth) => {
    if (u < 0.46) return P[2];
    if (u < 0.66) return P[3];
    if (u < 0.79) return P[4];
    if (u < 0.86) return P[5];
    if (u < 0.90 - depth * 0.02) return P[6];
    if (u < 0.95) return P[1];
    return P[2];
  };
  const isBreak = (ci, band) => hash(ci, band, seed + 77) < 0.24;
  for (let r = 0; r < h; r++) {
    const yy = y0 + r;
    const depth = r / Math.max(1, h);
    // 2px bands, some split into two 1px rows
    const band = Math.floor(r / 2);
    const split = hash(band, 5, seed) < 0.3 && r % 2 === 1;
    const bandId = split ? band * 7 + 1000 : band;
    const v = (hash(band, 1, seed) < 0.5 ? -1 : 1) * (1.5 + hash(band, 2, seed) * 4) * speed * (1 - depth * 0.35);
    const off = Math.floor(tq * v);
    const edgeL = fL ? x0 + R(fadeW * (0.4 + 0.6 * hash(band, 3, seed)) * (1 - depth * 0.45)) : x0;
    const edgeR = fR ? x0 + w - R(fadeW * (0.4 + 0.6 * hash(band, 4, seed)) * (1 - depth * 0.45)) : x0 + w;
    let x = x0;
    let guard = 0;
    while (x < x0 + w && guard++ < 400) {
      const ci = Math.floor((x - off) / cell);
      let s0 = ci; for (let k = 0; k < 14 && !isBreak(s0, bandId); k++) s0--;
      let e0 = ci + 1; for (let k = 0; k < 14 && !isBreak(e0, bandId); k++) e0++;
      const xa = x, xb = Math.min(x0 + w, e0 * cell + off);
      if (xb <= xa) { x = xa + 1; continue; }
      const mid = (xa + xb) / 2;
      // fringe: probability of a gap (background shows through) grows outside the ragged edge
      let gap = 0;
      if (fL && mid < edgeL) gap = Math.max(gap, clamp((edgeL - mid) / (fadeW * 0.85)) * 0.8 + 0.18);
      if (fR && mid > edgeR) gap = Math.max(gap, clamp((mid - edgeR) / (fadeW * 0.85)) * 0.8 + 0.18);
      const u = hash(s0, bandId, seed + 91);
      if (!(gap > 0 && hash(s0, bandId, seed + 13) < gap)) {
        const col = gap > 0 && u > 0.6 ? P[2] : pick(u, depth);
        rect(ctx, xa, yy, xb - xa, 1, col);
      }
      x = xb;
    }
  }
  if (o.foam) {
    for (let x = x0; x < x0 + w; x += 1) {
      const hv = hash(R(x + tq * 2 * speed), 18, seed);
      if (hv > 0.7) px(ctx, x, y0, hv > 0.9 ? P[6] : P[5]);
    }
  }
  for (const g of o.glints || []) {
    const gw = g.w ?? 6;
    for (let r = 1; r < h; r += 2) {
      const flick = hash(r, Math.floor(tq * 6), seed + 5);
      if (flick < 0.35) continue;
      const spread = R(gw * (0.5 + (r / h) * 0.9));
      const len = 1 + R(hash(r, 19, seed + Math.floor(tq * 4)) * spread);
      const off = R((hash(r, 21, seed + Math.floor(tq * 5)) - 0.5) * spread);
      rect(ctx, g.x + off - (len >> 1), y0 + r, len, 1, g.color || C.gold);
    }
  }
}

// ---------------------------------------------------------------- lighthouse
/**
 * Old Point Comfort-style lighthouse: white tapered octagonal tower, dark iron gallery + lantern room with glowing
 * panes, coral roof with finial. lighthouse(ctx, x, base, { h, t, tod, glow, beam, beamAngle, beamLen, flare })
 *   x = centre column, base = ground row (tower bottom sits on base-1), h = total height incl. finial (default 104,
 *   the key-art size in 16:9). glow 0..1 lantern brightness (default: pulses gently with t).
 *   beam: true -> rotating beam; beamAngle (radians, 0 = pointing right; default rotates with t), beamLen (px).
 * Returns anchors { lantern: {x, y}, top, base, w, h }.
 */
export function lighthouse(ctx, x, base, o = {}) {
  const h = Math.max(24, R(o.h ?? 104));
  const tod = o.tod || 'day';
  const t = o.t ?? 0;
  const geo = lighthouseGeo(h);
  const key = `lh|${h}|${tod}`;
  const W = geo.W, H = h + 2;
  const cvs = cached(key, W, H, (c) => paintLighthouse(c, geo, pal(tod), tod));
  const left = R(x) - geo.cx, top = R(base) - H;
  // night halo behind the lantern
  const glow = clamp(o.glow ?? (tod === 'night' || tod === 'dusk' ? 0.85 + 0.15 * Math.sin(onTwos(t) * 4) : 0.55 + 0.1 * Math.sin(onTwos(t) * 3)));
  const lx = R(x), ly = top + geo.lanternY + (geo.lanternH >> 1);
  if (tod === 'night' || tod === 'dusk' || o.halo) {
    const rr = R(geo.lanternW * 1.1 * (0.85 + glow * 0.3));
    haloDisc(ctx, lx, ly, rr, C.gold, 0.09 * glow);
    haloDisc(ctx, lx, ly, R(rr * 0.65), C.gold, 0.2 * glow);
  }
  ctx.drawImage(cvs, left, top);
  // lantern panes (dynamic glow)
  const p = pal(tod);
  const gx0 = left + geo.cx - (geo.lanternW >> 1) + 1, gy0 = top + geo.lanternY + 1;
  const gw = geo.lanternW - 2, gh = geo.lanternH - 2;
  const paneW = Math.max(1, Math.floor((gw - 2) / 3));
  for (let i = 0; i < 3; i++) {
    const px0 = gx0 + i * (paneW + 1);
    const pw = i === 2 ? gw - 2 * (paneW + 1) : paneW;
    rect(ctx, px0, gy0, pw, gh, glow > 0.7 ? p.glass : p.glassDim);
    if (glow > 0.45) rect(ctx, px0 + (pw > 2 ? 1 : 0), gy0 + 1, Math.max(1, pw - 2), Math.max(1, gh - 2), glow > 0.8 ? p.glassHot : p.glass);
  }
  // the lamp itself (centre pane hot spot)
  if (glow > 0.6) { const cxp = gx0 + paneW + 1 + (paneW >> 1); rect(ctx, cxp - (paneW > 2 ? 1 : 0), gy0 + (gh >> 1) - 1, paneW > 2 ? 2 : 1, 2, C.cream); }
  // rotating beam
  if (o.beam) {
    const ang = o.beamAngle ?? onTwos(t) * 1.6;
    beam(ctx, lx, ly, ang, { len: o.beamLen ?? 150, tod, strength: o.beamStrength ?? (tod === 'night' ? 1 : 0.6) });
  }
  if (o.flare) haloDisc(ctx, lx, ly, R(geo.lanternW * 2.5 * o.flare), C.cream, 0.5 * o.flare);
  return { lantern: { x: lx, y: ly }, top, base: R(base), w: geo.baseW, h, left, geo };
}

/** Geometry for a lighthouse of total height h (see lighthouse()). */
export function lighthouseGeo(h) {
  const u = h / 104;
  const finialH = Math.max(2, R(6 * u)), roofH = Math.max(3, R(8 * u)), lanternH = Math.max(3, R(9 * u));
  const galleryH = Math.max(3, R(7 * u)), corniceH = Math.max(1, R(2 * u));
  const towerH = h - finialH - roofH - lanternH - galleryH - corniceH;
  const odd = (v) => (v % 2 ? v : v + 1);
  const topW = odd(R(19 * u)), baseW = odd(R(27 * u)), corniceW = odd(R(23 * u)), galleryW = odd(R(25 * u));
  const lanternW = odd(Math.max(5, R(14 * u))), eaveW = odd(lanternW + Math.max(4, R(6 * u)));
  const W = Math.max(galleryW, baseW, eaveW) + 4;
  const cx = W >> 1;
  const finialY = 0, roofY = finialH, lanternY = roofY + roofH, galleryY = lanternY + lanternH, corniceY = galleryY + galleryH;
  const towerY = corniceY + corniceH;
  return { h, u, W, cx, finialH, roofH, lanternH, galleryH, corniceH, towerH, topW, baseW, corniceW, galleryW, lanternW, eaveW,
    finialY, roofY, lanternY, galleryY, corniceY, towerY };
}

function paintLighthouse(c, g, p, tod) {
  const cx = g.cx;
  // --- tower (tapered, stepped, 3 visible facets)
  const sections = 4;
  for (let r = 0; r < g.towerH; r++) {
    const k = r / Math.max(1, g.towerH - 1);
    // stepped taper: width grows in discrete steps per section (key-art look)
    const sect = Math.min(sections - 1, Math.floor(k * sections));
    const kk = (sect + (k * sections - sect) * 0.35) / sections;
    const hw = Math.floor(lerp(g.topW, g.baseW, kk) / 2);
    const y = g.towerY + r;
    const L = cx - hw, Rr = cx + hw;
    const wTot = Rr - L + 1;
    const f1 = L + Math.max(1, R(wTot * 0.26)), f2 = L + Math.max(2, R(wTot * 0.7));
    rect(c, L, y, f1 - L, 1, p.towerMid);
    rect(c, f1, y, f2 - f1, 1, p.towerLit);
    rect(c, f2, y, Rr - f2 + 1, 1, p.towerShade);
    px(c, L, y, p.towerShade);           // left rim
    px(c, Rr, y, p.towerEdge);           // right rim
    px(c, f2, y, p.towerEdge);           // facet seam
    if (wTot > 14) px(c, f1, y, p.towerMid);
    // section seams (slight horizontal course lines)
    const nextSect = Math.min(sections - 1, Math.floor(((r + 1) / Math.max(1, g.towerH - 1)) * sections));
    if (nextSect !== sect && r < g.towerH - 2) {
      rect(c, L + 1, y, f2 - L - 1, 1, p.towerShade);
      rect(c, f2, y, Rr - f2, 1, p.towerEdge);
    }
  }
  // windows: one slit per section, centred, in the lit facet
  const winW = g.u > 0.85 ? 2 : 1, winH = Math.max(2, R(5 * g.u));
  for (let s = 0; s < 4; s++) {
    const wy = g.towerY + R(((s + 0.45) / 4) * g.towerH) - (winH >> 1);
    if (s === 3 && g.u < 0.5) continue;
    rect(c, cx - (winW >> 1), wy, winW, winH, p.towerWin);
    if (tod !== 'night') px(c, cx - (winW >> 1), wy, '#123F42');
  }
  // cornice (wider cap at the top of the tower)
  const ch = g.corniceH;
  rect(c, cx - (g.corniceW >> 1), g.corniceY, g.corniceW, ch, p.towerLit);
  rect(c, cx - (g.corniceW >> 1), g.corniceY + ch - 1, g.corniceW, 1, p.towerShade);
  rect(c, cx + R(g.corniceW * 0.2), g.corniceY, (g.corniceW >> 1) - R(g.corniceW * 0.2) + 1, ch, p.towerShade);
  // gallery: deck + railing
  const gw = g.galleryW, gL = cx - (gw >> 1), gy = g.galleryY, gh = g.galleryH;
  rect(c, gL, gy, gw, 1, p.ironDark);                        // top rail
  rect(c, gL, gy + 1, gw, gh - 2, p.iron);                    // railing body
  for (let x = gL + 1; x < gL + gw - 1; x += 2) vline(c, x, gy + 1, gy + gh - 2, p.ironLight);
  if (gh >= 5) rect(c, gL + 2, gy + 2, gw - 4, 1, RAMP.iron[4]);  // sky reflection on the lantern base glass
  rect(c, gL - 1, gy + gh - 1, gw + 2, 1, p.ironDark);       // deck slab
  // lantern room frame (panes are drawn dynamically)
  const lw = g.lanternW, lL = cx - (lw >> 1);
  rect(c, lL, g.lanternY, lw, g.lanternH, p.iron);
  rect(c, lL, g.lanternY + g.lanternH - 1, lw, 1, p.ironDark);
  rect(c, lL + lw - 1, g.lanternY, 1, g.lanternH, p.ironDark);
  // roof: stepped pyramid with eave
  const rh = g.roofH;
  for (let r = 0; r < rh; r++) {
    const k = r / Math.max(1, rh - 1);
    const hw = Math.max(1, Math.floor(lerp(1.5, g.eaveW / 2, Math.pow(k, 0.85))));
    const y = g.roofY + r;
    rect(c, cx - hw, y, hw * 2 + 1, 1, p.roof);
    rect(c, cx + 1, y, hw, 1, p.roofShade);
    if (hw > 2) rect(c, cx - hw, y, Math.max(1, hw >> 1), 1, p.roofLight);
  }
  rect(c, cx - (g.eaveW >> 1), g.roofY + rh - 1, g.eaveW, 1, p.roofShade); // eave underside
  // finial: vent ball + spike
  const fh = g.finialH;
  vline(c, cx, g.finialY, g.finialY + fh - 1, p.roofShade);
  if (fh >= 3) { rect(c, cx - 1, g.finialY + fh - 3, 3, 2, p.roof); px(c, cx + 1, g.finialY + fh - 2, p.roofShade); }
}

/** Dithered glow disc (pixel-art "light"): level = dither density 0..1. */
export function haloDisc(ctx, cx, cy, r, color, level) {
  if (r <= 0 || level <= 0) return;
  ctx.save();
  ctx.beginPath();
  for (let dy = -r; dy <= r; dy++) {
    const half = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy)));
    ctx.rect(R(cx) - half, R(cy) + dy, half * 2 + 1, 1);
  }
  ctx.clip();
  dither(ctx, R(cx) - r, R(cy) - r, r * 2 + 1, r * 2 + 1, null, color, level);
  ctx.restore();
}

/**
 * Lighthouse beam: a dithered wedge of light from (x, y). angle = rotation around the tower (radians; the on-screen
 * length follows cos(angle) so it sweeps left/right like a real rotating lamp; when it faces the camera it flares).
 * opts: { len, spread (half-angle), tod, strength 0..1, color, twin (also draw the opposite beam, default true) }
 */
export function beam(ctx, x, y, angle, o = {}) {
  const len = o.len ?? 150, strength = clamp(o.strength ?? 1);
  // flat additive bands of light (pixel-art banding, no gradients): outer beam + brighter core near the lamp
  const lv = (v) => '#' + [v, v + 4, v].map((n) => Math.round(n * strength).toString(16).padStart(2, '0')).join('');
  const wedge = (sgn, ll, hw, col) => {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = col;
    ctx.beginPath();
    // pixel-snapped wedge: one rect per column so edges step cleanly
    for (let i = 0; i <= ll; i++) {
      const half = Math.round(0.5 + (hw * i) / ll);
      ctx.rect(R(x + sgn * i), R(y) - half, 1, half * 2 + 1);
    }
    ctx.fill();
    ctx.restore();
  };
  const drawOne = (a) => {
    const dirx = Math.cos(a);
    const facing = Math.sin(a); // >0 = towards camera
    const L = R(len * Math.abs(dirx));
    if (L < 4) return;
    const sgn = dirx > 0 ? 1 : -1;
    const spread = (o.spread ?? 0.07) * (1 + Math.max(0, facing) * 1.2);
    wedge(sgn, L, Math.max(1, L * spread), lv(0x14));
    wedge(sgn, R(L * 0.45), Math.max(1, L * 0.45 * spread * 0.7), lv(0x16));
    wedge(sgn, R(L * 0.15), 1, lv(0x30));
  };
  drawOne(angle);
  if (o.twin !== false) drawOne(angle + Math.PI);
  const face = Math.max(Math.sin(angle), Math.sin(angle + Math.PI));
  if (face > 0.94) haloDisc(ctx, x, y, R(3 + (face - 0.94) * 100), o.color || C.cream, 0.35 * strength);
}

// ---------------------------------------------------------------- keeper's house, seawall, fort wall
/**
 * Keeper's house (cream walls, red roof, dark windows). house(ctx, x, base, { w, h, tod, flip, lit })
 * x = left edge. Returns { x0, x1, top }.
 */
export function house(ctx, x, base, o = {}) {
  const w = R(o.w ?? 25), hh = R(o.h ?? 14), tod = o.tod || 'day';
  const key = `house|${w}|${hh}|${tod}|${o.lit ? 1 : 0}`;
  const cvs = cached(key, w + 2, hh + 1, (c) => {
    const p = pal(tod);
    const roofH = Math.max(3, R(hh * 0.32));
    const wallY = roofH;
    rect(c, 1, wallY, w - 1, hh - roofH, p.wall);
    rect(c, w - R(w * 0.35), wallY, R(w * 0.35), hh - roofH, p.wallShade);   // shaded right wing
    vline(c, w - R(w * 0.35), wallY, hh - 1, RAMP.house[0]);
    // roof: overhanging slab with a lighter ridge row
    rect(c, 0, 0, w + 1, roofH, p.houseRoof);
    rect(c, 2, 0, w - 3, 1, p.houseRoofLight);
    rect(c, 0, roofH - 1, w + 1, 1, RAMP.roof[0]);
    // windows + door
    const win = o.lit ? C.gold : p.win;
    const wy = wallY + 2;
    rect(c, 4, wy, 3, Math.max(2, hh - roofH - 5), win);
    rect(c, 10, wy, 2, Math.max(2, hh - roofH - 3), RAMP.house[0]);           // door
    rect(c, w - R(w * 0.35) + 3, wy, 3, Math.max(2, hh - roofH - 5), win);
    if (!o.lit) { px(c, 4, wy, '#1B4A4C'); px(c, w - R(w * 0.35) + 3, wy, '#1B4A4C'); }
  });
  if (o.flip) drawSprite(ctx, { w: w + 2, h: hh + 1, canvas: cvs }, x, base - hh - 1, { flipX: true });
  else ctx.drawImage(cvs, R(x), R(base) - hh - 1);
  return { x0: x, x1: x + w, top: base - hh };
}

/**
 * Stone seawall / rocks at the waterline. seawall(ctx, x, y, w, h, { tod, seed }) (x, y = top-left).
 * Blocks with lit top edges and dark mortar, foam-free (put water() below it).
 */
export function seawall(ctx, x, y, w, h, o = {}) {
  const tod = o.tod || 'day', seed = o.seed ?? 5;
  const cvs = cached(`wall|${w}|${h}|${tod}|${seed}`, w, h, (c) => {
    const s = pal(tod).stone;
    rect(c, 0, 0, w, h, s[1]);
    let row = 0;
    for (let yy = 0; yy < h; yy += 3, row++) {
      let xx = -R(hash(row, 1, seed) * 6);
      let i = 0;
      while (xx < w) {
        const bw = 4 + R(hash(row * 17 + i, 2, seed) * 7);
        const tone = hash(row * 17 + i, 3, seed);
        const face = tone < 0.45 ? s[2] : tone < 0.8 ? s[3] : s[4];
        rect(c, xx + 1, yy + 1, bw - 1, 2, face);
        rect(c, xx + 1, yy, bw - 1, 1, tone < 0.5 ? s[4] : s[5]);          // lit top edge
        if (hash(row * 17 + i, 4, seed) < 0.3) rect(c, xx + 2, yy + 1, 2, 1, s[1]); // pits
        xx += bw; i++;
      }
    }
    rect(c, 0, h - 1, w, 1, s[0]);
  });
  ctx.drawImage(cvs, R(x), R(y));
}

/** Stepped sandstone fort wall (left of the lighthouse in the key art). fortWall(ctx, x, base, { w, h, tod }) */
export function fortWall(ctx, x, base, o = {}) {
  const w = R(o.w ?? 18), h = R(o.h ?? 13), tod = o.tod || 'day';
  const cvs = cached(`fort|${w}|${h}|${tod}`, w, h, (c) => {
    const s = pal(tod).stone;
    const backW = R(w * 0.72), frontX = R(w * 0.42), frontY = R(h * 0.38);
    // back tier
    rect(c, 0, 0, backW, h, s[5]);
    rect(c, 0, 0, backW, 1, '#F2E3CB');
    rect(c, 0, 1, 1, h - 1, s[4]);
    rect(c, backW - 1, 1, 1, h - 1, s[3]);
    // front (lower) tier
    rect(c, frontX, frontY, w - frontX, h - frontY, s[4]);
    rect(c, frontX, frontY, w - frontX, 1, s[5]);
    rect(c, w - 1, frontY + 1, 1, h - frontY - 1, s[2]);
    // weathered grey stones on the lower half
    for (let yy = R(h * 0.45); yy < h - 1; yy += 2) {
      for (let xx = (yy >> 1) % 3; xx < w - 1; xx += 3 + R(hash(xx, yy, 3) * 3)) {
        if (hash(xx, yy, 9) < 0.55) rect(c, xx, yy, 2, 1, hash(xx, yy, 4) < 0.5 ? s[2] : s[3]);
      }
    }
    rect(c, 0, h - 1, w, 1, s[1]);
  });
  ctx.drawImage(cvs, R(x), R(base) - h);
}

// ---------------------------------------------------------------- foliage
function blobMask(w, h, seed, lobes) {
  const r = rng(seed);
  const m = new Uint8Array(w * h);
  const ells = [];
  for (let i = 0; i < lobes; i++) {
    const ex = r.range(w * 0.22, w * 0.78), ey = r.range(h * 0.3, h * 0.75);
    const rx = r.range(w * 0.22, w * 0.42), ry = r.range(h * 0.3, h * 0.5);
    ells.push([ex, ey, rx, ry]);
  }
  ells.push([w / 2, h * 0.68, w * 0.48, h * 0.34]);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    for (const [ex, ey, rx, ry] of ells) {
      const dx = (x + 0.5 - ex) / rx, dy = (y + 0.5 - ey) / ry;
      if (dx * dx + dy * dy <= 1) { m[y * w + x] = 1; break; }
    }
  }
  return m;
}
function paintFoliage(c, w, h, seed, leaf, { lobes = 5 } = {}) {
  // key-art foliage: dark teal-green mass, bright clumps on the upper-left, clean stepped silhouette
  const m = blobMask(w, h, seed, lobes);
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : m[y * w + x]);
  const put = (x, y, col) => { if (at(x, y)) { c.fillStyle = col; c.fillRect(x, y, 1, 1); } };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!at(x, y)) continue;
    const v = y / h;
    put(x, y, v > 0.8 ? leaf[0] : v > 0.55 ? leaf[1] : leaf[2]);
  }
  const r = rng(seed * 13 + 5);
  const n = Math.max(3, Math.round((w * h) / 22));
  for (let i = 0; i < n; i++) {
    const cx = r.range(-1, w * 0.95), cy = r.range(-1, h * 0.7);
    const rad = r.pick([1, 2, 2, 3]);
    const top = cy / h < 0.35;
    const base = top && r.chance(0.6) ? leaf[4] : leaf[3];
    for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
      if (dx * dx + dy * dy > rad * rad + rad * 0.6) continue;
      const X = R(cx + dx), Y = R(cy + dy);
      const lit = dx + dy < -rad * 0.6;
      const dark = dx + dy > rad * 0.9;
      put(X, Y, lit ? (top ? leaf[5] : leaf[4]) : dark ? leaf[2] : base);
    }
  }
  // rim light on the upper-left silhouette, deep shadow along the bottom
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!at(x, y)) continue;
    if ((!at(x - 1, y) || !at(x, y - 1)) && y / h < 0.5 && hash(x >> 1, y >> 1, seed) < 0.7) put(x, y, leaf[4]);
    if (!at(x, y + 1) || (!at(x + 1, y) && y / h > 0.5)) put(x, y, leaf[0]);
  }
}
/** Rounded pixel bush. bush(ctx, cx, base, { w, h, seed, tod }) -> drawn centred on cx, sitting on base. */
export function bush(ctx, cx, base, o = {}) {
  const w = R(o.w ?? 16), h = R(o.h ?? 9), seed = o.seed ?? 1, tod = o.tod || 'day';
  const cvs = cached(`bush|${w}|${h}|${seed}|${tod}`, w, h, (c) => paintFoliage(c, w, h, seed, pal(tod).leaf, { lobes: 4 }));
  ctx.drawImage(cvs, R(cx) - (w >> 1), R(base) - h);
}
/** Leafy tree (trunk + clumpy canopy). tree(ctx, cx, base, { w, h, seed, tod, trunk }) */
export function tree(ctx, cx, base, o = {}) {
  const w = R(o.w ?? 26), h = R(o.h ?? 34), seed = o.seed ?? 2, tod = o.tod || 'day';
  const cvs = cached(`tree|${w}|${h}|${seed}|${tod}`, w, h, (c) => {
    const p = pal(tod);
    const trunkH = R(h * 0.3), canopyH = h - trunkH + 3;
    rect(c, (w >> 1) - 1, h - trunkH, 3, trunkH, tod === 'night' ? '#2A2622' : '#4A3B2C');
    px(c, (w >> 1) + 1, h - trunkH + 1, '#2E241B');
    paintFoliage(c, w, canopyH, seed, p.leaf, { lobes: 6, clump: 2 });
  });
  ctx.drawImage(cvs, R(cx) - (w >> 1), R(base) - h);
}
/** Grass strip with a few lighter tufts. grass(ctx, x, y, w, h, { tod, seed }) */
export function grass(ctx, x, y, w, h, o = {}) {
  const leaf = pal(o.tod).leaf, seed = o.seed ?? 4;
  rect(ctx, x, y, w, h, leaf[3]);
  rect(ctx, x, y + h - 1, w, 1, leaf[2]);
  for (let i = 0; i < w; i++) {
    const v = hash(i, 1, seed);
    if (v > 0.55) px(ctx, x + i, y, leaf[4]);
    if (v > 0.85) px(ctx, x + i, y - 1, leaf[5]);
    if (v < 0.15) px(ctx, x + i, y + 1, leaf[2]);
  }
}

// ---------------------------------------------------------------- headland composite (the key-art vignette)
/**
 * The whole key-art headland: lighthouse + keeper's house + trees + bushes + fort wall + grass + seawall.
 * headland(ctx, x, base, { t, tod, h (lighthouse height, default 104), glow, beam, beamAngle, flare, scale })
 *   x = lighthouse centre, base = ground row under the lighthouse. Seawall/rocks extend ~12 px below base;
 *   draw water() starting at about base + 9 BEFORE calling this, so the wall sits on the water.
 *   Footprint: x - 55 ... x + 64 (16:9 key-art layout puts x = 258, base = 124).
 * Returns the lighthouse anchors plus { waterY } (suggested water top).
 */
export function headland(ctx, x, base, o = {}) {
  const tod = o.tod || 'day', t = o.t ?? 0;
  const s = (o.h ?? 104) / 104;           // everything scales with the lighthouse
  const X = (v) => R(x + v * s), Y = (v) => R(base + v * s);
  const p = pal(tod);
  // back trees (right) and a far tree left of the lighthouse
  tree(ctx, X(46), Y(6), { w: R(34 * s), h: R(44 * s), seed: 21, tod });
  tree(ctx, X(30), Y(4), { w: R(24 * s), h: R(30 * s), seed: 22, tod });
  tree(ctx, X(-24), Y(3), { w: R(18 * s), h: R(20 * s), seed: 23, tod });
  // ground mound
  const leaf = p.leaf;
  poly(ctx, [[X(-50), Y(10)], [X(-36), Y(-3)], [X(70), Y(-6)], [X(70), Y(10)]], leaf[1]);
  grass(ctx, X(-34), Y(-4), R(104 * s), Math.max(2, R(4 * s)), { tod, seed: 9 });
  // fort wall (left) + bushes in front of it
  fortWall(ctx, X(-46), Y(4), { w: R(20 * s), h: R(15 * s), tod });
  // keeper's house (right)
  house(ctx, X(16), Y(-1), { w: R(26 * s), h: R(15 * s), tod, lit: tod === 'night' || tod === 'dusk' });
  // lighthouse
  const a = lighthouse(ctx, x, Y(1), { ...o, h: R(104 * s), tod, t });
  // front bushes along the base
  bush(ctx, X(-14), Y(4), { w: R(18 * s), h: R(9 * s), seed: 31, tod });
  bush(ctx, X(12), Y(4), { w: R(16 * s), h: R(8 * s), seed: 32, tod });
  bush(ctx, X(-30), Y(5), { w: R(14 * s), h: R(7 * s), seed: 33, tod });
  bush(ctx, X(38), Y(4), { w: R(22 * s), h: R(8 * s), seed: 34, tod });
  bush(ctx, X(60), Y(4), { w: R(16 * s), h: R(9 * s), seed: 35, tod });
  bush(ctx, X(1), Y(5), { w: R(12 * s), h: R(6 * s), seed: 36, tod });
  // seawall + rocks at the waterline
  seawall(ctx, X(-56), Y(4), R(130 * s), Math.max(4, R(9 * s)), { tod, seed: 7 });
  seawall(ctx, X(-40), Y(12), R(40 * s), Math.max(3, R(5 * s)), { tod, seed: 8 });
  return { ...a, waterY: Y(10) };
}

// ---------------------------------------------------------------- clouds, gulls, sun, moon, leaves, sparkles
const CLOUDS = {
  // key-art clouds: stair-stepped mounds with flat bottoms. c = cream top, b = sky blue, d = blue shadow
  big: [
    '..........bbbbbb..........', '..........bbbbbb..........', '......bbbbbbbbbbbbbb......', '......bbbbbbbbbbbbbb......',
    '...bbbbbbbbbbbbbbbbbbbbbb.', '...bbbbbbbbbbbbbbbbbbbbbb.', 'bbbbbbbbbbbbbbbbbbbbbbbbbbbb', 'dddddddddddddddddddddddddddd'],
  twoTone: [
    '......cccc.............', '......cccc.............', '...cccccccccc..........', '...cccccccccc...bbb....',
    'ccccccccccccccbbbbbbb..', 'ccccccccccccccbbbbbbbbb', '........bbbbbbbbbbbbbbbbb'],
  small: ['....cccc....', '..cccccccc..', 'cccccccccbbbbb', '.....bbbbbbbbb'],
  wisp: ['...bbbbbb.......', 'bbbbbbbbbbbbbbbb'],
};
/**
 * Pixel cloud (key-art shapes). cloud(ctx, x, y, { kind: 'big'|'twoTone'|'small'|'wisp', tod, scale, flip })
 * x, y = top-left. Clouds should drift slowly: x = x0 + floor(onTwos(t) * 2).
 */
export function cloud(ctx, x, y, o = {}) {
  const kind = o.kind || 'twoTone', tod = o.tod || 'day';
  const p = pal(tod).cloud;
  const key = kind + tod;
  if (!cloudSprites[key]) cloudSprites[key] = sprite(CLOUDS[kind], { c: tod === 'night' ? p[2] : RAMP.cloud[3], b: tod === 'night' ? p[1] : RAMP.cloud[1], d: tod === 'night' ? p[0] : RAMP.cloud[0] });
  drawSprite(ctx, cloudSprites[key], x, y, { scale: o.scale || 1, flipX: o.flip });
}
const cloudSprites = {};

const GULL = [
  ['#.....#', '.#...#.', '..#.#..', '...#...'],   // wings up (the key-art V)
  ['.......', '##...##', '..#.#..', '...#...'],   // glide
  ['.......', '.......', '###.###', '...#...'],   // wings level
  ['.......', '.......', '.##.##.', '#..#..#'],   // wings down
];
const gullSprites = {};
/**
 * V-shaped gull, flapping (4-frame cycle on twos). gull(ctx, x, y, t, { tod, rate (flaps/s), phase, flip })
 * x, y = centre-ish. Animate position yourself (gulls glide: x += t * speed, y bobs with the flap).
 */
export function gull(ctx, x, y, t, o = {}) {
  const tod = o.tod || 'day';
  const col = o.color || pal(tod).gull;
  const key = col;
  if (!gullSprites[key]) gullSprites[key] = GULL.map((rows) => sprite(rows, { '#': col }));
  const rate = o.rate ?? 1.6;
  const seq = [0, 0, 1, 2, 3, 2, 1, 0];
  const f = seq[frameIndex(t + (o.phase || 0) / rate, rate * seq.length, seq.length)];
  drawSprite(ctx, gullSprites[key][f], R(x) - 3, R(y) - 2, { flipX: o.flip, scale: o.scale || 1 });
}

/** Pixel sun (gold disc, light core, optional rotating rays on twos). sun(ctx, x, y, r, { t, rays }) */
export function sun(ctx, x, y, r, o = {}) {
  const t = o.t ?? 0;
  if (o.rays !== false) {
    const n = 8, a0 = onTwos(t) * 0.5;
    for (let i = 0; i < n; i++) {
      const a = a0 + (i / n) * Math.PI * 2;
      const r0 = r + 2, r1 = r + 3 + (i % 2 ? 2 : 4);
      line(ctx, x + Math.cos(a) * r0, y + Math.sin(a) * r0, x + Math.cos(a) * r1, y + Math.sin(a) * r1, C.gold);
    }
  }
  haloDisc(ctx, x, y, r + 2, C.gold, 0.3);
  disc(ctx, x, y, r, C.gold);
  disc(ctx, x - (r >> 2), y - (r >> 2), Math.max(1, R(r * 0.55)), '#F8CC87');
  if (r > 4) disc(ctx, x - (r >> 1) + 1, y - (r >> 1) + 1, Math.max(1, R(r * 0.18)), '#FFF1C9');
}
/** Pixel moon. moon(ctx, x, y, r, { phase: 0 (full) .. 1 (thin crescent), halo: false }). Crescent is cut per pixel (no sky paint). */
export function moon(ctx, x, y, r, o = {}) {
  x = R(x); y = R(y); r = Math.max(1, R(r));
  const ph = clamp(o.phase ?? 0);
  if (o.halo) haloDisc(ctx, x, y, r + 3, '#B9D5DC', 0.08);
  const cut = ph > 0 ? { x: x + R(r * 2.1 * (1 - ph)) + 1, y: y - R(r * 0.25), r } : null;
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (dx * dx + dy * dy > r * r + r * 0.8) continue;
    if (cut) { const ex = x + dx - cut.x, ey = y + dy - cut.y; if (ex * ex + ey * ey <= cut.r * cut.r + cut.r * 0.8) continue; }
    const shade = dx + dy > r * 0.6 ? '#C9D1C6' : (dx === -1 && dy === r >> 1) || (dx === (r >> 1) && dy === -(r >> 2)) ? '#C9D1C6' : dx + dy < -r * 0.7 ? '#FFFFFF' : C.cream;
    px(ctx, x + dx, y + dy, shade === '#FFFFFF' ? C.cream : shade);
  }
}

/**
 * Falling autumn leaves (coral/gold/rust), deterministic loop. leaves(ctx, t, { x, y, w, h, count, seed, wind, speed })
 */
export function leaves(ctx, t, o = {}) {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  const x = o.x ?? 0, y = o.y ?? -10, w = o.w ?? W, h = o.h ?? H + 20;
  const n = o.count ?? 14, seed = o.seed ?? 17, wind = o.wind ?? 6, speed = o.speed ?? 14;
  const cols = [RAMP.autumn[1], RAMP.autumn[2], RAMP.autumn[3], RAMP.autumn[4], C.gold];
  const tq = onTwos(t);
  for (let i = 0; i < n; i++) {
    const sp = speed * (0.7 + hash(i, 1, seed) * 0.6);
    const period = h / sp;
    const tt = mod(tq + hash(i, 2, seed) * period, period);
    const ly = y + tt * sp;
    const lx = x + mod(hash(i, 3, seed) * w + tt * wind + Math.sin(tt * 2.2 + i) * 5, w);
    const col = cols[Math.floor(hash(i, 4, seed) * cols.length)];
    const f = frameIndex(tt + i, 4, 4);
    const X = R(lx), Y = R(ly);
    if (f === 0) { rect(ctx, X, Y, 2, 1, col); px(ctx, X + 1, Y - 1, col); }
    else if (f === 1) { rect(ctx, X, Y, 1, 2, col); px(ctx, X + 1, Y, col); }
    else if (f === 2) { rect(ctx, X, Y, 2, 1, col); px(ctx, X, Y + 1, col); }
    else { px(ctx, X, Y, col); px(ctx, X + 1, Y + 1, col); }
  }
}

/**
 * 4-point pixel sparkle that pops and fades over `dur` seconds after t0 (beat accents).
 * sparkle(ctx, x, y, t, t0, { color, size: 1..3, dur })
 */
export function sparkle(ctx, x, y, t, t0, o = {}) {
  const dur = o.dur ?? 0.35;
  if (t < t0 || t > t0 + dur) return;
  const k = (t - t0) / dur, size = o.size ?? 2, col = o.color || C.gold;
  const arm = k < 0.25 ? 1 : k < 0.6 ? size + 1 : 1;
  px(ctx, x, y, k < 0.8 ? C.cream : col);
  for (let i = 1; i <= arm; i++) {
    const c = i === arm ? col : C.cream;
    px(ctx, x - i, y, c); px(ctx, x + i, y, c); px(ctx, x, y - i, c); px(ctx, x, y + i, c);
  }
  if (k > 0.25 && k < 0.6 && size > 1) { px(ctx, x - 1, y - 1, col); px(ctx, x + 1, y - 1, col); px(ctx, x - 1, y + 1, col); px(ctx, x + 1, y + 1, col); }
}
/** Gold plus sparkle on the pixel layer (key-art motif), static. plusPx(ctx, x, y, { color, arm }) */
export function plusPx(ctx, x, y, o = {}) {
  const a = o.arm ?? 1, col = o.color || C.gold;
  rect(ctx, x - a, y, a * 2 + 1, 1, col);
  rect(ctx, x, y - a, 1, a * 2 + 1, col);
}

/**
 * Pixel dust / firework burst: particles radiate from (x, y) and fall. k = seconds since the burst.
 * burst(ctx, x, y, k, { n, speed, gravity, colors, seed, life })
 */
export function burst(ctx, x, y, k, o = {}) {
  const life = o.life ?? 0.8;
  if (k < 0 || k > life) return;
  const n = o.n ?? 18, sp = o.speed ?? 40, gr = o.gravity ?? 50, seed = o.seed ?? 1;
  const cols = o.colors || [C.cream, C.gold, C.coral, C.sky];
  const kq = onTwos(k);
  for (let i = 0; i < n; i++) {
    const a = hash(i, 1, seed) * Math.PI * 2, v = sp * (0.4 + hash(i, 2, seed) * 0.6);
    const px_ = x + Math.cos(a) * v * kq, py_ = y + Math.sin(a) * v * kq + 0.5 * gr * kq * kq;
    const fade = kq / life;
    if (hash(i, 3, seed) < fade * 0.8) continue;
    const col = cols[i % cols.length];
    rect(ctx, R(px_), R(py_), fade < 0.4 ? 2 : 1, fade < 0.4 ? 2 : 1, col);
  }
}

/** Small pumpkin (October touch). pumpkin(ctx, x, base, { size: 1|2 }) x = centre. */
export function pumpkin(ctx, x, base, o = {}) {
  const s = o.size ?? 1;
  const rows = s > 1
    ? ['....gg....', '...g......', '.oOOooOOo.', 'oOOooooOOo', 'oOooooooOo', 'oOooooooOo', '.oOOooOOo.', '..oooooo..']
    : ['..g...', '.oOoo.', 'oOooOo', 'oOooOo', '.oooo.'];
  const key = 'pumpkin' + s;
  if (!cloudSprites[key]) cloudSprites[key] = sprite(rows, { g: RAMP.foliage[3], o: '#E0874A', O: '#C8613F' });
  drawSprite(ctx, cloudSprites[key], x, base, { anchor: 'bc' });
}

// ---------------------------------------------------------------- people
// 9x16 chibi builders. Letters: h hair, s skin, k skin shade, e eye, t top, T top shade, p pants, o shoes, l laptop
const BODY = {
  stand: [
    '.........', '...hhh...', '..hhhhh..', '..hsssh..', '..sesesk.', '..sssss..', '...kkk...', '..ttttt..',
    '.tttttTT.', '.stttTTs.', '.s.tttT.k', '...tttT..', '...pp.p..', '...pp.p..', '...pp.p..', '..oo..oo.',
  ],
  walk1: [
    '.........', '...hhh...', '..hhhhh..', '..hsssh..', '..sesesk.', '..sssss..', '...kkk...', '..ttttt..',
    '.tttttTT.', 'stttttTs.', '...tttT.k', '...tttT..', '...pp.p..', '..pp...p.', '..p....p.', '.oo....oo',
  ],
  walk2: [
    '.........', '...hhh...', '..hhhhh..', '..hsssh..', '..sesesk.', '..sssss..', '...kkk...', '..ttttt..',
    '.tttttTT.', '.stttTTs.', '.k.tttTs.', '...tttT..', '...ppp...', '...p.p...', '...p.p...', '..oo.oo..',
  ],
  wave: [
    '........s', '...hhh..s', '..hhhhh.s', '..hsssh.t', '..sesesk.', '..sssss.t', '...kkk..t', '..ttttttT',
    '.tttttT..', '.stttTT..', '.s.tttT..', '...tttT..', '...pp.p..', '...pp.p..', '...pp.p..', '..oo..oo.',
  ],
  cheer: [
    's.......s', 's..hhh..s', 't.hhhhh.t', 't.hsssh.t', 'tTsesesTt', '.ttsssttT', '..tkkktT.', '..ttttt..',
    '..ttttT..', '...tttT..', '...tttT..', '...tttT..', '...pp.p..', '...pp.p..', '...pp.p..', '..oo..oo.',
  ],
  type: [
    '.........', '...hhh...', '..hhhhh..', '..hsssh..', '..sesesk.', '..sssss..', '...kkk...', '..ttttt..',
    '.tttttTT.', '.tttttTT.', '.ttsssss.', '.tttTTTll', '..pppppll', '..pp.ppll', '..pp..p..', '..oo..oo.',
  ],
};
const HAIR = {
  short: (rows) => rows,
  long: (rows) => rows.map((r, i) => (i >= 3 && i <= 8 ? 'h' + r.slice(1, 8).replace(/^\./, 'h') + (r[8] === '.' ? '.' : r[8]) : r)),
  bun: (rows) => rows.map((r, i) => (i === 0 ? '...hh....' : r)),
  curly: (rows) => rows.map((r, i) => (i === 1 ? '..hhhhh..' : i === 2 ? '.hhhhhhh.' : i === 3 ? '.hhsssh..' : r)),
  cap: (rows) => rows.map((r, i) => (i === 1 ? '..ccccc..' : i === 2 ? '..cccccc.' : r)),
  bald: (rows) => rows.map((r, i) => (i === 1 ? '...sss...' : i === 2 ? '..sssss..' : i === 3 ? '..ssssk..' : r)),
};
const personCache = new Map();
/**
 * Pixel person (9x16). person(ctx, x, base, { t, pose: 'stand'|'walk'|'wave'|'cheer'|'type', skin (0-5), hair (0-5 index
 * into RAMP.hair), style: 'short'|'long'|'bun'|'curly'|'cap'|'bald', top (color), pants (color), flip, seed })
 * x = centre, base = ground row. Use `seed` to get a random-but-stable look: person(ctx, x, y, { seed: 3 }).
 * walk/cheer/wave animate on twos from t.
 */
export function person(ctx, x, base, o = {}) {
  const r = rng(o.seed ?? 1);
  const skin = RAMP.skin[o.skin ?? r.int(0, 5)];
  const hairC = RAMP.hair[o.hair ?? r.int(0, 5)];
  const style = o.style || r.pick(['short', 'long', 'bun', 'curly', 'cap', 'short']);
  const top = o.top || r.pick([C.coral, C.sky, C.gold, C.cream, '#5D8B3B', '#3F8ABD']);
  const pants = o.pants || r.pick(['#173B38', '#2B3A4A', '#4A3B2C', '#214D49']);
  const t = o.t ?? 0;
  let pose = o.pose || 'stand';
  if (pose === 'walk') pose = frameIndex(t, 6, 2) ? 'walk1' : 'walk2';
  if (pose === 'cheer' && frameIndex(t, 4, 2)) pose = 'stand';
  const key = [pose, skin[1], hairC, style, top, pants].join('|');
  let spr = personCache.get(key);
  if (!spr) {
    const rows = (HAIR[style] || HAIR.short)(BODY[pose] || BODY.stand);
    spr = sprite(rows, {
      h: hairC, s: skin[1], k: skin[0], e: '#173B38', t: top, T: shade(top), p: pants, o: '#0F2B2A', c: o.capColor || C.coral,
      l: '#9A9787',
    });
    personCache.set(key, spr);
  }
  drawSprite(ctx, spr, x, base, { anchor: 'bc', flipX: o.flip });
  return spr;
}
function shade(hex) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.round(v * 0.72));
  return '#' + [f((n >> 16) & 255), f((n >> 8) & 255), f(n & 255)].map((v) => v.toString(16).padStart(2, '0')).join('');
}
