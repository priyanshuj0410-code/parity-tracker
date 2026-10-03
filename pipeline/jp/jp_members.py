"""Japan's members: the Nikkei 225 (n225.json) and TOPIX 500, with TSE 33-sector labels for both.

Inputs in the working folder: n225.json, topixweight_j.csv (JPX TOPIX weights, Shift-JIS, size band
in the last column) and data_e.xlsx (JPX list of listed issues, English names and 33 sectors).
Output: jp_members.json, a list of {code, name, sector, indexes}.
"""
import csv, json, re
import openpyxl

n225 = {c['code']: c for c in json.load(open('n225.json'))}
rows = list(openpyxl.load_workbook('data_e.xlsx', read_only=True).active.iter_rows(values_only=True))
jpx = {str(r[1]): r for r in rows[1:]}
weights = list(csv.reader(open('topixweight_j.csv', encoding='shift_jis')))[1:]
TOPIX500 = {'TOPIX Core30', 'TOPIX Large70', 'TOPIX Mid400'}
t500 = [r[2] for r in weights if r[5] in TOPIX500]

SUFFIX = re.compile(r'[\s,.]+(&\s*CO\.?|CO\.?,?\s*LTD\.?|CO\.?|COMPANY,?\s*LIMITED|CORPORATION|CORP\.?|INCORPORATED|INC\.?|LIMITED|LTD\.?|K\.K\.)\s*$', re.I)
FIX = {'Nh Foods': 'NH Foods', 'Dena': 'DeNA', 'J.front Retailing': 'J.Front Retailing', 'Shift': 'SHIFT', 'Ly': 'LY Corporation', 'Cyberagent': 'CyberAgent', 'Ntn': 'NTN', 'Baycurrent': 'BayCurrent', 'Mitsui O.s.k.lines': 'Mitsui O.S.K. Lines', 'Sumitomo Corporation (sumitomo Shoji Kaisha, Ltd.)': 'Sumitomo Corporation', 'Mitsubishi': 'Mitsubishi Corporation', 'Mitsui': 'Mitsui & Co.', 'Mitsubishi Ufj Financial Group': 'Mitsubishi UFJ Financial Group', 'Softbank': 'SoftBank Corp.', 'Softbank Group': 'SoftBank Group', 'Toto': 'TOTO', 'Ricoh Company': 'Ricoh', 'Dowa Holdings': 'DOWA Holdings', 'Kusuri No Aoki Holdings': 'Kusuri no Aoki Holdings', 'Itochu': 'ITOCHU', 'Tisi': 'TIS', 'Nof': 'NOF', 'Osg': 'OSG', 'Nsd': 'NSD', 'Jeol': 'JEOL', 'Jvckenwood': 'JVCKenwood', 'Jx Advanced Metals': 'JX Advanced Metals', 'H.u. Group Holdings': 'H.U. Group Holdings', 'Mitsui E&s': 'Mitsui E&S', 'Nhk Spring': 'NHK Spring', 'H2o Retailing': 'H2O Retailing', 'Ts Tech': 'TS Tech', 'As One': 'AS ONE', 'Mitsubishi Hc Capital': 'Mitsubishi HC Capital', 'Ns Solutions': 'NS Solutions', 'Hakuhodo Dy Holdings': 'Hakuhodo DY Holdings', 'Abc-Mart': 'ABC-Mart', 'Nihon M&a Center Holdings': 'Nihon M&A Center Holdings', 'Peptidream': 'PeptiDream', 'Monotaro': 'MonotaRO', 'Ulvac': 'ULVAC', 'Matsukiyococokara': 'MatsukiyoCocokara'}
ACRONYMS = {'KDDI', 'SCSK', 'ORIX', 'NTT', 'NEC', 'TDK', 'IHI', 'JFE', 'SMC', 'JGC', 'NSK', 'THK', 'MS&AD', 'T&D', 'SBI', 'JR', 'TIS', 'BIPROGY', 'GMO', 'ZOZO', 'TBS', 'DIC', 'NOK', 'JSR', 'KH', 'ENEOS', 'INPEX', 'SUMCO', 'LIXIL', 'NGK', 'AGC', 'JTEKT', 'DMG', 'UBE', 'MEC', 'SG', 'J', 'USS', 'OBIC', 'NIPPON', 'ANA', 'JAL', 'SHO-BOND', 'GS', 'MCJ'}
LOWER = {'AND', 'OF', 'THE', 'FOR'}


def word(w, first):
    core = w.strip(',.')
    if core.upper() in ACRONYMS and core.upper() not in ('NIPPON',):
        return w.upper()
    if not first and core.upper() in LOWER:
        return w.lower()
    return '-'.join(p[:1].upper() + p[1:].lower() for p in w.split('-'))


def strip(name):
    name = name.strip()
    while (short := SUFFIX.sub('', name)) != name:
        name = short
    return name.rstrip(' &,')


def pretty(name):
    name = re.sub(r',(?=\S)', ', ', strip(name))
    out = ' '.join(word(w, i == 0) for i, w in enumerate(name.split()))
    return FIX.get(out, out)


members = []
for code in sorted(set(n225) | set(t500)):
    r = jpx.get(code)
    sector = r[5] if r else None
    if not sector:
        raise SystemExit(f'{code} missing from data_e.xlsx')
    members.append(dict(code=code, name=pretty(r[2]), sector=sector,
                        indexes=[i for i, ok in (('nikkei225', code in n225), ('topix500', code in t500)) if ok]))
json.dump(members, open('jp_members.json', 'w'), ensure_ascii=False, indent=0)
print(len(members), 'members;', sum('topix500' in m['indexes'] for m in members), 'TOPIX 500;', sum('nikkei225' in m['indexes'] for m in members), 'Nikkei 225')
print([m['name'] for m in members if 'nikkei225' not in m['indexes']][:40])
