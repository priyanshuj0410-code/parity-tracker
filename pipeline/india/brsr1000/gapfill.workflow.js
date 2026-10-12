export const meta = {
  name: 'brsr1000-gapfill',
  description: "Read only the missing mandatory fields of checked BRSR readings (Haiku), for Nivel's BRSR filer build (PARITY-129)",
  phases: [{ title: 'Fill gaps', detail: 'five companies per Haiku agent', model: 'haiku' }],
}

const { data, spec, items } = args  // items: [{ key, fields: ['unions', 'wellbeingSpend', ...] }]
const chunks = []
for (let i = 0; i < items.length; i += 5) chunks.push(items.slice(i, i + 5))

const DONE = {
  type: 'object',
  properties: { written: { type: 'array', items: { type: 'string' } }, problems: { type: 'array', items: { type: 'string' } } },
  required: ['written', 'problems'],
}

const prompt = (its) => `You are filling gaps in checked readings of Indian companies' Business Responsibility and Sustainability Reports (BRSR) for Nivel, a gender pay tracker. Accuracy matters more than speed: these numbers are published.

First read ${spec}: it gives the exact JSON format of each field and the reading rules. Follow it exactly.

Then, for each company below, read ONLY the fields listed for it:
${its.map((x) => `- ${x.key}: ${x.fields.join(', ')}`).join('\n')}

For each company:
1. Read ${data}/snippets/<key>.txt. It holds the report's tables, with the source named at the top.
2. If a listed field's table is missing from the snippet or cut off, look it up in the full text named under "Source" (${data}/latest/txt/<key>.txt, or ${data}/kaggle/txt/<file>.txt for a Kaggle file) with one Grep for its heading. At most 3 such lookups per company. Never render PDF pages or images.
3. Write ${data}/read/<key>.gap.json with the Write tool: {"key": "<key>", "fy": "<the reporting year in Section A>", then each listed field in the reading format, "nil": [the listed fields whose WHOLE table the report gives as nil, NA, not applicable or '-'], "notes": "<anything odd>"}.
   A table with figures but no row for one item (say, no wages line among the complaints) is written with what it has, not put in "nil".
   A field whose table you cannot find goes in neither the object nor "nil": leave it out. Never fill one table from another, and never guess.

Return the keys you wrote and any problems, one line each.`

phase('Fill gaps')
const res = await parallel(chunks.map((its) => () => agent(prompt(its), { label: `gap:${its[0].key}`, phase: 'Fill gaps', model: 'haiku', schema: DONE })))
const ok = res.filter(Boolean)
return { written: ok.flatMap((r) => r.written), problems: ok.flatMap((r) => r.problems) }
