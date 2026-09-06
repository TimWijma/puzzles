import type { Grid, Position } from '../../core/grid'
import type { Difficulty, PuzzleInstance } from '../../core/puzzle'
import type {
  NumericGridHintMove,
  NumericGridPlayerState,
  NumericGridValueMove,
} from '../shared/numericGridState'

export type SudokuDigit = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
export type SudokuCell = SudokuDigit | null
export type SudokuBoard = Grid<SudokuCell>
export type SudokuSolution = Grid<SudokuDigit>
export type SudokuHintGrid = Grid<readonly SudokuDigit[]>

export interface SudokuQuestion {
  readonly givens: SudokuBoard
}

export interface SudokuMetadata {
  readonly seed: string
  readonly generatorVersion: 1
  readonly clueCount: number
}

export interface SudokuPuzzleInstance
  extends PuzzleInstance<SudokuQuestion, SudokuMetadata> {
  readonly puzzleType: 'sudoku'
}

export interface SudokuPlayerState extends NumericGridPlayerState<SudokuDigit> {}

export interface SudokuProposedMove extends Position {
  readonly value: SudokuCell
}

export type SudokuValueMove = NumericGridValueMove<SudokuDigit>

export type SudokuHintMove = NumericGridHintMove<SudokuDigit>

export type SudokuMove = SudokuValueMove | SudokuHintMove

export interface SudokuDifficulty extends Difficulty {
  readonly id: 'unrated'
}
