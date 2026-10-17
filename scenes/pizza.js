// scenes/pizza.js (owner F) C23, cue v2.8 "Mama Rosa's pizza for the midday fix!".
// Top-down on a coral gingham tablecloth: a kraft pizza box, steam leaking from its seams. MAMA ROSA'S stamps with the
// vocal; the lid flips open on the downbeat (PIZZA stamps with the reveal), steam bursts; from the next beat a slice
// pulls away with stretchy melted-cheese strings and its own steam. Plain-text restaurant name only (no logo).
import { C, RAMP } from '../lib/palette.js';
import { ease, clamp, tween, onTwos, hash } from '../lib/motion.js';
import { rect, px as dot, dither, pixelText } from '../lib/pixel.js';
import { sparkle } from '../lib/world.js';
import { clock, painter, steam, lbl, R } from './_F-kit.js';

const RF = RAMP.roof, ST = RAMP.stone, GL = RAMP.glow, AU = RAMP.autumn, F = RAMP.foliage;
const SLICE = { a0: (112.5 * Math.PI) / 180, a1: (157.5 * Math.PI) / 180 }; // wedge pulled toward the lower-left
const DIR = (135 * Math.PI) / 180;

const LAYOUT = {
  '16x9': { B: 112, x: 188, y: 54, open: 118, cloth: { x: 166, y: -2, w: 160, h: 186 }, pull: 30 },
  '9x16': { B: 136, x: 22, y: 140, open: 112, cloth: { x: -2, y: 104, w: 186, h: 220 }, pull: 30 },
};

