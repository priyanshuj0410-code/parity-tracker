/** Scrolls a sideways-scrolling row (never the page) just enough to show its selected item, with room to spare at either edge. */
export function revealInRow(row: HTMLElement | null, selector: string, room = 24) {
  const item = row?.querySelector<HTMLElement>(selector)
  if (!row || !item) return
  const left = item.getBoundingClientRect().left - row.getBoundingClientRect().left + row.scrollLeft
  const right = left + item.offsetWidth
  if (left - room < row.scrollLeft) row.scrollLeft = Math.max(0, left - room)
  else if (right + room > row.scrollLeft + row.clientWidth) row.scrollLeft = right + room - row.clientWidth
}
