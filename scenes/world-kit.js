// scenes/world-kit.js (Foundation): gallery of every lib/world.js piece across times of day, for scene authors.
// Not in the timeline. node tools/stills.mjs --scene world-kit --fmt 16x9 --times 1.3
import { C, RAMP } from '../lib/palette.js';
import { onTwos } from '../lib/motion.js';
import { rect } from '../lib/pixel.js';
import * as W from '../lib/world.js';
import { eyebrow, text } from '../lib/text.js';

export default {
  id: 'world-kit',
  draw(g, t, c) {
    const { px, hi, PW, PH } = g;
    const v = c.fmt === '9x16';
    const tods = ['night', 'dawn', 'day', 'dusk'];
    const stripH = v ? 56 : 30, stripW = v ? PW : PW;
    tods.forEach((tod, i) => {
      const y0 = i * stripH;
      px.save();
      px.beginPath(); px.rect(0, y0, stripW, stripH); px.clip();
      px.translate(0, y0);
      W.sky(px, { tod: tod === 'dawn' ? 'dawn' : tod, h: stripH });
      if (tod === 'night') { W.stars(px, t, { h: stripH * 0.7, seed: 3 }); W.moon(px, 30, 8, 5, { phase: 0.4 }); }
      if (tod === 'dawn') W.sun(px, 40, stripH - 9, 6, { t });
      if (tod === 'dusk') W.sun(px, 60, stripH - 7, 7, { t, rays: false });
      W.water(px, t, { y: stripH - 7, tod, fade: 'left', fadeW: 40, x: 60 });
      const a = W.headland(px, v ? 120 : 260, stripH - 9, { t, tod, h: 44, beam: tod === 'night', beamLen: 70 });
      W.cloud(px, v ? 90 : 120, 4, { kind: 'twoTone', tod });
      W.gull(px, v ? 70 : 170, 10, t, { tod });
      W.gull(px, v ? 80 : 182, 14, t + 0.3, { tod });
      px.restore();
      eyebrow(hi, tod.toUpperCase(), 24, y0 * 6 + 40, { size: 26 });
    });
    // props row
    const y = tods.length * stripH;
    rect(px, 0, y, PW, PH - y, C.teal);
    const base = y + (v ? 40 : 30);
    const poses = ['stand', 'walk', 'wave', 'cheer', 'type'];
    for (let i = 0; i < (v ? 10 : 18); i++) {
      W.person(px, 10 + i * (v ? 17 : 17), base, { seed: i + 1, pose: poses[i % poses.length], t: t + i * 0.1 });
    }
    W.pumpkin(px, v ? 20 : 316 - 20, base + 16, { size: 2 });
    W.pumpkin(px, v ? 34 : 316 - 8, base + 16, { size: 1 });
    W.bush(px, v ? 60 : 40, base + 16, { w: 18, h: 9, seed: 4 });
    W.tree(px, v ? 90 : 70, base + 16, { w: 22, h: 28, seed: 5 });
    W.house(px, v ? 104 : 100, base + 16, {});
    W.fortWall(px, v ? 140 : 140, base + 16, {});
    W.plusPx(px, v ? 170 : 170, base + 8);
    W.leaves(px, t, { y: y, h: PH - y, count: 10 });
    const bt = (t % 1);
    W.burst(px, v ? 150 : 220, base - 10, bt, { seed: 2 });
    W.sparkle(px, v ? 165 : 240, base - 6, t % 0.6, 0, { size: 2 });
    W.cloud(px, v ? 120 : 250, base + 6, { kind: 'big' });
    W.cloud(px, v ? 10 : 280, base + 22, { kind: 'small' });
  },
};
