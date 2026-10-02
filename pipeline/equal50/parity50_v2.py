"""Parity 50, version 2, as pre-registered in knowledge/decisions/0008-parity-50-v2.md: every holding pays women at least the Nifty 50's own share."""
import json, math, os, sys
from collections import defaultdict

_here = os.path.dirname(os.path.abspath(__file__))
_me, __file__ = __file__, os.path.join(_here, 'parity50.py')
_src = open(__file__).read()
exec(compile(_src[:_src.index("main = run50(")], 'parity50', 'exec'))
__file__ = _me

CAP, STAFF, COUNT = 0.08, 1000, 50


def nifty50(Y):
    rows = rows50(Y)
    return rows, {r['s']: r['b'] for r in rows if r['b'] > 0}


def bar_of(Y):
    rows, b = nifty50(Y)
    return share(rows, [r['b'] for r in rows], 'w', 'c')


def build_v2(Y, bar=None, tilt=True):
    B = bar_of(Y) if bar is None else bar
    allrows = rows_for(Y)
    eligible = sorted((r for r in allrows if r['w'] is not None and r['w'] >= B and r['h'] * r['mcap'] >= STAFF), key=lambda r: -r['ff'])
    held = eligible[:COUNT]
    ws = {r['s']: r['ff'] * (r['w'] / B if tilt else 1.0) for r in held}
    for _ in range(100):
        t = sum(ws.values())
        over = [s for s, v in ws.items() if v / t > CAP + 1e-12]
        if not over:
            break
        free = sum(v for s, v in ws.items() if s not in over)
        for s in over:
            ws[s] = CAP * t
        scale = (t - CAP * t * len(over)) / free
        for s in ws:
            if s not in over:
                ws[s] *= scale
    t = sum(ws.values())
    x = {s: v / t for s, v in ws.items()}
    return allrows, x, B, len(eligible)


def describe(Y, allrows, x, B):
    rows50_, b = nifty50(Y)
    rs = {r['s']: r for r in allrows}
    xs = [x.get(r['s'], 0.0) for r in allrows]
    avg = lambda w, key: sum(v * rs[s][key] for s, v in w.items() if rs.get(s) and rs[s][key] is not None) / sum(v for s, v in w.items() if rs.get(s) and rs[s][key] is not None)
    sec_x, sec_b = defaultdict(float), defaultdict(float)
    for s, v in x.items():
        sec_x[rs[s]['sector']] += v
    for s, v in b.items():
        sec_b[rs[s]['sector'] if s in rs else n500[s]['industry']] += v
    left = sorted(({'symbol': s, 'w': rs[s]['w'] if s in rs else None, 'parent': v, 'reason': 'noData' if s not in rs or rs[s]['w'] is None else 'below'}
                   for s, v in b.items() if s not in x), key=lambda d: -d['parent'])
    return dict(
        bar=B, held=len(x), payroll=share(allrows, xs, 'w', 'c'), parentPayroll=share(rows50_, [r['b'] for r in rows50_], 'w', 'c'),
        pay=avg(x, 'w'), staff=avg(x, 'E'), parentPay=avg(b, 'w'), parentStaff=avg(b, 'E'),
        lowest=min((rs[s]['w'], s) for s in x), parentLowest=min((rs[s]['w'], s) for s in b if s in rs and rs[s]['w'] is not None),
        activeShare=0.5 * sum(abs(x.get(s, 0) - b.get(s, 0)) for s in set(x) | set(b)),
        n50In=sum(1 for s in x if s in b), n50Out=len(left), outWeight=sum(d['parent'] for d in left),
        sectorsOut=sorted(((k, v) for k, v in sec_b.items() if sec_x.get(k, 0) == 0), key=lambda t: -t[1]),
        sectors=sorted(({'sector': k, 'sim': sec_x.get(k, 0.0), 'parent': sec_b.get(k, 0.0)} for k in set(sec_x) | set(sec_b)), key=lambda d: -max(d['sim'], d['parent'])),
        left=left, weights=sorted(x.items(), key=lambda t: -t[1]))


