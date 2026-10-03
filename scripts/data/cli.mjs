/**
 * pnpm data <command>: Nivel's data lives in Firestore, not in git. See knowledge/playbooks/data-backend.md.
 *
 *   load <market> <companies.json> <indexes.json> [--force]   replace one market's companies, upsert its indexes
 *   put <collection> <id> <file.json>                         store one record (markets, indexes, datasets, feeds)
 *   get <collection> <id>                                     print one record
 *   rm <collection> <id>                                      delete one record
 *   logos <dir> <logos.json>                                  sync the logo PNGs and the symbol-to-file map
 *   seed <data dir> <logos dir> <spot feed> <markets.json>    load everything from local files (first load, or a restore)
 *   verify <data dir> <logos dir> <spot feed>                 check Firestore's records match local files exactly
 */
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { commit, get, getMany, list, where } from './firestore.mjs'

const RECORDS = ['markets', 'indexes', 'datasets', 'feeds']
const DATASETS = ['funds', 'simulations']
const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'))
const md5 = (buf) => createHash('md5').update(buf).digest('hex')
const now = new Date()

/** Pipelines' output shape, as apply_market.py tidied it: UK status becomes noDataReason, the AUD payroll stays local. */
function tidy(c) {
  if ('ukStatus' in c) {
    c.noDataReason = c.ukStatus
    delete c.ukStatus
  }
  delete c.payrollAud
  return c
}

const indexList = (ix) => ('id' in ix ? [ix] : Object.values(ix))

async function load(market, companies, indexes, { force = false } = {}) {
  for (const c of Object.values(companies)) {
    tidy(c)
    if (c.country !== market) throw new Error(`${c.symbol} is ${c.country}, not ${market}`)
  }
  for (const ix of indexes) if (ix.country !== market) throw new Error(`Index ${ix.id} is ${ix.country}, not ${market}`)
  if (!(await get(`markets/${market}`))) throw new Error(`No market record for ${market}: put markets/${market} first`)

  const existing = new Map((await where('companies', 'country', market)).map((d) => [d.id, d.json]))
  const fresh = Object.keys(companies).filter((id) => !existing.has(id))
  const clash = (await getMany(fresh.map((id) => `companies/${id}`))).filter(Boolean)
  if (clash.length) throw new Error(`Already used by another market: ${clash.map((d) => `${d.id} (${d.country})`).join(', ')}`)

  const writes = [], tally = { added: [], changed: [], removed: [], same: 0 }
  for (const [id, c] of Object.entries(companies)) {
    const json = JSON.stringify(c)
    if (existing.get(id) === json) { tally.same++; continue }
    tally[existing.has(id) ? 'changed' : 'added'].push(id)
    writes.push({ set: `companies/${id}`, data: { country: market, json, updated: now } })
  }
  for (const id of existing.keys()) {
    if (id in companies) continue
    tally.removed.push(id)
    writes.push({ delete: `companies/${id}` })
  }
  if (tally.removed.length > existing.size * 0.1 && !force) {
    throw new Error(`Would remove ${tally.removed.length} of ${existing.size} ${market} companies (${tally.removed.slice(0, 8).join(', ')}…). Check the file, or rerun with --force.`)
  }

  const ixNow = await getMany(indexes.map((ix) => `indexes/${ix.id}`))
  const ixTally = []
  indexes.forEach((ix, i) => {
    const json = JSON.stringify(ix)
    if (ixNow[i]?.json === json) return
    ixTally.push(`${ix.id} (${ixNow[i] ? 'changed' : 'new'})`)
    writes.push({ set: `indexes/${ix.id}`, data: { country: market, json, updated: now } })
  })

  await commit(writes)
  const few = (a) => (a.length ? `${a.length} (${a.slice(0, 6).join(', ')}${a.length > 6 ? ', …' : ''})` : '0')
  console.log(`${market}: ${few(tally.added)} added, ${few(tally.changed)} changed, ${few(tally.removed)} removed, ${tally.same} unchanged; indexes ${ixTally.join(', ') || 'unchanged'}`)
}

async function put(collection, id, value) {
  if (!RECORDS.includes(collection)) throw new Error(`put takes ${RECORDS.join(', ')}; companies go through load`)
  const json = JSON.stringify(value)
  if ((await get(`${collection}/${id}`))?.json === json) return console.log(`${collection}/${id}: unchanged`)
  await commit([{ set: `${collection}/${id}`, data: { ...(collection === 'indexes' ? { country: value.country } : {}), json, updated: now } }])
  console.log(`${collection}/${id}: stored`)
}

