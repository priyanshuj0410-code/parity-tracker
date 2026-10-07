/**
 * The Saturday cycle's tools (decision 0018): Claude files the week's market proposals and the settlements it prepared,
 * for the owner to approve and confirm in /console. It writes only proposals and settlements; markets open and resolve
 * only through the console.
 *
 *   pnpm markets list                          proposals waiting, open markets, and what needs settling
 *   pnpm markets propose <file.json> [--dry-run]
 *       { "week": "YYYY-MM-DD" (the Sunday the markets open), "proposals": [{ "body": {...template fields}, "rationale": "..." }] }
 *   pnpm markets settle <file.json> [--dry-run]
 *       [{ "marketId", "figure" (or "releaseId" for Nivel data), "sourceUrl", "releaseName", "note"? }]
 *
 * The database is Nivel's own Neon project. Its connection string comes from MARKETS_DATABASE_URL, or from the Neon CLI
 * with the owner's login, and is never printed.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { neon } from '@neondatabase/serverless'
import { PRECISION, TEMPLATES, closesAt, fitsTemplate, inWeek, isSunday, opensAt, outcomeFor, parseSubject, settleBy } from '../../api/_market_rules.ts'

const PROJECT = 'rapid-lake-23769971'
const HTTPS = /^https:\/\/\S{4,500}$/
const DATE = /^\d{4}-\d{2}-\d{2}$/
const text = (v, max) => typeof v === 'string' && v.trim().length > 0 && v.length <= max

function db() {
  const url = process.env.MARKETS_DATABASE_URL ||
    execFileSync('npx', ['-y', 'neon@latest', 'connection-string', 'production', '--project-id', PROJECT, '--pooled'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  if (!url.startsWith('postgres')) throw new Error('No connection string. Sign in with `npx neon@latest login`, or set MARKETS_DATABASE_URL.')
  return neon(url)
}

/** Why a proposal body fails the templates or the week, or null if it passes (mirrors openMarket in api/_markets.ts). */
function problem(b, week) {
  const template = TEMPLATES.find((t) => t === b.template)
  const subject = typeof b.subject === 'string' ? parseSubject(b.subject) : null
  if (!template) return 'template must be nivel-data, official or norm'
  if (!subject) return `subject "${b.subject}" does not match {market}:{population}:{measure}:{period}`
  if (!fitsTemplate(template, subject)) return `measure "${subject.measure}" does not fit the ${template} template`
  if (PRECISION[template] === null && !(Number.isInteger(b.precision) && b.precision >= 0 && b.precision <= 4)) return 'precision (0 to 4 decimals) is required'
  if (!(typeof b.threshold === 'number' && b.threshold > 0 && b.threshold < 100)) return 'threshold must be a number between 0 and 100'
  if (!text(b.question, 200) || !b.question.includes('at least')) return 'question must say "at least" and be at most 200 characters'
  for (const k of ['definition', 'releaseName', 'resolutionLocation']) if (!text(b[k], k === 'definition' ? 2000 : 500)) return `${k} is missing or too long`
  if (!(typeof b.scheduledDate === 'string' && DATE.test(b.scheduledDate))) return 'scheduledDate must be YYYY-MM-DD'
  if (!inWeek(week, b.scheduledDate)) return `the release (${b.scheduledDate}) must fall Tuesday to Friday of the week opening ${week}`
  const doc = b.scheduleDoc ?? {}
  if (!text(doc.name, 200) || !HTTPS.test(doc.url ?? '') || !DATE.test(doc.readOn ?? '')) return 'scheduleDoc needs a name, an https url and readOn'
  const src = b.source ?? {}
  if (!text(src.name, 120) || !HTTPS.test(src.url ?? '')) return 'source needs a name and an https url'
  if (closesAt(template, subject, b.scheduledDate) <= opensAt(week)) return 'trading would close before the market opens'
  return null
}

const istTime = (iso) => new Date(Date.parse(iso) + 5.5 * 3_600_000).toISOString().replace('T', ' ').slice(0, 16) + ' IST'
const read = (file) => JSON.parse(readFileSync(file, 'utf8'))

async function list() {
  const sql = db()
  const now = Date.now()
  const waiting = await sql.query(`SELECT week, body->>'subject' AS subject, body->>'question' AS question FROM market_proposals WHERE status = 'proposed' ORDER BY week, proposed_at`)
  const markets = await sql.query(
    `SELECT m.id, m.status, m.outcome, m.question, d.subject, d.template, d.threshold, d.precision, d.release_name, d.scheduled_date, d.closes_at, d.opens_at,
            d.resolution_location, m.source_url, s.market_id IS NOT NULL AS prepared
       FROM markets m JOIN market_details d ON d.market_id = m.id LEFT JOIN market_settlements s ON s.market_id = m.id
      WHERE m.status IN ('open', 'resolving') ORDER BY d.scheduled_date`,
  )
  console.log(`Proposals waiting: ${waiting.length}`)
  for (const p of waiting) console.log(`  week ${p.week.toISOString?.().slice(0, 10) ?? p.week}  ${p.subject}  ${p.question}`)
  console.log(`Open markets: ${markets.length}`)
  for (const m of markets) {
    const due = Date.parse(m.scheduled_date) <= now
    const state = m.prepared ? 'settlement prepared' : due ? 'NEEDS SETTLING' : Date.parse(m.opens_at) > now ? 'opens ' + istTime(m.opens_at) : 'trading'
    console.log(`  ${m.id}  ${m.subject}  [${m.template}, at least ${Number(m.threshold)}, ${m.precision} dp]  release ${new Date(m.scheduled_date).toISOString().slice(0, 10)} (${m.release_name})  ${state}`)
    if (due && !m.prepared) console.log(`      read at: ${m.resolution_location} · source ${m.source_url}`)
  }
}

