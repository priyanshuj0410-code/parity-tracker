import json
C=json.load(open('out/companies.json')); I=json.load(open('out/indexes.json'))
for path_c,path_i,key in (('uk/uk_companies.json','uk/uk_index.json','ftse100'),('au/au_companies.json','au/au_index.json','asx200')):
    MC=json.load(open(path_c)); MI=json.load(open(path_i))
    for c in MC.values():
        if 'ukStatus' in c: c['noDataReason']=c.pop('ukStatus')
        c.pop('payrollAud',None)
    clash=[k for k in MC if k in C]
    assert not clash, clash
    C.update(MC); I[key]=MI
json.dump(C,open('out/all_companies.json','w'),separators=(',',':')); json.dump(I,open('out/all_indexes.json','w'),separators=(',',':'))
print(len(C),list(I))
