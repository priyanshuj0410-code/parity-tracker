"""Parity-Aligned Nifty 500, version 1, as pre-registered in knowledge/decisions/0006-parity-aligned-nifty-500.md."""
import json, math, sys
from collections import defaultdict
import numpy as np
from scipy.optimize import linprog

sys.argv = ['build_e50.py', 'build']
_src = open(__file__.replace('pa500.py', 'build_e50.py')).read()
exec(compile(_src[:_src.index("main = run('Equal 50, version 1')")], 'build_e50', 'exec'))


def rows_for(Y):
    rows = []
    for s, meta_ in n500.items():
        mc, _ = mcap(s, Y)
        pub = public(s, Y)
        if not mc or pub is None:
            continue
        r = brsr(s, Y)
        ok = r is not None and 0 < r['w'] < 1 and 0 < r['f_perm'] < 1 and r.get('W')
        rows.append(dict(s=s, ff=mc * pub / 100, mcap=mc, sector=meta_['industry'],
                         w=r['w'] if ok else None, E=r['f_perm'] if ok else None,
                         c=(r['W'] / mc) if ok else 0.0, h=(r['Np'] / mc) if ok else 0.0))
    tot = sum(r['ff'] for r in rows)
    for r in rows:
        r['b'] = r['ff'] / tot
    return rows


def share(rows, x, key, wt):
    num = sum(xi * r[wt] * r[key] for xi, r in zip(x, rows) if r[key] is not None)
    den = sum(xi * r[wt] for xi, r in zip(x, rows) if r[key] is not None)
    return num / den


def min_active(rows, target, k):
    n = len(rows)
    b = np.array([r['b'] for r in rows])
    A, ub = [], []
    for i in range(n):
        a = np.zeros(2 * n); a[i] = 1; a[n + i] = -1; A.append(a); ub.append(b[i])
        a = np.zeros(2 * n); a[i] = -1; a[n + i] = -1; A.append(a); ub.append(-b[i])
    a = np.zeros(2 * n)
    for i, r in enumerate(rows):
        if r['w'] is not None:
            a[i] = -r['c'] * (r['w'] - target)
    A.append(a); ub.append(0.0)
    secs = defaultdict(list)
    for i, r in enumerate(rows):
        secs[r['sector']].append(i)
    Aeq, beq = [np.concatenate([np.ones(n), np.zeros(n)])], [1.0]
    for idx in secs.values():
        a = np.zeros(2 * n); a[idx] = 1; Aeq.append(a); beq.append(b[idx].sum())
    bounds = [((r['b'], r['b']) if r['w'] is None else (0.0, k * r['b'])) for r in rows] + [(0, None)] * n
    res = linprog(np.concatenate([np.zeros(n), np.ones(n)]), A_ub=np.array(A), b_ub=np.array(ub), A_eq=np.array(Aeq), b_eq=beq,
                  bounds=bounds, method='highs')
    if res.status != 0:
        return None
    x = res.x[:n]
    return x, 0.5 * np.abs(x - b).sum()


def build(Y, k=5, limit=0.20):
    rows = rows_for(Y)
    b = [r['b'] for r in rows]
    lo, hi = share(rows, b, 'w', 'c'), 0.6
    best = (np.array(b), 0.0)
    for _ in range(28):
        mid = (lo + hi) / 2
        sol = min_active(rows, mid, k)
        if sol and sol[1] <= limit + 1e-9:
            lo, best = mid, sol
        else:
            hi = mid
    x, act = best
    return rows, x, act


def track(rows, x, Y):
    w, prev, series = {r['s']: xi for r, xi in zip(rows, x) if xi > 1e-9}, REB[Y], []
    for k_ in [m for m in MONTHS if REB[Y] < m <= REB[Y + 1]]:
        tr, nw = 0.0, {}
        for s, ws in w.items():
            t, p, flag = month_return(s, prev, k_)
            t = 0.0 if t is None else t
            tr += ws * t
            nw[s] = ws * (1 + t)
        tot = sum(nw.values())
        w = {s: v / tot for s, v in nw.items()}
        series.append((k_, tr))
        prev = k_
    return series


