import { describe, expect, it } from 'vitest'
import { DRIVERS, DRIVER_BY_ID } from './drivers'
import { OUTFITS, looksFor } from './outfits'
import { VEHICLES } from './vehicles'
import { CUPS } from './cups'
import { FIELD_SIZE, POINTS_BY_PLACE, ordinal, pointsFor } from '../lib/scoring'

describe('roster', () => {
  it('has all 50 drivers: 32 starting, 7 cup unlocks, 11 Kamek unlocks', () => {
    expect(DRIVERS).toHaveLength(50)
    expect(DRIVERS.filter(d => d.unlock === 'start')).toHaveLength(32)
    expect(DRIVERS.filter(d => d.unlock === 'cup')).toHaveLength(7)
    expect(DRIVERS.filter(d => d.unlock === 'kamek')).toHaveLength(11)
  })

  it('has all 40 vehicles, 11 of them available from the start', () => {
    expect(VEHICLES).toHaveLength(40)
    expect(VEHICLES.filter(v => v.starter)).toHaveLength(11)
    const byType = (t: string) => VEHICLES.filter(v => v.type === t).length
    expect([byType('Kart'), byType('Bike'), byType('Trike'), byType('Sled')]).toEqual([21, 11, 6, 2])
  })

  it('uses unique ids and colors that parse as hex', () => {
    expect(new Set(DRIVERS.map(d => d.id)).size).toBe(DRIVERS.length)
    expect(new Set(VEHICLES.map(v => v.id)).size).toBe(VEHICLES.length)
    for (const d of DRIVERS) expect(d.color).toMatch(/^#[0-9A-F]{6}$/i)
  })

  it('has 103 outfits across 24 drivers, all on the roster', () => {
    const ids = Object.keys(OUTFITS)
    expect(ids).toHaveLength(24)
    expect(Object.values(OUTFITS).flat()).toHaveLength(103)
    for (const id of ids) expect(DRIVER_BY_ID[id]).toBeDefined()
    expect(looksFor('mario')).toHaveLength(10)
    expect(looksFor('goomba')).toEqual(['Regular'])
  })

  it('has 8 cups of 4 courses', () => {
    expect(CUPS).toHaveLength(8)
    for (const c of CUPS) expect(c.courses).toHaveLength(4)
  })
})

describe('scoring', () => {
  it('covers a full 24-racer grid, from 15 down to 1', () => {
    expect(POINTS_BY_PLACE).toHaveLength(FIELD_SIZE)
    expect(pointsFor(1)).toBe(15)
    expect(pointsFor(4)).toBe(9)
    expect(pointsFor(5)).toBe(9)
    expect(pointsFor(24)).toBe(1)
  })

  it('never awards more points to a lower place', () => {
    for (let i = 1; i < POINTS_BY_PLACE.length; i++) {
      expect(POINTS_BY_PLACE[i]).toBeLessThanOrEqual(POINTS_BY_PLACE[i - 1])
    }
  })

  it('scores 0 for places off the grid', () => {
    expect(pointsFor(0)).toBe(0)
    expect(pointsFor(25)).toBe(0)
    expect(pointsFor(2.5)).toBe(0)
  })

  it('writes ordinals', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 24].map(ordinal))
      .toEqual(['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '23rd', '24th'])
  })
})
