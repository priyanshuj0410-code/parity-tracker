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

/** Shown once per device, a moment after the reader opens a second page, so it never interrupts the first read. */
export function InstallPrompt() {
  const { prompt, available } = useInstallable()
  const [open, setOpen] = useState(false)
  const [steps, setSteps] = useState(false)

  useEffect(() => {
    if (!available || seen()) return
    let t = 0
    const onNav = () => {
      window.removeEventListener('hashchange', onNav)
      t = window.setTimeout(() => { markSeen(); setOpen(true) }, 3000)
    }
    window.addEventListener('hashchange', onNav)
    return () => { window.removeEventListener('hashchange', onNav); window.clearTimeout(t) }
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
