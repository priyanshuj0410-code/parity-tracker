"""OCR the Kaggle PDFs that have no text layer (PARITY-123), so their companies can be queued and read. The queue was
first built only from readable files, so a company whose only Kaggle copy is a scan was never queued.

    python3 ocr_kaggle.py <data dir> <kaggle files dir>

Writes the text over <data>/kaggle/txt/<file>.txt, marks the rows in kaggle/scan.json, and lists the BRSR filers not yet
queued in <data>/kaggle/pending_add.json. batch.py adds those to the queue when the next batch opens (inside the run
lock, so a running batch is never overwritten).
"""
import json, os, re, sys
from concurrent.futures import ThreadPoolExecutor
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from brsr_fields import entity, is_brsr, reporting_year
from ocr import ocr_pdf

data, files = sys.argv[1], sys.argv[2]
SCAN = os.path.join(data, 'kaggle', 'scan.json')
S = json.load(open(SCAN))
todo = [o for o in S if (o['words'] <= 300 or o.get('wordsPerPage', 99) < 40) and not o.get('ocr') and os.path.exists(os.path.join(files, o['file']))]
print(len(todo), 'scanned Kaggle files to OCR', flush=True)

def one(o):
    out = os.path.join(data, 'kaggle', 'txt', o['file'][:-4] + '.txt')
    n = ocr_pdf(os.path.join(files, o['file']), out, workers=2)
    if n <= 300: return o, None
    t = open(out, errors='ignore').read()
    return o, dict(words=n, isBRSR=is_brsr(t), fy=reporting_year(t), **entity(t))

with ThreadPoolExecutor(4) as ex:
    done = list(ex.map(one, todo))
q = json.load(open(os.path.join(data, 'queue.json')))
have_cin = {v.get('cin') for v in q.values() if v.get('cin')}
def norm(n): return re.sub(r'\b(the|limited|ltd|india|company|co|corporation|corp)\b|[^a-z0-9]', '', (n or '').lower())
have_name = {norm(v.get('name')) for v in q.values() if v.get('name')}
pending = {}
for o, r in done:
    if not r: print('unreadable', o['file']); continue
    o.update(ocr=True, words=r['words'], isBRSR=r['isBRSR'], fy=r['fy'], name=r['name'])
    if not r['isBRSR'] or r['cin'] in have_cin or norm(r['name']) in have_name: continue
    key = r['cin'] or 'KG-' + o['id']
    pending[key] = dict(key=key, kind='new', cin=r['cin'], kaggleId=o['id'], name=r['name'], website=r['website'],
                        kaggleFile=o['file'], kaggleFY=r['fy'], status='todo', ocr=True)
json.dump(S, open(SCAN, 'w'), indent=1, ensure_ascii=False)
json.dump(pending, open(os.path.join(data, 'kaggle', 'pending_add.json'), 'w'), indent=1, ensure_ascii=False)
print(sum(1 for _, r in done if r), 'read by OCR;', len(pending), 'BRSR filers not yet queued, to be added when the next batch opens')
