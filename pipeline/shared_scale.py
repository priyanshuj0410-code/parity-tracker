"""Put Japan and the EU on the same headline as India, the UK and Australia: women's share of pay (parity 50%).

Japan and EU companies report women's average pay as a share of men's (wage parity W).
With women's share of staff (employment parity E) the share of pay follows:

    S = E·W / (E·W + 1 − E)

Japan: E is women's share of regular staff (MHLW item 3). EU: E is women's share of
employees from ESRS S1-6, read by hand into the input eu/eu_headcount.json. W is 1 − gapMean in both.
A company with no E keeps its W but has no share of pay (w = None) and drops out of the headline.

Run from the repo root on an assembled release (pnpm data publish does, and copies eu_headcount.json in from
Firestore's inputs): python3 pipeline/shared_scale.py <data dir>
Idempotent: it recomputes from gapMean, fPerm and fAll, never from w.
"""
import json, sys
from statistics import mean

C_PATH, I_PATH = sys.argv[1] + '/companies.json', sys.argv[1] + '/indexes.json'
companies = json.load(open(C_PATH))
indexes = json.load(open(I_PATH))
rd = lambda x: None if x is None else round(x, 4)


def apply_eu_workforce(headcount):
    """Set fAll (and women and men counts where given) on EU company years. Returns how many years were set."""
    n = 0
    for ticker, years in headcount.items():
        c = companies.get('EU-' + ticker)
        if not c:
            continue
        for year, v in years.items():
            y = c['years'].get(year)
            if not y:
                continue
            if isinstance(v, list):
                women, men = v
                y['headcountWomen'], y['headcountMen'] = women, men
                y['headcount'] = women + men
                y['fAll'] = round(women / (women + men), 4)
            else:
                y['fAll'] = v
            n += 1
    return n


set_years = apply_eu_workforce(json.load(open(sys.argv[1] + '/eu_headcount.json'))['headcount'])
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
        ns = NO_SPLIT[c['country']]
        note = y.get('note') or ''
        if e is None or not 0 < e < 1:
            # Keep a builder's more specific note ("publishes the share only for the whole group") after the general one.
            y['w'], y['wKind'] = None, None
            y['note'] = note if note.startswith(ns) else f'{ns}. {note}' if note else ns
        else:
            y['w'], y['wKind'] = rd(e * w_par / (e * w_par + 1 - e)), 'reported'
            if note.startswith(ns):
                y['note'] = note[len(ns) + 2:]


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
