import { describe, expect, it } from 'vitest'
import { headToHead, playerRecords, raceNights } from './history'
import type { Ride } from './players'
import type { RaceEntry, RaceEvent } from './racing'

const at = (day: number, hour: number) => new Date(2026, 9, day, hour).getTime()

function race(places: Record<string, number>, rides: Record<string, Ride> = {}): RaceEntry {
  return { course: 'Course', places, rides, at: 0 }
}

const peach: Ride = { driverId: 'peach', outfit: 'Aviator', vehicleId: 'cute-scoot' }
const cow: Ride = { driverId: 'cow', vehicleId: 'plushbuggy' }
const bowser: Ride = { driverId: 'bowser', vehicleId: 'standard-kart' }

// Night 1 (Oct 10): a full Mushroom Cup that Kid wins.
const cup: RaceEvent = {
  id: 'cup', kind: 'gp', trackId: 'mushroom', playerIds: ['mom', 'kid'], startedAt: at(10, 19),
  races: [
    race({ mom: 2, kid: 1 }, { mom: peach, kid: cow }),
    race({ mom: 1, kid: 3 }, { mom: peach, kid: cow }),
    race({ mom: 4, kid: 1 }, { mom: peach, kid: cow }),
    race({ mom: 5, kid: 2 }, { mom: bowser, kid: cow }),
  ],
}
// Night 2 (Oct 11, after midnight counts as Oct 11 night): a rally Mom wins.
const rally: RaceEvent = {
  id: 'rally', kind: 'ko', trackId: 'golden', playerIds: ['mom', 'kid'], startedAt: at(11, 21),
  races: [race({ mom: 3, kid: 9 }, { mom: peach, kid: cow })],
}
// An unfinished cup: counts for races, not for cups won.
const unfinished: RaceEvent = {
  id: 'open', kind: 'gp', trackId: 'flower', playerIds: ['mom', 'kid'], startedAt: at(12, 1),
  races: [race({ mom: 1, kid: 2 })],
}

describe('playerRecords', () => {
  const [mom, kid] = playerRecords([cup, rally, unfinished], ['mom', 'kid'])

  it('counts races, wins, podiums and places', () => {
    expect(mom).toMatchObject({ races: 6, wins: 2, podiums: 4, bestPlace: 1 })
    expect(mom.averagePlace).toBeCloseTo((2 + 1 + 4 + 5 + 3 + 1) / 6)
    expect(kid).toMatchObject({ races: 6, wins: 2, podiums: 5, bestPlace: 1 })
  })

  it('counts cups and rallies won, finished ones only', () => {
    expect(kid).toMatchObject({ cupsWon: 1, ralliesWon: 0 })
    expect(mom).toMatchObject({ cupsWon: 0, ralliesWon: 1 })
  })

  it('finds the favorite driver with its usual outfit, and the best one', () => {
    expect(mom.favoriteDriver).toMatchObject({ id: 'peach', races: 4, outfit: 'Aviator' })
    expect(mom.bestDriver).toMatchObject({ id: 'peach', races: 4, averagePlace: 2.5 })
    expect(kid.favoriteDriver).toMatchObject({ id: 'cow', races: 5 })
    expect(kid.favoriteDriver?.outfit).toBeUndefined()
    expect(kid.favoriteVehicle).toMatchObject({ id: 'plushbuggy', races: 5 })
  })

  it('needs 3 races before calling a driver the best', () => {
    const [m] = playerRecords([rally], ['mom'])
    expect(m.bestDriver).toBeNull()
    expect(m.favoriteDriver).toMatchObject({ id: 'peach', races: 1 })
  })
})

describe('headToHead', () => {
  it('counts who finished ahead in shared races', () => {
    const h = headToHead([cup, rally, unfinished], ['mom', 'kid'])
    // Mom ahead in race 2, the rally and the unfinished cup's race.
    expect(h.mom.kid).toEqual({ ahead: 3, behind: 3 })
    expect(h.kid.mom).toEqual({ ahead: 3, behind: 3 })
  })
})

describe('raceNights', () => {
  it('groups by night, newest first, with the night winner', () => {
    const nights = raceNights([cup, rally, unfinished])
    expect(nights).toHaveLength(2)
    expect(nights[0].events.map(e => e.id)).toEqual(['rally', 'open'])
    expect(nights[0].races).toBe(2)
    // rally: mom 3rd (10), kid 9th (7); open cup: mom 15, kid 12
    expect(nights[0].points).toEqual({ mom: 25, kid: 19 })
    expect(nights[0].winners).toEqual(['mom'])
    expect(nights[1].winners).toEqual(['kid'])
  })
})
