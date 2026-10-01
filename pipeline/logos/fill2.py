import json, subprocess, hashlib, os, io, string
from concurrent.futures import ThreadPoolExecutor
from PIL import Image
from html_icons import icons, UA
R='/Users/priyanshu/parity-tracker'
F=json.load(open('fill.json'))
def get(url,p):
    code=subprocess.run(['curl','-s','-L','-m','25','-A',UA,'-o',p,'-w','%{http_code}',url],capture_output=True,text=True).stdout
    return code=='200' and os.path.exists(p) and os.path.getsize(p)>=80
ph=set()
def probe(ch):
    p=f'fill/_ph_{ch}'
    if get(f'https://icon.horse/icon/{ch}zq-nonexistent-qx81.com',p): return hashlib.md5(open(p,'rb').read()).hexdigest()
with ThreadPoolExecutor(8) as ex: ph={h for h in ex.map(probe,string.ascii_lowercase+string.digits) if h}
print('horse placeholders',len(ph))
def load(p):
    try:
        im=Image.open(p)
        if getattr(im,'n_frames',1)>1 or p.endswith('.ico'):
            best=None
            for i in range(getattr(im,'n_frames',1)):
                im.seek(i)
                if best is None or im.size[0]>best.size[0]: best=im.copy()
            im=best
        if hasattr(im,'sizes') and im.format=='ICO':
            im.size=max(im.sizes); im.load()
        return im.convert('RGBA')
    except Exception: return None
def choose(x):
    cands=[]
    for r in x['res']:
        if r['tag']=='horse' and r['md5'] in ph: continue
        if r['tag'].startswith('v2') and r['dup']>2: continue
        cands.append(r['path'])
    try: lst=icons(x['dom'])[1][:3]
    except Exception: lst=[]
    for i,(_,u) in enumerate(lst):
        p=f"fill/{x['safe']}.html{i}"
        if get(u,p): cands.append(p)
    best=None
    for p in cands:
        im=load(p)
        if im is None: continue
        w,h=im.size
        if w<16 or h<16 or max(w,h)/min(w,h)>1.25: continue
        if best is None or w>best.size[0]: best=im
    return x,best
with ThreadPoolExecutor(8) as ex: out=list(ex.map(choose,F))
L=json.load(open(f'{R}/src/data/logos.json'))
added={'big':0,'small':0}; still=[]
for x,im in out:
    if im is None: still.append(x['sym']); continue
    canvas=Image.new('RGBA',(64,64),(255,255,255,0))
    if im.size[0]>=32:
        canvas=im.resize((64,64),Image.LANCZOS); added['big']+=1
    else:
        canvas.paste(im.resize((32,32),Image.LANCZOS),(16,16)); added['small']+=1
    fn=x['safe']+'.png'
    canvas.save(f'{R}/public/logos/{fn}')
    L[x['sym']]=fn
json.dump(L,open(f'{R}/src/data/logos.json','w'),indent=0,sort_keys=True)
open('still.txt','w').write('\n'.join(still))
print(added,'still missing',len(still),'total logos',len(L))
