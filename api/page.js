/**
 * Every page of the app (rewritten here by vercel.json; static files are served first). Returns the app's shell
 * with the page's own title, description and link-preview tags from the live release (or `?release=` for a
 * preview), the release id for the app, and preloads for the data the page needs first. Cached at the edge.
 */
import { file, live, release } from './_data.js'
import shell from './_shell.js'

export const config = { runtime: 'edge' }

const SITE = 'https://nivel-equal-lens.vercel.app'
const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const put = (html, pattern, value) => html.replace(pattern, (_, open, close) => open + esc(value) + close)

const pagesByRelease = new Map()

async function pagesOf(id) {
  if (!pagesByRelease.has(id)) {
    if (pagesByRelease.size > 4) pagesByRelease.delete(pagesByRelease.keys().next().value)
    pagesByRelease.set(id, JSON.parse(await file(id, 'app/pages.json')))
  }
  return pagesByRelease.get(id)
}

/** A path with each segment decoded, whether the router passed it encoded (M%26M) or not (M&M). */
function normal(raw) {
  const segs = raw.split('/').filter(Boolean).map((s) => { try { return decodeURIComponent(s) } catch { return s } })
  return '/' + segs.join('/')
}

/**
 * The page's title and description, and the company file it needs first; null for a page that does not exist.
 * Home keeps the shell's own title and description (`home`).
 */
function lookup(pages, path) {
  if (path === '/') return { home: true }
  const exact = pages.paths[path]
  if (exact) return { title: exact[0], description: exact[1] }
  const m = path.match(/^\/company\/([^/]+)(?:\/([^/]+))?$/)
  const c = m && pages.companies[m[1]]
  if (!c || (m[2] && !pages.tabs[m[2]])) return null
  return { title: m[2] ? `${c[0]} · ${pages.tabs[m[2]]}` : c[0], description: c[1], company: c[2] }
}

export default async function handler(req) {
  const url = new URL(req.url)
  const path = normal(url.searchParams.get('path') ?? '')

  let html = shell, status = 200, cdn = 'public, s-maxage=300, stale-while-revalidate=86400'
  try {
    const wanted = url.searchParams.get('release')
    const id = wanted && (await release(wanted)) ? wanted : (await live()).release
    const meta = lookup(await pagesOf(id), path)
    if (!meta) status = 404
    if (!meta?.home) {
      const title = `${meta ? meta.title : 'Page not found'} · Nivel`
      const description = meta ? (meta.description.length > 300 ? `${meta.description.slice(0, 297)}...` : meta.description) : 'This page does not exist on Nivel.'
      html = put(html, /(<title>)[^<]*(<\/title>)/, title)
      html = put(html, /(<meta name="description" content=")[^"]*(")/, description)
      html = put(html, /(<meta property="og:title" content=")[^"]*(")/, title)
      html = put(html, /(<meta property="og:description" content=")[^"]*(")/, description)
    }
    html = put(html, /(<meta property="og:url" content=")[^"]*(")/, SITE + path)
    html = put(html, /(<link rel="canonical" href=")[^"]*(")/, SITE + path)
    const preload = (href) => `<link rel="preload" href="${href}" as="fetch" type="application/json" crossorigin>`
    html = html.replace('</head>', [
      `<meta name="nivel-release" content="${id}">`,
      preload(`/data/r/${id}/app/core.json`),
      ...(meta?.company ? [preload(`/data/r/${id}/v1/companies/${meta.company}.json`)] : []),
      '</head>',
    ].join('\n'))
  } catch {
    // Data unreachable: the plain shell still loads, and the app shows its own retry state.
    cdn = 'no-store'
  }
  return new Response(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=0, must-revalidate', 'CDN-Cache-Control': cdn },
  })
}
