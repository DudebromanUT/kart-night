import { describe, expect, it } from 'vitest'
import { assemble, type Rows } from './remote'

const rows: Rows = {
  players: [
    { id: 'dad', name: 'Dad', sort_order: 2 },
    { id: 'mom', name: 'Mom', sort_order: 1 },
  ],
  rides: [{ player_id: 'mom', driver_id: 'peach', outfit: 'Aviator', vehicle_id: null }],
  events: [
    { id: 'e2', kind: 'ko', track_id: 'golden', started_at: '2026-10-16T03:00:00Z' },
    { id: 'e1', kind: 'gp', track_id: 'mushroom', started_at: '2026-10-16T02:00:00Z' },
  ],
  eventPlayers: [
    { event_id: 'e1', player_id: 'dad' },
    { event_id: 'e1', player_id: 'mom' },
  ],
  races: [
    { id: 'r2', event_id: 'e1', race_no: 2, course: 'Crown City', raced_at: '2026-10-16T02:20:00Z' },
    { id: 'r1', event_id: 'e1', race_no: 1, course: 'Mario Bros. Circuit', raced_at: '2026-10-16T02:10:00Z' },
    { id: 'r3', event_id: 'e2', race_no: 1, course: 'Golden Rally', raced_at: '2026-10-16T03:10:00Z' },
  ],
  results: [
    { race_id: 'r1', player_id: 'mom', place: 1, driver_id: 'peach', outfit: 'Aviator', vehicle_id: 'cute-scoot' },
    { race_id: 'r1', player_id: 'dad', place: 4, driver_id: 'bowser', outfit: null, vehicle_id: null },
    { race_id: 'r2', player_id: 'mom', place: 2, driver_id: null, outfit: null, vehicle_id: null },
    { race_id: 'r3', player_id: 'dad', place: 7, driver_id: null, outfit: null, vehicle_id: null },
  ],
}

describe('assemble', () => {
  const snap = assemble(rows)

  it('orders racers by their sort order', () => {
    expect(snap.players.map(p => p.name)).toEqual(['Mom', 'Dad'])
  })

  it('keeps only the parts of a ride that are set', () => {
    expect(snap.rides).toEqual({ mom: { driverId: 'peach', outfit: 'Aviator' } })
  })

  it('rebuilds events in start order with races in race order', () => {
    expect(snap.events.map(e => e.id)).toEqual(['e1', 'e2'])
    const [cup, rally] = snap.events
    expect(cup).toMatchObject({ kind: 'gp', trackId: 'mushroom', playerIds: ['mom', 'dad'] })
    expect(cup.races.map(r => r.course)).toEqual(['Mario Bros. Circuit', 'Crown City'])
    expect(cup.races[0].places).toEqual({ mom: 1, dad: 4 })
    expect(cup.races[0].rides.mom).toEqual({ driverId: 'peach', outfit: 'Aviator', vehicleId: 'cute-scoot' })
    expect(cup.races[0].rides.dad).toEqual({ driverId: 'bowser' })
    expect(cup.startedAt).toBe(Date.parse('2026-10-16T02:00:00Z'))
    // No event_players rows for the rally: racers come from its results.
    expect(rally.playerIds).toEqual(['dad'])
  })
})
