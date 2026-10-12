"""India's records for the Nivel app from the Parity build (PARITY-129; build steps 3 to 5 of plans/india-brsr-1000.md).

    python3 to_records.py <data dir> <dump dir>

<dump dir> holds India's stored records, from `pnpm data dump IN <dump dir>`, and symbols.json, every other market's
symbols. This writes <dump dir>/out/companies.json and indexes.json for `pnpm data load IN`, which replaces the whole
market, and <dump dir>/out/report.json.

- Nivel's own companies keep their stored figures (the NSE XBRL build's), corrected: PARITY-95's wage units
  (wage_units.json), PARITY-122's four shares, a wage total filed as the headcount dropped, and a calendar-year
  company's years moved to the April to March year they end in. Their latest year gains the finer levels and job
  functions of the checked reading; one with no FY2025-26 year gains it from the checked reading. Every stored value is
  cross-checked against the reading, in the report, and Nivel's indexes are recomputed where a figure changed.
- Every other BRSR filer gets a record from its checked readings, in build_data.py's shape, cleaned as in
  playbooks/data-pipeline.md:
  - A wage total's unit comes from the filing, else from its own median pay × headcount. With no total, the payroll is
    median pay × headcount, badged.
  - Board totals outside 6 to 20 are dropped, and a wage share must be above 0 and at most 90%.
  - A missing wage share is estimated from median pay and headcount, badged, and never joined to a reported trend.
  - A year more than 15 points from the company's other years is left out until confirmed.
  - The year before the latest also comes from the latest filing's prior-year column.
  - A company with no FY2025-26 BRSR shows its FY2024-25 figure. One not read yet gets no record until it is.
- The all-BRSR group ('brsrall'), under decisions 4 and 10: every filer, weighted by its payroll.
  - The pay share is total women's wages ÷ total payroll, and the staff share total women ÷ total permanent staff, each
    beside the median company.
  - A company missing a year stands in with its figure from the year before, never older. Its weight is that year's
    payroll scaled by the reporters' payroll growth.
  - Each stand-in moves by the reporters' like-for-like change, so a missing company counts as moving with the
    reporters; plain carry-forward is kept as the check.
  - The level and the change agree: the latest year is the pooled figure, and each earlier year is the year after it
    less that year's change, so filers joining the group never read as a change in pay. Each year's own pooled figure
    is kept as pooledHeadline.
  - A company with a staff share but no pay share and no earlier year gets one from the linear calibration on staff
    share, outside the top 50 payrolls only. A top-50 gap is listed to be read again.
  - Merged, delisted and insolvent companies leave the group: they are never stood in for.
  - The change uses each filing's own prior-year column as its base, with a bootstrap interval. It is shown only when
    no more than 30% of payroll is carried and no top-10 payer and no whole industry is carried."""
import glob, json, os, random, re, statistics, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [HERE, os.path.join(HERE, '..'), os.path.join(HERE, '..', '..')]
from brsr_fields import fy_start
from names import split_former
from india_calc import YEARS, UNITS, rd, set_basis_and_weights, index_calc, friendly, unit_note
from sectors import sector
import marks as M, relations as REL

data, dump = sys.argv[1], sys.argv[2]
P = lambda *a: os.path.join(data, *a)
load = lambda p, d=None: json.load(open(p)) if os.path.exists(p) else d
LATEST = YEARS[-1]
prev = lambda y: f'{int(y[:4]) - 1}-{y[2:4]}'

def label(fy):
    """'2025-26' for a reading of FY2025-26, or of calendar 2025 (the year that ends inside FY2025-26)."""
    y = fy_start(fy)
    return f'{y}-{str(y + 1)[2:]}' if y else None

# NIC 2008 divisions to the NSE industries India's companies carry, which sectors.py maps to Nivel's 11 sectors.
NIC = {**{d: 'Fast Moving Consumer Goods' for d in ('01', '02', '03', '10', '11', '12')},
       **{d: 'Oil Gas & Consumable Fuels' for d in ('05', '06', '09', '19')}, '07': 'Metals & Mining', '08': 'Metals & Mining',
       '13': 'Textiles', '14': 'Textiles', '15': 'Consumer Durables', '16': 'Forest Materials', '17': 'Forest Materials', '18': 'Forest Materials',
       '20': 'Chemicals', '21': 'Healthcare', '22': 'Chemicals', '23': 'Construction Materials', '24': 'Metals & Mining',
       **{d: 'Capital Goods' for d in ('25', '26', '27', '28', '33')}, '29': 'Automobile and Auto Components', '30': 'Capital Goods',
       '31': 'Consumer Durables', '32': 'Consumer Durables', '35': 'Power', **{d: 'Services' for d in ('36', '37', '38', '39')},
       '41': 'Realty', '42': 'Construction', '43': 'Construction', '45': 'Consumer Services', '46': 'Services', '47': 'Consumer Services',
       **{d: 'Services' for d in ('49', '50', '51', '52', '53')}, '55': 'Consumer Services', '56': 'Consumer Services',
       **{d: 'Media Entertainment & Publication' for d in ('58', '59', '60', '90', '91', '92', '93')}, '61': 'Telecommunication',
       '62': 'Information Technology', '63': 'Information Technology', '64': 'Financial Services', '65': 'Financial Services', '66': 'Financial Services',
       '68': 'Realty', **{d: 'Services' for d in ('69', '70', '71', '72', '73', '74', '75', '77', '78', '79', '80', '81', '82', '84', '94', '95', '96')},
       '85': 'Consumer Services', '86': 'Healthcare', '87': 'Healthcare', '88': 'Healthcare', '99': 'Diversified'}
NIC4 = {'2211': 'Automobile and Auto Components', '3091': 'Automobile and Auto Components', '3092': 'Automobile and Auto Components',
        '3520': 'Oil Gas & Consumable Fuels', '3211': 'Consumer Durables'}
