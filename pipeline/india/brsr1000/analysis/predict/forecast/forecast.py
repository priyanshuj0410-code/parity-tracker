"""Nivel forecast feasibility: how well can next year's values be predicted?

Run:  python3 -I forecast.py        (reads wide_snapshot.json written by extract_wide.py; panel files read-only)
Writes results.json and results.txt to data/analysis/predict/forecast.
"""
import sys
import site; sys.path.append(site.getusersitepackages())
import os, json, collections
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
PANEL = '/Users/priyanshu/Thoth/knowledge/research/data/companies.json'
IDXF = '/Users/priyanshu/Thoth/knowledge/research/data/indexes.json'
WORK = os.path.join(HERE, '..', '..', '..', 'data', 'analysis', 'predict', 'forecast')  # frozen inputs and outputs, git-ignored
SNAP = os.path.join(WORK, 'wide_snapshot.json')

YEARS = ['2021-22', '2022-23', '2023-24', '2024-25', '2025-26']
YIDX = {y: i for i, y in enumerate(YEARS)}
ORIGINS = ['2022-23', '2023-24', '2024-25']
PHI_GRID = [round(0.1 * k, 1) for k in range(0, 11)]
MIN_TRAIN = 15
BOOT_B = 5000
SIM_B = 20000
W_MAX = 0.60            # a women's wage share of 60%+ is treated as a misread (only ADANIGREEN FY2023-24 = 100%)
MODELS = ['pers', 'drift', 'damped', 'ar1', 'rev_ind', 'rev_all']
MNAME = {'pers': 'persistence', 'drift': 'drift', 'damped': 'damped trend', 'ar1': 'AR(1) on changes',
         'rev_ind': 'reversion to industry', 'rev_all': 'reversion to panel mean'}

LOG = []
RES = {}


def P(*a):
    s = ' '.join(str(x) for x in a)
    print(s)
    LOG.append(s)


# ----------------------------------------------------------------------------- helpers
def mae(e):
    e = np.asarray(e, float)
    return float(np.mean(np.abs(e))) if e.size else float('nan')


def rmse(e):
    e = np.asarray(e, float)
    return float(np.sqrt(np.mean(e ** 2))) if e.size else float('nan')


def f2(x, nd=2):
    if x is None or (isinstance(x, float) and np.isnan(x)):
        return 'nan'
    return ('%.' + str(nd) + 'f') % x


def cluster_boot_diff(groups, d, B=BOOT_B, seed=1):
    groups = np.asarray(groups)
    d = np.asarray(d, float)
    labs = sorted(set(groups.tolist()))
    sums = np.array([d[groups == g].sum() for g in labs])
    cnts = np.array([(groups == g).sum() for g in labs], float)
    rng = np.random.default_rng(seed)
    K = len(labs)
    draw = rng.integers(0, K, size=(B, K))
    est = sums[draw].sum(1) / cnts[draw].sum(1)
    lo, hi = np.percentile(est, [2.5, 97.5])
    return float(d.mean()), float(lo), float(hi), float(np.mean(est < 0))


def cluster_boot_rmse_diff(groups, e_m, e_b, B=BOOT_B, seed=3):
    """95% CI of RMSE(model) - RMSE(baseline), resampling clusters (companies)."""
    groups = np.asarray(groups)
    e_m = np.asarray(e_m, float)
    e_b = np.asarray(e_b, float)
    labs = sorted(set(groups.tolist()))
    sm = np.array([(e_m[groups == g] ** 2).sum() for g in labs])
    sb = np.array([(e_b[groups == g] ** 2).sum() for g in labs])
    cn = np.array([(groups == g).sum() for g in labs], float)
    rng = np.random.default_rng(seed)
    K = len(labs)
    draw = rng.integers(0, K, size=(B, K))
    n_ = cn[draw].sum(1)
    est = np.sqrt(sm[draw].sum(1) / n_) - np.sqrt(sb[draw].sum(1) / n_)
    lo, hi = np.percentile(est, [2.5, 97.5])
    return float(np.sqrt((e_m ** 2).mean()) - np.sqrt((e_b ** 2).mean())), float(lo), float(hi)


def ols(X, y):
    beta, *_ = np.linalg.lstsq(np.asarray(X, float), np.asarray(y, float), rcond=None)
    return beta


def ols_full(X, y):
    X = np.asarray(X, float)
    y = np.asarray(y, float)
    XtXi = np.linalg.pinv(X.T @ X)
    beta = XtXi @ X.T @ y
    e = y - X @ beta
    h = np.clip(np.einsum('ij,jk,ik->i', X, XtXi, X), 0, 0.999999)
    z = e / (1 - h)
    meat = (X * z[:, None]).T @ (X * z[:, None])
    V = XtXi @ meat @ XtXi
    return beta, np.sqrt(np.diag(V)), e, z


def huber(X, y, iters=60):
    X = np.asarray(X, float)
    y = np.asarray(y, float)
    beta = ols(X, y)
    for _ in range(iters):
        r = y - X @ beta
        s = np.median(np.abs(r - np.median(r))) / 0.6745
        if s < 1e-9:
            break
        c = 1.345 * s
        w = np.where(np.abs(r) <= c, 1.0, c / np.maximum(np.abs(r), 1e-12))
        W = X * w[:, None]
        nb = np.linalg.pinv(X.T @ W) @ (W.T @ y)
        done = np.max(np.abs(nb - beta)) < 1e-9
        beta = nb
        if done:
            break
    return beta


def boot_coef(X, y, B=BOOT_B, seed=2, fn=ols, clusters=None):
    X = np.asarray(X, float)
    y = np.asarray(y, float)
    rng = np.random.default_rng(seed)
    out = []
    if clusters is None:
        n = len(y)
        for _ in range(B):
            i = rng.integers(0, n, n)
            out.append(fn(X[i], y[i]))
    else:
        clusters = np.asarray(clusters)
        labs = sorted(set(clusters.tolist()))
        members = [np.where(clusters == g)[0] for g in labs]
        for _ in range(B):
            pick = rng.integers(0, len(labs), len(labs))
            i = np.concatenate([members[k] for k in pick])
            out.append(fn(X[i], y[i]))
    return np.percentile(np.array(out), [2.5, 97.5], axis=0)


# ----------------------------------------------------------------------------- panel series
def load_panel():
    c = json.load(open(PANEL))
    ind = {s: c[s]['industry'] for s in c}
    S = {'w': {}, 'fPerm': {}, 'board': {}}
    prior, flag = {}, {}
    drops = collections.Counter()
    for s, d in c.items():
        for t in S:
            S[t][s] = {}
        prior[s], flag[s] = {}, {}
        for i, y in enumerate(YEARS):
            v = d['years'].get(y)
            if not v:
                continue
            prior[s][y] = 'prior-year column' in (v.get('note') or '')
            if v.get('wKind') == 'reported' and v.get('w') is not None:
                if 0 <= v['w'] < W_MAX:
                    S['w'][s][y] = v['w'] * 100
                else:
                    drops['w>=60%% (%s %s=%.0f%%)' % (s, y, v['w'] * 100)] += 1
            if v.get('fPerm') is not None and 0 <= v['fPerm'] <= 1:
                S['fPerm'][s][y] = v['fPerm'] * 100
            if v.get('board') and v.get('boardWomen') is not None and v['board'] > 0 and v['boardWomen'] <= v['board']:
                S['board'][s][y] = v['boardWomen'] / v['board'] * 100
            f = bool(v.get('basisChange'))
            p = d['years'].get(YEARS[i - 1]) if i > 0 else None
            if p:
                if v.get('headcount') and p.get('headcount'):
                    r = v['headcount'] / p['headcount']
                    if not (0.6 <= r <= 1.6):
                        f = True
                b1, b0 = (v.get('boundary') or '').lower(), (p.get('boundary') or '').lower()
                if b1 and b0 and b1 != b0:
                    f = True
            flag[s][y] = f
    return c, ind, S, prior, flag, drops


def loo_means(S, ind):
    Mi, Ma = {}, {}
    for y in YEARS:
        vals = {s: S[s][y] for s in S if y in S[s]}
        n = len(vals)
        tot = sum(vals.values())
        by = {}
        for s in vals:
            by.setdefault(ind[s], []).append(s)
        mi, ma = {}, {}
        for s, v in vals.items():
            ma[s] = (tot - v) / (n - 1) if n > 1 else v
            grp = [t for t in by[ind[s]] if t != s]
            mi[s] = float(np.mean([vals[t] for t in grp])) if len(grp) >= 2 else ma[s]
        Mi[y], Ma[y] = mi, ma
    return Mi, Ma


