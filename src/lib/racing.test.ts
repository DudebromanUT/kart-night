import { describe, expect, it } from 'vitest'
import { sharedRanks, checkPlaces, eventTotals, eventWinners, isFinished, knockedOutAt, nextCourse, nightStart, standings, tonightsEvents, type RaceEntry, type RaceEvent } from './racing'

const race = (places: Record<string, number>, course = 'Somewhere'): RaceEntry => ({ course, places, rides: {}, at: 0 })
const gp = (races: RaceEntry[], startedAt = 0): RaceEvent => ({
  id: 'e1', kind: 'gp', trackId: 'mushroom', playerIds: ['mom', 'dad', 'kid'], races, startedAt,
})
const names = { mom: 'Mom', dad: 'Dad', kid: 'Kid' }

describe('Grand Prix', () => {
  it('walks the Mushroom Cup courses in order and finishes after 4 races', () => {
    const e = gp([])
    expect(nextCourse(e)).toBe('Mario Bros. Circuit')
    e.races.push(race({ mom: 1, dad: 2, kid: 3 }))
    expect(nextCourse(e)).toBe('Crown City')
    e.races.push(race({ mom: 1, dad: 2, kid: 3 }), race({ mom: 1, dad: 2, kid: 3 }))
    expect(nextCourse(e)).toBe('DK Spaceport')
    expect(isFinished(e)).toBe(false)
    e.races.push(race({ mom: 1, dad: 2, kid: 3 }))
    expect(isFinished(e)).toBe(true)
    expect(nextCourse(e)).toBeNull()
  })

  it('adds up points with the 24-racer table and crowns the leader', () => {
    const e = gp([race({ mom: 1, dad: 4, kid: 5 }), race({ mom: 24, dad: 1, kid: 2 })])
    expect(eventTotals(e)).toEqual({ mom: 15 + 1, dad: 9 + 15, kid: 9 + 12 })
    expect(eventWinners(e)).toEqual(['dad'])
  })

  it('reports ties as shared wins', () => {
    const e = gp([race({ mom: 4, dad: 5, kid: 24 })])
    expect(eventWinners(e)).toEqual(['mom', 'dad'])
  })
})

describe('checkPlaces', () => {
  it('accepts distinct places for everyone', () => {
    expect(checkPlaces(['mom', 'dad'], { mom: 1, dad: 12 }, names)).toBeNull()
  })
  it('names who is missing a place', () => {
    expect(checkPlaces(['mom', 'dad', 'kid'], { mom: 1 }, names)).toBe('Pick a place for Dad and Kid.')
  })
  it('rejects two racers in the same place', () => {
    expect(checkPlaces(['mom', 'kid'], { mom: 3, kid: 3 }, names)).toBe("Mom and Kid can't both be 3rd.")
  })
  it('rejects places off the grid', () => {
    expect(checkPlaces(['mom'], { mom: 25 }, names)).toMatch(/1st to 24th/)
  })
})

describe('knockedOutAt', () => {
  it('maps Knockout Tour places to checkpoints', () => {
    expect([1, 4].map(knockedOutAt)).toEqual([null, null])
    expect([5, 8, 9, 12, 13, 16, 17, 20, 21, 24].map(knockedOutAt)).toEqual([5, 5, 4, 4, 3, 3, 2, 2, 1, 1])
  })
})

describe('standings', () => {
  it('ranks by points, then wins, then average place', () => {
    const events = [gp([race({ mom: 2, dad: 1, kid: 3 }), race({ mom: 1, dad: 3, kid: 2 })])]
    // mom 12+15=27, dad 15+10=25, kid 10+12=22
    const rows = standings(events, ['mom', 'dad', 'kid'])
    expect(rows.map(r => r.playerId)).toEqual(['mom', 'dad', 'kid'])
    expect(rows[0]).toMatchObject({ points: 27, races: 2, wins: 1, podiums: 2, averagePlace: 1.5 })
    expect(rows[2]).toMatchObject({ wins: 0, podiums: 2 })
  })

  it('lists players who have not raced with zero', () => {
    const rows = standings([], ['mom'])
    expect(rows[0]).toMatchObject({ points: 0, races: 0, averagePlace: null })
  })
})

describe('sharedRanks', () => {
  it('gives tied scores the same rank and skips after a tie', () => {
    expect(sharedRanks([40, 30, 30, 10])).toEqual([1, 2, 2, 4])
    expect(sharedRanks([0, 0, 0])).toEqual([1, 1, 1])
  })
})

describe('tonight', () => {
  it('keeps a late night together until 5 a.m.', () => {
    const at = (h: number, day = 10) => new Date(2026, 9, day, h, 0, 0).getTime()
    expect(nightStart(at(21))).toBe(at(5))
    expect(nightStart(at(1, 11))).toBe(at(5))
    const events = [gp([], at(4)), { ...gp([], at(20)), id: 'e2' }]
    expect(tonightsEvents(events, at(23)).map(e => e.id)).toEqual(['e2'])
  })
})
