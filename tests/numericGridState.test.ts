import { describe, expect, it } from 'vitest'
import { createFilledGrid } from '../src/core/grid'
import {
  applyNumericGridMove,
  createNumericGridState,
  mergeNumericGrid,
} from '../src/puzzles/shared/numericGridState'

const givens = {
  rowCount: 2,
  columnCount: 3,
  cells: [[1, null, null], [null, null, null]],
}

const rules = {
  givens,
  isValueAllowed: (value: number, position: { row: number; col: number }): value is number =>
    Number.isInteger(value) && value >= 1 && value <= (position.col === 2 ? 2 : 3),
  peers: (position: { row: number; col: number }) => [
    { row: position.row, col: (position.col + 1) % 3 },
  ],
}

describe('shared numeric grid state', () => {
  it('creates rectangular entry and hint grids and preserves givens when merging', () => {
    const state = createNumericGridState<number>(2, 3)
    expect(state.entries.cells).toEqual([[null, null, null], [null, null, null]])
    expect(state.hints.cells).toEqual([[[], [], []], [[], [], []]])
    expect(mergeNumericGrid(givens, state.entries).cells[0]?.[0]).toBe(1)
  })

  it('applies one hint move across cells while respecting per-cell value ranges', () => {
    const state = createNumericGridState<number>(2, 3)
    const hinted = applyNumericGridMove(state, {
      kind: 'hint',
      positions: [{ row: 0, col: 1 }, { row: 0, col: 2 }],
      digit: 3,
      enabled: true,
    }, rules)
    expect(hinted.hints.cells[0]?.[1]).toEqual([3])
    expect(hinted.hints.cells[0]?.[2]).toEqual([])
  })

  it('protects givens and removes a placed value from peer hints', () => {
    let state = createNumericGridState<number>(2, 3)
    state = applyNumericGridMove(state, {
      kind: 'hint', positions: [{ row: 0, col: 2 }], digit: 2, enabled: true,
    }, rules)
    state = applyNumericGridMove(state, {
      kind: 'value', positions: [{ row: 0, col: 1 }], value: 2,
    }, rules)
    expect(state.entries.cells[0]?.[1]).toBe(2)
    expect(state.hints.cells[0]?.[2]).toEqual([])
    expect(applyNumericGridMove(state, {
      kind: 'value', positions: [{ row: 0, col: 0 }], value: 2,
    }, rules)).toBe(state)
  })

  it('returns the original state for a no-op move', () => {
    const state = {
      ...createNumericGridState<number>(2, 3),
      entries: createFilledGrid<number | null>(2, 3, null),
    }
    expect(applyNumericGridMove(state, {
      kind: 'hint', positions: [], digit: 1, enabled: true,
    }, rules)).toBe(state)
  })
})
