// scenes/chant-757.js (owner A) C02, cue i.1 "(Seven! Five! Seven!)".
// Giant pixel-block numerals slam into the night bay exactly on the chant hits (c.hits['i.1']): each one drops
// from above with speed streaks, lands with a squash frame, screen shake, a water splash, ripples and dust, and
// the lighthouse beam flares. 16:9: a row 7 · 5 · 7 standing in the bay. 9:16: the digits stack into a 757 tower
// (each lands on the one before; 757 reads the same either way). After the last hit they bounce on the beat.
import { C } from '../lib/palette.js';
import { clamp, ease, tween, onTwos, shake, hash } from '../lib/motion.js';
import { rect, px } from '../lib/pixel.js';
import { sparkle } from '../lib/world.js';
import { corners, plus } from '../lib/text.js';
import { bayWorld, beatT, hitsFor, passed, digitCanvas, digitSize, splash, ripple, speedLines, dustPuffs, lensFlare, BAY } from './_A-common.js';

const R = Math.round;
const FALL = 0.13;
const WATER_V = 206; // 9:16 bay line: keeps the numerals inside the social safe area // seconds of free fall before each impact (4 frames)

export default {
  id: 'chant-757',
  draw(g, t, c) {
    const v = c.fmt === '9x16';
    const hits = hitsFor(c, 'i.1', [0, 2, 4]);
    const nHit = passed(hits, t);                       // index of the last landed digit (-1 = none yet)
    const lastHit = nHit >= 0 ? hits[nHit] : -1;
    const sinceHit = nHit >= 0 ? t - lastHit : Infinity;
    // beam: faces the camera at every hit, sweeps between them
    const prevH = nHit >= 0 ? hits[nHit] : 0;
    const nextH = nHit + 1 < hits.length ? hits[nHit + 1] : prevH + (hits[1] - hits[0] || 1.2);
    const seg = clamp((t - prevH) / Math.max(0.1, nextH - prevH));
    const ang = Math.PI / 2 + (Math.max(0, nHit) + ease.inOutQuad(seg)) * Math.PI;
    // whole-frame shake on impacts (pixel units)
    if (sinceHit < 0.35) Object.assign(g.shake, shake(t, lastHit, nHit === 2 ? 4 : 3, 0.3, 11 + nHit));
    const W = bayWorld(g, t, c, {
      tod: 'night', beamAngle: ang, waterX: 0, waterFull: true, glow: 1, lhX: v ? 90 : 284,
      waterY: v ? WATER_V : undefined, headland: !v, moonAt: v ? { x: 138, y: 64, r: 9 } : undefined, shore: v ? { x0: 0, x1: 180, seed: 5 } : { x0: 0, x1: 236, seed: 5 },
      starShow: 1, starSeed: 9, clouds: v,
      gullsLeaving: 99, // the gulls are startled off by the slams (they reappear for the sunrise take-off)
    });
    // lantern flash on each impact
    if (W.lh) lensFlare(g.px, W.lh.lantern.x, W.lh.lantern.y, sinceHit < 0.4 ? 1 - sinceHit / 0.4 : 0, { len: v ? 40 : 60 });

    const L = layout(c, g);
    // draw digits (later ones on top), plus the separators
    for (let i = 0; i < 3; i++) drawDigit(g, t, c, L, i, hits[i], hits);
    // after the 3rd hit: sparkles pop around the numerals on each beat
    if (nHit >= 2) {
      const b0 = c.beat(t);
      if (b0.index >= 0 && c.beats[b0.index] >= hits[2] - 0.01) {
        for (let k = 0; k < 3; k++) {
          const sx = L.box.x0 - 6 + R(hash(b0.index, k, 3) * (L.box.x1 - L.box.x0 + 12));
          const sy = L.box.y0 - 4 + R(hash(b0.index, k, 4) * (L.box.y1 - L.box.y0) * 0.8);
          sparkle(g.px, sx, sy, t, c.beats[b0.index] + k * 0.05, { color: k === 1 ? C.sky : C.gold, size: 2, dur: 0.35 });
        }
      }
    }
    // hi layer: key-art corners stay put; gold plus pulses on the beat after the last hit
    corners(g.hi, c.fmt, { y: v ? 132 : undefined });
    if (nHit >= 2) plus(g.hi, v ? 984 : 1788, v ? 330 : 192, { scale: 0.8 + 0.4 * c.pulse(t, 0.3) });
  },
};

