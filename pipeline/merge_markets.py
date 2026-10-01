import json
C=json.load(open('out/companies.json')); I=json.load(open('out/indexes.json'))
UC=json.load(open('uk/uk_companies.json')); UI=json.load(open('uk/uk_index.json'))
clash=[k for k in UC if k in C]
if clash:
    ren={k:'LSE-'+k for k in clash}
    for k,v in ren.items(): UC[v]=UC.pop(k); UC[v]['symbol']=v
    UI['constituents']=[dict(c,symbol=ren.get(c['symbol'],c['symbol'])) for c in UI['constituents']]
print('clashes',clash)
C.update(UC); I['ftse100']=UI
json.dump(C,open('out/all_companies.json','w'),separators=(',',':')); json.dump(I,open('out/all_indexes.json','w'),separators=(',',':'))
print(len(C),list(I))
