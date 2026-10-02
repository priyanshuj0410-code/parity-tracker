"""Writes the Parity 50 simulation for Nivel (src/data/simulations.json) from parity50_v2_result.json and the same point-in-time data.

  INDIA_DIR=<repo>/pipeline/india python3 export_parity50.py <repo>/src/data/simulations.json
"""
import json, math, os, sys

OUT = sys.argv[1]
_here = os.path.dirname(os.path.abspath(__file__))
_me, __file__ = __file__, os.path.join(_here, 'parity50_v2.py')
_src = open(__file__).read()
exec(compile(_src[:_src.index("if __name__ == '__main__':")], 'parity50_v2', 'exec'))
__file__ = _me

res = json.load(open(os.path.join(_here, 'parity50_v2_result.json')))['main']
Y = 2026
r6 = lambda v: None if v is None else round(float(v), 6)
fy = lambda y: f'{y - 1}-{str(y)[2:]}'
d = res['years'][str(Y)]
allrows, x, B, n_el = build_v2(Y)
rs = {r['s']: r for r in allrows}
_, b = nifty50(Y)

holdings = [{'symbol': s, 'sector': rs[s]['sector'], 'w': r6(rs[s]['w']), 'e': r6(rs[s]['E']), 'sim': r6(v), 'parent': r6(b.get(s, 0.0))}
            for s, v in sorted(x.items(), key=lambda t: -t[1])]
left = [{'symbol': l['symbol'], 'sector': rs[l['symbol']]['sector'] if l['symbol'] in rs else n500[l['symbol']]['industry'], 'w': r6(l['w']),
         'parent': r6(l['parent']), 'reason': l['reason']} for l in d['left']]

months = ['2024-09'] + [m for m, _ in res['index']]
grow = lambda rs_: [100.0] + [round(100 * math.prod(1 + v for v in rs_[:i + 1]), 2) for i in range(len(rs_))]
st_ = res['stats']

# Context for "why the bar is not 50%": how many large companies clear 25%, and how many are near parity on both counts.
base = [r for r in allrows if r['E'] is not None and r['h'] * r['mcap'] >= 1000 and r['ff'] >= 2000e7]
ratio = lambda r: (r['w'] / r['E']) / ((1 - r['w']) / (1 - r['E']))
near = [r for r in base if 0.35 <= r['E'] <= 0.65 and 0.8 <= ratio(r) <= 1.25]
at25 = sum(1 for r in allrows if r['w'] is not None and r['w'] >= 0.25 and r['h'] * r['mcap'] >= 1000)

out = {'parity50': {
    'id': 'parity50', 'name': 'Parity 50', 'parent': 'nifty50', 'version': 2, 'asOf': DATES[REB[Y]], 'dataYear': fy(Y),
    'bar': r6(B), 'eligible': n_el, 'at25': at25,
    'headline': {'payroll': r6(d['payroll']), 'parentPayroll': r6(d['parentPayroll']), 'pay': r6(d['pay']), 'parentPay': r6(d['parentPay']),
                 'staff': r6(d['staff']), 'parentStaff': r6(d['parentStaff']),
                 'lowest': {'symbol': d['lowest'][1], 'w': r6(d['lowest'][0])}, 'parentLowest': {'symbol': d['parentLowest'][1], 'w': r6(d['parentLowest'][0])}},
    'years': [{'year': fy(int(k)), 'bar': r6(v['bar']), 'eligible': v['eligible'], 'payroll': r6(v['payroll']), 'parentPayroll': r6(v['parentPayroll'])}
              for k, v in res['years'].items()],
    'out': {'companies': d['n50Out'], 'weight': r6(d['outWeight']), 'kept': d['n50In'], 'activeShare': r6(d['activeShare']),
            'sectors': [{'sector': k, 'weight': r6(v)} for k, v in d['sectorsOut']]},
    'sectors': [{'sector': s['sector'], 'sim': r6(s['sim']), 'parent': r6(s['parent'])} for s in d['sectors']],
    'holdings': holdings, 'left': left,
    'performance': {
        'months': months, 'sim': grow([v for _, v in res['index']]), 'parent': grow([v for _, v in res['parent']]),
        'stats': {'sim': {k: r6(v) for k, v in st_['index'].items() if k != 'months'}, 'parent': {k: r6(v) for k, v in st_['parent'].items() if k != 'months'},
                  'trackingError': r6(st_['trackingError']), 'beta': r6(st_['beta']), 'active': r6(st_['activeReturnAnnualised']),
                  'year1': {k: r6(v) for k, v in st_['year1'].items()}, 'year2': {k: r6(v) for k, v in st_['year2'].items()},
                  'nifty50Etf': r6(st_['nifty50TR']['cumulative']), 'sensexEtf': r6(st_['sensexTR']['cumulative'])}},
    'nearParity': {'count': len(near), 'of': len(base)},
}}
json.dump(out, open(OUT, 'w'), indent=1)
p = out['parity50']
print('bar', p['bar'], 'eligible', p['eligible'], 'at25', p['at25'], '| headline', p['headline'])
print('out', p['out'])
print('holdings', len(p['holdings']), '| left', len(p['left']), [(l['symbol'], l['w'], l['reason']) for l in p['left'][:6]])
print('perf end', p['performance']['sim'][-1], p['performance']['parent'][-1], '| near', p['nearParity'])
