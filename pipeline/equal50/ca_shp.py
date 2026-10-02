"""Corporate actions and quarterly shareholding history from NSE for symbols in a file. Writes ca.json and shp_hist.json."""
import json, os, subprocess, sys, time, urllib.parse

UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
HERE = os.path.dirname(os.path.abspath(__file__))


def api(url):
    r = subprocess.run(['curl', '-s', '-m', '40', '-A', UA, url], capture_output=True, text=True)
    time.sleep(0.5)
    try:
        return json.loads(r.stdout)
    except Exception:
        return None


syms = [l.strip() for l in open(sys.argv[1]) if l.strip()]
ca = json.load(open(f'{HERE}/ca.json')) if os.path.exists(f'{HERE}/ca.json') else {}
sh = json.load(open(f'{HERE}/shp_hist.json')) if os.path.exists(f'{HERE}/shp_hist.json') else {}
for n, s in enumerate(syms):
    q = urllib.parse.quote(s)
    if s not in ca:
        d = api(f'https://www.nseindia.com/api/corporates-corporateActions?index=equities&symbol={q}')
        ca[s] = [dict(exDate=x.get('exDate'), subject=x.get('subject')) for x in (d or [])] if isinstance(d, list) else None
    if s not in sh:
        d = api(f'https://www.nseindia.com/api/corporate-share-holdings-master?index=equities&symbol={q}')
        sh[s] = [dict(date=x.get('date'), public=x.get('public_val')) for x in (d or [])] if isinstance(d, list) else None
    if n % 20 == 0:
        json.dump(ca, open(f'{HERE}/ca.json', 'w')); json.dump(sh, open(f'{HERE}/shp_hist.json', 'w'))
        print(n, s, len(ca[s] or []), 'actions', len(sh[s] or []), 'quarters', flush=True)
json.dump(ca, open(f'{HERE}/ca.json', 'w')); json.dump(sh, open(f'{HERE}/shp_hist.json', 'w'))
print('done', len(ca), 'symbols;', sum(1 for v in ca.values() if v is None), 'action failures;', sum(1 for v in sh.values() if v is None), 'shareholding failures')
