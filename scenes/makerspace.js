// scenes/makerspace.js (owner B) - C07, cues v1.3 "Ten until four at the 757 Makerspace" + v1.4 "Sixteen Murray
// Street, yeah, you know the place". Morning daylight, autumn. A two-storey brick storefront with an in-world pixel
// sign 757 MAKERSPACE (marquee bulbs chase on eighths), a facade clock whose hands sweep 10 -> 4 across v1.3, a
// MURRAY ST street-sign pole at the corner, an autumn street tree and builders walking in.
// Labels (||| info block, key-art style): 10AM–4PM lands on v1.3, 16 MURRAY ST on v1.4.
import { C, RAMP } from '../lib/palette.js';
import { tween, ease, onTwos, clamp, hash, snap, frameIndex } from '../lib/motion.js';
import { rect, px, hline, vline, dither, line, disc, circle, pixelText, pixelTextWidth, makeCanvas } from '../lib/pixel.js';
import { text, bars, anim, measure, capRatio } from '../lib/text.js';
import { cached, cloud, gull, leaves, sparkle, person, pumpkin, sun } from '../lib/world.js';
import { cueOr, beatT, bigLeaves, R } from './_B-kit.js';
import { autumnTree } from './_B-world.js';

const BRICK = { dk: RAMP.roof[0], base: RAMP.roof[1], lt: RAMP.roof[2] };
const TRIM = { hl: RAMP.house[4], lt: RAMP.house[3], base: RAMP.house[2], sh: RAMP.house[1], dk: RAMP.house[0] };
const GLASS = { dk: RAMP.window[0], base: RAMP.window[2], lt: RAMP.teal[3], refl: RAMP.teal[5] };

// world layout per format (pixel units)
const LAY = {
  '16x9': {
    b: { x0: 136, x1: 296, top: 32, sign: 86, gf: 98, ground: 156 },
    upperRows: [{ y: 46, h: 28 }],
    clock: { x: 216, y: 60, r: 12 },
    pole: { x: 308, top: 44 },
    tree: { x: 122, base: 158, w: 40, h: 62 },
    street: 168,
  },
  '9x16': {
    b: { x0: 10, x1: 170, top: 96, sign: 196, gf: 208, ground: 268 },
    upperRows: [{ y: 108, h: 30 }, { y: 150, h: 30 }],
    clock: { x: 90, y: 165, r: 13 },
    pole: { x: 162, top: 110 },
    tree: { x: 12, base: 270, w: 36, h: 60 },
    street: 282,
  },
};

