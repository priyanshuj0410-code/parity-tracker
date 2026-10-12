"""Build the work queue for adding every BRSR filer to Nivel (knowledge/plans/india-brsr-1000.md, PARITY-123).

Reads the Kaggle FY2024-25 scan (scan.json, one row per PDF with the parsed fields) and Nivel's live India records,
and writes <data>/queue.json: one entry per company to bring to its latest report. New companies come from the Kaggle
set; Nivel companies with no FY2025-26 figure are added so they are retried too.

    python3 prep.py <scan.json> <src/data/companies.json> <data dir>
"""
import json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from brsr_fields import entity

scan, live, data = sys.argv[1:4]
S = json.load(open(scan))
D = json.load(open(live))
IN = {v['symbol']: v for v in D.values() if v.get('country') == 'IN'}
CIN = re.compile(r'\b([LU]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6})\b')

def site(t):
    m = re.search(r'Website[\s\S]{0,200}', t, re.I)
    if not m: return None
    w = re.sub(r'-\s+', '-', re.sub(r'\s+', ' ', m.group(0)))
    m = re.search(r'(?:https?://)?(?:www\.)?([a-z0-9][a-z0-9.-]{1,60}\.(?:co\.in|com|in|net|org|biz|co))(?![a-z])', w, re.I)
    return m.group(1).lower() if m else None

queue = {}
for o in S:
    if not (o['words'] > 300 and o['isBRSR']) or o.get('nivel'): continue
    t = open(os.path.join(os.path.dirname(scan), 'txt', o['file'][:-4] + '.txt'), errors='ignore').read()[:40000]
    m = CIN.search(t)
    key = m.group(1) if m else 'KG-' + o['id']
    queue[key] = dict(key=key, kind='new', cin=m.group(1) if m else None, kaggleId=o['id'], name=o.get('name') or entity(t)['name'], website=site(t),
                      kaggleFile=o['file'], kaggleFY=o['fy'], status='todo')
for s, v in IN.items():
    if (v['years'].get('2025-26') or {}).get('w') is None:
        queue['NIVEL-' + s] = dict(key='NIVEL-' + s, kind='nivel', symbol=s, name=v['name'], website=None, status='todo',
                                   noDataReason=v.get('noDataReason'))
# Nivel companies that already have FY2025-26 join last, for the hierarchy and function reading only (deep pass).
kag = {o['nivel']: o for o in S if o.get('nivel') and o['words'] > 300 and o['isBRSR']}
deep = {}
for s, v in IN.items():
    if 'NIVEL-' + s in queue: continue
    o = kag.get(s)
    t = open(os.path.join(os.path.dirname(scan), 'txt', o['file'][:-4] + '.txt'), errors='ignore').read()[:40000] if o else ''
    deep['NIVEL-' + s] = dict(key='NIVEL-' + s, kind='nivel-deep', symbol=s, name=v['name'], website=site(t) if t else None,
                              kaggleFile=o['file'] if o else None, kaggleFY=o['fy'] if o else None, status='todo')

os.makedirs(data, exist_ok=True)
out = os.path.join(data, 'queue.json')
if os.path.exists(out) and '--add-nivel' in sys.argv:
    old = json.load(open(out)); add = {k: v for k, v in deep.items() if k not in old}
    for v in add.values():
        if v.get('website') and 'www.' in v['website']: v['website'] = v['website'].split('www.')[-1]
    old.update(add); json.dump(old, open(out, 'w'), indent=1, ensure_ascii=False)
    print(f'added {len(add)} Nivel companies for the deep pass; queue now {len(old)}'); sys.exit(0)
if os.path.exists(out):
    if '--fill-sites' not in sys.argv:
        sys.exit(f'{out} exists: the queue is the run state, so it is never rebuilt over (--fill-sites fills empty websites only)')
    old = json.load(open(out)); n = 0
    for k, q in old.items():
        if not q.get('website') and queue.get(k, {}).get('website'): q['website'] = queue[k]['website']; n += 1
        if not q.get('name') and queue.get(k, {}).get('name'): q['name'] = queue[k]['name']; n += 1
    json.dump(old, open(out, 'w'), indent=1, ensure_ascii=False)
    print(f'filled {n} websites or names; {sum(1 for q in old.values() if q.get("website"))} of {len(old)} have a website, '
          f'{sum(1 for q in old.values() if q.get("name"))} a name'); sys.exit(0)
json.dump(queue, open(out, 'w'), indent=1, ensure_ascii=False)
print(len(queue), 'companies queued:', sum(1 for q in queue.values() if q['kind'] == 'new'), 'new,',
      sum(1 for q in queue.values() if q['kind'] == 'nivel'), 'Nivel without FY2025-26;',
      sum(1 for q in queue.values() if q.get('website')), 'with a website from the filing')
