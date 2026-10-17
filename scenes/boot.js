// scenes/boot.js (owner B) - C06, cue v1.2 "Hampton, Virginia, boot up the machine".
// A chunky beige pixel CRT on a desk powers on with the downbeat (CRT line -> flash), BIOS lines type in on
// sixteenths, then the screen clears to a tiny lighthouse boot logo with HAMPTON.EXE and a stepped progress bar
// that fills by beat 3.5; READY blinks and the lantern beams flash on the last beat.
// Label: the event format as a typed mono eyebrow (complements the lyric, never captions it).
import { C, RAMP } from '../lib/palette.js';
import { tween, ease, onTwos, clamp, hash, snap, frameIndex } from '../lib/motion.js';
import { rect, px, hline, vline, dither, pixelText, pixelTextWidth, sprite, drawSprite, frame as frameRect } from '../lib/pixel.js';
import { text, typeText, eyebrow, anim, measure, capRatio } from '../lib/text.js';
import { cached, pumpkin, sparkle, leaves, sun, cloud } from '../lib/world.js';
import { cueOr, beatT, R } from './_B-kit.js';

// casing ramp (beige plastic) + screen phosphor
const CASE = { hl: RAMP.house[4], lt: RAMP.house[3], base: RAMP.house[2], sh: RAMP.house[1], dk: RAMP.house[0] };
const SCR = { off: RAMP.teal[2], offHi: RAMP.teal[4], bg: RAMP.teal[0], scan: RAMP.ink[1], txt: C.sky, hot: C.cream };

const GEO = {
  // monitor box, screen inset, desk line
  '16x9': { mx: 128, my: 12, mw: 172, mh: 126, sx: 13, sy: 11, sw: 144, sh: 92, desk: 150, kb: { x: 150, y: 155, w: 104, h: 15 },
    win: { x: 24, y: 16, w: 64, h: 54 } },
  '9x16': { mx: 8, my: 92, mw: 164, mh: 128, sx: 12, sy: 11, sw: 140, sh: 94, desk: 236, kb: { x: 24, y: 242, w: 108, h: 16 },
    win: { x: 112, y: 14, w: 50, h: 58 } },
};

const LOGO = sprite([
  '.......c.......',
  '......ccc......',
  '.....rrrrr.....',
  '....rrrrrrr....',
  '...RRRRRRRRR...',
  '....igggggi....',
  '....igGGGgi....',
  '....igggggi....',
  '...iiiiiiiii...',
  '...i.i.i.i.i...',
  '....wwwwwSS....',
  '....wwwwwSS....',
  '....wwwddSS....',
  '....wwwwwSS....',
  '...wwwwwwSSS...',
  '...wwwwwwSSS...',
  '...wwwwddSSS...',
  '...wwwwwwSSS...',
  '..wwwwwwwSSSS..',
  '..wwwwwwwSSSS..',
  '..wwwwwddSSSS..',
  '..wwwwwwwSSSS..',
  '.wwwwwwwwwSSSS.',
  '.wwwwwwwwwSSSS.',
  'sssssssssssssss',
], { c: C.coral, r: C.coral, R: RAMP.roof[1], i: C.sky, g: C.gold, G: RAMP.glow[4], w: C.cream, S: RAMP.tower[1], d: RAMP.teal[0], s: C.sky });
const LANTERN_Y = 6;

function bios(F) {
  return [
    { s: 'HACKTOBERFEST BIOS', col: SCR.hot },
    { s: 'MEM .... 757K', ok: true },
    { s: `LOC: ${F.venue.cityState.toUpperCase()}` },
    { s: `DATE: ${F.date.weekdayShort} ${F.date.numericYear}` },
    { s: '> RUN HAMPTON.EXE', col: SCR.hot },
  ];
}

