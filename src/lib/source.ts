import release from '../data/release.json'

/** The day the figures were collected, set when the release was published (src/data/release.json). */
export const SOURCE_ISO = release.collected

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const [y, m, d] = SOURCE_ISO.split('-').map(Number)
export const SOURCE_DATE = `${d} ${MONTHS[m - 1]} ${y}`
