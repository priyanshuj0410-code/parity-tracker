"""Swap one market's companies and indexes into src/data without rebuilding the others.

Run from the repo root, then rerun the shared steps:
    python3 pipeline/apply_market.py JP pipeline-scratch/jp/jp_companies.json pipeline-scratch/jp/jp_indexes.json
    python3 pipeline/shared_scale.py && python3 pipeline/sectors.py

The indexes file holds one index (with an `id`) or a dict of them keyed by id.
"""
import json
import sys

country, c_path, i_path = sys.argv[1:4]
C = json.load(open('src/data/companies.json'))
I = json.load(open('src/data/indexes.json'))
new = json.load(open(c_path))
idx = json.load(open(i_path))

for c in new.values():
    if 'ukStatus' in c:
        c['noDataReason'] = c.pop('ukStatus')
    c.pop('payrollAud', None)
    assert c['country'] == country, (c['symbol'], c['country'])

before = sum(1 for c in C.values() if c['country'] == country)
C = {k: c for k, c in C.items() if c['country'] != country}
clash = [k for k in new if k in C]
assert not clash, clash
C.update(new)
for ix in ([idx] if 'id' in idx else idx.values()):
    I[ix['id']] = ix

json.dump(C, open('src/data/companies.json', 'w'), separators=(',', ':'))
json.dump(I, open('src/data/indexes.json', 'w'), separators=(',', ':'))
print(f'{country}: {before} companies replaced by {len(new)}; indexes', [ix['id'] for ix in ([idx] if 'id' in idx else idx.values())])