class Engine:
    def __init__(self, S, ind, flag, use_flag=True):
        self.S, self.flag, self.use_flag, self.ind = S, flag, use_flag, ind
        self.Mi, self.Ma = loo_means(S, ind)

    def ch(self, s, i):
        S = self.S[s]
        y1, y0 = YEARS[i], YEARS[i - 1]
        if y1 in S and y0 in S and not (self.use_flag and self.flag[s].get(y1, False)):
            return S[y1] - S[y0]
        return None

    def fit(self, t):
        ch = [(s, i, self.ch(s, i)) for s in self.S for i in range(1, t + 1)]
        ch = [x for x in ch if x[2] is not None]
        p = dict(n_ch=len(ch))
        p['drift'] = float(np.mean([x[2] for x in ch])) if ch else 0.0
        lag = []
        for s in self.S:
            for i in range(2, t + 1):
                d1, d0 = self.ch(s, i), self.ch(s, i - 1)
                if d1 is not None and d0 is not None:
                    lag.append((d0, d1))
        p['n_lag'] = len(lag)
        if len(lag) >= MIN_TRAIN:
            X = np.array([[1.0, a] for a, b in lag])
            yv = np.array([b for a, b in lag])
            a0, b0 = ols(X, yv)
            p['ar'] = (float(a0), float(b0))
            maes = [np.mean([abs(b - phi * a) for a, b in lag]) for phi in PHI_GRID]
            p['phi'] = PHI_GRID[int(np.argmin(maes))]
        else:
            p['ar'] = None
            p['phi'] = 0.0
        for name, M in (('ind', self.Mi), ('all', self.Ma)):
            xs = np.array([M[YEARS[i - 1]][s] - self.S[s][YEARS[i - 1]] for s, i, d in ch])
            ds = np.array([d for s, i, d in ch])
            lam = 0.0
            raw = float('nan')
            if len(xs) >= MIN_TRAIN and (xs ** 2).sum() > 0:
                raw = float((xs * ds).sum() / (xs ** 2).sum())
                lam = float(min(1.0, max(0.0, raw)))
            p['lam_' + name] = lam
            p['lam_%s_raw' % name] = raw
        p['n_rev'] = len(ch)
        return p

    @staticmethod
    def predict(p, yt, d0, mi, ma):
        pr = {'pers': yt, 'drift': yt + p['drift']}
        pr['damped'] = yt + p['phi'] * (d0 if d0 is not None else 0.0)
        if p['ar'] is not None and d0 is not None:
            pr['ar1'] = yt + p['ar'][0] + p['ar'][1] * d0
        else:
            pr['ar1'] = yt + p['drift']
        pr['rev_ind'] = yt + p['lam_ind'] * (mi - yt)
        pr['rev_all'] = yt + p['lam_all'] * (ma - yt)
        return pr

    def backtest(self, origins=ORIGINS):
        recs, params = [], {}
        for o in origins:
            t = YIDX[o]
            p = self.fit(t)
            params[o] = p
            y0, y1 = YEARS[t], YEARS[t + 1]
            for s in self.S:
                if y0 in self.S[s] and y1 in self.S[s] and self.ch(s, t + 1) is not None:
                    d0 = self.ch(s, t) if t >= 1 else None
                    pr = self.predict(p, self.S[s][y0], d0, self.Mi[y0][s], self.Ma[y0][s])
                    recs.append(dict(sym=s, origin=o, y=self.S[s][y0], a=self.S[s][y1], d0=d0, lag=d0 is not None, pred=pr))
        return recs, params


def summarize(recs, models=MODELS):
    out = {}
    if not recs:
        return out
    g = [r['sym'] for r in recs]
    ep = np.array([r['a'] - r['pred']['pers'] for r in recs])
    for m in models:
        e = np.array([r['a'] - r['pred'][m] for r in recs])
        d = np.abs(e) - np.abs(ep)
        md, lo, hi, pb = cluster_boot_diff(g, d)
        drm, rlo, rhi = cluster_boot_rmse_diff(g, e, ep)
        out[m] = dict(n=len(e), n_companies=len(set(g)), mae=mae(e), rmse=rmse(e), dmae=md, ci_lo=lo, ci_hi=hi,
                      p_below0=pb, bias=float(e.mean()), drmse=drm, rmse_ci_lo=rlo, rmse_ci_hi=rhi)
    return out


def by_origin(recs, models=MODELS):
    out = {}
    for o in ORIGINS:
        rr = [r for r in recs if r['origin'] == o]
        if not rr:
            continue
        out[o] = {m: dict(n=len(rr), mae=mae([r['a'] - r['pred'][m] for r in rr]),
                          rmse=rmse([r['a'] - r['pred'][m] for r in rr])) for m in models}
    return out


def interval_stats(recs, model):
    e = np.array([r['a'] - r['pred'][model] for r in recs])
    res = {'n': len(e)}
    for L in (0.8, 0.9):
        hw = float(np.quantile(np.abs(e), L))
        lo, hi = float(np.quantile(e, (1 - L) / 2)), float(np.quantile(e, 1 - (1 - L) / 2))
        res['hw%d' % int(L * 100)] = hw
        res['cov_in%d' % int(L * 100)] = float(np.mean(np.abs(e) <= hw))
        res['q%d' % int(L * 100)] = (lo, hi)
        # expanding window out of sample: half-width from earlier origins only
        cov, n = 0, 0
        per = {}
        for k in range(1, len(ORIGINS)):
            past = [r for r in recs if YIDX[r['origin']] < YIDX[ORIGINS[k]]]
            now = [r for r in recs if r['origin'] == ORIGINS[k]]
            if len(past) < 20 or not now:
                continue
            ep = np.array([r['a'] - r['pred'][model] for r in past])
            en = np.array([r['a'] - r['pred'][model] for r in now])
            h = float(np.quantile(np.abs(ep), L))
            c = int(np.sum(np.abs(en) <= h))
            per[ORIGINS[k]] = (c / len(en), len(en), h)
            cov += c
            n += len(en)
        res['oos_cov%d' % int(L * 100)] = (cov / n) if n else float('nan')
        res['oos_n%d' % int(L * 100)] = n
        res['oos_per%d' % int(L * 100)] = per
    return res


def print_models(tag, summ, params=None):
    P('  %-26s %5s %7s %7s %9s %18s %9s %18s' % (tag, 'n', 'MAE', 'RMSE', 'dMAE', 'MAE-diff 95% CI', 'dRMSE', 'RMSE-diff 95% CI'))
    for m in MODELS:
        if m not in summ:
            continue
        s = summ[m]
        ci = '' if m == 'pers' else '[%s, %s]' % (f2(s['ci_lo']), f2(s['ci_hi']))
        ci2 = '' if m == 'pers' else '[%s, %s]' % (f2(s['rmse_ci_lo']), f2(s['rmse_ci_hi']))
        P('  %-26s %5d %7s %7s %9s %18s %9s %18s' % (MNAME[m], s['n'], f2(s['mae']), f2(s['rmse']),
                                                     '' if m == 'pers' else ('%+.3f' % s['dmae']), ci,
                                                     '' if m == 'pers' else ('%+.3f' % s['drmse']), ci2))


# ----------------------------------------------------------------------------- panel backtest

def cross_target_extra(S, eng, recs):
    """Extra (not in the candidate list): predict the change in women's wage share from the other targets.
    gap model: w_next = w + k1 * (fPerm - w);  headcount-trend model: w_next = w + k2 * (change in fPerm into year t)."""
    Sw, Sf = S['w'], S['fPerm']
    par = {}
    for o in ORIGINS:
        t = YIDX[o]
        gx, gd, tx, td = [], [], [], []
        for s in Sw:
            for i in range(1, t + 1):
                d = eng.ch(s, i)
                if d is None:
                    continue
                y0 = YEARS[i - 1]
                if y0 in Sf[s]:
                    gx.append(Sf[s][y0] - Sw[s][y0])
                    gd.append(d)
                if y0 in Sf[s] and i >= 2 and YEARS[i - 2] in Sf[s]:
                    tx.append(Sf[s][y0] - Sf[s][YEARS[i - 2]])
                    td.append(d)
        k1 = k2 = 0.0
        r1 = r2 = float('nan')
        if len(gx) >= MIN_TRAIN:
            gx_, gd_ = np.array(gx), np.array(gd)
            r1 = float((gx_ * gd_).sum() / (gx_ ** 2).sum())
            k1 = min(1.0, max(0.0, r1))
        if len(tx) >= MIN_TRAIN:
            tx_, td_ = np.array(tx), np.array(td)
            r2 = float((tx_ * td_).sum() / (tx_ ** 2).sum())
            k2 = min(1.0, max(-1.0, r2))
        par[o] = dict(n_gap=len(gx), k1=k1, k1_raw=r1, n_trend=len(tx), k2=k2, k2_raw=r2)
    ep, e1, e2, g = [], [], [], []
    for r in recs:
        o, s = r['origin'], r['sym']
        t = YIDX[o]
        y0 = YEARS[t]
        gap = (Sf[s][y0] - Sw[s][y0]) if y0 in Sf[s] else None
        dF = (Sf[s][y0] - Sf[s][YEARS[t - 1]]) if (y0 in Sf[s] and t >= 1 and YEARS[t - 1] in Sf[s]) else None
        p1 = r['y'] + (par[o]['k1'] * gap if gap is not None else 0.0)
        p2 = r['y'] + (par[o]['k2'] * dF if dF is not None else 0.0)
        ep.append(r['a'] - r['y'])
        e1.append(r['a'] - p1)
        e2.append(r['a'] - p2)
        g.append(s)
    out = {'params': par}
    for nm, e in (('gap model', e1), ('headcount-trend model', e2)):
        e = np.array(e)
        d = np.abs(e) - np.abs(np.array(ep))
        md, lo, hi, pb = cluster_boot_diff(g, d)
        out[nm] = dict(n=len(e), mae=mae(e), rmse=rmse(e), dmae=md, ci_lo=lo, ci_hi=hi)
    out['persistence'] = dict(n=len(ep), mae=mae(ep), rmse=rmse(ep))
    return out

