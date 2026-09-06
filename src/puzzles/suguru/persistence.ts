import type { StorageLike } from '../persistence'
import type { SuguruCell, SuguruPlayerState, SuguruPuzzleInstance } from './types'

interface StoredSuguruProgress {
  readonly version: 1
  readonly entries: readonly (readonly SuguruCell[])[]
  readonly completed: boolean
}

export interface RestoredSuguruProgress {
  readonly state: SuguruPlayerState
  readonly completed: boolean
}

export function suguruProgressKey(seed: string): string {
  return `puzzle:suguru:${seed}`
}

export function loadSuguruProgress(
  storage: StorageLike,
  seed: string,
  instance: SuguruPuzzleInstance,
): RestoredSuguruProgress | null {
  try {
    const stored = storage.getItem(suguruProgressKey(seed))
    if (stored === null) return null
    const parsed = JSON.parse(stored) as Partial<StoredSuguruProgress>
    const { rowCount, columnCount } = instance.question.regions
    if (
      parsed.version !== 1 ||
      !Array.isArray(parsed.entries) ||
      parsed.entries.length !== rowCount ||
      !parsed.entries.every(
        (row) =>
          Array.isArray(row) &&
          row.length === columnCount &&
          row.every(
            (value) => value === null || (Number.isInteger(value) && Number(value) >= 1),
          ),
      )
    ) return null

    const cells = (parsed.entries as readonly (readonly SuguruCell[])[]).map((row, rowIndex) =>
      row.map((value, colIndex) =>
        instance.question.givens.cells[rowIndex]?.[colIndex] === null ? value : null,
      ),
    )
    return {
      state: { entries: { rowCount, columnCount, cells } },
      completed: parsed.completed === true,
    }
  } catch {
    return null
  }
}

export function saveSuguruProgress(
  storage: StorageLike,
  seed: string,
  state: SuguruPlayerState,
  completed: boolean,
): void {
  const payload: StoredSuguruProgress = {
    version: 1,
    entries: state.entries.cells,
    completed,
  }
  try {
    storage.setItem(suguruProgressKey(seed), JSON.stringify(payload))
  } catch {
    // Playing remains available if browser storage is unavailable or full.
  }
}

export function clearSuguruProgress(storage: StorageLike, seed: string): void {
  try {
    storage.removeItem(suguruProgressKey(seed))
  } catch {
    // Reset still works in memory when storage is unavailable.
  }
}
