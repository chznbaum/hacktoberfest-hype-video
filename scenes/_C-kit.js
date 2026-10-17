// _C-kit.js (owner C: coffee-bagels / bring-kit / open-source-ai / belongs-to-everyone)
// Local helpers that lib/ does not provide:
//   - clock(): beat grid keyed on a cue (first beat at/after the cue start, fractional beats, clamped to the clip)
//   - label(): the stamped two-tone condensed caps label used across verse 1b
//   - shafts(): warm morning light as flat additive bands (no gradients)
//   - counter(): the cafe/hack-table counter shared by C08 + C09 (continuity)
//   - steam(): rising, segmented pixel steam curls
//   - aiSpark(): the friendly AI spark (big with a face in C10, small "own spark" in C11)
//   - extra people: hijab + wheelchair variants drawn in the world.person 9x16 chibi style
import { C, RAMP } from '../lib/palette.js';
import { clamp, hash, onTwos, frameIndex, mod, ease, tween } from '../lib/motion.js';
import { makeCanvas, rect, px, hline, vline, dither, ellipse, disc, sprite, drawSprite, bayer } from '../lib/pixel.js';
import { text, textBox, anim, measure } from '../lib/text.js';
import { haloDisc } from '../lib/world.js';

export const R = Math.round;
const SPB_FALLBACK = 0.6;

// ---------------------------------------------------------------- timing
/**
 * Beat clock for a cue inside this clip. Works with the placeholder grid and the measured song map (where lines
 * start on vocal pickups, not on downbeats).
 *   k.start/k.end/k.span  cue range clamped to the clip
 *   k.beat(n)             time of the n-th beat counted from the first beat at/after the cue start (fractional ok)
 *   k.at(n, maxFrac)      same, but never later than start + span*maxFrac (so events still happen in short clips)
 *   k.hits                c.hits[id] or null
 */
export function clock(c, id, { tol = 0.08 } = {}) {
  const L = (c.lines && c.lines[id]) || { start: 0, end: c.dur };
  const start = Math.max(0, L.start), end = Math.min(c.dur, L.end);
  const span = Math.max(0.3, end - start);
  const b = c.beats || [];
  let i0 = b.findIndex((x) => x >= start - tol);
  let spb = SPB_FALLBACK;
  if (i0 >= 0 && b.length > 1) {
    const j = Math.min(Math.max(i0, 1), b.length - 1);
    spb = b[j] - b[j - 1] > 0.05 ? b[j] - b[j - 1] : SPB_FALLBACK;
  }
  const at0 = (j) => (j < 0 ? b[0] + j * spb : j >= b.length ? b[b.length - 1] + (j - b.length + 1) * spb : b[j]);
  const beat = (n) => {
    if (i0 < 0) return start + n * spb;
    const f = i0 + n, i = Math.floor(f), fr = f - i;
    return at0(i) + (at0(i + 1) - at0(i)) * fr;
  };
  const at = (n, maxFrac = 0.8) => Math.min(beat(n), start + span * maxFrac);
  const hits = (c.hits && c.hits[id] && c.hits[id].length) ? c.hits[id] : null;
  return { start, end, span, spb, beat, at, hits, b0: beat(0) };
}

// ---------------------------------------------------------------- type
/**
 * Stamped condensed-caps label line. (x, y) = left/center/right anchor at the BASELINE. Returns the cap box.
 * opts: size, color, align, weight (800), t1, exit, enter ('stamp'), tracking
 */
export function label(hi, t, t0, str, x, y, o = {}) {
  const opts = { role: 'cond', size: o.size || 120, weight: o.weight || 800, color: o.color || C.cream, align: o.align || 'left', tracking: o.tracking ?? 0.01, shadow: o.shadow };
  const s = String(str).toUpperCase();
  const bx = textBox(hi, s, x, y, opts);
  anim(hi, t, { t0, t1: o.t1, x: bx.cx, y: bx.cy, enter: o.enter || 'stamp', exit: o.exit || 'cut', dist: o.dist }, (h) => text(h, s, x, y, opts));
  return bx;
}
export const capH = (hi, size, role = 'cond', weight = 800) => measure(hi, 'H', { role, size, weight }).cap;

