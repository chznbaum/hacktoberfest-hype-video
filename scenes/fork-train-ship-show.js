// scenes/fork-train-ship-show.js (owner D) C15 (ch.7) and C29 (ch2.7, variant 2).
// "Fork it, train it, ship it, show it" - four hard cuts, one per vocal hit (c.hits['ch.7']), one word each:
//   FORK  a branch grows off the main line of a commit graph
//   TRAIN a loss curve drops on a little chart, epoch bar fills
//   SHIP  a cardboard package blasts off on rocket flames
//   SHOW  a demo screen lights up over a clapping crowd
// Icon and word swap sides on every cut (ping-pong). Variant 2: night, flash on every cut, fireworks on SHOW,
// icons bounce on the half-beats.
import { C, RAMP, SKY } from '../lib/palette.js';
import { clamp, lerp, ease, onTwos, hash, shake } from '../lib/motion.js';
import { rect, px, hline, vline, disc, dither, bands, pixelText, line, frame } from '../lib/pixel.js';
import { stars, sparkle, haloDisc } from '../lib/world.js';
import { text, display, corners, stairs, plus, anim, fitSize, flash } from '../lib/text.js';
import { chHits, beatLen, beatAfter, passed, flame, drawPuffs, firework, twinkle, shadeHex, R } from './_D-kit.js';

const WORDS = ['FORK', 'TRAIN', 'SHIP', 'SHOW'];

function times(c) {
  const h = chHits(c, 7);
  if (h.length >= 4) return [0, h[1], h[2], h[3]];
  const bl = beatLen(c);
  const b0 = beatAfter(c, 0.05, 0);
  return [0, b0 + bl, b0 + bl * 2, b0 + bl * 3].map((x, i) => (i === 0 ? 0 : Math.min(x, c.dur - 0.15 * (4 - i))));
}

export default {
  id: 'fork-train-ship-show',
  draw(g, t, c) {
    const v = c.fmt === '9x16';
    const night = c.variant === 2;
    const T = times(c);
    const k = Math.max(0, passed(T, t));
    const t0 = T[k];
    const lt = t - t0;
    const side = k % 2 === 0 ? 1 : -1; // +1: icon right / word left
    const { px: ctx, PW, PH } = g;
    // background per cut
    const bgs = night ? [SKY.night.slice(0, 4), SKY.night.slice(1, 5), SKY.night.slice(0, 4), SKY.night.slice(1, 5)] : null;
    if (night) {
      bands(ctx, 0, 0, PW, PH, bgs[k], { blend: 2 });
      stars(ctx, t, { h: PH, seed: 90 + k, big: 0.12, count: R((PW * PH) / 220) });
    } else {
      rect(ctx, 0, 0, PW, PH, k % 2 ? C.tealDark : C.teal);
    }
    // icon placement
    const icx = v ? 90 : side > 0 ? 222 : 98;
    const icy = v ? 112 : 92;
    const bob = night ? R(c.pulse(t, 0.12) * 2 + c.pulse(t + beatLen(c) / 2, 0.12) * 1) : R(c.pulse(t, 0.15) * 1.5);
    const drop = R(10 * (1 - ease.outBack(clamp(lt / 0.16))));
    const cy = icy - bob - drop;
    // flat badge disc behind the icon (the other teal tone), pops on the cut
    const S = v ? 0.86 : 1.0;
    const br = R((v ? 76 : 80) * (0.9 + 0.1 * ease.outBack(clamp(lt / 0.12))));
    disc(ctx, icx, icy, br, night ? RAMP.ink[1] : k % 2 ? C.teal : C.tealDark);
    if (k === 0) drawFork(ctx, icx, cy, lt, night, S);
    else if (k === 1) drawTrain(ctx, icx, cy, lt, night, S);
    else if (k === 2) drawShip(ctx, icx, cy, lt, night, t, S);
    else drawShow(ctx, icx, cy, lt, night, t, v, S * 0.86);
    if (night && k === 3) {
      firework(ctx, icx - 50, icy - 50, t, t0, { seed: 5, n: 40, speed: 60, life: 1.0, rise: 0.0001 });
      firework(ctx, icx + 52, icy - 40, t, t0 + 0.1, { seed: 6, n: 34, speed: 50, life: 1.0, rise: 0.0001, colors: [C.sky, C.cream, C.gold] });
    }
    // cut accents: sparkles around the icon
    for (let i = 0; i < 5; i++) {
      const a = i * 1.37 + k;
      sparkle(ctx, R(icx + Math.cos(a) * (v ? 62 : 64)), R(icy + Math.sin(a) * 46), t, t0 + 0.02 + i * 0.03, { size: 2, dur: 0.3, color: i % 2 ? C.gold : C.cream });
    }
    if (night) for (let i = 0; i < 6; i++) twinkle(ctx, R(hash(i, 1, 40 + k) * PW), R(hash(i, 2, 40 + k) * PH), t, { period: 0.5, phase: hash(i, 3, 40), size: 2 });

    // ---------------- type layer: one word per cut
    const { hi } = g;
    corners(hi, c.fmt, { y: v ? 132 : undefined });
    const size = v ? fitSize(hi, 'TRAIN', 860, { role: 'display', maxSize: 300 }) : fitSize(hi, 'TRAIN', 780, { role: 'display', maxSize: 300 });
    const word = WORDS[k];
    let wx, wy, align;
    if (v) { wx = c.safe.cx; wy = Math.min(c.safe.y1 - 40, 1290); align = 'center'; }
    else if (side > 0) { wx = 110; wy = 552 + size * 0.36; align = 'left'; }
    else { wx = 1810; wy = 552 + size * 0.36; align = 'right'; }
    const box = { cx: wx, cy: wy - size * 0.36 };
    anim(hi, t, { t0, x: box.cx, y: box.cy, enter: 'stamp' }, (h) => display(h, word, wx, wy, { size, align, color: C.cream }));
    plus(hi, v ? 960 : side > 0 ? 1788 : 132, v ? 330 : 192, { scale: 0.8 + 0.4 * c.pulse(t, 0.3) });
    if (night) { const f = lt * 30; if (f < 3) flash(hi, g.W, g.H, 0.3 * (1 - f / 3)); }
  },
};

