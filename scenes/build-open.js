// scenes/build-open.js (owner D) C13 (ch.3-ch.4) and C27 (ch2.3-ch2.4, variant 2).
// "Build it in the open, let the whole world in / It's free for everybody, so come on, let's begin!"
// Two giant pixel braces (coral '{', sky '}', the key-art corner colors) stand closed as '{}' on the waterfront lawn,
// light leaking through the seam. On "open" they slide apart like doors, gold light pours out, and pixel people of all
// ages stream in from both sides to fill the braces: the empty object gets its community. Chip FREE · ALL AGES lands on
// ch.4; on "let's begin!" the whole crowd cheers on the beat.
// Variant 2: night lawn, stronger light, string lights between the braces, fireworks + confetti.
import { C, RAMP, SKY } from '../lib/palette.js';
import { clamp, lerp, ease, onTwos, hash } from '../lib/motion.js';
import { rect, px, hline, dither, bands } from '../lib/pixel.js';
import { water, lighthouse, tree, bush, stars, person, sparkle, haloDisc, cloud } from '../lib/world.js';
import { chip, corners, plus, anim } from '../lib/text.js';
import {
  chLine, beatLen, beatAfter, beatsIn, braceCanvas, BRACE_CORAL, BRACE_SKY, BRACE_CORAL_N, BRACE_SKY_N,
  lightPoly, lightRays, firework, twinkle, kid, R,
} from './_D-kit.js';

const LAYOUT = {
  '16x9': {
    brace: { H: 104, W: 30, T: 9, depth: 4 }, cx: 160, base: 152, open: 44,
    horizon: 124, lawn: 132, lh: { x: 292, base: 124, h: 40 },
    rows: [{ base: 153, n: 7 }, { base: 163, n: 7 }, { base: 174, n: 6 }], span: [100, 220],
    chipY: 126, plus: [1788, 192],
    fw: [[60, 30], [262, 26], [40, 70], [286, 66], [120, 14], [204, 18]],
  },
  '9x16': {
    brace: { H: 128, W: 28, T: 9, depth: 4 }, cx: 90, base: 204, open: 40,
    horizon: 174, lawn: 182, lh: { x: 160, base: 174, h: 36 },
    rows: [{ base: 205, n: 5 }, { base: 216, n: 5 }, { base: 228, n: 4 }], span: [36, 144],
    chipY: 300, plus: [960, 330],
    fw: [[30, 40], [150, 36], [24, 160], [156, 150], [90, 20], [60, 90]],
  },
};

function timing(c) {
  const bl = beatLen(c);
  const l4 = chLine(c, 4);
  const tFree = l4 ? l4.start : Math.min(c.dur * 0.5, 4 * bl);
  const tOpen = Math.min(beatAfter(c, 0.1, 1), tFree - bl * 0.75);
  const tBegin = Math.min(beatAfter(c, tFree + 0.1, 1), c.dur - 0.25);
  return { bl, tFree, tOpen: Math.max(0.25, tOpen), tBegin };
}

// crowd: deterministic slots + looks, per format
const crowdCache = {};
function crowd(fmt) {
  if (crowdCache[fmt]) return crowdCache[fmt];
  const L = LAYOUT[fmt];
  const list = [];
  let k = 0;
  L.rows.forEach((row, ri) => {
    for (let i = 0; i < row.n; i++) {
      const u = (i + 0.5 + (ri % 2) * 0.35) / row.n;
      const x = R(lerp(L.span[0], L.span[1], u) + (hash(k, 1, 3) - 0.5) * 4);
      const side = x < L.cx ? -1 : 1;
      const isKid = [3, 9, 14].includes(k);
      const elder = [5, 12].includes(k);
      list.push({ x, base: row.base, row: ri, side, seed: 40 + k * 7, kid: isKid, elder, k });
      k++;
    }
  });
  // entry order: back row first, alternating sides, then forward
  list.sort((a, b) => a.row - b.row || Math.abs(b.x - L.cx) - Math.abs(a.x - L.cx));
  list.forEach((p, i) => { p.order = i; });
  crowdCache[fmt] = list;
  return list;
}

export default {
  id: 'build-open',
  draw(g, t, c) {
    const v = c.fmt === '9x16';
    const night = c.variant === 2;
    const L = LAYOUT[c.fmt];
    const T = timing(c);
    drawWorld(g, t, c, L, T, night, v);
    drawType(g, t, c, L, T, night, v);
  },
};