def run(k=5, limit=0.20, label=''):
    out = dict(label=label, years={}, index=[], parent=[])
    for Y in (2024, 2025, 2026):
        rows, x, act = build(Y, k, limit)
        b = np.array([r['b'] for r in rows])
        sec = defaultdict(float)
        for r, xi, bi in zip(rows, x, b):
            sec[r['sector']] += xi - bi
        diffs = sorted(((xi - bi, r['s']) for r, xi, bi in zip(rows, x, b)), reverse=True)
        out['years'][Y] = dict(companies=len(rows), measured=sum(1 for r in rows if r['w'] is not None), activeShare=act,
                               maxSectorGap=max(abs(v) for v in sec.values()),
                               S=share(rows, x, 'w', 'c'), E=share(rows, x, 'E', 'h'), parentS=share(rows, b, 'w', 'c'), parentE=share(rows, b, 'E', 'h'),
                               over=[(s, round(d * 100, 2)) for d, s in diffs[:8]], under=[(s, round(d * 100, 2)) for d, s in diffs[-8:]])
        if Y < 2026:
            out['index'] += track(rows, x, Y)
            out['parent'] += track(rows, b, Y)
    r = [v for _, v in out['index']]
    p = [v for _, v in out['parent']]
    act_r = [a - c for a, c in zip(r, p)]
    mp, mr = st.mean(p), st.mean(r)
    out['stats'] = dict(index=stats(r), parent=stats(p), trackingError=st.stdev(act_r) * math.sqrt(12),
                        beta=sum((a - mr) * (c - mp) for a, c in zip(r, p)) / sum((c - mp) ** 2 for c in p),
                        activeReturnAnnualised=stats(r)['annualised'] - stats(p)['annualised'])
    bm = bench()
    months = [m for m, _ in out['index']]
    out['stats']['nifty50TR'] = stats([bm['nifty50TR'][m] for m in months])
    out['stats']['sensexTR'] = stats([bm['sensexTR'][m] for m in months if m in bm['sensexTR']])
    return out


main = run(label='Parity-Aligned Nifty 500 (5x stock limit, 20% active share)')
sens = [run(k=3, label='3x stock limit'), run(limit=0.10, label='10% active share'), run(limit=0.30, label='30% active share')]
json.dump(dict(main=main, sensitivities=sens), open(__file__.replace('pa500.py', 'pa500_result.json'), 'w'), indent=1, default=float)
pc = lambda v: f'{v * 100:.1f}%'
for res in [main] + sens:
    s_ = res['stats']
    print(f"\n{res['label']}")
    for Y, d in res['years'].items():
        print(f"  {Y}: payroll to women {pc(d['S'])} (market {pc(d['parentS'])}), staff women {pc(d['E'])} (market {pc(d['parentE'])}), active share {pc(d['activeShare'])}, sector gap {pc(d['maxSectorGap'])}, {d['measured']}/{d['companies']} measured")
    print(f"  Oct 2024 to Sep 2026: index {pc(s_['index']['cumulative'])} ({pc(s_['index']['annualised'])} a year, vol {pc(s_['index']['volatility'])}, worst {pc(s_['index']['maxDrawdown'])})"
          f" | Nifty 500 at market weights {pc(s_['parent']['cumulative'])} ({pc(s_['parent']['annualised'])}, vol {pc(s_['parent']['volatility'])})"
          f" | tracking error {pc(s_['trackingError'])}, beta {s_['beta']:.2f}, active {pc(s_['activeReturnAnnualised'])} a year"
          f" | Nifty 50 {pc(s_['nifty50TR']['cumulative'])}, Sensex {pc(s_['sensexTR']['cumulative'])}")
print('\n2026 largest overweights', main['years'][2026]['over'])
print('2026 largest underweights', main['years'][2026]['under'])