# NIC 2004 divisions: some filings still give them (34300, motor vehicle parts), and a CIN's five digits are one.
NIC04 = {**{d: 'Fast Moving Consumer Goods' for d in ('01', '02', '05', '15', '16')}, '10': 'Oil Gas & Consumable Fuels', '11': 'Oil Gas & Consumable Fuels',
         '13': 'Metals & Mining', '14': 'Metals & Mining', '17': 'Textiles', '18': 'Textiles', '19': 'Consumer Durables', '20': 'Forest Materials',
         '21': 'Forest Materials', '22': 'Media Entertainment & Publication', '23': 'Oil Gas & Consumable Fuels', '24': 'Chemicals', '25': 'Capital Goods',
         '26': 'Construction Materials', '27': 'Metals & Mining', **{d: 'Capital Goods' for d in ('28', '29', '30', '31', '32', '33', '35')},
         '34': 'Automobile and Auto Components', '36': 'Consumer Durables', '37': 'Services', '40': 'Power', '41': 'Power', '45': 'Construction',
         '50': 'Consumer Services', '51': 'Services', '52': 'Consumer Services', '55': 'Consumer Services', **{d: 'Services' for d in ('60', '61', '62', '63')},
         '64': 'Telecommunication', '65': 'Financial Services', '66': 'Financial Services', '67': 'Financial Services', '70': 'Realty', '71': 'Services',
         '72': 'Information Technology', '73': 'Services', '74': 'Services', '75': 'Services', '80': 'Consumer Services', '85': 'Healthcare',
         '90': 'Services', '91': 'Services', '92': 'Media Entertainment & Publication', '93': 'Services'}
NIC04_4 = {'2423': 'Healthcare', '2511': 'Automobile and Auto Components', '3591': 'Automobile and Auto Components', '4020': 'Oil Gas & Consumable Fuels'}
WORDS = [('Financial Services', r'bank|financ|insur|lending|nbfc|broking|asset manage'), ('Healthcare', r'pharma|hospital|health|diagnos|drug'),
         ('Information Technology', r'software|information technology|\bit services|digital'), ('Realty', r'real estate|realty|propert'),
         ('Chemicals', r'chemical|fertili[sz]'), ('Capital Goods', r'engineering|machinery|equipment|electrical|cable'),
         ('Metals & Mining', r'steel|metal|alumin|copper|mining|alloy'), ('Power', r'power|electricity|energy'), ('Textiles', r'textile|yarn|apparel|garment|hosiery'),
         ('Oil Gas & Consumable Fuels', r'\blpg\b|oil & gas|petroleum'), ('Construction', r'construction|infrastructure'), ('Services', r'logistic|e-governance|benefit management'),
         ('Fast Moving Consumer Goods', r'sugar|edible oil|food|wine|beverage'), ('Consumer Durables', r'paint|watch|appliance'),
         ('Media Entertainment & Publication', r'publication|books|broadcast|cable tv'), ('Consumer Services', r'education|training')]

INDUSTRY = {'L99999MH1986PLC039199': 'Chemicals'}  # no NIC code, activity or CIN division: Apcotex makes synthetic rubber and latex

def industry(v, cin=None):
    """From the filing's NIC code read as NIC 2008, unless the activity's words name another industry that the code read
    as NIC 2004 gives (some filings still use 2004); then the words alone; then the code as NIC 2004; then the CIN's NIC
    2004 digits. Service (SAC 99…) and goods (HS, over five digits) codes are not NIC."""
    n = v.get('nic') or {}; code = re.sub(r'\D', '', str(n.get('code') or ''))
    if len(code) > 5 or (code.startswith('99') and len(code) >= 4): code = ''
    words = next((ind for ind, rx in WORDS if re.search(rx, n.get('activity') or '', re.I)), None)
    n08 = [t[code[:k]] for t, k in ((NIC4, 4), (NIC, 2)) if code and code[:k] in t]
    n04 = [t[code[:k]] for t, k in ((NIC04_4, 4), (NIC04, 2)) if code and code[:k] in t]
    if n08 and (not words or words in n08 or words not in n04): return n08[0]
    if words: return words
    if n04: return n04[0]
    c = (cin or '')[1:6]
    return NIC04_4.get(c[:4]) or NIC04.get(c[:2])

def num(x): return x if isinstance(x, (int, float)) and not isinstance(x, bool) else None
def g(o, *path):
    for k in path: o = o.get(k) if isinstance(o, dict) else None
    return o

per_head = lambda r, n: 1.5e5 <= r / n <= 7.5e6
# PARITY-122: four stored values that are not the filing's own (research/brsr-dataset-2024-25-check.md). MFSL's record
# follows Axis Max Life, the subsidiary whose staff and payroll it holds, so it takes AMLI's row (the stored figure
# added MFSL's and AMLI's rows together).
FIXES = {('MFSL', '2024-25'): (0.23, 'Axis Max Life, the subsidiary this record follows, as its filing gives'),
         ('MFSL', '2023-24'): (0.217, 'Axis Max Life, the subsidiary this record follows, as its filing gives'),
         ('TITAGARH', '2024-25'): (0.0514, "Corrected to the filing's FY2024-25 column"),
         ('TDPOWERSYS', '2024-25'): (0.072, "Corrected to the filing's figure"), ('UNITDSPR', '2024-25'): (0.22, "Corrected to the filing's figure"),
         # PARITY-131: the FY2023-24 BRSR prints 14.9% (the FY2024-25 prior-year column 14.93%); the stored figure was a 1.
         ('INDIAMART', '2023-24'): (0.149, "Corrected to the filing's figure")}
NOTE = {'crore': 'Wages were filed in crore instead of rupees, so we rescaled them', 'lakh': 'Wages were filed in lakh instead of rupees, so we rescaled them',
        'million': 'Wages were filed in millions of rupees instead of rupees, so we rescaled them',
        'thousand': 'Wages were filed in thousands of rupees instead of rupees, so we rescaled them'}

GROUPS = (('employees', 'permEmployees'), ('workers', 'permWorkers'))

def median_table(v):
    """(factor, totals): what the median pay table's figures multiply by, and whether they are each group's total pay.
    A stated unit stands where it gives ₹50,000 to ₹1 crore a year. A table whose stated unit cannot make its figures
    medians may hold totals (APEX's, headed lakh): it counts as totals when they give a plausible pay a head and
    reproduce the filed wage share within a point; otherwise it gives nothing. With no stated unit, the first of rupees,
    lakh, crore, million and thousand that gives a plausible median."""
    mp = v.get('medianPay') or {}
    vals = {(grp, sx): x for grp, _ in GROUPS for sx in ('men', 'women') if (x := num(g(mp, grp, sx + 'Median')))}
    if not vals: return None, False
    m, unit = statistics.fmean(vals.values()), (mp.get('unit') or '').lower()
    if unit in UNITS:
        if 5e4 <= m * UNITS[unit] <= 1e7: return UNITS[unit], False
        hc = sum(num(g(v, 'headcount', part, 'total')) or 0 for _, part in GROUPS)
        tot, wom, share = sum(vals.values()), sum(x for (_, sx), x in vals.items() if sx == 'women'), num(g(v, 'wageShare', 'current'))
        if hc and per_head(tot * UNITS[unit], hc) and share is not None and abs(wom / tot * 100 - share) <= 1: return UNITS[unit], True
        return None, False
    for u in ('rupees', 'lakh', 'crore', 'million', 'thousand'):
        if 5e4 <= m * UNITS[u] <= 1e7: return UNITS[u], False
    return None, False

