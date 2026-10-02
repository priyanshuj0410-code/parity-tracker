# Equal 50, Parity-Aligned Nifty 500 and Parity 50 pipeline

**On hold:** `fetch_prices.py`, `fundamentals.py`, `fundamentals_if.py`, `ca_shp.py` and `events.py` download from NSE, whose terms need its written consent for scripted collection. Do not run them until consent or a licence is recorded in `knowledge/playbooks/data-pipeline.md` (PARITY-66, `knowledge/reviews/legal-review-2026-10.md`).

Builds the illustrative indexes pre-registered in `knowledge/decisions/0005-equal-50-methodology.md`, `0006-parity-aligned-nifty-500.md` and `0007-parity-50.md`. Results and limits: `knowledge/research/equal-50-results.md`, `parity-aligned-nifty-500-results.md` and `parity-50-results.md`.

Run in the India scratch folder (the one holding `company_years.json`, `meta_all.json` and `funds/ind_nifty500.csv`), with these scripts copied into a subfolder `e50/`:

1. `python3 fetch_prices.py`: month-end NSE closes from September 2021, NSE index closes and rebalance-date market caps, into `prices.json`.
2. `python3 build_e50.py pool`: each year's top parity candidates that pass the data and scale screens, into `pool.txt` (`POOL_N`, default 120; 230 fills 50 places under the industry cap).
3. `python3 fundamentals.py pool.txt`, `python3 fundamentals_if.py pool.txt fin_if.json` (then merge into `fin.json`), and `python3 ca_shp.py pool.txt`: audited annual results up to fiscal 2024 and from NSE's integrated filings for 2025 and 2026, corporate actions, and quarterly shareholding.
4. Build the Sensex total-return proxy `sensex.json` from `prices.json` by ISIN INF346A01034 (ICICI Prudential BSE Sensex ETF).
5. `python3 events.py`: values each demerger, rights issue and bonus preference issue between October 2021 and September 2026 from NSE's ex-date bhavcopy (old and new formats), into `events.json`. Demerged companies and their ratios are in `spin_map.json`; `python3 events.py find` lists newly listed companies after each demerger, to check that map. `build_e50.py` needs `events.json`.
6. `python3 build_e50.py build`: portfolios, backtest, sensitivities and the labelled hindsight run, into `result.json`.
7. `python3 pa500.py`: the Parity-Aligned Nifty 500 (decision 0006), into `pa500_result.json`. `python3 parity_frontier.py`: the parity reachable at each level of active share, into `frontier.json`.
8. `INDIA_DIR=<repo>/pipeline/india python3 parity50.py`: the Parity 50, version 1 (decision 0007), into `parity50_result.json`. It reads the Nifty 100 and Nifty 50 lists from `INDIA_DIR`.
9. `INDIA_DIR=<repo>/pipeline/india python3 parity50_v2.py`: the Parity 50, version 2 (decision 0008), into `parity50_v2_result.json`.
10. `INDIA_DIR=<repo>/pipeline/india python3 parity50_backfill.py`: the backfilled history from September 2021 (decision 0009), chained to version 2, into `parity50_backfill_result.json`.
11. `INDIA_DIR=<repo>/pipeline/india python3 export_parity50.py <repo>/src/data/simulations.json`: the data that Nivel shows as a simulation.

Copies of the outputs are in `results/`. Returns follow renamed companies by ISIN, and value demerged shares at NSE's ex-date price discovery until they list.

The XBRL reader comes from `pipeline/india/xb.py` (set `XB_DIR` if the scripts are copied elsewhere).
