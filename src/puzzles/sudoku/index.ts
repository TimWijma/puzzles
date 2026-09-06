import type { PuzzleModule } from '../../core/puzzle'
import { sudokuGenerator } from './generator'
import { solve } from './solver'
import { createInitialSudokuState } from './state'
import type {
  SudokuDifficulty,
  SudokuPlayerState,
  SudokuPuzzleInstance,
  SudokuSolution,
} from './types'
import { validateSudoku } from './validator'

export const sudokuModule: PuzzleModule<
  SudokuPuzzleInstance,
  SudokuPlayerState,
  SudokuSolution,
  SudokuDifficulty
> = {
  id: 'sudoku',
  displayName: 'Sudoku',
  generator: sudokuGenerator,
  solver: { solve },
  validator: { validate: validateSudoku },
  difficulty: {
    // TODO: replace this placeholder with a human-technique-based evaluator.
    evaluate: () => ({ difficulty: { id: 'unrated', displayName: 'Unrated' } }),
  },
  createInitialState: createInitialSudokuState,
}

export { generateSudoku, sudokuGenerator } from './generator'
export type { GenerateSudokuOptions, SudokuGeneratorOptions } from './generator'
export { countSolutions, solve } from './solver'
export {
  applySudokuMove,
  createInitialSudokuState,
  isSudokuDigit,
  mergeSudokuBoard,
  SUDOKU_SIZE,
} from './state'
export {
  boxHasDuplicateValues,
  columnHasDuplicateValues,
  hasDuplicateNonEmptyValues,
  isSudokuSolved,
  isValidPartialBoard,
  isValidSudokuMove,
  isValidSudokuSolution,
  rowHasDuplicateValues,
  validateSudoku,
} from './validator'
export type {
  SudokuBoard,
  SudokuCell,
  SudokuDifficulty,
  SudokuDigit,
  SudokuMetadata,
  SudokuMove,
  SudokuPlayerState,
  SudokuPuzzleInstance,
  SudokuQuestion,
  SudokuSolution,
} from './types'
