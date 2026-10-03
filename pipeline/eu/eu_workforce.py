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
    # STOXX Europe 600 top 100 EU members, read from FY2025 ESEF filings on filings.xbrl.org, 3 October 2026
    'NOVO-B.CO': {'2025': (33992, 35453), '2024': (36711, 37416)},
    'NOKIA.HE': {'2025': (18096, 59465), '2024': (17897, 59402)},
    'ENGI.PA': {'2025': (24833, 66308)},
    'ASM.AS': {'2025': (832, 3687), '2024': (827, 3731)},
    'EBS.VI': {'2025': (30244, 18780), '2024': (30465, 18628)},
    'DSV.CO': {'2025': (52127, 85133), '2024': (25681, 40129)},
    'KBC.BR': {'2025': (22792, 17011), '2024': (22688, 17241)},
    'VWS.CO': {'2025': (6304, 30105), '2024': (6155, 28945)},
    'BMPS.MI': {'2025': (11204, 10875), '2024': (8967, 7760)},
    'FER.MC': {'2025': (4384, 18225), '2024': (4511, 20990)},
    'SAMPO.HE': {'2025': (8384, 7773), '2024': (8134, 7447)},
    'NN.AS': {'2025': (7939, 8248), '2024': (8189, 8249)},
    'HEIA.AS': {'2025': (22546, 64520), '2024': (22775, 66415)},
    'G.MI': {'2025': (45999, 42247), '2024': (45304, 41545)},
    'A5G.IR': {'2025': (5686, 4772), '2024': (5886, 4832)},
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
