"""Cut each company's BRSR down to the tables a checker reads, and write the parser's candidates beside them (PARITY-123).
Uses the latest downloaded report when it is newer than the Kaggle FY2024-25 file, else the Kaggle file.

    python3 snippets.py <data dir> <queue key> [<queue key> ...]

Writes <data>/snippets/<key>.txt (headed sections, whitespace squeezed) and <data>/cand/<key>.json.
"""
import json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from brsr_fields import candidates, is_latest

data = sys.argv[1]
q = json.load(open(os.path.join(data, 'queue.json')))
SECTIONS = [
    ('Section A: identity and year', r'Corporate\s+Identity\s+Number|Name\s+of\s+the\s+(Listed\s+)?Entity', 2, 30),
    ('Section A: business activities and NIC code', r'Details\s+of\s+business\s+activities|Products\s*/\s*Services\s+sold', 1, 22),
    ('Section A Q18-19: locations, markets and exports', r'Number\s+of\s+locations\s+where\s+plants', 1, 22),
    ('Section A Q20: employees and workers (and differently abled)', r'Employees\s+and\s+workers\s*\(including\s+differently\s+abled\)', 1, 32),
    ('Section A: women on the board and in KMP', r'Participation\s*/?\s*Inclusion\s*/?\s*Representation\s+of\s+women', 1, 12),
    ('Section A: turnover of permanent employees and workers (three years)', r'Turnover\s+rate\s+for\s+permanent\s+employees', 1, 16),
    ('Section A Q24: CSR, turnover and net worth', r'Whether\s+CSR\s+is\s+applicable', 1, 8),
    ('Section B Q5-7: commitments, goals and targets, and performance against them', r'Specific\s+commitments,?\s+goals\s+and\s+targets', 1, 36),
    ('Principle 3 EI 1: well-being measures (maternity, paternity, day care)', r'Details\s+of\s+measures\s+for\s+the\s+well-being', 1, 34),
    ('Principle 3 EI 5: return to work and retention after parental leave', r'Return\s+to\s+work\s+and\s+Retention\s+rates', 1, 14),
    ('Principle 3 EI 7: union membership', r'Membership\s+of\s+employees(\s+and\s+workers?)?\s+in\s+association', 1, 16),
    ('Principle 3 EI 8: training', r'Details\s+of\s+training\s+given\s+to\s+employees\s+and\s+workers', 1, 20),
    ('Principle 3 EI 9: performance and career development reviews', r'Details\s+of\s+performance\s+and\s+career\s+development\s+reviews', 1, 16),
    ('Principle 5 EI 2: minimum wages', r'Details\s+of\s+minimum\s+wages\s+paid', 1, 26),
    ('Principle 5 EI 3a: median remuneration by gender', r'Median\s+remuneration\s*/?\s*(salary\s*/?\s*)?wages', 3, 24),
    ('Principle 5 EI 3b: gross wages paid to females', r'Gross\s+wages\s+paid\s+to\s+females\s+as\s+%\s+of\s+total\s+wages\s+paid', 1, 12),
    ('Principle 5 EI 6-7: complaints (sexual harassment, discrimination)', r'Number\s+of\s+Complaints\s+on\s+the\s+following\s+made\s+by\s+employees', 1, 26),
]

def source(e):
    def dated(f):
        fy = f.get('fy') or ''
        return is_latest(fy) or ((not fy or fy.startswith('~')) and bool(re.search(r'2025-?26|FY ?26|2026', f.get('labelFy') or '')))
    ok = [f for f in e.get('fetches', []) if f.get('status') == 'ok' and f.get('hasBRSR') and dated(f)]
    if ok and os.path.exists(os.path.join(data, 'latest', 'txt', e['key'] + '.txt')):
        return os.path.join(data, 'latest', 'txt', e['key'] + '.txt'), ok[-1]['fy'], 'company site', ok[-1]['url']
    if e.get('kaggleFile'):
        return os.path.join(data, 'kaggle', 'txt', e['kaggleFile'][:-4] + '.txt'), e.get('kaggleFY'), 'Kaggle BRSR dataset', e['kaggleFile']
    return None, None, None, None

def squeeze(l): return re.sub(r'\s{2,}', ' | ', l.strip())