def run_target(tname, S, ind, flag, prior, use_flag=True, drop_prior=False, label=''):
    S2 = S
    if drop_prior:
        S2 = {s: {y: v for y, v in d.items() if not prior[s].get(y, False)} for s, d in S.items()}
    eng = Engine(S2, ind, flag, use_flag=use_flag)
    recs, params = eng.backtest()
    return eng, recs, params


def panel_section(c, ind, S, prior, flag):
    names = {'w': "women's share of wages", 'fPerm': "women's share of permanent employees", 'board': "women's share of the board"}
    out = {}
    for t in ('w', 'fPerm', 'board'):
        uf = (t != 'board')
        P('\n=== PANEL TARGET: %s (pp; flag-excluded like-for-like pairs: %s) ===' % (names[t], uf))
        eng, recs, params = run_target(t, S[t], ind, flag, prior, use_flag=uf)
        r = {'n_pairs': len(recs), 'n_companies': len(set(x['sym'] for x in recs))}
        r['obs_per_year'] = {y: sum(1 for s in S[t] if y in S[t][s]) for y in YEARS}
        r['prior_col_share_of_pairs'] = float(np.mean([prior[x['sym']].get(YEARS[YIDX[x['origin']]], False) or
                                                       prior[x['sym']].get(YEARS[YIDX[x['origin']] + 1], False) for x in recs]))
        P('  observations per year:', r['obs_per_year'])
        P('  pairs n=%d companies=%d; share of pairs touching a prior-year-column value: %.0f%%' % (
            r['n_pairs'], r['n_companies'], 100 * r['prior_col_share_of_pairs']))
        P('  fitted parameters per origin:')
        r['params'] = {}
        for o in ORIGINS:
            p = params[o]
            r['params'][o] = {k: v for k, v in p.items()}
            P('    %s: train changes=%d lag-pairs=%d drift=%+.3f AR(a,b)=%s phi=%.1f lam_ind=%.2f (raw %.2f) lam_all=%.2f (raw %.2f)' % (
                o, p['n_ch'], p['n_lag'], p['drift'],
                'n/a (fallback to drift)' if p['ar'] is None else '(%+.3f, %+.3f)' % p['ar'], p['phi'], p['lam_ind'], p['lam_ind_raw'],
                p['lam_all'], p['lam_all_raw']))
        summ = summarize(recs)
        r['pooled'] = summ
        P('  POOLED over origins', ORIGINS)
        print_models('model', summ)
        bo = by_origin(recs)
        r['by_origin'] = bo
        P('  PER ORIGIN (MAE / RMSE, n):')
        for o in ORIGINS:
            if o in bo:
                P('   ', o, 'n=%d' % bo[o]['pers']['n'], ' '.join('%s=%s/%s' % (m, f2(bo[o][m]['mae']), f2(bo[o][m]['rmse'])) for m in MODELS))
        lag = [x for x in recs if x['lag']]
        r['n_lag_pairs'] = len(lag)
        if lag:
            sl = summarize(lag)
            r['pooled_lagdefined'] = sl
            P('  SUBSET with the company\'s own previous change available (trend models fully defined): n=%d' % len(lag))
            print_models('model', sl)
        # origins where parameters are estimable (exclude first origin, where w has no change history)
        late = [x for x in recs if x['origin'] != ORIGINS[0]]
        sl2 = summarize(late)
        r['pooled_late_origins'] = sl2
        P('  POOLED over origins 2023-24 and 2024-25 only: n=%d' % len(late))
        print_models('model', sl2)
        # oracle phi (in-sample) on lag-defined pairs
        if lag:
            oracle = [(phi, mae([x['a'] - (x['y'] + phi * x['d0']) for x in lag])) for phi in [round(0.1 * k, 1) for k in range(-5, 11)]]
            r['oracle_phi_curve'] = oracle
            bp = min(oracle, key=lambda z: z[1])
            r['oracle_phi'] = bp
            P('  oracle damped-trend phi on lag-defined pairs (in-sample, optimistic): best phi=%.1f MAE=%s (phi=0 MAE=%s); curve: %s' % (
                bp[0], f2(bp[1]), f2(dict(oracle)[0.0]), ' '.join('%.1f:%s' % (a, f2(b)) for a, b in oracle)))
        # best model (pooled MAE, excluding persistence)
        cand = [m for m in MODELS if m != 'pers']
        best = min(cand, key=lambda m: summ[m]['mae'])
        r['best_model'] = best
        r['best_mae'] = summ[best]['mae']
        P('  best candidate by pooled MAE: %s (MAE %s vs persistence %s; dMAE %+.3f, 95%% CI [%s, %s])' % (
            MNAME[best], f2(summ[best]['mae']), f2(summ['pers']['mae']), summ[best]['dmae'], f2(summ[best]['ci_lo']), f2(summ[best]['ci_hi'])))
        # intervals
        r['interval_best'] = interval_stats(recs, best)
        r['interval_pers'] = interval_stats(recs, 'pers')
        r['interval_drift'] = interval_stats(recs, 'drift')
        for tag, key in (('best', 'interval_best'), ('persistence', 'interval_pers'), ('drift', 'interval_drift')):
            iv = r[key]
            P('  intervals (%s): 80%% half-width %s pp in-sample cov %.0f%%, expanding-window OOS cov %.0f%% (n=%d); 90%% half-width %s pp in-sample cov %.0f%%, OOS cov %.0f%% (n=%d)' % (
                tag, f2(iv['hw80']), 100 * iv['cov_in80'], 100 * iv['oos_cov80'], iv['oos_n80'],
                f2(iv['hw90']), 100 * iv['cov_in90'], 100 * iv['oos_cov90'], iv['oos_n90']))
            P('     signed 10-90 quantiles %s, 5-95 quantiles %s' % (tuple(round(z, 2) for z in iv['q80']), tuple(round(z, 2) for z in iv['q90'])))
        # spread
        lv = np.array([S[t][s]['2025-26'] for s in S[t] if '2025-26' in S[t][s]])
        chg = np.array([x['a'] - x['y'] for x in recs if x['origin'] == '2024-25'])
        r['spread'] = dict(level_n=len(lv), level_sd=float(lv.std(ddof=1)), level_iqr=float(np.subtract(*np.percentile(lv, [75, 25]))),
                           level_median=float(np.median(lv)), change_sd_last=float(chg.std(ddof=1)) if len(chg) > 1 else None,
                           change_mad_median=float(np.median(np.abs(chg - np.median(chg)))) if len(chg) else None,
                           change_median=float(np.median(chg)) if len(chg) else None)
        P('  spread FY2025-26 level: n=%d SD=%s IQR=%s median=%s; last-origin change: SD=%s median=%s' % (
            len(lv), f2(r['spread']['level_sd']), f2(r['spread']['level_iqr']), f2(r['spread']['level_median']),
            f2(r['spread']['change_sd_last']), f2(r['spread']['change_median'])))
        # sensitivities
        sens = {}
        if uf:
            e2, rec2, _ = run_target(t, S[t], ind, flag, prior, use_flag=False)
            s2 = summarize(rec2)
            sens['all_pairs_incl_basis_change'] = dict(n=len(rec2), pers=s2['pers']['mae'], **{m: s2[m]['mae'] for m in cand})
        e3, rec3, _ = run_target(t, S[t], ind, flag, prior, use_flag=uf, drop_prior=True)
        s3 = summarize(rec3)
        sens['excl_prior_year_column'] = dict(n=len(rec3), pers=s3['pers']['mae'], **{m: s3[m]['mae'] for m in cand},
                                              by_origin={o: sum(1 for x in rec3 if x['origin'] == o) for o in ORIGINS})
        r['sensitivity'] = sens
        if t == 'w':
            ex = cross_target_extra(S, eng, recs)
            r['extra_cross_target'] = ex
            P('  EXTRA candidates for wage share that use the other targets (not part of the verdict search):')
            for o, z in ex['params'].items():
                P('    %s: gap-model k1=%.2f (raw %.2f, n=%d); headcount-trend k2=%.2f (raw %.2f, n=%d)' % (
                    o, z['k1'], z['k1_raw'], z['n_gap'], z['k2'], z['k2_raw'], z['n_trend']))
            P('    persistence MAE %s RMSE %s (n=%d)' % (f2(ex['persistence']['mae']), f2(ex['persistence']['rmse']), ex['persistence']['n']))
            for nm in ('gap model', 'headcount-trend model'):
                z = ex[nm]
                P('    %s MAE %s RMSE %s dMAE %+.3f [%s, %s]' % (nm, f2(z['mae']), f2(z['rmse']), z['dmae'], f2(z['ci_lo']), f2(z['ci_hi'])))
        for k, v in sens.items():
            P('  sensitivity %s: n=%d MAE: %s' % (k, v['n'], ' '.join('%s=%s' % (m, f2(v[m])) for m in ['pers'] + cand)))
        # pooled momentum / reversion regression on all transitions (diagnostic)
        rows = []
        for s in S[t]:
            for i in range(2, 5):
                d1, d0 = eng.ch(s, i), eng.ch(s, i - 1)
                if d1 is not None and d0 is not None:
                    rows.append((s, d1, d0, S[t][s][YEARS[i - 1]], eng.Mi[YEARS[i - 1]][s] - S[t][s][YEARS[i - 1]]))
        if len(rows) > 20:
            g = [x[0] for x in rows]
            yv = np.array([x[1] for x in rows])
            X = np.array([[1, x[2], x[3]] for x in rows])
            beta, se, _, _ = ols_full(X, yv)
            ci = boot_coef(X, yv, B=2000, clusters=g)
            hb = huber(X, yv)
            r['pooled_regression'] = dict(n=len(rows), n_companies=len(set(g)), beta=beta.tolist(), hc3_se=se.tolist(),
                                          ci_lo=ci[0].tolist(), ci_hi=ci[1].tolist(), huber=hb.tolist())
            P('  diagnostic: change_t on [1, previous change, previous level], all transitions, n=%d: OLS %s (HC3 se %s) cluster-boot CI lo %s hi %s | Huber %s' % (
                len(rows), np.round(beta, 3), np.round(se, 3), np.round(ci[0], 3), np.round(ci[1], 3), np.round(hb, 3)))
        out[t] = r
        out[t]['_recs'] = recs
        out[t]['_eng'] = eng
    return out


