import json, re
W=json.load(open('wgea.json')); auto=json.load(open('au_auto.json'))
# ASX top 300: the ASX 200 plus the next 100 companies by market value in ASX's own directory (3 October 2026),
# as S&P does not publish S&P/ASX 300 membership freely.
asx=[dict(a,idx=['asx200','asxtop300']) for a in json.load(open('asx200.json'))]+[dict(a,idx=['asxtop300']) for a in json.load(open('asxnext100.json'))]
OVR={'ANZ':('G','ANZ GROUP HOLDINGS LIMITED'),'TNE':('E','Technology One Limited'),'REG':('E','Regis Aged Care Pty Ltd'),
 'PMV':('E','JUST GROUP LIMITED'),'PXA':('G','Property Exchange Australia Limited'),'VCX':('E','Vicinity Property Management Trust'),
 'SOL':('G','Washington H. Soul Pattinson And Company Limited'),'NWS':('G','News Pty Limited'),'MFG':('E','Magellan Asset Management Limited'),
 'ALL':('E','Aristocrat Technologies Australia Pty Limited'),'SGM':('G','Sims Group Australia Holdings Limited'),'ASK':('G','Abacus Storage Operations Limited'),
 'CHC':('E','Charter Hall Holdings Pty. Limited'),
 'APZ':('G','Aspen Group Limited'),'CBO':('E','BOUNDARY BEND OLIVES PTY LTD'),'CKF':('E','Collins Restaurants Management Pty. Ltd.'),
 'JDO':('E','Judo Bank Pty Ltd'),'CMW':('E','Cromwell Operations Pty Ltd'),'GLF':('E','GEMLIFE ADMINISTRATION PTY LTD')}
REJECT={'MAF','SRL','SX2','BCI','UOS','CXO','SBM','A4N','FDC','WEB','CEN','GNE','MEZ','ZIP','FPH','CIA','CSC','CMM','CYL','WAF','DBI','ALX','CLW','CQR','CIP','AFI','MXT','CNU','PNI'}
FUNDS={'QRI','AFI','ARG','MFF','WAM','WLE','LSF','MXT','BWP','HDN','RGN','CLW','CQR','CIP','DRR','L1G'}
SIZE={'<250':175,'250-499':375,'500-999':750,'1000-4999':3000,'5000+':10000}
G={r[0]:r for r in W['groups']}; E={r[0]:r for r in W['emps']}
heads={}
for r in W['info']:
    try: heads[r[0]]=float(r[2])
    except: pass
def num(x):
    try: return float(x)
    except: return None
def rd(x,n=4): return None if x is None else round(x,n)
companies={}
for a in asx:
    code=a['code'].split('|')[0]; key='ASX-'+code
    rec=dict(symbol=key,name=a['name'],industry=a['sector'].strip('| '),exchange='ASX',country='AU',indexes=a['idx'],marketCapCr=None,publicFloatPct=None,
             years={},filings={},payrollWeightCr=None,payrollWeightBasis=None,noDataReason=None,entities=[])
    m=None
    if code in OVR: m=OVR[code]
    elif code not in REJECT and auto.get(a['code'],{}).get('match'): m=(auto[a['code']]['kind'],auto[a['code']]['match'])
    if not m:
        rec['noDataReason']=('Investment company, fund or externally managed trust: few or no employees of its own' if code in FUNDS
            else 'No Australian employer in the group reports to WGEA (fewer than 100 Australian staff, or operations mostly outside Australia)')
        companies[key]=rec; continue
    kind,name=m
    if kind=='G':
        r=G[name]; o=0; size=r[2]; n=heads.get(name) or SIZE.get(str(size).strip(),375)
        g,gb,gm,gmb,gp=num(r[3]),num(r[4]),num(r[5]),num(r[6]),num(r[7]); f,uq,umq,lmq,lq=[num(x) for x in r[11:16]]; avg=num(r[16])
    else:
        r=E[name]; size=r[5]; n=SIZE.get(str(size).strip(),375)
        g,gb,gm,gmb,gp=num(r[6]),num(r[7]),num(r[8]),num(r[9]),num(r[10]); f,uq,umq,lmq,lq=[num(x) for x in r[14:19]]; avg=num(r[19])
    if f is None or g is None:
        rec['noDataReason']='Reported to WGEA but without a usable gender pay gap'; companies[key]=rec; continue
    w=f*(1-g)/(f*(1-g)+(1-f))
    rec['years']['2024-25']=dict(w=rd(w),wKind='reported',fPerm=None,fAll=rd(f),permHeadcount=None,headcount=n,board=None,boardWomen=None,payrollCr=None,dq=1,
        note='',boundary='Australian employer group' if kind=='G' else 'Australian employer',basisChange=False,topQuartile=rd(uq),gapMean=rd(g),gapMedian=rd(gm),bonusGapMean=None,entityCount=1)
    if gp is not None:
        wp=f*(1-gp)/(f*(1-gp)+(1-f))
        rec['years']['2023-24']=dict(w=rd(wp),wKind='estimated',fPerm=None,fAll=None,permHeadcount=None,headcount=None,board=None,boardWomen=None,payrollCr=None,dq=3,
            note='2023-24 workforce shares are not in this release, so this uses the 2024-25 workforce share with the 2023-24 pay gap',boundary=rec['years']['2024-25']['boundary'],basisChange=False,topQuartile=None,gapMean=rd(gp),gapMedian=None,bonusGapMean=None,entityCount=1)
    rec['payrollAud']=round(n*avg) if (n and avg) else None
    rec['entities']=[dict(name=name,size=f"{int(n):,} employees" if kind=='G' and heads.get(name) else f"{size} employees",link='https://www.wgea.gov.au/data-statistics/data-explorer')]
    rec['entitiesYear']='2024-25'
    companies[key]=rec
