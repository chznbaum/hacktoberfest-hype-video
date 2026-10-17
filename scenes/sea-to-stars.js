// scenes/sea-to-stars.js (owner D) C12 (ch.1-ch.2) and C26 (ch2.1-ch2.2, variant 2).
// "From the sea to the stars (Hey!) / Hacktoberfest in the Seven-Five-Seven!"
// The key art comes alive: the lighthouse headland on the bay, a pixel rocket (NASA Langley nod) ignites behind the
// trees and lifts off on the first downbeat; the camera tilts from the bay up into the stars, the rocket punches
// through a cloud on "Hey!" (stars switch on), and the title lockup Hacktoberfest / in the 757 stamps in on ch.2.
// Variant 2 (final chorus): night, lantern beam, fireworks on Hey! and the title, more sparkles.
import { C, RAMP, SKY } from '../lib/palette.js';
import { clamp, lerp, ease, onTwos, hash, shake } from '../lib/motion.js';
import { bands, px } from '../lib/pixel.js';
import { water, headland, cloud, gull, stars, moon, sparkle, haloDisc } from '../lib/world.js';
import { titleLockup, corners, plus, fitSize, flash } from '../lib/text.js';
import { chLine, chHits, beatLen, beatAfter, beatsIn, rocket, puff, drawPuffs, gantry, SMOKE_DAY, SMOKE_NIGHT, firework, twinkle, R } from './_D-kit.js';

const LAYOUT = {
  '16x9': {
    lh: { x: 258, base: 124, h: 104 }, water: { x: 160, y: 131, fadeW: 64 }, tilt: 124, skyLow: 6, starLow: -14,
    rx: 292, pad: 70, yHey: 44, yTitle: 32, yEnd: 6, plus: [1176, 186],
    clouds: [{ kind: 'twoTone', x: 190, y: 74, v: 0.8 }, { kind: 'small', x: 226, y: 28, v: 0.5 }, { kind: 'wisp', x: 40, y: 60, v: 0.4 }],
    gulls: [{ x: 228, y: 62, p: 0 }, { x: 240, y: 72, p: 0.4 }, { x: 186, y: 94, p: 0.7 }],
    moon: { x: 52, y: -94, r: 7 }, // world coords (above the start frame)
    fw: [[236, 30], [60, 22], [250, 70], [150, 14], [110, 150], [214, 140], [30, 140], [180, 34]],
    nightMoon: { x: 206, y: 26 },
  },
  '9x16': {
    lh: { x: 92, base: 262, h: 118 }, water: { x: 0, y: 270, fadeW: 40 }, tilt: 132, skyLow: 96, starLow: 70,
    rx: 136, pad: 204, yHey: 172, yTitle: 158, yEnd: 126, plus: [960, 330],
    clouds: [{ kind: 'big', x: -10, y: 176, v: 1.0 }, { kind: 'small', x: 120, y: 112, v: 0.5 }, { kind: 'wisp', x: 20, y: 96, v: 0.4 }],
    gulls: [{ x: 40, y: 200, p: 0 }, { x: 51, y: 209, p: 0.4 }, { x: 70, y: 160, p: 0.7 }],
    moon: { x: 118, y: -104, r: 7 },
    fw: [[60, 140], [140, 60], [36, 196], [120, 132], [50, 40], [150, 200], [96, 176], [30, 90]],
    nightMoon: { x: 36, y: 150 },
  },
};

/** Clip timing on the chorus cues (with fallbacks for standalone renders). */
function timing(c) {
  const bl = beatLen(c);
  const l2 = chLine(c, 2);
  const tTitle = chHits(c, 2)[0] ?? (l2 ? l2.start : Math.min(c.dur * 0.45, 4 * bl));
  const hey = chHits(c, 1)[0] ?? Math.max(0.5, tTitle - bl);
  // lift-off on the first downbeat after the pickup (fallback: beat 1)
  let lift = (c.bars || []).find((b) => b > 0.15 && b < hey - 0.2);
  if (lift === undefined) lift = Math.min(beatAfter(c, 0.1, 0), hey * 0.5);
  const tTitle2 = Math.min(beatAfter(c, tTitle + 0.05, 1) + 0.0, Math.max(tTitle + 0.3, c.dur - 0.5));
  return { bl, tTitle, hey, lift, tTitle2, ign: Math.max(0, lift - Math.min(0.6, lift)) };
}

