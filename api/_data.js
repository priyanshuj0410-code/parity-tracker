/**
 * Serves Nivel's data from the releases in Firestore (decision 0014), for the edge functions in this folder
 * and for the dev server. Releases, their files and the live channel are public reads, so no key is needed.
 * A release's files never change, so they are cached for a year; only the live pointer is short-lived.
 */
const PROJECT = 'nivel-equal-lens'
const DATABASE = 'default'
const API = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/${DATABASE}/documents`
const RELEASE_ID = /^\d{8}-\d{6}$/

const LIVE_CACHE = { browser: 'public, max-age=60', cdn: 'public, s-maxage=120, stale-while-revalidate=86400' }
const RELEASE_CACHE = { browser: 'public, max-age=31536000, immutable', cdn: 'public, s-maxage=31536000, immutable' }
const LATEST_CACHE = { browser: 'public, max-age=300', cdn: 'public, s-maxage=300, stale-while-revalidate=86400' }

function decode(v) {
  if ('stringValue' in v) return v.stringValue
  if ('integerValue' in v) return Number(v.integerValue)
  if ('doubleValue' in v) return Number(v.doubleValue)
  if ('booleanValue' in v) return v.booleanValue
  if ('timestampValue' in v) return v.timestampValue
  if ('nullValue' in v) return null
  if ('arrayValue' in v) return (v.arrayValue.values ?? []).map(decode)
  if ('mapValue' in v) return fields(v.mapValue.fields ?? {})
  return null
}
const fields = (f) => Object.fromEntries(Object.entries(f).map(([k, x]) => [k, decode(x)]))

async function doc(path) {
  const res = await fetch(`${API}/${path}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Firestore ${path} returned ${res.status}`)
  return fields((await res.json()).fields ?? {})
}

/** The release live now: { release, collected }. */
export async function live() {
  const channel = await doc('channels/live')
  if (!channel) throw new Error('No live release')
  const rel = await release(channel.release)
  return { release: channel.release, collected: rel.collected }
}

const releases = new Map()
/** A release's manifest, kept in memory: releases never change once published. */
export async function release(id) {
  if (!RELEASE_ID.test(id)) return null
  if (!releases.has(id)) {
    const rel = await doc(`releases/${id}`)
    if (!rel) return null
    if (releases.size > 8) releases.delete(releases.keys().next().value)
    releases.set(id, { collected: rel.collected, status: rel.status, files: rel.files ?? {}, logoFiles: rel.logoFiles ?? {} })
  }
  return releases.get(id)
}

const texts = new Map()
/** A release file's text, joined from its content-addressed blobs, or null if the release has no such file. */
export async function file(id, path) {
  const rel = await release(id)
  const parts = rel?.files[path]
  if (!parts) return null
  const key = `${id}/${path}`
  if (!texts.has(key)) {
    const blobs = await Promise.all(parts.map((b) => doc(`blobs/${b}`)))
    if (blobs.some((b) => !b)) throw new Error(`Release ${id}: ${path} is missing a blob`)
    if (texts.size > 64) texts.delete(texts.keys().next().value)
    texts.set(key, blobs.map((b) => b.data).join(''))
  }
  return texts.get(key)
}

async function logo(id, name) {
  const rel = await release(id)
  const blob = rel?.logoFiles[name]
  if (!blob) return null
  const b64 = (await doc(`blobs/${blob}`))?.data
  if (!b64) return null
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
}

const TYPES = { json: 'application/json; charset=utf-8', png: 'image/png' }

function respond(body, type, cache, cors) {
  const headers = { 'Content-Type': TYPES[type], 'Cache-Control': cache.browser, 'CDN-Cache-Control': cache.cdn }
  if (cors) headers['Access-Control-Allow-Origin'] = '*'
  return new Response(body, { headers })
}

const notFound = () => new Response('Not found', { status: 404, headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'public, max-age=60' } })

/**
 * `path` is what follows the public prefix:
 * - `live.json`: the live release id and collection date;
 * - `r/{release}/{file}`: a file of a given release (the app's own reads);
 * - `r/{release}/logos/{file}`: a logo PNG of a given release;
 * - `v1/{file}`: the public data API, from the live release;
 * - `feed/{file}`: the Spot the Stereotype feed, from the live release;
 * - `logo/{file}`: a logo from the live release.
 */
export async function handleData(path) {
  try {
    if (path === 'live.json') return respond(JSON.stringify(await live()), 'json', LIVE_CACHE, true)
    const [head, ...rest] = path.split('/')
    if (head === 'r') {
      const [id, ...parts] = rest
      if (parts[0] === 'logos') {
        const png = await logo(id, parts.slice(1).join('/'))
        return png ? respond(png, 'png', RELEASE_CACHE, true) : notFound()
      }
      const text = await file(id, parts.join('/'))
      return text == null ? notFound() : respond(text, 'json', RELEASE_CACHE, true)
    }
    const { release: id } = await live()
    if (head === 'v1' || head === 'feed') {
      const text = await file(id, head === 'v1' ? `v1/${rest.join('/')}` : `feeds/spot/${rest.join('/')}`)
      return text == null ? notFound() : respond(text, 'json', LATEST_CACHE, true)
    }
    if (head === 'logo') {
      const png = await logo(id, rest.join('/'))
      return png ? respond(png, 'png', LATEST_CACHE, true) : notFound()
    }
    return notFound()
  } catch (err) {
    return new Response(`Data unavailable: ${err.message}`, { status: 503, headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store', 'Retry-After': '30' } })
  }
}
