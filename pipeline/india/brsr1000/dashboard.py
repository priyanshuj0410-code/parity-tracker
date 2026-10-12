"""Local dashboard for Parity, Nivel's company dataset, begun as the BRSR filer build (PARITY-123, PARITY-126, PARITY-130): one page (dashboard/: index.html, the ui.css and ui.js component library, app.js) for the run, what needs the
owner, every company's reading, the results and a read-only SQL box over brsr1000.sqlite. Standard library only; serves
on 127.0.0.1, and reads those files from disk on each request.

    python3 pipeline/india/brsr1000/dashboard.py [port]      then open http://127.0.0.1:8765
"""
import glob, hashlib, json, os, re, sqlite3, subprocess, sys, time
from datetime import datetime, timedelta
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import urllib.parse
from urllib.parse import parse_qs, urlparse

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, 'data')
DB = os.path.join(DATA, 'brsr1000.sqlite')
PACE_BATCHES = 6  # pace and finish are measured over this many recent batches (owner, 11 October 2026)
P = lambda *a: os.path.join(DATA, *a)
def load(p, d=None): return json.load(open(p)) if os.path.exists(p) else d

_usage = (0, '')
def usage():
    global _usage
    if time.time() - _usage[0] > 60:
        r = subprocess.run([sys.executable, os.path.expanduser('~/.claude/usage-guard/usage_guard.py'), 'status'], capture_output=True, text=True)
        _usage = (time.time(), r.stdout.strip())
    return _usage[1]

LABEL = {'todo': 'to do', 'in-batch': 'in a batch', 'done-latest': 'FY2025-26', 'done-kaggle': 'FY2024-25 only',
         'done-deep': 'deep pass done', 'no-data': 'no usable report'}
def now_of(q, keys):
    """Where a closed batch's companies stand today: some are retried in later batches after a fix."""
    c = {}
    for k in keys:
        v = q.get(k, {})
        s = 'retrying' if v.get('retry') and v.get('status') in ('todo', 'in-batch') else LABEL.get(v.get('status'), '?')
        c[s] = c.get(s, 0) + 1
    return ', '.join(f'{n} {s}' for s, n in sorted(c.items(), key=lambda x: -x[1]))

def stages(q, b):
    """How far each company in the open batch has got: a FY2025-26 link found, the BRSR downloaded, read, accepted."""
    opened = b.get('openedAt') or ''
    def newer(p): return os.path.exists(p) and datetime.fromtimestamp(os.path.getmtime(p)).isoformat() >= opened
    def link(k):
        f = load(P('found', k + '.json'), {})
        return f.get('status') == 'found' and any(re.search(r'2025-?26|2026', c.get('fy') or '') for c in f.get('candidates', []))
    def got(k):
        rs = [json.loads(l) for l in open(P('fetch', k + '.jsonl'))] if os.path.exists(P('fetch', k + '.jsonl')) else []
        return any(x.get('status') == 'ok' and x.get('hasBRSR') and is_latest(x.get('fy')) for x in rs)
    rows = []
    for group, ks in (('Retried', [k for k in b['keys'] if q.get(k, {}).get('retry')]), ('New', [k for k in b['keys'] if not q.get(k, {}).get('retry')])):
        if ks: rows.append(dict(group=group, companies=len(ks), fy2526_link_found=sum(map(link, ks)), fy2526_downloaded=sum(map(got, ks)),
                                read=sum(1 for k in ks if newer(P('read', k + '.haiku.json'))), accepted=sum(1 for k in ks if newer(P('verified', k + '.json')))))
    return rows

sys.path.insert(0, HERE)
from brsr_fields import is_brsr, reporting_year, is_latest, fy_start, entity
from inbox import matcher
import marks as M, relations as REL
from names import nice, FORMER

def why_2425(k, v):
    """Why a company holds only its FY2024-25 reading, from its search and download records."""
    f = load(P('found', k + '.json'), {}); rs = v.get('fetches') or []
    if v.get('staleReason'): return v['staleReason']
    if v.get('manual'):
        return ('FY2025-26 BRSR received from you; read when the next batch opens' if has_latest_text(k) else
                'Your file holds no BRSR: stays FY2024-25, feeds the hierarchy read only')
    if v.get('blocked'): return 'Company site blocks automated visitors: needs a person with a browser'
    for name in (k + '.txt', k + '.ar.txt'):
        p = P('latest', 'txt', name)
        if os.path.exists(p):
            t = open(p, errors='ignore').read()
            if is_brsr(t) and is_latest(reporting_year(t)): return 'FY2025-26 BRSR already downloaded; re-read when the next batch opens'
    if f.get('status') == 'not-published': return 'FY2025-26 BRSR not published on the company site'
    if f.get('status') == 'site-blocked' or any(re.search(r'403|000', x.get('http') or '') for x in rs): return 'Company site blocks downloads or has a broken certificate'
    if any(x.get('status') == 'no-text' for x in rs): return 'Report is a scan that could not be read'
    if any(x.get('status') == 'ok' and not x.get('hasBRSR') for x in rs): return 'FY2025-26 annual report found, but it holds no BRSR and no separate BRSR was found'
    if f.get('status') == 'not-found' or not f.get('candidates'): return 'No FY2025-26 report found on the company site'
    return 'Other: see the company record'

INBOX = os.path.expanduser('~/brsr reports 2025-26/inbox')

_inbox_seen = {}
def inbox_matches(q):
    """Which company each file waiting in the inbox will go to, by the CIN it prints most often (as batch.py matches
    it first). Read once per file version."""
    if not os.path.isdir(INBOX): return {}
    match, out = matcher(q, ids()), {}
    for fn in sorted(f for f in os.listdir(INBOX) if f.lower().endswith('.pdf')):
        p = os.path.join(INBOX, fn); sig = (fn, os.path.getmtime(p))
        if sig not in _inbox_seen:
            t = subprocess.run(['/opt/homebrew/bin/pdftotext', '-layout', '-l', '400', p, '-'], capture_output=True, text=True).stdout
            cins = re.findall(r'\b([LU]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6})\b', t)
            en = entity(t)
            _inbox_seen[sig] = dict(cin=max(set(cins), key=cins.count) if cins else en.get('cin'), name=en.get('name'), site=en.get('website'), brsr=is_brsr(t), fy=reporting_year(t))
        r = _inbox_seen[sig]; k = match(fn, r['cin'], r['name'], r['site'])[0]
        if k:
            m = dict(file=fn, **r)
            if k not in out: out[k] = m
            elif m['brsr'] and not out[k]['brsr']: out[k] = dict(m, more=[{f: x for f, x in out[k].items() if f != 'more'}] + out[k].get('more', []))
            else: out[k].setdefault('more', []).append(m)
    return out

def yr_label(fy): return f'calendar {fy[2:]}' if fy.startswith('CY') else f'FY{fy}'  # 'CY2023' is a January to December year

def has_latest_text(k):
    for name in (k + '.txt', k + '.ar.txt'):
        p = P('latest', 'txt', name)
        if os.path.exists(p):
            t = open(p, errors='ignore').read()
            if is_brsr(t) and is_latest(reporting_year(t)): return True
    return False

