// scenes/decision-model.js (owner E) - C17, cues v2.1-v2.2:
//   "Hands-on session: build a decision model / Unsloth and Hugging Face, full throttle"
// Indoor makerspace. v2.1 builds the decision model on the beats: input card -> MODEL box -> four option bars,
// while a friendly sloth pecks at its laptop (sloth-slow). v2.2 "Unsloth": the sloth snaps into full throttle
// (headband, blur-fast typing), the training bar rips to 100%, data bits fly into the model, the option bars
// jitter and converge, and the winner glows gold. Labels (complementary tool names): UNSLOTH / HUGGING FACE.
import { C, RAMP } from '../lib/palette.js';
import { clamp, ease, tween, onTwos, frameIndex, hash, lerp } from '../lib/motion.js';
import { rect, px, hline, vline } from '../lib/pixel.js';
import { squash } from '../lib/motion.js';
import {
  R, beatFrom, beatLen, cueOr, labelStack, chipAt, room, sloth, laptop, trainScreen, modelBox, inputCard,
  arrow, optionBars, learning, sparkle, PROBS_A,
} from './_E-kit.js';

const LAYOUT = {
  '16x9': {
    deskY: 150, lamps: [142],
    card: { x: 160, y: 36, w: 26, h: 32 }, model: { x: 202, y: 26, w: 64, h: 54 },
    bars: { x: 176, y: 94, w: 140, rowH: 9, gap: 4 }, barArrow: 'v',
    lap: { cx: 96, w: 72, lh: 46 }, slothX: 22,
    text: { x: 96, chipY: 150, y: 278, size: 132, gap: 124 },
  },
  '9x16': {
    deskY: 292, lamps: [150],
    card: { x: 12, y: 122, w: 26, h: 32 }, model: { x: 60, y: 114, w: 64, h: 54 },
    bars: { x: 18, y: 184, w: 144, rowH: 9, gap: 4 }, barArrow: 'v',
    lap: { cx: 120, w: 64, lh: 42 }, slothX: 48,
    text: { x: 80, chipY: 330, y: 440, size: 140, gap: 132 },
  },
};