async function propose(file, dry) {
  const { week, proposals } = read(file)
  if (!isSunday(week)) throw new Error(`week must be a Sunday (YYYY-MM-DD), not ${week}`)
  if (Date.now() >= settleBy(week).getTime()) throw new Error(`the week opening ${week} is already over`)
  const sql = db()
  const taken = new Set([
    ...(await sql.query(`SELECT d.subject FROM markets m JOIN market_details d ON d.market_id = m.id WHERE m.status IN ('open', 'resolving')`)).map((r) => r.subject),
    ...(await sql.query(`SELECT body->>'subject' AS subject FROM market_proposals WHERE status = 'proposed'`)).map((r) => r.subject),
  ])
  let bad = 0
  for (const [i, p] of proposals.entries()) {
    const why = problem(p.body ?? {}, week) ?? (taken.has(p.body.subject) ? `subject ${p.body.subject} already has an open market or a waiting proposal` : null) ??
      (text(p.rationale, 1000) ? null : 'rationale is missing')
    if (why) { bad++; console.log(`  ✗ ${i + 1}. ${p.body?.subject ?? '?'}: ${why}`); continue }
    taken.add(p.body.subject)
    console.log(`  ✓ ${i + 1}. ${p.body.subject}: ${p.body.question}`)
  }
  if (bad) throw new Error(`${bad} of ${proposals.length} proposals fail; nothing was filed`)
  if (dry) return console.log(`Dry run: ${proposals.length} proposals pass for the week opening ${week}.`)
  for (const p of proposals) {
    await sql.query('INSERT INTO market_proposals (week, body, rationale) VALUES ($1, $2, $3)', [week, JSON.stringify(p.body), p.rationale])
  }
  console.log(`Filed ${proposals.length} proposals for the week opening ${week}. They open ${istTime(opensAt(week).toISOString())} once approved in /console.`)
}

async function settle(file, dry) {
  const items = read(file)
  const sql = db()
  for (const s of items) {
    const [d] = await sql.query('SELECT d.template, d.threshold, d.precision, d.subject, m.status FROM market_details d JOIN markets m ON m.id = d.market_id WHERE d.market_id = $1', [s.marketId])
    if (!d) throw new Error(`no market ${s.marketId}`)
    if (d.status !== 'open' && d.status !== 'resolving') throw new Error(`market ${s.marketId} is already ${d.status}`)
    if (!HTTPS.test(s.sourceUrl ?? '') || !text(s.releaseName, 200)) throw new Error(`${d.subject}: sourceUrl (https) and releaseName are required`)
    const nivel = d.template === 'nivel-data'
    if (nivel ? !/^\d{8}-\d{6}$/.test(s.releaseId ?? '') : !(typeof s.figure === 'number' && Number.isFinite(s.figure))) {
      throw new Error(`${d.subject}: ${nivel ? 'releaseId' : 'figure'} is required`)
    }
    const outcome = nivel ? null : outcomeFor(s.figure, Number(d.threshold), Number(d.precision))
    console.log(`  ${d.subject}: ${nivel ? `release ${s.releaseId}` : `${s.figure} against at least ${Number(d.threshold)} gives ${outcome}`}`)
    if (dry) continue
    await sql.query(
      `INSERT INTO market_settlements (market_id, figure, release_id, source_url, release_name, outcome, note) VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (market_id) DO UPDATE SET figure = $2, release_id = $3, source_url = $4, release_name = $5, outcome = $6, note = $7, prepared_at = now()`,
      [s.marketId, nivel ? null : s.figure, nivel ? s.releaseId : null, s.sourceUrl, s.releaseName, outcome, s.note ?? null],
    )
  }
  console.log(dry ? `Dry run: ${items.length} settlements check out.` : `Prepared ${items.length} settlements. Confirm each in /console.`)
}

const [cmd, file] = process.argv.slice(2)
const dry = process.argv.includes('--dry-run')
const run = { list: () => list(), propose: () => propose(file, dry), settle: () => settle(file, dry) }[cmd]
if (!run || (cmd !== 'list' && !file)) {
  console.error('Usage: pnpm markets list | propose <file.json> [--dry-run] | settle <file.json> [--dry-run]')
  process.exit(1)
}
try {
  await run()
} catch (err) {
  const missing = /relation "(market_\w+)" does not exist/.exec(err.message)
  console.error(missing ? `${missing[1]} does not exist yet: the deployed backend creates it on its first request. Open /console once, then rerun.` : err.message)
  process.exit(1)
}
