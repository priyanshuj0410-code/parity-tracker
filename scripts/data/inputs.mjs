/**
 * Pipeline inputs: figures read by hand from reports, name maps, overrides and index member lists. Each file under
 * pipeline/ (outside equal50/) is one Firestore record `inputs/{path with dots}`, not a file in git, so recording a
 * newly read figure needs no merge (PARITY-80). `pull` writes them into pipeline/; `push` stores the ones changed
 * here. pipeline/.inputs.json remembers each file as last pulled or pushed, so neither command overwrites work it
 * has not seen: a local edit not yet pushed, or a newer record someone else pushed.
 */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { commit, get, getMany, list } from './firestore.mjs'

const ROOT = 'pipeline'
const BASE = join(ROOT, '.inputs.json')
const md5 = (text) => createHash('md5').update(text).digest('hex')
const idOf = (path) => path.replaceAll('/', '.')
const readBase = () => (existsSync(BASE) ? JSON.parse(readFileSync(BASE, 'utf8')) : {})
const writeBase = (base) => writeFileSync(BASE, JSON.stringify(Object.fromEntries(Object.entries(base).sort()), null, 1) + '\n')
const localMd5 = (path) => (existsSync(join(ROOT, path)) ? md5(readFileSync(join(ROOT, path), 'utf8')) : null)

/** One input's text, straight from Firestore: publish uses this, never a local copy. `path` is relative to pipeline/. */
export async function input(path) {
  const d = await get(`inputs/${idOf(path)}`)
  if (!d) throw new Error(`No input ${path}: store it with pnpm data inputs push ${join(ROOT, path)}`)
  return d.text
}

/** Each input against your copy; exits 1 when any differ. */
export async function status() {
  const docs = await list('inputs'), base = readBase()
  const rows = []
  for (const d of docs.sort((a, b) => (a.path < b.path ? -1 : 1))) {
    const here = localMd5(d.path)
    if (here === d.md5) continue
    if (!here) rows.push(`${d.path}: not pulled`)
    else if (here === base[d.path]) rows.push(`${d.path}: newer in Firestore, pull`)
    else if (d.md5 === base[d.path]) rows.push(`${d.path}: changed here, push`)
    else rows.push(`${d.path}: changed here and in Firestore`)
  }
  console.log(`inputs: ${docs.length - rows.length} of ${docs.length} match your copy${rows.length ? `\n  ${rows.join('\n  ')}` : ''}`)
  if (rows.length) process.exitCode = 1
}

/** Write every input into pipeline/, unless that would lose a local edit not yet pushed (`force` overwrites it). */
export async function pull({ force = false } = {}) {
  const docs = await list('inputs'), base = readBase()
  const kept = docs.filter((d) => { const here = localMd5(d.path); return here && here !== d.md5 && here !== base[d.path] })
  if (kept.length && !force) {
    throw new Error(`Not pulled: these have edits here not yet pushed. Push them, or pull with --force to drop the edits:\n  ${kept.map((d) => d.path).join('\n  ')}`)
  }
  for (const d of docs) {
    mkdirSync(dirname(join(ROOT, d.path)), { recursive: true })
    writeFileSync(join(ROOT, d.path), d.text)
    base[d.path] = d.md5
  }
  writeBase(base)
  console.log(`inputs: ${docs.length} written into ${ROOT}/`)
}

/**
 * Store inputs: the files named (a new one becomes a new input), or every pulled input changed here. Refuses one
 * whose record changed since your pull, unless `force`.
 */
export async function push(files, { force = false } = {}) {
  const base = readBase()
  const paths = files.length ? files.map((f) => relative(resolve(ROOT), resolve(f))) : Object.keys(base)
  const outside = paths.filter((p) => p.startsWith('..') || p.startsWith('equal50/') || !existsSync(join(ROOT, p)))
  if (outside.length) throw new Error(`Inputs are files under ${ROOT}/, outside equal50/: ${outside.join(', ')}`)
  const remote = await getMany(paths.map((p) => `inputs/${idOf(p)}`))
  const writes = [], stale = []
  paths.forEach((path, i) => {
    const text = readFileSync(join(ROOT, path), 'utf8'), sum = md5(text), r = remote[i]
    if (r?.md5 === sum) { base[path] = sum; return }
    if (r && r.md5 !== base[path] && !force) { stale.push(path); return }
    writes.push({ set: `inputs/${idOf(path)}`, data: { path, text, md5: sum, updated: new Date() } })
    base[path] = sum
  })
  if (stale.length) throw new Error(`Not pushed: changed in Firestore since your pull. Pull, redo the edit, then push (or push with --force to replace it):\n  ${stale.join('\n  ')}`)
  await commit(writes)
  writeBase(base)
  console.log(`inputs: ${writes.length ? `${writes.length} stored (${writes.map((w) => w.data.path).join(', ')})` : 'none changed'}`)
}
