// text.js: FULL-RES typography + key-art motifs, drawn on g.hi (1920x1080 or 1080x1920) ABOVE the pixel layer.
// Fonts (matched to the key art, see docs/STYLE.md):
//   display = Barlow Semi Condensed 800   ("Hacktoberfest / 2026 / in the 757", big hooks)
//   cond    = Barlow Semi Condensed 700   (coral chips, "HOSTED BY", short caps labels)
//   mono    = JetBrains Mono 800          (eyebrows with wide tracking, info lines: dates, times, addresses)
// Text colors: C.cream (primary), C.sky (secondary), C.tealDark (on coral chips). Nothing else.

import { C, rgba } from './palette.js';
import { clamp, lerp, ease, tween, stamp as stampCurve, snap, FPS } from './motion.js';

export const P = 6;
export const FAMILY = {
  display: '"Barlow Semi Condensed"',
  cond: '"Barlow Semi Condensed"',
  condTight: '"Barlow Condensed"',
  mono: '"JetBrains Mono"',
};
export const WEIGHT = { display: 800, cond: 700, condTight: 700, mono: 800 };
/** Fonts that MUST be loaded (engine checks these and fails loudly otherwise). */
export const REQUIRED_FONTS = [
  '800 100px "Barlow Semi Condensed"', '700 100px "Barlow Semi Condensed"', '900 100px "Barlow Semi Condensed"',
  '600 100px "Barlow Semi Condensed"', '500 100px "Barlow Semi Condensed"',
  '700 100px "Barlow Condensed"', '800 100px "Barlow Condensed"',
  '800 100px "JetBrains Mono"', '700 100px "JetBrains Mono"', '500 100px "JetBrains Mono"',
];

/** Default tracking (em) per role. Mono info lines are tightened slightly to match the key art width. */
export const TRACK = { display: -0.005, cond: 0.01, condTight: 0.01, mono: -0.03, eyebrow: 0.14 };

/**
 * Type scale per format (device px font sizes). Use these instead of magic numbers so scenes feel like one system.
 *  hero:   title-size display (the key-art headline)      display: big hook words / numbers
 *  title:  secondary display (2-4 word hooks)             label:   condensed caps labels / chips
 *  info:   mono info lines (dates, address)                eyebrow: tiny mono caps with wide tracking
 */
export const TYPE = {
  '16x9': { hero: 232, display: 200, title: 132, label: 50, info: 54, eyebrow: 34, small: 30 },
  '9x16': { hero: 178, display: 190, title: 120, label: 50, info: 46, eyebrow: 32, small: 30 },
};

/** Text-safe rectangles (BRIEF section 3). */
export const SAFE = {
  '16x9': { x0: 96, y0: 54, x1: 1824, y1: 1026 },
  '9x16': { x0: 80, y0: 230, x1: 1000, y1: 1500 },
};
/** safe(fmt) -> { x0, y0, x1, y1, w, h, cx, cy } (engine passes an overlay-aware version as c.safe). */
export function safe(fmt) {
  const s = SAFE[fmt] || SAFE['16x9'];
  return { ...s, w: s.x1 - s.x0, h: s.y1 - s.y0, cx: (s.x0 + s.x1) / 2, cy: (s.y0 + s.y1) / 2 };
}

// ---------------------------------------------------------------- core text
/** CSS font string for a role. */
export function font(role = 'display', size = 100, weight = WEIGHT[role] || 800) {
  return `${weight} ${Math.round(size * 100) / 100}px ${FAMILY[role] || FAMILY.display}`;
}
const capCache = new Map();
/** Cap height / font size ratio for a role+weight (measured once). */
export function capRatio(ctx, role = 'display', weight = WEIGHT[role]) {
  const key = role + weight;
  if (!capCache.has(key)) {
    ctx.save();
    ctx.font = font(role, 100, weight);
    ctx.letterSpacing = '0px';
    const m = ctx.measureText('H');
    capCache.set(key, m.actualBoundingBoxAscent / 100);
    ctx.restore();
  }
  return capCache.get(key);
}

/**
 * Measure a string. Returns { w, cap, asc, desc } in device px (w excludes trailing tracking).
 * opts: { role, size, weight, tracking (em) }
 */