def medians_x_headcount(v, women=None):
    """Median pay × permanent headcount (else the median table's own count), employees and workers, for women, men or
    (None) both, in rupees; a table of totals is summed instead."""
    mp, hc = v.get('medianPay') or {}, v.get('headcount') or {}
    f, totals = median_table(v)
    if not f: return 0
    sexes = ('women', 'men') if women is None else ('women',) if women else ('men',)
    return f * sum((num(g(mp, grp, sx + 'Median')) or 0) * (1 if totals else num(g(hc, part, sx)) or num(g(mp, grp, sx)) or 0)
                   for grp, part in GROUPS for sx in sexes)

def payroll(v, N):
    """(payroll in rupees, dq, note, estimated). A filed total's unit is the filing's where stated and plausible; else, of
    the units giving ₹1.5 lakh to ₹75 lakh a head, the one landing nearest 1.3 times median pay × headcount (means
    exceed medians), within 0.5 to 3 times. With no total, median pay × headcount itself, badged."""
    W, unit, est = num(g(v, 'wages', 'total')), (g(v, 'wages', 'unit') or '').lower(), medians_x_headcount(v)
    if not N: return None, None, None, False
    if W:
        if unit in UNITS and per_head(W * UNITS[unit], N): return W * UNITS[unit], 2 if unit != 'rupees' else 1, NOTE.get(unit), False
        if est:
            fits = sorted((abs(W * f / est - 1.3), u) for u, f in UNITS.items() if per_head(W * f, N) and 0.5 <= W * f / est <= 3)
            if fits: u = fits[0][1]; return W * UNITS[u], 2 if u != 'rupees' else 1, NOTE.get(u), False
        # extract_all.unit_of: with nothing to compare against, the one unit of rupees, crore and lakh that gives a
        # plausible pay a head (100 and the headcount itself are placeholders).
        fits = [u for u in ('rupees', 'crore', 'lakh') if 1e5 < W * UNITS[u] / N < 1e7] if W not in (100, N) else []
        if len(fits) == 1: return W * UNITS[fits[0]], 2 if fits[0] != 'rupees' else 1, NOTE.get(fits[0]), False
    if est and per_head(est, N): return est, 3, "Women's share as reported; payroll estimated from median pay and headcount", True
    return None, None, None, False

def year_record(v):
    """One CompanyYear from a checked reading, with the private fields the group needs (_prior, _payEst)."""
    hc = v.get('headcount') or {}
    part = lambda k, f: num(g(hc, k, f)) or 0
    Np = sum(part(k, 'total') for k in ('permEmployees', 'permWorkers')); Fp = sum(part(k, 'women') for k in ('permEmployees', 'permWorkers'))
    N = Np + sum(part(k, 'total') for k in ('tempEmployees', 'tempWorkers')); F = Fp + sum(part(k, 'women') for k in ('tempEmployees', 'tempWorkers'))
    W, dq, note, pay_est = payroll(v, Np or N)
    share, kind = num(g(v, 'wageShare', 'current')), 'reported'
    w = share / 100 if share is not None else None
    if w is None and num(g(v, 'wages', 'women')) and num(g(v, 'wages', 'total')): w = g(v, 'wages', 'women') / g(v, 'wages', 'total')
    if w is None:  # the filing's own tables: median pay × headcount by gender, badged as an estimate
        wom, men = medians_x_headcount(v, True), medians_x_headcount(v, False)
        if wom and men and Np and per_head(wom + men, Np):
            w, kind, dq = wom / (wom + men), 'estimated', 3
            note = "Wage totals missing: payroll and women's share estimated from median pay and headcount" if pay_est or not W else 'Wage share missing: estimated from median pay and headcount'
            pay_est, W = pay_est or not W, W or wom + men
    if w is not None and not 0 < w <= 0.9: w, kind, dq, note = None, None, 4, f'Implausible wage share in the filing ({w:.3g}), left out'
    if w is not None and not W: note = "Women's share as reported; payroll total missing"
    if w is None and dq != 4: dq, note = 4, 'No usable wage data'
    b, bw = num(g(v, 'board', 'total')), num(g(v, 'board', 'women'))
    if b is None or not 6 <= b <= 20: b = bw = None
    prior = num(g(v, 'wageShare', 'prior'))
    return dict(w=rd(w), wKind=kind if w is not None else None, fPerm=rd(Fp / Np) if Np else None, fAll=rd(F / N) if N else None,
                permHeadcount=Np or None, headcount=N or None, board=b, boardWomen=bw if b is not None else None,
                payrollCr=round(W / 1e7) if W else None, dq=dq or 1, note=note or '', boundary=(v.get('boundary') or '').capitalize(),
                _prior=prior / 100 if prior is not None and 0 < prior <= 90 else None, _payEst=pay_est)

def finer(v):
    """The reading's finer levels and job functions, for the company page: the company's own label, the standard level
    or function, counts, women's share (0 to 1, from the counts where both are given), scope and where it was found.
    A row with no share is left out, and the reader's remarks (in brackets, or after a semicolon) leave scope and where."""
    def clause(s): return re.sub(r'\s*\([^)]*(\)|$)', '', s or '').split(';')[0].strip(' .,') or None
    def row(r, f):
        wn, mn, pc = num(r.get('women')), num(r.get('men')), num(r.get('womenPct'))
        share = wn / (wn + mn) if wn is not None and mn is not None and wn + mn > 0 else pc / 100 if pc is not None and 0 <= pc <= 100 else None
        return {k: x for k, x in {f: r.get(f), 'standard': r.get('standard'), 'women': wn, 'men': mn, 'share': rd(share),
                                   'scope': clause(r.get('scope')), 'where': clause(r.get('where'))}.items() if x is not None}
    rows = lambda key, f, keep: [x for r in v.get(key) or [] if isinstance(r, dict) and keep(r) for x in [row(r, f)] if 'share' in x]
    return rows('ladder', 'level', lambda r: r.get('standard') not in ('board', 'kmp', 'staff', 'workers')), rows('functions', 'function', lambda r: True)

