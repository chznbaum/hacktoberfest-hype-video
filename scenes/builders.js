// scenes/builders.js (owner A) C24, cues br.1-br.2 "First-timer? Student? Seasoned pro? / Grab a seat, find a
// team: ready, set, go!". The beat drops to 808 + claps: intimate and dark. A night makerspace corner: string lights,
// a big window onto the night bay (lighthouse beam sweeping), three builders behind laptops (first-timer, student,
// pro). Their screens light them up one per beat; the chip FREE · BEGINNERS WELCOME complements the line. On
// "find a team" light lines link the laptops; READY · SET · GO stamps on c.hits['br.2'] with the key-art ||| bars
// as start lights; on GO everyone cheers and the string lights blaze.
import { C, RAMP, SKY } from '../lib/palette.js';
import { clamp, ease, tween, onTwos, hash, frameIndex } from '../lib/motion.js';
import { rect, px, dither, bands, line } from '../lib/pixel.js';
import { stars, water, lighthouse, moon, haloDisc, burst, sparkle } from '../lib/world.js';
import { text, chip, anim, corners, plus, fitSize, textBox, flash } from '../lib/text.js';
import { beatAfter, cue, hitsFor, passed, starBurst, distantShore } from './_A-common.js';
import { BUST_W, BUST_H, bustLit, bustDark, laptopLid } from './_A-builders.js';

const R = Math.round;

const LAYOUT = {
  '16x9': { win: { x: 56, y: 12, w: 208, h: 68 }, table: 136, depth: 10, xs: [72, 160, 248], lightsY: [3, 16], chipY: 984, wordY: 276,
    props: { pumpkin: 26, notes: 116, board: 202, mug: 290 } },
  '9x16': { win: { x: 12, y: 46, w: 156, h: 124 }, table: 232, depth: 12, xs: [34, 90, 146], lightsY: [32, 44], chipY: 1146, wordY: 650,
    props: { pumpkin: 10, notes: 62, board: 116, mug: 170 } },
};

