import json,subprocess,time,urllib.parse,datetime,os
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
out=json.load(open('shp.json'))
for s in [l.strip() for l in open('syms_nse.txt') if l.strip()]:
    if s in out and 'error' not in out[s]: continue
    raw=subprocess.run(["curl","-s","-m","30","-A",UA,f"https://www.nseindia.com/api/corporate-share-holdings-master?index=equities&symbol={urllib.parse.quote(s)}"],capture_output=True,text=True).stdout
    try:
        d=json.loads(raw); b=max(d,key=lambda x:datetime.datetime.strptime(x['date'],'%d-%b-%Y'))
        out[s]={'date':b['date'],'promoter':float(b['pr_and_prgrp'] or 0),'public':float(b['public_val'] or 0)}
    except Exception as e: out[s]={'error':str(e)[:80]}
    time.sleep(0.3)
json.dump(out,open('shp.json','w'),indent=1)
print('shp',len(out),[k for k,v in out.items() if 'error' in v])