# ----------------------------------------------------------------------------- index level
def index_section(c, ind, S, prior, flag, panel):
    idx = json.load(open(IDXF))
    out = {}
    wt = panel['w']
    eng = wt['_eng']
    recs = wt['_recs']
    for k, v in idx.items():
        P('\n=== INDEX: %s ===' % v['name'])
        mem = [x['symbol'] for x in v['constituents']]
        a = {s: c[s]['publicFloatPct'] / 100.0 * c[s]['payrollWeightCr'] for s in mem if c[s].get('publicFloatPct') and c[s].get('payrollWeightCr')}

        def headline(y):
            num = den = 0.0
            for s in a:
                yy = c[s]['years'].get(y)
                if not yy or yy.get('w') is None:
                    continue
                num += a[s] * yy['w']
                den += a[s]
            return num / den if den else None
        rep = {y: (headline(y), v['years'][y]['headline']) for y in YEARS[1:]}
        P('  reproduction of published headline (mine vs file, %):', {y: '%s vs %s' % (f2(100 * h, 3), f2(100 * q, 3)) for y, (h, q) in rep.items()})
        lfl_pub = {}
        for y0, y1 in zip(YEARS[1:], YEARS[2:]):
            both = [s for s in a if all(c[s]['years'].get(y, {}).get('wKind') == 'reported' for y in (y0, y1)) and not c[s]['years'][y1].get('basisChange')]
            num0 = sum(a[s] * c[s]['years'][y0]['w'] for s in both)
            num1 = sum(a[s] * c[s]['years'][y1]['w'] for s in both)
            den = sum(a[s] for s in both)
            lfl_pub['%s>%s' % (y0, y1)] = (100 * num0 / den, 100 * num1 / den, 100 * (num1 - num0) / den, len(both))
        bad = [(s_, y_) for s_ in a for y_ in YEARS[1:] if c[s_]['years'].get(y_, {}).get('w') is not None and c[s_]['years'][y_]['w'] >= W_MAX]
        clean = {}
        if bad:
            for y_ in YEARS[1:]:
                num = den = 0.0
                for s_ in a:
                    yy = c[s_]['years'].get(y_)
                    if not yy or yy.get('w') is None or yy['w'] >= W_MAX:
                        continue
                    num += a[s_] * yy['w']
                    den += a[s_]
                clean[y_] = 100 * num / den
            lfl_clean = {}
            for y0, y1 in zip(YEARS[1:], YEARS[2:]):
                both = [s_ for s_ in a if all(c[s_]['years'].get(y, {}).get('wKind') == 'reported' and c[s_]['years'][y]['w'] < W_MAX for y in (y0, y1)) and not c[s_]['years'][y1].get('basisChange')]
                num0 = sum(a[s_] * c[s_]['years'][y0]['w'] for s_ in both)
                num1 = sum(a[s_] * c[s_]['years'][y1]['w'] for s_ in both)
                den = sum(a[s_] for s_ in both)
                lfl_clean['%s>%s' % (y0, y1)] = 100 * (num1 - num0) / den
            P('  IMPLAUSIBLE VALUES in this index (w >= 60%%): %s; published headline vs headline without them (%%): %s; like-for-like change without them (pp): %s' % (
                bad, {y_: '%s vs %s' % (f2(100 * rep[y_][1], 3), f2(clean[y_], 3)) for y_ in YEARS[1:]}, {k_: f2(z_, 3) for k_, z_ in lfl_clean.items()}))
        pubyoy = v['yoy']
        P('  like-for-like change (mine vs file), pp:', {k2: '%s vs %s (n=%d)' % (f2(z[2], 3), f2(100 * pubyoy[k2]['change'], 3), z[3]) for k2, z in lfl_pub.items()})
        gap = {}
        for y0, y1 in zip(YEARS[1:], YEARS[2:]):
            pubchg = 100 * (v['years'][y1]['headline'] - v['years'][y0]['headline'])
            gap['%s>%s' % (y0, y1)] = (pubchg, 100 * pubyoy['%s>%s' % (y0, y1)]['change'])
        P('  published headline change vs like-for-like change (pp) - the difference is reporting-composition noise:',
          {k2: '%s vs %s' % (f2(z[0]), f2(z[1])) for k2, z in gap.items()})
        # ---- index-level backtest on like-for-like sets (filtered series)
        bymem = collections.defaultdict(dict)
        for r in recs:
            if r['sym'] in a:
                bymem[r['origin']][r['sym']] = r
        bt = {}
        for i_, o in enumerate(ORIGINS):
            rs = bymem.get(o, {})
            if not rs:
                continue
            den = sum(a[s] for s in rs)
            act = sum(a[s] * r['a'] for s, r in rs.items()) / den
            base = sum(a[s] * r['y'] for s, r in rs.items()) / den
            md = {m: sum(a[s] * r['pred'][m] for s, r in rs.items()) / den for m in ('drift', 'ar1')}
            prev = [bt[q]['actual'] - bt[q]['base'] for q in ORIGINS[:i_] if q in bt]
            bt[o] = dict(n=len(rs), actual=act, base=base, chg=act - base, idx_drift=(float(np.mean(prev)) if prev else 0.0),
                         n_prev=len(prev), **md)
        P('  index-level like-for-like backtest (payroll-weighted headline, %; error = actual - predicted, pp):')
        for o, z in bt.items():
            P('    origin %s (n=%d): base %s actual %s change %+.3f | error: persistence %+.3f, index-drift(%d prior changes) %+.3f, company drift aggregated %+.3f, company AR(1) aggregated %+.3f' % (
                o, z['n'], f2(z['base'], 3), f2(z['actual'], 3), z['chg'], z['chg'], z['n_prev'], z['chg'] - z['idx_drift'],
                z['actual'] - z['drift'], z['actual'] - z['ar1']))
        mean_res = {}
        # unweighted vs payroll-weighted mean persistence residual among members (explains why unweighted drift misleads the index)
        for o in ORIGINS:
            rs = bymem.get(o, {})
            if rs:
                mean_res[o] = (float(np.mean([r['a'] - r['y'] for r in rs.values()])), bt[o]['chg'])
        P('  members: unweighted mean company change vs payroll-weighted change (pp):', {o: '%s vs %s' % (f2(u), f2(w_)) for o, (u, w_) in mean_res.items()})
        # ---- leave-one-origin-out check of the simulation (persistence-centred, payroll-weighted company draws)
        rng = np.random.default_rng(11)
        cov = {}
        for o in bt:
            pool_o = collections.defaultdict(list)
            by_org = {q: collections.defaultdict(list) for q in ORIGINS if q != o}
            for r in recs:
                if r['origin'] != o and r['sym'] in a:
                    pool_o[r['sym']].append(r['a'] - r['y'])
                    by_org[r['origin']][r['sym']].append(r['a'] - r['y'])
            rs = bymem[o]
            syms = list(rs)
            wv = np.array([a[s] for s in syms])
            wv = wv / wv.sum()
            yt = np.array([rs[s]['y'] for s in syms])
            D = sim_weighted(pool_o, a, len(syms), 6000, rng)
            sim_i = ((yt[None, :] + D).clip(0, 100) * wv[None, :]).sum(1)
            sim_y = np.empty(6000)
            og = rng.integers(0, len(by_org), 6000)
            keys = list(by_org)
            for j, q in enumerate(keys):
                m_ = og == j
                if m_.sum():
                    sim_y[m_] = ((yt[None, :] + sim_weighted(by_org[q], a, len(syms), int(m_.sum()), rng)).clip(0, 100) * wv[None, :]).sum(1)
            act = bt[o]['actual']
            cov[o] = {}
            for nm, sim in (('indep', sim_i), ('yearblock', sim_y)):
                cov[o][nm] = dict(p10=float(np.percentile(sim, 10)), p90=float(np.percentile(sim, 90)), p5=float(np.percentile(sim, 5)),
                                  p95=float(np.percentile(sim, 95)), in80=bool(np.percentile(sim, 10) <= act <= np.percentile(sim, 90)),
                                  in90=bool(np.percentile(sim, 5) <= act <= np.percentile(sim, 95)))
            cov[o]['actual'] = act
            cov[o]['base'] = bt[o]['base']
        P('  leave-one-origin-out simulation vs realised like-for-like headline (persistence-centred; n=%d origins):' % len(cov))
        for o, z in cov.items():
            P('    %s: base %s actual %s | independent draws 80%% [%s, %s] in=%s, 90%% [%s, %s] in=%s | year-block 80%% [%s, %s] in=%s, 90%% [%s, %s] in=%s' % (
                o, f2(z['base'], 3), f2(z['actual'], 3),
                f2(z['indep']['p10'], 3), f2(z['indep']['p90'], 3), z['indep']['in80'], f2(z['indep']['p5'], 3), f2(z['indep']['p95'], 3), z['indep']['in90'],
                f2(z['yearblock']['p10'], 3), f2(z['yearblock']['p90'], 3), z['yearblock']['in80'], f2(z['yearblock']['p5'], 3), f2(z['yearblock']['p95'], 3), z['yearblock']['in90']))
        # ---- forecast FY2026-27 on the FY2025-26 covered set
        t = YIDX['2025-26']
        p = eng.fit(t)
        base_set = [s for s in a if c[s]['years'].get('2025-26', {}).get('w') is not None]
        wv = np.array([a[s] for s in base_set])
        wv = wv / wv.sum()
        neff = float(1.0 / (wv ** 2).sum())
        yt, kinds = [], []
        pred = {m: [] for m in MODELS}
        for s in base_set:
            yy = c[s]['years']['2025-26']
            y0 = yy['w'] * 100
            kinds.append(yy['wKind'])
            if '2025-26' in S['w'][s]:
                d0 = eng.ch(s, t)
                mi, ma = eng.Mi['2025-26'][s], eng.Ma['2025-26'][s]
            else:
                d0 = None
                vals = [S['w'][u]['2025-26'] for u in S['w'] if '2025-26' in S['w'][u]]
                ma = float(np.mean(vals))
                grp = [S['w'][u]['2025-26'] for u in S['w'] if '2025-26' in S['w'][u] and ind[u] == ind[s]]
                mi = float(np.mean(grp)) if len(grp) >= 2 else ma
            pr = eng.predict(p, y0, d0, mi, ma)
            yt.append(y0)
            for m in MODELS:
                pred[m].append(pr[m])
        yt = np.array(yt)
        est = np.array([kd != 'reported' for kd in kinds])
        base = float((yt * wv).sum())
        fc = {m: float((np.array(pred[m]) * wv).sum()) for m in MODELS}
        pool_m = collections.defaultdict(list)
        pool_mo = {o: collections.defaultdict(list) for o in ORIGINS}
        pool_all = collections.defaultdict(list)
        for r in recs:
            pool_all[r['sym']].append(r['a'] - r['y'])
            if r['sym'] in a:
                pool_m[r['sym']].append(r['a'] - r['y'])
                pool_mo[r['origin']][r['sym']].append(r['a'] - r['y'])
        rng = np.random.default_rng(12)
        n_ = len(base_set)

        def agg(D):
            return ((yt[None, :] + D).clip(0, 100) * wv[None, :]).sum(1)
        sims = {}
        sims['payroll-weighted draws, members pool, independent'] = agg(sim_weighted(pool_m, a, n_, SIM_B, rng))
        og = rng.integers(0, len(ORIGINS), SIM_B)
        sy = np.empty(SIM_B)
        for j, o in enumerate(ORIGINS):
            m_ = og == j
            if m_.sum():
                sy[m_] = agg(sim_weighted(pool_mo[o], a, n_, int(m_.sum()), rng))
        sims['payroll-weighted draws, members pool, year-block'] = sy
        sims['equal-weight company draws, whole panel pool'] = agg(simulate_residuals(pool_all, n_, SIM_B, rng))
        summ = {}
        for nm, sim in sims.items():
            summ[nm] = dict(mean=float(sim.mean()), p5=float(np.percentile(sim, 5)), p10=float(np.percentile(sim, 10)), p50=float(np.percentile(sim, 50)),
                            p90=float(np.percentile(sim, 90)), p95=float(np.percentile(sim, 95)))
        res = dict(n_base=n_, n_estimated_base=int(est.sum()), estimated_payroll_share=float(wv[est].sum()), n_eff=neff,
                   published_2025_26=100 * v['years']['2025-26']['headline'], persistence_same_set=base, forecast_by_model=fc,
                   sims=summ, backtest=bt, loo_origin_cov=cov, lfl_pub=lfl_pub, pub_vs_lfl=gap, reproduction=rep, mean_res=mean_res,
                   idx_drift_mean=float(np.mean([z['chg'] for z in bt.values()])),
                   idx_drift_sd=float(np.std([z['chg'] for z in bt.values()], ddof=1)))
        P('  FORECAST FY2026-27 on the FY2025-26 covered set: %d companies (effective n %.1f by payroll weight); %d have an estimated FY2025-26 base = %.1f%% of weight' % (
            n_, neff, int(est.sum()), 100 * wv[est].sum()))
        P('    published FY2025-26 headline %s%%; same-set persistence %s%%; mean of the 3 like-for-like changes %+.3f pp (SD %.3f)' % (
            f2(res['published_2025_26'], 3), f2(base, 3), res['idx_drift_mean'], res['idx_drift_sd']))
        P('    company-model aggregates (informational):', {m: round(fc[m], 3) for m in MODELS})
        for nm, z in summ.items():
            P('    %-52s mean %s median %s | 80%% [%s, %s] | 90%% [%s, %s]' % (nm, f2(z['mean'], 3), f2(z['p50'], 3), f2(z['p10'], 3), f2(z['p90'], 3), f2(z['p5'], 3), f2(z['p95'], 3)))
        out[k] = res
    return out


