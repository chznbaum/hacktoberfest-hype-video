// scenes/endcard.js (owner G) C31, cues out.1 -> tail. The key art, alive, as the end card.
// Reading order (key art): COMMUNITY HACK DAY eyebrow -> FREE chip -> Hacktoberfest / 2026 / in the 757 -> pixel QR
// (REGISTER FREE ON MLH) -> ||| date / time / venue -> HOSTED BY RevolutionVA + SPONSORED BY The AI Collective
// Hampton Roads. Everything lands on half-beats from out.1 (~2 s), then holds so people can read and scan.
// Beat-locked life while it holds: "757 Makerspace" (out.2) pings the venue line, the out.3 chant bumps the
// 7 / 5 / 7 digits one per hit, "Hacktoberfest!" (out.4) re-stamps the title + lantern flare. The partner row
// (logos.json: venue + global program) pops in from out.3 (16:9: the info block steps up to make room) and stays;
// the QR + date/place stay on screen to the very end. The AI Collective is the SPONSOR, never a host.
import { C } from '../lib/palette.js';
import { clamp, ease, tween, snap, onTwos, stamp as stampCurve } from '../lib/motion.js';
import { water, headland, cloud, gull, sparkle, burst, haloDisc } from '../lib/world.js';
import { text, textBox, measure, capRatio, chip, corners, plus, panel, anim, typeText, fitSize } from '../lib/text.js';
import { loadEndcardContent, allLogos, logo, tinted, fitBox, halfBeats, beatIdx, qrCard, brackets, partnerRow, partnerRowWidth, sailboat } from './_G-endcard.js';

const R = Math.round;

export default {
  id: 'endcard',
  async setup() { await loadEndcardContent(); },
  draw(g, t, c) {
    const L = layout(g.hi, c);
    const T = timing(c);
    drawWorld(g, t, c, L, T);
    drawType(g, t, c, L, T);
  },
};

// ------------------------------------------------------------------ layouts (world in low-res px, type in device px)
const BASE_H = {
  water: { x: 186, y: 131, fadeW: 44, fade: 'left' },
  lh: { x: 258, base: 124, h: 104 },
  clouds: [{ kind: 'big', x: 282, y: 47, v: 0.8 }, { kind: 'small', x: 214, y: 22, v: 0.5 }, { kind: 'wisp', x: 222, y: 86, v: 0.35 }],
  gulls: [{ x: 283, y: 66, p: 0 }, { x: 293, y: 78, p: 0.4 }, { x: 236, y: 44, p: 0.7 }],
  qr: { x: 160, y: 72 },                                   // low-res top-left of the 45 px cream card
  qrChip: { x: 1095, y: 352, size: 30, align: 'center' },
  eyebrow: { x: 162, y: 126, size: 31, tracking: 0.12 },
  chip: { x: 672, y: 106, size: 30, enter: 'slide-down' },
  title: { x: 90, y: 166, size: 190 },
  info: { x: 60, y0: 870, y1: 750, size: 44 },            // y0 while it holds, y1 after it makes room for partners
  plus: { x: 1788, y: 192 },
  billing: { x: 1194, y: 834, w: 636, h: 192, rows: false },
  partners: { x: 66, cy: 966, H: 66, maxRight: 1160, labels: true, panel: null },
};
const BASE_V = {
  water: { x: 0, y: 190, fadeW: 40, fade: 'none' },
  lh: { x: 152, base: 182, h: 92 },
  boat: { x: 20, y: 268, v: 2.2 },
  clouds: [{ kind: 'small', x: 98, y: 98, v: 0.4 }, { kind: 'wisp', x: 128, y: 39, v: 0.3 }],
  gulls: [{ x: 118, y: 106, p: 0 }, { x: 127, y: 114, p: 0.4 }, { x: 172, y: 130, p: 0.7 }],
  qr: { x: 14, y: 184 },
  qrChip: { x: 80, y: 1040, size: 30, align: 'left' },
  eyebrow: { x: 80, y: 276, size: 32, tracking: 0.14 },
  chip: { x: 80, y: 336, size: 36, enter: 'slide-right' },
  title: { x: 76, y: 400, size: 0, restamp: 1.045 },                      // size 0 = fit "Hacktoberfest" to the safe width
  info: { x: 80, y0: 0, y1: 0, size: 40 },                // y = under the title (computed)
  plus: { x: 1014, y: 566 },
  billing: { x: 396, y: 1150, w: 604, h: 248, rows: true },
  partners: { x: 80, cy: 1455, H: 52, maxRight: 1000, labels: false, panel: { x: 80, y: 1410, w: 920, h: 90 } },
};
const layoutCache = new Map();
function layout(h, c) {
  const key = c.fmt;
  if (layoutCache.has(key)) return layoutCache.get(key);
  const v = c.fmt === '9x16';
  const L = JSON.parse(JSON.stringify(v ? BASE_V : BASE_H));
  if (!L.title.size) L.title.size = Math.floor(fitSize(h, c.facts.title.line1, c.safe.x1 - c.safe.x0 - 6, { role: 'display', maxSize: 178 }));
  const s = L.title.size, cap = capRatio(h, 'display') * s;
  L.title.b = [L.title.y + cap, L.title.y + cap + s * 0.9, L.title.y + cap + s * 0.9 + s * 0.86];
  L.title.cap = cap;
  if (v) { L.info.y0 = L.info.y1 = snap(L.title.b[2] + 48); }
  // 7 / 5 / 7 digit centres (device px) for chant sparkles on the pixel layer
  const l3 = c.facts.title.line3, m = l3.match(/^(.*?)(\d+)\s*$/);
  L.digits = [];
  if (m) {
    let dx = L.title.x + measure(h, m[1], { role: 'display', size: s }).w;
    for (const d of m[2]) { const w = measure(h, d, { role: 'display', size: s }).w; L.digits.push({ x: dx + w / 2, y: L.title.b[2] - cap }); dx += w + s * -0.005; }
  }
  layoutCache.set(key, L);
  return L;
}

