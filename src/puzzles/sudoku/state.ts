import { createFilledGrid, getCell, isInBounds, setCell } from '../../core/grid'
import type {
  SudokuBoard,
  SudokuCell,
  SudokuDigit,
  SudokuMove,
  SudokuPlayerState,
  SudokuPuzzleInstance,
} from './types'

export const SUDOKU_SIZE = 9

export function isSudokuDigit(value: unknown): value is SudokuDigit {
  return Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 9
}

export function createInitialSudokuState(
  _instance?: SudokuPuzzleInstance,
): SudokuPlayerState {
  return { entries: createFilledGrid(SUDOKU_SIZE, SUDOKU_SIZE, null) }
}

export function applySudokuMove(
  instance: SudokuPuzzleInstance,
  state: SudokuPlayerState,
  move: SudokuMove,
): SudokuPlayerState {
  if (
    !isInBounds(instance.question.givens, move) ||
    getCell(instance.question.givens, move) !== null ||
    (move.value !== null && !isSudokuDigit(move.value))
  ) {
    return state
  }

  if (getCell(state.entries, move) === move.value) {
    return state
  }

  return { entries: setCell(state.entries, move, move.value) }
}

export function mergeSudokuBoard(
  instance: SudokuPuzzleInstance,
  state: SudokuPlayerState,
): SudokuBoard {
  const cells: SudokuCell[][] = []

  for (let row = 0; row < SUDOKU_SIZE; row += 1) {
    const mergedRow: SudokuCell[] = []
    for (let col = 0; col < SUDOKU_SIZE; col += 1) {
      const given = instance.question.givens.cells[row]?.[col] ?? null
      mergedRow.push(given ?? state.entries.cells[row]?.[col] ?? null)
    }
    cells.push(mergedRow)
  }

  return { rowCount: SUDOKU_SIZE, columnCount: SUDOKU_SIZE, cells }
}

