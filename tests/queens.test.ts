import { describe, expect, it } from 'vitest'
import { applyMove, createMoveHistory, redo, resetHistory, undo } from '../src/core/game'
import { createFilledGrid, setCell } from '../src/core/grid'
import type { StorageLike } from '../src/puzzles/persistence'
import {
  applyQueensMove,
  cellsInRegion,
  columnHasMultipleQueens,
  countSolutions,
  createInitialQueensState,
  generateQueens,
  hasDiagonallyAdjacentQueens,
  hasValidConnectedRegions,
  hasValidRegionIds,
  isLegalQueenPlacement,
  isQueensSolved,
  isRegionConnected,
  isValidQueensSolution,
  regionHasMultipleQueens,
  rowHasMultipleQueens,
  solve,
  type QueensMove,
  type QueensPlacementGrid,
  type QueensPuzzleInstance,
  type QueensRegionLayout,
} from '../src/puzzles/queens'
import {
  clearQueensProgress,
  loadQueensProgress,
  queensProgressKey,
  saveQueensProgress,
} from '../src/puzzles/queens/persistence'

const knownRegionCells = [
  [0, 0, 0, 1, 1],
  [0, 1, 1, 1, 1],
  [0, 2, 1, 3, 3],
  [3, 3, 3, 3, 3],
  [3, 3, 4, 3, 3],
]

function regions(cells: readonly (readonly number[])[] = knownRegionCells): QueensRegionLayout {
  return { rowCount: cells.length, columnCount: cells[0]?.length ?? 0, cells }
}

function instance(layout = regions()): QueensPuzzleInstance {
  return {
    id: 'queens:test',
    puzzleType: 'queens',
    question: { regions: layout, regionCount: layout.rowCount },
    metadata: {
      seed: 'test',
      generatorVersion: 1,
      size: layout.rowCount,
      generationAttempt: 1,
    },
  }
}

function placements(size: number, positions: readonly (readonly [number, number])[]): QueensPlacementGrid {
  let grid = createFilledGrid(size, size, false)
  for (const [row, col] of positions) grid = setCell(grid, { row, col }, true)
  return grid
}

const knownSolutionPositions: readonly (readonly [number, number])[] = [
  [0, 0], [1, 3], [2, 1], [3, 4], [4, 2],
]

describe('Queens regions', () => {
  it('assigns every cell a valid region ID', () => {
    const layout = regions()
    expect(hasValidRegionIds(layout, 5)).toBe(true)
    expect(layout.cells.flat()).toHaveLength(25)
    expect(new Set(layout.cells.flat())).toEqual(new Set([0, 1, 2, 3, 4]))
  })

  it('retrieves region cells and verifies connectivity', () => {
    const layout = regions()
    expect(cellsInRegion(layout, 2)).toEqual([{ row: 2, col: 1 }])
    expect(Array.from({ length: 5 }, (_, id) => isRegionConnected(layout, id))).toEqual(
      [true, true, true, true, true],
    )
    expect(hasValidConnectedRegions(layout, 5)).toBe(true)
  })

  it('rejects invalid IDs and disconnected regions', () => {
    const invalidIds = regions(knownRegionCells.map((row) => [...row]))
    ;(invalidIds.cells[0] as number[])[0] = -1
    const disconnected = regions([
      [0, 1, 1, 1, 0],
      [2, 2, 2, 2, 2],
      [3, 3, 3, 3, 3],
      [4, 4, 4, 4, 4],
      [4, 4, 4, 4, 4],
    ])
    expect(hasValidRegionIds(invalidIds, 5)).toBe(false)
    expect(isRegionConnected(disconnected, 0)).toBe(false)
  })
})

describe('Queens validator', () => {
  const puzzle = instance()

  it('detects duplicate rows, columns, and regions', () => {
    expect(rowHasMultipleQueens(placements(5, [[0, 0], [0, 2]]), 0)).toBe(true)
    expect(columnHasMultipleQueens(placements(5, [[0, 0], [2, 0]]), 0)).toBe(true)
    expect(regionHasMultipleQueens(puzzle, placements(5, [[0, 0], [1, 0]]), 0)).toBe(true)
  })

  it('detects diagonally adjacent queens', () => {
    expect(hasDiagonallyAdjacentQueens(placements(5, [[0, 0], [1, 1]]))).toBe(true)
  })

  it('accepts legal partial placements and rejects conflicts', () => {
    const state = { queens: placements(5, [[0, 0], [1, 3]]) }
    expect(isLegalQueenPlacement(puzzle, state, { row: 2, col: 1 })).toBe(true)
    expect(isLegalQueenPlacement(puzzle, state, { row: 2, col: 2 })).toBe(false)
    expect(isLegalQueenPlacement(puzzle, state, { row: 4, col: 0 })).toBe(false)
  })

  it('recognizes a solved board', () => {
    const solution = { queens: placements(5, knownSolutionPositions) }
    expect(isQueensSolved(puzzle, solution)).toBe(true)
    expect(isValidQueensSolution(puzzle, solution)).toBe(true)
  })
})

