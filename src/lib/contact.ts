export const CORRECTIONS_EMAIL = 'priyanshu.jain@theequallens.com'

export const correctionHref = (about?: string) =>
  `mailto:${CORRECTIONS_EMAIL}?subject=${encodeURIComponent(about ? `Nivel correction: ${about}` : 'Nivel correction')}`

/**
 * The markets' grievance contact (safeguarding review, sections 5 and 6). Not yet named by the owner: until it is,
 * pages say so and offer no address. Set the email here before markets are switched on.
 */
export const GRIEVANCE_EMAIL: string | null = null

export const grievanceHref = (about: string) =>
  GRIEVANCE_EMAIL ? `mailto:${GRIEVANCE_EMAIL}?subject=${encodeURIComponent(`Nivel markets: ${about}`)}` : null