// ------------------------------------------------------------------ icons (pixel layer, centred on cx, cy; S = scale)
function thickPath(ctx, pts, w, col, upto = 1) {
  // stamp w x w squares along the polyline up to fraction `upto` of its length
  let total = 0;
  const seg = [];
  for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); total += l; }
  let left = total * upto;
  const h = w >> 1;
  for (let i = 1; i < pts.length && left > 0; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    const l = seg[i - 1], use = Math.min(l, left);
    const n = Math.max(1, Math.ceil(use * 2));
    for (let j = 0; j <= n; j++) { const u = (use / l) * (j / n); rect(ctx, R(lerp(x0, x1, u)) - h, R(lerp(y0, y1, u)) - h, w, w, col); }
    left -= use;
  }
  return total;
}
function node(ctx, x, y, ring, k = 1, S = 1) {
  if (k <= 0) return;
  const r = Math.max(1, R(7 * S * k));
  disc(ctx, x + 1, y + 2, r, RAMP.ink[1]);
  disc(ctx, x, y, r, ring);
  if (r > 3) disc(ctx, x, y, r - 3, C.cream);
  if (r > 5) px(ctx, x - (r >> 1), y - (r >> 1), C.cream);
}

function drawFork(ctx, cx, cy, lt, night, S) {
  const tq = onTwos(lt);
  const ym = cy + R(18 * S), yb = cy - R(22 * S);
  const xs = [cx - R(58 * S), cx - R(22 * S), cx + R(18 * S), cx + R(56 * S)];
  const lw = R(4 * S) + (R(4 * S) % 2);
  const x0 = cx - R(76 * S), x1 = cx + R(76 * S);
  rect(ctx, x0, ym - lw / 2 + 2, x1 - x0, lw, RAMP.ink[1]);
  rect(ctx, x0, ym - lw / 2, x1 - x0, lw, C.sky);
  rect(ctx, x0, ym - lw / 2, x1 - x0, 1, '#A5CFE8');
  const pts = [];
  for (let i = 0; i <= 16; i++) { const u = i / 16; pts.push([xs[1] + u * 26 * S, ym - ((1 - Math.cos(u * Math.PI)) / 2) * (ym - yb)]); }
  pts.push([x1 + 2, yb]);
  const p = ease.outCubic(clamp(tq / 0.3));
  thickPath(ctx, pts.map(([x, y]) => [x + 1, y + 2]), lw, RAMP.ink[1], p);
  thickPath(ctx, pts, lw, C.coral, p);
  xs.forEach((x, i) => node(ctx, x, ym, C.sky, 1, S));
  const bx = [xs[2] + R(8 * S), xs[3] + R(6 * S)];
  bx.forEach((x, i) => node(ctx, x, yb, C.coral, ease.outBack(clamp((tq - 0.16 - i * 0.1) / 0.12)), S));
  if (tq > 0.3) pixelText(ctx, 'MY-IDEA', xs[2] - 4, yb - R(18 * S), C.cream, { font: 'tiny' });
  pixelText(ctx, 'MAIN', x0, ym + R(12 * S), C.sky, { font: 'tiny' });
}

