import type { StorageLike } from './persistenceTypes'
import { createInitialSudokuState, isSudokuDigit } from './state'
import type { SudokuCell, SudokuPlayerState, SudokuPuzzleInstance } from './types'

interface StoredSudokuProgress {
  readonly version: 1
  readonly entries: readonly (readonly SudokuCell[])[]
  readonly completed: boolean
}

export interface RestoredSudokuProgress {
  readonly state: SudokuPlayerState
  readonly completed: boolean
}

export function sudokuProgressKey(seed: string): string {
  return `puzzle:sudoku:${seed}`
}

export function loadSudokuProgress(
  storage: StorageLike,
  seed: string,
  instance: SudokuPuzzleInstance,
): RestoredSudokuProgress | null {
  try {
    const stored = storage.getItem(sudokuProgressKey(seed))
    if (stored === null) return null

    const parsed = JSON.parse(stored) as Partial<StoredSudokuProgress>
    if (
      parsed.version !== 1 ||
      !Array.isArray(parsed.entries) ||
      parsed.entries.length !== 9 ||
      !parsed.entries.every(
        (row) =>
          Array.isArray(row) &&
          row.length === 9 &&
          row.every((value) => value === null || isSudokuDigit(value)),
      )
    ) {
      return null
    }

    const parsedEntries = parsed.entries as readonly (readonly SudokuCell[])[]
    const entries = parsedEntries.map((row, rowIndex) =>
      row.map((value: SudokuCell, colIndex: number) =>
        instance.question.givens.cells[rowIndex]?.[colIndex] === null ? value : null,
      ),
    )
    return {
      state: { entries: { rowCount: 9, columnCount: 9, cells: entries } },
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
  const payload: StoredSudokuProgress = {
    version: 1,
    entries: state.entries.cells,
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

export function emptySudokuProgress(instance: SudokuPuzzleInstance): SudokuPlayerState {
  return createInitialSudokuState(instance)
}
