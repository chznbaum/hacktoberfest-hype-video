import librosa, numpy as np, sys
sr=22050
first,ibi=np.load('analysis/grid.npy')
def ons(name,a,b,delta=0.25):
    y,_=librosa.load('music/'+name,sr=sr,mono=True,offset=a,duration=b-a)
    o=librosa.onset.onset_strength(y=y,sr=sr)
    on=librosa.onset.onset_detect(onset_envelope=o,sr=sr,units='time',delta=delta,backtrack=False)
    rms=librosa.feature.rms(y=y)[0]; t=librosa.times_like(rms,sr=sr)
    out=[]
    for x in on:
        e=rms[np.argmin(abs(t-x)):np.argmin(abs(t-x))+8].max()
        out.append((a+x,e))
    mx=max(e for _,e in out) if out else 1
    return [(round(x,2),round(e/mx,2), round(((x-first)/ibi)%4,2)) for x,e in out if e/mx>0.35]
for nm,a,b in [('Vocals',0,13),('Backing Vocals',0,13),('Backing Vocals',29,51),('Backing Vocals',49,60),('Vocals',49,60),('Backing Vocals',83,90),('Vocals',83,90),('Backing Vocals',107,141),('Vocals',107,141)]:
    print(nm,a,b, ons(f'Hacktoberfest in the 757 ({nm}).mp3',a,b))
