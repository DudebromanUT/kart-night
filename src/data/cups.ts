// Grand Prix cups in Mario Kart World, with their four courses in order.
// Crown City and Peach Stadium each appear in two cups, on different layouts.
// Source: Super Mario Wiki.

export interface Cup {
  id: string
  name: string
  color: string
  courses: [string, string, string, string]
}

export const CUPS: Cup[] = [
  { id: 'mushroom', name: 'Mushroom Cup', color: '#E52521', courses: ['Mario Bros. Circuit', 'Crown City', 'Whistlestop Summit', 'DK Spaceport'] },
  { id: 'flower', name: 'Flower Cup', color: '#F7A21B', courses: ['Desert Hills', 'Shy Guy Bazaar', 'Wario Stadium', 'Airship Fortress'] },
  { id: 'star', name: 'Star Cup', color: '#F5D33B', courses: ['Starview Peak', 'DK Pass', 'Sky-High Sundae', 'Wario Shipyard'] },
  { id: 'shell', name: 'Shell Cup', color: '#3FB34F', courses: ['Koopa Troopa Beach', 'Faraway Oasis', 'Crown City', 'Peach Stadium'] },
  { id: 'banana', name: 'Banana Cup', color: '#F2D24B', courses: ['Peach Beach', 'Salty Salty Speedway', 'Dino Dino Jungle', 'Great ? Block Ruins'] },
  { id: 'leaf', name: 'Leaf Cup', color: '#8BC34A', courses: ['Cheep Cheep Falls', 'Dandelion Depths', 'Boo Cinema', 'Dry Bones Burnout'] },
  { id: 'lightning', name: 'Lightning Cup', color: '#FFC83D', courses: ['Moo Moo Meadows', 'Choco Mountain', "Toad's Factory", "Bowser's Castle"] },
  { id: 'special', name: 'Special Cup', color: '#8B5CF6', courses: ['Acorn Heights', 'Mario Circuit', 'Peach Stadium', 'Rainbow Road'] },
]