function drawTrain(ctx, cx, cy, lt, night, S) {
  const tq = onTwos(lt);
  const w = R(150 * S), h = R(96 * S), x0 = R(cx - w / 2), y0 = R(cy - h / 2);
  rect(ctx, x0 + 3, y0 + 3, w, h, RAMP.ink[0]);
  rect(ctx, x0, y0, w, h, night ? RAMP.ink[1] : C.tealDeep);
  frame(ctx, x0, y0, w, h, C.sky);
  frame(ctx, x0 + 1, y0 + 1, w - 2, h - 2, RAMP.water[1]);
  pixelText(ctx, 'LOSS', x0 + 7, y0 + 6, C.sky, { font: 'small' });
  const ax = x0 + 14, ay = y0 + h - 16, aw = w - 26, ah = h - 34;
  for (let gy = 1; gy <= 3; gy++) for (let gx = ax + 2; gx < ax + aw; gx += 4) px(ctx, gx, R(ay - (ah * gy) / 4), RAMP.teal[3]);
  vline(ctx, ax, ay - ah, ay, C.cream);
  hline(ctx, ax, ax + aw, ay, C.cream);
  const p = clamp(tq / 0.42);
  const N = 48, pts = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    if (u > p) break;
    const yv = 0.06 + 0.86 * Math.exp(-3.4 * u) + (hash(i, 1, 77) - 0.5) * 0.09 * (1 - u);
    pts.push([ax + 2 + u * (aw - 4), ay - 2 - yv * (ah - 4)]);
  }
  if (pts.length > 1) {
    thickPath(ctx, pts.map(([x, y]) => [x, y + 1]), 3, RAMP.autumn[1]);
    thickPath(ctx, pts, 3, C.gold);
    const [hx, hy] = pts[pts.length - 1];
    disc(ctx, R(hx), R(hy), 3, C.cream);
  }
  const by = y0 + h - 8;
  rect(ctx, ax, by, aw, 4, RAMP.teal[2]);
  rect(ctx, ax, by, R(aw * p), 4, C.coral);
}

function drawShip(ctx, cx, cy, lt, night, t, S) {
  const tq = onTwos(lt);
  const lift = R(ease.inQuad(clamp((tq - 0.06) / 0.5)) * 40);
  const sh = shake(lt, 0, 1, 0.25, 9);
  const W = R(58 * S), H = R(46 * S);
  const bx = cx - (W >> 1) + sh.x, by = cy - (H >> 1) - 4 - lift;
  const P = [];
  for (let i = 0; i < 14; i++) {
    const a = Math.PI * (0.05 + 0.9 * (i / 13));
    const d = 8 + tq * (30 + hash(i, 1, 4) * 22);
    P.push({ x: cx + Math.cos(a) * d * (i % 2 ? 1 : -1), y: cy + H * 0.5 + 18 - Math.sin(a) * d * 0.25, r: 4 + tq * 7 + hash(i, 2, 4) * 2, level: 1, pal: night ? { shade: '#2F5F6E', body: '#4D7F95', lit: '#79AED3' } : undefined });
  }
  drawPuffs(ctx, P);
  for (const fx of [bx + R(W * 0.2), bx + (W >> 1), bx + R(W * 0.8)]) flame(ctx, fx, by + H + 1, t, 1.5, fx);
  for (let i = 0; i < 8; i++) {
    const sx = cx + (i % 2 ? 1 : -1) * (W * 0.75 + i * 4);
    const sy = R(cy - 50 + ((tq * 240 + i * 23) % 110));
    vline(ctx, R(sx), sy, sy + 8 + (i % 3) * 4, i % 2 ? C.sky : C.cream);
  }
  rect(ctx, bx + 3, by + 3, W, H, RAMP.ink[1]);
  rect(ctx, bx, by, W, H, '#C9B795');
  rect(ctx, bx, by, W, 9, '#E3CDAB');
  rect(ctx, bx, by + 9, W, 1, '#9A9787');
  rect(ctx, bx + W - 10, by + 10, 10, H - 10, '#9A9787');
  rect(ctx, bx + (W >> 1) - 4, by, 8, H, '#E3CDAB');
  rect(ctx, bx + (W >> 1) - 4, by, 8, 9, '#F2E3CB');
  const lx = bx + 6, ly = by + 18, ls = R(18 * S);
  rect(ctx, lx, ly, ls, ls, C.coral);
  const ax = lx + (ls >> 1);
  for (let i = 0; i < 5; i++) hline(ctx, ax - i, ax + i, ly + 3 + i, C.cream);
  rect(ctx, ax - 1, ly + 8, 3, ls - 11, C.cream);
  frame(ctx, bx, by, W, H, '#827F6F');
}

