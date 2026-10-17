#!/usr/bin/env node
// Contact sheet: a labeled grid of frames across a clip, a scene, or a whole edit -> one PNG.
//   node tools/contact.mjs --clip C07 --fmt 16x9 --n 12
//   node tools/contact.mjs --scene calendar --fmt 9x16 --n 8 --dur 3.5
//   node tools/contact.mjs --fmt 16x9 --n 48            (whole 'full' edit; 9x16 -> 'social' edit)
//   node tools/contact.mjs --fmt 16x9 --from 37 --to 57 --n 24   (edit output-time window)
// Options: --cols C (default 4 for 16x9, 6 for 9x16)  --thumb W (thumb width px, default 480 / 270)
//          --dur-scale k  --variant v  --out file.png (default previews/contact-<label>.png)
import fs from 'node:fs';
import path from 'node:path';
import { openEngine, parseArgs, dataUrlToBuffer, ROOT } from './lib/browser.mjs';

const a = parseArgs();
const fmt = a.fmt && a.fmt !== true ? a.fmt : '16x9';
const durScale = parseFloat(a['dur-scale'] || '1');
const eng = await openEngine({ durScale });
const { page } = eng;
try {
  const info = await page.evaluate(() => window.engine.info());
  let jobs, label;
  if (a.scene) {
    const clip = info.clips.find((c) => c.scene === a.scene && (!a.variant || c.variant === +a.variant));
    const dur = a.dur ? parseFloat(a.dur) : clip ? clip.dur : 8;
    const n = parseInt(a.n || '12', 10);
    label = `${a.scene}${a.variant ? '-v' + a.variant : ''}_${fmt}`;
    jobs = spread(0, dur, n).map((t) => ({ kind: 'scene', fmt, id: a.scene, t, dur, variant: a.variant ? +a.variant : undefined }));
  } else if (a.clip) {
    const clip = info.clips.find((c) => c.id === a.clip);
    if (!clip) throw new Error('unknown clip ' + a.clip);
    const n = parseInt(a.n || '12', 10);
    label = `${clip.id}-${clip.scene}_${fmt}`;
    jobs = spread(0, clip.dur, n).map((t) => ({ kind: 'clip', fmt, id: clip.id, t }));
  } else {
    const edit = a.edit || (fmt === '9x16' ? 'social' : 'full');
    const e = info.edits[edit];
    const n = parseInt(a.n || '48', 10);
    const from = a.from ? parseFloat(a.from) : 0, to = a.to ? parseFloat(a.to) : e.dur;
    label = `edit-${edit}${a.from || a.to ? `_${from}-${to}` : ''}`;
    jobs = spread(from, to, n).map((t) => ({ kind: 'edit', fmt: edit, t }));
  }
  if (durScale !== 1) label += `_x${durScale}`;
  const vertical = jobs[0].fmt === '9x16' || (jobs[0].kind === 'edit' && info.edits[jobs[0].fmt].fmt === '9x16');
  const cols = parseInt(a.cols || (vertical ? '6' : '4'), 10);
  const tw = parseInt(a.thumb || (vertical ? '270' : '480'), 10);
  const url = await page.evaluate(async ({ jobs, cols, tw, vertical, label }) => {
    const E = window.engine;
    const th = Math.round(vertical ? (tw * 16) / 9 : (tw * 9) / 16);
    const lab = 34, pad = 8;
    const rows = Math.ceil(jobs.length / cols);
    const sheet = document.createElement('canvas');
    sheet.width = cols * (tw + pad) + pad;
    sheet.height = rows * (th + lab + pad) + pad + 40;
    const s = sheet.getContext('2d');
    s.fillStyle = '#0F2B2A'; s.fillRect(0, 0, sheet.width, sheet.height);
    s.fillStyle = '#F7F7F2'; s.font = '700 22px "JetBrains Mono"'; s.fillText(label, pad, 28);
    const out = document.getElementById('out');
    jobs.forEach((j, i) => {
      const r = j.kind === 'scene' ? E.renderScene(j.fmt, j.id, j.t, { dur: j.dur, variant: j.variant })
        : j.kind === 'clip' ? E.renderClip(j.fmt, j.id, j.t) : E.renderAt(j.fmt, j.t);
      const x = pad + (i % cols) * (tw + pad), y = 40 + pad + Math.floor(i / cols) * (th + lab + pad);
      s.imageSmoothingEnabled = true; s.imageSmoothingQuality = 'high';
      s.drawImage(out, x, y, tw, th);
      s.fillStyle = '#F5C04A'; s.font = '700 15px "JetBrains Mono"';
      const l1 = j.kind === 'edit' ? `${j.t.toFixed(2)}s ${r.clip} ${r.scene}` : `${r.clip || ''} t=${j.t.toFixed(2)}s`;
      const l2 = j.kind === 'edit' ? `cue ${r.cue || '-'} t=${r.t.toFixed(2)}${r.transition ? ' ' + r.transition : ''}` : `${r.scene}${r.cue ? ' cue ' + r.cue : ''}`;
      s.fillText(l1.slice(0, Math.floor(tw / 9)), x, y + th + 15);
      s.fillStyle = '#79AED3'; s.fillText(l2.slice(0, Math.floor(tw / 9)), x, y + th + 31);
    });
    return sheet.toDataURL('image/png');
  }, { jobs, cols, tw, vertical, label });
  const file = path.resolve(ROOT, a.out || `previews/contact-${label}.png`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, dataUrlToBuffer(url));
  console.log(file);
} finally {
  if (eng.logs.length) console.error('browser console:\n' + eng.logs.join('\n'));
  await eng.close();
}

function spread(t0, t1, n) {
  if (n <= 1) return [(t0 + t1) / 2];
  return Array.from({ length: n }, (_, i) => +(t0 + ((i + 0.5) / n) * (t1 - t0)).toFixed(3));
}