/** Digit slots per format (a row standing in the bay). Returns { slots: [{x, base}], bw, bh, depth, waterY, box }. */
function layout(c, g) {
  const v = c.fmt === '9x16';
  const waterY = v ? WATER_V : BAY[c.fmt].waterY;
  const bw = 9, depth = 5;
  const S = digitSize(bw, bw, depth);
  const gap = v ? 7 : 16;
  const total = S.w * 3 + gap * 2;
  const x0 = R((v ? 90 : 124) - total / 2);
  const base = waterY + (v ? 4 : 6); // feet under the surface
  const slots = [0, 1, 2].map((i) => ({ x: x0 + i * (S.w + gap), base }));
  return { slots, bw, bh: bw, depth, waterY, gap, box: { x0, x1: x0 + total, y0: base - S.h, y1: base } };
}

function drawDigit(g, t, c, L, i, hit, hits) {
  const v = c.fmt === '9x16';
  const ch = i === 1 ? '5' : '7';
  const slot = L.slots[i];
  const S = digitSize(L.bw, L.bh, L.depth);
  if (t < hit - FALL) return;
  const ctx = g.px;
  const k = t - hit;            // seconds since impact (negative = falling)
  // fall: from above the frame, accelerating, lands at the hit
  let y = slot.base - S.h;
  let bw = L.bw, bh = L.bh;
  let x = slot.x;
  if (k < 0) {
    const f = clamp((k + FALL) / FALL);
    const top = -S.h - 10;
    y = R(top + (y - top) * ease.inQuad(f));
    speedLines(ctx, x + 2, S.w - 4, y - 2, 34, 5 + i, C.sky);
  } else {
    // squash on impact (2 frames), small rebound
    const f = Math.floor(k * 30);
    if (f <= 1) { bw = L.bw + 1; bh = L.bh - 1; }
    else if (f <= 3) { bw = L.bw; bh = L.bh; y -= 1; }
    // after the last hit: bounce on every beat (staggered per digit for a ripple)
    if (k > 0.2 && t >= hits[2]) {
      const p = c.pulse(t - i * 0.05, 0.16);
      if (p > 0.55) y -= 1;
    }
    const Sq = digitSize(bw, bh, L.depth);
    x = slot.x - R((Sq.w - S.w) / 2);
    y = slot.base - Sq.h + (y - (slot.base - S.h));
  }
  const cv = digitCanvas(ch, bw, bh, L.depth, 'cream');
  // in the bay: hide the part under the water line (16:9 and the bottom digit in 9:16) with a little foam lip
  const inWater = true;
  if (inWater && k >= 0) {
    const cut = L.waterY + 1 - y;
    ctx.drawImage(cv, 0, 0, cv.width, Math.max(0, cut), x, y, cv.width, Math.max(0, cut));
    const tq = onTwos(t);
    for (let xx = x - 1; xx < x + cv.width + 1; xx++) if (hash(xx, Math.floor(tq * 8), 7) > 0.35) px(ctx, xx, L.waterY + 1, hash(xx, 3, 1) > 0.5 ? '#C1E2F2' : '#A5CFE8');
  } else {
    ctx.drawImage(cv, x, y);
  }
  if (k >= 0) {
    const base = inWater ? L.waterY + 1 : slot.base;
    if (inWater) {
      splash(ctx, x, base, cv.width, k, { seed: 3 + i * 7, n: v ? 22 : 30 });
      ripple(ctx, x + cv.width / 2, base + 1, cv.width, k, { speed: v ? 60 : 110 });
    } else {
      dustPuffs(ctx, x, x + cv.width, slot.base + 1, k, { life: 0.45 });
    }
  }
  // separators (16:9): coral blocks pop between the digits with the 2nd / 3rd hits
  if (i > 0 && t >= hit) {
    const prev = L.slots[i - 1];
    const q = v ? 4 : 6;
    const sx = prev.x + S.w + R((L.gap - q) / 2) + 1, sy = slot.base - R(S.h * 0.55) - 3;
    const pk = Math.floor((t - hit) * 30);
    const s = pk < 1 ? q + 2 : q;
    rect(ctx, sx - (s - q) / 2, sy - (s - q) / 2, s, s, C.coral);
    rect(ctx, sx + 1, sy + q, q, 1, '#AD5E52');
    rect(ctx, sx + q, sy + 1, 1, q, '#AD5E52');
  }
}
