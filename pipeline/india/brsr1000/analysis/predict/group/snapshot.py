"""Freeze the brsr1000 inputs (read-only) into snapshot.json so every number below can be re-run on identical data.
The scheduled pipeline keeps writing to the sqlite, so re-running this file may change results."""
import sys, json, sqlite3, time, hashlib
sqlite_path = '/Users/priyanshu/parity-tracker/pipeline/india/brsr1000/data/brsr1000.sqlite'
scan_path = '/Users/priyanshu/parity-tracker/pipeline/india/brsr1000/data/kaggle/scan.json'
out = sys.argv[1] if len(sys.argv) > 1 else 'snapshot.json'
c = sqlite3.connect('file:%s?mode=ro' % sqlite_path, uri=True, timeout=30)
c.row_factory = sqlite3.Row
rows = [dict(r) for r in c.execute("""select c.key, c.name, c.kaggle_file, c.kaggle_fy, c.checked_by, c.status,
  r.fy, r.boundary, r.nic_code, r.nic_activity, r.wage_share_current, r.wage_share_prior, r.wages_women, r.wages_total, r.wages_unit,
  r.perm_emp_total, r.perm_emp_men, r.perm_emp_women, r.perm_wkr_total, r.perm_wkr_women, r.board_total, r.board_women
  from companies c join readings r on r.key = c.key where r.fy = '2025-26'""")]
scan = json.load(open(scan_path))
sf = {x['file']: x for x in scan}
keep = ('file', 'id', 'name', 'fy', 'isBRSR', 'wageShare', 'wageShareBoth', 'permanent')
for r in rows:
    s = sf.get(r['kaggle_file'])
    r['scan'] = {k: s.get(k) for k in keep} if s else None
snap = dict(taken=time.strftime('%Y-%m-%d %H:%M:%S'), n_readings_fy2526=len(rows), n_scan=len(scan),
            scan_sha1=hashlib.sha1(open(scan_path, 'rb').read()).hexdigest(), rows=rows)
json.dump(snap, open(out, 'w'))
print('snapshot', out, 'taken', snap['taken'], 'readings FY2025-26:', len(rows), 'scan rows:', len(scan), 'scan sha1', snap['scan_sha1'][:10])
