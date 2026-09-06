import type { Grid } from '../../core/grid'
import type { PuzzleGenerationContext, PuzzleGenerator } from '../../core/puzzle'
import { createSeededRandom, type RandomSource } from '../../core/random'
import { countSolutions } from './solver'
import type {
  SudokuBoard,
  SudokuCell,
  SudokuDigit,
  SudokuPuzzleInstance,
  SudokuSolution,
} from './types'

export interface SudokuGeneratorOptions {
  readonly targetClueCount?: number
}

export interface GenerateSudokuOptions extends SudokuGeneratorOptions {
  readonly seed: string
}

const DEFAULT_TARGET_CLUES = 32

function unitOrder(random: RandomSource): number[] {
  return random.shuffle([0, 1, 2]).flatMap((group) =>
    random.shuffle([0, 1, 2]).map((offset) => group * 3 + offset),
  )
}

function generateSolution(random: RandomSource): SudokuSolution {
  const rows = unitOrder(random)
  const columns = unitOrder(random)
  const digits = random.shuffle<SudokuDigit>([1, 2, 3, 4, 5, 6, 7, 8, 9])
  const cells = rows.map((row) =>
    columns.map((col) => digits[(row * 3 + Math.floor(row / 3) + col) % 9] as SudokuDigit),
  )
  return { rowCount: 9, columnCount: 9, cells }
}

function gridFromFlat(values: readonly SudokuCell[]): SudokuBoard {
  return {
    rowCount: 9,
    columnCount: 9,
    cells: Array.from({ length: 9 }, (_, row) => values.slice(row * 9, row * 9 + 9)),
  } satisfies Grid<SudokuCell>
}

function normalizeTarget(value: number | undefined): number {
  const target = value ?? DEFAULT_TARGET_CLUES
  if (!Number.isInteger(target) || target < 24 || target > 81) {
    throw new RangeError('targetClueCount must be an integer between 24 and 81')
  }
  return target
}

function generateWithContext(
  context: PuzzleGenerationContext,
  options: SudokuGeneratorOptions = {},
): SudokuPuzzleInstance {
  const targetClueCount = normalizeTarget(options.targetClueCount)
  const solution = generateSolution(context.random)
  const values: SudokuCell[] = solution.cells.flat()
  let clueCount = 81

  for (const index of context.random.shuffle(Array.from({ length: 81 }, (_, value) => value))) {
    if (clueCount <= targetClueCount) break
    const previous = values[index] as SudokuDigit
    values[index] = null
    if (countSolutions(gridFromFlat(values), 2) === 1) {
      clueCount -= 1
    } else {
      values[index] = previous
    }
  }

  return {
    id: `sudoku:${context.seed}`,
    puzzleType: 'sudoku',
    question: { givens: gridFromFlat(values) },
    metadata: { seed: context.seed, generatorVersion: 1, clueCount },
  }
}

export function generateSudoku(options: GenerateSudokuOptions): SudokuPuzzleInstance {
  return generateWithContext(
    { seed: options.seed, random: createSeededRandom(options.seed) },
    options,
  )
}

export const sudokuGenerator: PuzzleGenerator<SudokuPuzzleInstance> = {
  generate(context, options) {
    const sudokuOptions =
      typeof options === 'object' && options !== null ? (options as SudokuGeneratorOptions) : undefined
    return generateWithContext(context, sudokuOptions)
  },
}