// ---------------------------------------------------------------- light
/**
 * Warm morning light: parallel diagonal shafts as flat additive bands (pixel-art banding, never gradients).
 * shafts(ctx, { x0, slope, list: [[offset, width, level]], top, bottom }) - each shaft is a parallelogram between
 * x = x0 + offset + slope*y and + width. level picks the additive strength (1..3).
 */
export function shafts(ctx, o = {}) {
  const H = ctx.canvas.height, W = ctx.canvas.width;
  const top = o.top ?? 0, bottom = o.bottom ?? H, slope = o.slope ?? 0.9;
  const ADD = ['#000000', '#0B0904', '#140F07', '#1C150A'];
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const [off, w, lvl] of o.list || []) {
    ctx.fillStyle = ADD[clamp(lvl, 0, 3)];
    for (let y = top; y < bottom; y++) {
      const xa = R((o.x0 ?? 0) + off + slope * (y - top));
      if (xa > W || xa + w < 0) continue;
      ctx.fillRect(xa, y, w, 1);
    }
  }
  ctx.restore();
  // mask predicate: is (x, y) inside any shaft?
  return (x, y) => y >= top && y < bottom && (o.list || []).some(([off, w]) => {
    const xa = R((o.x0 ?? 0) + off + slope * (y - top));
    return x >= xa && x < xa + w;
  });
}
/** Floating dust motes that twinkle on twos inside a band (sparse, deterministic). */
export function motes(ctx, t, { x, y, w, h, n = 10, seed = 3, colors = [C.cream, RAMP.glow[4]], mask = null } = {}) {
  const tq = onTwos(t);
  for (let i = 0; i < n; i++) {
    const sp = 2 + hash(i, 1, seed) * 3;
    const mx = x + mod(hash(i, 2, seed) * w + tq * sp * (hash(i, 5, seed) < 0.5 ? 1 : -1), w);
    const my = y + mod(hash(i, 3, seed) * h - tq * sp * 0.6, h);
    const tw = frameIndex(tq + hash(i, 4, seed) * 3, 3, 4);
    if (tw === 3 || (mask && !mask(R(mx), R(my)))) continue;
    px(ctx, R(mx), R(my), colors[i % colors.length]);
  }
}

// ---------------------------------------------------------------- the counter (C08 + C09)
/**
 * Counter / hack table across the frame (3/4 view): top surface rows y..y+depth-1 (objects stand around y+depth*0.6),
 * then a cream lip and a tealDark front face down to the bottom. Teal-family top keeps the key-art palette dominant.
 */
export function counter(ctx, y, { x = 0, w = null, depth = 20 } = {}) {
  const W = w ?? ctx.canvas.width, H = ctx.canvas.height - y;
  rect(ctx, x, y, W, 1, RAMP.teal[3]);                        // back edge
  rect(ctx, x, y + 1, W, depth - 1, RAMP.teal[5]);            // top surface
  // wood grain: sparse long streaks, lighter toward the front (light from upper-left)
  for (let i = 0; i < depth - 3; i += 3) {
    const yy = y + 2 + i;
    for (let xx = x - 40; xx < x + W; xx += 0) {
      const len = 10 + Math.floor(hash(xx, yy, 5) * 30);
      if (hash(xx, yy, 9) < 0.45) rect(ctx, xx, yy, len, 1, i > depth * 0.5 ? RAMP.teal[6] : RAMP.teal[4]);
      xx += len + 6 + Math.floor(hash(xx, yy, 7) * 20);
    }
  }
  const ly = y + depth;
  rect(ctx, x, ly, W, 1, RAMP.stone[6]);                      // lit lip
  rect(ctx, x, ly + 1, W, 2, RAMP.stone[4]);
  rect(ctx, x, ly + 3, W, 1, RAMP.stone[2]);
  rect(ctx, x, ly + 4, W, H - depth - 4, C.tealDark);         // front face
  rect(ctx, x, ly + 4, W, 2, RAMP.teal[1]);                   // shadow under the lip
  for (let px_ = x + 14; px_ < x + W; px_ += 40) {
    vline(ctx, px_, ly + 6, y + H, RAMP.teal[2]);
    vline(ctx, px_ + 1, ly + 6, y + H, RAMP.teal[4]);
  }
  return { top: y, lip: ly, floor: y + Math.round(depth * 0.62) };
}
/** Soft contact shadow on the counter top (dithered ellipse in the counter's own shadow tone). */
export function contact(ctx, cx, y, w, h = 4, level = 0.5) {
  const rx = Math.max(1, R(w / 2)), ry = Math.max(1, R(h / 2));
  ctx.save();
  ctx.beginPath();
  for (let dy = -ry; dy <= ry; dy++) {
    const kk = dy / (ry + 0.5);
    const half = Math.floor((rx + 0.5) * Math.sqrt(Math.max(0, 1 - kk * kk)));
    ctx.rect(R(cx) - half, R(y) + dy, half * 2 + 1, 1);
  }
  ctx.clip();
  dither(ctx, R(cx) - rx, R(y) - ry, rx * 2 + 1, ry * 2 + 1, null, RAMP.teal[3], level);
  ctx.restore();
}