export function measure(ctx, str, { role = 'display', size = 100, weight, tracking } = {}) {
  weight = weight || WEIGHT[role];
  const tr = (tracking ?? TRACK[role] ?? 0) * size;
  ctx.save();
  ctx.font = font(role, size, weight);
  ctx.letterSpacing = tr + 'px';
  const m = ctx.measureText(str);
  ctx.restore();
  const n = [...String(str)].length;
  return {
    w: m.width - (n > 0 ? tr : 0),
    cap: capRatio(ctx, role, weight) * size,
    asc: m.actualBoundingBoxAscent,
    desc: m.actualBoundingBoxDescent,
  };
}
/** Largest font size <= maxSize such that str fits in maxW. */
export function fitSize(ctx, str, maxW, { role = 'display', maxSize = 200, minSize = 12, weight, tracking } = {}) {
  const w = measure(ctx, str, { role, size: 100, weight, tracking }).w;
  return clamp((100 * maxW) / Math.max(1, w), minSize, maxSize);
}

/**
 * Draw text. (x, y) is the anchor point; alignment/baseline choose where the anchor sits on the text box.
 * opts:
 *   role 'display'|'cond'|'condTight'|'mono', size (px), weight, color (C.cream), alpha
 *   align 'left'|'center'|'right'
 *   baseline 'alphabetic' | 'cap-top' | 'cap-middle' (vertical centre of capitals) | 'top' | 'bottom'
 *   tracking (em; default per role), shadow: true|{dx,dy,color} hard drop shadow (pixel-style, tealDeep)
 *   scale (around the anchor point), rotate (radians)
 * Returns the cap box { x0, y0, x1, y1, w, h, baseline } BEFORE scale/rotate.
 */
export function text(ctx, str, x, y, o = {}) {
  const role = o.role || 'display';
  const size = o.size || 100;
  const weight = o.weight || WEIGHT[role];
  const tracking = o.tracking ?? TRACK[role] ?? 0;
  const m = measure(ctx, str, { role, size, weight, tracking });
  const align = o.align || 'left';
  const bl = o.baseline || 'alphabetic';
  const x0 = align === 'center' ? -m.w / 2 : align === 'right' ? -m.w : 0;
  const by = bl === 'cap-top' ? m.cap : bl === 'cap-middle' ? m.cap / 2 : bl === 'top' ? m.asc : bl === 'bottom' ? -m.desc : 0;
  const box = { x0: x + x0, y0: y + by - m.cap, x1: x + x0 + m.w, y1: y + by, w: m.w, h: m.cap, baseline: y + by };
  const alpha = o.alpha ?? 1;
  if (alpha <= 0 || !str) return box;
  ctx.save();
  ctx.translate(x, y);
  if (o.rotate) ctx.rotate(o.rotate);
  if (o.scale !== undefined && o.scale !== 1) ctx.scale(o.scale, o.scale);
  ctx.font = font(role, size, weight);
  ctx.letterSpacing = tracking * size + 'px';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.globalAlpha *= alpha;
  if (o.shadow) {
    const s = o.shadow === true ? {} : o.shadow;
    ctx.fillStyle = s.color || C.tealDeep;
    ctx.fillText(str, x0 + (s.dx ?? P), by + (s.dy ?? P));
  }
  ctx.fillStyle = o.color || C.cream;
  ctx.fillText(str, x0, by);
  ctx.restore();
  return box;
}
/** Display (headline) text. */
export const display = (ctx, str, x, y, o = {}) => text(ctx, str, x, y, { role: 'display', ...o });
/** Condensed caps (labels). Uppercases automatically. */
export const cond = (ctx, str, x, y, o = {}) => text(ctx, String(str).toUpperCase(), x, y, { role: 'cond', ...o });
/** Mono info line ("OCTOBER 17 • 10 AM–4 PM"). */
export const mono = (ctx, str, x, y, o = {}) => text(ctx, str, x, y, { role: 'mono', ...o });
/** Eyebrow: small mono caps with wide tracking ("COMMUNITY HACK DAY"). */
export const eyebrow = (ctx, str, x, y, o = {}) =>
  text(ctx, String(str).toUpperCase(), x, y, { role: 'mono', tracking: TRACK.eyebrow, size: 34, ...o });

