// Small color helpers for hex strings like '#E52521'.

function parse(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [n >> 16, (n >> 8) & 255, n & 255]
}

function toHex([r, g, b]: [number, number, number]): string {
  return '#' + [r, g, b].map(c => Math.round(c).toString(16).padStart(2, '0')).join('')
}

/** Blend `a` toward `b` by `amount` (0 = all a, 1 = all b). */
export function mix(a: string, b: string, amount: number): string {
  const ca = parse(a)
  const cb = parse(b)
  return toHex([0, 1, 2].map(i => ca[i] + (cb[i] - ca[i]) * amount) as [number, number, number])
}

export function luminance(hex: string): number {
  const [r, g, b] = parse(hex)
  return 0.299 * r + 0.587 * g + 0.114 * b
}

/** Dark or light ink, whichever reads better on `hex`. */
export function textOn(hex: string): string {
  return luminance(hex) > 150 ? '#14122b' : '#ffffff'
}

export function toNumber(hex: string): number {
  return parseInt(hex.slice(1), 16)
}
