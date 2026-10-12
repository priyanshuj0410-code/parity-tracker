"""Run the full group-figure fill-rule study. Usage: python3 -I run_all.py [snapshot.json] [nsim] [outdir]
Run from data/analysis/predict/group. Writes results.json and tables.txt. Reads only the frozen snapshot and /Users/priyanshu/Thoth/knowledge/research/data/companies.json."""
import sys
import site; sys.path.append(site.getusersitepackages())
import os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import json, time, collections
import numpy as np
from gdata import *
import gsim
from gsim import RULES, LABEL, run, make_masks, estimate

snap_path = sys.argv[1] if len(sys.argv) > 1 else 'snapshot.json'
NSIM = int(sys.argv[2]) if len(sys.argv) > 2 else 5000
OUT = sys.argv[3] if len(sys.argv) > 3 else '.'
SEED = 20261011
snap = load_snapshot(snap_path)

SCEN = [(p, f) for p in ('random', 'small', 'large', 'cluster') for f in (0.1, 0.2, 0.3)]
PNAME = {'random': 'random', 'small': 'size-biased (small more likely)', 'large': 'large-biased (stress test)', 'cluster': 'industry-clustered'}
SHOW = ['a_drop', 'a_lfl_change', 'b_carry', 'c1_pooled', 'c2_industry', 'd_shrink', 'd2_shrink_rev']
SHORT = {'a_drop': '(a) drop', 'a_lfl_change': '(a) drop, LFL change', 'b_carry': '(b) carry', 'c1_pooled': '(c1) carry+pooled chg', 'c2_industry': '(c2) carry+industry chg',
         'd_shrink': '(d) shrunk industry chg', 'd2_shrink_rev': '(d2) d + mean reversion'}

lines = []
def P(*a):
    s = ' '.join(str(x) for x in a)
    print(s); lines.append(s)

res = dict(meta=dict(nsim=NSIM, seed=SEED, snapshot=snap['taken'], n_readings=snap['n_readings_fy2526']))

# ---------------------------------------------------------------- datasets
prim = collections.OrderedDict([
    ('panel_payroll', panel_payroll(name='panel payroll share')),
    ('panel_headcount', panel_headcount(name='panel permanent-staff share')),
    ('brsr_payroll', brsr_payroll(snap, name='brsr1000 payroll share')),
    ('brsr_headcount', brsr_headcount(snap, name='brsr1000 permanent-staff share')),
])
sens = collections.OrderedDict([
    ('panel_payroll_lfl78 (no basis-change cos)', panel_payroll(no_basis=True, name='panel payroll, basis-change companies removed')),
    ('panel_payroll_noleak (FY24-25 not from FY25-26 prior col)', panel_payroll(no_leak=True, name='panel payroll, prior-column values removed')),
    ('panel_payroll_actualW (FY25-26 payroll for observed, FY24-25 for masked)', panel_payroll(weights='actual', name='panel payroll')),
    ('panel_payroll FY23-24>FY24-25', panel_payroll(y0='2023-24', y1='2024-25', name='panel payroll FY23-24>FY24-25')),
    ('panel_payroll FY22-23>FY23-24', panel_payroll(y0='2022-23', y1='2023-24', name='panel payroll FY22-23>FY23-24')),
    ('panel_headcount all-staff', panel_headcount(kind='all', name='panel all-staff share')),
    ('panel_headcount FY23-24>FY24-25', panel_headcount(y0='2023-24', y1='2024-25', name='panel permanent-staff FY23-24>FY24-25')),
    ('brsr_payroll headcount-only weights', brsr_payroll(snap, weights='headcount', name='brsr1000 payroll share, headcount weights')),
    ('brsr_payroll clean last year (prior-year column of same filing)', brsr_payroll(snap, last='clean', name='brsr1000 payroll share, clean last year')),
    ('brsr_payroll no ~2024-25, no perm check', brsr_payroll(snap, include_tilde=False, perm_check=False, name='brsr1000 payroll share, parser year exact, no perm cross-check')),
    ('brsr_headcount actualW (FY24-25 totals for masked)', brsr_headcount(snap, weights='actual', name='brsr1000 permanent-staff share')),
])

