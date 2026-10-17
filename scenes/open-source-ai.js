// scenes/open-source-ai.js (owner C) - C10, cue v1.7 "Open-source AI is the mission this year".
// Match-cut from C09's laptop screen: a giant stair-stepped </> glows in the middle of the frame. On the downbeat the
// brackets slide open like doors, the slash cracks into light, and a friendly AI spark pops out under rotating
// light rays. Then "open weights" rain down from it into a shimmering download bar. Chip: OPEN WEIGHTS.
import { C, RAMP } from '../lib/palette.js';
import { clamp, hash, onTwos, frameIndex, ease, tween } from '../lib/motion.js';
import { makeCanvas, rect, px, hline, vline, poly } from '../lib/pixel.js';
import { chip, anim, plus } from '../lib/text.js';
import { sparkle, burst } from '../lib/world.js';
import { clock, aiSpark, lightDisc, capH, R } from './_C-kit.js';
import { makeCanvas as mk } from '../lib/pixel.js';

// ---------------------------------------------------------------- glyph art (stair-stepped, cached)
const glyphCache = new Map();
/**
 * Chunky chevron '<' or '>' (or '/' slash) of height h, arm reach w, stroke sw, with stair-stepped edges (step rows),
 * cream face, lit top edge, sky shaded edge and a 3px tealDeep extrusion (key-art hard shadow). Returns canvas info.
 */
