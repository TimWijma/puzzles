import { describe, expect, it } from 'vitest'
import { findIncorrectFilledPositions, positionKeySet } from '../src/puzzles/shared/boardCheck'

describe('shared board checking', () => {
  it('returns only filled entries that disagree with the solution', () => {
    const entries = {
      rowCount: 2,
      columnCount: 3,
      cells: [[1, null, 3], [null, 2, 1]],
    }
    const solution = {
      rowCount: 2,
      columnCount: 3,
      cells: [[1, 2, 2], [3, 2, 3]],
    }
    const incorrect = findIncorrectFilledPositions(
      entries,
      solution,
      (value) => value !== null,
      (value, answer) => value === answer,
    )
    expect(incorrect).toEqual([{ row: 0, col: 2 }, { row: 1, col: 2 }])
    expect(positionKeySet(incorrect)).toEqual(new Set(['0:2', '1:2']))
  })

  it('returns no positions for grids with different dimensions', () => {
    expect(findIncorrectFilledPositions(
      { rowCount: 1, columnCount: 1, cells: [[1]] },
      { rowCount: 2, columnCount: 1, cells: [[1], [1]] },
      () => true,
      (value, answer) => value === answer,
    )).toEqual([])
  })
})
