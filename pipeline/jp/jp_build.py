import csv, json, re
n225=json.load(open('n225.json')); codes={c['code'] for c in n225}
rows={}
for r in csv.reader(open('99_20261002_utf8_bom.csv',encoding='utf-8-sig')):
    for c in re.findall(r'[0-9A-Z]{4}',(r[9] or '')):
        if c in codes: rows.setdefault(c,[]).append(r)
def num(x):
    try: return float(str(x).replace(',',''))
    except: return None
def rd(x,n=4): return None if x is None else round(x,n)
REGULAR=re.compile(r'^(正社員|正規|社員$|従業員$|全従業員|全社員|全労働者|職員$|労働者全体|対象とする労働者すべて)')
SIZE_ORDER=['10人未満','10～30人','31～100人','101～300人','301～500人','501～1000人','1001～5000人','5001人以上']
companies={}
for c in n225:
    key='TSE-'+c['code']
    rec=dict(symbol=key,name=c['name'],industry=c['sector'],exchange='TSE',country='JP',indexes=['nikkei225'],marketCapCr=None,publicFloatPct=None,
             years={},filings={},payrollWeightCr=None,payrollWeightBasis=None,noDataReason=None,entities=[])
    rs=rows.get(c['code'])
    if not rs:
        rec['noDataReason']="Not in the government's women's advancement database. Companies may publish these figures on their own websites instead."
        companies[key]=rec; continue
    r=max(rs,key=lambda x:(SIZE_ORDER.index(x[6]) if x[6] in SIZE_ORDER else -1, x[235]))
    ratio=num(r[205]); reg=num(r[206]); non=num(r[207])
    ok=lambda v: v is not None and 20<=v<=150
    if not ok(ratio):
        rec['noDataReason']='In the government database, but without a usable gender wage gap figure'; companies[key]=rec; continue
    mgr=num(r[159]); bw=num(r[164]); bt=num(r[165]); bshare=num(r[163])
    board=int(bt) if bt else None; boardWomen=int(bw) if (bw is not None and bt) else None
    regular=next((v for v,cat in ((num(r[59+2*i]),r[58+2*i].strip()) for i in range(5)) if v is not None and 0<v<100 and REGULAR.match(cat)),None)
    rec['years']['latest']=dict(w=rd(ratio/100),wKind='reported',fPerm=rd(regular/100) if regular is not None else None,fAll=None,permHeadcount=None,headcount=None,board=board,boardWomen=boardWomen,payrollCr=None,dq=1,
        note='',boundary='Listed company (own employees)',basisChange=False,topQuartile=None,gapMean=rd(1-ratio/100),gapMedian=None,bonusGapMean=None,entityCount=1,
        ratioRegular=rd(reg/100) if ok(reg) else None,ratioNonRegular=rd(non/100) if ok(non) else None,managerShare=rd(mgr/100) if mgr is not None and 0<=mgr<=100 else None,
        boardShareReported=rd(bshare/100) if bshare is not None and 0<=bshare<=100 else None,period=r[219].strip(),asOf=r[222].strip(),updated=r[235].strip())
    rec['entities']=[dict(name=r[0].strip(),size=r[6].strip(),link='https://positive-ryouritsu.mhlw.go.jp/positivedb/')]
    rec['entitiesYear']='latest'
    companies[key]=rec
def avg(v): v=[x for x in v if x is not None]; return (sum(v)/len(v),len(v)) if v else (None,0)
cs=[c for c in companies.values() if c['years']]
h,n=avg([c['years']['latest']['w'] for c in cs])
sec={}
for c in cs: sec.setdefault(c['industry'],[]).append(c['years']['latest']['w'])
bs=[ (c['years']['latest']['boardWomen']/c['years']['latest']['board']) if c['years']['latest']['board'] else c['years']['latest']['boardShareReported'] for c in cs]
index=dict(id='nikkei225',name='Nikkei 225',country='JP',market='Japan',exchange='TSE',weightsAsOf='2026-04',weighting='equal weight across companies',
    constituents=[dict(symbol='TSE-'+c['code'],weight=None) for c in n225],missing=[],
    years={'latest':dict(headline=rd(h),companiesCovered=n,companiesReported=n,reportedPayrollShare=1,ownedPayroll=None,womenWages=None,gap=None,representationShare=None,payShare=None,
        workforce=None,topQuartile=None,gapMean=None,managers=rd(avg([c['years']['latest']['managerShare'] for c in cs])[0]),boards=rd(avg(bs)[0]),ratioRegular=rd(avg([c['years']['latest']['ratioRegular'] for c in cs])[0]),
        sectors=sorted([dict(industry=k,w=rd(sum(v)/len(v)),payrollShare=None,companies=len(v)) for k,v in sec.items()],key=lambda x:-x['w']))},yoy={})
json.dump(companies,open('jp_companies.json','w'),separators=(',',':')); json.dump(index,open('jp_index.json','w'),separators=(',',':'))
y=index['years']['latest']; print('covered',n,'headline',y['headline'],'mgr',y['managers'],'board',y['boards'],'regular ratio',y['ratioRegular'])
lv=sorted([(c['years']['latest']['w'],c['name']) for c in cs]); print('low',[(nm[:22],round(w*100,1)) for w,nm in lv[:5]]); print('high',[(nm[:22],round(w*100,1)) for w,nm in lv[-5:]])
import collections; print(collections.Counter(c['years']['latest']['period'][:12] for c in cs).most_common(4))