// ---------------------------------------------------------------- animation wrapper
/**
 * Animate any drawing: in/out transitions around an anchor point. Calls draw(ctx) inside the transform.
 *   anim(ctx, t, { t0, t1, x, y, enter: 'stamp', exit: 'drop' }, (ctx) => chip(ctx, 'FREE', x, y))
 * enter: 'cut' | 'stamp' (1.15 -> 1 w/ 2-frame overshoot) | 'pop' (0 -> 1 back-ease) | 'slide-left' | 'slide-right'
 *        | 'slide-up' | 'slide-down' (pixel-stepped, 6px grid) | 'fade' (alpha steps, use sparingly)
 * exit:  'cut' | 'shrink' (3 frames) | 'drop' (falls a few px + vanishes) | 'slide-*' | 'fade'
 * t0 = when it lands (on the beat), t1 = when it is gone (default: never). dist = slide distance px (default 72).
 * Returns visibility 0..1 (0 = not drawn).
 */
export function anim(ctx, t, o, draw) {
  const { t0 = 0, t1 = Infinity, x = 0, y = 0, enter = 'stamp', exit = 'cut', dist = 72, dur = 0.22 } = o;
  if (t < t0 || t >= t1 + exitDur(exit)) return 0;
  let sc = 1, dx = 0, dy = 0, alpha = 1;
  const te = t - t0;
  if (enter === 'stamp') { const s = stampCurve(t, t0); sc = s.scale; alpha = s.alpha; }
  else if (enter === 'pop') { sc = tween(t, t0, dur, ease.outBack); }
  else if (enter === 'fade') { alpha = Math.floor(clamp(te / dur) * 4) / 4 || (te > 0 ? 0.25 : 0); }
  else if (enter.startsWith('slide')) {
    const k = tween(t, t0, dur, ease.outCubic);
    const off = snap((1 - k) * dist, P);
    const dir = enter.slice(6);
    if (dir === 'left') dx = -off; else if (dir === 'right') dx = off; else if (dir === 'up') dy = -off; else dy = off;
    if (te < 1 / FPS) alpha = 0.6;
  }
  // exit
  if (t >= t1) {
    const k = clamp((t - t1) / exitDur(exit));
    if (exit === 'cut') return 0;
    if (exit === 'shrink') sc *= 1 - ease.inBack(k) * 0.9;
    else if (exit === 'drop') { dy += snap(k * k * 60, P); alpha *= k > 0.66 ? 0 : 1; }
    else if (exit === 'fade') alpha *= 1 - Math.ceil(k * 3) / 3;
    else if (exit.startsWith('slide')) {
      const off = snap(ease.inCubic(k) * dist, P);
      const dir = exit.slice(6);
      if (dir === 'left') dx -= off; else if (dir === 'right') dx += off; else if (dir === 'up') dy -= off; else dy += off;
    }
    if (sc <= 0.02 || alpha <= 0) return 0;
  }
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x + dx, y + dy);
  ctx.scale(sc, sc);
  ctx.translate(-x, -y);
  draw(ctx);
  ctx.restore();
  return alpha;
}
function exitDur(exit) {
  return exit === 'cut' ? 0 : exit === 'shrink' ? 3 / FPS : exit === 'drop' ? 5 / FPS : 0.2;
}
/** Stamp text in at t0 (scale about its own center). Same opts as text() plus t0/t1/exit. */
export function stampText(ctx, t, t0, str, x, y, o = {}) {
  const m = textBox(ctx, str, x, y, o);
  return anim(ctx, t, { t0, t1: o.t1, x: m.cx, y: m.cy, enter: 'stamp', exit: o.exit || 'cut' }, (c) => text(c, str, x, y, o));
}
/** Pixel-stepped slide-in (from: 'left'|'right'|'up'|'down'). */
export function slideText(ctx, t, t0, str, x, y, o = {}) {
  return anim(ctx, t, { t0, t1: o.t1, x, y, enter: 'slide-' + (o.from || 'left'), exit: o.exit || 'cut', dist: o.dist, dur: o.dur },
    (c) => text(c, str, x, y, o));
}
/** Pop (back-ease scale from 0). */
export function popText(ctx, t, t0, str, x, y, o = {}) {
  const m = textBox(ctx, str, x, y, o);
  return anim(ctx, t, { t0, t1: o.t1, x: m.cx, y: m.cy, enter: 'pop', exit: o.exit || 'cut', dur: o.dur }, (c) => text(c, str, x, y, o));
}
/**
 * Type-on (terminal style, mono by default): reveals `cps` characters per second from t0, with a block cursor.
 * opts.cursor (default true) blinks at 2 Hz after typing finishes; opts.t1 hides it.
 */
