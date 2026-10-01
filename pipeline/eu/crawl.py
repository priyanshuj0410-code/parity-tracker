import re, sys, html, subprocess, urllib.parse
start=sys.argv[1]; kw=re.compile(sys.argv[2] if len(sys.argv)>2 else r'workforce|employee|remuneration|people|social|s1|own-work|personal|mitarbeit',re.I)
UA='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
host=urllib.parse.urlparse(start).netloc
def get(u):
    return subprocess.run(['curl','-s','-L','-m','40','-A',UA,u],capture_output=True,text=True,errors='ignore').stdout
PAT=re.compile(r'(unadjusted gender pay gap|gender pay gap|pay gap|brecha salarial|Entgeltlücke)',re.I)
seen=set(); queue=[(start,0)]; found=0; pages=0
while queue and pages<70 and found<3:
    u,d=queue.pop(0)
    if u in seen: continue
    seen.add(u); pages+=1
    raw=get(u)
    txt=re.sub(r'\s+',' ',html.unescape(re.sub(r'<[^>]+>',' ',re.sub(r'(?s)<(script|style)[^>]*>.*?</\1>',' ',raw))))
    for m in PAT.finditer(txt):
        seg=txt[max(0,m.start()-150):m.start()+300]
        if re.search(r'\d+[.,]?\d* ?(%|percent|per cent)',seg,re.I):
            print('URL',u); print('   ',seg); found+=1; break
    if d<3:
        for l in re.findall(r'href="([^"#]+)"',raw):
            v=urllib.parse.urljoin(u,l)
            p=urllib.parse.urlparse(v)
            if p.netloc==host and v not in seen and not re.search(r'\.(pdf|jpg|png|xlsx|zip|svg|css|js)$',p.path,re.I) and (d==0 or kw.search(p.path)):
                queue.append((v,d+1))
print('pages',pages,'found',found)
