"""Fill-rule simulation for the Nivel group figure (pooled share, weights w). Python 3.9, numpy only."""
import sys
import site; sys.path.append(site.getusersitepackages())
import numpy as np

RULES = ['a_drop', 'b_carry', 'c1_pooled', 'c2_industry', 'd_shrink', 'd2_shrink_rev']
LABEL = {'a_drop': '(a) drop', 'b_carry': '(b) carry forward', 'c1_pooled': '(c1) carry + pooled mean change',
         'c2_industry': '(c2) carry + industry mean change', 'd_shrink': '(d) shrunk industry change',
         'd2_shrink_rev': '(d2) shrunk industry change + mean reversion'}


def anova_shrink(r, g, G):
    """One-way random-effects shrinkage of group means of r toward the pooled mean. Returns per-group predicted level and pooled mean."""
    n = np.bincount(g, minlength=G).astype(float)
    sm = np.bincount(g, weights=r, minlength=G)
    mu = r.mean()
    mg = np.where(n > 0, sm / np.maximum(n, 1), mu)
    present = int((n > 0).sum())
    N = len(r)
    dfw = max(N - present, 1)
    sig2 = float(((r - mg[g]) ** 2).sum()) / dfw
    dfb = max(present - 1, 1)
    ssb = float((n * (mg - mu) ** 2).sum())
    n0 = (N - float((n ** 2).sum()) / N) / dfb
    tau2 = max(0.0, (ssb / dfb - sig2) / n0) if n0 > 0 else 0.0
    B = np.where(n > 0, tau2 / (tau2 + sig2 / np.maximum(n, 1) + 1e-12), 0.0)
    return mu + B * (mg - mu), mu, tau2, sig2


def wshrink(r, g, G, w):
    """Weighted pooled mean mu_w and weighted group means m_g shrunk toward it.
    Between-group variance tau2 and within-group variance sig2 come from a one-way random-effects (method of moments) fit on
    the observed companies; the shrinkage factor uses the effective number of companies n_eff = (sum w)^2 / sum w^2 in each group."""
    _, mu_u, tau2, sig2 = anova_shrink(r, g, G)
    sw = np.bincount(g, weights=w, minlength=G)
    sw2 = np.bincount(g, weights=w * w, minlength=G)
    mu_w = float((w * r).sum() / w.sum())
    mg = np.where(sw > 0, np.bincount(g, weights=w * r, minlength=G) / np.maximum(sw, 1e-12), mu_w)
    neff = np.where(sw > 0, sw ** 2 / np.maximum(sw2, 1e-12), 0.0)
    B = np.where(neff > 0, tau2 / (tau2 + sig2 / np.maximum(neff, 1e-9) + 1e-12), 0.0)
    return mu_w + B * (mg - mu_w), mu_w, tau2, sig2, mg, sw


def estimate(ds, mask, rules=RULES, min_n=3):
    """Group-figure estimate (pp) for each fill rule, with everything fitted on observed companies only.
    All 'pooled' and 'industry' mean changes are weighted by the same weights as the group figure."""
    obs = ~mask
    s25, s26, wt = ds.s25, ds.s26, ds.wt
    d = s26 - s25
    wo_all = wt[obs]
    den_o = wo_all.sum()
    num_o = (wo_all * s26[obs]).sum()
    fit = obs & ds.fit_ok                  # change rules are fitted on observed like-for-like companies only
    if fit.sum() < 5:
        fit = obs
    wo = wt[fit]
    wm = ds.wf[mask]
    if ds.extra.get('scale_fill'):
        # masked companies carry last year's weight, scaled by the observed companies' weight growth
        w25 = ds.wf
        wm = w25[mask] * (den_o / w25[obs].sum())
    out = {}

    def fill(shat):
        return (num_o + (wm * np.clip(shat, 0, 100)).sum()) / (den_o + wm.sum())

    out['a_drop'] = num_o / den_o
    out['_a_lfl_change'] = (wo * d[fit]).sum() / wo.sum()                     # like-for-like change when the missing are dropped from both years
    sm = s25[mask]
    out['b_carry'] = fill(sm)
    mu_w = (wo * d[fit]).sum() / wo.sum()
    out['c1_pooled'] = fill(sm + mu_w)
    go, do = ds.grp[fit], d[fit]
    G = ds.G
    gmask = ds.grp[mask]
    n = np.bincount(go, minlength=G)
    swg = np.bincount(go, weights=wo, minlength=G)
    gm = np.bincount(go, weights=wo * do, minlength=G) / np.maximum(swg, 1e-12)
    out['c2_industry'] = fill(sm + np.where(n[gmask] >= min_n, gm[gmask], mu_w))
    if 'd_shrink' in rules or 'd2_shrink_rev' in rules:
        lev, mu, tau2, sig2, _, _ = wshrink(do, go, G, wo)
        out['d_shrink'] = fill(sm + lev[gmask])
        x = s25[fit]
        xm = float((wo * x).sum() / wo.sum())
        xc = x - xm
        vx = float((wo * xc ** 2).sum())
        beta = float((wo * xc * (do - mu_w)).sum() / vx) if vx > 0 else 0.0
        r = do - beta * xc
        lev2, mu2, _, _, _, _ = wshrink(r, go, G, wo)
        out['d2_shrink_rev'] = fill(sm + beta * (sm - xm) + lev2[gmask])
        out['_beta'] = beta
        out['_tau2'] = tau2
        out['_sig2'] = sig2
    return out