def jumps(years):
    """build_data.py's rule: a year more than 15 points from the median of the company's other years is left out."""
    vals = {y: r['w'] for y, r in years.items() if r.get('w') is not None}
    for y, w in vals.items():
        others = [x for k, x in vals.items() if k != y]
        if len(others) >= 2 and abs(w - statistics.median(others)) > 0.15:
            years[y].update(w=None, wKind=None, dq=4, note="Moved more than 15 points from the company's other years, left out until confirmed")

# ---------- inputs ----------
Q = load(P('queue.json'))
for k, f in (load(P('pending.json'), {}) or {}).get('set', {}).items():
    if k in Q: Q[k] = dict(Q[k], **f)
IDS = (load(P('identifiers.json'), {}) or {}).get('companies', {})
MK = M.marks(data); EV = REL.load(data, Q, MK)
stored = load(os.path.join(dump, 'companies.json')); stored_ix = load(os.path.join(dump, 'indexes.json'))
others = load(os.path.join(dump, 'symbols.json'), [])  # every other market's symbols (load refuses to reuse one)
taken = set(others) | set(stored)
left = {k for k, v in Q.items() if REL.merged_away(k, EV) or MK.get(k, {}).get('kind') in M.GONE_KINDS or M.GONE.search(str(v.get('staleReason') or ''))}

def readings(k):
    """{year: reading}: the build's checked reading, then each history store's."""
    out = {}
    for p in [P('verified', k + '.json')] + sorted(glob.glob(P('history', '*', 'verified', k + '.json'))):
        v = load(p); y = v and label(v.get('fy'))
        if y in YEARS and y not in out: out[y] = v
    return out

def filing(v):
    """The year's Filing: the public copy of the BRSR the reading came from, and what it is ('annualReport' when the BRSR
    sits in the annual report, 'exchange' for an exchange archive, 'website' for the company's site). A copy the owner
    saved by hand has no public link."""
    x = next((x for x in reversed(v.get('fetches') or []) if x.get('status') == 'ok' and x.get('hasBRSR') and (x.get('url') or '').startswith('http')), None)
    if not x: return dict(xbrl='', pdf='', submitted='')
    kind = 'annualReport' if x.get('role') == 'ar' else 'exchange' if re.search(r'nseindia|bseindia', x['url']) else 'website'
    return dict(xbrl='', pdf=x['url'], submitted='', kind=kind)

def latest_note(k, v):
    """One line for a company whose latest figure is not FY2025-26: the owner's mark, else the pipeline's reason."""
    mk = MK.get(k) or {}
    r = ({'noBrsr': 'No FY26 BRSR filed', 'merged': f"Merged into {mk.get('into') or 'another company'}", 'insolvent': 'In insolvency', 'delisted': 'Delisted'}[mk['kind']]
         if mk.get('kind') else str(v.get('staleReason') or ''))
    r = re.sub(r'\s*\([^)]*\)', '', r).split(':')[0].replace('FY2025-26', 'FY26').replace('Amalgamated', 'Merged')
    r = re.sub(r'\s+(Limited|Ltd\.?)\b', '', re.sub(r' and delisted on .*', ', delisted', r)).strip()
    return r or 'No FY26 BRSR yet'

report = dict(new=0, nivel=0, nivelYearAdded=[], fixes=[], finerAdded=0, unread=[], noFigure=[], industryUnknown=[], renamed={}, crossCheck=[], readAgain={})
companies = {s: json.loads(json.dumps(c)) for s, c in stored.items()}
# PARITY-95's wage units (pipeline/india/wage_units.json), as rebuild_records.apply_units applies them: the stored
# records predate them.
for s, ys in (load(os.path.join(HERE, '..', 'wage_units.json'), {}) or {}).items():
    for y, u in ys.items():
        r = companies.get(s, {}).get('years', {}).get(y)
        if r is None: continue
        p = round(u['filed'] * UNITS[u['unit']] / 1e7) if u['unit'] else None
        if r.get('payrollCr') == p: continue
        report['fixes'].append([s, y, 'payrollCr', r.get('payrollCr'), p])
        r['payrollCr'] = p
        if r.get('wKind') == 'reported':  # a year whose share is estimated or left out keeps its own badge and note
            r.update(dq=2 if u['unit'] not in (None, 'rupees') else 1,
                     note=friendly(('from next year filing (prior-year column); ' if u.get('column') == 'prior' else '') + unit_note(u['unit'])))
for (s, y), (w, note) in FIXES.items():
    r = companies.get(s, {}).get('years', {}).get(y)
    if r and r.get('w') != w:
        report['fixes'].append([s, y, r.get('w'), w]); r.update(w=w, wKind='reported', note=note, dq=1 if r.get('dq') == 4 else r.get('dq'))
for s, c in companies.items():  # a wage total filed as the headcount is no payroll
    for y, r in c['years'].items():
        if r.get('payrollCr') and r['payrollCr'] in (r.get('headcount'), r.get('permHeadcount')):
            report['fixes'].append([s, y, 'payrollCr', r['payrollCr'], None]); r['payrollCr'] = None

nxt = lambda y: f'{int(y[:4]) + 1}-{int(y[5:]) + 1:02d}'
by_hand = lambda r: (r.get('note') or '').startswith("Read from the company's annual report")

def shift_calendar(s):
    """A calendar-year company's stored years, one year on. NSE's XBRL labels a January to December year by the year
    it ends (CY2025 as 2024-25); the build files it under the April to March year it ends in (2025-26, as
    brsr_fields.is_latest does), and so did the hand-read annual-report years. Where a moved year lands on one already
    held (the same report entered by hand), the better figure stays: reported over estimated, then one with a payroll,
    then the XBRL one."""
    c = companies[s]; years, filings = {}, {}
    for y, r in sorted(c['years'].items()):
        to = y if by_hand(r) else nxt(y)
        if to not in YEARS: continue
        score = lambda r: (r.get('wKind') == 'reported', r.get('payrollCr') is not None, not by_hand(r))
        keep, lose = (r, years.get(to)) if to not in years or score(r) > score(years[to]) else (years[to], r)
        if lose and not keep.get('payrollCr') and lose.get('payrollCr'):  # the same report: its payroll serves the figure kept
            keep.update(payrollCr=lose['payrollCr'], dq=3, note=keep['note'].replace('payroll total missing', 'payroll estimated from median pay and headcount'))
        if keep is r:
            years[to] = r
            f = c['filings'].get(y)
            if f: filings[to] = f
    c['years'], c['filings'] = years, {y: f for y, f in filings.items() if y in years}
    report.setdefault('calendarShifted', []).append(s)

