# Hacktoberfest 2026 in the 757: hype video

Pixel-art music video for **Hacktoberfest Hack Day Hampton x RevolutionVA** (Sat Oct 17, 2026, 757 Makerspace, Hampton VA),
set to the Suno track in `music/`. The look extends the campaign key art (`reference/`).

## Deliverables (`deliverables/`)
- `hacktoberfest-757-hype-16x9.mp4`: full song, 1920x1080, 2:21
- `hacktoberfest-757-hype-9x16.mp4`: social cut (chant intro + chorus + outro/end card), 1080x1920, 0:43
- `thumbnail-16x9.png`, `thumbnail-9x16.png`: end-card stills for post thumbnails

## How it's built
- `lib/engine.js` renders each frame in headless Chromium: a 320x180 (or 180x320) pixel-art canvas upscaled x6
  under full-resolution type. Scenes live in `scenes/`, one per clip in `content/timeline.json`.
- Clips are bound to lyric cues in `content/song-map.json`, measured from the real track (`analysis/`), so the edit
  follows the song. Event facts and on-screen strings live in `content/facts.json`; partner logos in `content/logos.json`.
- Docs: `docs/BRIEF.md` (facts, lyrics, clip table), `docs/STYLE.md` (art rules), `docs/DEV.md` (API + tools),
  `docs/SUNO.md` (the song prompt).

## Re-render
```bash
npm install                     # Playwright pinned to the preinstalled Chromium
ffmpeg -i "music/Hacktoberfest in the 757.mp3" -ar 48000 assets/audio/song.wav
node tools/render.mjs --fmt 16x9 --audio assets/audio/song.wav --out renders/full.mp4
node tools/render.mjs --fmt 9x16 --audio assets/audio/song.wav --out renders/social.mp4
node tools/stills.mjs --clip C31 --fmt both --times 8          # quick stills of any clip
```
