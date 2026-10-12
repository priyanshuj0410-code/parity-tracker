export const meta = {
  name: 'brsr1000-read',
  description: "Read each company's BRSR tables into the reading format (Haiku), for Nivel's BRSR filer build (PARITY-123)",
  phases: [{ title: 'Read tables', detail: 'four companies per Haiku agent', model: 'haiku' }],
}

const { data, spec, keys } = args
const chunks = []
for (let i = 0; i < keys.length; i += 4) chunks.push(keys.slice(i, i + 4))

const DONE = {
  type: 'object',
  properties: { written: { type: 'array', items: { type: 'string' } }, problems: { type: 'array', items: { type: 'string' } } },
  required: ['written', 'problems'],
}

const prompt = (ks) => `You are transcribing tables from Indian companies' Business Responsibility and Sustainability Reports (BRSR) for Nivel, a gender pay tracker. Accuracy matters more than speed: these numbers are published.

First read ${spec}: it gives the exact JSON format and the reading rules. Follow it exactly.

Then, for each key in ${ks.join(', ')}:
1. Read ${data}/snippets/<key>.txt once. It holds the report's relevant tables, cut from the PDF text, with the source named at the top. Work from it.
2. Only if a core table is missing from the snippet or cut off (Q20 headcount, women on the board, P5 3b wage share, P5 3a median pay), look it up in the full text named under "Source" (${data}/latest/txt/<key>.txt, or ${data}/kaggle/txt/<file>.txt for a Kaggle file) with one Grep for its heading. At most 3 such lookups per company. Never render PDF pages or images: if the text is missing, write nulls and say "no text" in notes.
3. Read the snippet's "Deep" section for levels and job functions split by gender. Record them as "ladder" and "functions" rows per the format, each with "where". Many companies report none, and that is fine.
4. Fill the other BRSR tables (A in the format) from their sections, and the annual-report extras (B) from the "Annual-report extras" passages. Use only what the snippet shows for these: leave a field null rather than search the full text for it.
5. Write ${data}/read/<key>.haiku.json with the Write tool, in the reading format.

Do not look at ${data}/cand/: read the report yourself. Return the keys you wrote and any problems, one line each.`

phase('Read tables')
const res = await parallel(chunks.map((ks) => () => agent(prompt(ks), { label: `read:${ks[0]}`, phase: 'Read tables', model: 'haiku', schema: DONE })))
const ok = res.filter(Boolean)
return { written: ok.flatMap((r) => r.written), problems: ok.flatMap((r) => r.problems) }
