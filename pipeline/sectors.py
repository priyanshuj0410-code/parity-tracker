"""Map every company to one of 11 GICS-style sectors so sectors line up across markets.

Each market labels industries its own way (NSE industries, FTSE/ICB-style names in UK
reports, GICS for ASX and Euro Stoxx, TSE 33 sectors for Japan). Labels are matched by rule,
then Japanese sectors that mix GICS sectors (electric appliances, transportation equipment,
wholesale trade, information and communication, precision instruments, services, other
products) are split by company, in the input sector_overrides.json (symbol to sector).

Run from the repo root on an assembled release (pnpm data publish does, and copies sector_overrides.json in from
Firestore's inputs): python3 pipeline/sectors.py <data dir>
"""
import json, re, sys

RULES = [
    ('Real Estate', r'real ?estate|realty|reit|propert'),
    ('Health Care', r'health|pharma|biotech|medical|precision instrument'),
    ('Energy', r'oil|petroleum|energy|coal|consumable fuel'),
    ('Utilities', r'power|utilit|^gas$|water|electricity'),
    ('Financials', r'bank|financ|insur|securities|investment|asset manag|capital market|exchange|credit|lending|life|fund'),
    ('Information Technology', r'^it$|information technology|software|technology|electric machinery|electric appliance|semiconductor|computer'),
    ('Communication Services', r'telecom|communication|media|publication|entertainment'),
    ('Consumer Staples', r'fmcg|fast moving|staples|food|beverage|tobacco|household products|personal care|personal product|fishery|agri'),
    ('Materials', r'metal|mining|steel|chemical|basic resource|packaging|container|cement|construction material|glass|ceramic|paper|pulp|forest|nonferrous|materials'),
    ('Consumer Discretionary', r'automobile|automotive|auto|transportation equipment|home construction|consumer digital|consumer durable|consumer service|discretionary|retail|apparel|textile|leisure|travel|hotel|hospitality|luxury|personal goods|rubber|homebuild|household goods|other manufacturing|other products'),
    ('Industrials', r'capital goods|construction|engineering|industrial|aerospace|defen|transport|shipping|airline|marine|rail|logistics|machinery|shipbuild|trading compan|wholesale|services|electrical|electronic equipment|warehous|diversified'),
]


def sector(industry):
    s = industry.lower()
    return next((name for name, pat in RULES if re.search(pat, s)), None)


if __name__ == '__main__':
    companies = json.load(open(sys.argv[1] + '/companies.json'))
    OVERRIDES = json.load(open(sys.argv[1] + '/sector_overrides.json'))
    out, unmatched = {}, []
    for sym, c in sorted(companies.items()):
        out[sym] = OVERRIDES.get(sym) or sector(c['industry'])
        if not out[sym]:
            unmatched.append((sym, c['industry']))
    assert not unmatched, unmatched
    json.dump(out, open(sys.argv[1] + '/sectors.json', 'w'), indent=0, ensure_ascii=False)
    counts = {}
    for v in out.values():
        counts[v] = counts.get(v, 0) + 1
    print(len(out), sorted(counts.items(), key=lambda kv: -kv[1]))
