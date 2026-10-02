"""Women's share of employees for Euro Stoxx 50 companies, from ESRS S1-6 (headcount by gender).

Read by hand from the same CSRD sustainability statements as the S1-16 pay gap
(sources in eu_values.json), on 2 October 2026. Counts are year-end headcount,
(women, men), with "other" and "not disclosed" left out of the share. Where a
statement gives only a percentage, the value is the share itself.

Not found: Deutsche Bank (the data compendium has no total split), Air Liquide
and EssilorLuxottica (2024 French filings; no S1-6 gender table located).
A web search summary gave Deutsche Bank as 63% women, which is not credible
and was not used.
"""

HEADCOUNT = {
    'ADS.DE': {'2025': (33586, 31302), '2024': (31880, 30134)},
    'ADYEN.AS': {'2025': (1879, 2866), '2024': (1672, 2656)},  # team leads + individual contributors
    'ASML.AS': {'2025': (9270, 34844), '2024': (8899, 34454)},
    'CS.PA': {'2025': (61528, 49668), '2024': (61796, 50555)},
    'BNP.PA': {'2025': (93066, 88437), '2024': (93515, 88095)},
    'ENI.MI': {'2025': (9028, 22495), '2024': (8974, 22695)},
    'RACE.MI': {'2025': (968, 4750), '2024': (875, 4560)},
    'INGA.AS': {'2025': 0.47, '2024': 0.47},  # 47% women among permanent and temporary staff
    'OR.PA': {'2025': (65839, 31343), '2024': (64590, 30222)},
    'SGO.PA': {'2025': 0.245, '2024': 0.245},  # part des femmes dans l'effectif fin d'année
    'SAN.PA': {'2025': (37665, 37123), '2024': (41090, 41753)},  # sum of contract and working-time rows
    'DG.PA': {'2025': 0.175, '2024': 0.175},  # "la proportion de femmes est restée stable, à 17,5 %"
    'WKL.AS': {'2025': (9695, 11294), '2024': (9831, 11558)},
    'DB1.DE': {'2025': (6635, 9817), '2024': (6205, 9262)},
    'DHL.DE': {'2025': (195523, 387423), '2024': (201563, 386971)},  # permanent + non-permanent + non-guaranteed hours
    'DTE.DE': {'2025': (73849, 131984), '2024': (73705, 132306)},
    'BMW.DE': {'2025': (31137, 124322), '2024': (31080, 127317)},
    'MUV2.DE': {'2025': (24224, 21653), '2024': (24248, 21552)},
    'VOW.DE': {'2025': (123664, 478929), '2024': (124125, 489917)},
    'SIE.DE': {'2025': (88154, 223708)},
    'BAYN.DE': {'2025': (37577, 51660), '2024': (39585, 54496)},
    'ENR.DE': {'2025': 0.21},  # ESG data sheet gives whole percentages only
    'ITX.MC': {'2025': (119744, 42913), '2024': (118698, 42554)},
    'NDA-FI.HE': {'2025': (16277, 15567), '2024': (17051, 16128)},
    'AD.AS': {'2025': (194000, 182000), '2024': (200000, 186000)},  # reported in thousands
    'ISP.MI': {'2025': (49618, 41171), '2024': (50725, 42814)},
    'BBVA.MC': {'2025': (65425, 61749), '2024': (64917, 60999)},
    'SAN.MC': {'2025': (103213, 95129), '2024': (108319, 98377)},
}


def apply(companies):
    """Set fAll (and women/men counts where given) on EU company years. Returns how many years were set."""
    n = 0
    for ticker, years in HEADCOUNT.items():
        c = companies.get('EU-' + ticker)
        if not c:
            continue
        for year, v in years.items():
            y = c['years'].get(year)
            if not y:
                continue
            if isinstance(v, tuple):
                women, men = v
                y['headcountWomen'], y['headcountMen'] = women, men
                y['headcount'] = women + men
                y['fAll'] = round(women / (women + men), 4)
            else:
                y['fAll'] = v
            n += 1
    return n
