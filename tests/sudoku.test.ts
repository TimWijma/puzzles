import { describe, expect, it } from 'vitest'
import { applyMove, createMoveHistory, redo, resetHistory, undo } from '../src/core/game'
import {
  applySudokuMove,
  boxHasDuplicateValues,
  columnHasDuplicateValues,
  countSolutions,
  createInitialSudokuState,
  generateSudoku,
  hasDuplicateNonEmptyValues,
  isSudokuSolved,
  isValidPartialBoard,
  isValidSudokuMove,
  isValidSudokuSolution,
  mergeSudokuBoard,
  rowHasDuplicateValues,
  solve,
  type SudokuBoard,
  type SudokuDigit,
  type SudokuMove,
  type SudokuPuzzleInstance,
} from '../src/puzzles/sudoku'
import {
  clearSudokuProgress,
  loadSudokuProgress,
  saveSudokuProgress,
  sudokuProgressKey,
} from '../src/puzzles/sudoku/persistence'
import type { StorageLike } from '../src/puzzles/sudoku/persistenceTypes'

const puzzleRows = [
  '530070000',
  '600195000',
  '098000060',
  '800060003',
  '400803001',
  '700020006',
  '060000280',
  '000419005',
  '000080079',
]

const solutionRows = [
  '534678912',
  '672195348',
  '198342567',
  '859761423',
  '426853791',
  '713924856',
  '961537284',
  '287419635',
  '345286179',
]

function board(rows: readonly string[]): SudokuBoard {
  return {
    rowCount: 9,
    columnCount: 9,
    cells: rows.map((row) =>
      [...row].map((character) =>
        character === '0' ? null : (Number(character) as SudokuDigit),
      ),
    ),
  }
}

function instance(givens = board(puzzleRows)): SudokuPuzzleInstance {
  return {
    id: 'sudoku:test',
    puzzleType: 'sudoku',
    question: { givens },
    metadata: { seed: 'test', generatorVersion: 1, clueCount: 30 },
  }
}

describe('Sudoku validator', () => {
  it('accepts a valid row and detects a duplicate row', () => {
    expect(hasDuplicateNonEmptyValues([1, 2, 3, null, 4, 5, 6, 7, 8])).toBe(false)
    expect(rowHasDuplicateValues(board(['110000000', ...puzzleRows.slice(1)]), 0)).toBe(true)
  })

  it('detects duplicate values in columns and 3×3 boxes', () => {
    const duplicateColumn = board(['500000000', '500000000', ...Array(7).fill('000000000')])
    const duplicateBox = board(['010000000', '010000000', ...Array(7).fill('000000000')])
    expect(columnHasDuplicateValues(duplicateColumn, 0)).toBe(true)
    expect(boxHasDuplicateValues(duplicateBox, 0, 0)).toBe(true)
  })

  it('checks proposed moves against givens and Sudoku constraints', () => {
    const puzzle = instance()
    const state = createInitialSudokuState(puzzle)
    expect(isValidSudokuMove(puzzle, state, { row: 0, col: 2, value: 4 })).toBe(true)
    expect(isValidSudokuMove(puzzle, state, { row: 0, col: 2, value: 5 })).toBe(false)
    expect(isValidSudokuMove(puzzle, state, { row: 0, col: 0, value: 4 })).toBe(false)
  })

  it('recognizes a complete, valid solution', () => {
    const solvedBoard = board(solutionRows)
    expect(isValidSudokuSolution(solvedBoard)).toBe(true)

    const puzzle = instance()
    const entries = solvedBoard.cells.map((row, rowIndex) =>
      row.map((value, colIndex) =>
        puzzle.question.givens.cells[rowIndex]?.[colIndex] === null ? value : null,
      ),
    )
    expect(
      isSudokuSolved(puzzle, {
        entries: { rowCount: 9, columnCount: 9, cells: entries },
      }),
    ).toBe(true)
  })
})

describe('Sudoku solver', () => {
  it('solves a known puzzle deterministically', () => {
    expect(solve(board(puzzleRows))?.cells).toEqual(board(solutionRows).cells)
  })

  it('returns an already solved valid puzzle', () => {
    expect(solve(board(solutionRows))?.cells).toEqual(board(solutionRows).cells)
  })

  it('rejects invalid and unsolvable puzzles', () => {
    const invalid = board(['550070000', ...puzzleRows.slice(1)])
    const unsolvable = board(['531070000', ...puzzleRows.slice(1)])
    expect(solve(invalid)).toBeNull()
    expect(solve(unsolvable)).toBeNull()
  })

  it('does not mutate its input', () => {
    const input = board(puzzleRows)
    const before = JSON.stringify(input)
    solve(input)
    expect(JSON.stringify(input)).toBe(before)
  })

  it('counts unique puzzles and stops at the requested limit', () => {
    const empty = board(Array(9).fill('000000000'))
    expect(countSolutions(board(puzzleRows), 2)).toBe(1)
    expect(countSolutions(empty, 2)).toBe(2)
    expect(countSolutions(empty, 1)).toBe(1)
  })
})

