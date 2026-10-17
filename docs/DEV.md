# DEV: building scenes for the hype video

Read `docs/BRIEF.md` (facts, lyrics, clip table) and `docs/STYLE.md` (the look) first. This file is the API.

## Quick start

```bash
# look at the reference (the key art, alive) + the world-piece gallery
node tools/stills.mjs --scene style-ref --fmt both --dur 8 --times 6
node tools/stills.mjs --scene world-kit --fmt both --times 1.3

# iterate on YOUR scene (stills + contact sheets; never full renders while iterating)
node tools/stills.mjs --scene calendar --fmt both --n 4                 # 4 evenly spaced stills, real cue timing
node tools/stills.mjs --clip C05 --fmt 9x16 --times 0.05,0.6,1.8         # exact clip times
node tools/contact.mjs --clip C05 --fmt 16x9 --n 12                      # labeled grid (one PNG)
node tools/contact.mjs --scene calendar --fmt 9x16 --n 8 --dur 1.4       # forced duration (0.6x)
node tools/stills.mjs --clip C05 --fmt both --n 3 --dur-scale 1.8        # whole song map stretched 1.8x
```
Stills go to `previews/stills/` (override with `--out dir`); contact sheets to `previews/contact-*.png`. The tools print
the paths; **open the PNGs and look at them**.

Other commands:
```bash
node tools/render.mjs --fmt 16x9 --audio assets/audio/scratch-102bpm.wav    # renders/full_16x9.mp4 (~65 s)
node tools/render.mjs --fmt 9x16 --audio assets/audio/scratch-102bpm.wav    # renders/social_9x16.mp4 (audio spliced)
node tools/render.mjs --fmt 16x9 --from 37.6 --to 47.1 --out renders/ch1.mp4 # partial (edit output seconds)
node tools/contact.mjs --fmt 16x9 --n 48                                    # whole-edit contact sheet
python3 tools/song-map.py              # rebuild content/song-map.json + lyrics.json (placeholder grid, 102 BPM)
python3 tools/scratch-audio.py         # rebuild assets/audio/scratch-102bpm.wav from the song map
node tools/make-qr.mjs                 # content/qr-mlh.json (module matrix) + assets/img/qr-mlh.png
node tools/preview.mjs                 # http://127.0.0.1:8757/index.html?preview=1&fmt=16x9&audio=... scrubber
```
render options: `--workers 4 --crf 16 --preset medium --dur-scale k --keep-frames --chunk 15`.

## Files

```
index.html            @font-face (assets/fonts) + <canvas id=out> + lib/engine.js
lib/engine.js         boot, clip resolution, compositing, transitions, overlays, edits, window API   (Foundation)
lib/palette.js        C tokens, RAMP ramps, SKY presets, TOD prop colors, mix/rgba
lib/motion.js         easings, tween, rng/hash, beat helpers, stamp/pop/squash/shake, quantize
lib/pixel.js          low-res drawing: rect/line/disc/poly/dither/bands, sprites, pixel fonts
lib/text.js           full-res type + motifs: text/display/cond/mono/eyebrow, anim, chip/bars/stairs/plus/panel, lockup
lib/world.js          world pieces: sky, stars, water, lighthouse, beam, headland, house, trees, clouds, gulls, people...
scenes/<id>.js        one module per scene id (stubs until owners replace them); scenes/_<owner>-*.js helpers
scenes/style-ref.js   key-art reference (variant 1 day, variant 2 night)    scenes/world-kit.js  piece gallery
content/*.json        facts, lyrics, song-map, timeline, qr-mlh
tools/                stills, contact, render, preview, song-map.py, scratch-audio.py, make-qr
```
`lib/` is owned by Foundation: don't edit it. Need something else? Put it in `scenes/_<owner>-<name>.js`.

## Scene contract

