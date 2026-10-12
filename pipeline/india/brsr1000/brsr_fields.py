"""BRSR fields from pdftotext -layout text, for the BRSR filer build (PARITY-123). These are candidates for checking,
not final values: every field that reaches Nivel is read from its table by a checker and compared with these.
Wage figures keep the filing's own unit."""
import re

NUM = re.compile(r"(?<![\w.])(\d{1,3}(?:,\d{2,3})+(?:\.\d+)?|\d+(?:\.\d+)?|Nil|NIL|nil|NA|N\.A\.?|N/A|Not Applicable|-{1,2}|–|—)(?![\w])%?")

def nums(s):
    out = []
    for t in NUM.findall(s):
        if t in ('Nil', 'NIL', 'nil', '-', '--', '–', '—'): out.append(0.0)
        elif t.startswith(('NA', 'N.A', 'N/A', 'Not')): out.append(None)
        else: out.append(float(t.replace(',', '')))
    return out

def after(line, label):
    m = re.search(label, line, re.I)
    return nums(line[m.end():]) if m else None

def find(L, head, start=0):
    return next((k for k in range(start, len(L)) if re.search(head, L[k], re.I)), -1)

BRSR_MARKS = [r'Section\s*A\W{0,6}General\s+Disclosures', r'Corporate\s+Identity\s+Number', r'Employees\s+and\s+workers\s*\(including\s+differently',
              r'Essential\s+Indicators', r'Leadership\s+Indicators', r'Gross\s+wages\s+paid\s+to\s+females', r'Turnover\s+rate\s+for\s+permanent',
              r'Return\s+to\s+work\s+and\s+Retention', r'Median\s+remuneration', r'Financial\s+year\s+(for\s+which|reported)', r'Principle\s+[1-9]\b']

CIN = r'(?<![A-Z0-9])([LU]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6})(?!\d)'  # a company's CIN, also inside a file name like Kamdhenu_L27101...pdf

def is_brsr(t):
    """Holds a BRSR, not just a mention of one: "Business Responsibility" plus at least three of BRSR's own sections or
    tables. Single phrases failed: 7% of BRSRs word Section A differently, and some never print "Essential Indicators".
    Seven or more of its tables count without the phrase: some print the title only as an image (Gateway, FY2025-26)."""
    n = sum(bool(re.search(m, t, re.I)) for m in BRSR_MARKS)
    return (bool(re.search(r'Business\s+Responsibility', t, re.I)) and n >= 3) or n >= 7

def fy_start(fy):
    """The year a reporting year starts in ('2025-26' and '~2025-26' give 2025; 'CY2025', a January to December year, gives 2025),
    or None when it was not read ('unread', None)."""
    m = re.fullmatch(r'~?(20\d\d)-\d\d|CY(20\d\d)', fy or '')
    return int(m.group(1) or m.group(2)) if m else None
def is_latest(fy):  # FY2025-26 or later (a calendar 2025 report counts: it is the year that ends inside FY2025-26)
    return (fy_start(fy) or 0) >= 2025

