import sys, wave, json
from pocketsphinx import Decoder
path=sys.argv[1]; start=float(sys.argv[2]); end=float(sys.argv[3])
w=wave.open(path,'rb'); sr=w.getframerate()
w.setpos(int(start*sr)); data=w.readframes(int((end-start)*sr))
d=Decoder(samprate=sr)
d.start_utt(); d.process_raw(data, full_utt=True); d.end_utt()
h=d.hyp()
print(f'[{start:6.2f}-{end:6.2f}]', h.hypstr if h else '')
