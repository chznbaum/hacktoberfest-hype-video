// scenes/wake-up.js (owner A) C04, cue i.3 "Hampton, wake up, it's Hacktoberfest!".
// Sunrise burst over the bay: the sun breaks the horizon on the downbeat with a ring of light, warm dawn bands rise,
// then on "wake UP" (beat 1) the night world dither-dissolves into the key-art teal day, the lantern goes out and
// the gulls that slept on the seawall take off. On "it's HACK-toberfest" (beat 2) the frame flashes and the
// headline stamps in at its key-art position: the key art, alive. Beat 3 holds (the stair wipe to C05 runs here).
import { C } from '../lib/palette.js';
import { clamp, ease, tween, onTwos, hash, quantize } from '../lib/motion.js';
import { px, rect } from '../lib/pixel.js';
import { sun, gull, haloDisc, sparkle } from '../lib/world.js';
import { text, flash, corners, plus, fitSize, anim, textBox, eyebrow } from '../lib/text.js';
import { bayWorld, beatAfter, cue, ditherOver, perchedGullSpots, BAY } from './_A-common.js';

const R = Math.round;

export default {
  id: 'wake-up',
  draw(g, t, c) {
    const v = c.fmt === '9x16';
    const L = cue(c, 'i.3', { start: 0, end: c.dur });
    const b = (i) => beatAfter(c, L.start, i);
    const tSun = b(0), tUp = b(1), tHack = b(2);
    const spb = Math.max(0.2, tUp - tSun);
    const B = BAY[c.fmt];
    const horizon = B.waterY;
    // sun path: breaks the horizon on the downbeat, rises fast (ease-out), keeps drifting up slowly
    const sunX = v ? 38 : 112;
    const rise = tween(t, tSun - spb * 0.15, spb * 1.6, ease.outCubic);
    const sunY = R(horizon + 6 - rise * (v ? 56 : 40) - Math.max(0, t - tHack) * 4);
    const sunR = v ? 10 : 9;
    // night -> day dissolve on "wake up" (stepped on twos), dawn bands rise before it
    const kDay = quantize(clamp((t - tUp) / (spb * 0.5)), 15);
    const kDayStep = Math.ceil(kDay * 4) / 4;
    const dawn = 0.5 + 0.5 * tween(t, tSun, spb * 0.9, ease.outQuad);
    const nLeft = gullsGone(t, tUp);
    const sunDraw = (ctx) => {
      if (sunY - sunR > horizon + 1) return;
      sun(ctx, sunX, sunY, sunR, { t, rays: t >= tSun });
    };
    // clouds kept clear of the headline zone
    const cloudsAt = v
      ? [{ kind: 'twoTone', x: 100, y: 120, v: 0.6 }, { kind: 'small', x: 10, y: 104, v: 0.5 }, { kind: 'wisp', x: 128, y: 168, v: 0.4 }]
      : [{ kind: 'big', x: 284, y: 47, v: 1.0 }, { kind: 'twoTone', x: 196, y: 76, v: 0.8 }, { kind: 'wisp', x: 14, y: 84, v: 0.5 }];
    const common = { waterX: 0, waterFull: true, gullsLeaving: nLeft, afterSky: sunDraw, moon: false, cloudsAt };
    bayWorld(g, t, c, {
      ...common, tod: 'night', dawn, starShow: clamp(0.7 - (t - tSun) / spb), starSeed: 5, glow: 1 - kDay, beam: false,
      waterGlints: [{ x: sunX, color: C.gold, w: 12 }, { x: B.lh.x, color: C.gold, w: 8 }],
    });
    if (kDayStep > 0) {
      ditherOver(g.px, kDayStep, (bctx) => bayWorld({ px: bctx, PW: g.PW, PH: g.PH }, t, c, {
        ...common, tod: 'day', skyPreset: 'day', starShow: 0, beam: false, glow: 0.6,
        waterGlints: [{ x: sunX, color: C.gold, w: 14 }],
      }));
    }
    // sun burst: an expanding ring of light on the downbeat, clipped to the sky
    burstRing(g.px, sunX, sunY, t - tSun, horizon, v ? 90 : 120);
    burstRing(g.px, sunX, sunY, t - tHack, horizon, v ? 70 : 90, 1);
    // gulls take off on "wake up": flap hard, climb away from the seawall
    flyingGulls(g.px, t, tUp, c.fmt, kDay);
    // ---------------- type: flash + key-art headline on "Hacktoberfest"
    const hi = g.hi;
    const s = c.safe;
    corners(hi, c.fmt, { y: v ? 132 : undefined });
    const fk = t >= tHack ? 1 - (t - tHack) / 0.16 : 0;
    if (fk > 0) flash(hi, g.W, g.H, 0.55 * Math.ceil(fk * 3) / 3, C.cream);
    if (t >= tHack) {
      if (!v) {
        const size = fitSize(hi, 'Hacktoberfest', 1282, { role: 'display', maxSize: 260 });
        stampHead(hi, t, tHack, 90, 166, size);
      } else {
        const size = fitSize(hi, 'Hacktoberfest', s.w, { role: 'display', maxSize: 200 });
        stampHead(hi, t, tHack, s.x0 - 4, 400, size);
      }
      plus(hi, v ? 984 : 1788, v ? 870 : 192, { scale: 0.8 + 0.4 * c.pulse(t, 0.3) });
    }
    // sparkles pop off the sun on the headline hit
    for (let i = 0; i < 4; i++) sparkle(g.px, sunX + R((hash(i, 1, 4) - 0.5) * 40), sunY - 8 - R(hash(i, 2, 4) * 20), t, tHack + i * 0.05, { color: i % 2 ? C.cream : C.gold, size: 2, dur: 0.35 });
  },
};