// ---------------------------------------------------------------- static facade (cached per fmt)
function facade(fmt, PW, PH) {
  const Lw = LAY[fmt], b = Lw.b;
  return cached(`B-maker|${fmt}`, PW, PH, (c) => {
    const W = b.x1 - b.x0, cx = R((b.x0 + b.x1) / 2);
    // ---- ground: sidewalk + curb + street (full width)
    const gy = b.ground;
    rect(c, 0, gy, PW, Lw.street - gy, RAMP.stone[3]);
    rect(c, 0, gy, PW, 1, RAMP.stone[5]);
    rect(c, 0, gy + 1, PW, 1, RAMP.stone[4]);
    for (let x = 6; x < PW; x += 22) vline(c, x, gy + 2, Lw.street - 2, RAMP.stone[2]);
    rect(c, 0, Lw.street - 2, PW, 1, RAMP.stone[5]);   // curb top
    rect(c, 0, Lw.street - 1, PW, 1, RAMP.stone[1]);
    rect(c, 0, Lw.street, PW, PH - Lw.street, RAMP.teal[1]);
    for (let x = 4; x < PW; x += 26) rect(c, x, Lw.street + R((PH - Lw.street) / 2), 12, 1, RAMP.teal[4]);
    // ---- building silhouette shadow on the sidewalk + side
    dither(c, b.x1, b.top + 4, 3, gy - b.top - 4, null, C.tealDark, 0.75);
    // ---- upper floors: muted brick, light from the upper-left
    rect(c, b.x0, b.top, W, b.sign - b.top, BRICK.base);
    for (let y = b.top + 6, row = 0; y < b.sign; y += 3, row++) {
      hline(c, b.x0, b.x1 - 1, y, BRICK.dk);
      for (let x = b.x0 + (row % 2 ? 3 : 0); x < b.x1; x += 7) {
        vline(c, x, y + 1, Math.min(b.sign - 1, y + 2), BRICK.dk);
        const hv = hash(x, y, 4);
        if (hv < 0.07) rect(c, x + 1, y + 1, 5, 2, BRICK.lt);
        else if (hv > 0.9) rect(c, x + 1, y + 1, 5, 2, BRICK.dk);
      }
    }
    rect(c, b.x0, b.top, 2, b.sign - b.top, BRICK.lt);                 // lit left edge
    rect(c, b.x1 - 2, b.top, 2, b.sign - b.top, BRICK.dk);              // shaded right edge
    // cornice: cream band with dentils + a coral cap (key-art roof red)
    rect(c, b.x0 - 3, b.top - 3, W + 6, 3, C.coral);
    rect(c, b.x0 - 3, b.top - 3, W + 6, 1, RAMP.roof[4]);
    rect(c, b.x0 - 2, b.top, W + 4, 4, TRIM.lt);
    rect(c, b.x0 - 2, b.top, W + 4, 1, TRIM.hl);
    for (let x = b.x0; x < b.x1; x += 4) rect(c, x, b.top + 4, 2, 2, TRIM.base);
    rect(c, b.x0 - 2, b.top + 3, W + 4, 1, TRIM.sh);
    // upper windows (two per side of the clock), arched, cream trim + sill
    const cl = Lw.clock;
    for (const row of Lw.upperRows) {
      const ww = 16, gap = 8;
      const xs = [cl.x - cl.r - gap - ww * 2 - 6, cl.x - cl.r - gap - ww, cl.x + cl.r + gap, cl.x + cl.r + gap + ww + 6];
      for (const wx of xs) {
        {
          rect(c, wx - 1, row.y - 1, ww + 2, row.h + 2, TRIM.lt);
          rect(c, wx, row.y, ww, row.h, GLASS.base);
          rect(c, wx, row.y, ww, 2, GLASS.dk);
          px(c, wx, row.y, TRIM.lt); px(c, wx + ww - 1, row.y, TRIM.lt);
          // sash bar + reflection
          hline(c, wx, wx + ww - 1, row.y + R(row.h * 0.45), TRIM.base);
          vline(c, wx + R(ww / 2), row.y, row.y + row.h - 1, TRIM.base);
          line(c, wx + 2, row.y + 9, wx + 6, row.y + 5, GLASS.refl);
          line(c, wx + 2, row.y + 12, wx + 4, row.y + 10, GLASS.refl);
          // sill + keystone
          rect(c, wx - 2, row.y + row.h + 1, ww + 4, 2, TRIM.lt);
          rect(c, wx - 2, row.y + row.h + 2, ww + 4, 1, TRIM.sh);
          rect(c, wx + R(ww / 2) - 2, row.y - 3, 4, 2, TRIM.lt);
        }
      }
    }
    // clock backing plate (medallion) - face/hands are dynamic
    disc(c, cl.x, cl.y, cl.r + 3, TRIM.lt);
    disc(c, cl.x + 1, cl.y + 1, cl.r + 2, TRIM.sh);
    disc(c, cl.x, cl.y, cl.r + 2, TRIM.lt);
    // ---- sign band: deep-teal board (text + bulbs are drawn per frame)
    rect(c, b.x0 - 2, b.sign, W + 4, b.gf - b.sign, C.tealDeep);
    rect(c, b.x0 - 2, b.sign, W + 4, 1, TRIM.lt);
    rect(c, b.x0 - 2, b.gf - 1, W + 4, 1, TRIM.sh);
    // ---- ground floor storefront
    const gf = b.gf;
    rect(c, b.x0, gf, W, gy - gf, TRIM.base);
    rect(c, b.x0, gf, 3, gy - gf, TRIM.hl);
    rect(c, b.x1 - 3, gf, 3, gy - gf, TRIM.sh);
    const doorW = 16, dx0 = cx - doorW / 2;
    const winTop = gf + 10, winBot = gy - 8;
    const wins = [[b.x0 + 6, dx0 - 5], [dx0 + doorW + 5, b.x1 - 6]];
    for (const [x0, x1] of wins) {
      rect(c, x0 - 1, winTop - 1, x1 - x0 + 2, winBot - winTop + 2, TRIM.sh);
      rect(c, x0, winTop, x1 - x0, winBot - winTop, GLASS.base);
      // interior: pendant lamps, pegboard, maker kit silhouettes
      for (let lx = x0 + 6; lx < x1 - 3; lx += 14) {
        vline(c, lx, winTop, winTop + 3, GLASS.dk);
        rect(c, lx - 2, winTop + 4, 5, 2, C.gold);
        px(c, lx - 2, winTop + 4, RAMP.glow[4]);
      }
      rect(c, x0 + 2, winTop + 9, x1 - x0 - 4, 9, GLASS.lt);
      for (let yy = winTop + 11; yy < winTop + 18; yy += 3) for (let xx = x0 + 4; xx < x1 - 3; xx += 3) px(c, xx, yy, GLASS.base);
      // workbench
      rect(c, x0 + 1, winBot - 9, x1 - x0 - 2, 2, RAMP.stone[3]);
      vline(c, x0 + 4, winBot - 7, winBot - 1, RAMP.stone[1]);
      vline(c, x1 - 5, winBot - 7, winBot - 1, RAMP.stone[1]);
      // glass reflection streaks (light from the upper-left)
      line(c, x0 + 3, winBot - 4, x0 + 13, winTop + 6, GLASS.refl);
      line(c, x0 + 6, winBot - 4, x0 + 12, winTop + 16, GLASS.refl);
    }
    // bulkheads under the windows
    for (const [x0, x1] of wins) {
      rect(c, x0 - 1, winBot + 1, x1 - x0 + 2, gy - winBot - 2, TRIM.lt);
      rect(c, x0 + 2, winBot + 3, x1 - x0 - 4, gy - winBot - 6, TRIM.sh);
    }
    // left window props: 3D printer + robot arm; right window: laptop row + soldering lamp
    const [l0, l1] = wins[0], [r0, r1] = wins[1];
    const bench = winBot - 9;
    rect(c, l0 + 6, bench - 10, 11, 10, TRIM.lt);                 // printer frame
    rect(c, l0 + 7, bench - 9, 9, 8, GLASS.dk);
    rect(c, l0 + 10, bench - 6, 3, 2, C.coral);                   // nozzle / print
    rect(c, l0 + 9, bench - 3, 5, 2, C.coral);
    const ax = l1 - 12;
    rect(c, ax, bench - 3, 6, 3, C.sky);                          // robot arm base
    line(c, ax + 3, bench - 3, ax + 5, bench - 10, C.sky);
    line(c, ax + 4, bench - 3, ax + 6, bench - 10, C.sky);
    line(c, ax + 5, bench - 10, ax + 10, bench - 13, C.sky);
    rect(c, ax + 9, bench - 14, 3, 2, C.gold);
    for (let i = 0; i < 2; i++) {                                  // laptops
      const lx = r0 + 5 + i * 14;
      rect(c, lx, bench - 6, 9, 6, RAMP.stone[4]);
      rect(c, lx + 1, bench - 5, 7, 4, C.sky);
      rect(c, lx - 1, bench, 11, 1, RAMP.stone[3]);
    }
    line(c, r1 - 6, bench - 1, r1 - 6, bench - 9, RAMP.stone[1]);  // lamp
    line(c, r1 - 6, bench - 9, r1 - 10, bench - 12, RAMP.stone[1]);
    rect(c, r1 - 12, bench - 12, 4, 2, C.coral);
    // door: deep frame, glass upper half, kick plate; transom above
    rect(c, dx0 - 2, gf + 4, doorW + 4, gy - gf - 4, TRIM.sh);
    rect(c, dx0, gf + 13, doorW, gy - gf - 13, C.tealDark);
    rect(c, dx0 + 2, gf + 15, doorW - 4, R((gy - gf) * 0.45), GLASS.base);
    line(c, dx0 + 3, gf + 26, dx0 + 8, gf + 17, GLASS.refl);
    rect(c, dx0 + doorW - 4, gf + 33, 2, 2, C.gold);              // handle
    rect(c, dx0, gf + 5, doorW, 7, GLASS.dk);                      // transom (number drawn per frame)
    // step
    rect(c, dx0 - 4, gy - 1, doorW + 8, 2, RAMP.stone[4]);
    rect(c, dx0 - 4, gy - 1, doorW + 8, 1, RAMP.stone[5]);
    // awnings over the display windows: coral/cream stripes, scalloped edge, shadow
    for (const [x0, x1] of wins) {
      const ay = gf + 2, ah = 7;
      for (let x = x0 - 2; x < x1 + 2; x++) {
        const stripe = Math.floor((x - x0 + 2) / 3) % 2 === 0;
        vline(c, x, ay, ay + ah - 1, stripe ? C.coral : C.cream);
        if ((x - x0) % 3 !== 1) px(c, x, ay + ah, stripe ? C.coral : C.cream);
      }
      hline(c, x0 - 2, x1 + 1, ay, RAMP.roof[4]);
      dither(c, x0, ay + ah + 1, x1 - x0, 3, null, C.tealDeep, 0.5);
    }
  });
}