/** Static monitor + stand + desk + keyboard (cached per fmt). */
function drawRig(p, fmt, PW, PH) {
  const G = GEO[fmt];
  const cvs = cached(`B-rig|${fmt}`, PW, PH, (c) => {
    const { mx, my, mw, mh } = G;
    // desk: deep-teal slab with a lit front edge + faint grain (stays in the key-art teal family)
    rect(c, 0, G.desk, PW, PH - G.desk, RAMP.teal[1]);
    rect(c, 0, G.desk, PW, 1, RAMP.teal[6]);
    rect(c, 0, G.desk + 1, PW, 3, RAMP.teal[5]);
    rect(c, 0, G.desk + 4, PW, 1, RAMP.teal[3]);
    for (let i = 0; i < 26; i++) {
      const gx = R(hash(i, 7, 3) * PW), gy = G.desk + 7 + R(hash(i, 8, 3) * (PH - G.desk - 9));
      rect(c, gx, gy, 4 + R(hash(i, 9, 3) * 14), 1, RAMP.teal[2]);
    }
    // monitor shadow on the wall + desk
    dither(c, mx + mw, my + 6, 5, mh - 6, null, C.tealDark, 0.75);
    rect(c, mx + 6, G.desk + 4, mw + 4, 2, RAMP.teal[0]);
    // stand
    const nx = mx + R(mw / 2) - 14;
    rect(c, nx, my + mh, 28, G.desk - my - mh - 3, CASE.sh);
    rect(c, nx, my + mh, 3, G.desk - my - mh - 3, CASE.base);
    rect(c, nx - 12, G.desk - 4, 52, 4, CASE.base);
    rect(c, nx - 12, G.desk - 4, 52, 1, CASE.hl);
    rect(c, nx + 34, G.desk - 3, 6, 3, CASE.sh);
    // casing: rounded box, light from the upper-left
    rect(c, mx + 1, my, mw - 2, mh, CASE.base);
    rect(c, mx, my + 1, mw, mh - 2, CASE.base);
    rect(c, mx + 1, my, mw - 2, 2, CASE.hl);
    rect(c, mx, my + 1, 2, mh - 3, CASE.lt);
    rect(c, mx + mw - 3, my + 2, 3, mh - 3, CASE.sh);
    rect(c, mx + 1, my + mh - 3, mw - 2, 3, CASE.sh);
    px(c, mx + 1, my + 1, CASE.hl);
    // bezel recess around the screen
    const sx = mx + G.sx, sy = my + G.sy, sw = G.sw, sh = G.sh;
    rect(c, sx - 3, sy - 3, sw + 6, sh + 6, CASE.sh);
    rect(c, sx - 3, sy + sh + 2, sw + 6, 1, CASE.lt);   // lit lower lip
    rect(c, sx + sw + 2, sy - 3, 1, sh + 6, CASE.lt);
    rect(c, sx - 1, sy - 1, sw + 2, sh + 2, CASE.dk);
    // control strip under the screen: vents, a power button
    const by = sy + sh + 5;
    for (let i = 0; i < 6; i++) rect(c, sx + 2 + i * 4, by + 1, 2, 4, CASE.sh);
    rect(c, sx + sw - 14, by + 1, 6, 4, CASE.sh);
    rect(c, sx + sw - 14, by + 1, 6, 1, CASE.dk);
    // keyboard
    const k = G.kb;
    rect(c, k.x - 1, k.y + 1, k.w + 2, k.h, RAMP.teal[0]);
    rect(c, k.x, k.y, k.w, k.h - 1, CASE.base);
    rect(c, k.x, k.y, k.w, 1, CASE.hl);
    rect(c, k.x, k.y + k.h - 2, k.w, 1, CASE.sh);
    for (let r = 0; r < 3; r++) for (let i = 0; i < Math.floor((k.w - 6) / 5); i++) {
      const kx = k.x + 3 + i * 5 + (r % 2) * 2, ky = k.y + 2 + r * 4;
      if (kx + 4 > k.x + k.w - 2) continue;
      rect(c, kx, ky, 4, 3, CASE.lt);
      rect(c, kx, ky + 2, 4, 1, CASE.sh);
    }
    // mouse + cable
    const mxx = k.x + k.w + 10, myy = k.y + 3;
    rect(c, mxx, myy, 7, 9, CASE.base);
    rect(c, mxx + 1, myy - 1, 5, 1, CASE.base);
    rect(c, mxx, myy, 2, 8, CASE.lt);
    rect(c, mxx + 5, myy, 2, 9, CASE.sh);
    vline(c, mxx + 3, myy - 1, myy + 3, CASE.sh);
    // sticky note on the bezel (coral) with scribbles
    const nx2 = mx + mw - 20, ny2 = my + mh - 17;
    rect(c, nx2, ny2, 12, 11, C.coral);
    rect(c, nx2, ny2, 12, 1, RAMP.roof[4]);
    rect(c, nx2 + 11, ny2 + 1, 1, 10, RAMP.roof[1]);
    hline(c, nx2 + 2, nx2 + 8, ny2 + 4, RAMP.roof[0]);
    hline(c, nx2 + 2, nx2 + 6, ny2 + 7, RAMP.roof[0]);
  });
  p.drawImage(cvs, 0, 0);
}

