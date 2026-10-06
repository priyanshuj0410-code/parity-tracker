// /api/markets: Nivel's play-money markets for players. Logic in _markets.ts.
import { ctxFromEnv, playerRoute } from './_markets.js'

export const config = { runtime: 'edge' }

export default async function handler(req: Request): Promise<Response> {
  return playerRoute(req, await ctxFromEnv())
}
