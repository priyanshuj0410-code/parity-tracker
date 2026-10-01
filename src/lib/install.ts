type Prompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

let deferred: Prompt | null = null
const subs = new Set<() => void>()
const notify = () => subs.forEach((f) => f())

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferred = e as Prompt
  notify()
})
window.addEventListener('appinstalled', () => {
  deferred = null
  notify()
})

export const subscribe = (f: () => void) => {
  subs.add(f)
  return () => { subs.delete(f) }
}
export const canPrompt = () => deferred !== null

export const standalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
export const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (/macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1)

export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false
  const p = deferred
  await p.prompt()
  const { outcome } = await p.userChoice
  deferred = null
  notify()
  return outcome === 'accepted'
}