// ---------------------------------------------------------------- steam
/**
 * Rising steam curls from (x, base) upward: S-curved ribbons that scroll up on twos. 3px thick + cream at the
 * bottom, thinning to 1px cloud-blue at the tip; the length "breathes" so wisps feel alive. No speckle dither.
 */
export function steam(ctx, x, base, t, { h = 36, amp = 4, seed = 1, speed = 14, period = 20, show = 1 } = {}) {
  if (show <= 0) return;
  const tq = onTwos(t);
  const ph = hash(seed, 9) * 6.28;
  const len = Math.floor(h * (0.78 + 0.22 * Math.sin(tq * 2.4 + ph)) * clamp(show * 1.3));
  let prevX = null;
  for (let yy = 0; yy < len; yy++) {
    const k = yy / h;
    const scroll = yy + tq * speed;
    const X = R(x + Math.sin((scroll / period) * Math.PI * 2 + ph) * (0.5 + amp * Math.min(1, k * 1.6)));
    const Y = R(base - yy);
    const tip = len - yy;
    const thick = tip <= 3 || k > 0.7 ? 1 : k < 0.32 ? 3 : 2;
    // keep the ribbon connected when it steps sideways by 2+
    const x0 = prevX !== null && Math.abs(X - prevX) > 1 ? Math.min(X, prevX + (X > prevX ? 1 : -1)) : X;
    const x1 = prevX !== null && Math.abs(X - prevX) > 1 ? Math.max(X, prevX + (X > prevX ? 1 : -1)) : X;
    for (let xx = x0; xx <= x1 + thick - 1; xx++) {
      const right = xx === x1 + thick - 1 && thick > 1;
      px(ctx, xx, Y, tip <= 3 || k > 0.7 ? RAMP.cloud[2] : right ? RAMP.cloud[2] : C.cream);
    }
    prevX = X;
  }
}

// ---------------------------------------------------------------- the AI spark
/**
 * Friendly AI spark: a chunky 4-point star with a soft dithered halo. size 'big' (with a face, C10) or 'small' (C11).
 * opts: { t, color (core tint), face, blink, glow 0..1, scale 1 }
 */
