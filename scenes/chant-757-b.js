// scenes/chant-757-b.js (owner A) C25, cues br.3-br.4 "(Seven! Five! Seven!) x2".
// Night chant variation, building tension into the final chorus. Round 1 (br.3 hits): each digit draws itself as a
// constellation (stars pop at the vertices, star-lines trace between them). Round 2 (br.4 hits): each digit ignites
// as a neon tube (cream core, sky tube, dithered glow, ignition flicker). The camera keeps tilting up off the bay
// into the stars (lead-in to "from the sea to the stars"), the lighthouse beam spins faster with every hit and the
// last beat flickers, shakes and flares into the cut.
import { C } from '../lib/palette.js';
import { clamp, ease, tween, onTwos, hash, shake } from '../lib/motion.js';
import { rect, px, dither, makeCanvas } from '../lib/pixel.js';
import { sparkle } from '../lib/world.js';
import { corners, plus, flash } from '../lib/text.js';
import { bayWorld, beatAfter, hitsFor, passed, lensFlare } from './_A-common.js';

const R = Math.round;

// digit strokes in a 4 x 10 unit box (polylines)
const STROKES = {
  7: [[[0, 0], [4, 0], [1.6, 10]]],
  5: [[[4, 0], [0, 0], [0, 4.4], [2.8, 4.4], [4, 5.6], [4, 8.6], [2.8, 10], [0, 10]]],
};
const STARS = { // vertices that get a star (plus a midpoint star on long strokes)
  7: [[0, 0], [4, 0], [2.8, 5], [1.6, 10]],
  5: [[4, 0], [0, 0], [0, 4.4], [2.8, 4.4], [4, 5.6], [4, 8.6], [2.8, 10], [0, 10]],
};

export default {
  id: 'chant-757-b',
  draw(g, t, c) {
    const v = c.fmt === '9x16';
    const h3 = hitsFor(c, 'br.3', [0, 1, 2]);
    const h4 = hitsFor(c, 'br.4', [4, 5, 6]);
    const all = [...h3, ...h4];
    const n = passed(all, t);
    const lastBeat = Math.min(beatAfter(c, h4[2] + 0.05, 0), h4[2] + 0.5 * (c.dur - h4[2]));
    const end = c.dur;
    // camera: steady tilt up into the sky, accelerating in the last beat
    const k = clamp(t / Math.max(0.5, end));
    const oy = R((v ? 70 : 46) * ease.inQuad(k) + (t > lastBeat ? (t - lastBeat) / Math.max(0.1, end - lastBeat) * (v ? 30 : 20) : 0));
    // beam: faster each hit
    const spin = 1.2 + Math.max(0, n) * 0.55;
    const ang = Math.PI / 2 + onTwos(t) * spin * 2.2;
    const sinceHit = n >= 0 ? t - all[n] : 9;
    if (n >= 3 && sinceHit < 0.25) Object.assign(g.shake, shake(t, all[n], 2, 0.2, 31 + n));
    if (t > lastBeat) Object.assign(g.shake, shake(t, lastBeat + Math.floor((t - lastBeat) * 15) / 15, 1, 0.07, 77));
    const W = bayWorld(g, t, c, {
      tod: 'night', oy, beamAngle: ang, waterX: 0, waterFull: true, starSeed: 41, starShow: 1,
      moonAt: v ? { x: 164, y: 168, r: 6 } : { x: 290, y: 18, r: 7 },
      shore: { x0: 0, x1: v ? 70 : 196, seed: 9 },
    });
    if (W.lh) lensFlare(g.px, W.lh.lantern.x, W.lh.lantern.y, Math.max(sinceHit < 0.3 ? (1 - sinceHit / 0.3) * 0.7 : 0, t > lastBeat ? tween(t, lastBeat, end - lastBeat) : 0), { len: v ? 50 : 80 });

    // constellation digits (move with the star layer: parallax 0.45)
    const D = v ? { x0: 22, y0: 52, w: 38, h: 70, gap: 13 } : { x0: 46, y0: 18, w: 34, h: 62, gap: 20 };
    const sy = R(oy * 0.45);
    for (let i = 0; i < 3; i++) {
      const ch = i === 1 ? '5' : '7';
      const ox = D.x0 + i * (D.w + D.gap), oyD = D.y0 + sy;
      const map = ([u, w]) => [R(ox + (u / 4) * D.w), R(oyD + (w / 10) * D.h)];
      const tDraw = h3[i], tNeon = h4[i];
      if (t >= tDraw) {
        const kd = clamp((t - tDraw) / 0.22);
        const neon = t >= tNeon ? neonState(t - tNeon, t > lastBeat ? t - lastBeat : -1, i) : 0;
        drawDigit(g.px, STROKES[ch], STARS[ch], map, kd, neon, t, tDraw, i);
      }
    }
    // tension sparks on the last beat: stars around the digits flicker
    if (t > lastBeat) for (let j = 0; j < 6; j++) {
      const x = R(D.x0 - 8 + hash(j, Math.floor(t * 15), 5) * (3 * D.w + 2 * D.gap + 16));
      const y = R(D.y0 + sy - 6 + hash(j, Math.floor(t * 15), 6) * (D.h + 12));
      px(g.px, x, y, j % 2 ? C.cream : C.gold);
    }

    // type layer: corners, a gold plus that pulses with the chant; white-out flare into the chorus
    const hi = g.hi;
    corners(hi, c.fmt, { y: v ? 132 : undefined });
    plus(hi, v ? 984 : 1788, v ? 330 : 192, { scale: n >= 0 ? 0.8 + 0.5 * c.pulse(t, 0.25) : 0 });
    if (t > lastBeat) {
      const fk = tween(t, lastBeat + (end - lastBeat) * 0.55, (end - lastBeat) * 0.45);
      if (fk > 0) flash(hi, g.W, g.H, Math.ceil(fk * 4) / 4 * 0.5, C.cream);
    }
  },
};

