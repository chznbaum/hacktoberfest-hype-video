// engine.js: boots the page (content, fonts, scenes, assets), resolves clips from the timeline + song map, renders
// frames with two-layer compositing (low-res pixel canvas upscaled x6 nearest-neighbour UNDER a full-res type canvas),
// transitions (cut / stair-step pixel wipe / dither dissolve), engine overlays (9:16 info strip) and edits
// (16:9 "full", 9:16 "social" with song-time ranges spliced on bar boundaries).
//
// Window API (used by tools/*.mjs, also handy from the devtools console):
//   await window.engineReady                     -> resolves when booted (rejects + window.__error on failure)
//   renderFrame(fmtOrEdit, frameIndex)           -> renders an edit frame (fmt '16x9' => edit 'full', '9x16' => 'social')
//   renderAt(fmtOrEdit, seconds)                 -> same, by output time
//   engine.renderClip(fmt, clipId, t)            -> one clip at clip time t (overlays of the default edit apply)
//   engine.renderScene(fmt, sceneId, t, {dur, variant}) -> a scene standalone (uses its first clip's cues, rescaled to dur)
//   engine.grab(type='image/png')                -> dataURL of the output canvas
//   engine.info()                                -> fps, edits (frames/duration), clips (song times), scenes
// URL params: ?durScale=1.4 (stretch/shrink the whole song map), ?fmt=9x16&t=12.3 (render one frame on load),
//             ?preview=1 (interactive scrubber with optional ?audio=path).

import { C } from './palette.js';
import { locate, pulse as pulseFn, rng as rngFn, clamp } from './motion.js';
import { makeCanvas, dither } from './pixel.js';
import { REQUIRED_FONTS, TYPE, safe as safeRect, infoStrip, P as PIX } from './text.js';

const FPS = 30;
const FORMATS = {
  '16x9': { W: 1920, H: 1080, PW: 320, PH: 180, P: 6, edit: 'full' },
  '9x16': { W: 1080, H: 1920, PW: 180, PH: 320, P: 6, edit: 'social' },
};
const STYLE_SCENES = ['style-ref', 'world-kit'];

const S = {
  content: null, song: null, rawSong: null, timeline: null, facts: null, lyrics: null,
  scenes: {}, images: {}, durScale: 1, clips: [], edits: {}, ctxCache: new Map(), bufs: {},
};

// ---------------------------------------------------------------- boot
async function getJSON(path) {
  const r = await fetch(path, { cache: 'no-store' });
  if (!r.ok) throw new Error(`failed to load ${path}: HTTP ${r.status}`);
  return r.json();
}

async function checkFonts() {
  await Promise.all(REQUIRED_FONTS.map((f) => document.fonts.load(f, 'Hacktoberfest 757 •–·×')));
  await document.fonts.ready;
  const missing = REQUIRED_FONTS.filter((f) => !document.fonts.check(f));
  const faces = [...document.fonts];
  const bad = faces.filter((f) => f.status !== 'loaded').map((f) => `${f.family} ${f.weight} (${f.status})`);
  // belt and braces: the real font must measure differently from a generic fallback
  const c = document.createElement('canvas').getContext('2d');
  c.font = '800 100px "Barlow Semi Condensed"'; const a = c.measureText('Hacktoberfest 2026').width;
  c.font = '800 100px sans-serif'; const b = c.measureText('Hacktoberfest 2026').width;
  c.font = '800 100px "JetBrains Mono"'; const m1 = c.measureText('iiiiWWWW').width;
  c.font = '800 100px monospace'; const m2 = c.measureText('iiiiWWWW').width;
  if (missing.length || bad.length || Math.abs(a - b) < 1 || Math.abs(m1 - m2) < 1) {
    throw new Error(`FONTS NOT LOADED: missing=[${missing.join(', ')}] notLoaded=[${bad.join(', ')}] widths=${a}/${b} mono=${m1}/${m2}`);
  }
}

function loadImage(src) {
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => rej(new Error('failed to load image ' + src));
    im.src = src;
  });
}

