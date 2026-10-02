/** The day the figures were collected. The build reads it too, for the Spot the Stereotype feed's `dataAsOf`. */
export const SOURCE_ISO = '2026-10-01'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const [y, m, d] = SOURCE_ISO.split('-').map(Number)
export const SOURCE_DATE = `${d} ${MONTHS[m - 1]} ${y}`
