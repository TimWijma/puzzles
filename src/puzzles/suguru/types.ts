import type { Grid, Position } from '../../core/grid'
import type { Difficulty, PuzzleInstance } from '../../core/puzzle'
import type {
  NumericGridHintMove,
  NumericGridPlayerState,
  NumericGridValueMove,
} from '../shared/numericGridState'

export type SuguruRegionId = number
export type SuguruCell = number | null
export type SuguruRegionLayout = Grid<SuguruRegionId>
export type SuguruBoard = Grid<SuguruCell>
export type SuguruSolution = Grid<number>
export type SuguruHintGrid = Grid<readonly number[]>

export interface SuguruQuestion {
  readonly regions: SuguruRegionLayout
  readonly regionCount: number
  readonly givens: SuguruBoard
}

export interface SuguruMetadata {
  readonly seed: string
  readonly generatorVersion: 1
  readonly generationAttempt: number
  readonly clueCount: number
}

export interface SuguruPuzzleInstance
  extends PuzzleInstance<SuguruQuestion, SuguruMetadata> {
  readonly puzzleType: 'suguru'
}

export interface SuguruPlayerState extends NumericGridPlayerState<number> {}

export interface SuguruProposedMove extends Position {
  readonly value: SuguruCell
}

export type SuguruValueMove = NumericGridValueMove<number>
export type SuguruHintMove = NumericGridHintMove<number>
export type SuguruMove = SuguruValueMove | SuguruHintMove

export interface SuguruDifficulty extends Difficulty {
  readonly id: 'unrated'
}