export function typeText(ctx, t, t0, str, x, y, o = {}) {
  if (t < t0 || (o.t1 !== undefined && t >= o.t1)) return 0;
  const cps = o.cps || 28;
  const n = Math.min(str.length, Math.floor((t - t0) * cps + 1e-6) + 1);
  const shown = str.slice(0, n);
  const oo = { role: 'mono', ...o };
  const box = text(ctx, shown, x, y, oo);
  const done = n >= str.length;
  if (o.cursor !== false && (!done || Math.floor((t - t0) * 4) % 2 === 0)) {
    const m = measure(ctx, 'M', oo);
    ctx.save();
    ctx.fillStyle = o.cursorColor || o.color || C.cream;
    ctx.globalAlpha *= o.alpha ?? 1;
    const align = oo.align || 'left';
    const cx = align === 'left' ? box.x1 + m.w * 0.15 : box.x1 + m.w * 0.15;
    ctx.fillRect(Math.round(cx), Math.round(box.y0), Math.round(m.w * 0.62), Math.round(m.cap));
    ctx.restore();
  }
  return 1;
}
/** Cap box of a text without drawing: { x0, y0, x1, y1, w, h, cx, cy }. */
export function textBox(ctx, str, x, y, o = {}) {
  const role = o.role || 'display';
  const m = measure(ctx, str, { role, size: o.size || 100, weight: o.weight, tracking: o.tracking });
  const align = o.align || 'left';
  const bl = o.baseline || 'alphabetic';
  const x0 = x + (align === 'center' ? -m.w / 2 : align === 'right' ? -m.w : 0);
  const base = y + (bl === 'cap-top' ? m.cap : bl === 'cap-middle' ? m.cap / 2 : bl === 'top' ? m.asc : bl === 'bottom' ? -m.desc : 0);
  return { x0, y0: base - m.cap, x1: x0 + m.w, y1: base, w: m.w, h: m.cap, cx: x0 + m.w / 2, cy: base - m.cap / 2 };
}

// ---------------------------------------------------------------- key-art motifs (hi layer, snapped to the 6px grid)
/**
 * Coral banner chip with dark-teal condensed caps (key art: "FREE · BEGINNERS WELCOME · STUDENTS ENCOURAGED").
 * (x, y) = anchor per opts.align ('left'|'center'|'right') at the chip's vertical centre.
 * opts: { size (font px, default 44), color (C.coral), textColor (C.tealDark), padX, padY, weight, role, alpha, minW }
 * Returns the chip rect { x0, y0, x1, y1, w, h }.
 */
export function chip(ctx, str, x, y, o = {}) {
  const size = o.size || 44;
  const role = o.role || 'cond';
  const label = String(str).toUpperCase();
  const m = measure(ctx, label, { role, size, weight: o.weight || 700, tracking: o.tracking });
  const padX = o.padX ?? Math.round(m.cap * 1.9);
  const padY = o.padY ?? Math.round(m.cap * 0.95);
  const w = snap(Math.max(o.minW || 0, m.w + padX * 2), P), h = snap(m.cap + padY * 2, P);
  const align = o.align || 'left';
  const x0 = snap(align === 'center' ? x - w / 2 : align === 'right' ? x - w : x, P);
  const y0 = snap(y - h / 2, P);
  ctx.save();
  ctx.globalAlpha *= o.alpha ?? 1;
  ctx.fillStyle = o.color || C.coral;
  ctx.fillRect(x0, y0, w, h);
  ctx.restore();
  text(ctx, label, x0 + w / 2, y0 + h / 2, { role, size, weight: o.weight || 700, color: o.textColor || C.tealDark, align: 'center', baseline: 'cap-middle', tracking: o.tracking, alpha: o.alpha });
  return { x0, y0, x1: x0 + w, y1: y0 + h, w, h };
}
/**
 * The ||| coral bars motif (next to date info). (x, y) = top-left, h = height.
 * opts: { n: 3, color: C.coral, barW, gap, grow: 0..1 (animate bars growing from the bottom, staggered) }
 * Returns { x0, y0, x1, y1, w, h }.
 */
