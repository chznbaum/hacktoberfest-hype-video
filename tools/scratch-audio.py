#!/usr/bin/env python3
"""
Placeholder scratch track (numpy only) so previews have sound: 102 BPM chiptune hip-hop that follows
content/song-map.json exactly (same beats, bars, sections and length), with gang-shout "hits" + clicks on the
chant / "Hey!" hits listed in song-map hits{}. It is NOT the real song (the host makes that in Suno).

  python3 tools/scratch-audio.py                      -> assets/audio/scratch-102bpm.wav
  python3 tools/scratch-audio.py --song content/song-map.json --out /tmp/x.wav --no-clicks
"""
import argparse
import json
import os
import wave

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 44100


def env_exp(n, decay):
    return np.exp(-np.arange(n) / (decay * SR))


def square(freq, n, duty=0.5, phase=0.0):
    t = np.arange(n) / SR
    ph = (t * freq + phase) % 1.0
    return np.where(ph < duty, 1.0, -1.0)


def tri(freq, n):
    t = np.arange(n) / SR
    ph = (t * freq) % 1.0
    return 4 * np.abs(ph - 0.5) - 1


def noise(n, seed):
    return np.random.default_rng(seed).uniform(-1, 1, n)


def hp(x, k=0.9):
    # crude one-pole high-pass
    y = np.empty_like(x)
    prev_x = 0.0
    prev_y = 0.0
    for i in range(len(x)):
        prev_y = k * (prev_y + x[i] - prev_x)
        prev_x = x[i]
        y[i] = prev_y
    return y


def lp(x, k=0.2):
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc += k * (x[i] - acc)
        y[i] = acc
    return y


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


