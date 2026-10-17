# Hype Video Production Brief: "Hacktoberfest in the 757"

This file is the single source of truth for every agent working on this video.
Read all of it before writing code. If something here conflicts with your instincts, this file wins.

---

## 1. Event facts (only these may appear on screen)

| Field | Value |
|---|---|
| Official name | Hacktoberfest Hack Day Hampton x RevolutionVA |
| Campaign name (used on key art) | Hacktoberfest 2026 in the 757 |
| Format | Hacktoberfest **Hack Day** (MLH mini-hackathon), "Community Hack Day" |
| Date | **Saturday, October 17, 2026** |
| Time | **10 AM – 4 PM** (Eastern) |
| Venue | **757 Makerspace** (Hampton location) |
| Address | **16 Murray St, Hampton, VA 23651** |
| Price | **Free** to attend |
| Who | Open to all ages; beginners welcome; students encouraged; pros welcome |
| Bring | Laptop + charger (+ curiosity; a project idea is optional) |
| Hosts | Chazona Baum and Ryan McGovern |
| Hosted by | **RevolutionVA** |
| Sponsored by | **The AI Collective Hampton Roads** (MLH page wording: "hosted by RevolutionVA with sponsorship thanks to the AI Collective Hampton Roads"). Never call the AI Collective a host |
| Global program | Hacktoberfest 2026, run by MLH (Major League Hacking) + DEV, presented by DigitalOcean |
| 2026 global theme | **"AI belongs to everyone"**: learning and building with open-source / open-weight AI |
| Hands-on session 1 | Build/train your own **decision model** (a "Jev-style" decision model: an LLM fine-tuned to read an input, score the options you give it, and return a choice with a probability). Tools: **Unsloth**, **Hugging Face**, optionally **Gemma** (Gemma 4) |
| Hands-on session 2 | Get started with **Hermes Agent** (open-source, self-improving AI agent by Nous Research; it learns reusable skills) |
| Challenges | **5 challenges** (read from `content/facts.json` `challenges[]` / `challengeDetails[]`): **Best Open-Source AI Project** (sponsor: DigitalOcean; prize: Hacktoberfest 2026 Winner DEV Badge + MLH Swag Bag), **Best Use of Gemma 4** (Google DeepMind), **Gloriously Overengineered** (solve a trivial problem with absurdly rigorous AI, e.g. a multi-agent council debating whether toast is done), **Best AI Security Project** (use AI to protect people, or make AI harder to misuse), **Best Community Impact Project** (make life better for a real community). No other prize details are confirmed |
| Hardware | **16 Arduino UNO Q boards** "up for grabs". Do NOT say how they're distributed (no "raffle", no "winners get", no "everyone gets") |
| Swag | T-shirts, stickers, and similar swag. NEVER imply everyone gets a T-shirt (quantities are limited) |
| Food | Morning: **coffee + bagels**. Lunch: **pizza from Mama Rosa's** (local Hampton Italian restaurant) |
| Registration | Register free on MLH: `https://events.mlh.com/events/14937-hacktoberfest-hack-day-hampton-x-revolutionva` |
| Local flavor | Hampton, VA is "First from the sea, first to the stars": the Chesapeake Bay waterfront, the Old Point Comfort Lighthouse (the lighthouse in the key art), and NASA Langley Research Center (where America's first astronauts trained). "757" is the Hampton Roads area code and community name |

Things we must not claim: specific prize items for challenges (beyond the names), that everyone gets a shirt or a board, how boards are distributed, swag bags, any numbers that aren't listed above, any brand logos we don't have files for. Write tool and brand names as plain text; don't draw anyone's logo (draw a generic friendly sloth, a gem, a winged sandal, etc. instead).

---

## 2. The song (lyrics drive the edit)

The music is a full song with lyrics, generated in Suno by the host. Genre: chiptune hip-hop with a bouncy
Virginia/757 beat, ~102 BPM, 8-bit leads, gang-vocal chant hook. **The real audio is not available yet.** Build
everything against the placeholder song map (`content/song-map.json`, generated from the bar plan below). When the
real track arrives, the orchestrator will replace the song map with measured times and every clip must still work.

Each line has an ID. Placeholder: one lyric line = one bar (4 beats) at 102 BPM (2.353 s/bar).

```
[intro]  bars 0-7
  (bars 0-3 instrumental cold open)
  i.1  (Seven! Five! Seven!)                                  bar 4-5
  i.2  Revolution V-A and the AI Collective                   bar 6
  i.3  Hampton, wake up, it's Hacktoberfest!                  bar 7

[v1]  bars 8-15
  v1.1 Saturday, October seventeen
  v1.2 Hampton, Virginia, boot up the machine
  v1.3 Ten until four at the 757 Makerspace
  v1.4 Sixteen Murray Street, yeah, you know the place
  v1.5 Coffee and bagels when the morning's new
  v1.6 Bring a laptop, bring a charger, bring the crew
  v1.7 Open-source AI is the mission this year
  v1.8 'Cause AI belongs to everyone, so everyone's here!

[ch1]  bars 16-23
  ch.1 From the sea to the stars (Hey!)
  ch.2 Hacktoberfest in the Seven-Five-Seven!
  ch.3 Build it in the open, let the whole world in
  ch.4 It's free for everybody, so come on, let's begin!
  ch.5 From the sea to the stars (Hey!)
  ch.6 Hacktoberfest in the Seven-Five-Seven!
  ch.7 Fork it, train it, ship it, show it
  ch.8 Hampton's 'bout to glow, and you know it!

[v2]  bars 24-31
  v2.1 Hands-on session: build a decision model
  v2.2 Unsloth and Hugging Face, full throttle
  v2.3 Fine-tune it on Gemma, let it make the call
  v2.4 Then fire up Hermes Agent, watch it learn it all
  v2.5 Five challenges, prizes on the line
  v2.6 Sixteen Arduino Uno Qs up for grabs this time
  v2.7 T-shirts and stickers and swag in the mix
  v2.8 Mama Rosa's pizza for the midday fix!

[br]  bars 32-35 (beat drops to 808 + claps)
  br.1 First-timer? Student? Seasoned pro?
  br.2 Grab a seat, find a team: ready, set, go!
  br.3 (Seven! Five! Seven!)
  br.4 (Seven! Five! Seven!)

[ch2]  bars 36-43   same lines as ch1 (ids ch2.1 ... ch2.8), bigger energy

[out]  bars 44-49
  out.1 Sign up on M-L-H, Saturday, ten A.M.
  out.2 757 Makerspace, we'll see you then!
  out.3 (Seven! Five! Seven!)
  out.4 Hacktoberfest!
  (bars 48-49 tail / ring-out)
```

### On-screen text vs. lyrics (the host's explicit direction)

> "Don't try to make competing on-screen text but complementary."

- **Never caption the lyrics.** Don't put the sung sentence on screen.
- The **picture** illustrates the line (a pixel calendar for "October seventeen", a pizza box for "Mama Rosa's").
- On-screen text is **short labels that add what's hard to hear or remember**: the address, the time, tool names,
  challenge names, "x16", the URL/QR. Max ~4 words per label, max 2 labels on screen at once (end card excepted).
- **Exception (hooks):** the title "HACKTOBERFEST" / "in the 757" and "7 5 7" chant digits may appear big because they are the
  brand, and they hit with the vocal, not against it.
- Text lands **on the beat** where the vocal says it (or one beat before), and is off screen before the next idea.

---

## 3. Art direction: match the campaign key art

Reference: `reference/keyart-2400x1200.png` (+ `reference/keyart-newsletter-804x402.jpg`). Study it. The video must look
like this key art came alive.

### What the key art is
- **Flat deep-teal background**, crisp **pixel-art illustration** (Old Point Comfort Lighthouse, Chesapeake Bay water
  in horizontal pixel streaks, small pixel clouds, V-shaped pixel gulls, green bushes), and **big smooth (non-pixel)
  typography** on top. Pixel art + clean type: that combination is the look.
- Decorative motifs: **stair-step pixel corner clusters** (coral top-left, sky-blue top-right), a small **gold pixel
  plus/sparkle**, the **triple coral vertical bars `|||`** next to date info, a **coral banner chip** with dark-teal
  condensed caps, a **rounded-rectangle "Hosted by" panel** with a light blue outline.

### Palette (sampled from the key art; use these tokens, don't invent new hues)
```
teal        #285B55   main background
teal-dark   #214D49   shadows / panels / night tint
teal-deep   #173B38   deepest shadow, night sky base
cream       #F7F7F2   primary type, lighthouse body, highlights
sky         #79AED3   secondary type ("in the 757"), water highlights, clouds
coral       #F07770   accent (banner chips, ||| bars, lighthouse roof, corner pixels)
gold        #F5C04A   tiny sparkles, lantern glow, sun, stars (sparingly)
```
Supporting pixel-art ramps (water, foliage, stone, skin tones, objects) may use extra shades, but keep them in the
key art's muted, slightly desaturated family. Sample from the key art image when you need water blues, greens,
lighthouse stone and roof reds. Skin tones for pixel people: use a varied, inclusive range.

### Pixel grid
- Pixel art is drawn on a **low-res canvas** and upscaled with **nearest-neighbor**: pixel size **P = 6** device pixels.
  - 16:9 → 1920x1080 output, pixel canvas **320x180**
  - 9:16 → 1080x1920 output, pixel canvas **180x320**
- Pixel sprites move on **integer pixel positions**, never subpixel. No anti-aliasing, no blur, no gradients inside
  pixel art (use dithering or banding instead).
- Typography is drawn at **full resolution** on top (smooth fonts), exactly like the key art.

### Type
- Display: heavy grotesk matching the key art headline ("Hacktoberfest / 2026 / in the 757"). Foundation picks the closest
  open font and documents it in `docs/STYLE.md`.
- Mono eyebrow / info lines: matching the key art ("COMMUNITY HACK DAY", "OCTOBER 17 • 10 AM–4 PM"), with wide tracking for eyebrows.
- Condensed caps for chips/banners ("FREE · BEGINNERS WELCOME").
- Colors: cream primary, sky secondary, dark-teal text on coral chips. No other text colors.

### Motion language
- Snappy, beat-locked. Type **stamps** in (scale 1.15→1.0 with a 2-frame overshoot) or **slides** in on pixel steps.
  Pixel sprites animate "on twos" (sprite frames change at 15 fps or slower) while camera/type can move at 30 fps.
- Accents on beats: small squash/bounce, sparkle pops, lighthouse beam pulses.
- Transitions: hard cuts on downbeats by default; signature transition = **stair-step pixel wipe** (built from the corner
  motif) and **dither dissolve**. Use transitions sparingly (section changes), cuts within sections.
- Hampton story arc: night → sunrise (intro), daytime build energy (verse 1), sea-to-stars launch (chorus), indoor
  hacking (verse 2), night lights + stars (bridge/final chorus), lighthouse end card.
- Keep it playful and warm, never spooky-horror. October touches (falling autumn pixel leaves, a pumpkin or two) are welcome but light.

### Safe areas
- 16:9: keep text inside 5% margins (96 px left/right, 54 px top/bottom).
- 9:16: social UI covers the edges. Keep all text inside **x 80…1000, y 230…1500** (top ~12% and bottom ~22% are
  covered by platform UI; right side has buttons). Pixel art may bleed everywhere.

---

## 4. Formats and edits

- **16:9 "full"**: the entire song, all clips in order (~2 min).
- **9:16 "social"**: ~40 s cut: intro chant (from `i.1`) → hosts → wake-up → full chorus 1 → outro end card.
  The orchestrator will splice the audio at bar boundaries. Because many people watch muted, the 9:16 cut's chorus
  scenes show a persistent small info strip (`SAT 10.17 · HAMPTON · FREE`) and the end card carries all key info.
- Every scene must render correctly in **both** orientations (responsive layout, not a stretched copy). Recompose:
  stack vertically in 9:16, bigger type relative to width, pixel world re-framed (taller sky / deeper water).

---

## 5. Clip list (timeline)

Clips are bound to lyric cues, not seconds. `from`/`to` are line IDs (start of `from` to end of `to`).

| Clip | Scene id | Cue range | Content (picture illustrates lyric; labels complement) | Owner |
|---|---|---|---|---|
| C01 | `cold-open` | intro bars 0-3 | Night over the bay: twinkling stars, water shimmer, lighthouse beam sweeps; a tiny mono eyebrow fades in (`HAMPTON, VA · 10.17.26`). Builds anticipation. | A |
| C02 | `chant-757` | i.1 | Giant pixel-block digits **7 · 5 · 7** slam in one per chant hit (beat-locked), screen shake + pixel dust. | A |
| C03 | `hosts` | i.2 | HOSTED BY RevolutionVA + SPONSORED BY The AI Collective Hampton Roads: panel(s) styled like the key art. | A |
| C04 | `wake-up` | i.3 | Sunrise bursts over the bay (night palette → teal day), gulls take off, **HACKTOBERFEST** flashes. | A |
| C05 | `calendar` | v1.1 | Pixel tear-off calendar page flips to SAT · OCT 17, autumn leaves drift. Label: `SAT 10.17`. | B |
| C06 | `boot` | v1.2 | Pixel CRT/laptop boots: BIOS-style boot lines, progress bar, "HAMPTON.EXE" vibe. | B |
| C07 | `makerspace` | v1.3–v1.4 | Pixel 757 Makerspace storefront, clock hands sweep 10→4, street sign MURRAY ST. Labels: `10AM–4PM`, `16 MURRAY ST`. | B |
| C08 | `coffee-bagels` | v1.5 | Steaming pixel coffee mug + bagel(s) in morning light. Label: `COFFEE + BAGELS`. | C |
| C09 | `bring-kit` | v1.6 | Laptop, charger, and a little pixel crew pop in on 3 beats. Label: `BRING A LAPTOP`. | C |
| C10 | `open-source-ai` | v1.7 | Open-source AI visual: glowing `</>` brackets open to reveal a friendly pixel AI spark/brain, open-weight "download" shimmer. | C |
| C11 | `belongs-to-everyone` | v1.8 | A diverse row of pixel people each light up their own little AI spark; the theme line **AI BELONGS TO EVERYONE** (global theme, brand hook). | C |
| C12 | `sea-to-stars` | ch.1–ch.2 | The signature shot: camera tilts from bay + lighthouse up into stars as a pixel rocket launches (NASA Langley nod). Title lockup **HACKTOBERFEST / in the 757** stamps in on ch.2. | D |
| C13 | `build-open` | ch.3–ch.4 | Giant pixel `{ }`/`< >` doors swing open and pixel people stream in. Label chip: `FREE · ALL AGES`. | D |
| C14 | `sea-to-stars-b` | ch.5–ch.6 | Variation of C12 (different angle: rocket passes the moon / constellation forms "757"), title lockup again. | D |
| C15 | `fork-train-ship-show` | ch.7 | Four hard cuts, one per beat: FORK (branch icon), TRAIN (loss curve dropping), SHIP (rocket/package), SHOW (demo screen + applause). One word label per cut is OK (brand-like hook). | D |
| C16 | `hampton-glow` | ch.8 | Hampton waterfront skyline at dusk lights up window by window, lighthouse flares, sparkles. | D |
| C17 | `decision-model` | v2.1–v2.2 | Pixel decision model: input card → model block → option bars with probabilities, best option glows. A friendly pixel sloth trains it on a laptop. Labels: `UNSLOTH`, `HUGGING FACE`. | E |
| C18 | `gemma-call` | v2.3 | A pixel gem powers up the model; it "makes the call": a big check stamp with probability (e.g. `0.97`). Label: `GEMMA`. | E |
| C19 | `hermes` | v2.4 | Winged-sandal messenger zips across; terminal shows an agent learning skills (`+ skill learned` ticks). Label: `HERMES AGENT`. | E |
| C20 | `challenges` | v2.5 | Five pixel trophies/badges drop onto a shelf, one per beat-ish; each gets its challenge name from `facts.json`. Label: `5 CHALLENGES`. | F |
| C21 | `uno-q` | v2.6 | Pixel Arduino UNO Q boards (blue PCB, UNO footprint) rain into a 4x4 grid. Label: `x16 ARDUINO UNO Q`. | F |
| C22 | `swag` | v2.7 | Pixel T-shirt, sticker sheet, stickers slapping onto a laptop lid. Label: `SWAG`. | F |
| C23 | `pizza` | v2.8 | Pixel pizza box opens, slice pulls with cheese strings. Label: `MAMA ROSA'S PIZZA`. | F |
| C24 | `builders` | br.1–br.2 | Darker, intimate: three pixel builders at laptops (first-timer, student, pro) light up one by one, then READY · SET · GO countdown. | A |
| C25 | `chant-757-b` | br.3–br.4 | Chant variation at night: 7-5-7 as constellations/neon, building tension into final chorus. | A |
| C26–C30 | same scenes as C12–C16 with `variant: 2` | ch2.1–ch2.8 | Bigger: night-time version, fireworks/stars, more sparkles, faster cuts. | D |
| C31 | `endcard` | out.1–end | Key-art-style end card: HACKTOBERFEST 2026 in the 757, COMMUNITY HACK DAY eyebrow, `||| SAT OCT 17 • 10 AM–4 PM`, `757 Makerspace · 16 Murray St, Hampton`, coral chip `FREE · BEGINNERS WELCOME`, a pixel QR code to the MLH URL with `REGISTER FREE ON MLH`, hosted-by panel (HOSTED BY RevolutionVA · SPONSORED BY The AI Collective Hampton Roads), animated lighthouse + water. Holds long enough to read and scan. | G |

---

## 6. Technical architecture (Foundation builds this; everyone else uses it)

```
package.json            ESM ("type":"module"); scripts: stills, render, contact
index.html              loads fonts, lib, scenes, timeline; exposes window.renderFrame(fmt, frameIndex)
lib/                    shared, owned by Foundation (others do not edit)
  engine.js             canvas setup, two-layer compositing, clip resolution, transitions, frame→time
  pixel.js              low-res drawing: rect, line, circle, dither, sprite-from-strings, palette
  text.js               full-res type helpers: drawLabel/eyebrow/chip/display, stamp/slide/type-on animations
  world.js              reusable world pieces: sky (day/dusk/night), stars, water, lighthouse, clouds, gulls, leaves, sun, moon
  motion.js             easings, seeded rng, beat helpers (beatPhase, onBeat pulse), quantize-to-twos
  palette.js            the tokens above
scenes/<scene-id>.js    one module per scene id (stubs created by Foundation; owners replace them)
content/facts.json      event facts + challenges[] (on-screen strings come from here)
content/lyrics.json     line ids → text (from section 2)
content/song-map.json   timing: bpm, beats[], bars[], lines{id:{start,end}}, sections[], duration
content/timeline.json   clip list (section 5) + 9:16 edit definition
tools/stills.mjs        render chosen times (or clip ids) to PNG; --fmt 16x9|9x16
tools/contact.mjs       contact sheet (grid of frames across a clip or whole video)
tools/render.mjs        full render: parallel Chromium workers → PNG frames → ffmpeg (H.264, yuv420p, 30 fps) with audio
tools/song-map.py       builds content/song-map.json from bar plan (placeholder) or from analysed audio later
assets/fonts/           woff2 fonts (from npm @fontsource packages)
assets/img/             logos, QR (generated)
renders/                output (gitignored)
```

### Scene module contract
```js
// scenes/<id>.js
export default {
  id: 'calendar',
  // nominal duration hint only; real duration comes from the song map
  draw(g, t, c) {
    // g.px  : CanvasRenderingContext2D of the low-res pixel canvas (320x180 or 180x320), cleared each frame by engine
    // g.hi  : full-res 2D context (1920x1080 or 1080x1920) for type, composited ABOVE the upscaled pixel layer
    // g.PW, g.PH, g.W, g.H, g.P (=6)
    // t     : seconds since clip start
    // c.dur : clip duration in seconds;  c.fmt: '16x9' | '9x16';  c.variant: 1|2
    // c.beats: beat times relative to clip start (array; may include negatives / beyond dur)
    // c.beat(t) -> { index, phase }   c.bar(t) -> { index, phase }
    // c.lines: { [lineId]: {start,end} } relative to clip start (cues inside this clip)
    // c.facts: facts.json   c.rng(seed): deterministic PRNG
  }
}
```
Rules:
- **Deterministic**: no `Math.random`, no `Date`, no real-time timers. A frame depends only on (fmt, t).
- **Duration-robust**: the real song will shift timing. Each clip must look right for durations between 0.6x and 1.8x of
  nominal. Key on `c.lines` cue times and `c.beats`, not fixed seconds. Entry animation in the first ~0.4 s,
  readable hold, and still looks good if the clip is cut early.
- **Self-contained**: a scene owns its file(s): `scenes/<id>.js` and optional `scenes/_<owner>-*.js` helpers. Never
  edit `lib/` or another owner's scenes. If you need a lib feature, implement it locally in your helper file.
- No network access at render time. All assets local.
- Do **not** run `git commit`/`git push`. Leave version control to the orchestrator.
- Rendering is CPU-heavy and agents run concurrently: render **stills/contact sheets**, not full videos, while iterating.
