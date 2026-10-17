// scenes/_D-kit.js (owner D): helpers for the chorus scenes (C12-C16, variant 2 = C26-C30).
// Timing on chorus cues (ch.N / ch2.N), a pixel rocket + exhaust, smoke puffs, giant pixel braces, dithered light rays,
// fireworks, a Hampton waterfront skyline with windows that light up, a cratered moon, an earth limb.
// Everything is deterministic: a frame depends only on its arguments.
import { C, RAMP } from '../lib/palette.js';
import { clamp, lerp, ease, onTwos, hash, rng } from '../lib/motion.js';
import { makeCanvas, rect, px, hline, vline, dither, disc, sprite, drawSprite, line } from '../lib/pixel.js';
import { cached, haloDisc, burst } from '../lib/world.js';

const R = Math.round;

// ------------------------------------------------------------------ timing
/** Chorus cue N (works for chorus 1 'ch.N' and chorus 2 'ch2.N'). */
export function chLine(c, n) {
  return (c.lines && (c.lines[`ch.${n}`] || c.lines[`ch2.${n}`])) || null;
}
/** Chorus hits for cue N ('Hey!' on 1/5, title on 2/6, fork/train/ship/show on 7). */
export function chHits(c, n) {
  return (c.hits && (c.hits[`ch.${n}`] || c.hits[`ch2.${n}`])) || [];
}
/** Typical beat length of this clip. */
export function beatLen(c) {
  const B = c.beats;
  if (!B || B.length < 2) return 0.6;
  const i = Math.max(1, B.findIndex((b) => b >= 0));
  return B[i] - B[i - 1] || 0.6;
}
/** n-th beat at/after time t0 (extrapolates past the list). */
export function beatAfter(c, t0, n = 0) {
  const B = c.beats, L = beatLen(c);
  if (!B || !B.length) return t0 + n * L;
  let i = B.findIndex((b) => b >= t0 - 0.03);
  if (i < 0) return B[B.length - 1] + (n + 1) * L;
  const j = i + n;
  return j < B.length ? B[j] : B[B.length - 1] + (j - B.length + 1) * L;
}
/** Beat times inside [a, b). */
export function beatsIn(c, a, b) {
  return (c.beats || []).filter((x) => x >= a - 1e-3 && x < b - 1e-3);
}
/** Index of the last time <= t (-1 if none). */
export function passed(times, t) {
  let k = -1;
  for (let i = 0; i < times.length; i++) if (times[i] <= t + 1e-6) k = i;
  return k;
}

// ------------------------------------------------------------------ rocket
// Vertical pixel rocket (nose up), 11 x 23. Light from the upper-left like the lighthouse:
// L lit cream, M body cream, S shade, a coral lit, b coral shade, w porthole ring, g glass, h glass glint, n nozzle.
const ROCKET = [
  '.....a.....',
  '....aab....',
  '....aab....',
  '...aaabb...',
  '...aaabb...',
  '..aaaabbb..',
  '..LLMMMMS..',
  '..LMMMMMS..',
  '..LMwwwMS..',
  '..LwghgwS..',
  '..LwgggwS..',
  '..LMwwwMS..',
  '..LMMMMMS..',
  '..LMMMMMS..',
  '..aaaabbb..',
  '..LMMMMMS..',
  '..LMMMMMS..',
  '.aLMMMMMSb.',
  'aaLMMMMMSbb',
  'aaLMMMMMSbb',
  'ab.nnnnn.bb',
  '....nnn....',
];
const ROCKET_MAP = {
  L: '#FDF7EA', M: '#F2EADA', S: '#B9B19C', a: '#F07770', b: '#AD5E52',
  w: '#063849', g: '#3F8ABD', h: '#C1E2F2', n: '#5E665A',
};
const ROCKET_NIGHT = { ...ROCKET_MAP, L: '#E6D9C1', M: '#C9D1C6', S: '#8A9A92', a: '#D06A62', b: '#8F4F47', g: '#F5C04A', h: '#FFF1C9' };
let rocketSpr = null, rocketNight = null, rocketOutlined = null;
export const ROCKET_W = 11, ROCKET_H = ROCKET.length;
/**
 * Draw the rocket. (x, y) = centre column, top row (nose tip). opts: { t, flame 0..1.5, night, outline (ink outline
 * for crossing bright things like the moon) }. Returns { x0, y0, x1, y1, nozzleY }.
 */
