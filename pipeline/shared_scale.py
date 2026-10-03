"""Put Japan and the EU on the same headline as India, the UK and Australia: women's share of pay (parity 50%).

Japan and EU companies report women's average pay as a share of men's (wage parity W).
With women's share of staff (employment parity E) the share of pay follows:

    S = E·W / (E·W + 1 − E)

Japan: E is women's share of regular staff (MHLW item 3). EU: E is women's share of
employees from ESRS S1-6 (eu/eu_workforce.py). W is 1 − gapMean in both.
A company with no E keeps its W but has no share of pay (w = None) and drops out of the headline.

Run from the repo root after merge_markets.py: python3 pipeline/shared_scale.py
Idempotent: it recomputes from gapMean, fPerm and fAll, never from w.
"""
import json, sys
from statistics import mean

sys.path.insert(0, 'pipeline/eu')
from eu_workforce import apply as apply_eu_workforce  # noqa: E402

C_PATH, I_PATH = 'src/data/companies.json', 'src/data/indexes.json'
companies = json.load(open(C_PATH))
indexes = json.load(open(I_PATH))
rd = lambda x: None if x is None else round(x, 4)

set_years = apply_eu_workforce(companies)
NO_SPLIT = {
    'JP': "Pay ratio reported, but no share of women in regular staff, so women's share of pay cannot be worked out",
    'EU': "Pay gap reported, but no workforce split by gender, so women's share of pay cannot be worked out",
}

for c in companies.values():
    if c['country'] not in ('JP', 'EU'):
        continue
    for y in c['years'].values():
        if y.get('gapMean') is None:
            continue
        w_par = 1 - y['gapMean']
        e = y.get('fPerm') if c['country'] == 'JP' else y.get('fAll')
        if e is None or not 0 < e < 1:
            y['w'], y['wKind'], y['note'] = None, None, NO_SPLIT[c['country']]
        else:
            y['w'], y['wKind'] = rd(e * w_par / (e * w_par + 1 - e)), 'reported'
            if y.get('note') in NO_SPLIT.values():
                y['note'] = ''


def recompute(ix_id, years):
    ix = indexes[ix_id]
    members = [companies[k['symbol']] for k in ix['constituents'] if k['symbol'] in companies]
    country = ix['country']
    emp = (lambda y: y.get('fPerm')) if country == 'JP' else (lambda y: y.get('fAll'))
    for year in years:
        rows = [(c, c['years'][year]) for c in members if year in c['years']]
        shares = [(c, y['w']) for c, y in rows if y.get('w') is not None]
        out = ix['years'][year]
        out['headline'] = rd(mean(s for _, s in shares))
        out['companiesCovered'] = out['companiesReported'] = len(shares)
        out['payRatio'] = rd(mean(1 - y['gapMean'] for _, y in rows if y.get('gapMean') is not None))
        out['payRatioCompanies'] = sum(1 for _, y in rows if y.get('gapMean') is not None)
        out['workforce'] = rd(mean(emp(y) for _, y in rows if emp(y) is not None))
        by = {}
        for c, s in shares:
            by.setdefault(c['industry'], []).append(s)
        out['sectors'] = sorted(({'industry': k, 'w': rd(mean(v)), 'payrollShare': None, 'companies': len(v)} for k, v in by.items()), key=lambda s: -s['w'])
    ix['yoy'] = {}
    for y0, y1 in zip(years, years[1:]):
        pairs = [(c['years'][y0]['w'], c['years'][y1]['w']) for c in members
                 if c['years'].get(y0, {}).get('w') is not None and c['years'].get(y1, {}).get('w') is not None
                 and not c['years'][y1].get('basisChange')]
        if pairs:
            ix['yoy'][f'{y0}>{y1}'] = {'from': rd(mean(a for a, _ in pairs)), 'to': rd(mean(b for _, b in pairs)),
                                       'change': rd(mean(b - a for a, b in pairs)), 'companies': len(pairs)}


recompute('nikkei225', ['latest'])
recompute('topix500', ['latest'])
recompute('eurostoxx50', ['2024', '2025'])
recompute('stoxx600eu100', ['2024', '2025'])
json.dump(companies, open(C_PATH, 'w'), separators=(',', ':'))
json.dump(indexes, open(I_PATH, 'w'), separators=(',', ':'))
for ix_id in ('nikkei225', 'topix500', 'eurostoxx50', 'stoxx600eu100'):
    ix = indexes[ix_id]
    print(ix_id, {k: {f: v[f] for f in ('headline', 'companiesCovered', 'payRatio', 'payRatioCompanies', 'workforce')} for k, v in ix['years'].items()}, ix['yoy'])
print('EU workforce years set:', set_years)
