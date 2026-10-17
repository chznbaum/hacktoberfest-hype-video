// _A-builders.js (owner A): hand-placed pixel busts for the bridge (C24 builders): first-timer, student, pro.
// Each bust is painted once into a 28x36 offscreen canvas (cached): lit (screen-lit colors) and dark (silhouette
// with a cool rim light from the window behind). Arms-up "cheer" overlay for GO. Laptop lids seen from behind.
import { C, RAMP } from '../lib/palette.js';
import { makeCanvas, rect, px } from '../lib/pixel.js';
import { cached } from '../lib/world.js';

export const BUST_W = 28, BUST_H = 36;

// builder specs: inclusive skin tones, distinct silhouettes
export const BUILDERS = [
  { id: 'first-timer', skin: RAMP.skin[3], hair: RAMP.hair[0], hairHi: '#3A2A20', style: 'curly', top: C.coral, topShade: '#AD5E52', topLight: '#FB7966', collar: 'crew', tag: true, sticker: 'star' },
  { id: 'student', skin: RAMP.skin[0], hair: RAMP.hair[0], hairHi: '#3A2A20', style: 'long', top: C.sky, topShade: '#3F8ABD', topLight: '#A5CFE8', collar: 'hood', phones: true, sticker: 'heart' },
  { id: 'pro', skin: RAMP.skin[5], hair: RAMP.hair[5], hairHi: '#F7F7F2', style: 'pro', top: '#D1AC70', topShade: '#B97469', topLight: '#F8CC87', collar: 'cardigan', glasses: true, beard: true, sticker: 'code' },
];

const INK = '#123331', EYE = '#0B2422', MOUTH = '#8F4F47';

