// scenes/bring-kit.js (owner C) - C09, cue v1.6 "Bring a laptop, bring a charger, bring the crew".
// Same sunlit hack-table as C08 (continuity). Three hits (c.hits['v1.6'], fallback: beats 1-3):
//   1 laptop drops onto the table and flips open, code types on    -> label BRING A / LAPTOP
//   2 charger brick lands, cable snakes to the port, bolt + battery  -> chip + CHARGER
//   3 the crew pops in around it (spawn flash + dust), cheering on the next beat
import { C, RAMP } from '../lib/palette.js';
import { clamp, hash, onTwos, frameIndex } from '../lib/motion.js';
import { makeCanvas, rect, px, hline, vline, line, poly, sprite, drawSprite, silhouette } from '../lib/pixel.js';
import { chip, anim } from '../lib/text.js';
import { person, sparkle, burst } from '../lib/world.js';
import { clock, label, capH, shafts, motes, counter, contact, dropY, squashFrames, personX, R } from './_C-kit.js';

const AL = RAMP.cloud;           // laptop shell: sky aluminium (dark -> light)
const KEY = RAMP.iron;

// ---------------------------------------------------------------- laptop art
const lapCache = new Map();
/** Lid (screen side) at open-ness k (0 closed .. 1 open) + deck. Returns { canvas, W, H, scr: {x,y,w,h}, port: {x,y} } */
function laptopArt(W, LH, D, k) {
  const lidH = Math.max(2, R(LH * k));
  const key = [W, LH, D, lidH].join('x');
  if (lapCache.has(key)) return lapCache.get(key);
  const flare = 8;                          // deck widens toward the viewer
  const CW = W + flare * 2 + 2, CH = LH + D + 4;
  const { canvas, ctx } = makeCanvas(CW, CH);
  const lx = flare + 1, ly = CH - D - 2 - lidH;
  // deck (trapezoid): top surface + front edge + underside line
  const dTop = CH - D - 2;
  for (let r = 0; r < D; r++) {
    const ww = W + R((flare * 2 * r) / D);
    const x0 = lx + R((W - ww) / 2);
    rect(ctx, x0, dTop + r, ww, 1, r === 0 ? AL[1] : AL[2]);
    px(ctx, x0, dTop + r, AL[3]);                         // lit left edge
    px(ctx, x0 + ww - 1, dTop + r, AL[0]);
  }
  rect(ctx, 1, dTop + D, CW - 2, 1, AL[0]);
  rect(ctx, 2, dTop + D + 1, CW - 4, 1, RAMP.ink[1]);
  // keyboard rows + trackpad
  if (D >= 7) {
    for (let r = 0; r < 3; r++) {
      const yy = dTop + 1 + r * 2;
      const ww = W - 8 + R((flare * 2 * (r * 2 + 1)) / D);
      const x0 = lx + R((W - ww) / 2);
      for (let xx = x0; xx < x0 + ww; xx += 3) rect(ctx, xx, yy, 2, 1, KEY[3]);
    }
    const tw = R(W * 0.22);
    rect(ctx, lx + R((W - tw) / 2), dTop + D - 2, tw, 1, AL[3]);
  }
  // lid
  if (k < 0.2) {
    rect(ctx, lx, dTop - lidH, W, lidH, AL[3]);
    rect(ctx, lx, dTop - 1, W, 1, AL[1]);
  } else {
    rect(ctx, lx, ly, W, lidH, AL[2]);                    // aluminium rim
    rect(ctx, lx + 1, ly, W - 2, 1, AL[3]);
    rect(ctx, lx + 1, ly + 1, W - 2, lidH - 2, RAMP.ink[0]); // bezel
    vline(ctx, lx, ly + 1, ly + lidH - 1, AL[3]);
    vline(ctx, lx + W - 1, ly + 1, ly + lidH - 1, AL[0]);
    rect(ctx, lx + 2, dTop - 3, W - 4, 2, AL[1]);         // hinge
  }
  const scr = { x: lx + 4, y: ly + 4, w: W - 8, h: Math.max(0, lidH - 9) };
  const out = { canvas, CW, CH, W, lx, dTop, scr, port: { x: lx + W + R(flare * 0.6), y: dTop + 3 }, lidH };
  lapCache.set(key, out);
  return out;
}

