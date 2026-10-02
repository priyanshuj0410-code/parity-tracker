"""Corporate events Oct 2024 to Sep 2026 that the price adjustments miss: demergers, rights issues, bonus preference shares.
Values each from NSE's bhavcopy on the ex-date and writes events.json, which build_e50.py reads."""
import csv, datetime as dt, io, json, os, re, subprocess, sys, time, zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
n500 = {r['Symbol'].strip(): r['ISIN Code'].strip() for r in csv.DictReader(open(f'{os.path.dirname(HERE)}/funds/ind_nifty500.csv'))}
ca = json.load(open(f'{HERE}/ca.json'))
prices = json.load(open(f'{HERE}/prices.json'))
MONTHS = sorted(prices['closes'])
# Demerged companies, as listed on NSE (checked against the bhavcopy names printed by `python3 events.py find`).
SPIN = json.load(open(f'{HERE}/spin_map.json')) if os.path.exists(f'{HERE}/spin_map.json') else {}


def bhav(d):
    p = f'{HERE}/px/{d:%Y%m%d}.zip'
    if not (os.path.exists(p) and os.path.getsize(p) > 1000):
        url = f'https://nsearchives.nseindia.com/content/cm/BhavCopy_NSE_CM_0_0_0_{d:%Y%m%d}_F_0000.csv.zip'
        r = subprocess.run(['curl', '-s', '-m', '60', '-A', UA, '-o', p, '-w', '%{http_code}', url], capture_output=True, text=True)
        time.sleep(0.7)
        if r.stdout != '200':
            return None
    z = zipfile.ZipFile(p)
    return [r for r in csv.DictReader(io.TextIOWrapper(z.open(z.namelist()[0]), encoding='utf-8')) if r['SctySrs'].strip() in ('EQ', 'BE', 'BZ')]


def face_values():
    out = {}
    for f in sorted(os.listdir(f'{HERE}/px')):
        if f.startswith('PR') and f.endswith('.zip'):
            z = zipfile.ZipFile(f'{HERE}/px/{f}')
            name = next((n for n in z.namelist() if n.upper().startswith('MCAP')), None)
            for r in csv.reader(io.TextIOWrapper(z.open(name), encoding='utf-8', errors='replace')) if name else []:
                if len(r) > 9:
                    try:
                        out[r[1].strip()] = float(r[6])
                    except ValueError:
                        pass
    return out


def collect():
    ev = []
    for s, acts in ca.items():
        for a in acts or []:
            sub = (a.get('subject') or '').strip()
            low = sub.lower()
            if not any(k in low for k in ('demerger', 'rights', 'ncrps')):
                continue
            try:
                ex = dt.datetime.strptime(a['exDate'].strip(), '%d-%b-%Y').date()
            except (ValueError, KeyError, AttributeError):
                continue
            if dt.date(2024, 10, 1) <= ex <= dt.date(2026, 9, 30) and s in n500:
                ev.append((s, ex, sub))
    return sorted(ev, key=lambda e: e[1])


def row_for(rows, s):
    isin = n500[s]
    return next((r for r in rows if r['ISIN'].strip() == isin), None) or next((r for r in rows if r['TckrSymb'].strip() == s), None)


if len(sys.argv) > 1 and sys.argv[1] == 'find':
    for s, ex, sub in collect():
        if 'demerger' not in sub.lower():
            continue
        before = next(m for m in reversed(MONTHS) if dt.date.fromisoformat(prices['dates'][m]) < ex)
        later = [m for m in MONTHS if m > before][:9]
        new = sorted({x for m in later for x in prices['closes'][m]} - set(prices['closes'][before]))
        first = {x: next(m for m in later if x in prices['closes'][m]) for x in new}
        names = {}
        for m in sorted(set(first.values())):
            rows = bhav(dt.date.fromisoformat(prices['dates'][m])) or []
            names.update({r['TckrSymb'].strip(): r['FinInstrmNm'].strip() for r in rows})
        key = re.sub(r'[^a-z]', '', s.lower())[:4]
        print(s, ex, [(x, first[x], names.get(x, '')) for x in new if key[:3] in (x + names.get(x, '')).lower().replace(' ', '')][:12])
    sys.exit()

fv = face_values()
out = {}
for s, ex, sub in collect():
    rows = bhav(ex)
    if rows is None:
        print('no bhavcopy', s, ex); continue
    r = row_for(rows, s)
    if r is None:
        print('not traded', s, ex); continue
    prev, opn, cls = float(r['PrvsClsgPric']), float(r['OpnPric']), float(r['ClsPric'])
    low = sub.lower()
    e = dict(subject=sub, exDate=ex.isoformat(), prevClose=prev, open=opn, close=cls)
    if 'demerger' in low:
        e.update(kind='spin', dummy=round(prev - opn, 4), **SPIN.get(s, {}))
    elif 'ncrps' in low:
        a, b = map(float, re.search(r'(\d+)\s*:\s*(\d+)', sub).groups())
        e.update(kind='div', amount=10.0 * a / b, note='bonus preference shares at their face value of Rs 10')
    else:
        a, b, prem = re.search(r'rights\s*(\d+)\s*:\s*(\d+)\s*@\s*premium\s*rs\.?\s*([\d.]+)', low).groups()
        a, b, R = float(a), float(b), float(prem) + fv.get(r['TckrSymb'].strip(), fv.get(s, 0.0))
        terp = (b * prev + a * R) / (a + b)
        e.update(kind='factor', issuePrice=R, terp=round(terp, 4), factor=prev / terp)
    out.setdefault(s, []).append(e)
    print(s, ex, sub[:40], {k: (round(v, 4) if isinstance(v, float) else v) for k, v in e.items() if k not in ('subject', 'exDate')})
json.dump(out, open(f'{HERE}/events.json', 'w'), indent=1)
