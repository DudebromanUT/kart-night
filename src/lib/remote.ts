// Reads and writes the family's data in Supabase, and listens for changes made
// on other devices. The shapes here mirror supabase/migrations.

import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js'
import type { Player, Ride } from './players'
import { newId, type EventKind, type RaceEntry, type RaceEvent } from './racing'

export interface Snapshot {
  players: Player[]
  rides: Record<string, Ride>
  events: RaceEvent[]
}

interface PlayerRow { id: string; name: string; sort_order: number }
interface RideRow { player_id: string; driver_id: string | null; outfit: string | null; vehicle_id: string | null }
interface EventRow { id: string; kind: EventKind; track_id: string; started_at: string }
interface EventPlayerRow { event_id: string; player_id: string }
interface RaceRow { id: string; event_id: string; race_no: number; course: string; raced_at: string }
interface ResultRow { race_id: string; player_id: string; place: number; driver_id: string | null; outfit: string | null; vehicle_id: string | null }

export interface Rows {
  players: PlayerRow[]
  rides: RideRow[]
  events: EventRow[]
  eventPlayers: EventPlayerRow[]
  races: RaceRow[]
  results: ResultRow[]
}

function rideFrom(row: { driver_id: string | null; outfit: string | null; vehicle_id: string | null }): Ride {
  return {
    ...(row.driver_id ? { driverId: row.driver_id } : {}),
    ...(row.outfit ? { outfit: row.outfit } : {}),
    ...(row.vehicle_id ? { vehicleId: row.vehicle_id } : {}),
  }
}

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const item of items) {
    const k = key(item)
    const list = map.get(k)
    if (list) list.push(item)
    else map.set(k, [item])
  }
  return map
}

/** Turns database rows into the app's racers, rides and events. */
export function assemble(rows: Rows): Snapshot {
  const players = [...rows.players].sort((a, b) => a.sort_order - b.sort_order).map(p => ({ id: p.id, name: p.name }))
  const order = new Map(players.map((p, i) => [p.id, i]))
  const byOrder = (a: string, b: string) => (order.get(a) ?? 99) - (order.get(b) ?? 99)

  const rides = Object.fromEntries(rows.rides.map(r => [r.player_id, rideFrom(r)]))
  const resultsByRace = groupBy(rows.results, r => r.race_id)
  const racesByEvent = groupBy(rows.races, r => r.event_id)
  const playersByEvent = groupBy(rows.eventPlayers, r => r.event_id)

  const events: RaceEvent[] = [...rows.events]
    .sort((a, b) => Date.parse(a.started_at) - Date.parse(b.started_at))
    .map(e => {
      const races: RaceEntry[] = [...(racesByEvent.get(e.id) ?? [])]
        .sort((a, b) => a.race_no - b.race_no)
        .map(race => {
          const results = resultsByRace.get(race.id) ?? []
          return {
            course: race.course,
            places: Object.fromEntries(results.map(r => [r.player_id, r.place])),
            rides: Object.fromEntries(results.map(r => [r.player_id, rideFrom(r)])),
            at: Date.parse(race.raced_at),
          }
        })
      let playerIds = (playersByEvent.get(e.id) ?? []).map(r => r.player_id)
      if (!playerIds.length) playerIds = [...new Set(races.flatMap(r => Object.keys(r.places)))]
      return {
        id: e.id,
        kind: e.kind,
        trackId: e.track_id,
        playerIds: playerIds.sort(byOrder),
        races,
        startedAt: Date.parse(e.started_at),
      }
    })

  return { players, rides, events }
}

type Query = PromiseLike<{ data: unknown; error: { message: string } | null }>

async function ok(query: Query): Promise<void> {
  const { error } = await query
  if (error) throw new Error(error.message)
}

/** Reads every row a query matches, 1,000 at a time (the server's page size). */
async function allRows<T>(page: (from: number, to: number) => Query): Promise<T[]> {
  const size = 1000
  const out: T[] = []
  for (let from = 0; ; from += size) {
    const { data, error } = await page(from, from + size - 1)
    if (error) throw new Error(error.message)
    const rows = (data ?? []) as T[]
    out.push(...rows)
    if (rows.length < size) return out
  }
}

const iso = (ms: number) => new Date(ms).toISOString()

const TABLES = ['players', 'current_rides', 'events', 'event_players', 'races', 'results'] as const

export class RemoteSync {
  readonly db: SupabaseClient
  readonly householdId: string
  private onSnapshot: (s: Snapshot) => void
  private onError: (message: string) => void
  private channel: RealtimeChannel | null = null
  private timer: ReturnType<typeof setTimeout> | undefined
  private stopped = false

