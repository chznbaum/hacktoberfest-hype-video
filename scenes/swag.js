// scenes/swag.js (owner F) C22, cue v2.7 "T-shirts and stickers and swag in the mix".
// The hack table, seen from across it: a laptop (lid toward us), a sticker sheet pinned to the wall, an empty hook.
// A coral 757 tee drops onto the hook with the vocal ("T-shirts"); from the next beat, stickers peel off the sheet
// and SLAP onto the laptop lid on eighth notes (heart, 757, </>, lighthouse, pumpkin); SWAG stamps one beat before
// it is sung. Never implies everyone gets a shirt: one shirt on a hook, no counts.
import { C, RAMP } from '../lib/palette.js';
import { ease, clamp, onTwos, frameIndex } from '../lib/motion.js';
import { rect, px as dot, dither, poly, pixelText } from '../lib/pixel.js';
import { sparkle } from '../lib/world.js';
import { clock, painter, outlined, drawSquash, impact, woodTable, lbl, R } from './_F-kit.js';

const RF = RAMP.roof, T = RAMP.tower, IR = RAMP.iron, W = RAMP.water;

// ---------------------------------------------------------------- art
function teeArt() {
  return painter('tee3', 46, 42, (p) => {
    const c = p.ctx;
    // silhouette: sleeves + body (coral), then shading passes
    poly(c, [[11, 1], [17, 0], [28, 0], [34, 1], [45, 10], [40, 17], [35, 13], [35, 41], [10, 41], [10, 13], [5, 17], [0, 10]], RF[3]);
    poly(c, [[34, 1], [45, 10], [40, 17], [35, 13]], RF[2]);         // right sleeve in shade
    for (let y = 13; y <= 41; y++) { p.put(34, y, RF[2]); p.put(35, y, RF[1]); }
    poly(c, [[11, 1], [0, 10], [2, 12], [12, 3]], RF[4]);              // lit left sleeve edge
    for (let y = 13; y <= 40; y++) p.put(10, y, RF[4]);
    for (let x = 10; x <= 35; x++) p.put(x, 41, RF[1]);              // hem
    for (const [x, y] of [[4, 15], [5, 16], [41, 15], [40, 16]]) p.put(x, y, RF[1]); // sleeve hems
    // folds (soft vertical creases)
    for (const [x, y] of [[12, 14], [13, 15], [33, 14], [32, 15]]) p.put(x, y, RF[2]);
    // neckline (cut out) + collar band
    for (let y = 0; y <= 4; y++) for (let x = 17; x <= 28; x++) {
      const d = ((x - 22.5) / 6) ** 2 + ((y + 1) / 5.2) ** 2;
      if (d < 1) p.clear(x, y);
      else if (d < 1.45) p.put(x, y, RF[1]);
    }
    // print: 757 in cream with a tealDark shadow, a little wave stripe under it
    pixelText(c, '757', 23, 15, RF[1], { font: 'small', align: 'center' });
    pixelText(c, '757', 22, 14, C.cream, { font: 'small', align: 'center' });
    for (let x = 16; x <= 29; x++) p.put(x, 23 + (x % 4 < 2 ? 0 : 1), W[4]);
  });
}
function hangerArt() {
  return painter('hanger', 40, 10, (p) => {
    // wire hanger: hook + shoulders
    for (let y = 0; y <= 3; y++) p.put(20, y, T[1]);
    p.put(19, 0, T[1]); p.put(18, 1, T[1]);
    for (let i = 0; i < 18; i++) { const y = 4 + Math.floor(i / 3); p.put(20 - i, y, T[2]); p.put(20 + i, y, T[1]); }
  });
}
// Stickers (die-cut, cream border). Each: art painter -> outlined with cream.
const STK = {
  heart: () => painter('stk-heart', 9, 8, (p) => {
    ['.ab..ab..'.slice(0, 9), 'abbb.abbb', 'cbbbbbbbd', 'bbbbbbbbd', '.bbbbbbd.', '..bbbbd..', '...bbd...', '....d....']
      .forEach((row, y) => [...row].forEach((ch, x) => { const col = { a: RF[4], b: RF[3], c: C.cream, d: RF[1] }[ch]; if (col) p.put(x, y, col); }));
  }),
  chip757: () => painter('stk-757', 15, 9, (p) => {
    p.rect(1, 0, 13, 9, C.coral); p.rect(0, 1, 15, 7, C.coral);
    p.rect(1, 8, 13, 1, RF[2]);
    pixelText(p.ctx, '757', 8, 2, C.tealDark, { font: 'tiny', align: 'center' });
  }),
  code: () => painter('stk-code', 13, 13, (p) => {
    for (let y = 0; y < 13; y++) for (let x = 0; x < 13; x++) {
      const d = Math.hypot(x - 6, y - 6);
      if (d <= 6.3) p.put(x, y, x + y < 9 ? W[5] : W[4]);
    }
    pixelText(p.ctx, '</>', 7, 4, C.tealDark, { font: 'tiny', align: 'center' });
  }),
  lighthouse: () => painter('stk-lh', 13, 17, (p) => {
    for (let y = 0; y < 17; y++) for (let x = 0; x < 13; x++) {
      const d = Math.hypot((x - 6) / 6.4, (y - 8) / 8.4);
      if (d <= 1) p.put(x, y, W[4]);
    }
    // little lighthouse: roof, lamp, tower, base
    p.put(6, 2, RF[3]); p.rect(5, 3, 3, 1, RF[3]); p.rect(4, 4, 5, 1, RF[2]);
    p.rect(5, 5, 3, 2, C.gold); p.put(5, 5, RAMP.glow[4]);
    p.rect(4, 7, 5, 1, IR[1]);
    for (let y = 8; y <= 14; y++) { const hw = y < 11 ? 1 : 2; for (let x = -hw; x <= hw; x++) p.put(6 + x, y, x < 0 ? C.cream : x > 0 ? T[2] : C.cream); }
    p.put(6, 10, IR[1]); p.put(6, 13, IR[1]);
    p.rect(2, 15, 9, 1, RAMP.foliage[4]);
  }),
  pumpkin: () => painter('stk-pump', 11, 9, (p) => {
    ['....gg.....', '...g.......', '.oOOooOOo..', 'oOOooooOOo.', 'oOooooooOo.', 'oOooooooOo.', '.oOOooOOo..', '..oooooo...']
      .forEach((row, y) => [...row].forEach((ch, x) => { const col = { g: RAMP.foliage[4], o: '#E0874A', O: '#C8613F' }[ch]; if (col) p.put(x, y, col); }));
  }),
  spark: () => painter('stk-spark', 9, 9, (p) => {
    for (let i = -4; i <= 4; i++) { p.put(4 + i, 4, C.gold); p.put(4, 4 + i, C.gold); }
    for (let i = -2; i <= 2; i++) { p.put(4 + i, 4 + i, Math.abs(i) < 2 ? C.gold : RAMP.glow[1]); p.put(4 + i, 4 - i, Math.abs(i) < 2 ? C.gold : RAMP.glow[1]); }
    p.put(4, 4, RAMP.glow[4]); p.put(3, 4, RAMP.glow[4]);
  }),
};
function sticker(name) {
  return outlined('stk|' + name, STK[name](), C.cream);
}
/** Solid / dithered silhouette of a sticker (for its edge thickness on the lid and its flight shadow). */
function silh(name, art, col, level = 1) {
  return painter(`stk-sil|${name}|${col}|${level}`, art.width, art.height, (p) => {
    p.ctx.drawImage(art, 0, 0);
    p.ctx.globalCompositeOperation = 'source-in';
    if (level >= 1) p.rect(0, 0, art.width, art.height, col);
    else dither(p.ctx, 0, 0, art.width, art.height, null, col, level);
    p.ctx.globalCompositeOperation = 'source-over';
  });
}
/** The peeled-off spot left on the backing paper: the sticker's silhouette in a slightly darker cream. */
function backing(name, art) {
  return painter('stk-back|' + name, art.width, art.height, (p) => {
    p.ctx.drawImage(art, 0, 0);
    p.ctx.globalCompositeOperation = 'source-in';
    p.rect(0, 0, art.width, art.height, T[2]);
    p.ctx.globalCompositeOperation = 'source-over';
  });
}
const ORDER = ['heart', 'chip757', 'code', 'lighthouse', 'pumpkin', 'spark'];