function drawWorld(g, t, c, L, T, night, v) {
  const { px: ctx, PW, PH } = g;
  const tq = onTwos(t);
  const tod = night ? 'night' : 'day';
  const B = L.brace;

  // --- backdrop: sky, distant bay with a tiny lighthouse, lawn
  if (night) { bands(ctx, 0, 0, PW, L.horizon, SKY.night, { blend: 2 }); stars(ctx, t, { h: L.horizon - 10, seed: 13, big: 0.1 }); }
  else {
    cloud(ctx, R((v ? 10 : 30) + ((tq * 1.2) % 30)), v ? 30 : 22, { kind: 'twoTone', tod });
    cloud(ctx, R((v ? 120 : 236) + ((tq * 0.8) % 30)), v ? 48 : 40, { kind: 'small', tod });
  }
  water(ctx, t, { x: 0, y: L.horizon, w: PW, h: L.lawn - L.horizon + 2, tod, seed: 9, fade: 'none', speed: 0.6,
    glints: night ? [{ x: L.lh.x, color: C.gold, w: 4 }] : [] });
  tree(ctx, L.lh.x + 12, L.horizon + 1, { w: 12, h: 14, seed: 5, tod });
  lighthouse(ctx, L.lh.x, L.horizon + 1, { h: L.lh.h, t, tod, glow: night ? 1 : 0.7 + 0.3 * c.pulse(t, 0.3), beam: night, beamLen: 50 });
  bush(ctx, L.lh.x - 10, L.horizon + 1, { w: 12, h: 5, seed: 6, tod });
  // lawn: banded greens (darker towards the viewer) with grass tufts
  const leaf = night ? ['#061F21', '#082B2D', '#0F3A36', '#1F5249', '#2E6348'] : ['#1F5249', '#2E6348', '#4A7A45', '#5D8B3B', '#7FA05A'];
  bands(ctx, 0, L.lawn, PW, PH - L.lawn, [leaf[3], leaf[2], leaf[2], leaf[1]], { blend: 1 });
  hline(ctx, 0, PW, L.lawn, leaf[4]);
  for (let i = 0; i < 70; i++) {
    const gx = R(hash(i, 1, 33) * PW), gy = L.lawn + 3 + R(hash(i, 2, 33) * (PH - L.lawn - 4));
    px(ctx, gx, gy, leaf[hash(i, 3, 33) < 0.5 ? 4 : 1]);
    if (hash(i, 4, 33) < 0.4) px(ctx, gx + 1, gy - 1, leaf[4]);
  }

  // --- braces: drop in at t=0, knock on the beats, slide open on "open"
  const dropK = clamp(t / 0.17);
  const dropY = R(-30 * (1 - ease.outBounce(dropK)));
  const openK = t < T.tOpen ? 0 : ease.outBack(clamp((t - T.tOpen) / 0.32));
  const gap = R(L.open * openK);
  const knock = t < T.tOpen ? R(c.pulse(t, 0.12) * 1.5) : 0;
  const lx1 = L.cx - knock - gap;            // right edge of '{'
  const rx0 = L.cx + knock + gap;            // left edge of '}'
  const top = L.base - B.H + dropY;

  // --- the light inside the opening (flat bands, pixel-art light) + additive rays and lawn spill
  const lit = t >= T.tOpen;
  const lightK = lit ? clamp((t - T.tOpen) / 0.12) : 0;
  const inset = R(B.T * 0.5 + B.H * 0.07 + 2);             // stem centre offset inside each brace box
  const ix0 = lx1 - B.W + inset, ix1 = rx0 + B.W - inset;   // inner light slab between the stems
  const sy0 = top + R(B.T * 0.7), sy1 = L.base - R(B.T * 0.7);
  const ccy = R((sy0 + sy1) / 2);
  if (!lit) {
    // light leaking through the closed '{}': a pulsing vertical seam
    const lk = c.pulse(t, 0.3);
    const w = 1 + R(lk * 2);
    rect(ctx, L.cx - w, sy0 + 6, w * 2, sy1 - sy0 - 12, '#F8CC87');
    rect(ctx, L.cx - Math.max(0, w - 1), sy0 + 10, Math.max(1, (w - 1) * 2), sy1 - sy0 - 20, '#FFF1C9');
    lightPoly(ctx, [[L.cx - 3, sy0], [L.cx + 3, sy0], [L.cx + 10 + lk * 6, sy1], [L.cx - 10 - lk * 6, sy1]], '#14120A');
  } else {
    const flashK = clamp(1 - (t - T.tOpen) / 0.2);
    lightRays(ctx, L.cx, ccy, { n: 7, len: v ? 150 : 200, width: 0.075, rot: Math.sin(tq * 0.9) * 0.04, a0: Math.PI * 1.05, a1: Math.PI * 1.95, add: night ? '#2A2410' : '#17140A' });
    if (flashK > 0) lightRays(ctx, L.cx, ccy, { n: 12, len: 240, width: 0.06, a0: 0, a1: Math.PI * 2, add: '#3A3320' });
    // slab: gold edge band, glow body, hot core (each band 2px dithered into the next)
    const sw = ix1 - ix0;
    rect(ctx, ix0, sy0, sw, sy1 - sy0, C.gold);
    dither(ctx, ix0 + 3, sy0, sw - 6, sy1 - sy0, C.gold, '#F8CC87', 0.5);
    rect(ctx, ix0 + 5, sy0 + 2, sw - 10, sy1 - sy0 - 2, '#F8CC87');
    const cw = R(sw * 0.45);
    dither(ctx, L.cx - (cw >> 1) - 2, sy0 + 4, cw + 4, sy1 - sy0 - 4, '#F8CC87', '#FFF1C9', 0.5);
    rect(ctx, L.cx - (cw >> 1), sy0 + 6, cw, sy1 - sy0 - 6, '#FFF1C9');
    if (flashK > 0.5) rect(ctx, ix0, sy0, sw, sy1 - sy0, C.cream);
    // spill on the lawn, widening towards the viewer
    const sp = Math.min(PH - L.base, 34), spx = R(sp * 1.2);
    lightPoly(ctx, [[ix0 + 2, L.base], [ix1 - 2, L.base], [ix1 + spx, L.base + sp], [ix0 - spx, L.base + sp]], night ? '#2A2410' : '#1E1A0C');
    if (PH - L.base > sp) dither(ctx, ix0 - spx, L.base + sp, ix1 - ix0 + spx * 2, 2, null, night ? '#0F3A36' : '#4A7A45', 0.5);
  }
  // string lights between the brace tops (variant 2)
  if (night && lit) {
    const xa = lx1 - 10, xb = rx0 + 10, ya = top + 6;
    for (let i = 0; i <= 14; i++) {
      const u = i / 14, x = R(lerp(xa, xb, u)), y = R(ya + Math.sin(u * Math.PI) * 10);
      px(ctx, x, y, RAMP.ink[1]);
      if (i % 2 === 0) px(ctx, x, y + 1, (i / 2 + Math.floor(tq * 4)) % 3 === 0 ? C.cream : [C.gold, C.coral, C.sky][(i / 2) % 3]);
    }
  }
  const pl = night ? [BRACE_CORAL_N, BRACE_SKY_N] : [BRACE_CORAL, BRACE_SKY];
  const cl = braceCanvas(B.H, B.W, B.T, pl[0], B.depth, false);
  const cr = braceCanvas(B.H, B.W, B.T, pl[1], B.depth, true);
  // ground shadows
  dither(ctx, lx1 - B.W + 4, L.base, B.W - 2, 2, null, RAMP.ink[1], 0.5);
  dither(ctx, rx0 + 2, L.base, B.W - 2, 2, null, RAMP.ink[1], 0.5);
  ctx.drawImage(cl, lx1 - B.W, top);
  ctx.drawImage(cr, rx0, top);
  // landing dust
  if (t < 0.4 && dropK >= 1) {
    const k = (t - 0.17) / 0.23;
    for (let i = 0; i < 8; i++) {
      const d = R(4 + k * 14);
      px(ctx, L.cx - B.W + (i % 2 ? -d : d - 6), L.base - 1 - R(hash(i, 1, 3) * 3 * (1 - k)), leaf[4]);
      px(ctx, L.cx + B.W + (i % 2 ? d : -d + 6), L.base - 1 - R(hash(i, 2, 3) * 3 * (1 - k)), leaf[4]);
    }
  }

  // --- the crowd streams in from both edges
  const P = crowd(g.fmt);
  const tempo = clamp(0.6 / T.bl, 0.5, 2); // walk faster when the song map is tighter
  const speed = (v ? 56 : 78) * tempo;
  const cheer = t >= T.tBegin;
  const hop = (p) => (cheer && c.pulse(t + p.k * 0.013, 0.2) > 0.55 ? 2 : 0);
  // draw back row first
  const sorted = [...P].sort((a, b) => a.base - b.base);
  for (const p of sorted) {
    const ts = T.tOpen + 0.04 + (p.order * (v ? 0.075 : 0.06)) / tempo;
    if (t < ts) continue;
    const startX = p.side < 0 ? -8 : PW + 8;
    const dist = Math.abs(p.x - startX);
    const travelled = (t - ts) * speed;
    const arrived = travelled >= dist;
    const x = arrived ? p.x : R(startX + (p.side < 0 ? 1 : -1) * travelled);
    const flip = !arrived ? p.side > 0 : p.x > L.cx;
    const pose = !arrived ? 'walk' : cheer ? 'cheer' : (t - ts - dist / speed < 0.35 ? 'wave' : 'stand');
    const y = p.base - (arrived ? hop(p) : 0);
    // rim of door light on silhouettes standing in the opening
    if (p.kid) kid(ctx, x, y, { t: t + p.k * 0.1, pose: pose === 'wave' ? 'stand' : pose, skin: p.k % 6, hair: (p.k * 3) % 5, top: [C.gold, C.sky, C.coral][p.k % 3], flip });
    else person(ctx, x, y, { t: t + p.k * 0.07, pose, seed: p.seed, flip, ...(p.elder ? { hair: 5, style: 'short' } : {}) });
  }

  // --- sparkles: on the open, on "free", and steady twinkles in the light
  if (lit) {
    for (let i = 0; i < 6; i++) sparkle(ctx, R(L.cx + (i - 2.5) * 9), top + 12 + (i % 3) * 22, t, T.tOpen + i * 0.04, { size: 2, dur: 0.4, color: C.cream });
    for (let i = 0; i < 6; i++) sparkle(ctx, R(L.cx + Math.cos(i * 1.3) * (gap + 22)), top + 8 + (i * 17) % 60, t, T.tFree + i * 0.05, { size: 2, dur: 0.4, color: i % 2 ? C.gold : C.sky });
    const n = night ? 10 : 5;
    for (let i = 0; i < n; i++) twinkle(ctx, R(L.cx + (hash(i, 1, 9) - 0.5) * gap * 1.6), R(top + 6 + hash(i, 2, 9) * (B.H * 0.6)), t, { period: 0.7 + hash(i, 3, 9) * 0.5, phase: hash(i, 4, 9), size: 1, color: C.cream });
  }
  if (night) {
    const shots = [T.tOpen, T.tFree, ...beatsIn(c, T.tBegin, c.dur + 1)];
    shots.forEach((s, i) => {
      const [fx, fy] = L.fw[i % L.fw.length];
      firework(ctx, fx, fy, t, s, { seed: 71 + i, colors: [[C.gold, C.cream, C.coral], [C.sky, C.cream, C.gold], [C.coral, C.gold, C.cream]][i % 3], n: 36, speed: 50, life: 1.0, rise: 0.25, fromY: fy + 50 });
    });
    // confetti on "let's begin!"
    if (cheer) {
      const k = t - T.tBegin;
      for (let i = 0; i < 40; i++) {
        const x = R(hash(i, 1, 19) * PW + Math.sin(k * 3 + i) * 3), y = R(-4 + (hash(i, 2, 19) * 0.6 + k * (0.5 + hash(i, 3, 19) * 0.5)) * PH * 0.8);
        if (y > L.base) continue;
        const col = [C.coral, C.gold, C.sky, C.cream][i % 4];
        rect(ctx, x, y, Math.floor(k * 8 + i) % 2 ? 2 : 1, 1, col);
      }
    }
  }
}

function drawType(g, t, c, L, T, night, v) {
  const { hi } = g;
  corners(hi, c.fmt, { show: clamp(t / 0.3), y: v ? 132 : undefined });
  const pl = c.pulse(t, 0.35);
  plus(hi, L.plus[0], L.plus[1], { scale: night ? 0.8 + 0.5 * Math.max(pl, c.pulse(t + T.bl / 2, 0.2)) : 0.8 + 0.4 * pl });
  const label = c.facts.chips.allAges;
  const cx = v ? c.safe.cx : g.W / 2;
  anim(hi, t, { t0: T.tFree, x: cx, y: L.chipY, enter: 'stamp' }, (h) => chip(h, label, cx, L.chipY, { size: v ? 46 : 50, align: 'center' }));
}