function glyph(kind, h, w, sw, step = 2) {
  const key = [kind, h, w, sw, step].join('|');
  if (glyphCache.has(key)) return glyphCache.get(key);
  const ex = 3;
  const W = w + sw + ex + 2, H = h + ex + 1;
  const { canvas, ctx } = makeCanvas(W, H);
  const half = (h - 1) / 2;
  const span = (y) => {
    // left x of the stroke at row y (before mirroring)
    if (kind === '/') { const q = Math.floor(y / step) * step; return R((1 - q / (h - 1)) * w); }
    const d = Math.abs(y - half);
    const q = Math.floor(d / step) * step;
    return R((q / half) * w);
  };
  const face = [];
  for (let y = 0; y < h; y++) {
    let xl = span(y);
    if (kind === '>') xl = w - xl;
    face.push([xl, xl + sw - 1]);
  }
  // extrusion first
  face.forEach(([a, b], y) => rect(ctx, a + ex, y + ex, b - a + 1, 1, RAMP.ink[1]));
  face.forEach(([a, b], y) => rect(ctx, a + 1, y + 1, b - a + 1, 1, C.tealDeep));
  // face with edge shading: left/top edges lit, right/bottom edges sky
  const isFace = (x, y) => y >= 0 && y < h && x >= face[y][0] && x <= face[y][1];
  for (let y = 0; y < h; y++) {
    const [a, b] = face[y];
    for (let x = a; x <= b; x++) {
      let col = kind === '/' ? C.gold : C.cream;
      const up = !isFace(x, y - 1), dn = !isFace(x, y + 1), rt = !isFace(x + 1, y), lf = !isFace(x - 1, y);
      if (kind === '/') col = up || lf ? RAMP.glow[4] : dn || rt ? RAMP.autumn[4] : C.gold;
      else col = up || lf ? RAMP.tower[4] : dn || rt ? C.sky : C.cream;
      ctx.fillStyle = col;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  const out = { canvas, W, H, w, h, sw };
  glyphCache.set(key, out);
  return out;
}

/** Cream silhouette of a glyph canvas (flash frame), cached on the glyph. */
function flashOf(gl) {
  if (gl.flash) return gl.flash;
  const { canvas, ctx } = mk(gl.W, gl.H);
  ctx.drawImage(gl.canvas, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = C.cream;
  ctx.fillRect(0, 0, gl.W, gl.H);
  gl.flash = canvas;
  return canvas;
}

// ---------------------------------------------------------------- light
/** Rotating sunburst: n flat additive wedges around (cx, cy), radius r, on twos. */
function rays(ctx, cx, cy, r, t, { n = 10, k = 1, add = '#0F120C' } = {}) {
  if (k <= 0) return;
  const a0 = onTwos(t) * 0.35;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const a = a0 + (i / n) * Math.PI * 2, da = (Math.PI / n) * 0.42;
    const rr = r * k * (i % 2 ? 0.8 : 1);
    poly(ctx, [[cx, cy], [cx + Math.cos(a - da) * rr, cy + Math.sin(a - da) * rr], [cx + Math.cos(a + da) * rr, cy + Math.sin(a + da) * rr]], add);
  }
  ctx.restore();
}

// ---------------------------------------------------------------- layout
const GEO = {
  '16x9': { cx: 160, cy: 74, h: 86, w: 34, sw: 11, gap: 16, open: 74, bar: { y: 136, w: 84 } },
  '9x16': { cx: 90, cy: 134, h: 100, w: 30, sw: 10, gap: 14, open: 32, bar: { y: 206, w: 80 } },
};

export default {
  id: 'open-source-ai',
  draw(g, t, c) {
    const { px: p, hi } = g;
    const G = GEO[c.fmt] || GEO['16x9'];
    const k = clock(c, 'v1.7');
    // beat plan: closed </> stamps in at once; doors open on the first downbeat in the cue; weights + chip one beat later;
    // bar full one more beat later
    const tIn = 0;
    const tOpen = clamp(k.b0, 0.25, k.start + k.span * 0.32);
    const tRain = Math.max(tOpen + 0.3, k.at(1, 0.55));
    const tFull = Math.max(tRain + 0.3, k.at(2, 0.82));
    const { cx, cy } = G;


    // ---- light from inside the doors
    if (t >= tOpen) {
      const age = t - tOpen;
      const open = ease.outCubic(clamp(age / 0.22));
      rays(p, cx, cy, c.fmt === '9x16' ? 84 : 100, t, { n: 10, k: open, add: '#0C0E09' });
      rays(p, cx, cy, 46, t * -1.3, { n: 8, k: open, add: '#100F08' });
      // flash of light where the slash was (first frames): flat additive bursts, no gradients
      if (age < 0.16) { lightDisc(p, cx, cy, R(18 + age * 160), '#1C1A10'); lightDisc(p, cx, cy, R(10 + age * 80), '#262214'); }
    }

    // ---- open weights: shimmering cells rain from the spark into the download bar
    const bar = G.bar;
    const bx0 = cx - (bar.w >> 1), by = bar.y;
    if (t >= tRain) {
      const ra = t - tRain;
      const tq = onTwos(ra);
      const cols = 9;
      for (let i = 0; i < cols; i++) {
        const colX = cx - 26 + i * 6;
        for (let j = 0; j < 3; j++) {
          const sp = 70 + hash(i, j, 3) * 30;
          const y = cy + 24 + Math.floor(((tq * sp + hash(i, j, 9) * 40) % (by - cy - 28)) / 4) * 4;
          const tw = frameIndex(tq + i * 0.13 + j * 0.3, 15, 3);
          const col = [C.sky, C.cream, C.gold][(tw + i + j) % 3];
          rect(p, colX, R(y), 2, 2, col);
        }
      }
      // download bar: outline + striped fill that shimmers
      const fill = ease.outQuad(clamp((t - tRain) / Math.max(0.2, tFull - tRain)));
      rect(p, bx0 - 1, by - 1, bar.w + 2, 8, C.cream);
      rect(p, bx0, by, bar.w, 6, RAMP.iron[0]);
      const fw = R(bar.w * fill);
      for (let x = 0; x < fw; x++) {
        const stripe = ((x + Math.floor(onTwos(t) * 30)) >> 2) % 2;
        rect(p, bx0 + x, by, 1, 6, stripe ? C.sky : RAMP.water[5]);
      }
      if (fw > 2) { vline(p, bx0 + fw - 1, by, by + 5, C.cream); }
      // down arrow icon left of the bar
      const ax = bx0 - 10, ay = by - 2;
      rect(p, ax + 2, ay, 3, 5, C.gold); rect(p, ax, ay + 5, 7, 1, C.gold); rect(p, ax + 1, ay + 6, 5, 1, C.gold); rect(p, ax + 2, ay + 7, 3, 1, C.gold); px(p, ax + 3, ay + 8, C.gold);
      if (t >= tFull) {
        sparkle(p, bx0 + bar.w + 4, by + 2, t, tFull, { size: 3, dur: 0.4 });
        burst(p, bx0 + bar.w, by + 2, t - tFull, { n: 12, speed: 40, gravity: 40, seed: 5, life: 0.5, colors: [C.gold, C.cream, C.sky] });
      }
    }

    // ---- the spark: pops out of the light, bobs on the beat, orbiting mini sparks
    if (t >= tOpen + 0.06) {
      const age = t - tOpen - 0.06;
      const bob = -R(2 * c.pulse(t, 0.3)) + (frameIndex(t, 2, 2) ? 0 : 1);
      const seq = ['tiny', 'small', 'big'];
      const size = seq[Math.min(2, Math.floor(age * 15))];
      const yy = cy + (age < 0.2 ? R(8 - age * 40) : 0) + bob;
      const blink = frameIndex(t + 0.4, 1.6, 8) === 0;
      aiSpark(p, cx, yy, t, { size, glow: 1, blink, r: c.fmt === '9x16' ? 20 : 22 });
      if (size === 'big') {
        for (let i = 0; i < 3; i++) {
          const a = onTwos(t) * 3.2 + (i * Math.PI * 2) / 3;
          const ox = R(Math.cos(a) * 30), oy = R(Math.sin(a) * 9);
          if (oy < 0 && Math.abs(ox) < 12) continue; // passes behind the spark
          const col = [C.sky, C.coral, C.cream][i];
          rect(p, cx + ox - 1, yy + oy, 3, 1, col); rect(p, cx + ox, yy + oy - 1, 1, 3, col);
        }
      }
      if (age < 0.3) burst(p, cx, cy, age, { n: 18, speed: 70, gravity: 20, seed: 9, life: 0.4, colors: [C.cream, C.gold, RAMP.glow[4]] });
    }

    // ---- the doors: < and > slide apart on pixel steps (anticipation squeeze first), slash vanishes into the crack
    const open = t < tOpen ? 0 : ease.outBack(clamp((t - tOpen) / 0.22));
    const pre = t < tOpen && t > tOpen - 0.1 ? -2 : 0;      // tiny inward squeeze before the open
    // stamp-in on whole sprite steps (recognisable from frame 0): 0.7 -> 1.08 -> 1.04 -> 1
    const inK = [0.7, 0.7, 1.08, 1.08, 1.04][Math.min(4, Math.max(0, Math.floor((t - tIn) * 30)))] ?? 1;
    const hh = R(G.h * (t - tIn > 0.17 ? 1 : inK));
    const gL = glyph('<', hh, G.w, G.sw), gR = glyph('>', hh, G.w, G.sw);
    const off = G.gap + R(G.open * open) + pre;
    const pulseBump = R(c.pulse(t, 0.2) * 1.5);
    const yTop = cy - (hh >> 1);
    p.drawImage(gL.canvas, R(cx - off - gL.w - G.sw) - pulseBump, yTop);
    p.drawImage(gR.canvas, R(cx + off) + pulseBump, yTop);
    if (t < tOpen + 0.067) {
      // the slash; on the open it flashes cream for two frames, then it is gone (light takes its place)
      const gS = glyph('/', hh, R(G.w * 0.62), G.sw - 2, 2);
      const img = t < tOpen ? gS.canvas : flashOf(gS);
      p.drawImage(img, R(cx - gS.w / 2 - gS.sw / 2), yTop);
    }
    // sparkles on the bracket tips once open
    if (t >= tOpen) {
      sparkle(p, R(cx - off - gL.w - G.sw) + 1, yTop + 2, t, tOpen + 0.1, { size: 2, dur: 0.35 });
      sparkle(p, R(cx + off) + gR.w + G.sw - 2, yTop + hh - 3, t, tOpen + 0.16, { size: 2, dur: 0.35 });
    }

    // ---- type: chip lands with the rain (no corner stairs: they belong to the hook sections, verses stay clean)
    const s = c.safe;
    const size = c.fmt === '9x16' ? 58 : 58;
    const capC = capH(hi, size, 'cond', 700);
    const chipY = c.fmt === '9x16' ? (bar.y + 18) * g.P + capC : (bar.y + 16) * g.P + capC * 0.6;
    anim(hi, t, { t0: tRain, x: s.cx, y: chipY, enter: 'stamp' }, (h) => chip(h, 'OPEN WEIGHTS', s.cx, chipY, { size, align: 'center', padX: R(capC * 1.2), padY: R(capC * 0.6) }));
    if (t >= tFull) plus(hi, c.fmt === '9x16' ? 930 : 1700, c.fmt === '9x16' ? 520 : 210, { scale: Math.min(1, (t - tFull) * 8) * (0.75 + 0.35 * c.pulse(t)) });
  },
};
