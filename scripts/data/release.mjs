/**
 * Releases: publish freezes Firestore's records into a staging release, with every file the site and the public
 * API serve; promote points the live channel at it; rollback returns to the release before. The site reads the
 * live release at request time, so nothing is rebuilt (decisions 0011 and 0014).
 */
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir, userInfo } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { DATA_API_FILES, buildManifest, buildSummary, companyFile } from '../../src/feeds/data-api.ts'
import { SITE, SPOT_SCHEMA, buildSpot, checkSpot, mergeSpot } from '../../src/feeds/spot.ts'
import { blobId, commit, get, getMany, list, readRelease } from './firestore.mjs'
import { input } from './inputs.mjs'
import * as site from './site.mjs'

const DATA = 'src/data'
const SPOT = 'src/feeds/spot-v1.json'
const BLOB_BYTES = 900_000
const LOGO_BUCKETS = 16
const pct = (v) => (v == null ? 'n/a' : `${(v * 100).toFixed(2)}%`)
const pts = (v) => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(2)} pts`
const few = (a, n = 8) => a.slice(0, n).join(', ') + (a.length > n ? `, and ${a.length - n} more` : '')
const sortKeys = (o) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))

function releaseId(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
}

/** Text in pieces under Firestore's 1 MiB field limit, never splitting a character. */
function pieces(text) {
  const out = []
  for (let i = 0; i < text.length;) {
    let n = Math.min(BLOB_BYTES, text.length - i)
    while (Buffer.byteLength(text.slice(i, i + n)) > BLOB_BYTES) n = Math.floor(n * 0.9)
    const last = text.charCodeAt(i + n - 1)
    if (i + n < text.length && last >= 0xd800 && last <= 0xdbff) n--
    out.push(text.slice(i, i + n))
    i += n
  }
  return out
}

/** Problems that stop a release: records the app could not render, or that point at nothing. */
function check({ companies, indexes, markets, logoMap, logoFiles }) {
  const problems = []
  const live = Object.fromEntries(Object.entries(markets).filter(([, m]) => m.status === 'live'))
  for (const [key, c] of Object.entries(companies)) {
    const missing = ['symbol', 'name', 'country', 'industry', 'indexes', 'years'].filter((f) => c[f] == null)
    if (missing.length) problems.push(`company ${key}: no ${missing.join(', ')}`)
    if (c.symbol !== key) problems.push(`company ${key}: symbol is ${c.symbol}`)
    const m = live[c.country]
    if (!m) { problems.push(`company ${key}: market ${c.country} is not live`); continue }
    const odd = Object.keys(c.years ?? {}).filter((y) => !m.years.includes(y))
    if (odd.length) problems.push(`company ${key}: years ${odd} are not ${c.country} years`)
    for (const [y, v] of Object.entries(c.years ?? {})) if (v.w != null && !(v.w >= 0 && v.w <= 1)) problems.push(`company ${key} ${y}: share of pay ${v.w}`)
    for (const id of c.indexes ?? []) if (!indexes[id]) problems.push(`company ${key}: index ${id} does not exist`)
  }
  for (const [id, ix] of Object.entries(indexes)) {
    if (ix.id !== id) problems.push(`index ${id}: id is ${ix.id}`)
    if (!live[ix.country]) problems.push(`index ${id}: market ${ix.country} is not live`)
    const absent = ix.constituents.filter((k) => !companies[k.symbol]).map((k) => k.symbol)
    if (absent.length) problems.push(`index ${id}: no company records for ${few(absent)}`)
  }
  for (const m of Object.values(live)) {
    if (!m.years.includes(m.latest) || (m.prev && !m.years.includes(m.prev))) problems.push(`market ${m.code}: latest or previous year not in its years`)
    if (!m.indexes.includes(m.flagship)) problems.push(`market ${m.code}: flagship ${m.flagship} is not one of its indexes`)
    for (const id of m.indexes) {
      if (indexes[id]?.country !== m.code) problems.push(`market ${m.code}: index ${id} missing or in another market`)
      else if (!indexes[id].years[m.latest]) problems.push(`market ${m.code}: index ${id} has no ${m.latest} figures`)
    }
  }
  const absentLogos = [...new Set(Object.values(logoMap))].filter((f) => !logoFiles.has(f))
  if (absentLogos.length) problems.push(`logos: map names files with no logo record: ${few(absentLogos)}`)
  return problems
}

/** What a reader would notice against the live release: companies, figures, coverage and headlines. */
function report({ companies, indexes, markets }, base) {
  const lines = []
  const latestW = (c) => c?.years[markets[c.country]?.latest]?.w ?? null
  for (const m of Object.values(markets).filter((x) => x.status === 'live')) {
    const mine = Object.keys(companies).filter((k) => companies[k].country === m.code)
    const out = [`${m.name}: ${mine.length} companies`]
    if (base) {
      const was = Object.keys(base.companies).filter((k) => base.companies[k].country === m.code)
      const added = mine.filter((k) => !base.companies[k]), removed = was.filter((k) => !companies[k])
      const gained = mine.filter((k) => latestW(companies[k]) != null && latestW(base.companies[k]) == null)
      const lost = was.filter((k) => latestW(base.companies[k]) != null && latestW(companies[k]) == null)
      const moved = mine.filter((k) => latestW(companies[k]) != null && latestW(base.companies[k]) != null && latestW(companies[k]) !== latestW(base.companies[k]))
      if (added.length) out.push(`  added: ${few(added)}`)
      if (removed.length) out.push(`  removed: ${few(removed)}`)
      if (gained.length) out.push(`  gained a ${m.latest} share of pay: ${few(gained)}`)
      if (lost.length) out.push(`  lost their ${m.latest} share of pay: ${few(lost)}`)
      if (moved.length) out.push(`  share of pay changed: ${few(moved)}`)
    }
    for (const id of m.indexes) {
      const ix = indexes[id], y = ix.years[m.latest]
      const old = base?.indexes[id]?.years[m.latest]
      const covered = (v) => v?.companiesCovered ?? v?.companiesReported
      let line = `  ${ix.name}: ${pct(y.headline)} from ${covered(y)} of ${ix.constituents.length}`
      if (old && (old.headline !== y.headline || covered(old) !== covered(y))) {
        line += ` (was ${pct(old.headline)} from ${covered(old)} of ${base.indexes[id].constituents.length})`
        if (id === m.flagship && old.headline != null && y.headline != null) {
          const movers = ix.constituents
            .map((k) => ({ s: k.symbol, d: (latestW(companies[k.symbol]) ?? 0) - (latestW(base.companies[k.symbol]) ?? 0) }))
            .filter((x) => x.d !== 0).sort((a, b) => Math.abs(b.d) - Math.abs(a.d)).slice(0, 5)
          line += `; headline ${pts(y.headline - old.headline)}, behind it: ${movers.map((x) => `${x.s} ${pts(x.d)}`).join(', ') || 'index weights'}`
        }
      }
      out.push(line)
    }
    lines.push(...out)
  }
  return lines
}

/**
 * Every page's title and description, worked out by the app's own code (src/prerender-routes.ts) from the
 * assembled release, for the page function (api/page.js). Company tabs share their company's entry.
 */
async function pageMeta(core, companies) {
  execFileSync('npx', ['vite', 'build', '--ssr', 'src/prerender-routes.ts', '--outDir', 'node_modules/.prerender', '--logLevel', 'error'], { stdio: 'inherit' })
  const { pages } = await import(`${pathToFileURL('node_modules/.prerender/prerender-routes.js')}?t=${Date.now()}`)
  const out = { tabs: {}, paths: {}, companies: {} }
  for (const p of pages(core, companies)) {
    const path = p.path.split('/').map(decodeURIComponent).join('/')   // keys decoded: M&M, not M%26M
    const m = path.match(/^\/company\/([^/]+)(?:\/([^/]+))?$/)
    if (!m) out.paths[path] = [p.title, p.description]
    else if (m[2]) out.tabs[m[2]] = p.title.slice(p.title.lastIndexOf(' · ') + 3)
    else out.companies[m[1]] = [p.title, p.description, p.file]
  }
  return out
}

export async function publish({ collected, approveFeed = false }) {
  const id = releaseId()
  const [companyDocs, indexDocs, marketDocs, logoDocs, datasets, feed, liveChannel, staging, sectorOverrides, euHeadcount] = await Promise.all([
    list('companies'), list('indexes'), list('markets'), list('logos'),
    getMany(['datasets/funds', 'datasets/simulations', 'datasets/logos']), get('feeds/spot-v1'), get('channels/live'), get('channels/staging'),
    input('sector_overrides.json'), input('eu/eu_headcount.json'),
  ])
  const parse = (docs) => sortKeys(Object.fromEntries(docs.map((d) => [d.id, JSON.parse(d.json)])))
  const markets = Object.fromEntries(Object.entries(parse(marketDocs)).sort(([, a], [, b]) => a.order - b.order))
  const data = {
    companies: parse(companyDocs), indexes: parse(indexDocs), markets,
    funds: JSON.parse(datasets[0].json), simulations: JSON.parse(datasets[1].json), logos: JSON.parse(datasets[2].json),
  }
  const base = liveChannel && await readRelease(liveChannel.release, { only: (p) => [`${DATA}/companies.json`, `${DATA}/indexes.json`, `${DATA}/release.json`].includes(p) })
  collected ??= base && JSON.parse(base.files[`${DATA}/release.json`]).collected
  if (!/^\d{4}-\d{2}-\d{2}$/.test(collected ?? '')) throw new Error('Give the day the figures were collected: --collected YYYY-MM-DD')

  const problems = check({ ...data, logoMap: data.logos, logoFiles: new Set(logoDocs.map((d) => d.id)) })

  const dir = mkdtempSync(join(tmpdir(), 'nivel-release-'))
  for (const [name, value] of Object.entries(data)) writeFileSync(join(dir, `${name}.json`), JSON.stringify(value))
  writeFileSync(join(dir, 'sector_overrides.json'), sectorOverrides)
  writeFileSync(join(dir, 'eu_headcount.json'), euHeadcount)
  execFileSync('python3', ['pipeline/shared_scale.py', dir], { stdio: ['ignore', 'ignore', 'inherit'] })
  execFileSync('python3', ['pipeline/sectors.py', dir], { stdio: ['ignore', 'ignore', 'inherit'] })
  const read = (name) => readFileSync(join(dir, `${name}.json`), 'utf8')
  const companies = JSON.parse(read('companies')), indexes = JSON.parse(read('indexes'))

  const { items: current, skipped } = buildSpot({ indexes, companies })
  const { items: spot, changes: feedChanges } = mergeSpot(current, JSON.parse(feed.json))
  problems.push(...checkSpot(spot).map((p) => `spot feed: ${p}`))
  if (feedChanges.length && !approveFeed) problems.push(`spot feed changed; check these, then publish again with --approve-feed:\n    ${feedChanges.join('\n    ')}`)
  if (problems.length) {
    rmSync(dir, { recursive: true })
    throw new Error(`Release not published. ${problems.length} problem(s):\n  ${problems.join('\n  ')}`)
  }

  const files = {}
  for (const name of ['companies', 'indexes', 'markets', 'funds', 'simulations', 'logos', 'sectors']) files[`${DATA}/${name}.json`] = read(name)
  files[`${DATA}/release.json`] = JSON.stringify({ id, collected })
  files[SPOT] = JSON.stringify(spot, null, 2) + '\n'
  // What the site serves (decision 0014): the public API, the app's first file, page titles, the Spot feed.
  for (const name of DATA_API_FILES) files[`v1/${name}.json`] = read(name)
  files['v1/summary.json'] = JSON.stringify(buildSummary(markets, indexes))
  for (const [ix, value] of Object.entries(indexes)) files[`v1/indexes/${ix}.json`] = JSON.stringify(value)
  for (const [symbol, value] of Object.entries(companies)) files[`v1/companies/${companyFile(symbol)}.json`] = JSON.stringify(value)
  const meta = Object.fromEntries(Object.entries(files).filter(([p]) => /^v1\/[a-z]+\.json$/.test(p))
    .map(([p, text]) => [p.slice(3, -5), { bytes: Buffer.byteLength(text), sha256: createHash('sha256').update(text).digest('hex') }]))
  files['v1/manifest.json'] = JSON.stringify(buildManifest({ id, collected }, meta), null, 2) + '\n'
  files['app/core.json'] = JSON.stringify({ release: { id, collected }, markets, indexes, simulations: data.simulations, sectors: JSON.parse(read('sectors')), logos: data.logos })
  files['app/pages.json'] = JSON.stringify(await pageMeta(JSON.parse(files['app/core.json']), companies))
  files['feeds/spot/v1.json'] = JSON.stringify({ kind: 'nivel-spot-feed', version: 1, generatedAt: new Date().toISOString(), dataAsOf: collected, items: spot }, null, 2) + '\n'
  files['feeds/spot/v1.schema.json'] = JSON.stringify(SPOT_SCHEMA, null, 2) + '\n'
  rmSync(dir, { recursive: true })

  const buckets = {}
  for (const d of logoDocs.sort((a, b) => (a.id < b.id ? -1 : 1))) {
    const b = parseInt(createHash('md5').update(d.id).digest('hex').slice(0, 2), 16) % LOGO_BUCKETS
    ;(buckets[b] ??= {})[d.id] = d.png.toString('base64')
  }

  const blobs = new Map()
  const store = (text) => pieces(text).map((p) => { const b = blobId(p); blobs.set(b, p); return b })
  const manifest = Object.fromEntries(Object.entries(files).map(([path, text]) => [path, store(text)]))
  const logoManifest = Object.fromEntries(Object.entries(buckets).map(([b, map]) => [b, store(JSON.stringify(map))]))
  // One blob per logo too, so the site can serve a single PNG without reading a whole bucket.
  const logoFiles = Object.fromEntries(logoDocs.map((d) => [d.id, store(d.png.toString('base64'))[0]]))
  const have = await getMany([...blobs.keys()].map((b) => `blobs/${b}`))
  const fresh = [...blobs].filter((_, i) => !have[i])

  const lines = report({ companies, indexes, markets }, base && { companies: JSON.parse(base.files[`${DATA}/companies.json`]), indexes: JSON.parse(base.files[`${DATA}/indexes.json`]) })
  const counts = { companies: Object.keys(companies).length, indexes: Object.keys(indexes).length, logos: logoDocs.length, spotItems: spot.length }
  const head = [
    `Release ${id}, figures collected ${collected}, against ${base ? `live release ${liveChannel.release}` : 'nothing (first release)'}`,
    `${counts.companies} companies, ${counts.indexes} indexes, ${counts.logos} logos, ${counts.spotItems} Spot items; ${fresh.length} of ${blobs.size} blobs new`,
    ...skipped.map((s) => `Spot feed leaves out ${s}`),
    ...(feedChanges.length ? [`Spot feed changes (approved): ${feedChanges.join('; ')}`] : ['Spot feed: no change']),
  ]
  const text = [...head, ...lines].join('\n')

  const writes = fresh.map(([b, p]) => ({ set: `blobs/${b}`, data: { data: p } }))
  writes.push({ set: `releases/${id}`, data: { status: 'staging', created: new Date(), by: userInfo().username, collected, base: liveChannel?.release ?? null, files: manifest, logos: logoManifest, logoFiles, counts, report: text } })
  if (staging && staging.release !== liveChannel?.release) writes.push({ update: `releases/${staging.release}`, data: { status: 'discarded' } })
  writes.push({ set: 'channels/staging', data: { release: id, updated: new Date() } })
  await commit(writes)
  console.log(text)

  // The static data site serves the new release as staging, next to the live one (decision 0016).
  site.addRelease(id, { files, logos: Object.fromEntries(logoDocs.map((d) => [d.id, d.png])), collected, status: 'staging' })
  if (liveChannel) await site.ensureRelease(liveChannel.release)
  site.setChannel('staging', { release: id, collected })
  site.prune(new Set([id, liveChannel?.release, liveChannel?.previous?.[0]].filter(Boolean)))
  site.deploy()

  const url = `${SITE}/?release=${id}`
  await commit([{ update: `releases/${id}`, data: { preview: url } }])
  console.log(`\nPreview: ${url}\nCheck it, then: pnpm data promote ${id}`)
}

export async function promote(id) {
  const [staging, live] = await Promise.all([get('channels/staging'), get('channels/live')])
  id ??= staging?.release
  if (!id) throw new Error('Nothing is staged. Run pnpm data publish first.')
  const { meta, files } = await readRelease(id, { only: (p) => p === SPOT })
  if (meta.status !== 'staging') throw new Error(`Release ${id} is ${meta.status}, not staging`)
  // The static site first: if its deploy fails, Firestore still says staging and promote can run again.
  await site.ensureRelease(id)
  site.setChannel('live', { release: id, collected: meta.collected })
  if (staging?.release === id) site.setChannel('staging', null)
  site.prune(new Set([id, live?.release, staging?.release !== id && staging?.release].filter(Boolean)))
  site.deploy()
  const writes = [
    { set: 'channels/live', data: { release: id, previous: live ? [live.release, ...(live.previous ?? [])].slice(0, 20) : [], updated: new Date() } },
    { update: `releases/${id}`, data: { status: 'live', promoted: new Date() } },
    { set: 'feeds/spot-v1', data: { json: JSON.stringify(JSON.parse(files[SPOT])), updated: new Date() } },
  ]
  if (live) writes.push({ update: `releases/${live.release}`, data: { status: 'retired' } })
  if (staging?.release === id) writes.push({ delete: 'channels/staging' })
  await commit(writes)
  console.log(`Release ${id} is live${live ? ` (was ${live.release})` : ''}. The site serves it within about three minutes, as edge caches refresh.`)
}

export async function rollback() {
  const live = await get('channels/live')
  const [back, ...rest] = live?.previous ?? []
  if (!back) throw new Error('No earlier release to return to')
  const [backRelease, staging] = await Promise.all([get(`releases/${back}`), get('channels/staging')])
  await site.ensureRelease(back)
  site.setChannel('live', { release: back, collected: backRelease.collected })
  site.prune(new Set([back, live.release, staging?.release].filter(Boolean)))
  site.deploy()
  await commit([
    { set: 'channels/live', data: { release: back, previous: rest, updated: new Date() } },
    { update: `releases/${back}`, data: { status: 'live' } },
    { update: `releases/${live.release}`, data: { status: 'rolled back' } },
  ])
  console.log(`Live release is ${back} again (${live.release} rolled back). The site follows within about three minutes.`)
}

export async function status() {
  const [live, staging] = await Promise.all([get('channels/live'), get('channels/staging')])
  for (const [name, ch] of [['live', live], ['staging', staging]]) {
    if (!ch) { console.log(`${name}: none`); continue }
    const r = await get(`releases/${ch.release}`)
    console.log(`${name}: ${ch.release}, collected ${r.collected}, published ${r.created} by ${r.by}${r.preview ? `, preview ${r.preview}` : ''}`)
    console.log(`  ${Object.entries(r.counts).map(([k, v]) => `${v} ${k}`).join(', ')}`)
  }
  if (live?.previous?.length) console.log(`rollback would return to ${live.previous[0]}`)
}