export default {
  id: 'sea-to-stars',
  draw(g, t, c) {
    const v = c.fmt === '9x16';
    const night = c.variant === 2;
    const L = LAYOUT[c.fmt];
    const T = timing(c);
    const cam = (tt) => camera(tt, T, L, c);
    const oy = cam(t);
    drawWorld(g, t, c, L, T, oy, cam, night);
    drawType(g, t, c, L, T, night, v);
  },
};

// ------------------------------------------------------------------ motion paths
function camera(t, T, L, c) {
  const k = clamp((t - (T.lift - 0.08)) / Math.max(0.3, T.tTitle - T.lift + 0.08));
  const drift = t > T.tTitle ? Math.min(8, (t - T.tTitle) * 2.5) : 0;
  return R(L.tilt * ease.inOutCubic(k) + drift);
}
/** Rocket top row in SCREEN coords. */
function rocketScreenY(t, T, L, c) {
  if (t < T.lift) return L.pad;
  if (t < T.hey) return lerp(L.pad, L.yHey, ease.outQuad(clamp((t - T.lift) / Math.max(0.1, T.hey - T.lift))));
  if (t < T.tTitle) return lerp(L.yHey, L.yTitle, clamp((t - T.hey) / Math.max(0.05, T.tTitle - T.hey)));
  return lerp(L.yTitle, L.yEnd, clamp((t - T.tTitle) / Math.max(0.5, c.dur - T.tTitle)));
}
const rocketWorldY = (t, T, L, c, cam) => rocketScreenY(t, T, L, c) - cam(t);