const SPARK_BIG = [
  '..........#..........',
  '..........#..........',
  '.........###.........',
  '.........###.........',
  '........#####........',
  '........#####........',
  '.......#######.......',
  '......#########......',
  '....#############....',
  '..#################..',
  '#####################',
  '..#################..',
  '....#############....',
  '......#########......',
  '.......#######.......',
  '........#####........',
  '........#####........',
  '.........###.........',
  '.........###.........',
  '..........#..........',
  '..........#..........',
];
const SPARK_SMALL = [
  '...#...',
  '...#...',
  '..###..',
  '#######',
  '..###..',
  '...#...',
  '...#...',
];
const SPARK_TINY = ['.#.', '###', '.#.'];
const sparkCache = new Map();
function sparkSprite(kind, core, rim, hot) {
  const key = kind + core + rim + hot;
  if (sparkCache.has(key)) return sparkCache.get(key);
  const src = kind === 'big' ? SPARK_BIG : kind === 'small' ? SPARK_SMALL : SPARK_TINY;
  const h = src.length, w = src[0].length, cx = (w - 1) / 2, cy = (h - 1) / 2;
  // shade: rim on the outline, core inside, hot centre + lit upper-left facets
  const solid = (x, y) => src[y] && src[y][x] === '#';
  const rows = src.map((row, y) => [...row].map((ch, x) => {
    if (ch !== '#') return '.';
    const edge = !solid(x - 1, y) || !solid(x + 1, y) || !solid(x, y - 1) || !solid(x, y + 1);
    const d = Math.abs(x - cx) + Math.abs(y - cy);
    if (kind === 'tiny') return x === cx && y === cy ? 'h' : 'c';
    if (edge && !(kind === 'small' && d < 2)) return (x < cx && y <= cy) || (y < cy && x <= cx) ? 'c' : 'r';
    if (d <= (kind === 'big' ? 4 : 1)) return 'h';
    return 'c';
  }).join(''));
  const spr = sprite(rows, { c: core, r: rim, h: hot });
  sparkCache.set(key, spr);
  return spr;
}
/** Plump 4-point star (concave sides) of radius r, procedural + cached: rim/body/core/highlight shading. */
const bigCache = new Map();
function bigSpark(r, core, rim, hot) {
  const key = [r, core, rim, hot].join('|');
  if (bigCache.has(key)) return bigCache.get(key);
  const S = r * 2 + 1, pw = 0.72, lim = Math.pow(r + 0.5, pw);
  const inside = (x, y) => Math.pow(Math.abs(x), pw) + Math.pow(Math.abs(y), pw) <= lim;
  const { canvas, ctx } = makeCanvas(S, S);
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
    if (!inside(x, y)) continue;
    const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
    const d = Math.hypot(x, y) / r;
    let col = core;
    if (edge) col = x + y < 0 ? hot : rim;
    else if (d < 0.42) col = RAMP.glow[3];
    else if (x + y < -r * 0.5 && d < 0.8) col = RAMP.glow[3];
    ctx.fillStyle = col;
    ctx.fillRect(x + r, y + r, 1, 1);
  }
  const out = { canvas, w: S, h: S };
  bigCache.set(key, out);
  return out;
}
/** Flat additive light disc (pixel-art light: banded, never a gradient). add = small hex added to what is below. */
export function lightDisc(ctx, cx, cy, r, add = '#14120A') {
  if (r <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = add;
  for (let dy = -r; dy <= r; dy++) {
    const half = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy)));
    ctx.fillRect(R(cx) - half, R(cy) + dy, half * 2 + 1, 1);
  }
  ctx.restore();
}
/**
 * Draw an AI spark centred at (x, y). size 'big' (plump star with a face, radius o.r || 16), 'small' or 'tiny'.
 * Glow is flat additive light rings (o.glow 0..1). o.blink closes the eyes.
 */
export function aiSpark(ctx, x, y, t, o = {}) {
  const kind = o.size || 'small';
  const core = o.core || C.gold, rim = o.rim || RAMP.autumn[4], hot = o.hot || RAMP.glow[4];
  const glow = o.glow ?? 1;
  const X = R(x), Y = R(y);
  if (kind === 'big') {
    const r = o.r || 18;
    if (glow > 0) { lightDisc(ctx, X, Y, R((r + 12) * glow), '#0E0D06'); lightDisc(ctx, X, Y, R((r + 5) * glow), '#16130A'); }
    const spr = bigSpark(r, core, rim, hot);
    ctx.drawImage(spr.canvas, X - r, Y - r);
    if (o.face !== false) {
      const ink = C.tealDeep;
      if (o.blink) { hline(ctx, X - 5, X - 3, Y - 1, ink); hline(ctx, X + 3, X + 5, Y - 1, ink); }
      else {
        rect(ctx, X - 5, Y - 3, 2, 4, ink); rect(ctx, X + 4, Y - 3, 2, 4, ink);
        px(ctx, X - 5, Y - 3, C.cream); px(ctx, X + 4, Y - 3, C.cream);
      }
      // smile
      px(ctx, X - 2, Y + 2, ink); hline(ctx, X - 1, X + 2, Y + 3, ink); px(ctx, X + 3, Y + 2, ink);
      // cheeks
      hline(ctx, X - 8, X - 7, Y + 1, C.coral); hline(ctx, X + 7, X + 8, Y + 1, C.coral);
    }
    return spr;
  }
  if (glow > 0) {
    const r = kind === 'small' ? 6 : 3;
    lightDisc(ctx, X, Y, R((r + 3) * glow), o.add || '#100E07');
    lightDisc(ctx, X, Y, R(r * glow), o.add || '#100E07');
  }
  const spr = sparkSprite(kind, core, o.rim || RAMP.glow[1], hot);
  drawSprite(ctx, spr, X, Y, { anchor: 'c' });
  return spr;
}

