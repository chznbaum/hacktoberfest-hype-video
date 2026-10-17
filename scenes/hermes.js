// scenes/hermes.js (owner E) - C19, cue v2.4: "Then fire up Hermes Agent, watch it learn it all"
// Session 2. A winged-sandal messenger zips in on a key-art streak trail and parks over the agent terminal;
// the command fires on the downbeat (label HERMES / AGENT), then the agent learns skills on the beat and the
// half-beats after ("learn it all"): each line types on, a gold tick pops, "+1" floats up and the skill meter
// grows. Labels: SESSION 2 OF 2 chip + HERMES / AGENT.
import { C, RAMP } from '../lib/palette.js';
import { clamp, ease, tween, onTwos, lerp, hash } from '../lib/motion.js';
import { rect, px, hline, dither, pixelText, pixelTextWidth } from '../lib/pixel.js';
import { burst } from '../lib/world.js';
import {
  R, beatFrom, beatLen, cueOr, labelStack, chipAt, room, sandal, speedTrail, terminalFrame, tick, sparkle, SANDAL_W, SANDAL_H,
} from './_E-kit.js';

const SKILLS = ['WEB SEARCH', 'WRITE CODE', 'RUN TESTS', 'FIX BUGS', 'ORDER PIZZA'];

const LAYOUT = {
  '16x9': {
    deskY: 158, lamps: [],
    term: { x: 150, y: 46, w: 160, h: 104 }, flyY: 70,
    text: { x: 96, chipY: 150, y: 340, size: 150, gap: 140 },
  },
  '9x16': {
    deskY: 300, lamps: [],
    term: { x: 12, y: 136, w: 156, h: 110 }, flyY: 150,
    text: { x: 80, chipY: 290, y: 450, size: 150, gap: 140 },
  },
};