```js
// scenes/calendar.js
import { C, RAMP } from '../lib/palette.js';
import { tween, ease, onTwos } from '../lib/motion.js';
import { rect, sprite, drawSprite, pixelText } from '../lib/pixel.js';
import { chip, anim } from '../lib/text.js';
import { leaves } from '../lib/world.js';

export default {
  id: 'calendar',
  assets: [],                 // optional: image paths to preload, then c.img(path)
  async setup({ facts }) {},  // optional, once at boot (precompute; must be deterministic)
  draw(g, t, c) {
    const L = c.lines['v1.1'];                       // {start, end} relative to clip start
    const beat0 = c.beats.find((b) => b >= 0);        // first beat in the clip
    leaves(g.px, t, { count: 12 });
    anim(g.hi, t, { t0: L.start + 0.59, t1: c.dur, x: c.safe.cx, y: c.safe.y1 - 80, enter: 'stamp' },
      (h) => chip(h, `${c.facts.date.weekdayShort} ${c.facts.date.numeric}`, c.safe.cx, c.safe.y1 - 80, { size: c.type.label, align: 'center' }));
  },
};
```

### `g` (graphics)
| field | meaning |
|---|---|
| `g.px` | 2D context of the low-res pixel canvas (320x180 / 180x320). **Cleared to `C.teal` each frame.** smoothing off |
| `g.hi` | 2D context of the full-res type canvas (1920x1080 / 1080x1920), cleared (transparent) each frame, drawn ABOVE `g.px` |
| `g.PW, g.PH` | pixel canvas size; `g.W, g.H` output size; `g.P` = 6 |
| `g.fmt` | `'16x9'` or `'9x16'` |
| `g.shake` | `{x, y}` in PIXEL units; set it (e.g. `Object.assign(g.shake, shake(t, hit))`) to shake the whole frame |

### `t`
Seconds since clip start, `0 <= t < c.dur`. During an incoming transition (stair / dither wipe into your clip) the
engine renders your clip at **t = 0** (held), so your first frame should already look like a composed background.

### `c` (clip context)
| field | meaning |
|---|---|
| `c.id, c.scene, c.variant` | clip id (`'C12'`, or `'SCENE'` when rendered standalone), scene id, `1` or `2` (chorus 2 = night/bigger) |
| `c.fmt` | `'16x9'` / `'9x16'` |
| `c.dur` | clip duration (s). Real song timing will differ: design for **0.6x-1.8x** |
| `c.lines` | `{ [cueId]: {start, end} }` cues overlapping this clip, relative to clip start (e.g. `c.lines['v1.3']`) |
| `c.hits` | `{ [cueId]: [t, ...] }` chant / shout hits relative to clip start (`i.1`, `br.3`, `br.4`, `out.3`, `ch.1`/`ch.5` "Hey!", `ch.7` fork/train/ship/show, `br.2` ready/set/go) |
| `c.hitTimes(id)` / `c.cue(id)` | same, null-safe |
| `c.beats`, `c.bars` | beat / downbeat times relative to clip start, including 8 before and after the clip (negatives allowed) |
| `c.beat(t)`, `c.bar(t)` | `{ index, phase, t0, t1, len }` (index into c.beats / c.bars; phase 0..1) |
| `c.pulse(t, decay=.25)` | 1 on each beat, exponential decay; `c.barPulse(t, decay=.4)` on downbeats |
| `c.safe` | text-safe rect `{x0,y0,x1,y1,w,h,cx,cy}` for this fmt, **minus engine overlays** (9:16 chorus: info strip) |
| `c.type` | type scale for the fmt (`hero, display, title, label, info, eyebrow, small`) |
| `c.facts`, `c.lyrics`, `c.song` | content JSON (song map is the scaled one) |
| `c.rng(seed)` | deterministic PRNG: `.next() .range(a,b) .int(a,b) .pick(arr) .chance(p) .sign()` |
| `c.img(path)` | preloaded image (declare it in `assets`) |
| `c.overlays` | engine overlay ids active on this clip (e.g. `['info-strip']`) |
| `c.edit` | `'full'`, `'social'` or `null` (standalone) |

### Rules
- Deterministic: no `Math.random`, `Date`, `performance.now`, timers, or state carried between frames (caches of
  static art are fine). A frame depends only on (fmt, t, c).
- Key timing on `c.lines`, `c.hits`, `c.beats`, never fixed seconds. Entry animation lands in the first ~0.4 s (on the
  first beat); readable hold; still fine if cut early; works for 0.6x-1.8x durations.
- Both formats are real compositions: branch on `c.fmt` and lay out with `c.safe`.
- All assets local; images via `assets` + `c.img()`; fonts are already loaded.
- Cache static art: `world.cached(key, w, h, (ctx) => ...)` returns an offscreen canvas built once. Per-frame cost
  budget ~10 ms: avoid tens of thousands of `fillRect`s per frame.