// ---------------------------------------------------------------- people variants (world.person style, 9x16)
// Letters as in world.js: h hair, s skin, k skin shade, e eye, t top, T top shade, p pants, o shoes,
// w scarf (wheel rim mid on the chair), W scarf shade, g chair frame, G chair frame shade, c wheel tyre, C wheel lit rim/hub
const HIJAB = {
  stand: [
    '.........', '...www...', '..wwwwW..', '.wwsssWW.', '.wsesesW.', '.wsssssW.', '.wwkkkWW.', '.wwwwwWW.',
    '.tttttTT.', '.stttTTs.', '.s.tttT.k', '...tttT..', '...pp.p..', '...pp.p..', '...pp.p..', '..oo..oo.',
  ],
  wave: [
    '........s', '...www..s', '..wwwwW.s', '.wwsssWWt', '.wsesesW.', '.wsssssWt', '.wwkkkWWt', '.wwwwwWWT',
    '.tttttT..', '.stttTT..', '.s.tttT..', '...tttT..', '...pp.p..', '...pp.p..', '...pp.p..', '..oo..oo.',
  ],
  cheer: [
    's.......s', 's..www..s', 't.wwwwW.t', 't.wsssWWt', 'twsesesWt', '.wsssssWT', '.wwkkkWW.', '.wwwwwWW.',
    '..ttttT..', '...tttT..', '...tttT..', '...tttT..', '...pp.p..', '...pp.p..', '...pp.p..', '..oo..oo.',
  ],
};
// Wheelchair user (15x16): chibi upper body (same rows as world.person) seated, thighs forward, chair in side view
// facing right: push handle + back frame, seat, and a crisp 7px wheel ring with a hub drawn over the hip.
const UPPER = {
  stand: ['.........', '...hhh...', '..hhhhh..', '..hsssh..', '..sesesk.', '..sssss..', '...kkk...', '..ttttt..',
    '.tttttTT.', '.stttTTs.', '.s.tttT.k', '...tttT..'],
  wave: ['........s', '...hhh..s', '..hhhhh.s', '..hsssh.t', '..sesesk.', '..sssss.t', '...kkk..t', '..ttttttT',
    '.tttttT..', '.stttTT..', '.s.tttT..', '...tttT..'],
  cheer: ['s.......s', 's..hhh..s', 't.hhhhh.t', 't.hsssh.t', 'tTsesesTt', '.ttsssttT', '..tkkktT.', '..ttttt..',
    '..ttttT..', '...tttT..', '...tttT..', '...tttT..'],
};
const WHEEL = ['..###..', '.#...#.', '#.....#', '#..o..#', '#.....#', '.#...#.', '..###..'];
function chairRows(pose) {
  const W = 16, rows = Array.from({ length: 16 }, () => Array(W).fill('.'));
  const put = (x, y, ch) => { if (y >= 0 && y < 16 && x >= 0 && x < W) rows[y][x] = ch; };
  put(2, 6, 'G'); for (let y = 6; y <= 12; y++) put(3, y, 'g');                 // push handle + backrest
  (UPPER[pose] || UPPER.stand).forEach((r, y) => [...r].forEach((ch, x) => { if (ch !== '.') put(x + 5, y, ch); }));
  for (let x = 3; x <= 8; x++) put(x, 12, 'g');                                // seat
  for (let x = 8; x <= 13; x++) put(x, 11, 'p');                               // thighs forward
  for (let x = 9; x <= 13; x++) put(x, 12, 'p');
  for (let y = 13; y <= 14; y++) { put(12, y, 'p'); put(13, y, 'p'); }          // shins down
  put(12, 15, 'o'); put(13, 15, 'o'); put(14, 15, 'o');                         // shoes
  put(11, 13, 'g'); put(11, 14, 'g'); put(11, 15, 'G'); put(15, 15, 'G');        // front frame + footrest
  WHEEL.forEach((r, y) => [...r].forEach((ch, x) => {                            // rear wheel ring + hub
    if (ch === '#') put(x + 1, y + 9, y + x < 5 ? 'C' : 'c');
    if (ch === 'o') put(x + 1, y + 9, 'C');
  }));
  return rows.map((r) => r.join(''));
}
const CHAIR = { stand: chairRows('stand'), wave: chairRows('wave'), cheer: chairRows('cheer') };
const xCache = new Map();
function shadeHex(hex, f = 0.72) {
  const n = parseInt(hex.slice(1), 16);
  const g = (v) => Math.max(0, Math.round(v * f));
  return '#' + [g((n >> 16) & 255), g((n >> 8) & 255), g(n & 255)].map((v) => v.toString(16).padStart(2, '0')).join('');
}
/**
 * Person variant in the world.person style. personX(ctx, x, base, { kind: 'hijab'|'wheelchair', pose, t, skin, hair,
 * scarf, top, pants, flip }). x = centre, base = ground row. 'cheer' bounces on twos like world.person.
 */
