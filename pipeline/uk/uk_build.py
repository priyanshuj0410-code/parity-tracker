import csv, re, json, glob, os
# FTSE name to UK employer regexes: an input, pulled with pnpm data inputs pull.
U=json.load(open('uk_map.json'))
MAP,TRUSTS,MAP250,TRUSTS250=U['map'],set(U['trusts']),U['map250'],set(U['trusts250'])
# Company-report fallbacks and verified reasons, keyed by FTSE name: an input (decision 0015).
REPORTS=json.load(open('uk_reports.json')) if os.path.exists('uk_reports.json') else dict(figures={},reasons={})
ftse=[dict(c,idx=['ftse100','ftse350']) for c in json.load(open('ftse100.json'))]+[dict(c,idx=['ftse350']) for c in json.load(open('ftse250.json'))]
# FTSE 250 tickers that are also NSE symbols get an exchange prefix.
CLASH={'NCC','RHIM'}
def norm(s): s=(s or '').upper().replace('&',' & '); s=re.sub(r"[.'’,()\"/]",' ',s); return re.sub(r'\s+',' ',s).strip()
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
    key='LSE-'+tick if tick in CLASH else tick
    rec=dict(symbol=key,name=n,industry=title(c['sector']),exchange='LSE',country='GB',indexes=c['idx'],marketCapCr=None,publicFloatPct=None,
             years={},filings={},payrollWeightCr=None,payrollWeightBasis=None,ukStatus=None,entities=[])
    index_members.append(key)
    if n in TRUSTS or n in TRUSTS250: rec['ukStatus']='Investment trust or externally managed fund: no employees of its own'; companies[key]=rec; continue
    inc,exc=MAP[n] if n in MAP else MAP250[n]; ri=re.compile(inc,re.I); rx=re.compile(exc,re.I) if exc else None
    names=(lambda r:(r['EmployerName'],r['CurrentName'] or '')) if n in MAP else (lambda r:(norm(r['EmployerName']),norm(r['CurrentName'])))
    prev_ids=None
    for y in YEARS:
        m=[r for r in rows[y] if any(ri.search(x) for x in names(r)) and not (rx and any(rx.search(x) for x in names(r)))]
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
    # Where no UK employer in the group files, the company's own group-wide figures from its annual report (decision 0015).
    for y,o in ((o['year'],o) for o in REPORTS['figures'].get(n,[])):
        if y in rec['years']: continue
        f,g=o['womenShare'],o['gapMean']/100
        rec['years'][y]=dict(w=rd(f*(1-g)/(f*(1-g)+(1-f))),wKind='reported',fPerm=None,fAll=rd(f),permHeadcount=None,headcount=None,board=None,boardWomen=None,payrollCr=None,dq=1,
            note=f"The company's own group-wide figures ({o['basis']}), not a UK gender pay gap filing",boundary='Whole group, worldwide (company report)',basisChange=True,
            topQuartile=None,gapMean=rd(g),gapMedian=None,bonusGapMean=None,entityCount=0,
            reportSources=[dict(title=o['title'],url=o['url'],page=o.get('page'),fields=['gapMean','fAll'],scope='the whole group, worldwide')])
    if not rec['years']: rec['ukStatus']='No UK employer in the group files a gender pay gap report (fewer than 250 UK staff per employer, or staff mostly outside the UK)'
    # A verified reason, read from the company's own documents, for a latest year with no filing.
    if n in REPORTS['reasons'] and YEARS[-1] not in rec['years']: rec['ukStatus']=REPORTS['reasons'][n]
    companies[key]=rec
# indexes: equal-weighted average across companies with data
def avg(vals): return sum(vals)/len(vals) if vals else None
def make_index(ix_id,name,as_of):
    keys=[('LSE-'+t if t in CLASH else t) for t in (c['ticker'].replace('.','') for c in ftse if ix_id in c['idx'])]
    members=[companies[k] for k in keys]
    idx_years={}
    for y in YEARS:
        # Company-report years (group-wide, not UK staff) stay out of the index, which is on the statutory basis.
        cs=[c for c in members if y in c['years'] and not c['years'][y].get('reportSources')]
        if not cs: continue
        sec={}
        for c in cs: sec.setdefault(c['industry'],[]).append(c['years'][y]['w'])
        idx_years[y]=dict(headline=rd(avg([c['years'][y]['w'] for c in cs])),companiesCovered=len(cs),companiesReported=len(cs),reportedPayrollShare=1,
            ownedPayroll=None,womenWages=None,gap=None,representationShare=None,payShare=None,
            workforce=rd(avg([c['years'][y]['fAll'] for c in cs])),topQuartile=rd(avg([c['years'][y]['topQuartile'] for c in cs])),gapMean=rd(avg([c['years'][y]['gapMean'] for c in cs])),
            sectors=sorted([dict(industry=k,w=rd(avg(v)),payrollShare=None,companies=len(v)) for k,v in sec.items()],key=lambda x:-x['w']))
    yoy={}
    for y0,y1 in zip(YEARS,YEARS[1:]):
        both=[c for c in members if y0 in c['years'] and y1 in c['years'] and not c['years'][y1]['basisChange'] and not c['years'][y1].get('reportSources') and not c['years'][y0].get('reportSources')]
        if both:
            a=avg([c['years'][y0]['w'] for c in both]); b=avg([c['years'][y1]['w'] for c in both])
            yoy[f"{y0}>{y1}"]=dict(**{'from':rd(a),'to':rd(b)},change=rd(b-a),companies=len(both))
    return dict(id=ix_id,name=name,country='GB',market='United Kingdom',exchange='LSE',weightsAsOf=as_of,
        weighting='equal weight across companies (UK data has no payroll totals)',constituents=[dict(symbol=k,weight=None) for k in keys],missing=[],years=idx_years,yoy=yoy)
indexes={'ftse100':make_index('ftse100','FTSE 100','2026-10-01'),'ftse350':make_index('ftse350','FTSE 350','2026-10-01')}
json.dump(companies,open('uk_companies.json','w'),separators=(',',':')); json.dump(indexes,open('uk_indexes.json','w'),separators=(',',':'))
print('companies with data:',sum(1 for c in companies.values() if c['years']),'trusts:',sum(1 for c in companies.values() if c['ukStatus'] and 'trust' in c['ukStatus'].lower()))
for ix in indexes.values(): print(ix['id'],{y:(v['headline'],v['companiesCovered']) for y,v in ix['years'].items()})
ch=sorted([(c['years']['2025']['w']-c['years']['2024']['w'],c['name']) for c in companies.values() if '2025' in c['years'] and '2024' in c['years'] and not c['years']['2025']['basisChange']])
print('2024>2025 n',len(ch),'up',sum(1 for d,_ in ch if d>0.0005),'down',sum(1 for d,_ in ch if d<-0.0005),'median',ch[len(ch)//2][0])
print('top',[(n,round(d*100,1)) for d,n in ch[-4:]],'bottom',[(n,round(d*100,1)) for d,n in ch[:4]])
lv=sorted([(c['years']['2025']['w'],c['name']) for c in companies.values() if '2025' in c['years']])
print('lowest',[(n,round(w*100,1)) for w,n in lv[:5]],'highest',[(n,round(w*100,1)) for w,n in lv[-5:]])
