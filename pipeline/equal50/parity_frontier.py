"""How close can a market-representative index get to parity? Feasibility frontier, no returns used.

For a parent index, choose weights x that stay closest to the market weights b (minimum active share) while the
women's share of the payroll the index owns reaches a target s*:
    S(x) = sum(x_i / mcap_i * P_i * w_i) / sum(x_i / mcap_i * P_i)  >= s*   (linear: sum c_i (w_i - s*) x_i >= 0)
Constraints keep it representative: sector weights within +/- delta of the market's, 0 <= x_i <= k * b_i, and
companies without parity data held at their market weight.
"""
import json, sys
from collections import defaultdict
import numpy as np
from scipy.optimize import linprog

ROOT = __import__('os').path.join(__import__('os').path.dirname(__import__('os').path.abspath(__file__)), '..', '..', 'src', 'data')
C = json.load(open(f'{ROOT}/companies.json'))
I = json.load(open(f'{ROOT}/indexes.json'))
YEAR = '2025-26'


def universe(ix):
    rows = []
    for c in I[ix]['constituents']:
        co = C[c['symbol']]
        y = co['years'].get(YEAR) or {}
        ok = y.get('w') is not None and co.get('payrollWeightCr') and co.get('marketCapCr')
        hc = y.get('permHeadcount') or y.get('headcount')
        E = y.get('fPerm')
        okE = ok and E is not None and 0 < E < 1 and hc
        rows.append(dict(s=c['symbol'], b=c['weight'], sector=co['industry'], w=y.get('w') if ok else None,
                         E=E if okE else None, W=((y['w'] / E) / ((1 - y['w']) / (1 - E))) if okE and 0 < y['w'] < 1 else None,
                         c=(co['payrollWeightCr'] / co['marketCapCr']) if ok else 0.0, h=(hc / co['marketCapCr']) if okE else 0.0))
    tot = sum(r['b'] for r in rows)
    for r in rows:
        r['b'] /= tot
    return rows


def S(rows, x):
    num = sum(xi * r['c'] * r['w'] for xi, r in zip(x, rows) if r['w'] is not None)
    den = sum(xi * r['c'] for xi, r in zip(x, rows) if r['w'] is not None)
    return num / den


def solve(rows, target, delta, k, metric='S'):
    n = len(rows)
    b = np.array([r['b'] for r in rows])
    cost = np.concatenate([np.zeros(n), np.ones(n)])          # minimise sum t_i, t_i >= |x_i - b_i|
    A, ub = [], []
    for i in range(n):
        a = np.zeros(2 * n); a[i] = 1; a[n + i] = -1; A.append(a); ub.append(b[i])
        a = np.zeros(2 * n); a[i] = -1; a[n + i] = -1; A.append(a); ub.append(-b[i])
    secs = defaultdict(list)
    for i, r in enumerate(rows):
        secs[r['sector']].append(i)
    for idx in secs.values():
        B = b[idx].sum()
        a = np.zeros(2 * n); a[idx] = 1; A.append(a); ub.append(B + delta)
        a = np.zeros(2 * n); a[idx] = -1; A.append(a); ub.append(-(B - delta))
    a = np.zeros(2 * n)
    for i, r in enumerate(rows):
        if metric == 'S' and r['w'] is not None:
            a[i] = -r['c'] * (r['w'] - target)
        elif metric == 'W' and r['W'] is not None:
            a[i] = -r['c'] * (r['W'] - target)      # owned-payroll-weighted wage parity
        elif metric == 'E' and r['E'] is not None:
            a[i] = -r['h'] * (r['E'] - target)      # women's share of the staff the index owns
    A.append(a); ub.append(0.0)
    bounds = [((r['b'], r['b']) if r['w'] is None else (0.0, min(k * r['b'], 1.0))) for r in rows] + [(0, None)] * n
    res = linprog(cost, A_ub=np.array(A), b_ub=np.array(ub), A_eq=np.array([np.concatenate([np.ones(n), np.zeros(n)])]), b_eq=[1.0],
                  bounds=bounds, method='highs')
    if res.status != 0:
        return None
    x = res.x[:n]
    return dict(x=x, activeShare=0.5 * np.abs(x - b).sum())


def metric_value(rows, x, metric):
    key, wt = {'S': ('w', 'c'), 'W': ('W', 'c'), 'E': ('E', 'h')}[metric]
    num = sum(xi * r[wt] * r[key] for xi, r in zip(x, rows) if r[key] is not None)
    den = sum(xi * r[wt] for xi, r in zip(x, rows) if r[key] is not None)
    return num / den


def max_target(rows, delta, k, metric='S'):
    lo, hi = metric_value(rows, [r['b'] for r in rows], metric), (2.0 if metric == 'W' else 0.95)
    if not solve(rows, lo, delta, k, metric):
        return lo
    for _ in range(30):
        mid = (lo + hi) / 2
        if solve(rows, mid, delta, k, metric):
            lo = mid
        else:
            hi = mid
    return lo


out = {}
VARIANTS = ((0.0, 3), (0.0, 5), (0.02, 5), (0.05, 5), (0.05, 10))
for ix in ('nifty50', 'nifty100', 'nifty500'):
    rows = universe(ix)
    bx = [r['b'] for r in rows]
    out[ix] = {}
    print(f"\n{I[ix]['name']}: market weights give women's share of owned payroll {metric_value(rows, bx, 'S'):.1%}, wage parity {metric_value(rows, bx, 'W'):.1%}, women's share of owned staff {metric_value(rows, bx, 'E'):.1%}")
    for delta, k in VARIANTS:
        label = f"sectors within {delta*100:.0f} pts, stocks up to {k}x market weight"
        res = {}
        for metric, targets in (('S', (0.25, 0.30, 0.35, 0.50)), ('W', (0.90, 1.00)), ('E', (0.30, 0.50))):
            mt = max_target(rows, delta, k, metric)
            res[metric] = dict(max=mt, activeShareAt={t: (None if t > mt + 1e-9 else round(solve(rows, t, delta, k, metric)['activeShare'], 3)) for t in targets})
        out[ix][label] = res
        f = lambda m: f"max {res[m]['max']:.1%} (" + ', '.join(f"{t:.0%}: {'-' if v is None else f'{v:.0%} active'}" for t, v in res[m]['activeShareAt'].items()) + ')'
        print(f"  {label}\n    share of owned payroll {f('S')}\n    wage parity {f('W')}\n    share of owned staff {f('E')}")
json.dump(out, open('frontier.json', 'w'), indent=1, default=float)
