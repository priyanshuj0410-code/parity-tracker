import csv, glob, json, os, re
members=json.load(open('jp_members.json')); codes={c['code'] for c in members}
rows={}
# The latest MHLW open data download in the folder (99_YYYYMMDD_utf8_bom.csv), so a refresh needs no code change.
DOWNLOAD=max(glob.glob('99_*_utf8_bom.csv'))
DOWNLOADED=f'{DOWNLOAD[3:7]}-{DOWNLOAD[7:9]}-{DOWNLOAD[9:11]}'
for r in csv.reader(open(DOWNLOAD,encoding='utf-8-sig')):
    for c in re.findall(r'[0-9A-Z]{4}',(r[9] or '')):
        if c in codes: rows.setdefault(c,[]).append(r)
def num(x):
    try: return float(str(x).replace(',',''))
    except: return None
def rd(x,n=4): return None if x is None else round(x,n)
REGULAR=re.compile(r'^(正社員|正規|社員$|従業員$|全従業員|全社員|全労働者|職員$|労働者全体|対象とする労働者すべて)')
SIZE_ORDER=['10人未満','10～30人','31～100人','101～300人','301～500人','501～1000人','1001～5000人','5001人以上']
companies={}
for c in members:
    key='TSE-'+c['code']
    rec=dict(symbol=key,name=c['name'],industry=c['sector'],exchange='TSE',country='JP',indexes=c['indexes'],marketCapCr=None,publicFloatPct=None,
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
        boardShareReported=rd(bshare/100) if bshare is not None and 0<=bshare<=100 else None,period=r[219].strip(),asOf=r[222].strip(),updated=r[235].strip(),downloaded=DOWNLOADED)
    rec['entities']=[dict(name=r[0].strip(),size=r[6].strip(),link='https://positive-ryouritsu.mhlw.go.jp/positivedb/')]
    rec['entitiesYear']='latest'
    companies[key]=rec
# Figures from the companies' own reports where the database has none (decision 0015): the pay ratio of a company not in
# the database, and the share of women in regular staff when the database does not give it. Like the database, only the
# listed company's own staff count; a share for the whole group is noted but not used. An input, keyed by securities code.
SCOPE={'parent regular':"the listed company's regular staff",'parent all':"all the listed company's staff"}
doc=lambda s,fields,scope: dict(title=s['title'],url=s['url'],page=s.get('page'),fields=fields,scope=scope)
for code,o in (json.load(open('jp_reports.json')) if os.path.exists('jp_reports.json') else {}).items():
    rec=companies.get('TSE-'+code)
    if not rec: continue
    y=rec['years'].get('latest')
    if o['status']=='reason':
        if y: y['note']=o['reason']
        else: rec['noDataReason']=o['reason']
        continue
    ok=lambda v: v is not None and 20<=v<=150
    if y is None and ok(o.get('ratio')):
        y=rec['years']['latest']=dict(w=rd(o['ratio']/100),wKind='reported',fPerm=None,fAll=None,permHeadcount=None,headcount=None,board=None,boardWomen=None,payrollCr=None,dq=1,
            note="From the company's own report: it is not in the labour ministry's database",boundary='Listed company (own employees), company report',basisChange=False,
            topQuartile=None,gapMean=rd(1-o['ratio']/100),gapMedian=None,bonusGapMean=None,entityCount=1,
            ratioRegular=rd(o['ratioRegular']/100) if ok(o.get('ratioRegular')) else None,ratioNonRegular=rd(o['ratioNonRegular']/100) if ok(o.get('ratioNonRegular')) else None,
            managerShare=None,boardShareReported=None,period=o.get('period') or '',reportSources=[doc(o['ratioSource'],['ratio'],"the listed company's own employees")])
        rec['noDataReason']=None
    if y is None or y.get('fPerm') is not None or o.get('share') is None: continue
    if o.get('shareScope') in SCOPE and 0<o['share']<1:
        y['fPerm']=rd(o['share'])
        y.setdefault('reportSources',[]).append(doc(o['shareSource'],['fPerm'],SCOPE[o['shareScope']]))
    else: y['note']=(y['note']+'; ' if y['note'] else '')+"Publishes women's share of staff only for the whole group, not the listed company"
def avg(v): v=[x for x in v if x is not None]; return (sum(v)/len(v),len(v)) if v else (None,0)
def make_index(ix_id,name,as_of,ids):
    cs=[companies['TSE-'+c] for c in ids if companies['TSE-'+c]['years']]
    h,n=avg([c['years']['latest']['w'] for c in cs])
    sec={}
    for c in cs: sec.setdefault(c['industry'],[]).append(c['years']['latest']['w'])
    bs=[(c['years']['latest']['boardWomen']/c['years']['latest']['board']) if c['years']['latest']['board'] else c['years']['latest']['boardShareReported'] for c in cs]
    return dict(id=ix_id,name=name,country='JP',market='Japan',exchange='TSE',weightsAsOf=as_of,weighting='equal weight across companies',
        constituents=[dict(symbol='TSE-'+c,weight=None) for c in ids],missing=[],
        years={'latest':dict(headline=rd(h),companiesCovered=n,companiesReported=n,reportedPayrollShare=1,ownedPayroll=None,womenWages=None,gap=None,representationShare=None,payShare=None,
            workforce=None,topQuartile=None,gapMean=None,managers=rd(avg([c['years']['latest']['managerShare'] for c in cs])[0]),boards=rd(avg(bs)[0]),ratioRegular=rd(avg([c['years']['latest']['ratioRegular'] for c in cs])[0]),
            sectors=sorted([dict(industry=k,w=rd(sum(v)/len(v)),payrollShare=None,companies=len(v)) for k,v in sec.items()],key=lambda x:-x['w']))},yoy={})
indexes={'nikkei225':make_index('nikkei225','Nikkei 225','2026-04',[c['code'] for c in members if 'nikkei225' in c['indexes']]),
         'topix500':make_index('topix500','TOPIX 500','2026-08-31',[c['code'] for c in members if 'topix500' in c['indexes']])}
json.dump(companies,open('jp_companies.json','w'),separators=(',',':')); json.dump(indexes,open('jp_indexes.json','w'),separators=(',',':'))
for ix in indexes.values():
    y=ix['years']['latest']; print(ix['id'],'members',len(ix['constituents']),'with a pay ratio',y['companiesCovered'],'mgr',y['managers'],'board',y['boards'])
import collections; print(collections.Counter(c['noDataReason'][:40] for c in companies.values() if c['noDataReason']))
