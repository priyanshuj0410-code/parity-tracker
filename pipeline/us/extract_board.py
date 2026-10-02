"""Women's share of board nominees from each proxy statement in docs/. Writes board.json.

Order of evidence, all in the company's own words, never inferred from names or photos:
  1. a board diversity matrix ("Gender Identity ... Directors 4 7");
  2. each director's biography (anchored on "Director since"): the honorific the proxy uses for that director
     (Ms./Mr.), or failing that a clear majority of she/her or he/his pronouns;
  3. otherwise not disclosed.
The biography count is checked against the number of nominees the proxy states. Mismatches are marked for review.
"""
import collections
import html
import json
import re
import sys

WORDS = {w: i for i, w in enumerate('zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty'.split())}


def to_text(raw):
    s = re.sub(r'(?is)<(script|style)[^>]*>.*?</\1>', ' ', raw)
    s = re.sub(r'(?i)<br\s*/?>|</(p|div|tr|li|h\d|table)>', '\n', s)
    s = re.sub(r'(?i)</t[dh]>', ' | ', s)
    s = re.sub(r'<[^>]+>', ' ', s)
    s = html.unescape(s).replace('\xa0', ' ').replace('’', "'")
    s = re.sub(r'[ \t\r\f\v]+', ' ', s)
    return re.sub(r'\n\s*\n+', '\n', s)


def num(tok):
    tok = tok.lower()
    return int(tok) if tok.isdigit() else WORDS.get(tok)


def stated_nominees(t):
    counts = collections.Counter()
    for m in re.finditer(r'(?i)\b(\d{1,2}|' + '|'.join(WORDS) + r')\s+(?:(?:director|board)\s+)?nominees\b', t):
        n = num(m.group(1))
        if n and 5 <= n <= 20:
            counts[n] += 1
    return counts.most_common(1)[0][0] if counts else None


def matrix(t):
    m = re.search(r'(?is)gender identity.{0,400}?directors?\s*\|?\s*(\d{1,2})\s*\|?\s*(\d{1,2})\s*\|?\s*(\d{1,2})?\s*\|?\s*(\d{1,2})?', t)
    if not m:
        return None
    women, men = int(m.group(1)), int(m.group(2))
    other = sum(int(g) for g in m.groups()[2:] if g)
    seats = women + men + other
    return {'women': women, 'seats': seats, 'evidence': re.sub(r'\s+', ' ', m.group(0))[-160:]} if 3 <= seats <= 25 else None


NAME_PART = r"(?:[A-Z]\.|[A-Z][A-Za-zÀ-ÿ'\u2019\-]+\.?|[\u201c\"][A-Za-z]+[\u201d\"])"
NAME_LINE = re.compile(rf"^({NAME_PART}(?:\s+{NAME_PART}){{1,5}})(?=\s*(?:,|$|\(|\d|Independent|Former|Chair|Lead|Director|Age))")
ROLE = {'Independent', 'Former', 'Chair', 'Chairman', 'Chairwoman', 'Lead', 'Director', 'Directors', 'President', 'Chief', 'Executive',
        'Vice', 'Senior', 'Managing', 'Partner', 'Founder', 'Co-Founder', 'Retired', 'Age', 'Item', 'Proposal', 'Committee', 'Other',
        'Our', 'The', 'Board', 'Election', 'Nominee', 'Nominees', 'Professional', 'Principal', 'Global'}
SUFFIX = {'Jr.', 'Sr.', 'II', 'III', 'IV', 'M.D.', 'Ph.D.', 'Dr.', 'Esq.', 'Mr.', 'Ms.', 'Mrs.'}


NOT_NAME = {'Officer', 'Member', 'Management', 'Financial', 'Company', 'Inc', 'Inc.', 'Corporation', 'Corp.', 'Group', 'University',
            'Directorships', 'Current', 'Owns', 'Post', 'Services', 'Holdings', 'Bank', 'Capital', 'Partners', 'International',
            'Technologies', 'Systems', 'Energy', 'Health', 'Foundation', 'Institute', 'School', 'College', 'Council', 'Association',
            'Industries', 'Worldwide', 'LLC', 'LLP', 'LP', 'Ltd.', 'PLC', 'Department', 'Office', 'Operating', 'Skills', 'Experience',
            'Qualifications', 'Highlights', 'Committees', 'Since', 'Tenure', 'Biography', 'Background', 'Career'}


def header_name(t, anchor, company=''):
    """The director's name: scanning back from an anchor, the nearest line that starts with a person's name.
    A name whose surname the proxy also writes with an honorific (Ms., Mr., Dr.) wins over one it never does."""
    fallback = None
    chunks = []
    for c in (c.strip() for c in re.split(r'[|\n]', t[max(0, anchor - 320):anchor])):
        if chunks and re.search(r'(?:^|\s)(?:[A-Z]\.|[\u201c"][A-Za-z]+[\u201d"])$', chunks[-1]):
            chunks[-1] += ' ' + c
        elif c:
            chunks.append(c)
    for chunk in reversed(chunks):
        m = NAME_LINE.match(chunk)
        if not m or m.group(1).split()[0] in ROLE:
            continue
        names = [x for x in m.group(1).split() if not x.startswith(('\u201c', '"')) and x not in SUFFIX and x not in ROLE]
        if not (2 <= len(names) <= 5) or len(names[-1]) <= 2 or names[-1].endswith('.') or any(x in NOT_NAME for x in names) \
                or ' '.join(names).lower() in company.lower():
            continue
        if re.search(rf"\b(?:Ms|Mrs|Mr|Dr)\.\s+{re.escape(names[-1])}\b", t):
            return names
        fallback = fallback or names
    return fallback