// ------------------------------------------------------------------ timing (all keyed on cues / beats)
function timing(c) {
  const cue = (id, fb) => c.lines[id] || fb;
  const L1 = cue('out.1', { start: 0, end: c.dur * 0.24 });
  const L2 = cue('out.2', { start: L1.end, end: L1.end + c.dur * 0.14 });
  const L3 = cue('out.3', { start: L2.end, end: L2.end + c.dur * 0.14 });
  const L4 = cue('out.4', { start: L3.end, end: L3.end + c.dur * 0.08 });
  const hb = halfBeats(c, Math.max(0, L1.start));
  const s = (k) => Math.max(hb(k), 0.5 / 30); // never on frame 0: the stair wipe holds t=0 as a clean world plate
  const h3 = c.hits['out.3'];
  const hits3 = h3 && h3.length >= 3 ? h3 : [0, 1, 2].map((i) => halfBeats(c, L3.start)(2 + i * 2));
  const h4 = c.hits['out.4'];
  const hit4 = h4 && h4.length ? h4[0] : L4.start;
  const pb = halfBeats(c, L3.start);
  return {
    corners: s(0), eyebrow: s(0), title: [s(0), s(2), s(3)], chip: s(1), qr: s(4), info: s(5),
    host: s(6), sponsor: s(7), plus: s(8),
    venue: c.beats[beatIdx(c, L2.start)] ?? L2.start,
    hits3, hit4, room: pb(0),
    partners: [1, 2, 3, 4, 5, 6, 7].map((k) => pb(k)),
  };
}

