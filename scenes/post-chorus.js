// scenes/post-chorus.js (owner H): the post-chorus ad-libs ("and you know it!", "Hampton!", "hey!"). No lyric to
// illustrate, so the picture carries it.
//  variant 1 (C16P, cue pc1, after chorus 1): DUSK over the bay by the lighthouse (carries on from C16's "glow").
//    Beach-town banner planes tow the partners across the sky FAR OUT over the bay (behind the headland, so they
//    never cover the lighthouse), one per half bar in a relay of two lanes (high lane flies left, low lane flies
//    right; each banner leaves as the next one lands, so at most two are on screen): HACKTOBERFEST, MLH, DEV,
//    DIGITALOCEAN, then the venue 757 MAKERSPACE, which flies solo, glides to the middle on the last bar and gets the
//    "PART OF HACKTOBERFEST 2026" eyebrow. Text wordmarks fly on coral (tealDark-on-coral, the key-art chip rule);
//    tinted logo strips use cream / sky fabric. Logos are drawn on g.hi in strips that ride the fabric's ripple.
//  variant 2 (C30P, cue pc2, after the final chorus): NIGHT waterfront dance party. Crowd silhouetted against the
//    bay under string lights, lighthouse beam sweeping on the beats, fireworks on beats/downbeats. On each bar a big
//    burst fades into the local crew: HOSTED BY RevolutionVA, SPONSORED BY The AI Collective Hampton Roads,
//    AT 757 MAKERSPACE (the AI Collective is the sponsor, never a host). Hands off to the end card's stair wipe.
import { C, RAMP, SKY } from '../lib/palette.js';
import { clamp, ease, tween, onTwos, hash, snap } from '../lib/motion.js';
import { rect, px, vline, sprite, drawSprite, bands } from '../lib/pixel.js';
import { sky, stars, water, headland, cloud, gull, sparkle, haloDisc, cached } from '../lib/world.js';
import { text, chip, anim, bars, flash, plus, corners } from '../lib/text.js';
import {
  R, clock, tinted, fit, wordmark, compose, ditherReveal, tow, towWidth, speedLines, PLANE,
  rocket, firework, stringLights, partygoer,
} from './_H-kit.js';

const LOGO = {
  mlh: 'assets/logos/mlh.png',
  dev: 'assets/logos/dev.png',
  mks: 'assets/logos/757-makerspace.png',
  rva: 'assets/logos/revolutionva.png',
  aic: 'assets/logos/ai-collective.png',
  aicV: 'assets/logos/ai-collective-vertical.png',
};

export default {
  id: 'post-chorus',
  assets: Object.values(LOGO),
  draw(g, t, c) {
    if (c.variant === 2) drawNight(g, t, c);
    else drawDay(g, t, c);
  },
};

// =====================================================================================================================
// variant 1: banner planes over the bay (day)
// =====================================================================================================================
const BANNERS = [
  { id: 'hacktoberfest', word: 'HACKTOBERFEST', fabric: 'coral', plane: 'gold' },
  { id: 'mlh', img: 'mlh', fabric: 'cream', plane: 'coral' },
  { id: 'dev', img: 'dev', fabric: 'sky', plane: 'cream' },
  { id: 'digitalocean', word: 'DIGITALOCEAN', fabric: 'coral', plane: 'sky' },
  { id: '757-makerspace', img: 'mks', name: '757 MAKERSPACE', fabric: 'coral', plane: 'gold' },
];
const DAY = {
  '16x9': {
    H: 30, padX: 9, rope: 16, clearX: 236, minLen: 56, word: 120, drift: 5, imgH: 128, badgeH: 140, badgeWord: 92,
    lanes: [{ top: 20, dir: -1, hc: 136 }, { top: 72, dir: 1, hc: 122 }], midTop: 46,
    lh: { x: 258, base: 124, h: 104 }, water: { x: 128, y: 131, fadeW: 70 }, boat: { x: 160, y: 142 }, plus: [1788, 192],
    clouds: [{ kind: 'big', x: 270, y: 50, v: 1.1 }, { kind: 'twoTone', x: 196, y: 108, v: 0.8 }, { kind: 'small', x: 22, y: 116, v: 0.6 }, { kind: 'wisp', x: 86, y: 6, v: 1.4 }],
    gulls: [{ x: 286, y: 70, p: 0 }, { x: 296, y: 82, p: 0.4 }, { x: 176, y: 124, p: 0.7 }],
  },
  '9x16': {
    H: 24, padX: 7, rope: 12, clearX: 178, minLen: 44, word: 84, drift: 3, imgH: 100, badgeH: 108, badgeWord: 70,
    lanes: [{ top: 52, dir: -1, hc: 90 }, { top: 116, dir: 1, hc: 90 }], midTop: 84,
    lh: { x: 122, base: 274, h: 112 }, water: { x: 0, y: 282, fadeW: 40 }, boat: { x: 22, y: 292 }, plus: [984, 846],
    clouds: [{ kind: 'big', x: 4, y: 176, v: 0.9 }, { kind: 'twoTone', x: 150, y: 160, v: 0.7 }, { kind: 'small', x: 120, y: 26, v: 0.5 }, { kind: 'wisp', x: 20, y: 30, v: 1.1 }],
    gulls: [{ x: 50, y: 200, p: 0 }, { x: 61, y: 209, p: 0.4 }, { x: 166, y: 196, p: 0.7 }],
  },
};