def links_for(k, v):
    """Links worth trying for one company: found PDFs, its investor pages, its home page and a web search."""
    f = load(P('found', k + '.json'), {}); b = load(P('browse', k + '.json'), {})
    site = (v.get('website') or b.get('site') or '').replace('www.', '')
    links, pages = [], []
    for c in f.get('candidates', []):
        if c.get('url', '').startswith('http') and not re.search(r'nseindia|bseindia', c['url']):  # named by year and file, so two PDFs never share a label
            leaf = urllib.parse.unquote(urllib.parse.urlparse(c['url']).path.rsplit('/', 1)[-1])
            links.append(dict(label=f"PDF {('FY' + c['fy']) if c.get('fy') else ''} {leaf if len(leaf) <= 18 else '…' + leaf[-14:]}".replace('  ', ' ').strip(), url=c['url']))
    for u in re.findall(r'https?://[^\s,;)\'"]+', f.get('note', '')) + [pg['url'] for pg in b.get('pages', []) if pg.get('status') == 200]:
        u = u.rstrip('.')
        if site and site in u and not u.lower().endswith('.pdf') and re.search(r'investor|annual|report|brsr|financ|disclos', u, re.I) and u not in pages: pages.append(u)
    by_path = {}
    for u in pages: by_path.setdefault(urllib.parse.urlparse(u).path.rstrip('/') or '/', u)  # www and bare host: one link
    links += [dict(label=pth, url=u) for pth, u in list(by_path.items())[:3]]
    if site: links.append(dict(label='home page', url=f'https://www.{site}'))
    q_ = urllib.parse.quote_plus(f"{v.get('name') or k} annual report 2025-26 pdf")
    links.append(dict(label='web search', url=f'https://www.google.com/search?q={q_}'))
    return links

def needs(q):
    """Companies only a person can fetch: the site blocks automated visitors, or its report list never shows up for
    scripts or a headless browser. Each comes with the links worth trying, and whether a file has arrived."""
    q = overlay(q); out, waiting = [], inbox_matches(q)
    for k, v in q.items():
        if k in waiting:  # saved, not yet taken in: the next batch to open will read it
            w = waiting[k]
            out.append(dict(key=k, name=display_name(v, k)[0], reason='file in the inbox', links=[], received=w['file'],
                            progress='in the inbox: read when the next batch opens' if w['brsr'] else 'in the inbox, but it holds no BRSR'))
            continue
        if v.get('manual') and not (v['status'] == 'done-kaggle' and v.get('staleReason')):  # a file arrived: keep it on the list, with its progress, so the owner sees it land
            st = v['status']
            old = sorted({(x.get('fy') or '').lstrip('~') for x in v.get('fetches') or []
                          if (x.get('url') or '').startswith('file:') and x.get('hasBRSR') and (fy_start(x.get('fy')) or 9999) < 2025})
            if st == 'done-kaggle' and old and not has_latest_text(k):  # the saved file is an older year: ask again
                out.append(dict(key=k, name=display_name(v, k)[0], reason='saved by hand, but an older year', links=links_for(k, v),
                                received=v['manual'], again=True, progress=f'received the {yr_label(old[-1])} BRSR: save the FY2025-26 one'))
                continue
            prog = ('done: FY2025-26 read' if st == 'done-latest' else 'being read' if st in ('todo', 'in-batch') else
                    'received: read when the next batch opens' if has_latest_text(k) else
                    'received, but it holds no BRSR: stays FY2024-25 (feeds the hierarchy read only)')
            out.append(dict(key=k, name=display_name(v, k)[0], reason='saved by hand', links=[], received=v['manual'], progress=prog))
            continue
        if v['status'] != 'done-kaggle' or v.get('staleReason'): continue
        f = load(P('found', k + '.json'), {}); b = load(P('browse', k + '.json'), {}); rs = v.get('fetches') or []
        codes = ' '.join(x.get('http') or '' for x in rs)
        blocked = v.get('blocked') or b.get('blocked') or f.get('status') == 'site-blocked' or re.search(r'\b(403|503)\b', codes)
        hidden = f.get('status') == 'not-found' or (b and not [p for p in b.get('pdfs', []) if p.get('score', 0) >= 5])
        no_brsr_only = any(x.get('status') == 'ok' and not x.get('hasBRSR') for x in rs) and not has_latest_text(k)
        if v.get('pendingRequeue') or f.get('status') == 'not-published' or not (blocked or hidden or no_brsr_only): continue
        links = links_for(k, v)
        no_brsr = any(x.get('status') == 'ok' and not x.get('hasBRSR') for x in rs)
        reason = ('blocks automated visitors' if blocked else
                  'annual report has no BRSR in it: look for a separate BRSR' if no_brsr else 'report list only appears in a browser')
        out.append(dict(key=k, name=display_name(v, k)[0], reason=reason, links=links, received=None))
    files = sorted(fn for fn in os.listdir(INBOX) if fn.lower().endswith('.pdf')) if os.path.isdir(INBOX) else []
    matched = {m['file'] for w in waiting.values() for m in [w] + w.get('more', [])}
    nothing = sorted((display_name(v, k)[0], v.get('staleReason') or 'no FY2025-26 BRSR published on the company site')
                     for k, v in q.items() if v['status'] == 'done-kaggle'
                     and (v.get('staleReason') or (not v.get('manual') and load(P('found', k + '.json'), {}).get('status') == 'not-published')))
    return dict(companies=sorted(out, key=lambda x: (bool(x['received']), x['name'].lower())), inbox=INBOX, waiting=files,
                unmatched=[f for f in files if f not in matched], nothing=nothing)

def overlay(q):
    """The queue as it will be once the next batch opens: changes an attended session queued in pending.json, shown now."""
    pend = load(P('pending.json'), {})
    q = {k: dict(v) for k, v in q.items()}
    for k, fields in pend.get('set', {}).items():
        if k in q: q[k].update(fields)
    for k in pend.get('requeue', []):
        if k in q: q[k]['pendingRequeue'] = True
    M.apply_marks(q, DATA)  # owner marks and watch finds show at once; batch.py writes them into the queue when the next batch opens
    for k in M.found(DATA):
        if k in q: q[k]['pendingRequeue'] = True; q[k]['watchFound'] = True
    return q

# Short tags for why a company holds only FY2024-25: one tag per state, the full sentence kept as the detail.
WHY_TAGS = [('retrying', 'Retrying', r'Sent back'), ('inbox', 'In your inbox', r'from you in the inbox|received from you'),
            ('read-next', 'Read next batch', r'already downloaded|New report link found'),
            ('no-brsr', 'No FY2025-26 BRSR', r'not published|no FY2025-26 BRSR filed|has no FY2025-26 BRSR'),
            ('merged', 'Merged', r'Amalgamat|merged into'), ('delisted', 'Delisted', r'delisted'), ('insolvent', 'Insolvent', r'insolvency|CIRP|liquidat'),
            ('your-file', 'Your file has no BRSR', r'Your file holds no BRSR'), ('blocked', 'Site blocks downloads', r'blocks'),
            ('scan', 'Unreadable scan', r'scan'), ('no-brsr-in-ar', 'No BRSR in annual report', r'holds no BRSR|no separate BRSR'),
            ('not-found', 'Not found', r'No FY2025-26 report found')]
def why_tag(reason):
    return next(((t, l) for t, l, rx in WHY_TAGS if re.search(rx, reason or '', re.I)), ('other', 'Other'))

# Why a company has no usable report: one tag per reason, read from the reason the pipeline or an attended check recorded.
NODATA_TAGS = [('nd-requirement', 'No BRSR requirement', r'BRSR (does not apply|applies to it from|is not applicable|is not required)|has no BRSR, which (does not )?appl|after the 2025-26 financial year|until its listing|outside the top 1,?000'),
               ('nd-employees', 'No permanent employees', r'\bno (permanent )?employees\b'),
               ('nd-not-out', 'Report not out yet', r'not (out|published) yet|year ends in'),
               ('nd-not-found', 'No report found', r'cannot be found|no FY2025-26 report found|not found on'),
               ('nd-blocked', 'Site blocks downloads', r'blocks')]
UNCHECKED = 'No reason recorded yet'
def nodata_reason(v): return v.get('noDataReason') or UNCHECKED
def nodata_tag(reason):
    return next(((t, l) for t, l, rx in NODATA_TAGS if re.search(rx, reason or '', re.I)), ('nd-unchecked', 'Not checked yet') if reason == UNCHECKED else ('nd-other', 'Other'))

