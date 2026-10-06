import { test } from 'node:test'
import assert from 'node:assert/strict'

const LIVE = '20261005-165058'
const STAGED = '20261007-090000'
const PUBLIC = 'https://data.test'
const STAGING = 'https://staging.test'
process.env.NIVEL_DATA_ORIGIN = PUBLIC
process.env.NIVEL_DATA_STAGING_ORIGIN = STAGING
process.env.VERCEL_URL = 'nivel-abc123-team.vercel.app'

// The public data site holds the live release only; the staging deployment holds both and wants the secret.
const calls = []
globalThis.fetch = async (url, init = {}) => {
  calls.push({ url, bypass: init.headers?.['x-vercel-protection-bypass'] })
  const { origin, pathname } = new URL(url)
  const path = pathname.slice(1)
  const files = {
    'live.json': JSON.stringify({ release: LIVE, collected: '2026-10-05' }),
    [`r/${LIVE}/release.json`]: JSON.stringify({ id: LIVE, collected: '2026-10-05' }),
    [`r/${LIVE}/app/core.json`]: '{"live":true}',
  }
  if (origin === STAGING) {
    if (init.headers?.['x-vercel-protection-bypass'] !== 'secret') return new Response('Authentication required', { status: 401 })
    Object.assign(files, { [`r/${STAGED}/release.json`]: JSON.stringify({ id: STAGED, collected: '2026-10-07' }), [`r/${STAGED}/app/core.json`]: '{"staged":true}' })
  }
  return path in files ? new Response(files[path]) : new Response('Not found', { status: 404 })
}

const { handleData, protectedHost, release, PREVIEW_SITE } = await import('./_data.js')

test('the public address never serves a staged release', async () => {
  process.env.NIVEL_DATA_BYPASS = 'secret'
  assert.equal((await handleData(`r/${STAGED}/app/core.json`)).status, 404)
  assert.equal(await release(STAGED), null)
  assert.equal(calls.some((c) => c.url.startsWith(STAGING)), false)
  assert.equal((await handleData(`r/${LIVE}/app/core.json`)).status, 200)
})

test('a protected address serves a staged release with the secret, and nothing staged is kept for others', async () => {
  process.env.NIVEL_DATA_BYPASS = 'secret'
  const res = await handleData(`r/${STAGED}/app/core.json`, { preview: true })
  assert.equal(res.status, 200)
  assert.deepEqual(await res.json(), { staged: true })
  assert.equal((await release(STAGED, true))?.id, STAGED)
  assert.equal((await handleData(`r/${STAGED}/app/core.json`)).status, 404)
  assert.equal(await release(STAGED), null)
})

test('without the secret, a protected address sees only public releases', async () => {
  delete process.env.NIVEL_DATA_BYPASS
  assert.equal((await handleData(`r/${STAGED}/app/core.json`, { preview: true })).status, 404)
  assert.equal(await release(STAGED, true), null)
})

test('protected addresses are previews, the deployment URL and the team address', () => {
  assert.equal(protectedHost('https://nivel-equal-lens.vercel.app/?release=x'), false)
  assert.equal(protectedHost('https://parity-tracker-eight.vercel.app/'), false)
  assert.equal(protectedHost('https://nivel-abc123-team.vercel.app/'), true)
  assert.equal(protectedHost(`${PREVIEW_SITE}/`), true)
  process.env.VERCEL_ENV = 'preview'
  assert.equal(protectedHost('https://nivel-git-branch-team.vercel.app/'), true)
  delete process.env.VERCEL_ENV
})
