const SKIP = new Set(['the', 'ltd', 'ltd.', 'limited', 'plc', 'group', 'inc', 'inc.', 'corp', 'corp.', 'co', 'co.', 'and', '&', 'of', 'sa', 'se', 'ag', 'n.v.', 'nv'])
const TONES = ['t1', 't2', 't3', 't4']

export function Monogram({ name, seed }: { name: string; seed: string }) {
  const words = name.replace(/[^\p{L}\p{N}&.' -]/gu, ' ').split(/\s+/).filter((w) => w && !SKIP.has(w.toLowerCase()))
  const initials = (words.length > 1 ? words[0][0] + words[1][0] : (words[0] ?? '?').slice(0, 2)).toUpperCase()
  let h = 0
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return <span className={`mono ${TONES[h % TONES.length]}`} aria-hidden="true">{initials}</span>
}
