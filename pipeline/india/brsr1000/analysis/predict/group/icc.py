import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # run from data/analysis/predict/group
from gdata import *; from gsim import *
snap=load_snapshot('snapshot_frozen_20261011.json')
for ds in (panel_payroll(), panel_headcount(), brsr_payroll(snap), brsr_headcount(snap)):
    k=ds.fit_ok; d=(ds.s26-ds.s25)[k]; g=ds.grp[k]
    lev,mu,tau2,sig2=anova_shrink(d,g,ds.G)
    # mean-reversion slope (unweighted) and corr
    x=ds.s25[k]; b=np.cov(x,d)[0,1]/np.var(x,ddof=1)
    # lag-1 change autocorrelation where available
    pv=ds.prev[k]; ok=~np.isnan(pv)
    ac=np.corrcoef(pv[ok],d[ok])[0,1] if ok.sum()>5 else float('nan')
    print('%-32s n=%3d groups=%2d tau2 %.3f sigma2 %.3f ICC %.3f | slope of change on last-year level %.4f pp/pp | corr(prev change, change) %.2f (n=%d)'%(ds.name,k.sum(),len(set(g)),tau2,sig2,tau2/(tau2+sig2),b,ac,ok.sum()))
