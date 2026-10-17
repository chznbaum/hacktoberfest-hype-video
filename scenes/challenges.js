// scenes/challenges.js (owner F) C20, cue v2.5 "Five challenges, prizes on the line".
// A trophy shelf on the makerspace wall. 5 CHALLENGES stamps with the vocal; five pixel awards drop onto the wooden
// shelf on eighth notes (one per half-beat from the downbeat), each with an icon that fits its challenge, and its short
// name (facts.challengeDetails[].short) stamps under it as it lands. Gears spin and toast pops on the beat on the
// Overengineered award; the community heart beats; confetti rains after the last landing and the gold glints.
// 16:9: one long shelf. 9:16: two shelves (3 + 2).
import { C, RAMP } from '../lib/palette.js';
import { ease, onTwos, frameIndex, clamp, tween } from '../lib/motion.js';
import { sparkle } from '../lib/world.js';
import { text, measure } from '../lib/text.js';
import { clock, woodShelf, spot, rail, drawSquash, squashAt, shineCanvas, confetti, puff, lbl, wrap, R } from './_F-kit.js';
import { trophy, gearArt, GEARS, TOAST, BOTS, heartArt, toastArt, bubbleArt, TW, TH, CX } from './_F-awards.js';

const LAYOUT = {
  '16x9': { shelves: [{ y: 124, rail: 46, x0: -2, x1: 322, items: [[0, 32], [1, 96], [2, 160], [3, 224], [4, 288]], brackets: [63, 255] }] },
  '9x16': {
    shelves: [
      { y: 152, rail: 78, x0: -2, x1: 182, items: [[0, 31], [1, 90], [2, 149]], brackets: [60, 119] },
      { y: 236, rail: 182, x0: -2, x1: 182, items: [[3, 60], [4, 120]], brackets: [16, 163] },
    ],
  },
};

