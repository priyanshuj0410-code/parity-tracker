import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { DATA_API_FILES, buildManifest, buildSummary, companyFile } from './src/feeds/data-api.ts'
import { SPOT_SCHEMA, buildSpot, checkSpot, mergeSpot, type SpotItem } from './src/feeds/spot.ts'

const readJson = (path: string) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'))

/**
 * Spot the Stereotype's feed (PARITY-52), rebuilt from the site's data on every build and served at
 * /feeds/spot/v1.json. The release holds every item ever published (src/feeds/spot-v1.json, approved at
 * `pnpm data publish`), so the build stops if the data or this code would change an item without that review.
 */
const spotFeed = (): Plugin => ({
  name: 'nivel-spot-feed',
  apply: 'build',
  generateBundle() {
    const { items: current, skipped } = buildSpot({ indexes: readJson('./src/data/indexes.json'), companies: readJson('./src/data/companies.json') })
    for (const s of skipped) this.warn(`Spot feed leaves out ${s}`)
    const published: SpotItem[] = readJson('./src/feeds/spot-v1.json')
    const { items, changes } = mergeSpot(current, published)
    const problems = checkSpot(items)
    if (problems.length) this.error(`Spot feed problems:\n  ${problems.join('\n  ')}`)
    if (changes.length) this.error(`Spot feed differs from the release's:\n  ${changes.join('\n  ')}\nCheck the items, then pnpm data publish --approve-feed and promote the release.`)
    const feed = { kind: 'nivel-spot-feed', version: 1, generatedAt: new Date().toISOString(), dataAsOf: readJson('./src/data/release.json').collected, items }
    this.emitFile({ type: 'asset', fileName: 'feeds/spot/v1.json', source: JSON.stringify(feed, null, 2) + '\n' })
    this.emitFile({ type: 'asset', fileName: 'feeds/spot/v1.schema.json', source: JSON.stringify(SPOT_SCHEMA, null, 2) + '\n' })
  },
})

/**
 * The public data API at /data/v1/ (src/feeds/data-api.ts): the release's files, a summary, one file per index
 * and per company, and a manifest. The app reads the per-company files too, for a company page's first paint.
 */
const dataApi = (): Plugin => ({
  name: 'nivel-data-api',
  apply: 'build',
  generateBundle() {
    const files: Record<string, string> = Object.fromEntries(DATA_API_FILES.map((n) => [n, readFileSync(new URL(`./src/data/${n}.json`, import.meta.url), 'utf8')]))
    files.summary = JSON.stringify(buildSummary(JSON.parse(files.markets), JSON.parse(files.indexes)))
    const meta = Object.fromEntries(Object.entries(files).map(([n, t]) => [n, { bytes: Buffer.byteLength(t), sha256: createHash('sha256').update(t).digest('hex') }]))
    for (const [n, t] of Object.entries(files)) this.emitFile({ type: 'asset', fileName: `data/v1/${n}.json`, source: t })
    for (const [id, ix] of Object.entries(JSON.parse(files.indexes))) this.emitFile({ type: 'asset', fileName: `data/v1/indexes/${id}.json`, source: JSON.stringify(ix) })
    for (const [symbol, c] of Object.entries(JSON.parse(files.companies))) this.emitFile({ type: 'asset', fileName: `data/v1/companies/${companyFile(symbol)}.json`, source: JSON.stringify(c) })
    this.emitFile({ type: 'asset', fileName: 'data/v1/manifest.json', source: JSON.stringify(buildManifest(readJson('./src/data/release.json'), meta), null, 2) + '\n' })
  },
})

/** Preload the first stage's data (indexes and simulations), so it downloads alongside the code. Companies follow once the page is up. */
const preloadData = (): Plugin => ({
  name: 'nivel-preload-data',
  apply: 'build',
  transformIndexHtml: {
    order: 'post',
    handler: (_html, ctx) =>
      Object.values(ctx.bundle ?? {})
        .filter((f) => f.type === 'asset' && /^assets\/(indexes|simulations)-[\w-]+\.json$/.test(f.fileName))
        .map((f) => ({ tag: 'link', attrs: { rel: 'preload', href: `/${f.fileName}`, as: 'fetch', type: 'application/json', crossorigin: '' }, injectTo: 'head' as const })),
  },
})

// https://vite.dev/config/
export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react(), preloadData(), ...(isSsrBuild ? [] : [spotFeed(), dataApi()])],
  build: { copyPublicDir: !isSsrBuild },
}))
