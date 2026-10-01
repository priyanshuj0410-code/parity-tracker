export type MarketStatus = 'live' | 'planned' | 'limited'

export interface Market {
  market: string
  status: MarketStatus
  source: string
  required: string
  indexes: string
}

export const MARKETS: Market[] = [
  {
    market: 'India',
    status: 'live',
    source: 'SEBI BRSR filings (XBRL, via NSE)',
    required: 'Women\'s share of total wages, headcount by gender, board composition. Top 1,000 listed companies.',
    indexes: 'Nifty 50, BSE Sensex, Nifty Next 50',
  },
  {
    market: 'United Kingdom',
    status: 'live',
    source: 'Government gender pay gap service',
    required: 'Mean and median hourly pay gap, women in each pay quartile. Employers with 250+ staff.',
    indexes: 'FTSE 100',
  },
  {
    market: 'Japan',
    status: 'planned',
    source: 'Annual securities reports (EDINET)',
    required: 'Women\'s average pay as a share of men\'s, women in management. Employers with 301+ regular staff.',
    indexes: 'Nikkei 225',
  },
  {
    market: 'Australia',
    status: 'planned',
    source: 'Workplace Gender Equality Agency',
    required: 'Employer gender pay gaps and pay-quartile composition. Employers with 100+ staff.',
    indexes: 'S&P/ASX 200',
  },
  {
    market: 'European Union',
    status: 'planned',
    source: 'CSRD sustainability statements (ESRS S1); pay transparency reports from 2027',
    required: 'Gender pay gap and headcount by gender for companies in scope.',
    indexes: 'Euro Stoxx 50',
  },
  {
    market: 'United States',
    status: 'limited',
    source: 'Proxy statements, voluntary EEO-1 reports',
    required: 'No gender pay or workforce disclosure is required. Board composition only, plus what companies volunteer.',
    indexes: 'S&P 500, Dow Jones',
  },
]
