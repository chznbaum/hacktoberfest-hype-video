#!/usr/bin/env node
// Full render of an edit: parallel Chromium workers -> PNG frames (in order) -> ffmpeg (H.264 yuv420p 30 fps).
//   node tools/render.mjs --fmt 16x9 --audio assets/audio/scratch-102bpm.wav            -> renders/full_16x9.mp4
//   node tools/render.mjs --fmt 9x16 --audio song.wav                                    -> renders/social_9x16.mp4
//   node tools/render.mjs --fmt 16x9 --from 37.6 --to 42.4 --out renders/chorus-test.mp4
// Options:
//   --fmt 16x9|9x16 (or --edit full|social)   --workers N (default 4)   --from s --to s (edit output seconds)
//   --audio path   (song audio; for the social edit it is spliced per the edit's song-time ranges, 6 ms fades at splices)
//   --crf 16  --preset medium  --out file.mp4  --dur-scale k  --keep-frames (also write PNGs to frames/<edit>/)
//   --chunk 15 (frames per work unit)
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { openEngine, parseArgs, dataUrlToBuffer, ROOT } from './lib/browser.mjs';
import { startServer } from './lib/server.mjs';

const a = parseArgs();
const edit = a.edit || (a.fmt === '9x16' ? 'social' : 'full');
const workers = parseInt(a.workers || '4', 10);
const durScale = parseFloat(a['dur-scale'] || '1');
const crf = String(a.crf || '16');
const preset = a.preset || 'medium';
const chunk = parseInt(a.chunk || '15', 10);

const server = await startServer(ROOT);
const engines = await Promise.all(Array.from({ length: workers }, () => openEngine({ durScale, server })));
const info = await engines[0].page.evaluate(() => window.engine.info());
const E = info.edits[edit];
if (!E) throw new Error('unknown edit ' + edit);
const fps = info.fps;
const f0 = Math.max(0, Math.floor((a.from ? parseFloat(a.from) : 0) * fps + 1e-6));
const f1 = Math.min(E.frames, a.to ? Math.ceil(parseFloat(a.to) * fps - 1e-6) : E.frames);
const total = f1 - f0;
const out = path.resolve(ROOT, a.out || `renders/${edit}_${E.fmt}${a.from || a.to ? `_${(f0 / fps).toFixed(1)}-${(f1 / fps).toFixed(1)}` : ''}.mp4`);
fs.mkdirSync(path.dirname(out), { recursive: true });
const framesDir = a['keep-frames'] ? path.resolve(ROOT, 'frames', edit) : null;
if (framesDir) fs.mkdirSync(framesDir, { recursive: true });

// ---- audio: map the output window to song-time segments
const ffArgs = ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-'];
let audioMap = [];
if (a.audio) {
  const audio = path.resolve(ROOT, a.audio);
  if (!fs.existsSync(audio)) throw new Error('audio not found: ' + audio);
  ffArgs.push('-i', audio);
  const T0 = f0 / fps, T1 = f1 / fps;
  const segs = [];
  for (const r of E.ranges) {
    const o0 = Math.max(r.o0, T0), o1 = Math.min(r.o1, T1);
    if (o1 > o0) segs.push([r.s0 + (o0 - r.o0), r.s0 + (o1 - r.o0)]);
  }
  const parts = segs.map(([s0, s1], i) => {
    const fadeIn = i > 0 ? `,afade=t=in:st=0:d=0.006` : '';
    const fadeOut = i < segs.length - 1 ? `,afade=t=out:st=${(s1 - s0 - 0.006).toFixed(4)}:d=0.006` : '';
    return `[1:a]atrim=start=${s0.toFixed(4)}:end=${s1.toFixed(4)},asetpts=PTS-STARTPTS${fadeIn}${fadeOut}[a${i}]`;
  });
  const filter = parts.join(';') + ';' + segs.map((_, i) => `[a${i}]`).join('') + `concat=n=${segs.length}:v=0:a=1[aout]`;
  ffArgs.push('-filter_complex', filter, '-map', '0:v', '-map', '[aout]', '-c:a', 'aac', '-b:a', '192k');
  audioMap = segs;
}
ffArgs.push('-c:v', 'libx264', '-preset', preset, '-crf', crf, '-pix_fmt', 'yuv420p', '-r', String(fps),
  '-tune', 'animation', '-movflags', '+faststart', '-t', (total / fps).toFixed(4), out);

const ff = spawn('ffmpeg', ffArgs, { stdio: ['pipe', 'inherit', 'inherit'] });
const ffDone = new Promise((res, rej) => ff.on('close', (code) => (code === 0 ? res() : rej(new Error('ffmpeg exited ' + code)))));

// ---- ordered frame writer
const pending = new Map();
let next = f0;
let written = 0;
const t0 = Date.now();
let waiters = [];
async function writeReady() {
  while (pending.has(next)) {
    const buf = pending.get(next);
    pending.delete(next);
    if (framesDir) fs.writeFileSync(path.join(framesDir, String(next).padStart(5, '0') + '.png'), buf);
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    next++; written++;
    if (written % 60 === 0 || next === f1) {
      const el = (Date.now() - t0) / 1000;
      process.stdout.write(`\r${written}/${total} frames  ${(written / el).toFixed(1)} fps  ${el.toFixed(0)}s   `);
    }
  }
  waiters.forEach((w) => w()); waiters = [];
}
let writing = Promise.resolve();
const queue = [];
for (let f = f0; f < f1; f += chunk) queue.push([f, Math.min(f1, f + chunk)]);

async function worker(eng) {
  while (queue.length) {
    const [a0, a1] = queue.shift();
    for (let f = a0; f < a1; f++) {
      // back-pressure: don't run too far ahead of the writer
      while (f - next > chunk * workers * 3) await new Promise((r) => waiters.push(r));
      const url = await eng.page.evaluate(([ed, i]) => { window.renderFrame(ed, i); return window.engine.grab(); }, [edit, f]);
      pending.set(f, dataUrlToBuffer(url));
      writing = writing.then(writeReady);
    }
  }
}
try {
  await Promise.all(engines.map(worker));
  await writing;
  ff.stdin.end();
  await ffDone;
} finally {
  await Promise.all(engines.map((e) => e.close()));
  await server.close();
}
const el = (Date.now() - t0) / 1000;
console.log(`\nwrote ${out}\n${total} frames (${(total / fps).toFixed(2)} s) in ${el.toFixed(1)} s = ${(total / el).toFixed(1)} fps with ${workers} workers` +
  (audioMap.length ? `\naudio segments (song time): ${audioMap.map(([x, y]) => `${x.toFixed(3)}-${y.toFixed(3)}`).join(', ')}` : ''));
