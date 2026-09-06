import { describe, expect, it } from 'vitest'
import { applyMove, createMoveHistory, redo, resetHistory, undo } from '../src/core/game'
import type { StorageLike } from '../src/puzzles/persistence'
import {
  applySuguruMove,
  cellsInRegion,
  countSolutions,
  createInitialSuguruState,
  generateSuguru,
  hasEqualTouchingValues,
  hasValidConnectedRegions,
  hasValidRegionAssignments,
  isLegalSuguruMove,
  isRegionConnected,
  isSuguruSolved,
  isValidPartialBoard,
  isValidSuguruSolution,
  mergeSuguruBoard,
  regionHasDuplicateValues,
  regionSize,
  solve,
  validValuesForRegion,
  validateSuguru,
  type SuguruBoard,
  type SuguruMove,
  type SuguruPuzzleInstance,
  type SuguruRegionLayout,
  type SuguruSolution,
} from '../src/puzzles/suguru'
import {
  clearSuguruProgress,
  loadSuguruProgress,
  saveSuguruProgress,
  suguruProgressKey,
} from '../src/puzzles/suguru/persistence'

const regionCells = [
  [0, 0, 1, 1],
  [0, 0, 1, 1],
  [2, 2, 3, 3],
  [2, 2, 3, 3],
]

const solutionCells = [
  [1, 2, 3, 4],
  [3, 4, 1, 2],
  [1, 2, 3, 4],
  [3, 4, 1, 2],
]

function grid<T>(cells: readonly (readonly T[])[]): {
  rowCount: number
  columnCount: number
  cells: readonly (readonly T[])[]
} {
  return { rowCount: cells.length, columnCount: cells[0]?.length ?? 0, cells }
}

function regions(cells = regionCells): SuguruRegionLayout {
  return grid(cells)
}

function board(cells: readonly (readonly (number | null)[])[]): SuguruBoard {
  return grid(cells)
}

function instance(givens = board([
  [1, 2, 3, 4],
  [3, 4, 1, 2],
  [1, 2, 3, 4],
  [3, 4, 1, null],
])): SuguruPuzzleInstance {
  return {
    id: 'suguru:test',
    puzzleType: 'suguru',
    question: { regions: regions(), regionCount: 4, givens },
    metadata: {
      seed: 'test', generatorVersion: 1, generationAttempt: 1,
      clueCount: givens.cells.flat().filter((value) => value !== null).length,
    },
  }
}

describe('Suguru regions', () => {
  it('assigns every cell to exactly one valid region', () => {
    const layout = regions()
    expect(hasValidRegionAssignments(layout, 4)).toBe(true)
    expect(layout.cells.flat()).toHaveLength(16)
    expect(new Set(layout.cells.flat())).toEqual(new Set([0, 1, 2, 3]))
  })

  it('retrieves cells, sizes, and dynamic value ranges', () => {
    expect(cellsInRegion(regions(), 0)).toEqual([
      { row: 0, col: 0 }, { row: 0, col: 1 },
      { row: 1, col: 0 }, { row: 1, col: 1 },
    ])
    expect(regionSize(regions(), 2)).toBe(4)
    expect(validValuesForRegion(regions(), 2)).toEqual([1, 2, 3, 4])
  })

  it('requires every region to be orthogonally connected', () => {
    expect(Array.from({ length: 4 }, (_, id) => isRegionConnected(regions(), id))).toEqual(
      [true, true, true, true],
    )
    expect(hasValidConnectedRegions(regions(), 4)).toBe(true)
    const disconnected = regions([
      [0, 1, 1, 0],
      [2, 1, 1, 2],
      [2, 2, 3, 3],
      [2, 3, 3, 3],
    ])
    expect(isRegionConnected(disconnected, 0)).toBe(false)
    expect(hasValidConnectedRegions(disconnected, 4)).toBe(false)
  })
})

