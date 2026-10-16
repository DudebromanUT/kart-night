// Racers and their current rides. Kept in this browser for now; step 4 moves
// players and history to the shared database so every device sees the same thing.

export interface Player {
  id: string
  name: string
}

export interface Ride {
  driverId?: string
  outfit?: string
  vehicleId?: string
}

export const PLAYERS_KEY = 'kart-night:players'
export const RIDES_KEY = 'kart-night:rides'

/** Placeholder names; the family renames them in the app. */
export const DEFAULT_PLAYERS: Player[] = [1, 2, 3, 4].map(n => ({ id: `p${n}`, name: `Player ${n}` }))
