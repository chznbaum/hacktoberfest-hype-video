// _F-awards.js (owner F): pixel trophies for C20 "challenges". Five awards on one shared wooden plinth, each with
// an icon that fits its challenge (facts.challengeDetails order):
//   0 Best Open-Source AI Project   gold two-handled cup engraved </>
//   1 Best Use of Gemma 4           faceted blue gem on a coral cushion
//   2 Gloriously Overengineered     Rube-Goldberg toaster: gears, antenna bulb, gauge, pipe; toast pops on the beat
//   3 Best AI Security Project      shield with a gold padlock
//   4 Best Community Impact Project keeper's-house (key art) with a coral heart floating above
// Static parts are cached canvases (TW x TH, ground row = bottom, centre column CX); animated parts are drawn per frame.
import { C, RAMP } from '../lib/palette.js';
import { pixelText } from '../lib/pixel.js';
import { onTwos, frameIndex } from '../lib/motion.js';
import { painter, lathe, outlined, cyl, WOOD, R } from './_F-kit.js';

export const TW = 41, TH = 56, CX = 20;
const PL = 47; // plinth top row
const GOLD = [RAMP.autumn[2], RAMP.autumn[4], C.gold, RAMP.glow[3], RAMP.glow[4]];
const GOLD_DEEP = RAMP.autumn[1];
const W = RAMP.water; // [#1D4C4A, #2B6A80, #3F8ABD, #5A9CC6, #79AED3, #A5CFE8, #C1E2F2]
const T = RAMP.tower; // [#798F86, #B9B19C, #E6D9C1, #F2EADA, #FDF7EA]
const RF = RAMP.roof; // [#8F4F47, #AD5E52, #D55449, #F07770, #FB7966]
const HS = RAMP.house;
const INK = RAMP.ink[1];

function plinth(p) {
  const put = p.put;
  for (let x = -11; x <= 11; x++) { put(CX + x, PL, x > 8 ? WOOD.light : WOOD.hi); put(CX + x, PL + 1, x > 8 ? WOOD.base : WOOD.light); }
  for (let x = -13; x <= 13; x++) {
    put(CX + x, PL + 2, x > 10 ? WOOD.light : WOOD.hi);
    for (let y = PL + 3; y <= PL + 7; y++) put(CX + x, y, x === -13 ? WOOD.light : x >= 12 ? WOOD.shade : WOOD.base);
    put(CX + x, PL + 8, WOOD.deep);
  }
  // gold plaque with an engraved line
  for (let x = -6; x <= 6; x++) {
    put(CX + x, PL + 3, GOLD[3]); put(CX + x, PL + 4, GOLD[2]); put(CX + x, PL + 5, GOLD[2]); put(CX + x, PL + 6, GOLD[1]);
  }
  for (let x = -4; x <= 4; x++) if (x !== 1) put(CX + x, PL + 5, GOLD[0]);
  put(CX - 6, PL + 3, GOLD[4]);
}