// ---------------------------------------------------------------- dynamic pieces
function clockFace(p, cl, hourAngle, minAngle, flash) {
  disc(p, cl.x, cl.y, cl.r + 1, RAMP.iron[1]);
  disc(p, cl.x, cl.y, cl.r, flash ? RAMP.glow[4] : TRIM.hl);
  // shaded lower-right rim of the face
  for (let a = 0; a < 24; a++) {
    const ang = (a / 24) * Math.PI * 2;
    if (Math.cos(ang - Math.PI / 4) > 0.5) px(p, R(cl.x + Math.cos(ang) * (cl.r - 1)), R(cl.y + Math.sin(ang) * (cl.r - 1)), TRIM.base);
  }
  // 12 ticks (quarters bigger)
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    const tx = R(cl.x + Math.cos(a) * (cl.r - 2)), ty = R(cl.y + Math.sin(a) * (cl.r - 2));
    px(p, tx, ty, i % 3 === 0 ? C.coral : RAMP.stone[2]);
  }
  const hand = (ang, len, col, thick) => {
    const ex = cl.x + Math.cos(ang - Math.PI / 2) * len, ey = cl.y + Math.sin(ang - Math.PI / 2) * len;
    line(p, cl.x, cl.y, ex, ey, col);
    if (thick) line(p, cl.x + (Math.abs(Math.cos(ang)) > 0.7 ? 0 : 1), cl.y + (Math.abs(Math.cos(ang)) > 0.7 ? 1 : 0), ex + (Math.abs(Math.cos(ang)) > 0.7 ? 0 : 1), ey + (Math.abs(Math.cos(ang)) > 0.7 ? 1 : 0), col);
  };
  hand(minAngle, cl.r - 3, C.tealDeep, false);
  hand(hourAngle, R(cl.r * 0.55), C.tealDeep, true);
  rect(p, cl.x - 1, cl.y - 1, 2, 2, C.coral);
}

