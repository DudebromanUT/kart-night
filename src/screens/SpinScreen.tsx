import { useRef, useState, type FormEvent } from 'react'
import * as sfx from '../audio/sfx'
import { Badge } from '../components/Badge'
import { WheelCanvas, type WheelHandle } from '../components/WheelCanvas'
import { DRIVERS, DRIVER_BY_ID, type Driver } from '../data/drivers'
import { REGULAR_LOOK, looksFor } from '../data/outfits'
import { VEHICLES, VEHICLE_BY_ID, type VehicleType } from '../data/vehicles'
import { mix } from '../lib/color'
import type { Player, Ride } from '../lib/players'
import { getState, patchRide, renamePlayer, setRide, useStore } from '../lib/store'
import { randomIndex, spreadByGroup } from '../wheel/math'
import type { Slice } from '../wheel/paint'
import type { SpinOptions, WheelLook } from '../wheel/WheelView'

const NIGHT = '#120f2a'

const DRIVER_SLICES: Slice[] = DRIVERS.map(d => ({
  label: d.name,
  color: mix(d.color, NIGHT, 0.45),
  badge: { text: d.tag, color: d.color },
}))

const TYPE_COLORS: Record<VehicleType, string> = {
  Kart: '#D93A3F',
  Bike: '#2F7FD8',
  Trike: '#23A161',
  Sled: '#7F52E8',
}
/** Vehicles in wheel order, with types spread around the rim. */
const WHEEL_VEHICLES = spreadByGroup(VEHICLES, v => v.type)
const VEHICLE_SLICES: Slice[] = WHEEL_VEHICLES.map(v => ({ label: v.name, color: TYPE_COLORS[v.type] }))

const MAIN_LOOK: WheelLook = { finish: 'gold', bulbs: 28, hubRatio: 0.2 }
const OUTFIT_LOOK: WheelLook = { finish: 'silver', bulbs: 0, hubRatio: 0.22 }

const DRIVER_SPIN: SpinOptions = { duration: 5200, minTurns: 5 }
const VEHICLE_SPIN: SpinOptions = { duration: 6200, minTurns: 6 }
const OUTFIT_SPIN: SpinOptions = { duration: 3000, minTurns: 3 }
/** Room for the title above and the note below each wheel. */
const WHEEL_FRAME = { top: 56, bottom: 44 }

type Part = 'ride' | 'driver' | 'outfit' | 'vehicle'

function outfitSlices(driver: Driver): Slice[] {
  return looksFor(driver.id).map(look => ({ label: look, color: mix(driver.color, NIGHT, 0.35) }))
}

function hasOutfits(driverId?: string): boolean {
  return !!driverId && looksFor(driverId).length > 1
}

