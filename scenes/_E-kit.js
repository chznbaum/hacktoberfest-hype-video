// scenes/_E-kit.js (owner E): shared art + timing for verse 2a, the hands-on sessions.
//   C17 decision-model, C18 gemma-call, C19 hermes.
// One indoor makerspace set (flat key-art teal wall, warm pendant lamps, hack desk) and the props that carry the
// story across the three clips: the friendly sloth at its laptop, the MODEL box with its empty gem socket, the four
// option bars, the faceted gem, the rubber check stamp, the winged sandal and the agent terminal.
// Everything is drawn on the pixel layer with integer coordinates and palette ramps; static art is cached.
import { C, RAMP } from '../lib/palette.js';
import { clamp, lerp, ease, tween, onTwos, frameIndex, hash, mod } from '../lib/motion.js';
import {
  makeCanvas, rect, px, frame, hline, vline, line, ellipse, poly, dither, sprite, drawSprite, outline, shadow,
  pixelText, pixelTextWidth,
} from '../lib/pixel.js';
import { text, anim, eyebrow, textBox, chip } from '../lib/text.js';
import { cached, haloDisc, sparkle } from '../lib/world.js';

export const R = Math.round;
const INK = RAMP.ink[1];
const AL = RAMP.cloud;            // laptop aluminium (same family as C09's laptop)
const W_ = RAMP.water;

/** Option probabilities: after training (C17) and after Gemma makes the call (C18). Winner = option B. */
export const PROBS_A = [0.18, 0.62, 0.12, 0.08];
export const PROBS_B = [0.01, 0.97, 0.01, 0.01];

// ================================================================ timing
/** Mean beat length of the clip (s). */
export function beatLen(c) {
  const B = c.beats;
  return B.length > 1 ? (B[B.length - 1] - B[0]) / (B.length - 1) : 0.6;
}
/**
 * The k-th beat at/after time t0 (k = 0: first beat >= t0 - tol). Extrapolates past the known beats so timing
 * never breaks when a clip is stretched or cut.
 */
export function beatFrom(c, t0, k = 0, tol = 0.08) {
  const B = c.beats, len = beatLen(c);
  if (!B.length) return t0 + k * len;
  let i = B.findIndex((b) => b >= t0 - tol);
  if (i < 0) {
    const last = B[B.length - 1];
    const n = Math.ceil((t0 - tol - last) / len);
    return last + (n + k) * len;
  }
  if (i + k < B.length) return B[i + k];
  return B[B.length - 1] + (i + k - (B.length - 1)) * len;
}
/** Cue with fallback ({start, end} relative to the clip). */
export function cueOr(c, id, start, end) {
  return c.lines[id] || { start, end };
}

// ================================================================ hi-layer labels
/**
 * Two-line display label in the key-art headline style (line a cream, line b sky), each line stamped on its beat.
 * opts: { x, y (baseline of line a), size, gap (baseline step), ta, tb, t1, align }
 */
export function labelStack(hi, t, a, b, o) {
  const size = o.size, align = o.align || 'left';
  const ya = o.y, yb = o.y + (o.gap ?? R(size * 0.98));
  const draw = (str, y, t0, color) => {
    if (!str || t0 === undefined) return;
    const box = textBox(hi, str, o.x, y, { role: 'display', size, align });
    anim(hi, t, { t0, t1: o.t1, x: box.cx, y: box.cy, enter: 'stamp', exit: o.exit || 'cut' },
      (h) => text(h, str, o.x, y, { role: 'display', size, align, color }));
  };
  draw(a, ya, o.ta, o.colorA || C.cream);
  draw(b, yb, o.tb, o.colorB || C.sky);
}
/** Coral key-art chip (tealDark caps) that slides in on pixel steps. */
export function chipAt(hi, t, str, x, y, { t0, t1, size = 44, align = 'left', exit = 'cut' } = {}) {
  anim(hi, t, { t0, t1, x, y, enter: 'slide-left', exit, dist: 60, dur: 0.18 },
    (h) => chip(h, str, x, y, { size, align }));
}
/** Mono eyebrow (wide tracking) that slides in on pixel steps. */
export function eyebrowAt(hi, t, str, x, y, { t0, t1, size = 34, align = 'left', color = C.cream } = {}) {
  anim(hi, t, { t0, t1, x, y, enter: 'slide-left', exit: 'cut', dist: 48, dur: 0.18 },
    (h) => eyebrow(h, str, x, y, { size, align, color }));
}

// ================================================================ room
/**
 * Indoor makerspace: flat teal wall (key art), warm pendant lamps, and the hack desk (tan top edge + dark teal front with panel seams; same build as C08/C09's table).
 * opts: { deskY, lamps: [x...], lampLen, pulse }
 */
