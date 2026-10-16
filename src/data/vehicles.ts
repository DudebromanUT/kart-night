// Every vehicle in Mario Kart World (40), as of game version 1.8.0 (Sept 2026).
// Mario Kart World has no kart parts: each vehicle is a single pick.
// 11 are available from the start; the rest unlock one at a time, every 100 coins
// collected, in an order the game picks.
// Source: Super Mario Wiki vehicle list. The wiki files the two sleds under "mobiles".

export type VehicleType = 'Kart' | 'Bike' | 'Trike' | 'Sled'

export interface Vehicle {
  id: string
  name: string
  type: VehicleType
  /** Available from the first race, no coins needed. */
  starter: boolean
  /** Earlier Mario Kart game the vehicle returns from, if any. */
  returnsFrom?: string
}

const v = (id: string, name: string, type: VehicleType, starter = false, returnsFrom?: string): Vehicle => ({
  id, name, type, starter, returnsFrom,
})

export const VEHICLES: Vehicle[] = [
  // Karts (21)
  v('standard-kart', 'Standard Kart', 'Kart', true),
  v('rally-kart', 'Rally Kart', 'Kart', true),
  v('plushbuggy', 'Plushbuggy', 'Kart', true),
  v('baby-blooper', 'Baby Blooper', 'Kart', true),
  v('zoom-buggy', 'Zoom Buggy', 'Kart', true),
  v('chargin-truck', "Chargin' Truck", 'Kart', true),
  v('hot-rod', 'Hot Rod', 'Kart'),
  v('ribbit-revster', 'Ribbit Revster', 'Kart'),
  v('roadster-royale', 'Roadster Royale', 'Kart'),
  v('b-dasher', 'B Dasher', 'Kart', false, 'Mario Kart DS'),
  v('biddybuggy', 'Biddybuggy', 'Kart', false, 'Mario Kart 8'),
  v('bowser-bruiser', 'Bowser Bruiser', 'Kart'),
  v('tiny-titan', 'Tiny Titan', 'Kart', false, 'Mario Kart Wii'),
  v('reel-racer', 'Reel Racer', 'Kart'),
  v('bumble-v', 'Bumble V', 'Kart', false, 'Mario Kart 7'),
  v('carpet-flyer', 'Carpet Flyer', 'Kart'),
  v('cloud-9', 'Cloud 9', 'Kart', false, 'Mario Kart 7'),
  v('big-horn', 'Big Horn', 'Kart'),
  v('lil-dumpy', "Li'l Dumpy", 'Kart'),
  v('pipe-frame', 'Pipe Frame', 'Kart', false, 'Super Mario Kart'),
  v('billdozer', 'Billdozer', 'Kart'),

  // Bikes (11)
  v('standard-bike', 'Standard Bike', 'Bike', true),
  v('rally-bike', 'Rally Bike', 'Bike', true),
  v('cute-scoot', 'Cute Scoot', 'Bike', true),
  v('mach-rocket', 'Mach Rocket', 'Bike', true),
  v('hyper-pipe', 'Hyper Pipe', 'Bike'),
  v('tune-thumper', 'Tune Thumper', 'Bike'),
  v('w-twin-chopper', 'W-Twin Chopper', 'Bike'),
  v('fin-twin', 'Fin Twin', 'Bike'),
  v('rob-hog', 'R.O.B. H.O.G.', 'Bike'),
  v('dolphin-dasher', 'Dolphin Dasher', 'Bike', false, 'Mario Kart Wii'),
  v('loco-moto', 'Loco Moto', 'Bike'),

  // Trikes (6)
  v('funky-dorrie', 'Funky Dorrie', 'Trike', true),
  v('junkyard-hog', 'Junkyard Hog', 'Trike'),
  v('lobster-roller', 'Lobster Roller', 'Trike'),
  v('blastronaut-iii', 'Blastronaut III', 'Trike'),
  v('mecha-trike', 'Mecha Trike', 'Trike'),
  v('rallygator', 'Rallygator', 'Trike'),

  // Sleds (2)
  v('dread-sled', 'Dread Sled', 'Sled'),
  v('stellar-sled', 'Stellar Sled', 'Sled'),
]

export const VEHICLE_BY_ID: Record<string, Vehicle> = Object.fromEntries(VEHICLES.map(x => [x.id, x]))
