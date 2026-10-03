import { readFileSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
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

/** Preload the hashed data files, so they download alongside the code instead of after it. */
const preloadData = (): Plugin => ({
  name: 'nivel-preload-data',
  apply: 'build',
  transformIndexHtml: {
    order: 'post',
    handler: (_html, ctx) =>
      Object.values(ctx.bundle ?? {})
        .filter((f) => f.type === 'asset' && /^assets\/(companies|indexes|simulations)-[\w-]+\.json$/.test(f.fileName))
        .map((f) => ({ tag: 'link', attrs: { rel: 'preload', href: `/${f.fileName}`, as: 'fetch', type: 'application/json', crossorigin: '' }, injectTo: 'head' as const })),
  },
})

// https://vite.dev/config/
export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react(), preloadData(), ...(isSsrBuild ? [] : [spotFeed()])],
  build: { copyPublicDir: !isSsrBuild },
}))
