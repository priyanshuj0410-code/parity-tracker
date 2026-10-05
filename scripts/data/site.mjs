/**
 * The static data site (decision 0016): every file the live site serves, for the live, staged and previous releases,
 * deployed as the static Vercel project nivel-data. The edge functions read it and never Firestore, so a database
 * quota can hold up a publish but never take the site down. Firestore stays the store of record.
 *
 * Layout: r/{release}/... (v1, app and feeds/spot files, logos/{file}.png, release.json), live.json, staging.json.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { readRelease } from './firestore.mjs'

export const SITE_DIR = '.data-site'
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
export function addRelease(id, { files, logos, collected, status }) {
  const dir = join(SITE_DIR, 'r', id)
  rmSync(dir, { recursive: true, force: true })
  for (const [path, text] of Object.entries(files)) if (SERVED(path)) write(join(dir, path), text)
  for (const [name, png] of Object.entries(logos)) write(join(dir, 'logos', name), png)
  write(join(dir, 'release.json'), JSON.stringify({ id, collected, status }))
}

/** Make sure a release is in the site folder, reading it from Firestore if this machine has not got it. */
export async function ensureRelease(id) {
  if (existsSync(join(SITE_DIR, 'r', id, 'release.json'))) return
  const { meta, files, logos } = await readRelease(id, { only: SERVED, withLogos: true })
  addRelease(id, { files, logos, collected: meta.collected, status: meta.status })
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

/** Deploy the folder as the production of the nivel-data project. Only changed files are uploaded. */
export function deploy() {
  write(join(SITE_DIR, 'vercel.json'), JSON.stringify(CONFIG, null, 2))
  execFileSync('vercel', ['deploy', '--prod', '--yes'], { cwd: SITE_DIR, stdio: ['ignore', 'ignore', 'inherit'] })
}
