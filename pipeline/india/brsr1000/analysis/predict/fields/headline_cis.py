"""Paired-bootstrap gains of the headline models over the median and over the staff share as-is (identity).
Same seeds and folds as field_gaps.py, so the MAEs match. Run: /usr/bin/python3 -I headline_cis.py"""
import sys, os, warnings
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
warnings.filterwarnings('ignore', category=RuntimeWarning)
from field_gaps import *

K, _ = load_kaggle()
S, _ = load_checked()
P = load_panel()
K, S = add_inverse(K), add_inverse(S)
Kcv = K[~K['file'].isin(S['file'])].reset_index(drop=True)
Kp = Kcv[~Kcv['nivel'].isin(set(P['sym']))].reset_index(drop=True)


def pick(res, tier_prefix):
    return [t for t in res if t['tier'].startswith(tier_prefix)][0]


def line(lab, t, model, bases):
    ms = {m['name']: m for m in t['models']}
    m = ms[model]
    out = '%-58s n=%4d  SD=%5.2f IQR=%5.2f | %s MAE=%.2f R2=%.2f' % (lab, t['n'], t['sd'], t['iqr'], model, m['MAE'], m['R2'])
    for b in bases:
        d, lo, hi = boot_diff(ms[b]['absErr'], m['absErr'], B=3000)
        out += ' | vs %s (MAE %.2f): %+.2f [%+.2f, %+.2f]' % (b, ms[b]['MAE'], d, lo, hi)
    if 'cov90' in m:
        out += ' | 80%% +/-%.1f cov %.2f, 90%% +/-%.1f cov %.2f' % (m['hw80'], m['cov80'], m['hw90'], m['cov90'])
    print(out)


TW = tiers_w() + tiers_w_kmp()
TF = tiers_f() + tiers_f_struct()
print('---- TARGET 1')
rK = run_tiers(K, TW, 'w')
rS = holdout_tiers(Kcv, S, TW, 'w')
rP = holdout_tiers(Kp, P, [TW[0]], 'w')
rSS = run_tiers(S, TW + tiers_w_checked_extra(), 'w')
line('A Kaggle CV', pick(rK, 'A '), 'calibrated fPerm (logit)', ['median', 'identity fPerm'])
line('A checked hold-out', pick(rS, 'A '), 'calibrated fPerm (logit)', ['median', 'identity fPerm'])
line('A checked own-CV', pick(rSS, 'A '), 'calibrated fPerm (logit)', ['median', 'identity fPerm'])
line('A XBRL panel hold-out', pick(rP, 'A '), 'calibrated fPerm (logit)', ['median', 'identity fPerm'])
line('D Kaggle CV (fPW)', pick(rK, 'D '), 'calibrated fPW (logit)', ['median', 'identity fPW'])
line('D checked hold-out (fPW)', pick(rS, 'D '), 'calibrated fPW (logit)', ['median', 'identity fPW'])
line('E Kaggle CV (impl_all)', pick(rK, 'E '), 'calibrated impl_all (logit)', ['median', 'identity fPW', 'calibrated fPW (logit)'])
line('E checked hold-out (impl_all)', pick(rS, 'E '), 'calibrated impl_all (logit)', ['median', 'identity fPW', 'calibrated fPW (logit)'])
line('E checked own-CV (impl_all)', pick(rSS, 'E '), 'calibrated impl_all (logit)', ['median', 'identity fPW', 'calibrated fPW (logit)'])
line('E Kaggle CV (structural impl_all, no fit)', pick(rK, 'E '), 'structural impl_all (identity)', ['median', 'identity fPW', 'calibrated fPW (logit)'])
line('E checked hold-out (structural impl_all, no fit)', pick(rS, 'E '), 'structural impl_all (identity)', ['median', 'identity fPW', 'calibrated fPW (logit)'])
line('C Kaggle CV (fPerm + r_emp)', pick(rK, 'C '), 'fPerm + r_emp (logit)', ['median', 'identity fPerm', 'calibrated fPerm (logit)'])
line('C checked hold-out (fPerm + r_emp)', pick(rS, 'C '), 'fPerm + r_emp (logit)', ['median', 'identity fPerm', 'calibrated fPerm (logit)'])

print('---- TARGET 2')
fK = run_tiers(K, TF, 'fPerm')
fS = holdout_tiers(Kcv, S, TF, 'fPerm')
line('U1 Kaggle CV', pick(fK, 'U1'), 'calibrated w (logit, LAD)', ['median', 'identity w'])
line('U1 Kaggle CV (logit OLS)', pick(fK, 'U1'), 'calibrated w (logit)', ['median', 'identity w'])
line('U1 checked hold-out', pick(fS, 'U1'), 'calibrated w (logit)', ['median', 'identity w'])
line('U3 Kaggle CV (w + r_emp, LAD)', pick(fK, 'U3'), 'w + r_emp (logit, LAD)', ['median', 'identity w', 'calibrated w (logit)'])
line('U3 checked hold-out (w + r_emp)', pick(fS, 'U3'), 'w + r_emp (logit)', ['median', 'identity w', 'calibrated w (logit)'])
line('U5 Kaggle CV (w + inv_full)', pick(fK, 'U5'), 'w + inv_full (logit)', ['median', 'identity w', 'calibrated w (logit)'])
line('U5 checked hold-out (w + inv_full)', pick(fS, 'U5'), 'w + inv_full (logit)', ['median', 'identity w', 'calibrated w (logit)'])
