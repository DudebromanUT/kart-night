import type { Driver } from '../data/drivers'
import { textOn } from '../lib/color'

interface Props {
  driver?: Driver
  size?: 'sm' | 'md' | 'lg'
}

/** A driver's colored token. Stands in for official character art. */
export function Badge({ driver, size = 'md' }: Props) {
  if (!driver) return <span className={`badge badge-${size} badge-empty`} aria-hidden="true">?</span>
  return (
    <span className={`badge badge-${size}`} style={{ background: driver.color, color: textOn(driver.color) }} aria-hidden="true">
      {driver.tag}
    </span>
  )
}