export function rocket(ctx, x, y, o = {}) {
  if (!rocketSpr) {
    rocketSpr = sprite(ROCKET, ROCKET_MAP);
    rocketNight = sprite(ROCKET, ROCKET_NIGHT);
    const rows = ROCKET.map((r) => '.' + r + '.');
    rows.unshift('.'.repeat(13)); rows.push('.'.repeat(13));
    // 1px ink outline sprite (built by hand from the mask so the outline hugs the silhouette)
    const out = rows.map((r, yy) => [...r].map((ch, xx) => {
      if (ch !== '.') return ch;
      const n = (dx, dy) => (rows[yy + dy] && rows[yy + dy][xx + dx] && rows[yy + dy][xx + dx] !== '.');
      return n(1, 0) || n(-1, 0) || n(0, 1) || n(0, -1) ? 'o' : '.';
    }).join(''));
    rocketOutlined = sprite(out, { ...ROCKET_MAP, o: RAMP.ink[1] });
  }
  const X = R(x), Y = R(y);
  const fl = o.flame ?? 1;
  if (fl > 0) flame(ctx, X, Y + ROCKET_H - 1, o.t ?? 0, fl, o.seed ?? 3);
  if (o.outline) drawSprite(ctx, rocketOutlined, X - 6, Y - 1);
  else drawSprite(ctx, o.night ? rocketNight : rocketSpr, X - 5, Y);
  return { x0: X - 5, y0: Y, x1: X + 6, y1: Y + ROCKET_H, nozzleY: Y + ROCKET_H };
}
/** Rocket flame below a nozzle at (x, y): cream core, gold body, coral edges; flickers on twos. power 0..1.5 */
export function flame(ctx, x, y, t, power = 1, seed = 3) {
  const f = Math.floor(onTwos(t) * 15);
  const L = Math.max(2, R(5 + 7 * power + (hash(f, 1, seed) * 3 - 1) * (0.5 + power)));
  for (let r = 0; r < L; r++) {
    const k = r / L;
    const half = Math.max(0, R((1 - k * k) * (2 + power * 0.8) + (hash(f, r, seed + 9) < 0.3 ? 1 : 0) - (r === 0 ? 0 : 0.2)));
    const yy = y + r;
    if (half >= 2) rect(ctx, x - half, yy, half * 2 + 1, 1, C.coral);
    if (half >= 1) rect(ctx, x - Math.max(0, half - 1), yy, Math.max(1, half * 2 - 1), 1, C.gold);
    if (k < 0.45) rect(ctx, x - (k < 0.2 && half > 1 ? 1 : 0), yy, k < 0.2 && half > 1 ? 3 : 1, 1, '#FFF1C9');
    if (half === 0) px(ctx, x, yy, k > 0.8 ? C.coral : C.gold);
  }
  // sparks
  for (let i = 0; i < 3; i++) {
    const sx = x + R((hash(f, i, seed + 3) - 0.5) * 6), sy = y + L + R(hash(f, i + 7, seed) * 4);
    if (hash(f, i + 11, seed) < 0.6) px(ctx, sx, sy, i % 2 ? C.gold : C.coral);
  }
}

// ------------------------------------------------------------------ smoke
export const SMOKE_DAY = { shade: '#B9D5DC', body: '#F9EDD8', lit: '#FBF4E4' };
export const SMOKE_NIGHT = { shade: '#2F5F6E', body: '#4D7F95', lit: '#79AED3' };
/** One smoke puff: shaded disc (lit upper-left). level < 1 dissolves it with an ordered dither. */
export function puff(ctx, x, y, r, level = 1, pal = SMOKE_DAY) {
  drawPuffs(ctx, [{ x, y, r, level, pal }]);
}
/**
 * Draw many puffs as ONE billowing mass: all shade discs first (offset down-right), then all bodies, then the lit
 * cores, so overlapping puffs merge into a single silhouette. p = [{x, y, r, level (0..1), pal}]
 */