class Mix:
    def __init__(self, dur):
        self.n = int(dur * SR) + SR
        self.L = np.zeros(self.n)
        self.R = np.zeros(self.n)

    def add(self, t, sig, gain=1.0, pan=0.0):
        i = int(round(t * SR))
        if i < 0:
            sig = sig[-i:]
            i = 0
        j = min(self.n, i + len(sig))
        if j <= i:
            return
        s = sig[: j - i] * gain
        self.L[i:j] += s * (1 - max(0, pan))
        self.R[i:j] += s * (1 + min(0, pan))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--song", default=os.path.join(ROOT, "content", "song-map.json"))
    ap.add_argument("--out", default=os.path.join(ROOT, "assets", "audio", "scratch-102bpm.wav"))
    ap.add_argument("--no-clicks", action="store_true")
    a = ap.parse_args()
    song = json.load(open(a.song))
    dur = song["duration"]
    bars = song["bars"]
    beats = song["beats"]
    spb = (beats[-1] - beats[0]) / max(1, len(beats) - 1)
    mix = Mix(dur)

    # --- instruments (pre-rendered one-shots)
    def kick():
        n = int(0.32 * SR)
        t = np.arange(n) / SR
        f = 45 + 95 * np.exp(-t * 28)
        ph = np.cumsum(f) / SR
        return np.sin(2 * np.pi * ph) * env_exp(n, 0.12) * 1.0

    def snare(seed=1):
        n = int(0.22 * SR)
        body = np.sin(2 * np.pi * 190 * np.arange(n) / SR) * env_exp(n, 0.04)
        nz = hp(noise(n, seed), 0.75) * env_exp(n, 0.07)
        return (body * 0.5 + nz * 0.8)

    def clap(seed=2):
        n = int(0.25 * SR)
        nz = hp(noise(n, seed), 0.6)
        e = np.zeros(n)
        for k, d in enumerate([0, 0.011, 0.022]):
            i = int(d * SR)
            e[i:] += env_exp(n - i, 0.012 if k < 2 else 0.09)
        return nz * e * 0.7

    def hat(open_=False, seed=3):
        n = int((0.18 if open_ else 0.04) * SR)
        return hp(noise(n, seed), 0.35) * env_exp(n, 0.06 if open_ else 0.012) * 0.35

    def crash(seed=4):
        n = int(1.6 * SR)
        return hp(noise(n, seed), 0.45) * env_exp(n, 0.5) * 0.3

    def b808(freq, length):
        n = int(length * SR)
        t = np.arange(n) / SR
        f = freq * (1 + 0.6 * np.exp(-t * 30))
        s = np.sin(2 * np.pi * np.cumsum(f) / SR)
        return np.tanh(s * 1.6) * env_exp(n, length * 0.6) * 0.7

    def shout(seed):
        # gang "hit": square chord stab + filtered noise "voice" burst
        n = int(0.26 * SR)
        e = env_exp(n, 0.09)
        chord = sum(square(midi(m), n, 0.5) for m in (57, 64, 69)) / 3
        nz = lp(noise(n, seed), 0.35)
        return (chord * 0.45 + nz * 0.9) * e

    def click():
        n = int(0.012 * SR)
        return np.sin(2 * np.pi * 2000 * np.arange(n) / SR) * env_exp(n, 0.003)

    K, SN, CL, HC, HO, CR = kick(), snare(), clap(), hat(), hat(True), crash()

    # chord loop (Am F C G) roots + triads
    prog = [(57, [57, 60, 64]), (53, [53, 57, 60]), (48, [55, 60, 64]), (55, [55, 59, 62])]
    sec_of_bar = {}
    for s in song["sections"]:
        for b in range(s["bar"], s["bar"] + s["bars"]):
            sec_of_bar[b] = s["id"]

    for bi, b0 in enumerate(bars):
        sec = sec_of_bar.get(bi, "out")
        b1 = bars[bi + 1] if bi + 1 < len(bars) else dur
        step = (b1 - b0) / 16
        root, triad = prog[bi % 4]
        cold = sec == "intro" and bi < 4
        tail = bi >= 48
        bridge = sec == "br"
        chorus = sec in ("ch1", "ch2")
        if bi in [s["bar"] for s in song["sections"]] and not cold:
            mix.add(b0, CR, 0.8)
        # drums
        if not cold and not tail:
            if bridge:
                for st in (0, 10):
                    mix.add(b0 + st * step, b808(midi(root - 12), 0.5), 0.9)
                for st in (4, 12):
                    mix.add(b0 + st * step, CL, 0.9)
                for st in range(0, 16, 2):
                    mix.add(b0 + st * step, HC, 0.25, 0.3)
            else:
                for st in (0, 7, 10) if not chorus else (0, 3, 7, 10):
                    mix.add(b0 + st * step, K, 0.95)
                for st in (4, 12):
                    mix.add(b0 + st * step, SN, 0.7)
                    if chorus:
                        mix.add(b0 + st * step, CL, 0.5)
                for st in range(0, 16, 2):
                    swing = step * 0.18 if st % 4 == 2 else 0
                    mix.add(b0 + st * step + swing, HO if st == 14 else HC, 0.6, 0.25)
        elif cold and bi == 3:
            for st in range(0, 16):  # riser hats into the chant
                mix.add(b0 + st * step, HC, 0.15 + st * 0.03, 0.2)
        # bass (square, 8ths) except cold open / bridge
        if not cold and not bridge and not tail:
            for st in range(0, 16, 2):
                note = root - 12 + (12 if st in (6, 14) else 0)
                n = int(step * 1.7 * SR)
                mix.add(b0 + st * step, square(midi(note), n, 0.25) * env_exp(n, 0.12) * 0.22)
        # pad (triangle chord) in intro / bridge / tail
        if cold or bridge or tail or sec == "intro":
            n = int((b1 - b0) * SR)
            pad = sum(tri(midi(m), n) for m in triad) / 3
            att = np.minimum(1, np.arange(n) / (0.3 * SR))
            rel = env_exp(n, 2.5 if tail else 1.6)
            mix.add(b0, pad * att * rel * 0.22, 1.0, -0.2)
            mix.add(b0, pad * att * rel * 0.22, 1.0, 0.2)
        # lead: chip arpeggio 16ths in chorus, sparse plucks in verses
        if chorus or (sec in ("v1", "v2", "out") and not tail):
            for st in range(16):
                if not chorus and st % 4 != 2:
                    continue
                m = triad[st % 3] + 12 + (12 if chorus and st % 8 >= 4 else 0)
                n = int(step * 0.9 * SR)
                g = 0.13 if chorus else 0.09
                mix.add(b0 + st * step, square(midi(m), n, 0.125) * env_exp(n, 0.06) * g, 1.0, 0.35 if st % 2 else -0.35)
        # cold-open twinkle arp (soft)
        if cold:
            for st in range(0, 16, 2):
                m = triad[(st // 2) % 3] + 24
                n = int(step * 1.5 * SR)
                mix.add(b0 + st * step, tri(midi(m), n) * env_exp(n, 0.25) * 0.06, 1.0, 0.4 if st % 4 else -0.4)

    # chant / hey hits
    seed = 10
    for lid, times in song.get("hits", {}).items():
        for t in times:
            seed += 1
            mix.add(t, shout(seed), 0.9 if "out" not in lid else 1.0)
            mix.add(t, K, 0.6)
            if not a.no_clicks:
                mix.add(t, click(), 0.5)

    # master: trim, soft clip, normalize
    n = int(dur * SR)
    L, R = mix.L[:n], mix.R[:n]
    fade = int(0.05 * SR)
    L[-fade:] *= np.linspace(1, 0, fade)
    R[-fade:] *= np.linspace(1, 0, fade)
    st = np.stack([L, R], 1)
    st = np.tanh(st * 1.1)
    st /= max(1e-9, np.abs(st).max()) / 0.89
    pcm = (st * 32767).astype(np.int16)
    os.makedirs(os.path.dirname(a.out), exist_ok=True)
    with wave.open(a.out, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print(f"wrote {a.out} ({dur:.3f}s, {song.get('bpm')} BPM, {len(bars)} bars)")


if __name__ == "__main__":
    main()