/** Screen content: code typing on, battery with charging bolt, a crew "join" ping at the end. */
function screen(ctx, ox, oy, s, t, tOpen, tPlug, tCrew, tCheer) {
  const x0 = ox + s.x, y0 = oy + s.y;
  rect(ctx, x0, y0, s.w, s.h, RAMP.iron[0]);
  if (s.h < 8) return;
  if (t >= tCheer && s.h > 24) { bigTag(ctx, x0 + R(s.w / 2), y0 + R(s.h / 2), Math.min(28, s.h - 10), t - tCheer); return; }
  const age = t - tOpen;
  if (age < 0.06) { rect(ctx, x0, y0, s.w, s.h, RAMP.iron[3]); return; } // power-on flash
  // title bar
  rect(ctx, x0, y0, s.w, 3, RAMP.iron[2]);
  px(ctx, x0 + 2, y0 + 1, C.coral); px(ctx, x0 + 4, y0 + 1, C.gold); px(ctx, x0 + 6, y0 + 1, RAMP.foliage[6]);
  // battery (top-right): low + coral until the charger plugs in, then gold bolt and filling cells
  const bx = x0 + s.w - 11, by = y0 + 5;
  rect(ctx, bx, by, 8, 5, C.cream); rect(ctx, bx + 1, by + 1, 6, 3, RAMP.iron[0]); rect(ctx, bx + 8, by + 1, 1, 3, C.cream);
  const charging = t >= tPlug;
  const cells = charging ? clamp(1 + Math.floor((t - tPlug) * 10), 1, 3) : 1;
  for (let i = 0; i < cells; i++) rect(ctx, bx + 1 + i * 2, by + 1, 2, 3, charging ? RAMP.foliage[6] : C.coral);
  if (!charging && frameIndex(t, 4, 2)) rect(ctx, bx + 1, by + 1, 2, 3, RAMP.iron[0]);
  if (charging) { // bolt
    const gx = bx - 6, gy = by - 1;
    [[2, 0], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2], [3, 2], [1, 3], [2, 3], [1, 4], [0, 5]].forEach(([a, b]) => px(ctx, gx + a, gy + b, C.gold));
  }
  // code lines (indent, token runs) typing on at ~40 tokens/s
  const lines = [[0, [5, C.coral], [7, C.cream]], [2, [4, C.sky], [9, C.cream], [3, C.gold]], [2, [6, C.sky], [5, RAMP.foliage[6]]],
    [4, [3, C.coral], [10, C.cream]], [4, [8, C.cream], [4, C.sky]], [2, [2, C.gold]], [0, [3, C.coral]], [0, [6, C.sky], [6, C.cream]],
    [2, [5, C.gold], [7, C.cream]], [4, [4, C.sky], [8, C.cream], [5, C.coral]], [4, [9, C.cream]], [2, [3, C.gold], [6, C.sky]],
    [0, [2, C.coral]], [0, [7, C.sky], [4, C.cream]]];
  let budget = Math.floor(onTwos(age) * 90);
  let yy = y0 + 6;
  for (const [ind, ...runs] of lines) {
    if (yy + 1 >= y0 + s.h) break;
    let xx = x0 + 2 + ind * 2;
    for (const [n, col] of runs) {
      const take = Math.min(n, budget);
      if (take <= 0) break;
      if (xx + take > x0 + s.w - 14 && yy < by + 7) break;
      rect(ctx, xx, yy, Math.min(take, x0 + s.w - 2 - xx), 1, col);
      budget -= take; xx += n + 2;
    }
    yy += 3;
    if (budget <= 0) { if (frameIndex(t, 3, 2)) rect(ctx, Math.min(xx, x0 + s.w - 4), yy - 4, 2, 3, C.cream); break; }
  }
  // crew joined: three little avatar heads pop into a coral "party" bar at the bottom of the screen
  if (t >= tCrew && s.h > 20) {
    const py = y0 + s.h - 10;
    const n = clamp(1 + Math.floor((t - tCrew) / 0.066), 1, 3);
    rect(ctx, x0 + 2, py, 6 + n * 7, 8, C.coral);
    const heads = [[RAMP.skin[4][1], RAMP.hair[0]], [RAMP.skin[1][1], C.sky], [RAMP.skin[0][1], RAMP.hair[3]]];
    for (let i = 0; i < n; i++) {
      const hx = x0 + 5 + i * 7, [sk, hr] = heads[i];
      rect(ctx, hx, py + 2, 5, 2, hr); rect(ctx, hx, py + 4, 5, 3, sk);
      px(ctx, hx + 1, py + 5, C.tealDeep); px(ctx, hx + 3, py + 5, C.tealDeep);
    }
  }
}