export function drawPuffs(ctx, list) {
  const solid = [], soft = [];
  for (const p of list) {
    if (p.level <= 0.04 || p.r < 0.5) continue;
    const q = { x: R(p.x), y: R(p.y), r: Math.max(1, R(p.r)), level: p.level, pal: p.pal || SMOKE_DAY };
    (p.level >= 0.97 ? solid : soft).push(q);
  }
  for (const q of soft) { haloDisc(ctx, q.x + 1, q.y + 1, q.r, q.pal.shade, q.level * 0.9); haloDisc(ctx, q.x, q.y, q.r, q.pal.body, q.level); }
  for (const q of solid) { const o = q.r > 2 ? 1 : 0; disc(ctx, q.x + o, q.y + o, q.r, q.pal.shade); }
  for (const q of solid) disc(ctx, q.x, q.y, q.r, q.pal.body);
  for (const q of solid) if (q.r >= 3) disc(ctx, q.x - R(q.r * 0.3), q.y - R(q.r * 0.3), Math.max(1, R(q.r * 0.45)), q.pal.lit);
}

/** Launch tower (iron lattice) with a top beacon. (x, top, base) = left column x, top row, bottom row. */
export function gantry(ctx, x, top, base, o = {}) {
  const dark = o.night ? '#03202C' : '#063849', mid = o.night ? '#063849' : '#0D4458', lit = o.night ? '#1D5568' : '#286A7E';
  vline(ctx, x, top, base, lit);
  vline(ctx, x + 3, top, base, dark);
  for (let y = top + 2; y < base; y += 4) { line(ctx, x, y, x + 3, y + 3, mid); hline(ctx, x, x + 3, y, mid); }
  rect(ctx, x - 1, top - 1, 6, 2, dark);
  rect(ctx, x + 1, top - 3, 2, 2, o.beacon ? C.coral : RAMP.roof[0]);
  if (o.arm) { rect(ctx, x - o.arm, top + 8, o.arm, 1, lit); rect(ctx, x - o.arm, top + 9, o.arm, 1, dark); }
}

// ------------------------------------------------------------------ braces (giant pixel { } doors)
function braceMask(H, Wd, T) {
  // centreline of a '{' in a Wd x H box (x grows to the right). Stroke thickness T.
  const ht = T / 2;
  const R2 = Math.max(2, Math.round(H * 0.07));      // middle cusp curve radius
  const R1 = Math.max(2, Math.round(H * 0.1));       // end hook radius
  const xs = ht + R2;                                // stem centre x
  const pts = [];
  const push = (x, y) => pts.push([x, y]);
  const arc = (cx, cy, r, a0, a1) => { const n = 24; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * (i / n); push(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } };
  const segLine = (x0, y0, x1, y1) => { const n = Math.max(2, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2)); for (let i = 0; i <= n; i++) push(lerp(x0, x1, i / n), lerp(y0, y1, i / n)); };
  const top = ht, bot = H - ht, mid = H / 2;
  segLine(Wd - ht, top, xs + R1, top);
  arc(xs + R1, top + R1, R1, -Math.PI / 2, -Math.PI);
  segLine(xs, top + R1, xs, mid - R2);
  arc(xs - R2, mid - R2, R2, 0, Math.PI / 2);
  arc(xs - R2, mid + R2, R2, -Math.PI / 2, 0);
  segLine(xs, mid + R2, xs, bot - R1);
  arc(xs + R1, bot - R1, R1, Math.PI, Math.PI / 2);
  segLine(xs + R1, bot, Wd - ht, bot);
  const m = new Uint8Array(Wd * H);
  const r2 = ht * ht;
  for (let y = 0; y < H; y++) for (let x = 0; x < Wd; x++) {
    const cx = x + 0.5, cy = y + 0.5;
    for (const [qx, qy] of pts) { const dx = cx - qx, dy = cy - qy; if (dx * dx + dy * dy <= r2) { m[y * Wd + x] = 1; break; } }
  }
  return m;
}
/**
 * A giant pixel brace slab '{' (or '}' with flip) with a chunky extruded side face, cached per size + palette.
 * pal: [deep, side, base, light, highlight] (dark -> light). Returns the canvas (Wd + depth, H + depth).
 */
