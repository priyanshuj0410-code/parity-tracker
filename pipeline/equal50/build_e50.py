"""Equal 50, version 1, as pre-registered in knowledge/decisions/0005-equal-50-methodology.md.

  python3 build_e50.py pool    each year's top parity candidates that pass the data and scale screens -> pool.txt
  python3 build_e50.py build   portfolios, backtest, sensitivities -> result.json and a printed report
"""
import csv, datetime as dt, json, math, os, re, sys, statistics as st
from collections import Counter, defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
SCR = os.path.dirname(HERE)
REB = {2022: '2022-09', 2023: '2023-09', 2024: '2024-09', 2025: '2025-09', 2026: '2026-09'}
POOL_N = int(os.environ.get('POOL_N', 120))
FIN = 'Financial Services'

N500 = next(p for p in (f'{SCR}/funds/ind_nifty500.csv', os.path.join(HERE, '..', 'india', 'indexes', 'ind_nifty500.csv')) if os.path.exists(p))
n500 = {r['Symbol'].strip(): dict(name=r['Company Name'].strip(), industry=r['Industry'].strip(), isin=r['ISIN Code'].strip())
        for r in csv.DictReader(open(N500))}
cy = json.load(open(f'{SCR}/company_years.json'))
meta = json.load(open(f'{SCR}/meta_all.json'))
prices = json.load(open(f'{HERE}/prices.json'))
DATES = prices['dates']
MONTHS = sorted(prices['closes'])


def day(s):
    for f in ('%d-%b-%Y', '%d-%b-%Y %H:%M:%S', '%d-%b-%Y %H:%M', '%Y-%m-%d'):
        try:
            return dt.datetime.strptime((s or '').strip(), f).date()
        except ValueError:
            pass
    return None


def reb_date(Y):
    return dt.date.fromisoformat(DATES[REB[Y]])


HINDSIGHT = set()  # years built with later-published wage shares (labelled extra run only)


def brsr(s, Y):
    """BRSR for the fiscal year ending March Y, only if NSE received it by the rebalance date."""
    r = cy.get(s, {}).get(f'{Y - 1}-{str(Y)[2:]}')
    if not r or r.get('kind') != 'reported' or r.get('w') is None or r.get('f_perm') is None or not r.get('Np'):
        return None
    if Y in HINDSIGHT:
        return r
    # Point in time: the wage share must come from this year's own filing, not the next year's prior-year column.
    if r.get('src') != 'own' or (r.get('note') or '').startswith('from next year filing'):
        return None
    f = meta.get(s, {}).get('filings', {}).get(str(Y))
    sub = day(f.get('submitted')) if f else None
    return r if sub and sub <= reb_date(Y) else None


def parity(r):
    E, w = r['f_perm'], r['w']
    if not (0 < E < 1 and 0 < w < 1):
        return None
    W = (w / E) / ((1 - w) / (1 - E))
    return dict(E=E, W=W, w=w, P=math.sqrt((min(E, 1 - E) / 0.5) * min(W, 1 / W)), Np=r['Np'], payroll=r.get('W'))


def screened(Y):
    out = {}
    for s in n500:
        r = brsr(s, Y)
        if r and r['Np'] >= 1000:
            p = parity(r)
            if p:
                out[s] = p
    return out


if sys.argv[1] == 'pool':
    pool = set()
    HINDSIGHT.add(2023)
    for Y in REB:
        sc = sorted(screened(Y).items(), key=lambda kv: -kv[1]['P'])
        print(Y, len(sc), 'pass data and scale screens; top P', [(s, round(p['P'], 3)) for s, p in sc[:5]])
        pool |= {s for s, _ in sc[:POOL_N]}
    open(f'{HERE}/pool.txt', 'w').write('\n'.join(sorted(pool)) + '\n')
    print(len(pool), 'symbols in pool')
    sys.exit()

fin = json.load(open(f'{HERE}/fin.json'))
ca = json.load(open(f'{HERE}/ca.json'))
sh = json.load(open(f'{HERE}/shp_hist.json'))
_acts = {}


def actions(s):
    if s in _acts:
        return _acts[s]
    out = []
    for a in ca.get(s) or []:
        sub, when = a.get('subject') or '', day(a.get('exDate'))
        if not when:
            continue
        low = sub.lower()
        m = re.search(r'from\s*r[se]\.?\s*([\d.]+).*?to\s*r[se]\.?\s*([\d.]+)', low)
        if 'split' in low and m and float(m.group(2)) > 0:
            out.append((when, 'factor', float(m.group(1)) / float(m.group(2))))
        m = re.search(r'bonus\s*(\d+)\s*:\s*(\d+)', low)
        if m and float(m.group(2)) > 0:
            out.append((when, 'factor', (float(m.group(1)) + float(m.group(2))) / float(m.group(2))))
        if 'dividend' in low:
            amts = []
            for x in re.findall(r'r[se]\.?\s*([\d.]+)\s*(?:/-)?\s*per\s*share', low):
                try:
                    amts.append(float(re.sub(r'\.+', '.', x).strip('.')))
                except ValueError:
                    pass
            if amts:
                out.append((when, 'div', sum(amts)))
        if any(k in low for k in ('demerger', 'scheme of arrangement', 'rights')):
            out.append((when, 'flag', sub[:70]))
    _acts[s] = sorted(out)
    return _acts[s]


