// scenes/coffee-bagels.js (owner C) - C08, cue v1.5 "Coffee and bagels when the morning's new".
// Warm morning light slants across the hack-table counter. A big cream-and-coral 757 mug lands on the downbeat with
// steam curling up; three everything-bagels stack onto a sky-blue plate on the next beats. Label: COFFEE / + BAGELS.
import { C, RAMP } from '../lib/palette.js';
import { clamp, hash } from '../lib/motion.js';
import { makeCanvas, rect, px, ellipse, pixelText } from '../lib/pixel.js';
import { plus } from '../lib/text.js';
import { sparkle } from '../lib/world.js';
import { clock, label, capH, shafts, motes, counter, contact, steam, dropY, squashFrames, R } from './_C-kit.js';

// ---------------------------------------------------------------- art: mug (procedural, cached per size)
const mugCache = new Map();
/** Cream mug with coral bands + "757" print, coffee inside, handle on the right. Returns {canvas, w, h, ry, cx, hw}. */
function mugArt(w, h) {
  const key = w + 'x' + h;
  if (mugCache.has(key)) return mugCache.get(key);
  const ry = Math.max(3, R(w * 0.13));
  const hw = R(h * 0.26) + 2;
  const W = w + hw + 1, H = h + ry * 2 + 2;
  const { canvas, ctx } = makeCanvas(W, H);
  const cx = (w - 1) / 2, rx = (w - 1) / 2;
  const curve = (x) => { const u = (x - cx) / (rx + 0.5); return Math.sqrt(Math.max(0, 1 - u * u)); };
  const T = RAMP.tower;
  // handle (behind the body): thick D ring, lit on its upper part
  const hcx = w - 3, hcy = ry + R(h * 0.46), hro = hw + 1, hryo = R(h * 0.3), th = Math.max(3, R(hw * 0.42));
  for (let y = hcy - hryo; y <= hcy + hryo; y++) for (let x = w - 4; x <= w + hw; x++) {
    const uo = (x - hcx) / hro, vo = (y - hcy) / hryo;
    const ui = (x - hcx) / (hro - th), vi = (y - hcy) / (hryo - th);
    if (uo * uo + vo * vo > 1 || ui * ui + vi * vi < 1) continue;
    const edge = uo * uo + vo * vo > 0.8;
    ctx.fillStyle = y < hcy - 1 ? (edge ? T[1] : T[2]) : edge ? T[0] : T[1];
    ctx.fillRect(x, y, 1, 1);
  }
  // body columns with cylinder shading (light from upper-left)
  const tone = (u) => (u < 0.06 ? T[2] : u < 0.14 ? T[3] : u < 0.3 ? T[4] : u < 0.58 ? T[3] : u < 0.8 ? T[2] : u < 0.94 ? T[1] : T[0]);
  for (let x = 0; x < w; x++) {
    const u = (x + 0.5) / w;
    const yb = ry + h - 1 + R(ry * 0.8 * curve(x));
    ctx.fillStyle = tone(u);
    ctx.fillRect(x, ry, 1, yb - ry + 1);
    ctx.fillStyle = u < 0.3 ? T[2] : T[0];
    ctx.fillRect(x, yb, 1, 1); // foot line
    // coral bands following the cylinder curve
    const RF = RAMP.roof;
    const band = u < 0.06 ? RF[2] : u < 0.3 ? RF[4] : u < 0.58 ? RF[3] : u < 0.8 ? RF[2] : RF[1];
    const yr = ry + R(ry * curve(x));
    ctx.fillStyle = band;
    ctx.fillRect(x, yr + 3, 1, 2);
    ctx.fillRect(x, yb - 4, 1, 1);
  }
  // rim: lip ring, inner wall, coffee with crema + glint
  ellipse(ctx, cx, ry, rx, ry, T[3]);
  for (let x = 0; x < w; x++) { const yr = ry + R(ry * curve(x)); ctx.fillStyle = T[4]; ctx.fillRect(x, yr, 1, 1); }
  ellipse(ctx, cx, ry, rx - 2, ry - 1, T[1]);
  ellipse(ctx, cx, ry + 1, rx - 3, ry - 2, RAMP.hair[2]);
  ellipse(ctx, cx, ry + 1, rx - 3, 0, RAMP.hair[1]);           // back edge in the wall's shadow
  ellipse(ctx, cx - R(rx * 0.35), ry + 1, R(rx * 0.25), 0, RAMP.hair[3]); // crema highlight
  px(ctx, R(cx - rx * 0.5), ry + 1, RAMP.glow[4]);
  // highlight streak + 757 print
  const hx = R(w * 0.2);
  rect(ctx, hx, ry + R(ry * curve(hx)) + 7, 2, R(h * 0.45), C.cream);
  pixelText(ctx, '757', R(cx) + 1, ry + R(ry) + R(h * 0.36), C.coral, { font: 'small', align: 'center' });
  const out = { canvas, w, h, ry, cx, hw, W, H };
  mugCache.set(key, out);
  return out;
}