export default {
  id: 'hermes',
  draw(g, t, c) {
    const L = LAYOUT[c.fmt] || LAYOUT['16x9'];
    const X = g.px, hi = g.hi;
    const bl = beatLen(c);
    const Lc = cueOr(c, 'v2.4', 0, c.dur);
    const tq = onTwos(t);

    // ---- beat plan
    const tH = beatFrom(c, Math.max(0.25, Lc.start + 0.2), 0);      // "fire up Hermes": command runs, label lands
    const tA = tH + bl * 0.5;                                        // "Agent"
    const tS0 = beatFrom(c, tH + 0.1, 0);                            // first skill on the next beat
    // skills land on the beat and the off-beat eighths after it ("learn it all" accelerates)
    const skillT = SKILLS.map((_, i) => {
      const a = beatFrom(c, tS0 - 0.02, i >> 1);
      return i % 2 ? (a + beatFrom(c, tS0 - 0.02, (i >> 1) + 1)) / 2 : a;
    });

    room(g, c, { deskY: L.deskY, lamps: L.lamps, pulse: c.pulse(t) });

    // ---- terminal
    const T = L.term;
    const learned = skillT.filter((s) => t >= s).length;
    const allDone = learned === SKILLS.length;
    const ct = terminalFrame(X, T.x, T.y, T.w, T.h, 'AGENT');
    if (allDone && Math.floor((t - skillT[SKILLS.length - 1]) * 8) % 2 === 0) {
      // gold border flash on "learn it all"
      rect(X, T.x, T.y, T.w, 1, C.gold); rect(X, T.x, T.y + T.h - 1, T.w, 1, C.gold);
      rect(X, T.x, T.y, 1, T.h, C.gold); rect(X, T.x + T.w - 1, T.y, 1, T.h, C.gold);
    }
    const lh = 12;
    let y = ct.y;
    // prompt line types on, runs on tH
    const cmd = '> HERMES';
    const nType = Math.min(cmd.length, Math.max(0, Math.floor((t - 0.05) / Math.max(0.03, (tH - 0.12) / cmd.length))));
    pixelText(X, cmd.slice(0, Math.max(1, nType)), ct.x, y, C.sky, { font: 'small' });
    if (t < tH && Math.floor(t * 6) % 2 === 0) rect(X, ct.x + pixelTextWidth(cmd.slice(0, Math.max(1, nType)), { font: 'small' }) + 2, y, 4, 7, C.cream);
    if (t >= tH) pixelText(X, 'RUN', ct.x + ct.w - 1, y, t < tH + 0.15 ? C.gold : RAMP.water[3], { font: 'small', align: 'right' });
    y += lh + 2;
    // skills
    for (let i = 0; i < SKILLS.length; i++) {
      const s0 = skillT[i];
      if (t < s0 - 0.12) break;
      const typed = clamp((t - (s0 - 0.12)) / 0.12);
      const str = '+ ' + SKILLS[i];
      const n = Math.max(1, Math.floor(typed * str.length));
      const isNew = t >= s0 && t < s0 + 0.12;
      if (isNew) rect(X, ct.x - 2, y - 2, ct.w + 4, 11, RAMP.iron[1]);
      pixelText(X, str.slice(0, n), ct.x, y, i === SKILLS.length - 1 ? C.coral : C.cream, { font: 'small' });
      if (t >= s0) {
        // tick pops (2 frames bigger)
        const tx = ct.x + ct.w - 8;
        if (t < s0 + 2 / 30) rect(X, tx - 2, y - 2, 11, 11, C.gold);
        else tick(X, tx, y, C.gold);
        // +1 floats up and blinks out
        const k = (t - s0) / 0.45;
        if (k < 1 && Math.floor(k * 8) % 2 === 0 || k < 0.5) {
          if (k < 1) pixelText(X, '+1', tx - 14, y - 2 - R(k * 10), C.gold, { font: 'tiny' });
        }
        sparkle(X, tx + 8, y - 2, t, s0, { size: 2, dur: 0.3 });
      }
      y += lh;
    }
    // skill meter
    const my = T.y + T.h - 10;
    pixelText(X, 'SKILLS', ct.x, my, RAMP.water[3], { font: 'tiny' });
    const segX = ct.x + pixelTextWidth('SKILLS', { font: 'tiny' }) + 4;
    const segW = Math.floor((ct.x + ct.w - segX - (SKILLS.length - 1) * 2) / SKILLS.length);
    for (let i = 0; i < SKILLS.length; i++) {
      const on = i < learned;
      rect(X, segX + i * (segW + 2), my, segW, 5, on ? C.gold : RAMP.iron[2]);
      if (on) hline(X, segX + i * (segW + 2), segX + i * (segW + 2) + segW - 1, my, RAMP.glow[4]);
    }
    if (allDone) burst(X, T.x + T.w - 12, my, t - skillT[SKILLS.length - 1], { n: 16, speed: 44, gravity: 50, colors: [C.gold, C.cream, C.sky], seed: 11, life: 0.5 });

    // ---- the messenger: zips in from the left on a streak trail, perches on the terminal, hops per skill,
    //      and zips off to the right after the last skill (if the clip runs long enough)
    const perch = { x: T.x + T.w - SANDAL_W + 4, y: T.y - SANDAL_H + 1 };
    const tArrive = Math.max(0.18, tH - 0.04);
    const kx = tween(tq, 0, tArrive, ease.outCubic), ky = tween(tq, 0, tArrive, ease.inOutQuad);
    let sx = R(lerp(-SANDAL_W - 10, perch.x, kx));
    let sy = R(lerp(L.flyY, perch.y, ky));
    if (t >= tArrive) sy += R(Math.sin((tq - tArrive) * 10) * 1.2) - (t < tArrive + 0.1 ? 2 : 0);
    for (let i = 0; i < SKILLS.length; i++) { const k = t - skillT[i]; if (k >= 0 && k < 0.15) sy -= R(Math.sin((k / 0.15) * Math.PI) * 4); }
    const tOut = skillT[SKILLS.length - 1] + bl * 0.5;
    let speed = 1 - kx;
    if (c.dur - tOut > 0.15 && t >= tOut) {
      const k = (tq - tOut);
      sx = R(perch.x + k * k * 2600 + k * 80);
      sy = R(perch.y - k * 30);
      speed = clamp(k * 6);
    }
    if (speed > 0.03) speedTrail(X, sx + 20, sy + 20, R(110 * speed + 10), t, { dir: 1, h: 16, k: 1 });
    sandal(X, sx, sy, t, { rate: speed > 0.3 ? 20 : 10 });
    if (t >= tH && t < tH + 0.3) sparkle(X, sx + SANDAL_W - 4, sy + 6, t, tH, { size: 3, dur: 0.3 });

    // ---- type
    const Tx = L.text;
    chipAt(hi, t, 'SESSION 2 OF 2', Tx.x, Tx.chipY, { t0: 0.04, size: c.type.label });
    labelStack(hi, t, 'HERMES', 'AGENT', { x: Tx.x, y: Tx.y, size: Tx.size, gap: Tx.gap, ta: tH, tb: tA });
  },
};