def close(s, k):
    x = prices['closes'][k].get(s)
    return x['close'] if x else None


def month_return(s, k0, k1):
    p0, p1 = close(s, k0), close(s, k1)
    if not p0 or not p1:
        return None, None, None
    a, b = dt.date.fromisoformat(DATES[k0]), dt.date.fromisoformat(DATES[k1])
    F, D, flag = 1.0, 0.0, None
    for when, kind, v in actions(s):
        if a < when <= b:
            if kind == 'factor':
                F *= v
            elif kind == 'div':
                D += v * F
            else:
                flag = v
    pr = p1 * F / p0 - 1
    if flag is None and abs(pr) > 0.6:
        flag = 'move over 60% with no recorded action'
    return (p1 * F + D) / p0 - 1, pr, flag


def mcap(s, Y):
    m = prices['mcap'].get(REB[Y], {}).get(s)
    if m:
        return m['mcap'], 'file'
    m24, p = prices['mcap'].get('2024-09', {}).get(s), close(s, REB[Y])
    if not m24 or not p:
        return None, None
    a, b = reb_date(Y), dt.date.fromisoformat(DATES['2024-09'])
    F = math.prod(v for when, kind, v in actions(s) if kind == 'factor' and a < when <= b)
    return p * m24['shares'] / F, 'shares from Sep 2024'


def public(s, Y):
    rows = [(day(x['date']), x['public']) for x in (sh.get(s) or []) if x.get('public') not in (None, '')]
    rows = [(a, float(b)) for a, b in rows if a and a <= dt.date(Y, 6, 30)]
    return max(rows)[1] if rows else None


def fy(s, Y, rd):
    r = fin.get(s, {}).get(str(Y))
    if not r or '_error' in r:
        return None
    b = day(r.get('broadcast'))
    return r if b and b <= rd else None


def equity(r):
    for k in ('equityOwners', 'equity'):
        if r.get(k):
            return r[k]
    if r.get('shareCapital') is not None and r.get('otherEquity') is not None:
        return r['shareCapital'] + r['otherEquity']
    if r.get('paidUp') is not None and r.get('reservesExRev') is not None:
        return r['paidUp'] + r['reservesExRev']
    return None


def profit(r):
    return r.get('profitOwners') if r.get('profitOwners') is not None else r.get('netProfit')


def revenue(r, financial):
    return (r.get('income') if financial else r.get('revenue')) or r.get('revenue') or r.get('income')


def fundamentals(s, Y):
    rd, financial = reb_date(Y), n500[s]['industry'] == FIN
    a, b, c = fy(s, Y, rd), fy(s, Y - 1, rd), fy(s, Y - 2, rd)
    if not a or not b:
        return ['annual results missing'], {}
    why, n1, n0 = [], profit(a), profit(b)
    if n1 is None or n0 is None or n1 <= 0 or n0 <= 0:
        why.append('profit')
    e1, e0 = equity(a), equity(b)
    roe = None
    if not e1 or e1 <= 0:
        why.append('equity missing')
    else:
        roe = (n1 or 0) / ((e1 + e0) / 2 if e0 and e0 > 0 else e1)
        if roe < 0.10:
            why.append('return on equity')
    r1, r0 = revenue(a, financial), revenue(c, financial) if c else revenue(b, financial)
    if not r1 or not r0 or r1 < r0:
        why.append('revenue')
    de = ic = None
    if not financial:
        parts = [a.get(k) for k in ('borrowNC', 'borrowC') if a.get(k) is not None]
        borrow = a.get('borrow') if a.get('borrow') is not None else (sum(parts) if parts else None)
        if borrow is not None and e1:
            de = borrow / e1
            if de > 1.0:
                why.append('debt')
        fc, pbt = a.get('financeCosts'), a.get('pbt')
        if fc and fc > 0 and pbt is not None:
            ic = (pbt + fc) / fc
            if ic < 3:
                why.append('interest cover')
    return why, dict(roe=roe, de=de, ic=ic, growth=(r1 / r0 - 1) if r1 and r0 else None)