// ------------------------------------------------------------------ pixel world
function drawWorld(g, t, c, L, T) {
  const { px, PW, PH } = g;
  const tq = onTwos(t);
  const tod = 'day';
  water(px, t, { x: L.water.x, y: L.water.y, w: PW - L.water.x, h: PH - L.water.y, tod, fade: L.water.fade, fadeW: L.water.fadeW, seed: 4, speed: 0.8 });
  for (const cl of L.clouds) cloud(px, R(cl.x + Math.floor(tq * cl.v)), cl.y, { kind: cl.kind, tod });
  // lantern: warm pulse on every beat; flare on "Hacktoberfest!" (out.4)
  const flare = t >= T.hit4 ? clamp(1 - (t - T.hit4) / 0.5) : 0;
  const glow = 0.72 + 0.28 * c.pulse(t, 0.3);
  const a = headland(px, L.lh.x, L.lh.base, { t, tod, glow: Math.max(glow, flare), h: L.lh.h });
  if (flare > 0) {
    // tight banded flare (gold ring + cream core), stepped on twos so it reads as pixel light, not noise
    const f = Math.ceil(flare * 3) / 3;
    haloDisc(px, a.lantern.x, a.lantern.y, R(4 + 6 * f), C.gold, 0.25 * f);
    haloDisc(px, a.lantern.x, a.lantern.y, R(2 + 3 * f), C.cream, 0.75 * f);
  }
  // lantern glint on every downbeat (daylight "beam pulse")
  const bar = c.bar(t);
  if (bar.index >= 0 && t >= T.title[0]) sparkle(px, a.lantern.x + 1, a.lantern.y - 1, t, bar.t0, { color: C.gold, size: 2, dur: 0.3 });
  // a little sailboat drifting across the bay (9:16 has a lot of water under the cards)
  if (L.boat) sailboat(px, R(L.boat.x + Math.floor(onTwos(t) * L.boat.v)), L.boat.y + (Math.floor(onTwos(t) * 2) % 2), t);
  for (const gl of L.gulls) {
    const dx = R(Math.sin(tq * 0.6 + gl.p * 5) * 3), dy = R(Math.sin(tq * 1.3 + gl.p * 7) * 1.5);
    gull(px, gl.x + dx, gl.y + dy, t, { phase: gl.p, rate: 2.2, tod });
  }
  // the pixel QR card (+ coral viewfinder brackets that breathe on the beat, outside the quiet zone)
  const q = qrCard(px, L.qr.x, L.qr.y, t, T.qr);
  if (t >= T.qr + 0.2) brackets(px, q, { arm: 7, gap: 3, b: c.pulse(t, 0.16) > 0.5 ? 1 : 0, show: clamp((t - T.qr - 0.2) / 0.15) });
  // chant: a sparkle over each digit as it bumps; "Hacktoberfest!": dust pop from the gold plus
  T.hits3.forEach((h, i) => { const d = L.digits[i]; if (d) sparkle(px, R(d.x / 6), R(d.y / 6) - 4, t, h, { color: i === 1 ? C.gold : C.cream, size: 2, dur: 0.4 }); });
  if (t >= T.hit4) burst(px, R(L.plus.x / 6), R(L.plus.y / 6), t - T.hit4, { n: 16, speed: 30, gravity: 40, seed: 5, life: 0.7 });
}

// ------------------------------------------------------------------ type layer
function drawType(g, t, c, L, T) {
  const { hi } = g;
  const v = c.fmt === '9x16';
  const F = c.facts;
  corners(hi, c.fmt, { show: tween(t, T.corners, 0.3), y: v ? 132 : undefined });
  const p4 = t >= T.hit4 ? clamp(1 - (t - T.hit4) / 0.35) : 0;
  if (t >= T.plus) plus(hi, L.plus.x, L.plus.y, { scale: Math.min(1, tween(t, T.plus, 0.2, ease.outBack)) * (0.8 + 0.4 * c.pulse(t, 0.35) + 0.8 * p4) });

  typeText(hi, t, T.eyebrow, F.eyebrow, L.eyebrow.x, L.eyebrow.y, { size: L.eyebrow.size, tracking: L.eyebrow.tracking, cursor: false, cps: 48 });
  anim(hi, t, { t0: T.chip, x: L.chip.x + 200, y: L.chip.y, enter: L.chip.enter, dist: 48 }, (h) => chip(h, F.chips.short, L.chip.x, L.chip.y, { size: L.chip.size }));

  titleLive(hi, t, c, L.title, T);

  const qc = L.qrChip;
  anim(hi, t, { t0: T.qr, x: qc.x, y: qc.y, enter: v ? 'slide-right' : 'slide-up', dist: 36 }, (h) => chip(h, F.registration.label, qc.x, qc.y, { size: qc.size, align: qc.align }));

  infoLive(hi, t, c, L.info, T, v);
  billing(hi, t, c, L.billing, T);
  partners(hi, t, c, L.partners, T);
}

