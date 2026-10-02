# Equal 50 pipeline

Builds the illustrative Equal 50 index as pre-registered in `knowledge/decisions/0005-equal-50-methodology.md`. Results and limits: `knowledge/research/equal-50-results.md`.

Run in the India scratch folder (the one holding `company_years.json`, `meta_all.json` and `funds/ind_nifty500.csv`), with these scripts copied into a subfolder `e50/`:

1. `python3 fetch_prices.py`: month-end NSE closes, NSE index closes and rebalance-date market caps, into `prices.json`.
2. `python3 build_e50.py pool`: each year's top parity candidates that pass the data and scale screens, into `pool.txt` (`POOL_N`, default 120; 230 fills 50 places under the industry cap).
3. `python3 fundamentals.py pool.txt`, `python3 fundamentals_if.py pool.txt fin_if.json` (then merge into `fin.json`), and `python3 ca_shp.py pool.txt`: audited annual results up to fiscal 2024 and from NSE's integrated filings for 2025 and 2026, corporate actions, and quarterly shareholding.
4. Build the Sensex total-return proxy `sensex.json` from `prices.json` by ISIN INF346A01034 (ICICI Prudential BSE Sensex ETF).
5. `python3 build_e50.py build`: portfolios, backtest, sensitivities and the labelled hindsight run, into `result.json`.

The XBRL reader comes from `pipeline/india/xb.py` (set `XB_DIR` if the scripts are copied elsewhere).
