import json, os, glob, re, math
from xb import load
from india_calc import UNITS, unit_note
import xml.etree.ElementTree as ET
ET_ERR=ET.ParseError
def fix(path):
    b=open(path,'rb').read().decode('utf-8','replace')
    b=re.sub(r'&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)','&amp;',b)
    b=re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]','',b)
    p=path+'.fixed'; open(p,'w').write(b); return p
CATS=['BoardOfDirectors','KeyManagerialPersonnel','EmployeesOtherThanBodAndKMP','Workers']
def fy_label(end): y=int(end[:4]); return f"{y-1}-{str(y)[2:]}"
def extract(path):
    ctx,facts=load(path)
    ends=sorted({c[1] for c in ctx.values() if c[1]})
    cur=ends[-1]; prev=[e for e in ends if e<cur]
    prev=prev[-1] if prev else None
    rec={'end':cur,'hc':{},'n':{},'m':{},'g':{},'prev_g':{},'txt':{}}
    for n,c,u,d,v in facts:
        st,en,dims=ctx[c]
        if n=='NumberOfEmployeesOrWorkersIncludingDifferentlyAbled' and en==cur:
            rec['hc'][(dims.get('DetailsOfEmployeesAndWorkersIncludingDifferentlyAbledAxis','').replace('Member',''),dims.get('GenderAxis','').replace('Member',''))]=float(v or 0)
        elif not dims and n in ('TotalWagesPaid','GrossWagesPaidToFemale','PercentageOfGrossWagesPaidToFemaleToTotalWagesPaid','TotalNumberOfBoardOfDirectors','NumberOfFemaleBoardOfDirectors'):
            try: val=float(v)
            except: continue
            if en==cur: rec['g'][n]=val
            elif en==prev: rec['prev_g'][n]=val
        elif not dims and en==cur and n in ('ReportingBoundary','AssuranceSubTypeForDetailsOfMedianOfRemunerationOrSalaryOrWagesAndWagesPaidToFemale'):
            rec['txt'][n]=v
        elif en==cur:
            for cat in CATS:
                gnd=dims.get('GenderAxis','').replace('Member','')
                try: val=float(v or 0)
                except: continue
                if n.startswith('NumberOf'+cat+'ForRemuneration'): rec['n'][(cat,gnd)]=val
                if n.startswith('MedianOfRemunerationOrSalaryOrWagesOf'+cat): rec['m'][(cat,gnd)]=val
    return rec
def median_payroll(n, m):
    """The filing's own rough payroll and women's part of it: median pay times headcount, by category and gender."""
    tot=fem=0
    for (cat,gnd),cnt in n.items():
        med=m.get((cat,gnd),0)
        if med<1000 or gnd not in ('Male','Female','OtherGender'): continue
        tot+=cnt*med; fem+=cnt*med if gnd=='Female' else 0
    return tot,fem
# A wage total carries no unit (PARITY-95). Units giving ₹1.5 lakh to ₹75 lakh a head, the build's plausible range, can be
# chosen on evidence; a total equal to the headcount is the headcount pasted in.
def fitting(W, N): return [k for k,s in UNITS.items() if 1.5e5<=W*s/N<=7.5e6] if (W and N and W not in (100,N)) else []
def by_medians(W, N, est):
    """The unit that puts the total within half to three times the filing's median payroll, nearest 1.3 times (means
    exceed medians). Bata India files in millions: crore and million both fit a head, only million fits its medians."""
    fit=[k for k in fitting(W,N) if est and 0.5<=W*UNITS[k]/est<=3]
    return min(fit,key=lambda k:abs(math.log(W*UNITS[k]/est/1.3))) if fit else None
def unit_of(W, N, est=0, near=()):
    """The filing's medians; else the company's payroll in a neighbouring year (`near`, rupees), if one unit alone lands
    within half to double it; else the old order, rupees then crore then lakh, at ₹1 lakh to ₹1 crore a head."""
    if not (W and N) or W in (100,N): return None
    u=by_medians(W,N,est)
    if u: return u
    for v in near:
        one=[k for k in fitting(W,N) if 0.5<=W*UNITS[k]/v<=2]
        if len(one)==1: return one[0]
    return next((k for k in ('rupees','crore','lakh') if 1e5<W*UNITS[k]/N<1e7),None)
