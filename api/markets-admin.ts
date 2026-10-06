// /api/markets-admin: the owner's console for creating, resolving and voiding markets. Logic in _markets.ts.
import { adminRoute, ctxFromEnv } from './_markets.js'

export const config = { runtime: 'edge' }

export default async function handler(req: Request): Promise<Response> {
  return adminRoute(req, await ctxFromEnv())
}
