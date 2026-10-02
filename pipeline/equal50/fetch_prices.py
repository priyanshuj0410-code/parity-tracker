"""Month-end NSE closes (bhavcopy), NSE index closes and rebalance-date market caps, Sep 2022 to Sep 2026."""
import calendar, csv, datetime as dt, io, json, os, subprocess, time, zipfile

UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
OUT = os.path.dirname(os.path.abspath(__file__))
MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']


def get(url, path):
    r = subprocess.run(['curl', '-s', '-m', '60', '-A', UA, '-o', path, '-w', '%{http_code}', url], capture_output=True, text=True)
    time.sleep(0.7)
    return r.stdout == '200' and os.path.exists(path) and os.path.getsize(path) > 1000


def bhav(d):
    os.makedirs(f'{OUT}/px', exist_ok=True)
    p = f'{OUT}/px/{d:%Y%m%d}.zip'
    if os.path.exists(p) and zipfile.is_zipfile(p):
        return p
    if d >= dt.date(2024, 7, 8):
        url = f'https://nsearchives.nseindia.com/content/cm/BhavCopy_NSE_CM_0_0_0_{d:%Y%m%d}_F_0000.csv.zip'
    else:
        url = f'https://nsearchives.nseindia.com/content/historical/EQUITIES/{d.year}/{MON[d.month - 1]}/cm{d:%d}{MON[d.month - 1]}{d.year}bhav.csv.zip'
    return p if get(url, p) else None


def parse_bhav(p):
    z = zipfile.ZipFile(p)
    rows = csv.DictReader(io.TextIOWrapper(z.open(z.namelist()[0]), encoding='utf-8'))
    out = {}
    for r in rows:
        if 'TckrSymb' in r:
            sym, ser, close, isin = r['TckrSymb'].strip(), r['SctySrs'].strip(), r['ClsPric'], r['ISIN'].strip()
        else:
            sym, ser, close, isin = r['SYMBOL'].strip(), r['SERIES'].strip(), r['CLOSE'], r.get('ISIN', '').strip()
        if ser in ('EQ', 'BE', 'BZ') and (sym not in out or ser == 'EQ'):
            out[sym] = {'close': float(close), 'isin': isin, 'series': ser}
    return out


closes, idx, used = {}, {}, {}
for y in range(2021, 2027):
    for m in range(1, 13):
        if (y, m) < (2021, 9) or (y, m) > (2026, 9):
            continue
        d = dt.date(y, m, calendar.monthrange(y, m)[1])
        for _ in range(8):
            if d.weekday() < 5 and bhav(d):
                break
            d -= dt.timedelta(days=1)
        else:
            print('no file for', y, m)
            continue
        key = f'{y}-{m:02d}'
        used[key] = d.isoformat()
        closes[key] = parse_bhav(f'{OUT}/px/{d:%Y%m%d}.zip')
        ip = f'{OUT}/px/ind_{d:%d%m%Y}.csv'
        if os.path.exists(ip) or get(f'https://nsearchives.nseindia.com/content/indices/ind_close_all_{d:%d%m%Y}.csv', ip):
            idx[key] = {r['Index Name'].strip(): {'close': float(r['Closing Index Value']), 'divYield': r.get('Div Yield', '').strip()}
                        for r in csv.DictReader(open(ip, encoding='utf-8', errors='replace')) if r.get('Closing Index Value', '').strip() not in ('', '-')}
        print(key, d, len(closes[key]), 'stocks;', 'Nifty 50', idx.get(key, {}).get('Nifty 50', {}).get('close'))

mcap = {}
for key in ('2021-09', '2022-09', '2023-09', '2024-09', '2025-09', '2026-09'):
    d = dt.date.fromisoformat(used[key])
    zp = f'{OUT}/px/PR{d:%d%m%y}.zip'
    if os.path.exists(zp) or get(f'https://nsearchives.nseindia.com/archives/equities/bhavcopy/pr/PR{d:%d%m%y}.zip', zp):
        z = zipfile.ZipFile(zp)
        name = next((n for n in z.namelist() if n.upper().startswith('MCAP')), None)
        if name:
            rows = csv.reader(io.TextIOWrapper(z.open(name), encoding='utf-8', errors='replace'))
            mcap[key] = {r[1].strip(): {'shares': float(r[7]), 'mcap': float(r[9])} for r in rows
                         if len(r) > 9 and r[2].strip() in ('EQ', 'BE', 'BZ') and r[9].strip().replace('.', '', 1).isdigit()}
    print('mcap', key, len(mcap.get(key, {})))

json.dump({'dates': used, 'closes': closes, 'indexes': idx, 'mcap': mcap}, open(f'{OUT}/prices.json', 'w'))
print('saved', len(closes), 'months')
