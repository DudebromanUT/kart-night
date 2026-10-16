// Every playable driver in Mario Kart World (50), as of game version 1.8.0 (Sept 2026).
// Source: Super Mario Wiki roster and Nintendo's update notes. No update after launch
// has added a driver; version 1.1.0 moved nine Kamek unlocks into the starting roster.

export type UnlockMethod = 'start' | 'cup' | 'kamek'

export interface Driver {
  id: string
  name: string
  /** Short label drawn on the driver's badge in place of official artwork. */
  tag: string
  /** Signature color for the badge and wheel slice. */
  color: string
  unlock: UnlockMethod
  /** How to unlock, in plain words. Empty for starting drivers. */
  unlockHint: string
}

const start = (id: string, name: string, tag: string, color: string): Driver => ({
  id, name, tag, color, unlock: 'start', unlockHint: '',
})
const cup = (id: string, name: string, tag: string, color: string, cupName: string): Driver => ({
  id, name, tag, color, unlock: 'cup', unlockHint: `Win the ${cupName}`,
})
const kamek = (id: string, name: string, tag: string, color: string): Driver => ({
  id, name, tag, color, unlock: 'kamek', unlockHint: 'Get turned into them by the Kamek item',
})

export const DRIVERS: Driver[] = [
  // Starting roster (32)
  start('mario', 'Mario', 'M', '#E52521'),
  start('luigi', 'Luigi', 'L', '#2FA84F'),
  start('peach', 'Peach', 'P', '#F49AC1'),
  start('yoshi', 'Yoshi', 'Y', '#6CC24A'),
  start('toad', 'Toad', 'T', '#E94B3C'),
  start('koopa-troopa', 'Koopa Troopa', 'KT', '#3FB34F'),
  start('bowser', 'Bowser', 'B', '#E07B16'),
  start('wario', 'Wario', 'W', '#E8C21A'),
  start('waluigi', 'Waluigi', 'Wa', '#7B3FA0'),
  start('pauline', 'Pauline', 'Pa', '#C8102E'),
  start('baby-mario', 'Baby Mario', 'bM', '#F0605D'),
  start('baby-luigi', 'Baby Luigi', 'bL', '#5CC97A'),
  start('baby-peach', 'Baby Peach', 'bP', '#F7B6D2'),
  start('baby-daisy', 'Baby Daisy', 'bD', '#F7B84B'),
  start('toadette', 'Toadette', 'Te', '#F06BA8'),
  start('baby-rosalina', 'Baby Rosalina', 'bR', '#7FD3EA'),
  start('shy-guy', 'Shy Guy', 'SG', '#D7263D'),
  start('nabbit', 'Nabbit', 'N', '#8E6FBF'),
  start('piranha-plant', 'Piranha Plant', 'PP', '#2E9E44'),
  start('hammer-bro', 'Hammer Bro', 'HB', '#4C9A2A'),
  start('monty-mole', 'Monty Mole', 'MM', '#8B5E3C'),
  start('goomba', 'Goomba', 'G', '#9C5A2E'),
  start('sidestepper', 'Sidestepper', 'Sd', '#E4572E'),
  start('cheep-cheep', 'Cheep Cheep', 'CC', '#F25C54'),
  start('dry-bones', 'Dry Bones', 'DB', '#C9C3B4'),
  start('wiggler', 'Wiggler', 'Wg', '#F5B700'),
  start('pokey', 'Pokey', 'Pk', '#C8B53A'),
  start('cow', 'Cow', 'Cw', '#6E6259'),
  start('stingby', 'Stingby', 'St', '#F2C230'),
  start('snowman', 'Snowman', 'Sn', '#BFE3F2'),
  start('penguin', 'Penguin', 'Pn', '#3C6E9E'),
  start('para-biddybud', 'Para-Biddybud', 'PB', '#E85D75'),

  // Unlocked by winning Grand Prix cups (7)
  cup('donkey-kong', 'Donkey Kong', 'DK', '#8B5A2B', 'Mushroom Cup'),
  cup('daisy', 'Daisy', 'D', '#F7A21B', 'Flower Cup'),
  cup('rosalina', 'Rosalina', 'R', '#5EC8E5', 'Star Cup'),
  cup('lakitu', 'Lakitu', 'Lk', '#9ED36A', 'Shell Cup'),
  cup('birdo', 'Birdo', 'Bd', '#F27BB4', 'Banana Cup'),
  cup('king-boo', 'King Boo', 'KB', '#E9E4F2', 'Leaf Cup'),
  cup('bowser-jr', 'Bowser Jr.', 'BJ', '#F29B30', 'Lightning Cup'),

  // Unlocked when the Kamek item transforms you mid-race (11)
  kamek('cataquack', 'Cataquack', 'Cq', '#F28C28'),
  kamek('spike', 'Spike', 'Sp', '#5BAA4A'),
  kamek('pianta', 'Pianta', 'Pi', '#3D8FD6'),
  kamek('rocky-wrench', 'Rocky Wrench', 'RW', '#7D6B5D'),
  kamek('conkdor', 'Conkdor', 'Cd', '#D9A441'),
  kamek('peepa', 'Peepa', 'Pe', '#D8D2E8'),
  kamek('swoop', 'Swoop', 'Sw', '#5E4B8B'),
  kamek('fish-bone', 'Fish Bone', 'FB', '#B8C4CC'),
  kamek('coin-coffer', 'Coin Coffer', 'CF', '#E6B422'),
  kamek('dolphin', 'Dolphin', 'Dp', '#4FA3D9'),
  kamek('chargin-chuck', "Chargin' Chuck", 'Ch', '#3E8E41'),
]

export const DRIVER_BY_ID: Record<string, Driver> = Object.fromEntries(DRIVERS.map(d => [d.id, d]))
