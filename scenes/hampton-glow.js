// scenes/hampton-glow.js (owner D) C16 (ch.8) and C30 (ch2.8, variant 2).
// "Hampton's 'bout to glow, and you know it!" - the Hampton waterfront at dusk: a skyline of teal silhouettes (with
// the launch tower from C12 among them) lights up window by window, faster and faster, reflections streak across the
// bay, and on the last beat ("know it!") the lighthouse flares and sparkles pop over the city.
// Variant 2: full night, stars, every window already warming up, fireworks over the skyline on every beat.
import { C, RAMP, SKY } from '../lib/palette.js';
import { clamp, ease, onTwos, hash } from '../lib/motion.js';
import { rect, px, bands, vline } from '../lib/pixel.js';
import { water, headland, sun, stars, cloud, sparkle, haloDisc, seawall, gull } from '../lib/world.js';
import { eyebrow, corners, plus, anim } from '../lib/text.js';
import { chLine, beatLen, beatsIn, skyline, firework, twinkle, gantry, lightPoly, R } from './_D-kit.js';

const LAYOUT = {
  '16x9': {
    horizon: 122, sky: 122, city: { x0: -4, x1: 232, tall: 1.0, seed: 11 }, lh: { x: 278, base: 120, h: 80 },
    sun: { x: 74, y: 116, r: 11 }, tower: 150, eyebrow: [162, 126], plus: [1788, 192],
    fw: [[60, 34], [150, 22], [210, 48], [110, 56], [250, 20], [30, 60]],
    clouds: [{ kind: 'twoTone', x: 120, y: 30 }, { kind: 'wisp', x: 206, y: 64 }, { kind: 'small', x: 16, y: 44 }],
  },
  '9x16': {
    horizon: 198, sky: 198, city: { x0: -4, x1: 130, tall: 1.8, seed: 7 }, lh: { x: 150, base: 196, h: 96 },
    sun: { x: 60, y: 190, r: 10 }, tower: 96, eyebrow: [80, 276], plus: [960, 330],
    fw: [[50, 70], [130, 50], [90, 110], [30, 130], [150, 100], [100, 30]],
    clouds: [{ kind: 'twoTone', x: 90, y: 88 }, { kind: 'small', x: 10, y: 120 }, { kind: 'wisp', x: 100, y: 150 }],
  },
};

function timing(c) {
  const bl = beatLen(c);
  const B = beatsIn(c, 0.15, c.dur - 0.1);
  // the last beat inside the clip is "know it!": everything full + lighthouse flare
  const tFlare = B.length ? B[B.length - 1] : Math.max(0.3, c.dur - bl);
  return { bl, B, tFlare, tFull: Math.max(0.3, tFlare - 0.05) };
}

