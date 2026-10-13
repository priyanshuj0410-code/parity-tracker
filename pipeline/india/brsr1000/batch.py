"""Batch control for the BRSR filer build (PARITY-123, knowledge/playbooks/brsr1000-batch.md). Every step is resumable:
the batch file records its stage, so a run cut short picks up where it stopped.

    python3 batch.py next     <data> [n]   open the next batch of n companies (default 25), or show the open one
    python3 batch.py fetch    <data>       download each company's found reports, in order, until a FY2025-26 BRSR lands
    python3 batch.py browse   <data>       headless-browser visit for companies still missing after the second search
    python3 batch.py snippets <data>       cut the tables for checking (latest report, else the Kaggle FY2024-25 file)
    python3 batch.py merge    <data>       compare the first reading with the parser; agreed readings are final
    python3 batch.py final    <data>       take adjudicated readings, close the batch, rebuild brsr1000.sqlite, print the summary
    python3 batch.py status   <data>       queue counts
    python3 batch.py dedupe   <data> KEEP=DROP ...   merge duplicate queue entries (KEEP=SYMBOL links a Nivel ticker)
    python3 batch.py gate     <data>       exit 3 (stop) if the usage guard is tripped, the week is at 78%+ or the 5-hour window at 75%+
    python3 batch.py lock     <data>       take the run lock; exit 3 if another run took it under 90 minutes ago
    python3 batch.py unlock   <data>       release the run lock
"""
import glob, hashlib, json, os, re, subprocess, sys, urllib.parse, shutil
from datetime import datetime
from brsr_fields import CIN, is_latest, fy_start

cmd, data = sys.argv[1], sys.argv[2]
HERE = os.path.dirname(os.path.abspath(__file__))
P = lambda *a: os.path.join(data, *a)
for d in ('batch', 'batch/done', 'found', 'read', 'verified'): os.makedirs(P(d), exist_ok=True)
Q = json.load(open(P('queue.json')))
def save_json(p, obj):  # atomic, so the dashboard never reads half a file
    with open(p + '.tmp', 'w') as fh: json.dump(obj, fh, indent=1, ensure_ascii=False)
    os.replace(p + '.tmp', p)
def save_q(): save_json(P('queue.json'), Q)
def load(p, default=None): return json.load(open(p)) if os.path.exists(p) else default
B = load(P('batch', 'current.json'))
# A history store (data/history/<fy>/, made by `history-init`) holds one earlier year: it reads local texts, so its batches
# start at snippets, and it never takes the owner's inbox, pending changes, marks or the watch's finds.
HISTORY = load(P('history.json'))
def save_b(): save_json(P('batch', 'current.json'), B)

INBOX = os.path.expanduser('~/brsr reports 2025-26/inbox')
MARKER = os.path.join(HERE, '..', '..', '..', '.plane_current_issue')  # the repo root's Plane marker
# The Plane issue a run's file writes are credited to: the build (PARITY-123), or another named with --issue (the late-filer
# watch runs its batches as PARITY-127).
OUR_ISSUE = next((a.split('=', 1)[1] for a in sys.argv if a.startswith('--issue=')), 'PARITY-123|b0e815e8-8fd2-47b1-af1d-f81a2b7d6515')

def take_inbox():
    """Reports the owner saved by hand (the dashboard's "Needs you" tab) land in INBOX under any name. Each is read,
    matched to its company by CIN, then by name, recorded as a download from that file, and moved to INBOX/done/.
    A closed company is sent back to be read (here, or by recheck_closed()). A file that matches no company stays put."""
    sys.path.insert(0, HERE); from brsr_fields import entity, reporting_year, is_latest
    os.makedirs(os.path.join(INBOX, 'done'), exist_ok=True)
    from inbox import matcher
    match = matcher(Q, (load(P('identifiers.json'), {}) or {}).get('companies', {}))  # the same matcher the dashboard shows
    took, left = [], []
    for fn in sorted(os.listdir(INBOX)):
        p = os.path.join(INBOX, fn)
        if not fn.lower().endswith('.pdf') or not os.path.isfile(p): continue
        tmp = P('tmp', 'inbox.txt')
        subprocess.run(['/opt/homebrew/bin/pdftotext', '-layout', '-l', '400', p, tmp], capture_output=True)
        t = open(tmp, errors='ignore').read() if os.path.exists(tmp) else ''
        if not re.search(CIN, t):  # a report whose values are drawn as images prints no CIN in its text: read it with OCR
            sys.path.insert(0, HERE); from ocr import ocr_pdf
            if ocr_pdf(p, tmp) > 300: t = open(tmp, errors='ignore').read()
        e = entity(t)
        cins = re.findall(CIN, t)  # an annual report prints its own CIN on many pages
        k, how, learn = match(fn, max(set(cins), key=cins.count) if cins else e.get('cin'), e.get('name'), e.get('website'))
        if not k: left.append(fn); continue
        if learn: Q[k]['cin'] = learn  # the owner's label gave a CIN the company had none for
        url = 'file://' + urllib.parse.quote(os.path.join(INBOX, 'done', f'{k}__{fn}'))
        os.replace(p, os.path.join(INBOX, 'done', f'{k}__{fn}'))
        subprocess.run([sys.executable, os.path.join(HERE, 'fetch.py'), data, k, url, '--fy', reporting_year(t) or '2025-26'], capture_output=True)
        Q[k]['fetches'] = [json.loads(l) for l in open(P('fetch', k + '.jsonl'))]
        Q[k]['manual'] = fn; took.append(k)
        # recheck_closed() sends back a FY2024-25 company; a Nivel company's deep pass or a "no usable report" goes back
        # here, when the file replaced its text with a FY2025-26 BRSR.
        last, st = Q[k]['fetches'][-1], Q[k]['status']
        if st in ('done-deep', 'no-data') and last.get('hasBRSR') and not last.get('kept') and is_latest(last.get('fy')):
            Q[k].update(status='todo', retry=True, retriedFrom=st)
    json.dump(left, open(P('inbox_unmatched.json'), 'w'))
    return took