/** Chunky </> glyph drawn natively on the grid (3px strokes), centred at (cx, cy), height h. Flash frame first. */
function bigTag(ctx, cx, cy, h, age) {
  const s3 = (x, y, col) => rect(ctx, x, y, 3, 3, col);
  const hh = h >> 1, w = R(h * 0.42);
  const col = age < 0.067 ? C.cream : C.sky;
  for (let i = 0; i <= hh; i++) {
    const dx = R((i / hh) * w);
    s3(cx - 12 - dx, cy - hh + i - 1, col);              // <  (vertex on the left)
    s3(cx - 12 - dx, cy + hh - i - 1, col);
    s3(cx + 10 + dx, cy - hh + i - 1, col);              // >  (vertex on the right)
    s3(cx + 10 + dx, cy + hh - i - 1, col);
  }
  for (let i = 0; i <= h; i++) s3(cx - 1 + R(((h / 2 - i) / h) * w * 1.1), cy - hh + i - 1, age < 0.067 ? C.cream : C.gold); // /
}

// ---------------------------------------------------------------- charger
const BRICK = [
  '..dddddddddd..',
  '.dlllllllllld.',
  'dllmmmmmmmmmld',
  'dlmmmmmmmmmmsd',
  'dlmmmmmmmmmmsd',
  'dlmmmmmmmmmssd',
  'dssssssssssssd',
  '.dddddddddddd.',
];
let brickSpr = null;
const brick = () => brickSpr || (brickSpr = sprite(BRICK, { d: RAMP.ink[0], l: RAMP.iron[3], m: RAMP.iron[2], s: RAMP.iron[1] }));

// ---------------------------------------------------------------- layout
const GEO = {
  '16x9': { ct: 126, depth: 24, lap: { x: 226, W: 86, H: 56, D: 10 }, brick: { x: 298 }, shaft: { x0: -20, slope: 0.72 },
    crew: [{ x: 140, dz: -2 }, { x: 166, dz: -3 }, { x: 284, dz: -8 }, { x: 153, dz: -7 }, { x: 312, dz: -9 }, { x: 128, dz: 2 }] },
  '9x16': { ct: 198, depth: 30, lap: { x: 92, W: 100, H: 70, D: 12 }, brick: { x: 162 }, shaft: { x0: -60, slope: 0.62 },
    crew: [{ x: 14, dz: 2 }, { x: 28, dz: 7 }, { x: 166, dz: -9 }, { x: 150, dz: 8 }, { x: 20, dz: -8 }, { x: 168, dz: 6 }] },
};
// crew looks: inclusive mix incl. a hijab
const CREW = [
  { seed: 4, skin: 4, hair: 0, style: 'curly', top: C.coral },
  { kind: 'hijab', skin: 1, scarf: C.sky, top: C.cream },
  { seed: 9, skin: 0, hair: 3, style: 'bun', top: C.gold },
  { seed: 12, skin: 2, hair: 1, style: 'cap', top: '#5D8B3B' },
  { seed: 21, skin: 5, hair: 0, style: 'short', top: C.sky },
  { seed: 30, skin: 3, hair: 2, style: 'long', top: C.cream },
];

