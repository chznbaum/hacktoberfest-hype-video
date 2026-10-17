// _stub.js (Foundation): on-style placeholder used by scene stubs until owners replace them.
// Shows: teal bg + key-art corners, the scene id, the clip's cue range, a beat ticker and a progress bar,
// so the full edit renders end to end and timing can be checked. Scene owners: replace your scenes/<id>.js entirely.
import { C, RAMP } from '../lib/palette.js';
import { rect, dither } from '../lib/pixel.js';
import { text, eyebrow, mono, chip, corners, bars, P } from '../lib/text.js';
import { water, stars, sky } from '../lib/world.js';

export function stub(id, note, owner) {
  return {
    id,
    stub: true,
    draw(g, t, c) {
      const { px, hi, PW, PH, W, H } = g;
      const night = /chant|builders|cold|glow/.test(id) || c.variant === 2;
      sky(px, { tod: night ? 'night' : 'day', h: PH });
      if (night) stars(px, t, { h: PH * 0.6, seed: id.length });
      water(px, t, { y: Math.round(PH * 0.8), tod: night ? 'night' : 'day', fade: 'left', fadeW: PW * 0.5 });
      // beat ticker: one pixel block per beat in the bar, current beat lit
      const b = c.beat(t), bar = c.bar(t);
      const beatInBar = ((b.index % 4) + 4) % 4;
      for (let i = 0; i < 4; i++) rect(px, 8 + i * 8, PH - 12, 6, 6, i === beatInBar ? C.gold : RAMP.teal[2]);
      // progress bar
      rect(px, 0, PH - 2, Math.round((PW * t) / Math.max(0.01, c.dur)), 2, C.coral);
      corners(hi, c.fmt, { show: Math.min(1, t * 3) });
      const s = c.safe;
      const big = c.fmt === '9x16' ? 110 : 150;
      eyebrow(hi, `PLACEHOLDER · ${c.id} · OWNER ${owner}`, s.x0, s.y0 + 60, { size: c.type.eyebrow });
      text(hi, id, s.x0, s.y0 + 100 + big, { size: big, scale: 1 + 0.04 * c.pulse(t, 0.2) });
      const cues = Object.keys(c.lines);
      mono(hi, cues.length ? `${cues[0]} → ${cues[cues.length - 1]}` : 'no cues', s.x0, s.y0 + 140 + big + c.type.info, { size: c.type.info, color: C.sky });
      const words = note.split(' ');
      let line = '', y = s.y0 + 200 + big + c.type.info * 2, lines = 0;
      for (const w of words) {
        const test = line ? line + ' ' + w : w;
        if (test.length > (c.fmt === '9x16' ? 34 : 64) && lines < 5) { mono(hi, line, s.x0, y, { size: c.type.small }); y += c.type.small * 1.5; line = w; lines++; }
        else line = test;
      }
      if (line && lines < 6) mono(hi, line, s.x0, y, { size: c.type.small });
      chip(hi, `t ${t.toFixed(2)} / ${c.dur.toFixed(2)}s · v${c.variant}`, s.x0, s.y1 - 40, { size: 36 });
    },
  };
}
