import csv, json, subprocess, time, datetime, os, sys, urllib.parse
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
def get(url, out=None):
    a=["curl","-s","-m","90","-A",UA]
    if out: a+=["-o",out]
    return subprocess.run(a+[url],capture_output=True,text=not out).stdout
syms=[l.strip() for l in open(sys.argv[1]) if l.strip()]
meta=json.load(open('meta_all.json')) if os.path.exists('meta_all.json') else {}
for s in syms:
    if s in meta and meta[s].get('filings'): continue
    try:
        d=json.loads(get(f"https://www.nseindia.com/api/corporate-bussiness-sustainabilitiy?index=equities&symbol={urllib.parse.quote(s)}&from_date=01-01-2021&to_date=01-10-2026"))['data']
    except Exception as e:
        meta[s]={'error':str(e)[:80]}; continue
    best={}
    for x in d:
        if not x.get('xbrlFile'): continue
        try: sd=datetime.datetime.strptime(x['submissionDate'],'%d-%b-%Y')
        except: sd=datetime.datetime(1900,1,1)
        fy=int(x['fyTo'])
        if fy not in best or sd>best[fy][0]: best[fy]=(sd,x)
    fl={}
    for fy,(sd,x) in best.items():
        p=f"xa/{s}_{fy}.xml"
        if not os.path.exists(p) or os.path.getsize(p)<5000: get(x['xbrlFile'],p); time.sleep(0.25)
        fl[fy]={'xbrl':x['xbrlFile'],'pdf':x['attachmentFile'],'submitted':x['submissionDate'],'size':os.path.getsize(p)}
    meta[s]={'name':d[0]['companyName'] if d else s,'filings':fl}
    json.dump(meta,open('meta_all.json','w'),indent=1)
print('done',len(meta),sum(len(v.get('filings',{})) for v in meta.values()),[k for k,v in meta.items() if not v.get('filings')])