def nodata(q):
    """The companies with no usable report (not those sent back to be read again), grouped by reason tag."""
    groups = {}
    for k, v in overlay(q).items():
        if v['status'] != 'no-data': continue
        r = nodata_reason(v); groups.setdefault(nodata_tag(r), []).append(dict(key=k, name=display_name(v, k)[0], detail=r))
    return sorted((dict(tag=t, label=l, n=len(n), names=sorted(n, key=lambda x: x['name'].lower())) for (t, l), n in groups.items()), key=lambda x: -x['n'])

def reason_2425(k, v, waiting):
    """Why a company holds only FY2024-25 today, or None when it does not: the one sentence the breakdown, the table and the
    company pane all show."""
    retry = v.get('retry') and v['status'] in ('todo', 'in-batch') and v.get('retriedFrom') == 'done-kaggle'
    if v['status'] != 'done-kaggle' and not retry: return None
    return ('Sent back for another search and download' if retry else
            'BRSR from you in the inbox; read when the next batch opens' if k in waiting and waiting[k]['brsr'] else
            why_2425(k, v) if v.get('manual') or not v.get('pendingRequeue') else 'New report link found; downloaded when the next batch opens')

def fy2425(q):
    q = overlay(q); waiting = inbox_matches(q)
    groups = {}
    for k, v in q.items():
        r = reason_2425(k, v, waiting)
        if not r: continue
        tag, label = why_tag(r)
        groups.setdefault((tag, label), []).append(dict(key=k, name=display_name(v, k)[0], detail=r))
    return sorted((dict(tag=t, label=l, n=len(n), names=sorted(n, key=lambda x: x['name'].lower())) for (t, l), n in groups.items()), key=lambda x: -x['n'])

def progress():
    q = load(P('queue.json'), {})
    counts = {}
    for v in q.values():
        # A company sent back for another search keeps the checked data it already has: count it under that status,
        # marked as retrying, not as new work in a batch.
        s = f"retry:{v['retriedFrom']}" if v.get('retry') and v['status'] in ('todo', 'in-batch') and v.get('retriedFrom') else v['status']
        counts[s] = counts.get(s, 0) + 1
    done = sum(n for s, n in counts.items() if s.startswith(('done', 'retry:')) or s == 'no-data')
    batches = sorted((load(f) for f in glob.glob(P('batch', 'done', '*.json'))), key=lambda b: b['id'])
    cur = load(P('batch', 'current.json'))
    closed = [b for b in batches if b.get('closedAt') and b.get('openedAt')]
    rate = eta = None
    if len(closed) >= 2:
        # Pace over the last six batches, so an early stall stops dragging the estimate. The window runs to the next
        # batch's opening (the slot those six used up), or to the last close when none is open.
        recent = closed[-PACE_BATCHES:]
        t0 = datetime.fromisoformat(recent[0]['openedAt'])
        t1 = datetime.fromisoformat(cur['openedAt'] if cur and cur.get('stage') != 'closed' and cur.get('openedAt') else recent[-1]['closedAt'])
        hrs = max((t1 - t0).total_seconds() / 3600, 0.01); rate = sum(len(b['keys']) for b in recent) / hrs
        left = len(q) - counts.get('merged', 0) - done
        eta = (datetime.now() + timedelta(hours=left / rate)).isoformat(timespec='minutes') if rate else None
    log = open(P('logs', 'runs.md')).read().splitlines()[-15:] if os.path.exists(P('logs', 'runs.md')) else []
    # A merged entry is a duplicate of another queue entry for the same company: it is not a company of its own.
    return dict(total=len(q) - counts.get('merged', 0), done=done, counts=counts, ratePerHour=rate and round(rate, 1), paceBatches=min(PACE_BATCHES, len(closed)), eta=eta,
                open=cur and cur.get('stage') != 'closed' and dict(id=cur['id'], stage=cur['stage'], companies=len(cur['keys']), openedAt=cur.get('openedAt'),
                                                                 stages=stages(q, cur)),
                batches=[dict(id=b['id'], openedAt=b.get('openedAt'), closedAt=b.get('closedAt'), **(b.get('summary') or {}),
                              now=now_of(q, b['keys'])) for b in batches[-12:]],
                lock=load(P('run.lock')), usage=usage(), log=log, db=os.path.exists(DB), fy2425=fy2425(q), nodata=nodata(q))

SLOTS, JITTER, SLOT_MIN = (7, 37), timedelta(seconds=353), 30  # the routine's cron minutes; the app's 296 s delay plus its once-a-minute check; its interval
GATES = dict(week=78, session=75)  # batch.py gate: a run stops at or above these

