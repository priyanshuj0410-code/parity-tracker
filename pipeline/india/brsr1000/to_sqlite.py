"""Rebuild <data>/brsr1000.sqlite from the BRSR filer build's files (PARITY-123). The files stay the source: the
database is written fresh each time, to a temporary file that then replaces the old one, so a reader never sees half
a build and the database can never drift from the readings.

    python3 to_sqlite.py <data dir>

Tables: companies (names as names.py reads them; CIN, ISIN, NSE symbol and BSE scrip ID and code from identifiers.py), fetches, readings (one row per company, core BRSR fields), median_pay (BRSR's levels),
ladder (every level the company reports, mapped to a standard level), functions (job functions by gender), the other
BRSR gender tables (disabled, turnover_trend, min_wage, wellbeing, unions, training, reviews), the annual-report flows
and targets, and profile (one row per company: context, complaints, leadership, ownership, policies, pay ratio).
"""
import json, os, re, sqlite3, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from names import split_former

data = sys.argv[1]
P = lambda *a: os.path.join(data, *a)
def load(p): return json.load(open(p)) if os.path.exists(p) else None
def g(o, *path):
    for k in path:
        o = o.get(k) if isinstance(o, dict) else None
    return o

SCHEMA = """
create table companies (key text primary key, kind text, symbol text, cin text, name text, website text, status text,
  batch text, kaggle_file text, kaggle_fy text, source_kind text, source_ref text, fy text, checked_by text,
  isin text, nse_symbol text, bse_id text, bse_code text, cin_note text, formerly text);
create table fetches (key text, seq integer, role text, url text, status text, fy text, bytes integer, sha256 text,
  words integer, has_brsr integer, http text, reason text);
create table readings (key text primary key, fy text, boundary text, nic_code text, nic_activity text,
  wage_share_current real, wage_share_prior real, wages_women real, wages_total real, wages_unit text,
  perm_emp_total real, perm_emp_men real, perm_emp_women real, temp_emp_total real, temp_emp_men real, temp_emp_women real,
  perm_wkr_total real, perm_wkr_men real, perm_wkr_women real, temp_wkr_total real, temp_wkr_men real, temp_wkr_women real,
  board_total real, board_women real, kmp_total real, kmp_women real,
  turnover_men real, turnover_women real, turnover_total real,
  parental_men_return real, parental_men_retention real, parental_women_return real, parental_women_retention real, notes text);
create table median_pay (key text, level text, unit text, men real, men_median real, women real, women_median real);
create table ladder (key text, seq integer, level text, standard text, men real, women real, women_pct real,
  pay_basis text, pay_unit text, pay_men real, pay_women real, source text);
create table functions (key text, seq integer, function text, standard text, men real, women real, women_pct real,
  scope text, source text);
create table disabled (key text, grp text, total real, men real, women real);
create table turnover_trend (key text, fy text, men real, women real, total real);
create table min_wage (key text, grp text, gender text, total real, at_min real, above_min real);
create table wellbeing (key text, grp text, gender text, total real, health_insurance real, accident_insurance real, maternity real, paternity real, day_care real);
create table unions (key text, grp text, gender text, total real, members real);
create table training (key text, grp text, gender text, total real, health_safety real, skills real);
create table reviews (key text, grp text, gender text, total real, reviewed real);
create table flows (key text, seq integer, flow text, level text, standard text, men real, women real, women_pct real, fy text, source text);
create table targets (key text, seq integer, topic text, metric text, target real, by_year integer, current real, progress text, source text);
create table profile (key text primary key, incorporated integer, state text, nat_plants real, nat_offices real, intl_plants real,
  intl_offices real, exports_pct real, turnover real, turnover_unit text, net_worth real, net_worth_unit text,
  assurance_provider text, assurance_type text, posh_filed real, posh_pending real, posh_pct_women real, posh_upheld real,
  discrimination_filed real, discrimination_pending real, wages_complaints_filed real, wages_complaints_pending real,
  wellbeing_spend_current real, wellbeing_spend_prior real, ceo_title text, ceo_gender text, chair_gender text,
  independent_women real, executive_women real, leadership_source text, promoter_pct real, ownership_type text,
  business_group text, ownership_source text, maternity_weeks real, paternity_weeks real, return_to_work text, creche integer,
  flexible_work integer, policies_source text, ceo_to_median real, median_increase_pct real, pay_ratio_source text);
create view ladder_by_standard as
  select standard, count(distinct key) companies, sum(women) women, sum(men) men,
         round(100.0 * sum(women) / nullif(sum(women) + sum(men), 0), 1) women_pct_pooled
  from ladder where women is not null and men is not null group by standard;
"""

