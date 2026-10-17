# STYLE: how "Hacktoberfest 2026 in the 757" looks and moves

The video is the campaign key art (`reference/keyart-2400x1200.png`) come alive: **a crisp pixel-art world under
big smooth typography**. Before you draw anything, render the reference and keep it open:

```bash
node tools/stills.mjs --scene style-ref --fmt both --dur 8 --times 6           # day: the key art, both formats
node tools/stills.mjs --scene style-ref --fmt both --dur 8 --times 3 --variant 2  # night version (bridge / ch2)
node tools/stills.mjs --scene world-kit --fmt 16x9 --times 1.3                 # every world piece x time of day
```

Your scene should look like it was cut from the same poster. When in doubt, copy what `scenes/style-ref.js` does.

---

## 1. Two layers, one look

| Layer | Canvas | What goes there | Rules |
|---|---|---|---|
| `g.px` pixel layer | 320x180 (16:9) / 180x320 (9:16), upscaled **x6** nearest-neighbour | the world, objects, characters, icons, in-world signage (pixel font) | integer positions only, no AA, no gradients, no alpha blending (dither/band instead), palette colors only |
| `g.hi` type layer | 1920x1080 / 1080x1920, composited **above** | headlines, labels, chips, motifs (stairs, plus, ||| bars, panels) | smooth fonts; snap motif geometry to the 6 px grid (`snap()`), colors: cream / sky / tealDark-on-coral only |

`P = 6`: one pixel-art pixel = 6x6 device pixels. A 16-px-tall person is 96 device px tall.

## 2. Palette (`lib/palette.js`)

Brand tokens (`C`): never invent hues for type or UI.

| token | hex | use |
|---|---|---|
| `C.teal` | `#285B55` | background (flat, like the key art) |
| `C.tealDark` | `#214D49` | panels, shadows, night tint, chip text |
| `C.tealDeep` | `#173B38` | deepest shadow, night sky base, hard text shadow |
| `C.cream` | `#F7F7F2` | primary type, lighthouse, highlights |
| `C.sky` | `#79AED3` | secondary type ("in the 757"), water highlights, clouds |
| `C.coral` | `#F07770` | chips, ||| bars, roof, corner stairs (accent: use with intent) |
| `C.gold` | `#F5C04A` | sparkles, lantern, sun, stars (**sparingly**) |

Supporting pixel ramps (`RAMP.*`, dark to light, sampled from the key art): `teal`, `water`, `foliage`, `stone`,
`tower`, `roof`, `iron`, `glow`, `house`, `window`, `cloud`, `autumn`, `skin` (6 inclusive tones as
`[shade, base]` pairs), `hair`, `ink`. Index them (`RAMP.water[3]`); don't type new hexes.
Time-of-day prop colors: `TOD.day|dawn|dusk|night` (world.js picks these for you). Sky band presets:
`SKY.night|predawn|dawn|day|dusk` (day is flat teal, on purpose).

Examples:
```js
rect(g.px, 10, 10, 20, 8, RAMP.stone[3]);                       // a stone block
dither(g.px, 0, 120, 320, 4, C.teal, RAMP.water[2], 0.5);       // 50% dither strip
bands(g.px, 0, 0, 320, 120, SKY.dusk, { blend: 2 });             // banded sunset (dithered seams)
```

## 3. Pixel-art craft rules

- **Silhouette first.** Readable at 1x: 1-2 strong shapes per object, dark outline only where it separates from
  the background (use `RAMP.ink` / tealDeep, never pure black).
- **Light from the upper-left** (lit left faces, shaded right faces), like the lighthouse.
- **3-4 tones per material** from one ramp: shadow / base / light / highlight.
- **Dither intentionally**: Bayer 4x4 (`dither()`, `bands()`), for sky transitions, glows (`haloDisc`), shadows.
  Never noisy random speckle across big areas.
- Light/glow = flat banding (`beam()` uses additive flat bands) or sparse dither, never smooth gradients.
- Sprites animate **on twos** (`onTwos(t)`, `frameIndex(t, 15, n)` or slower). Positions are integers (`ip()`).
- October touches are welcome but light: `leaves()`, `pumpkin()`. Playful and warm, never spooky.
- Reuse world pieces (`headland`, `lighthouse`, `water`, `cloud`, `gull`, `person`...) so scenes feel like one world.

## 4. Typography (`lib/text.js`)

Matched against the key art (side-by-side comparison of @fontsource candidates):

| role | font | key-art use | API |
|---|---|---|---|
| display | **Barlow Semi Condensed 800** (900 for extra punch) | "Hacktoberfest / 2026 / in the 757" | `display()`, `titleLockup()`, `text({role:'display'})` |
| cond | **Barlow Semi Condensed 700** (800 for "HOSTED BY") | coral chip, "HOSTED BY" | `chip()`, `cond()` |
| condTight | Barlow Condensed 700/800 | only when a label must be narrower | `text({role:'condTight'})` |
| mono | **JetBrains Mono 800** (700/500 available) | "COMMUNITY HACK DAY", "OCTOBER 17 • 10 AM—4 PM" | `eyebrow()`, `mono()`, `infoBlock()`, `typeText()` |

Type scale (`TYPE[fmt]`, also `c.type`), device px:

| | hero | display | title | label | info | eyebrow | small |
|---|---|---|---|---|---|---|---|
| 16:9 | 232 | 200 | 132 | 50 | 54 | 34 | 30 |
| 9:16 | 178 | 190 | 120 | 50 | 46 | 32 | 30 |

- Colors: `C.cream` primary, `C.sky` secondary, `C.tealDark` on coral chips. Nothing else.
- Casing like the key art: display in **Title/mixed case** ("Hacktoberfest", "in the 757"); chips, eyebrows and labels
  in CAPS; info lines may be mixed case ("757 Makerspace · Hampton").
