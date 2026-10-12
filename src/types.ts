export type WageKind = 'reported' | 'estimated' | null

export interface CompanyYear {
  w: number | null
  wKind: WageKind
  fPerm: number | null
  fAll: number | null
  permHeadcount: number | null
  headcount: number | null
  board: number | null
  boardWomen: number | null
  payrollCr: number | null
  dq: number
  note: string
  boundary: string
  basisChange?: boolean
  topQuartile?: number | null
  gapMean?: number | null
  gapMedian?: number | null
  bonusGapMean?: number | null
  entityCount?: number
  ratioRegular?: number | null
  ratioNonRegular?: number | null
  managerShare?: number | null
  boardShareReported?: number | null
  headcountWomen?: number
  headcountMen?: number
  period?: string
  asOf?: string
  updated?: string
  /** Japan: the day the labour ministry's open data was downloaded (YYYY-MM-DD). */
  downloaded?: string
  /** Figures taken from the company's own reports because the statutory source has none for them (decision 0015). */
  reportSources?: ReportSource[]
  /** India: the company's own finer levels (senior, middle, junior management, grades) and job functions, by gender. */
  levels?: LevelRow[]
  functions?: LevelRow[]
  /** India: permanent employees, permanent workers and key managerial personnel by gender (BRSR A-20 and the KMP row). */
  staff?: Partial<Record<'employees' | 'workers' | 'kmp', { women: number; men: number }>>
  /** Decision 0020: the figure as first filed, when a later filing restated it; `w` is the restated figure. */
  wFiled?: number
  /** The year whose filing restated this one. */
  restatedIn?: string
  /** The restating filing's own words. */
  restatedNote?: string
  /** A figure under an open data check: shown, but no insight is drawn from it until it is settled. */
  held?: boolean
}

/** One level or job function as the company reports it: its own label, the standard it maps to, and women's share (0 to 1). */
export interface LevelRow {
  level?: string
  function?: string
  standard?: string | null
  women?: number
  men?: number
  share?: number
  /** Who the row covers when it is not all staff ("permanent employees", "new hires"). */
  scope?: string
  /** Where the company reports it, with the page. */
  where?: string
}

/** One company document a year's figures were read from; `fields` names which figures (gapMean, fAll, fPerm, ratio). */
export interface ReportSource {
  title: string
  url: string
  page?: number | null
  fields: string[]
  /** Who the figures cover, in plain words ("the whole group, worldwide", "the listed company's regular staff"). */
  scope: string
}

export interface Entity {
  name: string
  size: string
  link: string
}

export interface Filing {
  xbrl: string
  pdf: string
  submitted: string
  /** India, without an NSE XBRL file: where the BRSR PDF is ('annualReport' when it sits inside the annual report). */
  kind?: 'exchange' | 'website' | 'annualReport'
}

export interface Company {
  symbol: string
  name: string
  industry: string
  exchange: string
  country: string
  indexes: string[]
  noDataReason?: string | null
  entities?: Entity[]
  entitiesYear?: string
  marketCapCr: number | null
  publicFloatPct: number | null
  years: Record<string, CompanyYear>
  filings: Record<string, Filing>
  payrollWeightCr: number | null
  payrollWeightBasis: string | null
  isin?: string | null
  cin?: string | null
  /** The company's former name, when it changed. */
  formerly?: string
  /** India: why the latest figure is not the market's latest year ("No FY26 BRSR filed", "Merged into …"). */
  latestNote?: string
}

export interface Sector {
  industry: string
  w: number
  payrollShare: number | null
  companies: number
}

export interface IndexYear {
  headline: number
  ownedPayroll: number | null
  womenWages: number | null
  gap: number | null
  representationShare: number | null
  payShare: number | null
  companiesCovered: number
  companiesReported: number
  reportedPayrollShare: number
  sectors: Sector[]
  workforce?: number | null
  topQuartile?: number | null
  gapMean?: number | null
  managers?: number | null
  boards?: number | null
  ratioRegular?: number | null
  payRatio?: number | null
  payRatioCompanies?: number
  verified?: number
  excluded?: number
  unresolved?: number
  /** A group (kind 'group'): its payroll is all its companies' payroll, and missing reports are handled by decision 10. */
  carryForwardHeadline?: number
  /** The year's own pooled figure; `headline` is chained from the latest year by the like-for-like changes. */
  pooledHeadline?: number
  /** Filers queued but not read yet, so in no figure. */
  companiesUnread?: number
  companiesCarried?: number
  companiesEstimated?: number
  companiesUncovered?: number
  companiesWithoutPayroll?: number
  carriedPayrollShare?: number
  estimatedPayrollShare?: number
  weightEstimatedPayrollShare?: number
  staffWithPayrollShare?: number | null
  medianCompany?: { w: number | null; fPerm: number | null }
}

export interface Yoy {
  from: number
  to: number
  change: number
  companies: number
  /** A group's change: a bootstrap range, whether it differs from zero, and whether it is published at all. */
  interval?: [number, number]
  distinguishable?: boolean
  shown?: boolean
  carriedTop10?: string[]
  carriedIndustries?: string[]
  basisChanges?: number
  staffChange?: number | null
  staffCompanies?: number
  staffBasisChanges?: number
}

export interface IndexData {
  id: string
  name: string
  country: string
  market: string
  exchange: string
  weightsAsOf: string
  weighting: string
  constituents: { symbol: string; weight: number | null }[]
  missing: string[]
  years: Record<string, IndexYear>
  yoy: Record<string, Yoy>
  /** 'group': every filer, weighted by its own payroll, held by no fund (India's All BRSR filers). */
  kind?: 'group'
  /** Overrides the market's headline label. */
  headlineLabel?: string
  /** Companies that left a group: merged, delisted or insolvent. */
  left?: string[]
}

export interface SimHolding { symbol: string; sector: string; w: number; e: number | null; sim: number; parent: number }

/** A member of the real index that the simulation leaves out: below the bar, or without usable figures. */
export interface SimLeft { symbol: string; sector: string; w: number | null; parent: number; reason: 'below' | 'noData' }


/** A fictional index shown as a simulation (pipeline/equal50/export_parity50.py). Every holding clears a bar set at the real index's own level. */
export interface Simulation {
  id: string
  name: string
  parent: string
  version: number
  asOf: string
  dataYear: string
  bar: number
  eligible: number
  at25: number
  headline: {
    payroll: number
    parentPayroll: number
    pay: number
    parentPay: number
    staff: number
    parentStaff: number
    lowest: { symbol: string; w: number }
    parentLowest: { symbol: string; w: number }
  }
  years: { year: string; bar: number; eligible: number; payroll: number; parentPayroll: number }[]
  out: { companies: number; weight: number; kept: number; activeShare: number; sectors: { sector: string; weight: number }[] }
  sectors: { sector: string; sim: number; parent: number }[]
  holdings: SimHolding[]
  left: SimLeft[]
  nearParity: { count: number; of: number }
}
