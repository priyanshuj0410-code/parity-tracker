"""Who files a BRSR for FY2026-27 (PARITY-129), from AMFI's half-yearly lists of listed companies' average market cap.

    python3 rankings.py <data dir> <folder holding amfi-avg-mcap-dec<YYYY>.pdf>

Each recognised stock exchange prepares its own list on 31 December, ranking companies by average market cap from 1
July (LODR Regulation 3(2)(a), since the 31 December 2024 list). AMFI's December files average the same six months and
give BSE's, NSE's and MSEI's averages in columns of their own. BSE's and NSE's are ranked here as each exchange would
rank them, and a company in either top 1,000 counts as covered: the Expert Committee's reading (January 2024, para
1.3.2(b)), on which the regulation is silent. MSEI's list is left out. These are AMFI's figures, not the exchanges'
lists, so a company within 50 places of 1,000 is marked as near the cut-off. SME-listed companies, which file only
voluntarily (the proviso to Regulation 34(2)(f)), are not removed: AMFI's file does not mark them.

The 2022 and 2023 files stand in for the old rule's 31 March lists (market cap on one day; coverage never lapsed).

The sunset (Regulations 3(2A) and 3(2B)): coverage ends at the end of the financial year after the 31 December of the
third list in a row on which a company is outside the top 1,000, counting from the 2024 list. So no one drops out for
FY2026-27 on rank alone; a company outside on 2024 and 2025 that is outside again on 31 December 2026 files for the
last time for FY2026-27.

Writes <data>/rankings/amfi-dec<YYYY>.json (every row, with its rank on each exchange) and
<data>/rankings/fy2026-27.json: {companies: {key: {group, ...}}, outside: [top-1,000 companies not in the build]}.
<data>/rankings/manual.json holds what the lists cannot tell, by queue key: {isin} for a rename the names cannot match,
{note}, {edge: true}, and {group, note} where a filing settles it. Mergers and demergers come from <data>/relations.json
(relations.py): a listed company merged into another lends it its earlier ranks, and one merged away before the end of
FY2026-27 leaves."""
import difflib, html, json, os, re, subprocess, sys
from datetime import datetime
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import marks as M, relations as REL

data, src = sys.argv[1], sys.argv[2]
P = lambda *a: os.path.join(data, 'rankings', *a)
os.makedirs(P(), exist_ok=True)
TOP, EDGE = 1000, 50

ISIN = re.compile(r'IN[EF9][A-Z0-9]{8}\d')
VAL = re.compile(r'^[\d,]*\d\.\d+$|^[\d,]*\d$')
EXS = ('BSE', 'NSE', 'MSEI')

def parse(path):
    """AMFI's table, from word positions. Every row is one line of the PDF, a long name running under the ISIN cell.
    Each page heads its columns: '<exchange> Symbol' over the left-aligned symbols, '<exchange> 6 month' over the
    right-aligned averages, and 'Average of All' over the overall one. A value goes to the column it sits under, so a
    blank cell cannot shift it into the next exchange's column; MSEI's values are dropped."""
    xml = subprocess.run(['pdftotext', '-bbox', path, '-'], capture_output=True, text=True, check=True).stdout
    out, cols = [], None
    for pg in xml.split('<page ')[1:]:
        W = [(float(a), float(b), float(c), html.unescape(w)) for a, b, c, w in re.findall(r'<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="[\d.]+">([^<]*)</word>', pg)]
        lines = {}
        for w in W:
            lines.setdefault(next((y for y in lines if abs(y - w[1]) < 1.5), w[1]), []).append(w)
        L = [sorted(v) for _, v in sorted(lines.items())]
        sym, title = {}, {}
        first = next((i for i, ln in enumerate(L) if any(ISIN.search(w[3]) for w in ln)), len(L))
        for ln in L[:first]:  # the head, above the first row (footnotes below the rows name exchanges too)
            for i, (x0, _, x1, t) in enumerate(ln):
                nxt = ln[i + 1][3] if i + 1 < len(ln) else ''
                if t in EXS and nxt == '6': title[t] = x0
                elif t in EXS: sym[t] = x0  # '<exchange> Symbol', which 2024's MSEI head wraps over three lines
                if t == 'Average' and nxt == 'of': title['AVG'] = x0
        if len(sym) == 3 and len(title) == 4: cols = sym, title
        if not cols: continue
        sym, title = cols
        for ln in L:
            hit = next((i for i, w in enumerate(ln) if ISIN.search(w[3])), None)
            if hit is None or not ln[0][3].isdigit() or ln[0][0] > 80: continue
            iw = ln[hit]; m = ISIN.search(iw[3]); before, after = iw[3][:m.start()], iw[3][m.end():]  # an ISIN can be glued to a name or symbol
            name = [w[3] for w in ln[1:hit]] + ([before] if before else []) + [w[3] for w in ln[hit + 1:] if w[0] < iw[2] and not VAL.match(w[3])]
            x = dict(sr=int(ln[0][3]), name=' '.join(name).strip(), isin=m.group(0), cat=None)
            vals, syms = {}, {}
            for x0, x1, t in ([(iw[2], iw[2], after)] if after else []) + [(w[0], w[2], w[3]) for w in ln[hit + 1:] if w[0] >= iw[2]]:
                if t in ('Large', 'Mid', 'Small'): x['cat'] = t + ' Cap'; continue
                if t in ('Cap', '-'): continue
                if VAL.match(t) and ('.' in t or ',' in t):  # a value's right edge sits about 30pt right of its title
                    c, d = min(((c, abs(x1 - 30 - tx)) for c, tx in title.items()), key=lambda z: z[1])
                    if d <= 18 and (c not in vals or d < vals[c][1]): vals[c] = (float(t.replace(',', '')), d); continue
                c = min(EXS, key=lambda e: abs(x0 - sym[e]))
                if abs(x0 - sym[c]) <= 25: syms.setdefault(c, []).append(t)
            x['avgCap'] = vals['AVG'][0] if 'AVG' in vals else None
            for e in ('BSE', 'NSE'):
                if e in vals:
                    x[e.lower() + 'Cap'] = vals[e][0]
                    if syms.get(e): x[e.lower() + 'Symbol'] = ' '.join(syms[e]).rstrip('*')
            out.append(x)
    for ex in ('bse', 'nse'):  # each exchange's own ranking
        for n, x in enumerate(sorted((x for x in out if x.get(ex + 'Cap')), key=lambda x: -x[ex + 'Cap']), 1): x[ex + 'Rank'] = n
    return out

