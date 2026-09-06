import type { Grid, Position } from '../../core/grid'
import type { Difficulty, PuzzleInstance } from '../../core/puzzle'

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

export interface SudokuPlayerState {
  /** Player-entered values only. Given cells always remain null here. */
  readonly entries: SudokuBoard
  readonly hints: SudokuHintGrid
}

export interface SudokuProposedMove extends Position {
  readonly value: SudokuCell
}

export interface SudokuValueMove {
  readonly kind: 'value'
  readonly positions: readonly Position[]
  readonly value: SudokuCell
}

export interface SudokuHintMove {
  readonly kind: 'hint'
  readonly positions: readonly Position[]
  readonly digit: SudokuDigit
  readonly enabled: boolean
}

export type SudokuMove = SudokuValueMove | SudokuHintMove

export interface SudokuDifficulty extends Difficulty {
  readonly id: 'unrated'
}
