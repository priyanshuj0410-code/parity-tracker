// /data/..., /feeds/spot/... and /logos/... (rewritten here by vercel.json, which passes the rest of the path as
// `path`, and `kind` for the feed and logos), served from the releases in Firestore.
import { handleData } from './_data.js'

export const config = { runtime: 'edge' }

export default function handler(req) {
  const q = new URL(req.url).searchParams
  const path = q.get('path') ?? ''
  return handleData(q.get('kind') ? `${q.get('kind')}/${path}` : path)
}