/** 0 = off, 1 = on; ignition flicker (on, off, on) then steady; fast flicker during the last beat. */
function neonState(k, kEnd, i) {
  const f = Math.floor(k * 30);
  if (f === 1 || f === 3) return 0.35;
  if (kEnd >= 0) {
    const ff = Math.floor(kEnd * 15);
    if (hash(ff, i, 3) < 0.22) return 0.35;
  }
  return 1;
}

let glowBuf = null;
function drawDigit(ctx, strokes, stars, map, kd, neon, t, tDraw, i) {
  // star-lines (constellation): dotted sky lines that trace from the first vertex
  const segs = [];
  for (const pl of strokes) for (let j = 0; j + 1 < pl.length; j++) segs.push([map(pl[j]), map(pl[j + 1])]);
  const total = segs.reduce((a, [p, q]) => a + Math.hypot(q[0] - p[0], q[1] - p[1]), 0);
  let budget = total * ease.outCubic(kd);
  if (neon > 0) {
    // glow: thick path into a buffer, dithered over the sky
    const W = ctx.canvas.width, H = ctx.canvas.height;
    if (!glowBuf || glowBuf.canvas.width !== W || glowBuf.canvas.height !== H) glowBuf = makeCanvas(W, H);
    const b = glowBuf.ctx;
    b.reset(); b.imageSmoothingEnabled = false;
    for (const [p, q] of segs) thick(b, p, q, 11, '#2B6A80');
    b.globalCompositeOperation = 'destination-in';
    dither(b, 0, 0, W, H, null, '#000', neon >= 1 ? 0.25 : 0.12);
    b.globalCompositeOperation = 'source-over';
    // inner glow: denser checker in the tube colour
    for (const [p, q] of segs) thick(b, p, q, 7, null, '#3F8ABD');
    for (const [p, q] of segs) thick(b, p, q, 5, '#2B6A80');
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.drawImage(glowBuf.canvas, 0, 0);
    ctx.restore();
    if (neon >= 1) {
      for (const [p, q] of segs) thick(ctx, p, q, 3, C.sky);
      for (const [p, q] of segs) thick(ctx, p, q, 1, C.cream);
    } else {
      for (const [p, q] of segs) thick(ctx, p, q, 3, '#2B6A80');
    }
  } else {
    for (const [p, q] of segs) {
      const L = Math.hypot(q[0] - p[0], q[1] - p[1]);
      const f = clamp(budget / L);
      budget -= L;
      if (f <= 0) break;
      const e = [R(p[0] + (q[0] - p[0]) * f), R(p[1] + (q[1] - p[1]) * f)];
      dotted(ctx, p, e, (hash(i, 1, 1) * 3) | 0, '#79AED3');
    }
  }
  // stars at the vertices: pop in sequence, then twinkle
  stars.forEach((sv, j) => {
    const [x, y] = map(sv);
    const tj = tDraw + j * 0.035;
    if (t < tj) return;
    sparkle(ctx, x, y, t, tj, { color: C.gold, size: 2, dur: 0.3 });
    if (t >= tj + 0.3 || neon > 0) {
      const tw = Math.sin(onTwos(t) * (3 + j) + j * 2);
      px(ctx, x, y, C.cream);
      if (tw > 0.2 || neon >= 1) { px(ctx, x - 1, y, C.gold); px(ctx, x + 1, y, C.gold); px(ctx, x, y - 1, C.gold); px(ctx, x, y + 1, C.gold); }
    }
  });
}
function dotted(ctx, p, q, phase, col) {
  const n = Math.max(1, Math.round(Math.max(Math.abs(q[0] - p[0]), Math.abs(q[1] - p[1]))));
  for (let s = 0; s <= n; s++) {
    if ((s + phase) % 3 === 2) continue;
    px(ctx, R(p[0] + ((q[0] - p[0]) * s) / n), R(p[1] + ((q[1] - p[1]) * s) / n), col);
  }
}
function thick(ctx, p, q, w, col, checkerCol) {
  const n = Math.max(1, Math.round(Math.max(Math.abs(q[0] - p[0]), Math.abs(q[1] - p[1]))));
  const h = Math.floor(w / 2);
  if (checkerCol) {
    // 50% checker ring (canvas-anchored so it never swims)
    ctx.fillStyle = checkerCol;
    for (let s = 0; s <= n; s++) {
      const x = R(p[0] + ((q[0] - p[0]) * s) / n), y = R(p[1] + ((q[1] - p[1]) * s) / n);
      for (let yy = y - h; yy <= y + h; yy++) for (let xx = x - h; xx <= x + h; xx++) if (((xx + yy) & 1) === 0) ctx.fillRect(xx, yy, 1, 1);
    }
    return;
  }
  ctx.fillStyle = col;
  for (let s = 0; s <= n; s++) {
    const x = R(p[0] + ((q[0] - p[0]) * s) / n), y = R(p[1] + ((q[1] - p[1]) * s) / n);
    ctx.fillRect(x - h, y - h, w, w);
  }
}