// ---------------------------------------------------------------- 0: open-source cup
function cup(p) {
  const put = p.put;
  // handles (rings behind the bowl): left lit, right shaded
  for (const s of [-1, 1]) {
    const hx = CX + s * 13, hy = 21;
    for (let y = hy - 7; y <= hy + 7; y++) for (let x = hx - 7; x <= hx + 7; x++) {
      const d = Math.hypot((x - hx) * 1.0, (y - hy) * 0.95);
      if (d > 6.2 || d < 3.4 || s * (x - CX) < 12) continue;
      const outer = d > 5.1;
      const upper = y < hy;
      const col = s < 0 ? (outer ? (upper ? GOLD[2] : GOLD[1]) : upper ? GOLD[4] : GOLD[2]) : outer ? (upper ? GOLD[1] : GOLD[0]) : upper ? GOLD[3] : GOLD[1];
      put(x, y, col);
    }
  }
  // lip + interior
  for (let x = -13; x <= 13; x++) put(CX + x, 14, x > 9 ? GOLD[2] : GOLD[4]);
  for (let x = -14; x <= 14; x++) {
    const u = (x + 14.5) / 29;
    const edge = Math.abs(x) >= 13;
    put(CX + x, 15, edge ? cyl(u, GOLD) : x < 0 ? RF[0] : '#7A3E3E');
    put(CX + x, 16, Math.abs(x) >= 12 ? cyl(u, GOLD) : GOLD[1]);
  }
  lathe(p, CX, 17, [14, 14, 14, 14, 13, 13, 12, 12, 11, 10, 9, 8, 6, 4], GOLD);
  lathe(p, CX, 31, [3, 2], GOLD);
  lathe(p, CX, 33, [4, 4], [GOLD[0], GOLD[1], GOLD[1], GOLD[2], GOLD[3]]);
  lathe(p, CX, 35, [2, 2, 2, 2, 2], GOLD);
  lathe(p, CX, 40, [3, 4, 5, 7, 8, 9, 9], GOLD);
  for (let x = -9; x <= 9; x++) put(CX + x, 46, x > 5 ? GOLD[0] : GOLD[1]);
  // engraved </> (bold 2px strokes, deep cut)
  const LT = ['....XX', '...XX.', '.XX...', 'XX....', '.XX...', '...XX.', '....XX'];
  const SL = ['...XX', '...XX', '..XX.', '..XX.', '.XX..', 'XX...', 'XX...'];
  const GT = LT.map((r) => [...r].reverse().join(''));
  const ENG = LT.map((r, i) => r + '.' + SL[i] + '.' + GT[i]);
  const ex = CX - 9, ey = 18;
  ENG.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === 'X') put(ex + x, ey + y, RF[0]); }));
  plinth(p);
}

// ---------------------------------------------------------------- 1: gem on a cushion
function gemArt(p, g0 = 17) {
  const put = p.put;
  for (let r = 0; r < 6; r++) {           // crown
    const h = 6 + r;
    for (let x = -h; x <= h; x++) {
      const dl = -6 + r * 0.55, dr = 6 - r * 0.55;
      let col = x < dl ? W[5] : x > dr ? W[3] : r === 0 ? W[6] : W[4];
      if (r === 0 && x > 3) col = W[5];
      if (x === h) col = W[2];
      put(CX + x, g0 + r, col);
    }
  }
  for (let x = -11; x <= 11; x++) put(CX + x, g0 + 6, x < -3 ? W[6] : x < 6 ? W[4] : W[2]);   // girdle
  for (let r = 0; r < 12; r++) {          // pavilion
    const h = 11 - r;
    for (let x = -h; x <= h; x++) {
      const d = 5.5 * (1 - r / 11.5);
      let col = x < -d ? W[4] : x > d ? W[1] : W[2];
      if (x >= -d && x < -d + 2) col = W[3];
      if (x === -h) col = W[5];
      put(CX + x, g0 + 7 + r, col);
    }
  }
  // highlight glints
  put(CX - 4, g0 + 1, C.cream); put(CX - 3, g0 + 1, C.cream); put(CX - 4, g0 + 2, C.cream);
  put(CX - 7, g0 + 8, W[6]); put(CX - 6, g0 + 9, W[6]);
}
function gem(p) {
  gemArt(p, 19);
  const put = p.put;
  // coral velvet cushion swallowing the gem's tip, gold tassels, resting on the plinth
  const prof = [10, 12, 13, 13, 13, 13, 12, 10];
  prof.forEach((h, i) => {
    const y = 39 + i;
    for (let x = -h; x <= h; x++) {
      let col = i === 0 ? RF[4] : i < 3 ? (x < -6 ? RF[4] : x > 8 ? RF[2] : RF[3]) : i < 6 ? (x > 9 ? RF[1] : RF[2]) : RF[1];
      if (i === 7) col = RF[0];
      if (i <= 1 && Math.abs(x + 1) <= 3) col = RF[2]; // dimple under the gem
      put(CX + x, y, col);
    }
  });
  put(CX - 5, 40, RF[4]); put(CX - 9, 41, C.cream);
  for (const s of [-1, 1]) { put(CX + s * 13, 44, GOLD[2]); put(CX + s * 14, 45, GOLD[3]); put(CX + s * 14, 46, GOLD[1]); }
  plinth(p);
}

