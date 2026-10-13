"""Download one company's latest BRSR (or the annual report holding it) from the company's own site, keep only its
text, and record where it came from (PARITY-123). The PDF goes to a per-company scratch path that is emptied after its
text is taken, so disk use stays flat; url, bytes and sha256 let anyone fetch the same file again. Safe to run for
different companies at once: each writes only its own files, and batch.py folds the records into the queue.

    python3 fetch.py <data dir> <queue key> <url> [--as ar] [--ref <page the link was found on>] [--fy <year the page gives>]

`--as ar` saves a separate annual report (for the hierarchy and function reading) as <key>.ar.txt beside the BRSR; a
"BRSR" download that turns out to be an annual report without one is kept the same way. `--ref` is sent as the Referer,
and a refused address is retried with and without www and on the other scheme.
Refuses NSE and BSE addresses (PARITY-66). Appends the record to <data>/fetch/<key>.jsonl and prints it.
"""
import hashlib, json, os, re, subprocess, sys, urllib.parse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from brsr_fields import CIN, reporting_year, is_brsr, is_target, label_says, target_of
from ocr import ocr_pdf

data, key, url = sys.argv[1:4]
opt = dict(zip(sys.argv[4::2], sys.argv[5::2]))
role = 'ar' if opt.get('--as') == 'ar' else 'brsr'
ref = opt.get('--ref')
label = opt.get('--fy')  # the year the company's own page gives the file, used only when the text names none

def encode(u):
    """Percent-encode spaces and other characters curl rejects as a malformed URL (it reports them as HTTP 000, which
    looks like a connection failure). Existing %xx escapes are kept."""
    return urllib.parse.quote(u, safe=":/?#[]@!$&'()*+,;=%~")

def variants(u):
    """The address as found, then with and without www and on the other scheme: sites often serve one and not the other."""
    u = encode(u)
    m = re.match(r'^(https?)://(www\.)?([^/]+)(.*)$', u, re.I)
    if not m: return [u]
    s, w, host, rest = m.groups(); other = 'http' if s.lower() == 'https' else 'https'
    out = [u, f'{s}://{"" if w else "www."}{host}{rest}', f'{other}://{w or ""}{host}{rest}']
    return list(dict.fromkeys(out))
UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
for d in ('fetch', 'tmp', 'latest/txt'): os.makedirs(os.path.join(data, d), exist_ok=True)
rec = dict(url=url, role=role)
if re.search(r'(^|\.)(nseindia\.com|bseindia\.com)(/|:|$)', re.sub(r'^\w+://', '', url).split('/')[0] + '/', re.I):
    rec.update(status='refused', reason='NSE and BSE are not used (PARITY-66)')
else:
    tmp = os.path.join(data, 'tmp', key + '.pdf')
    head, codes = b'', []
    for u in variants(url):
        hdr = ['-H', 'Accept: application/pdf,*/*', '-H', 'Accept-Language: en-IN,en;q=0.9'] + (['-e', ref] if ref else [])
        r = subprocess.run(['curl', '-s', '-L', '-m', '600', '--max-filesize', '400000000', '-A', UA, *hdr, '-o', tmp, '-w', '%{http_code}', u],
                           capture_output=True, text=True)
        codes.append(r.stdout.strip())
        head = open(tmp, 'rb').read(5) if os.path.exists(tmp) else b''
        if head == b'%PDF-':
            if u != url: rec['servedFrom'] = u
            break
    if head != b'%PDF-' and '403' in codes:
        # Some firewalls refuse a browser user agent sent by a script but serve curl under its own name: ask once more as
        # plain curl, an honest identity, never a disguise.
        r = subprocess.run(['curl', '-s', '-L', '-m', '600', '--max-filesize', '400000000', '-o', tmp, '-w', '%{http_code}', encode(url)], capture_output=True, text=True)
        codes.append(r.stdout.strip())
        head = open(tmp, 'rb').read(5) if os.path.exists(tmp) else b''
        if head == b'%PDF-': rec['agent'] = 'curl'
    if head != b'%PDF-':
        rec.update(status='not-pdf', http=','.join(codes))
    else:
        raw = open(tmp, 'rb').read()
        # Text goes to a scratch file first; where it lands is decided once we know what the document is.
        work = os.path.join(data, 'tmp', key + '.txt')
        subprocess.run(['/opt/homebrew/bin/pdftotext', '-layout', tmp, work], capture_output=True)
        t = open(work, errors='ignore').read() if os.path.exists(work) else ''
        if len(t.split()) <= 300 or (is_brsr(t) and not re.search(CIN, t)):
            # A scanned report has no text layer, and some draw their tables and Section A values as images (a BRSR that
            # prints no CIN): read the pages with OCR, and keep that text when it holds more.
            ocr_out = work + '.ocr'
            if ocr_pdf(tmp, ocr_out) > 300:
                o = open(ocr_out, errors='ignore').read()
                if len(t.split()) <= 300 or re.search(CIN, o): os.replace(ocr_out, work); t = o; rec['ocr'] = True
        has = is_brsr(t)
        # A BRSR (alone or inside an annual report) is <key>.txt. Anything else is an annual report kept for the deep
        # reading as <key>.ar.txt. Either way a new text replaces an old one only if it ranks higher: a BRSR first, then
        # one for the year sought (FY2025-26 or later; a history store's own year), then more text. So a retried scan never
        # overwrites a better copy.
        if has: dest = os.path.join(data, 'latest', 'txt', key + '.txt')
        else: dest = os.path.join(data, 'latest', 'txt', key + '.ar.txt'); rec['role'] = 'ar'
        old = open(dest, errors='ignore').read() if os.path.exists(dest) else ''
        fy = reporting_year(t)
        T = target_of(data)
        rank = lambda x, y: (is_brsr(x), is_target(y, T) or (not y or y.startswith('~')) and label_says(label, T), len(x.split()))
        if old and rank(old, reporting_year(old)) >= rank(t, fy): rec['kept'] = 'existing text, which ranks as high or higher'
        elif len(t.split()) > 300: os.replace(work, dest)
        rec.update(status='ok' if len(t.split()) > 300 else 'no-text', bytes=len(raw), sha256=hashlib.sha256(raw).hexdigest(),
                   fy=fy, labelFy=label, words=len(t.split()), hasBRSR=has)
    if os.path.exists(tmp): open(tmp, 'wb').close()
with open(os.path.join(data, 'fetch', key + '.jsonl'), 'a') as f: f.write(json.dumps(rec) + '\n')
print(json.dumps(rec))
