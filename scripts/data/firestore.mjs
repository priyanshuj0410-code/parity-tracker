/**
 * A small client for Nivel's Firestore over the REST API, so the build needs no SDK.
 * Signed calls borrow the person's own Google login (Application Default Credentials impersonating
 * nivel-pipeline); unsigned calls read only what the security rules make public (channels, releases, blobs).
 */
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'

export const PROJECT = process.env.FIREBASE_PROJECT ?? 'nivel-equal-lens'
export const DATABASE = process.env.FIRESTORE_DATABASE ?? 'default'
const ROOT = `projects/${PROJECT}/databases/${DATABASE}/documents`
const API = `https://firestore.googleapis.com/v1/${ROOT}`
const MAX_WRITES = 500
const MAX_BYTES = 8_000_000

let token
function authHeader() {
  token ??= execFileSync('gcloud', ['auth', 'application-default', 'print-access-token'], { encoding: 'utf8' }).trim()
  return { Authorization: `Bearer ${token}` }
}

async function call(method, path, body, signed) {
  const res = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(signed ? authHeader() : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (res.status === 404 && method === 'GET') return null
  if (!res.ok) throw new Error(`Firestore ${method} ${path.slice(0, 80)} returned ${res.status}: ${(await res.text()).slice(0, 400)}`)
  return res.json()
}

export function encode(v) {
  if (v === null) return { nullValue: null }
  if (typeof v === 'boolean') return { booleanValue: v }
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v }
  if (typeof v === 'string') return { stringValue: v }
  if (v instanceof Uint8Array) return { bytesValue: Buffer.from(v).toString('base64') }
  if (v instanceof Date) return { timestampValue: v.toISOString() }
  if (Array.isArray(v)) return { arrayValue: { values: v.map(encode) } }
  return { mapValue: { fields: encodeFields(v) } }
}

const encodeFields = (o) => Object.fromEntries(Object.entries(o).filter(([, x]) => x !== undefined).map(([k, x]) => [k, encode(x)]))

export function decode(v) {
  if ('nullValue' in v) return null
  if ('booleanValue' in v) return v.booleanValue
  if ('integerValue' in v) return Number(v.integerValue)
  if ('doubleValue' in v) return Number(v.doubleValue)
  if ('stringValue' in v) return v.stringValue
  if ('bytesValue' in v) return Buffer.from(v.bytesValue, 'base64')
  if ('timestampValue' in v) return v.timestampValue
  if ('arrayValue' in v) return (v.arrayValue.values ?? []).map(decode)
  if ('mapValue' in v) return decodeFields(v.mapValue.fields ?? {})
  throw new Error(`Unsupported Firestore value ${Object.keys(v)}`)
}

const decodeFields = (f) => Object.fromEntries(Object.entries(f).map(([k, x]) => [k, decode(x)]))
const idOf = (name) => name.slice(name.lastIndexOf('/') + 1)
const toDoc = (d) => ({ id: idOf(d.name), ...decodeFields(d.fields ?? {}) })
const urlPath = (path) => '/' + path.split('/').map(encodeURIComponent).join('/')

/** One document as { id, ...fields }, or null. `path` is "collection/id". */
export async function get(path, { signed = true } = {}) {
  const d = await call('GET', urlPath(path), undefined, signed)
  return d && toDoc(d)
}

/** Several documents by path, in the order asked; missing ones come back null. */
export async function getMany(paths, { signed = true } = {}) {
  const found = new Map()
  for (let i = 0; i < paths.length; i += 100) {
    const res = await call('POST', ':batchGet', { documents: paths.slice(i, i + 100).map((p) => `${ROOT}/${p}`) }, signed)
    for (const r of res) if (r.found) found.set(r.found.name.slice(ROOT.length + 1), toDoc(r.found))
  }
  return paths.map((p) => found.get(p) ?? null)
}

/** Every document in a collection; `fields` limits what comes back. */
export async function list(collection, { signed = true, fields = [] } = {}) {
  const out = []
  const mask = fields.map((f) => `&mask.fieldPaths=${encodeURIComponent(f)}`).join('')
  let pageToken = ''
  do {
    const res = await call('GET', `${urlPath(collection)}?pageSize=300${mask}${pageToken && `&pageToken=${encodeURIComponent(pageToken)}`}`, undefined, signed)
    out.push(...(res.documents ?? []).map(toDoc))
    pageToken = res.nextPageToken ?? ''
  } while (pageToken)
  return out
}

/** Documents in a collection whose `field` equals `value`. */
export async function where(collection, field, value) {
  const res = await call('POST', ':runQuery', {
    structuredQuery: { from: [{ collectionId: collection }], where: { fieldFilter: { field: { fieldPath: field }, op: 'EQUAL', value: encode(value) } } },
  }, true)
  return res.filter((r) => r.document).map((r) => toDoc(r.document))
}

/**
 * A release's frozen files ({ path: text }) and logo PNGs ({ file: Buffer }). Blobs are content-addressed,
 * so each is checked against its id.
 */
export async function readRelease(id, { signed = true } = {}) {
  const meta = await get(`releases/${id}`, { signed })
  if (!meta) throw new Error(`No release ${id}`)
  const ids = [...new Set([...Object.values(meta.files), ...Object.values(meta.logos)].flat())]
  const docs = await getMany(ids.map((b) => `blobs/${b}`), { signed })
  const blobs = new Map(ids.map((b, i) => {
    if (!docs[i] || blobId(docs[i].data) !== b) throw new Error(`Release ${id}: blob ${b} is missing or damaged`)
    return [b, docs[i].data]
  }))
  const text = (parts) => parts.map((b) => blobs.get(b)).join('')
  const files = Object.fromEntries(Object.entries(meta.files).map(([path, parts]) => [path, text(parts)]))
  const logos = {}
  for (const parts of Object.values(meta.logos)) {
    for (const [file, b64] of Object.entries(JSON.parse(text(parts)))) logos[file] = Buffer.from(b64, 'base64')
  }
  return { meta, files, logos }
}

export const blobId = (text) => createHash('sha256').update(text).digest('hex').slice(0, 40)

function toWrite(w) {
  if (w.delete) return { delete: `${ROOT}/${w.delete}` }
  if (w.update) return { update: { name: `${ROOT}/${w.update}`, fields: encodeFields(w.data) }, updateMask: { fieldPaths: Object.keys(w.data) } }
  return { update: { name: `${ROOT}/${w.set}`, fields: encodeFields(w.data) } }
}

/**
 * Apply writes atomically per batch of up to 500: { set: "collection/id", data } replaces a document,
 * { update: "collection/id", data } changes only the fields given, { delete: "collection/id" } removes one.
 * Returns the number of writes.
 */
export async function commit(writes) {
  let batch = [], bytes = 0
  const flush = async () => {
    if (batch.length) await call('POST', ':commit', { writes: batch }, true)
    batch = []
    bytes = 0
  }
  for (const w of writes) {
    const write = toWrite(w)
    const size = JSON.stringify(write).length
    if (batch.length === MAX_WRITES || bytes + size > MAX_BYTES) await flush()
    batch.push(write)
    bytes += size
  }
  await flush()
  return writes.length
}
