"""Every company's identifiers (PARITY-129): CIN, ISIN, NSE symbol, BSE scrip ID and BSE scrip code.

    python3 identifiers.py <data dir>

Writes <data>/identifiers.json: {companies: {key: {cin, isin, nse, bseId, bseCode, cinNote, source: {field: where}}}, gaps}.
cinNote says why a body set up by its own Act (SBI, LIC, the nationalised banks) has no CIN.
Each field comes from the first source that has it:
  - by hand: <data>/identifiers_manual.json, {key: {field: value, "source": ...}}, for what nothing below gives;
  - CIN: the checked reading (Section A Q1), then the queue, then the company's own filing text;
  - ISIN, NSE symbol and BSE scrip ID: AMFI's December 2025 list, through rankings.py's match, then the queue;
  - BSE scrip code (the six digits): the filing text, from its cover letter to the exchanges or its listing details.
The filing texts are the FY2025-26 download (latest/txt) and the FY2024-25 Kaggle filing (kaggle/txt). A CIN read
from a scan has its OCR slips put right by position (letters where letters belong: GOI, not G01)."""
import json, os, re, sys
from collections import Counter

data = sys.argv[1]
P = lambda *a: os.path.join(data, *a)
load = lambda p, d=None: json.load(open(p)) if os.path.exists(p) else d

CIN = re.compile(r'(?<![A-Z0-9])([LU][0-9OIl]{5}[A-Z0-9]{2}[0-9OIl]{4}[A-Z0-9]{3}[0-9OIl]{6})(?![0-9])')
VALID = re.compile(r'^[LU]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}$')
def fix_cin(c):
    """Letters and digits by position: an OCR '0' in the state or type code is 'O', an 'O' in a number is '0'."""
    if not c: return None
    to_d, to_l = str.maketrans('OIlSB', '01158'), str.maketrans('01582', 'OISBZ')
    c = c[0] + c[1:6].translate(to_d) + c[6:8].translate(to_l) + c[8:12].translate(to_d) + c[12:15].translate(to_l) + c[15:].translate(to_d)
    return c if VALID.match(c) else None
ISIN = re.compile(r'(?<![A-Z0-9])(IN[EF9][A-Z0-9]{4}01[A-Z0-9]{2}\d)(?![A-Z0-9])')  # IN, issuer, security type 01 (equity), serial, check digit
# A BSE scrip code only where the filing labels it ("Scrip Code: 500325", "BSE Scrip Code - 532424"), and only from
# the company's own first pages (its cover letter and listing details), not a list of other companies' codes.
BSE_CODE = re.compile(r'(?:BSE\s*(?:Limited|Ltd\.?)?\s*[:\-–(]?\s*)?(?:scrip|security|stock)\s*(?:code|id)\s*(?:on\s*BSE|of\s*BSE|\(BSE\)|-\s*BSE|BSE)?\s*(?:no\.?)?\s*[:\-–]?\s*(5\d{5})(?!\d)', re.I)
def text(k, v):
    out = []
    for p in (P('latest', 'txt', k + '.txt'), P('latest', 'txt', k + '.ar.txt')) + ((P('kaggle', 'txt', v['kaggleFile'][:-4] + '.txt'),) if v.get('kaggleFile') else ()):
        if os.path.exists(p): out.append((os.path.relpath(p, data), open(p, errors='ignore').read()))
    return out

# Bodies set up by an Act of Parliament, not under the Companies Act, have no CIN.
NO_CIN = [(r'^State Bank of India', 'Constituted under the State Bank of India Act, 1955, so it has no CIN.'),
          (r'^Life Insurance Corporation', 'A statutory corporation under the Life Insurance Corporation Act, 1956, so it has no CIN.'),
          (r'^(Bank of Baroda|Bank of India|Bank of Maharashtra|Canara Bank|Central Bank of India|Indian Bank|Indian Overseas Bank|Punjab National Bank|Punjab & Sind Bank|UCO Bank|Union Bank of India)\b',
           'A nationalised bank, constituted under the Banking Companies (Acquisition and Transfer of Undertakings) Acts, so it has no CIN.')]
Q = load(P('queue.json'))
for k, f in (load(P('pending.json'), {}) or {}).get('set', {}).items():  # as the queue will be once the next batch opens
    if k in Q: Q[k] = dict(Q[k], **f)
