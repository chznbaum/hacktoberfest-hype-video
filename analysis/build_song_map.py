#!/usr/bin/env python3
"""Build content/song-map.json + content/lyrics.json from the REAL Suno track (music/Hacktoberfest in the 757.mp3).

Timing was measured in analysis/: tempo 100.0 BPM (beat 0.60007 s, first beat 0.208 s, downbeats on beat%4==0,
from drum-stem kick energy), line starts from pocketsphinx forced alignment of the lyrics against the vocal stem
(analysis/align.py), chant/"Hey!" hits from vocal + backing-vocal onsets. Chorus 2 = chorus 1 + 24 bars.
Cue boundaries at the 9:16 splice points are snapped to beats so the social cut keeps the groove.
"""
import json, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FIRST, IBI = 0.20808, 0.6000680
DUR = 141.432
CH2 = 24 * 4 * IBI  # chorus 2 offset (57.60 s)

def beat(k): return FIRST + k * IBI

CUES = [  # id, section, start, text, hits
 ("cold", "intro", 0.0, "(ad-lib intro: yeah, yeah)", []),
 ("i.1", "intro", 4.30, "(Seven! Five! Seven!)", [4.41, 5.61, 6.21]),
 ("i.2", "intro", 6.62, "Revolution V-A and the AI Collective", []),
 ("i.3", "intro", 9.65, "Hampton, wake up, it's Hacktoberfest!", [10.96]),
 ("v1.1", "v1", beat(19), "Saturday, October seventeen", []),
 ("v1.2", "v1", 14.48, "Hampton, Virginia, boot up the machine", []),
 ("v1.3", "v1", 16.82, "Ten until four at the 757 Makerspace", []),
 ("v1.4", "v1", 19.52, "Sixteen Murray Street, yeah, you know the place", []),
 ("v1.5", "v1", 21.66, "Coffee and bagels when the morning's new", []),
 ("v1.6", "v1", 23.70, "Bring a laptop, bring a charger, bring the crew", [23.78, 24.69, 25.30]),
 ("v1.7", "v1", 26.14, "Open-source AI is the mission this year", []),
 ("v1.8", "v1", 28.45, "'Cause AI belongs to everyone, so everyone's here!", []),
]
CHORUS = [
 ("1", beat(51), "From the sea to the stars (Hey!)", [32.47]),
 ("2", 33.05, "Hacktoberfest in the Seven-Five-Seven!", [33.13]),
 ("3", 35.85, "Build it in the open, let the whole world in", []),
 ("4", 38.22, "It's free for everybody, so come on, let's begin!", []),
 ("5", 40.58, "From the sea to the stars (Hey!)", [42.82]),
 ("6", 43.05, "Hacktoberfest in the Seven-Five-Seven!", [43.13]),
 ("7", 45.70, "Fork it, train it, ship it, show it", [beat(76), beat(77), beat(78), beat(79)]),
 ("8", 47.85, "Hampton's 'bout to glow, and you know it!", []),
]
CUES += [("ch." + n, "ch1", s, t, h) for n, s, t, h in CHORUS]
CUES += [
 ("pc1", "pc1", beat(84), "(post-chorus ad-libs: and you know it! Hampton!)", []),
 ("v2.1", "v2", 59.40, "Hands-on session: build a decision model", []),
 ("v2.2", "v2", 61.95, "Unsloth and Hugging Face, full throttle", []),
 ("v2.3", "v2", 64.55, "Fine-tune it on Gemma, let it make the call", []),
 ("v2.4", "v2", 66.85, "Then fire up Hermes Agent, watch it learn it all", []),
 ("v2.5", "v2", 69.50, "Five challenges, prizes on the line", []),
 ("v2.6", "v2", 71.80, "Sixteen Arduino Uno Qs up for grabs this time", []),
 ("v2.7", "v2", 74.18, "T-shirts and stickers and swag in the mix", []),
 ("v2.8", "v2", 76.52, "Mama Rosa's pizza for the midday fix!", []),
 ("br.1", "br", 78.95, "First-timer? Student? Seasoned pro?", []),
 ("br.2", "br", 81.38, "Grab a seat, find a team: ready, set, go!", [82.68, 83.07, 83.60]),
 ("br.3", "br", 84.05, "(Seven! Five! Seven!)", [beat(140), beat(141), beat(142)]),
 ("br.4", "br", 86.45, "(Seven! Five! Seven!)", [beat(144), beat(145), beat(146)]),
]
CUES += [("ch2." + n, "ch2", round(s + CH2, 4), t, [round(x + CH2, 4) for x in h]) for n, s, t, h in CHORUS]
CUES += [
 ("pc2", "pc2", beat(84) + CH2, "(post-chorus ad-libs: and you know it! Hampton!)", []),
 ("out.1", "out", beat(192), "Sign up on M-L-H, Saturday, ten A.M.", []),
 ("out.2", "out", 121.70, "757 Makerspace, we'll see you then!", []),
 ("out.3", "out", 125.40, "(Seven! Five! Seven!)", [beat(212), beat(213), beat(214)]),
 ("out.4", "out", 129.00, "Hacktoberfest!", [129.21]),
 ("tail", "out", beat(218), "(instrumental ring-out)", []),
]
r = lambda x: round(float(x), 4)
beats = [r(beat(k)) for k in range(0, 10000) if beat(k) <= DUR]
bars = [beats[i] for i in range(0, len(beats), 4)]
lines, order, hits = {}, [], {}
for i, (cid, sec, s, txt, h) in enumerate(CUES):
    e = CUES[i + 1][2] if i + 1 < len(CUES) else DUR
    assert e > s, cid
    lines[cid] = {"start": r(s), "end": r(e), "bar": r((s - FIRST) / (4 * IBI)), "bars": r((e - s) / (4 * IBI)), "section": sec}
    order.append(cid)
    if h: hits[cid] = [r(x) for x in h]
sections = []
for sec in ["intro", "v1", "ch1", "pc1", "v2", "br", "ch2", "pc2", "out"]:
    ids = [c[0] for c in CUES if c[1] == sec]
    sections.append({"id": sec, "start": lines[ids[0]]["start"], "end": lines[ids[-1]]["end"], "bar": lines[ids[0]]["bar"], "bars": r(sum(lines[x]["bars"] for x in ids))})
song = {"version": 1, "source": "measured:music/Hacktoberfest in the 757.mp3", "bpm": r(60 / IBI), "beatsPerBar": 4, "duration": DUR,
        "beats": beats, "bars": bars, "sections": sections, "order": order, "lines": lines, "hits": hits}
json.dump(song, open(os.path.join(ROOT, "content/song-map.json"), "w"), indent=1)
lyr = {"lines": {c[0]: {"text": c[3], "section": c[1], "instrumental": c[0] in ("cold", "tail", "pc1", "pc2"), "chant": c[3].startswith("(Seven")} for c in CUES}}
json.dump(lyr, open(os.path.join(ROOT, "content/lyrics.json"), "w"), indent=1)
print("cues", len(lines), "beats", len(beats), "bars", len(bars))
for c in order: print(f"{c:6s} {lines[c]['start']:8.3f}-{lines[c]['end']:8.3f} ({lines[c]['end']-lines[c]['start']:5.2f}s)", hits.get(c, ""))
