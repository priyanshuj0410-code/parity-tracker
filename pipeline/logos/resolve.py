import json, subprocess, urllib.parse, csv, time
UA='ParityTracker/0.1 (https://parity-tracker-eight.vercel.app)'
def get(url, data=None):
    args=['curl','-s','-m','90','-A',UA]
    if data: args+=['--data-urlencode',data]
    return json.loads(subprocess.run(args+[url],capture_output=True,text=True).stdout or '{}')
T=json.load(open('targets.json'))
titles=sorted(set(T.values())); qid={}
for i in range(0,len(titles),50):
    b=titles[i:i+50]
    d=get('https://en.wikipedia.org/w/api.php?'+urllib.parse.urlencode({'action':'query','prop':'pageprops','ppprop':'wikibase_item','redirects':1,'format':'json','titles':'|'.join(b)}))
    q=d.get('query',{}); norm={n['from']:n['to'] for n in q.get('normalized',[])}; red={r['from']:r['to'] for r in q.get('redirects',[])}
    bytitle={p['title']:p.get('pageprops',{}).get('wikibase_item') for p in q.get('pages',{}).values()}
    for t in b:
        x=norm.get(t,t); x=red.get(x,x); qid[t]=bytitle.get(x)
    time.sleep(0.3)
keys={k:qid.get(v) for k,v in T.items()}
# India by ISIN
S='/private/tmp/claude-501/-Users-priyanshu-Thoth/331f5a4b-ed64-47d2-b27e-fb4b175430a2/scratchpad'
isin={}
for f in ('n50.csv','nn50.csv'):
    for r in csv.DictReader(open(f'{S}/{f}')): isin[r['ISIN Code']]=r['Symbol']
q='SELECT ?item ?isin WHERE { VALUES ?isin { %s } ?item wdt:P946 ?isin . }' % ' '.join(f'"{i}"' for i in isin)
d=get('https://query.wikidata.org/sparql?format=json&query='+urllib.parse.quote(q))
for b in d.get('results',{}).get('bindings',[]):
    keys['IN:'+isin[b['isin']['value']]]=b['item']['value'].rsplit('/',1)[1]
ids=sorted({v for v in keys.values() if v}); claims={}
for i in range(0,len(ids),50):
    d=get('https://www.wikidata.org/w/api.php?'+urllib.parse.urlencode({'action':'wbgetentities','ids':'|'.join(ids[i:i+50]),'props':'claims','format':'json'}))
    for k,e in d.get('entities',{}).items():
        c=e.get('claims',{})
        val=lambda p: [x['mainsnak'].get('datavalue',{}).get('value') for x in c.get(p,[]) if x['mainsnak'].get('datavalue')]
        claims[k]={'site':val('P856')[:1],'logo':val('P154')[:1]}
    time.sleep(0.3)
res={k:{'qid':v,**(claims.get(v,{}) if v else {})} for k,v in keys.items()}
json.dump(res,open('resolved.json','w'),indent=0)
from collections import Counter
c=Counter(); s=Counter()
for k,v in res.items():
    m=k.split(':')[0]; c[m]+=1; s[m]+= bool(v.get('site'))
print('resolved',dict(c)); print('with website',dict(s))
