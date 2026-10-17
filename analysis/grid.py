import librosa, numpy as np
sr=22050; M='music/'
drum_beats=np.load('analysis/drum_beats.npy')
# fit constant grid
k=np.round((drum_beats-drum_beats[0])/0.6037).astype(int)
A=np.vstack([k,np.ones_like(k)]).T
ibi,b0=np.linalg.lstsq(A,drum_beats,rcond=None)[0]
res=drum_beats-(b0+k*ibi)
print('ibi',ibi,'bpm',60/ibi,'b0',b0,'resid max',np.abs(res).max().round(4))
# extend grid backwards to t>=0
n0=int(np.floor(b0/ibi)); first=b0-n0*ibi
print('first grid beat',first)
np.save('analysis/grid.npy',np.array([first,ibi]))
def env(name):
    y,_=librosa.load(M+name,sr=sr,mono=True)
    hop=256
    r=librosa.feature.rms(y=y,hop_length=hop)[0]
    t=librosa.times_like(r,sr=sr,hop_length=hop)
    return t,r
tv,rv=env('Hacktoberfest in the 757 (Vocals).mp3')
tb,rb=env('Hacktoberfest in the 757 (Backing Vocals).mp3')
td,rd=env('Hacktoberfest in the 757 (Drums).mp3')
def cell(t,r,a,b):
    m=(t>=a)&(t<b); return r[m].mean() if m.any() else 0
nb=int((141.4-first)/ibi)+1
sub=4
chars=' .:-=+*#%@'
vmax=np.percentile(rv,98); bmax=np.percentile(rb,98); dmax=np.percentile(rd,98)
print('beat grid: each row = 1 bar (4 beats x 4 subdivisions). V=lead vocal, B=backing, D=drums')
for bar in range((nb+3)//4):
    rowv=rowb=rowd=''
    for beat in range(4):
        for s in range(sub):
            a=first+(bar*4+beat)*ibi+s*ibi/sub; b=a+ibi/sub
            rowv+=chars[min(9,int(cell(tv,rv,a,b)/vmax*9))]
            rowb+=chars[min(9,int(cell(tb,rb,a,b)/bmax*9))]
            rowd+=chars[min(9,int(cell(td,rd,a,b)/dmax*9))]
        rowv+='|';rowb+='|';rowd+='|'
    print(f'bar{bar:3d} {first+bar*4*ibi:6.2f}s V[{rowv}] B[{rowb}] D[{rowd}]')