async function boot() {
  const q = new URLSearchParams(location.search);
  S.durScale = parseFloat(q.get('durScale') || '1') || 1;
  const [facts, lyrics, song, timeline] = await Promise.all([
    getJSON('content/facts.json'), getJSON('content/lyrics.json'), getJSON('content/song-map.json'), getJSON('content/timeline.json'),
  ]);
  S.facts = facts; S.lyrics = lyrics; S.rawSong = song; S.timeline = timeline;
  setDurScale(S.durScale);
  await checkFonts();
  // scenes: every scene referenced by the timeline + the style reference
  const ids = [...new Set([...timeline.clips.map((c) => c.scene), ...STYLE_SCENES])];
  const errors = [];
  await Promise.all(ids.map(async (id) => {
    try {
      const mod = await import(`../scenes/${id}.js`);
      if (!mod.default || typeof mod.default.draw !== 'function') throw new Error('default export must be { id, draw(g, t, c) }');
      S.scenes[id] = mod.default;
    } catch (e) { errors.push(`scene ${id}: ${e && e.stack || e}`); }
  }));
  if (errors.length) throw new Error('SCENE LOAD FAILED\n' + errors.join('\n'));
  // assets declared by scenes: export default { assets: ['assets/img/x.png'], ... }
  const assets = new Set();
  for (const sc of Object.values(S.scenes)) for (const a of sc.assets || []) assets.add(a);
  await Promise.all([...assets].map(async (a) => { S.images[a] = await loadImage(a); }));
  // optional per-scene async setup (precompute caches). Must be deterministic.
  for (const sc of Object.values(S.scenes)) if (typeof sc.setup === 'function') await sc.setup({ facts, images: S.images });
}

// ---------------------------------------------------------------- song / clips / edits
function scaleSong(song, k) {
  if (k === 1) return song;
  const s = JSON.parse(JSON.stringify(song));
  const m = (v) => Math.round(v * k * 10000) / 10000;
  s.duration = m(s.duration); s.beats = s.beats.map(m); s.bars = s.bars.map(m); s.bpm = s.bpm / k;
  for (const sec of s.sections) { sec.start = m(sec.start); sec.end = m(sec.end); }
  for (const id of Object.keys(s.lines)) { s.lines[id].start = m(s.lines[id].start); s.lines[id].end = m(s.lines[id].end); }
  for (const id of Object.keys(s.hits || {})) s.hits[id] = s.hits[id].map(m);
  return s;
}

function cueTime(id, which) {
  if (id === '@start') return 0;
  if (id === '@end') return S.song.duration;
  const l = S.song.lines[id];
  if (!l) throw new Error(`unknown cue id "${id}" (not in song-map lines)`);
  return which === 'end' ? l.end : l.start;
}

function setDurScale(k) {
  S.durScale = k;
  S.song = scaleSong(S.rawSong, k);
  S.ctxCache.clear();
  S.clips = S.timeline.clips.map((c, i) => ({ ...c, index: i, start: cueTime(c.from, 'start'), end: cueTime(c.to, 'end') }));
  S.clips.forEach((c) => { c.dur = c.end - c.start; });
  S.edits = {};
  for (const [name, e] of Object.entries(S.timeline.edits)) {
    let acc = 0;
    const ranges = e.ranges.map(([a, b]) => {
      const s0 = cueTime(a, 'start'), s1 = cueTime(b, 'end');
      const r = { s0, s1, o0: acc, o1: acc + (s1 - s0) };
      acc += s1 - s0;
      return r;
    });
    S.edits[name] = { name, fmt: e.fmt, ranges, dur: acc, frames: Math.ceil(acc * FPS - 1e-6), splice: e.splice || null };
  }
}

function beatLenAt(s) {
  const L = locate(S.song.beats, s);
  return L.len || 60 / (S.song.bpm || 102);
}
function clipAt(s) {
  const cl = S.clips;
  for (let i = cl.length - 1; i >= 0; i--) if (s >= cl[i].start) return cl[i];
  return cl[0];
}
function overlaysAt(editName, s) {
  return (S.timeline.overlays || []).filter((o) => o.edits.includes(editName) && s >= cueTime(o.from, 'start') && s < cueTime(o.to, 'end'));
}
function overlaysForClip(editName, clip) {
  if (!editName) return [];
  return (S.timeline.overlays || []).filter((o) => o.edits.includes(editName) &&
    clip.start < cueTime(o.to, 'end') && clip.end > cueTime(o.from, 'start'));
}
function editContains(editName, s) {
  const e = S.edits[editName];
  return !!e && e.ranges.some((r) => s >= r.s0 && s < r.s1);
}

