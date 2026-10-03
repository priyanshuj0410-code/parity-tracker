/**
 * Before every build: write a release's data into src/data, src/feeds and public/logos.
 * DATA_RELEASE names a release (a preview build); otherwise the live channel's release is used.
 * DATA_RELEASE=local keeps the files already on disk, for offline work. Reads are public, so no login is needed.
 * DATA_OUT writes under another directory instead of the repo root.
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { get, readRelease } from './firestore.mjs'

const want = process.env.DATA_RELEASE
const out = process.env.DATA_OUT ?? '.'
if (want === 'local') {
  console.log('data: DATA_RELEASE=local, using the files on disk')
} else {
  const id = want || (await get('channels/live', { signed: false }))?.release
  if (!id) throw new Error('No live release in Firestore')
  const { meta, files, logos } = await readRelease(id, { signed: false })
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(out, path)), { recursive: true })
    writeFileSync(join(out, path), text)
  }
  const logoDir = join(out, 'public/logos')
  rmSync(logoDir, { recursive: true, force: true })
  mkdirSync(logoDir, { recursive: true })
  for (const [file, png] of Object.entries(logos)) writeFileSync(join(logoDir, file), png)
  console.log(`data: release ${id} (${meta.status}, collected ${meta.collected}): ${Object.keys(files).length} files, ${Object.keys(logos).length} logos`)
}
