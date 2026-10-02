export const CORRECTIONS_EMAIL = 'priyanshu.jain@theequallens.com'

export const correctionHref = (about?: string) =>
  `mailto:${CORRECTIONS_EMAIL}?subject=${encodeURIComponent(about ? `Nivel correction: ${about}` : 'Nivel correction')}`
