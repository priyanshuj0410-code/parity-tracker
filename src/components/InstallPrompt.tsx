import { useEffect, useState, useSyncExternalStore } from 'react'
import { canPrompt, isIos, promptInstall, standalone, subscribe } from '../lib/install'

const SEEN = 'nivel-install-seen'
const seen = () => { try { return localStorage.getItem(SEEN) === '1' } catch { return true } }
const markSeen = () => { try { localStorage.setItem(SEEN, '1') } catch { /* private mode: it may show again next visit */ } }

function useInstallable() {
  const prompt = useSyncExternalStore(subscribe, canPrompt)
  const [ios] = useState(() => isIos() && !standalone())
  return { prompt, ios, available: !standalone() && (prompt || ios) }
}

/** Shown once per device, a few seconds into the first visit where the app can be installed. */
export function InstallPrompt() {
  const { prompt, available } = useInstallable()
  const [open, setOpen] = useState(false)
  const [steps, setSteps] = useState(false)

  useEffect(() => {
    if (!available || seen()) return
    const t = window.setTimeout(() => { markSeen(); setOpen(true) }, 8000)
    return () => window.clearTimeout(t)
  }, [available])

  if (!open) return null
  const install = async () => {
    if (prompt) { await promptInstall(); setOpen(false) } else setSteps(true)
  }
  return (
    <div className="install-pop" role="dialog" aria-labelledby="install-title" aria-describedby="install-text">
      <img src="/icons/icon-192.png" alt="" width="44" height="44" />
      <div className="install-body">
        <strong id="install-title">Install Nivel</strong>
        <p id="install-text">{steps
          ? <>In Safari, tap <b>Share</b>, then <b>Add to Home Screen</b>.</>
          : 'Open it from your home screen like an app. It works offline too.'}</p>
        <div className="install-actions">
          {!steps && <button type="button" className="btn-primary" onClick={install}>{prompt ? 'Install' : 'Show me how'}</button>}
          <button type="button" className="btn-quiet" onClick={() => setOpen(false)}>{steps ? 'Done' : 'Not now'}</button>
        </div>
      </div>
      <button type="button" className="install-x" aria-label="Close" onClick={() => setOpen(false)}>
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="m3 3 8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
      </button>
    </div>
  )
}

/** A quiet footer link, so installing stays possible after the one-time prompt. */
export function InstallLink() {
  const { prompt, ios, available } = useInstallable()
  const [steps, setSteps] = useState(false)
  if (!available) return null
  if (steps && ios) return <span className="install-link">In Safari, tap Share, then Add to Home Screen.</span>
  return <button type="button" className="install-link" onClick={() => (prompt ? promptInstall() : setSteps(true))}>Install the app</button>
}
