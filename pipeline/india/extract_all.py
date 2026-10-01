import json, os, glob, re
from xb import load
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
def wages(g, N, n, m, allow_est=True):
    W=g.get('TotalWagesPaid') or 0; Wf=g.get('GrossWagesPaidToFemale'); wp=g.get('PercentageOfGrossWagesPaidToFemaleToTotalWagesPaid')
    if wp is not None and wp>1: wp/=100
    if wp==0 and not W: wp=None
    if W and N and 1e5<W/N<1e7 and W!=100: return W,(Wf/W if Wf is not None else wp),1,'reported'
    if W and N and 1e5<W*1e7/N<1e7 and W!=100:
        w=(Wf/W) if (Wf and Wf<W) else wp
        return W*1e7,w,2,'reported; wages filed in crore, rescaled'
    if W and N and 1e5<W*1e5/N<1e7 and W!=100:
        w=(Wf/W) if (Wf and Wf<W) else wp
        return W*1e5,w,2,'reported; wages filed in lakh, rescaled'
    if allow_est:
        tot=fem=0
        for (cat,gnd),cnt in n.items():
            med=m.get((cat,gnd),0)
            if med<1000 or gnd not in ('Male','Female','OtherGender'): continue
            tot+=cnt*med; fem+=cnt*med if gnd=='Female' else 0
        if tot>0: return tot,(wp if wp else fem/tot),3,'payroll estimated from medians x headcount'+('' if wp else '; w estimated')
    return None,wp,4 if wp is None else 3,'no usable payroll' if wp is None else 'w as reported; payroll missing'
out={}
for path in sorted(glob.glob('xa/*.xml')):
    sym,fy=os.path.basename(path)[:-4].rsplit('_',1)
    try: r=extract(path)
    except ET_ERR:
        try: r=extract(fix(path))
        except Exception as e: print('PARSE FAIL',path,e); continue
    except Exception as e: print('PARSE FAIL',path,e); continue
    hc=r['hc']; g=lambda a,b: hc.get((a,b),0)
    def tot(cat,gen):
        x=hc.get((cat,gen))
        if x is None: x=hc.get(('Permanent'+cat,gen),0)+hc.get(('OtherThanPermanent'+cat,gen),0)
        return x
    N=tot('Employees','Gender')+tot('Workers','Gender'); F=tot('Employees','Female')+tot('Workers','Female')
    Np=g('PermanentEmployees','Gender')+g('PermanentWorkers','Gender'); Fp=g('PermanentEmployees','Female')+g('PermanentWorkers','Female')
    W,w,dq,note=wages(r['g'],N,r['n'],r['m'])
    bd=r['g'].get('TotalNumberOfBoardOfDirectors'); bf=r['g'].get('NumberOfFemaleBoardOfDirectors')
    if bd is not None and not (6<=bd<=20): bd=bf=None
    label=fy_label(r['end'])
    kind='reported' if dq in (1,2) else ('estimated' if dq==3 else None)
    rec=dict(kind=kind,N=N,F=F,Np=Np,Fp=Fp,f_all=F/N if N else None,f_perm=Fp/Np if Np else None,W=W,w=w,dq=dq if w is not None else 4,note=note,board=bd,board_f=bf,boundary=(r['txt'].get('ReportingBoundary') or '').replace(' basis',''),src='own')
    out.setdefault(sym,{})[label]=rec
    pg=r['prev_g']
    if pg.get('TotalWagesPaid') or pg.get('PercentageOfGrossWagesPaidToFemaleToTotalWagesPaid'):
        plabel=fy_label(str(int(r['end'][:4])-1)+r['end'][4:])
        PW,pw,pdq,pnote=wages(pg,N,{},{},allow_est=False)
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