/** Paint a lit bust into ctx at (0,0). look: -1 | 0 | 1 (pupil shift). smile: bigger grin. */
function paintBust(c, b, { look = 0, grin = false } = {}) {
  const [K, S] = b.skin;            // shade, base
  const H = b.hair, Hh = b.hairHi;
  const T = b.top, Ts = b.topShade, Tl = b.topLight;
  const r = (x, y, w, h, col) => rect(c, x, y, w, h, col);
  // ---- back hair / hood (behind everything)
  if (b.style === 'long') { r(5, 7, 3, 20, H); r(20, 7, 3, 20, H); r(6, 26, 2, 2, H); r(20, 26, 2, 2, H); }
  if (b.collar === 'hood') { r(6, 19, 16, 4, Ts); r(5, 20, 18, 3, Ts); r(7, 19, 14, 1, T); }
  // ---- torso
  r(6, 21, 16, 1, T); r(3, 22, 22, 1, T); r(2, 23, 24, 13, T);
  r(21, 22, 4, 14, Ts); r(25, 23, 1, 13, Ts); r(2, 23, 1, 13, Tl); r(3, 22, 2, 1, Tl);
  // ---- neck
  r(11, 19, 6, 3, K); r(11, 21, 6, 1, K);
  // ---- collars
  if (b.collar === 'crew') { r(10, 21, 8, 1, Ts); r(11, 22, 6, 1, Ts); }
  if (b.collar === 'hood') {
    r(10, 21, 8, 2, K); r(11, 23, 6, 1, Ts);
    r(11, 24, 1, 4, C.cream); r(16, 24, 1, 4, C.cream); px(c, 11, 28, '#C9BBA0'); px(c, 16, 28, '#C9BBA0');
  }
  if (b.collar === 'cardigan') {
    // cream shirt V with the cardigan edges + buttons
    r(11, 21, 6, 2, C.cream); r(12, 23, 4, 2, C.cream); r(13, 25, 2, 2, C.cream);
    r(10, 21, 1, 6, Ts); r(17, 21, 1, 6, Ts); r(11, 23, 1, 4, Ts); r(16, 23, 1, 4, Ts);
    r(12, 25, 1, 2, Ts); r(15, 25, 1, 2, Ts); r(13, 27, 2, 9, Ts);
    px(c, 13, 29, C.cream); px(c, 13, 32, C.cream);
    r(13, 21, 2, 1, K);
  }
  if (b.tag) { // "HELLO my name is" sticker
    r(5, 23, 7, 2, C.coral); r(5, 25, 7, 3, C.cream); r(6, 26, 4, 1, '#827F6F');
  }
  if (b.phones) { // headphones around the neck
    r(7, 19, 14, 1, INK); r(6, 20, 1, 2, INK); r(21, 20, 1, 2, INK);
    r(5, 20, 3, 4, C.coral); r(20, 20, 3, 4, C.coral); r(5, 23, 3, 1, '#AD5E52'); r(20, 23, 3, 1, '#AD5E52');
  }
  // ---- head
  r(9, 4, 10, 1, S); r(8, 5, 12, 1, S); r(7, 6, 14, 11, S); r(8, 17, 12, 1, S); r(9, 18, 10, 1, S); r(10, 19, 8, 1, S);
  r(19, 7, 2, 10, K); r(18, 17, 2, 1, K); r(17, 18, 2, 1, K); r(16, 19, 2, 1, K);   // shade side (light from upper-left)
  r(6, 10, 1, 4, K); r(21, 10, 1, 4, K); px(c, 6, 11, S); px(c, 21, 11, K);       // ears
  // ---- face
  const ex = look;
  r(10 + ex, 11, 1, 2, EYE); r(16 + ex, 11, 1, 2, EYE);
  px(c, 10 + ex, 11, EYE);
  if (!b.glasses) { r(9, 9, 3, 1, H); r(15, 9, 3, 1, H); }       // brows
  px(c, 13, 14, K); px(c, 14, 14, K);                            // nose
  if (grin) { r(11, 16, 6, 1, MOUTH); r(12, 17, 4, 1, MOUTH); px(c, 12, 16, C.cream); px(c, 13, 16, C.cream); px(c, 14, 16, C.cream); px(c, 15, 16, C.cream); px(c, 10, 15, MOUTH); px(c, 17, 15, MOUTH); }
  else { r(12, 16, 4, 1, MOUTH); px(c, 11, 15, MOUTH); px(c, 16, 15, MOUTH); }
  // ---- hair styles
  if (b.style === 'curly') {
    r(8, 0, 12, 1, H); r(6, 1, 16, 1, H); r(5, 2, 18, 5, H); r(5, 7, 4, 3, H); r(19, 7, 4, 3, H); r(6, 10, 1, 1, H); r(21, 10, 1, 1, H);
    r(9, 7, 10, 1, H); // hairline
    // bumpy curly silhouette + highlight curls (upper-left)
    px(c, 7, 0, H); px(c, 20, 0, H); px(c, 4, 3, H); px(c, 23, 3, H); px(c, 4, 5, H); px(c, 23, 6, H);
    for (const [x, y] of [[8, 2], [11, 1], [14, 2], [7, 4], [10, 4], [13, 3], [17, 3], [6, 6], [16, 5], [20, 4]]) px(c, x, y, Hh);
    for (const [x, y] of [[9, 2], [12, 1], [8, 4], [6, 2]]) px(c, x, y, '#6B4228');
  }
  if (b.style === 'long') {
    r(9, 2, 10, 1, H); r(7, 3, 14, 1, H); r(6, 4, 16, 3, H); r(6, 7, 3, 3, H); r(19, 7, 3, 4, H);
    r(9, 7, 6, 1, H); r(9, 8, 3, 1, H);  // side-swept fringe
    for (const [x, y] of [[9, 3], [11, 3], [8, 5], [10, 4], [12, 4]]) px(c, x, y, Hh);
    // hair tie / ponytail bump behind
  }
  if (b.style === 'pro') {
    // bald crown (scalp highlight), grey sides
    px(c, 10, 5, '#643A22');
    r(6, 7, 2, 6, H); r(20, 7, 2, 6, H); px(c, 7, 6, H); px(c, 20, 6, H); r(7, 13, 1, 1, H); r(20, 13, 1, 1, H);
    px(c, 6, 8, Hh); px(c, 6, 10, Hh);
    // beard + moustache
    r(7, 14, 1, 3, H); r(20, 14, 1, 3, H); r(8, 15, 12, 2, H); r(8, 17, 12, 1, H); r(9, 18, 10, 1, H); r(10, 19, 8, 1, H); r(11, 20, 6, 1, H);
    r(10, 14, 8, 1, H); // moustache
    r(12, 16, 4, 1, MOUTH);
    px(c, 9, 16, Hh); px(c, 12, 18, Hh); px(c, 15, 19, Hh);
    // glasses
    const G = INK;
    r(8, 10, 5, 1, G); r(8, 13, 5, 1, G); r(8, 10, 1, 4, G); r(12, 10, 1, 4, G);
    r(15, 10, 5, 1, G); r(15, 13, 5, 1, G); r(15, 10, 1, 4, G); r(19, 10, 1, 4, G);
    r(13, 11, 2, 1, G); px(c, 7, 11, G); px(c, 20, 11, G);
    px(c, 9, 11, '#C1E2F2'); px(c, 16, 11, '#C1E2F2');   // screen glint on the lenses
    r(9, 9, 3, 1, H); r(15, 9, 3, 1, H);
  }
}

