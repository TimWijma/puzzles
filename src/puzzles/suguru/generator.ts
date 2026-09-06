import type { Grid } from '../../core/grid'
import type { PuzzleGenerationContext, PuzzleGenerator } from '../../core/puzzle'
import { createSeededRandom, type RandomSource } from '../../core/random'
import { hasValidConnectedRegions } from './regions'
import { countSolutions, generateSolutionForRegions } from './solver'
import { isValidSuguruSolution } from './validator'
import type {
  SuguruBoard,
  SuguruCell,
  SuguruPuzzleInstance,
  SuguruRegionLayout,
  SuguruSolution,
} from './types'

export interface SuguruGeneratorOptions {
  readonly rows?: number
  readonly columns?: number
}

export interface GenerateSuguruOptions extends SuguruGeneratorOptions {
  readonly seed: string
}

const DEFAULT_ROWS = 6
const DEFAULT_COLUMNS = 6
const MAX_GENERATION_ATTEMPTS = 250

function normalizeDimension(value: number | undefined, fallback: number, name: string): number {
  const result = value ?? fallback
  if (!Number.isInteger(result) || result < 5 || result > 7) {
    throw new RangeError(`${name} must be an integer between 5 and 7`)
  }
  return result
}

function regionSizesForCellCount(cellCount: number, random: RandomSource): number[] {
  const possibilities: number[][] = []
  for (let fives = 0; fives * 5 <= cellCount; fives += 1) {
    const remainder = cellCount - fives * 5
    if (remainder % 4 === 0) {
      possibilities.push([
        ...Array<number>(fives).fill(5),
        ...Array<number>(remainder / 4).fill(4),
      ])
    }
  }
  const fewestRegions = Math.min(...possibilities.map((sizes) => sizes.length))
  const compact = possibilities.filter((sizes) => sizes.length <= fewestRegions + 1)
  return random.shuffle(random.pick(compact) as number[])
}

function orthogonalNeighbours(index: number, rows: number, columns: number): number[] {
  const row = Math.floor(index / columns)
  const col = index % columns
  const result: number[] = []
  if (row > 0) result.push(index - columns)
  if (row + 1 < rows) result.push(index + columns)
  if (col > 0) result.push(index - 1)
  if (col + 1 < columns) result.push(index + 1)
  return result
}

/** A Hamiltonian path lets consecutive chunks form connected regions by construction. */
function randomGridPath(rows: number, columns: number, random: RandomSource): number[] | null {
  const cellCount = rows * columns
  const visited = new Uint8Array(cellCount)
  const path: number[] = []
  const starts = random.shuffle(Array.from({ length: cellCount }, (_, index) => index))

  const visit = (index: number): boolean => {
    visited[index] = 1
    path.push(index)
    if (path.length === cellCount) return true

    const candidates = random
      .shuffle(orthogonalNeighbours(index, rows, columns).filter((next) => !visited[next]))
      .map((next) => ({
        next,
        onward: orthogonalNeighbours(next, rows, columns).filter((cell) => !visited[cell]).length,
      }))
      .sort((left, right) => left.onward - right.onward)
    for (const candidate of candidates) {
      if (visit(candidate.next)) return true
    }
    path.pop()
    visited[index] = 0
    return false
  }

  for (const start of starts) {
    if (visit(start)) return path
  }
  return null
}

