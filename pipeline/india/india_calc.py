"""India's arithmetic after extraction, shared by build_data.py (from the filings) and rebuild_records.py (from the
stored records, when the filings are not at hand): notes, wage units, basis changes, payroll weights and index figures."""
import re

YEARS = ['2021-22', '2022-23', '2023-24', '2024-25', '2025-26']
def rd(x, n=4): return None if x is None else round(x, n)

# What each unit multiplies a filed wage total by. BRSR's carry no unit (PARITY-95).
UNITS = {'rupees': 1, 'thousand': 1e3, 'lakh': 1e5, 'million': 1e6, 'crore': 1e7}
def unit_note(unit):
    """A unit of None is a total no unit makes sense of, such as a placeholder: the share stands, the payroll does not."""
    return 'w as reported; payroll missing' if unit is None else 'reported' if unit == 'rupees' else f'reported; wages filed in {unit}, rescaled'

NOTES = [('from next year filing (prior-year column); ', 'Taken from the prior-year column of the next filing. '),
 ('reported; wages filed in crore, rescaled', 'Wages were filed in crore instead of rupees, so we rescaled them'),
 ('reported; wages filed in lakh, rescaled', 'Wages were filed in lakh instead of rupees, so we rescaled them'),
 ('reported; wages filed in million, rescaled', 'Wages were filed in millions of rupees instead of rupees, so we rescaled them'),
 ('reported; wages filed in thousand, rescaled', 'Wages were filed in thousands of rupees instead of rupees, so we rescaled them'),
 ('payroll estimated from medians x headcount; w estimated', 'Wage totals missing: payroll and women\'s share estimated from median pay and headcount'),
 ('payroll estimated from medians x headcount', 'Wage totals missing: payroll estimated from median pay and headcount'),
 ('w as reported; payroll missing', 'Women\'s share as reported; payroll total missing'),
 ('from the annual report; payroll missing', "Read from the company's annual report; payroll total missing"),
 ('from the annual report', "Read from the company's annual report"),
 ('no usable payroll', 'No usable wage data'), ('no usable wage data', 'No usable wage data')]
def friendly(n):
    for a, b in NOTES: n = n.replace(a, b)
    n = n.strip()
    if n in ('reported', 'Taken from the prior-year column of the next filing. reported'): return '' if n == 'reported' else 'Taken from the prior-year column of the next filing'
    n = n.replace('. reported', '')
    m = re.search(r'restated next year to ([0-9.]+)', n)
    if m: n = f"Restated in the next filing to {float(m.group(1))*100:.1f}%"
    return n

def plausible(v):
    return v and v.get('payrollCr') and v.get('headcount') and 1.5e5 <= v['payrollCr']*1e7/v['headcount'] <= 7.5e6

def set_basis_and_weights(companies):
    """Flag basis changes against the previous reported year, and fix each company's payroll weight: the median
    plausible reported payroll from 2022-23 on, else the median estimated one."""
    for s, c in companies.items():
        ys = sorted(c['years'].items()); prev = None
        for y, v in ys:
            v['basisChange'] = False
            if prev and v.get('wKind') == 'reported' and prev.get('wKind') == 'reported':
                pr = (v['payrollCr'] or 0)/(prev['payrollCr'] or 1) if prev.get('payrollCr') else 1
                hr = (v['headcount'] or 0)/(prev['headcount'] or 1) if (prev.get('headcount') and v.get('headcount')) else 1
                if not (0.55 <= pr <= 1.8) or not (0.6 <= hr <= 1.6) or (v['boundary'] and prev['boundary'] and v['boundary'] != prev['boundary']): v['basisChange'] = True
            if v.get('wKind') == 'reported': prev = v
        rep = sorted(v['payrollCr'] for y, v in c['years'].items() if y >= '2022-23' and v.get('wKind') == 'reported' and plausible(v))
        est = sorted(v['payrollCr'] for y, v in c['years'].items() if y >= '2022-23' and v.get('payrollCr'))
        pick = rep or est
        c['payrollWeightCr'] = pick[len(pick)//2] if pick else None
        c['payrollWeightBasis'] = 'median reported payroll' if rep else ('median estimated payroll' if est else None)

def index_calc(members, companies, mcap, shp):
    """Free-float weights, and for each year the payroll an index fund of ₹10 lakh owns and women's share of it.
    `mcap` is market cap in rupees and `shp` public shareholding ({symbol: {'public': %}}), by symbol."""
    mem = [s for s in members if s in mcap and shp.get(s, {}).get('public')]
    ffmc = {s: mcap[s]*shp[s]['public']/100 for s in mem}; tot = sum(ffmc.values())
    weights = {s: ffmc[s]/tot for s in mem}
    I = 10_00_000; res = {}
    for y in YEARS[1:]:
        own = wom = rep = pay = 0; n = nrep = 0; own_rep = 0; sec = {}
        for s in mem:
            c = companies[s]; r = c['years'].get(y)
            if not r or r['w'] is None or not c['payrollWeightCr']: continue
            a = I*weights[s]/mcap[s]; oW = a*c['payrollWeightCr']*1e7
            own += oW; wom += oW*r['w']; n += 1
            if r['wKind'] == 'reported': nrep += 1; own_rep += oW
            if r['fPerm'] is not None: rep += oW*(0.5-r['fPerm']); pay += oW*(r['fPerm']-r['w'])
            k = c['industry']; sec.setdefault(k, [0, 0, 0]); sec[k][0] += oW*r['w']; sec[k][1] += oW; sec[k][2] += 1
        if not own: continue
        res[y] = dict(headline=rd(wom/own), ownedPayroll=round(own), womenWages=round(wom), gap=round(0.5*own-wom),
            representationShare=rd(rep/(rep+pay)) if (rep+pay) else None, payShare=rd(pay/(rep+pay)) if (rep+pay) else None,
            companiesCovered=n, companiesReported=nrep, reportedPayrollShare=rd(own_rep/own),
            sectors=sorted([dict(industry=k, w=rd(v[0]/v[1]), payrollShare=rd(v[1]/own), companies=v[2]) for k, v in sec.items()], key=lambda x: -x['w']))
    yoy = {}
    for y0, y1 in zip(YEARS[1:], YEARS[2:]):
        both = [s for s in mem if companies[s]['payrollWeightCr'] and all(companies[s]['years'].get(y, {}).get('wKind') == 'reported' for y in (y0, y1)) and not companies[s]['years'][y1].get('basisChange')]
        def h(y):
            num = den = 0
            for s in both:
                a = weights[s]/mcap[s]*companies[s]['payrollWeightCr']; num += a*companies[s]['years'][y]['w']; den += a
            return num/den if den else None
        h0, h1 = h(y0), h(y1)
        if h0 and h1: yoy[f"{y0}>{y1}"] = dict(**{'from': rd(h0), 'to': rd(h1)}, change=rd(h1-h0), companies=len(both))
    return weights, res, yoy
