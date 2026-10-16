// All-time stats from saved races: per-racer records, head-to-head, and nights.

import { REGULAR_LOOK } from '../data/outfits'
import { eventTotals, eventWinners, isFinished, nightStart, type RaceEvent } from './racing'

export interface Usage {
  id: string
  races: number
  averagePlace: number
}

export interface PlayerRecord {
  playerId: string
  races: number
  wins: number
  podiums: number
  averagePlace: number | null
  bestPlace: number | null
  cupsWon: number
  ralliesWon: number
  /** Most-raced driver (with its outfit when one was worn most). */
  favoriteDriver: (Usage & { outfit?: string }) | null
  /** Best average place with a driver raced at least 3 times. */
  bestDriver: Usage | null
  favoriteVehicle: Usage | null
}

function tally(map: Map<string, { races: number; placeSum: number }>, id: string | undefined, place: number) {
  if (!id) return
  const t = map.get(id) ?? { races: 0, placeSum: 0 }
  t.races += 1
  t.placeSum += place
  map.set(id, t)
}

function usages(map: Map<string, { races: number; placeSum: number }>): Usage[] {
  return [...map.entries()].map(([id, t]) => ({ id, races: t.races, averagePlace: t.placeSum / t.races }))
}

const mostUsed = (list: Usage[]) =>
  list.sort((a, b) => b.races - a.races || a.averagePlace - b.averagePlace || a.id.localeCompare(b.id))[0] ?? null

export function playerRecords(events: RaceEvent[], playerIds: string[]): PlayerRecord[] {
  return playerIds.map(playerId => {
    let races = 0
    let wins = 0
    let podiums = 0
    let placeSum = 0
    let bestPlace: number | null = null
    const drivers = new Map<string, { races: number; placeSum: number }>()
    const vehicles = new Map<string, { races: number; placeSum: number }>()
    const outfits = new Map<string, Map<string, number>>()

    for (const e of events) {
      for (const race of e.races) {
        const place = race.places[playerId]
        if (!place) continue
        races += 1
        placeSum += place
        if (place === 1) wins += 1
        if (place <= 3) podiums += 1
        bestPlace = bestPlace === null ? place : Math.min(bestPlace, place)
        const ride = race.rides[playerId] ?? {}
        tally(drivers, ride.driverId, place)
        tally(vehicles, ride.vehicleId, place)
        if (ride.driverId) {
          const looks = outfits.get(ride.driverId) ?? new Map<string, number>()
          const look = ride.outfit ?? REGULAR_LOOK
          looks.set(look, (looks.get(look) ?? 0) + 1)
          outfits.set(ride.driverId, looks)
        }
      }
    }

    const finished = events.filter(e => isFinished(e) && e.playerIds.includes(playerId))
    const won = (kind: RaceEvent['kind']) =>
      finished.filter(e => e.kind === kind && eventWinners(e).includes(playerId)).length

    const driverList = usages(drivers)
    const fav = mostUsed([...driverList])
    let favoriteDriver: PlayerRecord['favoriteDriver'] = fav
    if (fav) {
      const looks = [...(outfits.get(fav.id) ?? new Map<string, number>()).entries()].sort((a, b) => b[1] - a[1])
      const topLook = looks[0]?.[0]
      favoriteDriver = topLook && topLook !== REGULAR_LOOK ? { ...fav, outfit: topLook } : fav
    }
    const bestDriver = driverList
      .filter(d => d.races >= 3)
      .sort((a, b) => a.averagePlace - b.averagePlace || b.races - a.races)[0] ?? null

    return {
      playerId,
      races,
      wins,
      podiums,
      averagePlace: races ? placeSum / races : null,
      bestPlace,
      cupsWon: won('gp'),
      ralliesWon: won('ko'),
      favoriteDriver,
      bestDriver,
      favoriteVehicle: mostUsed(usages(vehicles)),
    }
  })
}

export interface Rivalry {
  /** Races both ran where the first player finished ahead. */
  ahead: number
  behind: number
}

/** head[a][b]: how often a finished ahead of / behind b when both raced. */
export function headToHead(events: RaceEvent[], playerIds: string[]): Record<string, Record<string, Rivalry>> {
  const head: Record<string, Record<string, Rivalry>> = {}
  for (const a of playerIds) {
    head[a] = {}
    for (const b of playerIds) if (a !== b) head[a][b] = { ahead: 0, behind: 0 }
  }
  for (const e of events) {
    for (const race of e.races) {
      for (const a of playerIds) {
        for (const b of playerIds) {
          if (a === b) continue
          const pa = race.places[a]
          const pb = race.places[b]
          if (!pa || !pb) continue
          if (pa < pb) head[a][b].ahead += 1
          else head[a][b].behind += 1
        }
      }
    }
  }
  return head
}

export interface Night {
  start: number
  events: RaceEvent[]
  races: number
  points: Record<string, number>
  /** Most points that night; more than one on a tie. */
  winners: string[]
}

/** Race nights, newest first. A night runs from 5 a.m. to 5 a.m. */
export function raceNights(events: RaceEvent[]): Night[] {
  const byNight = new Map<number, RaceEvent[]>()
  for (const e of events) {
    if (!e.races.length) continue
    const start = nightStart(e.startedAt)
    byNight.set(start, [...(byNight.get(start) ?? []), e])
  }
  return [...byNight.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([start, list]) => {
      const points: Record<string, number> = {}
      for (const e of list) {
        for (const [id, pts] of Object.entries(eventTotals(e))) points[id] = (points[id] ?? 0) + pts
      }
      const best = Math.max(...Object.values(points))
      return {
        start,
        events: list,
        races: list.reduce((n, e) => n + e.races.length, 0),
        points,
        winners: Object.keys(points).filter(id => points[id] === best),
      }
    })
}
