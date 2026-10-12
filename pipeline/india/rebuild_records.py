"""Rebuild India's companies and indexes from the stored records, for when the filings behind them are not at hand
(NSE downloads are on hold, PARITY-66). It applies the input india/wage_units.json, then the same basis, weight and
index arithmetic as build_data.py (india_calc.py), and writes <dir>/out/ for `pnpm data load IN`.

    pnpm data dump IN <dir>
    python3 rebuild_records.py <dir>            then: pnpm data load IN <dir>/out/companies.json <dir>/out/indexes.json
    python3 rebuild_records.py <dir> --check    applies nothing; exits 1 unless the records come back unchanged

Market caps are stored in whole crore, which moves an index's ₹ figures (payroll owned per ₹10 lakh) by a rupee or so
and nothing else: every share cancels the market cap out.
"""
import json, os, sys
from india_calc import UNITS, unit_note, friendly, listed, set_basis_and_weights, index_calc

HERE = os.path.dirname(os.path.abspath(__file__))
d = sys.argv[1]; check = '--check' in sys.argv
companies = json.load(open(os.path.join(d, 'companies.json')))
indexes = json.load(open(os.path.join(d, 'indexes.json')))
was = json.loads(json.dumps([companies, indexes]))

def apply_units(companies, units):
    """Each corrected reading: the filed number in the unit the evidence shows, or no payroll when `unit` is null (with
    `filed` null when no total was filed). A reading that gives the stored payroll confirms it and changes nothing."""
    done = []
    for s, ys in units.items():
        for y, u in ys.items():
            v = companies.get(s, {}).get('years', {}).get(y)
            if v is None: raise SystemExit(f'wage_units.json: no record for {s} {y}')
            p = round(u['filed']*UNITS[u['unit']]/1e7) if u['unit'] else None
            if v.get('payrollCr') == p: continue
            v['payrollCr'] = p
            if v.get('wKind') == 'reported':  # a share left out or estimated keeps its own dq and note
                v['dq'] = 2 if u['unit'] not in (None, 'rupees') else 1
                v['note'] = friendly(('from next year filing (prior-year column); ' if u.get('column') == 'prior' else '')+unit_note(u['unit']))
            done.append(f'{s} {y}: {u["filed"]:g} in {u["unit"]}, ₹{p:,} crore' if u['unit'] else f'{s} {y}: no usable total, no payroll')
    return done

if not check:
    for line in apply_units(companies, json.load(open(os.path.join(HERE, 'wage_units.json')))): print(' ', line)
set_basis_and_weights(companies)
for ix in indexes.values():
    ix['missing'] = listed(ix['missing'])
    members = [c['symbol'] for c in ix['constituents']]+ix['missing']
    mcap = {s: c['marketCapCr']*1e7 for s, c in companies.items() if c.get('marketCapCr')}
    shp = {s: {'public': c['publicFloatPct']} for s, c in companies.items() if c.get('publicFloatPct')}
    # Weights come from market caps and floats alone, which this never changes, so the stored ones stay.
    _, res, yoy = index_calc(members, companies, mcap, shp)
    for y, v in res.items():
        # Sectors tied on women's share keep their stored order, which came from the member list.
        order = {s['industry']: i for i, s in enumerate(ix['years'].get(y, {}).get('sectors', []))}
        v['sectors'].sort(key=lambda s: (-s['w'], order.get(s['industry'], len(order))))
    ix.update(years=res, yoy=yoy)

def diffs(a, b, path=''):
    """Where two parsed JSON values differ; ₹ figures within a rupee count as the same."""
    if isinstance(a, dict) and isinstance(b, dict):
        return [p for k in a.keys() | b.keys() for p in diffs(a.get(k), b.get(k), f'{path}.{k}')]
    if isinstance(a, list) and isinstance(b, list) and len(a) == len(b):
        return [p for i, (x, y) in enumerate(zip(a, b)) for p in diffs(x, y, f'{path}[{i}]')]
    rupees = path.rsplit('.', 1)[-1] in ('ownedPayroll', 'womenWages', 'gap')
    same = a == b or (rupees and isinstance(a, int) and isinstance(b, int) and abs(a-b) <= 1)
    return [] if same else [f'{path}: {a} -> {b}']

found = diffs(was[0], companies)+diffs(was[1], indexes)
if check:
    print(f'{len(found)} differences from the stored records', *found[:20], sep='\n  ')
    sys.exit(1 if found else 0)
os.makedirs(os.path.join(d, 'out'), exist_ok=True)
json.dump(companies, open(os.path.join(d, 'out', 'companies.json'), 'w'), separators=(',', ':'))
json.dump(indexes, open(os.path.join(d, 'out', 'indexes.json'), 'w'), separators=(',', ':'))
print(f'{len(found)} fields changed; wrote {d}/out/')
