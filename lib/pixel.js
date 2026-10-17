// pixel.js: drawing on the LOW-RES pixel canvas (g.px, 320x180 or 180x320, upscaled x6 nearest-neighbor).
// Every function takes the 2D context first and rounds coordinates to integers. Colors are '#RRGGBB' strings.
// No anti-aliasing, no gradients: use dither() / bands() for soft transitions.

const R = Math.round;

/** Create an offscreen canvas (w x h) with smoothing disabled. Returns { canvas, ctx }. */
export function makeCanvas(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, w | 0);
  canvas.height = Math.max(1, h | 0);
  const ctx = canvas.getContext('2d', { willReadFrequently: false });
  ctx.imageSmoothingEnabled = false;
  return { canvas, ctx };
}

// ---------------------------------------------------------------- primitives
/** One pixel. */
export function px(ctx, x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(R(x), R(y), 1, 1);
}
/** Filled rectangle (x,y = top-left). */
export function rect(ctx, x, y, w, h, color) {
  if (w <= 0 || h <= 0) return;
  ctx.fillStyle = color;
  ctx.fillRect(R(x), R(y), R(w), R(h));
}
/** 1px rectangle outline. */
export function frame(ctx, x, y, w, h, color) {
  x = R(x); y = R(y); w = R(w); h = R(h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y + h - 1, w, 1);
  ctx.fillRect(x, y, 1, h); ctx.fillRect(x + w - 1, y, 1, h);
}
/** Horizontal line from x0 to x1 inclusive. */
export function hline(ctx, x0, x1, y, color) {
  if (x1 < x0) [x0, x1] = [x1, x0];
  ctx.fillStyle = color;
  ctx.fillRect(R(x0), R(y), R(x1) - R(x0) + 1, 1);
}
/** Vertical line from y0 to y1 inclusive. */
export function vline(ctx, x, y0, y1, color) {
  if (y1 < y0) [y0, y1] = [y1, y0];
  ctx.fillStyle = color;
  ctx.fillRect(R(x), R(y0), 1, R(y1) - R(y0) + 1);
}
/** Bresenham line (inclusive endpoints). */
export function line(ctx, x0, y0, x1, y1, color) {
  x0 = R(x0); y0 = R(y0); x1 = R(x1); y1 = R(y1);
  ctx.fillStyle = color;
  const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
  const dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (let i = 0; i < 4096; i++) {
    ctx.fillRect(x0, y0, 1, 1);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}
/** Filled disc (clean pixel circle). */
export function disc(ctx, cx, cy, r, color) {
  ellipse(ctx, cx, cy, r, r, color, true);
}
/** 1px circle outline. */
export function circle(ctx, cx, cy, r, color) {
  ellipse(ctx, cx, cy, r, r, color, false);
}
/** Ellipse (filled by default) built from horizontal spans; reads as clean pixel art at small sizes. */
export function ellipse(ctx, cx, cy, rx, ry, color, fill = true) {
  cx = R(cx); cy = R(cy); rx = Math.max(0, R(rx)); ry = Math.max(0, R(ry));
  ctx.fillStyle = color;
  if (rx === 0 && ry === 0) return ctx.fillRect(cx, cy, 1, 1);
  const spans = [];
  for (let dy = -ry; dy <= ry; dy++) {
    const k = ry === 0 ? 0 : dy / (ry + 0.5);
    const half = Math.floor((rx + 0.5) * Math.sqrt(Math.max(0, 1 - k * k)));
    spans.push([dy, half]);
  }
  for (let i = 0; i < spans.length; i++) {
    const [dy, half] = spans[i];
    if (fill) { ctx.fillRect(cx - half, cy + dy, half * 2 + 1, 1); continue; }
    // outline: draw the span ends, widened to connect to neighbours
    const prev = spans[i - 1] ? spans[i - 1][1] : -1, next = spans[i + 1] ? spans[i + 1][1] : -1;
    const inner = Math.max(Math.min(prev, next), 0);
    if (i === 0 || i === spans.length - 1) { ctx.fillRect(cx - half, cy + dy, half * 2 + 1, 1); continue; }
    const w = Math.max(1, half - inner);
    ctx.fillRect(cx - half, cy + dy, w, 1);
    ctx.fillRect(cx + half - w + 1, cy + dy, w, 1);
  }
}
/** Filled polygon (scanline, even-odd). pts = [[x,y], ...] in pixel units. */
export function poly(ctx, pts, color) {
  if (pts.length < 3) return;
  ctx.fillStyle = color;
  let minY = Infinity, maxY = -Infinity;
  for (const [, y] of pts) { minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
    const yc = y + 0.5, xs = [];
    for (let i = 0; i < pts.length; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length];
      if ((y0 <= yc && y1 > yc) || (y1 <= yc && y0 > yc)) xs.push(x0 + ((yc - y0) / (y1 - y0)) * (x1 - x0));
    }
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const a = Math.round(xs[i]), b = Math.round(xs[i + 1]);
      if (b > a) ctx.fillRect(a, y, b - a, 1);
    }
  }
}
/** Filled triangle. */
export const tri = (ctx, x0, y0, x1, y1, x2, y2, color) => poly(ctx, [[x0, y0], [x1, y1], [x2, y2]], color);

