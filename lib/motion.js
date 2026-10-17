// motion.js: easings, deterministic randomness, beat/bar helpers, frame quantization. Pure functions, no state.

export const FPS = 30;
export const SPRITE_FPS = 15; // pixel sprites animate "on twos" (or slower)

// ---------- math ----------
export const clamp = (v, lo = 0, hi = 1) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a, b, k) => a + (b - a) * k;
export const invLerp = (a, b, v) => (b === a ? 0 : (v - a) / (b - a));
/** Map v from [a,b] to [c,d], clamped by default. */
export const remap = (v, a, b, c, d, doClamp = true) => {
  const k = invLerp(a, b, v);
  return lerp(c, d, doClamp ? clamp(k) : k);
};
export const smoothstep = (a, b, v) => {
  const k = clamp(invLerp(a, b, v));
  return k * k * (3 - 2 * k);
};
/** Round to an integer pixel (use for every pixel-layer position). */
export const ip = (v) => Math.round(v);
/** Snap a full-res coordinate to the pixel grid (multiples of P=6), so hi-layer motifs line up with pixel art. */
export const snap = (v, P = 6) => Math.round(v / P) * P;
export const fract = (v) => v - Math.floor(v);
export const mod = (a, n) => ((a % n) + n) % n;

// ---------- easings (k in 0..1 -> 0..1, may overshoot for back/elastic) ----------
const c1 = 1.70158, c3 = c1 + 1;
export const ease = {
  linear: (k) => k,
  inQuad: (k) => k * k,
  outQuad: (k) => 1 - (1 - k) * (1 - k),
  inOutQuad: (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2),
  inCubic: (k) => k * k * k,
  outCubic: (k) => 1 - Math.pow(1 - k, 3),
  inOutCubic: (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
  outQuart: (k) => 1 - Math.pow(1 - k, 4),
  inQuart: (k) => k * k * k * k,
  outExpo: (k) => (k >= 1 ? 1 : 1 - Math.pow(2, -10 * k)),
  inExpo: (k) => (k <= 0 ? 0 : Math.pow(2, 10 * k - 10)),
  outBack: (k) => 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2),
  inBack: (k) => c3 * k * k * k - c1 * k * k,
  outElastic: (k) => (k <= 0 ? 0 : k >= 1 ? 1 : Math.pow(2, -10 * k) * Math.sin((k * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1),
  outBounce: (k) => {
    const n1 = 7.5625, d1 = 2.75;
    if (k < 1 / d1) return n1 * k * k;
    if (k < 2 / d1) return n1 * (k -= 1.5 / d1) * k + 0.75;
    if (k < 2.5 / d1) return n1 * (k -= 2.25 / d1) * k + 0.9375;
    return n1 * (k -= 2.625 / d1) * k + 0.984375;
  },
  /** steps(n): hold-frame staircase (pixel-step slides). */
  steps: (n) => (k) => Math.min(1, Math.floor(clamp(k) * n) / (n - 1 || 1)),
};

/**
 * Progress of a tween that starts at t0 and lasts dur, eased. Returns 0 before, 1 after.
 * tween(t, 0.2, 0.3, ease.outBack)
 */
export function tween(t, t0, dur, fn = ease.linear) {
  if (t <= t0) return fn(0);
  if (t >= t0 + dur) return fn(1);
  return fn((t - t0) / dur);
}
/** Like tween() but returns a value between a and b. */
export const tweenTo = (t, t0, dur, a, b, fn) => lerp(a, b, tween(t, t0, dur, fn));

// ---------- frame quantization ----------
/** Quantize time to a frame rate (default 15 fps = "on twos" at 30 fps). */
export const quantize = (t, fps = SPRITE_FPS) => Math.floor(t * fps + 1e-6) / fps;
export const onTwos = (t) => quantize(t, 15);
export const onThrees = (t) => quantize(t, 10);
/** Integer sprite frame index for an animation at `fps` with `n` frames (loops). */
export const frameIndex = (t, fps, n) => mod(Math.floor(t * fps + 1e-6), n);

// ---------- deterministic randomness ----------
/** Seeded PRNG (mulberry32). rng(seed).next() in [0,1). Also .range(a,b), .int(a,b) inclusive, .pick(arr), .chance(p), .sign(). */
export function rng(seed = 1) {
  let s = (typeof seed === 'string' ? hashStr(seed) : seed >>> 0) || 0x9e3779b9;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let x = s;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (a, b) => a + (b - a) * next(),
    int: (a, b) => a + Math.floor(next() * (b - a + 1)),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    chance: (p) => next() < p,
    sign: () => (next() < 0.5 ? -1 : 1),
  };
}
/** 32-bit string hash. */
export function hashStr(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}
/** Stateless hash of integers -> [0,1). hash(x), hash(x,y), hash(x,y,seed). Great for per-pixel / per-item noise. */
export function hash(x, y = 0, seed = 0) {
  let h = Math.imul((x | 0) ^ 0x27d4eb2d, 0x165667b1) ^ Math.imul((y | 0) + 0x3c6ef372, 0x85ebca6b) ^ Math.imul(seed | 0, 0xc2b2ae35);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}

// ---------- beat / bar helpers ----------
/**
 * Locate t within a sorted list of times (beats or bars). Returns { index, phase, t0, t1, len }.
 * index = last time <= t (-1 if before the first); phase = 0..1 progress to the next time.
 */
export function locate(times, t) {
  if (!times || !times.length) return { index: -1, phase: 0, t0: 0, t1: 0, len: 0 };
  let lo = 0, hi = times.length - 1;
  if (t < times[0]) {
    const len = times.length > 1 ? times[1] - times[0] : 0.588;
    return { index: -1, phase: 1 - Math.min(1, (times[0] - t) / len), t0: times[0] - len, t1: times[0], len };
  }
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (times[mid] <= t) lo = mid; else hi = mid - 1;
  }
  const t0 = times[lo];
  const t1 = lo + 1 < times.length ? times[lo + 1] : t0 + (lo > 0 ? t0 - times[lo - 1] : 0.588);
  const len = t1 - t0;
  return { index: lo, phase: len > 0 ? (t - t0) / len : 0, t0, t1, len };
}
/** Beat-synced envelope: 1 exactly on each time in `times`, decaying exponentially (decay = seconds to ~5%). */
export function pulse(times, t, decay = 0.25) {
  const { index, t0 } = locate(times, t);
  if (index < 0) return 0;
  const dt = t - t0;
  return Math.exp((-3 * dt) / decay);
}
/** Index of the most recent time <= t, or -1. */
export const countPassed = (times, t) => locate(times, t).index + 1;
/** Seconds since the most recent time <= t (Infinity if none). */
export function since(times, t) {
  const { index, t0 } = locate(times, t);
  return index < 0 ? Infinity : t - t0;
}

