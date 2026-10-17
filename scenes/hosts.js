// scenes/hosts.js (owner A) C03, cue i.2 "Revolution V-A and the AI Collective".
// Key-art "Hosted by" panels over the pre-dawn bay: HOSTED BY RevolutionVA lands on the lyric start, SPONSORED BY
// The AI Collective Hampton Roads lands on the half-bar ("...and the AI Collective"). The AI Collective is the
// sponsor, never a host. Logos come from content/logos.json: a file is drawn as a cream-tinted alpha mask; no
// file -> condensed-caps wordmark. Panels stack in 9:16. The horizon starts to warm up toward the sunrise (C04).
import { C } from '../lib/palette.js';
import { clamp, ease, tween, snap, onTwos, hash } from '../lib/motion.js';
import { px as dot, rect } from '../lib/pixel.js';
import { sparkle } from '../lib/world.js';
import { text, panel, anim, stairs, corners, plus, fitSize, measure, capRatio } from '../lib/text.js';
import { bayWorld, beatAfter, cue, loadLogos, logo, tinted, fitBox, splitTwo } from './_A-common.js';

const R = Math.round;

export default {
  id: 'hosts',
  async setup() { await loadLogos(); },
  draw(g, t, c) {
    const v = c.fmt === '9x16';
    const L = cue(c, 'i.2', { start: 0, end: c.dur });
    const tA = Math.max(0, L.start);
    const tB = beatAfter(c, L.start + (L.end - L.start) * 0.45);
    const k = clamp(t / Math.max(0.5, c.dur));
    // ---------------- pixel world: open bay, distant shore lights, sky warming toward pre-dawn
    bayWorld(g, t, c, {
      tod: 'night', headland: false, waterX: 0, waterFull: true, waterY: v ? 240 : 134,
      dawn: 0.18 + 0.3 * k, starShow: 1 - 0.3 * k, starSeed: 21, clouds: true,
      moonAt: v ? { x: 148, y: 26, r: 6 } : { x: 290, y: 22, r: 7 },
      shore: { x0: 0, x1: g.PW, seed: 8, lit: 1 - 0.3 * k },
      waterGlints: [{ x: v ? 150 : 290, color: '#B9D5DC', w: 6 }],
    });
    const P = v
      ? [{ x: 80, y: 312, w: 920, h: 500 }, { x: 80, y: 872, w: 920, h: 456 }]
      : [{ x: 132, y: 228, w: 798, h: 456 }, { x: 990, y: 228, w: 798, h: 456 }];
    // pixel accents: sparkles burst at the panel corners as each lands
    [tA, tB].forEach((t0, i) => {
      const p = P[i];
      const cs = [[p.x, p.y], [p.x + p.w, p.y], [p.x, p.y + p.h], [p.x + p.w, p.y + p.h]];
      cs.forEach(([x, y], j) => sparkle(g.px, R(x / 6) + (j % 2 ? 2 : -2), R(y / 6) + (j > 1 ? 2 : -2), t, t0 + j * 0.03, { color: j % 2 ? C.sky : C.gold, size: 2, dur: 0.4 }));
    });

    // ---------------- type layer
    const hi = g.hi;
    corners(hi, c.fmt, { y: v ? 132 : undefined });
    hostPanel(hi, t, c, tA, P[0], 'HOSTED BY', 'revolutionva', 0);
    sponsorPanel(hi, t, c, tB, P[1], 'SPONSORED BY', 'ai-collective', 1);
    plus(hi, v ? 984 : 1788, v ? 1400 : 760, { scale: t >= tB ? 0.8 + 0.4 * c.pulse(t, 0.3) : 0 });
  },
};

/** Panel shell: stamps in at t0 with the key-art rounded tealDark panel + sky outline, header in cond 800. */
function shell(h, t, t0, p, header, idx, draw) {
  if (t < t0) return;
  const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
  anim(h, t, { t0, x: cx, y: cy, enter: 'stamp' }, (hh) => {
    panel(hh, p.x, p.y, p.w, p.h, { radius: 24, lineWidth: 6 });
    const pad = 46;
    text(hh, header, p.x + pad, p.y + pad, { role: 'cond', size: 46, weight: 800, baseline: 'cap-top', tracking: 0.02 });
    draw(hh, pad);
  });
}