def make_index(ix_id,name,as_of):
    keys=['ASX-'+x['code'].split('|')[0] for x in asx if ix_id in x['idx']]
    members=[companies[k] for k in keys]
    def pooled(y,field):
        cs=[c for c in members if y in c['years'] and c['years'][y].get(field) is not None and c.get('payrollAud')]
        if not cs: return None,0
        tw=sum(c['payrollAud'] for c in cs); return sum(c['payrollAud']*c['years'][y][field] for c in cs)/tw,len(cs)
    yrs={}
    for y in ('2023-24','2024-25'):
        h,n=pooled(y,'w')
        if h is None: continue
        cs=[c for c in members if y in c['years'] and c.get('payrollAud')]
        tw=sum(c['payrollAud'] for c in cs); sec={}
        for c in cs: s=sec.setdefault(c['industry'],[0,0,0]); s[0]+=c['payrollAud']*c['years'][y]['w']; s[1]+=c['payrollAud']; s[2]+=1
        yrs[y]=dict(headline=rd(h),companiesCovered=n,companiesReported=sum(1 for c in cs if c['years'][y]['wKind']=='reported'),reportedPayrollShare=1 if y=='2024-25' else 0,
            ownedPayroll=None,womenWages=None,gap=None,representationShare=None,payShare=None,
            workforce=rd(pooled(y,'fAll')[0]),topQuartile=rd(pooled(y,'topQuartile')[0]),gapMean=rd(pooled(y,'gapMean')[0]),
            sectors=sorted([dict(industry=k,w=rd(v[0]/v[1]),payrollShare=rd(v[1]/tw),companies=v[2]) for k,v in sec.items()],key=lambda x:-x['w']))
    both=[c for c in members if '2023-24' in c['years'] and '2024-25' in c['years'] and c.get('payrollAud')]
    tw=sum(c['payrollAud'] for c in both)
    a=sum(c['payrollAud']*c['years']['2023-24']['w'] for c in both)/tw; b=sum(c['payrollAud']*c['years']['2024-25']['w'] for c in both)/tw
    return dict(id=ix_id,name=name,country='AU',market='Australia',exchange='ASX',weightsAsOf=as_of,
        weighting='payroll-weighted (Australian headcount × average remuneration), equal ownership slice',constituents=[dict(symbol=k,weight=None) for k in keys],
        missing=[],years=yrs,yoy={'2023-24>2024-25':dict(**{'from':rd(a),'to':rd(b)},change=rd(b-a),companies=len(both))})
indexes={'asx200':make_index('asx200','S&P/ASX 200','2026-04-05'),'asxtop300':make_index('asxtop300','ASX top 300','2026-10-03')}
json.dump(companies,open('au_companies.json','w'),separators=(',',':')); json.dump(indexes,open('au_indexes.json','w'),separators=(',',':'))
print('with data',sum(1 for c in companies.values() if c['years']),'no data',sum(1 for c in companies.values() if not c['years']))
for ix in indexes.values(): print(ix['id'],{y:(v['headline'],v['companiesCovered'],v['workforce'],v['topQuartile']) for y,v in ix['years'].items()},ix['yoy'])
lv=sorted([(c['years']['2024-25']['w'],c['name']) for c in companies.values() if '2024-25' in c['years']])
print('low',[(n,round(w*100,1)) for w,n in lv[:5]],'high',[(n,round(w*100,1)) for w,n in lv[-5:]])