// ---------------------------------------------------------------- dithering
const BAYER2 = [0, 2, 3, 1];
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
/** Ordered-dither threshold in [0,1) for pixel (x,y). size 2 or 4. */
export function bayer(x, y, size = 4) {
  x = ((x | 0) % size + size) % size; y = ((y | 0) % size + size) % size;
  return size === 2 ? (BAYER2[y * 2 + x] + 0.5) / 4 : (BAYER4[y * 4 + x] + 0.5) / 16;
}
const patternCache = new Map();
function ditherPattern(ctx, a, b, level, size) {
  const steps = size * size;
  const q = Math.max(0, Math.min(steps, Math.round(level * steps)));
  const key = `${a}|${b}|${q}|${size}`;
  let pat = patternCache.get(key);
  if (!pat) {
    const { canvas, ctx: c } = makeCanvas(size, size);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const useB = bayer(x, y, size) < q / steps;
      const col = useB ? b : a;
      if (col) { c.fillStyle = col; c.fillRect(x, y, 1, 1); }
    }
    pat = ctx.createPattern(canvas, 'repeat');
    patternCache.set(key, pat);
  }
  return pat;
}
/**
 * Ordered dither fill between two colors. level 0 -> all colorA, 1 -> all colorB.
 * colorA may be null (transparent) to dither colorB over whatever is below.
 * opts: { size: 4 | 2, ox, oy } (ox/oy shift the pattern; by default it is anchored to the canvas so it never swims).
 */
export function dither(ctx, x, y, w, h, colorA, colorB, level, { size = 4, ox = 0, oy = 0 } = {}) {
  if (w <= 0 || h <= 0) return;
  const pat = ditherPattern(ctx, colorA, colorB, level, size);
  if (ox || oy) pat.setTransform(new DOMMatrix([1, 0, 0, 1, R(ox), R(oy)]));
  ctx.fillStyle = pat;
  ctx.fillRect(R(x), R(y), R(w), R(h));
  if (ox || oy) pat.setTransform(new DOMMatrix());
}
/** Checkerboard (50% bayer2) shortcut. */
export const checker = (ctx, x, y, w, h, a, b) => dither(ctx, x, y, w, h, a, b, 0.5, { size: 2 });

/**
 * Banded vertical gradient: colors[] top -> bottom, each band equal height, with `blend` rows of dithered
 * transition between bands (0 = hard banding like the key art, 2-4 = soft). Returns nothing.
 */
