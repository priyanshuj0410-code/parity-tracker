"""Map every company to one of 11 GICS-style sectors so sectors line up across markets.

Each market labels industries its own way (NSE industries, FTSE/ICB-style names in UK
reports, GICS for ASX and Euro Stoxx, Nikkei's 36 groups). Labels are matched by rule,
then a few Nikkei groups that mix sectors (electric machinery, precision instruments,
services, other manufacturing) are split by company.

Run from the repo root: python3 pipeline/sectors.py
"""
import json, re

RULES = [
    ('Real Estate', r'real ?estate|realty|reit|propert'),
    ('Health Care', r'health|pharma|biotech|medical|precision instrument'),
    ('Energy', r'oil|petroleum|energy|coal|consumable fuel'),
    ('Utilities', r'power|utilit|^gas$|water'),
    ('Financials', r'bank|financ|insur|securities|investment|asset manag|capital market|exchange|credit|lending|life'),
    ('Information Technology', r'information technology|software|technology|electric machinery|semiconductor|computer'),
    ('Communication Services', r'telecom|communication|media|publication|entertainment'),
    ('Consumer Staples', r'fmcg|fast moving|staples|food|beverage|tobacco|household products|personal care|fishery|agri'),
    ('Materials', r'metal|mining|steel|chemical|cement|construction material|glass|ceramic|paper|pulp|forest|nonferrous|materials'),
    ('Consumer Discretionary', r'automobile|automotive|auto|consumer durable|consumer service|discretionary|retail|apparel|textile|leisure|travel|hotel|hospitality|luxury|personal goods|rubber|homebuild|household goods|other manufacturing'),
    ('Industrials', r'capital goods|construction|engineering|industrial|aerospace|defen|transport|shipping|airline|marine|rail|logistics|machinery|shipbuild|trading compan|services|electrical|electronic equipment|warehous|diversified'),
]

OVERRIDES = {
    'TSE-6902': 'Consumer Discretionary', 'TSE-6752': 'Consumer Discretionary', 'TSE-6753': 'Consumer Discretionary',
    'TSE-6758': 'Consumer Discretionary', 'TSE-7731': 'Consumer Discretionary', 'TSE-4385': 'Consumer Discretionary',
    'TSE-4661': 'Consumer Discretionary', 'TSE-4755': 'Consumer Discretionary',
    'TSE-6954': 'Industrials', 'TSE-6504': 'Industrials', 'TSE-6501': 'Industrials', 'TSE-6479': 'Industrials',
    'TSE-6503': 'Industrials', 'TSE-6594': 'Industrials', 'TSE-6506': 'Industrials', 'TSE-7912': 'Industrials',
    'TSE-7911': 'Industrials',
    'TSE-6146': 'Information Technology', 'TSE-4902': 'Information Technology', 'TSE-4307': 'Information Technology',
    'TSE-3697': 'Information Technology', 'TSE-4704': 'Information Technology',
    'TSE-4751': 'Communication Services', 'TSE-2432': 'Communication Services', 'TSE-4324': 'Communication Services',
    'TSE-9766': 'Communication Services', 'TSE-4689': 'Communication Services', 'TSE-3659': 'Communication Services',
    'TSE-7974': 'Communication Services', 'TSE-9602': 'Communication Services',
    'TSE-6178': 'Financials', 'TSE-2413': 'Health Care',
}


def sector(industry):
    s = industry.lower()
    return next((name for name, pat in RULES if re.search(pat, s)), None)


companies = json.load(open('src/data/companies.json'))
out, unmatched = {}, []
for sym, c in sorted(companies.items()):
    out[sym] = OVERRIDES.get(sym) or sector(c['industry'])
    if not out[sym]:
        unmatched.append((sym, c['industry']))
assert not unmatched, unmatched
json.dump(out, open('src/data/sectors.json', 'w'), indent=0, ensure_ascii=False)
counts = {}
for v in out.values():
    counts[v] = counts.get(v, 0) + 1
print(len(out), sorted(counts.items(), key=lambda kv: -kv[1]))