def run_v2(label, bar=None, tilt=True):
    out = dict(label=label, years={}, index=[], parent=[])
    for Y in (2024, 2025, 2026):
        allrows, x, B, n_el = build_v2(Y, bar, tilt)
        d = describe(Y, allrows, x, B)
        d['eligible'] = n_el
        out['years'][Y] = d
        if Y < 2026:
            out['index'] += track(allrows, [x.get(r['s'], 0.0) for r in allrows], Y)
            rows50_, _ = nifty50(Y)
            out['parent'] += track(rows50_, [r['b'] for r in rows50_], Y)
    r = [v for _, v in out['index']]
    p = [v for _, v in out['parent']]
    act = [a - c for a, c in zip(r, p)]
    mp, mr = st.mean(p), st.mean(r)
    bm = bench()
    months = [m for m, _ in out['index']]
    out['stats'] = dict(index=stats(r), parent=stats(p), trackingError=st.stdev(act) * math.sqrt(12),
                        beta=sum((a - mr) * (c - mp) for a, c in zip(r, p)) / sum((c - mp) ** 2 for c in p),
                        activeReturnAnnualised=stats(r)['annualised'] - stats(p)['annualised'],
                        year1=dict(index=stats(r[:12])['cumulative'], parent=stats(p[:12])['cumulative']),
                        year2=dict(index=stats(r[12:])['cumulative'], parent=stats(p[12:])['cumulative']),
                        nifty50TR=stats([bm['nifty50TR'][m] for m in months]), sensexTR=stats([bm['sensexTR'][m] for m in months if m in bm['sensexTR']]))
    return out


if __name__ == '__main__':
    main = run_v2('Parity 50 version 2 (bar at the Nifty 50 level, tilted to share of pay, 8% cap)')
    sens = [run_v2('Free-float weights without the tilt', tilt=False), run_v2('Bar of 15%', bar=0.15)]
    json.dump(dict(main=main, sensitivities=sens), open(os.path.join(_here, 'parity50_v2_result.json'), 'w'), indent=1, default=float)
    pc = lambda v: f'{v * 100:.1f}%'
    for res in [main] + sens:
        print(f"\n{res['label']}")
        for Y, d in res['years'].items():
            print(f"  {Y}: bar {pc(d['bar'])}, eligible {d['eligible']}, held {d['held']} ({d['n50In']} Nifty 50) | payroll {pc(d['payroll'])} vs {pc(d['parentPayroll'])} | avg pay {pc(d['pay'])} vs {pc(d['parentPay'])} | "
                  f"avg staff {pc(d['staff'])} vs {pc(d['parentStaff'])} | lowest {d['lowest'][1]} {pc(d['lowest'][0])} | active {pc(d['activeShare'])} | out {d['n50Out']} = {pc(d['outWeight'])}")
        s_ = res['stats']
        print(f"  Index {pc(s_['index']['cumulative'])} ({pc(s_['index']['annualised'])}/yr, vol {pc(s_['index']['volatility'])}, mdd {pc(s_['index']['maxDrawdown'])}) | "
              f"N50 {pc(s_['parent']['cumulative'])} (vol {pc(s_['parent']['volatility'])}, mdd {pc(s_['parent']['maxDrawdown'])}) | TE {pc(s_['trackingError'])}, beta {s_['beta']:.2f}, "
              f"active {pc(s_['activeReturnAnnualised'])}/yr | Y1 {pc(s_['year1']['index'])} vs {pc(s_['year1']['parent'])}, Y2 {pc(s_['year2']['index'])} vs {pc(s_['year2']['parent'])}")
    d = main['years'][2026]
    print('\n2026 sectors out:', [(k, round(v * 100, 1)) for k, v in d['sectorsOut']])
    print('2026 weights:', [(s, round(v * 100, 2)) for s, v in d['weights']])