prior_of, group, gone, added_est, sym_of = {}, set(), set(), set(), {}  # prior_of[(symbol, year)]: the next year's filing's prior-year column
reason_of = {}  # reason_of[(symbol, year)]: the next year's filing's own words on restating that year, or None

RESTATE = re.compile(r'restat|redefin|(?-i:\bISF\b)|Industry Standards|methodolog|calculation method|not comparable|reclassif|regroup', re.I)
NOT_COMPARABLE = re.compile(r'not comparable|merged entity|demerg|amalgamat', re.I)

def restatement_note(k):
    """The FY2025-26 filing's own words on a restated or not comparable prior year, from the 45 lines after its wage
    share table (KPR Mill: "FY24-25 restated by redefining wages as per ISF"), or None."""
    p = P('latest', 'txt', k + '.txt')
    if not os.path.exists(p): return None
    t = open(p, errors='ignore').read()
    m = re.search(r'Gross wages paid to females', t)
    if not m: return None
    hits = [l.strip() for l in t[m.start(): m.start() + 4000].splitlines()[:45] if RESTATE.search(l) and not re.search(r'escalat|grievance', l, re.I)]
    hits.sort(key=lambda l: not re.search(r'restat|not comparable', l, re.I))
    return re.sub(r'\s+', ' ', hits[0]).strip(' *.')[:160] if hits else None

def staff_split(v):
    """India's BRSR staff categories by gender, for the company page and its insights: permanent employees, permanent
    workers and key managerial personnel."""
    hc = v.get('headcount') or {}
    def split(src):
        wn, mn, tot = num(g(src, 'women')), num(g(src, 'men')), num(g(src, 'total'))
        return {'women': wn, 'men': mn if mn is not None else tot - wn if tot is not None and wn is not None and tot >= wn else None}
    out = {name: split(src) for name, src in (('employees', hc.get('permEmployees')), ('workers', hc.get('permWorkers')), ('kmp', v.get('kmp')))}
    return {k: x for k, x in out.items() if x['women'] is not None and x['men'] is not None and x['women'] + x['men'] > 0} or None

for k, v in sorted(Q.items()):
    if v['status'] == 'merged': continue
    nm = v.get('nivelMatch') if v.get('nivelMatch') in stored else k[6:] if k.startswith('NIVEL-') and k[6:] in stored else None
    rs = readings(k)
    if nm:
        c = companies[nm]; report['nivel'] += 1
        if any(str(r.get('fy') or '').startswith('CY') for r in rs.values()): shift_calendar(nm)
        for y, r in rs.items():
            rec = year_record(r)
            if rec['_prior'] is not None: prior_of[(nm, prev(y))] = rec['_prior']
            have = c['years'].get(y)
            if have and have.get('w') is not None and rec['w'] is not None and rec['wKind'] == 'reported' and abs(have['w'] - rec['w']) > 0.005:
                report['crossCheck'].append([nm, y, have['w'], rec['w']])
            if y == LATEST and not have and rec['w'] is not None:
                c['years'][y] = {f: x for f, x in rec.items() if not f.startswith('_')}; c['filings'][y] = filing(v)
                report['nivelYearAdded'].append(nm)
                if rec['_payEst']: added_est.add((nm, y))
                copy = json.loads(json.dumps({nm: c})); set_basis_and_weights(copy)  # its basis flag only; the stored weight stands
                c['years'][y]['basisChange'] = copy[nm]['years'][y]['basisChange']
        if LATEST in rs and c['years'].get(LATEST) is not None:
            lv, fn = finer(rs[LATEST])
            if lv: c['years'][LATEST]['levels'] = lv
            if fn: c['years'][LATEST]['functions'] = fn
            report['finerAdded'] += bool(lv or fn)
            sp = staff_split(rs[LATEST])
            if sp: c['years'][LATEST]['staff'] = sp
            reason_of[(nm, prev(LATEST))] = restatement_note(k)
        sym_of[k] = nm
        if c['years']: group.add(nm)  # a listed company with no BRSR year yet is no filer
        if k in left: gone.add(nm)
        continue
    if not rs:
        report['unread' if v['status'] in ('todo', 'in-batch') else 'noFigure'].append(k); continue
    i = IDS.get(k, {})
    sym = i.get('nse') or (f"BSE-{i.get('bseCode') or i.get('bseId')}" if i.get('bseCode') or i.get('bseId') else k)
    if sym in taken: report['renamed'][k] = sym = 'NSE-' + sym
    taken.add(sym)
    last = rs[max(rs)]
    name, former = split_former(v['name'] if v.get('nameByOwner') or not last.get('name') else last['name'])
    name = re.sub(r'\s+(Limited|Ltd)\.?$', ' Ltd.', name)  # as Nivel's own records name them ("Tata Consultancy Services Ltd.")
    ind = INDUSTRY.get(k) or industry(last, i.get('cin') or v.get('cin'))
    if not ind: report['industryUnknown'].append(k); ind = 'Diversified'
    years = {y: year_record(r) for y, r in rs.items()}
    for y in sorted(rs):
        p, py = years[y]['_prior'], prev(y)
        if p is None or py not in YEARS: continue
        prior_of[(sym, py)] = p
        if py not in years:
            years[py] = dict(w=rd(p), wKind='reported', fPerm=None, fAll=None, permHeadcount=None, headcount=None, board=None, boardWomen=None,
                             payrollCr=None, dq=1, note='Taken from the prior-year column of the next filing', boundary=years[y]['boundary'], _prior=None, _payEst=False)
    if LATEST in rs: reason_of[(sym, prev(LATEST))] = restatement_note(k)
    jumps(years)
    lv, fn = finer(last)
    if lv: years[max(rs)]['levels'] = lv
    if fn: years[max(rs)]['functions'] = fn
    for y, r in rs.items():
        sp = staff_split(r)
        if sp: years[y]['staff'] = sp
    rec = dict(symbol=sym, name=name, industry=ind, isin=i.get('isin'), cin=i.get('cin') or v.get('cin'), country='IN', exchange='NSE' if i.get('nse') else 'BSE',
               indexes=[], marketCapCr=None, publicFloatPct=None, years={y: years[y] for y in sorted(years)},
               filings={max(rs): filing(v)}, payrollWeightCr=None, payrollWeightBasis=None)
    if former: rec['formerly'] = former
    if max(rs) != LATEST: rec['latestNote'] = latest_note(k, v)
    if v['status'] == 'no-data' and v.get('noDataReason'): rec['noDataReason'] = v['noDataReason']
    companies[sym] = rec; report['new'] += 1; group.add(sym); sym_of[k] = sym
    if k in left: gone.add(sym)
