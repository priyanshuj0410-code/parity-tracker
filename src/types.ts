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
