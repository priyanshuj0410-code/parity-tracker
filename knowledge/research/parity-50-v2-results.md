---
type: research
title: Parity 50 results, version 2
description: Results of the Parity 50 under the version 2 rules, where every holding pays women at least the Nifty 50's own share of wages. Parity each year, what the bar keeps out, two years of returns against the Nifty 50, sensitivities and limits. This is the version shown on Nivel as a simulation.
status: draft
updated: 2026-10-03
plane_issues:
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/aaaea5eb-fbaf-45a6-908c-d4d5d62baa25
---

# Parity 50 results, version 2

## Status
- **What it is:** a fictional index, shown on Nivel as a simulation at `/simulation/parity50`. It is not investable, not advice and not a rating.
- **Rules:** [0008-parity-50-v2.md](../decisions/0008-parity-50-v2.md), committed (9f0e291) before any of its returns were computed.
- **Why a version 2:** [version 1](parity-50-results.md) held companies where women get as little as 1.5% of the pay.
- **Reproducing it:**
  - the backtest is `pipeline/equal50/parity50_v2.py`, with its output in `pipeline/equal50/results/parity-50-v2-2026-10-03.json`;
  - Nivel's data comes from `pipeline/equal50/export_parity50.py`.

## In one minute
- **Every holding clears the bar.** The bar is the Nifty 50's own women's share of the payroll it owns: 20.8% in 2026.
  - The lowest holding, Piramal Pharma, is at 20.8%.
  - The Nifty 50's lowest, Maruti Suzuki, is at 3.6%.
- **Parity:**
  - The average holding pays women 26.4% of its wages, against 16.6% for the Nifty 50.
  - Women are 32.0% of the average holding's staff, against 20.4%.
  - Women's share of the payroll owned is 27.0%, against 20.8%.
- **What it costs: it is not the Nifty 50.**
  - 35 of the Nifty 50's companies, with 66% of its money, are below the bar or lack usable figures.
  - Seven sectors have no holding: oil and gas, autos, metals, telecom, construction, power and cement. Together they are 36% of the Nifty 50.
- **Returns, October 2024 to September 2026:**
  - −11.0%, against −9.5% for the Nifty 50 rebuilt from the same data: 0.8 points a year behind, with tracking error 5.8%.
  - It was behind in the first year and ahead in the second. Two falling years settle nothing.

## Parity, each year
| Rebuild | Bar | Companies that qualify | Women's share of the payroll owned | Nifty 50 | Average holding: women's share of pay | Nifty 50 | Lowest holding |
|---|---|---|---|---|---|---|---|
| September 2024 | 21.5% | 57 | 28.0% | 21.5% | 28.3% | 16.2% | L&T Technology Services, 21.7% |
| September 2025 | 20.5% | 70 | 26.7% | 20.5% | 26.1% | 16.5% | Bharat Electronics, 20.6% |
| September 2026 | 20.8% | 79 | 27.0% | 20.8% | 26.4% | 16.6% | Piramal Pharma, 20.8% |

- **Staff:** women were 32.9%, 31.2% and 32.0% of the average holding's staff, against 20.1%, 20.4% and 20.4% for the Nifty 50.
- **Nifty 50 members held:** 12, 14 and 15.

## What the bar keeps out, 2026
- **35 of the 50 Nifty 50 companies,** with 66% of its weight:
  - HDFC Bank, the largest, misses by 0.5 points (20.4%);
  - Bharti Airtel misses by 1.3 points (19.5%);
  - Reliance Industries (6.4%) and Larsen & Toubro (6.0%) are far below;
  - ITC and Mahindra & Mahindra have no usable figures.
- **Sectors with no holding, with their Nifty 50 weight:**
  - oil, gas and fuels 9.3%;
  - autos 6.8%;
  - metals and mining 5.1%;
  - telecom 5.0%;
  - construction 4.7%;
  - power 2.5%;
  - cement 2.3%.
- **Where the money goes** (Nifty 50 weight in brackets):
  - financial services 41% (37%);
  - IT 17% (7%);
  - consumer services 15% (4%);
  - healthcare 9% (5%);
  - consumer goods 7% (6%);
  - capital goods 5% (1%);
  - consumer durables 4% (3%).

## Holdings, 2026
- **Largest:**
  - Infosys, ICICI Bank and SBI at the 8% cap;
  - then Axis Bank 7.5%, Eternal 6.1%, Kotak Mahindra Bank 5.9%, TCS 4.8%, Titan 4.3%, Hindustan Unilever 3.6% and Apollo Hospitals 3.2%.
- **35 of the 50 come from outside the Nifty 50,** among them Federal Bank, Max Healthcare, Avenue Supermarts, Fortis Healthcare, Indian Hotels, Persistent Systems, Info Edge, Wipro and Page Industries.

## Returns, October 2024 to September 2026
| | Parity 50, version 2 | Nifty 50 |
|---|---|---|
| Total return, cumulative | −11.0% | −9.5% |
| Total return, a year | −5.7% | −4.9% |
| Volatility, a year | 16.5% | 14.8% |
| Largest fall | −15.8% | −14.7% |
| October 2024 to September 2025 | −5.6% | −3.0% |
| October 2025 to September 2026 | −5.7% | −6.7% |

- **Against the Nifty 50:** tracking error 5.8%, beta 1.04, active return −0.8 points a year.
- **Context:** the SBI Nifty 50 ETF returned −10.3% and the ICICI Prudential BSE Sensex ETF −12.1%.

## Sensitivity checks
| Version | Average holding: women's share of pay, 2026 | Return | Tracking error | Active return a year |
|---|---|---|---|---|
| Bar at the market's level, tilted (the rules) | 26.4% | −11.0% | 5.8% | −0.8 |
| Free-float weights, no tilt | 25.7% | −12.0% | 5.7% | −1.3 |
| Bar of 15% | 24.2% | −11.9% | 4.0% | −1.2 |

- **A higher bar:** a 25% bar leaves only 42 qualifying companies in the Nifty 500, too few for 50.
- **Near parity:** of 360 large listed employers with usable figures, 6 are near parity on both staff and pay. The method is in [version 1's results](parity-50-results.md).

## Limits
- **History:** two years, both falling.
- **Survivorship:** the Nifty 500 of September 2026 is used for earlier years.
- **Concentration:** there are no sector limits. Financial services is 41%, and whole sectors are absent.
- **Data:**
  - a company's wages and its staff figures can cover different workforces;
  - only companies with at least 1,000 permanent staff are held.
- **Not advice:** past and simulated results do not predict future returns.

## Next
- **Legal review (PARITY-35)** covers the Nivel page before it goes live.
- **A rebuild each October** with that year's filings and bar.