// ---------------------------------------------------------------- 2: overengineered toaster (static parts)
// A chrome toaster watched by a council of three little AI bots on poles, driven by meshing gears.
export const TOAST = { slots: [[7, 14], [17, 24]], top: 30 };
export const BOTS = [{ x: 2, y: 13 }, { x: 14, y: 4 }, { x: 35, y: 12 }]; // head top-left (5x4 head, antenna above)
function toaster(p) {
  const put = p.put;
  // bot poles (behind everything)
  for (let y = 18; y <= 46; y++) { put(4, y, T[1]); }
  for (let y = 9; y <= 30; y++) { put(16, y, y % 3 ? T[1] : T[0]); }
  for (let y = 17; y <= 33; y++) { put(37, y, T[1]); put(38, y, T[0]); }
  // bot heads: sky body, cream eyes, gold antenna tip
  for (const b of BOTS) {
    put(b.x + 2, b.y - 1, T[1]); put(b.x + 2, b.y - 2, C.gold);
    for (let y = 0; y < 4; y++) for (let x = 0; x < 5; x++) put(b.x + x, b.y + y, y === 0 ? W[4] : y === 3 ? W[2] : x === 0 ? W[4] : W[3]);
    put(b.x + 1, b.y + 1, C.cream); put(b.x + 3, b.y + 1, C.cream);
    put(b.x + 1, b.y + 2, W[2]); put(b.x + 3, b.y + 2, W[2]);
  }
  // toaster body x 5..28, y 30..46 (rounded top corners), front face lit from the left
  for (let y = 30; y <= 46; y++) for (let x = 5; x <= 28; x++) {
    if ((y === 30 && (x < 7 || x > 26)) || (y === 31 && (x === 5 || x === 28))) continue;
    let col = x === 5 ? T[2] : x <= 7 ? T[4] : x <= 23 ? T[3] : x <= 26 ? T[2] : T[1];
    if (y === 30) col = x > 24 ? T[3] : T[4];
    if (y >= 45) col = y === 46 ? T[0] : T[1];
    put(x, y, col);
  }
  for (const [a, b] of TOAST.slots) for (let x = a; x <= b; x++) { put(x, 30, INK); put(x, 31, T[1]); }
  // coral retro stripe + dial + lever
  for (let x = 5; x <= 28; x++) { put(x, 38, x > 25 ? RF[2] : RF[3]); put(x, 39, x > 25 ? RF[1] : RF[2]); }
  for (let y = 41; y <= 43; y++) for (let x = 9; x <= 11; x++) put(x, y, (x + y) % 2 ? INK : T[1]);
  put(10, 42, RF[3]);
  for (let x = 1; x <= 4; x++) { put(x, 33, RF[3]); put(x, 34, RF[1]); }
  // feet
  put(7, 46, INK); put(8, 46, INK); put(25, 46, INK); put(26, 46, INK);
  // copper drive pipe from the gear tower into the toaster's back
  const PIPE = [RAMP.autumn[0], RAMP.autumn[1], RAMP.autumn[2]];
  for (let x = 26; x <= 38; x++) { put(x, 26, PIPE[2]); put(x, 27, PIPE[1]); }
  for (let y = 26; y <= 29; y++) { put(26, y, PIPE[2]); put(27, y, PIPE[0]); }
  plinth(p);
}
/** Gear canvas for a rotation frame (teeth n, radius r), cached. ramp = [shade, base, light] */
export function gearArt(n, r, ramp, frame, frames = 4) {
  const S = r * 2 + 5;
  return painter(`gear|${n}|${r}|${ramp.join()}|${frame}|${frames}`, S, S, (p) => {
    const c = (S - 1) / 2;
    const rot = (frame / frames) * (Math.PI * 2 / n);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const dx = x - c, dy = y - c, d = Math.hypot(dx, dy);
      const a = Math.atan2(dy, dx) - rot;
      const tooth = ((a * n) / (Math.PI * 2) % 1 + 1) % 1 < 0.5;
      const rr = tooth ? r + 1.6 : r;
      if (d > rr) continue;
      if (d < 1.3) { p.put(x, y, INK); continue; }
      const lit = dx + dy < -1;
      let col = lit ? ramp[2] : dx + dy > 2 ? ramp[0] : ramp[1];
      if (d < r - 2.2 && d > 1.3) col = d < 2.6 ? ramp[2] : ramp[1];
      if (d >= r - 2.2 && d < r - 1.2) col = ramp[0];
      p.put(x, y, col);
    }
  });
}
export const GEARS = [
  { x: 33, y: 39, n: 8, r: 5, ramp: [W[1], W[3], W[5]], dir: 1 },
  { x: 36, y: 29, n: 6, r: 3, ramp: [RF[1], RF[3], RF[4]], dir: -1 },
];

