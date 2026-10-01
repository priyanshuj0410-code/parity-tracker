import json, re
W=json.load(open('wgea.json')); asx=json.load(open('asx200.json'))
STOP={'LIMITED','LTD','PTY','GROUP','HOLDINGS','HOLDING','AUSTRALIA','AUSTRALIAN','CORPORATION','CORP','THE','AND','INC','PLC','CO','COMPANY','ASIA','PACIFIC','AUSTRALASIA','INTERNATIONAL','SERVICES','OPERATIONS','ENTERPRISES','NL','TRUST','FUND','REIT','SECURITIES','PROPERTY','PROPERTIES','INDUSTRIES','RESOURCES','ENERGY','MANAGEMENT','INVESTMENTS','BANK','BANKING','GLOBAL','N.V.','NV','SA','AG','A'}
def norm(s):
    s=re.sub(r'[^A-Z0-9 ]',' ',s.upper().replace('&',' AND '))
    return [t for t in s.split() if t not in STOP]
cands=[('G',r[0],r) for r in W['groups']]+[('E',r[0],r) for r in W['emps']]
idx={}
for kind,name,r in cands:
    toks=norm(name)
    if toks: idx.setdefault(toks[0],[]).append((kind,name,toks,r))
out={}
for a in asx:
    at=norm(a['name'])
    if not at: continue
    best=None
    for kind,name,toks,r in idx.get(at[0],[]):
        inter=len(set(at)&set(toks)); score=inter/max(len(set(at)),1) - 0.05*max(0,len(toks)-len(at)) + (0.1 if kind=='G' else 0)
        if best is None or score>best[0]: best=(score,kind,name)
    out[a['code']]=dict(asx=a['name'],match=best[2] if best and best[0]>=0.75 else None,kind=best[1] if best else None,score=round(best[0],2) if best else None,cand=best[2] if best else None)
json.dump(out,open('au_auto.json','w'),indent=0)
m=[k for k,v in out.items() if v['match']]; print('matched',len(m),'of',len(asx))
for k,v in out.items(): print(f"{k:4} {v['asx'][:28]:28} -> {(v['match'] or ('?? '+str(v['cand'])))[:48]} {v['kind'] or ''} {v['score']}")