def later(kv):
    """Queue order: companies sent back for another read, and those with a file the owner saved to the inbox, go first."""
    return not (kv[1]['status'] == 'todo' and (kv[1].get('retry') or kv[1].get('manual')))

def recheck_closed():
    """A company closed on FY2024-25 whose downloaded FY2025-26 text does hold a BRSR (missed by the stricter test used
    before 11 October 16:55) goes back to the head of the queue to be read from it. So does one closed with no usable
    report whose text was taken in as of an unread year that the parser now reads as FY2025-26 (the far-window rule of
    12 October). Runs as each batch opens. A deep pass read from FY2024-25 text goes back the same way when
    its FY2025-26 text's year is now read (dates in table columns, 13 October)."""
    global Q
    sys.path.insert(0, HERE); from brsr_fields import is_brsr, reporting_year
    back = []
    for k, v in Q.items():
        if v['status'] == 'no-data':
            # skipped once a FY2025-26 BRSR was read; an annual report of that year with no BRSR in it does not count (Arvind SmartSpaces)
            if v.get('noDataReason') or any(x.get('status') == 'ok' and x.get('hasBRSR') and is_latest(x.get('fy')) for x in v.get('fetches') or []): continue
        elif v['status'] == 'done-deep':  # deep-read from FY2024-25 text while its FY2025-26 BRSR's year went unread (Delhivery)
            if is_latest((load(P('verified', k + '.json')) or {}).get('fy')): continue
        elif v['status'] != 'done-kaggle': continue
        for name in (k + '.txt', k + '.ar.txt'):
            p = P('latest', 'txt', name)
            if not os.path.exists(p): continue
            t = open(p, errors='ignore').read(); fy = reporting_year(t) or ''
            if is_brsr(t) and is_latest(fy):
                if name.endswith('.ar.txt'): os.replace(p, P('latest', 'txt', k + '.txt'))
                last = next((x for x in reversed(v.get('fetches') or []) if x.get('status') == 'ok'), {})
                rec = dict(url=last.get('url'), role='brsr', status='ok', fy=fy, words=len(t.split()), hasBRSR=True, recheck='BRSR test loosened' if v['status'] == 'done-kaggle' else 'year read again')
                with open(P('fetch', k + '.jsonl'), 'a') as f: f.write(json.dumps(rec) + '\n')
                v.setdefault('fetches', []).append(rec); v.update(status='todo', retry=True, retriedFrom=v['status']); back.append(k)
                break
    Q = dict(sorted(Q.items(), key=later))
    return back

JUNK = re.compile(r'^\W*$|^(person|bse|nse|to|sir|madam|dear|thanking)\b|^india\W*$|^(the\s+)?company\W*$|^.{0,5}$', re.I)

def fix_names():
    """Queue names first came from parsing the Kaggle text, which sometimes took a cover-letter sign-off ("For X Limited"),
    a shareholder table ("person") or nothing. A checked FY2025-26 reading's name, CIN and website replace them; an unread record
    gets the sign-off stripped, or a fresh parse of its filing. Runs as each batch opens."""
    sys.path.insert(0, HERE); from brsr_fields import entity
    by_id = load(P('kaggle', 'name_fixes.json'), {})  # hand-checked names for filings with none to parse, by Kaggle id
    fixed = []
    for k, v in Q.items():
        if v['status'] == 'merged' or v['kind'] != 'new' or v.get('nameByOwner'): continue  # Nivel's records and owner-set names stay
        if v.get('kaggleId') in by_id and v.get('name') != by_id[v['kaggleId']] and JUNK.search(v.get('name') or ''):
            v['name'] = by_id[v['kaggleId']]; fixed.append(k); continue
        r = load(P('verified', k + '.json'))
        if r and not is_latest(r.get('fy')): r = None  # an older year's reading carries the name it had then (Tata Motors, now TMPV)
        if r and r.get('name') and not JUNK.search(r['name']):
            new = {f: r.get(f) for f in ('name', 'cin', 'website') if r.get(f) and r.get(f) != v.get(f)}
        else:
            n = re.sub(r'^(?:Thanking\s+You,?\s*)?(?:Yours\s+\w+,?\s*)?For\s+', '', (v.get('name') or '').strip(), flags=re.I).strip(' “”"\'.,:')
            if JUNK.search(n) and v.get('kaggleFile'):
                p = P('kaggle', 'txt', v['kaggleFile'][:-4] + '.txt')
                e = entity(open(p, errors='ignore').read()) if os.path.exists(p) else {}
                n = e.get('name') or n
                if not v.get('cin') and e.get('cin'): v['cin'] = e['cin']
            new = {'name': n} if n and n != v.get('name') and not JUNK.search(n) else {}
        if new: v.update(new); fixed.append(k)
    return fixed

KEY_FIELDS = [('wageShare', 'current'), ('headcount', 'permEmployees', 'men'), ('headcount', 'permEmployees', 'women'),
              ('headcount', 'permWorkers', 'men'), ('headcount', 'permWorkers', 'women'), ('board', 'total'), ('board', 'women')]

def dig(o, path):
    for p in path:
        o = o.get(p) if isinstance(o, dict) else None
    return o

def cand_value(c, path):
    """The parser's value in the reading's shape."""
    if path[0] == 'wageShare':
        w = c.get('wageShare'); return w[0] if isinstance(w, list) and w else None
    if path[0] == 'board': return dig(c.get('women') or {}, path)
    return dig(c, path)

def consistent(h):
    """A reading's own arithmetic, used when the parser found nothing to compare against."""
    for part in ('permEmployees', 'tempEmployees', 'permWorkers', 'tempWorkers'):
        t, m, w = (dig(h, ('headcount', part, x)) for x in ('total', 'men', 'women'))
        if None not in (t, m, w) and abs(t - m - w) > max(2, 0.02 * t): return False
    b, bw = dig(h, ('board', 'total')), dig(h, ('board', 'women'))
    if b is not None and bw is not None and not (0 <= bw <= b): return False
    s = dig(h, ('wageShare', 'current'))
    return s is None or 0 < s < 100