export function bands(ctx, x, y, w, h, colors, { blend = 2, stops = null } = {}) {
  const n = colors.length;
  const edges = stops ? stops.map((s) => y + s * h) : colors.map((_, i) => y + (i * h) / n);
  edges.push(y + h);
  for (let i = 0; i < n; i++) {
    const y0 = R(edges[i]), y1 = R(edges[i + 1]);
    rect(ctx, x, y0, w, y1 - y0, colors[i]);
  }
  if (blend > 0) {
    // 2*blend rows straddling each edge step from the upper color to the lower one through dither levels
    for (let i = 1; i < n; i++) {
      const ey = R(edges[i]);
      for (let r = 0; r < blend * 2; r++) {
        const lvl = (r + 0.5) / (blend * 2);
        dither(ctx, x, ey - blend + r, w, 1, colors[i - 1], colors[i], lvl);
      }
    }
  }
}

// ---------------------------------------------------------------- sprites
/**
 * Compile a sprite from rows of characters + a palette map. '.' and ' ' are transparent.
 *   const boat = sprite(['..aa..', '.abba.', 'cccccc'], { a: C.cream, b: C.coral, c: RAMP.iron[1] });
 * Returns { w, h, canvas, rows, map }. Draw with drawSprite().
 */
export function sprite(rows, map) {
  const h = rows.length, w = Math.max(...rows.map((r) => r.length));
  const { canvas, ctx } = makeCanvas(w, h);
  for (let y = 0; y < h; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      const col = map[ch];
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return { w, h, canvas, rows, map };
}
/** Same sprite with some palette entries replaced: recolor(spr, { b: C.sky }). */
export const recolor = (spr, changes) => sprite(spr.rows, { ...spr.map, ...changes });
/** Solid-color silhouette of a sprite (for shadows, flashes, hit frames). */
export function silhouette(spr, color) {
  const map = {};
  for (const k of Object.keys(spr.map)) map[k] = color;
  return sprite(spr.rows, map);
}
/** Sprite with a 1px outline around its opaque pixels (4-neighbour). Result is 2px larger in w and h. */
export function outline(spr, color) {
  const rows = [];
  const W = spr.w + 2, H = spr.h + 2;
  const solid = (x, y) => {
    const r = spr.rows[y - 1];
    if (!r) return false;
    const ch = r[x - 1];
    return ch !== undefined && ch !== '.' && ch !== ' ' && !!spr.map[ch];
  };
  for (let y = 0; y < H; y++) {
    let s = '';
    for (let x = 0; x < W; x++) {
      if (solid(x, y)) s += spr.rows[y - 1][x - 1];
      else if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) s += '\u0001';
      else s += '.';
    }
    rows.push(s);
  }
  return sprite(rows, { ...spr.map, '\u0001': color });
}
const ANCHORS = { tl: [0, 0], tc: [0, 0.5], tr: [0, 1], cl: [0.5, 0], c: [0.5, 0.5], cr: [0.5, 1], bl: [1, 0], bc: [1, 0.5], br: [1, 1] };
/**
 * Draw a compiled sprite. opts: { flipX, flipY, scale (integer), anchor: 'tl'|'tc'|'tr'|'cl'|'c'|'cr'|'bl'|'bc'|'br', alpha }.
 * Anchor 'bc' (bottom-center) is handy for things standing on the ground.
 */
export function drawSprite(ctx, spr, x, y, { flipX = false, flipY = false, scale = 1, anchor = 'tl', alpha = 1 } = {}) {
  const s = Math.max(1, Math.round(scale));
  const w = spr.w * s, h = spr.h * s;
  const [fy, fx] = ANCHORS[anchor] || ANCHORS.tl;
  const ax = Math.floor(w * fx), ay = Math.floor(h * fy);
  const X = R(x) - ax, Y = R(y) - ay;
  const prevA = ctx.globalAlpha;
  if (alpha !== 1) ctx.globalAlpha = alpha;
  if (flipX || flipY) {
    ctx.save();
    ctx.translate(X + (flipX ? w : 0), Y + (flipY ? h : 0));
    ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
    ctx.drawImage(spr.canvas, 0, 0, w, h);
    ctx.restore();
  } else {
    ctx.drawImage(spr.canvas, X, Y, w, h);
  }
  if (alpha !== 1) ctx.globalAlpha = prevA;
}
/** Blit any canvas at integer coords. */
export const blit = (ctx, canvas, x, y) => ctx.drawImage(canvas, R(x), R(y));