def run_state(cur, lock, closed):
    """Is a run working, idle or overrunning; when the next one starts; how close usage is to the gates."""
    now = datetime.now(); hour = now.replace(minute=0, second=0, microsecond=0)
    nxt = min(t for h in (0, 1) for m in SLOTS for t in [hour + timedelta(hours=h, minutes=m) + JITTER] if t > now)
    busy = (lock or {}).get('state') == 'busy'
    since = datetime.fromisoformat(lock['since']).replace(tzinfo=None) if lock and lock.get('since') else None
    mins = int((now - since).total_seconds() // 60) if since else None
    u = usage(); pct = lambda label: int(m.group(1)) if (m := re.search(label + r'[^\n]*?(\d+)% used', u)) else None
    week, session = pct('Current week'), pct('Current session')
    ago = re.search(r'read (\d+) min ago', u)
    resets = lambda label: (m.group(1) if (m := re.search(label + r'[^\n]*?resets ([^(\n]+?)\s*(\(|$)', u, re.M)) else None)
    return dict(state='running' if busy else 'idle', since=since and since.isoformat(timespec='minutes'), minutes=mins,
                overrun=bool(busy and mins is not None and mins > SLOT_MIN), nextRun=nxt.isoformat(timespec='minutes'),
                batch=cur and cur.get('stage') != 'closed' and cur.get('id'), lastClosed=closed[-1]['closedAt'] if closed else None,
                week=week, session=session, gates=GATES, weekResets=resets('Current week'), sessionResets=resets('Current session'), readMinAgo=int(ago.group(1)) if ago else None,
                gated=bool((week or 0) >= GATES['week'] or (session or 0) >= GATES['session']), guardTripped='tripped' in u.lower())

KEYRE = r'\b([LU]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}|KG-[A-Z0-9-]+|NIVEL-[A-Z0-9_-]+)\b'
def log_entries(q):
    """The run log as entries: when, batch, the line, and each checker flag split out with the company it names."""
    out = []
    for line in (open(P('logs', 'runs.md')).read().splitlines() if os.path.exists(P('logs', 'runs.md')) else []):
        if not line.startswith('- '): continue
        b = re.search(r'\b(b\d{3})\b', line); when = re.match(r'- (\d{4}-\d\d-\d\d \d\d:\d\d)', line)
        m = re.search(r'flags: (.*?)(?: \| usage|$)', line)
        flags = []
        for f in (m.group(1).split('; ') if m else []):
            k = re.search(KEYRE, f); k = k and k.group(1)
            flags.append(dict(text=f.strip(), key=k if k in q else None, name=q.get(k, {}).get('name') if k else None,
                              kind='download' if re.search(r'owner download|blocks|JS-only|403', f, re.I) else 'check'))
        out.append(dict(when=when and when.group(1), batch=b and b.group(1), text=line[2:], flags=flags, **log_summary(line[2:])))
    return out

STAGE_NAME = {'discover': 'Find', 'refind': 'Search again', 'browse': 'Browser', 'fetch3': 'Download', 'snippets': 'Cut tables',
              'read': 'Read', 'merge': 'Read', 'adjudicate': 'Settle', 'final': 'Close'}
def cap(s): return s[:1].upper() + s[1:] if s else s
def calm(s):
    """Sentence case for shouted words ("IDENTITY MISMATCH" reads as "Identity mismatch"), leaving CINs and acronyms."""
    return re.sub(r'\b([A-Z]{5,}(?: [A-Z]{2,})*)\b', lambda m: m.group(1).capitalize() if not re.search(r'\d', m.group(1)) and m.group(1) not in ('PARITY', 'SEBI') else m.group(1), s)
def log_summary(text):
    """One plain sentence for a run-log line (kind closed, stopped or note); the full line stays as the detail."""
    body = re.sub(r'^\S+ \S+( \+0530| IST)? \|? ?', '', text); body = re.sub(r'^b\d{3}\s*(\(\w+\))?:?\s*\|?\s*', '', body)
    if body.startswith('watch |'):
        return dict(kind='watch', summary=cap(body.split('|', 1)[1].strip().replace('companies with no FY2025-26 BRSR', 'companies')) + '.', detail=body)
    if 'STOPPED' in body or 'FAILED' in body:
        st = re.search(r'(?:STOPPED|FAILED) at stage (\w+)', body)
        return dict(kind='stopped', summary=f"{'Failed' if 'FAILED' in body else 'Stopped'}" + (f' at {STAGE_NAME.get(st.group(1), st.group(1))}.' if st else '.'), detail=body)
    m = re.search(r'latest (\d+), Kaggle-only (\d+)(?:, deep (\d+))?, no[- ]data (\d+)', body, re.I) or re.search(r'(\d+) latest FY2025-26, (\d+) Kaggle FY2024-25(?:, (\d+) deep)?, (\d+) no data', body)
    if m:
        c = corrections([dict(text=body)])
        parts = [f'{m.group(1)} FY2025-26', f'{m.group(2)} FY2024-25 only'] + ([f'{m.group(4)} no usable report'] if m.group(4) != '0' else [])
        res = 'resumed ' if 'resumed' in body else ''
        return dict(kind='closed', summary=f"Closed{' after resuming' if res else ''}: {', '.join(parts)}." + (f" {c['count']} corrections across {c['companies']} companies." if c else ''), detail=body)
    first = re.split(r'(?<=[.;])\s|\s\|\s', body)[0].rstrip(';.')
    return dict(kind='note', summary=cap(calm(first)) + '.', detail=body)

def refind_reason(r):
    r = r or ''
    return ('Site blocks downloads' if re.search(r'blocked|403|refus', r, re.I) else 'Report has no BRSR' if re.search(r'no BRSR', r, re.I) else
            'Not published yet' if re.search(r'not.published|not-published', r, re.I) else 'Not found' if re.search(r'not.found', r, re.I) else
            'Older year only' if re.search(r'20(1\d|2[0-4])-|older', r, re.I) else 'Searched again')

JUNKNAME = re.compile(r'^[^A-Za-z0-9]|[\x00-\x1f]|^(for|yours|thanking|your truly|hereinafter|referred)\b|^.{0,4}$', re.I)
def display_name(v, k):
    """The queue name, or the website when the name parsed from a filing is junk (a sign-off, a table fragment, symbols).
    A former name in brackets ("Gujarat Energy Limited (Erstwhile Gujarat Gas Limited)") goes; former_name() keeps it."""
    n = re.split(r'\s+(?:\(?hereinafter|referred to as|\(the .Company)', (v.get('name') or '').strip(), maxsplit=1, flags=re.I)[0].strip(' ,(“"')
    n = nice(FORMER.sub('', n).strip())
    return (n, True) if n and not JUNKNAME.search(n) else ((v.get('website') or k), False)
def former_name(v):
    m = FORMER.search(v.get('name') or '')
    return nice(v.get('formerly') or (m and m.group(1).strip()))

def batch_detail(bid):
    q = load(P('queue.json'), {}); cur = load(P('batch', 'current.json'), {})
    b = cur if cur.get('id') == bid and cur.get('stage') != 'closed' else load(P('batch', 'done', bid + '.json'), {}) or (cur if cur.get('id') == bid else {})
    if not b: return dict(error='No such batch')
    ids = [x['id'] for x in all_batches()]; i = ids.index(bid) if bid in ids else None
    es = [e for e in log_entries(q) if e['batch'] == bid]; o, c = dt(b.get('openedAt')), dt(b.get('closedAt'))
    flagged = {f['key'] for e in es for f in e['flags'] if f['key']}
    return dict(id=bid, stage=b.get('stage'), open=not c, openedAt=b.get('openedAt'), closedAt=b.get('closedAt'), summary=b.get('summary'),
                minutes=int(((c or datetime.now()) - o).total_seconds() // 60) if o else None, corrections=corrections(es),
                disputes=len(b.get('disputes') or {}), stages=stages(q, b) if not c else None,
                stageIndex=next((j for j, (s, _) in enumerate(STAGES) if s == b.get('stage')), None) if not c else None,
                refind=[dict(key=k, name=display_name(q.get(k, {}), k)[0], reason=refind_reason(r), detail=r) for k, r in (b.get('refind') or {}).items()],
                companies=[dict(key=k, name=display_name(q.get(k, {}), k)[0], status=q.get(k, {}).get('status'), retry=bool(q.get(k, {}).get('retry')),
                                closedAs=(b.get('closedAs') or {}).get(k) or ((q.get(k, {}).get('retriedFrom') or 'done-kaggle') if q.get(k, {}).get('batch') not in (None, bid) else q.get(k, {}).get('status')),
                                later=q.get(k, {}).get('batch') if q.get(k, {}).get('batch') not in (None, bid) else None,
                                flagged=k in flagged) for k in b.get('keys', [])],
                flags=[dict(f, batch=bid, text=calm(re.sub(KEYRE, '', f['text'], count=1).strip(' ,;:')),
                            check=next((k for k, rx in FLAGKIND if re.search(rx, f['text'], re.I)), None),
                            checked=(load(P('check_resolved.json'), {}).get(f"{f['key']}:{hashlib.sha1(f['text'].encode()).hexdigest()[:8]}") or {}).get('note')) for e in es for f in e['flags']], log=es,
                prev=ids[i - 1] if i else None, next=ids[i + 1] if i is not None and i + 1 < len(ids) else None)

SCHEDULE_FROM = datetime(2026, 10, 11, 14, 30)  # the routine's first slot window opened here
STAGES = [('discover', 'Find'), ('refind', 'Search again'), ('browse', 'Browser'), ('fetch3', 'Download'), ('snippets', 'Cut tables'),
          ('read', 'Read'), ('adjudicate', 'Settle'), ('final', 'Close')]
dt = lambda s: datetime.fromisoformat(s).replace(tzinfo=None) if s else None
def all_batches():
    bs = sorted((load(f) for f in glob.glob(P('batch', 'done', '*.json'))), key=lambda b: b['id'])
    cur = load(P('batch', 'current.json'))
    if cur and cur.get('stage') != 'closed' and cur['id'] not in {b['id'] for b in bs}: bs.append(cur)
    return bs

def corrections(entries):
    for e in entries:
        m = re.search(r'(\d+) (?:field )?corrections?(?: by the second checker)? (?:across (\d+) compan|\((\d+) compan)', e['text'])
        if m: return dict(count=int(m.group(1)), companies=int(m.group(2) or m.group(3)))
        m = re.search(r'settled (\d+) \((\d+) corrections', e['text'])
        if m: return dict(count=int(m.group(2)), companies=int(m.group(1)))
    return None

def runs_view(q):
    """One row per scheduled half-hour slot (did it open a batch, finish one, or find the lock held) plus attended batches.
    Slots are inferred: a run that stops at the gate or the lock writes nothing, so those rows say so."""
    bs, log, now = all_batches(), log_entries(q), datetime.now()
    hour = SCHEDULE_FROM.replace(minute=0, second=0); slots = []
    while hour <= now:
        slots += [s for m in SLOTS for s in [hour + timedelta(minutes=m) + JITTER] if SCHEDULE_FROM <= s <= now]
        hour += timedelta(hours=1)
    def row(b, **kw):
        es = [e for e in log if e['batch'] == b['id']]; o, c = dt(b.get('openedAt')), dt(b.get('closedAt'))
        stop = next((re.split(r'[:|]', e['text'].split('STOPPED', 1)[1])[0].strip() for e in es if 'STOPPED' in e['text']), None)
        mins = int(((c or now) - o).total_seconds() // 60) if o else None
        return dict(batch=b['id'], openedAt=b.get('openedAt'), closedAt=b.get('closedAt'), minutes=mins, overran=bool(mins and mins > SLOT_MIN),
                    counts=b.get('summary'), corrections=corrections(es), flags=sum(len(e['flags']) for e in es), stopped=stop, open=not c, **kw)
    out, used = [], set()
    for s in slots:
        w0, w1 = s - timedelta(minutes=3), s + timedelta(minutes=27)
        opened = [b for b in bs if b['id'] not in used and b.get('openedAt') and w0 <= dt(b['openedAt']) < s + timedelta(minutes=15)]
        finished = [b for b in bs if b.get('closedAt') and dt(b['openedAt']) < w0 and w0 <= dt(b['closedAt']) < w1]
        held = [b for b in bs if dt(b['openedAt']) < s and (not b.get('closedAt') or dt(b['closedAt']) > s)]
        if opened: used.add(opened[0]['id']); out.append(row(opened[0], slot=s.isoformat(timespec='minutes'), outcome='running' if not opened[0].get('closedAt') else 'opened', basis='logged'))
        elif finished: out.append(dict(row(finished[0], slot=s.isoformat(timespec='minutes'), outcome='resumed', basis='inferred'), note=f"Finished {finished[0]['id']}, which an earlier run left open."))
        elif held: out.append(dict(slot=s.isoformat(timespec='minutes'), outcome='skipped', batch=None, basis='inferred', note=f"{held[0]['id']} still held the lock, so this run stopped."))
        elif s < now - timedelta(minutes=3): out.append(dict(slot=s.isoformat(timespec='minutes'), outcome='lost', batch=None, basis='inferred', note='No batch opened: the usage gate, a held lock or a paused schedule.'))
    out += [row(b, slot=None, outcome='attended', basis='logged') for b in bs if b['id'] not in used and b['id'] not in {r.get('batch') for r in out}]
    out.sort(key=lambda r: r.get('slot') or r.get('openedAt') or '', reverse=True)
    return dict(runs=out, log=list(reversed(log)), slotsFrom=SCHEDULE_FROM.isoformat(timespec='minutes'))

FLAGKIND = [('identity', r'IDENTITY|\bCIN\b|mapping|unidentifiable|\bperson\b'), ('value', r'looks? (high|low|misprint)|misprint|implausible|kept null|\bnull\b'),
            ('unit', r'\bunits?\b|lakh|rupees|crore'), ('basis', r'like-for-like|post-merger|renamed|demerg|boundary')]
def decisions(q, log):
    """Checker flags that ask the owner to decide something, newest first. A flag that only reports a blocked site is a
    fetch row instead; one that fits no kind shows in its batch only. A flag an attended session has checked
    (data/check_resolved.json) leaves the list, unless it still needs the owner, when it asks its own question."""
    out, seen, res = [], set(), load(P('check_resolved.json'), {})
    for e in reversed(log):
        for f in e['flags']:
            kind = next((k for k, rx in FLAGKIND if re.search(rx, f['text'], re.I)), None)
            fid = f"{f['key']}:{hashlib.sha1(f['text'].encode()).hexdigest()[:8]}"
            r = res.get(fid) or {}
            if f['kind'] != 'check' or not kind or not f['key'] or fid in seen or r.get('verdict') in ('fine', 'fixed'): continue
            seen.add(fid); out.append(dict(id=fid, key=f['key'], name=display_name(q.get(f['key'], {}), f['key'])[0], kind=kind, ask=r.get('ask') or ASK[kind], note=r.get('note'),
                                           text=cap(calm(re.sub(KEYRE, '', f['text'], count=1).strip(' ,;:'))), batch=e['batch'], at=e['when']))
    return out
ASK = dict(identity='Is this the right company?', value='Is this figure right?', unit='Which unit is right?', basis='Can it be compared with last year?')

def inbox_view(q):
    """Everything the owner does by hand: fetch rows with links, files sent and where each is, unmatched files, decisions."""
    n = needs(q); q2 = overlay(q); waiting = inbox_matches(q2); log = log_entries(q2); nxt = run_state(None, None, [])['nextRun']
    fetch = [c for c in n['companies'] if not c['received'] or c.get('again')]
    listed = {c['key'] for c in fetch}
    for e in log:
        for f in e['flags']:
            v = q2.get(f['key'] or '', {})
            if f['kind'] == 'download' and f['key'] not in listed and f['key'] not in waiting and v.get('status') == 'done-kaggle' and not v.get('manual') and not v.get('staleReason'):
                listed.add(f['key']); fetch.append(dict(key=f['key'], name=display_name(v, f['key'])[0], reason=f"flagged in {e['batch']}: needs a person to download",
                                                        links=links_for(f['key'], v), received=None))
    files = []
    for k, w0 in waiting.items():
        for w in [w0] + w0.get('more', []):
            files.append(dict(key=k, name=display_name(q2[k], k)[0], file=w['file'], step=2, problem=None if w['brsr'] else 'no-brsr',
                              text=f"Matched. Taken in when the next batch opens, about {nxt[11:]}." if w['brsr'] else 'Matched, but the file holds no BRSR.'))
    for f in n['unmatched']:
        files.append(dict(key=None, name=None, file=f, step=1, problem='unmatched', text='In the inbox. No company found by its CIN, name or file name.'))
    for k, v in q2.items():
        if not v.get('manual') or k in waiting or v['status'] == 'merged': continue  # a duplicate's file shows on the entry it merged into
        if v['status'] == 'no-data' and M.NOT_OUT.search(v.get('noDataReason') or ''): continue  # an older year's file, its report not out yet: the watch has it (ITI)
        st, stale = v['status'], v.get('staleReason')
        mine = [x for x in v.get('fetches') or [] if (x.get('url') or '').endswith(urllib.parse.quote(v['manual']))]
        # the year of the file now on record, not of an older one the owner sent before it
        old = sorted({(x.get('fy') or '').lstrip('~') for x in mine or v.get('fetches') or [] if (x.get('url') or '').startswith('file:') and x.get('hasBRSR') and (fy_start(x.get('fy')) or 9999) < 2025})
        step, prob, text = ((5, None, 'FY2025-26 read and checked.') if st == 'done-latest' else
                            (4, None, f"Being read in {v.get('batch')}.") if st == 'in-batch' else
                            (3, None, 'Taken in. Read when its batch opens.') if st == 'todo' else
                            (5, None, 'Deep pass done.') if st == 'done-deep' else
                            # no usable report: an older year is asked for again; a file with no BRSR in it is not "read"
                            # its year read again by the parser: the next batch sends it back to be read (batch.recheck_closed)
                            (3, None, 'Taken in. Read when the next batch opens.') if st == 'no-data' and not v.get('noDataReason') and not any(x.get('status') == 'ok' and is_latest(x.get('fy')) for x in v.get('fetches') or []) and has_latest_text(k) else
                            (3, 'older-year', f'The file is the {yr_label(old[-1])} BRSR. Save the FY2025-26 one.') if st == 'no-data' and old else
                            (5, 'no-brsr', 'The file holds no BRSR.' + (' ' + v['noDataReason'] + '.' if v.get('noDataReason') else '')) if st == 'no-data' and mine and not any(x.get('hasBRSR') for x in mine) else
                            (5, 'no-figure', 'Read. ' + (v.get('noDataReason') or 'It gives no payroll figure') + '.') if st == 'no-data' else
                            (5, None, f'Closed: {stale}.') if stale else
                            (3, None, 'Taken in. Read when the next batch opens.') if has_latest_text(k) else
                            (3, 'older-year', f'The file is the {yr_label(old[-1])} BRSR. Save the FY2025-26 one.') if old else
                            (3, 'no-brsr', 'The file holds no BRSR. It stays on FY2024-25.') if mine and not any(x.get('hasBRSR') for x in mine) else
                            (5, None, 'Closed.'))
        files.append(dict(key=k, name=display_name(v, k)[0], file=v['manual'], step=step, problem=prob, text=text, done=step == 5))
    return dict(fetch=sorted(fetch, key=lambda c: c['name'].lower()), files=files, decisions=decisions(q2, log), inbox=INBOX,
                nothing=[dict(name=a, reason=b) for a, b in n['nothing']])

LEVELS = ['board', 'kmp', 'top', 'senior', 'middle', 'junior', 'staff', 'workers']
def company_view(key):
    q = overlay(load(P('queue.json'), {})); v = q.get(key, {})
    if not v: return dict(error='No such company')
    r = (rows('select * from readings where key = ?', (key,)) or [{}])[0]
    pct = lambda a, b: round(100 * a / b, 1) if a is not None and b else None
    staff_w = sum(r.get(c) or 0 for c in ('perm_emp_women', 'perm_wkr_women')); staff_t = sum(r.get(c) or 0 for c in ('perm_emp_total', 'perm_wkr_total'))
    st = v['status']; retry = bool(v.get('retry') and st in ('todo', 'in-batch'))
    # one line on why, only where the status badge and batch link do not already say it
    why = (why_2425(key, v) if st == 'done-kaggle' else (v.get('noDataReason') or 'No usable report was found') + '.' if st == 'no-data' else
           'Duplicate of another entry.' if st == 'merged' else None)
    fetch_rows = inbox_view(load(P('queue.json'), {}))['fetch'] if st == 'done-kaggle' else []
    you = next((c for c in fetch_rows if c['key'] == key), None)
    nxt = (dict(who='you', text='Save its FY2025-26 report or BRSR in the inbox.') if you else
           dict(who='pipeline', text='Read when its batch opens.') if st == 'todo' or v.get('pendingRequeue') else None)
    trail = []
    f = load(P('found', key + '.json'))
    if f:
        n = len(f.get('candidates') or []); word = {'found': 'Links found', 'not-published': 'Not published yet', 'not-found': 'Nothing found', 'site-blocked': 'Site blocks automated visitors'}.get(f.get('status'), cap(f.get('status') or 'Searched'))
        trail.append(dict(step='Searched', text=f"{word} · {n} link{'' if n == 1 else 's'}"))
    for x in v.get('fetches') or []:  # one line per distinct attempt, repeats counted
        u = urllib.parse.urlparse(x.get('url') or ''); ok = x.get('status') == 'ok'
        line = dict(step='Downloaded' if ok else 'Tried', host='your file' if u.scheme == 'file' else u.netloc.replace('www.', ''),
                    path='' if u.scheme == 'file' else (lambda pth: pth if len(pth) <= 60 else '…' + pth[-58:])(urllib.parse.unquote(u.path)), code=re.sub(r'(\d{3})(,\1)+', r'\1', x.get('http') or '') or x.get('status'),
                    fy=(x.get('fy') or '').lstrip('~') or None, brsr=bool(x.get('hasBRSR')), n=1)
        same = trail and trail[-1].get('host') == line['host'] and trail[-1].get('path') == line['path'] and trail[-1]['step'] == line['step']
        if same: trail[-1]['n'] += 1
        else: trail.append(line)
    for name, label in (('read', 'Read (Haiku)'), ('final', 'Settled (Sonnet)'), ('verified', 'Accepted')):
        p = P('read', f'{key}.haiku.json') if name == 'read' else P('read', f'{key}.final.json') if name == 'final' else P('verified', f'{key}.json')
        if os.path.exists(p): trail.append(dict(step=label, text=datetime.fromtimestamp(os.path.getmtime(p)).strftime('%d %b %H:%M')))
    res = load(P('check_resolved.json'), {})
    flags = [dict(text=cap(calm(re.sub(KEYRE, '', fl['text'], count=1).strip(' ,;:'))), batch=e['batch'], check=next((k for k, rx in FLAGKIND if re.search(rx, fl['text'], re.I)), None),
                  checked=(res.get(f"{key}:{hashlib.sha1(fl['text'].encode()).hexdigest()[:8]}") or {}).get('note'))
             for e in log_entries(q) for fl in e['flags'] if fl['key'] == key]
    name, ok = display_name(v, key)
    checked = (rows('select checked_by from companies where key = ?', (key,)) or [{}])[0].get('checked_by')
    prof = (rows('select assurance_provider, assurance_type from profile where key = ?', (key,)) or [{}])[0]
    assured = prof.get('assurance_provider') if (prof.get('assurance_provider') or '').strip().upper() not in ('', 'NA', 'N/A', 'NONE', 'NIL', 'NOT APPLICABLE') else None
    targets = rows('select * from targets where key = ? order by seq', (key,))  # topic and progress arrive with the next rebuild
    years = company_years(key, load(P('verified', key + '.json'))); rel = relations_view(key, q)
    if any(r['kind'] == 'merger' and r['side'] == 'from' for r in rel): why = None  # Related companies says it once
    why = cap(why)
    return dict(key=key, name=name, nameOk=ok, checkedBy=checked, mark=M.marks(DATA).get(key) if M.markable(v) else None, markable=M.markable(v), markKinds=M.KINDS, **{f: v.get(f) for f in ('listedOn', 'brsrFrom', 'brsrBasis', 'brsrNote')}, assurance=dict(provider=assured, type=prof.get('assurance_type')) if prof else None, targets=targets, years=years, relations=rel, watched=key in M.watch_list(load(P('queue.json'), {}), DATA), fy27=fy27_of(key, fy27().get('companies', {}), M.marks(DATA)), formerly=former_name(v), cin=ids().get(key, {}).get('cin') or v.get('cin'), ids={f: x for f, x in ids().get(key, {}).items() if f in ('isin', 'nse', 'bseId', 'bseCode', 'cinNote')}, kind='Nivel company' if (v.get('kind') or '').startswith('nivel') or v.get('nivelMatch') else None, website=v.get('website'), status=st, retry=retry,
                batch=v.get('batch'), fy=r.get('fy'), why=why, next=nxt, links=links_for(key, v), flags=flags, trail=trail,
                values=dict(share=r.get('wage_share_current'), prior=r.get('wage_share_prior'), staffPct=pct(staff_w, staff_t), staffW=staff_w or None, staffT=staff_t or None,
                            boardW=r.get('board_women'), boardT=r.get('board_total'), kmpW=r.get('kmp_women'), kmpT=r.get('kmp_total'), boundary=r.get('boundary'),
                            builtAt=datetime.fromtimestamp(os.path.getmtime(DB)).isoformat(timespec='minutes') if os.path.exists(DB) else None),
                ladder=rows('select level, standard, men, women, women_pct from ladder where key = ? order by seq', (key,)),
                functions=rows('select * from functions where key = ?', (key,)), raw=company(key))

FY27 = P('rankings', 'fy2026-27.json')
def ids():
    """Each company's CIN, ISIN, NSE symbol and BSE scrip ID and code (identifiers.py)."""
    return (load(P('identifiers.json'), {}) or {}).get('companies', {})

def fy27():
    """Who files a BRSR for FY2026-27, from rankings.py: {companies: {key: {group, note, edge, ranks}}, outside: [...]}."""
    return load(FY27, {}) or {}
def fy27_of(k, F, mk):
    """A company's FY2026-27 record, with a mark made since rankings.py last ran taking effect at once."""
    x, m = F.get(k), mk.get(k)
    if x and m and m.get('kind') in ('merged', 'delisted') and x.get('group') != 'leaves':
        x = dict(x, group='leaves', edge=False, note=f"Not expected to file for FY2026-27: {M.reason(m)}.")
    elif x and m and m.get('kind') == 'insolvent' and 'insolvency' not in x.get('note', ''):  # still required: Regulation 34(2)(f) does not lapse in CIRP
        x = dict(x, note=x['note'] + ' It is in insolvency: Regulation 34(2)(f) still applies, but it is unlikely to file while in CIRP.')
    return x
def fy27_rank(x):
    """The better exchange rank on the 31 December 2025 list, and its exchange."""
    r = (x or {}).get('ranks', {}).get('2025') or {}
    return min(((n, e.upper()) for e, n in r.items()), key=lambda z: (z[0], z[1] != 'NSE'), default=(None, None))

def companies_all():
    """Every company (duplicates left out): status from the live queue, values from the last SQLite build."""
    q = overlay(load(P('queue.json'), {})); waiting = inbox_matches(q)
    vals = {r['key']: r for r in rows("""select c.key, c.fy, c.checked_by, r.wage_share_current share,
             round(100.0 * (coalesce(r.perm_emp_women,0) + coalesce(r.perm_wkr_women,0)) / nullif(coalesce(r.perm_emp_total,0) + coalesce(r.perm_wkr_total,0), 0), 1) women_staff,
             r.board_women, r.board_total, r.kmp_women, r.kmp_total,
             (select count(*) from ladder l where l.key = c.key and l.standard not in ('board','kmp','staff','workers')) finer_levels,
             (select count(*) from functions f where f.key = c.key) functions
             from companies c left join readings r on r.key = c.key""")}
    levels = {}
    for x in rows('select distinct key, standard from ladder where women is not null and men is not null'): levels.setdefault(x['key'], []).append(x['standard'])  # as ladder_by_standard counts
    out, R, mk, I = [], fy27(), M.marks(DATA), ids(); F = R.get('companies', {})
    for k, v in q.items():
        if v['status'] == 'merged': continue
        r = vals.get(k, {}); nd = v['status'] == 'no-data'; w = nodata_reason(v) if nd else reason_2425(k, v, waiting)
        name, ok = display_name(v, k)
        out.append(dict(key=k, name=name, nameOk=ok, levels=levels.get(k, []), cin=I.get(k, {}).get('cin') or v.get('cin'), isin=I.get(k, {}).get('isin'), nse=I.get(k, {}).get('nse'), bseCode=I.get(k, {}).get('bseCode'), website=v.get('website'), kind=v.get('kind'), status=v['status'],
                        retry=bool(v.get('retry') and v['status'] in ('todo', 'in-batch')), retriedFrom=v.get('retriedFrom'), batch=v.get('batch'), ownerFile=bool(v.get('manual')),
                        formerly=former_name(v), fy27=(fy27_of(k, F, mk) or {}).get('group'), fy27Edge=(fy27_of(k, F, mk) or {}).get('edge'), **dict(zip(('fy27Rank', 'fy27Ex'), fy27_rank(F.get(k)))),
                        **{f: v.get(f) for f in ('listedOn', 'brsrFrom', 'brsrBasis', 'brsrNote')}, **dict(zip(('whyTag', 'whyLabel'), (nodata_tag(w) if nd else why_tag(w)) if w else (None, None))), why=w, **{c: r.get(c) for c in ('fy', 'checked_by', 'share', 'women_staff', 'board_women', 'board_total', 'kmp_women', 'kmp_total', 'finer_levels', 'functions')}))
    return dict(companies=out, builtAt=datetime.fromtimestamp(os.path.getmtime(DB)).isoformat(timespec='minutes') if os.path.exists(DB) else None,
                fy27=dict(outside=[dict(x, name=nice(x['name'])) for x in R.get('outside', [])], source=R.get('source'), builtAt=R.get('builtAt')) if R else None)

def overview():
    """Everything the landing view needs in one call: the run, progress, pace, the owner's work, breakdowns and the ladder."""
    p = progress(); q = load(P('queue.json'), {}); bs = all_batches(); closed = [b for b in bs if b.get('closedAt')]
    cur = load(P('batch', 'current.json')); rs = run_state(cur, p['lock'], closed); c = p['counts']
    log = log_entries(q); open_id = rs['batch']
    stop = open_id and rs['state'] == 'idle' and any('STOPPED' in e['text'] for e in log if e['batch'] == open_id) and not any(
        'closed' in e['text'] for e in log if e['batch'] == open_id and 'STOPPED' not in e['text'])
    left = p['total'] - p['done']
    word = ('finished' if not c.get('todo') and not c.get('in-batch') else
            ('stuck' if rs['minutes'] > 90 else 'overrunning' if rs['overrun'] else 'running') if rs['state'] == 'running' else
            'stopped' if stop else 'paused' if rs['gated'] or rs['guardTripped'] else 'idle')
    best = datetime.now() + timedelta(hours=left / 50)
    pace = dict(rate=p['ratePerHour'], batches=p['paceBatches'], cap=50, left=left,
                best=best.isoformat(timespec='minutes'))
    ix = next((i for i, (s, _) in enumerate(STAGES) if p['open'] and s == p['open']['stage']), None)
    return dict(progress=p, run=dict(rs, word=word, stageIndex=ix), stages=[n for _, n in STAGES], pace=pace, inbox=inbox_view(q), watch=watch_view(load(P('queue.json'), {})),
                ladder=rows('select * from ladder_by_standard'), finer=(rows("select count(distinct key) n from ladder where standard not in ('board','kmp','staff','workers')") or [{}])[0].get('n'),
                builtAt=datetime.fromtimestamp(os.path.getmtime(DB)).isoformat(timespec='minutes') if os.path.exists(DB) else None, now=datetime.now().isoformat(timespec='seconds'))

def rows(sql, args=()):
    if not os.path.exists(DB): return []
    con = sqlite3.connect(f'file:{DB}?mode=ro', uri=True); con.row_factory = sqlite3.Row
    try: return [dict(r) for r in con.execute(sql, args).fetchall()]
    finally: con.close()

def company(key):
    q = load(P('queue.json'), {}).get(key, {})
    return dict(queue=q, verified=load(P('verified', key + '.json')), haiku=load(P('read', key + '.haiku.json')), final=load(P('read', key + '.final.json')),
                found=load(P('found', key + '.json')), parser=load(P('cand', key + '.json')))

def hierarchy():
    # Most companies report a function only as a percentage, so a function's share is the average of each company's share.
    return dict(ladder=rows('select * from ladder_by_standard order by companies desc'),
                functions=rows("""select standard, count(distinct key) companies, sum(women) women, sum(men) men,
                    round(avg(coalesce(women_pct, 100.0 * women / nullif(women + men, 0))), 1) women_pct_avg,
                    sum(women is null or men is null) pct_only from functions group by standard order by companies desc"""),
                reported=rows("""select count(distinct key) companies from ladder where standard not in ('board','kmp','staff','workers')"""))

def relations_view(key, q):
    """The company's mergers and demergers from its side (relations.py), with each other party linked when the build
    holds it (a duplicate entry stands for the one it merged into), and where each breaks its Years table
    (relations.break_fy)."""
    ev = REL.load(DATA, q, M.marks(DATA))
    def party(p):
        k = p.get('key')
        while k in q and q[k]['status'] == 'merged' and q[k].get('mergedInto'): k = q[k]['mergedInto']
        k = k if k in q else None
        name = display_name(q[k], k)[0] if k else (p.get('after') or p.get('name'))
        name = nice(re.sub(r'\s*\((formerly|erstwhile|earlier)\b[^)]*\)', '', name or '', flags=re.I).strip())  # the other pane gives the old name
        return dict(key=k if k != key else None, name=name, new=p.get('new'), listed=p.get('listed'), isin=p.get('isin'), wasListed=p.get('wasListed'))
    out = []
    for e in REL.of(key, ev):
        other = 'to' if e['side'] == 'from' else 'from'
        me = next(p for p in e[e['side']] if p.get('key') == key)
        brk = REL.break_fy(e) if e['kind'] != 'merger' or e['side'] == 'to' else None  # a company merged away has no years after
        out.append(dict(kind=e['kind'], side=e['side'], effective=e.get('effective'), business=e.get('business'), source=e.get('source'), quote=e.get('quote'),
                        fromMark=bool(e.get('fromMark')), me=party(me), others=[party(p) for p in e[other]], peers=[party(p) for p in e[e['side']] if p.get('key') != key], breakFy=brk))
    return out

def company_years(key, latest):
    """One row per year for the pane's Years table: the FY2025-26 reading, each history store's reading, and the wage share
    each report gives for its previous year (marked 'prior'), newest first."""
    out = {}
    def add(v, src):
        if not v or not v.get('fy'): return
        h = v.get('headcount') or {}; w = sum((h.get(g) or {}).get('women') or 0 for g in ('permEmployees', 'permWorkers'))
        t = sum((h.get(g) or {}).get('total') or 0 for g in ('permEmployees', 'permWorkers'))
        b, m = v.get('board') or {}, v.get('kmp') or {}
        out.setdefault(v['fy'].lstrip('~'), dict(fy=v['fy'].lstrip('~'), share=(v.get('wageShare') or {}).get('current'), staffPct=round(100 * w / t, 1) if t else None,
                       boardW=b.get('women'), boardT=b.get('total'), kmpW=m.get('women'), kmpT=m.get('total'), source=src))
        prior, y = (v.get('wageShare') or {}).get('prior'), fy_start(v['fy'])
        if prior is not None and y: out.setdefault(f'{y - 1}-{str(y)[2:]}', dict(fy=f'{y - 1}-{str(y)[2:]}', share=prior, source='prior'))
    add(latest, 'reading')
    for d in sorted(glob.glob(P('history', '*', 'verified', key + '.json')), reverse=True): add(load(d), 'history')
    return sorted(out.values(), key=lambda r: r['fy'], reverse=True)

def mark(body):
    """The owner's marks (PARITY-127, PARITY-128): no BRSR filed, merged (into, on), insolvent (since) or delisted (on), only
    for a company still on FY2024-25; kind null clears one. The only write this dashboard makes, to data/owner_marks.json;
    batch.py carries it into the queue when the next batch opens."""
    key, kind = body.get('key', ''), body.get('kind')
    v = load(P('queue.json'), {}).get(key)
    if not v: return dict(error='No such company')
    if 'kind' not in body or (kind and kind not in M.KINDS): return dict(error='Unknown mark: reload the page')
    if kind and not M.markable(v): return dict(error='Only a company without a FY2025-26 BRSR can be marked')
    into = re.sub(r'\s+', ' ', str(body.get('into') or '')).strip()[:120] if kind == 'merged' else ''
    since = str(body.get('since') or '').strip() if kind in M.GONE_KINDS else ''
    try:  # stored in the form reason() reads back; an Undo sends the original time
        if since: since = datetime.strptime(since, '%Y-%m-%d').date().isoformat()
        at = datetime.fromisoformat(str(body['at'])).isoformat(timespec='seconds') if kind and body.get('at') else None
    except ValueError: return dict(error='Enter the date as a full date')
    note = str(body.get('note') or '').strip()[:200] if kind else ''
    prev, now = M.set_mark(DATA, key, kind, into=into or None, since=since or None, note=note or None, at=at)
    return dict(ok=True, key=key, prev=prev, mark=now)

def watch_view(q):
    w = load(P('watch', 'latest.json'), {}); now = datetime.now()
    nxt = now.replace(hour=WATCH_AT[0], minute=WATCH_AT[1], second=0, microsecond=0); nxt += timedelta(days=1) if nxt <= now else timedelta()
    return dict(last=w.get('at'), checked=len(w.get('checked', [])), found=w.get('found', []), blocked=len(w.get('blocked', [])),
                watching=len(M.watch_list(q, DATA)), next=nxt.isoformat(timespec='minutes'), pending=list(M.found(DATA)))
WATCH_AT = (9, 21)  # the nivel-brsr-watch routine's daily start (09:15 plus the app's delay)

def sql(q):
    s = q.strip().rstrip(';')
    if not s.lower().startswith(('select', 'with')) or ';' in s: return dict(error='Read-only: one SELECT or WITH query.')
    try: return dict(rows=rows(f'select * from ({s}) limit 500'))
    except sqlite3.Error as e: return dict(error=str(e))

STATIC = {'/': ('index.html', 'text/html'), '/ui.css': ('ui.css', 'text/css'), '/ui.js': ('ui.js', 'text/javascript'), '/app.js': ('app.js', 'text/javascript')}

class H(BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def send(self, body, kind='application/json', etag=None):
        b = body.encode() if isinstance(body, str) else json.dumps(body, ensure_ascii=False, default=str).encode()
        self.send_response(200); self.send_header('Content-Type', kind + '; charset=utf-8'); self.send_header('Cache-Control', 'no-store')
        if etag: self.send_header('ETag', etag)
        self.end_headers(); self.wfile.write(b)
    def do_GET(self):
        u = urlparse(self.path); a = {k: v[0] for k, v in parse_qs(u.query).items()}
        if u.path in STATIC:  # the page, its component library and the app, read from disk so edits show without a restart
            name, kind = STATIC[u.path]
            return self.send(open(os.path.join(HERE, 'dashboard', name)).read(), kind)
        if u.path == '/api/overview': return self.send(overview())
        if u.path == '/api/runs': return self.send(runs_view(load(P('queue.json'), {})))
        if u.path == '/api/batch': return self.send(batch_detail(a.get('id', '')))
        if u.path == '/api/companies-all':  # about 500 KB: answered from the browser's copy until the queue, a pending change or SQLite moves
            tag = '"%s"' % '-'.join(str(os.stat(p).st_mtime_ns) if os.path.exists(p) else '0' for p in (P('queue.json'), P('pending.json'), P('owner_marks.json'), P('watch', 'found'), DB, FY27, P('identifiers.json')))
            if self.headers.get('If-None-Match') == tag: self.send_response(304); self.end_headers(); return
            return self.send(companies_all(), etag=tag)
        if u.path == '/api/company-view': return self.send(company_view(a.get('key', '')))
        if u.path == '/api/hierarchy': return self.send(hierarchy())
        self.send_response(404); self.end_headers()
    def do_POST(self):
        # Only this page may write: a page on another site can send a POST to 127.0.0.1 too.
        if self.headers.get('Origin') not in (None, f'http://127.0.0.1:{self.server.server_port}', f'http://localhost:{self.server.server_port}'):
            self.send_response(403); self.end_headers(); return
        path = urlparse(self.path).path; n = int(self.headers.get('Content-Length', 0))
        try: body = json.loads(self.rfile.read(n) or b'{}')
        except ValueError: body = {}
        if path == '/api/sql': return self.send(sql(body.get('q', '')))
        if path == '/api/mark': return self.send(mark(body))
        self.send_response(404); self.end_headers()


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    print(f'Parity dashboard on http://127.0.0.1:{port}  (Ctrl+C stops it)')
    ThreadingHTTPServer(('127.0.0.1', port), H).serve_forever()