// ---------------------------------------------------------------- 3: shield + padlock
function shield(p) {
  const put = p.put;
  const prof = [];
  for (let r = 0; r < 25; r++) prof.push(r < 13 ? 12 : Math.max(0, 12 - Math.round((r - 12) * 1.0)));
  prof.forEach((h, r) => {
    const y = 13 + r;
    for (let x = -h; x <= h; x++) {
      const rim = Math.abs(x) > h - 2 || r < 2 || (r > 12 && Math.abs(x) > h - 3);
      let col;
      if (rim) col = x < 0 ? (r < 1 ? T[4] : T[3]) : x > h - 1 ? T[0] : T[1];
      else col = x < 0 ? W[4] : W[3];
      if (!rim && x === 0) col = W[5];
      put(CX + x, y, col);
    }
  });
  // padlock: shackle + gold body + keyhole
  for (let y = 18; y <= 25; y++) for (let x = -4; x <= 4; x++) {
    const d = Math.hypot(x, (y - 23) * 1.1);
    if ((y < 23 && d <= 4.4 && d >= 2.4) || (y >= 23 && (Math.abs(x) === 4 || Math.abs(x) === 3))) put(CX + x, y, x < 0 ? T[3] : T[1]);
  }
  for (let y = 25; y <= 32; y++) for (let x = -6; x <= 6; x++) {
    let col = x < -3 ? GOLD[3] : x > 3 ? GOLD[1] : GOLD[2];
    if (y === 25) col = GOLD[4];
    if (y === 32) col = GOLD[0];
    put(CX + x, y, col);
  }
  put(CX, 27, INK); put(CX + 1, 27, INK); put(CX, 28, INK); put(CX + 1, 28, INK); put(CX, 29, INK); put(CX, 30, INK);
  lathe(p, CX, 38, [2, 2, 2, 2], GOLD);
  lathe(p, CX, 42, [3, 5, 7, 8, 9], GOLD);
  plinth(p);
}

