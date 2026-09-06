import type { StorageLike } from '../persistence'
import { isSudokuDigit } from './state'
import type { SudokuCell, SudokuDigit, SudokuPlayerState, SudokuPuzzleInstance } from './types'

interface StoredSudokuProgressV2 {
  readonly version: 2
  readonly entries: readonly (readonly SudokuCell[])[]
  readonly hints: readonly (readonly (readonly SudokuDigit[])[])[]
  readonly completed: boolean
}

export interface RestoredSudokuProgress {
  readonly state: SudokuPlayerState
  readonly completed: boolean
}

export function sudokuProgressKey(seed: string): string {
  return `puzzle:sudoku:${seed}`
}

function isStoredEntries(value: unknown): value is readonly (readonly SudokuCell[])[] {
  return (
    Array.isArray(value) &&
    value.length === 9 &&
    value.every(
      (row) =>
        Array.isArray(row) &&
        row.length === 9 &&
        row.every((cell) => cell === null || isSudokuDigit(cell)),
    )
  )
}

function isStoredHints(value: unknown): value is readonly (readonly (readonly SudokuDigit[])[])[] {
  return (
    Array.isArray(value) &&
    value.length === 9 &&
    value.every(
      (row) =>
        Array.isArray(row) &&
        row.length === 9 &&
        row.every(
          (hints) => Array.isArray(hints) && hints.every((digit) => isSudokuDigit(digit)),
        ),
    )
  )
}

export function loadSudokuProgress(
  storage: StorageLike,
  seed: string,
  instance: SudokuPuzzleInstance,
): RestoredSudokuProgress | null {
  try {
    const stored = storage.getItem(sudokuProgressKey(seed))
    if (stored === null) return null

    const parsed = JSON.parse(stored) as Record<string, unknown>
    if ((parsed.version !== 1 && parsed.version !== 2) || !isStoredEntries(parsed.entries)) {
      return null
    }

    if (parsed.version === 2 && !isStoredHints(parsed.hints)) return null

    const entries = parsed.entries.map((row, rowIndex) =>
      row.map((value: SudokuCell, colIndex: number) =>
        instance.question.givens.cells[rowIndex]?.[colIndex] === null ? value : null,
      ),
    )
    const storedHints = parsed.version === 2
      ? parsed.hints as readonly (readonly (readonly SudokuDigit[])[])[]
      : Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => []))
    const hints = storedHints.map((row, rowIndex) =>
      row.map((cellHints, colIndex) => {
        if (
          instance.question.givens.cells[rowIndex]?.[colIndex] !== null ||
          entries[rowIndex]?.[colIndex] !== null
        ) {
          return []
        }
        return [...new Set(cellHints)].sort((left, right) => left - right)
      }),
    )
    return {
      state: {
        entries: { rowCount: 9, columnCount: 9, cells: entries },
        hints: { rowCount: 9, columnCount: 9, cells: hints },
      },
      completed: parsed.completed === true,
    }
  } catch {
    return null
  }
}

export function saveSudokuProgress(
  storage: StorageLike,
  seed: string,
  state: SudokuPlayerState,
  completed: boolean,
): void {
  const payload: StoredSudokuProgressV2 = {
    version: 2,
    entries: state.entries.cells,
    hints: state.hints.cells,
    completed,
  }
  try {
    storage.setItem(sudokuProgressKey(seed), JSON.stringify(payload))
  } catch {
    // Progress persistence is optional when storage is unavailable or full.
  }
}

export function clearSudokuProgress(storage: StorageLike, seed: string): void {
  try {
    storage.removeItem(sudokuProgressKey(seed))
  } catch {
    // Reset still works in memory when storage is unavailable.
  }
}
