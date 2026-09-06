import type { PuzzleModule } from '../../core/puzzle'
import { suguruGenerator } from './generator'
import { solve } from './solver'
import { createInitialSuguruState } from './state'
import type {
  SuguruDifficulty,
  SuguruPlayerState,
  SuguruPuzzleInstance,
  SuguruSolution,
} from './types'
import { validateSuguru } from './validator'

export const suguruModule: PuzzleModule<
  SuguruPuzzleInstance,
  SuguruPlayerState,
  SuguruSolution,
  SuguruDifficulty
> = {
  id: 'suguru',
  displayName: 'Suguru',
  generator: suguruGenerator,
  solver: { solve },
  validator: { validate: validateSuguru },
  difficulty: {
    // TODO: replace this placeholder with a solver-technique-based evaluator.
    evaluate: () => ({ difficulty: { id: 'unrated', displayName: 'Unrated' } }),
  },
  createInitialState: createInitialSuguruState,
}

export { generateSuguru, suguruGenerator } from './generator'
export type { GenerateSuguruOptions, SuguruGeneratorOptions } from './generator'
export {
  cellsInRegion,
  hasValidConnectedRegions,
  hasValidRegionAssignments,
  isRegionConnected,
  regionSize,
  surroundingCells,
  validValuesForRegion,
} from './regions'
export { countSolutions, solve } from './solver'
export { applySuguruMove, createInitialSuguruState, mergeSuguruBoard } from './state'
export {
  hasEqualTouchingValues,
  isLegalSuguruMove,
  isSuguruCellConflicting,
  isSuguruSolved,
  isValidPartialBoard,
  isValidSuguruSolution,
  regionHasDuplicateValues,
  validateSuguru,
} from './validator'
export type {
  SuguruBoard,
  SuguruCell,
  SuguruDifficulty,
  SuguruHintGrid,
  SuguruHintMove,
  SuguruMetadata,
  SuguruMove,
  SuguruPlayerState,
  SuguruProposedMove,
  SuguruPuzzleInstance,
  SuguruQuestion,
  SuguruRegionId,
  SuguruRegionLayout,
  SuguruSolution,
  SuguruValueMove,
} from './types'