def same(a, b, pct):
    if a is None or b is None: return a is None and b is None
    try: return abs(float(a) - float(b)) <= (0.05 if pct else 0.5)
    except (TypeError, ValueError): return False

def open_batch(keys, stage):
    global B
    n = len(glob.glob(P('batch', 'done', '*.json'))) + 1
    bid = f"h{HISTORY['fy'][2:4]}{HISTORY['fy'][5:7]}-b{n:03d}" if HISTORY else f"b{n:03d}"  # h2425-b001: a FY2024-25 history batch
    B = dict(id=bid, stage=stage, keys=keys, openedAt=datetime.now().isoformat(timespec='seconds'),
             entries={k: {f: Q[k].get(f) for f in ('kind', 'name', 'cin', 'website', 'symbol', 'kaggleFY', 'noDataReason')} for k in keys})
    for k in keys: Q[k]['status'] = 'in-batch'; Q[k]['batch'] = bid
    save_q(); save_b(); print(json.dumps(dict(open=bid, stage=stage, keys=keys)))

if cmd == 'next':
    n = int(sys.argv[3]) if len(sys.argv) > 3 else 25
    if B and B['stage'] != 'closed':
        print(json.dumps(dict(open=B['id'], stage=B['stage'], keys=B['keys']))); sys.exit()
    if HISTORY:
        keys = [k for k, v in Q.items() if v['status'] == 'todo'][:n]
        if not keys: print(json.dumps(dict(open=None, remaining=0))); sys.exit()
        open_batch(keys, 'snippets'); sys.exit()
    # Changes queued by an attended session while a batch was running: {"set": {key: {field: value}}, "requeue": [keys]}.
    # First, so the inbox below matches files on what they set (a CIN added to a Nivel company, say).
    pend = load(P('pending.json'), {})
    if pend:
        for k, fields in pend.get('set', {}).items():
            if k in Q: Q[k].update(fields)
        for k in pend.get('requeue', []):
            if k in Q and Q[k]['status'] == 'done-kaggle': Q[k].update(status='todo', retry=True, retriedFrom='done-kaggle')
        Q = dict(sorted(Q.items(), key=later))
        os.replace(P('pending.json'), P('pending.done.%s.json' % datetime.now().strftime('%H%M%S')))
        print(json.dumps(dict(pendingApplied={'set': len(pend.get('set', {})), 'requeue': len(pend.get('requeue', []))})))
    took = take_inbox()
    if took: print(json.dumps(dict(fromInbox=took)))
    # The watch's finds (late filers whose FY2025-26 BRSR appeared) first, while each is still done-kaggle: the find
    # sends it back and closes its mark, before recheck_closed() would send it back on the same text.
    import marks as M
    back = M.apply_found(Q, data)
    rechecked = recheck_closed()
    if rechecked: print(json.dumps(dict(rechecked=rechecked)))
    named = fix_names()
    if named: print(json.dumps(dict(namesFixed=len(named))))
    # Owner marks from the dashboard (No BRSR filed, merged, insolvent, delisted); a mark on a company since read as
    # FY2025-26 is closed.
    mk = M.apply_marks(Q, data, close=True)
    if back: Q = dict(sorted(Q.items(), key=later))
    if mk or back: print(json.dumps(dict(marksApplied=len(mk), watchFound=back)))
    # Companies whose only Kaggle copy was a scan, read by OCR since (ocr_kaggle.py): join the queue at the end.
    add = load(P('kaggle', 'pending_add.json'), {})
    if add:
        # A company already queued under another key (a KG- entry whose CIN was filled in later) is not added twice.
        have = {(f, v.get(f)) for v in Q.values() if v['status'] != 'merged' for f in ('cin', 'kaggleId') if v.get(f)}
        new = {k: v for k, v in add.items() if k not in Q and not any((f, v.get(f)) in have for f in ('cin', 'kaggleId') if v.get(f))}; Q.update(new)
        os.replace(P('kaggle', 'pending_add.json'), P('kaggle', 'pending_add.done.json'))
        print(json.dumps(dict(addedFromOCR=len(new))))
    keys = [k for k, v in Q.items() if v['status'] == 'todo'][:n]
    if not keys: save_q(); print(json.dumps(dict(open=None, remaining=0))); sys.exit()  # keep what was applied above
    open_batch(keys, 'discover')

