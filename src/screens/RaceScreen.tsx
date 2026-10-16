import { useState, type CSSProperties, type FormEvent } from 'react'
import * as sfx from '../audio/sfx'
import { Badge } from '../components/Badge'
import { Confetti } from '../components/Confetti'
import { PlacePicker } from '../components/PlacePicker'
import { Standings } from '../components/Standings'
import { CUPS } from '../data/cups'
import { DRIVER_BY_ID } from '../data/drivers'
import { REGULAR_LOOK } from '../data/outfits'
import { RALLIES, RALLY_BY_ID } from '../data/rallies'
import { VEHICLE_BY_ID } from '../data/vehicles'
import type { Player, Ride } from '../lib/players'
import {
  RACES_IN, checkPlaces, eventName, eventTotals, eventWinners, isFinished, knockoutLine, newId,
  nextCourse, sharedRanks, standings, tonightsEvents, type EventKind, type RaceEntry, type RaceEvent,
} from '../lib/racing'
import { ordinal, pointsFor } from '../lib/scoring'
import { removeEvent, saveEvent, setActiveEvent, useStore } from '../lib/store'

const KIND_LABEL: Record<EventKind, string> = { gp: 'Grand Prix', ko: 'Knockout Tour' }

type StartEvent = (kind: EventKind, trackId: string, playerIds: string[]) => void

function accentOf(e: RaceEvent): string {
  return e.kind === 'gp' ? CUPS.find(c => c.id === e.trackId)?.color ?? '#ffc83d' : RALLY_BY_ID[e.trackId]?.color ?? '#ffc83d'
}

function rideLine(ride?: Ride): string {
  const d = ride?.driverId ? DRIVER_BY_ID[ride.driverId] : undefined
  const v = ride?.vehicleId ? VEHICLE_BY_ID[ride.vehicleId] : undefined
  if (!d && !v) return 'No ride spun yet'
  const look = d && ride?.outfit && ride.outfit !== REGULAR_LOOK ? ` (${ride.outfit})` : ''
  return [d ? `${d.name}${look}` : null, v?.name].filter(Boolean).join(' · ')
}