export default {
  id: 'builders',
  draw(g, t, c) {
    const v = c.fmt === '9x16';
    const Ly = LAYOUT[c.fmt];
    const L1 = cue(c, 'br.1', { start: 0, end: beatAfter(c, 0, 4) });
    const L2 = cue(c, 'br.2', { start: beatAfter(c, 0, 4), end: c.dur });
    const lightT = [0, 1, 2].map((i) => beatAfter(c, L1.start, i) + (i === 0 ? 1 / 30 : 0));
    const chipT = beatAfter(c, L1.start, 3);
    const teamT = L2.start;
    const H = hitsFor(c, 'br.2', [5, 6, 7]);
    const goT = H[2];
    const nHit = passed(H, t);
    const go = t >= goT;
    const ctx = g.px;

    // ---------------- room: wall, window onto the night bay, string lights
    room(g, t, c, Ly, go ? clamp((t - goT) / 0.15) : 0);
    // ---------------- builders
    const tableY = Ly.table;
    for (let i = 0; i < 3; i++) {
      const x = Ly.xs[i];
      const lit = t >= lightT[i];
      const k = t - lightT[i];
      // soft glow on the wall behind a lit builder (one subtle dither step)
      if (lit) haloDisc(ctx, x, tableY - 26, k < 0.1 ? 21 : 18, '#1B4440', k < 0.1 ? 1 : 0.5);
      // lean toward the centre on "find a team", bounce on beats after GO
      let dx = 0, dy = 0;
      if (t >= teamT && i !== 1) dx = i === 0 ? 1 : -1;
      if (go) dy = -(c.pulse(t - i * 0.04, 0.2) > 0.5 ? 2 : 0) - 1;
      const look = t >= teamT && !go ? (i === 0 ? 1 : i === 2 ? -1 : (frameIndex(t, 2, 2) ? 1 : -1)) : 0;
      const cv = !lit ? bustDark(i) : bustLit(i, { look, grin: go || (k > 0 && k < 0.25), cheer: go && t - goT > 0.03 });
      ctx.drawImage(cv, R(x - BUST_W / 2 + dx), R(tableY - 10 - 27 + dy));
    }
    // ---------------- table (wood) + laptops
    table(ctx, g, tableY, Ly, t);
    for (let i = 0; i < 3; i++) {
      const x = Ly.xs[i];
      const lit = t >= lightT[i];
      const k = t - lightT[i];
      laptopLid(ctx, x, tableY + 1, i, lit, lit && k < 0.12 ? 1 : 0);
      if (lit) starBurst(ctx, x, tableY - 44, clamp(k / 0.35), i === 1 ? C.sky : C.gold, 7);
    }
    // ---------------- "find a team": light lines link the laptops, packets travel
    if (t >= teamT) {
      const k = clamp((t - teamT) / 0.25);
      const y = tableY - 13;
      for (let i = 0; i < 2; i++) {
        const xa = Ly.xs[i] + 13, xb = Ly.xs[i + 1] - 13;
        const xe = R(xa + (xb - xa) * ease.outCubic(k));
        for (let x = xa; x <= xe; x++) if ((x + Math.floor(onTwos(t) * 12)) % 3 !== 0) px(ctx, x, y, C.sky);
        if (k >= 1) {
          const pk = ((t - teamT) * 1.6 + i * 0.5) % 1;
          const pxp = R(xa + (xb - xa) * pk);
          rect(ctx, pxp - 1, y - 1, 3, 3, C.cream); px(ctx, pxp, y, C.gold);
        }
      }
    }
    // ---------------- GO: confetti + sparkles from the laptops
    if (go) {
      for (let i = 0; i < 3; i++) burst(ctx, Ly.xs[i], tableY - 14, t - goT, { n: 22, speed: 60, gravity: 70, seed: 5 + i, life: 0.9 });
    }

    // ---------------- type layer
    const hi = g.hi;
    const s = c.safe;
    corners(hi, c.fmt, { y: v ? 132 : undefined, alpha: 0.9 });
    // chip complements the line: who's welcome (not a caption)
    const chipStr = (c.facts.chips && c.facts.chips.short) || 'FREE · BEGINNERS WELCOME';
    anim(hi, t, { t0: chipT, t1: H[0], x: s.cx, y: Ly.chipY, enter: 'slide-up', exit: 'drop', dist: 48 },
      (h) => chip(h, chipStr, s.cx, Ly.chipY, { size: v ? 44 : 46, align: 'center' }));
    // READY · SET · GO with ||| start lights
    const words = ['READY', 'SET', 'GO!'];
    if (nHit >= 0) {
      const w = words[nHit];
      const size = v ? (nHit === 2 ? 300 : 200) : (nHit === 2 ? 330 : 230);
      const y = Ly.wordY;
      const bx = textBox(hi, w, s.cx, y, { role: 'display', size, align: 'center', baseline: 'cap-middle' });
      const barsH = Math.round(bx.h);
      const barW = 24, gap = 14;
      const totalW = bx.w + 3 * barW + 2 * gap + 48;
      const x0 = s.cx - totalW / 2;
      anim(hi, t, { t0: H[nHit], x: s.cx, y, enter: 'stamp' }, (h) => {
        // start lights: one coral bar per hit, the rest dim
        for (let i = 0; i < 3; i++) {
          h.fillStyle = i <= nHit ? C.coral : '#2F6660';
          const bh = Math.round(barsH / 6) * 6;
          h.fillRect(Math.round((x0 + i * (barW + gap)) / 6) * 6, Math.round((y - bh / 2) / 6) * 6, barW, bh);
        }
        text(h, w, x0 + 3 * barW + 2 * gap + 48, y, { role: 'display', size, baseline: 'cap-middle', color: nHit === 2 ? C.sky : C.cream, shadow: { dx: 6, dy: 6, color: C.tealDeep } });
      });
      if (nHit === 2) {
        const fk = 1 - (t - goT) / 0.15;
        if (fk > 0) flash(hi, g.W, g.H, 0.35 * Math.ceil(fk * 3) / 3, C.cream);
        plus(hi, s.x1 - 40, y - bx.h, { scale: 0.8 + 0.4 * c.pulse(t, 0.3) });
      }
    }
  },
};

