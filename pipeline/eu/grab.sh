#!/bin/bash
# usage: grab.sh CODE URL  -> downloads, extracts text, prints pay-gap context
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
code=$1; url=$2
curl -s -L -m 240 -A "$UA" -o "pdf/$code.pdf" "$url"
if ! head -c 5 "pdf/$code.pdf" | grep -q "%PDF"; then echo "== $code: not a PDF ($url)"; exit 0; fi
pdftotext -layout "pdf/$code.pdf" "pdf/$code.txt" 2>/dev/null
echo "== $code ($(wc -c < pdf/$code.pdf) bytes)"
python3 - "$code" <<'PY'
import re,sys
code=sys.argv[1]; L=open(f'pdf/{code}.txt',errors='ignore').read().split('\n')
hits=[i for i,l in enumerate(L) if re.search(r'gender pay gap|pay gap|écart de rémunération|brecha salarial|Entgeltlücke|S1-16',l,re.I)]
seen=set(); out=0
for i in hits:
    if any(abs(i-s)<6 for s in seen): continue
    seen.add(i)
    block=' '.join(x.strip() for x in L[max(0,i-1):i+4])
    block=re.sub(r'\s+',' ',block)
    if re.search(r'\d+[.,]?\d* ?(%|percent|per cent|Prozent)',block,re.I):
        print('  ',block[:260]); out+=1
    if out>=7: break
if out==0: print('   (no pay-gap figures found)')
PY