const LAYOUT = {
  '16x9': {
    table: 140, lid: [192, 58, 116, 76], hook: [154, 14], tee: [154, 18], sheet: [132, 76, 44, 58],
    slots: [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2], [1, 2]],
    targets: [[208, 72], [246, 66], [284, 86], [216, 104], [258, 110], [292, 118]],
  },
  '9x16': {
    table: 234, lid: [50, 150, 116, 78], hook: [143, 82], tee: [143, 86], sheet: [8, 92, 44, 58],
    slots: [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2], [1, 2]],
    targets: [[66, 162], [104, 158], [140, 176], [76, 192], [118, 200], [150, 208]],
  },
};

function laptop(px, [x, y, w, h], shake) {
  const X = x + shake;
  // hinge strip + base edge peeking under the lid
  rect(px, X + 6, y + h, w - 12, 3, IR[0]);
  rect(px, X + 4, y + h + 3, w - 8, 2, T[0]);
  rect(px, X + 4, y + h + 3, w - 8, 1, T[1]);
  // lid back (navy aluminium), rounded corners, lit top-left edge, sheen band
  rect(px, X + 2, y, w - 4, h, IR[2]);
  rect(px, X, y + 2, w, h - 4, IR[2]);
  rect(px, X + 1, y + 1, w - 2, h - 2, IR[2]);
  rect(px, X + 2, y, w - 4, 1, IR[3]);
  rect(px, X, y + 2, 1, h - 4, IR[3]);
  dot(px, X + 1, y + 1, IR[3]);
  rect(px, X + 2, y + h - 1, w - 4, 1, IR[1]);
  rect(px, X + w - 1, y + 2, 1, h - 4, IR[1]);
  dot(px, X + w - 2, y + h - 2, IR[1]);
}