# ---------------------------------------------------------------- signal block
P('=' * 100)
P('SIGNAL: actual year-on-year change of the group figure (pp), n = companies in universe')
sig = {}
for k, ds in list(prim.items()) + list(sens.items()):
    sig[k] = dict(n=ds.n, level_last=ds.last(), level_truth=ds.truth(), change=ds.signal(), lfl_change=ds.lfl_signal(), n_lfl=int(ds.fit_ok.sum()),
                  company_chg_sd=float(np.std(ds.s26 - ds.s25)), company_chg_median=float(np.median(ds.s26 - ds.s25)), company_level_sd=float(np.std(ds.s26)),
                  company_level_iqr=float(np.subtract(*np.percentile(ds.s26, [75, 25]))), excl=ds.extra.get('excl'))
    P('%-72s n=%3d  last %.2f  truth %.2f  change %+.3f  LFL change %+.3f (n=%d)  | company change SD %.2f median %+.2f | company level SD %.1f'
      % (k, ds.n, ds.last(), ds.truth(), ds.signal(), ds.lfl_signal(), int(ds.fit_ok.sum()), sig[k]['company_chg_sd'], sig[k]['company_chg_median'], sig[k]['company_level_sd']))
# sampling uncertainty of the signal itself: bootstrap over companies of the pooled change
rngs = np.random.default_rng(99)
for k, ds in prim.items():
    ch, lf = [], []
    for b in range(2000):
        idx = rngs.integers(0, ds.n, ds.n)
        dsb = ds.take(idx)
        ch.append(dsb.signal()); lf.append(dsb.lfl_signal())
    sig[k]['change_boot_ci95'] = [float(np.percentile(ch, 2.5)), float(np.percentile(ch, 97.5))]
    sig[k]['lfl_boot_ci95'] = [float(np.percentile(lf, 2.5)), float(np.percentile(lf, 97.5))]
    sig[k]['change_boot_se'] = float(np.std(ch))
    P('  bootstrap over companies (2000), %-16s change %+.3f 95%% CI [%+.3f, %+.3f] SE %.3f | LFL change 95%% CI [%+.3f, %+.3f]' % (k, ds.signal(), *sig[k]['change_boot_ci95'], sig[k]['change_boot_se'], *sig[k]['lfl_boot_ci95']))
P('Method doc like-for-like changes (not recomputed here): Nifty 50 +0.34 pp (42 cos), Sensex +0.32 (24), Nifty Next 50 0.00 (36), company median +0.31 (78 cos)')
res['signal'] = sig

# brsr: parser quality and same-set comparison of Kaggle-based vs clean last-year
rows = snap['rows']
cmp_ = [(r['wage_share_current'], r['wage_share_prior'], r['scan']['wageShare']) for r in rows
        if r['scan'] and isinstance(r['scan'].get('wageShare'), float) and r['wage_share_prior'] is not None and r['wage_share_current'] is not None and parser_ok(r['scan'])[0]]
a = np.array(cmp_)
diff = a[:, 2] - a[:, 1]
P('-' * 100)
P('brsr1000 parser check (filtered Kaggle FY24-25 share vs checked prior-year column of the FY25-26 filing), n=%d: MAE %.3f pp, |diff|>0.5pp: %d, >2pp: %d, max %.2f'
  % (len(a), np.abs(diff).mean(), int((np.abs(diff) > 0.5).sum()), int((np.abs(diff) > 2).sum()), np.abs(diff).max()))
res['parser_check'] = dict(n=len(a), mae=float(np.abs(diff).mean()), n_gt05=int((np.abs(diff) > 0.5).sum()), n_gt2=int((np.abs(diff) > 2).sum()), max=float(np.abs(diff).max()))
bp = prim['brsr_payroll']
P('brsr_payroll exclusions:', bp.extra['excl'], '| weights: payroll-based', bp.extra['n_payroll_weight'], 'headcount-proxy', bp.extra['n_headcount_weight'], '| median wage/employee Rs %.0f' % bp.extra['per_head_rupees'])
bpc = sens['brsr_payroll clean last year (prior-year column of same filing)']
# same companies: clean vs kaggle-based change
ids_k = set(bp.ids); keepc = np.array([i in ids_k for i in bpc.ids])
sc = bpc.subset(keepc)
P('brsr1000 same %d companies: change with Kaggle last year %+.3f pp, with clean prior-year column %+.3f pp' % (sc.n, bp.signal(), sc.signal()))
res['brsr_same_set'] = dict(n=sc.n, kaggle=bp.signal(), clean=sc.signal())
P('brsr_headcount exclusions:', prim['brsr_headcount'].extra['excl'])
P('panel_payroll exclusions:', prim['panel_payroll'].extra['excl'], 'flagged basis change among universe:', prim['panel_payroll'].extra['n_basis'], 'prior-column FY24-25:', prim['panel_payroll'].extra['n_leak'])
P('panel_headcount exclusions:', prim['panel_headcount'].extra['excl'], 'basis', prim['panel_headcount'].extra['n_basis'])

