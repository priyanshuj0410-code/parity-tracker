"""Parity 50, version 1, as pre-registered in knowledge/decisions/0007-parity-50.md."""
import csv, json, math, os, time
from collections import defaultdict
import numpy as np
from scipy.optimize import milp, LinearConstraint, Bounds

_here = os.path.dirname(os.path.abspath(__file__))
_me, __file__ = __file__, os.path.join(_here, 'pa500.py')
_src = open(__file__).read()
exec(compile(_src[:_src.index("main = run(label=")], 'pa500', 'exec'))
__file__ = _me

LISTS = os.environ.get('INDIA_DIR', os.path.join(_here, '..', 'india'))
N100 = [r['Symbol'].strip() for r in csv.DictReader(open(os.path.join(LISTS, 'indexes', 'ind_nifty100.csv')))]
N50 = {r['Symbol'].strip() for r in csv.DictReader(open(os.path.join(LISTS, 'n50.csv')))}
assert N50 <= set(N100), N50 - set(N100)


def rows50(Y):
    allrows = {r['s']: r for r in rows_for(Y)}
    rows = [dict(allrows[s]) for s in N100 if s in allrows]
    tot = sum(r['ff'] for r in rows if r['s'] in N50)
    for r in rows:
        r['n50'] = r['s'] in N50
        r['b'] = r['ff'] / tot if r['n50'] else 0.0
        r['u'] = 0.0 if r['w'] is None else (min(3 * r['b'], 0.10) if r['n50'] else 0.03)
    return rows


def solve50(rows, limit, band, lam=None, target=None, count=50, floor=0.005):
    """lam: maximise payroll to women minus lam times payroll (a Dinkelbach step). target: least active share with S at least target."""
    n = len(rows)
    b = np.array([r['b'] for r in rows]); u = np.array([r['u'] for r in rows])
    g = np.array([r['c'] * (r['w'] - (lam if lam is not None else target)) if r['w'] is not None else 0.0 for r in rows])
    X, T, Z = 0, n, 2 * n
    A, lo, hi = [], [], []
    def row(entries, l, h):
        a = np.zeros(3 * n)
        for j, v in entries:
            a[j] = v
        A.append(a); lo.append(l); hi.append(h)
    row([(X + i, 1) for i in range(n)], 1, 1)
    row([(Z + i, 1) for i in range(n)], count, count)
    for i in range(n):
        row([(X + i, 1), (Z + i, -u[i])], -np.inf, 0)
        row([(X + i, -1), (Z + i, floor)], -np.inf, 0)
        row([(X + i, 1), (T + i, -1)], -np.inf, b[i])
        row([(X + i, -1), (T + i, -1)], -np.inf, -b[i])
    row([(T + i, 1) for i in range(n)], -np.inf, 2 * limit)
    secs = defaultdict(list)
    for i, r in enumerate(rows):
        secs[r['sector']].append(i)
    for idx in secs.values():
        B = b[idx].sum()
        row([(X + i, 1) for i in idx], B - band, B + band)
    if target is not None:
        row([(X + i, g[i]) for i in range(n)], 0, np.inf)
        cost = np.concatenate([np.zeros(n), np.ones(n), np.zeros(n)])
    else:
        cost = np.concatenate([-g, np.zeros(2 * n)])
    res = milp(cost, constraints=LinearConstraint(np.array(A), lo, hi), integrality=np.concatenate([np.zeros(2 * n), np.ones(n)]),
               bounds=Bounds(np.zeros(3 * n), np.concatenate([u, np.full(n, np.inf), np.ones(n)])), options={'time_limit': 120})
    if res.x is None:
        return None
    x = np.where(res.x[:n] > 1e-7, res.x[:n], 0.0)
    return x / x.sum()


def build50(Y, limit=0.20, band=0.02):
    rows = rows50(Y)
    lam, x = 0.0, None
    for _ in range(30):
        nx = solve50(rows, limit, band, lam=lam)
        if nx is None:
            return rows, None
        x, new = nx, share(rows, nx, 'w', 'c')
        if new <= lam + 1e-7:
            break
        lam = new
    least = solve50(rows, limit, band, target=lam - 1e-5)
    return rows, (least if least is not None else x)


