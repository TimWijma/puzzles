import { createFilledGrid, getCell, isInBounds, setCell } from '../../core/grid'
import type {
  SuguruBoard,
  SuguruMove,
  SuguruPlayerState,
  SuguruPuzzleInstance,
} from './types'

export function createInitialSuguruState(instance: SuguruPuzzleInstance): SuguruPlayerState {
  const { rowCount, columnCount } = instance.question.regions
  return { entries: createFilledGrid(rowCount, columnCount, null) }
}

export function applySuguruMove(
  instance: SuguruPuzzleInstance,
  state: SuguruPlayerState,
  move: SuguruMove,
): SuguruPlayerState {
  if (
    !isInBounds(instance.question.regions, move) ||
    getCell(instance.question.givens, move) !== null ||
    (move.value !== null && (!Number.isInteger(move.value) || move.value < 1))
  ) return state

  if (getCell(state.entries, move) === move.value) return state
  return { entries: setCell(state.entries, move, move.value) }
}

export function mergeSuguruBoard(
  instance: SuguruPuzzleInstance,
  state: SuguruPlayerState,
): SuguruBoard {
  const { rowCount, columnCount } = instance.question.regions
  return {
    rowCount,
    columnCount,
    cells: Array.from({ length: rowCount }, (_, row) =>
      Array.from({ length: columnCount }, (_, col) =>
        instance.question.givens.cells[row]?.[col] ?? state.entries.cells[row]?.[col] ?? null,
      ),
    ),
  }
}