// ---------------------------------------------------------------- art
function inWedge(a) {
  const aa = ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  return aa >= SLICE.a0 && aa < SLICE.a1;
}
/** Pizza (part = 'pie' without the slice, or 'slice' only), radius r, cached. */
function pizzaArt(r, part) {
  const S = r * 2 + 1;
  return painter(`pizza2|${r}|${part}`, S, S, (p) => {
    const c = r;
    const peps = [];
    for (let i = 0; i < 9; i++) {
      const a = i * 2.4 + 0.3, d = (0.3 + 0.5 * ((i * 0.618) % 1)) * (r - 9);
      peps.push([c + Math.cos(a) * d, c + Math.sin(a) * d]);
    }
    peps.push([c + Math.cos(2.36) * (r * 0.55), c + Math.sin(2.36) * (r * 0.55)]); // one sits on the slice
    const pr = Math.max(3, Math.round(r * 0.09));
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const dx = x - c, dy = y - c, d = Math.hypot(dx, dy);
      if (d > r + 0.4) continue;
      const a = Math.atan2(dy, dx);
      const w = inWedge(a) && d > 0.5;
      if ((part === 'slice') !== w) continue;
      let col;
      const lit = dx + dy < 0;
      if (d > r - 0.9) col = lit ? AU[2] : RAMP.hair[3];
      else if (d > r - 4) col = d > r - 2.2 ? (lit ? AU[4] : AU[2]) : lit ? GL[3] : AU[4];
      else if (d > r - 5) col = RF[2];
      else {
        // melted cheese: smooth low-frequency pools (deeper gold) + a few glossy highlight patches
        const v = Math.sin(x * 0.42 + Math.sin(y * 0.31) * 1.7) + Math.sin(y * 0.37 - x * 0.18 + 1.3) + Math.sin((x + y) * 0.21 + 2.1);
        col = v > 1.35 ? GL[2] : v < -1.75 ? GL[4] : GL[3];
        if (v > 2.25) col = AU[4];
        for (const [qx, qy] of peps) {
          const e = Math.hypot(x - qx, y - qy);
          if (e <= pr + 0.3) { col = e > pr - 0.8 && x - qx + y - qy > 0 ? RF[1] : RF[2]; if (Math.abs(x - qx + 1) < 0.6 && Math.abs(y - qy + 1) < 0.6) col = RF[4]; }
        }
      }
      p.put(x, y, col);
    }
    // basil leaves
    for (let i = 0; i < 6; i++) {
      const a = i * 1.7 + 1.1, d = (0.3 + 0.5 * ((i * 0.37) % 1)) * (r - 8);
      const bx = R(c + Math.cos(a) * d), by = R(c + Math.sin(a) * d);
      const wedge = inWedge(Math.atan2(by - c, bx - c));
      if ((part === 'slice') !== wedge) continue;
      p.put(bx, by, F[5]); p.put(bx + 1, by, F[4]); p.put(bx, by + 1, F[4]);
    }
    // cut lines (8 radial)
    for (let k = 0; k < 8; k++) {
      const a = (k * 45 + 22.5) * (Math.PI / 180);
      for (let s = 2; s < r - 4; s++) {
        const x = R(c + Math.cos(a) * s), y = R(c + Math.sin(a) * s);
        const wedge = inWedge(Math.atan2(y - c, x - c));
        if ((part === 'slice') !== wedge && part === 'slice') continue;
        if (part === 'pie' && wedge) continue;
        p.put(x, y, GL[1]);
      }
    }
  });
}
/** Box interior (floor + walls) of size B with the pizza-hole grease shadow. */
function boxArt(B) {
  return painter('pbox|' + B, B, B, (p) => {
    p.rect(0, 0, B, B, ST[4]);
    p.rect(3, 3, B - 6, B - 6, ST[5]);
    p.rect(0, 0, B, 1, ST[6]); p.rect(0, 0, 1, B, ST[6]);
    p.rect(0, B - 1, B, 1, ST[3]); p.rect(B - 1, 0, 1, B, ST[3]);
    dither(p.ctx, 3, 3, B - 6, 2, null, ST[3], 0.5);           // inner shadow under the hinge wall
    dither(p.ctx, 3, 3, 2, B - 6, null, ST[3], 0.5);
    for (let i = 0; i < 10; i++) {                              // grease spots
      const x = 8 + R(hash(i, 1, 3) * (B - 16)), y = 8 + R(hash(i, 2, 3) * (B - 16));
      dither(p.ctx, x, y, 3 + (i % 3), 2 + (i % 2), null, ST[4], 0.5);
    }
  });
}
/** Lid outside (closed): kraft with a coral border stripe and a PIZZA roundel. */
function lidOutside(B) {
  return painter('plid-out2|' + B, B, B, (p) => {
    p.rect(0, 0, B, B, ST[5]);
    p.rect(0, 0, B, 1, ST[6]); p.rect(0, 0, 1, B, ST[6]);
    p.rect(0, B - 2, B, 2, ST[3]); p.rect(B - 1, 0, 1, B, ST[3]);
    p.rect(6, 6, B - 12, 2, RF[3]); p.rect(6, B - 9, B - 12, 2, RF[3]);
    p.rect(6, 6, 2, B - 13, RF[3]); p.rect(B - 8, 6, 2, B - 13, RF[3]);
    const cx = B / 2, cy = B / 2, rr = B * 0.27;
    for (let y = 0; y < B; y++) for (let x = 0; x < B; x++) {
      const d = Math.hypot(x - cx + 0.5, y - cy + 0.5);
      if (d <= rr) p.put(x, y, d > rr - 2 ? RF[2] : RF[3]);
    }
    pixelText(p.ctx, 'PIZZA', R(cx), R(cy - 3), C.cream, { font: 'small', align: 'center' });
    // a tiny slice icon above the word
    for (let j = 0; j < 7; j++) for (let i = -3 + Math.floor(j / 2); i <= 3 - Math.floor(j / 2); i++) p.put(R(cx) + i, R(cy) - 14 + j, j === 0 ? GL[1] : GL[3]);
    p.put(R(cx) - 1, R(cy) - 12, RF[2]); p.put(R(cx) + 1, R(cy) - 11, RF[2]);
  });
}
/** Lid inside (open): paler kraft, a fold crease and grease marks. */
function lidInside(B) {
  return painter('plid-in2|' + B, B, B, (p) => {
    p.rect(0, 0, B, B, ST[6]);
    p.rect(0, 0, B, 2, ST[4]);
    p.rect(0, 0, 1, B, ST[5]); p.rect(B - 1, 0, 1, B, ST[4]);
    p.rect(0, B - 1, B, 1, ST[3]);
    for (let i = 0; i < 5; i++) {
      const gx = 14 + R(hash(i, 4, 5) * (B - 30)), gy = R(B * 0.35 + hash(i, 5, 5) * B * 0.45), rr = 3 + (i % 3);
      for (let y = -rr; y <= rr; y++) for (let x = -rr - 1; x <= rr + 1; x++) {
        const d = Math.hypot(x / 1.3, y);
        if (d <= rr) dither(p.ctx, gx + x, gy + y, 1, 1, null, d < rr * 0.5 ? ST[4] : ST[5], 0.5);
      }
    }
    p.rect(4, R(B * 0.18), B - 8, 1, ST[5]);
  });
}
function gingham(px, { x, y, w, h }) {
  const sz = 10;
  rect(px, x, y, w, h, RAMP.tower[3]);
  for (let yy = y; yy < y + h; yy += sz) for (let xx = x; xx < x + w; xx += sz) {
    const cx = Math.floor((xx - x) / sz), cy = Math.floor((yy - y) / sz);
    const a = cx % 2 === 0, b = cy % 2 === 0;
    if (a && b) rect(px, xx, yy, sz, sz, RF[3]);
    else if (a || b) dither(px, xx, yy, sz, sz, RAMP.tower[3], RF[3], 0.5);
  }
  // hem: a darker coral line along the inner edge
  if (x > 0) { rect(px, x, y, 1, h, RF[1]); dither(px, x - 2, y, 2, h, null, C.tealDeep, 0.5); }
  if (y > 0) { rect(px, x, y, w, 1, RF[1]); dither(px, x, y - 2, w, 2, null, C.tealDeep, 0.5); }
}