function generateRegions(
  rows: number,
  columns: number,
  random: RandomSource,
): SuguruRegionLayout | null {
  // A dimension of five has a cheap, guaranteed-solvable strip partition. This keeps optional
  // rectangular generation responsive; the default 6×6 case uses the irregular path below.
  if (rows === 5 || columns === 5) {
    return {
      rowCount: rows,
      columnCount: columns,
      cells: Array.from({ length: rows }, (_, row) =>
        Array.from({ length: columns }, (_, col) => (rows === 5 ? col : row)),
      ),
    }
  }
  const path = randomGridPath(rows, columns, random)
  if (path === null) return null
  const sizes = regionSizesForCellCount(rows * columns, random)
  const ids = new Int16Array(rows * columns).fill(-1)
  let offset = 0
  sizes.forEach((size, regionId) => {
    for (const index of path.slice(offset, offset + size)) ids[index] = regionId
    offset += size
  })
  return {
    rowCount: rows,
    columnCount: columns,
    cells: Array.from({ length: rows }, (_, row) =>
      Array.from({ length: columns }, (_, col) => ids[row * columns + col] as number),
    ),
  } satisfies Grid<number>
}

function boardFromFlat(
  values: readonly SuguruCell[],
  rows: number,
  columns: number,
): SuguruBoard {
  return {
    rowCount: rows,
    columnCount: columns,
    cells: Array.from({ length: rows }, (_, row) =>
      values.slice(row * columns, row * columns + columns),
    ),
  }
}

function makeInstance(
  seed: string,
  regions: SuguruRegionLayout,
  givens: SuguruBoard,
  attempt: number,
  clueCount: number,
): SuguruPuzzleInstance {
  const regionCount = new Set(regions.cells.flat()).size
  return {
    id: `suguru:${seed}`,
    puzzleType: 'suguru',
    question: { regions, regionCount, givens },
    metadata: {
      seed,
      generatorVersion: 1,
      generationAttempt: attempt,
      clueCount,
    },
  }
}

function removeClues(
  context: PuzzleGenerationContext,
  regions: SuguruRegionLayout,
  solution: SuguruSolution,
  attempt: number,
): SuguruPuzzleInstance {
  const rows = regions.rowCount
  const columns = regions.columnCount
  const values: SuguruCell[] = solution.cells.flat()
  let clueCount = values.length
  for (const index of context.random.shuffle(Array.from({ length: values.length }, (_, i) => i))) {
    const previous = values[index] as number
    values[index] = null
    const candidate = makeInstance(
      context.seed,
      regions,
      boardFromFlat(values, rows, columns),
      attempt,
      clueCount - 1,
    )
    if (countSolutions(candidate, 2) === 1) clueCount -= 1
    else values[index] = previous
  }
  return makeInstance(
    context.seed,
    regions,
    boardFromFlat(values, rows, columns),
    attempt,
    clueCount,
  )
}

function generateWithContext(
  context: PuzzleGenerationContext,
  options: SuguruGeneratorOptions = {},
): SuguruPuzzleInstance {
  const rows = normalizeDimension(options.rows, DEFAULT_ROWS, 'rows')
  const columns = normalizeDimension(options.columns, DEFAULT_COLUMNS, 'columns')

  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt += 1) {
    const regions = generateRegions(rows, columns, context.random)
    if (regions === null) continue
    const regionCount = new Set(regions.cells.flat()).size
    if (!hasValidConnectedRegions(regions, regionCount)) continue
    const solution = generateSolutionForRegions(regions, regionCount, context.random)
    if (solution === null) continue
    const solvedInstance = makeInstance(
      context.seed,
      regions,
      solution,
      attempt,
      rows * columns,
    )
    if (!isValidSuguruSolution(solvedInstance, solution)) continue
    return removeClues(context, regions, solution, attempt)
  }
  throw new Error(
    `Unable to generate a Suguru puzzle after ${MAX_GENERATION_ATTEMPTS} attempts`,
  )
}

export function generateSuguru(options: GenerateSuguruOptions): SuguruPuzzleInstance {
  return generateWithContext(
    { seed: options.seed, random: createSeededRandom(options.seed) },
    options,
  )
}

export const suguruGenerator: PuzzleGenerator<SuguruPuzzleInstance> = {
  generate(context, options) {
    const suguruOptions =
      typeof options === 'object' && options !== null
        ? (options as SuguruGeneratorOptions)
        : undefined
    return generateWithContext(context, suguruOptions)
  },
}