export function room(g, c, o = {}) {
  const { px: X, PW, PH } = g;
  const deskY = o.deskY ?? PH - 30;
  for (const lx of o.lamps || []) lamp(X, lx, o.lampLen ?? 14, o.pulse || 0);
  desk(X, deskY, PW, PH);
  return deskY;
}
/** Industrial pendant lamp hanging from the top edge, warm dithered light pool. */
function lamp(ctx, x, len, pulse) {
  vline(ctx, x, 0, len - 1, RAMP.ink[2]);
  // shade: dark teal cone with coral rim
  rect(ctx, x - 2, len, 5, 2, RAMP.teal[1]);
  rect(ctx, x - 4, len + 2, 9, 2, RAMP.teal[1]);
  hline(ctx, x - 5, x + 5, len + 4, C.coral);
  hline(ctx, x - 3, x + 3, len + 5, RAMP.glow[4]);
  // light pool: two flat dithered bands (no gradients)
  const lv = 0.12 + 0.06 * pulse;
  dither(ctx, x - 9, len + 6, 19, 14, null, RAMP.teal[6], lv);
  dither(ctx, x - 5, len + 6, 11, 8, null, RAMP.teal[6], lv + 0.12);
}
function desk(ctx, y, PW, PH) {
  rect(ctx, 0, y, PW, 1, RAMP.stone[5]);
  rect(ctx, 0, y + 1, PW, 2, RAMP.stone[4]);
  rect(ctx, 0, y + 3, PW, 1, RAMP.stone[2]);
  rect(ctx, 0, y + 4, PW, PH - y - 4, C.tealDark);
  rect(ctx, 0, y + 4, PW, 1, RAMP.teal[2]);
  for (let x = 14; x < PW; x += 40) vline(ctx, x, y + 6, PH, RAMP.teal[2]);
}