def sim_weighted(pool, probs, n, B, rng):
    """Each of n constituents draws a company with probability proportional to probs, then one of that company's residuals."""
    comps = [s for s in pool if len(pool[s]) and probs.get(s, 0) > 0]
    pr = np.array([probs[s] for s in comps], float)
    pr = pr / pr.sum()
    cnt = np.array([len(pool[s]) for s in comps])
    off = np.concatenate([[0], np.cumsum(cnt)[:-1]])
    flat = np.concatenate([np.array(pool[s], float) for s in comps])
    j = rng.choice(len(comps), size=(B, n), p=pr)
    u = (rng.random((B, n)) * cnt[j]).astype(int)
    return flat[off[j] + u]


def simulate_residuals(pool, n, B, rng):
    """pool: dict company -> list of residuals. Each of n constituents draws a company uniformly, then one of its residuals."""
    comps = [s for s in pool if len(pool[s])]
    cnt = np.array([len(pool[s]) for s in comps])
    off = np.concatenate([[0], np.cumsum(cnt)[:-1]])
    flat = np.concatenate([np.array(pool[s], float) for s in comps])
    j = rng.integers(0, len(comps), size=(B, n))
    u = (rng.random((B, n)) * cnt[j]).astype(int)
    return flat[off[j] + u]


# ----------------------------------------------------------------------------- wide set
def wide_cv(rows, feats, label, extra_models=None):
    """rows: dict with d1, d2, l24 (+ g for industry mean). Predict d2 by leave-one-company-out OLS."""
    n = len(rows['d2'])
    d2 = np.array(rows['d2'])
    d1 = np.array(rows['d1'])
    l24 = np.array(rows['l24'])
    mrev = np.array(rows['mrev'])
    res = {}
    preds = {}
    preds['persistence'] = np.zeros(n)
    preds['drift_prev_year'] = np.array([np.mean(np.delete(d1, i)) for i in range(n)])
    X = {'drift_in_year': np.ones((n, 1)),
         'AR(1) on change': np.c_[np.ones(n), d1],
         'level reversion': np.c_[np.ones(n), l24],
         'AR+reversion': np.c_[np.ones(n), d1, l24],
         'reversion to NIC-2 mean': np.c_[np.ones(n), mrev - l24]}
    for k, Xk in X.items():
        beta, se, e, z = ols_full(Xk, d2)
        preds[k] = d2 - z
    err = {k: d2 - v for k, v in preds.items()}
    base = np.abs(err['persistence'])
    for k, e in err.items():
        d = np.abs(e) - base
        md, lo, hi, pb = cluster_boot_diff(np.arange(n), d)
        drm, rlo, rhi = cluster_boot_rmse_diff(np.arange(n), e, err['persistence'])
        res[k] = dict(n=n, mae=mae(e), rmse=rmse(e), dmae=md, ci_lo=lo, ci_hi=hi, drmse=drm, rmse_ci_lo=rlo, rmse_ci_hi=rhi)
    return res