async function logos(dir, map) {
  const files = [...new Set(Object.values(map))]
  const onDisk = new Set(readdirSync(dir))
  const absent = files.filter((f) => !onDisk.has(f))
  if (absent.length) throw new Error(`Logo map names files not in ${dir}: ${absent.join(', ')}`)
  const existing = new Map((await list('logos', { fields: ['md5'] })).map((d) => [d.id, d.md5]))
  const writes = []
  for (const f of files) {
    const png = readFileSync(join(dir, f))
    if (existing.get(f) !== md5(png)) writes.push({ set: `logos/${f}`, data: { png, md5: md5(png), updated: now } })
  }
  const keep = new Set(files)
  for (const f of existing.keys()) if (!keep.has(f)) writes.push({ delete: `logos/${f}` })
  await commit(writes)
  console.log(`logos: ${writes.filter((w) => w.set).length} stored, ${writes.filter((w) => w.delete).length} removed, ${files.length} in use`)
  await put('datasets', 'logos', map)
}

async function seed(dataDir, logosDir, feedPath, marketsPath) {
  const markets = readJson(marketsPath)
  for (const [code, m] of Object.entries(markets)) await put('markets', code, m)
  const companies = readJson(join(dataDir, 'companies.json'))
  const indexes = Object.values(readJson(join(dataDir, 'indexes.json')))
  for (const code of new Set(Object.values(companies).map((c) => c.country))) {
    const mine = Object.fromEntries(Object.entries(companies).filter(([, c]) => c.country === code))
    await load(code, mine, indexes.filter((ix) => ix.country === code))
  }
  for (const name of DATASETS) await put('datasets', name, readJson(join(dataDir, `${name}.json`)))
  await put('feeds', 'spot-v1', readJson(feedPath))
  await logos(logosDir, readJson(join(dataDir, 'logos.json')))
}

async function verify(dataDir, logosDir, feedPath) {
  let problems = 0
  const compare = (label, docs, local) => {
    const remote = new Map(docs.map((d) => [d.id, d.json]))
    const differ = Object.keys(local).filter((k) => remote.has(k) && remote.get(k) !== JSON.stringify(local[k]))
    const missing = Object.keys(local).filter((k) => !remote.has(k))
    const extra = [...remote.keys()].filter((k) => !(k in local))
    problems += differ.length + missing.length + extra.length
    console.log(`${label}: ${Object.keys(local).length - differ.length - missing.length} identical` +
      (differ.length ? `, ${differ.length} differ (${differ.slice(0, 5)})` : '') +
      (missing.length ? `, ${missing.length} missing (${missing.slice(0, 5)})` : '') +
      (extra.length ? `, ${extra.length} extra (${extra.slice(0, 5)})` : ''))
  }
  compare('companies', await list('companies'), Object.fromEntries(Object.entries(readJson(join(dataDir, 'companies.json'))).map(([k, c]) => [k, tidy(c)])))
  compare('indexes', await list('indexes'), readJson(join(dataDir, 'indexes.json')))
  const datasets = Object.fromEntries([...DATASETS, 'logos'].map((n) => [n, readJson(join(dataDir, `${n}.json`))]))
  compare('datasets', await list('datasets'), datasets)
  compare('feeds', await list('feeds'), { 'spot-v1': readJson(feedPath) })
  const pngs = Object.fromEntries([...new Set(Object.values(datasets.logos))].map((f) => [f, md5(readFileSync(join(logosDir, f)))]))
  const remote = new Map((await list('logos', { fields: ['md5'] })).map((d) => [d.id, d.md5]))
  const badLogos = Object.keys(pngs).filter((f) => remote.get(f) !== pngs[f]).concat([...remote.keys()].filter((f) => !(f in pngs)))
  problems += badLogos.length
  console.log(`logos: ${Object.keys(pngs).length - badLogos.length} identical${badLogos.length ? `, ${badLogos.length} differ or missing (${badLogos.slice(0, 5)})` : ''}`)
  if (problems) process.exitCode = 1
}

const [cmd, ...args] = process.argv.slice(2)
const flags = new Set(args.filter((a) => a.startsWith('--')))
const pos = args.filter((a) => !a.startsWith('--'))
const commands = {
  load: () => load(pos[0], readJson(pos[1]), indexList(readJson(pos[2])), { force: flags.has('--force') }),
  put: () => put(pos[0], pos[1], readJson(pos[2])),
  get: async () => {
    const d = await get(`${pos[0]}/${pos[1]}`)
    if (!d) throw new Error(`${pos[0]}/${pos[1]} not found`)
    console.log(d.json ? JSON.stringify(JSON.parse(d.json), null, 1) : d)
  },
  rm: async () => {
    if (pos[0] === 'companies') throw new Error('Companies leave through load, which lists what it removes')
    await commit([{ delete: `${pos[0]}/${pos[1]}` }])
    console.log(`${pos[0]}/${pos[1]}: deleted`)
  },
  logos: () => logos(pos[0], readJson(pos[1])),
  seed: () => seed(...pos.slice(0, 4)),
  verify: () => verify(...pos.slice(0, 3)),
}
if (!commands[cmd]) {
  console.error(readFileSync(new URL(import.meta.url), 'utf8').match(/\/\*\*([\s\S]*?)\*\//)[1].replace(/^ \* ?/gm, ''))
  process.exit(1)
}
try {
  await commands[cmd]()
} catch (err) {
  console.error(err.message)
  process.exit(1)
}