// ================================================================ sloth (generic, friendly; NOT a brand mark)
const SL = {
  O: RAMP.ink[1],          // outline
  d: RAMP.house[0],        // fur shade
  f: RAMP.stone[2],        // fur
  l: RAMP.stone[3],        // fur light
  m: RAMP.house[2],        // face mask
  M: RAMP.house[1],        // mask shade
  e: RAMP.hair[1],         // eye bands / mouth
  n: RAMP.hair[0],         // eyes / nose
  c: RAMP.tower[3],        // claws
  b: RAMP.stone[3],        // belly
  k: C.coral,              // cheeks
};
/** Thick pixel limb: stamps a (2r+1) square along a Bresenham line. */
function thick(k, x0, y0, x1, y1, r, col) {
  x0 = R(x0); y0 = R(y0); x1 = R(x1); y1 = R(y1);
  const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1, dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  k.fillStyle = col;
  for (let i = 0; i < 512; i++) {
    k.fillRect(x0 - r, y0 - r, r * 2 + 1, r * 2 + 1);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}
const slothCache = new Map();
export const SLOTH_W = 48, SLOTH_H = 44;
/**
 * The sloth (48 x 44), sitting, face to camera, long arms reaching right onto a keyboard.
 * pose: { arm: 0|1 (typing frame), fast (headband + determined brows), blink, cheer (arms up) }
 */
export function slothCanvas(pose) {
  const key = JSON.stringify(pose);
  if (slothCache.has(key)) return slothCache.get(key);
  const Wd = SLOTH_W, H = SLOTH_H;
  const { canvas: cv, ctx: k } = makeCanvas(Wd, H);
  const hx = 18, hy = 14;
  const limb = (sx, sy, ex, ey, col, shade, claws = 'kb') => {
    thick(k, sx, sy, ex, ey, 2, SL.O);
    thick(k, sx, sy, ex, ey, 1, col);
    line(k, sx, sy + 1, ex, ey + 1, shade);
    // paw + three hooked claws
    if (claws === 'kb') {
      for (let i = 0; i < 3; i++) { px(k, ex + 1 + i - 1, ey + 2, SL.O); px(k, ex + i, ey + 2, SL.c); px(k, ex + i + 1, ey + 3, SL.c); }
      px(k, ex + 2, ey + 1, SL.c);
    } else {
      for (let i = -1; i <= 1; i++) { px(k, ex + i * 2, ey - 2, SL.c); px(k, ex + i * 2, ey - 3, SL.c); }
    }
  };
  const cheer = !!pose.cheer, idle = !!pose.idle && !cheer;
  // far arm (behind the body)
  if (!cheer && !idle) limb(hx + 6, 26, hx + 20, pose.arm ? 36 : 34, SL.d, SL.O);
  // body
  ellipse(k, hx - 1, 32, 12, 10, SL.O);
  ellipse(k, hx - 1, 32, 11, 9, SL.d);
  ellipse(k, hx - 2, 31, 10, 8, SL.f);
  ellipse(k, hx - 1, 34, 6, 6, SL.b);
  line(k, hx - 6, 26, hx - 9, 30, SL.d); line(k, hx + 4, 27, hx + 6, 30, SL.d);
  // feet with claws
  for (const fx of [hx - 7, hx + 5]) {
    ellipse(k, fx, 41, 4, 2, SL.O);
    ellipse(k, fx, 41, 3, 1, SL.d);
    px(k, fx - 2, 43, SL.c); px(k, fx, 43, SL.c); px(k, fx + 2, 43, SL.c);
  }
  // head
  ellipse(k, hx, hy, 13, 11, SL.O);
  ellipse(k, hx, hy, 12, 10, SL.d);
  ellipse(k, hx - 1, hy - 1, 11, 9, SL.f);
  // shaggy tufts + strands
  for (const [tx, ty] of [[hx - 5, 2], [hx - 1, 1], [hx + 3, 2], [hx + 7, 3]]) { px(k, tx, ty, SL.O); px(k, tx + 1, ty, SL.O); px(k, tx, ty + 1, SL.f); }
  line(k, hx - 8, hy - 6, hx - 6, hy - 8, SL.l); line(k, hx - 10, hy - 3, hx - 8, hy - 5, SL.l);
  line(k, hx + 5, hy - 8, hx + 7, hy - 6, SL.d); line(k, hx + 9, hy - 5, hx + 10, hy - 3, SL.d);
  // face mask
  ellipse(k, hx, hy + 2, 9, 7, SL.m);
  hline(k, hx - 5, hx + 5, hy + 9, SL.M); hline(k, hx - 7, hx + 7, hy + 8, SL.M);
  ellipse(k, hx, hy + 2, 9, 7, SL.m, false);
  ellipse(k, hx - 1, hy + 1, 8, 6, SL.m);
  // eye bands sloping down-outward
  thick(k, hx - 4, hy, hx - 9, hy + 3, 1, SL.e);
  thick(k, hx + 4, hy, hx + 9, hy + 3, 1, SL.e);
  // eyes
  if (pose.blink) {
    hline(k, hx - 6, hx - 3, hy, SL.n); hline(k, hx + 3, hx + 6, hy, SL.n);
  } else {
    const ey = pose.up ? hy - 2 : hy - 1;
    rect(k, hx - 5, ey, 2, 2, SL.n); rect(k, hx + 4, ey, 2, 2, SL.n);
    px(k, hx - 5, ey, SL.c); px(k, hx + 4, ey, SL.c);
  }
  if (pose.fast) { line(k, hx - 8, hy - 4, hx - 3, hy - 3, SL.n); line(k, hx + 8, hy - 4, hx + 3, hy - 3, SL.n); }
  // cheeks, nose, smile
  rect(k, hx - 8, hy + 5, 2, 1, SL.k); rect(k, hx + 7, hy + 5, 2, 1, SL.k);
  ellipse(k, hx, hy + 3, 2, 1, SL.n); px(k, hx - 1, hy + 2, SL.l);
  if (cheer) { rect(k, hx - 2, hy + 6, 5, 2, SL.e); rect(k, hx - 1, hy + 7, 3, 1, RAMP.roof[2]); }
  else { px(k, hx - 3, hy + 5, SL.e); hline(k, hx - 2, hx + 2, hy + 6, SL.e); px(k, hx + 3, hy + 5, SL.e); }
  // headband (full throttle): coral band with tails streaming back
  if (pose.fast) {
    for (let x = hx - 12; x <= hx + 12; x++) {
      const dx = (x - hx) / 12.5, inside = 1 - dx * dx;
      if (inside <= 0) continue;
      px(k, x, hy - 6, C.coral); px(k, x, hy - 5, RAMP.roof[1]);
    }
    rect(k, hx - 13, hy - 7, 2, 3, C.coral);
    line(k, hx - 14, hy - 7, hx - 17, hy - 10, C.coral); line(k, hx - 14, hy - 5, hx - 17, hy - 4, RAMP.roof[1]);
  }
  // near arm (in front)
  if (cheer) {
    limb(hx - 8, 27, hx - 14, 14, SL.f, SL.d, 'up');
    limb(hx + 7, 27, hx + 14, 14, SL.f, SL.d, 'up');
  } else if (idle) {
    // arms folded over the belly, claws resting
    thick(k, hx - 9, 27, hx - 3, 34, 2, SL.O); thick(k, hx + 7, 27, hx + 1, 34, 2, SL.O);
    thick(k, hx - 9, 27, hx - 3, 34, 1, SL.f); thick(k, hx + 7, 27, hx + 1, 34, 1, SL.d);
    px(k, hx - 2, 35, SL.c); px(k, hx - 1, 35, SL.c); px(k, hx, 35, SL.c); px(k, hx + 1, 36, SL.c);
  } else {
    limb(hx + 5, 28, hx + 21, pose.arm ? 35 : 37, SL.f, SL.d);
  }
  const out = { canvas: cv, w: Wd, h: H };
  slothCache.set(key, out);
  return out;
}
/** Draw the sloth with its feet on `base`, left edge at x. */
export function sloth(ctx, x, base, pose) {
  const s = slothCanvas(pose);
  ctx.drawImage(s.canvas, R(x), R(base - s.h));
  return s;
}

// ================================================================ laptop (front view)
/**
 * Laptop standing on `base`, centred at cx. w = lid width, lh = lid height, d = deck depth.
 * Returns the screen rect { x, y, w, h } for drawing UI into.
 */
export function laptop(ctx, cx, base, { w = 56, lh = 36, d = 6 } = {}) {
  const key = `E-lap|${w}|${lh}|${d}`;
  const flare = 6;
  const CW = w + flare * 2, CH = lh + d + 1;
  const cv = cached(key, CW, CH, (k) => {
    const lx = flare;
    // lid
    rect(k, lx, 0, w, lh, AL[2]);
    hline(k, lx + 1, lx + w - 2, 0, AL[3]);
    vline(k, lx, 1, lh - 1, AL[3]);
    vline(k, lx + w - 1, 1, lh - 1, AL[0]);
    rect(k, lx + 2, 2, w - 4, lh - 4, RAMP.ink[0]);
    rect(k, lx + 2, lh - 2, w - 4, 1, AL[1]);
    // deck trapezoid widening toward the viewer
    for (let r = 0; r < d; r++) {
      const ww = w + R((flare * 2 * (r + 1)) / d);
      const x0 = R((CW - ww) / 2);
      rect(k, x0, lh + r, ww, 1, r === 0 ? AL[1] : AL[2]);
      px(k, x0, lh + r, AL[3]);
      px(k, x0 + ww - 1, lh + r, AL[0]);
    }
    for (let r = 0; r < 2; r++) {
      const yy = lh + 1 + r * 2;
      const ww = w - 6 + R((flare * 2 * (r * 2 + 2)) / d);
      const x0 = R((CW - ww) / 2);
      for (let xx = x0; xx < x0 + ww - 1; xx += 3) rect(k, xx, yy, 2, 1, RAMP.iron[3]);
    }
    rect(k, 0, lh + d, CW, 1, AL[0]);
  });
  const x0 = R(cx - CW / 2), y0 = R(base - CH);
  shadow(ctx, cx, base, CW + 6, { level: 0.45, h: 3 });
  ctx.drawImage(cv, x0, y0);
  return { x: x0 + flare + 3, y: y0 + 3, w: w - 6, h: lh - 6, deckY: y0 + lh, x0, CW };
}

/**
 * Training UI on the laptop screen: window dots, TRAIN tag + epoch dots, a falling loss curve, progress bar + %.
 * p = progress 0..1, t for blinking, fast = full-throttle mode.
 */
export function trainScreen(ctx, s, p, t, { fast = false, done = false } = {}) {
  rect(ctx, s.x, s.y, s.w, s.h, RAMP.iron[1]);
  // header
  rect(ctx, s.x, s.y, s.w, 5, RAMP.iron[0]);
  px(ctx, s.x + 2, s.y + 2, C.coral); px(ctx, s.x + 4, s.y + 2, C.gold); px(ctx, s.x + 6, s.y + 2, C.sky);
  pixelText(ctx, done ? 'DONE' : 'TRAIN', s.x + s.w - 2, s.y, done ? C.gold : C.sky, { font: 'tiny', align: 'right' });
  // loss curve area
  const ax = s.x + 3, ay = s.y + 8, aw = s.w - 6, ah = s.h - 19;
  vline(ctx, ax, ay, ay + ah, RAMP.iron[3]);
  hline(ctx, ax, ax + aw, ay + ah, RAMP.iron[3]);
  const n = Math.max(0, Math.floor(aw * p));
  let prevY = null;
  for (let i = 0; i <= n; i++) {
    const k = i / aw;
    const v = Math.exp(-4.2 * k) * 0.9 + 0.08 + (hash(i, 3, 5) - 0.5) * 0.14 * (1 - k);
    const yy = ay + R((1 - v) * ah * 0.95 + 0) ;
    const Y = clamp(yy, ay, ay + ah - 1);
    if (prevY !== null && Math.abs(Y - prevY) > 1) vline(ctx, ax + 1 + i, Math.min(Y, prevY), Math.max(Y, prevY), C.coral);
    px(ctx, ax + 1 + i, Y, C.coral);
    prevY = Y;
  }
  if (n > 0 && n < aw && Math.floor(t * 8) % 2 === 0) px(ctx, ax + 1 + n, prevY - 1, C.cream);
  // progress bar
  const by = s.y + s.h - 8, bw = s.w - 18;
  frame(ctx, s.x + 2, by, bw, 5, C.sky);
  const fw = R((bw - 2) * p);
  rect(ctx, s.x + 3, by + 1, fw, 3, done ? C.gold : C.cream);
  if (fast && !done) for (let xx = s.x + 3 + ((Math.floor(t * 15) % 3)); xx < s.x + 3 + fw; xx += 3) px(ctx, xx, by + 2, C.sky);
  pixelText(ctx, `${R(p * 100)}%`, s.x + s.w - 2, by, done ? C.gold : C.cream, { font: 'tiny', align: 'right' });
}

// ================================================================ model box
/**
 * The MODEL: cream device shell, dark panel showing a tiny neural net, gem socket on top, status LEDs.
 * (x, y) = top-left of the shell (socket sits above it). opts: { w, h, power 0..1, wave (signal phase, s),
 * t, gem: 0|1 (socket filled), hot 0..1 (gem power glow), label: true }
 * Returns anchors { socket: {x, y}, inX, inY, outX, outY, cx, cy, x1, y1 }.
 */
export function modelBox(ctx, x, y, o = {}) {
  const w = o.w ?? 44, h = o.h ?? 40;
  const power = o.power ?? 1, hot = o.hot ?? 0, t = o.t ?? 0;
  const key = `E-model|${w}|${h}`;
  const cv = cached(key, w, h + 4, (k) => {
    // socket (top centre): dark recess with coral rim
    const sw = Math.max(8, R(w * 0.26));
    const sx = R((w - sw) / 2);
    rect(k, sx - 1, 0, sw + 2, 5, INK);
    rect(k, sx, 1, sw, 3, RAMP.iron[0]);
    hline(k, sx, sx + sw - 1, 1, RAMP.roof[1]);
    // shell
    const Y = 4;
    rect(k, 1, Y, w - 2, h, INK);
    rect(k, 0, Y + 1, w, h - 2, INK);
    rect(k, 1, Y + 1, w - 2, h - 2, RAMP.tower[3]);
    hline(k, 2, w - 3, Y + 1, RAMP.tower[4]);
    vline(k, 1, Y + 2, Y + h - 3, RAMP.tower[4]);
    rect(k, w - 4, Y + 2, 2, h - 4, RAMP.tower[2]);
    rect(k, 2, Y + h - 4, w - 4, 2, RAMP.tower[2]);
    hline(k, 2, w - 3, Y + h - 2, RAMP.tower[1]);
    // side pins (chip legs)
    for (let yy = Y + 7; yy < Y + h - 9; yy += 5) {
      rect(k, 0, yy, 1, 2, RAMP.stone[4]);
      rect(k, w - 1, yy, 1, 2, RAMP.stone[2]);
    }
    // panel
    rect(k, 4, Y + 4, w - 9, h - 13, INK);
    rect(k, 5, Y + 5, w - 11, h - 15, RAMP.iron[1]);
  });
  const X = R(x), Yt = R(y) - 4;
  ctx.drawImage(cv, X, Yt);
  const Y = Yt + 4;
  // neural net inside the panel
  const px0 = X + 5, py0 = Y + 5, pw = w - 11, ph = h - 15;
  const layers = w >= 60 ? [3, 4, 4, 2] : [3, 4, 2];
  const pos = layers.map((n, li) => {
    const lx = px0 + R(pw * (0.16 + li * (0.68 / (layers.length - 1))));
    return Array.from({ length: n }, (_, i) => [lx, py0 + R((ph * (i + 1)) / (n + 1))]);
  });
  const wave = o.wave ?? -1; // 0..1 sweep position (left -> right), <0 = idle
  const lit = (xx) => wave >= 0 && Math.abs((xx - px0) / pw - wave) < 0.18;
  for (let li = 0; li < pos.length - 1; li++) {
    for (const [ax, ay] of pos[li]) for (const [bx, by] of pos[li + 1]) {
      const col = power < 0.5 ? RAMP.iron[2] : lit((ax + bx) / 2) ? (hot > 0.5 ? C.gold : C.sky) : RAMP.iron[3];
      line(ctx, ax + 1, ay, bx - 1, by, col);
    }
  }
  for (const layer of pos) for (const [nx, ny] of layer) {
    const on = power >= 0.5 && (lit(nx) || hot > 0.5);
    rect(ctx, nx - 1, ny - 1, 3, 3, on ? (hot > 0.5 ? C.gold : C.cream) : power >= 0.5 ? RAMP.water[3] : RAMP.iron[3]);
    if (on) px(ctx, nx - 1, ny - 1, RAMP.glow[4]);
  }
  // status LEDs + MODEL tag on the bottom strip
  const ly = Y + h - 7;
  const ledOn = (i) => power >= 0.5 && (hot > 0.5 || Math.floor(t * 4 + i * 1.3) % 3 !== 0);
  rect(ctx, X + 5, ly, 2, 2, ledOn(0) ? C.coral : RAMP.roof[0]);
  rect(ctx, X + 8, ly, 2, 2, ledOn(1) ? C.gold : RAMP.glow[0]);
  rect(ctx, X + 11, ly, 2, 2, ledOn(2) ? C.sky : RAMP.iron[3]);
  if (o.label !== false && w >= 40) pixelText(ctx, 'MODEL', X + w - 5, ly - 1, RAMP.stone[2], { font: 'tiny', align: 'right' });
  const sw = Math.max(8, R(w * 0.26));
  return {
    socket: { x: X + R(w / 2), y: Yt + 1, w: sw }, inX: X - 1, inY: Y + R(h / 2), outX: X + w, outY: Y + R(h / 2),
    cx: X + R(w / 2), cy: Y + R(h / 2), x0: X, y0: Yt, x1: X + w, y1: Y + h, bottom: Y + h,
  };
}

// ================================================================ input card
export function inputCard(ctx, x, y, w = 20, h = 24) {
  const cv = cached(`E-card|${w}|${h}`, w + 1, h + 1, (k) => {
    rect(k, 1, 1, w, h, RAMP.ink[2]);                      // drop shadow
    rect(k, 0, 0, w, h, INK);
    rect(k, 1, 1, w - 2, h - 2, RAMP.tower[3]);
    vline(k, w - 2, 5, h - 2, RAMP.tower[2]);
    hline(k, 1, w - 2, h - 2, RAMP.tower[2]);
    // dog-ear
    rect(k, w - 5, 0, 5, 5, C.teal);
    line(k, w - 5, 0, w - 1, 4, INK);
    rect(k, w - 5, 1, 1, 4, RAMP.tower[1]); rect(k, w - 5, 4, 4, 1, RAMP.tower[1]);
    px(k, w - 4, 2, RAMP.tower[1]); px(k, w - 4, 3, RAMP.tower[1]); px(k, w - 3, 3, RAMP.tower[1]);
    // big question mark (hand-drawn 7x10) + text lines
    const Q = ['.#####.', '##...##', '##...##', '.....##', '....##.', '...##..', '...##..', '.......', '...##..', '...##..'];
    const qx = R(w / 2) - 4, qy = 4;
    Q.forEach((row, yy) => { for (let xx = 0; xx < row.length; xx++) if (row[xx] === '#') px(k, qx + xx, qy + yy, C.coral); });
    for (let i = 0; i < 3; i++) hline(k, 4, w - 5 - (i === 2 ? 7 : 0), 17 + i * 4, RAMP.stone[3]);
  });
  ctx.drawImage(cv, R(x), R(y));
}

// ================================================================ flows
/** Marching-dash arrow (horizontal or vertical) from (x0,y0) to (x1,y1); head at the end. */
export function arrow(ctx, x0, y0, x1, y1, t, { color = C.cream, dim = RAMP.teal[6], active = true, show = 1 } = {}) {
  const horiz = Math.abs(x1 - x0) >= Math.abs(y1 - y0);
  const len = horiz ? Math.abs(x1 - x0) : Math.abs(y1 - y0);
  const n = R(len * clamp(show));
  if (n <= 0) return;
  const sg = horiz ? Math.sign(x1 - x0) : Math.sign(y1 - y0);
  const off = active ? Math.floor(onTwos(t) * 15 * 0.5) : 0;
  for (let i = 0; i < n - 2; i++) {
    const on = mod(i - off, 4) < 2;
    const col = on ? (active ? color : dim) : null;
    if (!col) continue;
    if (horiz) px(ctx, x0 + sg * i, y0, col); else px(ctx, x0, y0 + sg * i, col);
  }
  if (show >= 1) {
    const hx = horiz ? x1 : x0, hy = horiz ? y0 : y1;
    const col = active ? color : dim;
    if (horiz) { px(ctx, hx - sg * 1, hy, col); vline(ctx, hx - sg * 2, hy - 1, hy + 1, col); vline(ctx, hx - sg * 3, hy - 2, hy + 2, col); }
    else { px(ctx, hx, hy - sg * 1, col); hline(ctx, hx - 1, hx + 1, hy - sg * 2, col); hline(ctx, hx - 2, hx + 2, hy - sg * 3, col); }
  }
}

// ================================================================ option bars
const LETTERS = ['A', 'B', 'C', 'D'];
/**
 * Four option rows: letter tile + track + fill + value. opts: { w, rowH, gap, values[4], winner, glow 0..1,
 * show 0..1 (rows slide in), t, big (use small font for values) }
 * Returns row geometry [{ x, y, w, h, fx (fill end x) }].
 */
export function optionBars(ctx, x, y, o) {
  const { w, rowH = 7, gap = 4, values, winner = 1, glow = 0, t = 0 } = o;
  const show = o.show ?? 1;
  const font = o.big ? 'small' : 'tiny';
  const fh = o.big ? 7 : 5;
  const valW = pixelTextWidth('0.00', { font });
  const tile = rowH;
  const tx = x + tile + 2, tw = w - tile - 2 - valW - 3;
  const rows = [];
  for (let i = 0; i < 4; i++) {
    const k = clamp(show * 4 - i);
    if (k <= 0) { rows.push(null); continue; }
    const ry = y + i * (rowH + gap);
    const slide = R((1 - ease.outCubic(k)) * 10);
    const isW = i === winner && glow > 0;
    const v = clamp(values[i]);
    const fw = Math.max(v > 0.004 ? 1 : 0, R(tw * v));
    const X = x - slide;
    if (isW) {
      // dithered gold glow ring around the row (never under the value text)
      const lv = 0.3 + 0.25 * clamp(glow);
      dither(ctx, X - 3, ry - 3, w + 6, 2, null, C.gold, lv);
      dither(ctx, X - 3, ry + rowH + 1, w + 6, 2, null, C.gold, lv);
      dither(ctx, X - 3, ry - 1, 2, rowH + 2, null, C.gold, lv);
      dither(ctx, X + w + 1, ry - 1, 2, rowH + 2, null, C.gold, lv);
    }
    // tile
    rect(ctx, X, ry, tile, rowH, isW ? C.gold : C.tealDeep);
    pixelText(ctx, LETTERS[i], X + R(tile / 2) - (o.big ? 2 : 1) + (o.big ? 0 : 0), ry + R((rowH - fh) / 2), isW ? C.tealDeep : C.cream, { font, align: 'left' });
    // track + fill
    rect(ctx, X + tile + 2, ry, tw, rowH, C.tealDeep);
    if (fw > 0) {
      const col = isW ? C.gold : C.sky;
      rect(ctx, X + tile + 2, ry, fw, rowH, col);
      hline(ctx, X + tile + 2, X + tile + 1 + fw, ry, isW ? RAMP.glow[4] : W_[5]);
      if (rowH > 4) hline(ctx, X + tile + 2, X + tile + 1 + fw, ry + rowH - 1, isW ? RAMP.glow[1] : W_[3]);
    }
    const vs = v >= 0.995 ? '1.00' : v.toFixed(2);
    pixelText(ctx, vs, X + w, ry + R((rowH - fh) / 2), isW ? C.gold : C.cream, { font, align: 'right' });
    if (isW && glow >= 1 && Math.floor(t * 4) % 2 === 0) frame(ctx, X - 1, ry - 1, w + 2, rowH + 2, C.cream);
    rows.push({ x: X, y: ry, w, h: rowH, fx: X + tile + 2 + fw, tx: X + tile + 2, tw });
  }
  return rows;
}
/** Probability mix while "learning": jittery values that converge to `target` as k -> 1. */
export function learning(target, k, t, seed = 1) {
  const q = Math.floor(t * 10);
  const raw = target.map((v, i) => lerp(0.25 + (hash(q, i, seed) - 0.5) * 0.36, v, ease.inOutQuad(clamp(k))));
  const s = raw.reduce((a, b) => a + b, 0);
  return raw.map((v) => Math.max(0.01, v / s));
}

// ================================================================ gem
/**
 * Faceted gem that spins (facets rotate around the vertical axis, lit from the upper-left).
 * (cx, top) = centre / top row. hw = half width, crown/pav = rows. theta = rotation (rad).
 */
export function gem(ctx, cx, top, { hw = 7, crown = 4, pav = 7, theta = 0, outlineCol = INK, glint = true } = {}) {
  const rows = [];
  for (let r = 0; r < crown; r++) rows.push({ hw: R(lerp(hw * 0.55, hw, (r + 1) / crown)), part: r === 0 ? 'table' : 'crown' });
  for (let r = 0; r < pav; r++) rows.push({ hw: Math.max(0, R(hw * (1 - (r + 1) / (pav + 0.6)))), part: 'pav' });
  const CROWN = [W_[3], W_[4], W_[5], W_[6]], PAV = [W_[1], W_[2], W_[3], W_[4]];
  const N = 6, seg = (Math.PI * 2) / N;
  // outline
  rows.forEach((rw, i) => {
    const y = top + i;
    hline(ctx, cx - rw.hw - 1, cx + rw.hw + 1, y, outlineCol);
  });
  hline(ctx, cx - rows[0].hw, cx + rows[0].hw, top - 1, outlineCol);
  px(ctx, cx, top + rows.length, outlineCol);
  rows.forEach((rw, i) => {
    const y = top + i;
    for (let x = -rw.hw; x <= rw.hw; x++) {
      const phi = Math.acos(clamp(rw.hw ? x / (rw.hw + 0.5) : 0, -1, 1)); // 0 = right edge .. PI = left edge
      const idx = Math.floor(mod(phi - theta, Math.PI * 2) / seg);
      const mid = theta + (idx + 0.5) * seg;
      const lightK = clamp((1 - Math.cos(mid)) / 2 * 0.8 + Math.sin(mid) * 0.25);
      const ramp = rw.part === 'pav' ? PAV : CROWN;
      let col = ramp[Math.min(3, Math.floor(lightK * 4))];
      if (rw.part === 'table') col = W_[6];
      px(ctx, cx + x, y, col);
    }
  });
  // girdle highlight + glint
  const g = rows[crown - 1];
  hline(ctx, cx - g.hw, cx + g.hw, top + crown - 1, W_[6]);
  if (glint) { px(ctx, cx - R(hw * 0.4), top + 1, C.cream); px(ctx, cx - R(hw * 0.4) + 1, top + 1, C.cream); px(ctx, cx - R(hw * 0.4), top + 2, C.cream); }
  return { h: rows.length, bottom: top + rows.length };
}

// ================================================================ check stamp
/**
 * The call: a coral rubber-stamp badge (dark outline, worn cream inner ring, thick cream check). r = radius.
 * Cached per radius; draw sizes step down over a few frames for the slam (no smooth scaling).
 */
export function checkStamp(ctx, cx, cy, r, { wear = 0.1 } = {}) {
  const S = r * 2 + 5;
  const cv = cached(`E-stamp2|${r}|${wear}`, S, S, (k) => {
    const c0 = r + 2;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const d = Math.hypot(x - c0, y - c0);
      if (d <= r + 1.5 && d > r + 0.5) px(k, x, y, RAMP.ink[1]);
      else if (d <= r + 0.5) {
        const ring = d > r - 3.5 && d <= r - 2.5;
        px(k, x, y, ring && hash(x, y, 3) > wear ? C.cream : hash(x, y, 8) < wear * 0.6 ? RAMP.roof[3] : C.coral);
      }
    }
    // thick check: short leg down-right, long leg up-right (3px stroke + 1px shade)
    const ax = c0 - R(r * 0.46), ay = c0 + R(r * 0.0);
    const bx = c0 - R(r * 0.12), by = c0 + R(r * 0.36);
    const ex = c0 + R(r * 0.5), ey = c0 - R(r * 0.38);
    const st = Math.max(1, R(r * 0.09));
    thick(k, ax, ay + 1, bx, by + 1, st, RAMP.roof[1]); thick(k, bx, by + 1, ex, ey + 1, st, RAMP.roof[1]);
    thick(k, ax, ay, bx, by, st, C.cream); thick(k, bx, by, ex, ey, st, C.cream);
  });
  ctx.drawImage(cv, R(cx - r - 2), R(cy - r - 2));
}

