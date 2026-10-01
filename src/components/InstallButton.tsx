import { useEffect, useState } from 'react'

interface InstallPrompt extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const standalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (/macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1)

export function InstallButton() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null)
  const [ios] = useState(() => isIos() && !standalone())
  const [help, setHelp] = useState(false)

  useEffect(() => {
    const onPrompt = (e: Event) => { e.preventDefault(); setPrompt(e as InstallPrompt) }
    const onInstalled = () => setPrompt(null)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (!prompt && !ios) return null
  const click = async () => {
    if (!prompt) return setHelp((h) => !h)
    await prompt.prompt()
    await prompt.userChoice
    setPrompt(null)
  }
  return (
    <div className="install">
      <button type="button" className="btn-install" onClick={click} aria-expanded={prompt ? undefined : help} aria-label="Install Nivel as an app">
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12m0 0-4.5-4.5M12 15l4.5-4.5M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></svg>
        <span>Install app</span>
      </button>
      {help && (
        <div className="install-help" role="note">
          In Safari, tap <strong>Share</strong>, then <strong>Add to Home Screen</strong>. Nivel then opens like an app and works offline.
        </div>
      )}
    </div>
  )
}
