// scenes/calendar.js (owner B) - C05, cue v1.1 "Saturday, October seventeen".
// Morning daylight, autumn. A pixel tear-off calendar pad: pages 13..16 rip off on eighth notes and tumble away
// with the leaves, SAT 17 lands on beat 3 of the line, a coral marker circles it. Label: ||| SAT 10.17.
import { C, RAMP } from '../lib/palette.js';
import { tween, ease, onTwos, clamp, hash, snap } from '../lib/motion.js';
import { rect, px, hline, vline, dither, pixelText, pixelTextWidth, makeCanvas } from '../lib/pixel.js';
import { text, bars, anim, corners, plus, measure, capRatio } from '../lib/text.js';
import { leaves, cloud, sun, sparkle, water, gull, grass, seawall } from '../lib/world.js';
import { SPB, cueOr, beatT, bigNumber, bigLeaves, drawRotated, ellipsePoints, strokePts, R } from './_B-kit.js';
import { autumnTree } from './_B-world.js';

const DAYS = [
  { n: 13, wd: 'TUE' }, { n: 14, wd: 'WED' }, { n: 15, wd: 'THU' }, { n: 16, wd: 'FRI' }, { n: 17, wd: 'SAT' },
];

// Pad geometry per format (pixel units)
const GEO = {
  '16x9': { x: 184, y: 37, W: 96, HH: 18, H: 80, dw: 25, dh: 40, ds: 6, dg: 6 },
  '9x16': { x: 34, y: 52, W: 112, HH: 20, H: 94, dw: 30, dh: 48, ds: 7, dg: 7 },
};

// ---------------------------------------------------------------- page art
const pageCache = new Map();
/** Page canvas (W x H) for a day. torn: zigzag top edge (flying page). */
function pageCanvas(fmt, day, torn) {
  const key = fmt + day.n + (torn ? 't' : '');
  if (pageCache.has(key)) return pageCache.get(key);
  const G = GEO[fmt];
  const { canvas, ctx } = makeCanvas(G.W, G.H);
  const sat = day.wd === 'SAT';
  const ink = sat ? RAMP.roof[2] : C.tealDeep;
  rect(ctx, 0, 0, G.W, G.H, C.cream);
  rect(ctx, G.W - 2, 0, 2, G.H, RAMP.tower[2]);           // shaded right edge (light from upper-left)
  rect(ctx, 0, G.H - 1, G.W, 1, RAMP.tower[2]);
  // weekday
  const wy = R(G.H * 0.08);
  const wscale = 1;
  pixelText(ctx, day.wd, G.W / 2 - 1, wy, ink, { font: 'small', align: 'center', scale: wscale });
  // big date
  const dy = wy + 12;
  bigNumber(ctx, day.n, G.W / 2 - 1, dy, G.dw, G.dh, G.ds, G.dg, ink);
  // foot: ruled note line, or the hack-day note on the 17th
  const fy = dy + G.dh + R(G.H * 0.1);
  if (sat) {
    pixelText(ctx, 'HACK DAY', G.W / 2 - 1, fy, RAMP.roof[2], { font: 'small', align: 'center' });
  } else {
    hline(ctx, 12, G.W - 14, fy + 4, RAMP.tower[1]);
    hline(ctx, 12, G.W - 14, fy + 8, RAMP.tower[1]);
  }
  if (torn) {
    // ragged perforated top edge
    for (let x = 0; x < G.W; x++) if (x % 3 === 1 || hash(x, 1, day.n) < 0.25) ctx.clearRect(x, 0, 1, 1);
    rect(ctx, 0, 1, G.W, 1, RAMP.tower[3]);
  }
  pageCache.set(key, canvas);
  return canvas;
}

