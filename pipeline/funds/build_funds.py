"""Index funds and ETFs that track an index Nivel covers, from AMFI's scheme list.

Run from the pipeline working directory after map_passive.py:
  python3 build_funds.py passive_map.json ../src/data/indexes.json out/funds.json
Each fund points at the index it tracks; its footprint is that index's, so it updates when the index does.
"""
import json, re, sys

src, indexes_path, out_path = sys.argv[1:4]
m = json.load(open(src))
indexes = json.load(open(indexes_path))


def slug(s):
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')


funds, skipped = [], []
for s in m['matched']:
    if s['tracks'] not in indexes:
        skipped.append(s['name'])
        continue
    direct = [p for p in s['plans'] if 'direct' in (p['plan'] or '').lower()]
    funds.append(dict(id=slug(s['amc'].replace(' Mutual Fund', '') + ' ' + s['name']) if not s['name'].lower().startswith(s['amc'].split()[0].lower()) else slug(s['name']),
                      name=s['name'], house=s['amc'], kind=s['kind'], tracks=s['tracks'],
                      codes=sorted({p['code'] for p in s['plans']}), isins=sorted({p['isin'] for p in s['plans'] if p['isin'] and p['isin'] != '-'}),
                      directCode=direct[0]['code'] if direct else None))
ids = [f['id'] for f in funds]
assert len(ids) == len(set(ids)), [i for i in ids if ids.count(i) > 1][:5]
json.dump(sorted(funds, key=lambda f: (f['tracks'], f['name'])), open(out_path, 'w'), separators=(',', ':'))
print(len(funds), 'funds written;', len(skipped), 'skipped because their index is not built:', skipped[:8])
