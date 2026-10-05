/**
 * Serves Nivel's data from the static data site (decisions 0014 and 0016), for the edge functions in this folder
 * and for the dev server. The site holds the live, staged and previous releases as plain files, so serving never
 * reads a database and no database quota can take it down. A release's files never change, so they are cached
 * for a year; only the live pointer is short-lived.
 */
const ORIGIN = (typeof process !== 'undefined' && process.env?.NIVEL_DATA_ORIGIN) || 'https://nivel-data.vercel.app'
const RELEASE_ID = /^\d{8}-\d{6}$/

const LIVE_CACHE = { browser: 'public, max-age=60', cdn: 'public, s-maxage=120, stale-while-revalidate=86400' }
const RELEASE_CACHE = { browser: 'public, max-age=31536000, immutable', cdn: 'public, s-maxage=31536000, immutable' }
const LATEST_CACHE = { browser: 'public, max-age=300', cdn: 'public, s-maxage=300, stale-while-revalidate=86400' }

const SAFE = /^[A-Za-z0-9._-]+(\/[A-Za-z0-9._-]+)*$/

/** A file from the static data site: text, bytes, or null if it does not exist. */
async function get(path, bytes = false) {
  if (!SAFE.test(path) || path.split('/').includes('..')) return null
  const res = await fetch(`${ORIGIN}/${path}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Data site ${path} returned ${res.status}`)
  return bytes ? new Uint8Array(await res.arrayBuffer()) : res.text()
}

/** The release live now: { release, collected }. */
export async function live() {
  const text = await get('live.json')
  if (!text) throw new Error('No live release')
  return JSON.parse(text)
}

const releases = new Map()
/** A release's summary ({ id, collected, status }), kept in memory, or null if the data site does not hold it. */
export async function release(id) {
  if (!RELEASE_ID.test(id)) return null
  if (!releases.has(id)) {
    const text = await get(`r/${id}/release.json`)
    if (!text) return null
    if (releases.size > 8) releases.delete(releases.keys().next().value)
    releases.set(id, JSON.parse(text))
  }
  return releases.get(id)
}

const texts = new Map()
/** A release file's text, or null if the release has no such file. */
export async function file(id, path) {
  if (!RELEASE_ID.test(id)) return null
  const key = `${id}/${path}`
  if (!texts.has(key)) {
    const text = await get(`r/${key}`)
    if (text == null) return null
    if (texts.size > 64) texts.delete(texts.keys().next().value)
    texts.set(key, text)
  }
  return texts.get(key)
}

const logo = (id, name) => (RELEASE_ID.test(id) ? get(`r/${id}/logos/${name}`, true) : null)

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
