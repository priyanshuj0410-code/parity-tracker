"""Parse AMFI's NAVAll.txt into amfi_schemes.json: one row per scheme plan, with its category and fund house.

  curl -sL -A "<browser user agent>" -o NAVAll.txt https://portal.amfiindia.com/spages/NAVAll.txt
  python3 parse_amfi.py NAVAll.txt amfi_schemes.json
"""
import json, sys

rows, cat, amc = [], None, None
for line in open(sys.argv[1], encoding='utf-8', errors='replace').read().splitlines()[1:]:
    s = line.strip()
    if not s:
        continue
    if ';' not in s:
        if s.startswith(('Open Ended', 'Close Ended', 'Interval')):
            cat = s
        else:
            amc = s
        continue
    p = s.split(';')
    if len(p) >= 8 and p[0].isdigit():
        rows.append(dict(code=p[0], isin=p[1], isin2=p[2], name=p[3].strip(), plan=p[4].strip(), option=p[5].strip(),
                         nav=p[6], date=p[7], cat=cat, amc=amc))
json.dump(rows, open(sys.argv[2], 'w'))
print(len(rows), 'scheme plans,', len({r['name'] for r in rows}), 'schemes,', len({r['amc'] for r in rows}), 'fund houses')
