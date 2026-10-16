// Knockout Tour rallies in Mario Kart World, as of version 1.8.0 (Sept 2026).
// 24 racers start. The bottom four drop out at each of five checkpoints and the
// last four race the final stretch. Knockout Tour awards no points in the game.
// Sources: Fextralife wiki, Nintendo update notes.

export interface Rally {
  id: string
  name: string
  color: string
  /** Game version that added the rally, if it came after launch. */
  addedIn?: string
}

export const RALLIES: Rally[] = [
  { id: 'golden', name: 'Golden Rally', color: '#E8B21F' },
  { id: 'ice', name: 'Ice Rally', color: '#6FC8E8' },
  { id: 'moon', name: 'Moon Rally', color: '#8C7AE6' },
  { id: 'spiny', name: 'Spiny Rally', color: '#E5484D' },
  { id: 'cherry', name: 'Cherry Rally', color: '#E0457B' },
  { id: 'acorn', name: 'Acorn Rally', color: '#B07A3B' },
  { id: 'heart', name: 'Heart Rally', color: '#F06BA8' },
  { id: 'cloud', name: 'Cloud Rally', color: '#9DB4D9' },
  { id: 'drill', name: 'Drill Rally', color: '#8A8FA3', addedIn: '1.7.0' },
  { id: 'boomerang', name: 'Boomerang Rally', color: '#3FA34D', addedIn: '1.7.0' },
  { id: 'propeller', name: 'Propeller Rally', color: '#4F86E0', addedIn: '1.8.0' },
  { id: 'turnip', name: 'Turnip Rally', color: '#9BC53D', addedIn: '1.8.0' },
]

export const RALLY_BY_ID: Record<string, Rally> = Object.fromEntries(RALLIES.map(r => [r.id, r]))