def fit_wide_regressions(rows, name):
    n = len(rows['d2'])
    d2 = np.array(rows['d2'])
    d1 = np.array(rows['d1'])
    l24 = np.array(rows['l24'])
    out = {'n': n}
    for spec, X in (('AR(1)', np.c_[np.ones(n), d1]), ('level', np.c_[np.ones(n), l24]), ('both', np.c_[np.ones(n), d1, l24])):
        beta, se, e, z = ols_full(X, d2)
        ci = boot_coef(X, d2, B=3000)
        hb = huber(X, d2)
        hci = boot_coef(X, d2, B=1000, fn=huber)
        r2 = 1 - (e ** 2).sum() / ((d2 - d2.mean()) ** 2).sum()
        out[spec] = dict(beta=beta.tolist(), hc3_se=se.tolist(), ci_lo=ci[0].tolist(), ci_hi=ci[1].tolist(), huber=hb.tolist(),
                         huber_ci_lo=hci[0].tolist(), huber_ci_hi=hci[1].tolist(), r2=float(r2))
        P('  %s %s: n=%d beta(const, ..)=%s HC3 se %s boot95 [%s .. %s] | Huber %s boot95 [%s .. %s] | R2=%.3f' % (
            name, spec, n, np.round(beta, 3), np.round(se, 3), np.round(ci[0], 3), np.round(ci[1], 3), np.round(hb, 3),
            np.round(hci[0], 3), np.round(hci[1], 3), r2))
    from math import sqrt
    # rank correlations
    def rank(x):
        o = np.argsort(np.argsort(x))
        return o.astype(float)
    out['spearman_d1_d2'] = float(np.corrcoef(rank(d1), rank(d2))[0, 1])
    out['spearman_l24_d2'] = float(np.corrcoef(rank(l24), rank(d2))[0, 1])
    out['pearson_d1_d2'] = float(np.corrcoef(d1, d2)[0, 1])
    P('  %s Spearman(d1,d2)=%.3f Spearman(level,d2)=%.3f Pearson(d1,d2)=%.3f' % (name, out['spearman_d1_d2'], out['spearman_l24_d2'], out['pearson_d1_d2']))
    return out



def wide_interval(rows, label):
    """Empirical half-widths of the FY25->26 change errors (single origin: in-sample only, no out-of-sample coverage possible)."""
    d2 = np.array(rows['d2'])
    d1 = np.array(rows['d1'])
    n = len(d2)
    X = np.c_[np.ones(n), d1]
    _, _, _, z = ols_full(X, d2)
    out = {}
    for nm, e in (('persistence', d2), ('AR(1) leave-one-out', z)):
        out[nm] = dict(hw80=float(np.quantile(np.abs(e), 0.8)), hw90=float(np.quantile(np.abs(e), 0.9)),
                       q80=(float(np.quantile(e, 0.1)), float(np.quantile(e, 0.9))), q90=(float(np.quantile(e, 0.05)), float(np.quantile(e, 0.95))), n=n)
        P('  %s %s interval (single origin, in-sample): 80%% +-%s [signed %s, %s], 90%% +-%s [signed %s, %s], n=%d' % (
            label, nm, f2(out[nm]['hw80']), f2(out[nm]['q80'][0]), f2(out[nm]['q80'][1]), f2(out[nm]['hw90']), f2(out[nm]['q90'][0]), f2(out[nm]['q90'][1]), n))
    return out

def add_group_means(rows, groups):
    g = np.array(groups, dtype=object)
    l24 = np.array(rows['l24'])
    n = len(l24)
    m = np.empty(n)
    for i in range(n):
        same = [j for j in range(n) if j != i and g[j] == g[i] and g[i] is not None]
        m[i] = np.mean(l24[same]) if len(same) >= 3 else (l24.sum() - l24[i]) / (n - 1)
    rows['mrev'] = m.tolist()
    return rows


