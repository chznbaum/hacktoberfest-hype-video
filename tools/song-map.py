#!/usr/bin/env python3
"""
Build content/song-map.json (and content/lyrics.json) from the bar plan.

The bar plan below is the single source for line ids, the bar each line starts on and how many bars it lasts.
Times come from ONE of:
  1. the placeholder grid (default): constant BPM (102) starting at --offset seconds;
  2. measured beats from the real track: --beats beats.txt (one beat time in seconds per line, e.g. from a beat
     tracker or tapped by hand). Bar n starts at beat index (--first-downbeat + 4*n). Tempo drift is handled
     automatically because every bar/line time is read off the measured beat list;
  3. measured line starts: --line-times times.json  ({"i.1": 9.41, "v1.1": 18.9, ...}). Any line listed overrides the
     grid; unlisted lines are interpolated between the nearest listed neighbours (by bar position).
--duration overrides the song length (default: end of the last planned bar). --dur-scale k multiplies every time
(robustness testing only; the stills/render tools can also do this at load time without touching the file).

Schema of song-map.json (all times are seconds from the start of the song audio):
  version        1
  source         "placeholder-grid" | "beats:<file>" | "line-times:<file>"
  bpm            nominal tempo (float)
  beatsPerBar    4
  duration       song length
  beats[]        every beat time (downbeats included)
  bars[]         start time of each bar (bars[i] = downbeat of bar i); len = number of planned bars
  sections[]     {id, start, end, bar, bars}
  order[]        cue ids in song order
  lines{}        id -> {start, end, bar, bars, section}; end = start of the next cue (cues tile the song)
  hits{}         id -> [times] of chant / shout hits inside that line (7-5-7 chants, "Hey!")
Cue ids: lyric line ids from BRIEF section 2, plus two instrumental cues: "cold" (bars 0-3) and "tail" (bars 48-49).

Usage:
  python3 tools/song-map.py                          # placeholder grid, 102 BPM
  python3 tools/song-map.py --beats measured.txt --first-downbeat 2 --duration 121.4
  python3 tools/song-map.py --line-times measured.json
"""
import argparse
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# (id, section, start bar, bar count, text, chant hits as (bar offset, beat) pairs)
H3 = [(0, 0), (0, 1), (0, 2)]           # "Seven! Five! Seven!" on beats 1-2-3 of a one-bar chant
H3_WIDE = [(0, 0), (0, 2), (1, 0)]      # two-bar chant (i.1): half-note spacing, one slam per hit
HEY = [(0, 3)]                          # "(Hey!)" on beat 4
PLAN = [
    ("cold",  "intro", 0, 4, "(instrumental cold open)", []),
    ("i.1",   "intro", 4, 2, "(Seven! Five! Seven!)", H3_WIDE),
    ("i.2",   "intro", 6, 1, "Revolution V-A and the AI Collective", []),
    ("i.3",   "intro", 7, 1, "Hampton, wake up, it's Hacktoberfest!", []),
    ("v1.1",  "v1", 8, 1, "Saturday, October seventeen", []),
    ("v1.2",  "v1", 9, 1, "Hampton, Virginia, boot up the machine", []),
    ("v1.3",  "v1", 10, 1, "Ten until four at the 757 Makerspace", []),
    ("v1.4",  "v1", 11, 1, "Sixteen Murray Street, yeah, you know the place", []),
    ("v1.5",  "v1", 12, 1, "Coffee and bagels when the morning's new", []),
    ("v1.6",  "v1", 13, 1, "Bring a laptop, bring a charger, bring the crew", []),
    ("v1.7",  "v1", 14, 1, "Open-source AI is the mission this year", []),
    ("v1.8",  "v1", 15, 1, "'Cause AI belongs to everyone, so everyone's here!", []),
]
CHORUS = [
    ("1", "From the sea to the stars (Hey!)", HEY),
    ("2", "Hacktoberfest in the Seven-Five-Seven!", []),
    ("3", "Build it in the open, let the whole world in", []),
    ("4", "It's free for everybody, so come on, let's begin!", []),
    ("5", "From the sea to the stars (Hey!)", HEY),
    ("6", "Hacktoberfest in the Seven-Five-Seven!", []),
    ("7", "Fork it, train it, ship it, show it", [(0, 0), (0, 1), (0, 2), (0, 3)]),
    ("8", "Hampton's 'bout to glow, and you know it!", []),
]
PLAN += [("ch." + n, "ch1", 16 + i, 1, txt, hits) for i, (n, txt, hits) in enumerate(CHORUS)]
PLAN += [
    ("v2.1", "v2", 24, 1, "Hands-on session: build a decision model", []),
    ("v2.2", "v2", 25, 1, "Unsloth and Hugging Face, full throttle", []),
    ("v2.3", "v2", 26, 1, "Fine-tune it on Gemma, let it make the call", []),
    ("v2.4", "v2", 27, 1, "Then fire up Hermes Agent, watch it learn it all", []),
    ("v2.5", "v2", 28, 1, "Five challenges, prizes on the line", []),
    ("v2.6", "v2", 29, 1, "Sixteen Arduino Uno Qs up for grabs this time", []),
    ("v2.7", "v2", 30, 1, "T-shirts and stickers and swag in the mix", []),
    ("v2.8", "v2", 31, 1, "Mama Rosa's pizza for the midday fix!", []),
    ("br.1", "br", 32, 1, "First-timer? Student? Seasoned pro?", []),
    ("br.2", "br", 33, 1, "Grab a seat, find a team: ready, set, go!", [(0, 1), (0, 2), (0, 3)]),
    ("br.3", "br", 34, 1, "(Seven! Five! Seven!)", H3),
    ("br.4", "br", 35, 1, "(Seven! Five! Seven!)", H3),
]
PLAN += [("ch2." + n, "ch2", 36 + i, 1, txt, hits) for i, (n, txt, hits) in enumerate(CHORUS)]
PLAN += [
    ("out.1", "out", 44, 1, "Sign up on M-L-H, Saturday, ten A.M.", []),
    ("out.2", "out", 45, 1, "757 Makerspace, we'll see you then!", []),
    ("out.3", "out", 46, 1, "(Seven! Five! Seven!)", H3),
    ("out.4", "out", 47, 1, "Hacktoberfest!", [(0, 0)]),
    ("tail",  "out", 48, 2, "(tail / ring-out)", []),
]
NBARS = 50
SECTIONS = [("intro", 0, 8), ("v1", 8, 8), ("ch1", 16, 8), ("v2", 24, 8), ("br", 32, 4), ("ch2", 36, 8), ("out", 44, 6)]