export default {
  id: 'boot',
  draw(g, t, c) {
    const { px: p, hi, PW, PH } = g;
    const fmt = c.fmt, v = fmt === '9x16';
    const G = GEO[fmt];
    const L = cueOr(c, 'v1.2');
    const B = (n) => beatT(c, L.start, n);
    const tq = onTwos(t);
    const F = c.facts;

    // wall: flat teal; a window frame with the autumn morning outside (left in 16:9, top in 9:16)
    const win = G.win;
    rect(p, win.x - 3, win.y - 3, win.w + 6, win.h + 6, RAMP.teal[3]);
    rect(p, win.x - 3, win.y + win.h + 1, win.w + 6, 2, RAMP.teal[5]);
    rect(p, win.x, win.y, win.w, win.h, RAMP.teal[5]);
    dither(p, win.x, win.y + R(win.h * 0.55), win.w, R(win.h * 0.45), RAMP.teal[5], RAMP.teal[6], 0.5);
    // outside: sun + leaves falling past the glass
    p.save();
    p.beginPath(); p.rect(win.x, win.y, win.w, win.h); p.clip();
    sun(p, win.x + win.w - 14, win.y + 13, 5, { t, rays: true });
    cloud(p, win.x + 2 + (R(tq * 2) % 12), win.y + 24, { kind: 'small' });
    leaves(p, t, { x: win.x - 4, y: win.y - 6, w: win.w + 8, h: win.h + 12, count: 6, seed: 41, wind: 8, speed: 12 });
    p.restore();
    // window muntins
    vline(p, win.x + R(win.w / 2), win.y, win.y + win.h - 1, RAMP.teal[3]);
    hline(p, win.x, win.x + win.w - 1, win.y + R(win.h / 2), RAMP.teal[3]);

    drawRig(p, fmt, PW, PH);
    // pumpkin on top of the monitor (October touch)
    pumpkin(p, G.mx + 22, G.my, { size: 2 });

    // ---------------- screen
    const sx = G.mx + G.sx, sy = G.my + G.sy, sw = G.sw, sh = G.sh;
    const tOn = B(0);
    const onK = t - tOn;
    const clear = B(2);
    const ready = B(3.5);
    p.save();
    p.beginPath(); p.rect(sx, sy, sw, sh); p.clip();
    if (onK < 0) {
      rect(p, sx, sy, sw, sh, SCR.off);
    } else {
      const f = Math.floor(onTwos(onK) * 15 + 1e-6);
      rect(p, sx, sy, sw, sh, SCR.bg);
      for (let yy = sy + 1; yy < sy + sh; yy += 2) hline(p, sx, sx + sw - 1, yy, SCR.scan);
      if (f === 0) {
        hline(p, sx + 6, sx + sw - 7, sy + (sh >> 1), SCR.hot);
      } else if (f === 1) {
        rect(p, sx + 2, sy + (sh >> 1) - 2, sw - 4, 5, SCR.txt);
        hline(p, sx, sx + sw - 1, sy + (sh >> 1), SCR.hot);
      } else if (f === 2) {
        dither(p, sx, sy, sw, sh, SCR.bg, SCR.txt, 0.5);
      } else if (t < clear) {
        // BIOS lines, one per 3/8 beat, typed fast
        const lines = bios(F);
        const lh = 11;
        const x0 = sx + 6, y0 = sy + 7;
        const FT = { font: 'small' };
        lines.forEach((ln, i) => {
          const t0 = B(0.3 + i * 0.36);
          if (t < t0) return;
          const n = Math.min(ln.s.length, Math.floor(onTwos(t - t0) * 90) + 1);
          const str = ln.s.slice(0, n);
          pixelText(p, str, x0, y0 + i * lh, ln.col || SCR.txt, FT);
          if (ln.ok && n >= ln.s.length && t > t0 + 0.12) pixelText(p, 'OK', x0 + pixelTextWidth(ln.s + ' ', FT) + 1, y0 + i * lh, C.gold, FT);
          // cursor on the active line
          const last = i === lines.length - 1 || t < B(0.3 + (i + 1) * 0.36);
          if (last && frameIndex(t, 6, 2) === 0) rect(p, x0 + pixelTextWidth(str, FT) + 2, y0 + i * lh, 5, 7, SCR.hot);
        });
      } else {
        // boot splash: lighthouse logo + HAMPTON.EXE + stepped progress bar
        const k = t - clear;
        const lx = sx + (sw >> 1), ly = sy + Math.max(6, R((sh - 70) / 2));
        const rows = Math.min(LOGO.h, Math.floor(onTwos(k) * 15 * 9) + 1);   // scan-in from the top, 3 frames
        p.save(); p.beginPath(); p.rect(lx - 8, ly, 16, rows); p.clip();
        drawSprite(p, LOGO, lx, ly, { anchor: 'tc' });
        p.restore();
        const isReady = t >= ready;
        const lantern = { x: lx, y: ly + LANTERN_Y };
        if (isReady) {
          // twin beams: flat gold core + dithered wedge, sweeping out from the lantern on twos
          const kk = onTwos(t - ready);
          const len = Math.min((sw >> 1) - 2, 8 + R(kk * 220));
          for (const sgn of [-1, 1]) for (let i = 5; i < len; i++) {
            const half = Math.floor(i * 0.09);
            const X = lx + sgn * i;
            if (half > 0) dither(p, X, lantern.y - half, 1, half * 2 + 1, null, C.gold, i < 24 ? 0.5 : 0.25);
            px(p, X, lantern.y, C.gold);
          }
          drawSprite(p, LOGO, lx, ly, { anchor: 'tc' });
        }
        const ty = ly + LOGO.h + 5;
        if (k > 0.08) pixelText(p, 'HAMPTON.EXE', lx, ty, SCR.hot, { font: 'small', align: 'center' });
        // progress bar: 12 cells filling between clear+1/4 beat and beat 3.5
        const bw = 76, bx = lx - (bw >> 1), by = ty + 11;
        frameRect(p, bx, by, bw, 7, SCR.txt);
        const cells = 12, cw = Math.floor((bw - 4) / cells);
        const prog = clamp((t - B(2.25)) / Math.max(0.05, ready - B(2.25)));
        const nOn = Math.floor(prog * cells + 1e-6);
        for (let i = 0; i < nOn; i++) rect(p, bx + 2 + i * cw, by + 2, cw - 1, 3, i === nOn - 1 && !isReady ? SCR.hot : SCR.txt);
        if (isReady && frameIndex(t - ready, 5, 2) === 0) pixelText(p, 'READY', lx, by + 11, C.gold, { font: 'tiny', align: 'center' });
        else if (!isReady) pixelText(p, `${Math.floor(prog * 100)}%`, lx, by + 11, SCR.txt, { font: 'tiny', align: 'center' });
      }
      // glass glare (static, upper-left), on top of everything on screen
      for (let i = 0; i < 6; i++) px(p, sx + 3 + i, sy + 2 + (5 - i), SCR.scan === SCR.bg ? SCR.txt : RAMP.teal[3]);
    }
    if (onK < 0) for (let i = 0; i < 8; i++) px(p, sx + 3 + i, sy + 2 + (7 - i), SCR.offHi);
    p.restore();
    // rounded screen corners
    for (const [cx, cy] of [[sx, sy], [sx + sw - 1, sy], [sx, sy + sh - 1], [sx + sw - 1, sy + sh - 1]]) px(p, cx, cy, CASE.dk);
    // power LED: dark until the downbeat, then gold (blinks while the drive "seeks")
    const led = { x: G.mx + G.sx + G.sw - 22, y: G.my + G.sy + G.sh + 6 };
    const ledOn = onK >= 0 && !(t < clear && frameIndex(t, 7.5, 3) === 0 && onK > 0.2);
    rect(p, led.x, led.y, 3, 2, ledOn ? C.gold : CASE.dk);
    if (ledOn) px(p, led.x, led.y, RAMP.glow[4]);
    // keys flicking down while the BIOS types (deterministic per frame, on twos)
    if (t > B(0.3) && t < B(2)) {
      const k = G.kb, fi = Math.floor(onTwos(t) * 15);
      const nk = Math.floor((k.w - 6) / 5);
      for (let j = 0; j < 2; j++) {
        const r = Math.floor(hash(fi, j, 5) * 3), i = Math.floor(hash(fi, j + 9, 5) * (nk - 1));
        const kx = k.x + 3 + i * 5 + (r % 2) * 2, ky = k.y + 2 + r * 4;
        if (kx + 4 <= k.x + k.w - 2) { rect(p, kx, ky, 4, 3, CASE.sh); rect(p, kx, ky + 1, 4, 2, CASE.base); }
      }
    }

    // sparkles when READY
    if (t >= ready) {
      const sx0 = v ? G.mx + 14 : G.mx - 6, sx1 = v ? G.mx + G.mw - 12 : G.mx + G.mw + 7;
      sparkle(p, sx0, G.my - 8, t, ready, { size: 2 });
      sparkle(p, sx1, G.my + (v ? -10 : 30), t, ready + 0.05, { size: 2, color: C.sky });
      sparkle(p, G.mx + G.mw - 30, G.my - 5, t, ready + 0.1, { size: 1 });
    }

    // ---------------- type: the event format, typed like a terminal line, lands on beat 2 of the line
    const s = c.safe;
    const words = F.eyebrow.split(' ');                    // COMMUNITY / HACK DAY
    const l1 = words[0], l2 = words.slice(1).join(' ');
    const size = v ? 58 : 64;
    const cap = capRatio(hi, 'mono') * size;
    const ex = v ? s.x0 : 96;
    const ey = v ? 290 : 520;
    const cps = Math.max(24, (l1.length + l2.length) / Math.max(0.2, B(3) - B(2)));
    typeText(hi, t, B(2), l1, ex, ey + cap, { size, tracking: 0.08, cps, cursor: false, color: C.cream });
    typeText(hi, t, B(2) + l1.length / cps, l2, ex, ey + cap * 2 + size * 0.5, { size, tracking: 0.08, cps, cursor: true, color: C.sky });
  },
};
