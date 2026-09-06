import type { Grid, Position } from '../../core/grid'
import type { Difficulty, PuzzleInstance } from '../../core/puzzle'

export type QueensRegionId = number
export type QueensRegionLayout = Grid<QueensRegionId>
export type QueensPlacementGrid = Grid<boolean>

export interface QueensQuestion {
  readonly regions: QueensRegionLayout
  readonly regionCount: number
}

export interface QueensMetadata {
  readonly seed: string
  readonly generatorVersion: 1
  readonly size: number
  readonly generationAttempt: number
}

export interface QueensPuzzleInstance
  extends PuzzleInstance<QueensQuestion, QueensMetadata> {
  readonly puzzleType: 'queens'
}

export interface QueensPlayerState {
  readonly queens: QueensPlacementGrid
}

export interface QueensMove extends Position {
  readonly value: boolean
}

export interface QueensSolution {
  readonly queens: QueensPlacementGrid
}

export interface QueensDifficulty extends Difficulty {
  readonly id: 'unrated'
}

