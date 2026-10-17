// scenes/style-ref.js (Foundation): the animated key art. This is THE visual reference for every scene author:
// pixel world from lib/world.js under smooth key-art typography from lib/text.js, recomposed for 16:9 and 9:16.
// variant 1 = the key art (day). variant 2 = the same world at night (stars, moon, lantern beam, lit windows): the
// look for the bridge / final chorus / night scenes.
// Not in the timeline; render it with: node tools/stills.mjs --scene style-ref --fmt both --dur 8 --n 4 [--variant 2]
import { C } from '../lib/palette.js';
import { onTwos, tween, ease, snap, pulse, clamp } from '../lib/motion.js';
import { sky, water, headland, cloud, gull, stars, moon } from '../lib/world.js';
import { text, eyebrow, chip, titleLockup, infoBlock, corners, plus, panel, cond, fitSize, anim, typeText, capRatio } from '../lib/text.js';

const LOGO = 'assets/img/revolutionva-logo-cream.png';

export default {
  id: 'style-ref',
  assets: [LOGO],
  draw(g, t, c) {
    const v = c.fmt === '9x16';
    const L = v ? LAYOUT_V : LAYOUT_H;
    const beats = c.beats;
    const b = (i) => beats.find((x) => x >= -1e-6) + i * (beats[1] - beats[0]); // i-th beat from clip start
    drawWorld(g, t, c, L);
    drawType(g, t, c, L, b);
  },
};

// Pixel-world placement per format (low-res coords).
const LAYOUT_H = {
  lh: { x: 258, base: 124 }, water: { y: 131, x: 160, fadeW: 64 },
  clouds: [{ kind: 'big', x: 284, y: 47, v: 1.2 }, { kind: 'twoTone', x: 204, y: 74, v: 0.8 }],
  gulls: [{ x: 281, y: 66, p: 0 }, { x: 291, y: 78, p: 0.4 }, { x: 199, y: 91, p: 0.7 }],
};
const LAYOUT_V = {
  lh: { x: 118, base: 262, h: 118 }, water: { y: 270, x: 0, fadeW: 40 },
  clouds: [{ kind: 'big', x: 4, y: 168, v: 1.0 }, { kind: 'twoTone', x: 146, y: 150, v: 0.7 }, { kind: 'small', x: 148, y: 118, v: 0.5 }],
  gulls: [{ x: 52, y: 184, p: 0 }, { x: 63, y: 193, p: 0.4 }, { x: 160, y: 182, p: 0.7 }],
};

function drawWorld(g, t, c, L) {
  const { px, PW, PH } = g;
  const tq = onTwos(t);
  const night = c.variant === 2;
  const tod = night ? 'night' : 'day';
  sky(px, { tod, h: PH });
  if (night) {
    stars(px, t, { h: L.lh.base - 10, seed: 5 });
    moon(px, c.fmt === '9x16' ? 34 : 214, c.fmt === '9x16' ? 168 : 62, 7, { phase: 0.45, sky: '#153533' });
  }
  // water first, the headland's seawall sits on it. At night: glints under the lantern
  const lx = L.lh.x;
  water(px, t, { x: L.water.x, y: L.water.y, w: PW - L.water.x, h: PH - L.water.y, tod, fade: c.fmt === '9x16' ? 'none' : 'left', fadeW: L.water.fadeW, seed: 4,
    glints: night ? [{ x: lx, color: C.gold, w: 10 }] : [] });
  for (const cl of L.clouds) cloud(px, Math.round(cl.x + ((tq * cl.v) % 40)), cl.y, { kind: cl.kind, tod });
  const glow = 0.75 + 0.25 * c.pulse(t, 0.3);
  headland(px, L.lh.x, L.lh.base, { t, tod, glow: night ? 1 : glow, h: L.lh.h || 104, beam: night, beamLen: c.fmt === '9x16' ? 120 : 170 });
  for (const gl of L.gulls) {
    const dx = Math.round(Math.sin(tq * 0.6 + gl.p * 5) * 3), dy = Math.round(Math.sin(tq * 1.3 + gl.p * 7) * 1.5);
    gull(px, gl.x + dx, gl.y + dy, t, { phase: gl.p, rate: 2.2, tod });
  }
}