export function bars(ctx, x, y, h, o = {}) {
  const n = o.n || 3;
  const bw = o.barW || Math.max(P, snap(h * 0.18, P));
  const gap = o.gap || Math.max(P, snap(h * 0.085, P));
  const grow = o.grow ?? 1;
  ctx.save();
  ctx.fillStyle = o.color || C.coral;
  ctx.globalAlpha *= o.alpha ?? 1;
  for (let i = 0; i < n; i++) {
    const k = clamp(grow * (n + 1) - i * 0.6);
    const hh = snap(h * clamp(k), P);
    if (hh <= 0) continue;
    ctx.fillRect(snap(x, P) + i * (bw + gap), snap(y, P) + snap(h, P) - hh, bw, hh);
  }
  ctx.restore();
  const w = n * bw + (n - 1) * gap;
  return { x0: x, y0: y, x1: x + w, y1: y + h, w, h };
}
/**
 * Stair-step pixel corner cluster (key art: coral top-left, sky top-right). (x, y) = top-left of its bounding box.
 * opts: { cell: 30, n: 3, dir: 'dl' (cells step down-left, like the key art top-left) | 'dr' (down-right, top-right)
 *         | 'ul' | 'ur', color, show: 0..1 (animate cells popping in one by one) }
 */
export function stairs(ctx, x, y, o = {}) {
  const cell = o.cell || 30, n = o.n || 3, dir = o.dir || 'dl';
  const show = o.show ?? 1;
  ctx.save();
  ctx.fillStyle = o.color || C.coral;
  ctx.globalAlpha *= o.alpha ?? 1;
  for (let i = 0; i < n; i++) {
    if (show * n < i + 0.5) continue;
    const down = dir[0] === 'd';
    const left = dir[1] === 'l';
    const cx = left ? (n - 1 - i) * cell : i * cell;
    const cy = down ? i * cell : (n - 1 - i) * cell;
    ctx.fillRect(snap(x, P) + cx, snap(y, P) + cy, cell, cell);
  }
  ctx.restore();
  return { w: n * cell, h: n * cell };
}
/** Key-art corner clusters for a format (coral top-left 'dl', sky top-right 'dr'). show: 0..1 for pop-in. */
export function corners(ctx, fmt, o = {}) {
  const W = fmt === '9x16' ? 1080 : 1920;
  const cell = o.cell || 30;
  const m = fmt === '9x16' ? { x: 36, y: o.y ?? 186 } : { x: 30, y: 42 };
  stairs(ctx, m.x, m.y, { cell, dir: 'dl', color: C.coral, show: o.show ?? 1, alpha: o.alpha });
  if (o.right !== false) stairs(ctx, W - m.x - cell * 3, m.y, { cell, dir: 'dr', color: C.sky, show: o.showRight ?? o.show ?? 1, alpha: o.alpha });
}
/** Small gold pixel plus / sparkle (5 cells). (x, y) = centre. opts: { cell: 12, color: C.gold, scale (0..1 pop) } */
export function plus(ctx, x, y, o = {}) {
  const cell = o.cell || 12;
  const s = o.scale ?? 1;
  if (s <= 0) return;
  const c = Math.max(P, snap(cell * s, P));
  const X = snap(x, P), Y = snap(y, P);
  ctx.save();
  ctx.fillStyle = o.color || C.gold;
  ctx.globalAlpha *= o.alpha ?? 1;
  ctx.fillRect(X - c / 2, Y - c * 1.5, c, c * 3);
  ctx.fillRect(X - c * 1.5, Y - c / 2, c * 3, c);
  ctx.restore();
}
/**
 * Rounded panel with light-blue outline (key art "Hosted by" panel).
 * opts: { radius: 24, fill: C.tealDark, stroke: C.sky, lineWidth: 6, alpha }
 */
export function panel(ctx, x, y, w, h, o = {}) {
  const r = o.radius ?? 24, lw = o.lineWidth ?? 6;
  ctx.save();
  ctx.globalAlpha *= o.alpha ?? 1;
  ctx.beginPath();
  ctx.roundRect(x + lw / 2, y + lw / 2, w - lw, h - lw, r);
  ctx.fillStyle = o.fill || C.tealDark;
  ctx.fill();
  if (lw > 0) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = o.stroke || C.sky;
    ctx.stroke();
  }
  ctx.restore();
  return { x0: x, y0: y, x1: x + w, y1: y + h, w, h };
}

/**
 * The campaign title lockup: "Hacktoberfest" / "2026" / "in the 757" (lines 1-2 cream, line 3 sky), key-art spacing.
 * (x, y) = left (or centre/right per align) at the TOP of line 1's capitals.
 * opts: { size (font px; default TYPE[fmt].hero), align, lines: [true,true,true] which lines to show,
 *         t, t0, stagger (s between line stamps; default 0 = all at t0), show: 0..1 progress alternative,
 *         color1, color3 }
 * Without t/t0 it draws statically. Returns { x0, y0, x1, y1, lineBoxes[] }.
 */