function titleLive(h, t, c, o, T) {
  const F = c.facts;
  const { size, x } = o;
  const [b1, b2, b3] = o.b;
  const cap = o.cap;
  // line 1 re-stamps on "Hacktoberfest!" (out.4)
  const re = t >= T.hit4 ? stampCurve(t, T.hit4, { from: o.restamp || 1.08 }) : null;
  const l1 = textBox(h, F.title.line1, x, b1, { role: 'display', size });
  anim(h, t, { t0: T.title[0], x: l1.cx, y: l1.cy, enter: 'stamp' }, (q) => {
    if (re && re.scale !== 1) { q.translate(l1.cx, l1.cy); q.scale(re.scale, re.scale); q.translate(-l1.cx, -l1.cy); }
    text(q, F.title.line1, x, b1, { role: 'display', size });
  });
  const l2 = textBox(h, F.title.line2, x, b2, { role: 'display', size });
  anim(h, t, { t0: T.title[1], x: l2.cx, y: l2.cy, enter: 'stamp' }, (q) => text(q, F.title.line2, x, b2, { role: 'display', size }));
  // line 3: "in the " + 7 / 5 / 7 (each digit bumps + flashes cream on its chant hit)
  const l3s = F.title.line3, m = l3s.match(/^(.*?)(\d+)\s*$/);
  const pre = m ? m[1] : l3s, digits = m ? m[2] : '';
  const l3 = textBox(h, l3s, x, b3, { role: 'display', size });
  anim(h, t, { t0: T.title[2], x: l3.cx, y: l3.cy, enter: 'stamp' }, (q) => {
    text(q, pre, x, b3, { role: 'display', size, color: C.sky });
    let dx = x + measure(q, pre, { role: 'display', size }).w;
    [...digits].forEach((d, i) => {
      const w = measure(q, d, { role: 'display', size }).w;
      const hit = T.hits3[i];
      let sc = 1, col = C.sky, lift = 0;
      if (hit !== undefined && t >= hit) {
        const f = Math.floor((t - hit) * 30);
        if (f < 6) { sc = [1.2, 1.14, 1.06, 0.98, 1.0, 1.0][f]; lift = [18, 12, 6, 0, 0, 0][f]; }
        if (f < 3) col = C.cream;
      }
      const cx = dx + w / 2, cy = b3 - cap / 2;
      q.save();
      q.translate(cx, cy - lift); q.scale(sc, sc); q.translate(-cx, -cy);
      text(q, d, dx, b3, { role: 'display', size, color: col });
      q.restore();
      dx += w + size * -0.005;
    });
  });
}

function infoLive(h, t, c, o, T, v) {
  if (t < T.info) return;
  const F = c.facts;
  const time = F.time.label.replace('–', '—');
  const lines = v
    ? [`${F.date.label} • ${time}`, F.venue.name, `${F.venue.street}, ${F.venue.city}`]
    : [`${F.date.label} • ${time}`, `${F.venue.name} · ${F.venue.street}, ${F.venue.city}`];
  const size = o.size;
  const cap = capRatio(h, 'mono') * size;
  const gapL = size * 0.62;
  const bh = cap * lines.length + gapL * (lines.length - 1);
  const pad = snap(size * 0.2);
  // make room for the partner row: pixel-stepped slide up on the half-beat before the partners land
  const k = tween(t, T.room, 0.24, ease.outCubic);
  const y = snap(o.y0 + (o.y1 - o.y0) * k);
  // ||| bars: grow in, re-grow on "757 Makerspace" (out.2)
  const regrow = t >= T.venue && t < T.venue + 0.3 ? tween(t, T.venue, 0.3, ease.outCubic) : 1;
  const grow = Math.min(tween(t, T.info, 0.3), regrow);
  const barW = 18, barGap = 12, x = snap(o.x);
  const bH = snap(bh + pad * 2);
  h.save(); h.fillStyle = C.coral;
  for (let i = 0; i < 3; i++) {
    const hh = snap(bH * clamp(grow * 4 - i * 0.6));
    if (hh > 0) h.fillRect(x + i * (barW + barGap), snap(y - pad) + bH - hh, barW, hh);
  }
  h.restore();
  const tx = x + 3 * barW + 2 * barGap + snap(size * 0.6);
  lines.forEach((ln, i) => {
    const t0 = T.info + 0.08 + i * 0.1;
    if (t < t0) return;
    const by = y + cap + i * (cap + gapL);
    const isVenue = v ? i >= 1 : i === 1;
    const st = isVenue && t >= T.venue ? stampCurve(t, T.venue + (v ? (i - 1) * 0.05 : 0), { from: 1.06 }) : null;
    const n = Math.min(ln.length, Math.floor((t - t0) * 90) + 1);
    h.save();
    if (st && st.scale !== 1) { h.translate(tx, by - cap / 2); h.scale(st.scale, st.scale); h.translate(-tx, -(by - cap / 2)); }
    text(h, ln.slice(0, n), tx, by, { role: 'mono', size });
    h.restore();
  });
}

