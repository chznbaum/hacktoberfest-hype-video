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
}
/** Floating dust motes that twinkle on twos inside a band (sparse, deterministic). */
export function motes(ctx, t, { x, y, w, h, n = 10, seed = 3, colors = [C.cream, RAMP.glow[4]] } = {}) {
  const tq = onTwos(t);
  for (let i = 0; i < n; i++) {
    const sp = 2 + hash(i, 1, seed) * 3;
    const mx = x + mod(hash(i, 2, seed) * w + tq * sp * (hash(i, 5, seed) < 0.5 ? 1 : -1), w);
    const my = y + mod(hash(i, 3, seed) * h - tq * sp * 0.6, h);
    const tw = frameIndex(tq + hash(i, 4, seed) * 3, 3, 4);
    if (tw === 3) continue;
    px(ctx, R(mx), R(my), colors[i % colors.length]);
  }
}

// ---------------------------------------------------------------- the counter (C08 + C09)
/** Counter / hack table across the frame: top surface at row y, front face down to the bottom. */
export function counter(ctx, y, { x = 0, w = null, h = null } = {}) {
  const W = w ?? ctx.canvas.width, H = h ?? ctx.canvas.height - y;
  // top surface (light from upper-left: lit lip, mid top, shaded back edge line)
  rect(ctx, x, y, W, 1, RAMP.stone[3]);
  rect(ctx, x, y + 1, W, 4, RAMP.stone[5]);
  rect(ctx, x, y + 5, W, 1, RAMP.stone[6]);         // lit front lip
  rect(ctx, x, y + 6, W, 2, RAMP.stone[4]);
  rect(ctx, x, y + 8, W, 1, RAMP.stone[2]);
  // front face: wood panels in tealDark family so it sits in the key-art palette
  rect(ctx, x, y + 9, W, H - 9, C.tealDark);
  rect(ctx, x, y + 9, W, 2, RAMP.teal[1]);           // shadow under the lip
  for (let px_ = x + 14; px_ < x + W; px_ += 40) {
    vline(ctx, px_, y + 11, y + H, RAMP.teal[2]);
    vline(ctx, px_ + 1, y + 11, y + H, RAMP.teal[5]);
  }
}

// ---------------------------------------------------------------- steam
/**
 * Rising steam curls from (x, base) upward h px: segmented sine ribbons that scroll up on twos, thick + cream at the
 * bottom, thin + cloud-blue and dithered away at the top. amp grows with height so it curls.
 */
export function steam(ctx, x, base, t, { h = 36, amp = 3, seed = 1, speed = 16, period = 22, seg = 15, show = 1 } = {}) {
  if (show <= 0) return;
  const tq = onTwos(t);
  const ph = hash(seed, 9) * 6.28;
  for (let yy = 0; yy < h; yy++) {
    const k = yy / h;
    const scroll = yy + tq * speed;
    // segment gaps travel upward with the steam
    const segOn = Math.sin((scroll / seg) * Math.PI * 2 + ph) > -0.35;
    if (!segOn) continue;
    const vis = clamp(yy / 4) * (1 - k * k) * show;
    const X = R(x + Math.sin((scroll / period) * Math.PI * 2 + ph) * (1 + amp * k * 1.4));
    const Y = R(base - yy);
    const thick = k < 0.45 ? 2 : 1;
    for (let d = 0; d < thick; d++) {
      if (bayer(X + d, Y) > vis) continue;
      px(ctx, X + d, Y, k < 0.5 ? C.cream : RAMP.cloud[2]);
    }
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
/** Draw an AI spark centred at (x, y). Returns the sprite size. */
export function aiSpark(ctx, x, y, t, o = {}) {
  const kind = o.size || 'small';
  const core = o.core || C.gold, rim = o.rim || RAMP.glow[1], hot = o.hot || RAMP.glow[4];
  const glow = o.glow ?? 1;
  const X = R(x), Y = R(y);
  if (glow > 0) {
    const r = kind === 'big' ? 17 : kind === 'small' ? 6 : 3;
    haloDisc(ctx, X, Y, r + 3, o.haloColor || core, 0.12 * glow);
    haloDisc(ctx, X, Y, r, o.haloColor || core, 0.28 * glow);
  }
  const spr = sparkSprite(kind, core, rim, hot);
  drawSprite(ctx, spr, X, Y, { anchor: 'c' });
  if (kind === 'big' && o.face !== false) {
    // friendly face: two eyes (blink = 1px line) + small smile, in deep teal
    const ink = C.tealDeep;
    const blink = o.blink;
    if (blink) { hline(ctx, X - 4, X - 3, Y - 1, ink); hline(ctx, X + 3, X + 4, Y - 1, ink); }
    else { rect(ctx, X - 4, Y - 2, 2, 3, ink); rect(ctx, X + 3, Y - 2, 2, 3, ink); px(ctx, X - 4, Y - 2, RAMP.glow[4]); px(ctx, X + 3, Y - 2, RAMP.glow[4]); }
    px(ctx, X - 2, Y + 3, ink); hline(ctx, X - 1, X + 1, Y + 4, ink); px(ctx, X + 2, Y + 3, ink);
    // cheeks
    px(ctx, X - 6, Y + 2, C.coral); px(ctx, X + 6, Y + 2, C.coral);
  }
  return spr;
}

// ---------------------------------------------------------------- people variants (world.person style, 9x16)
// Letters as in world.js: h hair, s skin, k skin shade, e eye, t top, T top shade, p pants, o shoes,
// w scarf, W scarf shade, g chair frame, G chair frame shade, c wheel, C wheel hub/light
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
// Wheelchair user, 13x16, seated (torso front-facing like the other chibis), chair in side view facing right:
// big rear wheel with hub, push handle at the back, footrest at the front.
const CHAIR = {
  stand: [
    '.............', '....hhh......', '...hhhhh.....', '...hsssh.....', '...sesesk....', '...sssss.....', '.g..kkk......',
    '.g.ttttt.....', '.gtttttTT....', '.gstttTTs....', '.gs.tttTk....', '.ggcccpppppp.', '.cGtttcGg.pp.',
    'cCG...GCcGpp.', '.cC...Cc..oo.', '..ccccc..ggg.',
  ],
  wave: [
    '.........s...', '....hhh..s...', '...hhhhh.s...', '...hsssh.t...', '...sesesk....', '...sssss.t...', '.g..kkk..t...',
    '.g.tttttttT..', '.gtttttT.....', '.gstttTT.....', '.gs.tttT.....', '.ggcccpppppp.', '.cGtttcGg.pp.',
    'cCG...GCcGpp.', '.cC...Cc..oo.', '..ccccc..ggg.',
  ],
  cheer: [
    '.s.......s...', '.s..hhh..s...', '.t.hhhhh.t...', '.t.hsssh.t...', '.tTsesesTt...', '.g.tsssttT...', '.g.tkkktT....',
    '.g.ttttt.....', '.g.ttttT.....', '.g..tttT.....', '.g..tttT.....', '.ggcccpppppp.', '.cGtttcGg.pp.',
    'cCG...GCcGpp.', '.cC...Cc..oo.', '..ccccc..ggg.',
  ],
};
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
      w: scarf, W: shadeHex(scarf, 0.8), g: RAMP.stone[2], G: RAMP.stone[1], c: RAMP.ink[1], C: RAMP.stone[4],
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