R = (load(P('rankings', 'fy2026-27.json'), {}) or {}).get('companies', {})
amfi = {x['isin']: x for x in load(P('rankings', 'amfi-dec2025.json'), {'rows': []})['rows'] if x.get('bseCap') or x.get('nseCap')}
manual = load(P('identifiers_manual.json'), {})
out, gaps = {}, Counter()
for k, v in Q.items():
    if v['status'] == 'merged': continue
    r, src, ver, docs = {}, {}, load(P('verified', k + '.json'), {}) or {}, None
    def put(field, value, where):
        if value and field not in r: r[field] = value; src[field] = where
    for f, x in (manual.get(k) or {}).items():
        if f != 'source': put(f, x, 'by hand: ' + (manual[k].get('source') or 'identifiers_manual.json'))
    put('cin', fix_cin(ver.get('cin')), 'checked reading')
    put('cin', fix_cin(v.get('cin')), 'queue')
    isin = (R.get(k) or {}).get('isin') or v.get('isin')
    put('isin', isin, "AMFI's December 2025 list" if (R.get(k) or {}).get('isin') else 'queue')
    row = amfi.get(isin) or {}
    put('nse', row.get('nseSymbol'), "AMFI's December 2025 list"); put('nse', v.get('symbol'), 'queue')
    put('bseId', row.get('bseSymbol'), "AMFI's December 2025 list")
    if not all(f in r for f in ('cin', 'isin', 'bseCode')):
        docs = text(k, v)
        for where, t in docs:
            if 'cin' not in r:
                m = re.search(r'Corporate\s+Identi(?:ty|fication)\s+Number[\s\S]{0,200}', t, re.I)
                c = m and next((fix_cin(x) for x in CIN.findall(m.group(0)) if fix_cin(x)), None)
                if not c:  # the CIN the document prints most often, in its first pages
                    cs = Counter(fix_cin(x) for x in CIN.findall(t[:60000])); cs.pop(None, None)
                    c = cs.most_common(1)[0][0] if cs else None
                put('cin', c, where)
            if 'isin' not in r:
                m = re.search(r'ISIN[\s\S]{0,80}', t); put('isin', m and next(iter(ISIN.findall(m.group(0))), None), where)
            if 'bseCode' not in r:
                # a letter that names another company's NSE symbol beside the code was copied from another filing (Power Mech's quotes Zen's)
                own = lambda m: not (lambda sy: sy and r.get('nse') and sy.group(1).upper() != r['nse'].upper())(re.search(r'Symbol\s*[:\-–]?\s*([A-Z0-9&\-]{2,})', t[max(0, m.start() - 200):m.end() + 200]))
                codes = Counter(m.group(1) for m in BSE_CODE.finditer(t[:30000]) if own(m))
                if len(codes) == 1 or codes and codes.most_common(2)[0][1] > codes.most_common(2)[1][1]: put('bseCode', codes.most_common(1)[0][0], where)
    if 'bseId' not in r: r.pop('bseCode', None); src.pop('bseCode', None)  # not on BSE (BSE Ltd itself trades only on NSE)
    if 'cin' not in r: put('cinNote', next((why for rx, why in NO_CIN if re.search(rx, v.get('name') or '', re.I)), None), 'the Act that set it up')
    for f in ('cin', 'isin', 'nse', 'bseCode'):
        if f not in r and not (f == 'cin' and 'cinNote' in r): gaps[f] += 1
    out[k] = dict(r, source=src)

# A code from a filing that another company also has is not trusted for either of them.
seen = Counter(x['bseCode'] for x in out.values() if 'bseCode' in x)
for x in out.values():
    if 'bseCode' in x and seen[x['bseCode']] > 1 and not x['source']['bseCode'].startswith('by hand'):
        x.pop('bseCode'); x['source'].pop('bseCode'); gaps['bseCode'] += 1
json.dump(dict(companies=out, gaps=dict(gaps)), open(P('identifiers.json'), 'w'), indent=1)
listed = lambda f: sum(1 for x in out.values() if f in x)
print(f"{len(out)} companies: cin {listed('cin')}, isin {listed('isin')}, NSE symbol {listed('nse')}, BSE scrip ID {listed('bseId')}, BSE code {listed('bseCode')}")
