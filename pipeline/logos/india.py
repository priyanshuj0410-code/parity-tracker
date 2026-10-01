import json, re, subprocess, urllib.parse, time
UA='ParityTracker/0.1 (https://parity-tracker-eight.vercel.app)'
def get(u): return json.loads(subprocess.run(['curl','-s','-m','90','-A',UA,u],capture_output=True,text=True).stdout or '{}')
def wt(page): return get('https://en.wikipedia.org/w/api.php?'+urllib.parse.urlencode({'action':'parse','page':page,'prop':'wikitext','format':'json'})).get('parse',{}).get('wikitext',{}).get('*','')
syms=set()
import csv
S='/private/tmp/claude-501/-Users-priyanshu-Thoth/331f5a4b-ed64-47d2-b27e-fb4b175430a2/scratchpad'
for f in ('n50.csv','nn50.csv'):
    for r in csv.DictReader(open(f'{S}/{f}')): syms.add(r['Symbol'])
found={}
for page in ('NIFTY 50','NIFTY Next 50'):
    t=wt(page)
    for chunk in re.split(r'\n\|-',t):
        lk=re.search(r'\[\[([^\]|#]+)',chunk)
        for s in syms:
            if lk and re.search(r'(?<![A-Z0-9&-])'+re.escape(s)+r'(?![A-Z0-9&-])',chunk):
                found.setdefault(s,lk.group(1))
print('wiki links for',len(found),'of',len(syms))
res=json.load(open('resolved.json'))
titles=[t for s,t in found.items() if not (res.get('IN:'+s) or {}).get('site')]
qid={}
for i in range(0,len(titles),50):
    b=titles[i:i+50]
    d=get('https://en.wikipedia.org/w/api.php?'+urllib.parse.urlencode({'action':'query','prop':'pageprops','ppprop':'wikibase_item','redirects':1,'format':'json','titles':'|'.join(b)}))
    q=d.get('query',{}); norm={n['from']:n['to'] for n in q.get('normalized',[])}; red={r['from']:r['to'] for r in q.get('redirects',[])}
    bt={p['title']:p.get('pageprops',{}).get('wikibase_item') for p in q.get('pages',{}).values()}
    for t in b: x=norm.get(t,t); qid[t]=bt.get(red.get(x,x))
ids=sorted({v for v in qid.values() if v}); claims={}
for i in range(0,len(ids),50):
    d=get('https://www.wikidata.org/w/api.php?'+urllib.parse.urlencode({'action':'wbgetentities','ids':'|'.join(ids[i:i+50]),'props':'claims','format':'json'}))
    for k,e in d.get('entities',{}).items():
        c=e.get('claims',{}); val=lambda p:[x['mainsnak'].get('datavalue',{}).get('value') for x in c.get(p,[]) if x['mainsnak'].get('datavalue')]
        claims[k]={'site':val('P856')[:1],'logo':val('P154')[:1]}
for s,t in found.items():
    if (res.get('IN:'+s) or {}).get('site'): continue
    q=qid.get(t)
    if q: res['IN:'+s]={'qid':q,**claims.get(q,{})}
json.dump(res,open('resolved.json','w'),indent=0)
print('India with website:',sum(1 for k,v in res.items() if k.startswith('IN:') and v.get('site')))
