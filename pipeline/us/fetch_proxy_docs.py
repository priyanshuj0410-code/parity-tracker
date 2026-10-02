"""Download each company's latest proxy statement (from proxies.json) into docs/{SYMBOL}.htm.

www.sec.gov serves filing documents only to clients that declare who they are, so SEC_USER_AGENT must hold a name
and a contact email, e.g. "Nivel by The Equal Lens contact@example.org". SEC asks for at most 10 requests a second.
"""
import json
import os
import time
import urllib.request

UA = os.environ['SEC_USER_AGENT']


def main():
    os.makedirs('docs', exist_ok=True)
    proxies = json.load(open('proxies.json'))
    done = failed = 0
    for symbol, p in proxies.items():
        path = f'docs/{symbol}.htm'
        if not p or os.path.exists(path):
            continue
        req = urllib.request.Request(p['url'], headers={'User-Agent': UA, 'Accept-Encoding': 'identity'})
        try:
            body = urllib.request.urlopen(req, timeout=60).read()
            open(path, 'wb').write(body)
            done += 1
        except Exception as e:
            failed += 1
            print(f'{symbol}: {e}')
        time.sleep(0.2)
    print(f'downloaded {done}, failed {failed}')


if __name__ == '__main__':
    main()