- Tracking: eyebrow +0.14em (default in `eyebrow()`), mono info -0.03em (default), display -0.005em.
- Glyph coverage: Latin + general punctuation (• · – — × …). **No arrows/checkmarks/emoji** in fonts: draw them as pixel
  icons (or use the pixel font: `pixelText()` covers `< > / + - = ! ? # % * & @ [ ] { } |`).
- Use `•` between date and time ("OCTOBER 17 • 10 AM—4 PM"), `·` between list items ("FREE · ALL AGES"),
  em dash `—` for mono time ranges (looks like the key art), `×` for "RevolutionVA × The AI Collective".
- Text over busy pixel art: put it on sky/teal areas, or use a `panel()` / `chip()`, or `shadow: true` (hard 6px
  tealDeep drop, pixel-style). No blurred shadows, no strokes.

## 5. Motifs (all on `g.hi`)

```js
import { corners, stairs, plus, chip, bars, panel, titleLockup, infoBlock } from '../lib/text.js';
corners(g.hi, c.fmt, { show: tween(t, 0, 0.3) });                 // coral TL + sky TR stair clusters (key-art spots)
stairs(g.hi, 600, 300, { cell: 30, dir: 'dr', color: C.sky, show }); // a stair cluster anywhere (dir dl|dr|ul|ur)
plus(g.hi, 1788, 192, { scale: 0.8 + 0.4 * c.pulse(t) });          // gold pixel plus, pulses on the beat
chip(g.hi, 'FREE · ALL AGES', x, y, { size: 44, align: 'center' }); // coral banner chip, tealDark caps
bars(g.hi, x, y, 132, { grow: tween(t, t0, 0.3) });               // ||| coral bars (next to date info)
panel(g.hi, x, y, w, h);                                          // rounded tealDark panel, sky outline ("Hosted by")
titleLockup(g.hi, 90, 166, { size: 232, t, t0: beat0, stagger: spb, lines: [true, false, true] }); // Hacktoberfest/in the 757
infoBlock(g.hi, 60, 878, { size: 56, lines: ['OCTOBER 17 • 10 AM—4 PM', '757 Makerspace · Hampton'] });
```
The **stair-step** shape is the signature: the engine's stair wipe uses coral/sky cells built from it. Reuse it
for reveals and accents rather than inventing new decorative shapes.

## 6. Motion

- **Beat-locked.** Things land on `c.beats` / cue starts (`c.lines[id].start`) / chant hits (`c.hits[id]`), or one beat
  before. Never on arbitrary seconds.
- **Type stamps in**: `anim(..., {enter:'stamp'})` / `stampText()` = scale 1.15 → 0.97 → 1.0 in ~5 frames.
  Or **slides on pixel steps** (`enter:'slide-left'`, offsets snapped to 6 px). `pop` for icons. `fade` sparingly.
- **Exit before the next idea**: give labels a `t1` (e.g. the next cue start) with `exit:'cut'|'shrink'|'drop'`.
- **Max 2 labels on screen**, max ~4 words each (end card excepted). Labels complement the lyric, never caption it.
- **Accents on beats**: `c.pulse(t)` (1 on each beat, decays) drives small squash (`squash()`), sparkles
  (`sparkle()`), lantern glow, `plus()` scale. `shake()` + `g.shake` for slams (chant hits only).
- Pixel sprites on twos; camera / type may move at 30 fps (camera pans still land on integer pixels).
- **Transitions** are engine-level and sparse (section changes, set in `content/timeline.json`): cut (default),
  `stair` (stair-step pixel wipe), `dither` (Bayer dissolve). Within sections: hard cuts on downbeats.
- Story arc / time of day: night → sunrise (intro), day (verse 1), sea-to-stars launch (chorus 1), indoor hacking
  (verse 2), night lights + stars (bridge, chorus 2 = `variant 2`), lighthouse end card.

## 7. Safe areas (`c.safe`)

- 16:9: text inside x 96…1824, y 54…1026.
- 9:16: text inside **x 80…1000, y 230…1500** (top ~12% and bottom ~22% are covered by platform UI).
  During the chorus in the 9:16 social edit the engine draws the info strip (`SAT 10.17 · HAMPTON · FREE`) at
  y ≈ 1428-1476 and **`c.safe.y1` shrinks to 1404**: lay out against `c.safe`, never hard-coded numbers.
- Pixel art may bleed everywhere (sky up top, water at the bottom).
- 9:16 is a recomposition, not a crop: stack vertically, bigger type relative to width, taller sky / deeper water.

## 8. Do / don't

Do
- Start from `style-ref`: teal flat background, pixel world, cream/sky type, coral used as an accent.
- Read every on-screen fact from `c.facts` (challenge names: `c.facts.challenges`).
- Keep compositions simple: one hero object, one or two labels, lots of teal.
- Check both formats and `--dur-scale 0.6` / `1.8` before you call it done.

Don't
- Don't caption lyrics. Don't put more than 2 labels on screen.
- Don't draw brand logos (Unsloth / Hugging Face / Gemma / Hermes / Arduino / MLH / DigitalOcean): use generic
  friendly stand-ins (a sloth, a smiley, a gem, a winged sandal, a blue board). Names as plain text only.
- Don't claim things not in `facts.json` (no "everyone gets...", no raffle, no prize items, no swag bags).
- Don't use smooth gradients, blur, anti-aliased shapes, sub-pixel motion or non-palette colors in pixel art.
- Don't use `Math.random()`, `Date`, timers: use `c.rng(seed)` / `hash()`; a frame depends only on (fmt, t).
- Don't make it spooky: October = warm leaves and a pumpkin, not skulls.
