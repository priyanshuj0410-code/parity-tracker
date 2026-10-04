import json, csv, re, os, glob
cy=json.load(open('company_years.json')); meta=json.load(open('meta_all.json')); shp=json.load(open('shp.json'))
# Figures read by hand from companies' own annual reports or BRSR PDFs on their websites, for filings missing from
# the NSE XBRL set or unusable there (PARITY-69). NSE downloads are on hold (PARITY-66). A figure here is confirmed,
# so the 15-point jump rule below does not drop it.
AR=json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'annual_reports.json')))
AR_KEYS=set()
# Public shareholding from the annual report's shareholding pattern, where NSE's file has none.
for s_,f_ in json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'float_overrides.json'))).items():
    shp.setdefault(s_,{}).setdefault('public',f_['public'])
for s_,ys_ in AR.items():
    for y_,a in ys_.items():
        # `estimate` says how an estimated payroll (and share) was worked out; the figure is badged as an estimate.
        cy.setdefault(s_,{})[y_]=dict(kind='estimated' if a.get('estimate') else 'reported',w=a['w'],W=a.get('W'),N=a.get('N'),F=a.get('F'),Np=a.get('Np'),Fp=a.get('Fp'),
            f_all=a['F']/a['N'] if a.get('N') else None,f_perm=a['Fp']/a['Np'] if a.get('Np') else None,board=a.get('board'),board_f=a.get('board_f'),dq=3 if a.get('estimate') else 1,
            note=a.get('estimate') or 'from the annual report'+('' if a.get('W') else '; payroll missing'),boundary=a.get('boundary','Standalone'),src='annual report')
        meta.setdefault(s_,{}).setdefault('filings',{})[a['filed']]=dict(xbrl='',pdf=a['src'],submitted='')
        if a.get('confirmed',True): AR_KEYS.add((s_,y_))
mcap={}
# The latest NSE market-cap file in the folder (mcapDDMMYYYY.csv), so a refresh needs no code change.
MCAP=max(glob.glob('mcap*.csv'),key=lambda f:f[8:12]+f[6:8]+f[4:6])
for r in csv.reader(open(MCAP)):
    # BE is trade-for-trade settlement; those shares are still index members (HFCL, MTAR, Sterlite on 30 September 2026).
    if len(r)>9 and r[2].strip() in ('EQ','BE'):
        try: mcap[r[1].strip()]=float(r[9])
        except: pass
import glob, os
HERE=os.path.dirname(os.path.abspath(__file__))
info={}
idx_members={'nifty50':[], 'niftynext50':[], 'sensex':[]}
for f,k in (('n50.csv','nifty50'),('nn50.csv','niftynext50')):
    for r in csv.DictReader(open(os.path.join(HERE,f))):
        info[r['Symbol']]={'name':r['Company Name'],'industry':r['Industry'],'isin':r['ISIN Code']}
        idx_members[k].append(r['Symbol'])
idx_members['sensex']=[l.strip() for l in open(os.path.join(HERE,'sensex.txt')) if l.strip()]
# Nifty index constituent lists from niftyindices.com (pipeline/india/indexes/ind_<id>list.csv saved as ind_<id>.csv)
for f in sorted(glob.glob(os.path.join(HERE,'indexes','ind_*.csv'))):
    k=os.path.basename(f)[4:-4]
    rows=list(csv.DictReader(open(f)))
    for r in rows:
        if r['Symbol'].strip() not in mcap: continue  # stale or placeholder symbols (MOTHERSUMI, DUMMYHEG) that no longer trade
        info.setdefault(r['Symbol'].strip(),{'name':r['Company Name'].strip(),'industry':r['Industry'].strip(),'isin':r['ISIN Code'].strip()})
    idx_members[k]=[r['Symbol'].strip() for r in rows]