export function braceCanvas(H, Wd, T, pal, depth = 3, flip = false) {
  const key = `D-brace|${H}|${Wd}|${T}|${pal.join(',')}|${depth}|${flip}`;
  return cached(key, Wd + depth, H + depth, (ctx) => {
    const m0 = braceMask(H, Wd, T);
    const m = flip ? m0.map((_, i) => { const y = Math.floor(i / Wd), x = i % Wd; return m0[y * Wd + (Wd - 1 - x)]; }) : m0;
    const at = (x, y) => (x >= 0 && y >= 0 && x < Wd && y < H ? m[y * Wd + x] : 0);
    // extrusion (down-right): deep edge, then side face
    for (let d = depth; d >= 1; d--) {
      for (let y = 0; y < H; y++) for (let x = 0; x < Wd; x++) if (at(x, y)) { ctx.fillStyle = d === depth ? pal[0] : pal[1]; ctx.fillRect(x + d, y + d, 1, 1); }
    }
    for (let y = 0; y < H; y++) for (let x = 0; x < Wd; x++) {
      if (!at(x, y)) continue;
      let col = pal[2];
      const edgeTL = !at(x - 1, y) || !at(x, y - 1);
      const edgeBR = !at(x + 1, y) || !at(x, y + 1);
      if (edgeTL) col = pal[3];
      else if (edgeBR) col = pal[1];
      ctx.fillStyle = col; ctx.fillRect(x, y, 1, 1);
    }
    // highlight streak inside the lit edge on the upper stem/hooks (pixel shine)
    for (let y = Math.round(H * 0.14); y < H * 0.36; y++) for (let x = 0; x < Wd; x++) {
      if (at(x, y) && at(x - 1, y) && !at(x - 2, y) && at(x, y - 1) && at(x, y + 1)) { ctx.fillStyle = pal[4]; ctx.fillRect(x, y, 1, 1); }
    }
    for (let y = Math.round(H * 0.62); y < H * 0.7; y++) for (let x = 0; x < Wd; x++) {
      if (at(x, y) && at(x - 1, y) && !at(x - 2, y) && at(x, y - 1) && at(x, y + 1)) { ctx.fillStyle = pal[4]; ctx.fillRect(x, y, 1, 1); }
    }
  });
}
export const BRACE_CORAL = ['#6E3A36', '#AD5E52', '#F07770', '#FB7966', '#F8CC87'];
export const BRACE_SKY = ['#1D4C4A', '#2B6A80', '#5A9CC6', '#79AED3', '#C1E2F2'];
export const BRACE_CORAL_N = ['#4A2826', '#7A3E3E', '#B85A55', '#D06A62', '#F07770'];
export const BRACE_SKY_N = ['#0F2B2A', '#1F5468', '#2B6A80', '#3F8ABD', '#79AED3'];

// ------------------------------------------------------------------ dithered polygons / rays
/** Fill a polygon with an ordered dither (crisp scanline clip, no anti-aliasing). */
export function ditherPoly(ctx, pts, color, level, colorA = null) {
  if (level <= 0) return;
  let minY = Infinity, maxY = -Infinity, minX = Infinity, maxX = -Infinity;
  for (const [x, y] of pts) { minY = Math.min(minY, y); maxY = Math.max(maxY, y); minX = Math.min(minX, x); maxX = Math.max(maxX, x); }
  ctx.save();
  ctx.beginPath();
  let any = false;
  for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
    const yc = y + 0.5, xs = [];
    for (let i = 0; i < pts.length; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length];
      if ((y0 <= yc && y1 > yc) || (y1 <= yc && y0 > yc)) xs.push(x0 + ((yc - y0) / (y1 - y0)) * (x1 - x0));
    }
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const a = Math.round(xs[i]), b = Math.round(xs[i + 1]);
      if (b > a) { ctx.rect(a, y, b - a, 1); any = true; }
    }
  }
  if (any) {
    ctx.clip();
    dither(ctx, Math.floor(minX), Math.floor(minY), Math.ceil(maxX - minX) + 1, Math.ceil(maxY - minY) + 1, colorA, color, level);
  }
  ctx.restore();
}
/** Flat additive light polygon (pixel-crisp scanline spans, 'lighter' blend): banded light like world.beam(). */
export function lightPoly(ctx, pts, add = '#201C0C') {
  let minY = Infinity, maxY = -Infinity;
  for (const [, y] of pts) { minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = add;
  ctx.beginPath();
  for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
    const yc = y + 0.5, xs = [];
    for (let i = 0; i < pts.length; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length];
      if ((y0 <= yc && y1 > yc) || (y1 <= yc && y0 > yc)) xs.push(x0 + ((yc - y0) / (y1 - y0)) * (x1 - x0));
    }
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) { const a = Math.round(xs[i]), b = Math.round(xs[i + 1]); if (b > a) ctx.rect(a, y, b - a, 1); }
  }
  ctx.fill();
  ctx.restore();
}
/** Additive light rays fanning from (cx, cy): { n, len, width, rot, a0, a1, add } */
export function lightRays(ctx, cx, cy, o = {}) {
  const n = o.n ?? 7, len = o.len ?? 140, w = o.width ?? 0.08, rot = o.rot ?? 0;
  const a0 = o.a0 ?? Math.PI, a1 = o.a1 ?? Math.PI * 2;
  for (let i = 0; i < n; i++) {
    const a = a0 + ((i + 0.5) / n) * (a1 - a0) + rot;
    const ww = w * (i % 2 ? 0.55 : 1);
    lightPoly(ctx, [[cx, cy], [cx + Math.cos(a - ww) * len, cy + Math.sin(a - ww) * len], [cx + Math.cos(a + ww) * len, cy + Math.sin(a + ww) * len]], o.add || '#1A170A');
  }
}
/** Radial light rays (dithered wedges) from (cx, cy). opts: { n, len, width (rad), rot, color, level, a0, a1 } */
export function rays(ctx, cx, cy, o = {}) {
  const n = o.n ?? 9, len = o.len ?? 120, w = o.width ?? 0.09, rot = o.rot ?? 0;
  const a0 = o.a0 ?? Math.PI, a1 = o.a1 ?? Math.PI * 2;
  for (let i = 0; i < n; i++) {
    const a = a0 + ((i + 0.5) / n) * (a1 - a0) + rot;
    const ww = w * (i % 2 ? 0.6 : 1);
    const pts = [[cx, cy], [cx + Math.cos(a - ww) * len, cy + Math.sin(a - ww) * len], [cx + Math.cos(a + ww) * len, cy + Math.sin(a + ww) * len]];
    ditherPoly(ctx, pts, o.color || C.gold, (o.level ?? 0.25) * (i % 2 ? 0.7 : 1));
  }
}