export default {
  id: 'bring-kit',
  draw(g, t, c) {
    const { px: p, hi } = g;
    const G = GEO[c.fmt] || GEO['16x9'];
    const k = clock(c, 'v1.6');
    const hits = k.hits || [Math.max(0.08, Math.min(k.b0, 0.3)), k.at(1, 0.45), k.at(2, 0.7)];
    const [tLap, tChg, tCrew] = [Math.min(hits[0], 0.3), Math.min(hits[1], k.start + k.span * 0.5), Math.min(hits[2], k.start + k.span * 0.75)];
    // cheer on the first beat after the crew lands (or 2 beats of air if the grid is sparse)
    let tCheer = tCrew + 0.3;
    for (let n = 0; n < 8; n++) { const b = k.beat(n); if (b > tCrew + 0.12) { tCheer = Math.min(b, tCrew + 0.36); break; } }

    // ---- light + table
    const ct = G.ct;
    const inShaft = shafts(p, { x0: G.shaft.x0, slope: G.shaft.slope, top: 0, bottom: ct, list: [[0, 26, 1], [8, 10, 2], [44, 14, 1], [64, 6, 1]] });
    const cn = counter(p, ct, { depth: G.depth });
    shafts(p, { x0: G.shaft.x0 + G.shaft.slope * ct, slope: G.shaft.slope, top: ct + 1, bottom: ct + G.depth, list: [[0, 26, 1], [8, 10, 1], [44, 14, 1]] });
    motes(p, t, { x: 0, y: 0, w: 230, h: ct - 2, n: 22, seed: 8, mask: inShaft });

    // ---- crew (stand on the table top, behind/beside the laptop) - drawn back-to-front
    const crewOrder = G.crew.map((m, i) => ({ ...m, i })).sort((a, b) => a.dz - b.dz);
    const drawCrew = (front) => {
      for (const m of crewOrder) {
        if ((m.dz >= 0) !== front) continue;
        const ti = tCrew + m.i * 0.033 * 2;        // ripple: one sprite step apart
        if (t < ti) continue;
        const base = cn.floor + m.dz + 3;
        const age = t - ti;
        const hop = age < 0.2 ? -[3, 5, 5, 4, 2, 0][Math.min(5, Math.floor(age * 30))] : 0;
        const cheer = t >= tCheer;
        const pose = cheer ? 'cheer' : m.i % 2 ? 'wave' : 'stand';
        const look = CREW[m.i % CREW.length];
        contact(p, m.x, base, 10, 2, 0.5);
        if (age < 0.067) {           // spawn flash: cream silhouette for 2 frames
          const spr = look.kind ? personX(p, -99, -99, { ...look, pose, t }) : person(p, -99, -99, { ...look, pose, t });
          drawSprite(p, silhouette(spr, C.cream), m.x, base + hop, { anchor: 'bc' });
        } else if (look.kind) personX(p, m.x, base + hop, { ...look, pose, t: t - ti });
        else person(p, m.x, base + hop, { ...look, pose, t: t - ti });
        if (age < 0.5) burst(p, m.x, base - 2, age, { n: 8, speed: 18, gravity: 30, seed: 3 + m.i, life: 0.4, colors: [C.cream, RAMP.cloud[2]] });
        if (cheer) sparkle(p, m.x + (m.i % 2 ? 6 : -6), base - 18, t, tCheer + m.i * 0.05, { size: 2, dur: 0.35 });
      }
    };
    drawCrew(false);

    // ---- laptop: drops in closed, lands on hit 1, lid flips open over ~4 sprite frames
    const L = G.lap;
    if (t >= tLap - 0.16) {
      const [dw, dh] = squashFrames(t, tLap, 2);
      const openK = t < tLap + 0.04 ? 0 : [0.25, 0.55, 0.85, 1.05, 1][Math.min(4, Math.floor((t - tLap - 0.04) * 15))];
      const art = laptopArt(L.W + dw * 2, L.H, Math.max(4, L.D + dh), Math.min(1, openK));
      const base = cn.floor + 6;
      const ox = L.x - R(art.CW / 2), oy = base - art.CH + dropY(t, tLap, 70, 0.16);
      contact(p, L.x + 4, base - 1, art.CW + 4, 6, 0.6);
      p.drawImage(art.canvas, ox, oy);
      if (openK >= 0.85) screen(p, ox, oy, art.scr, t, tLap + 0.2, tChg + 0.1, tCrew, tCheer);
      if (openK >= 1 && t < tLap + 0.5) sparkle(p, ox + art.lx + 2, oy + art.scr.y - 3, t, tLap + 0.24, { size: 3, dur: 0.3 });
      // ---- charger: brick lands on hit 2; cable snakes from the brick to the port, then a zap
      if (t >= tChg - 0.16) {
        const bx = G.brick.x, bBase = cn.floor + 4;
        const [cw, chh] = squashFrames(t, tChg, 1);
        contact(p, bx + 1, bBase - 1, 18, 4, 0.6);
        const by = bBase + dropY(t, tChg, 60, 0.16);
        drawSprite(p, brick(), bx, by - (chh < 0 ? 0 : 0), { anchor: 'bc' });
        if (frameIndex(t, 2, 2) || t >= tChg + 0.1) px(p, bx - 4, by - 6, t >= tChg + 0.1 ? RAMP.foliage[6] : C.coral); // LED
        // cord to the wall (off-screen right)
        if (t >= tChg) hline(p, bx + 7, g.PW, by - 3, RAMP.ink[0]);
        if (t >= tChg) {
          const kk = clamp((t - tChg) / 0.14);
          const x0 = bx - 7, y0 = by - 3, x1 = ox + art.port.x, y1 = oy + art.port.y;
          // sagging cable on the table surface: a few straight pixel segments
          const pts = [[x0, y0], [x0 - (x0 - x1) * 0.35, y0 + 4], [x0 - (x0 - x1) * 0.75, y1 + 5], [x1 + 1, y1]];
          const segs = pts.length - 1, upto = kk * segs;
          for (let i = 0; i < segs; i++) {
            if (upto <= i) break;
            const f = clamp(upto - i);
            const [ax, ay] = pts[i], [bx2, by2] = pts[i + 1];
            line(p, ax, ay, ax + (bx2 - ax) * f, ay + (by2 - ay) * f, RAMP.ink[0]);
            line(p, ax, ay - 1, ax + (bx2 - ax) * f, ay - 1 + (by2 - ay) * f, RAMP.iron[2]);
          }
          if (kk >= 1) { rect(p, x1, y1 - 2, 3, 3, RAMP.iron[3]); sparkle(p, x1 - 1, y1 - 3, t, tChg + 0.15, { size: 3, dur: 0.35 }); }
        }
      }
    }
    drawCrew(true);
    if (t >= tCheer && t < tCheer + 0.9) {
      const kx = L.x, ky = cn.floor + 6 - L.H - L.D;
      burst(p, kx - 30, ky, t - tCheer, { n: 22, speed: 55, gravity: 90, seed: 41, life: 0.9, colors: [C.coral, C.gold, C.sky, C.cream] });
      burst(p, kx + 30, ky, t - tCheer - 0.033, { n: 22, speed: 55, gravity: 90, seed: 43, life: 0.9, colors: [C.gold, C.cream, C.coral, C.sky] });
    }

    // ---- type
    const s = c.safe;
    const size = c.fmt === '9x16' ? 148 : 158;
    const cap = capH(hi, size);
    const x0 = s.x0;
    const y1 = c.fmt === '9x16' ? s.y0 + 60 + cap : R(540 - cap * 0.25 - 40);
    const gap = R(cap * 0.42);
    label(hi, t, tLap, 'BRING A', x0, y1, { size });
    const l2 = label(hi, t, tLap, 'LAPTOP', x0, y1 + cap + gap, { size, color: C.sky });
    const chipSize = c.type.label + 8;
    const cy = l2.y1 + R(cap * 0.8);
    const capC = capH(hi, chipSize, 'cond', 700);
    anim(hi, t, { t0: tChg, x: x0 + 160, y: cy, enter: 'stamp' }, (h) => chip(h, '+ CHARGER', x0, cy, { size: chipSize, padX: R(capC * 1.1), padY: R(capC * 0.6) }));
  },
};
