"""Parity 50 backfilled history, September 2021 to September 2024 (knowledge/decisions/0009-parity-50-backfill.md), chained to the
point-in-time version 2 results (0008). Writes parity50_backfill_result.json."""
import json, math, os

_here = os.path.dirname(os.path.abspath(__file__))
_me, __file__ = __file__, os.path.join(_here, 'parity50_v2.py')
_src = open(__file__).read()
exec(compile(_src[:_src.index("if __name__ == '__main__':")], 'parity50_v2', 'exec'))
__file__ = _me

REB[2021] = '2021-09'
BACKFILL = (2021, 2022, 2023)
FY = lambda y: f'{y - 1}-{str(y)[2:]}'


def standin(s, Y):
    """Figures for the fiscal year ending March Y if any filing reports them, else the earliest later year that does."""
    for y in range(Y, 2027):
        r = cy.get(s, {}).get(FY(y))
        if (r and r.get('kind') == 'reported' and r.get('w') is not None and r.get('f_perm') is not None and r.get('Np')
                and 0 < r['w'] < 1 and 0 < r['f_perm'] < 1 and r.get('W')):
            return r, y
    return None, None


def public_bf(s, Y):
    """The latest shareholding pattern on or before 30 June of Y, else the earliest on record (NSE's history starts in September 2021)."""
    p = public(s, Y)
    if p is not None:
        return p
    rows = sorted((day(x['date']), float(x['public'])) for x in (sh.get(s) or []) if x.get('public') not in (None, '') and day(x['date']))
    return rows[0][1] if rows else None


def rows_bf(Y):
    rows = []
    for s, meta_ in n500.items():
        mc, _ = mcap(s, Y)
        pub = public_bf(s, Y)
        if not mc or pub is None:
            continue
        r, used = standin(s, Y)
        rows.append(dict(s=s, ff=mc * pub / 100, mcap=mc, sector=meta_['industry'], used=used, w=r['w'] if r else None,
                         E=r['f_perm'] if r else None, c=(r['W'] / mc) if r else 0.0, h=(r['Np'] / mc) if r else 0.0))
    return rows


def capped(ws):
    for _ in range(100):
        t = sum(ws.values())
        over = [s for s, v in ws.items() if v / t > CAP + 1e-12]
        if not over:
            break
        free = sum(v for s, v in ws.items() if s not in over)
        for s in over:
            ws[s] = CAP * t
        for s in ws:
            if s not in over:
                ws[s] *= (t - CAP * t * len(over)) / free
    t = sum(ws.values())
    return {s: v / t for s, v in ws.items()}


def build_bf(Y):
    rows = rows_bf(Y)
    n50 = [r for r in rows if r['s'] in N50]
    tot = sum(r['ff'] for r in n50)
    b = {r['s']: r['ff'] / tot for r in n50}
    B = share(rows, [b.get(r['s'], 0.0) for r in rows], 'w', 'c')
    eligible = sorted((r for r in rows if r['w'] is not None and r['w'] >= B and r['h'] * r['mcap'] >= STAFF), key=lambda r: -r['ff'])
    x = capped({r['s']: r['ff'] * r['w'] / B for r in eligible[:COUNT]})
    return rows, x, b, B, len(eligible)


def flags(rows, w, Y):
    out = []
    for s, v in w.items():
        if v <= 0:
            continue
        for k in [m for m in MONTHS if REB[Y] < m <= REB[Y + 1]]:
            t, pr, f = month_return(s, MONTHS[MONTHS.index(k) - 1], k)
            if f or t is None:
                out.append((s, k, round(v * 100, 2), f or 'no price'))
    return out