/** Soft ground shadow: dithered ellipse centred at (cx, y). level = darkness 0..1 (dither density). */
export function shadow(ctx, cx, y, w, { color = '#173B38', level = 0.5, h = null } = {}) {
  const rx = Math.max(1, R(w / 2)), ry = h ? R(h / 2) : Math.max(1, R(w / 8));
  ctx.save();
  ctx.beginPath();
  // clip to ellipse spans then dither inside
  for (let dy = -ry; dy <= ry; dy++) {
    const k = dy / (ry + 0.5);
    const half = Math.floor((rx + 0.5) * Math.sqrt(Math.max(0, 1 - k * k)));
    ctx.rect(R(cx) - half, R(y) + dy, half * 2 + 1, 1);
  }
  ctx.clip();
  dither(ctx, R(cx) - rx, R(y) - ry, rx * 2 + 1, ry * 2 + 1, null, color, level);
  ctx.restore();
}

// ---------------------------------------------------------------- pixel fonts (in-world signage, screens, labels)
// Two bitmap fonts. Uppercase only (lowercase is mapped to uppercase). Variable width.
// 'tiny' = 3x5, 'small' = 5x7. Use pixelText(ctx, 'MURRAY ST', x, y, C.cream, { font: 'small' }).
const F35 = {
  A: '.#.|#.#|###|#.#|#.#', B: '##.|#.#|##.|#.#|##.', C: '.##|#..|#..|#..|.##', D: '##.|#.#|#.#|#.#|##.',
  E: '###|#..|##.|#..|###', F: '###|#..|##.|#..|#..', G: '.##|#..|#.#|#.#|.##', H: '#.#|#.#|###|#.#|#.#',
  I: '###|.#.|.#.|.#.|###', J: '..#|..#|..#|#.#|.#.', K: '#.#|#.#|##.|#.#|#.#', L: '#..|#..|#..|#..|###',
  M: '#.#|###|###|#.#|#.#', N: '##.|#.#|#.#|#.#|#.#', O: '.#.|#.#|#.#|#.#|.#.', P: '##.|#.#|##.|#..|#..',
  Q: '.#.|#.#|#.#|##.|.##', R: '##.|#.#|##.|#.#|#.#', S: '.##|#..|.#.|..#|##.', T: '###|.#.|.#.|.#.|.#.',
  U: '#.#|#.#|#.#|#.#|###', V: '#.#|#.#|#.#|#.#|.#.', W: '#.#|#.#|###|###|#.#', X: '#.#|#.#|.#.|#.#|#.#',
  Y: '#.#|#.#|.#.|.#.|.#.', Z: '###|..#|.#.|#..|###',
  0: '###|#.#|#.#|#.#|###', 1: '.#.|##.|.#.|.#.|###', 2: '##.|..#|.#.|#..|###', 3: '##.|..#|.#.|..#|##.',
  4: '#.#|#.#|###|..#|..#', 5: '###|#..|##.|..#|##.', 6: '.##|#..|###|#.#|###', 7: '###|..#|.#.|.#.|.#.',
  8: '###|#.#|###|#.#|###', 9: '###|#.#|###|..#|##.',
  '.': '.|.|.|.|#', ',': '..|..|..|.#|#.', ':': '.|#|.|#|.', ';': '..|.#|..|.#|#.', '-': '...|...|###|...|...',
  '+': '...|.#.|###|.#.|...', '/': '..#|..#|.#.|#..|#..', '!': '#|#|#|.|#', '?': '##.|..#|.#.|...|.#.',
  "'": '#|#|.|.|.', '"': '#.#|#.#|...|...|...', '(': '.#|#.|#.|#.|.#', ')': '#.|.#|.#|.#|#.',
  '[': '##|#.|#.|#.|##', ']': '##|.#|.#|.#|##', '{': '.##|.#.|#..|.#.|.##', '}': '##.|.#.|..#|.#.|##.',
  '<': '..#|.#.|#..|.#.|..#', '>': '#..|.#.|..#|.#.|#..', '=': '...|###|...|###|...', '_': '...|...|...|...|###',
  '#': '#.#|###|#.#|###|#.#', '%': '#.#|..#|.#.|#..|#.#', '*': '...|#.#|.#.|#.#|...', '&': '.#.|#.#|.#.|#.#|.##',
  '@': '###|#.#|###|#..|.##', '|': '#|#|#|#|#', '·': '.|.|#|.|.', '×': '...|#.#|.#.|#.#|...', ' ': '..|..|..|..|..',
};
const F57 = {
  A: '.###.|#...#|#...#|#####|#...#|#...#|#...#', B: '####.|#...#|#...#|####.|#...#|#...#|####.',
  C: '.###.|#...#|#....|#....|#....|#...#|.###.', D: '####.|#...#|#...#|#...#|#...#|#...#|####.',
  E: '#####|#....|#....|####.|#....|#....|#####', F: '#####|#....|#....|####.|#....|#....|#....',
  G: '.###.|#...#|#....|#.###|#...#|#...#|.####', H: '#...#|#...#|#...#|#####|#...#|#...#|#...#',
  I: '###|.#.|.#.|.#.|.#.|.#.|###', J: '..###|...#.|...#.|...#.|...#.|#..#.|.##..',
  K: '#...#|#..#.|#.#..|##...|#.#..|#..#.|#...#', L: '#....|#....|#....|#....|#....|#....|#####',
  M: '#...#|##.##|#.#.#|#.#.#|#...#|#...#|#...#', N: '#...#|#...#|##..#|#.#.#|#..##|#...#|#...#',
  O: '.###.|#...#|#...#|#...#|#...#|#...#|.###.', P: '####.|#...#|#...#|####.|#....|#....|#....',
  Q: '.###.|#...#|#...#|#...#|#.#.#|#..#.|.##.#', R: '####.|#...#|#...#|####.|#.#..|#..#.|#...#',
  S: '.####|#....|#....|.###.|....#|....#|####.', T: '#####|..#..|..#..|..#..|..#..|..#..|..#..',
  U: '#...#|#...#|#...#|#...#|#...#|#...#|.###.', V: '#...#|#...#|#...#|#...#|#...#|.#.#.|..#..',
  W: '#...#|#...#|#...#|#.#.#|#.#.#|#.#.#|.#.#.', X: '#...#|#...#|.#.#.|..#..|.#.#.|#...#|#...#',
  Y: '#...#|#...#|.#.#.|..#..|..#..|..#..|..#..', Z: '#####|....#|...#.|..#..|.#...|#....|#####',
  0: '.###.|#...#|#..##|#.#.#|##..#|#...#|.###.', 1: '..#..|.##..|..#..|..#..|..#..|..#..|.###.',
  2: '.###.|#...#|....#|...#.|..#..|.#...|#####', 3: '#####|...#.|..#..|...#.|....#|#...#|.###.',
  4: '...#.|..##.|.#.#.|#..#.|#####|...#.|...#.', 5: '#####|#....|####.|....#|....#|#...#|.###.',
  6: '..##.|.#...|#....|####.|#...#|#...#|.###.', 7: '#####|....#|...#.|..#..|.#...|.#...|.#...',
  8: '.###.|#...#|#...#|.###.|#...#|#...#|.###.', 9: '.###.|#...#|#...#|.####|....#|...#.|.##..',
  '.': '..|..|..|..|..|##|##', ',': '..|..|..|..|.#|.#|#.', ':': '..|##|##|..|##|##|..', ';': '..|.#|.#|..|.#|.#|#.',
  '-': '....|....|....|####|....|....|....', '+': '.....|..#..|..#..|#####|..#..|..#..|.....',
  '/': '....#|...#.|...#.|..#..|.#...|.#...|#....', '!': '#|#|#|#|#|.|#', '?': '.###.|#...#|....#|...#.|..#..|.....|..#..',
  "'": '#|#|.|.|.|.|.', '"': '#.#|#.#|...|...|...|...|...', '(': '..#|.#.|#..|#..|#..|.#.|..#', ')': '#..|.#.|..#|..#|..#|.#.|#..',
  '[': '###|#..|#..|#..|#..|#..|###', ']': '###|..#|..#|..#|..#|..#|###', '{': '..##|.#..|.#..|#...|.#..|.#..|..##',
  '}': '##..|..#.|..#.|...#|..#.|..#.|##..', '<': '...#|..#.|.#..|#...|.#..|..#.|...#', '>': '#...|.#..|..#.|...#|..#.|.#..|#...',
  '=': '....|....|####|....|####|....|....', '_': '.....|.....|.....|.....|.....|.....|#####',
  '#': '.#.#.|.#.#.|#####|.#.#.|#####|.#.#.|.#.#.', '%': '##...|##..#|...#.|..#..|.#...|#..##|...##',
  '*': '.....|#.#.#|.###.|#####|.###.|#.#.#|.....', '&': '.##..|#..#.|#.#..|.#...|#.#.#|#..#.|.##.#',
  '@': '.###.|#...#|#.###|#.#.#|#.###|#....|.###.', '|': '#|#|#|#|#|#|#', '·': '..|..|..|##|##|..|..',
  '×': '.....|.....|#...#|.#.#.|..#..|.#.#.|#...#', ' ': '...|...|...|...|...|...|...',
};
const ALIAS = { '•': '·', '–': '-', '—': '-', '’': "'", '‘': "'", '“': '"', '”': '"', '…': '.' };
function compileFont(src, h) {
  const out = {};
  for (const [ch, s] of Object.entries(src)) {
    const rows = s.split('|');
    out[ch] = { w: rows[0].length, h, rows };
  }
  return out;
}
export const FONTS = { tiny: compileFont(F35, 5), small: compileFont(F57, 7) };
const glyph = (font, ch) => {
  ch = ALIAS[ch] || ch;
  return font[ch] || font[ch.toUpperCase()] || font['?'];
};
/** Width in pixels of a string in a pixel font (before scale). */
export function pixelTextWidth(str, { font = 'small', spacing = 1, scale = 1 } = {}) {
  const f = FONTS[font];
  let w = 0;
  for (const ch of String(str)) w += glyph(f, ch).w + spacing;
  return Math.max(0, w - spacing) * scale;
}
/**
 * Draw pixel-font text on the pixel layer. opts: { font: 'tiny'|'small', scale, align: 'left'|'center'|'right',
 * spacing (px between glyphs), shadow: color (1px drop shadow down-right) }. Returns the drawn width.
 * Line height: tiny 5, small 7 (times scale). y is the TOP of the glyphs.
 */
export function pixelText(ctx, str, x, y, color, { font = 'small', scale = 1, align = 'left', spacing = 1, shadow: sh = null } = {}) {
  const f = FONTS[font];
  str = String(str);
  const w = pixelTextWidth(str, { font, spacing, scale });
  let cx = R(x) - (align === 'center' ? Math.floor(w / 2) : align === 'right' ? w : 0);
  const cy = R(y);
  const draw = (ox, oy, col) => {
    ctx.fillStyle = col;
    let gx = cx + ox;
    for (const ch of str) {
      const g = glyph(f, ch);
      for (let r = 0; r < g.h; r++) {
        const row = g.rows[r];
        let run = -1;
        for (let c = 0; c <= row.length; c++) {
          const on = row[c] === '#';
          if (on && run < 0) run = c;
          if (!on && run >= 0) { ctx.fillRect(gx + run * scale, cy + oy + r * scale, (c - run) * scale, scale); run = -1; }
        }
      }
      gx += (g.w + spacing) * scale;
    }
  };
  if (sh) draw(scale, scale, sh);
  draw(0, 0, color);
  return w;
}
