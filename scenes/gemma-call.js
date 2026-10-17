// scenes/gemma-call.js (owner E) - C18, cue v2.3: "Fine-tune it on Gemma, let it make the call"
// Close-up on the same MODEL box from C17 (option bars still at the trained values, B glowing). A faceted pixel gem
// spins above the empty socket, drops in ON the downbeat (label GEMMA), and the model surges gold: the bars
// recompute, losers drain, B climbs to 0.97; on "make the call" a big rubber check stamp slams onto option B
// and the probability stamps in big (0.97). The sloth, watching from the desk, throws its arms up.
import { C, RAMP } from '../lib/palette.js';
import { clamp, ease, tween, onTwos, frameIndex, lerp, squash } from '../lib/motion.js';
import { rect, px, circle, dither } from '../lib/pixel.js';
import { burst } from '../lib/world.js';
import {
  R, beatFrom, beatLen, cueOr, labelStack, room, sloth, modelBox, optionBars, gem, checkStamp, sparkle, haloDisc,
  PROBS_A, PROBS_B,
} from './_E-kit.js';
import { text, textBox, anim } from '../lib/text.js';

const LAYOUT = {
  '16x9': {
    deskY: 156, lamps: [174],
    model: { x: 128, y: 86, w: 92, h: 70 }, gemHover: 30, gemHW: 12,
    bars: { x: 232, y: 92, w: 84, rowH: 11, gap: 5 }, stampR: 17,
    slothX: 68,
    text: { x: 96, y: 300, size: 168, callY: 610, callSize: 232, callX: 96, callAlign: 'left' },
  },
  '9x16': {
    deskY: 300, lamps: [],
    model: { x: 44, y: 116, w: 92, h: 70 }, gemHover: 28, gemHW: 12,
    bars: { x: 22, y: 196, w: 144, rowH: 10, gap: 4 }, stampR: 16,
    slothX: 122,
    text: { x: 80, y: 400, size: 168, callY: 400, callSize: 168, callX: 1000, callAlign: 'right' },
  },
};

