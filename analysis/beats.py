import librosa, numpy as np, json, sys
M='music/'
def load(name, sr=22050):
    y,_=librosa.load(M+name, sr=sr, mono=True); return y
sr=22050
mix=load('Hacktoberfest in the 757.mp3')
drums=load('Hacktoberfest in the 757 (Drums).mp3')
for nm,y in [('mix',mix),('drums',drums)]:
    oenv=librosa.onset.onset_strength(y=y,sr=sr)
    tempo,beats=librosa.beat.beat_track(onset_envelope=oenv,sr=sr,units='time',tightness=400)
    t=np.atleast_1d(tempo)[0]
    d=np.diff(beats)
    print(nm,'tempo',round(float(t),2),'nbeats',len(beats),'first',beats[:6].round(3),'median ibi',np.median(d).round(4),'std',d.std().round(4))
    if nm=='drums':
        np.save('analysis/drum_beats.npy',beats)
# tempogram global estimate
oenv=librosa.onset.onset_strength(y=drums,sr=sr)
print('tempo candidates', librosa.feature.tempo(onset_envelope=oenv,sr=sr,aggregate=None)[:1])
# RMS of mix per 0.5s to see structure
hop=512
rms=librosa.feature.rms(y=mix,hop_length=hop)[0]
times=librosa.times_like(rms,sr=sr,hop_length=hop)
for s in range(0,142,2):
    m=rms[(times>=s)&(times<s+2)].mean()
    print(f'{s:3d}s {"#"*int(m*120)}')
