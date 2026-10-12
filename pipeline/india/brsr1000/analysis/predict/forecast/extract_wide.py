"""Step 1: read-only snapshot of the wider set (brsr1000.sqlite joined to the Kaggle FY2024-25 scan).

Writes wide_snapshot.json to data/analysis/predict/forecast. The live pipeline keeps adding readings, so the snapshot
freezes the inputs; forecast.py reads only the snapshot.
"""
import json, os, sqlite3, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = '/Users/priyanshu/parity-tracker/pipeline/india/brsr1000/data'
DB = DATA + '/brsr1000.sqlite'

con = sqlite3.connect('file:%s?mode=ro' % DB, uri=True)
con.row_factory = sqlite3.Row
cur = con.cursor()

scan = json.load(open(DATA + '/kaggle/scan.json'))
by_file = {}
for s in scan:
    by_file.setdefault(s['file'], []).append(s)

comp = {r['key']: dict(r) for r in cur.execute('select * from companies')}
reads = {r['key']: dict(r) for r in cur.execute('select * from readings')}
tt = {}
for r in cur.execute('select key, fy, men, women, total from turnover_trend'):
    tt.setdefault(r['key'], {})[r['fy']] = dict(men=r['men'], women=r['women'], total=r['total'])

out = []
for k, rd in reads.items():
    c = comp.get(k)
    if not c:
        continue
    sc = by_file.get(c['kaggle_file']) if c['kaggle_file'] else None
    sc = sc[0] if sc else None
    out.append(dict(
        key=k, name=c['name'], status=c['status'], checked_by=c['checked_by'],
        kaggle_file=c['kaggle_file'], kaggle_fy=c['kaggle_fy'],
        reading={f: rd[f] for f in ('fy', 'boundary', 'nic_code', 'nic_activity', 'wage_share_current', 'wage_share_prior',
                                    'perm_emp_total', 'perm_emp_men', 'perm_emp_women', 'board_total', 'board_women',
                                    'turnover_men', 'turnover_women', 'turnover_total')},
        turnover_trend=tt.get(k, {}),
        scan=None if not sc else dict(
            fy=sc.get('fy'), isBRSR=sc.get('isBRSR'), wageShare=sc.get('wageShare'), wageShareBoth=sc.get('wageShareBoth'),
            permanent=sc.get('permanent'), women=sc.get('women'), turnover=sc.get('turnover'), ocr=sc.get('ocr')),
    ))

snap = dict(
    extracted_at=datetime.datetime.now().isoformat(timespec='seconds'),
    n_readings=len(reads), n_companies=len(comp), n_scan=len(scan),
    scan_mtime=datetime.datetime.fromtimestamp(os.path.getmtime(DATA + '/kaggle/scan.json')).isoformat(timespec='seconds'),
    db_mtime=datetime.datetime.fromtimestamp(os.path.getmtime(DB)).isoformat(timespec='seconds'),
    rows=out)
json.dump(snap, open(os.path.join(os.path.join(HERE, '..', '..', '..', 'data', 'analysis', 'predict', 'forecast'), 'wide_snapshot.json'), 'w'))
print('snapshot: readings=%d joined=%d with_scan=%d db_mtime=%s' % (
    len(reads), len(out), sum(1 for r in out if r['scan']), snap['db_mtime']))