def reporting_year(t):
    """'2025-26', 'CY2025', '~2025-26' when only inferred from FY mentions, 'unread', or None."""
    t = t.replace('‐', '-').replace('‑', '-')  # Unicode and non-breaking hyphens (Mastek prints "2025‑26")
    m = re.search(r'Financial\s+year\s+(?:for\s+which\s+(?:the\s+)?(?:BRSR\s+|report(?:ing)?)|reported)([\s\S]{0,220})', t, re.I)
    if not m:
        # No Section A label: the latest year the report mentions at least twice. A BRSR names its own year and the one
        # before it about equally (current and prior columns), so the most frequent would often be the earlier one.
        # Scan the BRSR itself (from Section A on), not the whole annual report around it.
        a0 = re.search(r'Details\s+of\s+the\s+listed\s+entity|Corporate\s+Identity\s+Number|Section\s*A\W{0,6}General\s+Disclosures', t, re.I)
        c = {}
        for zone in ([t[a0.start():a0.start() + 60000]] if a0 else []) + [t[:60000]]:  # the cover pages if Section A names none
            for a, b in re.findall(r'(?:FY|F\.Y\.|Financial\s+Year)\s*[:\-]?\s*(20[12]\d)\s*[-–/]\s*(?:20)?(\d\d)(?!\d)', zone, re.I):
                # FY2025-26 is the latest year any report in this build can cover; later years are targets and outlook.
                if int(b) == (int(a) + 1) % 100 and 2020 <= int(a) <= 2025: c[f'{a}-{b}'] = c.get(f'{a}-{b}', 0) + 1
            if c: break
        seen = [y for y, n in c.items() if n >= 2] or list(c)
        return '~' + max(seen) if seen else None
    # The label's own value only: the next rows (paid-up capital, or a row of its own starting "Previous Financial Year")
    # carry other years. A label that itself says "(current financial year/ previous financial year/ ...)" is kept.
    # Some print both years in the label's row ("Previous Financial Year: 2024-25 ... Current Financial Year: 2025-26"):
    # the current one's value is the year.
    cur = re.search(r'Current\s+(?:Financial\s+)?Year\s*[:\-–]([\s\S]{0,120})', t[m.start(1):m.start(1) + 600], re.I) if re.search(r'Previous\s+(?:Financial\s+)?Year\s*[:\-–]', m.group(1), re.I) else None
    w = re.sub(r'Paid[\s-]*up[\s\S]*|\n[\s|]*Previous\s+(Financial\s+)?Year[\s\S]*|Previous\s+(Financial\s+)?Year\s*[:\-–][\s\S]*', '', cur.group(1) if cur else m.group(1), flags=re.I)
    s = re.search(r'\bFY\s?(\d\d)\b(?!\s*[-–/])', w, re.I)
    if s and not re.search(r'20[12]\d', w): return f'20{int(s.group(1)) - 1:02d}-{s.group(1)}'  # "FY26"
    # Two-column layouts put other text beside the label ("Regulations, 2015"): only years a BRSR can cover count.
    w = re.sub(r'Regulations,?\s*20\d\d|Act,?\s*20\d\d', ' ', w, flags=re.I)
    y = [int(a) for a in re.findall(r'(?<!\d)(20[12]\d)(?!\d)', w) if 2020 <= int(a) <= 2027]
    s = re.search(r'(?<!\d)(20[12]\d)\s*[-–/]\s*(?:20)?(\d\d)(?!\d)', w)
    if s and int(s.group(2)) == (int(s.group(1)) + 1) % 100: return f'{s.group(1)}-{s.group(2)}'
    if y and re.search(r'Jan', w, re.I) and re.search(r'Dec', w, re.I): return f'CY{max(y)}'
    if len(y) > 1 and y[1] == y[0] + 1: return f'{y[0]}-{str(y[1])[2:]}'  # "April 1, 2025 to March 31, 2026"
    # A transitional year longer than twelve months is the year it ends in: Siemens' "October 1, 2024 - March 31, 2026
    # (18 Months Period)" is its FY2025-26 filing.
    if len(y) > 1 and max(y) - min(y) >= 2: return f'{max(y) - 1}-{str(max(y))[2:]}'
    if y: return f'{min(y)}-{str(min(y) + 1)[2:]}' if len(set(y)) > 1 or re.search(r'April|01[./-]04', w, re.I) else f'{y[0] - 1}-{str(y[0])[2:]}'
    # A two-column layout can push the value past the label's window ("1st January to 31st December 2023" a few lines down).
    far = re.search(r'January[\s\S]{0,40}?(?:to|-|–)[\s\S]{0,12}?December\s*(?:\d{1,2}(?:st|nd|rd|th)?)?,?\s*(20[12]\d)', t[m.start(1):m.start(1) + 900], re.I)
    if far: return f'CY{far.group(1)}'
    return 'unread'

def _clean(x): return re.sub(r'(FY|F\.Y\.)?\s*20\d\d\s*[-–/]\s*(20)?\d\d|20\d\d|E-?\s*3\s*\(?b\)?|3\s*\(?b\)', ' ', x, flags=re.I)

def wage_share(L):
    """Women's share of wages (P5 EI 3b) as [current, prior] percentages, 'absolute', 'unread' or None."""
    seen = absolute = False
    for i, l in enumerate(L):
        m = re.search(r'Gross\s+wages\s+paid\s+to\s+females?([^|\d]*)', l, re.I)
        if not m: continue
        seen = True
        if re.search(r'Enabling|Principle|Section\s+C|E-?\s*3|Reasonable|Limited assurance|following format|given format|Boundary', l, re.I): continue
        rest = l[m.end():]
        if re.search(r'\d{1,3}(,\d{2,3}){2,}', rest) and '%' not in rest: absolute = True; continue
        v = [n for n in nums(_clean(rest)) if n is not None and 0 <= n <= 100]
        if v: return v[:2]
        for x in L[i + 1:i + 3]:
            if re.search(r'[A-Za-z]{4}', x): break
            v = [n for n in nums(_clean(x)) if n is not None and 0 <= n <= 100]
            if v: return v[:2]
    return 'absolute' if absolute else ('unread' if seen else None)

def total_wages(L):
    """The 'Total wages' row beside P5 EI 3b, in the filing's unit: [current, prior] or None."""
    i = find(L, r'Gross\s+wages\s+paid\s+to\s+females')
    while i >= 0:
        for x in L[i:i + 10]:
            if re.match(r'^\W*Total\s+wages', x.strip(), re.I):
                v = [n for n in nums(x) if n is not None]
                if v: return v[:2]
        i = find(L, r'Gross\s+wages\s+paid\s+to\s+females', i + 1)
    return None