export function personX(ctx, x, base, o = {}) {
  const kind = o.kind || 'hijab';
  const set = kind === 'wheelchair' ? CHAIR : HIJAB;
  let pose = o.pose || 'stand';
  if (pose === 'cheer' && frameIndex(o.t ?? 0, 4, 2)) pose = 'stand';
  const skin = RAMP.skin[o.skin ?? 2];
  const hairC = RAMP.hair[o.hair ?? 0];
  const top = o.top || C.sky, pants = o.pants || '#2B3A4A', scarf = o.scarf || C.coral;
  const key = [kind, pose, skin[1], hairC, top, pants, scarf].join('|');
  let spr = xCache.get(key);
  if (!spr) {
    spr = sprite(set[pose] || set.stand, {
      h: hairC, s: skin[1], k: skin[0], e: '#173B38', t: top, T: shadeHex(top), p: pants, o: '#0F2B2A',
      w: kind === 'wheelchair' ? RAMP.stone[3] : scarf, W: shadeHex(scarf, 0.8), g: RAMP.stone[2], G: RAMP.stone[1], c: RAMP.ink[1], C: RAMP.stone[5],
    });
    xCache.set(key, spr);
  }
  drawSprite(ctx, spr, x, base, { anchor: 'bc', flipX: o.flip });
  return spr;
}

// ---------------------------------------------------------------- small utils
/** Integer drop-in offset: falls from -dist to 0 between t0-dur and t0 (ease in), 0 after. */
export function dropY(t, tLand, dist = 40, dur = 0.16) {
  if (t >= tLand) return 0;
  const k = clamp((t - (tLand - dur)) / dur);
  return -R(dist * (1 - ease.inQuad(k)));
}
/** Squash frames after a landing: returns [dw, dh] integer size deltas (redraw art at the new size). */
export function squashFrames(t, tLand, amt = 3) {
  const f = Math.floor((t - tLand) * 30);
  if (t < tLand || f > 5) return [0, 0];
  const seq = [[amt, -amt], [amt, -amt], [-1, 1], [-1, 1], [0, 0], [0, 0]];
  return seq[f];
}
/** Visible before tLand? (drop still above the frame) */
export const isIn = (t, t0) => t >= t0;
export { tween, ease, clamp, hash, onTwos, frameIndex, mod, makeCanvas, rect, px, hline, vline, dither, ellipse, disc, drawSprite, sprite };