elif cmd == 'fetch':
    from concurrent.futures import ThreadPoolExecutor
    def records(k): return [json.loads(l) for l in open(P('fetch', k + '.jsonl'))] if os.path.exists(P('fetch', k + '.jsonl')) else []
    def one(k):
        """One company's downloads, in order; companies run six at a time (each writes only its own files)."""
        # Only addresses that already gave a usable file are skipped: a failed one is worth another try once downloads
        # gain a fix (OCR for scans, www and scheme variants), and a saved local copy may stand in for a refusing site.
        f = load(P('found', k + '.json'), {}); tried = {x['url'] for x in records(k) if x.get('status') == 'ok'}; log = []
        def run(c, *extra):
            fo = str(c.get('foundOn', ''))
            ref = ['--ref', fo] if fo.startswith('http') and not re.search(r'nseindia\.com|bseindia\.com', fo, re.I) else []
            if c.get('fy'): ref += ['--fy', str(c['fy'])]
            r = subprocess.run([sys.executable, os.path.join(HERE, 'fetch.py'), data, k, c['url'], *extra, *ref], capture_output=True, text=True)
            log.append(f"{k} {r.stdout.strip() or r.stderr.strip()[-200:]}")
            return (records(k) or [{}])[-1]
        brsr = None
        for c in sorted(f.get('candidates', []), key=lambda c: c.get('kind') != 'brsr'):
            if c.get('url') in tried or not c.get('url'): continue
            last = run(c)
            # A site that refuses scripts: the searcher may have saved the PDF with its own web tool (localPath).
            lp = c.get('localPath')
            if last.get('status') != 'ok' and lp and os.path.exists(lp):
                last = run(dict(c, url='file://' + urllib.parse.quote(lp)), *(['--as', 'ar'] if c.get('kind') == 'annual-report' else []))
            if latest(last): brsr = c; break
        # The annual report carries the finer hierarchy and function tables; fetch it too when the BRSR came on its own.
        if brsr and brsr.get('kind') != 'annual-report' and not os.path.exists(P('latest', 'txt', k + '.ar.txt')):
            ar = next((c for c in f.get('candidates', []) if c.get('kind') == 'annual-report' and c.get('url') not in tried | {brsr['url']}), None)
            if ar: run(ar, '--as', 'ar')
        return log
    def latest(x):
        """A usable FY2025-26 BRSR. Where the text names no year (a scan, an odd layout), the year on the company's own
        page for the file counts; the reader still records the year from the report itself."""
        fy = x.get('fy') or ''
        dated = is_latest(fy) or ((not fy or fy.startswith('~')) and bool(re.search(r'2025-?26|FY ?26|2026', x.get('labelFy') or '')))
        return x.get('status') == 'ok' and x.get('hasBRSR') and dated
    def why(k):
        """What went wrong, for the second search: the found file's status and each download's outcome."""
        f = load(P('found', k + '.json'), {}); rs = records(k)
        out = [f"search said {f.get('status', 'nothing')}"]
        for x in rs:
            if x.get('status') == 'not-pdf': out.append(f"{x['url']} returned {x.get('http')}")
            elif x.get('status') == 'ok' and not x.get('hasBRSR'): out.append(f"{x['url']} is a report with no BRSR in it")
            elif x.get('status') == 'ok': out.append(f"{x['url']} is for {x.get('fy')}, not 2025-26")
            else: out.append(f"{x['url']}: {x.get('status')}")
        return '; '.join(out)
    with ThreadPoolExecutor(6) as ex:
        for log in ex.map(one, B['keys']): print('\n'.join(log))
    for k in B['keys']: Q[k]['fetches'] = records(k)
    # First time through, every company still without a FY2025-26 BRSR goes back for a second search (stage refind);
    # after that search's downloads, the batch moves on and those companies keep their Kaggle FY2024-25 report.
    # Then, once more for those still missing, a headless-browser visit (stage browse) and a last download (stage fetch3).
    missing = {k: why(k) for k in B['keys'] if not any(latest(x) for x in records(k))}
    if missing and 'refind' not in B: B['refind'] = missing; B['stage'] = 'refind'
    elif missing and 'browsed' not in B: B['stillMissing'] = list(missing); B['stage'] = 'browse'
    else: B['stage'] = 'snippets'; B['stillMissing'] = list(missing)
    save_q(); save_b(); print(json.dumps(dict(stage=B['stage'], missing=len(missing))))

elif cmd == 'browse':
    # After the second search: companies still without a FY2025-26 BRSR get one headless-browser visit (browse.mjs),
    # which reads links that investor pages draw with JavaScript. Strong PDF links join the found file, are downloaded,
    # and the rest stay on Kaggle. No model calls. Sites that answer with a block or a challenge are left alone.
    miss = B.get('stillMissing') or []
    if miss:
        # Fifteen minutes in all; companies the browser did not reach simply keep what they have. A Chrome left over from
        # a killed run would hold the profile and swallow the new one, so clear it before and after.
        clear = lambda: subprocess.run(['pkill', '-f', 'user-data-dir=' + P('tmp', 'chrome')])
        clear()
        try:
            r = subprocess.run(['node', os.path.join(HERE, 'browse.mjs'), data, *miss], capture_output=True, text=True, timeout=900)
            print(r.stdout[-1500:], r.stderr[-300:])
        except subprocess.TimeoutExpired as e:
            clear(); print('browse stopped at 15 minutes', (e.stdout or b'')[-1500:].decode(errors='replace') if isinstance(e.stdout, bytes) else (e.stdout or '')[-1500:])
        for k in miss:
            b = load(P('browse', k + '.json'), {}); f = load(P('found', k + '.json'), {'key': k, 'candidates': []})
            have = {c.get('url') for c in f.get('candidates', [])}
            add = [dict(url=p['href'], fy='2025-26', kind='brsr' if re.search(r'brsr|responsib', p['href'] + p['text'], re.I) else 'annual-report',
                        foundOn='headless browser: ' + b.get('site', '')) for p in b.get('pdfs', []) if p['score'] >= 5 and p['href'] not in have
                   and not re.search(r'intimation', p['href'] + p['text'], re.I)][:3]
            if add: f['candidates'] = add + f.get('candidates', []); f['status'] = 'found'; json.dump(f, open(P('found', k + '.json'), 'w'), indent=1)
            if b.get('blocked'): Q[k]['blocked'] = 'site blocks automated visitors'
        B['browsed'] = miss; B['stage'] = 'fetch3'; save_q(); save_b()
    else:
        B['stage'] = 'snippets'; save_b()
    print(json.dumps(dict(stage=B['stage'], browsed=len(miss))))

elif cmd == 'snippets':
    # A retried company whose second search still found nothing newer keeps its earlier checked reading: no re-read.
    B['skipRead'] = [k for k in B['keys'] if Q[k].get('retry') and k in B.get('stillMissing', []) and os.path.exists(P('verified', k + '.json'))]
    todo = [k for k in B['keys'] if k not in B['skipRead']]
    r = subprocess.run([sys.executable, os.path.join(HERE, 'snippets.py'), data] + todo, capture_output=True, text=True)
    print(r.stdout, r.stderr[-500:])
    B['noText'] = [l.split()[0] for l in r.stdout.splitlines() if l.endswith('no text')]
    B['readKeys'] = [k for k in todo if k not in B['noText']]
    # A retried company with a newer report is read afresh: its earlier readings move aside so none is reused.
    for k in B['readKeys']:
        if Q[k].get('retry'):
            for f in (P('verified', k + '.json'), P('read', k + '.haiku.json'), P('read', k + '.final.json')):
                if os.path.exists(f): os.replace(f, f[:-5] + '.prev.json')
    B['stage'] = 'read'; save_b(); print(json.dumps(dict(read=B['readKeys'], skipRead=B['skipRead'])))