/** Build the per-clip context `c` handed to scenes (cached). timeScale stretches cue times (renderScene --dur). */
function clipContext(fmt, clip, editName, timeScale = 1) {
  const key = `${fmt}|${clip.id}|${editName}|${timeScale}|${S.durScale}`;
  let c = S.ctxCache.get(key);
  if (c) return c;
  const rel = (v) => (v - clip.start) * timeScale;
  const dur = clip.dur * timeScale;
  const lo = clip.start - 8 * beatLenAt(clip.start), hi = clip.end + 8 * beatLenAt(clip.end);
  const beats = S.song.beats.filter((b) => b >= lo && b <= hi).map(rel);
  const bars = S.song.bars.filter((b) => b >= lo && b <= hi).map(rel);
  const lines = {}, hits = {};
  for (const id of S.song.order) {
    const l = S.song.lines[id];
    if (l.start < clip.end - 1e-6 && l.end > clip.start + 1e-6) {
      lines[id] = { start: rel(l.start), end: rel(l.end) };
      if (S.song.hits && S.song.hits[id]) hits[id] = S.song.hits[id].map(rel);
    }
  }
  const ov = overlaysForClip(editName, clip);
  const sf = safeRect(fmt);
  if (ov.some((o) => o.type === 'info-strip') && fmt === '9x16') { sf.y1 = 1404; sf.h = sf.y1 - sf.y0; sf.cy = (sf.y0 + sf.y1) / 2; }
  c = {
    id: clip.id, clip, scene: clip.scene, fmt, variant: clip.variant || 1, dur, start: clip.start, end: clip.end,
    edit: editName, beats, bars, lines, hits, overlays: ov.map((o) => o.id),
    facts: S.facts, lyrics: S.lyrics, song: S.song, safe: sf, type: TYPE[fmt], P: PIX,
    beat: (t) => locate(beats, t),
    bar: (t) => locate(bars, t),
    pulse: (t, decay = 0.25) => pulseFn(beats, t, decay),
    barPulse: (t, decay = 0.4) => pulseFn(bars, t, decay),
    rng: (seed = 1) => rngFn(seed),
    img: (path) => { const im = S.images[path]; if (!im) throw new Error(`image ${path} not preloaded: add it to your scene's assets[]`); return im; },
    cue: (id) => lines[id] || null,
    hitTimes: (id) => hits[id] || [],
  };
  S.ctxCache.set(key, c);
  return c;
}

function syntheticContext(fmt, sceneId, dur = 8, variant = 1) {
  const spb = 60 / 102;
  const beats = [], bars = [];
  for (let i = -8; i * spb <= dur + 8 * spb; i++) { beats.push(i * spb); if (i % 4 === 0) bars.push(i * spb); }
  const clip = { id: 'SCENE', scene: sceneId, from: null, to: null, variant, start: 0, end: dur, dur };
  return {
    id: 'SCENE', clip, scene: sceneId, fmt, variant, dur, start: 0, end: dur, edit: null, beats, bars, lines: {}, hits: {},
    overlays: [], facts: S.facts, lyrics: S.lyrics, song: S.song, safe: safeRect(fmt), type: TYPE[fmt], P: PIX,
    beat: (t) => locate(beats, t), bar: (t) => locate(bars, t),
    pulse: (t, d = 0.25) => pulseFn(beats, t, d), barPulse: (t, d = 0.4) => pulseFn(bars, t, d),
    rng: (seed = 1) => rngFn(seed), img: (p) => S.images[p], cue: () => null, hitTimes: () => [],
  };
}

// ---------------------------------------------------------------- canvases
function buffers(fmt) {
  if (S.bufs[fmt]) return S.bufs[fmt];
  const F = FORMATS[fmt];
  if (!F) throw new Error(`unknown fmt ${fmt} (use 16x9 or 9x16)`);
  const out = document.getElementById('out');
  const mk = () => {
    const px = makeCanvas(F.PW, F.PH), hi = makeCanvas(F.W, F.H), comp = makeCanvas(F.W, F.H);
    return { px, hi, comp };
  };
  S.bufs[fmt] = { F, out, A: mk(), B: mk(), mask: makeCanvas(F.PW, F.PH), maskHi: makeCanvas(F.W, F.H) };
  return S.bufs[fmt];
}
function prepOut(fmt) {
  const b = buffers(fmt);
  if (b.out.width !== b.F.W || b.out.height !== b.F.H) { b.out.width = b.F.W; b.out.height = b.F.H; }
  return b;
}