/** Header + stack + current page with optional corner curl (0 none, 1, 2). */
function drawPad(p, fmt, x, y, day, curl, t) {
  const G = GEO[fmt];
  const W = G.W, HH = G.HH, H = G.H;
  // hard drop shadow (flat, key-art style)
  rect(p, x + 4, y + 4, W, HH + H + 5, C.tealDark);
  // stack of pages under the current one (edges) + cardboard back
  const sy = y + HH + H;
  rect(p, x, sy, W, 1, RAMP.tower[1]);
  rect(p, x, sy + 1, W, 1, RAMP.tower[3]);
  rect(p, x, sy + 2, W, 1, RAMP.tower[1]);
  rect(p, x, sy + 3, W, 1, RAMP.tower[2]);
  rect(p, x, sy + 4, W, 1, RAMP.stone[2]);
  rect(p, x + W - 2, sy, 2, 4, RAMP.tower[0]);
  // the current page
  p.drawImage(pageCanvas(fmt, day, false), x, y + HH);
  // perforation row under the header
  for (let i = 1; i < W - 1; i += 2) px(p, x + i, y + HH, RAMP.tower[1]);
  if (curl) {
    // bottom-right corner lifting: back of the paper as a folded flap
    const s = curl === 1 ? R(W * 0.14) : R(W * 0.3);
    const bx = x + W, by = y + HH + H;
    for (let j = 0; j < s; j++) {
      // cut corner: reveals the next page (cream) below the fold line
      rect(p, bx - (s - j), by - 1 - j, s - j, 1, C.cream);
      // flap: mirrored triangle, paper back (shaded)
      rect(p, bx - s, by - s + j, s - j, 1, j === 0 ? RAMP.tower[2] : RAMP.tower[1]);
      px(p, bx - s + (s - j - 1), by - s + j, RAMP.tower[0]);       // fold edge
    }
  }
  // header (coral board), light from the upper-left
  rect(p, x - 1, y, W + 2, HH, C.coral);
  rect(p, x - 1, y, W + 2, 1, RAMP.roof[4]);
  rect(p, x - 1, y, 1, HH, RAMP.roof[4]);
  rect(p, x + W, y + 1, 1, HH - 1, RAMP.roof[1]);
  rect(p, x - 1, y + HH - 2, W + 2, 1, RAMP.roof[1]);
  rect(p, x - 1, y + HH - 1, W + 2, 1, RAMP.roof[0]);
  // hanging hole + month
  const cx = x + R(W / 2) - 1;
  rect(p, cx - 1, y + 2, 3, 2, C.tealDeep);
  const ty = y + R((HH - 7) / 2) + 1;
  pixelText(p, 'OCTOBER', cx, ty, C.cream, { font: 'small', align: 'center', shadow: RAMP.roof[1] });
}