for k, v in Q.items():  # a duplicate entry stands for the one it merged into
    t = k
    while Q.get(t, {}).get('status') == 'merged' and Q[t].get('mergedInto'): t = Q[t]['mergedInto']
    if t != k and t in sym_of: sym_of[k] = sym_of[t]

# A Nivel company whose payroll was fixed, or that had no weight until this build gave it a year, gets its weight again
# by Nivel's rule; every other stored weight stands.
for s in {f[0] for f in report['fixes'] if f[2] == 'payrollCr'} | set(report.get('calendarShifted', [])) | {s for s in report['nivelYearAdded'] if not companies[s].get('payrollWeightCr')}:
    copy = json.loads(json.dumps({s: companies[s]})); set_basis_and_weights(copy)
    est = all((s, y) in added_est for y, r in companies[s]['years'].items() if r.get('payrollCr') and y >= '2022-23')
    companies[s].update(payrollWeightCr=copy[s]['payrollWeightCr'], payrollWeightBasis='median estimated payroll' if est else copy[s]['payrollWeightBasis'])
    for y, r in companies[s]['years'].items(): r['basisChange'] = copy[s]['years'][y]['basisChange']
    report.setdefault('weightsSet', {})[s] = companies[s]['payrollWeightCr']
new = {s: c for s, c in companies.items() if s not in stored}
set_basis_and_weights(new)
for s, c in new.items():
    if c['payrollWeightBasis'] == 'median reported payroll' and all(r.get('_payEst') for r in c['years'].values() if r.get('payrollCr')):
        c['payrollWeightBasis'] = 'median estimated payroll'
pay_est = {(s, y) for s, c in new.items() for y, r in c['years'].items() if r.pop('_payEst', False)} | added_est
pay_est |= {(s, y) for s in stored for y, r in companies[s]['years'].items() if r.get('payrollCr') and r.get('dq') == 3}  # Nivel's estimated payrolls
for s in stored:  # a stored restatement ("Restated in the next filing to 16.5%") is that year's base for the change
    for y, r in companies[s]['years'].items():
        m = re.search(r'Restated in the next filing to ([0-9.]+)%', r.get('note') or '')
        if m: prior_of.setdefault((s, y), float(m.group(1)) / 100)
for c in new.values():
    for r in c['years'].values(): r.pop('_prior', None)

# A merger or demerger breaks each surviving party's figures in the first year that includes it (relations.break_fy),
# for the group's arithmetic and for restatements; the records keep their own basis flags.
breaks = {}
for e in EV:
    y = REL.break_fy(e)
    for x in [p for side in ('from', 'to') if e['kind'] != 'merger' or side == 'to' for p in e[side]]:
        s = sym_of.get(x.get('key'))
        if s and y in YEARS: breaks[(s, y)] = e['kind']
report['breaks'] = sorted(f'{s} {y} {k}' for (s, y), k in breaks.items())

def restate(s, y, R):
    """Decision 0020: a later filing supersedes an earlier one for the same year, unless it says they are not
    comparable. Rounding (under 0.1 pp, or 0.5 pp against a whole percent) changes nothing; a merger, demerger, boundary
    change or the filing's own "not comparable" keeps the filed figure and breaks the change; an unexplained move of 5
    points or more is held for a reading check; anything else replaces the year's figure, keeps the filed one, and
    breaks the change into it, since the year is now on the next year's basis."""
    c = companies[s]; r, n = c['years'].get(y), c['years'].get(nxt(y))
    if not r or r.get('w') is None or r.get('wKind') != 'reported' or 'wFiled' in r: return
    d, why = R - r['w'], reason_of.get((s, y))
    whole = any(abs(x * 100 - round(x * 100)) < 1e-6 for x in (R, r['w']))
    old = re.sub(r'\.?\s*Restated in the next filing to [0-9.]+%', '', r.get('note') or '').strip()
    if abs(d) < (0.005 if whole else 0.001): r['note'] = old; return
    if (s, nxt(y)) in breaks or (n and r.get('boundary') and n.get('boundary') and r['boundary'] != n['boundary']) or (why and NOT_COMPARABLE.search(why)):
        r['note'] = old
        if n:
            n['basisChange'] = True
            n['note'] = '. '.join(filter(None, [n.get('note'), f"Not comparable with {fy_label(y)}" + (f': "{why}"' if why else '')]))
        prior_of.pop((s, y), None); report.setdefault('notComparable', []).append([s, y, r['w'], rd(R), why]); return
    if abs(d) >= 0.05 and not why: report.setdefault('restatementsHeld', []).append([s, y, r['w'], rd(R)]); return
    r.update(wFiled=r['w'], w=rd(R), restatedIn=nxt(y), basisChange=True,
             note='. '.join(filter(None, [old, f"Restated in the {fy_label(nxt(y))} filing; filed as {r['w'] * 100:.1f}%" + (f' ("{why}")' if why else '')])))
    if why: r['restatedNote'] = why
    report.setdefault('restated', []).append([s, y, r['wFiled'], r['w'], why])

fy_label = lambda y: f'FY{y[5:]}'
for (s, y), R in sorted(prior_of.items()): restate(s, y, R)
for s in group:
    if 'brsrall' not in companies[s]['indexes']: companies[s]['indexes'].append('brsrall')
unmapped = sorted({c['industry'] for c in companies.values() if not sector(c['industry'])})
assert not unmapped, f'industries sectors.py cannot map: {unmapped}'

# ---------- the all-BRSR group ----------
def W(s, y): return (companies[s]['years'].get(y) or {}).get('w')
def R(s, y): return companies[s]['years'].get(y) or {}

broken = lambda s, y: R(s, y).get('basisChange') or (s, y) in breaks
members = sorted(group)  # one order, so the bootstrap draws the same rows every run

def growth(y):
    """Reporters' payroll growth into y: total payroll in y ÷ in the year before, over companies with a reported payroll
    in both and no basis change."""
    both = [s for s in members if all(R(s, x).get('payrollCr') and R(s, x).get('wKind') == 'reported' and (s, x) not in pay_est for x in (prev(y), y))
            and not broken(s, y)]
    a, b = sum(R(s, y)['payrollCr'] for s in both), sum(R(s, prev(y))['payrollCr'] for s in both)
    return a / b if b else 1.0