// ------------------------------------------------------------------ pixel world
function drawWorld(g, t, c, L, T, oy, cam, night) {
  const { px: ctx, PW, PH } = g;
  const tq = onTwos(t);
  const tod = night ? 'night' : 'day';
  const top = -L.tilt - 12; // world y of the highest point we tilt to

  // sky in world space: night above, the key-art flat teal at the start frame (variant 2: night all the way down)
  if (night) bands(ctx, 0, top + oy, PW, PH - top, SKY.night, { blend: 2 });
  else {
    const cols = ['#0F2B2A', '#122F2E', '#153533', '#173B38', '#1B4440', '#214D49', C.teal];
    const span = -top + L.skyLow; // 16:9 ends just below world y=0 so the start frame is pure key-art teal
    bands(ctx, 0, top + oy, PW, span, cols, { blend: 2, stops: [0, 0.16, 0.32, 0.47, 0.62, 0.77, 0.9] });
  }
  // stars (world space). Variant 1: only above the start frame; they all switch on with "Hey!"
  const heyK = t >= T.hey ? 1 : 0.45;
  if (night) stars(ctx, t, { x: 0, y: top + oy, w: PW, h: -top + (g.fmt === '9x16' ? 200 : 110), seed: 23, big: 0.1 });
  else stars(ctx, t, { x: 0, y: top + oy, w: PW, h: -top + L.starLow, seed: 23, show: heyK, big: t >= T.hey ? 0.12 : 0.05 });
  const M = L.moon;
  if (night) moon(ctx, L.nightMoon.x, L.nightMoon.y + oy, M.r, { phase: 0.45 });
  else moon(ctx, M.x, M.y + oy, M.r, { phase: 0.45 });

  for (const cl of L.clouds) cloud(ctx, R(cl.x + ((tq * cl.v) % 40)), cl.y + oy, { kind: cl.kind, tod });

  // fireworks (variant 2): on Hey!, on both title stamps, then every beat
  if (night) {
    const bl = beatLen(c);
    const shots = [T.lift, T.hey, T.hey + bl * 0.5, T.tTitle, T.tTitle + bl * 0.5, T.tTitle2, T.tTitle2 + bl * 0.5];
    for (const b of beatsIn(c, T.tTitle2 + 0.1, c.dur + 1)) shots.push(b, b + bl * 0.5);
    shots.forEach((s, i) => {
      const [fx, fy] = L.fw[i % L.fw.length];
      const cols = [[C.gold, C.cream, C.coral], [C.sky, C.cream, C.gold], [C.coral, C.gold, C.cream]][i % 3];
      const big = i % 2 === 0;
      firework(ctx, fx + R((hash(i, 1, 9) - 0.5) * 16), fy + R((hash(i, 2, 9) - 0.5) * 10), t, s,
        { seed: 31 + i, colors: cols, n: big ? 46 : 26, speed: big ? 62 : 40, life: big ? 1.25 : 0.9, rise: 0.3, fromY: fy + 70 });
    });
  }

  // exhaust trail (world space, behind the headland): emitted along the flight path, drawn as one billowing mass
  const pal = night ? SMOKE_NIGHT : SMOKE_DAY;
  const HOT = { shade: '#D1AC70', body: '#F8CC87', lit: '#FFF1C9' };
  const step = 1 / 40;
  const life = Math.max(night ? 2.4 : 2.8, t - T.lift + 0.2);
  const noz = L.pad + 22; // nozzle row of the rocket on the pad (world)
  const tStart = Math.max(T.ign, t - life);
  const P = [];
  for (let te = Math.ceil(tStart / step) * step; te <= t + 1e-6; te += step) {
    const i = Math.round(te / step);
    const age = t - te;
    let x, y, r, level = 1;
    if (te < T.lift + 0.15) {
      // ground billow: rolls sideways off the pad and climbs above the tree line
      const dir = hash(i, 1, 4) < 0.5 ? -1 : 1;
      const sp = 20 + hash(i, 2, 4) * 34;
      const d = (sp * (1 - Math.exp(-age * 2.4))) / 2.4;
      x = L.rx + dir * d;
      y = noz - 2 - (1 - Math.exp(-age * 1.6)) * 14 - hash(i, 3, 4) * 4;
      r = 2 + Math.min(6, age * 9) + hash(i, 6, 4) * 1.5;
    } else {
      const wy = rocketWorldY(te, T, L, c, cam) + 22;
      const side = hash(i, 5, 4) < 0.5 ? -1 : 1;
      x = L.rx + (hash(i, 4, 4) - 0.5) * 2 + side * age * (2 + hash(i, 7, 4) * 3);
      y = wy + 3 + age * 9;
      r = 1.5 + Math.min(5, age * 8) + hash(i, 6, 4) * 1.2;
    }
    if (age > life * 0.75) level = 1 - (age - life * 0.75) / (life * 0.25);
    P.push({ x, y: y + oy, r, level, pal: age < 0.12 && te >= T.lift ? HOT : pal });
  }
  drawPuffs(ctx, P);

  // launch tower + launch glow behind the trees
  const armOut = t < T.ign ? 3 : Math.max(0, 3 - R((t - T.ign) * 10));
  gantry(ctx, L.rx + 7, L.pad - 6 + oy, L.lh.base + oy, { night, beacon: c.pulse(t, 0.25) > 0.5, arm: armOut });
  if (t >= T.ign && t < T.lift + 0.6) haloDisc(ctx, L.rx, noz + 2 + oy, 12, C.gold, 0.22 * (1 - clamp((t - T.lift) / 0.6)));

  // the rocket (behind the trees until it clears them)
  const ry = R(rocketScreenY(t, T, L, c));
  let rx = L.rx;
  if (t > T.lift - 0.35 && t < T.lift + 0.1) rx += shake(t, T.lift - 0.35, 1, 0.45, 5).x; // ignition rumble
  const power = t < T.lift ? 0.4 : t < T.hey ? 1.3 : 1.0;
  if (t >= T.ign) rocket(ctx, rx, ry, { t, flame: power, night, seed: 7 });
  else rocket(ctx, rx, ry, { t, flame: 0, night });

  // the bay + headland (key-art vignette) riding the camera
  const lx = L.lh.x;
  water(ctx, t, {
    x: L.water.x, y: L.water.y + oy, w: PW - L.water.x, h: PH - L.water.y, tod, seed: 4,
    fade: g.fmt === '9x16' ? 'none' : 'left', fadeW: L.water.fadeW,
    glints: night ? [{ x: lx, color: C.gold, w: 10 }, { x: L.rx, color: C.coral, w: 6 }] : t > T.ign && t < T.hey + 0.3 ? [{ x: L.rx, color: C.gold, w: 6 }] : [],
  });
  const glow = night ? 1 : 0.75 + 0.25 * c.pulse(t, 0.3);
  const beamK = night ? 1 : 0;
  headland(ctx, lx, L.lh.base + oy, {
    t, tod, glow, h: L.lh.h, beam: beamK > 0, beamStrength: beamK, beamLen: g.fmt === '9x16' ? 120 : 170,
  });

  // gulls scatter away from the launch
  for (const gl of L.gulls) {
    const flee = t > T.ign ? (t - T.ign) * 16 : 0;
    const dx = R(Math.sin(tq * 0.6 + gl.p * 5) * 3 - flee), dy = R(Math.sin(tq * 1.3 + gl.p * 7) * 1.5 - flee * 0.3);
    gull(ctx, gl.x + dx, gl.y + dy + oy, t, { phase: gl.p, rate: t > T.ign ? 4 : 2.2, tod, flip: true });
  }

  // the cloud bank the rocket punches through on "Hey!" (halves part, solid fragments fly out)
  const cwy = R(rocketWorldY(T.hey, T, L, c, cam) + 10);
  const part = t < T.hey ? 0 : ease.outCubic(clamp((t - T.hey) / 0.5));
  const gap = R(part * 34);
  cloud(ctx, L.rx - 29 - gap, cwy - 3 + oy, { kind: 'big', tod });
  cloud(ctx, L.rx - 3 + gap, cwy + oy, { kind: 'twoTone', tod });
  if (t >= T.hey && t < T.hey + 0.55) {
    const k = (t - T.hey) / 0.55;
    const F = [];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + hash(i, 1, 5);
      const d = 4 + ease.outQuad(k) * (14 + hash(i, 2, 5) * 12);
      F.push({ x: L.rx + Math.cos(a) * d, y: cwy + 3 + oy + Math.sin(a) * d * 0.55 + k * 4, r: (2.6 + hash(i, 3, 5)) * (1 - k), level: 1, pal: night ? SMOKE_NIGHT : SMOKE_DAY });
    }
    drawPuffs(ctx, F);
  }
  // star pops on "Hey!" and sparkles around the rocket afterwards
  const spots = g.fmt === '9x16'
    ? [[40, 40], [150, 60], [96, 24], [24, 110], [130, 100], [70, 84], [160, 20]]
    : [[150, 20], [230, 14], [300, 44], [120, 52], [270, 8], [196, 40], [312, 18]];
  spots.forEach(([sx, sy], i) => {
    const t0 = T.hey + i * 0.07;
    sparkle(ctx, sx, sy, t, t0, { size: 2, dur: 0.4, color: i % 2 ? C.gold : C.sky });
    if (t > t0 + 0.4) twinkle(ctx, sx, sy, t, { period: 0.9 + (i % 3) * 0.2, phase: i * 0.37, size: night ? 2 : 1 });
  });
  if (night) {
    for (let i = 0; i < 8; i++) {
      const sx = R(hash(i, 1, 61) * PW), sy = R(hash(i, 2, 61) * PH * 0.55);
      twinkle(ctx, sx, sy, t, { period: 0.6 + hash(i, 3, 61) * 0.5, phase: hash(i, 4, 61), size: 2, color: i % 2 ? C.gold : C.cream });
    }
  }
}