# current-state: how much of the panel is missing right now
d = load_panel()
tot = 0.0; miss = 0.0; names = []
for s, c in d.items():
    fw, _ = fixed_weight(c)
    if not fw: continue
    tot += fw
    b = c['years'].get('2025-26')
    if (not b) or b['wKind'] != 'reported' or b['w'] is None:
        miss += fw; names.append(s)
P('Panel FY2025-26 right now: %d of %d weighted companies lack a reported w (%s); %.1f%% of fixed payroll weight' % (len(names), sum(1 for c in d.values() if fixed_weight(c)[0]), ','.join(names), 100 * miss / tot))
res['panel_now_missing'] = dict(n=len(names), names=names, weight_share=miss / tot)

# ---------------------------------------------------------------- primary simulations
def table(ds, tag, scen=SCEN, show=SHOW, nsim=NSIM, seed=SEED):
    out = {}
    for pat, fr in scen:
        s, err, masks = run(ds, pat, fr, nsim=nsim, seed=seed)
        out['%s_%d' % (pat, round(fr * 100))] = s
    return out

allres = {}
t0 = time.time()
for k, ds in prim.items():
    allres[k] = table(ds, k)
    P('=' * 100)
    P('%s | n=%d | FY24-25 -> FY25-26 change %+.3f pp | nsim=%d each | MAE / P95 of |error| in pp' % (ds.name, ds.n, ds.signal(), NSIM))
    hdr = '%-34s %-9s' % ('pattern', 'masked wt') + ' '.join('%-17s' % SHORT[r] for r in SHOW)
    P(hdr)
    for pat, fr in SCEN:
        s = allres[k]['%s_%d' % (pat, round(fr * 100))]
        P('%-34s %-9s' % ('%s %d%%' % (PNAME[pat], round(fr * 100)), '%.0f%%' % (100 * s['_meta']['masked_wt_share'])) +
          ' '.join('%-17s' % ('%.3f / %.3f' % (s[r]['mae'], s[r]['p95'])) for r in SHOW))
P('time main: %.1fs' % (time.time() - t0))
res['primary'] = allres

# ---------------------------------------------------------------- sensitivities (4 reference patterns at 20%)
REF = [('random', 0.2), ('small', 0.2), ('large', 0.2), ('cluster', 0.2)]
sres = {}
for k, ds in sens.items():
    sres[k] = table(ds, k, scen=REF)
    P('=' * 100)
    P('SENS %s | n=%d | change %+.3f pp | MAE / P95' % (k, ds.n, ds.signal()))
    P('%-34s ' % 'pattern' + ' '.join('%-17s' % SHORT[r] for r in SHOW))
    for pat, fr in REF:
        s = sres[k]['%s_%d' % (pat, round(fr * 100))]
        P('%-34s ' % ('%s %d%%' % (PNAME[pat], round(fr * 100))) + ' '.join('%-17s' % ('%.3f / %.3f' % (s[r]['mae'], s[r]['p95'])) for r in SHOW))
res['sensitivity'] = sres

# ---------------------------------------------------------------- bias table for primary random 20
P('=' * 100)
P('BIAS (mean signed error, pp) and share of simulations with |error| > |dataset change|, primary datasets, random 20%')
for k in prim:
    s = allres[k]['random_20']
    P('%-18s change %+.3f | ' % (k, prim[k].signal()) + ' '.join('%s bias %+.3f over %.2f' % (r.split('_')[0], s[r]['bias'], s[r]['over_signal']) for r in SHOW))

