import json, subprocess, urllib.parse
Q={'ADYEN.AS':'adyen','AD.AS':'ahold delhaize','AI.PA':'air liquide','AIR.PA':'airbus','ASML.AS':'asml','CS.PA':'axa','BNP.PA':'bnp paribas','BN.PA':'danone','ENEL.MI':'enel s','ENI.MI':'eni s','EL.PA':'essilorluxottica','RACE.MI':'ferrari','RMS.PA':'herm%s international','INGA.AS':'ing groep','ISP.MI':'intesa sanpaolo','OR.PA':"l%or%al",'MC.PA':'lvmh','PRX.AS':'prosus','SAF.PA':'safran','SGO.PA':'saint-gobain','SAN.PA':'sanofi','SU.PA':'schneider electric','TTE.PA':'totalenergies','DG.PA':'vinci','UCG.MI':'unicredit','WKL.AS':'wolters kluwer'}
res={}
for t,q in Q.items():
    flt=json.dumps([{"name":"entity","op":"has","val":{"name":"name","op":"ilike","val":f"%{q}%"}},{"name":"period_end","op":"ge","val":"2025-12-31"}])
    url='https://filings.xbrl.org/api/filings?'+urllib.parse.urlencode({'filter':flt,'include':'entity','page[size]':'5'})
    d=json.loads(subprocess.run(['curl','-s','-m','60',url],capture_output=True,text=True).stdout or '{}')
    ents={e['id']:e['attributes'].get('name') for e in d.get('included',[])}
    fs=[(f['attributes'].get('period_end'),ents.get(f['relationships']['entity']['data']['id']),f['attributes'].get('report_url'),f['attributes'].get('fxo_id')) for f in d.get('data',[])]
    res[t]=fs; print(t,'->',[(p,n,(r or '')[-60:]) for p,n,r,_ in fs][:3])
json.dump(res,open('esef_found.json','w'))
