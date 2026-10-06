/**
 * The static data site (decision 0016): every file the live site serves, deployed as the static Vercel project
 * nivel-data. The edge functions read it and never Firestore, so a database quota can hold up a publish but never take
 * the site down. Firestore stays the store of record.
 *
 * Two deployments of the same folder (PARITY-102):
 * - production (nivel-data.vercel.app, public): the live and previous releases and live.json, never a staged one;
 * - staging (nivel-data-staging.vercel.app): everything, staged release and staging.json included, as a preview
 *   deployment, which Vercel Authentication keeps to the project's members.
 *
 * Layout: r/{release}/... (v1, app and feeds/spot files, logos/{file}.png, release.json), live.json, staging.json.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { readRelease } from './firestore.mjs'

export const SITE_DIR = '.data-site'
export const STAGING_HOST = 'nivel-data-staging.vercel.app'
const SERVED = (path) => /^(v1|app|feeds\/spot)\//.test(path)
const CONFIG = {
  headers: [
    { source: '/r/(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
    { source: '/(live|staging).json', headers: [{ key: 'Cache-Control', value: 'public, max-age=0, s-maxage=30' }] },
  ],
}

function write(path, body) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, body)
}

/** Write a release's served files and logo PNGs into the site folder. `logos` maps file name to PNG bytes. */
export function addRelease(id, { files, logos, collected }) {
  const dir = join(SITE_DIR, 'r', id)
  rmSync(dir, { recursive: true, force: true })
  for (const [path, text] of Object.entries(files)) if (SERVED(path)) write(join(dir, path), text)
  for (const [name, png] of Object.entries(logos)) write(join(dir, 'logos', name), png)
  write(join(dir, 'release.json'), JSON.stringify({ id, collected }))
}

/** Make sure a release is in the site folder, reading it from Firestore if this machine has not got it. */
export async function ensureRelease(id) {
  if (existsSync(join(SITE_DIR, 'r', id, 'release.json'))) return
  const { meta, files, logos } = await readRelease(id, { only: SERVED, withLogos: true })
  addRelease(id, { files, logos, collected: meta.collected })
}

/** Point the live or staging channel at a release ({ release, collected }), or clear it (null). */
export function setChannel(name, value) {
  const path = join(SITE_DIR, `${name}.json`)
  if (value) write(path, JSON.stringify(value))
  else rmSync(path, { force: true })
}

/** Keep only the releases named: the live one, the staged one and the previous live one, for a rollback. */
export function prune(keep) {
  const dir = join(SITE_DIR, 'r')
  if (!existsSync(dir)) return
  for (const id of readdirSync(dir)) if (!keep.has(id)) rmSync(join(dir, id), { recursive: true, force: true })
}

const channel = (name) => {
  try {
    return JSON.parse(readFileSync(join(SITE_DIR, `${name}.json`), 'utf8')).release
  } catch {
    return null
  }
}

/**
 * Deploy the folder to nivel-data. Only changed files are uploaded.
 * - `production`: leaves out staging.json and the staged release, unless it is also the live one.
 * - `staging`: a preview deployment of everything, pointed at STAGING_HOST. Returns its address.
 */
export function deploy(target = 'production') {
  write(join(SITE_DIR, 'vercel.json'), JSON.stringify(CONFIG, null, 2))
  const staged = channel('staging')
  const hidden = target === 'production' ? ['/staging.json', ...(staged && staged !== channel('live') ? [`/r/${staged}/`] : [])] : []
  write(join(SITE_DIR, '.vercelignore'), hidden.map((p) => `${p}\n`).join(''))
  if (target === 'production') {
    execFileSync('vercel', ['deploy', '--prod', '--yes'], { cwd: SITE_DIR, stdio: ['ignore', 'ignore', 'inherit'] })
    return null
  }
  const out = JSON.parse(execFileSync('vercel', ['deploy', '--yes'], { cwd: SITE_DIR, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }))
  execFileSync('vercel', ['alias', 'set', out.deployment.url, STAGING_HOST], { cwd: SITE_DIR, stdio: ['ignore', 'ignore', 'inherit'] })
  return out.deployment.url
}
