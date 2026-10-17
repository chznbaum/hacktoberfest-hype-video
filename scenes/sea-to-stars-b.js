// scenes/sea-to-stars-b.js (owner D) C14 (ch.5-ch.6) and C28 (ch2.5-ch2.6, variant 2).
// "From the sea to the stars (Hey!) / Hacktoberfest in the Seven-Five-Seven!" - the second angle: we are already in
// space. The bay is now a curve of blue earth at the bottom, a huge cratered moon hangs in the stars and the pixel
// rocket climbs right across its face (silhouette moment on "Hey!"), then the title lockup stamps in on ch.6,
// mirrored against C12 (right-aligned in 16:9, centred under the moon in 9:16).
// Variant 2: the earth's night side twinkles with city lights, fireworks pop around the moon, more sparkles.
import { C, SKY } from '../lib/palette.js';
import { clamp, lerp, ease, onTwos, hash } from '../lib/motion.js';
import { bands, px, rect } from '../lib/pixel.js';
import { stars, sparkle, haloDisc } from '../lib/world.js';
import { titleLockup, corners, plus, fitSize, flash } from '../lib/text.js';
import { chLine, chHits, beatLen, beatAfter, beatsIn, rocket, firework, twinkle, bigMoon, earthLimb, speedStreaks, R } from './_D-kit.js';

const LAYOUT = {
  '16x9': {
    moon: { x: 62, y: 76, r: 40 }, rx: 62, y0: 196, yEnd: -40,
    earth: { cx: 160, cy: 712, r: 566 },
    title: { x: 1824, y: 300, align: 'right', maxW: 1180, max: 236 },
    plus: [1788, 192],
    fw: [[150, 36], [280, 120], [200, 150], [120, 130], [300, 40], [240, 24]],
  },
  '9x16': {
    moon: { x: 92, y: 104, r: 46 }, rx: 92, y0: 336, yEnd: -40,
    earth: { cx: 90, cy: 860, r: 590 },
    title: { x: 540, y: 950, align: 'center', maxW: 920, max: 200 },
    plus: [960, 330],
    fw: [[30, 60], [150, 190], [24, 200], [156, 50], [60, 250], [130, 240]],
  },
};

function timing(c) {
  const bl = beatLen(c);
  const l6 = chLine(c, 6);
  const tTitle = chHits(c, 6)[0] ?? (l6 ? l6.start : Math.min(c.dur * 0.5, 4 * bl));
  const hey = chHits(c, 5)[0] ?? Math.max(0.4, tTitle - bl * 0.5);
  const tTitle2 = Math.min(beatAfter(c, tTitle + 0.05, 1), Math.max(tTitle + 0.3, c.dur - 0.5));
  return { bl, tTitle, hey, tTitle2 };
}

/** Rocket top row (screen): climbs from below the frame, crosses the moon's centre exactly on "Hey!", exits up. */
function rocketY(t, T, L, c) {
  const yMoon = L.moon.y - 11;
  // constant climb speed, so it crosses the moon's centre exactly on the beat of "Hey!" and keeps going
  const v = (yMoon - L.y0) / Math.max(0.2, T.hey);
  return Math.max(L.yEnd, L.y0 + v * t);
}