def biographies(t, company=''):
    anchors = [m.start() for m in re.finditer(r'(?i)director since', t)]
    people = {}
    for i, a in enumerate(anchors):
        names = header_name(t, a, company)
        if not names:
            continue
        key = f'{names[0]} {names[-1]}'
        if key in people:
            continue
        surname = re.escape(names[-1])
        ms = len(re.findall(rf"\b(?:Ms|Mrs)\.\s+{surname}\b", t))
        mr = len(re.findall(rf"\bMr\.\s+{surname}\b", t))
        if ms and not mr or ms >= 3 * max(mr, 1):
            people[key] = 'woman'
            continue
        if mr and not ms or mr >= 3 * max(ms, 1):
            people[key] = 'man'
            continue
        full = rf"\b{re.escape(names[0])}(?:\s+\S+){{0,2}}?\s+{surname}\b"
        bios = ''.join(t[m.end():m.end() + 1200] for m in re.finditer(full, t))
        she = len(re.findall(r'\b(?:she|her|hers)\b', bios, re.I))
        he = len(re.findall(r'\b(?:he|his|him)\b', bios, re.I))
        if she >= 2 and she >= 3 * he:
            people[key] = 'woman'
        elif he >= 2 and he >= 3 * she:
            people[key] = 'man'
        else:
            people[key] = 'unknown'
    return people


WORKFORCE = re.compile(r'(?i)employee|workforce|workers|colleagues|staff|managers|management|officers|executives|leadership|hires|global|U\.S\. ')


def stated_women(t, seats):
    """An explicit count of women among directors or nominees, in a sentence about the board and not the workforce."""
    for sent in re.split(r'(?<=[.;])\s+|\n', t):
        if not re.search(r'(?i)nominee|director|board', sent) or WORKFORCE.search(sent):
            continue
        m = (re.search(r'(?i)\b(\d{1,2})\s*[-\u2013]\s*(?:women|female)\b', sent)
             or re.search(r'(?i)\b(\d{1,2}|' + '|'.join(WORDS) + r')\s+(?:of\s+(?:our|the)\s+\S+\s+)?(?:(?:director|board)\s+)?(?:nominees\s+(?:are\s+)?)?(?:women|female)\b', sent))
        if m and num(m.group(1)) is not None:
            return num(m.group(1)), sent.strip()[:160]
        pc = re.search(r'(?i)\b(\d{1,3})\s*%\s*(?:of\s+(?:our\s+)?(?:director\s+)?nominees\s+(?:are\s+)?)?(?:women|female)\b', sent)
        if pc and seats:
            return round(int(pc.group(1)) * seats / 100), sent.strip()[:160]
    return None, None


def extract(t, company=''):
    total = stated_nominees(t)
    found = matrix(t)
    if found:
        return {'method': 'matrix', 'women': found['women'], 'seats': found['seats'], 'stated': total, 'evidence': found['evidence']}
    people = biographies(t, company)
    if len(people) >= 4:
        women = sum(1 for g in people.values() if g == 'woman')
        unknown = sum(1 for g in people.values() if g == 'unknown')
        seats_ok = total is None or total == len(people)
        evidence = '; '.join(f'{n} ({g})' for n, g in people.items())
        if unknown:
            explicit, quote = stated_women(t, len(people))
            if explicit is not None and women <= explicit <= women + unknown:
                return {'method': 'biographies+statement', 'women': explicit, 'seats': len(people), 'unknown': 0, 'stated': total,
                        'review': not seats_ok, 'evidence': f'{evidence} | "{quote}"'}
        return {'method': 'biographies', 'women': women, 'seats': len(people), 'unknown': unknown, 'stated': total,
                'review': not seats_ok or bool(unknown), 'evidence': evidence}
    explicit, quote = stated_women(t, total)
    if explicit is not None and total:
        return {'method': 'statement', 'women': explicit, 'seats': total, 'stated': total, 'review': True, 'evidence': quote}
    return {'method': 'not_disclosed', 'stated': total}


def main(symbols=None):
    proxies = json.load(open('proxies.json'))
    names = {c['symbol']: c['name'] for c in json.load(open('constituents.json'))['sp500']}
    out = {}
    for sym, p in proxies.items():
        if not p or (symbols and sym not in symbols):
            continue
        try:
            raw = open(f'docs/{sym}.htm', encoding='utf-8', errors='ignore').read()
        except FileNotFoundError:
            continue
        out[sym] = {**extract(to_text(raw), names.get(sym, '')), 'proxy': p['url'], 'filed': p['filed']}
    json.dump(out, open('board.json', 'w'), indent=1)
    c = collections.Counter(v['method'] for v in out.values())
    rv = sum(1 for v in out.values() if v.get('review'))
    print(f'{len(out)} proxies: {dict(c)}; {rv} biography counts differ from the stated nominee total')


if __name__ == '__main__':
    main(set(sys.argv[1:]) or None)