export default {
  id: 'decision-model',
  draw(g, t, c) {
    const L = LAYOUT[c.fmt] || LAYOUT['16x9'];
    const X = g.px, hi = g.hi;
    const bl = beatLen(c);
    const L1 = cueOr(c, 'v2.1', 0, c.dur / 2);
    const L2 = cueOr(c, 'v2.2', L1.end, c.dur);

    // ---- beat plan
    const tCard = beatFrom(c, Math.max(0.05, L1.start), 0);
    const tModel = beatFrom(c, tCard + 0.1, 0);
    const tBars = beatFrom(c, tModel + 0.1, 0);
    const tFast = L2.start;                                  // "Un-sloth"
    const tHF = beatFrom(c, tFast + 0.2, 0);                 // "Hugging Face"
    const tDone = beatFrom(c, tFast + 0.2, 1);               // training hits 100%
    const tGlow = beatFrom(c, tDone + 0.1, 0);               // winner glows
    const fast = t >= tFast;
    const tq = onTwos(t);

    // ---- room
    const pulse = c.pulse(t);
    const deskY = room(g, c, { deskY: L.deskY, lamps: L.lamps, pulse });

    // ---- progress: sloth-slow creep, then full throttle to 100 %
    const pSlow = 0.14 * clamp(t / Math.max(0.5, tFast));
    const p = !fast ? Math.floor(pSlow * 50) / 50 : lerp(0.14, 1, ease.inOutQuad(clamp((tq - tFast) / Math.max(0.2, tDone - tFast))));
    const done = t >= tDone;

    // ---- full throttle: key-art streaks rush past behind the sloth + laptop
    if (fast && !done) wallStreaks(X, 0, deskY - (c.fmt === '9x16' ? 62 : 58), L.lap.cx + R(L.lap.w / 2) + 24, 50, t, t - tFast);

    // ---- laptop + sloth
    const lap = laptop(X, L.lap.cx, deskY, { w: L.lap.w, lh: L.lap.lh, d: 6 });
    trainScreen(X, lap, p, t, { fast, done });
    const cheer = t >= tGlow && frameIndex(t - tGlow, 4, 2) === 0;
    const slowArm = frameIndex(t, 3, 2);
    const fastArm = frameIndex(t, 15, 2);
    const blink = !fast && ((t % 1.7) > 1.55);
    const jolt = fast && t < tFast + 2 / 15 ? -2 : 0;
    const sy = deskY + jolt + (fast && !done && fastArm ? -1 : 0);
    sloth(X, L.slothX, sy, { arm: fast ? fastArm : slowArm, fast, blink, cheer: t >= tGlow ? cheer : false });
    if (fast && !done) speedTicks(X, L.slothX + 40, deskY - 9, t);
    if (fast && t < tFast + 0.25) {
      // "!" pop over the sloth when it snaps awake
      const ex = L.slothX + 17, ey = deskY - 56;
      rect(X, ex, ey, 3, 7, C.cream); rect(X, ex, ey + 9, 3, 3, C.cream);
    }

    // ---- diagram: card -> model -> bars
    const M = L.model;
    const modelK = t < tModel ? 0 : 1;
    const sq = squash(t, tModel, 0.25, 0.25);
    const mPower = t >= tModel ? 1 : 0;
    // signal sweep: once per beat while idle, twice per beat at full throttle, steady after done
    const b = c.beat(t);
    const wave = mPower ? (fast && !done ? (b.phase * 2) % 1 : b.phase) : -1;
    let mA = null;
    if (t >= tModel - 0.001) {
      const dy = sq.sy < 1 ? R((1 - sq.sy) * 6) : 0;
      mA = modelBox(X, M.x, M.y + dy, { w: M.w, h: M.h, power: mPower, wave, t });
      if (t < tModel + 0.2) for (let i = 0; i < 4; i++) sparkle(X, M.x - 3 + (i % 2) * (M.w + 6), M.y - 4 + (i >> 1) * (M.h + 6), t, tModel + i * 0.03, { size: 2, dur: 0.3 });
    } else {
      // ghost outline where the model will land (dotted, keeps the frame composed for the incoming wipe)
      ghost(X, M.x, M.y - 4, M.w, M.h + 4);
    }
    const geo = mA || { inX: M.x - 1, inY: M.y + R(M.h / 2), outX: M.x + M.w, outY: M.y + R(M.h / 2), cx: M.x + R(M.w / 2), bottom: M.y + M.h };

    // input card slides in from the left on the first beat
    if (t >= tCard) {
      const k = tween(tq, tCard, 0.2, ease.outCubic);
      const cx = R(lerp(L.card.x - 30, L.card.x, k));
      inputCard(X, cx, L.card.y, L.card.w, L.card.h);
      if (k >= 1) arrow(X, L.card.x + L.card.w + 3, geo.inY, geo.inX - 2, geo.inY, t, { active: mPower > 0, show: tween(t, tModel, 0.15) || 0.001 });
    }

    // option bars
    const target = PROBS_A;
    const barsShow = tween(t, tBars, Math.max(0.2, bl * 0.9));
    if (barsShow > 0) {
      let vals;
      if (!fast) vals = [0.25, 0.25, 0.25, 0.25];
      else if (!done) vals = learning(target, (tq - tFast) / Math.max(0.2, tDone - tFast), tq, 3);
      else vals = target.map((v, i) => lerp(learning(target, 1, tDone, 3)[i], v, tween(t, tDone, 0.2, ease.outCubic)));
      const glow = t >= tGlow ? 1 : 0;
      const B = L.bars;
      const rows = optionBars(X, B.x, B.y, { w: B.w, rowH: B.rowH, gap: B.gap, values: vals, winner: 1, glow, t, show: barsShow, big: true });
      // arrow model -> bars
      if (L.barArrow === 'h') arrow(X, geo.outX + 2, geo.outY, B.x - 3, geo.outY, t, { active: mPower > 0, show: barsShow });
      else arrow(X, geo.cx, geo.bottom + 2, geo.cx, B.y - 3, t, { active: mPower > 0, show: barsShow });
      if (glow && rows[1]) {
        const r = rows[1];
        sparkle(X, r.fx, r.y - 2, t, tGlow, { size: 3, dur: 0.45 });
        sparkle(X, r.x + 2, r.y + r.h + 2, t, tGlow + 0.08, { size: 2, dur: 0.4 });
        const nb = beatFrom(c, tGlow + 0.1, 0);
        sparkle(X, r.fx - 6, r.y + r.h + 1, t, nb, { size: 2, dur: 0.35 });
      }
    }

    // data bits: laptop screen -> model while training at full throttle
    if (fast && !done && mA) dataBits(X, lap.x + R(lap.w / 2), lap.y - 4, geo.x0 + 6, geo.bottom + 1, t, c.fmt, geo);

    // ---- type (hi layer)
    const T = L.text;
    chipAt(hi, t, 'SESSION 1 OF 2', T.x, T.chipY, { t0: tCard, t1: tFast, size: c.type.label });
    labelStack(hi, t, 'UNSLOTH', 'HUGGING FACE', { x: T.x, y: T.y, size: T.size, gap: T.gap, ta: tFast, tb: tHF });
  },
};