describe('Sudoku generator', () => {
  const first = generateSudoku({ seed: 'abc123' })
  const repeated = generateSudoku({ seed: 'abc123' })
  const different = generateSudoku({ seed: 'different-seed' })

  it('is reproducible from a seed', () => {
    expect(repeated).toEqual(first)
  })

  it('usually differs for a different seed', () => {
    expect(different.question.givens.cells).not.toEqual(first.question.givens.cells)
  })

  it('creates a valid puzzle with exactly one solution', () => {
    expect(isValidPartialBoard(first.question.givens)).toBe(true)
    expect(countSolutions(first, 2)).toBe(1)
    expect(first.metadata?.clueCount).toBeGreaterThanOrEqual(24)
  })

  it('keeps every given consistent with its solution', () => {
    const solution = solve(first)
    expect(solution).not.toBeNull()
    first.question.givens.cells.forEach((row, rowIndex) => {
      row.forEach((given, colIndex) => {
        if (given !== null) expect(solution?.cells[rowIndex]?.[colIndex]).toBe(given)
      })
    })
  })
})

describe('Sudoku player state and generic history', () => {
  const puzzle = instance()
  const reduce = (state: ReturnType<typeof createInitialSudokuState>, move: SudokuMove) =>
    applySudokuMove(puzzle, state, move)

  it('cannot modify a given', () => {
    const state = createInitialSudokuState(puzzle)
    expect(applySudokuMove(puzzle, state, { row: 0, col: 0, value: 1 })).toBe(state)
    expect(puzzle.question.givens.cells[0]?.[0]).toBe(5)
  })

  it('enters and clears a player value without changing givens', () => {
    const initial = createInitialSudokuState(puzzle)
    const entered = applySudokuMove(puzzle, initial, { row: 0, col: 2, value: 4 })
    const cleared = applySudokuMove(puzzle, entered, { row: 0, col: 2, value: null })
    expect(entered.entries.cells[0]?.[2]).toBe(4)
    expect(cleared.entries.cells[0]?.[2]).toBeNull()
    expect(puzzle.question.givens.cells[0]?.[2]).toBeNull()
  })

  it('supports undo, redo, and reset through generic move history', () => {
    const initial = createInitialSudokuState(puzzle)
    let history = createMoveHistory<ReturnType<typeof createInitialSudokuState>, SudokuMove>(initial)
    history = applyMove(history, { row: 0, col: 2, value: 4 }, reduce)
    expect(history.currentState.entries.cells[0]?.[2]).toBe(4)
    history = undo(history)
    expect(history.currentState.entries.cells[0]?.[2]).toBeNull()
    history = redo(history)
    expect(history.currentState.entries.cells[0]?.[2]).toBe(4)
    history = resetHistory(history)
    expect(history.currentState).toBe(initial)
    expect(history.past).toEqual([])
    expect(history.future).toEqual([])
  })

  it('merges entries over empty cells while preserving givens', () => {
    const entered = applySudokuMove(
      puzzle,
      createInitialSudokuState(puzzle),
      { row: 0, col: 2, value: 4 },
    )
    const merged = mergeSudokuBoard(puzzle, entered)
    expect(merged.cells[0]?.slice(0, 3)).toEqual([5, 3, 4])
  })
})

class MemoryStorage implements StorageLike {
  private readonly values = new Map<string, string>()
  getItem(key: string): string | null { return this.values.get(key) ?? null }
  setItem(key: string, value: string): void { this.values.set(key, value) }
  removeItem(key: string): void { this.values.delete(key) }
}

describe('Sudoku persistence', () => {
  it('stores progress by puzzle type and seed and restores player entries', () => {
    const storage = new MemoryStorage()
    const puzzle = instance()
    const state = applySudokuMove(
      puzzle,
      createInitialSudokuState(puzzle),
      { row: 0, col: 2, value: 4 },
    )
    saveSudokuProgress(storage, 'abc123', state, false)
    expect(sudokuProgressKey('abc123')).toBe('puzzle:sudoku:abc123')
    expect(loadSudokuProgress(storage, 'abc123', puzzle)?.state).toEqual(state)
    clearSudokuProgress(storage, 'abc123')
    expect(loadSudokuProgress(storage, 'abc123', puzzle)).toBeNull()
  })

  it('ignores malformed stored data', () => {
    const storage = new MemoryStorage()
    storage.setItem(sudokuProgressKey('bad'), JSON.stringify({ version: 1, entries: [] }))
    expect(loadSudokuProgress(storage, 'bad', instance())).toBeNull()
  })
})
