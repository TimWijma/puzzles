import type { StorageLike } from '../persistence'
import type { QueensPlayerState, QueensPuzzleInstance } from './types'

interface StoredQueensProgress {
  readonly version: 1
  readonly queens: readonly (readonly boolean[])[]
  readonly completed: boolean
}

export interface RestoredQueensProgress {
  readonly state: QueensPlayerState
  readonly completed: boolean
}

export function queensProgressKey(seed: string): string {
  return `puzzle:queens:${seed}`
}

export function loadQueensProgress(
  storage: StorageLike,
  seed: string,
  instance: QueensPuzzleInstance,
): RestoredQueensProgress | null {
  try {
    const stored = storage.getItem(queensProgressKey(seed))
    if (stored === null) return null
    const parsed = JSON.parse(stored) as Partial<StoredQueensProgress>
    const { rowCount, columnCount } = instance.question.regions
    if (
      parsed.version !== 1 ||
      !Array.isArray(parsed.queens) ||
      parsed.queens.length !== rowCount ||
      !parsed.queens.every(
        (row) =>
          Array.isArray(row) &&
          row.length === columnCount &&
          row.every((value) => typeof value === 'boolean'),
      )
    ) {
      return null
    }
    const cells = (parsed.queens as readonly (readonly boolean[])[]).map((row) => [...row])
    return {
      state: { queens: { rowCount, columnCount, cells } },
      completed: parsed.completed === true,
    }
  } catch {
    return null
  }
}

export function saveQueensProgress(
  storage: StorageLike,
  seed: string,
  state: QueensPlayerState,
  completed: boolean,
): void {
  const payload: StoredQueensProgress = {
    version: 1,
    queens: state.queens.cells,
    completed,
  }
  try {
    storage.setItem(queensProgressKey(seed), JSON.stringify(payload))
  } catch {
    // Playing remains available if browser storage is unavailable or full.
  }
}

export function clearQueensProgress(storage: StorageLike, seed: string): void {
  try {
    storage.removeItem(queensProgressKey(seed))
  } catch {
    // Reset still works in memory when storage is unavailable.
  }
}