// ------------------------------------------------------------------ fireworks
/**
 * Firework: a rising spark (for `rise` s before t0) then a big burst at (x, y). k = t - t0.
 * opts: { seed, colors, n, speed, life, rise, fromY }
 */
export function firework(ctx, x, y, t, t0, o = {}) {
  const rise = o.rise ?? 0.3, life = o.life ?? 1.1;
  const k = t - t0;
  if (k < -rise || k > life) return;
  const cols = o.colors || [C.gold, C.cream, C.coral];
  if (k < 0) {
    const q = 1 + k / rise; // 0..1
    const fy = o.fromY ?? y + 60;
    const yy = R(lerp(fy, y, ease.outQuad(q)));
    rect(ctx, R(x), yy, 1, 2, C.cream);
    for (let i = 1; i < 5; i++) if (hash(i, Math.floor(onTwos(t) * 15), o.seed ?? 1) < 0.7) px(ctx, R(x) + (i % 2 ? 0 : (i % 3) - 1), yy + 2 + i * 2, i < 3 ? C.gold : C.coral);
    return;
  }
  if (k < 0.1) { haloDisc(ctx, x, y, 7, C.cream, 0.5); disc(ctx, x, y, 2, C.cream); }
  else if (k < 0.25) haloDisc(ctx, x, y, 9, cols[0], 0.18);
  burst(ctx, x, y, k, { n: o.n ?? 28, speed: o.speed ?? 46, gravity: 26, colors: cols, seed: o.seed ?? 1, life });
  burst(ctx, x, y, k, { n: Math.round((o.n ?? 28) * 0.5), speed: (o.speed ?? 46) * 0.55, gravity: 22, colors: [C.cream, cols[0]], seed: (o.seed ?? 1) + 50, life: life * 0.8 });
}

/** Twinkling 4-point star sparkle that loops (period p, phase ph). size 1..3. */
export function twinkle(ctx, x, y, t, o = {}) {
  const p = o.period ?? 0.8, ph = o.phase ?? 0;
  const k = (((onTwos(t) + ph * p) % p) + p) % p / p;
  const size = o.size ?? 2, col = o.color || C.gold;
  if (k > 0.55) return;
  const kk = k / 0.55;
  const arm = kk < 0.25 ? 1 : kk < 0.7 ? size : 1;
  px(ctx, x, y, C.cream);
  for (let i = 1; i <= arm; i++) { const cc = i === arm ? col : C.cream; px(ctx, x - i, y, cc); px(ctx, x + i, y, cc); px(ctx, x, y - i, cc); px(ctx, x, y + i, cc); }
}