STOP = {'limited', 'ltd', 'the', 'and', 'co', 'company'}
def norm(n):
    n = re.sub(r'\((formerly|earlier|erstwhile)[^)]*\)', ' ', (n or '').lower()).replace('&', ' and ')
    return ''.join(t for t in re.sub(r'[^a-z0-9]+', ' ', n).split() if t not in STOP)

YEARS = {}
for f in sorted(os.listdir(src)):
    m = re.match(r'amfi-avg-mcap-dec(20\d\d)\.pdf$', f)
    if not m: continue
    rows = parse(os.path.join(src, f)); srs = {x['sr'] for x in rows}
    assert srs == set(range(1, len(rows) + 1)), f'{f}: {len(set(range(1, max(srs) + 1)) - srs)} rows not read'
    YEARS[int(m.group(1))] = rows
    json.dump(dict(source=f, period=f'1 July to 31 December {m.group(1)}', rows=rows), open(P(f'amfi-dec{m.group(1)}.json'), 'w'))
    print(f, len(rows), 'companies')
assert 2025 in YEARS and 2024 in YEARS, 'the December 2024 and 2025 lists are needed'

Q = json.load(open(os.path.join(data, 'queue.json')))
for k, f in (json.load(open(os.path.join(data, 'pending.json'))) if os.path.exists(os.path.join(data, 'pending.json')) else {}).get('set', {}).items():
    if k in Q: Q[k] = dict(Q[k], **f)  # as the queue will be once the next batch opens, like the dashboard's overlay
add = os.path.join(data, 'kaggle', 'pending_add.json')
for k, v in (json.load(open(add)) if os.path.exists(add) else {}).items(): Q.setdefault(k, v)
manual = json.load(open(P('manual.json'))) if os.path.exists(P('manual.json')) else {}
listed = lambda x: bool(x.get('bseCap') or x.get('nseCap'))  # 2023 lists some companies again for MSEI alone
stem = lambda i: i[:9]  # issuer and security type: a split or a change of face value keeps it
by_isin, by_stem, sym_y, names_y = {}, {}, {}, {}
for y, rows in YEARS.items():
    by_isin[y], by_stem[y], sym_y[y], names_y[y] = {}, {}, ({}, {}), {}
    for x in rows:
        if x['isin'] not in by_isin[y] or listed(x) and not listed(by_isin[y][x['isin']]): by_isin[y][x['isin']] = x
        if not listed(x): continue
        by_stem[y].setdefault(stem(x['isin']), []).append(x); names_y[y].setdefault(norm(x['name']), []).append(x)
        for i, e in enumerate(('nse', 'bse')):
            if x.get(e + 'Symbol'): sym_y[y][i].setdefault(x[e + 'Symbol'], x)
