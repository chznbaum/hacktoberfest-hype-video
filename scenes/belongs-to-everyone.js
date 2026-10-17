// scenes/belongs-to-everyone.js (owner C) - C11, cue v1.8 "'Cause AI belongs to everyone, so everyone's here!"
// Daylight on the Hampton seawall over the bay. A diverse row of pixel people (world.person + hijab + wheelchair
// variants) each light up their own little AI spark in a left-to-right wave, then everybody cheers on the last beat.
// Theme lockup (global Hacktoberfest 2026 theme, brand hook): AI belongs / to everyone, eyebrow 2026 THEME.
import { C, RAMP } from '../lib/palette.js';
import { clamp, onTwos, frameIndex, ease, tween } from '../lib/motion.js';
import { rect } from '../lib/pixel.js';
import { text, textBox, anim, eyebrow, measure, corners } from '../lib/text.js';
import { water, seawall, person, cloud, gull, sparkle, burst } from '../lib/world.js';
import { clock, aiSpark, personX, R } from './_C-kit.js';

const PANTS = ['#173B38', '#2B3A4A', '#4A3B2C', '#214D49'];
// inclusive row: skin tones 0-5, hair styles incl. grey hair, a hijab, a wheelchair user
const CAST = [
  { skin: 5, hair: 0, style: 'curly', top: C.coral },
  { skin: 1, hair: 4, style: 'long', top: C.sky },
  { kind: 'hijab', skin: 3, scarf: C.coral, top: C.cream },
  { skin: 0, hair: 5, style: 'short', top: '#5D8B3B' },
  { kind: 'wheelchair', skin: 4, hair: 0, top: C.gold },
  { skin: 2, hair: 1, style: 'cap', top: C.cream },
  { skin: 3, hair: 1, style: 'bun', top: C.sky },
  { skin: 4, hair: 0, style: 'bald', top: C.coral },
  { skin: 1, hair: 3, style: 'curly', top: C.gold },
  { skin: 5, hair: 0, style: 'long', top: C.cream },
  { kind: 'hijab', skin: 1, scarf: '#5D8B3B', top: C.sky },
  { skin: 2, hair: 2, style: 'short', top: '#5D8B3B' },
];
const SPARK_COLS = [
  { core: C.gold, rim: RAMP.glow[1], hot: RAMP.glow[4], add: '#120F06' },
  { core: C.sky, rim: RAMP.water[2], hot: RAMP.water[6], add: '#060B10' },
  { core: C.coral, rim: RAMP.roof[1], hot: RAMP.roof[4], add: '#120806' },
  { core: C.cream, rim: RAMP.cloud[2], hot: C.cream, add: '#0E0E0C' },
];

const GEO = {
  '16x9': {
    rows: [
      { base: 140, xs: [20, 46, 72, 98, 124, 150, 176, 202, 228, 254, 280, 305] },
      { base: 153, xs: [9, 33, 59, 85, 111, 137, 163, 189, 215, 241, 267, 293, 314] },
    ],
    wall: { y: 153, h: 9 }, waterY: 162, deck: 132,
    clouds: [[34, 22, 'twoTone'], [262, 34, 'big'], [8, 92, 'wisp']], gulls: [[256, 70], [276, 78]],
  },
  '9x16': {
    rows: [
      { base: 234, xs: [24, 54, 84, 114, 144] },
      { base: 246, xs: [12, 39, 66, 93, 120, 147, 170] },
    ],
    wall: { y: 246, h: 10 }, waterY: 256, deck: 224,
    clouds: [[26, 64, 'twoTone'], [126, 22, 'small'], [104, 196, 'wisp']], gulls: [[116, 184], [134, 192]],
  },
};

