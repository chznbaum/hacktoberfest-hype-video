import sys, wave, json, re
from pocketsphinx import Decoder
lyr=json.load(open('content/lyrics.json'))
path=sys.argv[1]; start=float(sys.argv[2]); end=float(sys.argv[3]); ids=sys.argv[4].split(',')
lines=lyr['lines'] if 'lines' in lyr else lyr
def norm(s):
    s=s.lower().replace('757','seven five seven').replace('m-l-h','m l h').replace('v-a','v a').replace('-',' ').replace("'bout","about").replace("'cause","because")
    s=s.replace('t-shirts','tee shirts').replace('uno qs','uno queues').replace(' ai ',' a i ').replace('ai ','a i ',1) if s.startswith('ai ') else s.replace('t-shirts','tee shirts').replace('uno qs','uno queues').replace(' ai ',' a i ')
    s=s.replace('m l h','em el aitch').replace(' v a ',' vee a ')
    s=re.sub(r"[^a-z' ]",' ',s); return ' '.join(s.split())
txt=[]
for i in ids:
    t=lines[i] if isinstance(lines[i],str) else lines[i].get('text')
    txt.append(norm(t))
text=' '.join(txt)
w=wave.open(path,'rb'); sr=w.getframerate()
w.setpos(int(start*sr)); data=w.readframes(int((end-start)*sr))
d=Decoder(samprate=sr, bestpath=False, beam=1e-100, wbeam=1e-80, pbeam=1e-100)
words=text.split()
EXTRA={'hacktoberfest':'HH AE K T OW B ER F EH S T','makerspace':'M EY K ER S P EY S','unsloth':'AH N S L AO TH','gemma':'JH EH M AH','hermes':'HH ER M IY Z','arduino':'AA R D W IY N OW','uno':'UW N OW','rosa\'s':'R OW Z AH Z','aitch':'EY CH','vee':'V IY','el':'EH L','em':'EH M','swag':'S W AE G'}
for wd,ph in EXTRA.items():
    if d.lookup_word(wd) is None: d.add_word(wd,ph,True)
missing=[x for x in words if d.lookup_word(x) is None]
if missing: print('OOV',missing); sys.exit(1)
d.set_align_text(text)
d.start_utt(); d.process_raw(data, full_utt=True); d.end_utt()
sg=d.seg()
if sg is None: print('NOALIGN'); sys.exit(2)
segs=[(s.word, start+s.start_frame/100, start+s.end_frame/100) for s in sg]
print(' '.join(f'{t}@{a:.2f}' for t,a,b in segs if t not in ('<sil>','<s>','</s>','(NULL)')))
