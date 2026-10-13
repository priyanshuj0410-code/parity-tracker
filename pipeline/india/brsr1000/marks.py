"""Owner marks and the late-filer watch (PARITY-127, PARITY-128).

The owner marks a company still on FY2024-25 from the dashboard after checking its filings: no BRSR filed, merged,
insolvent or delisted. The mark lives in data/owner_marks.json, which only the dashboard writes, and reaches the queue
as each batch opens. Merged, insolvent and delisted companies leave the group (decision 10) and the watch. The daily watch
(batch.py watch) looks again at every company with no FY2025-26 BRSR and leaves one file per find in data/watch/found/,
which the next batch to open sends back to be read. Neither ever writes queue.json while a batch may be open."""
import fcntl, json, os, re, tempfile
from contextlib import contextmanager
from datetime import datetime

def P(data, *a): return os.path.join(data, *a)
def load(p, d=None): return json.load(open(p)) if os.path.exists(p) else d
def save(p, obj):  # atomic: a reader never sees half a file, and each writer has its own temp file
    fd, tmp = tempfile.mkstemp(dir=os.path.dirname(p), suffix='.tmp')
    with os.fdopen(fd, 'w') as fh: json.dump(obj, fh, indent=1, ensure_ascii=False)
    os.replace(tmp, p)
@contextmanager
def locked(data):  # one writer at a time across the dashboard's threads and batch.py
    with open(P(data, 'owner_marks.lock'), 'a') as fh:
        fcntl.flock(fh, fcntl.LOCK_EX)
        try: yield
        finally: fcntl.flock(fh, fcntl.LOCK_UN)

KINDS = {'noBrsr': 'No BRSR filed', 'merged': 'Merged', 'insolvent': 'Insolvent', 'delisted': 'Delisted'}
GONE_KINDS = ('merged', 'insolvent', 'delisted')

def marks(data): return load(P(data, 'owner_marks.json'), {}).get('marks', {})
def set_mark(data, key, kind=None, into=None, since=None, note=None, at=None):
    """Mark a company (kind one of KINDS), or clear its mark (kind None). `into` names the company it merged into;
    `since` is the date it merged, entered insolvency or was delisted, as YYYY-MM-DD; `at` (an Undo) keeps the original
    time. Returns the company's mark before and after."""
    with locked(data):
        m = load(P(data, 'owner_marks.json'), {}); mk = m.setdefault('marks', {}); prev = mk.get(key)
        if kind: mk[key] = {f: x for f, x in dict(kind=kind, at=at or datetime.now().isoformat(timespec='seconds'), into=into, since=since,
                                                   note=note or 'Owner checked the filings').items() if x}
        else: mk.pop(key, None)
        save(P(data, 'owner_marks.json'), m)
    return prev, mk.get(key)

def day(iso): return datetime.fromisoformat(iso).strftime('%-d %b %Y')
def reason(mark):
    """The sentence a mark puts on the queue record; its wording is what the dashboard's Why tags and GONE match."""
    by, on = f"owner checked, {day(mark['at'])}", mark.get('since') and day(mark['since'])
    return {'noBrsr': f"No FY2025-26 BRSR filed ({by})",
            'merged': f"Merged into {mark.get('into') or 'another company'}{' on ' + on if on else ''} ({by})",
            'insolvent': f"In insolvency{' since ' + on if on else ''} ({by})",
            'delisted': f"Delisted{' on ' + on if on else ''} ({by})"}[mark['kind']]
GONE = re.compile(r'amalgamat|merged into|insolvency|CIRP|liquidat|delisted', re.I)  # companies that will not file again

def markable(v):  # still on FY2024-25, or sent back from it and not yet read again
    return v['status'] == 'done-kaggle' or (v['status'] in ('todo', 'in-batch') and v.get('retriedFrom') == 'done-kaggle')