export default {
  id: 'pizza',
  draw(g, t, c) {
    const { px, hi } = g;
    const k = clock(c, 'v2.8');
    const L = LAYOUT[c.fmt] || LAYOUT['16x9'];
    const B = L.B, X = L.x, Y = L.y;
    const r = Math.floor(B / 2) - 7;
    const pcx = X + Math.floor(B / 2), pcy = Y + Math.floor(B / 2);
    const tq = onTwos(t);
    const tOpen = k.b0;                  // reveal on the downbeat
    const tPull0 = k.beat(1), tPull1 = k.beat(2.4);

    gingham(px, L.cloth);
    // box drop shadow on the cloth
    dither(px, X + 3, Y + 3, B, B, null, RF[0], 0.5);

    // lid angle (degrees), on twos: closed -> overshoot -> settle
    const ot = onTwos(t - (tOpen - 0.1));
    let ang = 0;
    if (t >= tOpen - 0.1) ang = ot < 0.2 ? (L.open + 10) * ease.outCubic(clamp(ot / 0.2)) : L.open + 10 - 10 * ease.outQuad(clamp((ot - 0.2) / 0.15));
    const cosA = Math.cos((ang * Math.PI) / 180);
    // closed-box hop on the pickup (anticipation)
    const hop = t < tOpen - 0.1 && t >= k.beat(-0.5) && t < k.beat(-0.5) + 0.07 ? 1 : 0;

    if (ang <= 0) {
      px.drawImage(lidOutside(B), X, Y - hop);
      // steam leaking out of the closed lid's seams
      for (let i = 0; i < 3; i++) steam(px, X + 20 + i * (B / 3), Y + 8, t + i * 0.3, { h: 20, amp: 1, seed: i + 2, w: 2, col: RAMP.cloud[2], col2: RAMP.cloud[1] });
    } else {
      px.drawImage(boxArt(B), X, Y);
      // pizza without the slice, then the hole's grease + cheese strings, then the slice on top
      const pie = pizzaArt(r, 'pie');
      px.drawImage(pie, pcx - r, pcy - r);
      const pk = ease.inOutCubic(clamp((t - tPull0) / Math.max(0.1, tPull1 - tPull0)));
      const dist = L.pull * pk + (t > tPull1 ? Math.sin(tq * 9) * 0.6 : 0);
      const ox = R(Math.cos(DIR) * dist), oy = R(Math.sin(DIR) * dist);
      const lift = pk > 0 ? Math.min(3, 1 + R(pk * 3)) : 0;
      // cheese strings: from points on the hole's edges to the matching points on the slice's edges
      if (pk > 0) {
        const strings = [[SLICE.a0, 0.35], [SLICE.a0, 0.72], [SLICE.a1, 0.45], [SLICE.a1, 0.8], [(SLICE.a0 + SLICE.a1) / 2, 0.05]];
        strings.forEach(([a, f], si) => {
          const ax = pcx + Math.cos(a) * r * f, ay = pcy + Math.sin(a) * r * f;
          const bx = ax + ox, by = ay + oy - lift;
          const n = Math.max(2, R(Math.hypot(bx - ax, by - ay)));
          const broken = dist > 22 && si % 2 === 1;
          for (let j = 0; j <= n; j++) {
            const u = j / n;
            if (broken && u > 0.38 && u < 0.62) continue;
            const thin = Math.abs(u - 0.5) < 0.3 && dist > 14;
            if (thin && j % 2 && dist > 24) continue;
            const wob = Math.sin(u * Math.PI) * (1.5 + Math.sin(tq * 10 + si) * 1.2);
            const sx = R(ax + (bx - ax) * u + Math.cos(DIR + Math.PI / 2) * wob), sy = R(ay + (by - ay) * u + Math.sin(DIR + Math.PI / 2) * wob);
            dot(px, sx, sy, u < 0.12 || u > 0.88 ? GL[3] : GL[4]);
            dot(px, sx, sy + 1, GL[2]);
            if (!thin) { dot(px, sx + 1, sy, GL[3]); dot(px, sx + 1, sy + 1, GL[2]); }
          }
        });
      }
      const slice = pizzaArt(r, 'slice');
      if (lift) {
        // dithered drop shadow of the lifted slice (silhouette approximated by its bounding wedge)
        px.save();
        px.globalCompositeOperation = 'source-over';
        const sh = sliceShadow(r);
        px.drawImage(sh, pcx - r + ox + lift + 1, pcy - r + oy + lift + 1);
        px.restore();
      }
      px.drawImage(slice, pcx - r + ox, pcy - r + oy - lift);
      // the open lid: outside face squashing toward the hinge (< 90deg), then the inside face standing up behind it
      if (cosA > 0.02) {
        const h = Math.max(1, R(B * cosA));
        px.drawImage(lidOutside(B), 0, 0, B, B, X, Y, B, h);
        rect(px, X, Y + h - 1, B, 1, ST[3]);
      } else if (cosA < -0.02) {
        const h = Math.max(1, R(B * -cosA));
        px.drawImage(lidInside(B), 0, 0, B, B, X, Y - h, B, h);
        rect(px, X, Y - h, B, 1, ST[4]);
        rect(px, X, Y - 1, B, 1, ST[3]);
      } else rect(px, X, Y - 1, B, 2, ST[3]);
      // steam: a burst on the reveal, then lazy wisps (and the slice's own)
      const since = t - tOpen;
      const n = 4;
      for (let i = 0; i < n; i++) {
        const sxp = pcx - r * 0.6 + (i * r * 1.2) / (n - 1);
        steam(px, R(sxp), pcy - 6 + (i % 2) * 8, t + i * 0.27, { h: since < 0.4 ? 34 : 24, amp: 2, seed: i + 5, speed: since < 0.4 ? 30 : 16, w: 2 });
      }
      if (pk > 0.3) steam(px, pcx - R(r * 0.45) + ox, pcy + R(r * 0.4) + oy - lift, t, { h: 20, amp: 1, seed: 9, w: 2 });
      if (since >= 0) sparkle(px, pcx + R(r * 0.5), pcy - R(r * 0.55), t, tOpen + 0.05, { size: 2, dur: 0.32 });
      if (t >= tPull1) sparkle(px, pcx - R(r * 0.7) + ox, pcy + R(r * 0.2) + oy, t, tPull1 + 0.02, { size: 2, dur: 0.32 });
    }

    // ---- labels: MAMA ROSA'S with the vocal, PIZZA on the reveal
    const s = c.safe;
    const name = ((c.facts.food && c.facts.food.restaurant) || "Mama Rosa's").toUpperCase();
    if (c.fmt === '9x16') {
      lbl(hi, t, k.start, name, s.x0, 360, { role: 'display', size: 118, color: C.cream, keepCase: true });
      lbl(hi, t, tOpen, 'PIZZA', s.x0, 500, { role: 'display', size: 150, color: C.sky });
    } else {
      lbl(hi, t, k.start, name, s.x0 + 6, 468, { role: 'display', size: 124, color: C.cream, keepCase: true });
      lbl(hi, t, tOpen, 'PIZZA', s.x0 + 6, 650, { role: 'display', size: 188, color: C.sky });
    }
  },
};

/** Shadow silhouette for the lifted slice (dithered dark coral on the cloth / box). */
function sliceShadow(r) {
  const src = pizzaArt(r, 'slice');
  return painter('pslice-sh|' + r, src.width, src.height, (p) => {
    p.ctx.drawImage(src, 0, 0);
    p.ctx.globalCompositeOperation = 'source-in';
    dither(p.ctx, 0, 0, src.width, src.height, null, RAMP.stone[2], 0.5);
    p.ctx.globalCompositeOperation = 'source-over';
  });
}