elif cmd == 'recheck':
    if B and B['stage'] != 'closed': sys.exit('a batch is open: recheck runs when the next batch opens')
    took = take_inbox(); back = recheck_closed(); save_q(); print(json.dumps(dict(fromInbox=took, requeued=len(back), keys=back)))

elif cmd == 'watch':
    # Late filers (PARITY-127): look again at every company with no FY2025-26 BRSR. Headless Chrome reads its site's
    # report links (company sites only; never NSE or BSE), and each new FY2025-26 link is downloaded and checked. A real
    # FY2025-26 BRSR leaves data/watch/found/<key>.json, which the next batch to open sends back to be read. This command
    # never writes queue.json, so it runs beside a batch without the lock.
    import marks as M
    keys = [a for a in sys.argv[3:] if not a.startswith('--')] or M.watch_list(Q, data)
    os.makedirs(P('watch', 'found'), exist_ok=True)
    res = dict(at=datetime.now().isoformat(timespec='minutes'), checked=[], found=[], blocked=[], browser=None)
    if keys:
        br = subprocess.run(['node', os.path.join(HERE, 'browse.mjs'), data] + keys, capture_output=True, text=True, timeout=60 * 40)
        if br.returncode: res['browser'] = (br.stderr.strip().splitlines() or ['failed'])[-1][:200]  # links from earlier searches are still tried
    for k in keys:
        v = Q[k]; tried = {x.get('url') for x in v.get('fetches') or []}
        b = load(P('browse', k + '.json'), {}); f = load(P('found', k + '.json'), {})
        cands = [x['href'] for x in b.get('pdfs', []) if x.get('score', 0) >= 5] + [c['url'] for c in f.get('candidates', []) if re.search(r'2025-?26|2026', c.get('fy') or '')]
        cands = [u for u in dict.fromkeys(cands) if u not in tried and not re.search(r'nseindia|bseindia', u)][:3]
        got = None
        for u in cands:
            r = subprocess.run([sys.executable, os.path.join(HERE, 'fetch.py'), data, k, u, '--fy', '2025-26'], capture_output=True, text=True)
            try: rec = json.loads(r.stdout.strip().splitlines()[-1])
            except (ValueError, IndexError): continue
            if rec.get('status') == 'ok' and rec.get('hasBRSR') and is_latest(rec.get('fy')): got = u; break
        res['checked'].append(dict(key=k, name=v.get('name'), tried=len(cands), blocked=bool(b.get('blocked'))))
        if b.get('blocked'): res['blocked'].append(k)
        if got: json.dump(dict(at=res['at'], url=got), open(P('watch', 'found', k + '.json'), 'w')); res['found'].append(dict(key=k, name=v.get('name'), url=got))
    json.dump(res, open(P('watch', 'latest.json'), 'w'), indent=1)
    with open(P('logs', 'runs.md'), 'a') as fh:
        fh.write(f"- {datetime.now().strftime('%Y-%m-%d %H:%M')} +0530 | watch | checked {len(keys)} companies with no FY2025-26 BRSR: {len(res['found'])} found"
                 + (f" ({', '.join(x['name'] or x['key'] for x in res['found'])})" if res['found'] else '') + f", {len(res['blocked'])} sites blocked"
                 + (f"; browser failed: {res['browser']}" if res['browser'] else '') + '\n')
    print(json.dumps(dict(checked=len(keys), found=[x['key'] for x in res['found']], blocked=len(res['blocked']))))

elif cmd == 'dedupe':
    # Two queue entries for one company: KEEP=DROP pairs. The kept entry carries the reading; DROP becomes "merged".
    # KEEP=SYMBOL (no NIVEL- prefix on the right) links a Kaggle entry to its Nivel ticker and merges NIVEL-SYMBOL into it.
    if B and B['stage'] != 'closed': sys.exit('a batch is open: dedupe when it closes')
    done = []
    for pair in sys.argv[3:]:
        keep, other = pair.split('=', 1)
        drop = other if other in Q else 'NIVEL-' + other
        if keep not in Q or drop not in Q: print('skip', pair); continue
        if not other.startswith(('NIVEL-', 'KG-', 'L', 'U')) or drop.startswith('NIVEL-'): Q[keep]['nivelMatch'] = Q[drop].get('symbol') or other
        Q[drop].update(status='merged', mergedInto=keep); done.append(f'{drop} -> {keep}')
    save_q(); print(json.dumps(dict(merged=done)))

