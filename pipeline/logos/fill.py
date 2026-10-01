import json, subprocess, hashlib, os, collections
from concurrent.futures import ThreadPoolExecutor
R='/Users/priyanshu/parity-tracker'
L=json.load(open(f'{R}/src/data/logos.json'))
UA='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36'
jobs=[l.rstrip('\n').split('\t') for l in open('jobs.txt') if l.strip()]
todo=[j for j in jobs if j[1] not in L]
os.makedirs('fill',exist_ok=True)
def size(p):
    out=subprocess.run(['sips','-g','pixelWidth','-g','pixelHeight',p],capture_output=True,text=True).stdout.split()
    try: return int(out[out.index('pixelWidth:')+1]), int(out[out.index('pixelHeight:')+1])
    except: return (0,0)
def fetch(j):
    safe,sym,dom=j
    res=[]
    for tag,url in (('v2',f'https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://www.{dom}&size=128'),
                    ('v2b',f'https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://{dom}&size=128'),
                    ('horse',f'https://icon.horse/icon/{dom}')):
        p=f'fill/{safe}.{tag}'
        code=subprocess.run(['curl','-s','-L','-m','25','-A',UA,'-o',p,'-w','%{http_code}',url],capture_output=True,text=True).stdout
        if code!='200' or not os.path.exists(p) or os.path.getsize(p)<100: continue
        w,h=size(p)
        res.append(dict(tag=tag,path=p,w=w,h=h,md5=hashlib.md5(open(p,'rb').read()).hexdigest()))
    return sym,safe,dom,res
with ThreadPoolExecutor(8) as ex: out=list(ex.map(fetch,todo))
cnt=collections.Counter(r['md5'] for _,_,_,rs in out for r in rs)
json.dump([dict(sym=s,safe=f,dom=d,res=[dict(r,dup=cnt[r['md5']]) for r in rs]) for s,f,d,rs in out],open('fill.json','w'),indent=0)
good=0
for s,f,d,rs in out:
    ok=[r for r in rs if r['w']>=32 and cnt[r['md5']]<3 and r['w']==r['h']]
    if ok: good+=1
print('todo',len(todo),'with >=32px square icon',good)
print('common hashes',[(h[:8],n) for h,n in cnt.most_common(5)])