export default {
  id: 'swag',
  draw(g, t, c) {
    const { px, hi, PW, PH } = g;
    const k = clock(c, 'v2.7');
    const L = LAYOUT[c.fmt] || LAYOUT['16x9'];
    const tq = onTwos(t);
    // timing: tee lands half a beat before the downbeat (on "T-shirts"), stickers slap on eighths from beat 1
    const tTee = Math.max(k.start + 0.12, k.beat(-0.5));
    const slaps = ORDER.map((_, i) => k.beat(0.5 + i * 0.5));
    const flight = Math.min(0.2, k.spb * 0.34);

    // ---- set: table, laptop (shakes 1px on each slap), wall hook, sticker sheet
    woodTable(px, L.table, PW, PH);
    let shake = 0;
    for (const ts of slaps) if (t >= ts && t - ts < 2 / 30) shake = 1;
    laptop(px, L.lid, shake);
    const [hx, hy] = L.hook;
    rect(px, hx - 2, hy - 2, 5, 3, RAMP.ink[1]); dot(px, hx - 2, hy - 2, RAMP.stone[2]);
    rect(px, hx, hy + 1, 1, 2, T[1]);
    // sticker sheet pinned to the wall
    const [sx, sy, sw, sh] = L.sheet;
    rect(px, sx + 2, sy + 2, sw, sh, C.tealDeep);
    rect(px, sx, sy, sw, sh, T[3]);
    rect(px, sx, sy, sw, 1, T[4]);
    rect(px, sx + sw - 1, sy, 1, sh, T[1]);
    rect(px, sx, sy + sh - 1, sw, 1, T[1]);
    dither(px, sx + sw - 8, sy + sh - 8, 7, 7, null, T[2], 0.5);
    rect(px, sx + sw / 2 - 1, sy - 2, 3, 3, C.coral); dot(px, sx + sw / 2 - 1, sy - 2, RF[4]);
    const slotXY = (i) => [sx + 4 + L.slots[i][0] * 20, sy + 6 + L.slots[i][1] * 17];

    // ---- stickers: waiting on the sheet -> peeled & flying -> slapped on the lid
    ORDER.forEach((name, i) => {
      const art = sticker(name);
      const [ax, ay] = slotXY(i);
      const [tx, ty] = L.targets[i];
      const ts = slaps[i];
      if (t < ts - flight) {
        // on the sheet (the first frames of the peel lift a corner)
        px.drawImage(art, ax + (10 - art.width / 2) | 0, ay + (8 - art.height / 2) | 0);
        return;
      }
      // empty die-cut spot left behind on the sheet
      const ex = ax + (10 - art.width / 2) | 0, ey = ay + (8 - art.height / 2) | 0;
      px.drawImage(backing(name, art), ex, ey);
      const ox = tx - (art.width >> 1), oy = ty - (art.height >> 1) + (shake ? 1 : 0);
      if (t < ts) {
        const kf = clamp((t - (ts - flight)) / flight);
        const e = ease.inQuad(kf);
        const fx = R(ex + (ox - ex) * e), fy = R(ey + (oy - ey) * e - Math.sin(kf * Math.PI) * 18);
        // flying sticker: bigger shadow offset = higher off the lid
        const lift = R((1 - kf) * 5) + 1;
        px.drawImage(silh(name, art, kf < 0.4 ? T[1] : IR[0], 0.5), fx + lift, fy + lift);
        px.drawImage(art, fx, fy);
        return;
      }
      const [dw, dh] = (() => { const f = Math.floor((t - ts) * 30); return f < 2 ? [2, -2] : [0, 0]; })();
      // stuck: 1px dark contact shadow, then the sticker
      px.drawImage(silh(name, art, IR[1]), ox + 1, oy + 1);
      if (dw) drawSquash(px, art, ox + art.width / 2, oy + art.height, dw, dh);
      else px.drawImage(art, ox, oy);
      impact(px, tx, ty, t - ts, { r: Math.max(art.width, art.height) / 2 + 2, col: C.cream });
    });

    // ---- the tee drops onto the hook, stretches, and sways to rest
    if (t >= tTee - 0.2) {
      const [tx, ty] = L.tee;
      const kf = clamp((t - (tTee - 0.2)) / 0.2);
      const dy = t < tTee ? -R((ty + 50) * (1 - ease.inQuad(kf))) : 0;
      const since = t - tTee;
      const sway = since > 0 && since < 0.6 ? [1, 1, 0, -1, -1, 0, 1, 0, 0, 0][frameIndex(since, 15, 99) % 10] : 0;
      const tee = teeArt(), hanger = hangerArt();
      px.drawImage(hanger, tx - 20 + sway, ty + dy);
      const stretch = since >= 0 && since < 2 / 30 ? 2 : 0;
      drawSquash(px, tee, tx + sway, ty + dy + 4 + tee.height + stretch, stretch ? -2 : 0, stretch);
      if (since >= 0) sparkle(px, tx + 18, ty + 12, t, tTee + 0.05, { size: 2, dur: 0.3 });
    }

    // ---- label: SWAG, one beat before it is sung
    const s = c.safe;
    if (c.fmt === '9x16') lbl(hi, t, k.beat(1), 'SWAG', s.x0, 466, { role: 'display', size: 240, color: C.cream });
    else lbl(hi, t, k.beat(1), 'SWAG', s.x0 + 6, 640, { role: 'display', size: 236, color: C.cream });
  },
};
