---
type: schema
title: BRSR reading format
description: The JSON a checker writes for one company in the BRSR filer build (PARITY-123), and the rules for reading each table. batch.py compares these readings with the parser; the build reads them.
---

# BRSR reading format

Write one JSON object per company. Use null for anything absent, "NA" or unreadable.

```json
{
  "key": "<queue key>",
  "fy": "2025-26",
  "name": "<Name of the Listed Entity>", "cin": "<CIN>", "website": "<domain, no https or www>",
  "boundary": "standalone | consolidated | other",
  "nic": {"code": "<first NIC code in Section A Q17>", "activity": "<main activity in Q16>"},
  "headcount": {
    "permEmployees": {"total": 0, "men": 0, "women": 0},
    "tempEmployees": {"total": 0, "men": 0, "women": 0},
    "permWorkers": {"total": 0, "men": 0, "women": 0},
    "tempWorkers": {"total": 0, "men": 0, "women": 0}
  },
  "board": {"total": 0, "women": 0},
  "kmp": {"total": 0, "women": 0},
  "wageShare": {"current": 0.0, "prior": 0.0},
  "wages": {"women": 0, "total": 0, "unit": "rupees | thousand | lakh | million | crore | not stated"},
  "medianPay": {
    "unit": "rupees | thousand | lakh | million | crore | not stated",
    "board": {"men": 0, "menMedian": 0, "women": 0, "womenMedian": 0},
    "kmp": {"men": 0, "menMedian": 0, "women": 0, "womenMedian": 0},
    "employees": {"men": 0, "menMedian": 0, "women": 0, "womenMedian": 0},
    "workers": {"men": 0, "menMedian": 0, "women": 0, "womenMedian": 0}
  },
  "turnover": {"men": 0.0, "women": 0.0, "total": 0.0},
  "parental": {"men": {"returnRate": 0.0, "retentionRate": 0.0}, "women": {"returnRate": 0.0, "retentionRate": 0.0}},
  "ladder": [
    {"level": "<the company's own name for the level, e.g. 'Senior Management (VP and above)'>",
     "standard": "board | kmp | top | senior | middle | junior | staff | workers",
     "men": 0, "women": 0, "womenPct": 0.0,
     "pay": {"basis": "median | mean | not given", "unit": "rupees | lakh | crore | ...", "men": 0, "women": 0},
     "where": "<section and page, e.g. 'Human Capital, p.84'>"}
  ],
  "functions": [
    {"function": "<the company's own name, e.g. 'Engineering & R&D'>",
     "standard": "stem | technology | engineering | research | manufacturing | operations | sales | customer | corporate | other",
     "men": 0, "women": 0, "womenPct": 0.0, "scope": "<all staff | managers only | new hires | ...>",
     "where": "<section and page>"}
  ],
  "notes": "<anything odd: a row that looks mis-stated, a unit you had to infer, a table split across pages>"
}
```

The same object also carries these fields. A is BRSR tables every filer must give; B is from the annual report, only where the company reports it.

```json
{
  "disabledHeadcount": {"permEmployees": {"total": 0, "men": 0, "women": 0}, "tempEmployees": {...}, "permWorkers": {...}, "tempWorkers": {...}},
  "turnoverTrend": [{"fy": "2025-26", "men": 0.0, "women": 0.0, "total": 0.0}],
  "minWage": [{"group": "permEmployees | tempEmployees | permWorkers | tempWorkers", "gender": "men | women", "total": 0, "atMin": 0, "aboveMin": 0}],
  "wellbeing": [{"group": "permEmployees | tempEmployees | permWorkers | tempWorkers", "gender": "men | women", "total": 0,
                 "healthInsurance": 0, "accidentInsurance": 0, "maternity": 0, "paternity": 0, "dayCare": 0}],
  "wellbeingSpend": {"current": 0.0, "prior": 0.0},
  "unions": [{"group": "permEmployees | permWorkers", "gender": "men | women", "total": 0, "members": 0}],
  "training": [{"group": "employees | workers", "gender": "men | women", "total": 0, "healthSafety": 0, "skills": 0}],
  "reviews": [{"group": "employees | workers", "gender": "men | women", "total": 0, "reviewed": 0}],
  "complaints": {"sexualHarassment": {"filed": 0, "pending": 0}, "discrimination": {"filed": 0, "pending": 0}, "wages": {"filed": 0, "pending": 0},
                 "poshPctOfWomen": 0.0, "poshUpheld": 0},
  "context": {"incorporated": 1990, "state": "<state of the registered office>",
              "locations": {"nationalPlants": 0, "nationalOffices": 0, "internationalPlants": 0, "internationalOffices": 0},
              "exportsPct": 0.0, "turnover": {"value": 0, "unit": "crore | lakh | rupees"}, "netWorth": {"value": 0, "unit": "..."},
              "assurance": {"provider": "<name>", "type": "reasonable | limited | none"}},

  "flows": [{"flow": "hires | promotions | leavers", "level": "<the company's label, or 'all'>",
             "standard": "board | kmp | top | senior | middle | junior | staff | workers | all",
             "men": 0, "women": 0, "womenPct": 0.0, "fy": "2025-26", "where": "<section and page>"}],
  "targets": [{"topic": "gender | emissions | energy | water | waste | csr | safety | other",
               "metric": "<as the company words it, e.g. 'women in senior leadership'>", "target": 30.0, "byYear": 2030,
               "current": 0.0, "progress": "<the company's own words on performance against it, if given>", "where": "<section and page>"}],
  "leadership": {"ceoTitle": "<MD | CEO | MD & CEO ...>", "ceoGender": "woman | man", "chairGender": "woman | man",
                 "independentWomen": 0, "executiveWomen": 0, "where": "<section and page>"},
  "ownership": {"promoterPct": 0.0, "type": "government | foreign-parent | indian-promoter | no-promoter",
                "group": "<business group if the report names one>", "where": "<section and page>"},
  "policies": {"maternityWeeks": 26, "paternityWeeks": 0, "returnToWork": "<programme name, or null>", "creche": true,
               "flexibleWork": true, "where": "<section and page>"},
  "payRatio": {"ceoToMedian": 0.0, "medianIncreasePct": 0.0, "where": "<section and page>"}
}
```

