"""Step 0: freeze read-only inputs into scratch JSON so every later step is reproducible.
Reads the live SQLite strictly read-only. Writes only into data/analysis/predict/nowcast/snap."""
import json, sqlite3, os, sys, time
HERE = os.path.dirname(os.path.abspath(__file__))
DB = '/Users/priyanshu/parity-tracker/pipeline/india/brsr1000/data/brsr1000.sqlite'
SCAN = '/Users/priyanshu/parity-tracker/pipeline/india/brsr1000/data/kaggle/scan.json'
QUEUE = '/Users/priyanshu/parity-tracker/pipeline/india/brsr1000/data/queue.json'
PANEL = '/Users/priyanshu/Thoth/knowledge/research/data/companies.json'
out = os.path.join(os.path.join(HERE, '..', '..', '..', 'data', 'analysis', 'predict', 'nowcast'), 'snap')
os.makedirs(out, exist_ok=True)
c = sqlite3.connect('file:%s?mode=ro' % DB, uri=True)
c.row_factory = sqlite3.Row
def rows(q):
    return [dict(r) for r in c.execute(q)]
snap = dict(
    taken=time.strftime('%Y-%m-%d %H:%M:%S'),
    companies=rows('select * from companies'),
    readings=rows('select * from readings'),
    turnover_trend=rows('select * from turnover_trend'),
)
json.dump(snap, open(os.path.join(out, 'db.json'), 'w'))
for src, name in ((SCAN, 'scan.json'), (QUEUE, 'queue.json'), (PANEL, 'panel.json')):
    json.dump(json.load(open(src)), open(os.path.join(out, name), 'w'))
print('snapshot', snap['taken'], len(snap['companies']), 'companies', len(snap['readings']), 'readings')