// ---------------------------------------------------------------- art: bagel (per-pixel torus shading, cached)
const bagelCache = new Map();
/** Everything bagel (kind 'whole') or a halved bagel with a cream-cheese schmear (kind 'half'). */
function bagelArt(rx, ry, th, seed, kind = 'whole') {
  const key = [rx, ry, th, seed, kind].join('x');
  if (bagelCache.has(key)) return bagelCache.get(key);
  const W = rx * 2 + 1, H = ry * 2 + 1 + th;
  const { canvas, ctx } = makeCanvas(W, H);
  const cx = rx, cy = ry, rh = 0.3, rm = (1 + rh) / 2, hwid = (1 - rh) / 2;
  const L = [-0.5, -0.62, 0.6];
  const ln = Math.hypot(...L);
  const A = RAMP.autumn, T = RAMP.tower;
  const inE = (x, y, ox, oy, sx, sy) => { const u = (x - ox) / (sx + 0.5), v = (y - oy) / (sy + 0.5); return u * u + v * v <= 1; };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const u = (x - cx) / (rx + 0.5), v = (y - cy) / (ry + 0.5), r = Math.hypot(u, v);
    let col = null;
    if (r <= 1 && r >= rh) {
      if (kind === 'half' && r < 0.84) {
        // cream cheese: lit upper-left, shaded lower-right, a soft swirl
        const d = -u * 0.7 - v * 0.7;
        col = d > 0.28 ? T[4] : d > -0.25 ? T[3] : T[2];
        if (Math.abs(r - 0.6) < 0.05 && u > -0.2) col = T[2];
      } else {
        const s = clamp((r - rm) / hwid, -1, 1);
        const n = [(s * u) / (r || 1), (s * v) / (r || 1), Math.sqrt(1 - s * s)];
        const I = (n[0] * L[0] + n[1] * L[1] + n[2] * L[2]) / ln;
        col = I > 0.94 ? RAMP.glow[3] : I > 0.72 ? A[4] : I > 0.45 ? A[2] : I > 0.12 ? A[1] : RAMP.roof[0];
        if (kind === 'half') col = r > 0.92 ? A[1] : A[2];
        const hs = hash(x, y, seed);
        if (kind === 'whole' && Math.abs(s) < 0.8 && hs < 0.09) col = T[4];
        else if (kind === 'whole' && Math.abs(s) < 0.8 && hs < 0.13) col = RAMP.ink[1];
      }
    } else if (r < rh) {
      col = inE(x, y, cx, cy + th, rh * rx, rh * ry) ? null : RAMP.roof[0];
    } else {
      for (let d = 1; d <= th; d++) if (inE(x, y, cx, cy + d, rx, ry)) { col = d >= th - 1 ? RAMP.roof[0] : kind === 'half' ? A[2] : A[1]; break; }
    }
    if (col) { ctx.fillStyle = col; ctx.fillRect(x, y, 1, 1); }
  }
  const out = { canvas, W, H, rx, ry, th };
  bagelCache.set(key, out);
  return out;
}

/** Sky-blue plate, centred at (cx, cy) = centre of its top surface. */
function plate(ctx, cx, cy, rx, ry) {
  contact(ctx, cx + 3, cy + ry, rx * 2 + 2, 4, 0.6);
  ellipse(ctx, cx, cy + 2, rx, ry, RAMP.water[2]);
  ellipse(ctx, cx, cy, rx, ry, RAMP.water[5]);
  ellipse(ctx, cx, cy + 1, rx - 4, ry - 2, RAMP.water[4]);
  ellipse(ctx, cx, cy, rx - 4, ry - 2, RAMP.water[3]);
  // rim glint (upper-left)
  for (let i = 0; i < 5; i++) px(ctx, R(cx - rx * 0.55) + i, R(cy - ry + 1 + (i > 2 ? 0 : 0)), C.cream);
}

// ---------------------------------------------------------------- layout
const GEO = {
  '16x9': { ct: 126, depth: 24, mug: { x: 258, w: 58, h: 64 }, plate: { x: 178, rx: 40, ry: 11 }, bagel: { rx: 18, ry: 9, th: 6 },
    steamH: 50, shaft: { x0: -40, slope: 0.72 }, spots: [[0, -8], [-17, 1], [16, 2]] },
  '9x16': { ct: 214, depth: 26, mug: { x: 122, w: 64, h: 72 }, plate: { x: 47, rx: 40, ry: 12 }, bagel: { rx: 18, ry: 9, th: 6 },
    steamH: 58, shaft: { x0: -70, slope: 0.62 }, spots: [[0, -8], [-17, 1], [16, 2]] },
};

