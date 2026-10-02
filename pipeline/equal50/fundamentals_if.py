"""Fiscal 2025 and 2026 annual results from NSE's integrated filings (SEBI's format since 2025), for symbols in a file.

  python3 fundamentals_if.py symbols.txt fin_if.json
The year-end quarter's filing (31 March) carries the full year, read with the same extractor as the older results.
"""
import datetime as dt, json, os, sys, urllib.parse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fundamentals as F  # noqa: E402

HERE = F.HERE


def filings(sym):
    p = f'{HERE}/fin/list/{sym}_if.json'
    if os.path.exists(p):
        return json.load(open(p))
    raw = F.curl(f'https://www.nseindia.com/api/integrated-filing-results?symbol={urllib.parse.quote(sym)}&type=Integrated%20Filing-%20Financials')
    try:
        d = json.loads(raw)
    except Exception:
        return None
    rows = d.get('data', []) if isinstance(d, dict) else d
    json.dump(rows, open(p, 'w'))
    return rows


syms = [l.strip() for l in open(sys.argv[1]) if l.strip()]
out_path = f'{HERE}/{sys.argv[2]}'
out = json.load(open(out_path)) if os.path.exists(out_path) else {}
for n, sym in enumerate(syms):
    if sym in out:
        continue
    best = {}
    for r in filings(sym) or []:
        q = (r.get('qe_Date') or '').upper()
        if not q.startswith('31-MAR-') or not r.get('xbrl'):
            continue
        fy = int(q[-4:])
        when = F.parse_date(r.get('broadcast_Date', ''), '%d-%b-%Y %H:%M:%S') or dt.datetime(1900, 1, 1)
        key = (r.get('consolidated') == 'Consolidated', when)
        if fy in (2025, 2026) and (fy not in best or key > best[fy][0]):
            best[fy] = (key, r)
    rec = {}
    for fy, (_, r) in best.items():
        p = f'{HERE}/fin/x/{sym}_{fy}.xml'
        if not os.path.exists(p) or os.path.getsize(p) < 3000:
            F.curl(r['xbrl'], p)
        try:
            v = F.extract(p, dt.date(fy, 3, 31))
        except Exception as e:
            v = {'_error': str(e)[:80]}
        v.update(consolidated=r.get('consolidated') == 'Consolidated', broadcast=r.get('broadcast_Date'), source='integrated filing')
        rec[str(fy)] = v
    out[sym] = rec
    if n % 10 == 0:
        json.dump(out, open(out_path, 'w'))
        print(n, sym, sorted(rec), flush=True)
json.dump(out, open(out_path, 'w'))
print('done', len(out), 'symbols;', sum(1 for v in out.values() if '2026' in v), 'with fiscal 2026;', sum(1 for v in out.values() if '2025' in v), 'with fiscal 2025')
