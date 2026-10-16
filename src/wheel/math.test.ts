import { describe, expect, it } from 'vitest'
import { TAU, indexAt, landingRotation, pegsPassed, randomIndex, sliceAngle, spinEase, spreadByGroup } from './math'

describe('indexAt', () => {
  it('reads slice 0 at rest and walks backward as the wheel turns clockwise', () => {
    const n = 50
    expect(indexAt(0, n)).toBe(0)
    // Turning clockwise by one slice brings the last slice under the pointer.
    expect(indexAt(sliceAngle(n) * 0.5, n)).toBe(n - 1)
    expect(indexAt(-sliceAngle(n) * 1.5, n)).toBe(1)
    expect(indexAt(TAU * 7 - sliceAngle(n) * 2.5, n)).toBe(2)
  })
})

describe('landingRotation', () => {
  it('stops every slice under the pointer, after the minimum turns, for any start', () => {
    for (const n of [2, 10, 40, 50]) {
      for (const start of [0, 1.234, -5, TAU * 3.7]) {
        for (let i = 0; i < n; i++) {
          for (const offset of [0.15, 0.5, 0.85]) {
            const end = landingRotation(start, i, n, 5, offset)
            expect(indexAt(end, n)).toBe(i)
            expect(end - start).toBeGreaterThanOrEqual(5 * TAU)
            expect(end - start).toBeLessThan(6 * TAU)
          }
        }
      }
    }
  })
})

describe('spinEase', () => {
  it('starts at 0, ends at 1 and never runs backward', () => {
    expect(spinEase(0)).toBe(0)
    expect(spinEase(1)).toBe(1)
    expect(spinEase(2)).toBe(1)
    let last = 0
    for (let t = 0; t <= 1; t += 0.01) {
      const v = spinEase(t)
      expect(v).toBeGreaterThanOrEqual(last)
      last = v
    }
  })
})

describe('pegsPassed', () => {
  it('counts slice edges crossed', () => {
    const n = 40
    const a = sliceAngle(n)
    expect(pegsPassed(0.1 * a, 0.9 * a, n)).toBe(0)
    expect(pegsPassed(0.9 * a, 1.1 * a, n)).toBe(1)
    expect(pegsPassed(0, TAU, n)).toBe(n)
  })
})

describe('randomIndex', () => {
  it('stays in range at the extremes of the random source', () => {
    expect(randomIndex(50, () => 0)).toBe(0)
    expect(randomIndex(50, () => 0.999999999)).toBe(49)
    expect(randomIndex(50, () => 1)).toBe(49)
  })

  it('reaches every slice', () => {
    const seen = new Set<number>()
    for (let i = 0; i < 5000; i++) seen.add(randomIndex(40))
    expect(seen.size).toBe(40)
  })
})

describe('spreadByGroup', () => {
  it('keeps every item and interleaves groups', () => {
    const items = [...'KKKKKKKK'.split('').map((k, i) => k + i), 'B0', 'B1', 'T0', 'S0']
    const out = spreadByGroup(items, s => s[0])
    expect(out).toHaveLength(items.length)
    expect(new Set(out)).toEqual(new Set(items))
    // The four bikes, trikes and sleds are not bunched at one end.
    const firstHalf = out.slice(0, 6).filter(s => s[0] !== 'K').length
    expect(firstHalf).toBeGreaterThanOrEqual(1)
    expect(firstHalf).toBeLessThanOrEqual(3)
  })
})
