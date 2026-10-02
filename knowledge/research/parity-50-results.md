---
type: research
title: Parity 50 results, version 1
description: A 50-stock portfolio from the Nifty 100 that keeps the Nifty 50's sectors within 2 points and stays within 20% active share of it, while owning a payroll that is 26% women's instead of 21%. Two years of point-in-time history, sensitivities, the companies in and out, the gap list, a data correction made after the first run, and the limits.
status: draft
updated: 2026-10-02
plane_issues:
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/9ab74e7f-71cd-45bc-814a-aedb5f06515d
---

# Parity 50 results, version 1

## Status
- **What it is:** illustrative, not investable as published, not advice, not a rating.
- **Where it may appear:** nowhere public, Nivel included, until the legal review (PARITY-35).
- **Rules:** [0007-parity-50.md](../decisions/0007-parity-50.md), committed (2d0d7a1) before any of its returns were computed.
- **A correction after the first run:** the return calculation missed the value of demerged shares and dropped renamed companies. It was fixed for all three indexes, and both runs are reported [below](#correction-after-the-first-run).
- **Reproducing it:** `pipeline/equal50/parity50.py`; output in `pipeline/equal50/results/parity-50-2026-10-02.json`.
- **Related:** the [Parity-Aligned Nifty 500](parity-aligned-nifty-500-results.md) is the broad-market version of the same idea.
- **Replaced on Nivel by [version 2](parity-50-v2-results.md) (3 October 2026):** keeping the Nifty 50's sector mix made this version hold companies where women get as little as 1.5% of the pay. Version 2 requires every holding to clear the Nifty 50's own level.

## In one minute
- **Parity:**
  - The portfolio owns a payroll that is 26.1% women's (September 2026), against 20.8% for the Nifty 50.
  - Women are 32.1% of the staff it owns, against 25.4%.
- **It represents the large-cap market:**
  - 50 stocks, 39 of them Nifty 50 members;
  - every sector within 2 points of its Nifty 50 weight;
  - 80% of the portfolio identical to the Nifty 50;
  - tracking error 1.7% a year;
  - beta 1.02.
- **Returns, October 2024 to September 2026:**
  - −6.8%, against −9.5% for the Nifty 50 rebuilt from the same data.
  - That is 1.4 points a year ahead. About half came from the rules leaving out Nifty 50 companies without parity data, and half from the tilt.
  - Two years cannot separate skill from luck.
- **The main caveat:** Infosys is 56% of the payroll the portfolio owns, so the parity figure leans on one company's disclosure.
- **It is not at parity,** for the reason set out in the Parity-Aligned Nifty 500 results: the market's companies employ too few women.

## Results, October 2024 to September 2026
| | Parity 50 | Nifty 50, market weights |
|---|---|---|
| Women's share of owned payroll, 2024 | 25.1% | 21.5% |
| Women's share of owned payroll, 2025 | 25.0% | 20.5% |
| Women's share of owned payroll, 2026 | 26.1% | 20.8% |
| Women's share of owned staff, 2026 | 32.1% | 25.4% |
| Total return, cumulative | −6.8% | −9.5% |
| Total return, a year | −3.4% | −4.9% |
| Volatility, a year | 15.3% | 14.8% |
| Largest fall | −14.4% | −14.7% |
| October 2024 to September 2025 | −2.1% | −3.0% |
| October 2025 to September 2026 | −4.8% | −6.7% |

- **Against the Nifty 50:** tracking error 1.7%, beta 1.02, active return +1.4 points a year.
- **Where the 1.4 points came from:**
  - +0.65 a year from leaving out Nifty 50 members without parity data (a Nifty 50 of measured companies only returned −8.3%);
  - +0.8 a year from the tilt within the measured companies.
- **Context:** the SBI Nifty 50 ETF returned −10.3% and the ICICI Prudential BSE Sensex ETF −12.1% over the same months, net of their fees. The rebuilt Nifty 50 uses September 2026 membership.

## What it holds, September 2026
- **Nifty 50 members left out:**
  - no valid parity data (4, together 7.6% of the Nifty 50): ITC, Mahindra & Mahindra, Tech Mahindra, IndiGo;
  - chosen out (7): TCS, HCL Technologies, Maruti Suzuki, ONGC, Tata Steel, Coal India, Bajaj Finserv.
- **Added from the Nifty Next 50 (11):**
  - Canara Bank 3.0%, Bosch 2.1%, Britannia 0.5%;
  - at the 0.5% minimum: Adani Power, Avenue Supermarts, Cummins India, Godrej Consumer Products, Hindustan Zinc, IRFC, Solar Industries, Union Bank of India.
- **Largest weights:** HDFC Bank 10.0% (the cap), Infosys 9.2%, ICICI Bank 8.7%, Reliance Industries 7.3%, Bharti Airtel 5.0%, SBI 3.6%, Axis Bank 3.2%, Canara Bank 3.0%, Kotak Mahindra Bank 2.8%, Larsen & Toubro 2.7%.
- **Largest overweights** (points of weight): Infosys +6.0, Canara Bank +3.0, Bosch +2.1, Apollo Hospitals +1.6, Trent +1.5, Titan +0.7, Max Healthcare +0.7, Britannia +0.5.
- **Largest underweights** (points of weight): ITC −3.0 and Mahindra & Mahindra −2.6 (no data), Larsen & Toubro −2.0, TCS −1.9, Maruti Suzuki −1.4, Tata Steel −1.4, HCL Technologies −1.2, ONGC −1.1.
- **These are relative choices within a sector,** not verdicts on any company.
- **Earlier portfolios:** 2024 and 2025 each held 10 Next 50 companies. The full lists and weights are in the results file.

## Where it is concentrated
- **Infosys:**
  - 56% of the payroll the portfolio owns, against 24% in the Nifty 50;
  - held at 9.2% against a market weight of 3.2%, close to its three-times limit.
- **Why:** information technology carries the largest payrolls per rupee of market value. Among the Nifty 50's IT companies, women get the largest share of wages at Infosys (29.1%, against 24.9% at TCS and 20.7% at HCL Technologies). Holding the sector within 2 points, the optimiser moves the IT allocation to Infosys and leaves TCS and HCL out.
- **What it means:** a change in one company's reported figures moves the portfolio's parity figure most. A version 2 could cap any company's share of owned payroll. Version 1 is reported as registered.

## Why some large companies have no parity data
- **ITC:** its filings carry no reported gross-wages figure. Nivel estimates its payroll, and the rules use reported figures only.
- **Mahindra & Mahindra and Tech Mahindra:** in 2024 and 2025 their wage shares come only from the following year's filing, which NSE did not have on the date. In 2026 their payroll is estimated.
- **IndiGo (2025 and 2026):** no usable payroll figure.
- **Titan (2025):** the wage share comes only from the following year's filing.
- **Eternal and Tata Motors:** no filing of their own with both figures by the 2024 date (Tata Motors also in 2025).
- **The effect:** excluded companies weighed 12.2% of the Nifty 50 in 2024, 11.4% in 2025 and 7.6% in 2026. Leaving them out is a disclosure effect, not a parity choice.

## Sensitivity checks
| Version | Payroll to women, 2026 | Return, cumulative | Tracking error | Active return a year |
|---|---|---|---|---|
| 20% active share, sectors within 2 points (the rules) | 26.1% | −6.8% | 1.7% | +1.4 |
| 10% active share | 24.2% | not feasible in 2024 and 2025 | n/a | n/a |
| 30% active share | 26.9% | −8.7% | 2.4% | +0.4 |
| Sector weights exactly the Nifty 50's | 25.3% | −7.3% | 1.8% | +1.2 |

- **10% active share** has no solution in 2024 and 2025: leaving out the companies without data already moves more than 10% of the Nifty 50.
- **30% active share** adds less than a point of parity for half again the distance from the market.

## The glide path and the gap list
- **The glide path:**
  - The 2025 target would have been 27.6%, and the portfolio reached 25.0% within its limits.
  - The 2026 target would have been 27.5%, and it reached 26.1%.
  - The Nifty 50's own figure barely moved (21.5%, 20.5%, 20.8%). The shortfall is the gap only companies can close.
- **The gap list, 2026:**
  - The remaining gap is 23.9 points (50% less 26.1%).
  - Each company's part is its share of the payroll the portfolio owns, times the distance of its women's share of wages from 50%.
  - The ten largest, in points:
    - Infosys 11.6
    - Canara Bank 1.8
    - HDFC Bank 1.6
    - SBI 1.0
    - ICICI Bank 1.0
    - Larsen & Toubro 0.8
    - Axis Bank 0.7
    - Reliance Industries 0.5
    - Kotak Mahindra Bank 0.4
    - Shriram Finance 0.3
- **How to read it:**
  - The list shows leverage, not blame.
  - Infosys leads because the portfolio owns so much of its payroll, even though its ratio is among the best in IT.
  - A change in its hiring or pay would move the figure most.

## Correction after the first run
- **The first run** used the rules as committed. It gave:
  - returns of −7.7% against −9.6%, with tracking error 1.8% and active return +1.0 a year;
  - payroll to women of 25.5%, 25.1% and 26.1%.
- **Two data errors,** found while checking that run:
  1. **Demergers and rights issues were not valued.** The parent's price fell on the ex-date and the shares received were ignored. Affected:
     - **demergers:** ITC Hotels (January 2025), Siemens Energy and STL Networks (April 2025), Tata Motors' commercial vehicles (October 2025), Kwality Wall's (December 2025), Vedanta's four companies (April 2026) and HEG (September 2026);
     - **rights issues:** UPL, Thangamayil, M&M Financial, Inox Wind and Adani Enterprises;
     - **bonus preference shares:** TVS Motor's.
  2. **Renamed companies lost their history.** They had no market capitalisation or price under their old symbols, so they dropped out of earlier years: Zomato (now Eternal), Tata Motors (now Tata Motors Passenger Vehicles) and HEG (now HEG Advanced Material).
- **The fix:**
  - **Demerged shares:** valued at NSE's own ex-date price discovery (the previous close less the special pre-open price), held until they list, then reinvested.
  - **Rights issues:** adjusted by the theoretical ex-rights price.
  - **Bonus preference shares:** counted at face value.
  - **Companies:** followed by ISIN.
  - **Inputs:** event values are in `pipeline/equal50/results/events-2026-10-02.json`.
- **Effect:**
  - the Parity 50 figures above;
  - the Parity-Aligned Nifty 500 moved to −6.5% against −6.3% (from −7.0% against −6.9%);
  - the Equal 50 did not change.
- **The rules did not change.** Both runs are shown because the correction came after seeing the first.

## Limits
- **History:** two years, both falling markets.
- **Survivorship:** the Nifty 100 of September 2026 is used for earlier years.
- **Free float:** taken as the public shareholding in each company's pattern. It overstates the float where a strategic holder is classed as public, as at ITC.
- **Concentration:** Infosys, as above.
- **Benchmarks:** the Nifty 50 is rebuilt from NSE data rather than taken from NSE's published total return index; the ETFs give context.
- **Not advice:** past results do not predict future returns.

## Who could offer it
- **A model portfolio such as a smallcase** must be published by a SEBI-registered research analyst, investment adviser, portfolio manager or broker.
- **The Equal Lens's role:** it would supply the data and the method. The registered manager would own the recommendation and its disclosures.

## Next
- **Legal review** before it appears anywhere public (PARITY-35).
- **A rebuild each October** with that year's BRSR.
- **A version 2,** if wanted, registered first. A cap on any company's share of owned payroll is the obvious candidate.
