import json
E=json.load(open('eu_values.json')); S=json.load(open('sx5e.json'))
# The 100 largest EU-domiciled members of the STOXX Europe 600 (iShares EXSA holdings, 1 October 2026);
# members also in the Euro Stoxx 50 share its record.
T=json.load(open('stoxx600_eu_top100.json'))
top={m['ticker'] for m in T}
L=[dict(x,idx=['eurostoxx50']+(['stoxx600eu100'] if x['ticker'] in top else [])) for x in S]+[dict(m,idx=['stoxx600eu100']) for m in T if not m.get('sx5e')]
V={v['ticker']:v for v in E['values']}
def rd(x,n=4): return None if x is None else round(x,n)
companies={}
for x in L:
    t=x['ticker']; key='EU-'+t
    rec=dict(symbol=key,name=x['name'],industry=x['sector'],exchange=t.split('.')[-1] if '.' in t else '',country='EU',indexes=x['idx'],marketCapCr=None,publicFloatPct=None,
             years={},filings={},payrollWeightCr=None,payrollWeightBasis=None,noDataReason=None,entities=[])
    v=V.get(t)
    if not v:
        rec['noDataReason']=E['excluded'].get(t) or E['unresolved'].get(t); companies[key]=rec; continue
    for yr,g in (('2024',v['gap2024']),('2025',v['gap2025'])):
        if g is None: continue
        rec['years'][yr]=dict(w=rd(1-g/100),wKind='reported',fPerm=None,fAll=None,permHeadcount=None,headcount=None,board=None,boardWomen=None,payrollCr=None,dq=1,
            note='',boundary='Group (as reported)',basisChange=False,topQuartile=None,gapMean=rd(g/100),gapMedian=None,bonusGapMean=None,entityCount=1)
    rec['entities']=[dict(name='Company sustainability statement',size=v['basis'],link=v['source'] or '')]
    rec['entitiesYear']='2025' if v['gap2025'] is not None else '2024'
    companies[key]=rec
def avg(a): return sum(a)/len(a) if a else None
def make_index(ix_id,name,as_of,keys):
    members=[companies['EU-'+k] for k in keys]
    years={}
    for yr in ('2024','2025'):
        cs=[c for c in members if yr in c['years']]
        sec={}
        for c in cs: sec.setdefault(c['industry'],[]).append(c['years'][yr]['w'])
        years[yr]=dict(headline=rd(avg([c['years'][yr]['w'] for c in cs])),companiesCovered=len(cs),companiesReported=len(cs),reportedPayrollShare=1,
            ownedPayroll=None,womenWages=None,gap=None,representationShare=None,payShare=None,
            verified=sum(1 for k in keys if k in V),excluded=sum(1 for k in keys if k in E['excluded']),unresolved=sum(1 for k in keys if k in E['unresolved']),
            sectors=sorted([dict(industry=k,w=rd(avg(v)),payrollShare=None,companies=len(v)) for k,v in sec.items()],key=lambda s:-s['w']))
    both=[c for c in members if '2024' in c['years'] and '2025' in c['years']]
    a=avg([c['years']['2024']['w'] for c in both]); b=avg([c['years']['2025']['w'] for c in both])
    return dict(id=ix_id,name=name,country='EU',market='European Union',exchange='STOXX',weightsAsOf=as_of,weighting='equal weight across companies',
        constituents=[dict(symbol='EU-'+k,weight=None) for k in keys],missing=[],years=years,yoy={'2024>2025':dict(**{'from':rd(a),'to':rd(b)},change=rd(b-a),companies=len(both))})
indexes={'eurostoxx50':make_index('eurostoxx50','Euro Stoxx 50','2025-09-22',[x['ticker'] for x in S]),
         'stoxx600eu100':make_index('stoxx600eu100','STOXX 600: 100 largest EU members','2026-10-01',[m['ticker'] for m in T])}
json.dump(companies,open('eu_companies.json','w'),separators=(',',':')); json.dump(indexes,open('eu_indexes.json','w'),separators=(',',':'))
for ix in indexes.values(): print(ix['id'],{y:(v['headline'],v['companiesCovered']) for y,v in ix['years'].items()}, ix['yoy'])
