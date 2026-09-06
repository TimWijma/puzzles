import { createFilledGrid, getCell, isInBounds, setCell } from '../../core/grid'
import type {
  QueensMove,
  QueensPlayerState,
  QueensPuzzleInstance,
} from './types'

export function createInitialQueensState(
  instance: QueensPuzzleInstance,
): QueensPlayerState {
  return {
    queens: createFilledGrid(
      instance.question.regions.rowCount,
      instance.question.regions.columnCount,
      false,
    ),
  }
}

export function applyQueensMove(
  instance: QueensPuzzleInstance,
  state: QueensPlayerState,
  move: QueensMove,
): QueensPlayerState {
  if (!isInBounds(instance.question.regions, move) || typeof move.value !== 'boolean') {
    return state
  }
  if (getCell(state.queens, move) === move.value) return state
  return { queens: setCell(state.queens, move, move.value) }
}