# ---------------------------------------------------------------- bootstrap over companies
def boot(ds, pat, fr, B=300, nsim=400, seed=7):
    rng = np.random.default_rng(seed)
    rec = {r: [] for r in SHOW}
    for b in range(B):
        idx = rng.integers(0, ds.n, ds.n)
        dsb = ds.take(idx)
        s, _, _ = run(dsb, pat, fr, nsim=nsim, seed=int(rng.integers(1 << 30)))
        for r in SHOW: rec[r].append(s[r]['mae'])
    rec = {r: np.array(v) for r, v in rec.items()}
    ci = lambda v: [float(np.percentile(v, 2.5)), float(np.percentile(v, 97.5))]
    out = {r: dict(mean=float(rec[r].mean()), ci=ci(rec[r])) for r in SHOW}
    pairs = [('b_carry', 'c1_pooled'), ('c1_pooled', 'd_shrink'), ('c1_pooled', 'c2_industry'), ('b_carry', 'd_shrink'), ('a_drop', 'c1_pooled')]
    for x, y in pairs:
        dd = rec[x] - rec[y]
        out['%s_minus_%s' % (x, y)] = dict(mean=float(dd.mean()), ci=ci(dd), share_pos=float((dd > 0).mean()))
    return out

bres = {}
t0 = time.time()
for k, ds in prim.items():
    bres[k] = {}
    for pat, fr in (('random', 0.2), ('cluster', 0.2)):
        bres[k]['%s_%d' % (pat, round(fr * 100))] = boot(ds, pat, fr)
    P('=' * 100)
    P('BOOTSTRAP over companies (300 resamples x 400 sims) %s: MAE with 95%% CI, then paired MAE differences (positive = second rule better)' % k)
    for key in ('random_20', 'cluster_20'):
        o = bres[k][key]
        P('  ' + key + ': ' + ' | '.join('%s %.3f [%.3f,%.3f]' % (r.split('_')[0], o[r]['mean'], o[r]['ci'][0], o[r]['ci'][1]) for r in SHOW))
        for kk, v in o.items():
            if '_minus_' in kk:
                P('     %-26s mean %+.3f  CI [%+.3f, %+.3f]  share>0 %.2f' % (kk, v['mean'], v['ci'][0], v['ci'][1], v['share_pos']))
P('time bootstrap: %.1fs' % (time.time() - t0))
res['bootstrap'] = bres

# ---------------------------------------------------------------- interval half-widths: calibrate on random 20%, test elsewhere
cov = {}
P('=' * 100)
P('INTERVALS for (c1) and (b): half-width = empirical quantile of |error| under random 20%; coverage of that half-width under other patterns')
for k, ds in prim.items():
    cov[k] = {}
    for rule in ('c1_pooled', 'b_carry'):
        _, err, _ = run(ds, 'random', 0.2, nsim=NSIM, seed=SEED)
        hw = {q: float(np.percentile(np.abs(err[rule]), q)) for q in (80, 90, 95)}
        row = {}
        for pat, fr in SCEN:
            _, e2, _ = run(ds, pat, fr, nsim=NSIM, seed=SEED)
            row['%s_%d' % (pat, round(fr * 100))] = {q: float((np.abs(e2[rule]) <= hw[q]).mean()) for q in (80, 90)}
        cov[k][rule] = dict(hw=hw, coverage=row)
        P('%-16s %-10s hw80 %.3f hw90 %.3f hw95 %.3f | coverage of hw80/hw90 at: ' % (k, rule.split('_')[0], hw[80], hw[90], hw[95]) +
          ' '.join('%s%d:%.2f/%.2f' % (pat[0], round(fr * 100), row['%s_%d' % (pat, round(fr * 100))][80], row['%s_%d' % (pat, round(fr * 100))][90]) for pat, fr in SCEN))
res['intervals'] = cov

# ---------------------------------------------------------------- average over the three non-adversarial families
P('=' * 100)
P('AVERAGE MAE over random/size-biased/clustered at 10,20,30% (27... 9 scenarios) per rule; and worst-case P95 over those 9')
avg = {}
for k in prim:
    sc_ = [allres[k]['%s_%d' % (p, round(f * 100))] for p in ('random', 'small', 'cluster') for f in (0.1, 0.2, 0.3)]
    avg[k] = {r: dict(mae=float(np.mean([s[r]['mae'] for s in sc_])), p95_max=float(np.max([s[r]['p95'] for s in sc_]))) for r in SHOW}
    P('%-16s ' % k + ' '.join('%s %.3f (maxP95 %.3f)' % (r.split('_')[0], avg[k][r]['mae'], avg[k][r]['p95_max']) for r in SHOW))
res['avg9'] = avg

json.dump(res, open(OUT + '/results.json', 'w'), indent=1)
open(OUT + '/tables.txt', 'w').write('\n'.join(lines))
print('wrote', OUT + '/results.json', OUT + '/tables.txt')
