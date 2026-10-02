import { BASIS, marketName, pointOf } from './lib/compare'
import { INDEX_ORDER, companies, indexMarket, indexes, marketOf } from './lib/data'
import { pct } from './lib/format'
import { href } from './lib/paths'
import { COMPANY_TABS, COMPARE_TABS, INDEX_TABS } from './lib/tabs'

export interface PageMeta { path: string; title: string; description: string }

const COMPARE: Record<string, string> = {
  countries: "Every market and index on the same two scales: how many women companies employ, and how women's pay compares with men's.",
  sectors: "Employment parity, wage parity and women's share of pay by sector, in every market.",
  map: 'Every company placed by employment parity and wage parity, from their own filings.',
}

const dated = (label: string) => (label === 'latest' ? '' : label)

/** Every page the build writes as its own HTML file, so a shared link previews with that page's title and figures. */
export function pages(): PageMeta[] {
  const out: PageMeta[] = [
    { path: href('companies'), title: 'Companies', description: `Women's share of pay at all ${Object.keys(companies).length} companies in the ${INDEX_ORDER.length} indexes Nivel tracks, from their own filings.` },
    { path: href('method'), title: 'Method', description: "How Nivel turns companies' own gender pay disclosures into women's share of the payroll you own, and what the numbers cannot tell you." },
  ]
  for (const [id, label] of COMPARE_TABS) {
    out.push({ path: id === 'countries' ? href('compare') : href('compare', id), title: `Compare · ${label}`, description: COMPARE[id] })
  }
  for (const id of INDEX_ORDER) {
    const ix = indexes[id]
    const m = indexMarket(ix)
    const when = dated(m.label(m.latest))
    const description = `${m.headlineLabel} in the ${ix.name}${when ? `, ${when}` : ''}: ${pct(ix.years[m.latest].headline)}. Parity is ${pct(m.parity, 0)}. Every company's figures, from their own filings.`
    for (const [t, label] of INDEX_TABS) {
      out.push({ path: t === 'overview' ? href('index', id) : href('index', id, t), title: t === 'overview' ? ix.name : `${ix.name} · ${label}`, description })
    }
  }
  for (const c of Object.values(companies)) {
    const m = marketOf(c)
    const year = c.years[m.latest] ? m.latest : m.prev && c.years[m.prev] ? m.prev : undefined
    const p = pointOf(c.symbol)
    const facts = [
      year && c.years[year].w != null && `women's share of pay ${pct(c.years[year].w)}${dated(m.label(year)) ? ` (${m.label(year)})` : ''}`,
      p?.e != null && `employment parity ${pct(p.e)}`,
      p?.w != null && `wage parity ${BASIS[c.country]?.approx ? 'about ' : ''}${pct(p.w)}`,
    ].filter(Boolean)
    const description = facts.length
      ? `${c.name}, ${marketName(c.country)}: ${facts.join(', ')}. From the company's own filings.`
      : `${c.name}, ${marketName(c.country)}: no usable gender pay figures yet.${c.noDataReason ? ` ${c.noDataReason}` : ''}`
    for (const [t, label] of COMPANY_TABS) {
      out.push({ path: t === 'overview' ? href('company', c.symbol) : href('company', c.symbol, t), title: t === 'overview' ? c.name : `${c.name} · ${label}`, description })
    }
  }
  return out
}