function room(g, t, c, Ly, blaze) {
  const ctx = g.px;
  const { PW, PH } = g;
  // wall: deep teal with soft vertical panel seams
  rect(ctx, 0, 0, PW, PH, '#173B38');
  for (let x = 6; x < PW; x += 22) rect(ctx, x, 0, 1, Ly.table, '#1B4440');
  const W = Ly.win;
  // window: night bay inside
  ctx.save();
  ctx.beginPath(); ctx.rect(W.x, W.y, W.w, W.h); ctx.clip();
  bands(ctx, W.x, W.y, W.w, W.h, SKY.night.slice(1), { blend: 2 });
  stars(ctx, t, { x: W.x, y: W.y, w: W.w, h: W.h * 0.7, seed: 31, count: R((W.w * W.h) / 180) });
  moon(ctx, W.x + R(W.w * 0.18), W.y + R(W.h * 0.22), 5, { phase: 0.45 });
  const wy = W.y + R(W.h * 0.74);
  distantShore(ctx, t, wy, W.x, W.x + R(W.w * 0.55), { seed: 12 });
  water(ctx, t, { x: W.x, y: wy, w: W.w, h: W.y + W.h - wy, tod: 'night', seed: 9, glints: [{ x: W.x + R(W.w * 0.78), color: C.gold, w: 5 }] });
  const lx = W.x + R(W.w * 0.78);
  // beam sweeps side to side (never faces the camera: no flare blob at this size)
  lighthouse(ctx, lx, wy + 1, { h: 34, t, tod: 'night', beam: true, beamAngle: 0.7 * Math.sin(onTwos(t) * 1.3), beamLen: 70, beamStrength: 0.8 });
  ctx.restore();
  // frame + mullions + sill
  const F = '#0B2422';
  rect(ctx, W.x - 3, W.y - 3, W.w + 6, 3, F); rect(ctx, W.x - 3, W.y + W.h, W.w + 6, 2, F);
  rect(ctx, W.x - 3, W.y, 3, W.h, F); rect(ctx, W.x + W.w, W.y, 3, W.h, F);
  rect(ctx, W.x + R(W.w / 2) - 1, W.y, 2, W.h, F); rect(ctx, W.x, W.y + R(W.h * 0.45), W.w, 2, F);
  rect(ctx, W.x - 5, W.y + W.h + 2, W.w + 10, 3, '#214D49'); rect(ctx, W.x - 5, W.y + W.h + 2, W.w + 10, 1, '#2F6660');
  // a pumpkin on the sill (October touch)
  const py = W.y + W.h + 2;
  rect(ctx, W.x + 8, py - 4, 6, 4, '#E0874A'); rect(ctx, W.x + 9, py - 5, 4, 1, '#E0874A'); rect(ctx, W.x + 10, py - 4, 1, 4, '#C8613F'); rect(ctx, W.x + 12, py - 4, 1, 4, '#C8613F'); px(ctx, W.x + 11, py - 6, '#4A7A45');
  // string lights: catenary across the top, bulbs twinkle on the beat, blaze on GO
  const [y0, y1] = Ly.lightsY;
  const cols = [C.gold, C.coral, C.sky, C.cream];
  const beatI = Math.max(0, c.beat(t).index);
  let prev = null;
  for (let x = 0; x <= PW; x++) {
    const u = x / PW;
    const y = R(y0 + (y1 - y0) * 4 * u * (1 - u));
    px(ctx, x, y, '#0B2422');
    if (x % 14 === 7) {
      const i = Math.floor(x / 14);
      const col = cols[i % cols.length];
      const on = blaze > 0 || (i + beatI) % 2 === 0;
      px(ctx, x, y + 1, '#0B2422');
      rect(ctx, x - 1, y + 2, 3, 2, on ? col : '#2F5452'); px(ctx, x, y + 4, on ? col : '#2F5452');
      if (on) px(ctx, x - 1, y + 2, C.cream);
      if (blaze > 0 && (i + beatI) % 2 === 0) { px(ctx, x - 3, y + 3, col); px(ctx, x + 3, y + 3, col); px(ctx, x, y + 6, col); }
    }
  }
}