def headcount(L):
    """Section A Q20(a): permanent and other-than-permanent employees and workers, each as (total, men, women)."""
    i = find(L, r'Employees\s+and\s+workers\s*\(including\s+differently\s+abled\)')
    if i < 0: return None
    out = {}
    rows = (('permEmployees', r'Permanent\s*\(\s*D\s*\)'), ('tempEmployees', r'Other\s+than\s+permanent\s*\(\s*E\s*\)'),
            ('permWorkers', r'Permanent\s*\(\s*F\s*\)'), ('tempWorkers', r'Other\s+than\s+permanent\s*\(\s*G\s*\)'))
    for l in L[i:i + 30]:
        if re.search(r'differently\s+abled\s+employees', l, re.I) and out: break
        for k, lab in rows:
            if k in out: continue
            v = [n for n in (after(l, lab) or []) if n is not None]
            if len(v) >= 4: out[k] = dict(total=v[0], men=v[1], women=v[3])
    return out or None

def women_top(L):
    i = find(L, r"Participation\s*/?\s*Inclusion\s*/?\s*Representation of women")
    out = {}
    for l in (L[i:i + 16] if i >= 0 else []):
        for key, lab in (("board", r"Board of Directors[^|\d]{0,12}"), ("kmp", r"Key Manage\w* Personnel[^|\d]{0,12}")):
            if key in out: continue
            v = after(l, lab)
            if v and len(v) >= 2 and v[0] and 1 <= v[0] < 100: out[key] = dict(total=v[0], women=v[1] or 0.0)
    return out

def turnover(L):
    i = find(L, r"Turnover rate for permanent employees")
    W = L[i:i + 18] if i >= 0 else []
    others = any(re.search(r"Male\W+Female\W+Others", l, re.I) for l in W)
    for l in W:
        v = after(l, r"Permanent\s*(Employees?)?")
        if v and len(v) >= 3 and not re.search(r"Workers", l, re.I):
            return dict(men=v[0], women=v[1], total=v[3] if others and len(v) > 3 else v[2])
    return {}

def parental(L):
    i = find(L, r"Return to work and Retention rates")
    out = {}
    for l in (L[i:i + 16] if i >= 0 else []):
        for key, lab in (("men", r"^\s*\|?\s*Male\b"), ("women", r"^\s*\|?\s*Female\b")):
            if key in out: continue
            v = after(l, lab)
            if v is not None and len(v) >= 2: out[key] = dict(returnRate=v[0], retentionRate=v[1])
    return out

UNITS = [(r"in\s*crores?|crores?\)", "crore"), (r"in\s*lakhs?|in\s*lacs?|lakhs?\)", "lakh"), (r"in\s*million|mn\)", "million"), (r"in\s*thousands?|'000", "thousand")]
def median_pay(L):
    i = find(L, r"Median remuneration\s*/?\s*(salary\s*/?\s*)?wages")
    if i < 0: return {}
    unit = next((u for pat, u in UNITS if re.search(pat, " ".join(L[max(0, i - 3):i + 10]), re.I)), "rupee")
    out = {"unit": unit}
    labels = (("board", r"Board of Directors\s*(\(BoD\))?\*?\^?|\bBoD\b\*?"), ("kmp", r"Key Manag\w* Personnel\s*(\(KMP\))?\*?\^?|\bKMPs?\b\*?\^?"),
              ("employees", r"Employees other than (the )?(BoD|Board)[\w\s&]*?(KMP|Personnel)?\*?\^?"), ("workers", r"^\s*\|?\s*Workers\*?|\|\s*Workers\*?"))
    for l in L[i:i + 26]:
        for key, lab in labels:
            if key in out: continue
            v = after(l, lab)
            if v and len(v) >= 2 and v[0] is not None:
                v = v + [None] * (4 - len(v))
                out[key] = dict(men=v[0], menMedian=v[1], women=v[2], womenMedian=v[3])
    return out

def entity(t):
    """Name, CIN and website from Section A."""
    m = re.search(r'Name\s+of\s+the\s+(Listed\s+)?(?:Entity|Company)(?!\s*\()\W{0,6}\s*([^\n]{3,120})', t, re.I)
    c = re.search(r'\b([LU]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6})\b', t[:40000])
    if not m:
        # Some filings head the page with the name instead of a Section A row: take the first "... Limited" line.
        m = re.search(r'^\s*()((?:[A-Z][\w&.,\'-]*\s+){0,8}(?:Limited|LIMITED|Ltd\.?))\s*$', t[:6000], re.M)
    w = re.search(r'Website[\s\S]{0,200}', t, re.I)
    site = None
    if w:
        s = re.search(r'(?:https?://)?(?:www\.)?([a-z0-9][a-z0-9.-]{1,60}\.(?:co\.in|com|in|net|org|biz|co))(?![a-z])', re.sub(r'-\s+', '-', re.sub(r'\s+', ' ', w.group(0))), re.I)
        site = s.group(1).lower().split('www.')[-1] if s else None
    return dict(name=re.sub(r'\s{2,}.*', '', m.group(2)).strip(' :|-') if m else None, cin=c.group(1) if c else None, website=site)

def candidates(t):
    L = t.splitlines()
    return dict(fy=reporting_year(t), **entity(t), wageShare=wage_share(L), totalWages=total_wages(L), headcount=headcount(L),
                women=women_top(L), medianPay=median_pay(L), turnover=turnover(L), parental=parental(L))