OWNER = '(owner checked, '  # in every mark's sentence, so a mark's reason is never kept as the pipeline's
def apply_marks(Q, data, close=False):
    """Owner marks onto queue records. A marked company carries the mark's reason in place of any the pipeline gave
    (kept as pipelineReason); undoing the mark puts the pipeline's back. A marked company since read as FY2025-26 loses
    the mark's fields, and with close (batch.py next only) the mark itself."""
    mk, changed = marks(data), []
    for k, v in Q.items():
        m = mk.get(k)
        if m and markable(v):
            r = reason(m)
            if v.get('ownerMark') == m['kind'] and v.get('staleReason') == r: continue
            if v.get('staleReason') and OWNER not in v['staleReason']: v['pipelineReason'] = v['staleReason']
            v.update(staleReason=r, ownerMark=m['kind']); changed.append(k)
        elif m and v['status'] in ('done-latest', 'done-deep'):
            v.pop('ownerMark', None); v.pop('pipelineReason', None)
            if OWNER in (v.get('staleReason') or ''): v.pop('staleReason')
            if close: set_mark(data, k)
            changed.append(k)
        elif not m and v.get('ownerMark'):
            v.pop('ownerMark'); prior = v.pop('pipelineReason', None)
            if prior: v['staleReason'] = prior
            else: v.pop('staleReason', None)
            changed.append(k)
    return changed

def found(data):
    d = P(data, 'watch', 'found')
    return {f[:-5]: load(os.path.join(d, f)) for f in sorted(os.listdir(d)) if f.endswith('.json')} if os.path.isdir(d) else {}

def apply_found(Q, data):
    """Send back every company the watch found a FY2025-26 BRSR for, and close its mark."""
    took = []
    for k, rec in found(data).items():
        v = Q.get(k)
        if v and v['status'] in ('done-kaggle', 'no-data'):
            v.update(status='todo', retry=True, retriedFrom=v['status'], watchFound=rec.get('at'))
            for f in ('staleReason', 'ownerMark', 'pipelineReason', 'noDataReason'): v.pop(f, None)
            set_mark(data, k); took.append(k)
        os.makedirs(P(data, 'watch', 'applied'), exist_ok=True); os.replace(P(data, 'watch', 'found', k + '.json'), P(data, 'watch', 'applied', k + '.json'))
    return took

NOT_OUT = re.compile(r'not (out|published) yet|year ends in', re.I)  # the dashboard's "Report not out yet" tag

def due_2526(k, v, F):
    """Was it required to file a BRSR for FY2025-26: in either exchange's top 1,000 on a December list up to 2024, since
    coverage did not lapse before the 2024 sunset rule (rankings.py), unless its own report says it files from later.
    F: rankings.py's companies (data/rankings/fy2026-27.json)."""
    if v.get('brsrBasis') == 'company' and (v.get('brsrFrom') or '') > '2025-26': return False
    return any(r and min(r.values()) <= 1000 for y, r in ((F.get(k) or {}).get('ranks') or {}).items() if int(y) <= 2024)

def watch_list(Q, data):
    """Companies the watch looks at: no FY2025-26 BRSR yet, because the owner marked it, the site has not published it,
    or the annual report came without one; those with no usable report because theirs is not out yet; and those a BRSR
    was due from with no usable report and no reason recorded (Kennametal India and SpiceJet, whose FY2025-26 BRSR is
    not out; PARITY-136). Merged, insolvent and delisted companies are left out, by the owner's mark
    (read here at once, before the next batch carries it into the queue) or by the pipeline's reason."""
    mk, out = marks(data), []
    F = (load(P(data, 'rankings', 'fy2026-27.json'), {}) or {}).get('companies', {})
    Q = {k: dict(v) for k, v in Q.items()}; apply_marks(Q, data)  # the queue as the marks leave it, undos included
    for k, v in Q.items():
        kind = mk.get(k, {}).get('kind')
        if v['status'] == 'no-data' and kind not in GONE_KINDS and (NOT_OUT.search(v.get('noDataReason') or '') or (not v.get('noDataReason') and due_2526(k, v, F))):
            out.append(k); continue
        if v['status'] != 'done-kaggle' or kind in GONE_KINDS or (not kind and GONE.search(v.get('staleReason') or '')): continue
        f = load(P(data, 'found', k + '.json'), {})
        ar_only = any(x.get('status') == 'ok' and not x.get('hasBRSR') for x in v.get('fetches') or [])
        if kind == 'noBrsr' or re.search(r'no FY2025-26 BRSR|not published', v.get('staleReason') or '', re.I) or f.get('status') in ('not-published', 'not-found') or ar_only:
            out.append(k)
    return out
