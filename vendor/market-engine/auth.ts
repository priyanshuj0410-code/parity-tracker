import { createRemoteJWKSet, jwtVerify } from 'jose'

export interface Claims {
  sub: string
  email: string | null
}

// Verifies a Neon Auth bearer token against the project's JWKS. The verifier
// returns the claims, or null, which endpoints treat as 401.
export function neonAuthVerifier(baseUrl: string): (authorization: string | undefined) => Promise<Claims | null> {
  const jwks = createRemoteJWKSet(new URL(`${baseUrl.replace(/\/$/, '')}/.well-known/jwks.json`))
  return async (authorization) => {
    if (!authorization?.startsWith('Bearer ')) return null
    try {
      const { payload } = await jwtVerify(authorization.slice(7), jwks)
      if (typeof payload.sub !== 'string' || !payload.sub) return null
      return { sub: payload.sub, email: typeof payload.email === 'string' ? payload.email : null }
    } catch {
      return null
    }
  }
}
