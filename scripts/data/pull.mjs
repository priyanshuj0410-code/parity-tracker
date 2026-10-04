/**
 * A local copy of a release, for pipelines that read the published data (the funds builder, the logo
 * pipeline): its files into src/data and src/feeds, its logos into public/logos. The app itself never needs
 * this; it reads releases over the network (decision 0014).
 * DATA_RELEASE names a release; otherwise the live one. DATA_OUT writes under another directory.
 * Reads are public, so no login is needed.
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { get, readRelease } from './firestore.mjs'

const out = process.env.DATA_OUT ?? '.'
{
  const id = process.env.DATA_RELEASE || (await get('channels/live', { signed: false }))?.release
  if (!id) throw new Error('No live release in Firestore')
  const { meta, files, logos } = await readRelease(id, { signed: false, only: (p) => p.startsWith('src/'), withLogos: true })
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