elif cmd == 'move':
    # A reading filed under the wrong key (the commercial-vehicle Tata Motors under the old Tata Motors CIN):
    # B move D FROM TO [KEY.field=value ...] moves FROM's reading, its download records and every file named for it to
    # TO, and leaves FROM to be read again. Files TO already had are kept beside as <name>.replaced. The assignments
    # then set fields on either key (a JSON value, or text); 'null' removes the field.
    if B and B['stage'] != 'closed': sys.exit('a batch is open: move when it closes')
    src, dst, sets = sys.argv[3], sys.argv[4], sys.argv[5:]
    if src not in Q or dst not in Q: sys.exit('both keys must be in the queue')
    if os.path.exists(P('verified', dst + '.json')): sys.exit(f'{dst} already has a reading: move it away first')
    moved = []
    for d in ('snippets', 'verified', 'read', 'cand', 'fetch', 'browse', 'found', 'latest/txt', 'tmp', 'watch/found', 'watch/applied'):
        for f in glob.glob(os.path.join(P(*d.split('/')), glob.escape(src) + '.*')):
            to = os.path.join(os.path.dirname(f), dst + os.path.basename(f)[len(src):])
            if os.path.exists(to): os.replace(to, to + '.replaced')
            if f.endswith('.json'):
                o = load(f)
                if isinstance(o, dict) and o.get('key') == src: o['key'] = dst; save_json(f, o)
            os.replace(f, to); moved.append(os.path.relpath(to, data))
    for f in ('status', 'batch', 'fetches', 'manual', 'retry', 'retriedFrom', 'staleReason', 'noDataReason', 'pipelineReason', 'ocr', 'watchFound', 'blocked'):
        if f in Q[src]: Q[dst][f] = Q[src].pop(f)
        else: Q[dst].pop(f, None)
    Q[src].update(status='todo', retry=True, retriedFrom='moved')
    for a in sets:
        k, _, rest = a.partition('.'); f, _, val = rest.partition('=')
        if k not in (src, dst) or not f: sys.exit(f'bad assignment {a}: use {src}.field=value or {dst}.field=value')
        try: val = json.loads(val)
        except ValueError: pass
        if val is None: Q[k].pop(f, None)
        else: Q[k][f] = val
    Q = dict(sorted(Q.items(), key=later)); save_q()
    print(json.dumps(dict(moved=f'{src} -> {dst}', files=len(moved), set=sets)))

elif cmd == 'requeue':
    # Put companies of one status (all of them, or only the keys named) back at the head of the queue for another search.
    if B and B['stage'] != 'closed': sys.exit('a batch is open: requeue when it closes')
    st = sys.argv[3]; only = set(sys.argv[4:])
    ks = [k for k, v in Q.items() if v['status'] == st and (not only or k in only)]
    for k in ks:
        Q[k].update(status='todo', retry=True, retriedFrom=st)
        # Named keys keep their found links, so the batch goes straight to downloading and the second search;
        # a whole-status requeue starts their search over.
        if not only and os.path.exists(P('found', k + '.json')): os.replace(P('found', k + '.json'), P('found', k + '.first.json'))
    Q = dict(sorted(Q.items(), key=lambda kv: not kv[1].get('retry')))
    save_q(); print(json.dumps(dict(requeued=len(ks))))

elif cmd == 'merge':
    disputes = {}
    keys = B.get('readKeys', B['keys'])
    for k in keys:
        h = load(P('read', k + '.haiku.json')); c = load(P('cand', k + '.json'))
        if h is None or c is None: continue
        # Nivel already holds checked FY2025-26 core figures for its own companies, so their deep pass settles only the
        # finer levels and functions; the core reading is kept as a cross-check against Nivel.
        deep_only = B['entries'][k].get('kind') == 'nivel-deep'
        # Where the parser found nothing, the reading is checked against its own arithmetic instead of sent on:
        # most parser misses are layouts it cannot follow, not misreadings.
        diff = [] if deep_only else [list(p) for p in KEY_FIELDS if not same(dig(h, p), cand_value(c, p), p[0] == 'wageShare')
                                     and not (cand_value(c, p) is None and dig(h, p) is not None)]
        if not deep_only and not consistent(h): diff = diff + [['arithmetic']]
        # One agreed reading in ten goes to the second checker too: agreement covers the key fields only.
        if not diff and not deep_only and int(hashlib.sha1(k.encode()).hexdigest(), 16) % 10 == 0: diff = [['audit']]
        # Finer levels and functions come from tables each company lays out its own way: the second checker reads them all.
        if any(r.get('standard') not in ('board', 'kmp', 'staff', 'workers') for r in h.get('ladder') or []) or h.get('functions') \
                or h.get('flows') or h.get('targets'):
            diff = diff + [['deep']]
        if diff: disputes[k] = diff
        else: json.dump(dict(h, checkedBy='haiku, agrees with parser'), open(P('verified', k + '.json'), 'w'), indent=1, ensure_ascii=False)
    missing = [k for k in keys if not os.path.exists(P('read', k + '.haiku.json'))]
    B['disputes'] = disputes; B['unread'] = missing; B['stage'] = 'adjudicate' if (disputes or missing) else 'final'; save_b()
    print(json.dumps(dict(agreed=len(keys) - len(disputes) - len(missing), disputes=disputes, unread=missing)))

elif cmd == 'final':
    out = dict(done=0, wrongYear=0, noData=0) if HISTORY else dict(latest=0, kaggle=0, deep=0, noData=0)
    for k in B['keys']:
        f = load(P('read', k + '.final.json'))
        if f and not os.path.exists(P('verified', k + '.json')):
            json.dump(dict(f, checkedBy='sonnet adjudication'), open(P('verified', k + '.json'), 'w'), indent=1, ensure_ascii=False)
        v = load(P('verified', k + '.json'))
        if HISTORY:  # its own year, or a report of another year (kept, for that year's store), or nothing usable
            empty = not v or ((v.get('wageShare') or {}).get('current') is None and not v.get('headcount'))
            st = 'no-data' if empty else 'done' if fy_start(v.get('fy')) == int(HISTORY['fy'][:4]) else 'wrong-year'
            Q[k]['status'] = st; out[{'no-data': 'noData', 'done': 'done', 'wrong-year': 'wrongYear'}[st]] = out.get({'no-data': 'noData', 'done': 'done', 'wrong-year': 'wrongYear'}[st], 0) + 1
            continue
        if v and B['entries'][k].get('kind') == 'nivel-deep':
            Q[k]['status'] = 'done-deep'; out['deep'] += 1
        elif not v or ((v.get('wageShare') or {}).get('current') is None and not v.get('headcount')):
            Q[k]['status'] = 'no-data'; out['noData'] += 1
        elif is_latest(v.get('fy')): Q[k]['status'] = 'done-latest'; out['latest'] += 1
        else: Q[k]['status'] = 'done-kaggle'; out['kaggle'] += 1
    B['stage'] = 'closed'; B['summary'] = out; B['closedAt'] = datetime.now().isoformat(timespec='seconds')
    B['closedAs'] = {k: Q[k]['status'] for k in B['keys'] if k in Q}  # each company's status as the batch closed (the dashboard's 'Closed as')
    json.dump(B, open(P('batch', 'done', B['id'] + '.json'), 'w'), indent=1, ensure_ascii=False)
    save_q(); save_b(); print(json.dumps(dict(batch=B['id'], **out)))
    r = (HISTORY or subprocess.run([sys.executable, os.path.join(HERE, 'identifiers.py'), data], capture_output=True)) and subprocess.run([sys.executable, os.path.join(HERE, 'to_sqlite.py'), data], capture_output=True, text=True)  # a history store reads the build's identifiers
    print(r.stdout.strip() or r.stderr.strip()[-300:])