/** Render one scene at clip time t into layer set L, then composite to L.comp. Returns the g used. */
function drawScene(fmt, L, sceneId, t, c) {
  const F = FORMATS[fmt];
  const pctx = L.px.ctx, hctx = L.hi.ctx;
  pctx.reset(); pctx.imageSmoothingEnabled = false;
  pctx.fillStyle = C.teal; pctx.fillRect(0, 0, F.PW, F.PH);
  hctx.reset();
  const g = { px: pctx, hi: hctx, PW: F.PW, PH: F.PH, W: F.W, H: F.H, P: F.P, fmt, shake: { x: 0, y: 0 } };
  const scene = S.scenes[sceneId];
  if (!scene) throw new Error(`no scene module "${sceneId}"`);
  try {
    scene.draw(g, Math.max(0, t), c);
  } catch (e) {
    throw new Error(`scene "${sceneId}" (clip ${c.id}, ${fmt}) threw at t=${t.toFixed(3)}: ${e && e.stack || e}`);
  }
  // composite
  const cc = L.comp.ctx;
  cc.reset(); cc.imageSmoothingEnabled = false;
  const sx = Math.round(g.shake.x || 0) * F.P, sy = Math.round(g.shake.y || 0) * F.P;
  if (sx || sy) { cc.fillStyle = C.tealDeep; cc.fillRect(0, 0, F.W, F.H); }
  cc.drawImage(L.px.canvas, sx, sy, F.W, F.H);
  cc.drawImage(L.hi.canvas, sx, sy);
  return g;
}

// ---------------------------------------------------------------- transitions
function drawTransition(b, type, k, edgeColors = true) {
  const F = b.F, out = b.out.getContext('2d');
  const m = b.mask.ctx;
  m.reset(); m.imageSmoothingEnabled = false;
  const cell = 5;
  const cols = Math.ceil(F.PW / cell), rows = Math.ceil(F.PH / cell);
  const front = [];
  if (type === 'dither') {
    dither(m, 0, 0, F.PW, F.PH, null, '#000000', clamp(k));
  } else {
    // stair-step wipe: diagonal staircase of corner-motif cells, top-left -> bottom-right, with coral/sky leading edge
    const n = cols + rows;
    const pos = k * (n + 3);
    m.fillStyle = '#000';
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const d = i + j;
      if (d < pos - 2) m.fillRect(i * cell, j * cell, cell, cell);
      else if (d < pos - 1) front.push([i, j, C.coral]);
      else if (d < pos) front.push([i, j, C.sky]);
    }
  }
  const bc = b.B.comp.ctx;
  bc.save();
  bc.globalCompositeOperation = 'destination-in';
  bc.imageSmoothingEnabled = false;
  bc.drawImage(b.mask.canvas, 0, 0, F.W, F.H);
  bc.restore();
  out.drawImage(b.B.comp.canvas, 0, 0);
  if (edgeColors) for (const [i, j, col] of front) { out.fillStyle = col; out.fillRect(i * cell * F.P, j * cell * F.P, cell * F.P, cell * F.P); }
}

// ---------------------------------------------------------------- overlays
function drawOverlays(fmt, editName, s) {
  const b = buffers(fmt), out = b.out.getContext('2d');
  for (const o of overlaysAt(editName, s)) {
    if (o.type === 'info-strip') {
      const t = s - cueTime(o.from, 'start');
      const tEnd = cueTime(o.to, 'end') - s;
      const k = clamp(Math.min(t, tEnd) / 0.2);
      const y = fmt === '9x16' ? 1452 : 1000;
      const yy = y + Math.round((1 - k) * 8) * PIX * 2;
      if (k > 0) infoStrip(out, fmt, o.text || S.facts.infoStrip, yy, { alpha: k < 1 ? 0.999 : 1 });
    }
  }
}

