import json, csv, re, os, glob
from india_calc import YEARS, UNITS, rd, unit_note, friendly, set_basis_and_weights, index_calc
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
# Wage totals whose unit the filing could not settle, each with the evidence for the unit (PARITY-95): an input.
for s_,ys_ in json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'wage_units.json'))).items():
    for y_,u in ys_.items():
        if y_ not in cy.get(s_,{}): continue
        cy[s_][y_].update(W=u['filed']*UNITS[u['unit']] if u['unit'] else None,dq=2 if u['unit'] not in (None,'rupees') else 1,
            note=('from next year filing (prior-year column); ' if u.get('column')=='prior' else '')+unit_note(u['unit']))
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
import statistics
for s_,c in companies.items():
    vals={y:v['w'] for y,v in c['years'].items() if v.get('w') is not None}
    for y,w in list(vals.items()):
        if (s_,y) in AR_KEYS: continue
        others=[v for k,v in vals.items() if k!=y]
        if len(others)>=2 and abs(w-statistics.median(others))>0.15:
            c['years'][y].update(w=None,wKind=None,dq=4,note='Moved more than 15 points from the company\'s other years, left out until confirmed')
set_basis_and_weights(companies)
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
    wts,res,yoy=index_calc(mem,companies,mcap,shp)
    indexes[k]=dict(id=k,name=NAMES[k][0],country='IN',market=NAMES[k][1],exchange=NAMES[k][2],
        weightsAsOf=f'{MCAP[8:12]}-{MCAP[6:8]}-{MCAP[4:6]}',weighting='free-float market cap (public shareholding % as free-float proxy)',
        constituents=[dict(symbol=s,weight=rd(w,5)) for s,w in sorted(wts.items(),key=lambda x:-x[1])],
        missing=[s for s in mem if s not in wts],years=res,yoy=yoy)
    print(k,len(wts),{y:(v['headline'],v['companiesCovered'],v['reportedPayrollShare']) for y,v in res.items()}); print('   yoy',yoy)
# Why a company has no figure for the latest year, read from its own documents (listed too recently, financial year
# not ended, no employees, a filing its own tables contradict): an input (decision 0015). Applied last, after the rules
# above have dropped any figure.
REASONS=os.path.join(HERE,'reasons.json')
for s_,r_ in (json.load(open(REASONS)) if os.path.exists(REASONS) else {}).items():
    if s_ in companies and companies[s_]['years'].get(YEARS[-1],{}).get('w') is None: companies[s_]['noDataReason']=r_
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
