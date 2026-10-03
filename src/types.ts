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
}

export interface Yoy {
  from: number
  to: number
  change: number
  companies: number
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