GROW = {y: growth(y) for y in YEARS[1:]}

def change(y):
    """The reporters' like-for-like change into y, weighted by y's payroll, from each filing's own prior-year column (else
    the stored year before). Basis changes, estimates and moves of more than 15 points in a year (listed in the report)
    are left out. Returns (change, rows, the change function, how many reporters a basis change left out)."""
    rows, cut = [], 0
    for s in members:
        r = R(s, y)
        if r.get('wKind') != 'reported' or r.get('w') is None or not r.get('payrollCr'): continue
        if broken(s, y): cut += 1; continue
        base = prior_of.get((s, prev(y)))
        if base is None and R(s, prev(y)).get('wKind') == 'reported': base = W(s, prev(y))
        if base is None: continue
        if abs(r['w'] - base) > 0.15: report.setdefault('jumps', []).append([s, y, rd(base), r['w']]); continue
        rows.append((r['payrollCr'], base, r['w'], s))
    f = lambda rr: sum(p * (b - a) for p, a, b, _ in rr) / sum(p for p, *_ in rr) if rr else None
    return f(rows), rows, f, cut

def weight(s, y):
    """The company's payroll in y: its own, else the year before's scaled by the reporters' growth, else the year
    after's scaled back (a year from a prior-year column has no payroll of its own)."""
    if R(s, y).get('payrollCr'): return R(s, y)['payrollCr']
    if R(s, prev(y)).get('payrollCr') and y in GROW: return R(s, prev(y))['payrollCr'] * GROW[y]
    nx = f'{int(y[:4]) + 1}-{int(y[5:]) + 1:02d}'
    if R(s, nx).get('payrollCr') and GROW.get(nx): return R(s, nx)['payrollCr'] / GROW[nx]
    return None

def pooled(y, step):
    """Year y's group figures, the rows used and the top-50 gaps. Stand-ins move by `step` (0: plain carry-forward)."""
    rows, uncovered = [], []
    for s in members:
        r, pr = R(s, y), R(s, prev(y))
        if r.get('w') is not None:
            rows.append(dict(s=s, w=r['w'], p=weight(s, y), kind='estimated' if r['wKind'] == 'estimated' else 'reported', pEst=not r.get('payrollCr') or (s, y) in pay_est, r=r))
        elif pr.get('w') is not None and s not in gone:
            p = weight(s, prev(y))
            rows.append(dict(s=s, w=min(max(pr['w'] + step, 0), 1), p=p and p * GROW.get(y, 1), kind='carried', pEst=True, r=pr))
        elif r.get('fPerm') is not None and not any(W(s, x) is not None for x in YEARS if x < y):
            rows.append(dict(s=s, w=None, p=r.get('payrollCr'), kind='calibrated', pEst=(s, y) in pay_est, r=r))
        elif (r or pr) and s not in gone: uncovered.append(s)
    no_payroll = [x['s'] for x in rows if not x['p']]
    rows = [x for x in rows if x['p']]
    top50 = {x['s'] for x in sorted(rows, key=lambda x: -x['p'])[:50]}
    fit = [(x['r']['fPerm'], x['w']) for x in rows if x['kind'] == 'reported' and x['r'].get('fPerm') is not None]
    alpha = beta = None
    if len(fit) > 10:  # linear, mean-unbiased: least squares with an intercept
        mx, my = statistics.fmean(a for a, _ in fit), statistics.fmean(b for _, b in fit)
        beta = sum((a - mx) * (b - my) for a, b in fit) / sum((a - mx) ** 2 for a, _ in fit); alpha = my - beta * mx
    read_again = []
    for x in rows:
        if x['kind'] != 'calibrated': continue
        if x['s'] in top50 or alpha is None: read_again.append(x['s']); x['p'] = None
        else: x['w'] = min(max(alpha + beta * x['r']['fPerm'], 0), 0.9)
    rows = [x for x in rows if x['p']]
    tot = sum(x['p'] for x in rows)
    if not tot: return None
    share = lambda kinds: rd(sum(x['p'] for x in rows if x['kind'] in kinds) / tot)
    wom = sum(x['p'] * x['w'] for x in rows)
    rep = sum(x['p'] * (0.5 - x['r']['fPerm']) for x in rows if x['r'].get('fPerm') is not None)
    pay = sum(x['p'] * (x['r']['fPerm'] - x['w']) for x in rows if x['r'].get('fPerm') is not None)
    # Staff share: every member's own year, or its year before when missing (no pooled change), payroll known or not.
    staff = [r for r in (R(s, y) if R(s, y).get('permHeadcount') else R(s, prev(y)) if s not in gone else {} for s in members)
             if r.get('permHeadcount') and r.get('fPerm') is not None]
    paid = {id(x['r']) for x in rows}
    seats = [x['r'] for x in rows if x['r'].get('board') and x['r'].get('boardWomen') is not None]
    sec = {}
    for x in rows:
        k = companies[x['s']]['industry']; sec.setdefault(k, [0, 0, 0]); sec[k][0] += x['p'] * x['w']; sec[k][1] += x['p']; sec[k][2] += 1
    hc = sum(r['permHeadcount'] for r in staff)
    reported = [x['w'] for x in rows if x['kind'] == 'reported']
    return dict(headline=rd(wom / tot), ownedPayroll=round(tot * 1e7), womenWages=round(wom * 1e7), gap=round((0.5 * tot - wom) * 1e7),
                representationShare=rd(rep / (rep + pay)) if rep + pay else None, payShare=rd(pay / (rep + pay)) if rep + pay else None,
                companiesCovered=len(rows), companiesReported=len(reported), companiesCarried=sum(x['kind'] == 'carried' for x in rows),
                companiesEstimated=sum(x['kind'] in ('estimated', 'calibrated') for x in rows), companiesUncovered=len(uncovered),
                companiesWithoutPayroll=len(no_payroll), reportedPayrollShare=share(('reported',)), carriedPayrollShare=share(('carried',)),
                estimatedPayrollShare=share(('estimated', 'calibrated')), weightEstimatedPayrollShare=rd(sum(x['p'] for x in rows if x['pEst']) / tot),
                workforce=rd(sum(r['permHeadcount'] * r['fPerm'] for r in staff) / hc) if hc else None,
                staffWithPayrollShare=rd(sum(r['permHeadcount'] for r in staff if id(r) in paid) / hc) if hc else None,
                boards=rd(sum(r['boardWomen'] for r in seats) / sum(r['board'] for r in seats)) if seats else None,
                medianCompany=dict(w=rd(statistics.median(reported)) if reported else None, fPerm=rd(statistics.median(r['fPerm'] for r in staff)) if staff else None),
                sectors=sorted([dict(industry=k, w=rd(a / b), payrollShare=rd(b / tot), companies=m) for k, (a, b, m) in sec.items()], key=lambda x: -x['w'])), rows, read_again