// ---------------------------------------------------------------- public render functions
function editFor(fmtOrEdit) {
  if (S.edits[fmtOrEdit]) return S.edits[fmtOrEdit];
  const F = FORMATS[fmtOrEdit];
  if (F) return S.edits[F.edit];
  throw new Error(`unknown fmt/edit "${fmtOrEdit}"`);
}

/** Render output time T (seconds) of an edit. Returns frame info. */
function renderAt(fmtOrEdit, T) {
  const e = editFor(fmtOrEdit);
  const fmt = e.fmt;
  const b = prepOut(fmt);
  const out = b.out.getContext('2d');
  T = clamp(T, 0, e.dur - 1e-6);
  let ri = e.ranges.findIndex((r) => T >= r.o0 && T < r.o1);
  if (ri < 0) ri = e.ranges.length - 1;
  const r = e.ranges[ri];
  const s = r.s0 + (T - r.o0);
  const clip = clipAt(s);
  const cA = clipContext(fmt, clip, e.name);
  const info = { edit: e.name, fmt, T, s, clip: clip.id, scene: clip.scene, t: s - clip.start, cue: cueAt(s), transition: null };
  drawScene(fmt, b.A, clip.scene, s - clip.start, cA);
  out.reset();
  out.drawImage(b.A.comp.canvas, 0, 0);
  // clip transition into the next clip (only if both sides are inside this range)
  const next = S.clips[clip.index + 1];
  if (next && next.in && next.in.type && next.in.type !== 'cut') {
    const d = (next.in.beats || 1) * beatLenAt(next.start);
    if (s >= next.start - d && next.start < r.s1 && next.start - d >= r.s0) {
      const k = (s - (next.start - d)) / d;
      drawScene(fmt, b.B, next.scene, 0, clipContext(fmt, next, e.name));
      drawTransition(b, next.in.type, k);
      info.transition = `${next.in.type} ${k.toFixed(2)} -> ${next.id}`;
    }
  }
  // splice transition between edit ranges
  const sp = Array.isArray(e.splice) ? e.splice[ri] : e.splice;
  if (sp && sp.type && sp.type !== 'cut' && ri < e.ranges.length - 1) {
    const nr = e.ranges[ri + 1];
    const d = (sp.beats || 1) * beatLenAt(nr.s0);
    if (T >= r.o1 - d) {
      const k = (T - (r.o1 - d)) / d;
      const nclip = clipAt(nr.s0);
      drawScene(fmt, b.B, nclip.scene, nr.s0 - nclip.start, clipContext(fmt, nclip, e.name));
      drawTransition(b, sp.type, k);
      info.transition = `splice ${sp.type} ${k.toFixed(2)} -> ${nclip.id}`;
    }
  }
  drawOverlays(fmt, e.name, s);
  return info;
}
function cueAt(s) {
  for (const id of S.song.order) { const l = S.song.lines[id]; if (s >= l.start && s < l.end) return id; }
  return null;
}
const renderFrame = (fmtOrEdit, i) => renderAt(fmtOrEdit, i / FPS);

/** Render one clip at clip time t (default edit of fmt for overlays, if the clip is in that edit). */
function renderClip(fmt, clipId, t) {
  const clip = S.clips.find((c) => c.id === clipId);
  if (!clip) throw new Error(`unknown clip ${clipId}`);
  const b = prepOut(fmt);
  const editName = FORMATS[fmt].edit;
  const inEdit = editContains(editName, clip.start + Math.min(t, clip.dur - 1e-3));
  const c = clipContext(fmt, clip, inEdit ? editName : null);
  drawScene(fmt, b.A, clip.scene, t, c);
  const out = b.out.getContext('2d');
  out.reset();
  out.drawImage(b.A.comp.canvas, 0, 0);
  if (inEdit) drawOverlays(fmt, editName, clip.start + t);
  return { fmt, clip: clip.id, scene: clip.scene, t, dur: clip.dur, s: clip.start + t, cue: cueAt(clip.start + t) };
}