export default {
  id: 'sea-to-stars-b',
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
  // deep space: darkest night bands
  bands(ctx, 0, 0, PW, PH, [SKY.night[0], SKY.night[0], SKY.night[1], SKY.night[2], SKY.night[3]], { blend: 2 });
  // stars scroll down (we are climbing); two layers for parallax
  const sp1 = night ? 16 : 10, sp2 = night ? 34 : 22;
  for (const [sp, seed, cnt, big] of [[sp1, 51, 1, 0.04], [sp2, 52, 0.45, 0.12]]) {
    const off = R((tq * sp) % PH);
    for (const yy of [off - PH, off]) stars(ctx, t, { x: 0, y: yy, w: PW, h: PH, seed, count: R((PW * PH * cnt) / 300), big });
  }
  // streaks while the rocket is climbing fast

  // the earth limb (the bay we came from) sinking away
  const sink = R(Math.min(26, t * 5));
  earthLimb(ctx, L.earth.cx, L.earth.cy, L.earth.r, PW, PH, { night, oy: sink });
  if (night) {
    // city lights on the night side (Hampton Roads twinkles)
    for (let i = 0; i < 26; i++) {
      const a = -Math.PI / 2 + (hash(i, 1, 71) - 0.5) * (v ? 0.32 : 0.55);
      const d = L.earth.r - 3 - hash(i, 2, 71) * 9;
      const x = R(L.earth.cx + Math.cos(a) * d), y = R(L.earth.cy + Math.sin(a) * d) + sink;
      if (y >= PH || hash(i, Math.floor(tq * 4), 72) < 0.15) continue;
      px(ctx, x, y, hash(i, 3, 71) < 0.3 ? C.cream : C.gold);
    }
  }

  // the moon (slow drift down = parallax), halo pulses on beats
  const M = L.moon;
  const my = M.y + R(Math.min(6, t * 1.2));
  const heyK = t >= T.hey ? Math.max(0, 1 - (t - T.hey) / 0.5) : 0;
  bigMoon(ctx, M.x, my, M.r, { halo: 0.8 + c.pulse(t, 0.3) * 0.6 + heyK * 1.5 });
  if (heyK > 0) haloDisc(ctx, M.x, my, M.r + 10, C.cream, 0.1 * heyK);

  // fireworks around the moon (variant 2)
  if (night) {
    const bl = T.bl;
    const shots = [0.02, T.hey, T.hey + bl * 0.5, T.tTitle, T.tTitle2, T.tTitle2 + bl * 0.5];
    for (const b of beatsIn(c, T.tTitle2 + 0.1, c.dur + 1)) shots.push(b, b + bl * 0.5);
    shots.forEach((s, i) => {
      const [fx, fy] = L.fw[i % L.fw.length];
      const cols = [[C.gold, C.cream, C.coral], [C.sky, C.cream, C.gold], [C.coral, C.gold, C.cream]][i % 3];
      firework(ctx, fx, fy, t, s, { seed: 61 + i, colors: cols, n: i % 2 ? 26 : 44, speed: i % 2 ? 40 : 58, life: 1.1, rise: 0.28, fromY: fy + 60 });
    });
  }

  // rocket + sparkling exhaust (space has no smoke: a trail of embers)
  const ry = R(rocketY(t, T, L, c));
  const step = 1 / 30;
  for (let te = Math.max(0, Math.ceil((t - 0.9) / step) * step); te <= t + 1e-6; te += step) {
    const i = Math.round(te / step);
    const age = t - te;
    const ey = rocketY(te, T, L, c) + 24 + age * 30;
    const ex = L.rx + R((hash(i, 1, 8) - 0.5) * (2 + age * 10));
    if (hash(i, 2, 8) > 1 - age * 1.1) continue;
    const col = age < 0.15 ? '#FFF1C9' : age < 0.35 ? C.gold : age < 0.6 ? C.coral : C.sky;
    px(ctx, ex, R(ey), col);
    if (age < 0.2) px(ctx, ex, R(ey) + 1, C.gold);
  }
  if (ry < PH + 4 && ry > -30) rocket(ctx, L.rx, ry, { t, flame: 1.2, outline: true, seed: 11 });

  // Hey!: sparkle ring around the moon
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.3;
    const d = M.r + 6 + (i % 2) * 5;
    sparkle(ctx, R(M.x + Math.cos(a) * d), R(my + Math.sin(a) * d), t, T.hey + i * 0.035, { size: 2, dur: 0.45, color: i % 2 ? C.gold : C.sky });
  }
  // steady twinkles (more at night)
  const n = night ? 12 : 6;
  for (let i = 0; i < n; i++) {
    const sx = R(hash(i, 1, 81) * PW), sy = R(hash(i, 2, 81) * PH * 0.7);
    if (Math.hypot(sx - M.x, sy - my) < M.r + 4) continue;
    twinkle(ctx, sx, sy, t, { period: 0.7 + hash(i, 3, 81) * 0.6, phase: hash(i, 4, 81), size: 2, color: i % 3 ? C.gold : C.cream });
  }
}

function drawType(g, t, c, L, T, night, v) {
  const { hi } = g;
  corners(hi, c.fmt, { show: clamp(t / 0.3), y: v ? 132 : undefined });
  const pl = c.pulse(t, 0.35);
  plus(hi, L.plus[0], L.plus[1], { scale: night ? 0.8 + 0.5 * Math.max(pl, c.pulse(t + T.bl / 2, 0.2)) : 0.8 + 0.4 * pl });
  const Ti = L.title;
  const size = fitSize(hi, 'Hacktoberfest', Ti.maxW, { role: 'display', maxSize: Ti.max });
  titleLockup(hi, Ti.x, Ti.y, { size, align: Ti.align, t, t0: T.tTitle, stagger: T.tTitle2 - T.tTitle, lines: [true, false, true] });
  if (night) {
    for (const [t0, a] of [[T.hey, 0.25], [T.tTitle, 0.2], [T.tTitle2, 0.14]]) {
      const f = (t - t0) * 30;
      if (f >= 0 && f < 3) flash(hi, g.W, g.H, a * (1 - f / 3));
    }
  }
}
