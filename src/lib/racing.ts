// Race night scoring: Grand Prix cups (4 races) and Knockout Tour rallies (1 result).
// Pure functions over plain data so they can be tested and later stored anywhere.

import { CUPS } from '../data/cups'
import { RALLY_BY_ID } from '../data/rallies'
import type { Ride } from './players'
import { FIELD_SIZE, ordinal, pointsFor } from './scoring'

export type EventKind = 'gp' | 'ko'

export interface RaceEntry {
  course: string
  /** Finishing place (1 to 24) for each player who raced. */
  places: Record<string, number>
  /** What each player drove, copied from the Spin screen when the race was saved. */
  rides: Record<string, Ride>
  at: number
}

export interface RaceEvent {
  id: string
  kind: EventKind
  /** Cup id for a Grand Prix, rally id for Knockout Tour. */
  trackId: string
  playerIds: string[]
  races: RaceEntry[]
  startedAt: number
}

export const RACES_IN: Record<EventKind, number> = { gp: 4, ko: 1 }

export function isFinished(e: RaceEvent): boolean {
  return e.races.length >= RACES_IN[e.kind]
}

export function eventName(e: RaceEvent): string {
  if (e.kind === 'ko') return RALLY_BY_ID[e.trackId]?.name ?? 'Knockout Tour'
  return CUPS.find(c => c.id === e.trackId)?.name ?? 'Grand Prix'
}

/** The course for the next race, or null when the event is over. */
export function nextCourse(e: RaceEvent): string | null {
  if (isFinished(e)) return null
  if (e.kind === 'ko') return eventName(e)
  return CUPS.find(c => c.id === e.trackId)?.courses[e.races.length] ?? null
}

/** Total points per player across the event's races. */
export function eventTotals(e: RaceEvent): Record<string, number> {
  const totals: Record<string, number> = Object.fromEntries(e.playerIds.map(id => [id, 0]))
  for (const race of e.races) {
    for (const [id, place] of Object.entries(race.places)) totals[id] = (totals[id] ?? 0) + pointsFor(place)
  }
  return totals
}

/** Players with the most points (more than one on a tie). */
export function eventWinners(e: RaceEvent): string[] {
  const totals = eventTotals(e)
  const best = Math.max(...Object.values(totals))
  return e.playerIds.filter(id => totals[id] === best)
}

/** Checks one race's places. Returns a message to show, or null when they're good. */
export function checkPlaces(playerIds: string[], places: Record<string, number | null | undefined>, names: Record<string, string>): string | null {
  const missing = playerIds.filter(id => !places[id])
  if (missing.length) return `Pick a place for ${missing.map(id => names[id] ?? 'everyone').join(' and ')}.`
  const seen = new Map<number, string>()
  for (const id of playerIds) {
    const place = places[id] as number
    if (!Number.isInteger(place) || place < 1 || place > FIELD_SIZE) return `Places run from 1st to ${FIELD_SIZE}th.`
    const other = seen.get(place)
    if (other) return `${names[other] ?? 'Two racers'} and ${names[id] ?? 'another racer'} can't both be ${ordinal(place)}.`
    seen.set(place, id)
  }
  return null
}

/**
 * Knockout Tour: which checkpoint knocked a place out. Places 21 to 24 go at the
 * first checkpoint, 5 to 8 at the fifth; 1 to 4 made the final (returns null).
 */
export function knockedOutAt(place: number): number | null {
  if (place <= 4) return null
  return 7 - Math.ceil(place / 4)
}

export function knockoutLine(place: number): string {
  const cp = knockedOutAt(place)
  return cp === null ? 'Made the final four' : `Out at checkpoint ${cp}`
}

export interface StandingRow {
  playerId: string
  points: number
  races: number
  wins: number
  podiums: number
  averagePlace: number | null
}

/** Leaderboard across events: points, then wins, then average place. */
export function standings(events: RaceEvent[], playerIds: string[]): StandingRow[] {
  const rows = new Map<string, StandingRow & { placeSum: number }>()
  for (const id of playerIds) rows.set(id, { playerId: id, points: 0, races: 0, wins: 0, podiums: 0, averagePlace: null, placeSum: 0 })
  for (const e of events) {
    for (const race of e.races) {
      for (const [id, place] of Object.entries(race.places)) {
        const row = rows.get(id)
        if (!row) continue
        row.points += pointsFor(place)
        row.races += 1
        row.placeSum += place
        if (place === 1) row.wins += 1
        if (place <= 3) row.podiums += 1
      }
    }
  }
  return [...rows.values()]
    .map(({ placeSum, ...row }) => ({ ...row, averagePlace: row.races ? placeSum / row.races : null }))
    .sort((a, b) =>
      b.points - a.points ||
      b.wins - a.wins ||
      (a.averagePlace ?? 99) - (b.averagePlace ?? 99))
}

/** Ranks for scores already sorted best first; equal scores share a rank (1, 2, 2, 4). */
export function sharedRanks(sortedScores: number[]): number[] {
  return sortedScores.map(score => sortedScores.indexOf(score) + 1)
}

/** Start of tonight: 5 a.m. today, or 5 a.m. yesterday before that, so a late night stays one night. */
export function nightStart(now: number): number {
  const d = new Date(now)
  if (d.getHours() < 5) d.setDate(d.getDate() - 1)
  d.setHours(5, 0, 0, 0)
  return d.getTime()
}

export function tonightsEvents(events: RaceEvent[], now: number): RaceEvent[] {
  const start = nightStart(now)
  return events.filter(e => e.startedAt >= start)
}

/** A random UUID (version 4), which the database also uses as its id format. */
export function newId(): string {
  const c: Crypto = globalThis.crypto
  if (typeof c.randomUUID === 'function') return c.randomUUID()
  const b = new Uint8Array(16)
  c.getRandomValues(b)
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = [...b].map(x => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}