tmp = P('brsr1000.sqlite.tmp')
if os.path.exists(tmp): open(tmp, 'wb').close()
db = sqlite3.connect(tmp)
db.execute('pragma journal_mode=off')
db.executescript(SCHEMA)
Q = json.load(open(P('queue.json')))
# identifiers.json sits in the build's data folder; a history store (data/history/<fy>) reads the same one
IDS = (load(P('identifiers.json')) or load(os.path.join(data, '..', '..', 'identifiers.json')) or {}).get('companies', {})
for k, q in Q.items():
    v = load(P('verified', k + '.json')) or {}
    c = load(P('cand', k + '.json')) or {}
    i = IDS.get(k, {}); name, former = split_former(q.get('name') if q.get('nameByOwner') else v.get('name') or q.get('name'))
    db.execute('insert into companies values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
               (k, q.get('kind'), q.get('symbol'), i.get('cin') or v.get('cin') or q.get('cin'), name, v.get('website') or q.get('website'),
                q.get('status'), q.get('batch'), q.get('kaggleFile'), q.get('kaggleFY'), c.get('sourceKind'), c.get('sourceRef'), v.get('fy'), v.get('checkedBy'),
                i.get('isin'), i.get('nse'), i.get('bseId'), i.get('bseCode'), i.get('cinNote'), q.get('formerly') or former))
    for i, f in enumerate(q.get('fetches') or []):
        db.execute('insert into fetches values (?,?,?,?,?,?,?,?,?,?,?,?)', (k, i, f.get('role'), f.get('url'), f.get('status'), f.get('fy'),
                   f.get('bytes'), f.get('sha256'), f.get('words'), int(bool(f.get('hasBRSR'))), f.get('http'), f.get('reason')))
    if not v: continue
    h = v.get('headcount') or {}
    row = [k, v.get('fy'), v.get('boundary'), g(v, 'nic', 'code'), g(v, 'nic', 'activity'),
           g(v, 'wageShare', 'current'), g(v, 'wageShare', 'prior'), g(v, 'wages', 'women'), g(v, 'wages', 'total'), g(v, 'wages', 'unit')]
    for part in ('permEmployees', 'tempEmployees', 'permWorkers', 'tempWorkers'):
        row += [g(h, part, 'total'), g(h, part, 'men'), g(h, part, 'women')]
    row += [g(v, 'board', 'total'), g(v, 'board', 'women'), g(v, 'kmp', 'total'), g(v, 'kmp', 'women'),
            g(v, 'turnover', 'men'), g(v, 'turnover', 'women'), g(v, 'turnover', 'total'),
            g(v, 'parental', 'men', 'returnRate'), g(v, 'parental', 'men', 'retentionRate'),
            g(v, 'parental', 'women', 'returnRate'), g(v, 'parental', 'women', 'retentionRate'), v.get('notes')]
    db.execute(f'insert into readings values ({",".join("?" * len(row))})', row)
    mp = v.get('medianPay') or {}
    for lvl in ('board', 'kmp', 'employees', 'workers'):
        r = mp.get(lvl)
        if isinstance(r, dict):
            db.execute('insert into median_pay values (?,?,?,?,?,?,?)', (k, lvl, mp.get('unit'), r.get('men'), r.get('menMedian'), r.get('women'), r.get('womenMedian')))
    for i, r in enumerate(v.get('ladder') or []):
        db.execute('insert into ladder values (?,?,?,?,?,?,?,?,?,?,?,?)', (k, i, r.get('level'), r.get('standard'), r.get('men'), r.get('women'),
                   r.get('womenPct'), g(r, 'pay', 'basis'), g(r, 'pay', 'unit'), g(r, 'pay', 'men'), g(r, 'pay', 'women'), r.get('where')))
    for i, r in enumerate(v.get('functions') or []):
        db.execute('insert into functions values (?,?,?,?,?,?,?,?,?)', (k, i, r.get('function'), r.get('standard'), r.get('men'), r.get('women'),
                   r.get('womenPct'), r.get('scope'), r.get('where')))
    for grp, r in (v.get('disabledHeadcount') or {}).items():
        if isinstance(r, dict): db.execute('insert into disabled values (?,?,?,?,?)', (k, grp, r.get('total'), r.get('men'), r.get('women')))
    rows = lambda f: [r for r in (v.get(f) or []) if isinstance(r, dict)]
    for r in rows('turnoverTrend'): db.execute('insert into turnover_trend values (?,?,?,?,?)', (k, r.get('fy'), r.get('men'), r.get('women'), r.get('total')))
    for r in rows('minWage'): db.execute('insert into min_wage values (?,?,?,?,?,?)', (k, r.get('group'), r.get('gender'), r.get('total'), r.get('atMin'), r.get('aboveMin')))
    for r in rows('wellbeing'):
        db.execute('insert into wellbeing values (?,?,?,?,?,?,?,?,?)', (k, r.get('group'), r.get('gender'), r.get('total'), r.get('healthInsurance'),
                   r.get('accidentInsurance'), r.get('maternity'), r.get('paternity'), r.get('dayCare')))
    for r in rows('unions'): db.execute('insert into unions values (?,?,?,?,?)', (k, r.get('group'), r.get('gender'), r.get('total'), r.get('members')))
    for r in rows('training'): db.execute('insert into training values (?,?,?,?,?,?)', (k, r.get('group'), r.get('gender'), r.get('total'), r.get('healthSafety'), r.get('skills')))
    for r in rows('reviews'): db.execute('insert into reviews values (?,?,?,?,?)', (k, r.get('group'), r.get('gender'), r.get('total'), r.get('reviewed')))
    for i, r in enumerate(rows('flows')):
        db.execute('insert into flows values (?,?,?,?,?,?,?,?,?,?)', (k, i, r.get('flow'), r.get('level'), r.get('standard'), r.get('men'), r.get('women'),
                   r.get('womenPct'), r.get('fy'), r.get('where')))
    for i, r in enumerate(rows('targets')):
        db.execute('insert into targets values (?,?,?,?,?,?,?,?,?)', (k, i, r.get('topic') or ('gender' if re.search(r'wom[ae]n|female|gender|divers', r.get('metric') or '', re.I) else None), r.get('metric'), r.get('target'), r.get('byYear'), r.get('current'), r.get('progress'), r.get('where')))
    x, cm, ld, ow, po, pr = (v.get(f) or {} for f in ('context', 'complaints', 'leadership', 'ownership', 'policies', 'payRatio'))
    flag = lambda b: None if b is None else int(bool(b))
    prof = [k, x.get('incorporated'), x.get('state'), g(x, 'locations', 'nationalPlants'), g(x, 'locations', 'nationalOffices'),
            g(x, 'locations', 'internationalPlants'), g(x, 'locations', 'internationalOffices'), x.get('exportsPct'),
            g(x, 'turnover', 'value'), g(x, 'turnover', 'unit'), g(x, 'netWorth', 'value'), g(x, 'netWorth', 'unit'),
            g(x, 'assurance', 'provider'), g(x, 'assurance', 'type'),
            g(cm, 'sexualHarassment', 'filed'), g(cm, 'sexualHarassment', 'pending'), cm.get('poshPctOfWomen'), cm.get('poshUpheld'),
            g(cm, 'discrimination', 'filed'), g(cm, 'discrimination', 'pending'), g(cm, 'wages', 'filed'), g(cm, 'wages', 'pending'),
            g(v, 'wellbeingSpend', 'current'), g(v, 'wellbeingSpend', 'prior'),
            ld.get('ceoTitle'), ld.get('ceoGender'), ld.get('chairGender'), ld.get('independentWomen'), ld.get('executiveWomen'), ld.get('where'),
            ow.get('promoterPct'), ow.get('type'), ow.get('group'), ow.get('where'),
            po.get('maternityWeeks'), po.get('paternityWeeks'), po.get('returnToWork'), flag(po.get('creche')), flag(po.get('flexibleWork')), po.get('where'),
            pr.get('ceoToMedian'), pr.get('medianIncreasePct'), pr.get('where')]
    db.execute(f'insert into profile values ({",".join("?" * len(prof))})', prof)
db.commit(); db.close()
os.replace(tmp, P('brsr1000.sqlite'))
db = sqlite3.connect(P('brsr1000.sqlite'))
n = {t: db.execute(f'select count(*) from {t}').fetchone()[0] for t in ('companies', 'readings', 'median_pay', 'ladder', 'functions')}
print('brsr1000.sqlite:', ', '.join(f'{t} {c}' for t, c in n.items()))