## Song map, cues, edits

- `content/song-map.json` (built by `tools/song-map.py`): `bpm`, `duration`, `beats[]`, `bars[]`, `sections[]`
  `{id,start,end,bar,bars}`, `order[]`, `lines{id:{start,end,bar,bars,section}}`, `hits{id:[t]}`. Cue ids are the lyric
  ids from BRIEF section 2 plus `cold` (bars 0-3) and `tail` (bars 48-49). Cues tile the whole song.
  Regenerate from the real track: `--beats measured.txt [--first-downbeat N] [--duration s]` or
  `--line-times measured.json`. Every clip is bound to cue ids, so nothing else changes.
- `content/timeline.json`: `clips[]` `{id, scene, from, to, variant, in?}` (C01-C31 per BRIEF section 5; C26-C30 reuse
  C12-C16's scenes with variant 2); `in` = transition into the clip: `{type:'stair'|'dither', beats}` (played over the
  previous clip's last beats). `edits.full` (16:9, whole song) and `edits.social` (9:16, song ranges
  `[i.1..i.3] + [ch.1..ch.8] + [out.1..end]` = ~42 s, per BRIEF section 4; `splice` per junction: cut into the
  chorus drop, stair wipe into the end card). `overlays[]`: the 9:16 info strip over ch.1-ch.8 in the social edit.
- Output time T of an edit maps to song time s through the ranges; the render tool splices the audio the same way.

## Library reference

### palette.js
`C` tokens · `RAMP.{teal,water,foliage,stone,tower,roof,iron,glow,house,window,cloud,autumn,skin,hair,ink}` ·
`SKY.{night,predawn,dawn,day,dusk}` · `TOD.{day,dawn,dusk,night}` · `hexToRgb(hex)` · `rgbToHex([r,g,b])` ·
`mix(a,b,k)` (hi layer / fades only) · `rgba(hex,a)`

### motion.js
- math: `clamp(v,lo=0,hi=1)`, `lerp(a,b,k)`, `invLerp(a,b,v)`, `remap(v,a,b,c,d,clamp=true)`, `smoothstep(a,b,v)`,
  `ip(v)` (round to int pixel), `snap(v,P=6)` (grid-snap device px), `fract`, `mod(a,n)`
- `ease.{linear,inQuad,outQuad,inOutQuad,inCubic,outCubic,inOutCubic,inQuart,outQuart,inExpo,outExpo,inBack,outBack,outElastic,outBounce}`, `ease.steps(n)`
- `tween(t,t0,dur,fn)` → 0..1 · `tweenTo(t,t0,dur,a,b,fn)`
- `quantize(t,fps=15)`, `onTwos(t)`, `onThrees(t)`, `frameIndex(t,fps,n)` (looping sprite frame)
- `rng(seed)`, `hash(x,y=0,seed=0)` → [0,1), `hashStr(s)`
- beats: `locate(times,t)` → `{index,phase,t0,t1,len}`, `pulse(times,t,decay)`, `countPassed(times,t)`, `since(times,t)`
- curves: `stamp(t,t0)` → `{scale,alpha,visible}`, `pop(t,t0,dur)`, `squash(t,t0,amt,dur)` → `{sx,sy}`,
  `shake(t,t0,amp=3,dur=.3,seed)` → `{x,y}` ints, `wave(t,period,phase)`
- constants `FPS=30`, `SPRITE_FPS=15`

### pixel.js (all on `g.px`, integer coords)
- `makeCanvas(w,h)` → `{canvas,ctx}` (offscreen, smoothing off)
- `px(ctx,x,y,col)`, `rect(ctx,x,y,w,h,col)`, `frame(ctx,x,y,w,h,col)` (1px outline), `hline(ctx,x0,x1,y,col)`,
  `vline(ctx,x,y0,y1,col)`, `line(ctx,x0,y0,x1,y1,col)` (Bresenham), `disc(ctx,cx,cy,r,col)`, `circle(ctx,cx,cy,r,col)`,
  `ellipse(ctx,cx,cy,rx,ry,col,fill=true)`, `poly(ctx,[[x,y]...],col)`, `tri(ctx,x0,y0,x1,y1,x2,y2,col)`