// ================================================================ winged sandal (generic messenger; NOT a logo)
/** 1px outline around the opaque pixels of a canvas (4-neighbour). Returns a canvas 2px larger. */
function outlineCanvas(src, col) {
  const w = src.width, h = src.height;
  const d = src.getContext('2d').getImageData(0, 0, w, h).data;
  const on = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 0;
  const { canvas, ctx } = makeCanvas(w + 2, h + 2);
  ctx.fillStyle = col;
  for (let y = -1; y <= h; y++) for (let x = -1; x <= w; x++) {
    if (on(x, y)) continue;
    if (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1)) ctx.fillRect(x + 1, y + 1, 1, 1);
  }
  ctx.drawImage(src, 1, 1);
  return canvas;
}
const sandalCache = new Map();
export const SANDAL_W = 64, SANDAL_H = 42;
// wing: four stacked feathers fanning back from the heel cuff (local coords: root 0,0; -x = back, -y = up)
const FEATHERS = [[[0, -9], [-21, -16]], [[0, -5], [-20, -10]], [[0, -1], [-16, -4]], [[0, 3], [-11, 2]]];
/** Side-view winged sandal pointing right (leather upper, gold straps, big fanned heel wing). f = flap frame 0..2. */
export function sandalCanvas(f) {
  if (sandalCache.has(f)) return sandalCache.get(f);
  const W = SANDAL_W - 2, H = SANDAL_H - 2;
  const { canvas: cv, ctx: k } = makeCanvas(W, H);
  const LEA = RAMP.hair[3], LEA_D = RAMP.hair[2], LEA_L = RAMP.autumn[2], SOLE = RAMP.hair[1];
  const ox = 14, oy = 8;                       // boot offset inside the canvas
  // --- wing (behind the boot), rotated around its root at the heel cuff
  const rx = ox + 12, ry = oy + 13;
  const ang = [0.32, 0, -0.26][f];
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const tr = ([x, y]) => [rx + x * ca - y * sa, ry + x * sa + y * ca];
  FEATHERS.forEach(([a0, a1], i) => {
    const [x0, y0] = tr(a0), [x1, y1] = tr(a1);
    thick(k, x0, y0, x1, y1, 2, i === 0 ? C.cream : AL[3]);
    thick(k, x0, y0 - 1, x1, y1 - 1, 1, C.cream);
    line(k, x0, y0 + 2, x1, y1 + 2, AL[1]);     // sky edge under each feather
  });
  // covert lobe over the feather roots
  const [cx0, cy0] = tr([-3, -3]);
  ellipse(k, cx0, cy0, 4, 5, C.cream);
  px(k, cx0 - 2, cy0 + 2, AL[3]); px(k, cx0 - 1, cy0 + 3, AL[3]);
  // --- upper (leather) polygon: heel, ankle, instep, toe
  const P = (x, y) => [ox + x, oy + y];
  poly(k, [P(9, 29), P(9, 17), P(11, 12), P(20, 12), P(22, 18), P(34, 22), P(42, 24), P(44, 28), P(44, 29)], LEA);
  poly(k, [P(9, 29), P(9, 25), P(44, 26), P(44, 29)], LEA_D);
  line(k, ox + 11, oy + 13, ox + 19, oy + 13, LEA_L); line(k, ox + 22, oy + 19, ox + 33, oy + 23, LEA_L); line(k, ox + 34, oy + 23, ox + 41, oy + 25, LEA_L);
  // gold straps: ankle cuff + cross straps + toe strap
  rect(k, ox + 10, oy + 12, 11, 3, C.gold); hline(k, ox + 10, ox + 20, oy + 12, RAMP.glow[4]);
  line(k, ox + 12, oy + 16, ox + 24, oy + 27, C.gold); line(k, ox + 21, oy + 16, ox + 14, oy + 27, C.gold);
  line(k, ox + 30, oy + 21, ox + 32, oy + 28, C.gold); line(k, ox + 36, oy + 23, ox + 37, oy + 28, RAMP.glow[1]);
  // sole: cream midsole + dark sole, toe kick
  hline(k, ox + 8, ox + 45, oy + 29, RAMP.tower[3]);
  rect(k, ox + 8, oy + 30, 38, 2, SOLE);
  px(k, ox + 45, oy + 28, RAMP.tower[3]); px(k, ox + 46, oy + 29, SOLE);
  const out = { canvas: outlineCanvas(cv, RAMP.ink[1]), w: SANDAL_W, h: SANDAL_H };
  sandalCache.set(f, out);
  return out;
}
export function sandal(ctx, x, y, t, { flip = false, rate = 15 } = {}) {
  const f = [0, 1, 2, 1][frameIndex(t, rate, 4)];
  const s = sandalCanvas(f);
  if (flip) {
    ctx.save(); ctx.translate(R(x) + s.w, R(y)); ctx.scale(-1, 1); ctx.drawImage(s.canvas, 0, 0); ctx.restore();
  } else ctx.drawImage(s.canvas, R(x), R(y));
  return s;
}
/** Speed trail: key-art style horizontal streaks behind a mover (left of x if dir = 1). */
export function speedTrail(ctx, x, y, len, t, { dir = 1, h = 12, seed = 3, k = 1 } = {}) {
  const q = Math.floor(t * 15);
  const cols = [C.cream, C.sky, W_[5], C.sky, W_[3]];
  for (let i = 0; i < 8; i++) {
    const yy = y + R((i / 7) * h);
    const L = R(len * k * (0.35 + 0.65 * hash(i, q >> 1, seed)));
    if (L < 2) continue;
    const gap = R(2 + hash(i, 7, seed) * 6);
    const x0 = dir > 0 ? x - gap - L : x + gap;
    hline(ctx, x0, x0 + L, yy, cols[i % cols.length]);
  }
}