function driverLine(ride: Ride): string {
  const d = ride.driverId ? DRIVER_BY_ID[ride.driverId] : undefined
  if (!d) return 'No driver yet'
  return ride.outfit && ride.outfit !== REGULAR_LOOK ? `${d.name}, ${ride.outfit}` : d.name
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export function SpinScreen() {
  const players = useStore(s => s.players)
  const rides = useStore(s => s.rides)
  const [activeId, setActiveId] = useState(() => players[0]?.id)
  const [busy, setBusy] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [muted, setMuted] = useState(sfx.isMuted)
  const busyRef = useRef(false)
  const driverWheel = useRef<WheelHandle>(null)
  const vehicleWheel = useRef<WheelHandle>(null)

  const active = players.find(p => p.id === activeId) ?? players[0]
  const ride = rides[active.id] ?? {}
  const driver = ride.driverId ? DRIVER_BY_ID[ride.driverId] : undefined
  const vehicle = ride.vehicleId ? VEHICLE_BY_ID[ride.vehicleId] : undefined
  const sharedWith = driver
    ? players.filter(p => p.id !== active.id && rides[p.id]?.driverId === driver.id).map(p => p.name)
    : []

  async function spinDriver(playerId: string): Promise<Driver> {
    const i = randomIndex(DRIVERS.length)
    driverWheel.current?.hideInner()
    await driverWheel.current?.spin(i, DRIVER_SPIN)
    sfx.land()
    patchRide(playerId, { driverId: DRIVERS[i].id, outfit: REGULAR_LOOK })
    return DRIVERS[i]
  }

  async function spinOutfit(playerId: string, d: Driver): Promise<void> {
    const looks = looksFor(d.id)
    if (looks.length < 2) return
    const i = randomIndex(looks.length)
    await driverWheel.current?.showInner(outfitSlices(d))
    await driverWheel.current?.spinInner(i, OUTFIT_SPIN)
    sfx.land()
    patchRide(playerId, { outfit: looks[i] })
  }

  async function spinVehicle(playerId: string): Promise<void> {
    const i = randomIndex(WHEEL_VEHICLES.length)
    await vehicleWheel.current?.spin(i, VEHICLE_SPIN)
    sfx.land()
    patchRide(playerId, { vehicleId: WHEEL_VEHICLES[i].id })
  }

  async function run(part: Part, player: Player): Promise<void> {
    setActiveId(player.id)
    if (part === 'ride') {
      setRide(player.id, {})
      const vehicleDone = spinVehicle(player.id)
      const d = await spinDriver(player.id)
      await spinOutfit(player.id, d)
      await vehicleDone
      sfx.fanfare()
    } else if (part === 'driver') {
      patchRide(player.id, { driverId: undefined, outfit: undefined })
      const d = await spinDriver(player.id)
      await spinOutfit(player.id, d)
    } else if (part === 'outfit') {
      const current = getState().rides[player.id]?.driverId
      if (current) await spinOutfit(player.id, DRIVER_BY_ID[current])
    } else {
      patchRide(player.id, { vehicleId: undefined })
      await spinVehicle(player.id)
    }
  }

  async function guarded(task: () => Promise<void>): Promise<void> {
    if (busyRef.current) return
    sfx.unlock()
    busyRef.current = true
    setBusy(true)
    try {
      await task()
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  const spin = (part: Part) => guarded(() => run(part, active))
  const spinEveryone = () =>
    guarded(async () => {
      for (const [i, p] of players.entries()) {
        await run('ride', p)
        if (i < players.length - 1) await sleep(1600)
      }
    })

  function toggleSound() {
    const next = !muted
    sfx.setMuted(next)
    setMuted(next)
    if (!next) sfx.unlock()
  }

  function rename(e: FormEvent<HTMLFormElement> | null, playerId: string, value: string) {
    e?.preventDefault()
    const name = value.trim().slice(0, 16)
    if (name) renamePlayer(playerId, name)
    setEditingId(null)
  }

  return (
    <main className="spin-page">
      <ol className="racers" aria-label="Racers">
        {players.map(p => {
          const r = rides[p.id] ?? {}
          const d = r.driverId ? DRIVER_BY_ID[r.driverId] : undefined
          const v = r.vehicleId ? VEHICLE_BY_ID[r.vehicleId] : undefined
          const isActive = p.id === active.id
          return (
            <li key={p.id} className={`racer${isActive ? ' is-active' : ''}`}>
              {editingId === p.id ? (
                <form className="racer-edit" onSubmit={e => rename(e, p.id, new FormData(e.currentTarget).get('name') as string)}>
                  <label htmlFor={`name-${p.id}`}>Name</label>
                  <input
                    id={`name-${p.id}`}
                    name="name"
                    defaultValue={p.name}
                    maxLength={16}
                    autoFocus
                    onBlur={e => rename(null, p.id, e.currentTarget.value)}
                  />
                </form>
              ) : (
                <button type="button" className="racer-pick" onClick={() => setActiveId(p.id)} disabled={busy} aria-pressed={isActive}>
                  <Badge driver={d} />
                  <span className="racer-text">
                    <span className="racer-name">{p.name}</span>
                    <span className="racer-ride">{driverLine(r)}</span>
                    <span className="racer-ride">{v ? v.name : 'No vehicle yet'}</span>
                  </span>
                </button>
              )}
              {editingId !== p.id && (
                <button type="button" className="racer-rename" onClick={() => setEditingId(p.id)} disabled={busy}>
                  Rename<span className="visually-hidden"> {p.name}</span>
                </button>
              )}
            </li>
          )
        })}
      </ol>

      <section className="command" aria-label="Spin controls">
        <div className="reveal" aria-live="polite">
          <Badge driver={driver} size="lg" />
          <div className="reveal-text">
            <p className="reveal-who">{active.name}{busy ? ' · spinning' : ''}</p>
            <p className="reveal-driver">{driverLine(ride)}</p>
            <p className="reveal-vehicle">{vehicle ? `${vehicle.name} (${vehicle.type})` : 'No vehicle yet'}</p>
            {sharedWith.length > 0 && <p className="reveal-note">{sharedWith.join(' and ')} also has {driver?.name}.</p>}
          </div>
        </div>
        <div className="controls">
          <button type="button" className="btn btn-go" onClick={() => spin('ride')} disabled={busy}>
            Spin for {active.name}
          </button>
          <div className="controls-row">
            <button type="button" className="btn btn-ghost" onClick={() => spin('driver')} disabled={busy}>Driver only</button>
            <button type="button" className="btn btn-ghost" onClick={() => spin('outfit')} disabled={busy || !hasOutfits(ride.driverId)}>Outfit only</button>
            <button type="button" className="btn btn-ghost" onClick={() => spin('vehicle')} disabled={busy}>Vehicle only</button>
          </div>
          <div className="controls-row">
            <button type="button" className="btn btn-ghost" onClick={spinEveryone} disabled={busy}>Spin everyone</button>
            <button type="button" className="btn btn-ghost" onClick={toggleSound} aria-pressed={!muted}>
              {muted ? 'Sound off' : 'Sound on'}
            </button>
          </div>
        </div>
      </section>

      <section className="arena">
        <div className="wheel-card">
          <div className="wheel-head">
            <h2>Driver</h2>
            <span className="count">{DRIVERS.length}</span>
          </div>
          <WheelCanvas
            ref={driverWheel}
            slices={DRIVER_SLICES}
            look={MAIN_LOOK}
            inner={OUTFIT_LOOK}
            label="Driver wheel"
            frame={WHEEL_FRAME}
            onPeg={sfx.tick}
            onHubTap={() => spin('driver')}
          />
          <p className="wheel-foot wheel-note">Drivers with outfits get a second spin in the middle. Tap the star to spin the driver.</p>
        </div>
        <div className="wheel-card">
          <div className="wheel-head">
            <h2>Vehicle</h2>
            <span className="count">{VEHICLES.length}</span>
          </div>
          <WheelCanvas
            ref={vehicleWheel}
            slices={VEHICLE_SLICES}
            look={MAIN_LOOK}
            label="Vehicle wheel"
            frame={WHEEL_FRAME}
            onPeg={sfx.tick}
            onHubTap={() => spin('vehicle')}
          />
          <ul className="wheel-foot legend" aria-label="Vehicle types">
            {(Object.keys(TYPE_COLORS) as VehicleType[]).map(t => (
              <li key={t}>
                <span className="swatch" style={{ background: TYPE_COLORS[t] }} />
                {t}s {VEHICLES.filter(v => v.type === t).length}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  )
}