- `dither(ctx,x,y,w,h,colA|null,colB,level,{size:4|2,ox,oy})` (Bayer; colA null = transparent), `checker(...)`,
  `bayer(x,y,size)` threshold, `bands(ctx,x,y,w,h,colors[],{blend:2,stops})` banded gradient w/ dithered seams
- sprites: `sprite(rows[], map{char:col})` → `{w,h,canvas}` ('.'/' ' transparent), `drawSprite(ctx,spr,x,y,{flipX,flipY,scale,anchor:'tl'|'tc'|'tr'|'cl'|'c'|'cr'|'bl'|'bc'|'br',alpha})`,
  `recolor(spr,{char:col})`, `silhouette(spr,col)`, `outline(spr,col)` (+2px), `blit(ctx,canvas,x,y)`
- `shadow(ctx,cx,y,w,{color,level,h})` dithered ground shadow
- pixel fonts (in-world signage, screens): `pixelText(ctx,str,x,y,col,{font:'tiny'(3x5)|'small'(5x7),scale,align,spacing,shadow:col})` → width,
  `pixelTextWidth(str,{font,spacing,scale})`. Uppercase only; digits + common punctuation incl. `< > / { } [ ] : . - + = ! ? # % * & @ | · ×`

### text.js (all on `g.hi`, device px)
- constants: `FAMILY`, `WEIGHT`, `TRACK`, `TYPE[fmt]`, `SAFE[fmt]`, `safe(fmt)`, `P=6`, `REQUIRED_FONTS`
- `text(ctx,str,x,y,{role:'display'|'cond'|'condTight'|'mono',size,weight,color,alpha,align:'left'|'center'|'right',baseline:'alphabetic'|'cap-top'|'cap-middle'|'top'|'bottom',tracking(em),shadow:true|{dx,dy,color},scale,rotate})` → cap box `{x0,y0,x1,y1,w,h,baseline}`
- `display(...)`, `cond(...)` (uppercases), `mono(...)`, `eyebrow(ctx,str,x,y,{size})` (mono caps, wide tracking)
- measuring: `measure(ctx,str,{role,size,weight,tracking})` → `{w,cap,asc,desc}`, `textBox(ctx,str,x,y,opts)` → `{x0,y0,x1,y1,w,h,cx,cy}`,
  `fitSize(ctx,str,maxW,{role,maxSize,minSize})`, `capRatio(ctx,role,weight)`, `font(role,size,weight)`
- animation: `anim(ctx,t,{t0,t1,x,y,enter:'cut'|'stamp'|'pop'|'fade'|'slide-left|right|up|down',exit:'cut'|'shrink'|'drop'|'fade'|'slide-*',dist,dur},(ctx)=>draw)`
  wraps ANY drawing (chips, panels, lockups); `stampText(ctx,t,t0,str,x,y,opts)`, `slideText(...{from,dist,dur})`,
  `popText(...)`, `typeText(ctx,t,t0,str,x,y,{cps:28,cursor:true,...})` (terminal type-on). All accept `t1` + `exit`.
- motifs: `chip(ctx,str,x,y,{size:44,align,padX,padY,minW,color,textColor})` (y = vertical centre) → rect,
  `bars(ctx,x,y,h,{n:3,barW,gap,grow})`, `stairs(ctx,x,y,{cell:30,n:3,dir:'dl'|'dr'|'ul'|'ur',color,show})`,
  `corners(ctx,fmt,{show,showRight,right,y})`, `plus(ctx,x,y,{cell:12,scale,color})`,
  `panel(ctx,x,y,w,h,{radius:24,fill,stroke,lineWidth:6})`,
  `titleLockup(ctx,x,y,{size,align,lines:[b,b,b],texts,t,t0,stagger,t1,enter,exit})` (y = top of line-1 caps),
  `infoBlock(ctx,x,y,{size,lines,grow})`, `infoStrip(ctx,fmt,str,y)` (engine uses it), `flash(ctx,W,H,alpha,color)`

