#!/usr/bin/env node
// Render PNG stills.
//   node tools/stills.mjs --scene style-ref --fmt 16x9 --n 4 --dur 8
//   node tools/stills.mjs --clip C07 --fmt 9x16 --times 0.1,1.2,2.5
//   node tools/stills.mjs --fmt 16x9 --times 40,41            (edit output time, 'full' edit for 16x9, 'social' for 9x16)
//   node tools/stills.mjs --fmt both --scene calendar --n 3 --dur-scale 1.5
// Options: --fmt 16x9|9x16|both  --scene id [--dur s] [--variant 1|2]  --clip Cxx  --edit full|social
//          --n N (evenly spaced, default 4)  --times a,b,c (seconds)  --frames i,j (edit frame indices)
//          --dur-scale k (stretch/shrink the whole song map)  --out dir (default previews/stills)
import fs from 'node:fs';
import path from 'node:path';
import { openEngine, parseArgs, dataUrlToBuffer, ROOT } from './lib/browser.mjs';

const a = parseArgs();
const fmts = !a.fmt || a.fmt === true ? ['16x9'] : a.fmt === 'both' ? ['16x9', '9x16'] : [a.fmt];
const durScale = parseFloat(a['dur-scale'] || '1');
const outDir = path.resolve(ROOT, a.out || 'previews/stills');
fs.mkdirSync(outDir, { recursive: true });
const n = parseInt(a.n || '4', 10);

const eng = await openEngine({ durScale });
const { page } = eng;
const info = await page.evaluate(() => window.engine.info());
const written = [];
try {
  for (const fmt of fmts) {
    let jobs = [];
    let label;
    if (a.scene) {
      const clip = info.clips.find((c) => c.scene === a.scene && (!a.variant || c.variant === +a.variant));
      const dur = a.dur ? parseFloat(a.dur) : clip ? clip.dur : 8;
      const times = a.times ? String(a.times).split(',').map(Number) : spread(dur, n);
      label = `${a.scene}${a.variant ? '-v' + a.variant : ''}`;
      jobs = times.map((t) => ({ kind: 'scene', fmt, id: a.scene, t, dur, variant: a.variant ? +a.variant : undefined }));
    } else if (a.clip) {
      const clip = info.clips.find((c) => c.id === a.clip);
      if (!clip) throw new Error('unknown clip ' + a.clip);
      const times = a.times ? String(a.times).split(',').map(Number) : spread(clip.dur, n);
      label = `${clip.id}-${clip.scene}`;
      jobs = times.map((t) => ({ kind: 'clip', fmt, id: clip.id, t }));
    } else {
      const edit = a.edit || (fmt === '9x16' ? 'social' : 'full');
      const e = info.edits[edit];
      label = `edit-${edit}`;
      let times;
      if (a.frames) times = String(a.frames).split(',').map((f) => +f / info.fps);
      else times = a.times ? String(a.times).split(',').map(Number) : spread(e.dur, n);
      jobs = times.map((t) => ({ kind: 'edit', fmt: edit, t }));
    }
    for (const j of jobs) {
      const res = await page.evaluate((j) => {
        const E = window.engine;
        const r = j.kind === 'scene' ? E.renderScene(j.fmt, j.id, j.t, { dur: j.dur, variant: j.variant })
          : j.kind === 'clip' ? E.renderClip(j.fmt, j.id, j.t) : E.renderAt(j.fmt, j.t);
        return { r, url: E.grab() };
      }, j);
      const file = path.join(outDir, `${label}_${fmt}_${String(j.t.toFixed(2)).padStart(6, '0')}s${durScale !== 1 ? '_x' + durScale : ''}.png`);
      fs.writeFileSync(file, dataUrlToBuffer(res.url));
      written.push(file);
      console.log(file, JSON.stringify(res.r));
    }
  }
} finally {
  if (eng.logs.length) console.error('browser console:\n' + eng.logs.join('\n'));
  await eng.close();
}

function spread(dur, n) {
  if (n <= 1) return [dur / 2];
  // evenly spaced, avoiding the exact end (which belongs to the next clip)
  return Array.from({ length: n }, (_, i) => +(((i + 0.5) / n) * dur).toFixed(3));
}
