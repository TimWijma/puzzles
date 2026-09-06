import type { RandomSource } from '../random'

/** Immutable question data and metadata supplied by a puzzle module. */
export interface PuzzleInstance<TQuestion = unknown, TMetadata = unknown> {
  readonly id: string
  readonly puzzleType: string
  readonly question: TQuestion
  readonly metadata?: TMetadata
}

export interface PuzzleGenerationContext {
  readonly seed: string
  readonly random: RandomSource
}

export interface PuzzleGenerator<
  TInstance extends PuzzleInstance = PuzzleInstance,
  TOptions = unknown,
> {
  generate(context: PuzzleGenerationContext, options?: TOptions): TInstance
}

export interface PuzzleSolver<TInstance extends PuzzleInstance = PuzzleInstance, TSolution = unknown> {
  solve(instance: TInstance): TSolution | null
}

export interface ValidationIssue {
  readonly code: string
  readonly message: string
  readonly path?: readonly (string | number)[]
}

export interface ValidationResult {
  readonly valid: boolean
  readonly complete: boolean
  readonly issues: readonly ValidationIssue[]
}

export interface PuzzleValidator<
  TInstance extends PuzzleInstance = PuzzleInstance,
  TPlayerState = unknown,
> {
  validate(instance: TInstance, playerState: TPlayerState): ValidationResult
}

/** Puzzle modules define their own available difficulty values. */
export interface Difficulty {
  readonly id: string
  readonly displayName: string
}

export interface DifficultyResult<TDifficulty extends Difficulty = Difficulty, TDetails = unknown> {
  readonly difficulty: TDifficulty
  readonly score?: number
  readonly details?: TDetails
}

export interface DifficultyEvaluator<
  TInstance extends PuzzleInstance = PuzzleInstance,
  TDifficulty extends Difficulty = Difficulty,
  TDetails = unknown,
> {
  evaluate(instance: TInstance): DifficultyResult<TDifficulty, TDetails>
}

/** Framework-independent bundle of logic supplied by one puzzle type. */
export interface PuzzleModule<
  TInstance extends PuzzleInstance = PuzzleInstance,
  TPlayerState = unknown,
  TSolution = unknown,
  TDifficulty extends Difficulty = Difficulty,
> {
  readonly id: string
  readonly displayName: string
  readonly generator: PuzzleGenerator<TInstance>
  readonly solver: PuzzleSolver<TInstance, TSolution>
  readonly validator: PuzzleValidator<TInstance, TPlayerState>
  readonly difficulty: DifficultyEvaluator<TInstance, TDifficulty>
  createInitialState(instance: TInstance): TPlayerState
}