describe('Suguru validator', () => {
  const emptyPuzzle = instance(board(Array.from({ length: 4 }, () => Array(4).fill(null))))

  it('accepts a valid partial board', () => {
    const partial = board([
      [1, null, 3, null], [null, 4, null, 2],
      [1, null, 3, null], [null, 4, null, 2],
    ])
    expect(isValidPartialBoard(emptyPuzzle, partial)).toBe(true)
  })

  it('rejects duplicate region values', () => {
    const duplicate = board([
      [1, 1, null, null], [null, null, null, null],
      [null, null, null, null], [null, null, null, null],
    ])
    expect(regionHasDuplicateValues(emptyPuzzle, duplicate, 0)).toBe(true)
    expect(isValidPartialBoard(emptyPuzzle, duplicate)).toBe(false)
  })

  it('rejects equal orthogonal and diagonal neighbours', () => {
    const orthogonal = board([
      [null, 2, 2, null], [null, null, null, null],
      [null, null, null, null], [null, null, null, null],
    ])
    const diagonal = board([
      [null, 2, null, null], [null, null, 2, null],
      [null, null, null, null], [null, null, null, null],
    ])
    expect(hasEqualTouchingValues(emptyPuzzle, orthogonal)).toBe(true)
    expect(isValidPartialBoard(emptyPuzzle, orthogonal)).toBe(false)
    expect(hasEqualTouchingValues(emptyPuzzle, diagonal)).toBe(true)
    expect(isValidPartialBoard(emptyPuzzle, diagonal)).toBe(false)
  })

  it('rejects values above their region size', () => {
    const invalid = board([
      [5, null, null, null], [null, null, null, null],
      [null, null, null, null], [null, null, null, null],
    ])
    expect(isValidPartialBoard(emptyPuzzle, invalid)).toBe(false)
  })

  it('checks legal moves, immutable givens, and solved boards', () => {
    const puzzle = instance()
    const initial = createInitialSuguruState(puzzle)
    expect(isLegalSuguruMove(puzzle, initial, { row: 3, col: 3, value: 2 })).toBe(true)
    expect(isLegalSuguruMove(puzzle, initial, { row: 3, col: 3, value: 1 })).toBe(false)
    expect(isLegalSuguruMove(puzzle, initial, { row: 0, col: 0, value: 2 })).toBe(false)
    const solved = applySuguruMove(puzzle, initial, { row: 3, col: 3, value: 2 })
    expect(isSuguruSolved(puzzle, solved)).toBe(true)
    expect(isValidSuguruSolution(puzzle, grid(solutionCells) as SuguruSolution)).toBe(true)

    const modifiedGiven = {
      entries: grid([
        [2, null, null, null], [null, null, null, null],
        [null, null, null, null], [null, null, null, null],
      ]) as SuguruBoard,
    }
    expect(validateSuguru(puzzle, modifiedGiven).issues.some((issue) => issue.code === 'modified-given')).toBe(true)
  })
})

describe('Suguru solver', () => {
  it('solves a known puzzle and satisfies every rule', () => {
    const puzzle = instance()
    const solution = solve(puzzle)
    expect(solution?.cells).toEqual(solutionCells)
    expect(solution === null ? false : isValidSuguruSolution(puzzle, solution)).toBe(true)
  })

  it('returns no solution for an impossible puzzle', () => {
    const impossible = instance(board([
      [1, 2, 3, 4], [3, 4, 1, 2],
      [1, 2, 3, 4], [3, 4, 1, 1],
    ]))
    expect(solve(impossible)).toBeNull()
  })

  it('does not mutate input and stops counting at the requested limit', () => {
    const puzzle = instance()
    const before = JSON.stringify(puzzle)
    solve(puzzle)
    expect(JSON.stringify(puzzle)).toBe(before)
    expect(countSolutions(puzzle, 2)).toBe(1)

    const empty = instance(board(Array.from({ length: 4 }, () => Array(4).fill(null))))
    expect(countSolutions(empty, 2)).toBe(2)
    expect(countSolutions(empty, 1)).toBe(1)
  })
})