stems25 = set(by_stem[2025])
def in_year(x, y, preds=()):
    """The rows of the December 2025 row's company in list y. By ISIN stem, which also gathers a company AMFI lists
    twice under its old and new ISIN (Jash Engineering) and finds it across a split (Ami Organics, now Acutaas). Then
    by NSE or BSE symbol, or by a name only one company has, unless that row is another company still on the 2025
    list (the old Tata Motors, now TMPV, for TMCV). Only when the company itself was not listed that year do the
    listed companies merged into it stand in (Piramal Enterprises for Piramal Finance; not GSPL for Gujarat Energy,
    which was listed as Gujarat Gas)."""
    rs = by_stem[y].get(stem(x['isin']), [])
    if rs or y == 2025: return rs or [x]
    n = names_y[y].get(norm(x['name']), [])
    for c in [sym_y[y][0].get(x.get('nseSymbol')), sym_y[y][1].get(x.get('bseSymbol'))] + (n if len(n) == 1 else []):
        if c and stem(c['isin']) not in stems25: return [c]
    return [r for i in preds for r in by_stem[y].get(stem(i), [])]
def ranks_of(rs):
    return {e: min(r[e + 'Rank'] for r in rs if r.get(e + 'Rank')) for e in ('nse', 'bse') if any(r.get(e + 'Rank') for r in rs)}
cur = [x for x in YEARS[2025] if listed(x)]
by_nse = {x['nseSymbol']: x for x in reversed(cur) if x.get('nseSymbol')}; by_bse = {x['bseSymbol']: x for x in reversed(cur) if x.get('bseSymbol')}
by_name = {}
for x in cur: by_name.setdefault(norm(x['name']), []).append(x)

def match(k, v):
    """(row in the December 2025 list, how it was matched) or (None, None)."""
    if manual.get(k, {}).get('isin'): return by_isin[2025].get(manual[k]['isin']), 'by hand'
    if v.get('isin') in by_isin[2025]: return by_isin[2025][v['isin']], 'ISIN'  # companies added from AMFI's list
    nm, sym, kid = norm(v.get('name')), v.get('symbol'), (v.get('kaggleId') or '').upper()
    if sym and sym in by_nse: return by_nse[sym], 'NSE symbol'
    if len(by_name.get(nm, [])) == 1: return by_name[nm][0], 'name'
    x = by_nse.get(kid) or by_bse.get(kid)  # a Kaggle file is often named by the filer's NSE symbol
    if x and difflib.SequenceMatcher(None, nm, norm(x['name'])).ratio() > 0.6: return x, 'filing symbol'
    c = difflib.get_close_matches(nm, list(by_name), n=2, cutoff=0.9)
    if len(c) == 1 and len(by_name[c[0]]) == 1: return by_name[c[0]][0], 'close name'
    return None, None

def best(x):
    """The better of its two exchange ranks, and that exchange."""
    if not x: return None, None
    r = [(x[e + 'Rank'], e.upper()) for e in ('nse', 'bse') if x.get(e + 'Rank')]
    return min(r, key=lambda z: (z[0], z[1] != 'NSE')) if r else (None, None)