/** Horizontal speed streaks moving left (wall tones + a few sky/cream glints), ramping in over k seconds. */
function wallStreaks(X, x, y, w, h, t, k) {
  const q = Math.floor(t * 15);
  const ramp = clamp(k / 0.15);
  for (let i = 0; i < 9; i++) {
    const yy = y + R((i / 8) * h);
    const len = R((10 + hash(i, 1, 4) * 26) * ramp);
    const sp = 260 + hash(i, 2, 4) * 160;
    const xx = x + w - R(((q / 15) * sp + hash(i, 3, 4) * w) % (w + len));
    const col = i % 4 === 1 ? RAMP.water[3] : i % 4 === 3 ? RAMP.teal[6] : RAMP.teal[5];
    hline(X, Math.max(x, xx), Math.min(x + w, xx + len), yy, col);
  }
}
/** Dotted placeholder rectangle (pre-power). */
function ghost(X, x, y, w, h) {
  const col = RAMP.teal[3];
  for (let i = 0; i < w; i += 3) { px(X, x + i, y, col); px(X, x + i, y + h - 1, col); }
  for (let j = 0; j < h; j += 3) { px(X, x, y + j, col); px(X, x + w - 1, y + j, col); }
}
/** Motion ticks around fast-typing hands. */
function speedTicks(X, x, y, t) {
  const f = frameIndex(t, 15, 2);
  const col = f ? C.cream : C.sky;
  hline(X, x + 2, x + 4, y - 3 - f, col);
  hline(X, x + 3, x + 6, y + 1 + f, col);
  vline(X, x - 2 + f * 2, y - 7, y - 5, col);
  // key sparks
  for (let i = 0; i < 3; i++) {
    const q = Math.floor(t * 15) + i * 7;
    px(X, x - 6 + R(hash(q, i, 2) * 14), y + 1 - R(hash(q, i, 5) * 6), i === 0 ? C.gold : C.cream);
  }
}
/** Pixel "bits" streaming from the laptop screen into the model (arc in 16:9, routed up the right side in 9:16). */
function dataBits(X, x0, y0, x1, y1, t, fmt, geo) {
  const n = 8;
  for (let i = 0; i < n; i++) {
    const k = ((onTwos(t) * 1.6 + i / n) % 1);
    let x, y;
    if (fmt === '9x16') {
      const rx = 170;
      const pts = [[x0 + 20, y0], [rx, y0 - 4], [rx, geo.cy], [geo.outX + 3, geo.cy]];
      const L = [0, 1, 2].map((j) => Math.hypot(pts[j + 1][0] - pts[j][0], pts[j + 1][1] - pts[j][1]));
      let d = k * (L[0] + L[1] + L[2]), seg = 0;
      while (seg < 2 && d > L[seg]) { d -= L[seg]; seg++; }
      const kk = clamp(d / L[seg]);
      x = lerp(pts[seg][0], pts[seg + 1][0], kk); y = lerp(pts[seg][1], pts[seg + 1][1], kk);
    } else {
      x = lerp(x0, x1, k);
      y = lerp(y0, y1, k) - Math.sin(k * Math.PI) * 16;
    }
    const col = i % 3 === 0 ? C.gold : i % 3 === 1 ? C.cream : C.sky;
    rect(X, R(x), R(y), 2, 2, col);
  }
}