YEARS=['2021-22','2022-23','2023-24','2024-25','2025-26']
def rd(x,n=4): return None if x is None else round(x,n)
NOTES=[('from next year filing (prior-year column); ','Taken from the prior-year column of the next filing. '),
 ('reported; wages filed in crore, rescaled','Wages were filed in crore instead of rupees, so we rescaled them'),
 ('reported; wages filed in lakh, rescaled','Wages were filed in lakh instead of rupees, so we rescaled them'),
 ('payroll estimated from medians x headcount; w estimated','Wage totals missing: payroll and women\'s share estimated from median pay and headcount'),
 ('payroll estimated from medians x headcount','Wage totals missing: payroll estimated from median pay and headcount'),
 ('w as reported; payroll missing','Women\'s share as reported; payroll total missing'),
 ('from the annual report; payroll missing',"Read from the company's annual report; payroll total missing"),
 ('from the annual report',"Read from the company's annual report"),
 ('no usable payroll','No usable wage data'),('no usable wage data','No usable wage data')]
def friendly(n):
    for a,b in NOTES: n=n.replace(a,b)
    n=n.strip()
    if n in ('reported','Taken from the prior-year column of the next filing. reported'): return '' if n=='reported' else 'Taken from the prior-year column of the next filing'
    n=n.replace('. reported','')
    m=re.search(r'restated next year to ([0-9.]+)',n)
    if m: n=f"Restated in the next filing to {float(m.group(1))*100:.1f}%"
    return n
companies={}
for s,i in info.items():
    ys=cy.get(s,{})
    years={}
    for y in YEARS:
        r=ys.get(y)
        if not r: continue
        r=dict(r)
        w0=r.get('w')
        if w0 is not None and not (0<w0<=0.9):
            m=re.search(r'restated next year to ([0-9.]+)',r.get('note') or '')
            if m and 0<float(m.group(1))<=0.9:
                r.update(w=float(m.group(1)),note=f"The filing's value was implausible; restated in the next filing to {float(m.group(1))*100:.1f}%")
            else:
                r.update(w=None,kind=None,dq=4,note=f"Implausible wage share in the filing ({w0:.3g}), left out")
        if r.get('kind')=='estimated':
            ok=r['W'] and r['N'] and 1.5e5<=r['W']/r['N']<=7.5e6 and r['w'] and 0<r['w']<1
            if not ok: r.update(w=None,kind=None,W=None,dq=4,note='no usable wage data')
        years[y]=dict(w=rd(r['w']),wKind=r.get('kind'),fPerm=rd(r['f_perm']),fAll=rd(r['f_all']),
            permHeadcount=r['Np'],headcount=r['N'],board=r['board'],boardWomen=r['board_f'],
            payrollCr=None if not r['W'] else round(r['W']/1e7),dq=r['dq'],note=friendly(r['note']),boundary=r['boundary'])
    fl=meta.get(s,{}).get('filings',{})
    companies[s]=dict(symbol=s,name=i['name'],industry=i['industry'],isin=i['isin'],country='IN',exchange='NSE',
        indexes=[k for k,v in idx_members.items() if s in v],
        marketCapCr=round(mcap[s]/1e7) if s in mcap else None,publicFloatPct=shp.get(s,{}).get('public'),
        years=years,filings={f"{int(k)-1}-{k[2:]}":v for k,v in sorted(fl.items())})
# Why a company has no figure for the latest year, read from its own documents (listed too recently, financial year
# not ended, no employees): an input, pulled with pnpm data inputs pull (decision 0015).
REASONS=os.path.join(HERE,'reasons.json')
for s_,r_ in (json.load(open(REASONS)) if os.path.exists(REASONS) else {}).items():
    if s_ in companies and companies[s_]['years'].get(YEARS[-1],{}).get('w') is None: companies[s_]['noDataReason']=r_
import statistics
for s_,c in companies.items():
    vals={y:v['w'] for y,v in c['years'].items() if v.get('w') is not None}
    for y,w in list(vals.items()):
        if (s_,y) in AR_KEYS: continue
        others=[v for k,v in vals.items() if k!=y]
        if len(others)>=2 and abs(w-statistics.median(others))>0.15:
            c['years'][y].update(w=None,wKind=None,dq=4,note='Moved more than 15 points from the company\'s other years, left out until confirmed')
def plausible(v):
    return v and v.get('payrollCr') and v.get('headcount') and 1.5e5 <= v['payrollCr']*1e7/v['headcount'] <= 7.5e6