export function titleLockup(ctx, x, y, o = {}) {
  const size = o.size || 232;
  const align = o.align || 'left';
  const lines = o.texts || ['Hacktoberfest', '2026', 'in the 757'];
  const show = o.lines || [true, true, true];
  const lh = [0, 0.9, 0.86];  // baseline step factors (key art: 1.0 -> 0.93 -> 0.85 of size, tightened for Barlow SC)
  const cap = capRatio(ctx, 'display') * size;
  let base = y + cap;
  const boxes = [];
  let k = 0;
  for (let i = 0; i < lines.length; i++) {
    if (!show[i]) continue;
    if (k > 0) base += size * (lh[i] || 0.9);
    const color = i === 2 ? o.color3 || C.sky : o.color1 || C.cream;
    const opts = { role: 'display', size, align, color, weight: o.weight };
    if (o.t !== undefined) {
      const t0 = (o.t0 || 0) + k * (o.stagger || 0);
      const bx = textBox(ctx, lines[i], x, base, opts);
      anim(ctx, o.t, { t0, t1: o.t1, x: bx.cx, y: bx.cy, enter: o.enter || 'stamp', exit: o.exit || 'cut' }, (c) => text(c, lines[i], x, base, opts));
      boxes.push(bx);
    } else {
      boxes.push(text(ctx, lines[i], x, base, opts));
    }
    k++;
  }
  const x0 = Math.min(...boxes.map((b) => b.x0)), x1 = Math.max(...boxes.map((b) => b.x1));
  return { x0, y0: y, x1, y1: base, lineBoxes: boxes };
}

/**
 * Info block like the key art: ||| bars + two mono lines. (x, y) = top-left of the bars.
 * opts: { size (default TYPE[fmt].info), lines: ['OCTOBER 17 • 10 AM–4 PM', '757 Makerspace · Hampton'], grow }
 */
export function infoBlock(ctx, x, y, o = {}) {
  const size = o.size || 54;
  const lines = o.lines || ['OCTOBER 17 • 10 AM–4 PM', '757 Makerspace · Hampton'];
  const cap = capRatio(ctx, 'mono') * size;
  const gapL = size * 0.62;
  const h = cap * lines.length + gapL * (lines.length - 1);
  const pad = size * 0.2;
  const b = bars(ctx, x, y - pad, h + pad * 2, { grow: o.grow ?? 1 });
  const tx = x + b.w + size * 0.62;
  lines.forEach((l, i) => {
    text(ctx, l, tx, y + cap + i * (cap + gapL), { role: 'mono', size, color: o.color || C.cream, alpha: o.alpha });
  });
  return { x0: x, y0: y, x1: tx + Math.max(...lines.map((l) => measure(ctx, l, { role: 'mono', size }).w)), y1: y + h };
}

/**
 * The 9:16 info strip overlay (engine draws it over chorus scenes in the social edit).
 * Mono caps on a tealDark bar with coral ||| at left. (y) = vertical centre.
 */
export function infoStrip(ctx, fmt, str, y, o = {}) {
  const s = safe(fmt);
  const size = o.size || 34;
  const m = measure(ctx, str, { role: 'mono', size, tracking: 0.06 });
  const h = snap(m.cap + 36, P);
  const w = snap(m.w + 96, P);
  const x0 = snap(s.cx - w / 2, P), y0 = snap(y - h / 2, P);
  ctx.save();
  ctx.globalAlpha *= o.alpha ?? 1;
  ctx.fillStyle = C.tealDark;
  ctx.fillRect(x0, y0, w, h);
  ctx.fillStyle = C.coral;
  for (let i = 0; i < 3; i++) ctx.fillRect(x0 + 18 + i * 12, y0 + 12, 6, h - 24);
  ctx.restore();
  text(ctx, str, x0 + 66, y0 + h / 2, { role: 'mono', size, color: C.cream, baseline: 'cap-middle', tracking: 0.06, alpha: o.alpha });
  return { x0, y0, x1: x0 + w, y1: y0 + h, w, h };
}

/** Full-screen flash on the hi layer (beat accents). color default cream; alpha 0..1. */
export function flash(ctx, W, H, alpha, color = C.cream) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.fillStyle = rgba(color, clamp(alpha));
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}
