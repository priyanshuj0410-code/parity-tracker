"""How the build's companies relate through mergers and demergers (PARITY-129): one store of corporate events,
data/relations.json, read by the dashboard (the company pane's Related companies block and the break in its Years
table) and by rankings.py (a merged company's earlier ranks, and who leaves before FY2026-27).

    {"events": [{"id", "kind": "merger" | "demerger" | "business-transfer",
                 "from": [party], "to": [party], "business", "effective": "YYYY-MM-DD", "appointed",
                 "source", "quote", "checked"}]}
    party: {"key": a queue key or null, "name", "isin" or null, "new": the event created or first listed it,
            "listed": "YYYY-MM-DD" or null, "wasListed": listed though gone before AMFI's first list (so no ISIN),
            "after": its name after the event, or null}

A merger absorbs every 'from' company into the first 'to' company, and the 'from' companies cease. A demerger moves a
business of the 'from' company to each 'to' company, new or existing, and the 'from' company continues; a business
transfer moves it to an existing company by other means. An owner's "Merged into" mark on the dashboard counts as a
merger too, unless the file already holds one for that company."""
import json, os, re

STOP = {'limited', 'ltd', 'the', 'and', 'co', 'company'}
def norm(n):
    n = re.sub(r'\((formerly|earlier|erstwhile)[^)]*\)', ' ', (n or '').lower()).replace('&', ' and ')
    return ''.join(t for t in re.sub(r'[^a-z0-9]+', ' ', n).split() if t not in STOP)

def load(data, Q, marks):
    """Every event: the file's, then one per owner merger mark the file does not already cover. Party names that match
    one company in the queue get its key."""
    p = os.path.join(data, 'relations.json')
    ev = (json.load(open(p)) if os.path.exists(p) else {}).get('events', [])
    names = {}
    for k, v in Q.items():
        if v['status'] != 'merged': names.setdefault(norm(v.get('name')), []).append(k)
    def resolve(party):
        if not party.get('key'):
            ks = names.get(norm(party.get('name')), [])
            if len(ks) == 1: party = dict(party, key=ks[0])
        return party
    out = [dict(e, **{s: [resolve(x) for x in e.get(s, [])] for s in ('from', 'to')}) for e in ev]
    covered = {x['key'] for e in out if e['kind'] == 'merger' for x in e['from'] if x.get('key')}
    for k, m in marks.items():
        if m.get('kind') == 'merged' and m.get('into') and k not in covered and k in Q:
            out.append(dict(id='mark:' + k, kind='merger', effective=m.get('since'), source='Your mark', quote=m.get('note') or '', fromMark=True,
                            **{'from': [dict(key=k, name=Q[k].get('name'))], 'to': [resolve(dict(name=m['into']))]}))
    return out

def of(key, events):
    """The events a company takes part in, each with its side ('from' or 'to'), newest first."""
    out = []
    for e in events:
        for side in ('from', 'to'):
            if any(x.get('key') == key for x in e.get(side, [])): out.append(dict(e, side=side))
    return sorted(out, key=lambda e: e.get('effective') or '', reverse=True)

def predecessors(key, events):
    """Listed companies merged into this one: their ranks stand in for its own before the merger."""
    return [x for e in events if e['kind'] == 'merger' and any(t.get('key') == key for t in e['to']) for x in e['from']]

def fy_of(day):
    """The April-March year a date falls in: '2025-26' for 1 October 2025."""
    y, m = int(day[:4]), int(day[5:7])
    return f'{y if m >= 4 else y - 1}-{str((y if m >= 4 else y - 1) + 1)[2:]}'

def break_fy(e):
    """The first year whose figures include the change: the later of the year of the scheme's appointed date and the
    year of the first report out after it took effect (reports come about five months after the year ends); without an
    appointed date, that first report. None without an effective date."""
    d = e.get('effective')
    if not d: return None
    back = f"{int(d[:4]) - (1 if int(d[5:7]) <= 5 else 0)}-{(int(d[5:7]) - 6) % 12 + 1:02d}-01"  # five months earlier
    return max(fy_of(e['appointed']), fy_of(back)) if e.get('appointed') else fy_of(back)

def merged_away(key, events):
    """The merger that absorbed this company, or None."""
    return next((e for e in events if e['kind'] == 'merger' and any(x.get('key') == key for x in e['from'])), None)
