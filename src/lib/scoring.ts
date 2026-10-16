// Mario Kart World Grand Prix points for a 24-racer field.
// Unlike earlier games, some neighboring places share the same points.
// Source: Super Mario Wiki, Grand Prix page.

export const FIELD_SIZE = 24

export const POINTS_BY_PLACE: readonly number[] = [
  15, 12, 10, 9, 9, 8, 8, 7, 7, 6, 6, 6,
  5, 5, 5, 4, 4, 4, 3, 3, 3, 2, 2, 1,
]

/** Points for a finishing place (1 = first). Anything off the grid scores 0. */
export function pointsFor(place: number): number {
  if (!Number.isInteger(place) || place < 1 || place > FIELD_SIZE) return 0
  return POINTS_BY_PLACE[place - 1]
}

export function ordinal(n: number): string {
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`
  switch (n % 10) {
    case 1: return `${n}st`
    case 2: return `${n}nd`
    case 3: return `${n}rd`
    default: return `${n}th`
  }
}