/** Banner content canvas (device px) for a partner, built once per format. */
function bannerContent(c, b, L) {
  const ink = C.tealDark;
  if (b.word) return wordmark(b.word, L.word, ink, { role: 'display', weight: 800, tracking: 0.01 });
  const img = c.img(LOGO[b.img]);
  if (b.img === 'mks') {
    // round badge (low-res source: keep <= ~220 px tall) + the venue name in condensed caps beside it
    const fb = fit(img, 9999, L.badgeH);
    const badge = { canvas: tinted(img, fb.w, fb.h, ink), w: fb.w, h: fb.h };
    const name = wordmark(b.name, L.badgeWord, ink, { role: 'cond', weight: 800, tracking: 0.01 });
    return compose(`mks-banner|${c.fmt}`, [badge, name], R(L.badgeWord * 0.22));
  }
  const fb = fit(img, 9999, b.img === 'dev' ? L.imgH * 1.02 : L.imgH);
  return { canvas: tinted(img, fb.w, fb.h, ink), w: fb.w, h: fb.h };
}

function drawDay(g, t, c) {
  const { px: p, hi, PW, PH } = g;
  const v = c.fmt === '9x16';
  const L = DAY[c.fmt];
  const { B, nB, spb } = clock(c);
  const tq = onTwos(t);

  // ---------------- schedule (beats): a new banner every half bar, alternating lanes; the venue closes the clip
  const s = clamp(Math.floor(((nB - 4.6) / 4) * 2) / 2, 1, 2);
  const land = BANNERS.map((_, i) => (i === 0 ? 0.5 : i * s));
  const finalBeat = Math.max(land[4] + 2, Math.min(12, nB - 2.2));
  const items = BANNERS.map((b, i) => {
    const lane = L.lanes[i % 2];
    const content = bannerContent(c, b, L);
    const len = Math.max(L.minLen, Math.ceil(content.w / 6) + L.padX * 2);
    const W = towWidth(len, L.rope);
    const tl = B(land[i]);
    const E = 1.0 * spb;                                         // entry (fast whoosh, eased out)
    // relay: each banner starts leaving as the next one (other lane) lands, so at most two are on screen at once;
    // the venue (last) stays to the end
    const te = i + 1 < BANNERS.length ? B(land[i + 1]) : Infinity;
    const X = 1.0 * spb;
    return { b, i, lane, content, len, W, tl, E, te, X, dir: lane.dir };
  });
  const drift = L.drift; // px/s while holding: they keep flying
  const pathX = (it, tt) => {
    const holdMid = it.te < Infinity ? (it.tl + it.te) / 2 : it.tl + 1.6;
    const hc = Math.min(it.lane.hc, L.clearX - it.W / 2 - drift * 1.4);   // keep holds clear of the lighthouse
    const xc = hc + it.dir * drift * (tt - holdMid);
    const nose0 = xc + it.dir * it.W / 2;                     // nose at the leading end of the group
    // entry: from fully off-screen behind, eased out; exit: off-screen ahead, eased in
    const back = it.dir > 0 ? nose0 + 4 : PW - nose0 + 4;
    const fwd = it.dir > 0 ? PW - (nose0 - it.W) + 4 : nose0 + it.W + 4;
    const kin = clamp((tt - (it.tl - it.E)) / it.E);
    const kout = clamp((tt - it.te) / it.X);
    return nose0 - it.dir * back * (1 - ease.outCubic(kin)) + it.dir * fwd * ease.inCubic(kout);
  };
  // same-lane followers never overlap their leader (they tuck in behind its trailing end)
  const noseAt = (it, tt) => {
    let x = pathX(it, tt);
    const lead = items[it.i - 2];
    if (lead) {
      const lx = pathX(lead, tt);
      const tailEnd = lx - lead.dir * (lead.W - 1);
      if (it.dir < 0) x = Math.max(x, tailEnd + 10); else x = Math.min(x, tailEnd - 10);
    }
    return x;
  };

  // ---------------- world (key-art layout at dusk: banded sunset sky, first stars, dusk water)
  bands(p, 0, 0, PW, L.water.y, SKY.dusk, { blend: 2, stops: [0, 0.3, 0.5, 0.66, 0.8, 0.9, 0.97] });
  stars(p, t, { h: R(L.water.y * 0.3), seed: 29, show: 0.45, big: 0.05 });
  for (const cl of L.clouds) cloud(p, R(cl.x + ((tq * cl.v * 1.6) % 48)) - 12, cl.y, { kind: cl.kind, tod: 'dusk' });
  // calm darker sea under the sunset; the key-art streak water (deeper evening ramp, like C16) fades into it
  rect(p, 0, L.water.y, PW, PH - L.water.y, C.tealDark);
  water(p, t, { x: L.water.x, y: L.water.y, w: PW - L.water.x, h: PH - L.water.y, tod: 'night', fade: v ? 'none' : 'left', fadeW: L.water.fadeW, seed: 4, glints: [{ x: L.lh.x, color: C.gold, w: 8 }, { x: R(PW * 0.42), color: '#F5A55A', w: 10 }] });
  const tf = B(finalBeat);

  // ---------------- banners: far out over the bay, BEHIND the headland (high lane = farther, drawn first)
  const geo = [];
  const order = [0, 2, 4, 1, 3];
  for (const i of order) {
    const it = items[i];
    if (t < it.tl - it.E - 0.05) continue;
    if (it.te < Infinity && t > it.te + it.X + 0.05) continue;
    const x = noseAt(it, t);
    const vx = (x - noseAt(it, t - 1 / 30)) * 30;
    // lane height: the venue drops to the middle on the final bar
    let top = it.lane.top;
    if (i === 4) top = R(top + (L.midTop - top) * tween(t, tf, spb * 1.5, ease.inOutCubic));
    const kin = clamp((t - (it.tl - it.E)) / it.E);
    const swoop = R(-7 * (1 - ease.outCubic(kin)));
    const bob = R(Math.sin(tq * 2.3 + i * 1.7) * 0.9);
    const y = top + 3 + swoop + bob;
    const gm = tow(g, t, { x, y, dir: it.dir, len: it.len, h: L.H, rope: L.rope, fabric: it.b.fabric, plane: it.b.plane, content: it.content, seed: i, amp: v ? 0.9 : 1 });
    speedLines(p, t, it.dir > 0 ? gm.x0 : gm.x1, [y - 5, top + 4, top + L.H - 4, y + 4], vx, i);
    geo[i] = gm;
  }
  // landing sparkles at the fabric corners + beat sparkles around the newest banner
  items.forEach((it, i) => {
    const gm = geo[i];
    if (!gm) return;
    const cs = [[gm.fabricX0 - 2, gm.top - 3], [gm.fabricX1 + 2, gm.top - 3], [gm.fabricX0 - 2, gm.bot + 2], [gm.fabricX1 + 2, gm.bot + 2]];
    cs.forEach(([sx, sy], j) => sparkle(p, sx, sy, t, it.tl + j * 0.05, { color: j % 2 ? C.cream : C.gold, size: 2, dur: 0.4 }));
  });
  // the venue's glide to the centre on the last bar gets a sparkle burst around its fabric
  const gv = geo[4];
  if (gv && t >= tf) {
    for (let k = 0; k < 6; k++) {
      const sx = gv.fabricX0 + R(((k + 0.5) / 6) * (gv.fabricX1 - gv.fabricX0));
      const sy = k % 2 ? gv.top - 4 : gv.bot + 3;
      sparkle(p, sx, sy, t, tf + k * 0.04, { color: k % 3 === 0 ? C.cream : k % 3 === 1 ? C.gold : C.sky, size: 2, dur: 0.45 });
    }
  }
  const bi = c.beat(t).index;
  if (bi >= 0) {
    const tb = c.beats[bi];
    let newest = -1;
    items.forEach((it, i) => { if (geo[i] && it.tl <= tb + 0.01) newest = i; });
    const gm = geo[newest];
    if (gm && Math.abs(tb - items[newest].tl) > 0.1) {
      for (let k = 0; k < 2; k++) {
        const sx = gm.fabricX0 + R(hash(bi, k, 5) * (gm.fabricX1 - gm.fabricX0));
        const sy = hash(bi, k, 6) < 0.5 ? gm.top - 4 - R(hash(bi, k, 7) * 4) : gm.bot + 3 + R(hash(bi, k, 7) * 4);
        sparkle(p, sx, sy, t, tb + k * 0.08, { color: k ? C.sky : C.gold, size: 2, dur: 0.35 });
      }
    }
  }

  // the banners' logo strips (hi layer) are cut out where the headland stands, then the headland is drawn over the
  // pixel banners: the planes pass behind the lighthouse instead of across it
  const sil = cached(`c16p-headland|${c.fmt}`, PW, PH, (ctx) => headland(ctx, L.lh.x, L.lh.base, { t: 0, tod: 'dusk', h: L.lh.h, glow: 0 }));
  hi.save();
  hi.globalCompositeOperation = 'destination-out';
  hi.imageSmoothingEnabled = false;
  hi.drawImage(sil, 0, 0, PW * 6, PH * 6);
  hi.restore();
  headland(p, L.lh.x, L.lh.base, { t, tod: 'dusk', h: L.lh.h, glow: 0.75 + 0.25 * c.pulse(t, 0.3) });
  // a little sailboat out on the bay, bobbing on the beat
  drawSprite(p, boatSprite(), R(L.boat.x + tq * 1.5), L.boat.y - (c.pulse(t, 0.2) > 0.5 ? 1 : 0), { anchor: 'bc' });
  for (const gl of L.gulls) {
    const dx = R(Math.sin(tq * 0.6 + gl.p * 5) * 3), dy = R(Math.sin(tq * 1.3 + gl.p * 7) * 1.5);
    gull(p, gl.x + dx, gl.y + dy, t, { phase: gl.p, rate: 2.2, tod: 'dusk', color: C.cream });
  }
  // a pair of gulls crosses on the last bar
  if (t > tf - 0.2) {
    const k = t - (tf - 0.2);
    for (let j = 0; j < 2; j++) gull(p, R(-8 + k * 38 - j * 9), (v ? 150 : 104) - j * 5 + R(Math.sin(k * 3 + j) * 2), t, { phase: j * 0.4, rate: 2.6, tod: 'dusk', color: C.cream });
  }

  // ---------------- type: key-art corners; one small eyebrow (||| style) once the venue flies solo, so there are
  // never more than two labels; the gold plus pulses on the beat
  corners(hi, c.fmt, { y: v ? 132 : undefined });
  plus(hi, L.plus[0], L.plus[1], { scale: 0.8 + 0.4 * c.pulse(t, 0.35) });
  const ey = 'PART OF HACKTOBERFEST 2026';
  const t0 = items[3].te + items[3].X;
  if (!v) {
    const sz = 34, x = 96, y = 948;
    const b = bars(hi, x, y - 6, 72, { grow: tween(t, t0 - 0.1, 0.3) });
    typeOn(hi, t, t0, ey, x + b.w + 24, y + 42, sz);
  } else {
    const sz = 32, x = 80, y = 1290;
    const b = bars(hi, x, y - 6, 96, { grow: tween(t, t0 - 0.1, 0.3) });
    typeOn(hi, t, t0, 'PART OF', x + b.w + 24, y + 30, sz);
    typeOn(hi, t, t0 + 0.2, 'HACKTOBERFEST 2026', x + b.w + 24, y + 84, sz);
  }
}

