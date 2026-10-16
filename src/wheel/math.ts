// Wheel geometry and spin timing. Pure functions, no drawing.
//
// Conventions: the pointer sits at the top. Slice 0 starts at the pointer and the
// slices run clockwise. The wheel's rotation is in radians, clockwise positive,
// matching PixiJS.

export const TAU = Math.PI * 2

export function mod(n: number, m: number): number {
  return ((n % m) + m) % m
}

export function sliceAngle(count: number): number {
  return TAU / count
}

/** The slice under the pointer when the wheel is turned by `rotation`. */
export function indexAt(rotation: number, count: number): number {
  const local = mod(-rotation, TAU)
  return Math.min(count - 1, Math.floor(local / sliceAngle(count)))
}

/**
 * The rotation that stops slice `index` under the pointer after at least
 * `minTurns` full turns from `current`. `offset` (0 to 1) is where inside the
 * slice the pointer comes to rest.
 */
export function landingRotation(current: number, index: number, count: number, minTurns: number, offset = 0.5): number {
  const base = -(index + offset) * sliceAngle(count)
  const earliest = current + minTurns * TAU
  const k = Math.ceil((earliest - base) / TAU)
  return base + k * TAU
}

/** Friction-style easing: a hard launch and a long glide to a stop. */
export function spinEase(t: number): number {
  const c = Math.min(1, Math.max(0, t))
  return 1 - Math.pow(1 - c, 4)
}

/** Pegs (slice edges) that passed the pointer while the wheel turned from `from` to `to`. */
export function pegsPassed(from: number, to: number, count: number): number {
  const a = sliceAngle(count)
  return Math.abs(Math.floor(to / a) - Math.floor(from / a))
}

/** A fair random integer in [0, count), from the browser's crypto source when available. */
export function randomIndex(count: number, random: () => number = cryptoRandom): number {
  return Math.min(count - 1, Math.floor(random() * count))
}

export function cryptoRandom(): number {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const buf = new Uint32Array(1)
    crypto.getRandomValues(buf)
    return buf[0] / 2 ** 32
  }
  return Math.random()
}

/**
 * Orders items so each group is spread evenly around the wheel instead of
 * bunched together (karts, bikes, trikes and sleds take turns).
 */
export function spreadByGroup<T>(items: T[], groupOf: (item: T) => string): T[] {
  const groups = new Map<string, T[]>()
  for (const item of items) {
    const key = groupOf(item)
    groups.set(key, [...(groups.get(key) ?? []), item])
  }
  const placed: { item: T; pos: number }[] = []
  let g = 0
  for (const members of groups.values()) {
    members.forEach((item, j) => placed.push({ item, pos: (j + 0.5) / members.length + g * 1e-6 }))
    g++
  }
  return placed.sort((a, b) => a.pos - b.pos).map(p => p.item)
}