def select(Y, fundamentals_screen=True, industry_cap=True):
    reasons, el = Counter(), []
    for s, p in screened(Y).items():
        mc, src = mcap(s, Y)
        pub = public(s, Y)
        if not mc or pub is None:
            reasons['size data missing'] += 1
            continue
        ff = mc * pub / 100
        if ff < 2000e7:
            reasons['free float under 2,000 crore'] += 1
            continue
        f = {}
        if fundamentals_screen:
            why, f = fundamentals(s, Y)
            if why:
                for w in why:
                    reasons[w] += 1
                continue
        el.append(dict(symbol=s, ff=ff, mcap=mc, mcapSource=src, **p, **f))
    el.sort(key=lambda x: (-x['P'], -x['ff']))
    pick, per = [], Counter()
    for x in el:
        ind = n500[x['symbol']]['industry']
        if industry_cap and per[ind] >= 10:
            continue
        pick.append(x)
        per[ind] += 1
        if len(pick) == 50:
            break
    return pick, len(el), reasons


def weights(pick, equal=False):
    if equal:
        return {x['symbol']: 1 / len(pick) for x in pick}
    tot = sum(x['ff'] for x in pick)
    w = {x['symbol']: x['ff'] / tot for x in pick}
    ind = lambda k: n500[k]['industry']
    for _ in range(200):
        changed = False
        over = [k for k, v in w.items() if v > 0.08 + 1e-9]
        if over:
            excess = sum(w[k] - 0.08 for k in over)
            for k in over:
                w[k] = 0.08
            free = {k: v for k, v in w.items() if v < 0.08 - 1e-9}
            fs = sum(free.values())
            for k in free:
                w[k] += excess * free[k] / fs
            changed = True
        tots = defaultdict(float)
        for k, v in w.items():
            tots[ind(k)] += v
        for i, t in tots.items():
            if t > 0.30 + 1e-9:
                excess = t - 0.30
                for k in w:
                    if ind(k) == i:
                        w[k] *= 0.30 / t
                others = {k: v for k, v in w.items() if ind(k) != i and tots[ind(k)] < 0.30 - 1e-9}
                os_ = sum(others.values())
                for k in others:
                    w[k] += excess * others[k] / os_
                changed = True
        if not changed:
            break
    return w


def backtest(ports):
    series, flags = [], []
    for Y in (2022, 2023, 2024, 2025):
        if Y not in ports or not ports[Y]:
            continue
        w, prev = dict(ports[Y]), REB[Y]
        for k in [m for m in MONTHS if REB[Y] < m <= REB[Y + 1]]:
            tr = pr = 0.0
            nw = {}
            for s, ws in w.items():
                t, p, flag = month_return(s, prev, k)
                if t is None:
                    t = p = 0.0
                    flags.append((k, s, 'no price'))
                elif flag:
                    flags.append((k, s, flag))
                tr += ws * t
                pr += ws * p
                nw[s] = ws * (1 + t)
            tot = sum(nw.values())
            w = {s: v / tot for s, v in nw.items()}
            series.append(dict(month=k, tr=tr, pr=pr))
            prev = k
    return series, flags


def bench():
    out = {'nifty50TR': {}, 'nifty50PR': {}, 'sensexTR': {}}
    sx = json.load(open(f'{HERE}/sensex.json')) if os.path.exists(f'{HERE}/sensex.json') else {}
    for a, b in zip(MONTHS, MONTHS[1:]):
        if a < REB[2022]:
            continue
        out['nifty50TR'][b] = close('SETFNIF50', b) / close('SETFNIF50', a) - 1
        out['nifty50PR'][b] = prices['indexes'][b]['Nifty 50']['close'] / prices['indexes'][a]['Nifty 50']['close'] - 1
        if a in sx and b in sx:
            out['sensexTR'][b] = sx[b] / sx[a] - 1
    return out


def stats(r):
    if not r:
        return {}
    g = math.prod(1 + x for x in r)
    v = peak = 1.0
    mdd = 0.0
    for x in r:
        v *= 1 + x
        peak = max(peak, v)
        mdd = min(mdd, v / peak - 1)
    return dict(cumulative=g - 1, annualised=g ** (12 / len(r)) - 1, volatility=st.stdev(r) * math.sqrt(12), maxDrawdown=mdd, months=len(r))


def relative(series, key, bm):
    months = [x['month'] for x in series if x['month'] in bm]
    r = [x[key] for x in series if x['month'] in bm]
    q = [bm[m] for m in months]
    act = [x - y for x, y in zip(r, q)]
    mq, mr = st.mean(q), st.mean(r)
    beta = sum((x - mr) * (y - mq) for x, y in zip(r, q)) / sum((y - mq) ** 2 for y in q)
    return dict(trackingError=st.stdev(act) * math.sqrt(12), beta=beta, months=len(months),
                benchmarkSamePeriod=stats(q), excessAnnualised=stats(r)['annualised'] - stats(q)['annualised'])