export default {
  id: 'hampton-glow',
  draw(g, t, c) {
    const v = c.fmt === '9x16';
    const night = c.variant === 2;
    const L = LAYOUT[c.fmt];
    const T = timing(c);
    const { px: ctx, PW, PH } = g;
    const tq = onTwos(t);

    // ---- sky: dusk bands (variant 2: night) + first stars
    if (night) {
      bands(ctx, 0, 0, PW, L.sky, SKY.night, { blend: 2 });
      stars(ctx, t, { h: L.sky - 20, seed: 17, big: 0.12 });
    } else {
      bands(ctx, 0, 0, PW, L.sky, SKY.dusk, { blend: 2, stops: [0, 0.22, 0.4, 0.55, 0.7, 0.82, 0.92] });
      stars(ctx, t, { h: R(L.sky * 0.32), seed: 17, show: 0.5 + 0.5 * clamp(t / T.tFull), big: 0.05 });
      sun(ctx, L.sun.x, L.sun.y, L.sun.r, { t, rays: false });
      for (const cl of L.clouds) cloud(ctx, R(cl.x + ((tq * 1.5) % 20)), cl.y, { kind: cl.kind, tod: 'dusk' });
    }

    // ---- water first (reflections of the lit city)
    const sk = skyline(`${c.fmt}|${night ? 'n' : 'd'}`, PW, PH, L.city.x0, L.city.x1, L.horizon, { seed: L.city.seed, tall: L.city.tall, night });
    const N = sk.windows.length;
    const k = clamp(t / T.tFull);
    const lit = Math.floor(N * (night ? 0.25 + 0.75 * ease.inQuad(k) : 0.04 + 0.96 * Math.pow(k, 1.7)) + 1e-6);
    const litQ = t >= T.tFlare ? N : Math.min(N, lit - (lit % 2));
    const glints = [];
    for (const b of sk.blds) {
      const share = sk.windows.filter((w) => w.x >= b.x && w.x < b.x + b.w).slice(0, 1)[0];
      if (share && share.order * N < litQ && b.depth === 0 && b.h > 22) glints.push({ x: b.x + (b.w >> 1), color: hash(b.x, 1, 3) < 0.5 ? C.gold : '#F8CC87', w: Math.max(3, b.w >> 2) });
    }
    if (!night) glints.push({ x: L.sun.x, color: C.gold, w: 10 });
    glints.push({ x: L.lh.x, color: C.gold, w: 8 });
    water(ctx, t, { x: 0, y: L.horizon + 2, w: PW, h: PH - L.horizon - 2, tod: 'night', seed: 6, fade: 'none', glints });

    // ---- city: launch tower callback, skyline silhouettes, windows
    gantry(ctx, L.tower, L.horizon - 34, L.horizon, { night: true, beacon: c.pulse(t, 0.2) > 0.4 });
    ctx.drawImage(sk.canvas, 0, 0);
    for (let i = 0; i < litQ; i++) {
      const w = sk.windows[i];
      const hot = hash(w.x, w.y, 5);
      rect(ctx, w.x, w.y, w.w, w.h, hot < 0.18 ? C.cream : hot < 0.6 ? C.gold : '#F8CC87');
    }
    // the newest windows sparkle as they switch on
    for (let j = 0; j < 6; j++) {
      const i = litQ - 1 - j * 7;
      if (i < 0 || i >= N || t >= T.tFlare + 0.3) continue;
      const w = sk.windows[i];
      if (hash(i, 2, 9) < 0.5) sparkle(ctx, w.x, w.y, t, t - 0.05, { size: 1, dur: 0.2, color: C.gold });
    }
    seawall(ctx, -2, L.horizon, PW + 4, 4, { tod: 'night', seed: 3 });

    // ---- lighthouse headland (right), beam sweeping, flare on the last beat
    const flareK = t >= T.tFlare ? Math.max(0, 1 - (t - T.tFlare) / 0.6) : 0;
    const a = headland(ctx, L.lh.x, L.lh.base, {
      t, tod: night ? 'night' : 'dusk', h: L.lh.h, glow: 1, beam: true, beamLen: v ? 110 : 150,
      beamAngle: onTwos(t) * (night ? 3.2 : 2.2) + 0.8, beamStrength: night ? 1 : 0.7,
    });
    if (flareK > 0) {
      const lx = a.lantern.x, ly = a.lantern.y;
      lightPoly(ctx, [[lx - R(70 * flareK), ly], [lx, ly - 3], [lx + R(70 * flareK), ly], [lx, ly + 3]], '#3A3320');
      // pixel star-flare: long horizontal + vertical arms, short diagonals
      const L1 = R(10 + 40 * flareK), L2 = R(6 + 18 * flareK), L3 = R(3 + 8 * flareK);
      rect(ctx, lx - L1, ly, L1 * 2 + 1, 1, C.gold); rect(ctx, lx - R(L1 * 0.6), ly, R(L1 * 1.2) + 1, 1, C.cream);
      rect(ctx, lx, ly - L2, 1, L2 * 2 + 1, C.gold); rect(ctx, lx, ly - R(L2 * 0.6), 1, R(L2 * 1.2) + 1, C.cream);
      for (let i = 1; i <= L3; i++) { px(ctx, lx - i, ly - i, C.gold); px(ctx, lx + i, ly - i, C.gold); px(ctx, lx - i, ly + i, C.gold); px(ctx, lx + i, ly + i, C.gold); }
      rect(ctx, lx - 2, ly - 2, 5, 5, C.cream);
    }
    // gulls heading home
    for (let i = 0; i < 3; i++) gull(ctx, R((v ? 30 : 180) + i * 12 - tq * 10), (v ? 160 : 70) + (i % 2) * 6, t, { tod: 'dusk', phase: i * 0.3, rate: 2.4, color: C.cream });

    // ---- sparkles over the city on every beat, a big shower on the flare
    T.B.forEach((b, bi) => {
      for (let i = 0; i < 4; i++) {
        const sx = R(L.city.x0 + 10 + hash(bi, i, 41) * (L.city.x1 - L.city.x0 - 20));
        const sy = R(L.horizon - 30 * L.city.tall - 10 - hash(bi, i + 9, 41) * 30);
        sparkle(ctx, sx, sy, t, b + i * 0.04, { size: 2, dur: 0.35, color: i % 2 ? C.gold : C.cream });
      }
    });
    if (t >= T.tFlare) {
      for (let i = 0; i < 14; i++) {
        const sx = R(hash(i, 1, 51) * PW), sy = R(hash(i, 2, 51) * (L.horizon - 20));
        sparkle(ctx, sx, sy, t, T.tFlare + (i % 5) * 0.04, { size: 2, dur: 0.45, color: [C.gold, C.cream, C.sky][i % 3] });
      }
    }
    if (night) {
      const shots = [0.02, ...T.B.map((b) => b), ...T.B.map((b) => b + T.bl / 2)].sort((x, y) => x - y);
      shots.forEach((s, i) => {
        const [fx, fy] = L.fw[i % L.fw.length];
        firework(ctx, fx, fy, t, s, { seed: 91 + i, colors: [[C.gold, C.cream, C.coral], [C.sky, C.cream, C.gold], [C.coral, C.gold, C.cream]][i % 3], n: i % 2 ? 26 : 44, speed: i % 2 ? 40 : 58, life: 1.1, rise: 0.3, fromY: L.horizon - 10 });
      });
      for (let i = 0; i < 10; i++) twinkle(ctx, R(hash(i, 1, 63) * PW), R(hash(i, 2, 63) * L.horizon * 0.6), t, { period: 0.6 + hash(i, 3, 63) * 0.4, phase: hash(i, 4, 63), size: 2 });
    }

    // ---- type: key-art corners + eyebrow (where we are)
    const { hi } = g;
    corners(hi, c.fmt, { y: v ? 132 : undefined });
    plus(hi, L.plus[0], L.plus[1], { scale: 0.8 + 0.4 * Math.max(c.pulse(t, 0.3), flareK) });
    const label = `${c.facts.venue.city}, ${c.facts.venue.state}`.toUpperCase();
    const [ex, ey] = L.eyebrow;
    anim(hi, t, { t0: Math.min(0.05, c.dur * 0.1), x: ex, y: ey, enter: 'slide-right', dist: 48 }, (h) => eyebrow(h, label, ex, ey, { size: v ? 34 : 36 }));
  },
};
