// Writes dist/<path>.html for every page, each with its own title, description and link-preview tags.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { pages } from '../node_modules/.prerender/prerender-routes.js'

const SITE = 'https://nivel-equal-lens.vercel.app'
const template = readFileSync('dist/index.html', 'utf8')
const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function put(html, pattern, value) {
  if (!pattern.test(html)) throw new Error(`index.html is missing ${pattern}`)
  return html.replace(pattern, (_, open, close) => open + esc(value) + close)
}

let n = 0
for (const p of pages()) {
  const title = `${p.title} · Nivel`
  const description = p.description.length > 300 ? `${p.description.slice(0, 297)}...` : p.description
  let html = put(template, /(<title>)[^<]*(<\/title>)/, title)
  html = put(html, /(<meta name="description" content=")[^"]*(")/, description)
  html = put(html, /(<meta property="og:title" content=")[^"]*(")/, title)
  html = put(html, /(<meta property="og:description" content=")[^"]*(")/, description)
  html = put(html, /(<meta property="og:url" content=")[^"]*(")/, SITE + p.path)
  html = put(html, /(<link rel="canonical" href=")[^"]*(")/, SITE + p.path)
  const file = `dist${decodeURIComponent(p.path)}.html`
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, html)
  n++
}
console.log(`prerendered ${n} pages`)
