"""Which company a report the owner saved in the inbox belongs to (PARITY-123). One matcher for batch.py, which takes
the files in, and the dashboard, which says where each waiting file will go, so the two never disagree.

In order: the CIN in the file name (the owner's label), the name in the owner's label ("KSB Ltd is L29120... - x.pdf"),
the CIN the file prints most often, its Section A name, its website, then the file name itself. CINs come from the queue
and identifiers.json. A label's CIN that belongs to no company is learnt for the company its name matches, unless that
company has another CIN on record."""
import re, unicodedata

CIN = r'(?<![A-Z0-9])([LU]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6})(?!\d)'
STOP = r'\b(the|limited|ltd|india|company|co|corporation|corp)\b'
GENERIC = ('annual', 'report', 'integrated', 'sustainability', 'responsibility', 'business', 'limited', 'final')

def norm(n):
    n = unicodedata.normalize('NFKD', n or '').encode('ascii', 'ignore').decode()  # "Nestlé" is "Nestle"
    return re.sub(STOP + r'|[^a-z0-9]', '', n.lower())

def matcher(Q, ids=None):
    """match(file name, text CIN, Section A name, website) -> (key, how, CIN to learn or None), or (None, why, None)."""
    live = {k: v for k, v in Q.items() if v['status'] != 'merged'}
    cin_of = {k: (ids or {}).get(k, {}).get('cin') or v.get('cin') for k, v in live.items()}
    by_cin = {c: k for k, c in cin_of.items() if c}
    names = {}
    for k, v in live.items():
        if v.get('name'): names.setdefault(norm(v['name']), set()).add(k)
    exact = {n: ks.pop() for n, ks in names.items() if len(n) >= 2 and len(ks) == 1}  # "KSB", "MRF": exact and unique only
    by_name = {n: k for n, k in exact.items() if len(n) >= 4}  # long enough to look for inside a file name
    by_site = {v['website'].lower(): k for k, v in live.items() if v.get('website')}

    def by_label(fn):
        m = re.match(r'^(.+?)\s+is\s+[LU]\d{5}', fn) or re.match(r'^(.+?)\s+-\s+', fn)
        return m and exact.get(norm(m.group(1)))

    def match(fn, cin=None, name=None, site=None):
        named = re.search(CIN, fn); nc = named and named.group(1)
        if nc and nc in live: return nc, 'CIN in the file name', None
        if nc and nc in by_cin: return by_cin[nc], 'CIN in the file name', None
        k = by_label(fn)
        if k:
            if nc and cin_of.get(k) and cin_of[k] != nc: return None, f'the CIN in its name is not {live[k].get("name")}\'s', None
            return k, 'name in the file name', nc if nc and not cin_of.get(k) else None
        k = (by_cin.get(cin) or exact.get(norm(name)) if (cin or name) else None) or by_site.get((site or '').lower())
        if k: return k, 'CIN, name or website in the file', nc if nc and not cin_of.get(k) else None
        stem = norm(re.sub(r'(annual|report|brsr|integrated|fy|20\d\d|\d+)', ' ', fn[:-4], flags=re.I))
        k = next((kk for nn, kk in by_name.items() if len(nn) > 5 and (nn in stem or (len(stem) > 5 and stem in nn))), None)
        if not k:  # a distinctive word of the file name ("Edelweiss_ESG-Report") that begins exactly one company's name
            for w in re.findall(r'[a-z]{6,}', fn.lower()):
                if w in GENERIC: continue
                hits = {kk for nn, kk in by_name.items() if nn.startswith(w)}
                if len(hits) == 1: k = hits.pop(); break
        return (k, 'the file name', None) if k else (None, 'no company by its CIN, name or file name', None)
    return match
