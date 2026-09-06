import { describe, expect, it } from 'vitest'
import { createSeededRandom } from '../src/core/random'

function sequence(seed: string): number[] {
  const random = createSeededRandom(seed)
  return Array.from({ length: 6 }, () => random.nextFloat())
}

describe('seeded random', () => {
  it('produces the same sequence for the same seed', () => {
    expect(sequence('abc123')).toEqual(sequence('abc123'))
  })

  it('normally produces different sequences for different seeds', () => {
    expect(sequence('abc123')).not.toEqual(sequence('sudoku-492810'))
  })

  it('keeps integers within the documented half-open range', () => {
    const random = createSeededRandom('range-check')
    const values = Array.from({ length: 1_000 }, () => random.nextInt(-3, 8))
    expect(values.every((value) => Number.isInteger(value) && value >= -3 && value < 8)).toBe(true)
  })

  it('shuffles deterministically without mutating the input', () => {
    const input = [1, 2, 3, 4, 5, 6]
    const first = createSeededRandom('shuffle').shuffle(input)
    const second = createSeededRandom('shuffle').shuffle(input)
    expect(first).toEqual(second)
    expect(input).toEqual([1, 2, 3, 4, 5, 6])
    expect(first).not.toBe(input)
    expect([...first].sort()).toEqual(input)
  })
})