def r(x):
    return round(float(x), 4)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--bpm", type=float, default=102.0)
    ap.add_argument("--offset", type=float, default=0.0, help="time of bar 0 downbeat (placeholder grid)")
    ap.add_argument("--beats", help="file with one measured beat time per line")
    ap.add_argument("--first-downbeat", type=int, default=0, help="index in --beats of bar 0's downbeat")
    ap.add_argument("--line-times", help="json {lineId: startSeconds} measured from the real track")
    ap.add_argument("--duration", type=float, help="song length in seconds (default: end of last bar)")
    ap.add_argument("--dur-scale", type=float, default=1.0)
    ap.add_argument("--out", default=os.path.join(ROOT, "content", "song-map.json"))
    ap.add_argument("--lyrics-out", default=os.path.join(ROOT, "content", "lyrics.json"))
    a = ap.parse_args()

    spb = 60.0 / a.bpm
    source = "placeholder-grid"
    nbeats = NBARS * 4
    if a.beats:
        with open(a.beats) as f:
            measured = [float(x) for x in f.read().split() if x.strip()]
        measured = measured[a.first_downbeat:]
        if len(measured) < nbeats + 1:  # extrapolate missing beats at the last measured tempo
            step = (measured[-1] - measured[-5]) / 4 if len(measured) > 5 else spb
            while len(measured) < nbeats + 1:
                measured.append(measured[-1] + step)
        beats = measured[: nbeats + 1]
        source = "beats:" + os.path.basename(a.beats)
    else:
        beats = [a.offset + i * spb for i in range(nbeats + 1)]

    def beat_time(bar, beat=0.0):
        """Time of (bar, beat), interpolating fractional beats."""
        idx = bar * 4 + beat
        i = int(idx)
        i = max(0, min(i, len(beats) - 2))
        return beats[i] + (idx - i) * (beats[i + 1] - beats[i])

    starts = {lid: beat_time(bar) for (lid, _s, bar, _n, _t, _h) in PLAN}
    if a.line_times:
        with open(a.line_times) as f:
            given = {k: float(v) for k, v in json.load(f).items()}
        source = "line-times:" + os.path.basename(a.line_times)
        known = sorted((bar, given[lid]) for (lid, _s, bar, _n, _t, _h) in PLAN if lid in given)
        if known:
            for (lid, _s, bar, _n, _t, _h) in PLAN:
                if lid in given:
                    starts[lid] = given[lid]
                    continue
                lo = max([k for k in known if k[0] <= bar], default=None)
                hi = min([k for k in known if k[0] >= bar], default=None)
                if lo and hi and hi[0] != lo[0]:
                    starts[lid] = lo[1] + (hi[1] - lo[1]) * (bar - lo[0]) / (hi[0] - lo[0])
                elif lo:
                    starts[lid] = lo[1] + (bar - lo[0]) * 4 * spb
                elif hi:
                    starts[lid] = hi[1] - (hi[0] - bar) * 4 * spb

    end_of_song = a.duration if a.duration else beat_time(NBARS)
    k = a.dur_scale
    lines, order, hits = {}, [], {}
    for i, (lid, sec, bar, n, _t, hh) in enumerate(PLAN):
        start = starts[lid]
        end = starts[PLAN[i + 1][0]] if i + 1 < len(PLAN) else end_of_song
        lines[lid] = {"start": r(start * k), "end": r(end * k), "bar": bar, "bars": n, "section": sec}
        order.append(lid)
        if hh:
            # hits are placed on the beat grid, shifted with the line if line-times moved it
            shift = start - beat_time(bar)
            hits[lid] = [r((beat_time(bar + bo, bt) + shift) * k) for (bo, bt) in hh]
    sections = []
    for sid, bar, n in SECTIONS:
        first = next(l for l in PLAN if l[1] == sid)[0]
        last = [l for l in PLAN if l[1] == sid][-1][0]
        sections.append({"id": sid, "start": lines[first]["start"], "end": lines[last]["end"], "bar": bar, "bars": n})

    song = {
        "version": 1,
        "source": source,
        "bpm": a.bpm if not a.beats else r(60.0 * nbeats / (beats[nbeats] - beats[0])),
        "beatsPerBar": 4,
        "duration": r(end_of_song * k),
        "beats": [r(b * k) for b in beats if b <= end_of_song + 1e-6],
        "bars": [r(beat_time(b) * k) for b in range(NBARS)],
        "sections": sections,
        "order": order,
        "lines": lines,
        "hits": hits,
    }
    with open(a.out, "w") as f:
        json.dump(song, f, indent=1)
        f.write("\n")

    lyrics = {"lines": {}}
    for (lid, sec, bar, n, txt, hh) in PLAN:
        lyrics["lines"][lid] = {
            "text": txt,
            "section": sec,
            "instrumental": lid in ("cold", "tail"),
            "chant": txt.startswith("(Seven"),
        }
    with open(a.lyrics_out, "w") as f:
        json.dump(lyrics, f, indent=1)
        f.write("\n")
    print(f"wrote {a.out}: {len(lines)} cues, {len(song['beats'])} beats, duration {song['duration']}s ({source})")


if __name__ == "__main__":
    sys.exit(main())
