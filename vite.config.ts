import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { SPOT_SCHEMA, buildSpot, checkSpot, mergeSpot, type SpotItem } from './src/feeds/spot.ts'
import { SOURCE_ISO } from './src/lib/source.ts'

const readJson = (path: string) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'))
const SPOT_PUBLISHED = new URL('./src/feeds/spot-v1.json', import.meta.url)

/**
 * Spot the Stereotype's feed (PARITY-52), rebuilt from the site's data on every build and served at
 * /feeds/spot/v1.json. Every item ever published lives in src/feeds/spot-v1.json, so a changed, new or
 * retired item stops the build until someone reviews it and records it with SPOT_FEED_WRITE=1.
 */
const spotFeed = (): Plugin => ({
  name: 'nivel-spot-feed',
  apply: 'build',
  generateBundle() {
    const { items: current, skipped } = buildSpot({ indexes: readJson('./src/data/indexes.json'), companies: readJson('./src/data/companies.json') })
    for (const s of skipped) this.warn(`Spot feed leaves out ${s}`)
    const published: SpotItem[] = existsSync(SPOT_PUBLISHED) ? JSON.parse(readFileSync(SPOT_PUBLISHED, 'utf8')) : []
    const { items, changes } = mergeSpot(current, published)
    const problems = checkSpot(items)
    if (problems.length) this.error(`Spot feed problems:\n  ${problems.join('\n  ')}`)
    if (changes.length) {
      if (!process.env.SPOT_FEED_WRITE) this.error(`Spot feed changed:\n  ${changes.join('\n  ')}\nCheck the items, then run SPOT_FEED_WRITE=1 pnpm build and commit src/feeds/spot-v1.json.`)
      writeFileSync(SPOT_PUBLISHED, JSON.stringify(items, null, 2) + '\n')
    }
    const feed = { kind: 'nivel-spot-feed', version: 1, generatedAt: new Date().toISOString(), dataAsOf: SOURCE_ISO, items }
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