export default {
  id: 'coffee-bagels',
  draw(g, t, c) {
    const { px: p, hi } = g;
    const G = GEO[c.fmt] || GEO['16x9'];
    const k = clock(c, 'v1.5');
    // beat plan: mug + COFFEE on the first beat, bagels stack on beat 2, 2.5, 3 (+ BAGELS on beat 2), gleam on beat 4
    const tMug = k.b0 <= 0.3 ? clamp(k.b0, 0.1, 0.3) : 0.12;
    const tB = [k.at(1, 0.5), k.at(1.5, 0.64), k.at(2, 0.78)];
    const tGleam = k.at(3, 0.9);

    // ---- light + counter
    const ct = G.ct;
    const SH = [[0, 26, 1], [8, 10, 2], [44, 14, 1], [64, 6, 1], [-60, 8, 1]];
    const inShaft = shafts(p, { x0: G.shaft.x0, slope: G.shaft.slope, top: 0, bottom: ct, list: SH });
    const cn = counter(p, ct, { depth: G.depth });
    shafts(p, { x0: G.shaft.x0 + G.shaft.slope * ct, slope: G.shaft.slope, top: ct + 1, bottom: ct + G.depth, list: [[0, 26, 1], [8, 10, 1], [44, 14, 1]] });
    motes(p, t, { x: 0, y: 0, w: c.fmt === '9x16' ? 160 : 230, h: ct - 2, n: 26, seed: 5, mask: inShaft });

    // ---- plate + three bagels dropping into a little pyramid (two everything bagels + a schmeared half)
    const pl = G.plate, B = G.bagel;
    const pcy = cn.floor - 5;
    if (t >= tB[0] - 0.16) {
      const [pw] = squashFrames(t, tB[0] - 0.03, 2);
      const py = pcy + dropY(t, tB[0] - 0.03, 56, 0.14);
      plate(p, pl.x, py, pl.rx + pw, pl.ry);
    }
    for (let i = 0; i < 3; i++) {
      const tl = tB[i];
      if (t < tl - 0.16) continue;
      const [dw, dh] = squashFrames(t, tl, 2);
      const kind = i === 2 ? 'half' : 'whole';
      const th = kind === 'half' ? B.th - 2 : B.th;
      const art = bagelArt(B.rx + dw, B.ry, Math.max(2, th + dh), 11 + i, kind);
      const [ox, oy] = G.spots[i];
      const baseY = pcy + oy + B.ry - 1;
      const y = baseY - art.H + 1 + dropY(t, tl, 56, 0.16);
      p.drawImage(art.canvas, R(pl.x + ox - art.rx), R(y));
      if (t >= tl && t < tl + 0.3) sparkle(p, pl.x + ox - B.rx + 5, baseY - B.ry * 2 - th + 2, t, tl, { size: 2, dur: 0.3 });
    }

    // ---- mug: drops in and lands on the beat (real squash frames)
    const M = G.mug;
    const [dw, dh] = squashFrames(t, tMug, 3);
    const mug = mugArt(M.w + dw, M.h + dh);
    const mBase = cn.floor + 3;
    const mx = M.x - R(mug.cx), my = mBase - mug.H + 1 + dropY(t, tMug, 80, 0.18);
    contact(p, M.x + 4, mBase - 1, M.w + 8, 6, 0.6);
    p.drawImage(mug.canvas, mx, my);
    // steam starts right after the landing and grows upward
    if (t >= tMug) {
      const show = clamp((t - tMug) / 0.4);
      const top = my + mug.ry;
      const H = G.steamH;
      steam(p, M.x - 12, top, t, { h: H - 6, amp: 4, seed: 2, show });
      steam(p, M.x - 1, top - 1, t + 0.4, { h: H + 6, amp: 5, seed: 7, show });
      steam(p, M.x + 11, top, t + 0.9, { h: H - 12, amp: 4, seed: 4, show });
    }
    sparkle(p, mx + R(mug.w * 0.2) + 1, my + mug.ry * 2 + 6, t, tGleam, { size: 3, dur: 0.4 });
    sparkle(p, mx + 4, my + mug.ry * 2 + 20, t, tMug + 0.05, { size: 2, dur: 0.3 });

    // ---- type: COFFEE (cream) on the mug beat, + BAGELS (sky) on the bagel beat
    const s = c.safe;
    const size = c.fmt === '9x16' ? 148 : 158;
    const cap = capH(hi, size);
    let x0, y1;
    if (c.fmt === '9x16') { x0 = s.x0; y1 = s.y0 + 60 + cap; }
    else { x0 = s.x0; y1 = R(540 - cap * 0.25); }
    const gap = R(cap * 0.42);
    label(hi, t, tMug, 'COFFEE', x0, y1, { size });
    const b2 = label(hi, t, tB[0], '+ BAGELS', x0, y1 + cap + gap, { size, color: C.sky });
    // key-art gold plus pops beside the steam once the plate is full, pulsing on the beat
    if (t >= tB[2]) plus(hi, (M.x + 34) * g.P, (my - G.steamH + 6) * g.P, { scale: Math.min(1, (t - tB[2]) * 8) * (0.75 + 0.35 * c.pulse(t)) });
  },
};