def wages(g, N, n, m, allow_est=True, near=()):
    W=g.get('TotalWagesPaid') or 0; Wf=g.get('GrossWagesPaidToFemale'); wp=g.get('PercentageOfGrossWagesPaidToFemaleToTotalWagesPaid')
    if wp is not None and wp>1: wp/=100
    if wp==0 and not W: wp=None
    tot,fem=median_payroll(n,m)
    u=unit_of(W,N,tot,near)
    if u=='rupees': return W,(Wf/W if Wf is not None else wp),1,'reported'
    if u: return W*UNITS[u],((Wf/W) if (Wf and Wf<W) else wp),2,unit_note(u)
    if allow_est and tot>0: return tot,(wp if wp else fem/tot),3,'payroll estimated from medians x headcount'+('' if wp else '; w estimated')
    return None,wp,4 if wp is None else 3,'no usable payroll' if wp is None else 'w as reported; payroll missing'
parsed=[]
for path in sorted(glob.glob('xa/*.xml')):
    sym,fy=os.path.basename(path)[:-4].rsplit('_',1)
    try: r=extract(path)
    except ET_ERR:
        try: r=extract(fix(path))
        except Exception as e: print('PARSE FAIL',path,e); continue
    except Exception as e: print('PARSE FAIL',path,e); continue
    parsed.append((sym,r))
def headcounts(hc):
    g=lambda a,b: hc.get((a,b),0)
    def tot(cat,gen):
        x=hc.get((cat,gen))
        if x is None: x=hc.get(('Permanent'+cat,gen),0)+hc.get(('OtherThanPermanent'+cat,gen),0)
        return x
    return (tot('Employees','Gender')+tot('Workers','Gender'),tot('Employees','Female')+tot('Workers','Female'),
            g('PermanentEmployees','Gender')+g('PermanentWorkers','Gender'),g('PermanentEmployees','Female')+g('PermanentWorkers','Female'))
# Each year's payroll where the filing's own medians settle the unit: evidence for the years beside it.
anchor={}
for sym,r in parsed:
    W=r['g'].get('TotalWagesPaid'); N=headcounts(r['hc'])[0]; u=by_medians(W,N,median_payroll(r['n'],r['m'])[0])
    if u: anchor[(sym,fy_label(r['end']))]=W*UNITS[u]
def near(sym, label, *offsets):
    y0=int(label[:4])
    return [anchor[k] for k in ((sym,f"{y0+o}-{str(y0+o+1)[2:]}") for o in offsets) if k in anchor]
out={}
for sym,r in parsed:
    N,F,Np,Fp=headcounts(r['hc'])
    label=fy_label(r['end'])
    W,w,dq,note=wages(r['g'],N,r['n'],r['m'],near=near(sym,label,-1,1))
    bd=r['g'].get('TotalNumberOfBoardOfDirectors'); bf=r['g'].get('NumberOfFemaleBoardOfDirectors')
    if bd is not None and not (6<=bd<=20): bd=bf=None
    kind='reported' if dq in (1,2) else ('estimated' if dq==3 else None)
    rec=dict(kind=kind,N=N,F=F,Np=Np,Fp=Fp,f_all=F/N if N else None,f_perm=Fp/Np if Np else None,W=W,w=w,dq=dq if w is not None else 4,note=note,board=bd,board_f=bf,boundary=(r['txt'].get('ReportingBoundary') or '').replace(' basis',''),src='own')
    out.setdefault(sym,{})[label]=rec
    pg=r['prev_g']
    if pg.get('TotalWagesPaid') or pg.get('PercentageOfGrossWagesPaidToFemaleToTotalWagesPaid'):
        plabel=fy_label(str(int(r['end'][:4])-1)+r['end'][4:])
        PW,pw,pdq,pnote=wages(pg,N,{},{},allow_est=False,near=near(sym,label,-1,-2,0))
        out[sym].setdefault('_prev',{})[plabel]=dict(kind='reported' if pw is not None else None,W=PW,w=pw,dq=pdq,note='from next year filing (prior-year column); '+pnote)
for sym,years in out.items():
    prev=years.pop('_prev',{})
    for lab,p in prev.items():
        if lab not in years: years[lab]=dict(N=None,F=None,Np=None,Fp=None,f_all=None,f_perm=None,board=None,board_f=None,boundary='',**p,src='prior-col')
        else:
            y=years[lab]
            if p['w'] is not None and y.get('kind')!='reported': y.update(kind='reported',W=p['W'] or y['W'],w=p['w'],dq=p['dq'],note=p['note'])
            elif y['w'] is not None and p['w'] is not None and abs(y['w']-p['w'])>0.02: y['note']=(y['note']+'; ' if y['note'] else '')+f"restated next year to {p['w']:.3f}"
json.dump(out,open('company_years.json','w'),indent=1)
from collections import Counter
c=Counter(); cw=Counter()
for s,ys in out.items():
    for lab,y in ys.items():
        c[lab]+=1; cw[lab]+= y.get('kind')=='reported'
print('years',sorted(c.items())); print('with w',sorted(cw.items()))