### world.js (all on `g.px`; (x, base) = centre / ground row; tod = 'night'|'dawn'|'day'|'dusk')
- `sky(ctx,{tod,x,y,w,h,blend,to,k})` banded sky; `to`+`k` dithers toward a second preset (sunrise: night→dawn→day)
- `stars(ctx,t,{x,y,w,h,count,seed,big,show})` twinkling; `show` <1 thins them out
- `water(ctx,t,{x,y,w,h,tod,seed,fade:'left'|'right'|'both'|'none',fadeW,speed,cell,glints:[{x,color,w}],foam})` key-art streak water.
  Draw it BEFORE the headland / boats.
- `lighthouse(ctx,x,base,{h:104,t,tod,glow,beam,beamAngle,beamLen,beamStrength,halo,flare})` → `{lantern:{x,y},top,base,w,h,geo}`
- `beam(ctx,x,y,angle,{len,spread,strength,twin,tod})` banded additive light; `haloDisc(ctx,cx,cy,r,color,level)` dithered glow
- `headland(ctx,x,base,{t,tod,h,glow,beam,...})` the whole key-art vignette (lighthouse + house + trees + bushes +
  fort wall + grass + seawall); footprint x-56…x+64 (scaled by h/104); returns lighthouse anchors + `waterY`.
  16:9 key-art placement: `water(... {x:160, y:131, fade:'left', fadeW:64})` then `headland(g.px, 258, 124, ...)`.
- props: `house(ctx,x,base,{w,h,tod,lit,flip})`, `seawall(ctx,x,y,w,h,{tod,seed})`, `fortWall(ctx,x,base,{w,h,tod})`,
  `bush(ctx,cx,base,{w,h,seed,tod})`, `tree(ctx,cx,base,{w,h,seed,tod})`, `grass(ctx,x,y,w,h,{tod,seed})`,
  `pumpkin(ctx,x,base,{size:1|2})`
- sky things: `cloud(ctx,x,y,{kind:'big'|'twoTone'|'small'|'wisp',tod,scale,flip})`, `gull(ctx,x,y,t,{tod,rate,phase,flip,color})`,
  `sun(ctx,x,y,r,{t,rays})`, `moon(ctx,x,y,r,{phase,halo})`
- fx: `leaves(ctx,t,{x,y,w,h,count,seed,wind,speed})`, `sparkle(ctx,x,y,t,t0,{color,size,dur})`, `plusPx(ctx,x,y,{color,arm})`,
  `burst(ctx,x,y,k,{n,speed,gravity,colors,seed,life})` (k = seconds since burst: pixel dust / fireworks)
- people: `person(ctx,x,base,{t,pose:'stand'|'walk'|'wave'|'cheer'|'type',seed,skin:0-5,hair:0-5,style:'short'|'long'|'bun'|'curly'|'cap'|'bald',top,pants,flip})`
  9x16 chibi builders; `seed` picks a stable random look (inclusive skin tones).
- `cached(key,w,h,drawFn)` offscreen cache for your own static art; `lighthouseGeo(h)`

### engine (window API, for tools / console)
`await window.engineReady` · `renderFrame(fmtOrEdit, frameIndex)` · `renderAt(fmtOrEdit, seconds)` (fmt `'16x9'` → edit
`full`, `'9x16'` → `social`) · `engine.renderClip(fmt, clipId, t)` · `engine.renderScene(fmt, sceneId, t, {dur, variant})` ·
`engine.grab()` → PNG dataURL · `engine.info()` · `engine.songTime(edit, T)` · `engine.setDurScale(k)`.
URL params on index.html: `?durScale=1.4`, `?fmt=9x16&t=12.3`, `?preview=1&fmt=16x9&audio=path`.
Boot fails loudly (`window.__error`, tools exit non-zero) if a font is missing or a scene module fails to import; a scene
that throws in `draw()` fails the frame with the scene id, clip and t in the message.

## Testing checklist (per scene)
1. `node tools/contact.mjs --clip <Cxx> --fmt 16x9 --n 12` and `--fmt 9x16`: look at every frame.
2. Same with `--dur-scale 0.6` and `--dur-scale 1.8` (or `--scene <id> --dur <s>`).
3. Variant 2 scenes: `--clip C26` etc. (or `--scene sea-to-stars --variant 2`).
4. 9:16 chorus clips: `--clip C12 --fmt 9x16` shows the info strip; keep text inside `c.safe`.
5. Compare against `style-ref` side by side: palette, type sizes, pixel density, motion feel.