def run50(limit=0.20, band=0.02, label=''):
    out = dict(label=label, years={}, index=[], parent=[])
    for Y in (2024, 2025, 2026):
        t0 = time.time()
        rows, x = build50(Y, limit, band)
        if x is None:
            out['years'][Y] = dict(feasible=False)
            continue
        b = np.array([r['b'] for r in rows])
        sec = defaultdict(float)
        for r, xi, bi in zip(rows, x, b):
            sec[r['sector']] += xi - bi
        D = sum(xi * r['c'] for r, xi in zip(rows, x) if r['w'] is not None)
        gap = sorted(((xi * r['c'] * (0.5 - r['w']) / D, r['s']) for r, xi in zip(rows, x) if xi > 0), reverse=True)
        diffs = sorted(((xi - bi, r['s']) for r, xi, bi in zip(rows, x, b)), reverse=True)
        out['years'][Y] = dict(
            feasible=True, seconds=round(time.time() - t0, 1), held=int((x > 0).sum()), activeShare=0.5 * float(np.abs(x - b).sum()),
            maxSectorGap=max(abs(v) for v in sec.values()), S=share(rows, x, 'w', 'c'), E=share(rows, x, 'E', 'h'),
            parentS=share(rows, b, 'w', 'c'), parentE=share(rows, b, 'E', 'h'),
            n50Measured=sum(1 for r in rows if r['n50'] and r['w'] is not None), n50InData=sum(1 for r in rows if r['n50']),
            next50Measured=sum(1 for r in rows if not r['n50'] and r['w'] is not None),
            n50NoData=sorted(r['s'] for r in rows if r['n50'] and r['w'] is None) + sorted(N50 - {r['s'] for r in rows}),
            added=sorted(r['s'] for r, xi in zip(rows, x) if not r['n50'] and xi > 0),
            dropped=sorted(r['s'] for r, xi in zip(rows, x) if r['n50'] and r['w'] is not None and xi == 0),
            over=[(s, round(d * 100, 2)) for d, s in diffs[:8]], under=[(s, round(d * 100, 2)) for d, s in diffs[-8:]],
            gapTotal=0.5 - share(rows, x, 'w', 'c'), gapList=[(s, round(v * 100, 2)) for v, s in gap[:10]],
            weights=sorted([(r['s'], round(float(xi) * 100, 2)) for r, xi in zip(rows, x) if xi > 0], key=lambda t: -t[1]))
        if Y < 2026:
            out['index'] += track(rows, x, Y)
            out['parent'] += track(rows, b, Y)
    r = [v for _, v in out['index']]
    p = [v for _, v in out['parent']]
    if len(r) == 24:
        act_r = [a - c for a, c in zip(r, p)]
        mp, mr = st.mean(p), st.mean(r)
        bm = bench()
        months = [m for m, _ in out['index']]
        out['stats'] = dict(index=stats(r), parent=stats(p), trackingError=st.stdev(act_r) * math.sqrt(12),
                            beta=sum((a - mr) * (c - mp) for a, c in zip(r, p)) / sum((c - mp) ** 2 for c in p),
                            activeReturnAnnualised=stats(r)['annualised'] - stats(p)['annualised'],
                            year1=dict(index=stats(r[:12])['cumulative'], parent=stats(p[:12])['cumulative']),
                            year2=dict(index=stats(r[12:])['cumulative'], parent=stats(p[12:])['cumulative']),
                            nifty50TR=stats([bm['nifty50TR'][m] for m in months]), sensexTR=stats([bm['sensexTR'][m] for m in months if m in bm['sensexTR']]))
    return out


main = run50(label='Parity 50 (20% active share, sectors within 2 points)')
sens = [run50(limit=0.10, label='10% active share'), run50(limit=0.30, label='30% active share'), run50(band=0.0, label='Sector weights exactly the Nifty 50s')]
json.dump(dict(main=main, sensitivities=sens), open(os.path.join(_here, 'parity50_result.json'), 'w'), indent=1, default=float)
pc = lambda v: f'{v * 100:.1f}%'
for res in [main] + sens:
    print(f"\n{res['label']}")
    for Y, d in res['years'].items():
        if not d.get('feasible'):
            print(f'  {Y}: not feasible'); continue
        print(f"  {Y}: {d['held']} held ({len(d['added'])} from Next 50), S {pc(d['S'])} vs {pc(d['parentS'])}, E {pc(d['E'])} vs {pc(d['parentE'])}, "
              f"active share {pc(d['activeShare'])}, max sector gap {pc(d['maxSectorGap'])}, N50 measured {d['n50Measured']}/{d['n50InData']}, NN50 measured {d['next50Measured']}, {d['seconds']}s")
    if res.get('stats'):
        s_ = res['stats']
        print(f"  Index {pc(s_['index']['cumulative'])} ({pc(s_['index']['annualised'])}/yr, vol {pc(s_['index']['volatility'])}, mdd {pc(s_['index']['maxDrawdown'])}) | "
              f"N50 rebuilt {pc(s_['parent']['cumulative'])} ({pc(s_['parent']['annualised'])}/yr, vol {pc(s_['parent']['volatility'])}, mdd {pc(s_['parent']['maxDrawdown'])}) | "
              f"TE {pc(s_['trackingError'])}, beta {s_['beta']:.2f}, active {pc(s_['activeReturnAnnualised'])}/yr | "
              f"Y1 {pc(s_['year1']['index'])} vs {pc(s_['year1']['parent'])}, Y2 {pc(s_['year2']['index'])} vs {pc(s_['year2']['parent'])} | "
              f"ETF N50 {pc(s_['nifty50TR']['cumulative'])}, Sensex {pc(s_['sensexTR']['cumulative'])}")
for Y, d in main['years'].items():
    if d.get('feasible'):
        print(f"\n{Y} no data (N50): {d['n50NoData']}\n  added: {d['added']}\n  dropped: {d['dropped']}\n  over: {d['over']}\n  under: {d['under']}\n  gap {pc(d['gapTotal'])}: {d['gapList']}")
if main['years'][2026].get('feasible'):
    print('\n2026 weights:', main['years'][2026]['weights'])