function billing(h, t, c, o, T) {
  if (t < T.host) return;
  anim(h, t, { t0: T.host, x: o.x + o.w / 2, y: o.y + o.h / 2, enter: 'pop', dur: 0.2 }, (q) => {
    panel(q, o.x, o.y, o.w, o.h, { radius: 22, lineWidth: 6 });
    const pad = 30;
    if (!o.rows) {
      // 16:9: two cells side by side, key-art "HOSTED BY" header style
      const cw = (o.w - pad * 3) / 2;
      const hdr = 36, yH = o.y + pad, yL = yH + hdr * 0.72 + 22, cellH = o.y + o.h - pad + 4 - yL;
      text(q, 'HOSTED BY', o.x + pad, yH, { role: 'cond', size: hdr, weight: 800, baseline: 'cap-top' });
      hostLockup(q, o.x + pad - 4, yL, cw, cellH);
      q.save(); q.fillStyle = C.teal; q.fillRect(snap(o.x + pad + cw + pad / 2 - 3), o.y + pad, 6, o.h - pad * 2); q.restore();
      const sx = o.x + pad * 2 + cw;
      anim(q, t, { t0: T.sponsor, x: sx + cw / 2, y: o.y + o.h / 2, enter: 'stamp' }, (qq) => {
        text(qq, 'SPONSORED BY', sx, yH, { role: 'cond', size: hdr, weight: 800, baseline: 'cap-top' });
        sponsorLockup(qq, sx, yL, cw, cellH);
      });
    } else {
      // 9:16: two rows, label column on the left
      const hdr = 27, labW = 200, rowH = (o.h - pad * 2 - 18) / 2;
      const lx = o.x + pad, gx = o.x + pad + labW, gw = o.x + o.w - pad - gx;
      const y1 = o.y + pad, y2 = y1 + rowH + 18;
      text(q, 'HOSTED BY', lx, y1 + rowH / 2, { role: 'cond', size: hdr, weight: 800, baseline: 'cap-middle' });
      hostLockup(q, gx - 4, y1, gw, rowH);
      q.save(); q.fillStyle = C.teal; q.fillRect(o.x + pad, snap(y1 + rowH + 6), o.w - pad * 2, 6); q.restore();
      anim(q, t, { t0: T.sponsor, x: o.x + o.w / 2, y: y2 + rowH / 2, enter: 'stamp' }, (qq) => {
        text(qq, 'SPONSORED BY', lx, y2 + rowH / 2, { role: 'cond', size: hdr, weight: 800, baseline: 'cap-middle' });
        sponsorLockup(qq, gx, y2, gw, rowH);
      });
    }
  });
}