// ------------------------------------------------------------------ cratered moon
/** Big pixel moon with craters, shaded from the upper-left. (x, y) centre, r radius. Cached. */
export function bigMoon(ctx, x, y, r, o = {}) {
  const key = `D-moon|${r}`;
  const cvs = cached(key, r * 2 + 3, r * 2 + 3, (c) => {
    const cx = r + 1, cy = r + 1;
    const rr = r * r + r * 0.8;
    const cr = rng(77);
    const craters = [];
    for (let i = 0; i < Math.max(4, R(r / 3)); i++) craters.push([cr.range(-0.6, 0.6) * r, cr.range(-0.6, 0.6) * r, cr.range(0.08, 0.2) * r]);
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const d2 = dx * dx + dy * dy;
      if (d2 > rr) continue;
      // terminator-ish shading: light from the upper-left
      const l = (-dx - dy) / (r * 1.4) + 0.25 - Math.sqrt(d2) / (r * 2.4);
      let col = l > 0.35 ? '#FDF7EA' : l > 0.0 ? C.cream : l > -0.3 ? '#E6D9C1' : '#C9D1C6';
      if (l > -0.3 && l <= 0.0 && ((dx + dy) & 1) === 0 && l < -0.18) col = '#C9D1C6';
      for (const [kx, ky, kr] of craters) {
        const ex = dx - kx, ey = dy - ky, e2 = ex * ex + ey * ey;
        if (e2 <= kr * kr) col = ex + ey < 0 ? '#B9B19C' : '#D9CFB8';
        else if (e2 <= (kr + 1) * (kr + 1) && ex + ey > 0) col = '#FDF7EA';
      }
      c.fillStyle = col; c.fillRect(cx + dx, cy + dy, 1, 1);
    }
  });
  if (o.halo) {
    haloDisc(ctx, x, y, r + 6, '#B9D5DC', 0.06 * o.halo);
    haloDisc(ctx, x, y, r + 3, '#B9D5DC', 0.12 * o.halo);
  }
  ctx.drawImage(cvs, R(x) - r - 1, R(y) - r - 1);
}

// ------------------------------------------------------------------ earth limb (seen from space)
/**
 * Earth limb at the bottom of the frame: a huge circle (centre cx, cy, radius rad) with a sky-blue atmosphere rim,
 * Chesapeake-blue ocean in bands and a teal-green coast. Cached per params.
 */
export function earthLimb(ctx, cx, cy, rad, W, H, o = {}) {
  const key = `D-earth|${cx}|${cy}|${rad}|${W}|${H}|${o.night ? 1 : 0}`;
  const cvs = cached(key, W, H, (c) => {
    const ocean = o.night ? ['#0F2B2A', '#163C45', '#1F5468', '#2B6A80'] : ['#2B6A80', '#3F8ABD', '#5A9CC6', '#79AED3'];
    const land = o.night ? ['#061F21', '#0F3A36', '#1F5249', '#3F6E45'] : ['#1F5249', '#2E6348', '#4A7A45', '#C9B795'];
    // smooth value noise for organic coastlines (curved to follow the limb)
    const vn = (x, y, gx, gy, seed) => {
      const fx = x / gx, fy = y / gy, ix = Math.floor(fx), iy = Math.floor(fy), ux = fx - ix, uy = fy - iy;
      const sx = ux * ux * (3 - 2 * ux), sy = uy * uy * (3 - 2 * uy);
      const a = hash(ix, iy, seed), b = hash(ix + 1, iy, seed), c2 = hash(ix, iy + 1, seed), d = hash(ix + 1, iy + 1, seed);
      return lerp(lerp(a, b, sx), lerp(c2, d, sx), sy);
    };
    const landAt = (x, y) => {
      const dd = rad - Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      const n = vn(x, dd, 34, 9, 41) * 0.65 + vn(x, dd, 11, 4, 43) * 0.35;
      return n > 0.58 && dd > 2.5;
    };
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (d > rad + 4) continue;
      let col = null;
      if (d > rad + 2) col = (x + y) % 2 === 0 ? (o.night ? '#1F5468' : '#79AED3') : null;          // outer haze (dither)
      else if (d > rad) col = o.night ? '#2B6A80' : '#A5CFE8';                                       // atmosphere rim
      else {
        const depth = rad - d;
        if (landAt(x, y)) {
          const coast = !landAt(x, y - 1) || !landAt(x - 1, y) || !landAt(x + 1, y);
          col = coast ? land[3] : depth < 6 ? land[2] : hash(x >> 1, y, 5) < 0.5 ? land[1] : land[0];
        } else {
          const band = depth < 2 ? 3 : depth < 6 ? 2 : depth < 14 ? 1 : 0;
          col = ocean[band];
          if (band > 0 && band < 3 && hash(x >> 2, y, 7) < 0.12) col = ocean[band + 1];
        }
      }
      if (col) { c.fillStyle = col; c.fillRect(x, y, 1, 1); }
    }
  });
  ctx.drawImage(cvs, 0, R(o.oy || 0));
}

