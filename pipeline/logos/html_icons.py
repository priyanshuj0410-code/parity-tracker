import re, subprocess, sys, html, urllib.parse
UA='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36'
H=['-H','Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8','-H','Accept-Language: en-GB,en;q=0.9']
def page(url):
    r=subprocess.run(['curl','-s','-L','-m','25','-A',UA,*H,'-w','\n%{http_code} %{url_effective}',url],capture_output=True,text=True,errors='ignore').stdout
    body,_,meta=r.rpartition('\n'); code,_,eff=meta.partition(' ')
    return code,eff,body
def icons(dom):
    for base in (f'https://www.{dom}/',f'https://{dom}/'):
        code,eff,body=page(base)
        if code!='200' or len(body)<500: continue
        out=[]
        for m in re.finditer(r'<link\b[^>]*>',body,re.I):
            t=m.group(0); rel=re.search(r'rel=["\']?([^"\'>]+)',t,re.I); href=re.search(r'href=["\']?([^"\'\s>]+)',t,re.I)
            if not rel or not href or 'icon' not in rel.group(1).lower(): continue
            sz=re.search(r'sizes=["\']?(\d+)x(\d+)',t,re.I)
            out.append((int(sz.group(1)) if sz else (180 if 'apple' in rel.group(1).lower() else 0), urllib.parse.urljoin(eff,html.unescape(href.group(1)))))
        return code,sorted(out,reverse=True)
    return code,[]
if __name__=='__main__':
    for d in sys.argv[1:]:
        c,ic=icons(d); print(d,c,ic[:4])