function drawType(g, t, c, L, b) {
  const { hi } = g;
  const v = c.fmt === '9x16';
  const F = c.facts;
  const s = c.safe;
  // corners + gold plus
  corners(hi, c.fmt, { show: tween(t, 0, 0.3), y: v ? 132 : undefined });
  const pl = c.pulse(t, 0.35);
  if (v) plus(hi, 984, 870, { scale: 0.8 + 0.4 * pl });
  else plus(hi, 1788, 192, { scale: 0.8 + 0.4 * pl });

  if (!v) {
    // ---------------- 16:9: key-art layout
    const x = 90;
    typeText(hi, t, b(0), F.eyebrow, 162, 126, { size: 31, tracking: 0.12, cursor: false, cps: 40 });
    anim(hi, t, { t0: b(1), x: 1032, y: 106, enter: 'slide-down', dist: 48 }, (h) => chip(h, F.chips.keyArt, 672, 106, { size: 30, minW: 720 }));
    const size = fitSize(hi, 'Hacktoberfest', 1282, { role: 'display', maxSize: 260 });
    titleLockup(hi, x, 166, { size, t, t0: b(0), stagger: b(1) - b(0) });
    infoBlock(hi, 60, 878, { size: 56, grow: tween(t, b(3), 0.3), lines: ['OCTOBER 17 • 10 AM—4 PM', '757 Makerspace · Hampton'] });
    anim(hi, t, { t0: b(4), x: 1704, y: 918, enter: 'pop' }, (h) => hostedPanel(h, c, 1512, 798, 384, 240));
  } else {
    // ---------------- 9:16: stacked recomposition
    typeText(hi, t, b(0), F.eyebrow, s.x0, 276, { size: 32, tracking: 0.14, cursor: false, cps: 40 });
    anim(hi, t, { t0: b(1), x: s.x0, y: 334, enter: 'slide-right', dist: 48 }, (h) => chip(h, F.chips.short, s.x0, 336, { size: 36 }));
    const size = fitSize(hi, 'Hacktoberfest', s.w, { role: 'display', maxSize: 200 });
    titleLockup(hi, s.x0 - 4, 400, { size, t, t0: b(0), stagger: b(1) - b(0) });
    infoBlock(hi, s.x0 - 4, 880, { size: 40, grow: tween(t, b(3), 0.3), lines: ['OCT 17 • 10 AM—4 PM', '757 Makerspace'] });
    anim(hi, t, { t0: b(4), x: 290, y: 1310, enter: 'pop' }, (h) => hostedPanel(h, c, 80, 1200, 420, 228));
  }
}

/** Key-art "Hosted by" panel: rounded teal-dark panel, sky outline, condensed caps + RevolutionVA bird + name (as on the key art). The sponsor (The AI Collective Hampton Roads) gets its own line elsewhere. */
function hostedPanel(h, c, x, y, w, ht) {
  panel(h, x, y, w, ht, { radius: 22, lineWidth: 6 });
  const pad = 34;
  text(h, 'HOSTED BY', x + pad, y + pad + 4, { role: 'cond', size: 36, weight: 800, baseline: 'cap-top' });
  const logo = c.img(LOGO);
  const lh = ht - pad * 2 - 54;
  const lw = (logo.width / logo.height) * lh;
  h.drawImage(logo, x + pad - 4, y + ht - pad - lh, lw, lh);
  const tx = x + pad + lw + 8;
  text(h, 'REVOLUTION VA', tx, y + ht - pad - lh * 0.55, { role: 'cond', size: 38, weight: 500, tracking: 0.02 });
}