function joinNames(names: string[]): string {
  return names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

/** Two taps to confirm, because a mis-tap here throws away scores. */
function ConfirmButton({ label, confirmLabel, onConfirm }: { label: string; confirmLabel: string; onConfirm: () => void }) {
  const [armed, setArmed] = useState(false)
  return (
    <button
      type="button"
      className={`btn btn-ghost${armed ? ' is-armed' : ''}`}
      onClick={() => {
        if (armed) onConfirm()
        else {
          setArmed(true)
          setTimeout(() => setArmed(false), 3000)
        }
      }}
    >
      {armed ? confirmLabel : label}
    </button>
  )
}

export function RaceScreen() {
  const players = useStore(s => s.players)
  const rides = useStore(s => s.rides)
  const events = useStore(s => s.events)
  const activeId = useStore(s => s.activeEventId)
  const [now] = useState(() => Date.now())
  const [burst, setBurst] = useState(0)

  const active = events.find(e => e.id === activeId) ?? null
  const tonight = tonightsEvents(events, now)
  const rows = standings(tonight, players.map(p => p.id))

  const start: StartEvent = (kind, trackId, playerIds) => {
    const e: RaceEvent = { id: newId(), kind, trackId, playerIds, races: [], startedAt: Date.now() }
    saveEvent(e)
    setActiveEvent(e.id)
  }

  function onSaved(e: RaceEvent) {
    sfx.unlock()
    if (isFinished(e)) {
      sfx.fanfare()
      setBurst(b => b + 1)
    } else {
      sfx.land()
    }
  }

  return (
    <main className="race-page">
      <div className="race-main">
        {!active && <StartPanel players={players} onStart={start} />}
        {active && !isFinished(active) && (
          <EventInProgress
            key={`${active.id}-${active.races.length}`}
            event={active}
            players={players}
            rides={rides}
            onSaved={onSaved}
          />
        )}
        {active && isFinished(active) && (
          <EventResult event={active} players={players} rides={rides} onStart={start} />
        )}
      </div>
      <aside className="race-side">
        <Standings
          title="Tonight"
          rows={rows}
          players={players}
          rides={rides}
          emptyNote="No races yet tonight. Points from every cup and rally add up here until 5 a.m."
        />
        <EventLog events={tonight} activeId={activeId} players={players} />
      </aside>
      <Confetti burst={burst} />
    </main>
  )
}

function StartPanel({ players, onStart }: { players: Player[]; onStart: StartEvent }) {
  const rides = useStore(s => s.rides)
  const [racing, setRacing] = useState<string[]>(() => players.map(p => p.id))
  const toggle = (id: string) =>
    setRacing(r => (r.includes(id) ? r.filter(x => x !== id) : players.map(p => p.id).filter(x => x === id || r.includes(x))))
  const none = racing.length === 0

  return (
    <section className="panel start-panel" aria-labelledby="start-title">
      <p className="eyebrow">Race night</p>
      <h1 id="start-title">What are we racing?</h1>

      <fieldset className="whos-racing">
        <legend>Who's racing</legend>
        <div className="chips">
          {players.map(p => {
            const d = rides[p.id]?.driverId
            return (
              <label key={p.id} className="chip">
                <input type="checkbox" checked={racing.includes(p.id)} onChange={() => toggle(p.id)} />
                <Badge driver={d ? DRIVER_BY_ID[d] : undefined} size="sm" />
                <span>{p.name}</span>
              </label>
            )
          })}
        </div>
        {none && <p className="form-error">Pick at least one racer.</p>}
      </fieldset>

      <div className="modes">
        <section className="mode" aria-labelledby="mode-gp">
          <h2 id="mode-gp">Grand Prix</h2>
          <p className="mode-note">Four races. Every place scores, from 15 points for 1st down to 1 for 24th.</p>
          <div className="track-grid">
            {CUPS.map(c => (
              <button
                key={c.id}
                type="button"
                className="track-btn"
                style={{ '--accent': c.color } as CSSProperties}
                onClick={() => onStart('gp', c.id, racing)}
                disabled={none}
              >
                <span className="track-name">{c.name}</span>
                <span className="track-sub">{c.courses[0]} first</span>
              </button>
            ))}
          </div>
        </section>
        <section className="mode" aria-labelledby="mode-ko">
          <h2 id="mode-ko">Knockout Tour</h2>
          <p className="mode-note">One rally. The bottom four drop out at each of five checkpoints. Your final place scores like a Grand Prix race.</p>
          <div className="track-grid">
            {RALLIES.map(r => (
              <button
                key={r.id}
                type="button"
                className="track-btn"
                style={{ '--accent': r.color } as CSSProperties}
                onClick={() => onStart('ko', r.id, racing)}
                disabled={none}
              >
                <span className="track-name">{r.name}</span>
                <span className="track-sub">{r.addedIn ? `New in ${r.addedIn}` : 'Knockout rally'}</span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </section>
  )
}

interface InProgressProps {
  event: RaceEvent
  players: Player[]
  rides: Record<string, Ride>
  onSaved: (e: RaceEvent) => void
}

function EventInProgress({ event, players, rides, onSaved }: InProgressProps) {
  const [places, setPlaces] = useState<Record<string, number | null>>({})
  const [openId, setOpenId] = useState<string | null>(event.playerIds[0] ?? null)
  const [error, setError] = useState<string | null>(null)
  const names = Object.fromEntries(players.map(p => [p.id, p.name]))
  const course = nextCourse(event) ?? ''
  const raceNo = event.races.length + 1
  const total = RACES_IN[event.kind]
  const isKo = event.kind === 'ko'

  function pick(id: string, place: number | null) {
    const next = { ...places, [id]: place }
    setPlaces(next)
    setError(null)
    if (place !== null) setOpenId(event.playerIds.find(pid => pid !== id && !next[pid]) ?? null)
  }

  function save(e: FormEvent) {
    e.preventDefault()
    const problem = checkPlaces(event.playerIds, places, names)
    if (problem) {
      setError(problem)
      return
    }
    const entry: RaceEntry = {
      course,
      places: Object.fromEntries(event.playerIds.map(id => [id, places[id] as number])),
      rides: Object.fromEntries(event.playerIds.map(id => [id, rides[id] ?? {}])),
      at: Date.now(),
    }
    const updated = { ...event, races: [...event.races, entry] }
    saveEvent(updated)
    onSaved(updated)
  }

  function undoLast() {
    saveEvent({ ...event, races: event.races.slice(0, -1) })
  }

  return (
    <section className="panel event-panel" style={{ '--accent': accentOf(event) } as CSSProperties} aria-labelledby="event-title">
      <header className="event-head">
        <p className="eyebrow">{KIND_LABEL[event.kind]}{isKo ? '' : ` · Race ${raceNo} of ${total}`}</p>
        <h1 id="event-title">{eventName(event)}</h1>
        {!isKo && <CourseSteps event={event} names={names} />}
      </header>

      <form className="entry" onSubmit={save} noValidate>
        <h2 className="entry-course">{isKo ? 'Final places' : course}</h2>
        <p className="entry-hint">Tap a racer, then where they finished. It moves on to the next racer by itself.</p>
        <ul className="entry-list">
          {event.playerIds.map(id => {
            const place = places[id] ?? null
            const open = openId === id
            const taken = new Map<number, string>()
            for (const other of event.playerIds) {
              const p = places[other]
              if (other !== id && p) taken.set(p, names[other] ?? '')
            }
            const d = rides[id]?.driverId
            return (
              <li key={id} className={`entry-row${open ? ' is-open' : ''}`}>
                <button
                  type="button"
                  className="entry-who"
                  id={`entry-${id}`}
                  aria-expanded={open}
                  onClick={() => setOpenId(open ? null : id)}
                >
                  <Badge driver={d ? DRIVER_BY_ID[d] : undefined} size="md" />
                  <span className="entry-text">
                    <span className="entry-name">{names[id] ?? 'Former racer'}</span>
                    <span className="entry-ride">{place && isKo ? knockoutLine(place) : rideLine(rides[id])}</span>
                  </span>
                  <span className={`entry-place${place ? ' has-place' : ''}`}>
                    {place ? <>{ordinal(place)} <small>+{pointsFor(place)}</small></> : 'Pick place'}
                  </span>
                </button>
                {open && <PlacePicker labelId={`entry-${id}`} value={place} taken={taken} onPick={p => pick(id, p)} />}
              </li>
            )
          })}
        </ul>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="entry-actions">
          <button type="submit" className="btn btn-go">{isKo ? 'Save rally' : raceNo === total ? 'Save final race' : `Save race ${raceNo}`}</button>
        </div>
      </form>

      {!isKo && event.races.length > 0 && <CupTable event={event} names={names} />}

      <div className="event-actions">
        {event.races.length > 0 && (
          <button type="button" className="btn btn-ghost" onClick={undoLast}>Undo race {event.races.length}</button>
        )}
        <button type="button" className="btn btn-ghost" onClick={() => setActiveEvent(null)}>Back to race menu</button>
        <ConfirmButton
          label={isKo ? 'Delete this rally' : 'Delete this cup'}
          confirmLabel="Tap again to delete"
          onConfirm={() => removeEvent(event.id)}
        />
      </div>
    </section>
  )
}

function CourseSteps({ event, names }: { event: RaceEvent; names: Record<string, string> }) {
  const cup = CUPS.find(c => c.id === event.trackId)
  if (!cup) return null
  return (
    <ol className="course-steps">
      {cup.courses.map((course, i) => {
        const race = event.races[i]
        const state = race ? 'done' : i === event.races.length ? 'now' : 'next'
        let best = ''
        if (race) {
          const [winnerId] = Object.entries(race.places).sort((a, b) => a[1] - b[1])[0] ?? []
          if (winnerId) best = `${names[winnerId] ?? ''} ${ordinal(race.places[winnerId])}`
        }
        return (
          <li key={i} className={`course-step is-${state}`}>
            <span className="course-num">{i + 1}</span>
            <span className="course-name">{course}</span>
            {best && <span className="course-best">{best}</span>}
          </li>
        )
      })}
    </ol>
  )
}

function CupTable({ event, names }: { event: RaceEvent; names: Record<string, string> }) {
  const totals = eventTotals(event)
  const order = [...event.playerIds].sort((a, b) => totals[b] - totals[a])
  return (
    <div className="table-wrap">
      <table className="cup-table">
        <caption>{isFinished(event) ? 'Race by race' : 'Cup points so far'}</caption>
        <thead>
          <tr>
            <th scope="col">Racer</th>
            {Array.from({ length: RACES_IN[event.kind] }, (_, i) => <th key={i} scope="col">R{i + 1}</th>)}
            <th scope="col">Total</th>
          </tr>
        </thead>
        <tbody>
          {order.map(id => (
            <tr key={id}>
              <th scope="row">{names[id] ?? 'Former racer'}</th>
              {Array.from({ length: RACES_IN[event.kind] }, (_, i) => {
                const place = event.races[i]?.places[id]
                return (
                  <td key={i}>
                    {place ? <>{pointsFor(place)}<small>{ordinal(place)}</small></> : '·'}
                  </td>
                )
              })}
              <td className="cup-total">{totals[id]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function EventResult({ event, players, rides, onStart }: { event: RaceEvent; players: Player[]; rides: Record<string, Ride>; onStart: StartEvent }) {
  const names = Object.fromEntries(players.map(p => [p.id, p.name]))
  const totals = eventTotals(event)
  const winners = eventWinners(event)
  const isKo = event.kind === 'ko'
  const lastRace = event.races[event.races.length - 1]
  const order = [...event.playerIds].sort((a, b) =>
    totals[b] - totals[a] || (lastRace?.places[a] ?? 99) - (lastRace?.places[b] ?? 99))
  const winnerNames = winners.map(id => names[id] ?? 'Former racer')
  const headline = winners.length > 1
    ? `${joinNames(winnerNames)} tie for the ${eventName(event)}`
    : `${winnerNames[0]} wins the ${eventName(event)}`

  const nextTrack = isKo
    ? RALLIES[(RALLIES.findIndex(r => r.id === event.trackId) + 1) % RALLIES.length]
    : CUPS[(CUPS.findIndex(c => c.id === event.trackId) + 1) % CUPS.length]

  const ranks = sharedRanks(order.map(id => totals[id]))
  return (
    <section className="panel event-panel result-panel" style={{ '--accent': accentOf(event) } as CSSProperties} aria-labelledby="result-title">
      <header className="event-head">
        <p className="eyebrow">{KIND_LABEL[event.kind]} · Final</p>
        <h1 id="result-title">{headline}</h1>
      </header>

      <ol className="podium">
        {order.map((id, i) => {
          const rank = ranks[i]
          const ride = lastRace?.rides[id] ?? rides[id]
          const d = ride?.driverId
          const place = lastRace?.places[id]
          return (
            <li key={id} className={`podium-row rank-${Math.min(rank, 4)}`}>
              <span className="podium-rank">{rank}</span>
              <Badge driver={d ? DRIVER_BY_ID[d] : undefined} size="md" />
              <span className="podium-who">
                <span className="podium-name">{names[id] ?? 'Former racer'}</span>
                <span className="podium-meta">{isKo && place ? `${ordinal(place)} · ${knockoutLine(place)}` : rideLine(ride)}</span>
              </span>
              <span className="podium-points">{totals[id]}<small>pts</small></span>
            </li>
          )
        })}
      </ol>

      {!isKo && <CupTable event={event} names={names} />}

      <div className="event-actions">
        <button type="button" className="btn btn-go" onClick={() => onStart(event.kind, nextTrack.id, event.playerIds)}>
          Next: {nextTrack.name}
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => setActiveEvent(null)}>Back to race menu</button>
      </div>
    </section>
  )
}

function EventLog({ events, activeId, players }: { events: RaceEvent[]; activeId: string | null; players: Player[] }) {
  if (!events.length) return null
  const names = Object.fromEntries(players.map(p => [p.id, p.name]))
  return (
    <section className="panel event-log" aria-labelledby="log-title">
      <h2 id="log-title">Tonight's races</h2>
      <ol>
        {[...events].reverse().map(e => {
          const done = isFinished(e)
          const status = done
            ? `${joinNames(eventWinners(e).map(id => names[id] ?? 'Former racer'))} won`
            : `Race ${e.races.length + 1} of ${RACES_IN[e.kind]} next`
          return (
            <li key={e.id}>
              <button
                type="button"
                className={`log-item${e.id === activeId ? ' is-active' : ''}`}
                style={{ '--accent': accentOf(e) } as CSSProperties}
                onClick={() => setActiveEvent(e.id)}
              >
                <span className="log-name">{eventName(e)}</span>
                <span className="log-status">{KIND_LABEL[e.kind]} · {status}</span>
              </button>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