// ---------------------------------------------------------------- scene
export default {
  id: 'calendar',
  draw(g, t, c) {
    const { px: p, hi, PW, PH } = g;
    const fmt = c.fmt, v = fmt === '9x16';
    const G = GEO[fmt];
    const L = cueOr(c, 'v1.1');
    const B = (n) => beatT(c, L.start, n);
    const tq = onTwos(t);

    // tear times (eighth notes) -> 17 lands on beat 2 of the line
    const tears = [B(0.5), B(1), B(1.5), B(2)];
    const reveal = tears[3];
    let shown = 0;
    for (const tt of tears) if (t >= tt) shown++;

    // ---- background: morning teal, low sun, drifting clouds, the bay along the bottom
    if (!v) {
      sun(p, 34, 30, 8, { t, rays: true });
      cloud(p, 62 + R(tq * 2) % 30, 22, { kind: 'twoTone' });
      cloud(p, 120 + R(tq * 1.2) % 20, 150, { kind: 'small' });
      water(p, t, { x: 150, y: 164, w: PW - 150, h: PH - 164, tod: 'day', fade: 'left', fadeW: 60, seed: 11 });
    } else {
      sun(p, 148, 32, 9, { t, rays: true });
      cloud(p, 8 + R(tq * 2) % 20, 28, { kind: 'twoTone' });
      cloud(p, 112 + R(tq * 1.2) % 14, 262, { kind: 'small' });
      water(p, t, { x: 0, y: 294, w: PW, h: PH - 294, tod: 'day', fade: 'none', seed: 11 });
      // a scrap of key-art shoreline for the tree to stand on
      grass(p, 0, 284, 46, 4, { seed: 3 });
      seawall(p, 0, 288, 52, 8, { seed: 6 });
    }
    for (const [gx, gy, ph] of v ? [[18, 38, 0], [30, 45, 0.5]] : [[296, 70, 0], [306, 78, 0.4]]) {
      gull(p, gx + R(Math.sin(tq * 0.8 + ph * 6) * 2), gy, t, { phase: ph, rate: 2.2 });
    }
    // autumn tree peeking in at the bottom-left; small leaves drift behind the pad
    if (v) autumnTree(p, 20, 286, { w: 44, h: 66, seed: 5 });
    else autumnTree(p, 22, 190, { w: 52, h: 78, seed: 5 });
    leaves(p, t, { count: v ? 12 : 14, seed: 23, wind: 10, speed: 13 });

    // ---- the pad (hops 2px when the 17 lands, 1px on later beats)
    const kRev = t - reveal;
    let hop = 0;
    if (kRev >= 0 && kRev < 0.2) hop = [-3, -2, -1, 0][Math.min(3, Math.floor(onTwos(kRev) * 15))];
    else if (kRev >= 0.2) hop = -R(c.pulse(t, 0.12) * 1.4);
    const x = G.x, y = G.y + hop;
    // curl frames: 2 sprite frames (on twos) before each tear
    let curl = 0;
    if (shown < 4) {
      const nt = tears[shown];
      const pre = nt - t;
      if (pre <= 2 / 15 && pre > 0) curl = pre <= 1 / 15 ? 2 : 1;
    }
    drawPad(p, fmt, x, y, DAYS[shown], curl, t);

    // marker circle around 17, drawn on twos from beat 2.25 to 3
    if (t >= B(2.25)) {
      const k = tween(onTwos(t), B(2.25), B(3) - B(2.25), ease.outQuad);
      const cy = y + G.HH + R(G.H * 0.08) + 12 + R(G.dh / 2);
      const rx = R(G.dw + G.dg / 2 + 9), ry = R(G.dh / 2 + 5);
      const pts = ellipsePoints(x + R(G.W / 2) - 1, cy, rx, ry, -Math.PI * 0.62, 1.1);
      strokePts(p, pts, k, RAMP.roof[2], 2);
    }

    // ---- torn pages tumbling away (in front of the pad)
    const tempo = SPB / Math.max(0.15, B(1) - B(0));
    for (let i = 0; i < 4; i++) {
      const td = tears[i];
      if (t < td) continue;
      const k = onTwos(t - td) * tempo;                  // flight measured in beats, so it reads the same at any tempo
      const dir = i % 2 ? -1 : 1;                       // spin direction
      const vx = (v ? 150 : 210) * (0.85 + hash(i, 1, 9) * 0.3);
      const vy = -(v ? 170 : 110) * (0.8 + hash(i, 2, 9) * 0.4);
      const gr = v ? 160 : 120;
      const cx0 = x + G.W / 2, cy0 = y + G.HH + G.H / 2;
      const X = cx0 + vx * k + Math.sin(k * 9 + i) * 3;
      const Y = cy0 + vy * k + 0.5 * gr * k * k;
      if (Y > PH + 80 || X < -80 || X > PW + 80) continue;
      const deg = dir * (10 + 300 * k + Math.sin(k * 7) * 20);
      drawRotated(p, `cal${fmt}${i}`, pageCanvas(fmt, DAYS[i], true), X, Y, deg, 15);
    }

    // sparkles when the 17 lands + on the next beats
    const sp = v
      ? [[x - 8, y + 30], [x + G.W + 8, y + 14], [x + G.W + 4, y + G.HH + G.H - 6], [x - 4, y + G.HH + G.H]]
      : [[x - 9, y + 26], [x + G.W + 9, y + 10], [x + G.W + 6, y + G.HH + G.H - 4], [x - 6, y + G.HH + G.H + 2]];
    sp.forEach(([sx, sy], i) => {
      sparkle(p, sx, sy, t, reveal + i * 0.04, { size: 2, dur: 0.4 });
      sparkle(p, sx + (i % 2 ? -3 : 3), sy + 4, t, B(3) + i * 0.05, { size: 1, dur: 0.3, color: i % 2 ? C.sky : C.gold });
    });

    // big leaves in front
    bigLeaves(p, t, { n: v ? 5 : 6, seed: 5, wind: 16, fall: 15 });

    // key-art gold plus by the pad's top-right corner: pops with the 17, pulses on the beat after
    if (t >= reveal) {
      const pk = tween(t, reveal, 0.2, ease.outBack);
      const px0 = (x + G.W + 10) * 6, py0 = (y - 2) * 6;
      plus(hi, px0, py0, { scale: pk * (0.85 + 0.3 * c.pulse(t, 0.3)) });
    }

    // ---- type: ||| SAT 10.17 lands with the 17
    const F = c.facts;
    const label = `${F.date.weekdayShort} ${F.date.numeric}`;
    const s = c.safe;
    if (!v) {
      const size = 132;
      const cap = capRatio(hi, 'mono') * size;
      const bx = 96, by = snap(540 - cap / 2 - 18);
      const bh = snap(cap + 36);
      anim(hi, t, { t0: reveal, x: bx, y: by + bh / 2, enter: 'cut' }, (h) => bars(h, bx, by, bh, { grow: tween(t, reveal, 0.18) }));
      const tx = bx + 120;
      const m = measure(hi, label, { role: 'mono', size });
      anim(hi, t, { t0: reveal, x: tx + m.w / 2, y: by + bh / 2, enter: 'stamp' }, (h) =>
        text(h, label, tx, by + 18 + cap, { role: 'mono', size }));
    } else {
      const size = 118;
      const cap = capRatio(hi, 'mono') * size;
      const m = measure(hi, label, { role: 'mono', size });
      const bw = 96;
      const total = bw + 36 + m.w;
      const bx = snap(s.cx - total / 2), by = snap(1230 - cap / 2 - 18);
      const bh = snap(cap + 36);
      anim(hi, t, { t0: reveal, x: bx, y: by, enter: 'cut' }, (h) => bars(h, bx, by, bh, { grow: tween(t, reveal, 0.18) }));
      const tx = bx + bw + 36;
      anim(hi, t, { t0: reveal, x: tx + m.w / 2, y: by + bh / 2, enter: 'stamp' }, (h) =>
        text(h, label, tx, by + 18 + cap, { role: 'mono', size }));
    }
  },
};