function table(ctx, g, T, Ly, t) {
  const { PW, PH } = g;
  const D = Ly.depth;
  // top surface (seen slightly from above), lit edge at the back, front edge highlight, dark front panel
  rect(ctx, 0, T + 1, PW, D, '#6B4228');
  rect(ctx, 0, T + 1, PW, 1, '#4A3B2C');
  for (let i = 0; i < 26; i++) {
    const gx = R(hash(i, 1, 4) * PW), gy = T + 3 + R(hash(i, 2, 4) * (D - 4));
    rect(ctx, gx, gy, 5 + R(hash(i, 3, 4) * 16), 1, hash(i, 5, 4) < 0.5 ? '#4A3B2C' : '#A85F32');
  }
  rect(ctx, 0, T + 1 + D, PW, 1, '#A85F32');
  rect(ctx, 0, T + 2 + D, PW, PH - T - 2 - D, '#3A2A20');
  rect(ctx, 0, T + 2 + D, PW, 1, '#1B1714');
  for (let i = 0; i < 30; i++) {
    const gx = R(hash(i, 1, 7) * PW), gy = T + 6 + D + R(hash(i, 2, 7) * (PH - T - D - 8));
    rect(ctx, gx, gy, 4 + R(hash(i, 3, 7) * 14), 1, '#4A3B2C');
  }
  // props on the surface
  const P = Ly.props, y0 = T + D - 1;
  // pumpkin
  const pk = P.pumpkin;
  rect(ctx, pk - 3, y0 - 4, 7, 4, '#E0874A'); rect(ctx, pk - 2, y0 - 5, 5, 1, '#E0874A'); rect(ctx, pk - 1, y0 - 4, 1, 4, '#C8613F'); rect(ctx, pk + 1, y0 - 4, 1, 4, '#C8613F');
  rect(ctx, pk - 3, y0 - 1, 7, 1, '#C8613F'); px(ctx, pk, y0 - 6, '#4A7A45'); px(ctx, pk + 1, y0 - 7, '#4A7A45');
  // sticky-note pad + pen
  const nx = P.notes;
  rect(ctx, nx - 4, y0 - 3, 8, 3, '#C8613F'); rect(ctx, nx - 4, y0 - 4, 8, 2, C.gold); rect(ctx, nx - 3, y0 - 3, 5, 1, '#D1AC70');
  rect(ctx, nx + 5, y0 - 1, 7, 1, C.sky); px(ctx, nx + 11, y0 - 1, C.cream);
  // little blue dev board with header pins (UNO Q nod, no logo)
  const bx = P.board;
  rect(ctx, bx - 6, y0 - 3, 12, 3, '#3F8ABD'); rect(ctx, bx - 6, y0 - 3, 12, 1, '#79AED3'); rect(ctx, bx - 6, y0 - 1, 12, 1, '#2B6A80');
  for (let i = 0; i < 5; i++) px(ctx, bx - 5 + i * 2, y0 - 4, C.gold);
  rect(ctx, bx + 1, y0 - 2, 3, 1, '#173B38');
  // coffee mug with steam (on twos)
  const mx = P.mug;
  rect(ctx, mx - 3, y0 - 7, 6, 7, C.cream); rect(ctx, mx - 3, y0 - 7, 6, 1, '#C9BBA0'); rect(ctx, mx - 3, y0 - 4, 6, 1, C.coral);
  rect(ctx, mx + 1, y0 - 6, 2, 6, '#E1D6BD'); rect(ctx, mx + 3, y0 - 6, 2, 1, C.cream); rect(ctx, mx + 4, y0 - 5, 1, 2, C.cream); rect(ctx, mx + 3, y0 - 3, 2, 1, C.cream);
  const f = Math.floor(onTwos(t) * 4) % 3;
  for (let k = 0; k < 3; k++) {
    const sy = y0 - 9 - k * 2 - f % 2, sx = mx - 1 + ((k + f) % 2 ? 1 : 0);
    if ((k + f) % 3 !== 2) px(ctx, sx, sy, '#79AED3');
  }
}