elif cmd == 'history-init':
    # Make data/history/<fy>/ for an earlier year, from the FY2024-25 Kaggle texts already on disk (no downloads). A company
    # whose checked reading is already that year is copied in as done; one whose Kaggle text is another year stays out.
    fy = sys.argv[3]
    if fy != '2024-25': sys.exit('only 2024-25 has local texts (the Kaggle dataset); other years need downloads')
    H = P('history', fy)
    if os.path.exists(os.path.join(H, 'queue.json')): sys.exit(f'{H} exists')
    for d in ('batch/done', 'snippets', 'cand', 'read', 'verified', 'latest/txt', 'fetch', 'tmp'): os.makedirs(os.path.join(H, d), exist_ok=True)
    os.symlink(os.path.relpath(P('kaggle'), H), os.path.join(H, 'kaggle'))
    HQ, copied = {}, 0
    for k, v in Q.items():
        if v['status'] == 'merged' or not v.get('kaggleFile'): continue
        if not os.path.exists(P('kaggle', 'txt', v['kaggleFile'][:-4] + '.txt')): continue
        if fy_start(v.get('kaggleFY')) not in (None, int(fy[:4])): continue
        e = {f: v.get(f) for f in ('key', 'name', 'cin', 'website', 'symbol', 'kaggleId', 'kaggleFile', 'kaggleFY') if v.get(f) is not None}
        e.update(kind='new', status='todo')
        old = load(P('verified', k + '.json'))
        if old and fy_start(old.get('fy')) == int(fy[:4]):
            shutil.copy(P('verified', k + '.json'), os.path.join(H, 'verified', k + '.json')); e['status'] = 'done'; e['copiedFrom'] = 'main'; copied += 1
        HQ[k] = e
    save_json(os.path.join(H, 'queue.json'), HQ)
    save_json(os.path.join(H, 'history.json'), dict(fy=fy, source='kaggle', created=datetime.now().isoformat(timespec='seconds')))
    print(json.dumps(dict(store=H, companies=len(HQ), copied=copied, toRead=len(HQ) - copied)))

elif cmd in ('gaps-init', 'gaps-next', 'gaps-merge'):
    # Gap-fill (PARITY-129): read again only the mandatory fields a checked reading lacks, from audit.py's audit.json. A gap
    # value fills an empty field and never overwrites one; a table the report gives as nil is kept as an answer.
    G = P('gaps', 'queue.json'); GQ = load(G, {}); GB = load(P('gaps', 'current.json'))
    FIELD = dict(headcount='headcount', disabled='disabledHeadcount', board='board', kmp='kmp', turnover='turnover',
                 benefits='wellbeing', wellbeingSpend='wellbeingSpend', parental='parental', unions='unions', training='training',
                 reviews='reviews', minWage='minWage', medianPay='medianPay', wageShare='wageShare', complaints='complaints')
    if cmd == 'gaps-init':
        A = load(P('audit.json')) or sys.exit('run audit.py first')
        os.makedirs(P('gaps'), exist_ok=True); n = 0
        for k, r in A['rows'].items():
            if GQ.get(k, {}).get('status') in ('done', 'in-batch'): continue
            v = load(P('verified', k + '.json')) or {}
            done = set((v.get('gapFill') or {}).get('fields') or []) | set((v.get('gapFill') or {}).get('nil') or [])  # read once already
            fs = {FIELD[m] for m, st in r['measures'].items() if st == 'missed' or (m == 'unions' and st == 'notInText')}
            if any('accidentInsurance' not in w for w in v.get('wellbeing') or []): fs.add('wellbeing')  # added 12 October
            if 'wages' not in (v.get('complaints') or {}): fs.add('complaints')
            if not (v.get('gapFill') or {}).get('fields') and 'wellbeingSpend' not in v: fs.add('wellbeingSpend')
            fs -= done
            if fs: GQ[k] = dict(fields=sorted(fs), status='todo'); n += 1
        save_json(G, GQ); print(json.dumps(dict(queued=n, todo=sum(1 for g in GQ.values() if g['status'] == 'todo'))))
    elif cmd == 'gaps-next':
        if GB and GB.get('stage') != 'closed': print(json.dumps(dict(open=GB['id'], keys=GB['keys'], items=GB['items']))); sys.exit()
        n = int(sys.argv[3]) if len(sys.argv) > 3 else 25
        keys = [k for k, g in GQ.items() if g['status'] == 'todo' and Q.get(k, {}).get('status') in ('done-latest', 'done-kaggle', 'done')][:n]
        if not keys: print(json.dumps(dict(open=None, remaining=0))); sys.exit()
        r = subprocess.run([sys.executable, os.path.join(HERE, 'snippets.py'), data] + keys, capture_output=True, text=True)  # cut again, with today's headings
        if r.returncode: sys.exit(r.stderr[-500:])
        gid = f"g{len(glob.glob(P('gaps', 'g*.json'))) + 1:03d}"
        GB = dict(id=gid, stage='read', keys=keys, items=[dict(key=k, fields=GQ[k]['fields']) for k in keys], openedAt=datetime.now().isoformat(timespec='seconds'))
        for k in keys: GQ[k].update(status='in-batch', batch=gid)
        save_json(G, GQ); save_json(P('gaps', 'current.json'), GB); print(json.dumps(dict(open=gid, keys=keys, items=GB['items'])))
    else:
        if not GB or GB.get('stage') == 'closed': sys.exit('no open gap batch')
        def fill(old, new):  # new into old, only where old has no value
            if isinstance(new, dict):
                old = dict(old) if isinstance(old, dict) else {}
                for f, x in new.items(): old[f] = fill(old.get(f), x)
                return old
            if isinstance(new, list):
                if not old: return new
                if all(isinstance(r, dict) and 'group' in r and 'gender' in r for r in old + new):
                    by = {(r['group'], r['gender']): r for r in new}
                    return [fill(r, by.get((r['group'], r['gender']), {})) for r in old] + [r for r in new if (r['group'], r['gender']) not in {(o['group'], o['gender']) for o in old}]
                return old
            return old if old is not None else new
        out = dict(filled=0, nil=0, wrongYear=0, unread=0)
        for k in GB['keys']:
            g = load(P('read', k + '.gap.json')); vp = P('verified', k + '.json'); v = load(vp)
            if not g or not v: out['unread'] += 1; GQ[k]['status'] = 'unread'; continue
            if (g.get('fy') or v.get('fy')) != v.get('fy'): out['wrongYear'] += 1; GQ[k]['status'] = 'wrong-year'; continue
            took = [f for f in GQ[k]['fields'] if f in g and g[f] is not None]
            for f in took: v[f] = fill(v.get(f), g[f])
            nil = [f for f in g.get('nil') or [] if f in GQ[k]['fields']]
            v['gapFill'] = dict(at=datetime.now().isoformat(timespec='minutes'), batch=GB['id'], fields=took, nil=nil, notes=g.get('notes'))
            save_json(vp, v); GQ[k]['status'] = 'done'; out['filled'] += bool(took); out['nil'] += bool(nil)
        GB.update(stage='closed', closedAt=datetime.now().isoformat(timespec='seconds'), summary=out)
        save_json(P('gaps', GB['id'] + '.json'), GB); save_json(P('gaps', 'current.json'), GB); save_json(G, GQ)
        print(json.dumps(dict(batch=GB['id'], **out)))
        r = (HISTORY or subprocess.run([sys.executable, os.path.join(HERE, 'identifiers.py'), data], capture_output=True)) and subprocess.run([sys.executable, os.path.join(HERE, 'to_sqlite.py'), data], capture_output=True, text=True)  # a history store reads the build's identifiers
        print(r.stdout.strip() or r.stderr.strip()[-300:])