let boat = null;
function boatSprite() {
  return boat || (boat = sprite([
    '......m.....', '.....cmS....', '....ccmSS...', '...cccmSSS..', '..ccccmSSSS.', '.cccccmSSSSS', '......m.....',
    'rrrrrrrrrrrr', '.RRRRRRRRRR.',
  ], { m: RAMP.ink[1], c: '#E6D9C1', S: C.cream, r: C.coral, R: '#AD5E52' }));
}

/** Mono eyebrow typed on (no cursor), wide tracking like the key art. */
function typeOn(hi, t, t0, str, x, y, size) {
  if (t < t0) return;
  const n = Math.min(str.length, Math.floor((t - t0) * 40) + 1);
  text(hi, str.slice(0, n), x, y, { role: 'mono', size, tracking: 0.14, color: C.cream });
}

// =====================================================================================================================
// variant 2: night waterfront party, fireworks reveal the local crew
// =====================================================================================================================
const CREW = [
  { head: 'HOSTED BY', logo: 'rva', colors: [C.gold, '#B97469'], ring2: [C.cream, '#D1AC70'] },
  { head: 'SPONSORED BY', logo: 'aic', colors: [C.coral, '#8F4F47'], ring2: [C.gold, '#B97469'] },
  { head: 'AT 757 MAKERSPACE', logo: 'mks', colors: [C.sky, '#2B6A80'], ring2: [C.cream, '#3F8ABD'] },
];
const NIGHT = {
  '16x9': {
    waterY: 128, lh: { x: 258, base: 124, h: 104 }, beamLen: 170,
    burst: { x: 117, y: 56, r: 64 }, small: 27, flank: [[28, 44], [214, 40]],
    logoC: { x: 702, y: 366 }, chipY: 150, chipSize: 46, logoH: { rva: 340, aic: 300, mks: 212 }, logoW: 960,
    spots: [[30, 34], [214, 24], [206, 92], [24, 100], [300, 16], [176, 112], [62, 16], [292, 74]],
    rows: [{ base: 165, step: 9, ox: 0 }], mass: 164, fronts: [{ base: 181, step: 12, ox: 3 }],
    lights: { xs: [-2, 108, 216, 322], y: 137, sag: 6 },
    shore: { x0: 0, x1: 196, y: 127 },
  },
  '9x16': {
    waterY: 238, lh: { x: 144, base: 234, h: 80 }, beamLen: 120,
    burst: { x: 90, y: 104, r: 58 }, small: 22, flank: [[30, 40], [150, 46]],
    logoC: { x: 540, y: 640 }, chipY: 330, chipSize: 44, logoH: { rva: 400, aic: 420, mks: 212 }, logoW: 860,
    spots: [[28, 38], [150, 30], [26, 180], [154, 176], [92, 20], [58, 204], [132, 206], [20, 110]],
    rows: [{ base: 284, step: 9, ox: 0 }], mass: 283, fronts: [{ base: 300, step: 12, ox: 3 }, { base: 318, step: 13, ox: 9 }],
    lights: { xs: [-2, 90, 182], y: 256, sag: 7 },
    shore: { x0: 0, x1: 116, y: 237 },
  },
};

