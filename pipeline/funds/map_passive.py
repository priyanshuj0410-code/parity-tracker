"""Map AMFI's passive equity schemes (index funds and ETFs) to the Indian index each tracks, by name.

Writes passive_map.json: matched schemes grouped by fund house and scheme, and the unmatched passive equity schemes.
"""
import collections, json, re

rows = json.load(open('amfi_schemes.json'))
PASSIVE = ('Index Funds', 'ETFs', 'ETF)')
NOT_EQUITY = ('gilt', 'sdl', 'bond', 'g-sec', 'gsec', 'crisil', 'ibx', 'debt', 'treasury', 't-bill', 'liquid', 'gold', 'silver',
              'overnight', 'money market', 'corporate', 'aaa', 'nasdaq', 's&p 500', 'hang seng', 'msci', 'us ', 'global', 'world',
              'international', 'fang', 'japan', 'china', 'taiwan', 'europe', 'g-secs', 'psu bond', 'target maturity', 'income plus arbitrage')
VARIANTS = ('equal weight', 'equalweight', 'momentum', 'quality', 'value', 'alpha', 'low vol', 'low volatility', 'esg', 'shariah',
            'dividend', 'enhanced', 'multicap 50', 'multi cap 50', 'arbitrage', 'leaders', 'consumption', 'manufacturing', 'defence',
            'tourism', 'ev ', 'digital', 'housing', 'mobility', 'capital market', 'non-cyclical', 'top 10', 'top 15', 'top 20',
            'g-sec', 'ex-bank', 'ex bank', '25/50', 'rural', 'transportation', 'logistics', 'select', 'next 30')
RULES = [  # order matters: specific before general
    ('niftynext50', r'next\s*50', ('sensex', 'bse')),
    ('niftymidsmallcap400', r'mid\s*small\s*cap\s*400', ()),
    ('niftylargemidcap250', r'large\s*mid\s*cap\s*250', ()),
    ('niftymidcap150', r'mid\s*cap\s*150', ()),
    ('niftysmallcap250', r'small\s*cap\s*250', ()),
    ('niftymidcap100', r'mid\s*cap\s*100', ()),
    ('niftysmallcap100', r'small\s*cap\s*100', ()),
    ('nifty500', r'nifty\s*500', ()),
    ('nifty200', r'nifty\s*200', ()),
    ('nifty100', r'nifty\s*100\b', ()),
    ('nifty50', r'nifty\s*50\b|nifty\s*bees|niftybees', ()),
    ('sensex', r'sensex', ('next',)),
    ('niftypsubank', r'psu\s*bank', ()),
    ('niftybank', r'nifty\s*bank|bank\s*bees|banking\s*etf|bank\s*etf|bank\s*index', ('psu', 'private')),
    ('niftyit', r'nifty\s*it\b|\bit\s*etf|\bit\s*bees|information technology', ()),
    ('niftyfmcg', r'fmcg', ()),
    ('niftyhealthcare', r'healthcare', ()),
    ('niftypharma', r'pharma', ()),
    ('niftyauto', r'nifty\s*auto|auto\s*etf|auto\s*bees|auto\s*index', ()),
    ('niftyfinance', r'financial\s*services', ()),
    ('niftymetal', r'metal', ()),
    ('niftyenergy', r'nifty\s*energy|energy\s*etf', ()),
    ('niftyrealty', r'realty', ()),
    ('niftycpse', r'\bcpse\b', ()),
    ('niftypse', r'\bpse\b', ()),
    ('niftyconsumerdurables', r'consumer\s*durables', ()),
    ('niftyoilgas', r'oil\s*(&|and)?\s*gas', ()),
    ('niftyinfra', r'nifty\s*infra|infrastructure\s*etf|infra\s*bees', ()),
    ('niftycommodities', r'commodities', ()),
    ('niftymedia', r'\bmedia\b', ()),
    ('niftymnc', r'\bmnc\b', ()),
]


def track(name):
    n = ' ' + re.sub(r'[^a-z0-9&/ -]', ' ', name.lower().replace('nifty50', 'nifty 50').replace('niftynext50', 'nifty next 50')) + ' '
    n = re.sub(r'\s+', ' ', n)
    if any(k in n for k in NOT_EQUITY):
        return None, 'not equity'
    SECTOR_FROM = [r[0] for r in RULES].index('niftypsubank')
    for i, (idx, pat, excl) in enumerate(RULES):
        if idx.startswith('nifty'):
            excl = excl + (' bse ',)
        if i >= SECTOR_FROM:
            excl = excl + ('midsmall', 'mid small', 'midcap', 'mid cap', 'smallcap', 'small cap', 'largemid', ' 500', ' 200', ' 100 ')
        if re.search(pat, n) and not any(k in n for k in excl):
            if any(k in n for k in VARIANTS):
                return None, 'variant index'
            return idx, None
    return None, 'no rule'


schemes = collections.OrderedDict()
for r in rows:
    if not any(k in (r['cat'] or '') for k in PASSIVE) or 'Debt' in r['cat'] or 'Gold' in r['cat'] or 'Silver' in r['cat']:
        continue
    key = (r['amc'], r['name'])
    s = schemes.setdefault(key, dict(amc=r['amc'], name=r['name'], kind='ETF' if 'ETF' in r['cat'] else 'Index fund', plans=[]))
    s['plans'].append(dict(code=r['code'], plan=r['plan'], option=r['option'], isin=r['isin'] if r['isin'] != '-' else r['isin2']))

matched, unmatched = [], collections.Counter()
for s in schemes.values():
    idx, why = track(s['name'])
    if idx:
        s['tracks'] = idx
        matched.append(s)
    elif why != 'not equity':
        unmatched[(why, s['name'])] += 1
json.dump(dict(matched=matched, unmatched=[dict(reason=k[0], name=k[1]) for k in unmatched]), open('passive_map.json', 'w'), indent=1)
by = collections.Counter(s['tracks'] for s in matched)
print(len(schemes), 'passive schemes;', len(matched), 'matched;', len(unmatched), 'unmatched equity schemes')
print(by.most_common())
print('unmatched sample:', [k[1] for k in list(unmatched)[:25]])
