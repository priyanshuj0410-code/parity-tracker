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
  indexes: string[]
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
  payrollShare: number
  companies: number
}

export interface IndexYear {
  headline: number
  ownedPayroll: number
  womenWages: number
  gap: number
  representationShare: number | null
  payShare: number | null
  companiesCovered: number
  companiesReported: number
  reportedPayrollShare: number
  sectors: Sector[]
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
  market: string
  exchange: string
  weightsAsOf: string
  weighting: string
  constituents: { symbol: string; weight: number }[]
  missing: string[]
  years: Record<string, IndexYear>
  yoy: Record<string, Yoy>
}