// ------------------------------------------------------------------ type layer
function drawType(g, t, c, L, T, night, v) {
  const { hi } = g;
  const s = c.safe;
  corners(hi, c.fmt, { show: clamp(t / 0.3), y: v ? 132 : undefined });
  const pl = c.pulse(t, 0.35);
  const plusK = night ? 0.8 + 0.5 * Math.max(pl, c.pulse(t + beatLen(c) / 2, 0.2)) : 0.8 + 0.4 * pl;
  plus(hi, L.plus[0], L.plus[1], { scale: plusK });

  const stagger = T.tTitle2 - T.tTitle;
  if (!v) {
    const size = fitSize(hi, 'Hacktoberfest', 1282, { role: 'display', maxSize: 262 });
    titleLockup(hi, 90, 318, { size, t, t0: T.tTitle, stagger, lines: [true, false, true] });
  } else {
    const size = fitSize(hi, 'Hacktoberfest', s.w, { role: 'display', maxSize: 200 });
    titleLockup(hi, s.x0 - 4, 400, { size, t, t0: T.tTitle, stagger, lines: [true, false, true] });
  }
  if (night) {
    // bright accents: a quick cream flash on Hey! and on each title stamp
    for (const [t0, a] of [[T.hey, 0.28], [T.tTitle, 0.22], [T.tTitle2, 0.16]]) {
      const f = (t - t0) * 30;
      if (f >= 0 && f < 3) flash(hi, g.W, g.H, a * (1 - f / 3));
    }
  }
}
