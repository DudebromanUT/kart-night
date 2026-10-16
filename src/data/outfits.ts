// Alternate outfits in Mario Kart World: 103 across 24 drivers, as of version 1.8.0.
// Each one unlocks the first time that driver eats the matching Dash Food.
// The other 26 drivers (Goomba, Cow, Pianta and the rest) only have their regular look.
// Source: Super Mario Wiki.

export const REGULAR_LOOK = 'Regular'

export const OUTFITS: Record<string, string[]> = {
  mario: ['Touring', 'Pro Racer', 'Mechanic', 'Dune Rider', 'Cowboy', 'Sightseeing', 'Aviator', 'Happi', 'All-Terrain'],
  luigi: ['Touring', 'Pro Racer', 'Mechanic', 'Oasis', 'Farmer', 'Happi', 'All-Terrain', 'Gondolier'],
  peach: ['Touring', 'Pro Racer', 'Farmer', 'Sightseeing', 'Aviator', 'Yukata', 'Aero', 'Vacation'],
  daisy: ['Touring', 'Pro Racer', 'Oasis', 'Swimwear', 'Aero', 'Vacation'],
  yoshi: ['Touring', 'Pro Racer', 'Aristocrat', 'Soft Server', 'Biker', 'Swimwear', 'Matsuri', 'Food Slinger'],
  'donkey-kong': ['All-Terrain'],
  bowser: ['Pro Racer', 'Supercharged', 'Biker', 'All-Terrain'],
  'bowser-jr': ['Pro Racer', 'Biker Jr.', 'Explorer'],
  'koopa-troopa': ['Runner', 'Pro Racer', 'Sailor', 'All-Terrain', 'Work Crew'],
  toad: ['Pro Racer', 'Engineer', 'Burger Bud', 'Explorer'],
  toadette: ['Pro Racer', 'Conductor', 'Soft Server', 'Explorer'],
  lakitu: ['Pit Crew', 'Fisherman'],
  'king-boo': ['Pro Racer', 'Aristocrat', 'Pirate'],
  'shy-guy': ['Pit Crew', 'Slope Styler'],
  wario: ['Pro Racer', 'Oasis', 'Wicked Wasp', 'Biker', 'Pirate', 'Road Ruffian', 'Work Crew'],
  waluigi: ['Pro Racer', 'Wampire', 'Mariachi', 'Biker', 'Road Ruffian'],
  birdo: ['Pro Racer', 'Vacation'],
  pauline: ['Aero'],
  rosalina: ['Touring', 'Pro Racer', 'Aurora', 'Aero'],
  'baby-mario': ['Pro Racer', 'Swimwear', 'Work Crew'],
  'baby-luigi': ['Pro Racer', 'Work Crew'],
  'baby-peach': ['Touring', 'Pro Racer', 'Sailor', 'Explorer'],
  'baby-daisy': ['Touring', 'Pro Racer', 'Sailor', 'Explorer'],
  'baby-rosalina': ['Touring', 'Pro Racer', 'Sailor', 'Explorer'],
}

/** Every look a driver can race in: their regular look first, then any outfits. */
export function looksFor(driverId: string): string[] {
  return [REGULAR_LOOK, ...(OUTFITS[driverId] ?? [])]
}