# Passages that may break staff down by level or job function, beyond BRSR's mandatory tables (READING.md, ladder and functions).
LEVEL = r'senior\s+management|middle\s+management|junior\s+management|top\s+management|senior\s+leader|leadership\s+team|management\s+cadre|\bgrades?\b|\bbands?\b|\bcadres?\b|management\s+levels?|executive\s+committee|women\s+in\s+(management|leadership)|first[- ]line'
FUNC = r'\bSTEM\b|engineering|technolog|R\s*&\s*D|research|manufactur|plant|operations|sales|customer|front[- ]line|support\s+functions?|corporate\s+functions?'
GENDER = r'\b(wom[ae]n|female|male|men|gender)\b'
# Annual-report extras (READING.md, B): flows, targets, leadership, ownership, policies, pay ratio. Each is one search
# with its own budget, since these passages carry few figures and would lose out to tables in `deep`.
EXTRAS = [
    ('hires, promotions and leavers', r'new\s+(hires|joinees|joiners|recruits)|recruit\w*|promot\w+|attrition|leavers|exits', 8),
    ('diversity targets', r'(target|aspir\w*|aim|goal|commit\w*)[^.]{0,80}(wom[ae]n|female|gender)[^.]{0,80}20[2-5]\d|(wom[ae]n|female|gender)[^.]{0,80}(by|till)\s+(FY\s*)?20[2-5]\d', 6),
    ('leadership: CEO, chair, women directors', r'Managing\s+Director|Chief\s+Executive\s+Officer|Chair(man|person|woman)|Woman\s+(Independent\s+)?Director|Independent\s+Wom[ae]n', 6),
    ('ownership: shareholding pattern', r'Promoter\s*(and|&)\s*Promoter\s+Group|Category\s+of\s+(share)?holder|Shareholding\s+Pattern', 4),
    ('policies: leave, creche, return to work', r'maternity\s+leave|paternity\s+leave|parental\s+leave\s+policy|cr[eè]che|return[- ]to[- ]work|second\s+career|returnship|flexible\s+work', 6),
    ('pay ratio to the median employee', r'ratio\s+of\s+the\s+remuneration\s+of\s+each\s+director|percentage\s+increase\s+in\s+the\s+median\s+remuneration', 3),
]

def extras(L):
    out = []
    for title, pat, budget in EXTRAS:
        ws, end = [], -1
        for i, l in enumerate(L):
            if i <= end or not re.search(pat, l, re.I): continue
            ws.append([squeeze(x) for x in L[max(0, i - 1):i + 5] if x.strip()]); end = i + 4
            if len(ws) >= budget: break
        out.append((title, ws))
    return out

def deep(L, budget=20):
    """Up to `budget` windows of 9 lines where a level or function word meets a gender word and figures."""
    out, end = [], -1
    for i, l in enumerate(L):
        if i <= end or not (re.search(LEVEL, l, re.I) or re.search(FUNC, l, re.I)): continue
        w = L[max(0, i - 2):i + 7]; txt = ' '.join(w)
        if not re.search(GENDER, txt, re.I) or len(re.findall(r'\d+(\.\d+)?\s*%|\b\d{2,}\b', txt)) < 3: continue
        if re.search(r'Employees\s+and\s+workers\s*\(including|Median\s+remuneration|Return\s+to\s+work', txt, re.I): continue
        out.append([squeeze(x) for x in w if x.strip()]); end = i + 6
        if len(out) >= budget: break
    return out

os.makedirs(os.path.join(data, 'snippets'), exist_ok=True); os.makedirs(os.path.join(data, 'cand'), exist_ok=True)
for key in sys.argv[2:]:
    e = q[key]; path, fy, kind, ref = source(e)
    if not path or not os.path.exists(path):
        print(key, 'no text'); continue
    t = open(path, errors='ignore').read(); L = t.splitlines()
    out = [f'# {key}  {e.get("name") or ""}', f'Source: {kind}, {ref}', f'Reporting year read by the parser: {fy}', '']
    for title, head, before, after in SECTIONS:
        hits, end = [], -1
        for i, l in enumerate(L):
            if len(hits) < 2 and i > end and re.search(head, l, re.I): hits.append(i); end = i + after
        out.append(f'## {title}')
        if not hits: out.append('(not found by heading search)')
        for i in hits:
            out += [squeeze(x) for x in L[max(0, i - before):i + after] if x.strip()]
            out.append('...')
        out.append('')
    ar = os.path.join(data, 'latest', 'txt', key + '.ar.txt')
    srcs = [('the report above', L)] + ([('the annual report (' + ar + ')', open(ar, errors='ignore').read().splitlines())] if os.path.exists(ar) else [])
    out.append('## Deep: passages that may give women and men by level or job function')
    out.append('(Candidates found by keyword. Read the full text around any table that continues, and record ladder and functions rows per READING.md.)')
    for name, LL in srcs:
        ws = deep(LL)
        out.append(f'### From {name}: {len(ws)} passages')
        for w in ws: out += w + ['...']
    out.append('## Annual-report extras: flows, targets, leadership, ownership, policies, pay ratio')
    out.append('(Candidates found by keyword. Grep the full text for more before deciding a field is absent.)')
    for name, LL in srcs[1:] or srcs:
        for title, ws in extras(LL):
            out.append(f'### {title}, from {name}: {len(ws)} passages')
            for w in ws: out += w + ['...']
    open(os.path.join(data, 'snippets', key + '.txt'), 'w').write('\n'.join(out))
    c = candidates(t); c.update(sourceKind=kind, sourceRef=ref)
    json.dump(c, open(os.path.join(data, 'cand', key + '.json'), 'w'), indent=1, ensure_ascii=False)
    print(key, kind, fy, len('\n'.join(out)), 'chars')
