import sys, wave
from pocketsphinx import Decoder
path=sys.argv[1]; start=float(sys.argv[2]); end=float(sys.argv[3])
phr=['seven five seven','hacktoberfest','and you know it','you know it','hampton','hey','yeah','from the sea to the stars','in the seven five seven','glow','let\'s go','come on','sign up on em el aitch','saturday ten a m','makerspace','we\'ll see you then','revolution vee a','wake up','oh','uh','hampton wake up']
EXTRA={'hacktoberfest':'HH AE K T OW B ER F EH S T','makerspace':'M EY K ER S P EY S','aitch':'EY CH','vee':'V IY','el':'EH L','em':'EH M'}
g="#JSGF V1.0;\ngrammar g;\npublic <s> = ( <p> )+ ;\n<p> = "+' | '.join(phr)+" ;\n"
w=wave.open(path,'rb'); sr=w.getframerate(); w.setpos(int(start*sr)); data=w.readframes(int((end-start)*sr))
d=Decoder(samprate=sr)
for wd,ph in EXTRA.items():
    if d.lookup_word(wd) is None: d.add_word(wd,ph,False)
d.add_jsgf_string("g", g); d.activate_search("g")
d.start_utt(); d.process_raw(data, full_utt=True); d.end_utt()
sg=d.seg()
print(f'[{start}-{end}]',' '.join(f'{s.word}@{start+s.start_frame/100:.2f}' for s in (sg or []) if s.word not in ('<sil>','<s>','</s>','(NULL)','[NOISE]')))