export default {
  id: 'gemma-call',
  draw(g, t, c) {
    const L = LAYOUT[c.fmt] || LAYOUT['16x9'];
    const X = g.px, hi = g.hi;
    const bl = beatLen(c);
    const Lc = cueOr(c, 'v2.3', 0, c.dur);
    const tq = onTwos(t);

    // ---- beat plan
    const tGem = beatFrom(c, Math.max(0.25, Lc.start + 0.2), 0);   // gem seats on the downbeat ("Gemma")
    const tCall = beatFrom(c, tGem + 0.1, 1);                       // "make the call"
    const fallDur = Math.min(0.16, tGem * 0.6);

    const deskY = room(g, c, { deskY: L.deskY, lamps: L.lamps, pulse: c.pulse(t) });

    // ---- model (squash on gem impact)
    const M = L.model;
    const hot = t >= tGem ? 1 : 0;
    const sq = squash(t, tGem, 0.3, 0.25);
    const dy = sq.sy < 1 ? R((1 - sq.sy) * 8) : 0;
    const b = c.beat(t);
    // power surge halo behind the model
    if (hot) {
      const k = tween(t, tGem, 0.35, ease.outCubic);
      const pulseK = c.pulse(t, 0.3);
      haloDisc(X, M.x + R(M.w / 2), M.y + R(M.h / 2), R(lerp(24, 60, k)), C.gold, 0.1 + 0.1 * pulseK);
    }
    const geo = modelBox(X, M.x, M.y + dy, { w: M.w, h: M.h, power: 1, wave: hot ? (b.phase * 2) % 1 : b.phase, t, hot });

    // ---- gem: hover + spin, then drop into the socket on tGem
    const sock = geo.socket;
    const gemH = 5 + 11;
    let gy;
    if (t < tGem - fallDur) gy = sock.y - L.gemHover - R(Math.sin(tq * 5) * 2);
    else if (t < tGem) gy = R(lerp(sock.y - L.gemHover, sock.y - gemH + 6, ease.inQuad(clamp((t - (tGem - fallDur)) / fallDur))));
    else gy = sock.y - gemH + 6 + dy;
    const theta = hot ? tq * 9 : tq * 3.2;
    if (!hot) {
      // dotted drop guide
      for (let yy = gy + gemH + 3; yy < sock.y - 2; yy += 3) px(X, sock.x, yy, RAMP.teal[6]);
      haloDisc(X, sock.x, gy + 5, 12, C.sky, 0.25);
    }
    gem(X, sock.x, gy, { hw: L.gemHW, crown: 5, pav: 11, theta });
    if (hot) {
      // energy rings + sparks from the socket on impact
      for (let i = 0; i < 2; i++) {
        const k = (t - tGem - i * 0.08) / 0.35;
        if (k > 0 && k < 1) circle(X, sock.x, sock.y + 2, R(6 + k * (34 + i * 10)), i ? C.gold : C.cream);
      }
      burst(X, sock.x, sock.y - 4, t - tGem, { n: 16, speed: 46, gravity: 60, colors: [C.gold, C.cream, C.sky], seed: 5, life: 0.5 });
      sparkle(X, sock.x - 12, gy + 2, t, tGem + 0.05, { size: 2 });
      sparkle(X, sock.x + 13, gy + 6, t, tGem + 0.12, { size: 2 });
    }

    // ---- bars: trained values -> the call
    const k = tween(tq, tGem + 0.05, Math.max(0.2, tCall - tGem - 0.1), ease.inOutCubic);
    const vals = PROBS_A.map((v, i) => lerp(v, PROBS_B[i], k));
    const B = L.bars;
    const rows = optionBars(X, B.x, B.y, { w: B.w, rowH: B.rowH, gap: B.gap, values: vals, winner: 1, glow: 1, t, big: true });

    // ---- the call: rubber check stamp slams onto option B
    const rB = rows[1];
    const called = t >= tCall - 2 / 30;
    if (called && rB) {
      const f = Math.floor((t - (tCall - 2 / 30)) * 30);
      const r0 = L.stampR;
      const r = f <= 0 ? r0 + 10 : f === 1 ? r0 + 4 : f === 2 ? r0 - 2 : r0;
      const sx = rB.x + R(B.rowH / 2), sy = rB.y + R(B.rowH / 2);
      if (f >= 2) burst(X, sx, sy, t - tCall, { n: 18, speed: 50, gravity: 30, colors: [C.coral, C.cream, C.gold], seed: 9, life: 0.45 });
      checkStamp(X, sx, sy, r, { wear: 0.12 });
      if (f >= 2) { sparkle(X, sx + r + 4, sy - r + 2, t, tCall + 0.03, { size: 3 }); sparkle(X, sx - r - 3, sy + r - 3, t, tCall + 0.1, { size: 2 }); }
    }

    // ---- sloth watching from the desk: looks up, then cheers on the call
    const cheerF = t >= tCall && frameIndex(t - tCall, 4, 2) === 0;
    const hop = t >= tCall && cheerF ? -3 : 0;
    sloth(X, L.slothX, deskY + hop, t >= tCall ? (cheerF ? { cheer: true, fast: true } : { idle: true, fast: true }) : { idle: true, fast: true, up: true });

    // ---- type: GEMMA on the gem drop, the probability on the call
    const T = L.text;
    labelStack(hi, t, 'GEMMA', null, { x: T.x, y: T.y, size: T.size, ta: tGem });
    if (t >= tCall) {
      const str = PROBS_B[1].toFixed(2);
      const opts = { role: 'display', size: T.callSize, align: T.callAlign, color: C.sky };
      const box = textBox(hi, str, T.callX, T.callY, opts);
      anim(hi, t, { t0: tCall, x: box.cx, y: box.cy, enter: 'stamp' }, (h) => text(h, str, T.callX, T.callY, opts));
    }
  },
};