## Rules

- **Period:** `fy` is the period in Section A "Financial year for which reporting is being done", written as `2025-26`, or as `CY2025` for a calendar year.
- **Numbers as printed:** drop thousands separators, so "1,23,456" is 123456. Percentages are plain numbers, so "17.5%" is 17.5. Nil, "-" or "—" in a count is 0.
- **Which column:** read the current financial year only. The exceptions are `wageShare.prior`, the previous-year column of the same row, and `turnoverTrend`, which takes all three years.
- **Headcount** comes from Section A Q20(a), "Employees and workers (including differently abled)". Its rows are Permanent (D), Other than permanent (E), Permanent (F) and Other than permanent (G). Men is Male No. (B) and women is Female No. (C). Do not read the differently abled table.
- **Board and KMP** come from "Participation/Inclusion/Representation of women": Total (A) and No. of females (B).
- **Wage share** comes from Principle 5 EI 3(b), "Gross wages paid to females as % of total wages". If the filing gives only rupee amounts, put them in `wages` and leave `wageShare` null: do not compute it.
- **Median pay** comes from Principle 5 EI 3(a). Record the unit the table states, or "not stated".
- **Turnover** is permanent employees, current year. **Parental** is permanent employees' return-to-work and retention rates.
- **Ladder (hierarchy):** every level of the organisation for which the report gives women and men, as counts or percentages.
  - Always include the BRSR levels you have already read: the board, KMP, permanent employees and permanent workers.
  - Then add any finer levels the company reports itself: grades, bands, cadres, management levels, "senior leadership", "women in management". Look in the BRSR, then in the annual report's human capital, people or diversity section, by searching the full text for words such as senior management, middle management, junior management, leadership, grade, band, cadre, level, management cadre, executives, officers, staff and diversity.
  - Record each level as the company names it, then map it to `standard`:
    - `top`: executive committee, C-suite or leadership team below the board.
    - `senior`: senior management, or vice president and above.
    - `middle`: middle management.
    - `junior`: junior or first-line management, supervisors, officers.
    - `staff`: non-management employees.
    - `workers`: workers.
  - Give pay only where the report gives it by level and gender, with its basis (median or mean) and unit.
- **Functions:** every job function or role family split by gender: STEM, engineering, technology, R&D, manufacturing or plant, operations, sales, customer service, corporate or support functions. Record the company's own name and map it to `standard`. Use `scope` to say what population the figure covers (all staff, managers only, new hires).
- **The other BRSR tables (A):**
  - `disabledHeadcount` is Section A Q20(b).
  - `turnoverTrend` is all three years of Q22 for permanent employees.
  - `minWage` is Principle 5 EI 2, "equal to" and "more than" minimum wage. Record a row per group and gender, for the current year.
  - `wellbeing` is Principle 3 EI 1(a) and 1(b), as counts covered: health insurance, accident insurance, maternity, paternity, day care. `wellbeingSpend` is EI 1(c), spending on well-being measures as % of total revenue, current and previous year.
  - `unions` is Principle 3 EI 7, `training` is Principle 3 EI 8 (current year) and `reviews` is Principle 3 EI 9.
  - `complaints` is Principle 5 EI 6 (filed during the year, pending at its end: sexual harassment, discrimination at the workplace, wages) and EI 7.
  - `context` is Section A: Q3 year of incorporation, Q4 state, Q18 locations, Q19 exports share, Q24 turnover and net worth with their unit, and Q14 and Q15 assurance.
- **Annual-report extras (B):**
  - **Flows:** hires, promotions and leavers by gender, per level where given. Leavers can be counts or attrition rates; put a rate in `womenPct` only if it is women's share of leavers, and otherwise say what it is in `notes`.
  - **Targets:** every stated goal in Section B Q5 ("specific commitments, goals and targets set by the entity with defined timelines"), with Q6's performance against it in `progress`, plus goals for women's representation or pay stated elsewhere in the report. One row per goal, with its `topic`. `target` is the number only (put the unit in `metric`, e.g. 'women in the workforce, %'); leave it null for a goal without a number, such as 'net zero by 2040' (then the year goes in `byYear`). `current` is the figure the report gives for now, if any.
  - **Leadership:** the CEO or MD's gender from the title and name used in the report (Ms, Mrs, Mr, she, he). Count women directors who are independent and women who are executive or whole-time, from the corporate governance report.
  - **Ownership:** promoter and promoter-group holding % and the promoter category, from the shareholding pattern: government, a foreign parent, Indian promoters, or none.
  - **Policies:** only what the report states. Do not assume the legal minimum.
  - **Pay ratio:** from the directors' report annexure on managerial remuneration (Rule 5(1)): the CEO or MD's ratio to the median employee, and the year's % increase in median remuneration.
- **Shares as reported:** where the report gives only a percentage of women, put it in `womenPct` and leave the counts null.
- **Sources:** give `where` for every ladder, function, flow and target row, and for leadership, ownership, policies and pay ratio, so a reader can find it again.
- **Empty is an answer:** if the company reports no finer levels or no functions, leave the list with only the BRSR levels, or empty for functions. That is a finding, not a failure.
- **No guessing:** never fill one table from another. If a table is split across pages or a row is ambiguous, read what you can and say so in `notes`.