LEFT = re.compile(r'amalgamat|merged into|liquidat|delisted', re.I)  # gone for good; insolvency is not: the BRSR still applies
INSOLVENT = re.compile(r'insolvency|CIRP', re.I)
mk = M.marks(data)
EV = REL.load(data, Q, mk)
isin_of = {k: x['isin'] for k, v in Q.items() if v['status'] != 'merged' for x in [match(k, v)[0]] if x}
preds = lambda k: [i for p in REL.predecessors(k, EV) for i in [p.get('isin') or isin_of.get(p.get('key'))] if i]
names = lambda ps: ' and '.join(p.get('name') for p in ps)
out, matched = {}, set()
for k in Q: matched |= set(preds(k))  # a merged company's leftover 2025 row is not "missing from the build" (Piramal Enterprises)
for k, v in Q.items():
    if v['status'] == 'merged': continue  # a duplicate entry, kept on the one it merged into
    x, how = match(k, v); man = manual.get(k, {})
    ranks = {}
    if x:
        for y in sorted(YEARS):
            rs = in_year(x, y, preds(k) if y < 2025 else ())
            if y == 2025: matched |= {r['isin'] for r in rs}
            if ranks_of(rs): ranks[y] = ranks_of(rs)
    inn = {y: bool(ranks.get(y)) and min(ranks[y].values()) <= TOP for y in YEARS}
    r25, ex25 = min(((n, e.upper()) for e, n in (ranks.get(2025) or {}).items()), key=lambda z: (z[0], z[1] != 'NSE'), default=(None, None))  # NSE on a tie
    kind = mk.get(k, {}).get('kind') or v.get('ownerMark')
    why = ' '.join(str(v.get(f) or '') for f in ('staleReason', 'noDataReason', 'pipelineReason'))
    due = v.get('brsrFrom')
    away = REL.merged_away(k, EV)
    if man.get('group'):
        g, note = man['group'], man['note']
    elif away and (away.get('effective') or '') <= '2027-03-31':
        g, note = 'leaves', ''  # the pane's Related companies block names the merger
    elif kind in ('merged', 'delisted') or LEFT.search(why):
        g, note = 'leaves', (v.get('staleReason') or v.get('noDataReason') or v.get('pipelineReason') or kind.capitalize()).split(':')[0].rstrip('.') + '.'
    elif not x and due:
        g = 'files' if due <= '2026-27' else 'later'
        note = f"Its report says it files from FY{due}." if v.get('brsrBasis') == 'company' else f"Required from FY{due} if in the top 1,000 on 31 Dec 2026."
    elif not x:
        g, note = 'unranked', "Not in AMFI's December 2025 list."
    elif inn[2025]:
        earlier = [y for y in YEARS if y < 2025 and inn[y]]
        g = 'files' if earlier else 'joins'
        note = ''  # the badge and the rank line say it
    elif inn[2024]:
        g, note = 'files', 'First year outside the top 1,000. Covered until three years out.'
    else:
        g = 'atRisk'
        note = 'Its last required year if outside again on 31 Dec 2026.'
    if g != 'leaves' and (kind == 'insolvent' or INSOLVENT.search(why)):
        note += ' In insolvency: still required, unlikely to file.'
    for e in REL.of(k, EV):  # companies merged into it lend it their earlier ranks
        if g == 'leaves': break
        lent = [y for y in sorted(YEARS) if y < 2025 and not in_year(x, y) and in_year(x, y, preds(k))] if x and e['kind'] == 'merger' and e['side'] == 'to' else []
        if lent: note += f" {lent[0]}{'–' + str(lent[-1]) if len(lent) > 1 else ''} ranks are {names(e['from'])}'s."
    if man.get('note') and not man.get('group'): note += ' ' + man['note']
    # near the cut-off on a list that decides its group: 2025 for all, and 2024 too where it is not inside on 2025
    r24 = min((ranks.get(2024) or {}).values(), default=None)
    near = lambda r: bool(r) and abs(r - TOP) <= EDGE
    edge = g not in ('leaves', 'later', 'unranked') and (man.get('edge') or near(r25) or (not inn[2025] or g == 'joins') and near(r24))
    out[k] = dict(group=g, note=note.strip(), edge=bool(edge), isin=x['isin'] if x else None, amfiName=x['name'] if x else None, matchedBy=how,
                  ranks={str(y): r for y, r in ranks.items()}, cat=x.get('cat') if x else None)

# The rest of the FY2026-27 universe: each exchange's top 1,000 on 31 December 2025 that the build does not hold.
outside, seen = [], set()
for x in cur:
    r, ex = best(x)
    if x['isin'] in matched or stem(x['isin']) in seen or not r or r > TOP: continue
    seen.add(stem(x['isin'])); sib = in_year(x, 2025); r, ex = min(((n, e.upper()) for e, n in ranks_of(sib).items()), key=lambda z: (z[0], z[1] != 'NSE'))
    earlier = [y for y in YEARS if y < 2025 and min(ranks_of(in_year(x, y)).values(), default=10 ** 6) <= TOP]
    p = ranks_of(in_year(x, 2024))  # on NSE a year ago and on BSE only now: AMFI keeps some that have left (ICICI Securities)
    outside.append(dict(isin=x['isin'], name=x['name'], nse=x.get('nseSymbol'), bse=x.get('bseSymbol'), rank=r, exchange=ex, joins=not earlier, edge=abs(r - TOP) <= EDGE,
                        left=bool(p.get('nse') and not ranks_of(sib).get('nse'))))
outside.sort(key=lambda x: x['rank'])

groups = {}
for v in out.values(): groups[v['group']] = groups.get(v['group'], 0) + 1
json.dump(dict(builtAt=datetime.now().isoformat(timespec='minutes'), source='AMFI, average market capitalisation of listed companies, six months ended 31 December',
               years=sorted(YEARS), top=TOP, edge=EDGE, groups=groups, companies=out, outside=outside), open(P('fy2026-27.json'), 'w'), indent=1)
print('in the build:', groups, '| near the cut-off:', sum(v['edge'] for v in out.values()))
print('top 1,000 not in the build:', len(outside), '| of them new to the December lists:', sum(x['joins'] for x in outside))