describe('Suguru generator', () => {
  const seeds = ['suguru-one', 'suguru-two', 'suguru-three', 'suguru-four']
  const generated = seeds.map((seed) => generateSuguru({ seed }))

  it('is reproducible and normally differs between seeds', () => {
    expect(generateSuguru({ seed: seeds[0] as string })).toEqual(generated[0])
    expect(generated[0]?.question.regions.cells).not.toEqual(generated[1]?.question.regions.cells)
  })

  it('generates connected layouts, valid unique solutions, and matching givens', () => {
    for (const puzzle of generated) {
      expect(hasValidConnectedRegions(puzzle.question.regions, puzzle.question.regionCount)).toBe(true)
      expect(countSolutions(puzzle, 2)).toBe(1)
      const solution = solve(puzzle)
      expect(solution).not.toBeNull()
      expect(solution === null ? false : isValidSuguruSolution(puzzle, solution)).toBe(true)
      puzzle.question.givens.cells.forEach((row, rowIndex) => {
        row.forEach((given, colIndex) => {
          if (given !== null) expect(solution?.cells[rowIndex]?.[colIndex]).toBe(given)
        })
      })
    }
  })

  it('supports rectangular boards', () => {
    const puzzle = generateSuguru({ seed: 'rectangular', rows: 5, columns: 6 })
    expect(puzzle.question.regions.rowCount).toBe(5)
    expect(puzzle.question.regions.columnCount).toBe(6)
    expect(countSolutions(puzzle, 2)).toBe(1)
  })
})

describe('Suguru state with generic history', () => {
  const puzzle = instance()
  const reduce = (state: ReturnType<typeof createInitialSuguruState>, move: SuguruMove) =>
    applySuguruMove(puzzle, state, move)

  it('enters, replaces, and clears values while protecting givens', () => {
    const initial = createInitialSuguruState(puzzle)
    const entered = applySuguruMove(puzzle, initial, { row: 3, col: 3, value: 2 })
    const replaced = applySuguruMove(puzzle, entered, { row: 3, col: 3, value: 3 })
    const cleared = applySuguruMove(puzzle, replaced, { row: 3, col: 3, value: null })
    expect(entered.entries.cells[3]?.[3]).toBe(2)
    expect(replaced.entries.cells[3]?.[3]).toBe(3)
    expect(cleared.entries.cells[3]?.[3]).toBeNull()
    expect(applySuguruMove(puzzle, initial, { row: 0, col: 0, value: 2 })).toBe(initial)
    expect(mergeSuguruBoard(puzzle, entered).cells[0]?.[0]).toBe(1)
  })

  it('supports undo, redo, and reset through generic history', () => {
    const initial = createInitialSuguruState(puzzle)
    let history = createMoveHistory<ReturnType<typeof createInitialSuguruState>, SuguruMove>(initial)
    history = applyMove(history, { row: 3, col: 3, value: 2 }, reduce)
    history = undo(history)
    expect(history.currentState.entries.cells[3]?.[3]).toBeNull()
    history = redo(history)
    expect(history.currentState.entries.cells[3]?.[3]).toBe(2)
    history = resetHistory(history)
    expect(history.currentState).toBe(initial)
  })
})

class MemoryStorage implements StorageLike {
  private readonly values = new Map<string, string>()
  getItem(key: string): string | null { return this.values.get(key) ?? null }
  setItem(key: string, value: string): void { this.values.set(key, value) }
  removeItem(key: string): void { this.values.delete(key) }
}

describe('Suguru persistence', () => {
  it('stores progress by type and seed, restores it, and clears it', () => {
    const storage = new MemoryStorage()
    const puzzle = instance()
    const state = applySuguruMove(
      puzzle, createInitialSuguruState(puzzle), { row: 3, col: 3, value: 2 },
    )
    saveSuguruProgress(storage, 'abc123', state, true)
    expect(suguruProgressKey('abc123')).toBe('puzzle:suguru:abc123')
    expect(loadSuguruProgress(storage, 'abc123', puzzle)?.state).toEqual(state)
    clearSuguruProgress(storage, 'abc123')
    expect(loadSuguruProgress(storage, 'abc123', puzzle)).toBeNull()
  })
})
