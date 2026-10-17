// scenes/cold-open.js (owner A) C01, cue `cold` (intro bars 0-3, instrumental).
// Night over the bay: the camera starts up in the stars and tilts down onto the key-art headland; stars twinkle,
// the bay shimmers, the lighthouse beam sweeps (it faces the camera on every downbeat), gulls sleep on the seawall.
// A shooting star crosses on bar 2, the eyebrow `HAMPTON, VA · 10.17.26` types on with the ||| bars, and the last
// bar builds: the beam spins faster, the lantern pumps on every beat and flares into the chant slam (C02).
import { C } from '../lib/palette.js';
import { clamp, ease, tween, onTwos, snap } from '../lib/motion.js';
import { rect, px, line } from '../lib/pixel.js';
import { haloDisc } from '../lib/world.js';
import { eyebrow, bars, typeText, anim, corners, measure } from '../lib/text.js';
import { bayWorld, beatT, BAY, lensFlare } from './_A-common.js';

export default {
  id: 'cold-open',
  draw(g, t, c) {
    const v = c.fmt === '9x16';
    const b = (i) => beatT(c, i);
    const end = c.dur;
    // the structure scales with however many beats the cold open has (placeholder: 16, real track: ~7)
    let nb = 0;
    while (b(nb) < end - 0.05 && nb < 64) nb++;
    nb = Math.max(4, nb);
    const iEye = Math.round(nb * 0.45), iBuild = Math.max(Math.round(nb * 0.6), nb - 4), iOut = nb - 1;
    const lastBar = b(iBuild), lastBeat = b(iOut);
    // camera tilt: from the stars down to the bay, done by the time the eyebrow types on (eased, integer px)
    const tiltK = tween(t, 0, Math.max(0.5, b(iEye) - 0.05), ease.inOutCubic);
    const oy0 = v ? 120 : 76;
    const oy = Math.round(oy0 * (1 - tiltK));
    // beam: half a turn per bar -> a beam faces the camera on every downbeat; build: a half turn per beat
    const bp = beatPos(c, t);
    let ang = Math.PI / 2 + (bp / 4) * Math.PI;
    if (t >= lastBar) ang = Math.PI / 2 + (iBuild / 4) * Math.PI + (bp - iBuild) * Math.PI;
    // lantern: steady glow, pumps on beats in the build, flares into the cut
    const inBuild = t >= lastBar;
    const pump = inBuild ? c.pulse(t, 0.3) : 0;
    const flare = clamp((t - (lastBeat + (end - lastBeat) * 0.35)) / Math.max(0.05, (end - lastBeat) * 0.65));
    const W = bayWorld(g, t, c, {
      oy, tod: 'night', beamAngle: ang, beamStrength: 0.85 + 0.15 * pump, glow: 0.85 + 0.15 * pump,
      starShow: 0.55 + 0.45 * tween(t, 0, b(iEye)), waterX: 0, waterFull: true,
      cloudsAt: v ? undefined : [{ kind: 'big', x: 150, y: 40, v: 0.8 }, { kind: 'wisp', x: 20, y: 70, v: 0.5 }, { kind: 'small', x: 120, y: 30, v: 0.6 }],
      clearRect: t >= b(iEye) - 0.05 ? (v ? [11, 38, 112, 12] : [24, 13, 108, 11]) : null,
    });
    // lantern: small flare on each beat of the build, then a growing anamorphic flare into the cut
    const L = W.lh.lantern;
    const fk = Math.max(pump * 0.45, flare > 0 ? 0.35 + 0.65 * ease.inQuad(flare) : 0);
    lensFlare(g.px, L.x, L.y, fk, { len: v ? 50 : 70 });
    const iStar = Math.max(1, Math.round(nb * 0.25));
    // shooting star on the downbeat of bar 2 (beat 4)
    shootingStar(g.px, t, b(iStar), v ? { x: 150, y: 40 + Math.round(oy * 0.45), dx: -60, dy: 22 } : { x: 230, y: 14 + Math.round(oy * 0.45), dx: -110, dy: 26 }, beatLen(c));
    // a second, smaller one in the build bar
    if (inBuild && nb >= 8) shootingStar(g.px, t, b(iOut - 2), v ? { x: 40, y: 70, dx: 44, dy: 16 } : { x: 70, y: 22, dx: 80, dy: 18 }, beatLen(c) * 0.8);

    // ---------------- type: the tiny eyebrow, key-art ||| bars + mono caps
    const hi = g.hi;
    const s = c.safe;
    const str = c.facts.coldOpenEyebrow || 'HAMPTON, VA · 10.17.26';
    const size = v ? 32 : 31;
    const tIn = b(iEye), tOut = b(iOut);
    // key-art eyebrow slot: right of the coral corner stairs (16:9) / under them (9:16)
    const x = v ? s.x0 : 162;
    const y = v ? 276 : 126;
    // coral corner pops in with the eyebrow (one cell per half beat); the sky corner joins in the build bar
    const half = beatLen(c) / 2;
    if (t >= tIn) corners(hi, c.fmt, { show: clamp((t - tIn + 0.01) / (half * 3)), showRight: t >= lastBar ? clamp((t - lastBar + 0.01) / (half * 3)) : 0, y: v ? 132 : undefined });
    if (t >= tIn && t < tOut + 0.25) {
      anim(hi, t, { t0: tIn, t1: tOut, x, y, enter: 'cut', exit: 'slide-up', dist: 36 }, (h) => {
        typeText(h, t, tIn + 0.06, str, x, y, { size, tracking: 0.14, cursor: true, cps: 32, weight: 800 });
      });
    }
  },
};

const beatLen = (c) => (c.beat(0).len > 0 ? c.beat(0).len : 0.588);
/** Continuous beat position from the clip start (0 at t=0, 1 at the next beat, ...). */
function beatPos(c, t) {
  const B = c.beats;
  const i0 = B.findIndex((x) => x >= -1e-3);
  const L = c.beat(t);
  if (L.index < 0) return 0;
  return L.index - i0 + clamp(L.phase);
}
/** Pixel shooting star: head + fading tail, lasts ~one beat from t0. */
function shootingStar(ctx, t, t0, p, dur) {
  if (t < t0 || t > t0 + dur) return;
  const k = onTwos(t - t0) / dur;
  const e = ease.outQuad(clamp(k));
  const hx = Math.round(p.x + p.dx * e), hy = Math.round(p.y + p.dy * e);
  const tail = 14;
  const len = Math.hypot(p.dx, p.dy), ux = p.dx / len, uy = p.dy / len;
  for (let i = 1; i <= tail; i++) {
    if (k > 0.6 && i < tail * (k - 0.6) * 2.5) continue;
    const col = i < 3 ? C.cream : i < 7 ? '#B9D5DC' : C.sky;
    if (i > 8 && i % 2) continue;
    px(ctx, Math.round(hx - ux * i), Math.round(hy - uy * i), col);
  }
  if (k < 0.85) { px(ctx, hx, hy, C.cream); px(ctx, hx + 1, hy, C.cream); px(ctx, hx, hy + 1, C.gold); }
}