function crewContent(c, cr, L) {
  const key = `crew|${c.fmt}|${cr.logo}`;
  let img = c.img(LOGO[cr.logo]);
  if (cr.logo === 'aic' && c.fmt === '9x16') img = c.img(LOGO.aicV);
  const fb = fit(img, L.logoW, L.logoH[cr.logo]);
  const piece = { canvas: tinted(img, fb.w, fb.h, C.cream), w: fb.w, h: fb.h };
  return compose(key, [piece], 0, C.tealDeep); // key-art hard tealDeep drop shadow for legibility over the fireworks
}

function drawNight(g, t, c) {
  const { px: p, hi, PW, PH, W: DW, H: DH } = g;
  const v = c.fmt === '9x16';
  const L = NIGHT[c.fmt];
  const { B, nB, spb } = clock(c);
  const tq = onTwos(t);
  const bi = c.beat(t).index;
  const ph = c.beat(t).phase;

  // ---------------- schedule (beats): big reveal bursts on the bars, small bursts on the other beats, finale crackle
  const gap = Math.min(4, Math.max(1.5, Math.floor(((nB - 3) / 2) * 2) / 2));
  const big = [0, gap, gap * 2].map(B);
  const smallBeats = [];
  for (let b = 1; b < nB - 0.6; b += 1) if (!big.some((tb) => Math.abs(B(b) - tb) < 0.05)) smallBeats.push(b);
  // extra off-beat crackle in the last bar
  for (const b of [gap * 2 + 1.5, gap * 2 + 2.5, nB - 1.5]) if (b > gap * 2 && b < nB - 0.4) smallBeats.push(b);
  const PAL = [[C.gold, '#B97469'], [C.coral, '#8F4F47'], [C.sky, '#2B6A80'], [C.cream, '#827F6F']];
  const smalls = [];
  smallBeats.forEach((b, j) => {
    const sp = L.spots[j % L.spots.length];
    smalls.push({ t: B(b), x: sp[0], y: sp[1], cols: PAL[j % 4], seed: 40 + j, launch: spb * 0.5, r: L.small });
    if (j % 2 === 1) { // a partner burst across the sky, half a beat later
      const sq = L.spots[(j + 3) % L.spots.length];
      smalls.push({ t: B(b + 0.5), x: sq[0], y: sq[1] + 4, cols: PAL[(j + 2) % 4], seed: 140 + j, launch: spb * 0.5, r: R(L.small * 0.8) });
    }
  });
  // the finale downbeat: two flanking bursts with the last big one
  L.flank.forEach(([x, y], k) => smalls.push({ t: big[2], x, y, cols: PAL[k ? 1 : 0], seed: 90 + k, launch: spb * 0.75, r: R(L.small * 1.25) }));
  const curBig = big.reduce((a, tb, i) => (t >= tb - 1e-6 ? i : a), -1);
  const kBig = curBig >= 0 ? t - big[curBig] : Infinity;
  const recentCol = curBig >= 0 && kBig < 1.1 ? CREW[curBig].colors[0] : null;

  // ---------------- sky, stars, far shore, flash
  sky(p, { tod: 'night', h: L.waterY + 2 });
  stars(p, t, { h: L.waterY - 12, seed: 23, count: v ? 70 : 90 });
  if (kBig < 0.14) haloDisc(p, L.burst.x, L.burst.y, R(L.burst.r * (kBig < 0.07 ? 0.35 : 0.5)), RAMP.teal[5], kBig < 0.07 ? 0.4 : 0.2); // ignition glow
  // fireworks (behind the headland + crowd)
  big.forEach((tb, i) => {
    const cr = CREW[i];
    if (i > 0) rocket(p, L.burst.x - 18 + i * 14, L.waterY, L.burst.x, L.burst.y, t - (tb - spb), spb, i);
    firework(p, L.burst.x, L.burst.y, t - tb, { n: 44, r: L.burst.r, life: 1.7, colors: cr.colors, seed: 3 + i * 7, ring2: { colors: cr.ring2, r: L.burst.r * 0.5, n: 22 } });
  });
  for (const s of smalls) {
    rocket(p, s.x + 4, L.waterY, s.x, s.y, t - (s.t - s.launch), s.launch, s.seed);
    firework(p, s.x, s.y, t - s.t, { n: 26, r: s.r, life: 1.15, colors: s.cols, seed: s.seed, gravity: 12 });
  }
  // distant shore with a few lights (Hampton Roads across the water)
  for (let x = L.shore.x0; x < L.shore.x1; x++) {
    const hgt = 1 + (hash(x >> 2, 1, 5) < 0.3 ? 1 : 0) + (hash(x >> 3, 2, 5) < 0.12 ? 1 : 0);
    rect(p, x, L.shore.y - hgt, 1, hgt + 1, RAMP.teal[0]);
    if (hash(x, 3, 5) < 0.06) px(p, x, L.shore.y - hgt, hash(x, 4, 5) < 0.5 ? C.gold : '#F8CC87');
  }
  // water with firework reflections
  const glints = [{ x: L.lh.x, color: C.gold, w: 8 }];
  if (kBig < 1.2) glints.push({ x: L.burst.x, color: CREW[curBig].colors[0], w: 16 });
  for (const s of smalls) if (t - s.t >= 0 && t - s.t < 0.6) glints.push({ x: s.x, color: s.cols[0], w: 8 });
  water(p, t, { x: 0, y: L.waterY, w: PW, h: PH - L.waterY, tod: 'night', fade: 'none', seed: 6, glints });
  // the headland + lighthouse; the beam faces the camera on every downbeat and swings a quarter turn per beat
  const ang = Math.PI / 2 + (bi + ease.outCubic(clamp(ph * 1.6))) * (Math.PI / 4);
  headland(p, L.lh.x, L.lh.base, { t, tod: 'night', h: L.lh.h, glow: 1, beam: true, beamAngle: ang, beamLen: L.beamLen, beamStrength: 1 });

  // ---------------- the crowd: two rows of silhouettes rim-lit by the fireworks merge into one dark mass of heads and
  // raised arms against the bay; string lights on poles; a front row of lit partygoers (all skin tones) pumps on the beat
  crowd(p, t, c, L, { B, bi, ph, spb, cheerAll: kBig < spb * 2, rim: recentCol });

  // ---------------- type: chip header + logo revealed from the burst's glitter; one at a time
  big.forEach((tb, i) => {
    const cr = CREW[i];
    const next = big[i + 1] ?? Infinity;
    const tOut = next - spb * 0.45;                      // dissolve just before the next rocket bursts
    if (t < tb || t >= next) return;
    const kIn = tween(t, tb + 0.06, 0.42);
    const kOut = t >= tOut ? 1 - tween(t, tOut, spb * 0.4) : 1;
    const k = Math.min(kIn, kOut);
    const ct = crewContent(c, cr, L);
    const lx = L.logoC.x - (ct.w - 6) / 2, ly = L.logoC.y - (ct.h - 6) / 2;
    ditherReveal(hi, ct, lx, ly, k, t >= tOut ? 'scatter' : 'radial');
    const chipY = snap(Math.min(L.chipY, ly - 70));
    anim(hi, t, { t0: tb, t1: tOut, x: L.logoC.x, y: chipY, enter: 'stamp', exit: 'shrink' },
      (h) => chip(h, cr.head, L.logoC.x, chipY, { size: L.chipSize, align: 'center' }));
  });
  // after the last reveal: sparkles orbit the venue badge on every beat
  if (curBig === 2 && bi >= 0 && t > big[2] + spb * 0.9) {
    const tb = c.beats[bi];
    const ct = crewContent(c, CREW[2], L);
    const rr = (Math.max(ct.w, ct.h) / 2 + 30) / 6;
    for (let k = 0; k < 3; k++) {
      const a = (bi * 1.3 + k * 2.1);
      const sx = R(L.logoC.x / 6 + Math.cos(a) * rr), sy = R(L.logoC.y / 6 + Math.sin(a) * rr * 0.9);
      sparkle(p, sx, sy, t, tb + k * 0.07, { color: [C.gold, C.sky, C.cream][k], size: 2, dur: 0.4 });
    }
  }
  corners(hi, c.fmt, { y: v ? 132 : undefined });   // key-art corner stairs: on in every hook section (intro, choruses + post-choruses, bridge, end card)
  // ignition flash on the big bursts (hi layer, 3 frames)
  if (kBig < 0.1) flash(hi, DW, DH, 0.16 * (1 - kBig / 0.1), C.cream);
}

