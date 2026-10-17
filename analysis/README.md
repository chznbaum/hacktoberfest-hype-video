# Song analysis (real Suno track)

- `beats.py` / `grid.py`: beat tracking on the drum stem; refit with sequential beat indices gives **100.0 BPM**,
  beat 0.60007 s, first beat 0.208 s; downbeats on beat%4==0 (kick energy). `grid.npy` = [first, ibi].
- `align.py`: pocketsphinx forced alignment of lyric lines against the vocal stem (per-section windows).
- `jsgf.py`: grammar decoding of ad-lib sections (post-choruses are "and you know it! / Hampton!" ad-libs).
- `onsets.py`: vocal / backing-vocal onsets for chant and "Hey!" hits.
- `build_song_map.py`: writes `content/song-map.json` + `content/lyrics.json` from the measured times.
