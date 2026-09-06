import type { Position } from '../../core/grid'
import {
  applyNumericGridMove,
  createNumericGridState,
  mergeNumericGrid,
} from '../shared/numericGridState'
import type {
  SudokuBoard,
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
  return createNumericGridState<SudokuDigit>(SUDOKU_SIZE, SUDOKU_SIZE)
}

function sudokuPeers(position: Position): Position[] {
  const peers: Position[] = []
  for (let row = 0; row < SUDOKU_SIZE; row += 1) {
    for (let col = 0; col < SUDOKU_SIZE; col += 1) {
      if (row === position.row && col === position.col) continue
      if (
        row === position.row ||
        col === position.col ||
        (Math.floor(row / 3) === Math.floor(position.row / 3) &&
          Math.floor(col / 3) === Math.floor(position.col / 3))
      ) peers.push({ row, col })
    }
  }
  return peers
}

export function applySudokuMove(
  instance: SudokuPuzzleInstance,
  state: SudokuPlayerState,
  move: SudokuMove,
): SudokuPlayerState {
  return applyNumericGridMove(state, move, {
    givens: instance.question.givens,
    isValueAllowed: isSudokuDigit,
    peers: sudokuPeers,
  })
}

export function mergeSudokuBoard(
  instance: SudokuPuzzleInstance,
  state: SudokuPlayerState,
): SudokuBoard {
  return mergeNumericGrid(instance.question.givens, state.entries)
}
