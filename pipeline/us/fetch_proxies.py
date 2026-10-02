"""Latest proxy statement (DEF 14A) for every constituent, from SEC EDGAR's submissions API. Writes proxies.json.

data.sec.gov answers a descriptive user agent. Downloading the documents themselves from www.sec.gov needs a
user agent that declares a contact email (SEC fair-access policy); set SEC_USER_AGENT for that step.
"""
import json
import os
import time
import urllib.request

UA = os.environ.get('SEC_USER_AGENT', 'Nivel research (The Equal Lens)')


def latest_proxy(cik):
    req = urllib.request.Request(f'https://data.sec.gov/submissions/CIK{cik}.json', headers={'User-Agent': UA})
    recent = json.load(urllib.request.urlopen(req, timeout=30))['filings']['recent']
    for i, form in enumerate(recent['form']):
        if form == 'DEF 14A':
            acc = recent['accessionNumber'][i].replace('-', '')
            return {'filed': recent['filingDate'][i], 'url': f'https://www.sec.gov/Archives/edgar/data/{int(cik)}/{acc}/{recent["primaryDocument"][i]}'}
    return None


def main():
    companies = json.load(open('constituents.json'))['sp500']
    out = {}
    for c in companies:
        out[c['symbol']] = latest_proxy(c['cik'])
        time.sleep(0.12)
    json.dump(out, open('proxies.json', 'w'), indent=1)
    found = sum(1 for v in out.values() if v)
    print(f'{found} of {len(out)} companies have a DEF 14A on file')


if __name__ == '__main__':
    main()
