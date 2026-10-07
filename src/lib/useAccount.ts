import { useCallback, useEffect, useState } from 'react'
import { ApiError, config, session, wallet, type Account, type Config, type Wallet } from './markets'

export interface AccountState {
  config: Config | null
  /** undefined while loading, null when signed out. */
  account: Account | null | undefined
  /** The reader is recorded as an adult; their wallet comes with it. */
  adult: boolean
  wallet: Wallet | null
  setWallet: (w: Wallet) => void
  refresh: () => Promise<void>
}

interface Loaded { config: Config; account: Account | null; wallet: Wallet | null }

async function check(): Promise<Loaded> {
  const c = await config()
  const a = c.configured ? await session() : null
  let w: Wallet | null = null
  if (a && c.enabled) {
    try { w = await wallet() } catch (err) { if (!(err instanceof ApiError)) throw err }
  }
  return { config: c, account: a, wallet: w }
}

/** Markets' switch, the signed-in account and, for an adult while markets are on, their wallet. */
export function useAccount(): AccountState {
  const [state, setState] = useState<Loaded | null>(null)
  const refresh = useCallback(() => check().then(setState), [])
  useEffect(() => {
    let gone = false
    check().then((s) => { if (!gone) setState(s) })
    return () => { gone = true }
  }, [])
  const setWallet = useCallback((w: Wallet) => setState((s) => (s ? { ...s, wallet: w } : s)), [])
  return { config: state?.config ?? null, account: state ? state.account : undefined, adult: !!state?.wallet, wallet: state?.wallet ?? null, setWallet, refresh }
}