function streetSign(p, pole, groundY, hop, F) {
  const x = pole.x, top = pole.top - hop;
  // pole + base + ball finial
  rect(p, x - 1, top, 3, groundY - top, RAMP.iron[1]);
  vline(p, x - 1, top, groundY - 1, RAMP.iron[3]);
  rect(p, x - 2, groundY - 3, 5, 3, RAMP.iron[0]);
  rect(p, x - 1, top - 2, 3, 2, RAMP.iron[3]);
  // blade: green street sign, cream border + text (MURRAY ST), mounted left of the pole
  const str = F.venue.streetSign;
  const tw = pixelTextWidth(str, { font: 'small' });
  const bw = tw + 8, bh = 13;
  const bx = x - bw + 3, by = top + 2;
  rect(p, bx + 1, by + 1, bw, bh, C.tealDeep);              // drop shadow
  rect(p, bx, by, bw, bh, RAMP.foliage[3]);
  rect(p, bx, by, bw, 1, RAMP.foliage[5]);
  hline(p, bx + 1, bx + bw - 2, by + 1, C.cream); hline(p, bx + 1, bx + bw - 2, by + bh - 2, C.cream);
  vline(p, bx + 1, by + 1, by + bh - 2, C.cream); vline(p, bx + bw - 2, by + 1, by + bh - 2, C.cream);
  pixelText(p, str, bx + 4, by + 3, C.cream, { font: 'small' });
  return { bx, by, bw, bh };
}

