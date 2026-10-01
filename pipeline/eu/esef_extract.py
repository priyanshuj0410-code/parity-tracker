import json, subprocess, re, html, os
F=json.load(open('esef_found.json'))
WANT={'ADYEN.AS':'adyen','AIR.PA':'airbus','ASML.AS':'asml','CS.PA':'axa','BNP.PA':'bnp','ENI.MI':'eni','RACE.MI':'ferrari n.v.','RMS.PA':'hermes','INGA.AS':'ing groep','OR.PA':"l'oreal",'SAF.PA':'safran','SGO.PA':'saint-gobain','SAN.PA':'sanofi','SU.PA':'schneider','TTE.PA':'totalenergies','DG.PA':'vinci','WKL.AS':'wolters'}
PAT=re.compile(r'(unadjusted gender pay gap|gender pay gap|écart de rémunération|ecart de remuneration|écart salarial|divario retributivo|pay gap)',re.I)
for t,key in WANT.items():
    fs=[f for f in F[t] if f[1] and key in f[1].lower()]
    if not fs: print('==',t,'no match'); continue
    fs.sort(key=lambda f: (0 if re.search(r'-en\.x?html$',f[2] or '') else 1))
    url='https://filings.xbrl.org'+fs[0][2]
    path=f'esef/{t}.html'
    if not os.path.exists(path): subprocess.run(['curl','-s','-L','-m','300','-o',path,url])
    raw=open(path,errors='ignore').read()
    txt=html.unescape(re.sub(r'<[^>]+>',' ',re.sub(r'(?s)<(script|style)[^>]*>.*?</\1>',' ',raw)))
    txt=re.sub(r'\s+',' ',txt)
    hits=[m.start() for m in PAT.finditer(txt)]
    shown=[]; out=[]
    for h in hits:
        if any(abs(h-s)<400 for s in shown): continue
        seg=txt[max(0,h-120):h+330]
        if re.search(r'\d+[.,]?\d* ?%',seg): shown.append(h); out.append(seg)
        if len(out)>=4: break
    print(f'== {t} ({len(raw)//1000} KB, {fs[0][1]})')
    for s in out: print('   ',s)
    if not out: print('    (no figures near pay-gap terms)')
