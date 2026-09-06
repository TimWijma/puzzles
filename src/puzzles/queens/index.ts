import type { PuzzleModule } from '../../core/puzzle'
import { queensGenerator } from './generator'
import { solve } from './solver'
import { createInitialQueensState } from './state'
import type {
  QueensDifficulty,
  QueensPlayerState,
  QueensPuzzleInstance,
  QueensSolution,
} from './types'
import { validateQueens } from './validator'

export const queensModule: PuzzleModule<
  QueensPuzzleInstance,
  QueensPlayerState,
  QueensSolution,
  QueensDifficulty
> = {
  id: 'queens',
  displayName: 'Queens',
  generator: queensGenerator,
  solver: { solve },
  validator: { validate: validateQueens },
  difficulty: {
    // TODO: replace this placeholder with a technique-based difficulty evaluator.
    evaluate: () => ({ difficulty: { id: 'unrated', displayName: 'Unrated' } }),
  },
  createInitialState: createInitialQueensState,
}

export { generateQueens, queensGenerator } from './generator'
export type { GenerateQueensOptions, QueensGeneratorOptions } from './generator'
export {
  cellsInRegion,
  hasValidConnectedRegions,
  hasValidRegionIds,
  isRegionConnected,
} from './regions'
export { countSolutions, solve } from './solver'
export { applyQueensMove, createInitialQueensState } from './state'
export {
  columnHasMultipleQueens,
  hasDiagonallyAdjacentQueens,
  isLegalQueenPlacement,
  isQueensSolved,
  isValidQueensSolution,
  regionHasMultipleQueens,
  rowHasMultipleQueens,
  validateQueens,
} from './validator'
export type {
  QueensDifficulty,
  QueensMetadata,
  QueensMove,
  QueensPlacementGrid,
  QueensPlayerState,
  QueensPuzzleInstance,
  QueensQuestion,
  QueensRegionId,
  QueensRegionLayout,
  QueensSolution,
} from './types'
