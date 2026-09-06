import type { StorageLike } from '../persistence'
import { regionSize } from './regions'
import type { SuguruCell, SuguruPlayerState, SuguruPuzzleInstance } from './types'

interface StoredSuguruProgressV2 {
  readonly version: 2
  readonly entries: readonly (readonly SuguruCell[])[]
  readonly hints: readonly (readonly (readonly number[])[])[]
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
    const parsed = JSON.parse(stored) as Record<string, unknown>
    const { rowCount, columnCount } = instance.question.regions
    if (
      (parsed.version !== 1 && parsed.version !== 2) ||
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
    if (
      parsed.version === 2 &&
      (!Array.isArray(parsed.hints) ||
        parsed.hints.length !== rowCount ||
        !parsed.hints.every(
          (row) =>
            Array.isArray(row) &&
            row.length === columnCount &&
            row.every(
              (hints) =>
                Array.isArray(hints) &&
                hints.every((value) => Number.isInteger(value) && Number(value) >= 1),
            ),
        ))
    ) return null

    const cells = (parsed.entries as readonly (readonly SuguruCell[])[]).map((row, rowIndex) =>
      row.map((value, colIndex) =>
        instance.question.givens.cells[rowIndex]?.[colIndex] === null ? value : null,
      ),
    )
    const storedHints = parsed.version === 2
      ? parsed.hints as readonly (readonly (readonly number[])[])[]
      : Array.from({ length: rowCount }, () => Array.from({ length: columnCount }, () => []))
    const hints = storedHints.map((row, rowIndex) =>
      row.map((cellHints, colIndex) => {
        const regionId = instance.question.regions.cells[rowIndex]?.[colIndex]
        const maximum = regionId === undefined
          ? 0
          : regionSize(instance.question.regions, regionId)
        if (
          instance.question.givens.cells[rowIndex]?.[colIndex] !== null ||
          cells[rowIndex]?.[colIndex] !== null
        ) return []
        return [...new Set(cellHints.filter((value) => value <= maximum))].sort(
          (left, right) => left - right,
        )
      }),
    )
    return {
      state: {
        entries: { rowCount, columnCount, cells },
        hints: { rowCount, columnCount, cells: hints },
      },
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
  const payload: StoredSuguruProgressV2 = {
    version: 2,
    entries: state.entries.cells,
    hints: state.hints.cells,
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
