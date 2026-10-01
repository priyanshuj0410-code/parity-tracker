import csv, re, json, glob
from uk_map import MAP, TRUSTS
ftse=json.load(open('ftse100.json'))
SIZE={'Less than 250':150,'250 to 499':375,'500 to 999':750,'1000 to 4999':3000,'5000 to 19,999':12500,'20,000 or more':30000}
rows={f[3:7]:list(csv.DictReader(open(f,encoding='utf-8-sig'))) for f in sorted(glob.glob('gpg20*.csv'))}
YEARS=sorted(rows)
def num(x):
    try: return float(x)
    except: return None
def rd(x,n=4): return None if x is None else round(x,n)
def title(s):
    s=s.strip(); return s[:1].upper()+s[1:].lower() if s else s
companies={}; index_members=[]
for c in ftse:
    n=c['name']; tick=c['ticker'].replace('.','')
    key=tick
    rec=dict(symbol=key,name=n,industry=title(c['sector']),exchange='LSE',country='GB',indexes=['ftse100'],marketCapCr=None,publicFloatPct=None,
             years={},filings={},payrollWeightCr=None,payrollWeightBasis=None,ukStatus=None,entities=[])
    index_members.append(key)
    if n in TRUSTS: rec['ukStatus']='Investment trust or externally managed fund: no employees of its own'; companies[key]=rec; continue
    inc,exc=MAP[n]; ri=re.compile(inc,re.I); rx=re.compile(exc,re.I) if exc else None
    prev_ids=None
    for y in YEARS:
        m=[r for r in rows[y] if (ri.search(r['EmployerName']) or ri.search(r['CurrentName'] or '')) and not (rx and (rx.search(r['EmployerName']) or rx.search(r['CurrentName'] or '')))]
        ents=[]
        for r in m:
            q=[num(r[k]) for k in ('FemaleLowerQuartile','FemaleLowerMiddleQuartile','FemaleUpperMiddleQuartile','FemaleTopQuartile')]
            g=num(r['DiffMeanHourlyPercent']); gm=num(r['DiffMedianHourlyPercent']); bg=num(r['DiffMeanBonusPercent'])
            if any(v is None for v in q) or g is None: continue
            f=sum(q)/400; size=SIZE.get(r['EmployerSize'],375)
            ents.append(dict(id=r['EmployerId'],name=r['EmployerName'].strip(),size=r['EmployerSize'],n=size,f=f,top=q[3]/100,g=g/100,gm=(gm or 0)/100,bg=bg/100 if bg is not None else None,link=r['CompanyLinkToGPGInfo'].strip()))
        if not ents: continue
        N=sum(e['n'] for e in ents)
        f=sum(e['n']*e['f'] for e in ents)/N
        wnum=sum(e['n']*e['f']*(1-e['g']) for e in ents); wden=sum(e['n']*(e['f']*(1-e['g'])+(1-e['f'])) for e in ents)
        keys={(e['id'],e['size']):e['n'] for e in ents}
        basis=False
        if prev_ids is not None:
            now_common=sum(n for k,n in keys.items() if k in prev_ids)/N
            prev_common=sum(n for k,n in prev_ids.items() if k in keys)/sum(prev_ids.values())
            basis=min(now_common,prev_common)<0.7
        prev_ids=keys
        bgs=[e for e in ents if e['bg'] is not None]
        rec['years'][y]=dict(w=rd(wnum/wden),wKind='reported',fPerm=None,fAll=rd(f),permHeadcount=None,headcount=N,board=None,boardWomen=None,payrollCr=None,dq=1,
            note=f"{len(ents)} UK {'employer' if len(ents)==1 else 'employers'}; hourly pay basis",boundary='UK employers',basisChange=basis,
            topQuartile=rd(sum(e['n']*e['top'] for e in ents)/N),gapMean=rd(sum(e['n']*e['g'] for e in ents)/N),gapMedian=rd(sum(e['n']*e['gm'] for e in ents)/N),
            bonusGapMean=rd(sum(e['n']*e['bg'] for e in bgs)/sum(e['n'] for e in bgs)) if bgs else None,entityCount=len(ents))
        rec['entities']=[dict(name=e['name'],size=e['size'],link=e['link']) for e in sorted(ents,key=lambda e:-e['n'])]
        rec['entitiesYear']=y
    if not rec['years']: rec['ukStatus']='No UK employer in the group files a gender pay gap report (fewer than 250 UK staff per employer, or staff mostly outside the UK)'
    companies[key]=rec
# index: equal-weighted average across companies with data
def avg(vals): return sum(vals)/len(vals) if vals else None
idx_years={}
for y in YEARS:
    cs=[c for c in companies.values() if y in c['years']]
    if not cs: continue
    sec={}
    for c in cs: sec.setdefault(c['industry'],[]).append(c['years'][y]['w'])
    idx_years[y]=dict(headline=rd(avg([c['years'][y]['w'] for c in cs])),companiesCovered=len(cs),companiesReported=len(cs),reportedPayrollShare=1,
        ownedPayroll=None,womenWages=None,gap=None,representationShare=None,payShare=None,
        workforce=rd(avg([c['years'][y]['fAll'] for c in cs])),topQuartile=rd(avg([c['years'][y]['topQuartile'] for c in cs])),gapMean=rd(avg([c['years'][y]['gapMean'] for c in cs])),
        sectors=sorted([dict(industry=k,w=rd(avg(v)),payrollShare=None,companies=len(v)) for k,v in sec.items()],key=lambda x:-x['w']))
yoy={}
for y0,y1 in zip(YEARS,YEARS[1:]):
    both=[c for c in companies.values() if y0 in c['years'] and y1 in c['years'] and not c['years'][y1]['basisChange']]
    if both:
        a=avg([c['years'][y0]['w'] for c in both]); b=avg([c['years'][y1]['w'] for c in both])
        yoy[f"{y0}>{y1}"]=dict(**{'from':rd(a),'to':rd(b)},change=rd(b-a),companies=len(both))
index=dict(id='ftse100',name='FTSE 100',country='GB',market='United Kingdom',exchange='LSE',weightsAsOf='2026-10-01',
    weighting='equal weight across companies (UK data has no payroll totals)',constituents=[dict(symbol=s,weight=None) for s in index_members],missing=[],years=idx_years,yoy=yoy)
json.dump(companies,open('uk_companies.json','w'),separators=(',',':')); json.dump(index,open('uk_index.json','w'),separators=(',',':'))
print('companies with data:',sum(1 for c in companies.values() if c['years']),'trusts:',sum(1 for c in companies.values() if c['ukStatus'] and 'trust' in c['ukStatus'].lower()))
print({y:(v['headline'],v['companiesCovered'],v['workforce'],v['topQuartile'],v['gapMean']) for y,v in idx_years.items()})
print(yoy)
ch=sorted([(c['years']['2025']['w']-c['years']['2024']['w'],c['name']) for c in companies.values() if '2025' in c['years'] and '2024' in c['years'] and not c['years']['2025']['basisChange']])
print('2024>2025 n',len(ch),'up',sum(1 for d,_ in ch if d>0.0005),'down',sum(1 for d,_ in ch if d<-0.0005),'median',ch[len(ch)//2][0])
print('top',[(n,round(d*100,1)) for d,n in ch[-4:]],'bottom',[(n,round(d*100,1)) for d,n in ch[:4]])
lv=sorted([(c['years']['2025']['w'],c['name']) for c in companies.values() if '2025' in c['years']])
print('lowest',[(n,round(w*100,1)) for w,n in lv[:5]],'highest',[(n,round(w*100,1)) for w,n in lv[-5:]])