def footprint(w, picks):
    by = {x['symbol']: x for x in picks}
    own = wom = 0.0
    for s, ws in w.items():
        x = by[s]
        if not x.get('payroll'):
            continue
        a = ws / x['mcap']
        own += a * x['payroll']
        wom += a * x['payroll'] * x['w']
    return wom / own if own else None


def run(label, fundamentals_screen=True, industry_cap=True, equal=False):
    ports, detail = {}, {}
    for Y in REB:
        pick, n_el, reasons = select(Y, fundamentals_screen, industry_cap)
        w = weights(pick, equal) if pick else {}
        ports[Y] = w
        detail[Y] = dict(eligible=n_el, held=len(pick), excludedFor=dict(reasons.most_common()), footprint=footprint(w, pick) if pick else None,
                         constituents=[dict(symbol=x['symbol'], name=n500[x['symbol']]['name'], industry=n500[x['symbol']]['industry'],
                                            weight=round(w[x['symbol']], 5), E=round(x['E'], 4), W=round(x['W'], 4), P=round(x['P'], 4),
                                            freeFloatCr=round(x['ff'] / 1e7), roe=None if x.get('roe') is None else round(x['roe'], 4),
                                            mcapSource=x['mcapSource']) for x in pick])
    series, flags = backtest(ports)
    return dict(label=label, years=detail, series=series, flags=flags)


main = run('Equal 50, version 1')
sens = [run('Equal weights', equal=True), run('Parity score only, no fundamentals screens', fundamentals_screen=False), run('No industry cap', industry_cap=False)]
HINDSIGHT.add(2023)
hindsight = run('Hindsight start in Sep 2023 (uses wage shares published after that date; not a valid backtest)')
HINDSIGHT.clear()
b = bench()


def summary(res):
    tr = [x['tr'] for x in res['series']]
    pr = [x['pr'] for x in res['series']]
    out = dict(totalReturn=stats(tr), priceReturn=stats(pr), vsNifty50TR=relative(res['series'], 'tr', b['nifty50TR']),
               vsNifty50PR=relative(res['series'], 'pr', b['nifty50PR']))
    if b['sensexTR']:
        out['vsSensexTR'] = relative(res['series'], 'tr', b['sensexTR'])
    periods = {}
    for Y in (2022, 2023, 2024, 2025):
        ms = [x for x in res['series'] if REB[Y] < x['month'] <= REB[Y + 1]]
        if ms:
            periods[f'Oct {Y} to Sep {Y + 1}'] = dict(index=math.prod(1 + x['tr'] for x in ms) - 1,
                                                       nifty50TR=math.prod(1 + b['nifty50TR'][x['month']] for x in ms) - 1,
                                                       sensexTR=math.prod(1 + b['sensexTR'][x['month']] for x in ms) - 1 if b['sensexTR'] else None)
    out['periods'] = periods
    return out


result = dict(methodology='knowledge/decisions/0005-equal-50-methodology.md', built=dt.datetime.now().isoformat(timespec='seconds'),
              hindsight=dict(summary=summary(hindsight), years={Y: dict(held=hindsight['years'][Y]['held'], eligible=hindsight['years'][Y]['eligible']) for Y in REB}, constituents2023=hindsight['years'][2023]['constituents']),
              main=main, mainSummary=summary(main), sensitivities=[dict(label=s['label'], summary=summary(s), held={Y: s['years'][Y]['held'] for Y in REB}) for s in sens],
              benchmarks=dict(nifty50TR=stats(list(b['nifty50TR'].values())), nifty50PR=stats(list(b['nifty50PR'].values())), sensexTR=stats(list(b['sensexTR'].values())),
                              source=dict(nifty50TR='SBI Nifty 50 ETF (SETFNIF50) month-end closes, NSE', nifty50PR='NSE Nifty 50 index close',
                                          sensexTR='ICICI Prudential BSE Sensex ETF, ISIN INF346A01034 (ICICISENSX, then SENSEXIETF), NSE' if b.get('sensexTR') else 'not available')))
json.dump(result, open(f'{HERE}/result.json', 'w'), indent=1, default=str)
for Y in REB:
    d = main['years'][Y]
    print(Y, 'eligible', d['eligible'], 'held', d['held'], 'footprint', None if d['footprint'] is None else round(d['footprint'], 3), 'excluded for', d['excludedFor'])
print('main', json.dumps(result['mainSummary'], default=lambda x: round(x, 4) if isinstance(x, float) else x)[:900])
print('benchmarks', json.dumps(result['benchmarks'], default=str)[:600])
for s in result['sensitivities']:
    print(s['label'], {k: round(v, 4) for k, v in s['summary']['totalReturn'].items() if isinstance(v, float)}, s['held'])
print('flags', len(main['flags']), main['flags'][:12])
