import { DRIVERS, type Driver, type UnlockMethod } from './data/drivers'
import { VEHICLES, type VehicleType } from './data/vehicles'
import { CUPS } from './data/cups'
import { OUTFITS } from './data/outfits'
import { POINTS_BY_PLACE, ordinal } from './lib/scoring'

// Step 1 screen: shows the full roster so the data can be checked before the wheels go in.

const DRIVER_GROUPS: { method: UnlockMethod; title: string }[] = [
  { method: 'start', title: 'Starting drivers' },
  { method: 'cup', title: 'Win a cup' },
  { method: 'kamek', title: 'Kamek transformations' },
]
const VEHICLE_TYPES: VehicleType[] = ['Kart', 'Bike', 'Trike', 'Sled']

function textOn(hex: string): string {
  const n = parseInt(hex.slice(1), 16)
  const lum = 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)
  return lum > 150 ? '#14122b' : '#ffffff'
}

function Badge({ driver }: { driver: Driver }) {
  return (
    <span className="badge" style={{ background: driver.color, color: textOn(driver.color) }}>
      {driver.tag}
    </span>
  )
}

export default function App() {
  return (
    <main className="page">
      <header className="masthead">
        <p className="eyebrow">Kart Night &middot; step 1 of 5</p>
        <h1>The full grid</h1>
        <p className="lede">
          {DRIVERS.length} drivers, {VEHICLES.length} vehicles and {CUPS.length} cups from Mario Kart World.
          The two roulette wheels will spin from these lists.
        </p>
      </header>

      <section className="block">
        <h2>Drivers <span className="count">{DRIVERS.length}</span></h2>
        {DRIVER_GROUPS.map(group => {
          const list = DRIVERS.filter(d => d.unlock === group.method)
          return (
            <div key={group.method} className="group">
              <h3>{group.title} <span className="count">{list.length}</span></h3>
              <ul className="grid">
                {list.map(d => (
                  <li key={d.id} className="tile">
                    <Badge driver={d} />
                    <span className="tile-name">{d.name}</span>
                    {d.unlockHint && <span className="tile-note">{d.unlockHint}</span>}
                    {OUTFITS[d.id] && (
                      <span className="tile-note outfits">
                        {OUTFITS[d.id].length} outfit{OUTFITS[d.id].length === 1 ? '' : 's'}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </section>

      <section className="block">
        <h2>Vehicles <span className="count">{VEHICLES.length}</span></h2>
        {VEHICLE_TYPES.map(type => {
          const list = VEHICLES.filter(v => v.type === type)
          return (
            <div key={type} className="group">
              <h3>{type}s <span className="count">{list.length}</span></h3>
              <ul className="grid">
                {list.map(v => (
                  <li key={v.id} className="tile">
                    <span className="tile-name">{v.name}</span>
                    <span className="tile-note">
                      {v.starter ? 'From the start' : 'Unlock with coins'}
                      {v.returnsFrom ? ` · back from ${v.returnsFrom}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </section>

      <section className="block two-col">
        <div>
          <h2>Cups</h2>
          <ol className="cups">
            {CUPS.map(c => (
              <li key={c.id} style={{ borderColor: c.color }}>
                <strong>{c.name}</strong>
                <span>{c.courses.join(' · ')}</span>
              </li>
            ))}
          </ol>
        </div>
        <div>
          <h2>Points per place</h2>
          <p className="tile-note">24 racers. Some places share points.</p>
          <ol className="points">
            {POINTS_BY_PLACE.map((pts, i) => (
              <li key={i}><span>{ordinal(i + 1)}</span><strong>{pts}</strong></li>
            ))}
          </ol>
        </div>
      </section>
    </main>
  )
}