export default {
  id: 'makerspace',
  draw(g, t, c) {
    const { px: p, hi, PW, PH } = g;
    const fmt = c.fmt, v = fmt === '9x16';
    const Lw = LAY[fmt], b = Lw.b;
    const F = c.facts;
    const L3 = cueOr(c, 'v1.3', { start: 0, end: c.dur / 2 });
    const L4 = cueOr(c, 'v1.4', { start: L3.end, end: c.dur });
    const B = (n) => beatT(c, L3.start, n);
    const B4 = (n) => beatT(c, L4.start, n);
    const tq = onTwos(t);
    const cx = R((b.x0 + b.x1) / 2);

    // ---- sky: morning sun + drifting clouds + gulls
    if (v) {
      sun(p, 150, 60, 8, { t });
      cloud(p, 6 + (R(tq * 2) % 24), 30, { kind: 'twoTone' });
    } else {
      sun(p, 112, 20, 7, { t });
      cloud(p, 170 + (R(tq * 2) % 30), 12, { kind: 'big' });
      cloud(p, 20 + (R(tq * 1.5) % 20), 140, { kind: 'small' });
    }
    for (const [gx, gy, ph] of v ? [[44, 18, 0], [56, 25, 0.5]] : [[246, 18, 0], [258, 24, 0.5]]) {
      gull(p, gx + R(Math.sin(tq * 0.7 + ph * 6) * 3), gy, t, { phase: ph, rate: 2 });
    }

    // ---- the building (static) + its live parts
    p.drawImage(facade(fmt, PW, PH), 0, 0);

    // marquee bulbs around the sign board: chase on eighths, all-on flashes on v1.4 + "you know the place" beats
    const W = b.x1 - b.x0;
    const bulbs = [];
    for (let x = b.x0; x <= b.x1 - 1; x += 4) { bulbs.push([x, b.sign + 1]); }
    for (let x = b.x1 - 1; x >= b.x0; x -= 4) { bulbs.push([x, b.gf - 2]); }
    const eighth = Math.floor((t - L3.start) / Math.max(0.05, (B(1) - B(0)) / 2) + 1000);
    const allOn = [L4.start, B4(2), B4(3)].some((h) => t >= h && t < h + 0.14);
    bulbs.forEach(([x, y], i) => {
      const on = allOn || (i + eighth) % 3 === 0;
      px(p, x, y, on ? C.gold : RAMP.teal[2]);
    });
    // sign text (in-world pixel font), cream, with a gold flash on v1.4
    const signStr = F.venue.name.toUpperCase();
    const sFlash = t >= L4.start && t < L4.start + 0.12;
    pixelText(p, signStr, cx, b.sign + 3, sFlash ? C.gold : C.cream, { font: 'small', align: 'center' });

    // door number in the transom: lights gold on v1.4
    const doorX = cx;
    const numOn = t >= L4.start;
    pixelText(p, '16', doorX, b.gf + 6, numOn ? C.gold : TRIM.base, { font: 'tiny', align: 'center' });
    if (numOn) sparkle(p, doorX + 6, b.gf + 4, t, L4.start, { size: 2 });
    // OPEN sign hangs in the door glass, flips on at the downbeat of v1.3
    const openOn = t >= B(0);
    const oy = b.gf + 20;
    rect(p, doorX - 8, oy, 19, 7, openOn ? C.cream : TRIM.sh);
    hline(p, doorX - 6, doorX + 6, oy - 2, RAMP.stone[1]);
    pixelText(p, 'OPEN', doorX + 2, oy + 1, openOn ? RAMP.roof[2] : TRIM.dk, { font: 'tiny', align: 'center' });

    // clock: hands sweep 10 -> 4 across v1.3 (eased, on twos), land on beat 3, ding
    const cl = Lw.clock;
    const s0 = B(0) + 0.04, s1 = B(3);
    const k = tween(onTwos(t), s0, Math.max(0.1, s1 - s0), ease.inOutCubic);
    const hours = 10 + 6 * k;                     // 10:00 -> 16:00
    const hourA = ((hours % 12) / 12) * Math.PI * 2;
    const minA = ((hours % 1)) * Math.PI * 2;
    const ding = t >= s1 && t < s1 + 0.12;
    clockFace(p, cl, hourA, minA, ding);
    if (t >= s1) {
      sparkle(p, cl.x - cl.r - 4, cl.y - cl.r + 1, t, s1, { size: 2 });
      sparkle(p, cl.x + cl.r + 4, cl.y - 3, t, s1 + 0.06, { size: 2, color: C.sky });
    }

    // autumn street tree left of the building (sways a pixel on the bar)
    autumnTree(p, Lw.tree.x, Lw.tree.base, { w: Lw.tree.w, h: Lw.tree.h, seed: 7, t });

    // builders walking in: one from each side, plus one waiting at the door who cheers on v1.4
    const gy = b.ground + 7;
    const walkers = [
      { from: v ? -8 : 40, t0: B(0), t1: B(3.5), seed: 12 },
      { from: v ? 188 : 330, t0: B(1), t1: B4(1), seed: 4 },
      { from: v ? -8 : 60, t0: B4(0.5), t1: B4(3.5), seed: 9 },
    ];
    for (const w of walkers) {
      if (t < w.t0) { person(p, w.from, gy, { seed: w.seed, pose: 'stand', flip: w.from > doorX }); continue; }
      const kk = clamp((onTwos(t) - w.t0) / Math.max(0.1, w.t1 - w.t0));
      if (kk >= 1) continue;                                   // went inside
      const xx = R(w.from + (doorX - w.from) * kk);
      person(p, xx, gy, { seed: w.seed, pose: 'walk', t, flip: w.from > doorX });
    }
    const cheer = t >= L4.start;
    person(p, doorX + (v ? 30 : 34), gy, { seed: 21, pose: cheer && frameIndex(t - L4.start, 4, 2) === 0 ? 'cheer' : 'wave', t, flip: true });
    pumpkin(p, doorX - 14, b.ground + 1, { size: 1 });
    pumpkin(p, doorX + 14, b.ground + 1, { size: 2 });

    // street sign at the corner: hops on v1.4 (the street name), sparkles
    let hop = 0;
    const kh = t - L4.start;
    if (kh >= 0 && kh < 0.27) hop = [3, 2, 1, 0][Math.min(3, Math.floor(onTwos(kh) * 15))];
    const ss = streetSign(p, Lw.pole, b.ground + 6, hop, F);
    if (t >= L4.start) {
      sparkle(p, ss.bx - 3, ss.by - 2, t, L4.start, { size: 2 });
      sparkle(p, ss.bx + ss.bw + 1, ss.by + ss.bh, t, L4.start + 0.05, { size: 1, color: C.sky });
    }

    // falling leaves (small all over, big ones in front)
    leaves(p, t, { count: v ? 12 : 16, seed: 31, wind: 9, speed: 12 });
    bigLeaves(p, t, { n: v ? 3 : 4, seed: 8, wind: 14, fall: 13 });

    // ---- type: ||| info block, line 1 on v1.3, line 2 on v1.4
    const s = c.safe;
    const l1 = F.time.compact, l2 = F.venue.streetShort;
    const size = v ? 74 : 82;
    const cap = capRatio(hi, 'mono') * size;
    const gapL = R(size * 0.55);
    const x0 = v ? s.x0 : 96;
    const y0 = v ? 300 : snap(430 - (cap * 2 + gapL) / 2);
    const h1 = snap(cap + 36), h2 = snap(cap * 2 + gapL + 36);
    const bhNow = snap(h1 + (h2 - h1) * tween(t, L4.start, 0.15, ease.outCubic));
    if (t >= L3.start) bars(hi, x0, y0 - 18, bhNow, { grow: tween(t, L3.start, 0.2), barW: 24, gap: 12 });
    const tx = x0 + 96 + 36;
    const m1 = measure(hi, l1, { role: 'mono', size });
    const m2 = measure(hi, l2, { role: 'mono', size });
    anim(hi, t, { t0: L3.start, x: tx + m1.w / 2, y: y0 + cap / 2, enter: 'stamp' }, (h) => text(h, l1, tx, y0 + cap, { role: 'mono', size }));
    anim(hi, t, { t0: L4.start, x: tx + m2.w / 2, y: y0 + cap * 1.5 + gapL, enter: 'stamp' }, (h) =>
      text(h, l2, tx, y0 + cap * 2 + gapL, { role: 'mono', size, color: C.sky }));
  },
};