out = dict(years={}, index=[], parent=[])
for Y in BACKFILL:
    rows, x, b, B, n_el = build_bf(Y)
    rs = {r['s']: r for r in rows}
    xv, bv = [x.get(r['s'], 0.0) for r in rows], [b.get(r['s'], 0.0) for r in rows]
    avg = lambda w, key: sum(v * rs[s][key] for s, v in w.items() if rs[s][key] is not None) / sum(v for s, v in w.items() if rs[s][key] is not None)
    out['years'][Y] = dict(
        bar=B, eligible=n_el, held=len(x), payroll=share(rows, xv, 'w', 'c'), parentPayroll=share(rows, bv, 'w', 'c'),
        pay=avg(x, 'w'), parentPay=avg(b, 'w'), staff=avg(x, 'E'), parentStaff=avg(b, 'E'),
        laterFigures=sum(1 for s in x if rs[s]['used'] and rs[s]['used'] > Y), n50In=sum(1 for s in x if s in b), n50Listed=len(b),
        flags=flags(rows, x, Y) + [('parent', *f) for f in flags(rows, b, Y)], weights=sorted(x.items(), key=lambda t: -t[1])[:10])
    out['index'] += track(rows, xv, Y)
    out['parent'] += track(rows, bv, Y)

live = json.load(open(os.path.join(_here, 'parity50_v2_result.json')))['main']
months = [m for m, _ in out['index']] + [m for m, _ in live['index']]
idx = [v for _, v in out['index']] + [v for _, v in live['index']]
par = [v for _, v in out['parent']] + [v for _, v in live['parent']]
etf = [close('SETFNIF50', b_) / close('SETFNIF50', a_) - 1 for a_, b_ in zip(['2021-09'] + months[:-1], months)]


def versus(r, p):
    act = [a - c for a, c in zip(r, p)]
    mr, mp = st.mean(r), st.mean(p)
    return dict(index=stats(r), parent=stats(p), trackingError=st.stdev(act) * math.sqrt(12),
                beta=sum((a - mr) * (c - mp) for a, c in zip(r, p)) / sum((c - mp) ** 2 for c in p),
                activeReturnAnnualised=stats(r)['annualised'] - stats(p)['annualised'])


nb = len(out['index'])
out['months'] = months
out['series'] = dict(index=idx, parent=par, etf=etf)
out['stats'] = dict(full=versus(idx, par), backfill=versus(idx[:nb], par[:nb]), live=versus(idx[nb:], par[nb:]),
                    etf=dict(full=stats(etf), backfill=stats(etf[:nb]), live=stats(etf[nb:])))
json.dump(out, open(os.path.join(_here, 'parity50_backfill_result.json'), 'w'), indent=1, default=float)

pc = lambda v: f'{v * 100:.1f}%'
for Y, d in out['years'].items():
    print(f"{Y}: bar {pc(d['bar'])}, eligible {d['eligible']}, held {d['held']} ({d['n50In']} of {d['n50Listed']} Nifty 50), later figures {d['laterFigures']} | "
          f"payroll {pc(d['payroll'])} vs {pc(d['parentPayroll'])} | avg pay {pc(d['pay'])} vs {pc(d['parentPay'])} | avg staff {pc(d['staff'])} vs {pc(d['parentStaff'])}")
    print('   flags:', d['flags'][:12])
for k in ('full', 'backfill', 'live'):
    s_ = out['stats'][k]
    print(f"{k}: Parity 50 {pc(s_['index']['cumulative'])} ({pc(s_['index']['annualised'])}/yr, vol {pc(s_['index']['volatility'])}, mdd {pc(s_['index']['maxDrawdown'])}) | "
          f"Nifty 50 {pc(s_['parent']['cumulative'])} ({pc(s_['parent']['annualised'])}/yr, vol {pc(s_['parent']['volatility'])}, mdd {pc(s_['parent']['maxDrawdown'])}) | "
          f"TE {pc(s_['trackingError'])}, beta {s_['beta']:.2f}, active {pc(s_['activeReturnAnnualised'])}/yr | ETF {pc(out['stats']['etf'][k]['cumulative'])}")