  constructor(db: SupabaseClient, householdId: string, onSnapshot: (s: Snapshot) => void, onError: (message: string) => void) {
    this.db = db
    this.householdId = householdId
    this.onSnapshot = onSnapshot
    this.onError = onError
  }

  start(): void {
    this.refreshNow()
    let channel = this.db.channel(`household-${this.householdId}`)
    for (const table of TABLES) {
      channel = channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => this.refresh())
    }
    this.channel = channel.subscribe()
    document.addEventListener('visibilitychange', this.onVisible)
  }

  stop(): void {
    this.stopped = true
    clearTimeout(this.timer)
    document.removeEventListener('visibilitychange', this.onVisible)
    if (this.channel) void this.db.removeChannel(this.channel)
  }

  /** Reloads soon; several changes in a burst cause one reload. */
  refresh = (): void => {
    clearTimeout(this.timer)
    this.timer = setTimeout(() => this.refreshNow(), 300)
  }

  private onVisible = () => {
    if (document.visibilityState === 'visible') this.refresh()
  }

  private refreshNow(): void {
    this.fetch()
      .then(s => { if (!this.stopped) this.onSnapshot(s) })
      .catch((err: Error) => { if (!this.stopped) this.onError(`Couldn't load your races: ${err.message}`) })
  }

  async fetch(): Promise<Snapshot> {
    const h = this.householdId
    const db = this.db
    const [players, rides, events, eventPlayers, races, results] = await Promise.all([
      allRows<PlayerRow>((a, b) => db.from('players').select('id,name,sort_order').eq('household_id', h).eq('archived', false).order('sort_order').order('id').range(a, b)),
      allRows<RideRow>((a, b) => db.from('current_rides').select('player_id,driver_id,outfit,vehicle_id').eq('household_id', h).order('player_id').range(a, b)),
      allRows<EventRow>((a, b) => db.from('events').select('id,kind,track_id,started_at').eq('household_id', h).order('started_at').order('id').range(a, b)),
      allRows<EventPlayerRow>((a, b) => db.from('event_players').select('event_id,player_id').eq('household_id', h).order('event_id').order('player_id').range(a, b)),
      allRows<RaceRow>((a, b) => db.from('races').select('id,event_id,race_no,course,raced_at').eq('household_id', h).order('id').range(a, b)),
      allRows<ResultRow>((a, b) => db.from('results').select('race_id,player_id,place,driver_id,outfit,vehicle_id').eq('household_id', h).order('race_id').order('player_id').range(a, b)),
    ])
    return assemble({ players, rides, events, eventPlayers, races, results })
  }

  async renamePlayer(playerId: string, name: string): Promise<void> {
    await ok(this.db.from('players').update({ name }).eq('id', playerId))
  }

  async saveRide(playerId: string, ride: Ride): Promise<void> {
    await ok(this.db.from('current_rides').upsert({
      player_id: playerId,
      household_id: this.householdId,
      driver_id: ride.driverId ?? null,
      outfit: ride.outfit ?? null,
      vehicle_id: ride.vehicleId ?? null,
      updated_at: new Date().toISOString(),
    }))
  }

  async startEvent(e: RaceEvent): Promise<void> {
    await ok(this.db.from('events').insert({
      id: e.id, household_id: this.householdId, kind: e.kind, track_id: e.trackId, started_at: iso(e.startedAt),
    }))
    try {
      await ok(this.db.from('event_players').insert(
        e.playerIds.map(player_id => ({ event_id: e.id, player_id, household_id: this.householdId })),
      ))
    } catch (err) {
      await this.db.from('events').delete().eq('id', e.id)
      throw err
    }
  }

  async addRace(eventId: string, raceNo: number, entry: RaceEntry): Promise<void> {
    const raceId = newId()
    await ok(this.db.from('races').insert({
      id: raceId, event_id: eventId, household_id: this.householdId, race_no: raceNo, course: entry.course, raced_at: iso(entry.at),
    }))
    try {
      await ok(this.db.from('results').insert(
        Object.entries(entry.places).map(([player_id, place]) => ({
          race_id: raceId,
          player_id,
          household_id: this.householdId,
          place,
          driver_id: entry.rides[player_id]?.driverId ?? null,
          outfit: entry.rides[player_id]?.outfit ?? null,
          vehicle_id: entry.rides[player_id]?.vehicleId ?? null,
        })),
      ))
    } catch (err) {
      await this.db.from('races').delete().eq('id', raceId)
      throw err
    }
  }

  async undoRace(eventId: string, raceNo: number): Promise<void> {
    await ok(this.db.from('races').delete().eq('event_id', eventId).eq('race_no', raceNo))
  }

  async removeEvent(eventId: string): Promise<void> {
    await ok(this.db.from('events').delete().eq('id', eventId))
  }
}