/** Render a scene standalone. Uses the first clip with that scene (+variant) rescaled to `dur`, else a synthetic 102 BPM grid. */
function renderScene(fmt, sceneId, t, o = {}) {
  const b = prepOut(fmt);
  const clip = S.clips.find((c) => c.scene === sceneId && (!o.variant || (c.variant || 1) === o.variant));
  let c;
  if (clip) {
    const scale = o.dur ? o.dur / clip.dur : 1;
    c = clipContext(fmt, clip, null, scale);
    if (o.variant && c.variant !== o.variant) c = { ...c, variant: o.variant };
  } else {
    c = syntheticContext(fmt, sceneId, o.dur || 8, o.variant || 1);
  }
  drawScene(fmt, b.A, sceneId, t, c);
  const out = b.out.getContext('2d');
  out.reset();
  out.drawImage(b.A.comp.canvas, 0, 0);
  return { fmt, scene: sceneId, clip: c.id, t, dur: c.dur };
}

function grab(type = 'image/png') { return document.getElementById('out').toDataURL(type); }

function info() {
  return {
    fps: FPS, durScale: S.durScale, formats: FORMATS,
    edits: Object.fromEntries(Object.entries(S.edits).map(([k, e]) => [k, { fmt: e.fmt, dur: e.dur, frames: e.frames, ranges: e.ranges }])),
    clips: S.clips.map((c) => ({ id: c.id, scene: c.scene, variant: c.variant || 1, from: c.from, to: c.to, start: c.start, end: c.end, dur: c.dur, in: c.in || null })),
    scenes: Object.keys(S.scenes),
    song: { duration: S.song.duration, bpm: S.song.bpm, source: S.song.source },
  };
}

/** Map an edit's output time to song time (for audio splicing). */
function songTime(fmtOrEdit, T) {
  const e = editFor(fmtOrEdit);
  const r = e.ranges.find((rr) => T >= rr.o0 && T < rr.o1) || e.ranges[e.ranges.length - 1];
  return r.s0 + (T - r.o0);
}

export const engine = { renderAt, renderFrame, renderClip, renderScene, grab, info, songTime, setDurScale, FORMATS, FPS };

// ---------------------------------------------------------------- preview mode (interactive scrubber)
function startPreview(q) {
  const fmt = q.get('fmt') || '16x9';
  const e = editFor(fmt);
  const out = document.getElementById('out');
  out.style.cssText = 'width:min(100vw,calc(100vh*' + (FORMATS[e.fmt].W / FORMATS[e.fmt].H) + ' - 60px));height:auto;display:block;margin:0 auto';
  const bar = document.createElement('div');
  bar.style.cssText = 'font:14px "JetBrains Mono",monospace;color:#F7F7F2;padding:8px;display:flex;gap:12px;align-items:center';
  bar.innerHTML = `<button id=pp>play</button><input id=sc type=range min=0 max=${e.frames - 1} value=0 style="flex:1"><span id=lb></span>`;
  document.body.appendChild(bar);
  const audio = q.get('audio') ? new Audio(q.get('audio')) : null;
  let playing = false, f = 0, t0 = 0, f0 = 0;
  const sc = bar.querySelector('#sc'), lb = bar.querySelector('#lb');
  const show = () => { const i = renderFrame(e.name, f); lb.textContent = `${(f / FPS).toFixed(2)}s ${i.clip} ${i.scene} ${i.cue || ''}`; sc.value = f; };
  sc.oninput = () => { f = +sc.value; if (audio) audio.currentTime = songTime(e.name, f / FPS); show(); };
  bar.querySelector('#pp').onclick = () => {
    playing = !playing; t0 = performance.now(); f0 = f;
    if (audio) { if (playing) { audio.currentTime = songTime(e.name, f / FPS); audio.play(); } else audio.pause(); }
  };
  const loop = () => {
    if (playing) { f = Math.min(e.frames - 1, f0 + Math.floor(((performance.now() - t0) / 1000) * FPS)); show(); }
    requestAnimationFrame(loop);
  };
  show(); loop();
}

// ---------------------------------------------------------------- start
window.engine = engine;
window.renderFrame = renderFrame;
window.renderAt = renderAt;
window.engineReady = boot().then(() => {
  window.__ready = true;
  const q = new URLSearchParams(location.search);
  if (q.get('preview')) startPreview(q);
  else if (q.get('t')) renderAt(q.get('fmt') || '16x9', parseFloat(q.get('t')));
}).catch((e) => {
  window.__error = String(e && e.stack || e);
  console.error(window.__error);
  document.body.insertAdjacentHTML('beforeend', `<pre style="color:#F07770;white-space:pre-wrap">${window.__error}</pre>`);
  throw e;
});