const c2 = (lt) => (Math.floor(lt * 15) % 2 ? 1 : 0);
function drawShow(ctx, cx, cy, lt, night, t, v, S) {
  const tq = onTwos(lt);
  const w = R(150 * S), h = R(88 * S), x0 = R(cx - w / 2), y0 = R(cy - h / 2 - 14 * S);
  const glowW = 2 + R(c2(lt) * 2);
  rect(ctx, x0 - 5 - glowW, y0 - 5 - glowW, w + 10 + glowW * 2, h + 10 + glowW * 2, C.gold);
  rect(ctx, x0 - 5 + 3, y0 - 5 + 3, w + 10, h + 10, RAMP.ink[0]);
  rect(ctx, x0 - 5, y0 - 5, w + 10, h + 10, '#E6D9C1');
  rect(ctx, x0 - 5, y0 - 5, w + 10, 2, '#FDF7EA');
  rect(ctx, x0 - 5, y0 + h + 3, w + 10, 2, '#B9B19C');
  rect(ctx, x0, y0, w, h, C.tealDeep);
  rect(ctx, x0 + 6, y0 + 6, w - 12, 10, C.coral);
  for (let i = 0; i < 3; i++) rect(ctx, x0 + 10 + i * 6, y0 + 10, 3, 3, C.cream);
  rect(ctx, x0 + 6, y0 + 16, w - 12, h - 22, night ? RAMP.ink[1] : C.tealDark);
  const cols = [C.sky, C.gold, C.coral, C.sky, C.gold];
  for (let i = 0; i < 5; i++) {
    const bh = R((16 + i * 9 + (i === 4 ? 12 : 0)) * S * ease.outBack(clamp((tq - i * 0.025) / 0.16)));
    rect(ctx, x0 + 14 + i * R(16 * S), y0 + h - 10 - bh, R(10 * S), bh, cols[i]);
  }
  const pxs = x0 + w - R(38 * S), pys = y0 + R(28 * S), pr = R(11 * S);
  disc(ctx, pxs + pr, pys + pr, pr, C.cream);
  for (let i = 0; i < 9; i++) vline(ctx, pxs + pr - 3 + i, pys + pr - (8 - i), pys + pr + (8 - i), C.coral);
  // audience: heads + clapping hands
  const n = v ? 8 : 11;
  const by = y0 + h + R(30 * S);
  for (let i = 0; i < n; i++) {
    const hx = R(cx - (n - 1) * 8 + i * 16 + (i % 2) * 2);
    const yy = by + (i % 2) * 3;
    const sk = RAMP.skin[(i * 4 + 1) % 6], hair = RAMP.hair[(i * 3) % 5];
    const top = [C.coral, C.sky, C.gold, '#5D8B3B', C.cream][i % 5];
    rect(ctx, hx - 6, yy - 2, 13, 12, top);
    rect(ctx, hx + 3, yy - 2, 4, 12, shadeHex(top));
    disc(ctx, hx, yy - 8, 5, sk[1]);
    rect(ctx, hx - 5, yy - 14, 11, 4, hair);
    rect(ctx, hx - 5, yy - 10, 2, 3, hair);
    const clap = Math.floor(lt * 10 + i) % 2;
    const ly = yy - 20 - (i % 3);
    if (clap) rect(ctx, hx - 1, ly, 4, 4, sk[1]);
    else { rect(ctx, hx - 7, ly + 1, 3, 4, sk[1]); rect(ctx, hx + 5, ly + 1, 3, 4, sk[1]); }
  }
}