// ---------- canned animation curves ----------
/**
 * Stamp scale for "type stamps in": 1.15 -> 0.97 (2-frame overshoot) -> 1.0. Returns {scale, alpha, visible}.
 * Matches the key-art motion language (BRIEF section 3).
 */
export function stamp(t, t0, { from = 1.15, frames = 4 } = {}) {
  const f = (t - t0) * FPS;
  if (f < 0) return { scale: from, alpha: 0, visible: false };
  if (f >= frames + 2) return { scale: 1, alpha: 1, visible: true };
  const seq = [from, lerp(from, 1, 0.55), 0.97, 0.985, 1.0, 1.0];
  const i = Math.min(seq.length - 1, Math.floor(f * (seq.length - 1) / (frames + 1)));
  return { scale: seq[i], alpha: f < 1 ? 0.85 : 1, visible: true };
}
/** Pop: 0 -> overshoot -> 1 with back easing over dur. */
export const pop = (t, t0, dur = 0.25) => (t < t0 ? 0 : tween(t, t0, dur, ease.outBack));
/** Squash-and-stretch on a beat: returns {sx, sy} that settle back to 1. */
export function squash(t, t0, amt = 0.2, dur = 0.25) {
  if (t < t0 || t > t0 + dur) return { sx: 1, sy: 1 };
  const k = (t - t0) / dur;
  const s = Math.sin(k * Math.PI * 2) * Math.exp(-4 * k) * amt;
  return { sx: 1 + s, sy: 1 - s };
}
/** Damped shake offset (integer pixels) after an impact at t0. */
export function shake(t, t0, amp = 3, dur = 0.3, seed = 7) {
  if (t < t0 || t > t0 + dur) return { x: 0, y: 0 };
  const k = 1 - (t - t0) / dur;
  const f = Math.floor((t - t0) * FPS);
  return { x: Math.round((hash(f, 1, seed) * 2 - 1) * amp * k), y: Math.round((hash(f, 2, seed) * 2 - 1) * amp * k) };
}
/** Sine wave helper: wave(t, period, phase) in -1..1. */
export const wave = (t, period = 1, phase = 0) => Math.sin(((t / period) + phase) * Math.PI * 2);
