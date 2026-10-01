import json, re, subprocess, urllib.parse
UA='ParityTracker/0.1 (https://parity-tracker-eight.vercel.app)'
def wt(page):
    u='https://en.wikipedia.org/w/api.php?'+urllib.parse.urlencode({'action':'parse','page':page,'prop':'wikitext','format':'json'})
    return json.loads(subprocess.run(['curl','-s','-m','60','-A',UA,u],capture_output=True,text=True).stdout)['parse']['wikitext']['*']
link=lambda s: (re.search(r'\[\[([^\]|#]+)',s) or [None,None])[1]
out={}
# FTSE 100: "|[[Target|Disp]]||TICK||Sector"
t=wt('FTSE_100_Index'); seg=t[t.find('==Constituents'):]; seg=seg[:seg.find('==Past')]
for line in seg.split('\n'):
    if line.startswith('|') and '||' in line and not line.startswith('|-'):
        p=line[1:].split('||')
        if len(p)>=2 and link(p[0]): out['GB:'+p[1].strip().replace('.','')]=link(p[0])
# ASX 200: rows split by |-, cells per line
t=wt('S&P/ASX_200'); i=t.find('==Constituent companies'); seg=t[i:]; seg=seg[seg.find('{|'):seg.find('|}',seg.find('{|'))]
for chunk in seg.split('|-')[1:]:
    cells=[c.strip() for line in chunk.strip().split('\n') if line.strip().startswith('|') for c in line.strip()[1:].split('||')]
    if len(cells)>=2 and link(cells[1]): out['AU:'+cells[0].split('|')[0].strip()]=link(cells[1])
# Nikkei 225: "*[[Target|Disp]] ({{tyo2|CODE}})"
t=wt('Nikkei_225')
for line in t.split('\n'):
    m=re.search(r'\{\{(?:tyo2|TYO|tyo)\|(\d{3,4}[A-Z0-9]?)\}\}',line)
    if m and line.startswith('*') and link(line): out['JP:'+m.group(1)]=link(line)
# Euro Stoxx 50: rows, ticker first cell, name link third
t=wt('EURO_STOXX_50'); seg=t[t.find('==Composition'):t.find('==Stocks per country')]
for chunk in seg.split('|-')[1:]:
    cells=[c.strip() for line in chunk.strip().split('\n') if line.strip().startswith('|') for c in line.strip()[1:].split('||')]
    if len(cells)>=3 and link(cells[2]): out['EU:'+cells[0]]=link(cells[2])
json.dump(out,open('targets.json','w'),indent=0)
from collections import Counter; print(Counter(k.split(':')[0] for k in out))