function hostPanel(h, t, c, t0, p, header, id, idx) {
  shell(h, t, t0, p, header, idx, (hh, pad) => {
    const { entry, img: file, mark } = logo(id);
    const name = (entry && entry.display) || 'REVOLUTION VA';
    const top = p.y + pad + 46 * 0.75 + 36;          // below the header
    const availH = p.y + p.h - pad - top;
    const availW = p.w - pad * 2;
    // prefer the bird mark + big typeset name (key-art arrangement, readable at phone size); a lone 'mark' file works too
    const markImg = mark || (file && entry && /^mark/.test(entry.kind || '') ? file : null);
    const img = markImg ? null : file;
    if (markImg) {
      const fb = fitBox(markImg, availW * 0.32, availH);
      const lx = p.x + pad - 6, ly = top + (availH - fb.h) / 2;
      const slide = R((1 - tween(t, t0 + 0.03, 0.2, ease.outCubic)) * 30);
      hh.drawImage(tinted(markImg, fb.w, fb.h, C.cream), lx - snap(slide), ly);
      const tx = lx + fb.w + 26;
      const size = Math.min(110, fitSize(hh, name, p.x + p.w - pad - tx, { role: 'cond', maxSize: 110, weight: 500, tracking: 0.02 }));
      stampName(hh, t, t0 + 0.07, name, tx, ly + fb.h * 0.56, size, 500);
    } else if (img) {
      const fb = fitBox(img, availW, availH);
      hh.drawImage(tinted(img, fb.w, fb.h, C.cream), p.x + (p.w - fb.w) / 2, top + (availH - fb.h) / 2);
    } else {
      wordmark(hh, t, t0, name, p, pad, top, availW, availH);
    }
  });
}

function sponsorPanel(h, t, c, t0, p, header, id, idx) {
  shell(h, t, t0, p, header, idx, (hh, pad) => {
    const { entry, img } = logo(id);
    const name = (entry && entry.display) || 'THE AI COLLECTIVE HAMPTON ROADS';
    const top = p.y + pad + 46 * 0.75 + 36;
    const availH = p.y + p.h - pad - top;
    const availW = p.w - pad * 2;
    if (img && entry && /^mark/.test(entry.kind || '')) {
      const fb = fitBox(img, availW * 0.3, availH);
      const lx = p.x + pad, ly = top + (availH - fb.h) / 2;
      hh.drawImage(tinted(img, fb.w, fb.h, C.cream), lx, ly);
      const tx = lx + fb.w + 26;
      const lines = splitTwo(name);
      lines.forEach((ln, i) => {
        const size = fitSize(hh, ln, p.x + p.w - pad - tx, { role: 'cond', maxSize: 84, weight: i ? 700 : 800 });
        text(hh, ln, tx, ly + fb.h * (lines.length > 1 ? 0.42 + i * 0.36 : 0.55), { role: 'cond', size, weight: i ? 700 : 800, color: i ? C.sky : C.cream, baseline: 'cap-middle' });
      });
    } else if (img) {
      // lockup / wordmark file: as large as the box allows, cream tint (horizontal file in both formats: the panels are wide)
      const fb = fitBox(img, availW, availH);
      const sc = 1 + 0.12 * (1 - tween(t, t0 + 0.05, 0.16, ease.outCubic));
      const w = fb.w * sc, hgt = fb.h * sc;
      hh.drawImage(tinted(img, fb.w, fb.h, C.cream), p.x + (p.w - w) / 2, top + (availH - hgt) / 2, w, hgt);
    } else {
      wordmark(hh, t, t0, name, p, pad, top, availW, availH);
    }
  });
}

/** Text wordmark fallback: two condensed lines, cream (org) + sky (region), stamped one frame apart. */
function wordmark(hh, t, t0, name, p, pad, top, availW, availH) {
  const lines = splitTwo(name);
  const big = Math.min(132, fitSize(hh, lines[0], availW, { role: 'cond', maxSize: 132, weight: 800 }));
  const cap1 = capRatio(hh, 'cond', 800) * big;
  if (lines.length === 1) {
    stampName(hh, t, t0 + 0.07, lines[0], p.x + pad, top + availH / 2, big, 800);
    return;
  }
  const small = Math.min(big * 0.72, fitSize(hh, lines[1], availW, { role: 'cond', maxSize: 96, weight: 700 }));
  const cap2 = capRatio(hh, 'cond', 700) * small;
  const gap = big * 0.3;
  const blockH = cap1 + gap + cap2;
  const y1 = top + (availH - blockH) / 2 + cap1 / 2;
  const y2 = y1 + cap1 / 2 + gap + cap2 / 2;
  stampName(hh, t, t0 + 0.07, lines[0], p.x + pad, y1, big, 800, C.cream);
  stampName(hh, t, t0 + 0.13, lines[1], p.x + pad, y2, small, 700, C.sky);
}

function stampName(hh, t, t0, str, x, y, size, weight, color = C.cream) {
  const m = measure(hh, str, { role: 'cond', size, weight, tracking: 0.02 });
  anim(hh, t, { t0, x: x + m.w / 2, y, enter: 'stamp' }, (q) => text(q, str, x, y, { role: 'cond', size, weight, color, baseline: 'cap-middle', tracking: 0.02 }));
}