def wide_section(snap):
    out = {}
    allrows = snap['rows']
    r25 = [r for r in allrows if r['reading']['fy'] == '2025-26']
    P('\n=== WIDER SET (brsr1000.sqlite readings joined to the Kaggle FY2024-25 scan) ===')
    P('snapshot: %d readings in table (%d with fy 2025-26), db mtime %s, scan mtime %s' % (snap['n_readings'], len(r25), snap['db_mtime'], snap['scan_mtime']))
    # ---- wage share
    wf = collections.OrderedDict()
    wf['FY2025-26 readings joined to a scan record'] = len(r25)
    st = []
    for r in r25:
        sc = r['scan']
        w = sc['wageShareBoth'] if sc else None
        if not (w and len(w) == 2 and all(isinstance(x, (int, float)) for x in w)):
            continue
        st.append(r)
    wf['parser has both FY2024-25 and FY2023-24 as numbers'] = len(st)
    st = [r for r in st if r['reading']['wage_share_current'] is not None and r['reading']['wage_share_prior'] is not None]
    wf['checked reading has FY2025-26 current and prior (FY2024-25)'] = len(st)

    def inr(v):
        return 0.1 <= v <= 80
    st = [r for r in st if all(inr(x) for x in (r['scan']['wageShareBoth'][0], r['scan']['wageShareBoth'][1], r['reading']['wage_share_current'], r['reading']['wage_share_prior']))]
    wf['all four values within 0.1-80 percent'] = len(st)
    nodis = [r for r in st if abs(r['scan']['wageShareBoth'][0] - r['reading']['wage_share_prior']) <= 0.5]
    wf['parser FY2024-25 agrees with checked prior-year column within 0.5 pp'] = len(nodis)
    ds = []
    final = []
    for r in nodis:
        l23, l24 = r['scan']['wageShareBoth'][1], r['scan']['wageShareBoth'][0]
        l25 = r['reading']['wage_share_current']
        if abs(l24 - l23) <= 20 and abs(l25 - l24) <= 20:
            final.append(r)
    wf['both one-year changes within 20 pp'] = len(final)
    P('  wage-share filter waterfall:')
    for k, v in wf.items():
        P('    %5d  %s' % (v, k))
    out['wage_filter'] = wf
    rows = dict(d1=[], d2=[], l24=[], name=[])
    grp = []
    for r in final:
        l23, l24 = r['scan']['wageShareBoth'][1], r['scan']['wageShareBoth'][0]
        l25 = r['reading']['wage_share_current']
        rows['d1'].append(l24 - l23)
        rows['d2'].append(l25 - l24)
        rows['l24'].append(l24)
        rows['name'].append(r['name'])
        nic = r['reading']['nic_code']
        grp.append(str(nic)[:2] if nic else None)
    add_group_means(rows, grp)
    d1, d2, l24 = np.array(rows['d1']), np.array(rows['d2']), np.array(rows['l24'])
    P('  wage share n=%d: level FY2024-25 median %s SD %s; d1 (FY23-24 to FY24-25) mean %+.2f median %+.2f SD %s; d2 (FY24-25 to FY25-26) mean %+.2f median %+.2f SD %s' % (
        len(d2), f2(np.median(l24)), f2(l24.std(ddof=1)), d1.mean(), np.median(d1), f2(d1.std(ddof=1)), d2.mean(), np.median(d2), f2(d2.std(ddof=1))))
    out['wage'] = dict(n=len(d2), level_median=float(np.median(l24)), level_sd=float(l24.std(ddof=1)), d1_mean=float(d1.mean()), d2_mean=float(d2.mean()),
                       d1_sd=float(d1.std(ddof=1)), d2_sd=float(d2.std(ddof=1)), d2_mad=float(np.median(np.abs(d2 - np.median(d2)))))
    out['wage']['reg'] = fit_wide_regressions(rows, 'wage')
    out['wage']['cv'] = wide_cv(rows, None, 'wage')
    out['wage']['interval'] = wide_interval(rows, 'wage')
    P('  wage leave-one-company-out CV of the FY25->26 change (pp):')
    for k, v in out['wage']['cv'].items():
        P('    %-26s n=%d MAE %s RMSE %s dMAE vs persistence %+.3f [%s, %s] dRMSE %+.3f [%s, %s]' % (k, v['n'], f2(v['mae']), f2(v['rmse']), v['dmae'], f2(v['ci_lo']), f2(v['ci_hi']), v['drmse'], f2(v['rmse_ci_lo']), f2(v['rmse_ci_hi'])))
    # variant: same-document changes, no agreement filter
    v2 = [r for r in st]
    rows2 = dict(d1=[], d2=[], l24=[])
    g2 = []
    for r in v2:
        l23, l24b = r['scan']['wageShareBoth'][1], r['scan']['wageShareBoth'][0]
        pr_, cu = r['reading']['wage_share_prior'], r['reading']['wage_share_current']
        if abs(l24b - l23) <= 20 and abs(cu - pr_) <= 20:
            rows2['d1'].append(l24b - l23)
            rows2['d2'].append(cu - pr_)
            rows2['l24'].append(pr_)
            g2.append(str(r['reading']['nic_code'])[:2] if r['reading']['nic_code'] else None)
    add_group_means(rows2, g2)
    P('  variant B (no agreement filter; d1 from the FY2024-25 filing, d2 = FY25-26 current minus its own prior column), n=%d' % len(rows2['d2']))
    out['wage_variantB'] = dict(n=len(rows2['d2']), reg=fit_wide_regressions(rows2, 'wageB'), cv=wide_cv(rows2, None, 'wageB'))
    for k, v in out['wage_variantB']['cv'].items():
        P('    %-26s n=%d MAE %s dMAE %+.3f [%s, %s]' % (k, v['n'], f2(v['mae']), v['dmae'], f2(v['ci_lo']), f2(v['ci_hi'])))
    # variant C: tighter jump filter (|change| <= 10 pp) in case parser misreads of FY2023-24 inflate noise in the lagged change
    rowsC = dict(d1=[], d2=[], l24=[])
    gC = []
    for r in final:
        l23, l24c = r['scan']['wageShareBoth'][1], r['scan']['wageShareBoth'][0]
        l25 = r['reading']['wage_share_current']
        if abs(l24c - l23) <= 10 and abs(l25 - l24c) <= 10:
            rowsC['d1'].append(l24c - l23)
            rowsC['d2'].append(l25 - l24c)
            rowsC['l24'].append(l24c)
            gC.append(str(r['reading']['nic_code'])[:2] if r['reading']['nic_code'] else None)
    add_group_means(rowsC, gC)
    P('  variant C (agreement filter, changes within 10 pp), n=%d' % len(rowsC['d2']))
    out['wage_variantC'] = dict(n=len(rowsC['d2']), reg=fit_wide_regressions(rowsC, 'wageC'), cv=wide_cv(rowsC, None, 'wageC'))
    for k, v in out['wage_variantC']['cv'].items():
        P('    %-26s n=%d MAE %s dMAE %+.3f [%s, %s]' % (k, v['n'], f2(v['mae']), v['dmae'], f2(v['ci_lo']), f2(v['ci_hi'])))
    # ---- turnover
    T = ['2023-24', '2024-25', '2025-26']
    tf = collections.OrderedDict()
    st = [r for r in r25 if all(y in r['turnover_trend'] and all(r['turnover_trend'][y][k] is not None for k in ('men', 'women', 'total')) for y in T)]
    tf['FY2025-26 readings with men/women/total turnover in all of FY2023-24, FY2024-25, FY2025-26'] = len(st)

    def is_rate(t):
        lo, hi = min(t['men'], t['women']), max(t['men'], t['women'])
        return lo - 0.5 <= t['total'] <= hi + 0.5
    st = [r for r in st if all(is_rate(r['turnover_trend'][y]) for y in T)]
    tf['total lies between the men and women rates in every year (else it is a leavers-per-total-headcount split, not a rate)'] = len(st)
    st = [r for r in st if all(0 <= r['turnover_trend'][y]['women'] <= 100 for y in T)
          and all(not (r['turnover_trend'][y]['men'] == 0 and r['turnover_trend'][y]['women'] == 0 and r['turnover_trend'][y]['total'] == 0) for y in T)]
    tf["women's rate within 0-100 in every year and no all-zero year"] = len(st)
    st = [r for r in st if max(max(abs(r['turnover_trend'][y][k]) for k in ('men', 'women', 'total')) for y in T) > 1.0]
    tf['not entirely <=1 (fraction/percent ambiguity)'] = len(st)
    P('  turnover filter waterfall:')
    for k, v in tf.items():
        P('    %5d  %s' % (v, k))
    out['turnover_filter'] = tf
    rowsT = dict(d1=[], d2=[], l24=[], name=[], wf=[])
    gT = []
    for r in st:
        w = [r['turnover_trend'][y]['women'] for y in T]
        rowsT['d1'].append(w[1] - w[0])
        rowsT['d2'].append(w[2] - w[1])
        rowsT['l24'].append(w[1])
        rowsT['name'].append(r['name'])
        rowsT['wf'].append(r['reading']['perm_emp_women'])
        gT.append(str(r['reading']['nic_code'])[:2] if r['reading']['nic_code'] else None)
    add_group_means(rowsT, gT)
    d1, d2, l24 = np.array(rowsT['d1']), np.array(rowsT['d2']), np.array(rowsT['l24'])
    P("  turnover n=%d: women's rate FY2024-25 median %s SD %s; d1 mean %+.2f SD %s; d2 mean %+.2f SD %s" % (
        len(d2), f2(np.median(l24)), f2(l24.std(ddof=1)), d1.mean(), f2(d1.std(ddof=1)), d2.mean(), f2(d2.std(ddof=1))))
    out['turnover'] = dict(n=len(d2), level_median=float(np.median(l24)), level_sd=float(l24.std(ddof=1)), d1_mean=float(d1.mean()), d2_mean=float(d2.mean()),
                           d1_sd=float(d1.std(ddof=1)), d2_sd=float(d2.std(ddof=1)))
    out['turnover']['reg'] = fit_wide_regressions(rowsT, 'turnover')
    out['turnover']['cv'] = wide_cv(rowsT, None, 'turnover')
    out['turnover']['interval'] = wide_interval(rowsT, 'turnover')
    P('  turnover leave-one-company-out CV of the FY25->26 change (pp):')
    for k, v in out['turnover']['cv'].items():
        P('    %-26s n=%d MAE %s RMSE %s dMAE vs persistence %+.3f [%s, %s] dRMSE %+.3f [%s, %s]' % (k, v['n'], f2(v['mae']), f2(v['rmse']), v['dmae'], f2(v['ci_lo']), f2(v['ci_hi']), v['drmse'], f2(v['rmse_ci_lo']), f2(v['rmse_ci_hi'])))
    # variant: parser FY2024-25 women's turnover agrees with the checked FY2024-25 value
    keepA = []
    for i, r in enumerate([r for r in st]):
        sc = (r['scan'] or {}).get('turnover') if r['scan'] else None
        if sc and sc.get('women') is not None and abs(sc['women'] - r['turnover_trend']['2024-25']['women']) <= 0.5:
            keepA.append(i)
    rowsA = {k: [rowsT[k][i] for i in keepA] for k in ('d1', 'd2', 'l24', 'name')}
    add_group_means(rowsA, [gT[i] for i in keepA])
    P("  variant: parser FY2024-25 women's turnover agrees with the checked value within 0.5 pp, n=%d" % len(keepA))
    if len(keepA) >= 30:
        out['turnover_agree'] = dict(n=len(keepA), reg=fit_wide_regressions(rowsA, 'turnoverA'), cv=wide_cv(rowsA, None, 'turnoverA'))
        for k, v in out['turnover_agree']['cv'].items():
            P('    %-26s n=%d MAE %s RMSE %s dMAE %+.3f [%s, %s]' % (k, v['n'], f2(v['mae']), f2(v['rmse']), v['dmae'], f2(v['ci_lo']), f2(v['ci_hi'])))
    # variant: large women's workforce (>=50 permanent women in FY2025-26)
    keep = [i for i, w in enumerate(rowsT['wf']) if w is not None and w >= 50]
    rowsL = {k: [rowsT[k][i] for i in keep] for k in ('d1', 'd2', 'l24', 'name')}
    add_group_means(rowsL, [gT[i] for i in keep])
    P('  variant: women permanent employees >= 50 in FY2025-26, n=%d' % len(keep))
    if len(keep) >= 30:
        out['turnover_large'] = dict(n=len(keep), reg=fit_wide_regressions(rowsL, 'turnoverL'), cv=wide_cv(rowsL, None, 'turnoverL'))
        for k, v in out['turnover_large']['cv'].items():
            P('    %-26s n=%d MAE %s dMAE %+.3f [%s, %s]' % (k, v['n'], f2(v['mae']), v['dmae'], f2(v['ci_lo']), f2(v['ci_hi'])))
    # ---- two-year targets: permanent share and board share (level reversion only)
    for tn in ('perm', 'board'):
        rw = dict(d2=[], l24=[], d1=[], mrev=[])
        cnt = collections.Counter()
        gg = []
        for r in r25:
            sc, rd = r['scan'], r['reading']
            if not sc or sc.get('fy') != '2024-25':
                cnt['scan not FY2024-25'] += 1
                continue
            if tn == 'perm':
                p = sc.get('permanent') or {}
                a0 = (p.get('total'), p.get('men'), p.get('women'))
                b0 = (rd['perm_emp_total'], rd['perm_emp_men'], rd['perm_emp_women'])
                if any(x is None for x in a0 + b0) or a0[0] <= 0 or b0[0] <= 0 or abs(a0[1] + a0[2] - a0[0]) > 1 or abs(b0[1] + b0[2] - b0[0]) > 1:
                    cnt['perm incomplete or inconsistent'] += 1
                    continue
                l24_, l25_ = 100 * a0[2] / a0[0], 100 * b0[2] / b0[0]
                lim = 15
            else:
                b = ((sc.get('women') or {}).get('board') or {})
                a0 = (b.get('total'), b.get('women'))
                b0 = (rd['board_total'], rd['board_women'])
                if any(x is None for x in a0 + b0) or not (3 <= a0[0] <= 20) or not (3 <= b0[0] <= 20) or a0[1] > a0[0] or b0[1] > b0[0]:
                    cnt['board incomplete or implausible'] += 1
                    continue
                l24_, l25_ = 100 * a0[1] / a0[0], 100 * b0[1] / b0[0]
                lim = 40
            if abs(l25_ - l24_) > lim:
                cnt['change beyond %d pp' % lim] += 1
                continue
            rw['d2'].append(l25_ - l24_)
            rw['l24'].append(l24_)
            rw['d1'].append(0.0)
            gg.append(str(rd['nic_code'])[:2] if rd['nic_code'] else None)
        add_group_means(rw, gg)
        n = len(rw['d2'])
        d2, l24 = np.array(rw['d2']), np.array(rw['l24'])
        X = np.c_[np.ones(n), l24]
        beta, se, e, z = ols_full(X, d2)
        ci = boot_coef(X, d2, B=2000)
        hb = huber(X, d2)
        dr = (d2.sum() - d2) / (n - 1)
        errs = {'persistence': d2, 'drift_in_year': d2 - dr, 'level reversion': z}
        res_ = {}
        for k, e_ in errs.items():
            dd = np.abs(e_) - np.abs(d2)
            md, lo, hi, pb = cluster_boot_diff(np.arange(n), dd)
            res_[k] = dict(n=n, mae=mae(e_), dmae=md, ci_lo=lo, ci_hi=hi)
        out[tn + '_two_year'] = dict(n=n, dropped=dict(cnt), beta=beta.tolist(), hc3_se=se.tolist(), ci_lo=ci[0].tolist(), ci_hi=ci[1].tolist(),
                                     huber=hb.tolist(), cv=res_, d2_mean=float(d2.mean()), d2_sd=float(d2.std(ddof=1)), level_sd=float(l24.std(ddof=1)))
        P('  two-year target %s: n=%d dropped=%s level SD %s, change mean %+.2f SD %s; change on [1, level]: beta=%s HC3 se %s boot95 [%s .. %s] Huber %s' % (
            tn, n, dict(cnt), f2(l24.std(ddof=1)), d2.mean(), f2(d2.std(ddof=1)), np.round(beta, 3), np.round(se, 3), np.round(ci[0], 3), np.round(ci[1], 3), np.round(hb, 3)))
        for k, v in res_.items():
            P('    %-18s MAE %s dMAE %+.3f [%s, %s]' % (k, f2(v['mae']), v['dmae'], f2(v['ci_lo']), f2(v['ci_hi'])))
    return out



