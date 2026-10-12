/**
 * Nivel's public data API, version 1: the live release's data at stable URLs under /data/v1/, for Spot the
 * Stereotype, SwipeEd and anyone else. Contract: knowledge/reference/data-api-v1.md. Within v1, changes are
 * additive only; anything that removes, renames or redefines a field ships as /data/v2/.
 */
import type { IndexData } from '../types.ts'
import { SITE } from './spot.ts'

/** A company's file name under /data/v1/companies/: characters outside A-Z, a-z, 0-9, dot and hyphen become _ and their hex code (M&M is M_26M). */
export const companyFile = (symbol: string): string => symbol.replace(/[^A-Za-z0-9.-]/g, (ch) => '_' + ch.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0'))

/** The release's files, served as they are. */
export const DATA_API_FILES = ['markets', 'indexes', 'companies', 'sectors', 'funds', 'simulations', 'logos'] as const

interface MarketRecord { code: string; name: string; status: string; latest?: string; prev?: string; yearStyle?: 'fy' | 'plain'; flagship?: string; indexes?: string[] }

/** Each live market's shown indexes in their latest year: the small file most apps need. A change the method holds back is null. */
export function buildSummary(markets: Record<string, MarketRecord>, indexes: Record<string, IndexData>) {
  return Object.values(markets).filter((m) => m.status === 'live').map((m) => {
    const year = m.latest!
    return {
      market: m.code,
      name: m.name,
      year,
      yearLabel: m.yearStyle === 'fy' ? 'FY' + year.slice(-2) : year,
      flagship: m.flagship,
      indexes: m.indexes!.map((id) => {
        const ix = indexes[id], y = ix.years[year], ch = m.prev ? ix.yoy[`${m.prev}>${year}`] : undefined
        return {
          id,
          name: ix.name,
          headline: y.headline,
          companiesCovered: y.companiesCovered ?? null,
          constituents: ix.constituents.length,
          sinceLastYear: ch && ch.shown !== false ? {
            from: ch.from, to: ch.to, change: ch.change, companies: ch.companies,
            ...(ch.interval && { interval: ch.interval }),
            ...(ch.distinguishable != null && { distinguishable: ch.distinguishable }),
          } : null,
          url: `${SITE}/index/${id}`,
        }
      }),
    }
  })
}

export function buildManifest(release: { id: string; collected: string }, files: Record<string, { bytes: number; sha256: string }>) {
  return {
    api: 'nivel-data',
    version: 1,
    release: release.id,
    collected: release.collected,
    generatedAt: new Date().toISOString(),
    attribution: "Nivel by The Equal Lens, from companies' own gender pay filings. Link the Nivel page a figure comes from.",
    files: Object.fromEntries(Object.entries(files).map(([name, f]) => [name, { url: `${SITE}/data/v1/${name}.json`, ...f }])),
  }
}