def make_masks(ds, pattern, frac, nsim, rng):
    N = ds.n
    K = max(1, int(round(frac * N)))
    masks = np.zeros((nsim, N), bool)
    if pattern == 'random':
        for i in range(nsim):
            masks[i, rng.choice(N, K, replace=False)] = True
    elif pattern in ('small', 'large'):
        order = np.argsort(ds.wt if pattern == 'small' else -ds.wt, kind='stable')   # rank 1 = smallest (small) or largest (large)
        rank = np.empty(N)
        rank[order] = np.arange(1, N + 1)
        p = 1.0 / rank
        U = rng.random((nsim, N))
        keys = np.log(U) / p                      # Efraimidis-Spirakis: top-K keys = weighted draw without replacement
        top = np.argpartition(-keys, K - 1, axis=1)[:, :K]
        for i in range(nsim):
            masks[i, top[i]] = True
    elif pattern == 'cluster':
        glist = np.arange(ds.G)
        sizes = np.bincount(ds.grp, minlength=ds.G)
        for i in range(nsim):
            cnt = 0
            m = np.zeros(N, bool)
            for gi in rng.permutation(glist):
                if sizes[gi] == 0: continue
                if cnt + sizes[gi] <= 1.25 * K or cnt == 0:
                    m |= (ds.grp == gi); cnt += sizes[gi]
                if cnt >= 0.8 * K:
                    break
            masks[i] = m
    else:
        raise ValueError(pattern)
    return masks


def run(ds, pattern, frac, nsim=3000, seed=1, rules=RULES, min_n=3):
    rng = np.random.default_rng(seed)
    masks = make_masks(ds, pattern, frac, nsim, rng)
    T = ds.truth()
    L = ds.lfl_signal()
    err = {r: np.empty(nsim) for r in rules}
    err['a_lfl_change'] = np.empty(nsim)
    betas = []
    for i in range(nsim):
        e = estimate(ds, masks[i], rules, min_n)
        for r in rules:
            err[r][i] = e[r] - T
        err['a_lfl_change'][i] = e['_a_lfl_change'] - L
        if '_beta' in e: betas.append(e['_beta'])
    summ = {}
    for r, v in err.items():
        a = np.abs(v)
        summ[r] = dict(mae=float(a.mean()), p90=float(np.percentile(a, 90)), p95=float(np.percentile(a, 95)), p80=float(np.percentile(a, 80)),
                       bias=float(v.mean()), rmse=float(np.sqrt((v ** 2).mean())),
                       over_signal=float((a > abs(L if r == 'a_lfl_change' else ds.signal())).mean()), over03=float((a > 0.3).mean()))
    summ['_meta'] = dict(masked_mean=float(masks.sum(1).mean()), masked_frac=float(masks.sum(1).mean() / ds.n), masked_wt_share=float((masks * ds.wt).sum(1).mean() / ds.wt.sum()),
                         beta_mean=float(np.mean(betas)) if betas else None, n=ds.n, nsim=nsim)
    return summ, err, masks
