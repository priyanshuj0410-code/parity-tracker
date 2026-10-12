export const meta = {
  name: 'brsr1000-adjudicate',
  description: "Settle readings that disagree with the parser, or were never written (Sonnet), for Nivel's BRSR filer build (PARITY-123)",
  phases: [{ title: 'Adjudicate', detail: 'four companies per Sonnet agent', model: 'sonnet' }],
}

const { data, spec, keys } = args
const chunks = []
for (let i = 0; i < keys.length; i += 4) chunks.push(keys.slice(i, i + 4))

const DONE = {
  type: 'object',
  properties: {
    written: { type: 'array', items: { type: 'string' } },
    corrections: { type: 'array', items: { type: 'string' } },
  },
  required: ['written', 'corrections'],
}

const prompt = (ks) => `You are the second checker on tables from Indian companies' Business Responsibility and Sustainability Reports (BRSR), for Nivel, a gender pay tracker. The numbers will be published, so settle each one from the report itself.

Read ${spec} first: it gives the JSON format and the reading rules.

Read ${data}/batch/current.json. Its "disputes" lists, per key, the fields where a first reading and an automatic parser disagree; "unread" lists keys with no first reading at all. Work on these keys: ${ks.join(', ')}.

For each key:
1. Read ${data}/snippets/<key>.txt. If a table is missing or cut off, Grep the full text named under "Source" (${data}/latest/txt/<key>.txt, or ${data}/kaggle/txt/<file>.txt), at most 5 lookups per company. Never render PDF pages or images.
2. Read the first reading (${data}/read/<key>.haiku.json, if it exists) and the parser's candidates (${data}/cand/<key>.json). Either can be wrong. The parser often picks up numbers from a neighbouring row, an assurance index or a year label.
3. Decide every disputed field from the report text. A dispute of "audit" means no field disagreed: check the whole reading. A dispute of "deep" means check every "ladder", "functions", "flows" and "targets" row against its source ("where"): the level or function name, its mapping to "standard", the counts or percentages, the population ("scope") and the year. Check "leadership", "ownership", "policies" and "payRatio" the same way. Search the full text (and the annual report text, if one exists at ${data}/latest/txt/<key>.ar.txt) for any level or function table the first reading missed.
4. Write ${data}/read/<key>.final.json with the Write tool: the full reading in the format, corrected.

Return the keys you wrote and one line per correction you made ("<key> <field>: <old> -> <new>, because ...").`

phase('Adjudicate')
const res = await parallel(chunks.map((ks) => () => agent(prompt(ks), { label: `settle:${ks[0]}`, phase: 'Adjudicate', model: 'sonnet', schema: DONE })))
const ok = res.filter(Boolean)
return { written: ok.flatMap((r) => r.written), corrections: ok.flatMap((r) => r.corrections) }