/** RevolutionVA: bird mark + typeset name (key-art arrangement); full lockup file or wordmark as fallbacks. */
function hostLockup(q, x, y, w, hgt) {
  const { entry, mark, img } = logo('revolutionva');
  const name = (entry && entry.display) || 'REVOLUTION VA';
  if (mark) {
    const fb = fitBox(mark, w * 0.3, hgt);
    q.drawImage(tinted(mark, fb.w, fb.h, C.cream), x, y + (hgt - fb.h) / 2, fb.w, fb.h);
    const tx = x + fb.w + 14;
    const size = Math.min(hgt * 0.5, fitSize(q, name, x + w - tx, { role: 'cond', maxSize: 60, weight: 500, tracking: 0.02 }));
    text(q, name, tx, y + hgt * 0.56, { role: 'cond', size, weight: 500, tracking: 0.02, baseline: 'cap-middle' });
  } else if (img) {
    const fb = fitBox(img, w, hgt);
    q.drawImage(tinted(img, fb.w, fb.h, C.cream), x, y + (hgt - fb.h) / 2, fb.w, fb.h);
  } else {
    const size = fitSize(q, name, w, { role: 'cond', maxSize: 60, weight: 800 });
    text(q, name, x, y + hgt / 2, { role: 'cond', size, weight: 800, baseline: 'cap-middle' });
  }
}

/** The AI Collective Hampton Roads: logo lockup if we have it, else a two-line condensed wordmark. */
function sponsorLockup(q, x, y, w, hgt) {
  const { entry, img } = logo('ai-collective');
  const name = (entry && entry.display) || 'THE AI COLLECTIVE HAMPTON ROADS';
  if (img) {
    const fb = fitBox(img, w, hgt);
    q.drawImage(tinted(img, fb.w, fb.h, C.cream), x, y + (hgt - fb.h) / 2, fb.w, fb.h);
    return;
  }
  const parts = name.match(/^(.*COLLECTIVE)\s+(.*)$/i);
  const l1 = parts ? parts[1] : name, l2 = parts ? parts[2] : '';
  const s1 = fitSize(q, l1, w, { role: 'cond', maxSize: hgt * 0.5, weight: 800 });
  text(q, l1, x, y + hgt * (l2 ? 0.34 : 0.5), { role: 'cond', size: s1, weight: 800, baseline: 'cap-middle' });
  if (l2) text(q, l2, x, y + hgt * 0.76, { role: 'cond', size: s1 * 0.8, weight: 700, color: C.sky, baseline: 'cap-middle' });
}

function partners(h, t, c, o, T) {
  if (t < T.room) return;
  const groups = logoGroups(o.labels);
  const opts = { labelSize: 22 };
  const w = partnerRowWidth(h, o.H, groups, opts);
  if (o.panel) {
    const p = o.panel;
    anim(h, t, { t0: T.room, x: p.x + p.w / 2, y: p.y + p.h / 2, enter: 'pop', dur: 0.18 }, (q) => panel(q, p.x, p.y, p.w, p.h, { radius: 20, lineWidth: 6 }));
  }
  const avail = o.panel ? o.panel.w - 60 : o.maxRight - o.x;
  const scale = Math.min(1, avail / w);
  const x0 = o.panel ? o.panel.x + (o.panel.w - w * scale) / 2 : o.x;
  h.save();
  if (scale < 1) { h.translate(x0, o.cy); h.scale(scale, scale); h.translate(-x0, -o.cy); }
  partnerRow(h, t, x0, o.cy, o.H, groups, T.partners, opts);
  h.restore();
}

const groupsCache = {};
/** Partner groups from logos.json roles (venue, then the global program), falling back to the brief's list. */
function logoGroups(labels) {
  const key = labels ? 'l' : 'n';
  if (groupsCache[key]) return groupsCache[key];
  const all = allLogos();
  let venue = all.filter((l) => l.role === 'venue').map((l) => l.id);
  let program = all.filter((l) => l.role === 'program').map((l) => l.id);
  if (!venue.length) venue = ['757-makerspace'];
  if (!program.length) program = ['hacktoberfest', 'mlh', 'dev', 'digitalocean'];
  groupsCache[key] = [{ label: labels ? 'VENUE' : null, ids: venue }, { label: labels ? 'GLOBAL PROGRAM' : null, ids: program }];
  return groupsCache[key];
}