def summary(R):
    P('\n\n############ SUMMARY (all numbers above; pp unless stated) ############')
    for t, nm in (('w', "women's wage share"), ('fPerm', "women's share of permanent employees"), ('board', "women's share of board")):
        r = R['panel'][t]
        sp = r['pooled']
        P('%s: n=%d pairs, %d companies; persistence MAE %s RMSE %s' % (nm, sp['pers']['n'], sp['pers']['n_companies'], f2(sp['pers']['mae']), f2(sp['pers']['rmse'])))
        for m in ('drift', 'damped', 'ar1', 'rev_ind', 'rev_all'):
            z = sp[m]
            P('   %-24s MAE %s (%+.1f%%) dMAE %+.3f [%s, %s] | RMSE %s dRMSE %+.3f [%s, %s]' % (
                MNAME[m], f2(z['mae']), 100 * (z['mae'] / sp['pers']['mae'] - 1), z['dmae'], f2(z['ci_lo']), f2(z['ci_hi']),
                f2(z['rmse']), z['drmse'], f2(z['rmse_ci_lo']), f2(z['rmse_ci_hi'])))
        for key in ('interval_pers', 'interval_drift', 'interval_best'):
            iv = r[key]
            P('   %-15s 80%%: +-%s (in-sample cov %.0f%%, expanding-window OOS cov %.0f%%, n=%d) | 90%%: +-%s (in-sample %.0f%%, OOS %.0f%%, n=%d)' % (
                key, f2(iv['hw80']), 100 * iv['cov_in80'], 100 * iv['oos_cov80'], iv['oos_n80'], f2(iv['hw90']), 100 * iv['cov_in90'], 100 * iv['oos_cov90'], iv['oos_n90']))
        sd = r['spread']
        P('   spread FY2025-26 (n=%d): SD %s IQR %s; persistence MAE / SD = %.0f%%' % (sd['level_n'], f2(sd['level_sd']), f2(sd['level_iqr']), 100 * sp['pers']['mae'] / sd['level_sd']))
    # index-level model comparison pooled over the 3 indexes at origins 2023-24 and 2024-25
    errs = collections.defaultdict(list)
    for k, v in R['index'].items():
        for o in ORIGINS[1:]:
            z = v['backtest'].get(o)
            if z:
                errs['persistence'].append(z['chg'])
                errs['index drift'].append(z['chg'] - z['idx_drift'])
                errs['company drift aggregated'].append(z['actual'] - z['drift'])
                errs['company AR(1) aggregated'].append(z['actual'] - z['ar1'])
    P('index-level like-for-like errors pooled over 3 indexes x origins 2023-24, 2024-25 (n=%d, indexes overlap so not independent):' % len(errs['persistence']))
    for nm, e in errs.items():
        P('   %-26s MAE %s RMSE %s' % (nm, f2(mae(e), 3), f2(rmse(e), 3)))
    allchg = [z['chg'] for v in R['index'].values() for z in v['backtest'].values()]
    P('all 9 like-for-like index changes (3 indexes x 3 transitions): mean %+.3f, SD %.3f, min %+.3f, max %+.3f' % (np.mean(allchg), np.std(allchg, ddof=1), min(allchg), max(allchg)))
    cnt = collections.Counter()
    for v in R['index'].values():
        for z in v['loo_origin_cov'].values():
            for nm in ('indep', 'yearblock'):
                cnt[(nm, '80')] += z[nm]['in80']
                cnt[(nm, '90')] += z[nm]['in90']
            cnt['n'] += 1
    P('leave-one-origin-out index coverage over %d (index, origin) cases: independent 80%%: %d, 90%%: %d; year-block 80%%: %d, 90%%: %d' % (
        cnt['n'], cnt[('indep', '80')], cnt[('indep', '90')], cnt[('yearblock', '80')], cnt[('yearblock', '90')]))
    for k, v in R['index'].items():
        z = v['sims']['payroll-weighted draws, members pool, year-block']
        zi = v['sims']['payroll-weighted draws, members pool, independent']
        P('FORECAST %-14s FY2026-27 like-for-like: persistence %s; year-block sim median %s, 80%% [%s, %s], 90%% [%s, %s]; independent-draw 80%% [%s, %s], 90%% [%s, %s]; n=%d companies, effective n %.1f' % (
            k, f2(v['persistence_same_set'], 2), f2(z['p50'], 2), f2(z['p10'], 2), f2(z['p90'], 2), f2(z['p5'], 2), f2(z['p95'], 2),
            f2(zi['p10'], 2), f2(zi['p90'], 2), f2(zi['p5'], 2), f2(zi['p95'], 2), v['n_base'], v['n_eff']))

# ----------------------------------------------------------------------------- main
def main():
    c, ind, S, prior, flag, drops = load_panel()
    P('Panel: %d companies; implausible values dropped: %s' % (len(c), dict(drops)))
    P('Panel flagged transitions (basis change / headcount jump / boundary switch): %d of %d adjacent-year pairs' % (
        sum(1 for s in flag for y, f in flag[s].items() if f), sum(len(flag[s]) for s in flag)))
    panel = panel_section(c, ind, S, prior, flag)
    RES['panel'] = {t: {k: v for k, v in r.items() if not k.startswith('_')} for t, r in panel.items()}
    RES['index'] = index_section(c, ind, S, prior, flag, panel)
    snap = json.load(open(SNAP))
    RES['wide'] = wide_section(snap)
    summary(RES)
    json.dump(RES, open(os.path.join(WORK, 'results.json'), 'w'), indent=1, default=lambda o: o.tolist() if hasattr(o, 'tolist') else str(o))
    open(os.path.join(WORK, 'results.txt'), 'w').write('\n'.join(LOG))


if __name__ == '__main__':
    main()
