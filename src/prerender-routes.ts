import { BASIS, marketName, pointOf } from './lib/compare'
import { INDEX_ORDER, companies, indexMarket, indexes, loadAll, marketOf, simulations, type Core } from './lib/data'
import type { Company } from './types'
import { companyFile } from './feeds/data-api'
import { pct } from './lib/format'
import { href } from './lib/paths'
import { COMPANY_TABS, COMPARE_TABS, INDEX_TABS } from './lib/tabs'

/** Every page's title and description, for link previews; publish stores them for the page function (decision 0014). `file`: a company page's data file. */
export interface PageMeta { path: string; title: string; description: string; file?: string }

const COMPARE: Record<string, string> = {
  countries: "Every market and index on two scales: women's share of staff, and women's pay as a share of men's.",
  sectors: "Employment parity, wage parity and women's share of pay by sector, in every market.",
  map: 'Every company placed by employment parity and wage parity, from their own filings.',
}

const dated = (label: string) => (label === 'latest' ? '' : label)

/** Every page's title and description for a release, so a shared link previews with that page's own figures. Publish passes the release in. */
export function pages(core: Core, all: Record<string, Company>): PageMeta[] {
  loadAll(core, all)
  const out: PageMeta[] = [
    { path: href('companies'), title: 'Companies', description: `Women's share of pay at ${Object.keys(companies).length} companies across ${INDEX_ORDER.length} indexes, from their own filings.` },
    { path: href('method'), title: 'Method', description: "How Nivel measures women's share of the payroll you own, and its limits." },
    { path: href('play'), title: 'Play', description: "Guess three figures from companies' own gender pay filings, then play Spot the Stereotype's workplace set." },
    // Markets (PARITY-44). A market's id travels as ?id= on /market, since ids are not in the release's page list.
    { path: href('market'), title: 'Forecast', description: "Forecast women's pay and work figures with Feathers, Nivel's play money. Adults only." },
    { path: href('wallet'), title: 'Your Feathers', description: "Your Feathers: Nivel's play money, earned and never bought or cashed out." },
    { path: href('console'), title: 'Markets console', description: "The owner's console for Nivel's forecasts." },
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
  for (const s of Object.values(simulations)) {
    const parent = indexes[s.parent].name
    out.push({
      path: href('simulation', s.id),
      title: `${s.name}, a simulation`,
      description: `Fictional index: the 50 largest Nifty 500 companies paying women at least the ${parent}'s share, ${pct(s.bar)}. Lowest holding ${pct(s.headline.lowest.w)}, against ${pct(s.headline.parentLowest.w)} in the ${parent}. Not investable.`,
    })
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
    const file = companyFile(c.symbol)
    for (const [t, label] of COMPANY_TABS) {
      out.push({ path: t === 'overview' ? href('company', c.symbol) : href('company', c.symbol, t), title: t === 'overview' ? c.name : `${c.name} · ${label}`, description, file })
    }
  }
  return out
}