// ------------------------------------------------------------------ skyline (Hampton waterfront)
/**
 * Build a deterministic waterfront skyline between x0..x1 standing on `ground`. Returns { canvas, windows[] } where
 * windows are {x, y, w, h, order} (order 0..1 = when it lights up). Cached by key.
 */
export function skyline(key, W, H, x0, x1, ground, o = {}) {
  const cacheKey = `D-skyline|${key}`;
  const meta = skyMeta.get(cacheKey);
  if (meta) return meta;
  const night = !!o.night;
  const body = night ? ['#0B2422', '#123331', '#173B38'] : ['#173B38', '#1B4440', '#214D49'];
  const rim = night ? '#2B6A80' : '#A86A6E';
  const unlit = night ? '#0F2B2A' : '#123331';
  const r = rng(o.seed ?? 5);
  const blds = [];
  let x = x0;
  const tall = o.tall ?? 1;
  while (x < x1) {
    const w = r.int(10, 22);
    const kind = r.pick(['flat', 'flat', 'step', 'step', 'spire', 'roof', 'tank']);
    const u = r.next();
    const base = u < 0.3 ? r.int(10, 18) : u < 0.8 ? r.int(20, 34) : r.int(38, 56);
    const h = R((base + (kind === 'spire' ? 8 : 0)) * tall);
    blds.push({ x, w, h, kind, depth: r.chance(0.45) ? 1 : 0 });
    x += w + r.int(-3, 2);
  }
  const windows = [];
  const { canvas, ctx } = makeCanvas(W, H);
  // back row first (depth 1 = shorter, darker, set back), then front row
  for (const pass of [1, 0]) {
    for (const b of blds) {
      if (b.depth !== pass) continue;
      const hh = pass ? R(b.h * 0.72) : b.h;
      const top = ground - hh;
      const col = pass ? body[0] : body[1];
      rect(ctx, b.x, top, b.w, hh, col);
      if (!pass) {
        vline(ctx, b.x, top, ground - 1, rim);                   // sunset rim on the left edge
        rect(ctx, b.x + b.w - 3, top, 3, hh, body[0]);           // shaded right side
      }
      // roof details
      if (b.kind === 'step') { rect(ctx, b.x + 3, top - 4, b.w - 6, 4, col); if (!pass) vline(ctx, b.x + 3, top - 4, top - 1, rim); }
      if (b.kind === 'spire') { const sx = b.x + (b.w >> 1); for (let i = 0; i < 9; i++) rect(ctx, sx - Math.max(0, 2 - (i >> 2)), top - 1 - i, Math.max(1, 5 - 2 * (i >> 2)), 1, col); vline(ctx, sx, top - 14, top - 9, col); }
      if (b.kind === 'roof') { for (let i = 0; i < (b.w >> 1); i++) rect(ctx, b.x + i, top - 1 - (i >> 1), b.w - i * 2, 1, col); }
      if (b.kind === 'tank') { rect(ctx, b.x + 3, top - 7, 6, 4, col); vline(ctx, b.x + 4, top - 3, top - 1, col); vline(ctx, b.x + 7, top - 3, top - 1, col); }
      // windows: 2x2 cells on a 4px grid (front) / 1x1 on a 3px grid (back)
      const step = pass ? 3 : 4, ww = pass ? 1 : 2;
      for (let wy = top + 3; wy < ground - 3; wy += step) {
        for (let wx = b.x + 2; wx < b.x + b.w - (pass ? 2 : 4); wx += step) {
          if (hash(wx, wy, 13) < 0.18) continue;
          rect(ctx, wx, wy, ww, ww, unlit);
          windows.push({ x: wx, y: wy, w: ww, h: ww, order: hash(wx * 3, wy * 7, 21) * 0.75 + (1 - (wy - (ground - 50)) / 60) * 0.05 + (pass ? 0.15 : 0) * hash(wx, wy, 3) });
        }
      }
    }
  }
  windows.sort((a, b) => a.order - b.order);
  windows.forEach((w, i) => { w.order = i / Math.max(1, windows.length - 1); });
  const res = { canvas, windows, blds };
  skyMeta.set(cacheKey, res);
  return res;
}
const skyMeta = new Map();

