/**
 * Runs the built site the way Vercel does, to check it before deploying: static files from dist first
 * (compressed), then vercel.json's rewrites to the edge functions in api/. Usage, after `pnpm build`:
 *   node scripts/serve-local.mjs [port]
 */
import { createServer } from 'node:http'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { extname, join } from 'node:path'
import { gzipSync } from 'node:zlib'
import dataFn from '../api/data.js'
import pageFn from '../api/page.js'

const port = Number(process.argv[2] ?? 4500)
const rewrites = JSON.parse(readFileSync('vercel.json', 'utf8')).rewrites
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json' }
const FUNCTIONS = { '/api/data': dataFn, '/api/page': pageFn }

/** A vercel.json rewrite for a path: the destination, with the named `:path*` passed as a query parameter as Vercel does. */
function rewrite(path) {
  for (const { source, destination } of rewrites) {
    const m = path.match(new RegExp('^' + source.replace(/:path\*/, '(.*)') + '$'))
    if (!m) continue
    const target = new URL(destination, 'http://local')
    target.searchParams.set('path', decodeURIComponent(m[1]))
    return target.pathname + target.search
  }
  return null
}

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`)
  const file = join('dist', decodeURIComponent(url.pathname))
  if (url.pathname !== '/' && existsSync(file) && statSync(file).isFile()) {
    const type = TYPES[extname(file)] ?? 'application/octet-stream'
    const zip = /text|json|javascript|svg|manifest/.test(type)
    res.writeHead(200, { 'Content-Type': type, ...(zip ? { 'Content-Encoding': 'gzip' } : {}) })
    return res.end(zip ? gzipSync(readFileSync(file)) : readFileSync(file))
  }
  const dest = rewrite(url.pathname)
  if (!dest) { res.writeHead(404); return res.end() }
  const target = new URL(dest, url)
  for (const [k, v] of url.searchParams) if (!target.searchParams.has(k)) target.searchParams.set(k, v)
  const out = await FUNCTIONS[target.pathname](new Request(target))
  const body = Buffer.from(await out.arrayBuffer())
  const zip = /text|json/.test(out.headers.get('content-type') ?? '')
  res.writeHead(out.status, { ...Object.fromEntries(out.headers), ...(zip ? { 'Content-Encoding': 'gzip' } : {}) })
  res.end(zip ? gzipSync(body) : body)
}).listen(port, () => console.log(`Serving dist with api/ on http://localhost:${port}`))