/** Headline "Hacktoberfest", key-art type, stamped from 1.15 with a 1-frame cream overshoot. */
function stampHead(hi, t, t0, x, y, size) {
  const capTop = y;
  const bx = textBox(hi, 'Hacktoberfest', x, capTop, { role: 'display', size, baseline: 'cap-top' });
  anim(hi, t, { t0, x: bx.cx, y: bx.cy, enter: 'stamp' }, (h) => text(h, 'Hacktoberfest', x, capTop, { role: 'display', size, baseline: 'cap-top' }));
}

/** Gulls that have left their perch (staggered take-off starting at tUp). */
function gullsGone(t, tUp) {
  let n = 0;
  for (let i = 0; i < 5; i++) if (t >= tUp + i * 0.045) n = i + 1;
  return n;
}
function flyingGulls(ctx, t, tUp, fmt, kDay) {
  const spots = perchedGullSpots(fmt, 0);
  const col = kDay > 0.5 ? C.cream : '#C9D1C6';
  spots.forEach(([x0, y0], i) => {
    const t0 = tUp + i * 0.045;
    if (t < t0) return;
    const k = onTwos(t - t0);
    const dir = i === 4 ? 1 : -1;
    const vx = dir * (34 + hash(i, 1, 2) * 30), vy = -(30 + hash(i, 2, 2) * 26);
    // quick hop up, then a climbing glide with a little bob
    const x = x0 + vx * k;
    const y = y0 - 3 + vy * k + 10 * k * k * (hash(i, 3, 2) - 0.2) + Math.sin(k * 9 + i) * 1.2;
    gull(ctx, R(x), R(y), t - t0, { rate: 4.2 - hash(i, 4, 2), phase: i * 0.3, flip: dir > 0, color: col });
  });
}
/** Expanding dotted ring of light from (x, y), k seconds after the hit; only above the horizon. */
function burstRing(ctx, x, y, k, horizon, maxR, style = 0) {
  const life = 0.45;
  if (k < 0 || k > life) return;
  const kq = onTwos(k) / life;
  const r = R(10 + ease.outQuad(kq) * maxR);
  const n = R(r * 2.2);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const X = R(x + Math.cos(a) * r), Y = R(y + Math.sin(a) * r * 0.92);
    if (Y >= horizon) continue;
    if (hash(i, R(kq * 10), 9) < kq * 0.85) continue;
    px(ctx, X, Y, style ? C.cream : kq < 0.4 ? C.cream : C.gold);
    if (kq < 0.3) px(ctx, X, Y + 1, C.gold);
  }
  // long god-rays on the downbeat
  if (style === 0 && kq < 0.5) {
    for (let i = 0; i < 12; i++) {
      const a = Math.PI + (i / 11) * Math.PI;
      const r0 = 13, r1 = R(r0 + (1 - kq) * 26 + 10);
      for (let d = r0; d < r1; d += 2) {
        const X = R(x + Math.cos(a) * d), Y = R(y + Math.sin(a) * d);
        if (Y < horizon) px(ctx, X, Y, C.gold);
      }
    }
  }
}