elif cmd == 'gate':
    # Exit 0 to go on; 3 to stop. The owner chose full scope in 24 hours using the week (11 October): stop when the guard
    # is tripped, the week is at 78% or more, or the 5-hour window at 75% or more, just under the guard's own 80%.
    import re
    r = subprocess.run([sys.executable, os.path.expanduser('~/.claude/usage-guard/usage_guard.py'), 'status'], capture_output=True, text=True).stdout
    week = re.search(r'Current week[^:]*:\s*(\d+)%', r); sess = re.search(r'Current session:\s*(\d+)%', r)
    w, s = int(week.group(1)) if week else None, int(sess.group(1)) if sess else None
    stop = 'TRIPPED' in r or (w or 0) >= 78 or (s or 0) >= 75
    print(json.dumps(dict(week=w, session=s, tripped='TRIPPED' in r, go=not stop))); sys.exit(3 if stop else 0)

elif cmd == 'lock':
    # Exit 0 when this run now holds the lock; 3 when another run holds a lock taken under 90 minutes ago.
    lk = load(P('run.lock'), {}); now = datetime.now().astimezone()
    if lk.get('state') == 'busy' and lk.get('since'):
        since = datetime.fromisoformat(lk['since'].replace('Z', '+00:00'))
        if since.tzinfo is None: since = since.astimezone()
        if (now - since).total_seconds() < 90 * 60:
            print(json.dumps(dict(held=True, since=lk['since']))); sys.exit(3)
    json.dump(dict(state='busy', since=now.isoformat(timespec='seconds')), open(P('run.lock'), 'w'))
    # The repo's Plane guard (~/.claude/hooks/plane-issue-guard.sh) lets files be written only against an open issue
    # named in .plane_current_issue less than 4 hours ago. A batch is PARITY-123 work, so for the run the marker names
    # it, freshly. Whatever it named before is kept, and unlock gives it back if it was another chat's live issue.
    prev = open(MARKER).read().strip() if os.path.exists(MARKER) else ''
    age = (now.timestamp() - os.path.getmtime(MARKER)) / 3600 if os.path.exists(MARKER) else 99
    json.dump(dict(content=prev, ageHours=round(age, 2)), open(P('marker.prev.json'), 'w'))
    open(MARKER, 'w').write(OUR_ISSUE + '\n')
    print(json.dumps(dict(held=False, taken=now.isoformat(timespec='seconds'), stale=lk.get('state') == 'busy', marker=OUR_ISSUE.split('|')[0])))

elif cmd == 'unlock':
    json.dump(dict(state='free', since=datetime.now().astimezone().isoformat(timespec='seconds')), open(P('run.lock'), 'w'))
    # Give the Plane marker back if, when the run began, it named another issue set within the last 4 hours: another
    # chat was working under it. A stale or closed marker is not restored; ours stays, freshly set.
    prev = load(P('marker.prev.json'), {})
    if prev.get('content') and prev['content'] != OUR_ISSUE and prev.get('ageHours', 99) < 4:
        open(MARKER, 'w').write(prev['content'] + '\n'); print('unlocked; Plane marker restored to', prev['content'].split('|')[0])
    else:
        if os.path.exists(MARKER) and open(MARKER).read().strip() == OUR_ISSUE: os.utime(MARKER)
        print('unlocked; Plane marker on', OUR_ISSUE.split('|')[0])

elif cmd == 'status':
    from collections import Counter
    print(json.dumps(dict(Counter(v['status'] for v in Q.values())), sort_keys=True), 'open batch:', B and B['id'], B and B['stage'])