describe('Queens solver', () => {
  it('solves a known puzzle', () => {
    expect(solve(instance())?.queens.cells).toEqual(placements(5, knownSolutionPositions).cells)
  })

  it('returns no solution for a valid but contradictory region layout', () => {
    const impossible = instance(regions([
      [0, 0, 0, 1, 1],
      [0, 1, 1, 1, 1],
      [0, 1, 2, 3, 3],
      [3, 3, 3, 3, 3],
      [3, 3, 4, 3, 3],
    ]))
    expect(hasValidConnectedRegions(impossible.question.regions, 5)).toBe(true)
    expect(solve(impossible)).toBeNull()
  })

  it('does not mutate the puzzle input', () => {
    const puzzle = instance()
    const before = JSON.stringify(puzzle)
    solve(puzzle)
    expect(JSON.stringify(puzzle)).toBe(before)
  })

  it('stops solution counting at the supplied limit', () => {
    const rowRegions = instance(regions(Array.from({ length: 5 }, (_, row) => Array(5).fill(row))))
    expect(countSolutions(rowRegions, 2)).toBe(2)
    expect(countSolutions(rowRegions, 1)).toBe(1)
    expect(countSolutions(instance(), 2)).toBe(1)
  })
})

describe('Queens generator', () => {
  const first = generateQueens({ seed: 'queens-abc123' })
  const repeated = generateQueens({ seed: 'queens-abc123' })
  const different = generateQueens({ seed: 'queens-other' })

  it('is deterministic for the same seed', () => {
    expect(repeated).toEqual(first)
  })

  it('normally creates a different layout for a different seed', () => {
    expect(different.question.regions.cells).not.toEqual(first.question.regions.cells)
  })

  it('creates valid connected regions and exactly one solution', () => {
    expect(hasValidConnectedRegions(first.question.regions, first.question.regionCount)).toBe(true)
    expect(countSolutions(first, 2)).toBe(1)
  })

  it('generates a solution satisfying every Queens rule', () => {
    const solution = solve(first)
    expect(solution).not.toBeNull()
    expect(solution === null ? false : isValidQueensSolution(first, solution)).toBe(true)
  })

  it('supports configured square board sizes', () => {
    const smaller = generateQueens({ seed: 'six-by-six', size: 6 })
    expect(smaller.question.regions.rowCount).toBe(6)
    expect(smaller.question.regions.columnCount).toBe(6)
    expect(countSolutions(smaller, 2)).toBe(1)
  })
})

describe('Queens state with generic history', () => {
  const puzzle = instance()
  const reduce = (state: ReturnType<typeof createInitialQueensState>, move: QueensMove) =>
    applyQueensMove(puzzle, state, move)

  it('places and removes queens without changing puzzle data', () => {
    const initial = createInitialQueensState(puzzle)
    const puzzleBefore = JSON.stringify(puzzle)
    const placed = applyQueensMove(puzzle, initial, { row: 0, col: 0, value: true })
    const removed = applyQueensMove(puzzle, placed, { row: 0, col: 0, value: false })
    expect(placed.queens.cells[0]?.[0]).toBe(true)
    expect(removed.queens.cells[0]?.[0]).toBe(false)
    expect(JSON.stringify(puzzle)).toBe(puzzleBefore)
  })

  it('supports undo, redo, and reset through generic move history', () => {
    const initial = createInitialQueensState(puzzle)
    let history = createMoveHistory<ReturnType<typeof createInitialQueensState>, QueensMove>(initial)
    history = applyMove(history, { row: 0, col: 0, value: true }, reduce)
    expect(history.currentState.queens.cells[0]?.[0]).toBe(true)
    history = undo(history)
    expect(history.currentState.queens.cells[0]?.[0]).toBe(false)
    history = redo(history)
    expect(history.currentState.queens.cells[0]?.[0]).toBe(true)
    history = resetHistory(history)
    expect(history.currentState).toBe(initial)
    expect(history.past).toEqual([])
    expect(history.future).toEqual([])
  })
})

class MemoryStorage implements StorageLike {
  private readonly values = new Map<string, string>()
  getItem(key: string): string | null { return this.values.get(key) ?? null }
  setItem(key: string, value: string): void { this.values.set(key, value) }
  removeItem(key: string): void { this.values.delete(key) }
}

describe('Queens persistence', () => {
  it('stores progress by puzzle type and seed, restores it, and clears it', () => {
    const storage = new MemoryStorage()
    const puzzle = instance()
    const state = applyQueensMove(
      puzzle,
      createInitialQueensState(puzzle),
      { row: 0, col: 0, value: true },
    )
    saveQueensProgress(storage, 'abc123', state, false)
    expect(queensProgressKey('abc123')).toBe('puzzle:queens:abc123')
    expect(loadQueensProgress(storage, 'abc123', puzzle)?.state).toEqual(state)
    clearQueensProgress(storage, 'abc123')
    expect(loadQueensProgress(storage, 'abc123', puzzle)).toBeNull()
  })

  it('ignores malformed saved placements', () => {
    const storage = new MemoryStorage()
    storage.setItem(queensProgressKey('bad'), JSON.stringify({ version: 1, queens: [] }))
    expect(loadQueensProgress(storage, 'bad', instance())).toBeNull()
  })
})