years, yoy, constituents = {}, {}, {}
for y in YEARS[1:]:
    d, rows, f, cut = change(y)
    plain = pooled(y, 0)
    if not plain: continue
    res, used, read_again = pooled(y, d) if d is not None and prev(y) in years else plain
    res['carryForwardHeadline'] = plain[0]['headline']
    years[y] = res
    if read_again: report['readAgain'][y] = read_again
    if y == LATEST: constituents = {x['s']: x['p'] for x in used}
    if d is None or prev(y) not in years: continue
    rnd = random.Random(129); boot = sorted(f([rnd.choice(rows) for _ in rows]) for _ in range(2000))
    top10 = {x['s'] for x in sorted(used, key=lambda x: -x['p'])[:10]}
    carried = {x['s'] for x in used if x['kind'] == 'carried'}
    whole = sorted({sector(companies[s]['industry']) for s in carried} - {sector(companies[x['s']]['industry']) for x in used if x['kind'] != 'carried'})
    both_staff = [s for s in members if R(s, y).get('fPerm') is not None and R(s, prev(y)).get('fPerm') is not None and R(s, y).get('permHeadcount')]
    staff = [(R(s, y)['permHeadcount'], R(s, prev(y))['fPerm'], R(s, y)['fPerm']) for s in both_staff if not broken(s, y)]
    tp = sum(p for p, *_ in rows)
    yoy[f'{prev(y)}>{y}'] = {'from': rd(sum(p * a for p, a, *_ in rows) / tp), 'to': rd(sum(p * b for p, _, b, _ in rows) / tp),
                             'change': rd(d), 'companies': len(rows), 'interval': [rd(boot[50]), rd(boot[1949])], 'distinguishable': not boot[50] <= 0 <= boot[1949],
                             'shown': res['carriedPayrollShare'] <= 0.30 and not carried & top10 and not whole, 'carriedTop10': sorted(carried & top10), 'carriedIndustries': whole,
                             'basisChanges': cut,
                             'staffChange': rd(sum(n * (b - a) for n, a, b in staff) / sum(n for n, *_ in staff)) if staff else None, 'staffCompanies': len(staff),
                             'staffBasisChanges': len(both_staff) - len(staff)}
years[LATEST]['companiesUnread'] = len(report['unread'])  # queued filers not read yet: in no figure, counted here
# The level and the change agree (decision 10): the latest year is the pooled figure, and each year before it is the
# year after it less that year's like-for-like change, so filers joining the group (412 companies in FY2022-23, over
# 1,000 in FY2025-26) never read as a change in pay. Each year's own pooled figure stays as pooledHeadline, the check.
for y in sorted(years, reverse=True):
    years[y]['pooledHeadline'] = years[y]['headline']
    ch, nx = yoy.get(f'{y}>{nxt(y)}'), years.get(nxt(y))
    if ch and nx:
        h = nx['headline'] - ch['change']; tot = years[y]['ownedPayroll']
        years[y].update(headline=rd(h), womenWages=round(h * tot), gap=round((0.5 - h) * tot))
tot = sum(constituents.values())
group_ix = dict(id='brsrall', name='All BRSR filers', country='IN', market='India', exchange='NSE and BSE', weightsAsOf=LATEST,
                kind='group', headlineLabel="Women's share of pay (all payroll)",
                weighting="payroll: each company's own payroll that year",
                constituents=[dict(symbol=s, weight=rd(p / tot, 6)) for s, p in sorted(constituents.items(), key=lambda kv: -kv[1])],
                missing=sorted(group - set(constituents) - gone), left=sorted(gone - set(constituents)), years=years, yoy=yoy)

# Nivel's own indexes again, so their headlines agree with company pages the corrections above changed. index_calc's
# shares depend on public float only (market cap cancels), so an index whose figures come out the same keeps its
# stored record and only a changed one is replaced.
mcap = {s: c['marketCapCr'] * 1e7 for s, c in companies.items() if c.get('marketCapCr')}
shp = {s: {'public': c['publicFloatPct']} for s, c in companies.items() if c.get('publicFloatPct')}
indexes = {}
for k, ix in stored_ix.items():
    mem = [x['symbol'] for x in ix['constituents']] + list(ix.get('missing') or [])
    _, res, yy = index_calc(mem, companies, mcap, shp)
    key = lambda yrs, chg: ({y: (v['headline'], v['companiesCovered'], v['companiesReported']) for y, v in yrs.items()}, {p: (v['change'], v['companies']) for p, v in chg.items()})
    if key(res, yy) == key(ix['years'], ix['yoy']): indexes[k] = ix
    else: indexes[k] = dict(ix, years=res, yoy=yy); report.setdefault('indexesChanged', []).append(k)

# A figure under an open data check (Nivel's stored value against the build's reading, or a one-year move of more than
# 15 points) is marked, so the profile's insights leave it alone until the owner settles it.
for s, y, *_ in report['crossCheck'] + report.get('jumps', []):
    if companies[s]['years'].get(y): companies[s]['years'][y]['held'] = True

os.makedirs(os.path.join(dump, 'out'), exist_ok=True)
json.dump(companies, open(os.path.join(dump, 'out', 'companies.json'), 'w'), separators=(',', ':'))
json.dump({**indexes, 'brsrall': group_ix}, open(os.path.join(dump, 'out', 'indexes.json'), 'w'), separators=(',', ':'))
report.update(companies=len(companies), groupMembers=len(group), left=sorted(gone), growth={y: rd(v) for y, v in GROW.items()},
              group={y: {f: v.get(f) for f in v if f != 'sectors'} for y, v in years.items()}, yoy=yoy)
json.dump(report, open(os.path.join(dump, 'out', 'report.json'), 'w'), indent=1)
print(json.dumps({k: (len(v) if isinstance(v, (list, dict)) else v) for k, v in report.items() if k not in ('group', 'yoy', 'growth')}))
for y, v in report['group'].items():
    print(y, {f: v[f] for f in ('headline', 'carryForwardHeadline', 'companiesCovered', 'companiesReported', 'companiesCarried', 'carriedPayrollShare', 'estimatedPayrollShare', 'workforce', 'boards')})
for k, v in yoy.items(): print(k, v)
