export const meta = {
  name: 'brsr1000-discover',
  description: "Find each company's latest BRSR PDF on its own website (Haiku, then Sonnet for misses), for Nivel's BRSR filer build (PARITY-123)",
  phases: [
    { title: 'Find reports', detail: 'five companies per Haiku agent', model: 'haiku' },
    { title: 'Find again', detail: 'Sonnet, three companies per agent, for every company Haiku could not place', model: 'sonnet' },
  ],
}

// mode "first": Haiku for every key, then Sonnet for its misses. mode "refind": Sonnet only, for keys whose download
// failed or held no FY2025-26 BRSR; batch/current.json "refind" says why for each.
const { data, keys, mode = 'first' } = args
const chunks = []
for (let i = 0; i < keys.length; i += 5) chunks.push(keys.slice(i, i + 5))

const FOUND = {
  type: 'object',
  properties: {
    results: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          key: { type: 'string' },
          status: { type: 'string', enum: ['found', 'not-published', 'not-found', 'site-blocked'] },
          candidates: {
            type: 'array',
            items: {
              type: 'object',
              properties: { url: { type: 'string' }, fy: { type: 'string' }, kind: { type: 'string' }, foundOn: { type: 'string' }, localPath: { type: 'string' } },
              required: ['url', 'fy', 'kind', 'foundOn'],
            },
          },
          note: { type: 'string' },
        },
        required: ['key', 'status', 'candidates'],
      },
    },
  },
  required: ['results'],
}

const TACTICS = (calls) => `How to find them (in this order, at most ${calls} web calls per company):
1. Load the web tools first with ToolSearch, query "select:WebSearch,WebFetch".
2. Search the open web: "<company name> annual report 2025-26 pdf", "<company name> BRSR 2025-26", and "<company name> integrated report 2026". Accept a result only if the PDF is on the company's own domain or a host its own pages link to (its CDN or cloud storage).
3. Open the investor pages with WebFetch. Try the usual paths when the home page has no links: /investors, /investor-relations, /investor, /annual-reports, /financials, /reports, /shareholders, /regulation-46, /disclosures-under-regulation-46. Indian listed companies must post their annual report under SEBI Regulation 46, so that page is a good bet.
4. If a page is rendered by JavaScript and shows no links, fetch /sitemap.xml or /wp-sitemap.xml and look for annual-report or BRSR PDFs, or search "site:<domain> pdf 2025-26".
5. WordPress sites usually keep PDFs at /wp-content/uploads/2026/<month>/...; a search for "site:<domain> wp-content uploads 2026" often finds them.
6. An exchange filing or news item that names the company's own URL is a hint you may follow; the exchange copy itself is never used.`

const prompt = (ks) => `You are finding sustainability reports for Indian listed companies, for Nivel (a gender pay tracker by The Equal Lens).

Read ${data}/batch/current.json. Its "entries" give each company's name, CIN, website (read from its last BRSR) and kaggleFY (the year we already hold). Work on these keys only: ${ks.join(', ')}.

For each company, find two documents for its LATEST year, FY2025-26 (April 2025 to March 2026, published around June to September 2026), as direct PDF links:
(a) its Business Responsibility and Sustainability Report (BRSR), standalone if the company publishes one separately;
(b) its full annual report or integrated report, which usually contains the BRSR and a human capital, people or diversity section with women and men by grade, level or job function. We read that section too.
If the BRSR exists only inside the annual report, (b) alone is enough.

Rules:
- Only the company's own website, or a PDF its own site links to (its CDN or document host). Never nseindia.com or bseindia.com, and never third-party mirrors, aggregators or document-sharing sites.
- Do not download PDFs; report the URL only. A PDF too large for WebFetch still counts as found.

${TACTICS(10)}
- If FY2025-26 is not published, give the newest year you can find and set status "not-published". If the site refuses you, "site-blocked". If you find nothing, "not-found" with no candidates.
- Up to 4 candidates per company: the standalone BRSR first if there is one, then the annual report. Each has url (the PDF itself), fy (the year as the page labels it, for example "2025-26"), kind ("brsr" or "annual-report") and foundOn (the page where you saw the link).

For each company, write ${data}/found/<key>.json with the Write tool, exactly {"key": ..., "status": ..., "candidates": [...], "note": "..."}. Then return all of them.`

const again = (ks, why) => `You are the second searcher for sustainability reports of Indian listed companies, for Nivel (a gender pay tracker by The Equal Lens). A first search${why ? ' or download' : ''} failed for these companies; find what it missed.

Read ${data}/batch/current.json for each company's name, CIN and website ("entries")${why ? ', and "refind" for why each one is back: a link that returned an error, an annual report that turned out to hold no BRSR, or a report from the wrong year' : ''}. Read ${data}/found/<key>.json for what the first search tried. Work on these keys only: ${ks.join(', ')}.

Find the FY2025-26 BRSR (April 2025 to March 2026) as a direct PDF link, plus the full annual report if it is a separate file. If the annual report found earlier holds no BRSR, the BRSR is a separate document: look for it under "Business Responsibility", "BRSR", "Sustainability" or "ESG" on the investor pages or the Regulation 46 page. If a link returned 404 or 403, find the same file's current address (the site may have moved it, or use www or no www).

Rules:
- Only the company's own website, or a PDF its own site links to. Never nseindia.com or bseindia.com, and never third-party mirrors, aggregators or document-sharing sites.
- Do not download PDFs with shell tools. Do not list a URL the first search already tried unless you have confirmed a different working address, with one exception:
- If the reason says a link "returned 403" or "returned 000" (the site refuses scripted downloads, or its connection fails for scripts), open the PDF URL itself with WebFetch. WebFetch saves a PDF it cannot read to a local file and tells you the path. Put that path in the candidate as "localPath", next to the same url. Only for a PDF on the company's own domain.
- If FY2025-26 truly is not on the site, say "not-published" and give the evidence (the page you read and the newest year it lists).

${TACTICS(14)}

Overwrite ${data}/found/<key>.json with the Write tool: {"key": ..., "status": ..., "candidates": [...], "note": "..."}. Keep any earlier candidate that is still valid. Then return all of them.`

const placed = (r) => r && r.status === 'found' && r.candidates.some((c) => /2025-?26|2026/.test(c.fy || ''))
let results = []
if (mode === 'first') {
  phase('Find reports')
  const res = await parallel(chunks.map((ks) => () => agent(prompt(ks), { label: `find:${ks[0]}`, phase: 'Find reports', model: 'haiku', schema: FOUND })))
  results = res.filter(Boolean).flatMap((r) => r.results)
}
// Every company the first pass could not place (or, in refind mode, every key given) goes to Sonnet.
const misses = mode === 'first' ? keys.filter((k) => !placed(results.find((r) => r.key === k))) : keys
if (misses.length) {
  phase('Find again')
  log(`${misses.length} companies to Sonnet: ${misses.join(', ')}`)
  const grp = []
  for (let i = 0; i < misses.length; i += 3) grp.push(misses.slice(i, i + 3))
  const res2 = await parallel(grp.map((ks) => () => agent(again(ks, mode === 'refind'), { label: `again:${ks[0]}`, phase: 'Find again', model: 'sonnet', schema: FOUND })))
  const second = res2.filter(Boolean).flatMap((r) => r.results)
  results = results.filter((r) => !second.some((s) => s.key === r.key)).concat(second)
}
const missing = keys.filter((k) => !results.some((r) => r.key === k))
if (missing.length) log(`No result returned for ${missing.length}: ${missing.join(', ')}`)
return { placed: results.filter(placed).length, of: keys.length, results, missing }