export default {
  id: 'belongs-to-everyone',
  draw(g, t, c) {
    const { px: p, hi, PW } = g;
    const G = GEO[c.fmt] || GEO['16x9'];
    const k = clock(c, 'v1.8');
    // beat plan: line 1 on the first beat, line 2 on the next; spark wave over beats 1..2.6; cheer on beat 3
    const tL1 = clamp(k.b0, 0.03, 0.3);
    const tL2 = Math.max(tL1 + 0.25, k.at(1, 0.35));
    const tW0 = tL2 + 0.02, tW1 = Math.max(tW0 + 0.3, k.at(2.5, 0.7));
    const tCheer = Math.max(tW1 + 0.1, k.at(3, 0.82));

    // ---- world: day sky (flat teal), clouds + gulls, bay water, seawall promenade
    for (const [x, y, kind] of G.clouds) cloud(p, x + Math.floor(onTwos(t) * 2), y, { kind });
    G.gulls.forEach(([gx, gy], i) => gull(p, R(gx + t * (9 - i)), gy - (frameIndex(t + i, 3, 2) ? 1 : 0), t + i * 0.2, { phase: 0.3 + i * 0.4 }));
    water(p, t, { y: G.waterY, h: g.PH - G.waterY, fade: 'none' });
    seawall(p, 0, G.wall.y, PW, G.wall.h, { seed: 4 });
    if (G.deck) {
      // paved promenade the back row stands on (slabs in the key-art stone ramp, lit front edge)
      rect(p, 0, G.deck, PW, G.wall.y - G.deck, RAMP.stone[4]);
      rect(p, 0, G.deck, PW, 1, RAMP.stone[3]);
      for (let y = G.deck + 5; y < G.wall.y; y += 6) rect(p, 0, y, PW, 1, RAMP.stone[3]);
      for (let y = G.deck + 1, r = 0; y < G.wall.y; y += 6, r++) for (let x = (r % 2) * 9; x < PW; x += 18) rect(p, x, y, 1, 4, RAMP.stone[3]);
      rect(p, 0, G.wall.y - 1, PW, 1, RAMP.stone[5]);
    }

    // ---- people + sparks (back row first)
    const all = [];
    G.rows.forEach((row, ri) => row.xs.forEach((x, j) => all.push({ x, base: row.base, ri, look: (j + ri * 6) % CAST.length })));
    // wave order = left to right across both rows
    const order = all.map((m, i) => ({ ...m, i })).sort((a, b) => a.x - b.x);
    const N = order.length;
    order.forEach((m, j) => { m.tOn = tW0 + ((tW1 - tW0) * j) / Math.max(1, N - 1); });
    const cheer = t >= tCheer;
    // light pools first (behind everyone)
    for (const ri of [0, 1]) {
      for (const m of all.map((mm, i) => ({ ...mm, i, tOn: order.find((o) => o.i === i).tOn }))) {
        if (m.ri !== ri) continue;
        const look = CAST[m.look];
        const lit = t >= m.tOn;
        const pose = cheer ? 'cheer' : lit ? 'wave' : 'stand';
        const flip = !lit && m.i % 3 === 1;
        const tt = t + m.i * 0.13;   // de-sync the cheer bounce
        if (look.kind) personX(p, m.x, m.base, { ...look, pose, t: tt, flip });
        else person(p, m.x, m.base, { ...look, pants: PANTS[m.i % 4], pose, t: tt, flip });
        if (!lit) continue;
        // the spark: pops in (tiny -> small) above the raised hand, bobs on twos; on the cheer it floats up over the head
        const age = t - m.tOn;
        const sc = SPARK_COLS[m.i % 4];
        const handX = m.x + (look.kind === 'wheelchair' ? 5 : 4);
        const up = cheer ? R(ease.outCubic(clamp((t - tCheer) / 0.25)) * 6) : 0;
        const sx = cheer ? m.x + (look.kind === 'wheelchair' ? 1 : 0) : handX;
        const sy = m.base - 22 - up + (frameIndex(t + m.i * 0.2, 4, 2) ? 0 : -1);
        aiSpark(p, sx, sy, t, { size: age < 0.067 ? 'tiny' : 'small', core: sc.core, rim: sc.rim, hot: sc.hot, add: sc.add, glow: 0 });
        if (age < 0.35) burst(p, handX, m.base - 21, age, { n: 8, speed: 26, gravity: 20, seed: 11 + m.i, life: 0.35, colors: [sc.core, C.cream] });
        if (cheer) sparkle(p, sx + (m.i % 2 ? 5 : -5), sy - 3, t, tCheer + (m.i % 5) * 0.05, { size: 2, dur: 0.4, color: sc.core });
      }
    }

    // ---- type: eyebrow + two-line display lockup (cream / sky), centred like an anthem
    const s = c.safe;
    corners(hi, c.fmt, { show: tween(t, 0, 0.2) });
    const l1 = 'AI belongs', l2 = 'to everyone';
    const maxW = c.fmt === '9x16' ? s.w : 1500;
    const w2 = measure(hi, l2, { role: 'display', size: 100 }).w;
    const size = Math.min(c.fmt === '9x16' ? 190 : 196, Math.floor((100 * maxW) / w2));
    const cap = measure(hi, 'H', { role: 'display', size }).cap;
    const yb1 = c.fmt === '9x16' ? 760 : R(150 + cap + 40);
    const yb2 = yb1 + R(size * 0.9);
    const eb = c.fmt === '9x16' ? 'HACKTOBERFEST 2026 THEME' : 'HACKTOBERFEST 2026 · GLOBAL THEME';
    anim(hi, t, { t0: 0, x: s.cx, y: yb1 - cap - 70, enter: 'fade', dur: 0.12 }, (h) =>
      eyebrow(h, eb, s.cx, yb1 - cap - 60, { size: c.type.eyebrow, align: 'center', color: C.sky }));
    const b1 = textBox(hi, l1, s.cx, yb1, { role: 'display', size, align: 'center' });
    anim(hi, t, { t0: tL1, x: b1.cx, y: b1.cy, enter: 'stamp' }, (h) => text(h, l1, s.cx, yb1, { role: 'display', size, align: 'center' }));
    const b2 = textBox(hi, l2, s.cx, yb2, { role: 'display', size, align: 'center' });
    anim(hi, t, { t0: tL2, x: b2.cx, y: b2.cy, enter: 'stamp' }, (h) =>
      text(h, l2, s.cx, yb2, { role: 'display', size, align: 'center', color: C.sky, scale: 1 + (cheer ? 0.03 * c.pulse(t, 0.2) : 0) }));
  },
};