export default {
  id: 'challenges',
  draw(g, t, c) {
    const { px, hi, PW } = g;
    const k = clock(c, 'v2.5');
    const L = LAYOUT[c.fmt] || LAYOUT['16x9'];
    const det = c.facts.challengeDetails || [];
    const names = (c.facts.challenges || []).map((n, i) => (det[i] && det[i].short) || n);
    const lands = [0, 1, 2, 3, 4].map((i) => k.beat(i * 0.5));
    const tFinal = k.beat(3);
    const fall = Math.min(0.24, k.spb * 0.42);
    const tq = onTwos(t);

    // ---- wall: track rails + spotlights that switch on as each award lands, then the shelves
    for (const s of L.shelves) {
      rail(px, s.x0, s.x1, s.rail - 7);
      for (const [i, x] of s.items) {
        const on = t >= lands[i] ? 1 : 0;
        spot(px, x, s.rail, s.y, { wTop: 8, wBot: c.fmt === '9x16' ? 48 : 52, on, flash: on && t - lands[i] < 2 / 30 });
      }
    }
    for (const s of L.shelves) woodShelf(px, s.x0, s.y, s.x1 - s.x0, { th: 6, brackets: s.brackets });

    // ---- trophies
    const OW = TW + 2, OH = TH + 2;
    L.shelves.forEach((s, si) => {
      // lower shelves: awards drop in from behind the shelf above (clipped under its plank)
      const clipY = si === 0 ? -100 : L.shelves[si - 1].y + 6;
      px.save();
      px.beginPath(); px.rect(0, Math.max(0, clipY), g.PW, g.PH); px.clip();
      for (const [i, x] of s.items) {
        const tl = lands[i];
        if (t < tl - fall) continue;
        const kf = clamp((t - (tl - fall)) / fall);
        const dist = si === 0 ? s.y + 8 : s.y + 1 - clipY;
        const dy = t < tl ? -R(dist * (1 - ease.inQuad(kf))) : 0;
        const base = s.y + 1 + dy;
        const [dw, dh] = squashAt(t, tl, 1);
        const cv = trophy(i);
        const x0 = x - Math.floor(OW / 2), y0 = base - OH;
        const A = (ax, ay) => [x0 + 1 + ax, y0 + 1 + ay];
        const landed = t >= tl;
        const sinceL = t - tl;
        // toast pops out of the Overengineered toaster on every beat once it has landed (drawn behind the body)
        if (i === 2) {
          const bi = c.beat(t);
          const kb = landed && bi.t0 >= tl - 0.01 ? clamp(bi.phase * bi.len / 0.3) : 1;
          const up = landed ? R(9 * Math.sin(Math.PI * clamp(kb))) : 0;
          for (const [a, b] of TOAST.slots) {
            const [tx, ty] = A(a, TOAST.top - 2 - up);
            px.drawImage(toastArt(), tx + Math.floor((b - a + 1 - 8) / 2), ty);
          }
        }
        // body (with a glint sweep right after landing and again on the final beat)
        const shineK = landed ? Math.max(tween(t, tl + 0.03, 0.3), tFinal <= t ? tween(t, tFinal, 0.35) : 0) : 0;
        if (dw || dh) drawSquash(px, cv, x, base, dw, dh);
        else shineCanvas(px, cv, x0, y0, shineK >= 1 ? 0 : shineK, { width: 2, col: RAMP.glow[4], col2: C.cream });
        // animated parts
        if (!dw && !dh) {
          if (i === 2) {
            GEARS.forEach((gr, j) => {
              const fr = ((frameIndex(tq, 10, 4) * gr.dir) % 4 + 4) % 4;
              const gc = gearArt(gr.n, gr.r, gr.ramp, fr);
              const [gx, gy] = A(gr.x, gr.y);
              px.drawImage(gc, gx - (gc.width - 1) / 2, gy - (gc.height - 1) / 2);
            });
            // the bot council debates: one bot pipes up per beat ('?' / '!')
            if (landed) {
              const bi = c.beat(t);
              if (bi.t0 >= tl - 0.01 && t - bi.t0 < bi.len * 0.75) {
                const n = bi.index;
                const bot = BOTS[((n % 3) + 3) % 3];
                const bc = bubbleArt(n % 2 ? '!' : '?');
                const [bx, by] = A(bot.x + 3, bot.y - 10);
                px.drawImage(bc, bx, by);
              }
            }
          }
          if (i === 4) {
            const big = landed && c.pulse(t, 0.25) > 0.45;
            const hcv = heartArt(big);
            const bob = frameIndex(tq, 3, 2);
            const [hx, hy] = A(CX, 13 + bob);
            px.drawImage(hcv, hx - (hcv.width - 1) / 2, hy - Math.floor(hcv.height / 2));
          }
          if (i === 1 && landed) {
            const [sx, sy] = A(CX - 5, 19);
            const bi = c.beat(t);
            sparkle(px, sx, sy, t, Math.max(tl + 0.05, bi.t0), { size: 2, color: C.cream, dur: 0.3 });
          }
        }
        // landing fx
        puff(px, x, s.y, sinceL, { w: 26, col: RAMP.tower[2], seed: i + 3 });
        if (landed) sparkle(px, x0 + 6, y0 + 16, t, tl + 0.04, { size: 2, dur: 0.3 });
        if (t >= tFinal) sparkle(px, x + 10, y0 + 12 + (i % 2) * 6, t, tFinal + i * 0.03, { size: 2, dur: 0.35 });
      }
      px.restore();
    });
    // confetti after the last trophy lands
    confetti(px, t - lands[4], { x: 0, w: PW, n: c.fmt === '9x16' ? 26 : 36, seed: 11, fall: c.fmt === '9x16' ? 120 : 80, life: 2.2 });

    // ---- type
    const s = c.safe;
    const head = c.fmt === '9x16' ? { size: 128, x: s.x0, y: 372 } : { size: 140, x: s.x0, y: 206 };
    const t0h = k.start;
    const b5 = lbl(hi, t, t0h, '5', head.x, head.y, { role: 'display', size: head.size, color: C.sky });
    lbl(hi, t, t0h, 'CHALLENGES', b5.x1 + head.size * 0.16, head.y, { role: 'display', size: head.size, color: C.cream });

    // names under each award, stamped as it lands (wrapped to the slot width, one shared size)
    const P = 6;
    const nameSize = c.fmt === '9x16' ? 40 : 46;
    const colW = c.fmt === '9x16' ? 300 : 340;
    const o = { role: 'cond', size: nameSize, weight: 700 };
    for (const sh of L.shelves) {
      for (const [i, x] of sh.items) {
        const str = names[i];
        if (!str) continue;
        const lines = wrap(hi, String(str).toUpperCase(), colW, o);
        let size = nameSize;
        for (const ln of lines) { const w = measure(hi, ln, { ...o, size: 100 }).w / 100; size = Math.min(size, colW / w); }
        let cx = x * P;
        const half = Math.max(...lines.map((ln) => measure(hi, ln, { ...o, size }).w)) / 2;
        cx = clamp(cx, s.x0 + half, s.x1 - half);
        const y0 = (sh.y + 15) * P + size * 0.72;
        lines.forEach((ln, j) => lbl(hi, t, lands[i] + 0.02, ln, cx, y0 + j * size * 1.02, { size, weight: 700, align: 'center', color: C.cream }));
      }
    }
  },
};