// ================================================================ terminal window
/**
 * Agent terminal: key-art panel (dark teal + sky outline) with a sky title bar.
 * Returns the content rect.
 */
export function terminalFrame(ctx, x, y, w, h, title = 'AGENT') {
  rect(ctx, x + 2, y + 2, w, h, RAMP.ink[2]);           // hard drop shadow
  rect(ctx, x, y, w, h, C.sky);
  rect(ctx, x + 1, y + 9, w - 2, h - 10, RAMP.ink[0]);
  rect(ctx, x + 1, y + 1, w - 2, 7, C.sky);
  hline(ctx, x + 1, x + w - 2, y + 1, W_[5]);
  rect(ctx, x + 3, y + 3, 2, 2, C.coral); rect(ctx, x + 7, y + 3, 2, 2, C.gold); rect(ctx, x + 11, y + 3, 2, 2, C.cream);
  pixelText(ctx, title, x + R(w / 2), y + 2, C.tealDeep, { font: 'tiny', align: 'center' });
  return { x: x + 4, y: y + 12, w: w - 8, h: h - 14 };
}
/** Small pixel tick (gold) 6x5 with top-left at (x, y). */
export function tick(ctx, x, y, col = C.gold) {
  px(ctx, x, y + 2, col); px(ctx, x + 1, y + 3, col); px(ctx, x + 2, y + 4, col);
  px(ctx, x + 3, y + 3, col); px(ctx, x + 4, y + 2, col); px(ctx, x + 5, y + 1, col); px(ctx, x + 6, y, col);
  px(ctx, x + 1, y + 2, col); px(ctx, x + 2, y + 3, col); px(ctx, x + 3, y + 2, col); px(ctx, x + 4, y + 1, col); px(ctx, x + 5, y, col);
}

export { sparkle, haloDisc };
