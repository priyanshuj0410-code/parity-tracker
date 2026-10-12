import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # run from data/analysis/predict/group
from gdata import *; from gsim import *
snap=load_snapshot('snapshot_frozen_20261011.json')
def est_lag(ds,mask):
    obs=~mask; fit=obs&ds.fit_ok; d=ds.s26-ds.s25
    wo_all=ds.wt[obs]; den=wo_all.sum(); num=(wo_all*ds.s26[obs]).sum(); wm=ds.wf[mask]
    f=lambda sh:(num+(wm*np.clip(sh,0,100)).sum())/(den+wm.sum())
    wf_=ds.wt[fit]; mu=(wf_*d[fit]).sum()/wf_.sum()
    pv=ds.prev; ok=fit&~np.isnan(pv)
    if ok.sum()>=8:
        x=pv[ok]; y=d[ok]; xc=x-x.mean(); gam=(xc*(y-y.mean())).sum()/(xc**2).sum()
        pbar=x.mean()
    else: gam=0.0; pbar=0.0
    pm=np.where(np.isnan(pv[mask]),pbar,pv[mask])
    return f(ds.s25[mask]+mu), f(ds.s25[mask]+mu+gam*(pm-pbar)), gam
for ds in (panel_payroll(), panel_headcount(), brsr_payroll(snap)):
    for pat in ('random','cluster'):
        rng=np.random.default_rng(1); masks=make_masks(ds,pat,0.2,3000,rng); T=ds.truth()
        r=np.array([est_lag(ds,m) for m in masks])
        print('%-16s %-8s MAE c1 %.3f  c1+lag-change %.3f  (mean gamma %.2f)'%(ds.name,pat,np.abs(r[:,0]-T).mean(),np.abs(r[:,1]-T).mean(),r[:,2].mean()))