for s,c in companies.items():
    ys=sorted(c['years'].items()); prev=None
    for y,v in ys:
        v['basisChange']=False
        if prev and v.get('wKind')=='reported' and prev.get('wKind')=='reported':
            pr=(v['payrollCr'] or 0)/(prev['payrollCr'] or 1) if prev.get('payrollCr') else 1
            hr=(v['headcount'] or 0)/(prev['headcount'] or 1) if (prev.get('headcount') and v.get('headcount')) else 1
            if not (0.55<=pr<=1.8) or not (0.6<=hr<=1.6) or (v['boundary'] and prev['boundary'] and v['boundary']!=prev['boundary']): v['basisChange']=True
        if v.get('wKind')=='reported': prev=v
    rep=sorted(v['payrollCr'] for y,v in c['years'].items() if y>='2022-23' and v.get('wKind')=='reported' and plausible(v))
    est=sorted(v['payrollCr'] for y,v in c['years'].items() if y>='2022-23' and v.get('payrollCr'))
    pick=rep or est
    c['payrollWeightCr']=pick[len(pick)//2] if pick else None
    c['payrollWeightBasis']='median reported payroll' if rep else ('median estimated payroll' if est else None)
def index_calc(members):
    mem=[s for s in members if s in mcap and shp.get(s,{}).get('public')]
    ffmc={s:mcap[s]*shp[s]['public']/100 for s in mem}; tot=sum(ffmc.values())
    weights={s:ffmc[s]/tot for s in mem}
    I=10_00_000; res={}
    for y in YEARS[1:]:
        own=wom=rep=pay=0; n=nrep=0; own_rep=0; sec={}
        for s in mem:
            c=companies[s]; r=c['years'].get(y)
            if not r or r['w'] is None or not c['payrollWeightCr']: continue
            a=I*weights[s]/mcap[s]; oW=a*c['payrollWeightCr']*1e7
            own+=oW; wom+=oW*r['w']; n+=1
            if r['wKind']=='reported': nrep+=1; own_rep+=oW
            if r['fPerm'] is not None: rep+=oW*(0.5-r['fPerm']); pay+=oW*(r['fPerm']-r['w'])
            k=c['industry']; sec.setdefault(k,[0,0,0]); sec[k][0]+=oW*r['w']; sec[k][1]+=oW; sec[k][2]+=1
        if not own: continue
        res[y]=dict(headline=rd(wom/own),ownedPayroll=round(own),womenWages=round(wom),gap=round(0.5*own-wom),
            representationShare=rd(rep/(rep+pay)) if (rep+pay) else None,payShare=rd(pay/(rep+pay)) if (rep+pay) else None,
            companiesCovered=n,companiesReported=nrep,reportedPayrollShare=rd(own_rep/own),
            sectors=sorted([dict(industry=k,w=rd(v[0]/v[1]),payrollShare=rd(v[1]/own),companies=v[2]) for k,v in sec.items()],key=lambda x:-x['w']))
    yoy={}
    for y0,y1 in zip(YEARS[1:],YEARS[2:]):
        both=[s for s in mem if companies[s]['payrollWeightCr'] and all(companies[s]['years'].get(y,{}).get('wKind')=='reported' for y in (y0,y1)) and not companies[s]['years'][y1].get('basisChange')]
        def h(y):
            num=den=0
            for s in both:
                a=weights[s]/mcap[s]*companies[s]['payrollWeightCr']; num+=a*companies[s]['years'][y]['w']; den+=a
            return num/den if den else None
        h0,h1=h(y0),h(y1)
        if h0 and h1: yoy[f"{y0}>{y1}"]=dict(**{'from':rd(h0),'to':rd(h1)},change=rd(h1-h0),companies=len(both))
    return weights,res,yoy
NAMES={'nifty50':('Nifty 50','India','NSE'),'niftynext50':('Nifty Next 50','India','NSE'),'sensex':('BSE Sensex','India','BSE'),
 'nifty100':('Nifty 100','India','NSE'),'nifty200':('Nifty 200','India','NSE'),'nifty500':('Nifty 500','India','NSE'),
 'niftymidcap150':('Nifty Midcap 150','India','NSE'),'niftysmallcap250':('Nifty Smallcap 250','India','NSE'),
 'niftymidcap100':('Nifty Midcap 100','India','NSE'),'niftysmallcap100':('Nifty Smallcap 100','India','NSE'),
 'niftylargemidcap250':('Nifty LargeMidcap 250','India','NSE'),'niftymidsmallcap400':('Nifty MidSmallcap 400','India','NSE'),
 'niftybank':('Nifty Bank','India','NSE'),'niftyit':('Nifty IT','India','NSE'),'niftyfmcg':('Nifty FMCG','India','NSE'),
 'niftypharma':('Nifty Pharma','India','NSE'),'niftyauto':('Nifty Auto','India','NSE'),'niftyfinance':('Nifty Financial Services','India','NSE'),
 'niftypsubank':('Nifty PSU Bank','India','NSE'),'niftymetal':('Nifty Metal','India','NSE'),'niftyenergy':('Nifty Energy','India','NSE'),
 'niftyrealty':('Nifty Realty','India','NSE'),'niftycpse':('Nifty CPSE','India','NSE'),'niftypse':('Nifty PSE','India','NSE'),
 'niftyhealthcare':('Nifty Healthcare','India','NSE'),'niftyconsumerdurables':('Nifty Consumer Durables','India','NSE'),
 'niftyoilgas':('Nifty Oil & Gas','India','NSE'),'niftyinfra':('Nifty Infrastructure','India','NSE'),'niftycommodities':('Nifty Commodities','India','NSE'),
 'niftymedia':('Nifty Media','India','NSE'),'niftymnc':('Nifty MNC','India','NSE'),'niftyquality30':('Nifty100 Quality 30','India','NSE')}
indexes={}
for k,mem in idx_members.items():
    wts,res,yoy=index_calc(mem)
    indexes[k]=dict(id=k,name=NAMES[k][0],country='IN',market=NAMES[k][1],exchange=NAMES[k][2],
        weightsAsOf=f'{MCAP[8:12]}-{MCAP[6:8]}-{MCAP[4:6]}',weighting='free-float market cap (public shareholding % as free-float proxy)',
        constituents=[dict(symbol=s,weight=rd(w,5)) for s,w in sorted(wts.items(),key=lambda x:-x[1])],
        missing=[s for s in mem if s not in wts],years=res,yoy=yoy)
    print(k,len(wts),{y:(v['headline'],v['companiesCovered'],v['reportedPayrollShare']) for y,v in res.items()}); print('   yoy',yoy)
RENAME={'BBOX':'NSE-BBOX'}  # NSE symbols that clash with another market's (BBOX is also Tritax Big Box in the FTSE 100)
for a_,b_ in RENAME.items():
    if a_ in companies:
        c=companies.pop(a_); c['symbol']=b_; companies[b_]=c
for ix in indexes.values():
    for c in ix['constituents']: c['symbol']=RENAME.get(c['symbol'],c['symbol'])
    ix['missing']=[RENAME.get(x,x) for x in ix['missing']]
json.dump(companies,open('out/companies.json','w'),separators=(',',':'))
json.dump(indexes,open('out/indexes.json','w'),separators=(',',':'))
# company YoY
rows=[]
for s,c in companies.items():
    a=c['years'].get('2024-25'); b=c['years'].get('2025-26')
    if a and b and a['wKind']=='reported' and b['wKind']=='reported' and not b.get('basisChange'):
        dbs=None
        if a['board'] and b['board']: dbs=b['boardWomen']/b['board']-a['boardWomen']/a['board']
        df=(b['fPerm']-a['fPerm']) if (a['fPerm'] is not None and b['fPerm'] is not None) else None
        rows.append((s,c['name'],a['w'],b['w'],b['w']-a['w'],df,dbs))
rows.sort(key=lambda r:-r[4])
print('\nYoY w FY25->FY26 (reported both):',len(rows),' up:',sum(1 for r in rows if r[4]>0.001),' down:',sum(1 for r in rows if r[4]<-0.001))
print('median change pp',sorted(r[4] for r in rows)[len(rows)//2]*100)
for r in rows[:8]+[None]+rows[-8:]:
    print('  ...' if r is None else f"  {r[0]:12} {r[2]:6.1%} -> {r[3]:6.1%}  {r[4]*100:+5.1f}pp  f_perm {'' if r[5] is None else f'{r[5]*100:+.1f}pp'}  board {'' if r[6] is None else f'{r[6]*100:+.1f}pp'}")
json.dump(rows,open('out/yoy_rows.json','w'))