/** Arms raised overlay (cheer on GO): sleeves + fists either side of the head. */
function paintCheer(c, b) {
  const [K, S] = b.skin;
  const T = b.top, Ts = b.topShade;
  // sleeves from the shoulders up the sides, forearms + fists above the head
  rect(c, 2, 14, 4, 9, T); rect(c, 22, 14, 4, 9, Ts); px(c, 2, 22, T); px(c, 25, 22, Ts);
  rect(c, 1, 6, 3, 8, S); rect(c, 24, 6, 3, 8, S); rect(c, 3, 7, 1, 7, K); rect(c, 26, 7, 1, 7, K);
  rect(c, 0, 1, 4, 5, S); rect(c, 24, 1, 4, 5, S); rect(c, 0, 4, 4, 1, K); rect(c, 24, 4, 4, 1, K); px(c, 3, 1, K); px(c, 24, 1, K);
}

/** Lit bust canvas (cached). */
export function bustLit(i, opts = {}) {
  const b = BUILDERS[i];
  const key = `A-bust|${i}|${opts.look || 0}|${opts.grin ? 1 : 0}|${opts.cheer ? 1 : 0}`;
  return cached(key, BUST_W, BUST_H, (c) => { paintBust(c, b, opts); if (opts.cheer) paintCheer(c, b); });
}
/** Dark silhouette with a cool rim light along the top edges (window light from behind). */
export function bustDark(i) {
  return cached(`A-bust-dark|${i}`, BUST_W, BUST_H, (c) => {
    const src = bustLit(i);
    const m = makeCanvas(BUST_W, BUST_H);
    m.ctx.drawImage(src, 0, 0);
    const d = m.ctx.getImageData(0, 0, BUST_W, BUST_H).data;
    const on = (x, y) => x >= 0 && y >= 0 && x < BUST_W && y < BUST_H && d[(y * BUST_W + x) * 4 + 3] > 0;
    for (let y = 0; y < BUST_H; y++) for (let x = 0; x < BUST_W; x++) {
      if (!on(x, y)) continue;
      const rim = !on(x, y - 1) || (!on(x - 1, y) && y < 22) || (!on(x + 1, y) && y < 22);
      c.fillStyle = rim ? '#2F6660' : '#0F2B2A';
      c.fillRect(x, y, 1, 1);
    }
  });
}

/** Laptop lid seen from behind (26x11): brushed grey, a sticker, screen light leaking around the edges when on. */
export function laptopLid(ctx, cx, base, i, on, flash = 0) {
  const w = 26, h = 11;
  const x = Math.round(cx - w / 2), y = base - h;
  const body = on ? '#827F6F' : '#3E4A44', edge = on ? '#9A9787' : '#5E665A', dark = on ? '#5E665A' : '#2E3936';
  if (on) { // screen light spilling past the lid edges
    rect(ctx, x - 1, y - 1, w + 2, 1, flash > 0.5 ? C.cream : '#A5CFE8');
    rect(ctx, x - 1, y, 1, h - 1, '#79AED3'); rect(ctx, x + w, y, 1, h - 1, '#79AED3');
  }
  rect(ctx, x, y, w, h, body);
  rect(ctx, x, y, w, 1, edge); rect(ctx, x, y, 1, h, edge);
  rect(ctx, x + w - 1, y + 1, 1, h - 1, dark); rect(ctx, x + 1, y + h - 1, w - 1, 1, dark);
  // sticker
  const sx = x + 9, sy = y + 3;
  const st = BUILDERS[i].sticker;
  if (st === 'star') { const g = on ? C.gold : '#7A7A6A'; rect(ctx, sx + 2, sy, 1, 5, g); rect(ctx, sx, sy + 2, 5, 1, g); rect(ctx, sx + 1, sy + 1, 3, 3, g); }
  if (st === 'heart') { const g = on ? C.coral : '#7A7A6A'; rect(ctx, sx, sy, 2, 2, g); rect(ctx, sx + 3, sy, 2, 2, g); rect(ctx, sx, sy + 1, 5, 2, g); rect(ctx, sx + 1, sy + 3, 3, 1, g); px(ctx, sx + 2, sy + 4, g); }
  if (st === 'code') { // tiny </> in sky
    const g = on ? C.sky : '#7A7A6A';
    px(ctx, sx + 1, sy + 1, g); px(ctx, sx, sy + 2, g); px(ctx, sx + 1, sy + 3, g);
    px(ctx, sx + 4, sy, g); px(ctx, sx + 3, sy + 2, g); px(ctx, sx + 3, sy + 1, g); px(ctx, sx + 2, sy + 3, g); px(ctx, sx + 2, sy + 4, g);
    px(ctx, sx + 5, sy + 1, g); px(ctx, sx + 6, sy + 2, g); px(ctx, sx + 5, sy + 3, g);
  }
  // hinge shadow on the table
  rect(ctx, x + 1, base, w - 2, 1, '#3A2A20');
  return { x, y, w, h };
}
