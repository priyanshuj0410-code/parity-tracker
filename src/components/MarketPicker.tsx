import { PHONE, useMedia } from '../lib/useMedia'
import { Dropdown } from './Dropdown'

/** Pills on wide screens; one dropdown on phones, so filters never take more than one row. */
export function MarketPicker({ label, value, options, onChange }: {
  label: string
  value: string
  options: { id: string; label: string }[]
  onChange: (v: string) => void
}) {
  const phone = useMedia(PHONE)
  if (phone) return <Dropdown label={label} value={value} options={options} onChange={onChange} />
  return (
    <div className="pills compact" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.id} type="button" className={value === o.id ? 'pill on' : 'pill'} aria-pressed={value === o.id} onClick={() => onChange(o.id)}>{o.label}</button>
      ))}
    </div>
  )
}