// ------------------------------------------------------------------ small pixel kid (all ages!)
const KID = [
  '..hhh..', '.hhhhh.', '.hssss.', '.sesek.', '..sss..', '.ttttt.', 'stttTts', '..tTt..', '..p.p..', '..p.p..', '.oo.oo.',
];
const KID_WALK = [
  '..hhh..', '.hhhhh.', '.hssss.', '.sesek.', '..sss..', '.ttttt.', 'stttTts', '..tTt..', '..pp...', '.p..p..', 'oo..oo.',
];
const KID_CHEER = [
  's.....s', 't.hhh.t', 'thhhhht', '.hssss.', '.sesek.', '..sss..', '.ttttt.', '..tTt..', '..p.p..', '..p.p..', '.oo.oo.',
];
const kidCache = new Map();
/** Kid sprite (7x11). opts like world.person: { t, pose 'stand'|'walk'|'cheer', skin, hair, top, pants, flip } */
export function kid(ctx, x, base, o = {}) {
  const skin = RAMP.skin[o.skin ?? 2], hairC = RAMP.hair[o.hair ?? 1];
  const top = o.top || C.gold, pants = o.pants || '#2B3A4A';
  let rows = KID;
  if (o.pose === 'walk') rows = Math.floor((o.t ?? 0) * 6 + 1e-6) % 2 ? KID_WALK : KID;
  if (o.pose === 'cheer') rows = Math.floor((o.t ?? 0) * 4 + 1e-6) % 2 ? KID : KID_CHEER;
  const key = [rows === KID ? 's' : rows === KID_WALK ? 'w' : 'c', skin[1], hairC, top, pants].join('|');
  let spr = kidCache.get(key);
  if (!spr) {
    spr = sprite(rows, { h: hairC, s: skin[1], k: skin[0], e: '#173B38', t: top, T: shadeHex(top), p: pants, o: '#0F2B2A' });
    kidCache.set(key, spr);
  }
  drawSprite(ctx, spr, x, base, { anchor: 'bc', flipX: o.flip });
}
export function shadeHex(hex, f = 0.72) {
  const n = parseInt(hex.slice(1), 16);
  const g = (v) => Math.max(0, Math.round(v * f));
  return '#' + [g((n >> 16) & 255), g((n >> 8) & 255), g(n & 255)].map((v) => v.toString(16).padStart(2, '0')).join('');
}

// ------------------------------------------------------------------ hi-layer helpers
/** Rocket/scene speed lines (short vertical sky streaks) moving downwards = ascent. */
export function speedStreaks(ctx, t, o = {}) {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  const n = o.n ?? 14, sp = o.speed ?? 90, seed = o.seed ?? 5;
  const tq = onTwos(t);
  for (let i = 0; i < n; i++) {
    const x = R(hash(i, 1, seed) * W);
    const len = 3 + R(hash(i, 2, seed) * 7);
    const y = R(((hash(i, 3, seed) * (H + 40) + tq * sp * (0.6 + hash(i, 4, seed) * 0.8)) % (H + 40)) - 20);
    if (o.avoid && Math.abs(x - o.avoid.x) < o.avoid.w) continue;
    vline(ctx, x, y, y + len, hash(i, 5, seed) < 0.3 ? '#C1E2F2' : (o.color || RAMP.water[3]));
  }
}
/** Horizontal speed lines (for SHIP/whoosh), x range. */
export function hStreaks(ctx, t, x0, x1, y0, y1, o = {}) {
  const n = o.n ?? 8, seed = o.seed ?? 9, sp = o.speed ?? 160;
  const tq = onTwos(t);
  for (let i = 0; i < n; i++) {
    const y = R(lerp(y0, y1, hash(i, 1, seed)));
    const len = 6 + R(hash(i, 2, seed) * 14);
    const x = R(x1 - ((hash(i, 3, seed) * (x1 - x0) + tq * sp) % (x1 - x0)));
    hline(ctx, x, x + len, y, hash(i, 4, seed) < 0.3 ? C.cream : (o.color || C.sky));
  }
}

export { clamp, lerp, ease, R };