// ---------------------------------------------------------------- 4: community house (heart drawn animated)
function house(p) {
  const put = p.put;
  // chimney
  for (let y = 25; y <= 31; y++) for (let x = 7; x <= 9; x++) put(CX + x, y, x === 7 ? RAMP.stone[4] : RAMP.stone[3]);
  for (let x = 6; x <= 10; x++) put(CX + x, 24, RAMP.stone[5]);
  // walls x -10..10, y 35..46
  for (let y = 35; y <= 46; y++) for (let x = -10; x <= 10; x++) put(CX + x, y, x < -7 ? HS[4] : x > 7 ? HS[1] : y === 46 ? HS[1] : HS[3]);
  // gable roof y 26..35
  for (let r = 0; r <= 9; r++) {
    const h = 1 + Math.round(r * 1.3);
    for (let x = -h; x <= h; x++) {
      let col = x < 0 ? RF[3] : RF[2];
      if (x === -h) col = RF[4];
      if (r === 9) col = RF[0];
      put(CX + x, 26 + r, col);
    }
  }
  // windows (warm lit) + door
  for (const wx of [-8, 4]) for (let y = 38; y <= 41; y++) for (let x = wx; x <= wx + 3; x++) {
    put(CX + x, y, y === 38 ? RAMP.glow[1] : x === wx + 1 ? RAMP.glow[4] : C.gold);
  }
  for (const wx of [-8, 4]) { put(CX + wx + 2, 39, RAMP.glow[1]); put(CX + wx + 2, 40, RAMP.glow[1]); }
  for (let y = 39; y <= 46; y++) for (let x = -2; x <= 1; x++) put(CX + x, y, y === 39 ? RAMP.window[0] : x === -2 ? '#123F42' : RAMP.window[1]);
  put(CX + 0, 43, C.gold);
  // bushes either side (key-art greens)
  const F = RAMP.foliage;
  for (const s of [-1, 1]) {
    const bx = CX + s * 12;
    for (let y = 41; y <= 46; y++) for (let x = bx - 3; x <= bx + 3; x++) {
      const d = Math.hypot(x - bx, (y - 44.5) * 1.15);
      if (d > 3.2) continue;
      put(x, y, y < 43 ? (x < bx ? F[6] : F[5]) : x > bx + 1 ? F[3] : F[4]);
    }
  }
  plinth(p);
}

const PAINT = [cup, gem, toaster, shield, house];
/** Static trophy canvas (outlined with ink) for index i. */
export function trophy(i) {
  const raw = painter('trophy' + i, TW, TH, PAINT[i]);
  return outlined('trophy' + i, raw, INK);
}

/** Coral heart (9x8) for the community award. */
export function heartArt(big = false) {
  const rows = big
    ? ['.ab...ab.', 'abbb.abbb', 'cbbbbbbbd', 'bbbbbbbbd', '.bbbbbbd.', '..bbbbd..', '...bbd...', '....d....']
    : ['.ab.ab.', 'abbbbbd', 'bbbbbbd', '.bbbbd.', '..bbd..', '...d...'];
  return painter('heart' + big, rows[0].length, rows.length, (p) => {
    rows.forEach((row, y) => [...row].forEach((ch, x) => {
      const col = { a: RF[4], b: RF[3], c: C.cream, d: RF[1] }[ch];
      if (col) p.put(x, y, col);
    }));
  });
}
/** Toast slice art (8 x 10): bread silhouette, toasted face, darker crust. */
export function toastArt() {
  const rows = ['.cccccc.', 'cffffffc', 'cfFFFFfc', 'cfFFFFfc', '.cfFFfc.', '.cfFFfc.', '.cfFFfc.', '.cffffc.', '.cffffc.', '.cffffc.'];
  return painter('toast3', 8, rows.length, (p) => {
    rows.forEach((row, y) => [...row].forEach((ch, x) => {
      const col = { c: RAMP.hair[3], f: RAMP.stone[5], F: RAMP.glow[3] }[ch];
      if (col) p.put(x, y, col);
    }));
    p.put(2, 1, RAMP.glow[4]); p.put(3, 1, RAMP.glow[4]);
  });
}
/** Tiny speech bubble (7x8) with '?' or '!' for the bot council. */
export function bubbleArt(kind) {
  const glyph = kind === '!' ? ['..X..', '..X..', '..X..', '.....', '..X..'] : ['.XX..', '...X.', '..X..', '.....', '..X..'];
  return painter('bubble' + kind, 7, 8, (p) => {
    for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) {
      if ((y === 0 || y === 6) && (x === 0 || x === 6)) continue;
      p.put(x, y, C.cream);
    }
    glyph.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === 'X') p.put(x + 1, y + 1, INK); }));
    p.put(2, 7, C.cream);
  });
}
export { GOLD, INK };