/** The waterfront crowd (see drawNight). */
function crowd(p, t, c, L, o) {
  const { PW, PH } = { PW: p.canvas.width, PH: p.canvas.height };
  const { B, bi, ph, cheerAll } = o;
  const onBeat = c.pulse(t, 0.18);
  const offT = B(bi + 0.5);
  const offBeat = t >= offT ? Math.exp((-3 * (t - offT)) / 0.18) : 0;
  const armT = (2 * Math.max(0, bi) + (ph >= 0.5 ? 1 : 0)) * 0.25; // person() 'cheer' frame: arms up on the beat, down on the and
  const rim = o.rim || RAMP.teal[3];
  // string lights on poles over the promenade, behind the crowd
  for (const x of L.lights.xs) vline(p, x, L.lights.y - 1, L.mass, RAMP.ink[0]);
  stringLights(p, t, c, L.lights.xs, L.lights.y, L.lights.sag);
  rect(p, 0, L.mass, PW, PH - L.mass, RAMP.ink[0]);
  // silhouette rows: every rim first, then every body (rims survive only on the crowd's outer edge), then the dark mass
  for (const pass of ['rim', 'body']) {
    L.rows.forEach((row, ri) => {
      let n = 0;
      for (let x = -4 + row.ox; x < PW + 8; x += row.step, n++) {
        const sd = ri * 97 + n;
        const jx = R(hash(sd, 1, 9) * 4) - 2;
        const grp = n % 2;
        const hop = (grp ? offBeat : onBeat) > 0.45 ? 1 : 0;
        const hv = hash(sd, 4, 9);
        const tall = hv < 0.25 ? 2 : hv < 0.5 ? 1 : hv > 0.88 ? -3 : 0;  // mixed heights: tall folks, kids
        const pose = cheerAll || hash(sd, 2, 9) < 0.5 ? 'cheer' : hash(sd, 3, 9) < 0.5 ? 'wave' : 'stand';
        partygoer(p, x + jx, row.base - hop - tall, {
          t: armT + (grp ? 0.25 : 0), seed: 100 + sd, pose, flip: hash(sd, 5, 9) < 0.5, sil: RAMP.ink[0], rim, pass,
        });
      }
    });
  }
  // front rows: lit partygoers, every skin tone, dancing on alternate beats
  const skins = [3, 0, 5, 2, 4, 1];
  const tops = [C.coral, C.sky, C.gold, '#5D8B3B', C.cream, '#3F8ABD', C.coral, C.gold];
  const styles = ['curly', 'long', 'cap', 'short', 'bun', 'bald', 'long', 'curly', 'short', 'bun', 'cap'];
  let n = 0;
  for (const fr of L.fronts) {
    for (let x = fr.ox; x < PW + 4; x += fr.step, n++) {
      const jx = R(hash(n, 1, 13) * 4) - 2;
      const grp = (n + 1) % 2;
      const e = grp ? offBeat : onBeat;
      const hop = e > 0.5 ? 2 : e > 0.2 ? 1 : 0;
      const pose = cheerAll || n % 4 !== 1 ? 'cheer' : 'wave';
      partygoer(p, x + jx, fr.base - hop - (n % 3 === 2 ? 1 : 0), {
        t: armT + (grp ? 0.25 : 0), seed: 300 + n, skin: skins[(n * 5) % 6], hair: (n * 2 + 1) % 5, style: styles[n % styles.length],
        top: tops[(n * 3 + 1) % tops.length], pants: '#173B38', pose, flip: n % 2 === 1,
      });
    }
  }
  // sparkles over the crowd on the beats
  if (bi >= 0) for (let k = 0; k < 2; k++) {
    sparkle(p, R(hash(bi, k, 21) * PW), L.rows[0].base - 22 - R(hash(bi, k, 22) * 10), t, c.beats[bi] + k * 0.1, { color: k ? C.sky : C.gold, size: 2, dur: 0.35 });
  }
}
