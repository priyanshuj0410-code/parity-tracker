"""Completeness of the mandatory BRSR gender measures (PARITY-129), per company, for one store (the FY2025-26 build or a
history store). For each measure: is it in the checked reading, and was its table in the snippet the reader saw?

    python3 audit.py <data dir>

A measure the reading lacks although its table was in the snippet is a likely miss (to read again); one whose table was
not in the snippet is a gap in the text (a scan, an image-drawn table, or a report without it). Writes <data>/audit.json.
Nivel's own companies read for finer levels only (done-deep) are left out: Nivel holds their core figures."""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from brsr_fields import fy_start

data = sys.argv[1]

def filled(x):
    """Any number anywhere in x."""
    if isinstance(x, dict): return any(filled(y) for y in x.values())
    if isinstance(x, list): return any(filled(y) for y in x)
    return isinstance(x, (int, float)) and not isinstance(x, bool)

# (id, label, snippet section the table is cut into, the reading's field, first year the BRSR asks for it)
MEASURES = [
    ('headcount', 'Employees and workers by gender (Section A Q20a)', 'Section A Q20', 'headcount', 2022),
    ('disabled', 'Differently abled by gender (Q20b)', 'Section A Q20', 'disabledHeadcount', 2022),
    ('board', 'Women on the board (Q21)', 'Section A: women on the board', 'board', 2022),
    ('kmp', 'Women among KMP (Q21)', 'Section A: women on the board', 'kmp', 2022),
    ('turnover', 'Turnover by gender (Q22)', 'Section A: turnover', 'turnover', 2022),
    ('benefits', 'Benefits by gender (P3 EI 1a, 1b)', 'Principle 3 EI 1', 'wellbeing', 2022),
    ('wellbeingSpend', 'Well-being spend, % of revenue (P3 EI 1c)', 'Principle 3 EI 1', 'wellbeingSpend', 2023),
    ('parental', 'Return to work and retention after parental leave (P3 EI 5)', 'Principle 3 EI 5', 'parental', 2022),
    ('unions', 'Union membership by gender (P3 EI 7)', 'Principle 3 EI 7', 'unions', 2022),
    ('training', 'Training by gender (P3 EI 8)', 'Principle 3 EI 8', 'training', 2022),
    ('reviews', 'Performance reviews by gender (P3 EI 9)', 'Principle 3 EI 9', 'reviews', 2022),
    ('minWage', 'Minimum wage by gender (P5 EI 2)', 'Principle 5 EI 2', 'minWage', 2022),
    ('medianPay', 'Median pay by gender (P5 EI 3a)', 'Principle 5 EI 3a', 'medianPay', 2022),
    ('wageShare', "Women's share of wages (P5 EI 3b)", 'Principle 5 EI 3b', 'wageShare', 2023),
    ('complaints', 'Complaints: harassment, discrimination, wages (P5 EI 6-7)', 'Principle 5 EI 6-7', 'complaints', 2022),
]

def sections(key):
    """{section title: True if its table was found} for the company's snippet."""
    p = os.path.join(data, 'snippets', key + '.txt')
    if not os.path.exists(p): return None
    out, title = {}, None
    for line in open(p, errors='ignore'):
        if line.startswith('## '): title = line[3:].strip(); out[title] = True
        elif title and line.strip() == '(not found by heading search)': out[title] = False
    return out

Q = json.load(open(os.path.join(data, 'queue.json')))
rows, summary = {}, {m[0]: dict(label=m[1], have=0, nil=0, missed=0, notInText=0, notAsked=0) for m in MEASURES}
for k, q in Q.items():
    if q['status'] not in ('done-latest', 'done-kaggle', 'done'): continue
    v = json.load(open(os.path.join(data, 'verified', k + '.json'))) if os.path.exists(os.path.join(data, 'verified', k + '.json')) else None
    if not v: continue
    secs, year, r = sections(k), fy_start(v.get('fy')) or 0, {}
    nil = set((v.get('gapFill') or {}).get('nil') or [])  # tables the report gives as nil: answered, with nothing to record
    for mid, label, sec, field, since in MEASURES:
        if year and year < since: state = 'notAsked'
        elif filled(v.get(field)): state = 'have'
        elif field in nil: state = 'nil'
        else:
            found = None if secs is None else next((ok for t, ok in secs.items() if t.startswith(sec)), None)
            state = 'missed' if found else 'notInText'
        r[mid] = state; summary[mid][state] += 1
    rows[k] = dict(fy=v.get('fy'), measures=r)
json.dump(dict(store=data, companies=len(rows), summary=summary, rows=rows), open(os.path.join(data, 'audit.json'), 'w'), indent=1)
print(f'{len(rows)} companies with a checked reading in {data}')
for mid, s in summary.items():
    n = s['have'] + s['nil'] + s['missed'] + s['notInText']
    print(f"  {s['label'][:58]:58} answered {s['have'] + s['nil']:4} of {n:4}  ({100 * (s['have'] + s['nil']) / n if n else 0:5.1f}%)  nil {s['nil']:3}  likely missed {s['missed']:3}  not in text {s['notInText']:3}")
